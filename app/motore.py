# -*- coding: utf-8 -*-
"""
Registra Lezione - il "motore": tutto quello che il programma fa, senza la finestra.

La finestra (interfaccia web, o quella classica di ripiego) chiede lo stato con stato()
qualche volta al secondo e chiama le azioni (avvia, pausa, fine, ...).
Le domande di conferma le fa la finestra, prima di chiamare l'azione.
"""
import base64
import ctypes
import datetime
import hashlib
import io
import logging
import os
import queue
import shutil
import subprocess
import sys
import threading
import time
import traceback
from pathlib import Path

QUI = Path(__file__).resolve().parent
APP = "Registra Lezione"
SITO_ASSISTENZA = "https://puntowebferrara.com/contatti/"


# ----------------------------------------------------------------------------- cartelle e impostazioni

def cartella_documenti():
    """La vera cartella Documenti (anche se spostata su OneDrive)."""
    if sys.platform == "win32":
        try:
            buf = ctypes.create_unicode_buffer(260)
            ctypes.windll.shell32.SHGetFolderPathW(None, 5, None, 0, buf)
            if buf.value:
                return Path(buf.value)
        except Exception:
            pass
    return Path.home() / "Documents"


def _base():
    """Cartella delle registrazioni: "Lezioni registrate" (o "Recorded lectures" su un Windows non italiano)."""
    it = cartella_documenti() / "Lezioni registrate"
    en = cartella_documenti() / "Recorded lectures"
    if it.exists() or not en.exists() and _lingua_pc() == "it":
        return it
    return en


def _lingua_pc():
    import testi
    return testi.lingua_windows()


BASE = _base()
BASE.mkdir(parents=True, exist_ok=True)
CONFIG = Path(os.environ.get("APPDATA") or Path.home() / ".config") / "RegistraLezione" / "config.json"

