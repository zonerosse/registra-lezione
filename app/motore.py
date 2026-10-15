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
import re
import shutil
import subprocess
import sys
import threading
import time
import traceback
from pathlib import Path

QUI = Path(__file__).resolve().parent
APP = "Verba Manent IA"
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
import appunti as ap
import ripasso as rp                 # noqa: E402
import chiedi as ch                  # noqa: E402
import docente as dc                 # noqa: E402
import calendario as cal             # noqa: E402
import servi_video                   # noqa: E402
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
    # video o audio importati in un formato diverso
    for p in sorted(Path(cart).glob("video.*")) + sorted(Path(cart).glob("audio_originale.*")):
        if p.suffix.lower() not in (".txt", ".json"):
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


def rinomina_collegamenti():
    """Il programma si chiama ora «Verba Manent IA»: i collegamenti «Registra Lezione» (Desktop e menu Start)
    diventano «Verba Manent IA», con il logo nuovo. Solo su Windows e solo se ci sono quelli vecchi."""
    if sys.platform != "win32" or not getattr(sys, "frozen", False):
        return
    try:
        cartelle = []
        for csidl in (0x10, 0x02):          # Desktop, menu Start → Programmi
            buf = ctypes.create_unicode_buffer(260)
            if ctypes.windll.shell32.SHGetFolderPathW(None, csidl, None, 0, buf) == 0:
                cartelle.append(Path(buf.value))
        icona = QUI / "icona.ico"
        for c in cartelle:
            vecchio, nuovo = c / "Registra Lezione.lnk", c / "Verba Manent IA.lnk"
            if not vecchio.exists():
                continue
            ps = ("$s=(New-Object -ComObject WScript.Shell).CreateShortcut($env:RL_LNK);"
                  "$s.TargetPath=$env:RL_EXE;$s.WorkingDirectory=$env:RL_DIR;$s.IconLocation=$env:RL_ICO;$s.Save()")
            env = dict(os.environ, RL_LNK=str(nuovo), RL_EXE=sys.executable, RL_DIR=str(Path(sys.executable).parent),
                       RL_ICO=str(icona))
            r = subprocess.run(["powershell", "-NoProfile", "-Command", ps], env=env, creationflags=0x08000000,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)
            if r.returncode == 0 and nuovo.exists():
                vecchio.unlink()
                log.info("collegamento rinominato: %s", nuovo)
    except Exception:
        log.exception("collegamenti col nome nuovo")


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
        self.formato_vista = "cornell"
        self.imp = None                    # importazione di un video in corso: fasi e avanzamento     # formato degli appunti mostrati/creati nella schermata di fine
        self.parte_sec = 3600
        self.formati_extra = []        # rifacendo gli appunti: altri formati da rifare per ogni parte
        self.trascrivi_dopo = False    # telefono: registra e basta, trascrive a fine lezione ("Trascrivi ora")
        self.diretta = []              # testo in diretta: [{"t", "testo"}]
        self.diretta_lav = False
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
        # calendario: impegni, avviso prima, avvio da solo, domanda a fine impegno
        self.cal = cal.Calendari(BASE / "calendario")
        el.DOPO_VOCI = self._nomi_voci
        self.cal_lista, self.cal_avviso, self.cal_fine, self.cal_rec = [], None, None, None
        self.cal_gestiti = set()
        self.on_avviso = None          # la finestra si mette davanti
        self.on_avvio_auto = None      # registrazione partita da sola: la finestra apre la mini finestra
        threading.Thread(target=self._calendario, daemon=True).start()
        threading.Thread(target=rinomina_collegamenti, daemon=True).start()
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
                 "finale": self.finale, "cal_avviso": self.cal_avviso, "cal_fine": self.cal_fine,
                 "cal_ora": self._cal_adesso()}
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
                         pausa_sec=int(r.secondi_di_pausa()) if pausa else 0, avviso=avviso,
                         modo=r.modo, diretta_on=r.diretta, diretta=self.diretta[-14:], diretta_lav=self.diretta_lav)
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
            s["importa"] = self.imp
            return s

    def _spesa(self):
        if not self.cartella_corrente:
            return None
        info = el.leggi_json(Path(self.cartella_corrente) / "info.json", {}) or {}
        n = sum(len(info.get(ap.chiave_info(f)) or {}) for f in ap.FORMATI)
        if not n:
            return None
        return {"n": n, "dollari": round(float(info.get("spesa_appunti") or 0), 2)}

    def _anteprima_cornell(self):
        """Le prime domande degli appunti, per la schermata di fine."""
        if not self.cartella_corrente:
            return None
        cart = Path(self.cartella_corrente)
        fv = self.formato_vista if self.formato_vista in ap.FORMATI else "cornell"
        files = sorted(cart.glob("appunti_[0-9]*.json")) if fv == "cornell" else sorted(cart.glob(f"appunti_{fv}_*.json"))
        for f in files:
            d = el.leggi_json(f, {}) or {}
            fd = ap.formato_di(d)
            if fd == "verbale":
                dec, az = d.get("decisioni") or [], d.get("azioni") or []
                return {"formato": "verbale", "blocchi": [{"domanda": tr("vb_decisioni"), "appunto": x.get("testo", "")} for x in dec[:1]] +
                        [{"domanda": tr("vb_azioni"), "appunto": f"{x.get('cosa', '')}" + (f" — {x['chi']}" if x.get("chi") else "")} for x in az[:1]],
                        "riassunto": d.get("in_breve", ""), "n_dec": len(dec), "n_az": len(az)}
            if fd == "mio":
                sz = d.get("sezioni") or []
                return {"formato": "mio", "nome": d.get("mio_nome") or tr("fmt_mio"),
                        "blocchi": [{"domanda": x.get("titolo", ""), "appunto": (x.get("punti") or [""])[0]} for x in sz[:2]],
                        "riassunto": d.get("riassunto", ""), "n_sez": len(sz)}
            d = ap.normalizza(d)
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
            return {"formato": "webinar" if fd == "webinar" else "cornell", "blocchi": [{"domanda": b.get("domanda", ""),
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
                "formato": self._formato("lezione"), "tipo": self._tipo(), "mio": self.cfg.get("mio") or None,
                "esempi_mio": ap.ESEMPI_MIO.get(testi.LINGUA, ap.ESEMPI_MIO["it"]),
                "cartella": str(cart), "minuti": int(self.cfg.get("parte_minuti", 30)),
                "appunti_on": bool(self.cfg.get("appunti_attivi")) and ha_chiave, "chiave": ha_chiave,
                "mini": bool(self.cfg.get("mini_finestra", True)), "dnd": bool(self.cfg.get("promemoria_dnd", True)),
                "studente": self.cfg.get("studente") or {}, "recenti": self.cfg.get("materie_recenti") or [],
                "schermo": schermo_risoluzione(), "versione": agg.versione_locale().get("versione", "?"),
                "audio_ok": self.audio_ok, "liberi": self.liberi, "base": str(BASE),
                "modo": "aula" if self.cfg.get("modo") == "aula" else "online", "microfono": self.cfg.get("microfono") or "",
                "diretta": bool(self.cfg.get("diretta")), "parole_n": self._parole_n(),
                "precisa": bool(self.cfg.get("trascrizione_precisa")),
                "chi_parla": bool(self.cfg.get("chi_parla", True)),
                "quando": "dopo" if self.cfg.get("quando") == "dopo" else "durante",
                "solo_carica": bool(self.cfg.get("solo_carica", True)),
                "velocita": self.cfg.get("velocita_trascrizione_precisa" if self.cfg.get("trascrizione_precisa")
                                         else "velocita_trascrizione")}

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
            self.cfg["formato_appunti"] = valore if valore in ("cornell", "esame", "mio") else "cornell"
            if valore == "mio" and not (self.cfg.get("mio") or {}).get("descrizione"):
                self.cfg["formato_appunti"] = "cornell"
                return {"ok": False, "msg": tr("mio_vuoto")}
        elif campo == "tipo":
            self.cfg["tipo"] = valore if valore in ap.FORMATI_TIPO else "lezione"
        elif campo == "mio":
            v = valore or {}
            self.cfg["mio"] = {"nome": str(v.get("nome") or "").strip()[:60] or tr("fmt_mio"),
                               "descrizione": str(v.get("descrizione") or "").strip()[:2000]}
        elif campo == "lingua_lezione":
            if valore not in testi.LEZIONE:
                return {"ok": False, "msg": "?"}
            self.cfg["lingua_lezione"] = valore
            self.cfg["lingua_lezione_scelta"] = True
        elif campo == "parte_minuti":
            self.cfg["parte_minuti"] = 60 if int(valore) == 60 else 30
        elif campo in ("mini_finestra", "promemoria_dnd", "diretta", "trascrizione_precisa", "solo_carica", "chi_parla"):
            self.cfg[campo] = bool(valore)
        elif campo == "quando":
            self.cfg["quando"] = "dopo" if valore == "dopo" else "durante"
        elif campo == "modo":
            self.cfg["modo"] = "aula" if valore == "aula" else "online"
        elif campo == "microfono":
            self.cfg["microfono"] = str(valore or "")
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

    def avvia(self, nome, opzioni=None):
        opzioni = opzioni or {}
        modo = "aula" if (opzioni.get("modo") or self.cfg.get("modo")) == "aula" else "online"
        microfono = opzioni.get("microfono") or self.cfg.get("microfono") or None
        pdf = opzioni.get("pdf") if modo == "aula" else None
        dopo = (opzioni.get("quando") or self.cfg.get("quando")) == "dopo"
        tipo = opzioni.get("tipo") if opzioni.get("tipo") in ap.FORMATI_TIPO else self._tipo()
        partecipanti = [str(x).strip() for x in (opzioni.get("partecipanti") or []) if str(x).strip()][:30]
        if tipo != self._tipo():
            self.cfg["tipo"] = tipo
            salva_config(self.cfg)
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
                                                "formato_appunti": self._formato(tipo),
                                                "lingua_lezione": self.cfg.get("lingua_lezione") or testi.LINGUA,
                                                "modo": modo, "parole": self.parole_di(nome),
                                                "precisa": bool(self.cfg.get("trascrizione_precisa")),
                                                "quando": "dopo" if dopo else "durante",
                                                "tipo": tipo, "partecipanti": partecipanti,
                                                "chi_parla": bool(self.cfg.get("chi_parla", True)),
                                                "mio": self.cfg.get("mio") or None})
            self.trascrivi_dopo = dopo
            self.cartella_corrente = cart
            self.appunti_lezione = bool(self.cfg.get("appunti_attivi") and self.chiave())
            self.formato_vista = self._formato(tipo)
            self.parti = {1: {"stato": "reg", "orario": self._orario(1)}}
            self.finale = None
            self.avviso_fine = ""
            self.nome_rec = nome
            self.titolo_fine = nome
            self._livelli = [0.0] * 48
            self.reg = rg.Registratore(cart, nome, self.parte_sec, modo=modo, microfono=microfono,
                                       diretta=bool(self.cfg.get("diretta")))
            self.reg.on_parte = lambda k: self.coda.put(("parte_finita", k))
            self.reg.avvia()
            self.diretta, self.formati_extra = [], []
            if self.reg.diretta:
                threading.Thread(target=self._lavoro_diretta, args=(self.reg, cart), daemon=True).start()
            if pdf:
                threading.Thread(target=self._aggiungi_pdf_subito, args=(cart, pdf), daemon=True).start()
            self.occupato = True
            self._sveglio_voluto = True
            self.silenzio_da = time.monotonic()
            self._gb, self._gb_t = 0.0, 0
            self.vista = "reg"
            log.info("inizio registrazione: %s", cart)
            return {"ok": True, "mini": bool(self.cfg.get("mini_finestra", True))}

    # ------------------------------------------------------------------ importa un video

    def info_video(self, percorso):
        import importa as im
        i = im.info_file(percorso)
        prec = bool(self.cfg.get("trascrizione_precisa"))
        v = self.cfg.get("velocita_trascrizione_precisa" if prec else "velocita_trascrizione")
        if not v:      # non ancora misurata in questa modalita': la precisa ci mette circa una volta e mezza
            v = float(self.cfg.get("velocita_trascrizione") or 0.8) / (1.5 if prec else 1)
        i["stima"] = round(i["durata"] / max(0.1, float(v)))
        return i

    def info_link(self, url):
        """Titolo e durata del video di un link (YouTube, Drive, Dropbox...), senza scaricarlo."""
        import scarica_link as sl
        try:
            d = sl.info(url)
        except sl.ErroreLink as e:
            return {"ok": False, "msg": tr(f"link_{e}")}
        except Exception:
            log.exception("info link")
            return {"ok": False, "msg": tr("link_non_video")}
        prec = bool(self.cfg.get("trascrizione_precisa"))
        v = self.cfg.get("velocita_trascrizione_precisa" if prec else "velocita_trascrizione") or \
            float(self.cfg.get("velocita_trascrizione") or 0.8) / (1.5 if prec else 1)
        return {"ok": True, "link": url.strip(), "nome_file": d["titolo"] or url.strip()[:60], "nome_proposto": d["titolo"],
                "durata": d["durata"], "ha_video": d["ha_video"], "peso": 0, "sito": d["sito"],
                "data": datetime.datetime.now().isoformat(timespec="seconds"),
                "stima": round(d["durata"] / max(0.1, float(v))) if d["durata"] else 0}

    def importa_link(self, url, nome, lingua=None, cerca_slide=True):
        """Come «Importa un video», ma prima scarica il video dal link."""
        import scarica_link as sl
        nome = (nome or "").strip() or "Video"
        tmp = BASE / "scaricamento"
        shutil.rmtree(tmp, ignore_errors=True)
        tmp.mkdir(parents=True, exist_ok=True)
        segnaposto = tmp / "in_corso.txt"
        segnaposto.write_text(url, encoding="utf-8")
        r = self.importa(segnaposto, nome, lingua, cerca_slide, link=url)
        return r

    def importa(self, percorso, nome, lingua=None, cerca_slide=True, link=None):
        import importa as im
        src = Path(percorso)
        if not src.exists():
            return {"ok": False, "msg": "?"}
        with self._lock:
            if self.occupato:
                return {"ok": False, "msg": tr("aspetta_lavoro")}
            nome = (nome or "").strip() or src.stem
            self.ricorda_materia(nome)
            try:
                quando = datetime.datetime.now() if link else datetime.datetime.fromtimestamp(src.stat().st_mtime)
            except OSError:
                quando = datetime.datetime.now()
            cart = BASE / f"{quando:%Y-%m-%d %H%M} - {el.nome_sicuro(nome)}"
            n = 2
            while cart.exists():
                cart = BASE / f"{quando:%Y-%m-%d %H%M} - {el.nome_sicuro(nome)} ({n})"
                n += 1
            cart.mkdir(parents=True)
            self.parte_sec = int(os.environ.get("RL_PARTE_SECONDI") or int(self.cfg.get("parte_minuti", 30)) * 60)
            lingua = lingua if lingua in testi.LEZIONE else (self.cfg.get("lingua_lezione") or testi.LINGUA)
            el.scrivi_json(cart / "info.json", {"nome": nome, "inizio": quando.isoformat(timespec="seconds"),
                                                "durata": 0, "n_slide": 0, "stato": "importazione", "pacchetti": {},
                                                "studente": self.cfg.get("studente") or {}, "importata": True,
                                                "file_originale": link or str(src), "parte_secondi": self.parte_sec,
                                                "lingua_appunti": testi.LINGUA, "lingua_lezione": lingua,
                                                "formato_appunti": self._formato(), "parole": self.parole_di(nome),
                                                "precisa": bool(self.cfg.get("trascrizione_precisa")),
                                                "tipo": self._tipo(), "mio": self.cfg.get("mio") or None,
                                                "chi_parla": bool(self.cfg.get("chi_parla", True))})
            self.cartella_corrente = cart
            self.appunti_lezione = bool(self.cfg.get("appunti_attivi") and self.chiave())
            self.formato_vista = self._formato()
            self.formati_extra = []
            self.parti = {}
            self.finale = 0.0
            self.avviso_fine = ""
            self.titolo_fine = nome
            self.nome_rec = nome
            self.vista = "fine"
            self.occupato = True
            self._sveglio_voluto = True
            self.imp = {"fase": 0, "perc": 0.0, "slide": None, "cerca_slide": bool(cerca_slide), "link": bool(link), "off": 1 if link else 0}
        threading.Thread(target=self._importa_lavoro, args=(cart, src, bool(cerca_slide), link), daemon=True).start()
        log.info("importazione: %s -> %s", src, cart)
        return {"ok": True}

    def _imp_perc(self, fase, f):
        if self.imp is not None:
            self.imp.update(fase=fase + int(self.imp.get("off") or 0), perc=round(float(f), 3))

    def _importa_lavoro(self, cart, src, cerca, link=None):
        import importa as im
        try:
            if link:          # prima si scarica dal link (fase 0), poi tutto come un file
                import scarica_link as sl
                self.imp.update(fase=0, perc=0.0)
                try:
                    src = sl.scarica(link, Path(src).parent, lambda f: self.imp.update(fase=0, perc=round(float(f), 3)),
                                     solo_audio=not cerca)
                except Exception as e:
                    shutil.rmtree(cart, ignore_errors=True)          # niente lezione vuota in elenco
                    raise RuntimeError(tr(f"link_{e}") if isinstance(e, sl.ErroreLink) else tr("link_rete"))
            info = im.info_file(src)
            durata = info["durata"]
            dest = im.copia(src, cart, lambda f: self._imp_perc(0, f))
            parti = im.dividi_audio(dest, cart, self.parte_sec, durata, lambda f: self._imp_perc(1, f))
            slides = []
            if cerca and info["ha_video"]:
                self._imp_perc(2, 0)
                slides = im.cerca_slide(dest, cart, durata, lambda f: self._imp_perc(2, f))
            if self.imp is not None:
                self.imp["slide"] = len(slides)
            el.scrivi_json(cart / "meta.json", {"nome": self.nome_rec, "audio_t0": 0.0, "video_t0": 0.0,
                                                "durata": durata, "slides": slides, "errori": [],
                                                "parte_secondi": self.parte_sec})
            el.aggiorna_info(cart, durata=round(durata), n_slide=len(slides), stato="elaborazione")
            if link:
                shutil.rmtree(Path(src).parent, ignore_errors=True)
            self._imp_perc(3, 0)
            self.coda.put(("importato", (cart, list(parti), durata)))
        except Exception:
            log.exception("importazione")
            self.coda.put(("errore", traceback.format_exc()))

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
        if formato == "mio" and not info.get("mio"):
            el.aggiorna_info(cart, mio=self.cfg.get("mio"))
        pac, fatti = info.get("pacchetti") or {}, info.get(ap.chiave_info(formato)) or {}
        if not info.get("formato_appunti"):
            el.aggiorna_info(cart, formato_appunti=formato)
        with self._lock:
            self.formato_vista = formato
            self.formati_extra = []
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

    def _tipo(self):
        return self.cfg.get("tipo") if self.cfg.get("tipo") in ap.FORMATI_TIPO else "lezione"

    def _formato(self, tipo=None):
        """Il formato degli appunti di serie: per le lezioni quello scelto in Impostazioni,
        per le riunioni il verbale, per i webinar i punti chiave."""
        tipo = tipo or self._tipo()
        if tipo == "riunione":
            return "verbale"
        if tipo == "webinar":
            return "webinar"
        f = self.cfg.get("formato_appunti")
        if f == "mio" and (self.cfg.get("mio") or {}).get("descrizione"):
            return "mio"
        return "esame" if f == "esame" else "cornell"

    def stima_appunti(self, cartella):
        info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
        minuti = max(1, round((info.get("durata") or 0) / 60))
        return round(max(0.01, 0.2 * minuti / 60), 2)

    def rifai_appunti(self, cartella, formati=None):
        """Rifà pacchetti e appunti di una lezione già pronta (di serie nel formato scelto in Impostazioni;
        con formati=[...] in quei formati). Costa qualche centesimo."""
        cart = Path(cartella)
        ap.sistema_vecchi(cart)
        info = el.leggi_json(cart / "info.json", {}) or {}
        pac = info.get("pacchetti") or {}
        if not pac or self.occupato:
            return {"ok": False}
        f_serie = self._formato(info.get("tipo") if info.get("tipo") in ap.FORMATI_TIPO else "lezione")
        formati = [f for f in (formati or [f_serie]) if f in ap.FORMATI] or [f_serie]
        if "mio" in formati:            # «Il mio formato» com'e' adesso in Impostazioni
            el.aggiorna_info(cart, mio=self.cfg.get("mio") or info.get("mio"))
        # le parole difficili di adesso (magari aggiunte dopo la registrazione)
        el.aggiorna_info(cart, parole=self.parole_di(info.get("nome", "")))
        for formato in formati:
            self._togli_appunti(cart, info, pac, formato)
        formato = formati[0]
        el.aggiorna_info(cart, formato_appunti=formato)
        with self._lock:
            self.formati_extra = formati[1:]
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

    def _togli_appunti(self, cart, info, pac, formato):
        if formato == "esame":
            try:
                ap.file_classifica(cart).unlink()
            except OSError:
                pass
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
        el.aggiorna_info(cart, **{ap.chiave_info(formato): {}, ap.chiave_completi(formato): None})

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
            nome = ((info.get("mio") or {}).get("nome") or tr("fmt_mio")) if formato == "mio" else tr(f"fmt_{formato}")
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
            appunti = {k: v for f in ap.FORMATI for k, v in fatti[f].items()}
            mancano = {f: [k for k, z in pac.items() if Path(z).exists() and k not in fatti[f]] for f in ap.FORMATI}
            puo = stato == "pronta" and ha_chiave and not self.occupato and bool(pac)
            tipo = info.get("tipo") if info.get("tipo") in ap.FORMATI_TIPO else "lezione"
            # i formati che hanno senso per questo tipo («Il mio formato» solo se e' stato descritto)
            possibili = [f for f in ap.FORMATI_TIPO[tipo] if f != "mio" or (info.get("mio") or self.cfg.get("mio"))]
            f_serie = self._formato(tipo)
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
                "crea_anche": [f for f in possibili if puo and appunti and not fatti[f]],
                "completa_appunti": [f for f in ap.FORMATI if puo and fatti[f] and mancano[f]],
                "rifai": [f for f in ap.FORMATI if puo and fatti[f] and not mancano[f]],
                "rifai_appunti": bool(puo and fatti.get(f_serie) and not mancano[f_serie]),
                "formato_serie": f_serie, "tipo": tipo,
                "nome_mio": (info.get("mio") or self.cfg.get("mio") or {}).get("nome") or "",
                "capitoli": any(ap.capitoli_di(cart)),
                "infografica": (cart / "infografica.json").exists(),
                "voci": len((el.leggi_json(cart / "voci.json", {}) or {}).get("voci") or []),
                "sigla": sigla(nome), "colore": colore_materia(nome), "materia": materia_di(nome),
                "docente": (cart / "docente.json").exists(), "mappa": (cart / "mappa.json").exists(),
                "aula": info.get("modo") == "aula", "trascritta": any(cart.glob("trascrizione_*.json")),
                "ripasso": rp.conta(cart) if appunti or any(cart.glob("appunti_*.json")) else {"n": 0, "no": 0, "tre": 0},
                "formato": info.get("formato_appunti") or "cornell",
                "importata": bool(info.get("importata")),
                "dopo": stato == "da_completare" and info.get("quando") == "dopo" and not in_corso,
                "lingua_lezione": info.get("lingua_rilevata") if info.get("lingua_lezione") == "auto" else info.get("lingua_lezione"),
            })
        try:
            liberi = shutil.disk_usage(BASE).free
        except OSError:
            liberi = 0
        return {"lezioni": out, "video_tot": tot_video, "video_testo": gb_testo(tot_video),
                "quota": tot_video / (tot_video + liberi) if (tot_video + liberi) else 0, "base": str(BASE)}

    # ------------------------------------------------------------------ in aula: microfoni

    def microfoni(self):
        return rg.microfoni()

    def livello_microfono(self, mid=None):
        if self.reg is not None:
            return -1.0
        return rg.livello_microfono(mid or None)

    # ------------------------------------------------------------------ testo in diretta

    def _lavoro_diretta(self, reg, cart):
        """Mentre si registra: trascrive l'audio a pezzi da circa 45 secondi, per farlo leggere subito.
        E' solo un'anteprima: la trascrizione vera (piu' precisa) si fa come sempre per ogni parte."""
        import numpy as np
        info = el.leggi_json(cart / "info.json", {}) or {}
        lingua = info.get("lingua_lezione") or testi.LINGUA
        parole = info.get("parole") or []
        t0, pezzi = None, []
        threads = max(1, (os.cpu_count() or 2) // 2)
        while True:
            fermo = reg.stop_ev.wait(4)
            nuovo = reg.prendi_diretta()
            if nuovo:
                if t0 is None:
                    t0 = nuovo[0]
                pezzi.append(nuovo[1])
            durata = sum(len(p) for p in pezzi) / 48000
            if pezzi and (durata >= float(os.environ.get("RL_DIRETTA_SECONDI") or 45) or (fermo and durata >= 2)):
                audio = np.concatenate(pezzi)
                audio = audio[:len(audio) // 3 * 3].reshape(-1, 3).mean(axis=1).astype(np.float32)   # 48 -> 16 kHz
                inizio, t0, pezzi = t0, None, []
                try:
                    self.diretta_lav = True
                    modello = el.modello_in_uso(threads)
                    segs, _ = modello.transcribe(audio, language=None if lingua == "auto" else lingua,
                                                 vad_filter=True, beam_size=1, condition_on_previous_text=False,
                                                 hotwords=", ".join(parole) if parole else None)
                    for sg in segs:
                        testo = (sg.text or "").strip()
                        if testo:
                            with self._lock:
                                self.diretta.append({"t": int(inizio + sg.start), "testo": testo})
                except Exception:
                    log.exception("testo in diretta")
                finally:
                    self.diretta_lav = False
            if fermo:
                break
        try:
            el.scrivi_json(cart / "diretta.json", self.diretta)
        except Exception:
            pass

    # ------------------------------------------------------------------ parole difficili

    @staticmethod
    def _chiave_materia(m):
        return (m or "").strip().lower()

    def parole_di(self, nome):
        d = (self.cfg.get("parole") or {}).get(self._chiave_materia(materia_di(nome or "")))
        return list((d or {}).get("p") or [])

    def _parole_n(self):
        return sum(len((d or {}).get("p") or []) for d in (self.cfg.get("parole") or {}).values())

    def parole(self, materia=None):
        """Le materie (recenti, con parole salvate, delle lezioni registrate), le parole di quella scelta e
        alcune proposte prese dai suoi appunti (le parole chiave che tornano di piu')."""
        from collections import Counter
        nomi = []
        for m in (self.cfg.get("materie_recenti") or []) + [d.get("m", "") for d in (self.cfg.get("parole") or {}).values()]:
            if m and self._chiave_materia(m) not in [self._chiave_materia(x) for x in nomi]:
                nomi.append(m)
        lezioni = []
        try:
            for c in sorted((p for p in BASE.iterdir() if (p / "info.json").exists()), key=lambda p: p.name, reverse=True):
                nome = (el.leggi_json(c / "info.json", {}) or {}).get("nome", "")
                lezioni.append((c, materia_di(nome)))
                if materia_di(nome) and self._chiave_materia(materia_di(nome)) not in [self._chiave_materia(x) for x in nomi]:
                    nomi.append(materia_di(nome))
        except OSError:
            pass
        materia = materia or (nomi[0] if nomi else "")
        km = self._chiave_materia(materia)
        attuali = list(((self.cfg.get("parole") or {}).get(km) or {}).get("p") or [])
        conta = Counter()
        for c, m in lezioni:
            if self._chiave_materia(m) != km:
                continue
            for carta in rp.carte_lezione(c):
                for w in carta["parole"]:
                    w = str(w).strip()
                    if 2 < len(w) <= 40 and sum(ch.isalpha() for ch in w) >= 3:
                        conta[w] += 1
        gia = {w.lower() for w in attuali}
        proposte = [w for w, _ in conta.most_common(40) if w.lower() not in gia][:10]
        return {"materie": nomi[:12], "materia": materia, "parole": attuali, "proposte": proposte}

    def salva_parole(self, materia, lista):
        km = self._chiave_materia(materia)
        if not km:
            return {"ok": False}
        pulite = []
        for w in lista or []:
            w = str(w).strip()[:60]
            if w and w.lower() not in [x.lower() for x in pulite]:
                pulite.append(w)
        tutte = self.cfg.get("parole") or {}
        if pulite:
            tutte[km] = {"m": materia.strip(), "p": pulite[:40]}
        else:
            tutte.pop(km, None)
        self.cfg["parole"] = tutte
        salva_config(self.cfg)
        return {"ok": True, "parole": pulite[:40]}

    # ------------------------------------------------------------------ chiedi alla lezione

    def chiedi(self, cartelle, storia, testo):
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        cartelle = [c for c in cartelle if Path(c).is_dir()]
        if not cartelle or not (testo or "").strip():
            return {"ok": False, "msg": tr("ch_vuoto")}
        try:
            r = ch.domanda(self.chiave(), cartelle, storia, testo.strip())
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("chiedi alla lezione")
            return {"ok": False, "msg": tr("ap_imprevisto")}
        if len(cartelle) == 1:      # la conversazione resta con la lezione
            p = Path(cartelle[0]) / "chiedi.json"
            st = (el.leggi_json(p, []) or []) + [{"chi": "io", "testo": testo.strip()}, {"chi": "cl", "testo": r["testo"]}]
            el.scrivi_json(p, st[-60:])
            info = el.leggi_json(Path(cartelle[0]) / "info.json", {}) or {}
            el.aggiorna_info(cartelle[0], spesa_appunti=round(float(info.get("spesa_appunti") or 0) + r["spesa"], 4))
        return {"ok": True, **r}

    def chiedi_storia(self, cartella):
        return el.leggi_json(Path(cartella) / "chiedi.json", []) or []

    def chiedi_cancella(self, cartella):
        try:
            (Path(cartella) / "chiedi.json").unlink()
        except OSError:
            pass
        return True

    def momento(self, cartella, sec=0, slide=None):
        try:
            return ch.momento(Path(cartella), float(sec or 0), slide)
        except Exception:
            log.exception("momento")
            return {"sec": int(sec or 0), "ora": ch.hms(sec), "slide": None, "img": "", "frasi": []}

    def video_url(self, cartella):
        v = video_di(Path(cartella))
        return servi_video.registra(v) if v else None

    # ------------------------------------------------------------------ mappa mentale

    def mappa(self, cartella, rifai=False):
        cart = Path(cartella)
        if not rifai:
            d = el.leggi_json(cart / "mappa.json")
            if d:
                return {"ok": True, "mappa": d, "nuova": False}
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            d, spesa = ch.crea_mappa(self.chiave(), cart)
            return {"ok": True, "mappa": d, "nuova": True, "spesa": spesa}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("mappa mentale")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def mappa_pdf(self, cartella, apri_dopo=True):
        cart = Path(cartella)
        d = el.leggi_json(cart / "mappa.json")
        if not d:
            return {"ok": False}
        info = el.leggi_json(cart / "info.json", {}) or {}
        L = testi.lingua_di(info)
        dest_dir = Path(self.cfg["cartella_pacchetti"])
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{tr('mp_titolo', L)} – {el.nome_sicuro(info.get('nome', cart.name))}.pdf"
        try:
            ch.pdf_mappa(d, info, dest)
        except Exception:
            log.exception("PDF mappa")
            return {"ok": False, "msg": tr("ap_imprevisto")}
        (apri if apri_dopo else mostra_file)(dest)
        return {"ok": True, "file": str(dest)}

    # ------------------------------------------------------------------ slide del docente (PDF)

    def capitoli(self, cartella):
        """Indice della registrazione: [{"sec", "inizio", "titolo", "dettaglio"}] + indirizzo del video."""
        cart = Path(cartella)
        out = sorted(ap.capitoli_di(cart), key=lambda c: c.get("sec", 0))
        info = el.leggi_json(cart / "info.json", {}) or {}
        return {"capitoli": out, "video": self.video_url(cartella), "nome": info.get("nome", ""),
                "audio": bool(video_di(cart)) and str(video_di(cart)).endswith(".m4a")}

    def infografica(self, cartella, rifai=False):
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            return {"ok": True, **ch.crea_infografica(cartella, self.chiave(), rifai)}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("infografica")
            return {"ok": False, "msg": tr("ch_err")}

    # ------------------------------------------------------------------ «Chi parla»

    def _nomi_voci(self, cartella):
        """Dopo ogni parte: Claude propone i nomi delle voci nuove (riunioni e webinar, se c'e' la chiave)."""
        if self.chiave():
            ch.suggerisci_nomi(cartella, self.chiave())

    def voci(self, cartella):
        """Per la pagina «Chi parla»: voci, trascrizione con i nomi e indirizzo del video."""
        import voci as vc
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        d = vc.elenco(cart)
        d.update({"nome": info.get("nome", ""), "tipo": info.get("tipo") or "lezione",
                  "video": self.video_url(cartella), "fatte": (cart / "voci.json").exists(),
                  "audio": bool(video_di(cart)) and str(video_di(cart)).endswith(".m4a"),
                  "durata": el.durata_leggibile(info.get("durata", 0)) if info.get("durata") else ""})
        return d

    def voci_nomi(self, cartella, nomi):
        """Salva i nomi dati a mano e rifa' la trascrizione completa (HTML, PDF per Claude, testo)."""
        import voci as vc
        try:
            vc.rinomina(cartella, {str(k): v for k, v in (nomi or {}).items()})
            if (el.leggi_json(Path(cartella) / "info.json", {}) or {}).get("stato") == "pronta":
                el.crea_completa(cartella)
            return {"ok": True, **self.voci(cartella)}
        except Exception:
            log.exception("nomi delle voci")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def voci_rifai(self, cartella):
        """Riconosce le voci di una registrazione gia' finita (anche di prima di «Chi parla»)."""
        import voci as vc
        try:
            el.aggiorna_info(cartella, chi_parla=True)
            vc.rifai(cartella)
            try:
                self._nomi_voci(cartella)
            except Exception:
                log.exception("nomi delle voci")
            if (el.leggi_json(Path(cartella) / "info.json", {}) or {}).get("stato") == "pronta":
                el.crea_completa(cartella)
            return {"ok": True, **self.voci(cartella)}
        except Exception:
            log.exception("chi parla")
            return {"ok": False, "msg": tr("vc_err")}

    def infografica_pdf(self, cartella, apri_dopo=True):
        try:
            f = ch.pdf_infografica(cartella, self.cfg["cartella_pacchetti"])
            if apri_dopo:
                apri(f)
            return {"ok": True, "file": str(f)}
        except Exception:
            log.exception("infografica pdf")
            return {"ok": False}

    def prova_mio(self, mio):
        """Prova «Il mio formato» sulla prima parte dell'ultima registrazione con appunti possibili: apre il PDF."""
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        if self.occupato:
            return {"ok": False, "msg": tr("aspetta_lavoro")}
        mio = {"nome": str((mio or {}).get("nome") or tr("fmt_mio"))[:60], "descrizione": str((mio or {}).get("descrizione") or "")[:2000]}
        if not mio["descrizione"].strip():
            return {"ok": False, "msg": tr("mio_vuoto")}
        for l in self.lezioni()["lezioni"]:
            cart = Path(l["cartella"])
            info = el.leggi_json(cart / "info.json", {}) or {}
            pac = info.get("pacchetti") or {}
            if l["stato"] != "pronta" or not pac:
                continue
            k = sorted(pac, key=int)[0]
            prova = cart / "prova_mio"
            try:
                import shutil as _sh
                _sh.rmtree(prova, ignore_errors=True)
                prova.mkdir()
                for f in ("info.json", f"pacchetto_{int(k):03d}.json"):
                    if (cart / f).exists():
                        _sh.copy(cart / f, prova / f)
                for f in cart.glob("trascrizione_*.json"):
                    _sh.copy(f, prova / f.name)
                if (cart / "slide").exists():
                    _sh.copytree(cart / "slide", prova / "slide")
                el.aggiorna_info(prova, mio=mio, pacchetti={k: pac[k]}, appunti_mio={})
                dest, spesa = ap.crea_appunti(prova, int(k), self.chiave(), str(prova), "mio")
                apri(dest)
                return {"ok": True, "lezione": l["nome"], "file": str(dest), "spesa": round(spesa, 3)}
            except ap.ErroreAppunti as e:
                return {"ok": False, "msg": str(e)}
            except Exception:
                log.exception("prova del mio formato")
                return {"ok": False, "msg": tr("ap_imprevisto")}
        return {"ok": False, "msg": tr("mio_nessuna")}

    # ------------------------------------------------------------------ calendario

    def _cal_modo(self, ev):
        return (self.cfg.get("cal_scelte") or {}).get(ev["uid"]) or self.cfg.get("cal_modo") or "avvisa"

    def _cal_json(self, ev):
        return {"id": ev["id"], "uid": ev["uid"], "titolo": ev["titolo"], "fonte": ev["fonte"],
                "inizio": ev["inizio"].isoformat(), "fine": ev["fine"].isoformat(),
                "ora": f"{ev['inizio']:%H:%M}–{ev['fine']:%H:%M}", "giorno": ev["inizio"].date().isoformat(),
                "link": ev["link"], "partecipanti": ev["partecipanti"], "aula": ev["aula"], "modo": self._cal_modo(ev),
                "luogo": ev["luogo"]}

    def _cal_adesso(self):
        """L'impegno appena cominciato o che sta per cominciare (per riempire il nome in Registra)."""
        ora = datetime.datetime.now().astimezone()
        for ev in self.cal_lista:
            if ev["inizio"] - datetime.timedelta(minutes=20) <= ora <= ev["fine"]:
                return self._cal_json(ev)
        return None

    def _calendario(self):
        n = 0
        while True:
            try:
                fonti, orario = self.cfg.get("calendari") or [], self.cfg.get("orario") or []
                if fonti or orario:
                    if n % 2 == 0:
                        self.cal.aggiorna(fonti)
                    self.cal_lista = self.cal.impegni(fonti, orario)
                    self._cal_controlla()
                else:
                    self.cal_lista = []
            except Exception:
                log.exception("calendario")
            n += 1
            time.sleep(30)

    def _cal_controlla(self):
        ora = datetime.datetime.now().astimezone()
        # fine impegno: chiedo se fermare la registrazione partita per l'impegno
        r = self.cal_rec
        if r and self.reg is not None and ora >= r["fine"] and not self.cal_fine and r["id"] + ":fine" not in self.cal_gestiti:
            self.cal_gestiti.add(r["id"] + ":fine")
            self.cal_fine = {"id": r["id"], "titolo": r["titolo"], "fine": f"{r['fine']:%H:%M}"}
            self._davanti()
        if self.reg is None:
            self.cal_rec = None if (r and ora >= r["fine"]) else self.cal_rec
        for ev in self.cal_lista:
            if ev["id"] in self.cal_gestiti:
                continue
            modo = self._cal_modo(ev)
            if modo == "niente" or ora > ev["inizio"] + datetime.timedelta(minutes=10):
                continue
            if modo == "avvisa" and ora >= ev["inizio"] - datetime.timedelta(minutes=2):
                self.cal_gestiti.add(ev["id"])
                if self.occupato:
                    continue
                self.cal_avviso = dict(self._cal_json(ev), minuti=max(0, round((ev["inizio"] - ora).total_seconds() / 60)))
                self._davanti()
            elif modo == "solo" and ora >= ev["inizio"] - datetime.timedelta(seconds=40):
                self.cal_gestiti.add(ev["id"])
                if not self.occupato:
                    self._cal_registra(ev, auto=True)

    def _davanti(self):
        if self.on_avviso:
            try:
                self.on_avviso()
            except Exception:
                log.exception("finestra davanti")

    def _cal_registra(self, ev, auto=False):
        """Registra l'impegno: apre il link della riunione (se c'e') e parte, col nome e i partecipanti."""
        if ev.get("link"):
            apri(ev["link"])
        tipo = "lezione" if ev.get("lezione") else self._tipo()
        r = self.avvia(ev["titolo"], {"modo": "aula" if ev.get("aula") else "online", "tipo": tipo,
                                     "partecipanti": ev.get("partecipanti") or []})
        if r.get("ok"):
            self.cal_rec = ev
            log.info("calendario: registro «%s»", ev["titolo"])
            if auto and r.get("mini") and self.on_avvio_auto:
                try:
                    self.on_avvio_auto()
                except Exception:
                    log.exception("mini finestra")
        return r

    def cal_rispondi(self, id_, registra):
        a, self.cal_avviso = self.cal_avviso, None
        if not registra or not a or a["id"] != id_:
            return {"ok": True}
        ev = next((e for e in self.cal_lista if e["id"] == id_), None)
        if not ev:
            return {"ok": False}
        return self._cal_registra(ev)

    def cal_fine_rispondi(self, ferma):
        self.cal_fine = None
        if ferma and self.reg is not None:
            self.cal_rec = None
            return self.fine()
        return {"ok": True}

    def cal_elenco(self):
        return {"fonti": [{"url": f["url"], "nome": f.get("nome") or cal.nome_fonte(f["url"]),
                           "errore": self.cal.errori.get(f["url"], "")} for f in self.cfg.get("calendari") or []],
                "orario": self.cfg.get("orario") or [], "modo": self.cfg.get("cal_modo") or "avvisa",
                "impegni": [self._cal_json(e) for e in self.cal_lista[:30]]}

    def cal_aggiungi(self, url):
        url = (url or "").strip()
        if not re.match(r"^(https?|webcal)://", url, re.I):
            return {"ok": False, "msg": tr("cal_link_err")}
        try:
            b = cal.scarica(url)
            if b"BEGIN:VCALENDAR" not in b[:2000].upper():
                return {"ok": False, "msg": tr("cal_non_ics")}
            adesso = datetime.datetime.now().astimezone()
            n = len(cal.impegni_ics(b, cal.nome_fonte(url), adesso, adesso + datetime.timedelta(days=7)))
        except Exception as e:
            log.warning("calendario nuovo: %s", e)
            return {"ok": False, "msg": tr("cal_scarica_err")}
        fonti = [f for f in (self.cfg.get("calendari") or []) if f.get("url") != url]
        fonti.append({"url": url, "nome": cal.nome_fonte(url)})
        self.cfg["calendari"] = fonti
        salva_config(self.cfg)
        self.cal.aggiorna(fonti, forza=True)
        self.cal_lista = self.cal.impegni(fonti, self.cfg.get("orario") or [])
        return {"ok": True, "n": n}

    def cal_togli(self, url):
        self.cfg["calendari"] = [f for f in (self.cfg.get("calendari") or []) if f.get("url") != url]
        salva_config(self.cfg)
        self.cal_lista = self.cal.impegni(self.cfg["calendari"], self.cfg.get("orario") or [])
        return {"ok": True}

    def cal_orario(self, righe):
        pulite = []
        for r in righe or []:
            try:
                g = int(r.get("giorno"))
                d, a = str(r.get("dalle") or ""), str(r.get("alle") or "")
                if not (0 <= g <= 6 and re.match(r"^\d{1,2}:\d{2}$", d) and re.match(r"^\d{1,2}:\d{2}$", a)):
                    continue
                pulite.append({"giorno": g, "dalle": d, "alle": a, "nome": str(r.get("nome") or "").strip()[:90] or "Lezione",
                               "dove": "aula" if r.get("dove") == "aula" else "online", "link": str(r.get("link") or "").strip()[:300]})
            except (TypeError, ValueError):
                continue
        self.cfg["orario"] = pulite
        salva_config(self.cfg)
        self.cal_lista = self.cal.impegni(self.cfg.get("calendari") or [], pulite)
        return {"ok": True, "n": len(pulite)}

    def cal_scelta(self, uid, modo):
        modo = modo if modo in ("avvisa", "solo", "niente") else "avvisa"
        if uid == "*":
            self.cfg["cal_modo"] = modo
        else:
            sc = self.cfg.get("cal_scelte") or {}
            sc[uid] = modo
            self.cfg["cal_scelte"] = sc
        salva_config(self.cfg)
        return {"ok": True}

    def info_pdf(self, percorso):
        try:
            return {"ok": True, **dc.info_pdf(percorso)}
        except Exception:
            log.exception("info pdf")
            return {"ok": False}

    def _aggiungi_pdf_subito(self, cart, pdf):
        """In aula, PDF scelto prima di registrare: preparo le pagine mentre si registra."""
        try:
            dc.aggiungi(cart, pdf)
        except Exception:
            log.exception("slide del docente")

    def stima_docente(self, cartella):
        info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
        n = max(1, len([f for f in ap.FORMATI if ap.appunti_fatti(info, f)]))
        return round(self.stima_appunti(cartella) * n, 2)

    def aggiungi_docente(self, cartella, pdf):
        """Lezione gia' pronta: aggiungo le slide del docente e rifaccio pacchetti e appunti."""
        if self.occupato:
            return {"ok": False, "msg": tr("aspetta_lavoro")}
        cart = Path(cartella)
        try:
            dc.aggiungi(cart, pdf)
            dc.allinea(cart)
        except dc.ErroreDocente:
            return {"ok": False, "msg": tr("dc_err")}
        except Exception:
            log.exception("slide del docente")
            return {"ok": False, "msg": tr("dc_err")}
        info = el.leggi_json(cart / "info.json", {}) or {}
        # tengo una copia degli appunti di prima
        for f in ap.FORMATI:
            tutti = info.get(ap.chiave_completi(f))
            for k, v in list((info.get(ap.chiave_info(f)) or {}).items()) + ([("tutti", tutti)] if tutti else []):
                try:
                    if Path(v).exists():
                        shutil.copy2(v, Path(v).with_name(Path(v).stem + " " + tr("dc_copia") + ".pdf"))
                except OSError:
                    pass
        formati = [f for f in ap.FORMATI if ap.appunti_fatti(info, f)]
        if formati and self.chiave():
            return self.rifai_appunti(cart, formati)
        # niente appunti (o niente chiave): rifaccio solo i pacchetti
        pac = info.get("pacchetti") or {}
        for k in pac:
            try:
                el.crea_pacchetto(cart, int(k), self.cfg["cartella_pacchetti"])
            except Exception:
                log.exception("pacchetto %s con slide del docente", k)
        return {"ok": True, "solo_pacchetti": True}

    # ------------------------------------------------------------------ ripasso (flashcard)

    def ripasso(self, cartelle, modo="prima"):
        try:
            return {"ok": True, "carte": rp.prepara([c for c in cartelle if Path(c).is_dir()], modo)}
        except Exception:
            log.exception("ripasso")
            return {"ok": False, "carte": []}

    def ripasso_voto(self, cartella, cid, sapevo):
        try:
            return rp.voto(cartella, cid, bool(sapevo))
        except Exception:
            log.exception("voto ripasso")
            return False

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
            threads = max(1, cores // 2) if self.reg is not None else max(2, cores - 1)
            try:
                if tipo == "parte":
                    k = lavoro[2]
                    self.coda.put(("parte_perc", (k, 0.0)))
                    gia = (Path(cart) / f"trascrizione_{k:03d}.json").exists()
                    t0, sec = time.monotonic(), el.durata_wav(Path(cart) / f"audio_{k:03d}.wav")
                    el.trascrivi_parte(cart, k, lambda f: self.coda.put(("parte_perc", (k, f))), threads)
                    if not gia and sec > 60 and self.reg is None:
                        # velocita' di questo PC (secondi di audio per secondo di lavoro): serve per le stime
                        v = sec / max(1.0, time.monotonic() - t0)
                        chiave_v = "velocita_trascrizione_precisa" if (el.leggi_json(Path(cart) / "info.json", {}) or {}).get("precisa") \
                            else "velocita_trascrizione"
                        vecchia = float(self.cfg.get(chiave_v) or v)
                        self.cfg[chiave_v] = round(0.5 * vecchia + 0.5 * v, 3)
                        salva_config(self.cfg)
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
            ap.appunti_lezione_completa(cart, self.cfg["cartella_pacchetti"], chiave=self.chiave() or None)
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
            self.parti[k] = {"stato": "dopo" if self.trascrivi_dopo else "attesa", "orario": self._orario(k)}
            self.parti[k + 1] = {"stato": "reg", "orario": self._orario(k + 1)}
            if not self.trascrivi_dopo:
                self.accoda_parte(self.cartella_corrente, k)
        elif tipo == "registrazione_ferma" and self.trascrivi_dopo:
            # "trascrivi dopo": la lezione resta da completare ("Trascrivi ora" in Le mie registrazioni)
            cart, ultima, durata, errori = dato
            for k in list(self.parti):
                if k > ultima:
                    self.parti.pop(k)
                else:
                    self.parti[k]["stato"] = "dopo"
            el.aggiorna_info(cart, stato="da_completare")
            self.trascrivi_dopo = False
            self.finale = "ok"
            self.avviso_fine = tr("fine_dopo")
            self.occupato = False
            self._sveglio_voluto = False
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
        elif tipo == "importato":
            cart, parti, durata = dato
            for k in parti:
                fine_k = min(k * self.parte_sec, durata)
                self.parti[k] = {"stato": "attesa", "orario": self._orario(k, fine_k)}
                self.accoda_parte(cart, k)
            self.lavori.put(("finale", cart))
        elif tipo == "parte_perc":
            k, f = dato
            if k in self.parti:
                self.parti[k].update(stato="lav", perc=f)
        elif tipo == "parte_ok":
            k, f = dato
            self.parti.setdefault(k, {"orario": self._orario(k)}).update(stato="ok", file=f)
            if self.appunti_lezione and not self.parti[k].get("ap"):
                self.accoda_appunti(self.cartella_corrente, k)
                for f in self.formati_extra:
                    self.lavori_appunti.put((self.cartella_corrente, k, f))
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
            self.imp = None
            self.occupato = False
            self._sveglio_voluto = False
        elif tipo == "errore":
            self.imp = None
            self.occupato = False
            self._sveglio_voluto = False
            self.finale = None
            self.vista = "pronto"
            ultima = dato.strip().splitlines()[-1]
            if ultima.startswith("RuntimeError: "):          # messaggio gia' scritto per chi usa il programma
                self._messaggio(tr("err_tit"), ultima[len("RuntimeError: "):])
            else:
                self._messaggio(tr("err_tit"), tr("err_testo") + "\n\n" + ultima)

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