logging.basicConfig(filename=str(BASE / "registra_lezione.log"), level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(message)s", encoding="utf-8")
log = logging.getLogger("registra_lezione")
logging.getLogger("fontTools").setLevel(logging.WARNING)

import aggiorna as agg               # noqa: E402
import appunti as ap                 # noqa: E402
import elaborazione as el            # noqa: E402
import registratore as rg            # noqa: E402
import testi                         # noqa: E402
from testi import tr                 # noqa: E402


def leggi_config():
    c = el.leggi_json(CONFIG, {}) or {}
    testi.LINGUA = c.get("lingua") if c.get("lingua") in testi.T else testi.lingua_windows()
    c.setdefault("cartella_pacchetti", str(cartella_documenti() / tr("pacchetti_cartella")))
    c.setdefault("appunti_attivi", False)
    c.setdefault("chiave", "")
    return c


def salva_config(c):
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    el.scrivi_json(CONFIG, c)


# ----------------------------------------------------------------------------- file

def apri(percorso):
    """Apre un file o una cartella con il programma di Windows. False se non ci riesce."""
    try:
        if sys.platform == "win32":
            os.startfile(str(percorso))
        else:
            subprocess.Popen(["xdg-open", str(percorso)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception:
        log.exception("apri %s", percorso)
        return False


def mostra_file(percorso):
    """Apre la cartella con il file gia' selezionato."""
    p = Path(percorso)
    if sys.platform == "win32" and p.exists():
        subprocess.Popen(f'explorer /select,"{p}"')
        return True
    return apri(p.parent)


def gb_testo(byte):
    gb = byte / 1e9
    return (f"{gb:.1f} GB" if gb >= 0.1 else f"{byte / 1e6:.0f} MB").replace(".", ",")


def al_cestino(percorsi):
    """Sposta file e cartelle nel Cestino di Windows (recuperabili)."""
    percorsi = [str(Path(p).resolve()) for p in percorsi if Path(p).exists()]
    if not percorsi:
        return
    if sys.platform != "win32":
        for p in percorsi:
            if Path(p).is_dir():
                shutil.rmtree(p)
            else:
                Path(p).unlink()
        return
    from ctypes import wintypes

    class SHFILEOPSTRUCTW(ctypes.Structure):
        _fields_ = [("hwnd", wintypes.HWND), ("wFunc", wintypes.UINT),
                    ("pFrom", wintypes.LPCWSTR), ("pTo", wintypes.LPCWSTR),
                    ("fFlags", ctypes.c_ushort), ("fAnyOperationsAborted", wintypes.BOOL),
                    ("hNameMappings", ctypes.c_void_p), ("lpszProgressTitle", wintypes.LPCWSTR)]
    FO_DELETE, FOF_SILENT, FOF_NOCONFIRMATION, FOF_ALLOWUNDO, FOF_NOERRORUI = 3, 4, 0x10, 0x40, 0x400
    elenco = "\0".join(percorsi) + "\0\0"          # Windows vuole i percorsi separati da \0
    buf = (ctypes.c_wchar * len(elenco))(*elenco)
    op = SHFILEOPSTRUCTW(None, FO_DELETE, ctypes.cast(buf, wintypes.LPCWSTR), None,
                         FOF_SILENT | FOF_NOCONFIRMATION | FOF_ALLOWUNDO | FOF_NOERRORUI, False, None, None)
    r = ctypes.windll.shell32.SHFileOperationW(ctypes.byref(op))
    if r == 0 and not any(Path(p).exists() for p in percorsi):
        return
    log.warning("SHFileOperation %s: provo con PowerShell", r)
    for p in percorsi:
        if not Path(p).exists():
            continue
        metodo = "DeleteDirectory" if Path(p).is_dir() else "DeleteFile"
        comando = ("Add-Type -AssemblyName Microsoft.VisualBasic; "
                   f"[Microsoft.VisualBasic.FileIO.FileSystem]::{metodo}('{p.replace(chr(39), chr(39) * 2)}', "
                   "'OnlyErrorDialogs', 'SendToRecycleBin')")
        subprocess.run(["powershell", "-NoProfile", "-Command", comando], creationflags=0x08000000,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    if any(Path(p).exists() for p in percorsi):
        raise OSError("eliminazione non riuscita")


def video_di(cart):
    for nome in ("video.mp4", "audio.m4a"):
        p = Path(cart) / nome
        if p.exists():
            return p
    return None


def materia_di(nome):
    return nome.split(" – ")[0].split(" - ")[0].strip()


def sigla(nome):
    """'Analisi 1 – Limiti' -> 'A1', 'Webinar marketing' -> 'WM', 'Chimica' -> 'CH'."""
    parole = [p for p in materia_di(nome).replace("-", " ").split() if p]
    if not parole:
        return "RL"
    if len(parole) == 1:
        return parole[0][:2].upper()
    return (parole[0][0] + parole[1][0]).upper()


def colore_materia(nome):
    return int(hashlib.md5(materia_di(nome).lower().encode("utf-8")).hexdigest(), 16) % 6


def schermo_risoluzione():
    if sys.platform == "win32":
        try:
            u = ctypes.windll.user32
            return f"{u.GetSystemMetrics(0)}×{u.GetSystemMetrics(1)}"
        except Exception:
            pass
    return ""


def apri_non_disturbare():
    try:
        if sys.platform == "win32":
            os.startfile("ms-settings:notifications")
    except Exception:
        log.exception("apertura impostazioni notifiche")


# ----------------------------------------------------------------------------- il motore

def _hhmm(sec):
    sec = int(round(sec))
    return f"{sec // 3600:02d}:{sec % 3600 // 60:02d}"


class Motore:
    def __init__(self):
        self.cfg = leggi_config()
        self.reg = None
        self.occupato = False          # registrazione o preparazione in corso
        self.coda = queue.Queue()      # messaggi dai thread al ciclo
        self.lavori = queue.Queue()    # trascrizioni da fare, una alla volta
        self.lavori_appunti = queue.Queue()
        self.cartella_corrente = None
        self.silenzio_da = time.monotonic()
        self.parti = {}
        self.finale = None             # None | (0..1) | "ok"
        self.accodate = set()
        self.appunti_lezione = False
        self.formato_vista = "cornell"     # formato degli appunti mostrati/creati nella schermata di fine
        self.parte_sec = 3600
        self.vista = "pronto"          # pronto | reg | fine
        self.nome_rec = ""
        self.avviso_fine = ""
        self.titolo_fine = ""
        self.modello_msg = ""
        self.agg = {"tipo": None}      # stato di Aggiorna
        self.audio_ok = None
        self.liberi = None
        self.messaggi = []             # avvisi da mostrare (errori dei lavori)
        self._id_msg = 0
        self._gb, self._gb_t = 0.0, 0
        self._livelli = [0.0] * 48     # ultimi livelli dell'audio, per l'onda
        self._sveglio = False
        self._sveglio_voluto = False
        self._lock = threading.RLock()
        self.on_fine_registrazione = None   # la finestra chiude la mini finestra
        self.on_riavvia = None
        for f in (self._lavoratore, self._lavoratore_appunti, self._prepara_modello, self._ciclo):
            threading.Thread(target=f, daemon=True).start()
        threading.Thread(target=self.controlli, daemon=True).start()

    # ------------------------------------------------------------------ utilita'

    def chiave(self):
        return ap.leggi_chiave(self.cfg.get("chiave", ""))

    def _orario(self, k, fine=None):
        a = (k - 1) * self.parte_sec
        b = fine if fine is not None else k * self.parte_sec
        return f"{_hhmm(a)} – {_hhmm(b)}"

    def _messaggio(self, titolo, testo):
        self._id_msg += 1
        self.messaggi.append({"id": self._id_msg, "titolo": titolo, "testo": testo})

    def letto(self, mid):
        self.messaggi = [m for m in self.messaggi if m["id"] != mid]

    def controlli(self):
        """Audio del PC e spazio libero (l'audio puo' richiedere qualche secondo)."""
        try:
            self.audio_ok = rg.controlla_audio()
        except Exception:
            log.exception("controllo audio")
            self.audio_ok = False
        try:
            self.liberi = shutil.disk_usage(BASE).free / 1e9
        except OSError:
            self.liberi = None
        return {"audio_ok": self.audio_ok, "liberi": self.liberi}

    def gb_registrati(self):
        ora = time.monotonic()
        if ora - self._gb_t > 3 and self.cartella_corrente:
            tot = 0
            for dp, _, fs in os.walk(self.cartella_corrente):
                for n in fs:
                    try:
                        tot += os.path.getsize(os.path.join(dp, n))
                    except OSError:
                        pass
            self._gb, self._gb_t = tot / 1e9, ora
        return self._gb

    # ------------------------------------------------------------------ stato per la finestra

    def stato(self):
        with self._lock:
            s = {"vista": self.vista, "occupato": self.occupato, "registro": self.reg is not None,
                 "nome": self.nome_rec, "titolo_fine": self.titolo_fine, "avviso_fine": self.avviso_fine,
                 "modello": self.modello_msg, "agg": self.agg, "messaggi": list(self.messaggi),
                 "audio_ok": self.audio_ok, "liberi": self.liberi,
                 "finale": self.finale}
            if self.reg is not None:
                r = self.reg
                pausa = r.in_pausa
                avviso = ""
                if "audio" in r.errori:
                    avviso = tr("avviso_audio_err")
                elif not pausa and time.monotonic() - self.silenzio_da > 60:
                    avviso = tr("avviso_silenzio")
                s.update(secondi=int(r.secondi()), slide=r.n_slide, gb=round(self.gb_registrati(), 2),
                         livello=float(r.livello), livelli=list(self._livelli), pausa=pausa,
                         pausa_sec=int(r.secondi_di_pausa()) if pausa else 0, avviso=avviso)
            parti = []
            for k in sorted(self.parti):
                p = dict(self.parti[k])
                p["k"] = k
                if p.get("ap") == "lav":
                    p["ap_perc"] = min(0.95, (time.monotonic() - p.get("ap_t0", time.monotonic())) / 120)
                p.pop("ap_t0", None)
                parti.append(p)
            s["parti"] = parti
            s["pronti"] = sum(1 for p in parti if p.get("stato") == "ok")
            s["ha_appunti"] = any(p.get("ap") == "ok" for p in parti)
            s["spesa"] = self._spesa()
            s["cornell"] = self._anteprima_cornell() if self.vista == "fine" else None
            s["formato"] = self.formato_vista
            return s

    def _spesa(self):
        if not self.cartella_corrente:
            return None
        info = el.leggi_json(Path(self.cartella_corrente) / "info.json", {}) or {}
        n = len(info.get("appunti") or {}) + len(info.get("appunti_esame") or {})
        if not n:
            return None
        return {"n": n, "dollari": round(float(info.get("spesa_appunti") or 0), 2)}

    def _anteprima_cornell(self):
        """Le prime domande degli appunti, per la schermata di fine."""
        if not self.cartella_corrente:
            return None
        cart = Path(self.cartella_corrente)
        files = sorted(cart.glob("appunti_esame_*.json")) if self.formato_vista == "esame" else \
            [f for f in sorted(cart.glob("appunti_*.json")) if not f.name.startswith("appunti_esame_")]
        for f in files:
            d = ap.normalizza(el.leggi_json(f, {}) or {})
            if ap.e_esame(d):
                dom = d.get("domande_probabili") or []
                if not dom:
                    continue
                return {"formato": "esame",
                        "blocchi": [{"domanda": q.get("domanda", ""), "stelle": q.get("stelle", 1),
                                     "appunto": " → ".join((q.get("schema") or [])[:3])} for q in dom[:2]],
                        "riassunto": "", "n_domande": len(dom), "n_kw": len(d.get("parole_chiave") or []),
                        "simulazione": bool(d.get("simulazione"))}
            blocchi = d.get("blocchi") or []
            if not blocchi:
                continue
            return {"formato": "cornell", "blocchi": [{"domanda": b.get("domanda", ""),
                                 "appunto": (b.get("appunti") or [""])[0]} for b in blocchi[:2]],
                    "riassunto": d.get("riassunto", ""), "n_domande": len(blocchi),
                    "formulario": bool(d.get("formulario")), "esercizi": bool(d.get("esercizi_svolti"))}
        return None

    def miniature(self, quante=6):
        """Le ultime slide catturate, piccole, come immagini dentro la pagina."""
        if not self.cartella_corrente:
            return []
        from PIL import Image
        cart = Path(self.cartella_corrente) / "slide"
        if not cart.exists():
            return []
        files = sorted(cart.glob("slide_*.jpg"))[-quante:]
        out = []
        for f in files:
            try:
                im = Image.open(f)
                im.thumbnail((256, 144))
                b = io.BytesIO()
                im.convert("RGB").save(b, "JPEG", quality=70)
                out.append({"nome": f.name, "ora": time.strftime("%H.%M", time.localtime(f.stat().st_mtime)),
                            "src": "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()})
            except Exception:
                pass
        return out

    def riepilogo(self):
        cart = Path(self.cfg["cartella_pacchetti"])
        ha_chiave = bool(self.chiave())
        return {"lingua": testi.LINGUA, "lingua_scelta": self.cfg.get("lingua") in testi.T,
                "lingua_lezione": self.cfg.get("lingua_lezione") or testi.LINGUA,
                "formato": "esame" if self.cfg.get("formato_appunti") == "esame" else "cornell",
                "cartella": str(cart), "minuti": int(self.cfg.get("parte_minuti", 30)),
                "appunti_on": bool(self.cfg.get("appunti_attivi")) and ha_chiave, "chiave": ha_chiave,
                "mini": bool(self.cfg.get("mini_finestra", True)), "dnd": bool(self.cfg.get("promemoria_dnd", True)),
                "studente": self.cfg.get("studente") or {}, "recenti": self.cfg.get("materie_recenti") or [],
                "schermo": schermo_risoluzione(), "versione": agg.versione_locale().get("versione", "?"),
                "audio_ok": self.audio_ok, "liberi": self.liberi, "base": str(BASE)}

    # ------------------------------------------------------------------ impostazioni

    def imposta(self, campo, valore):
        if campo == "lingua":
            if valore not in testi.T:
                return {"ok": False, "msg": "?"}
            vecchia = str(cartella_documenti() / tr("pacchetti_cartella"))
            self.cfg["lingua"] = testi.LINGUA = valore
            nuova = str(cartella_documenti() / tr("pacchetti_cartella"))
            # la cartella dei pacchetti di serie prende il nome nella lingua scelta (se e' ancora vuota)
            c = Path(self.cfg.get("cartella_pacchetti", ""))
            if str(c) == vecchia and vecchia != nuova and (not c.exists() or not any(c.iterdir())):
                self.cfg["cartella_pacchetti"] = nuova
            if self.cfg.get("lingua_lezione") in (None, "it", "en") and not self.cfg.get("lingua_lezione_scelta"):
                self.cfg["lingua_lezione"] = valore
        elif campo == "formato_appunti":
            self.cfg["formato_appunti"] = "esame" if valore == "esame" else "cornell"
        elif campo == "lingua_lezione":
            if valore not in testi.LEZIONE:
                return {"ok": False, "msg": "?"}
            self.cfg["lingua_lezione"] = valore
            self.cfg["lingua_lezione_scelta"] = True
        elif campo == "parte_minuti":
            self.cfg["parte_minuti"] = 60 if int(valore) == 60 else 30
        elif campo in ("mini_finestra", "promemoria_dnd"):
            self.cfg[campo] = bool(valore)
        elif campo == "appunti_attivi":
            if self.reg is not None:
                return {"ok": False, "msg": tr("imp_prima")}
            if valore and not self.chiave():
                return {"ok": False, "msg": tr("imp_chiave")}
            self.cfg["appunti_attivi"] = bool(valore)
        elif campo == "studente":
            self.cfg["studente"] = {k: str(v).strip() for k, v in (valore or {}).items()}
        elif campo == "cartella_pacchetti":
            self.cfg["cartella_pacchetti"] = str(Path(valore))
        else:
            return {"ok": False, "msg": "impostazione sconosciuta"}
        salva_config(self.cfg)
        return {"ok": True}

    def prova_chiave(self, k):
        k = (k or "").strip()
        if not k:
            return {"ok": False, "msg": tr("chiave_vuota")}
        try:
            ap.prova_chiave(k)
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("prova chiave")
            return {"ok": False, "msg": tr("chiave_non_provata")}
        self.cfg["chiave"] = ap.nascondi_chiave(k)
        self.cfg["appunti_attivi"] = True
        salva_config(self.cfg)
        return {"ok": True, "msg": tr("chiave_ok")}

    def togli_chiave(self):
        self.cfg["chiave"] = ""
        self.cfg["appunti_attivi"] = False
        salva_config(self.cfg)
        return {"ok": True}

    def ricorda_materia(self, nome):
        m = materia_di(nome)
        if not m or m == "Lezione":
            return
        rec = [x for x in (self.cfg.get("materie_recenti") or []) if x != m]
        self.cfg["materie_recenti"] = ([m] + rec)[:5]
        salva_config(self.cfg)

    # ------------------------------------------------------------------ registrazione

    def verifica_inizio(self):
        """Prima di iniziare: la finestra chiede conferma se manca l'audio o lo spazio."""
        if self.occupato:
            return {"occupato": True}
        c = self.controlli()
        cart_ok = True
        try:
            Path(self.cfg["cartella_pacchetti"]).mkdir(parents=True, exist_ok=True)
        except OSError:
            cart_ok = False
        return {"occupato": False, "audio_ok": c["audio_ok"], "liberi": c["liberi"], "cartella_ok": cart_ok,
                "dnd": bool(self.cfg.get("promemoria_dnd", True))}

    def avvia(self, nome):
        with self._lock:
            if self.occupato:
                return {"ok": False}
            nome = (nome or "").strip() or "Lezione"
            self.ricorda_materia(nome)
            cart = BASE / f"{datetime.datetime.now():%Y-%m-%d %H%M} - {el.nome_sicuro(nome)}"
            cart.mkdir(parents=True, exist_ok=True)
            self.parte_sec = int(os.environ.get("RL_PARTE_SECONDI") or int(self.cfg.get("parte_minuti", 30)) * 60)
            el.scrivi_json(cart / "info.json", {"nome": nome, "inizio": datetime.datetime.now().isoformat(timespec="seconds"),
                                                "durata": 0, "n_slide": 0, "stato": "registrazione", "pacchetti": {},
                                                "studente": self.cfg.get("studente") or {},
                                                "parte_secondi": self.parte_sec,
                                                "lingua_appunti": testi.LINGUA,
                                                "formato_appunti": self._formato(),
                                                "lingua_lezione": self.cfg.get("lingua_lezione") or testi.LINGUA})
            self.cartella_corrente = cart
            self.appunti_lezione = bool(self.cfg.get("appunti_attivi") and self.chiave())
            self.formato_vista = self._formato()
            self.parti = {1: {"stato": "reg", "orario": self._orario(1)}}
            self.finale = None
            self.avviso_fine = ""
            self.nome_rec = nome
            self.titolo_fine = nome
            self._livelli = [0.0] * 48
            self.reg = rg.Registratore(cart, nome, self.parte_sec)
            self.reg.on_parte = lambda k: self.coda.put(("parte_finita", k))
            self.reg.avvia()
            self.occupato = True
            self._sveglio_voluto = True
            self.silenzio_da = time.monotonic()
            self._gb, self._gb_t = 0.0, 0
            self.vista = "reg"
            log.info("inizio registrazione: %s", cart)
            return {"ok": True, "mini": bool(self.cfg.get("mini_finestra", True))}

    def pausa(self):
        if not self.reg:
            return {"pausa": False}
        if self.reg.in_pausa:
            self.reg.riprendi()
        else:
            self.reg.pausa()
        return {"pausa": self.reg.in_pausa}

    def fine(self):
        with self._lock:
            if not self.reg:
                return {"ok": False}
            reg, self.reg = self.reg, None
            for p in self.parti.values():
                if p["stato"] == "reg":
                    p["stato"] = "attesa"
            self.finale = 0.0
            self.titolo_fine = self.nome_rec
            self.vista = "fine"

        def ferma():
            try:
                durata = reg.ferma()
                el.aggiorna_info(reg.cartella, durata=round(durata), stato="elaborazione")
                self.coda.put(("registrazione_ferma", (reg.cartella, reg.parte, durata, list(reg.errori))))
            except Exception:
                log.exception("fine")
                self.coda.put(("errore", traceback.format_exc()))
        threading.Thread(target=ferma, daemon=True).start()
        if self.on_fine_registrazione:
            try:
                self.on_fine_registrazione()
            except Exception:
                log.exception("chiusura mini finestra")
        return {"ok": True}

    def nuova(self):
        if self.occupato:
            return {"ok": False, "msg": tr("aspetta_completa")}
        self.vista = "pronto"
        threading.Thread(target=self.controlli, daemon=True).start()
        return {"ok": True}

    def accoda_parte(self, cart, k):
        if (str(cart), k) not in self.accodate:
            self.accodate.add((str(cart), k))
            self.lavori.put(("parte", cart, k))

    def accoda_appunti(self, cart, k, formato=None):
        self.parti.setdefault(k, {"orario": self._orario(k), "stato": "ok"})["ap"] = "attesa"
        self.lavori_appunti.put((cart, k, formato or self.formato_vista))

    def riprova_appunti(self, k):
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        self.accoda_appunti(self.cartella_corrente, int(k))
        return {"ok": True}

    # ------------------------------------------------------------------ lezioni gia' registrate

    def appunti_mancanti(self, cartella, formato=None):
        """Crea gli appunti che mancano, nel formato indicato (gli altri restano come sono)."""
        cart = Path(cartella)
        ap.sistema_vecchi(cart)
        info = el.leggi_json(cart / "info.json", {}) or {}
        if formato not in ap.FORMATI:
            formato = info.get("formato_appunti") or self._formato()
        pac, fatti = info.get("pacchetti") or {}, info.get(ap.chiave_info(formato)) or {}
        if not info.get("formato_appunti"):
            el.aggiorna_info(cart, formato_appunti=formato)
        with self._lock:
            self.formato_vista = formato
            self.cartella_corrente = cart
            self.parti = {}
            for k in sorted(pac, key=int):
                p = {"stato": "ok", "file": pac[k], "orario": ""}
                if k in fatti and Path(fatti[k]).exists():
                    p.update(ap="ok", ap_file=fatti[k])
                self.parti[int(k)] = p
            for k, p in self.parti.items():
                if not p.get("ap"):
                    self.accoda_appunti(cart, k)
            self.finale = "ok"
            self.titolo_fine = info.get("nome", "Lezione")
            self.avviso_fine = ""
            self.vista = "fine"
        return {"ok": True}

    def _formato(self):
        return "esame" if self.cfg.get("formato_appunti") == "esame" else "cornell"

    def stima_appunti(self, cartella):
        info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
        minuti = max(1, round((info.get("durata") or 0) / 60))
        return round(max(0.01, 0.2 * minuti / 60), 2)

    def rifai_appunti(self, cartella):
        """Rifà pacchetti e appunti di una lezione già pronta (formato Cornell). Costa qualche centesimo."""
        cart = Path(cartella)
        ap.sistema_vecchi(cart)
        info = el.leggi_json(cart / "info.json", {}) or {}
        pac = info.get("pacchetti") or {}
        if not pac or self.occupato:
            return {"ok": False}
        formato = self._formato()
        for k in pac:
            vecchio = (info.get(ap.chiave_info(formato)) or {}).get(k)
            for f in (ap.file_json(cart, k, formato), Path(vecchio) if vecchio else None):
                if f and f.exists():
                    try:
                        f.unlink()
                    except OSError:
                        pass
        tutti = info.get(ap.chiave_completi(formato))
        if tutti and Path(tutti).exists() and len(pac) > 1:
            try:
                Path(tutti).unlink()
            except OSError:
                pass
        el.aggiorna_info(cart, **{ap.chiave_info(formato): {}, ap.chiave_completi(formato): None},
                         formato_appunti=formato)
        with self._lock:
            self.formato_vista = formato
            self.cartella_corrente = cart
            self.parti = {int(k): {"stato": "lav", "perc": 0.0, "orario": ""} for k in pac}
            self.appunti_lezione = True
            self.finale = "ok"
            self.titolo_fine = info.get("nome", "Lezione")
            self.avviso_fine = ""
            self.vista = "fine"

        def lavoro():
            for k in sorted(pac, key=int):
                try:
                    zp = el.crea_pacchetto(cart, int(k), self.cfg["cartella_pacchetti"])
                    self.coda.put(("parte_ok", (int(k), str(zp))))
                except Exception:
                    log.exception("rifai pacchetto %s", k)
                    self.coda.put(("parte_err", int(k)))
        threading.Thread(target=lavoro, daemon=True).start()
        return {"ok": True}

    def completa(self, cartella):
        """Finisce una lezione rimasta a meta' (es. PC spento mentre preparava i file)."""
        if self.occupato:
            return {"ok": False, "msg": tr("aspetta_lavoro")}
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        fatti = info.get("pacchetti") or {}
        parti = el.file_parti(cart)
        with self._lock:
            self.cartella_corrente = cart
            self.parte_sec = el.parte_secondi(cart)
            self.appunti_lezione = bool(self.cfg.get("appunti_attivi") and self.chiave())
            self.formato_vista = info.get("formato_appunti") or self._formato()
            fatti_ap = info.get(ap.chiave_info(self.formato_vista)) or {}
            self.parti = {}
            for k, wav in parti.items():
                fine_k = (k - 1) * self.parte_sec + el.durata_wav(wav)
                if str(k) in fatti and Path(fatti[str(k)]).exists():
                    self.parti[k] = {"stato": "ok", "file": fatti[str(k)], "orario": self._orario(k, fine_k)}
                    if str(k) in fatti_ap and Path(fatti_ap[str(k)]).exists():
                        self.parti[k].update(ap="ok", ap_file=fatti_ap[str(k)])
                    elif self.appunti_lezione:
                        self.accoda_appunti(cart, k)
                else:
                    self.parti[k] = {"stato": "attesa", "orario": self._orario(k, fine_k)}
                    self.accoda_parte(cart, k)
            if not info.get("durata"):
                meta = el.leggi_json(cart / "meta.json", {}) or {}
                d = meta.get("durata") or sum(el.durata_wav(p) for p in parti.values())
                el.aggiorna_info(cart, durata=round(d or 0))
            self.lavori.put(("finale", cart))
            self.occupato = True
            self._sveglio_voluto = True
            self.finale = 0.0
            self.titolo_fine = info.get("nome", "Lezione")
            self.avviso_fine = ""
            self.vista = "fine"
        return {"ok": True}

    def appunti_di(self, cartella=None):
        """PDF degli appunti di una lezione: [{"titolo", "file"}] (il primo e' quello unico, se c'e')."""
        cart = Path(cartella) if cartella else self.cartella_corrente
        if not cart:
            return []
        ap.sistema_vecchi(cart)
        info = el.leggi_json(Path(cart) / "info.json", {}) or {}
        out = []
        for formato in ap.FORMATI:
            nome = tr("fmt_esame" if formato == "esame" else "fmt_cornell")
            tutti = info.get(ap.chiave_completi(formato))
            if tutti and Path(tutti).exists():
                out.append({"titolo": nome, "formato": formato, "file": tutti})
                continue
            parti = sorted(ap.appunti_fatti(info, formato).items(), key=lambda x: int(x[0]))
            for k, v in parti:
                out.append({"titolo": nome + (f" · {tr('app_parte', k=k)}" if len(parti) > 1 else ""),
                            "formato": formato, "file": v})
        return out

    def apri_lezione(self, cartella=None):
        cart = Path(cartella) if cartella else self.cartella_corrente
        if not cart:
            return False
        pdf = sorted(Path(cart).glob("Per Claude - *.pdf"))
        return apri(pdf[0] if pdf else Path(cart) / "Lezione.html")

    def lezioni(self):
        """Elenco per 'Le mie registrazioni'."""
        try:
            cartelle = sorted((p for p in BASE.iterdir() if p.is_dir() and (p / "info.json").exists()),
                              key=lambda p: p.name, reverse=True)
        except OSError:
            cartelle = []
        ha_chiave = bool(self.chiave())
        out, tot_video = [], 0
        for cart in cartelle:
            info = el.leggi_json(cart / "info.json", {}) or {}
            stato = info.get("stato")
            in_corso = self.cartella_corrente is not None and cart == Path(self.cartella_corrente) and self.occupato
            video = video_di(cart) if stato == "pronta" and not in_corso else None
            vb = video.stat().st_size if video else 0
            tot_video += vb
            quando = ""
            try:
                d = datetime.datetime.fromisoformat(info.get("inizio", ""))
                quando = f"{d:%d/%m/%Y} · {d:%H.%M}"
            except Exception:
                pass
            ap.sistema_vecchi(cart)
            info = el.leggi_json(cart / "info.json", {}) or {}
            pac = info.get("pacchetti") or {}
            fatti = {f: ap.appunti_fatti(info, f) for f in ap.FORMATI}
            appunti = {**fatti["cornell"], **fatti["esame"]}
            mancano = {f: [k for k, z in pac.items() if Path(z).exists() and k not in fatti[f]] for f in ap.FORMATI}
            puo = stato == "pronta" and ha_chiave and not self.occupato and bool(pac)
            nome = info.get("nome", cart.name)
            out.append({
                "cartella": str(cart), "nome": nome, "quando": quando,
                "durata": el.durata_leggibile(info.get("durata", 0)) if info.get("durata") else "",
                "n_slide": info.get("n_slide", 0), "stato": "in_corso" if in_corso else ("pronta" if stato == "pronta" else "da_completare"),
                "video": str(video) if video else "", "video_testo": gb_testo(vb) if video else "",
                "n_appunti": len(appunti), "n_pacchetti": len(pac),
                "formati": [f for f in ap.FORMATI if fatti[f]],
                # nessun appunto: si creano nel formato scelto; altrimenti si puo' creare anche l'altro formato
                "crea_appunti": bool(puo and not appunti),
                "crea_anche": [f for f in ap.FORMATI if puo and appunti and mancano[f]],
                "completa_appunti": [f for f in ap.FORMATI if puo and fatti[f] and mancano[f]],
                "rifai": [f for f in ap.FORMATI if puo and fatti[f] and not mancano[f]],
                "rifai_appunti": bool(puo and fatti[self._formato()] and not mancano[self._formato()]),
                "sigla": sigla(nome), "colore": colore_materia(nome),
                "formato": info.get("formato_appunti") or "cornell",
                "lingua_lezione": info.get("lingua_rilevata") if info.get("lingua_lezione") == "auto" else info.get("lingua_lezione"),
            })
        try:
            liberi = shutil.disk_usage(BASE).free
        except OSError:
            liberi = 0
        return {"lezioni": out, "video_tot": tot_video, "video_testo": gb_testo(tot_video),
                "quota": tot_video / (tot_video + liberi) if (tot_video + liberi) else 0, "base": str(BASE)}

    def rinomina(self, cartella, nuovo):
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        vecchio = info.get("nome", "Lezione")
        nuovo = (nuovo or "").strip()
        if not nuovo or nuovo == vecchio:
            return {"ok": True}
        try:
            self._applica_rinomina(cart, vecchio, nuovo)
            return {"ok": True}
        except Exception:
            log.exception("rinomina")
            return {"ok": False, "msg": tr("rinomina_err")}

    def _applica_rinomina(self, cart, vecchio, nuovo):
        vb, nb = el.nome_sicuro(vecchio), el.nome_sicuro(nuovo)
        info = el.leggi_json(cart / "info.json", {}) or {}

        def cambia(percorso):
            p = Path(percorso)
            if p.exists() and vb in p.name:
                q = p.with_name(p.name.replace(vb, nb, 1))
                if not q.exists():
                    p.rename(q)
                    return str(q)
            return str(p)
        info["pacchetti"] = {k: cambia(v) for k, v in (info.get("pacchetti") or {}).items()}
        for chiave in ("appunti", "appunti_esame"):
            info[chiave] = {k: cambia(v) for k, v in (info.get(chiave) or {}).items()}
        for chiave in ("appunti_completi", "appunti_completi_esame"):
            if info.get(chiave):
                info[chiave] = cambia(info[chiave])
        for p in cart.glob("Per Claude - *.pdf"):
            cambia(p)
        info["nome"] = nuovo
        el.scrivi_json(cart / "info.json", info)
        self.ricorda_materia(nuovo)
        if " - " in cart.name:
            nuova = cart.with_name(cart.name.split(" - ", 1)[0] + " - " + nb)
            if not nuova.exists():
                cart.rename(nuova)
                if self.cartella_corrente == cart:
                    self.cartella_corrente = nuova

    def elimina(self, cartella, anche_pacchetti=False):
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        extra = []
        if anche_pacchetti:
            extra = [v for v in list((info.get("pacchetti") or {}).values()) +
                     list((info.get("appunti") or {}).values()) + list((info.get("appunti_esame") or {}).values()) +
                     [info.get("appunti_completi"), info.get("appunti_completi_esame")] if v and Path(v).exists()]
        try:
            al_cestino([cart] + [Path(f) for f in extra])
            return {"ok": True}
        except Exception:
            log.exception("elimina")
            return {"ok": False, "msg": tr("elimina_err")}

    def elimina_video(self, cartelle):
        """Elimina DEFINITIVAMENTE i video (nel Cestino occuperebbero ancora spazio)."""
        n = 0
        for c in cartelle:
            v = video_di(c)
            if v:
                try:
                    v.unlink()
                    n += 1
                except OSError:
                    log.exception("elimina video %s", v)
        return {"ok": True, "n": n}

    # ------------------------------------------------------------------ Aggiorna

    def cerca_aggiornamenti(self):
        if self.occupato:
            self.agg = {"tipo": "msg", "testo": tr("agg_occupato")}
            return
        self.agg = {"tipo": "cerco", "testo": tr("agg_cerco")}

        def lavoro():
            try:
                t = agg.cerca()
                if t is None:
                    self.agg = {"tipo": "ok", "testo": tr("agg_ultima")}
                else:
                    self.agg = {"tipo": "trovato", "dato": t}
            except agg.NonTrovato:
                log.exception("aggiorna")
                self.agg = {"tipo": "msg", "testo": tr("agg_404")}
            except Exception:
                log.exception("aggiorna")
                self.agg = {"tipo": "msg", "testo": tr("agg_rete")}
        threading.Thread(target=lavoro, daemon=True).start()

    def installa_aggiornamento(self):
        dato = self.agg.get("dato") if self.agg.get("tipo") == "trovato" else None
        if not dato or self.occupato:
            return
        if dato.get("completo"):
            apri(dato["pagina"])
            return
        self.agg = {"tipo": "scarico", "perc": 0.0}

        def lavoro():
            try:
                agg.installa(dato, lambda f: self.agg.update(perc=f))
                self.agg = {"tipo": "fatto", "testo": tr("agg_fatto", v=dato['versione'])}
                time.sleep(1.5)
                agg.riavvia()
                if self.on_riavvia:
                    self.on_riavvia()
            except Exception:
                log.exception("installa aggiornamento")
                self.agg = {"tipo": "msg", "testo": tr("agg_err")}
        threading.Thread(target=lavoro, daemon=True).start()

    def chiudi_agg(self):
        self.agg = {"tipo": None}

    # ------------------------------------------------------------------ lavoro in sottofondo

    def _lavoratore(self):
        while True:
            lavoro = self.lavori.get()
            tipo, cart = lavoro[0], lavoro[1]
            cores = os.cpu_count() or 2
            # mentre si registra meta' del processore (Meet non rallenta); dopo ne lascio libero un po'
            # anche per la finestra, che altrimenti puo' sembrare bloccata
            threads = max(1, cores // 2) if self.reg is not None else max(1, cores - 2 if cores >= 4 else cores - 1)
            try:
                if tipo == "parte":
                    k = lavoro[2]
                    self.coda.put(("parte_perc", (k, 0.0)))
                    el.trascrivi_parte(cart, k, lambda f: self.coda.put(("parte_perc", (k, f))), threads)
                    zp = el.crea_pacchetto(cart, k, self.cfg["cartella_pacchetti"])
                    self.coda.put(("parte_ok", (k, str(zp))))
                elif tipo == "finale":
                    el.elabora_finale(cart, self.cfg["cartella_pacchetti"],
                                      lambda f: self.coda.put(("finale_perc", f)), threads)
                    self.coda.put(("finale_ok", cart))
            except Exception:
                log.exception("lavoro %s", lavoro)
                if tipo == "parte":
                    self.coda.put(("parte_err", lavoro[2]))
                else:
                    self.coda.put(("errore", traceback.format_exc()))

    def _lavoratore_appunti(self):
        while True:
            cart, k, formato = self.lavori_appunti.get()
            if k is None:
                self._unisci_appunti(cart)
                continue
            self.coda.put(("ap_inizio", k))
            try:
                dest, spesa = ap.crea_appunti(cart, k, self.chiave(), self.cfg["cartella_pacchetti"], formato)
                log.info("appunti parte %s: %s (%.3f $)", k, dest, spesa)
                self.coda.put(("ap_ok", (k, str(dest))))
                self._unisci_appunti(cart)
            except ap.ErroreAppunti as e:
                self.coda.put(("ap_err", (k, str(e))))
            except Exception:
                log.exception("appunti parte %s", k)
                self.coda.put(("ap_err", (k, tr("ap_imprevisto"))))

    def _unisci_appunti(self, cart):
        try:
            ap.appunti_lezione_completa(cart, self.cfg["cartella_pacchetti"])
        except Exception:
            log.exception("appunti della lezione completa")

    def _prepara_modello(self):
        try:
            if el.modello_presente():
                return
            self.modello_msg = tr("modello_scarico")
            el.scarica_modello()
            self.modello_msg = ""
        except Exception:
            log.exception("modello")
            self.modello_msg = tr("modello_err")

    def _ciclo(self):
        """Ogni quarto di secondo: messaggi dei lavori, livello dell'audio, PC sveglio."""
        n = 0
        while True:
            time.sleep(0.25)
            n += 1
            try:
                self._passo(n)
            except Exception:
                log.exception("ciclo")

    def _passo(self, n):
        if self._sveglio != self._sveglio_voluto:
            rg.tieni_sveglio(self._sveglio_voluto)      # sempre da questo thread, che non finisce mai
            self._sveglio = self._sveglio_voluto
        r = self.reg
        if r is not None:
            if r.in_pausa or r.livello > 0.01:
                self.silenzio_da = time.monotonic()
            if n % 1 == 0:
                self._livelli = self._livelli[1:] + [0.0 if r.in_pausa else float(r.livello)]
        while True:
            try:
                tipo, dato = self.coda.get_nowait()
            except queue.Empty:
                break
            with self._lock:
                self._evento(tipo, dato)

    def _evento(self, tipo, dato):
        if tipo == "parte_finita":
            k = dato
            self.parti[k] = {"stato": "attesa", "orario": self._orario(k)}
            self.parti[k + 1] = {"stato": "reg", "orario": self._orario(k + 1)}
            self.accoda_parte(self.cartella_corrente, k)
        elif tipo == "registrazione_ferma":
            cart, ultima, durata, errori = dato
            for k in list(self.parti):
                if k > ultima:
                    self.parti.pop(k)
            if ultima:
                fine_audio = (ultima - 1) * el.parte_secondi(cart) + el.durata_wav(cart / f"audio_{ultima:03d}.wav")
                p = self.parti.setdefault(ultima, {"stato": "attesa"})
                p["orario"] = self._orario(ultima, fine_audio)
                if p["stato"] == "reg":
                    p["stato"] = "attesa"
                self.accoda_parte(cart, ultima)
            self.lavori.put(("finale", cart))
            avvisi = []
            if "audio" in errori:
                avvisi.append(tr("fine_audio"))
            if "video" in errori or "schermo" in errori:
                avvisi.append(tr("fine_video"))
            self.avviso_fine = " ".join(avvisi)
        elif tipo == "parte_perc":
            k, f = dato
            if k in self.parti:
                self.parti[k].update(stato="lav", perc=f)
        elif tipo == "parte_ok":
            k, f = dato
            self.parti.setdefault(k, {"orario": self._orario(k)}).update(stato="ok", file=f)
            if self.appunti_lezione and not self.parti[k].get("ap"):
                self.accoda_appunti(self.cartella_corrente, k)
        elif tipo == "ap_inizio":
            if dato in self.parti:
                self.parti[dato].update(ap="lav", ap_t0=time.monotonic())
        elif tipo == "ap_ok":
            k, f = dato
            if k in self.parti:
                self.parti[k].update(ap="ok", ap_file=f)
        elif tipo == "ap_err":
            k, msg = dato
            if k in self.parti:
                self.parti[k].update(ap="errore", ap_err=msg)
        elif tipo == "parte_err":
            if dato in self.parti:
                self.parti[dato]["stato"] = "errore"
        elif tipo == "finale_perc":
            self.finale = float(dato)
        elif tipo == "finale_ok":
            self.finale = "ok"
            self.lavori_appunti.put((dato, None, None))
            self.occupato = False
            self._sveglio_voluto = False
        elif tipo == "errore":
            self.occupato = False
            self._sveglio_voluto = False
            self.finale = None
            self.vista = "pronto"
            self._messaggio(tr("err_tit"), tr("err_testo") + "\n\n" + dato.strip().splitlines()[-1])

    # ------------------------------------------------------------------ chiusura

    def si_puo_chiudere(self):
        """'si' | 'registro' | 'occupato'"""
        if self.reg is not None:
            return "registro"
        if self.occupato:
            return "occupato"
        return "si"

    def chiusura(self):
        rg.tieni_sveglio(False)
