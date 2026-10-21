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
import json
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
import urllib.parse
from pathlib import Path

QUI = Path(__file__).resolve().parent
import edizione as ed      # noqa: E402  (Verba Manent IA o Scripta Manent)
APP = ed.NOME
SITO_ASSISTENZA = "https://puntowebferrara.com/contatti/"


def sito_privacy():
    """L'informativa privacy sul sito, nella lingua del programma."""
    return "https://verbamanent.app/privacy/" if testi.LINGUA == "it" else "https://verbamanent.app/en/privacy/"


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
    it = cartella_documenti() / ed.CARTELLA_LEZIONI[0]
    en = cartella_documenti() / ed.CARTELLA_LEZIONI[1]
    if it.exists() or not en.exists() and _lingua_pc() == "it":
        return it
    return en


def _lingua_pc():
    import testi
    return testi.lingua_windows()


BASE = _base()
BASE.mkdir(parents=True, exist_ok=True)
CONFIG = Path(os.environ.get("APPDATA") or Path.home() / ".config") / ed.CARTELLA_CONFIG / "config.json"

logging.basicConfig(filename=str(BASE / "registra_lezione.log"), level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(message)s", encoding="utf-8")
log = logging.getLogger("registra_lezione")
logging.getLogger("fontTools").setLevel(logging.WARNING)

import aggiorna as agg               # noqa: E402
import rapporti                      # noqa: E402  rapporti sugli errori, solo col consenso
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
    if ed.SCRIPTA:                  # Scripta Manent: lettura facilitata sempre accesa, si registrano solo lezioni
        c["lettura_facilitata"] = True
        c["tipo"] = "lezione"
    return c


def salva_config(c):
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    el.scrivi_json(CONFIG, c)


# ----------------------------------------------------------------------------- file

def apri(percorso):
    """Apre un file o una cartella con il programma di Windows. False se non ci riesce."""
    try:
        if str(percorso).startswith(("http://", "https://")):    # un link nei testi: si apre nel browser
            import webbrowser
            return bool(webbrowser.open(str(percorso)))
        if sys.platform == "win32":
            os.startfile(str(percorso))
        else:
            subprocess.Popen(["xdg-open", str(percorso)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception:
        log.exception("apri %s", percorso)
        return False


def _senza_accenti(s):
    """«perché Città» -> «perche citta»: la ricerca trova anche se si scrive senza accenti."""
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", str(s).lower()) if unicodedata.category(c) != "Mn")


def mostra_file(percorso):
    """Apre la cartella con il file gia' selezionato."""
    p = Path(percorso)
    if sys.platform == "win32" and p.exists():
        subprocess.Popen(f'explorer /select,"{p}"')
        return True
    return apri(p.parent)


def manda_email(dest, oggetto, testo, file_eml, allegati, doc=None):
    """Email pronta da mandare: su Windows un .eml che si apre in Outlook / Posta (sul telefono: l'app di posta)."""
    import condividi as cd
    return apri(cd.crea_eml(doc, dest, oggetto, testo, file_eml, allegati))


def apri_calendario(eventi, file_ics):
    """Gli impegni nel calendario: su Windows il file .ics (Outlook / Calendario); sul telefono il calendario del telefono."""
    import condividi as cd
    return apri(cd.crea_ics(eventi, file_ics))


def taglia(src, dest, da, a, audio, srt=None):
    """Un pezzo della registrazione con ffmpeg (sul telefono: solo l'audio, copiato senza ricodificarlo)."""
    cmd = [el.ffmpeg_exe(), "-y", "-nostdin", "-loglevel", "error", "-ss", f"{da:.2f}", "-t", f"{a - da:.2f}", "-i", str(src)]
    if not audio:
        if srt:
            cmd += ["-i", str(srt)]
        cmd += ["-map", "0:v:0?", "-map", "0:a:0?"] + (["-map", "1:0", "-c:s", "mov_text", "-metadata:s:s:0", "language=ita"] if srt else []) + \
               ["-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
                "-movflags", "+faststart", str(dest)]
    else:
        cmd += ["-vn", "-c:a", "aac", "-b:a", "96k", str(dest)]
    r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, creationflags=el.NO_WINDOW)
    if r.returncode != 0:
        log.error("spezzone: %s", r.stderr.decode("utf-8", "replace")[-800:])
    return r.returncode == 0 and Path(dest).exists()


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
                for prova in range(6):          # se un lavoro sta ancora scrivendo li' dentro, riprovo
                    try:
                        shutil.rmtree(p)
                        break
                    except OSError:
                        if prova == 5:
                            raise
                        time.sleep(1)
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


def _dove_errore(e):
    """«motore.py:1150 > appunti.py:382»: gli ultimi punti del programma dove e' successo un errore."""
    import traceback
    return " > ".join(f"{Path(f.filename).name}:{f.lineno}" for f in traceback.extract_tb(e.__traceback__)[-3:])


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


def materia_scritta(nome):
    """La materia presa dal nome solo se c'e' il trattino («Fisiologia – Lezione 3»); altrimenti nessuna
    (meglio chiederla che usare il nome intero della lezione come materia)."""
    nome = str(nome or "")
    return materia_di(nome) if (" – " in nome or " - " in nome) else ""


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
    if sys.platform != "win32" or not getattr(sys, "frozen", False) or ed.SCRIPTA:
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


def testo_appunti():
    """Il testo copiato (per riconoscere un invito appena incollato). Sul telefono lo sostituisce android_motore."""
    try:
        if sys.platform == "win32":
            r = subprocess.run(["powershell", "-NoProfile", "-Command", "Get-Clipboard -Raw"], capture_output=True,
                               timeout=8, creationflags=el.NO_WINDOW)
            return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else ""
        if sys.platform == "darwin":
            return subprocess.run(["pbpaste"], capture_output=True, timeout=5).stdout.decode("utf-8", "replace")
    except Exception:
        log.exception("appunti di sistema")
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
        import licenza
        self.lic = licenza.Licenza(self.cfg, salva_config)
        ap.LICENZA = self.lic
        self.lic.controlla_dopo()
        el.FACILITATA = bool(self.cfg.get("lettura_facilitata"))     # «Lettura facilitata»: anche nei PDF
        el.LETTURA = self._lettura()
        self._blocco_cloud = threading.Lock()
        try:
            rapporti.installa(agg.versione_locale().get("versione", "?"))
            rapporti.attivo = bool(self.cfg.get("rapporti_errori"))
        except Exception:
            log.exception("rapporti")
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
        el.SERVER = self._server     # «Dove trascrivo: sul server»
        self._blocco_note = threading.Lock()
        self.cal_lista, self.cal_avviso, self.cal_fine, self.cal_rec = [], None, None, None
        self.cal_gestiti = set()
        self.on_avviso = None          # la finestra si mette davanti
        self.on_avvio_auto = None      # registrazione partita da sola: la finestra apre la mini finestra
        threading.Thread(target=self._calendario, daemon=True).start()
        threading.Thread(target=rinomina_collegamenti, daemon=True).start()
        for f in (self._lavoratore, self._lavoratore_appunti, self._prepara_modello, self._ciclo, self._riprova_cloud):
            threading.Thread(target=f, daemon=True).start()
        threading.Thread(target=self.controlli, daemon=True).start()
        threading.Thread(target=self.avvia_sincronizza, daemon=True).start()

    # ------------------------------------------------------------------ utilita'

    def chiave(self):
        k = ap.leggi_chiave(self.cfg.get("chiave", ""))
        if not k and getattr(self, "lic", None) is not None and self.lic.abbonato():
            import licenza
            return licenza.CHIAVE_ABBONAMENTO          # Claude compreso nell'abbonamento
        return k

    # ------------------------------------------------------------------ prova gratuita e abbonamento (licenza.py)
    def _lic_blocco(self):
        """Prova finita: niente lezioni nuove (le lezioni gia' fatte restano tutte)."""
        if getattr(self, "lic", None) is not None and self.lic.bloccato():
            return {"ok": False, "msg": self.lic.messaggio(), "licenza": self.lic.stato()}
        return None

    def licenza(self, forza=False):
        if forza:
            self.lic.controlla(forza=True)
        else:
            self.lic.controlla_dopo()
        return self.lic.stato()

    def licenza_accedi(self):
        self.lic.accedi(apri, {k: tr("nv_pag_" + k) for k in ("ok_t", "ok_s", "no_t", "no_s")})
        return {"ok": True}

    def licenza_abbonati(self):
        import licenza
        apri(licenza.SITO + ("/en/" if testi.LINGUA == "en" else "/") + "?abbonamento=1#prezzi")
        return {"ok": True}

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

    def _sicuro(self, nome, fn, altrimenti=None):
        """Una parte dello stato che non deve MAI fermare la pagina: se si rompe, la pagina va avanti senza
        (e nel log l'errore compare una volta al minuto, non a ogni secondo)."""
        try:
            return fn()
        except Exception:
            visti = self.__dict__.setdefault("_errori_stato", {})
            if time.monotonic() - visti.get(nome, -999) > 60:
                visti[nome] = time.monotonic()
                log.exception("stato: %s", nome)
            return altrimenti

    def stato(self):
        with self._lock:
            s = {"vista": self.vista, "occupato": self.occupato, "registro": self.reg is not None,
                 "nome": self.nome_rec, "titolo_fine": self.titolo_fine, "avviso_fine": self.avviso_fine,
                 "modello": self.modello_msg, "agg": self.agg, "messaggi": list(self.messaggi),
                 "audio_ok": self.audio_ok, "liberi": self.liberi,
                 "finale": self.finale, "cal_avviso": self.cal_avviso, "cal_fine": self.cal_fine,
                 "cal_ora": self._sicuro("calendario", self._cal_adesso)}
            if self.reg is not None:
                r = self.reg
                pausa = r.in_pausa
                avviso = ""
                if "audio" in r.errori:
                    avviso = tr("avviso_audio_err")
                elif not pausa and time.monotonic() - self.silenzio_da > 60:
                    avviso = tr("avviso_silenzio")
                s.update(secondi=int(r.secondi()), slide=r.n_slide, pausa=pausa, avviso=avviso, modo=r.modo,
                         gb=self._sicuro("spazio", lambda: round(self.gb_registrati(), 2), 0),
                         livello=float(r.livello), livelli=list(self._livelli),
                         pausa_sec=int(r.secondi_di_pausa()) if pausa else 0,
                         diretta_on=r.diretta, diretta=self.diretta[-14:], diretta_lav=self.diretta_lav,
                         n_note=self._sicuro("note", lambda: len(self.note()), 0), aperte=getattr(self, "aperte", []),
                         avvisa=getattr(self, "avvisa", None))
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
            s["spesa"] = self._sicuro("spesa", self._spesa)
            s["cornell"] = self._sicuro("anteprima appunti", self._anteprima_cornell) if self.vista == "fine" else None
            s["formato"] = self.formato_vista
            s["importa"] = self.imp
            s["sync"] = self._sicuro("sync", self._sync_breve)
            return s

    def _spesa(self):
        if not self.cartella_corrente:
            return None
        info = el.leggi_json(Path(self.cartella_corrente) / "info.json", {}) or {}
        n = sum(len(info.get(ap.chiave_info(f)) or {}) for f in ap.FORMATI)
        srv = float(info.get("spesa_server") or 0)
        if not n and not info.get("server"):
            return None
        return {"n": n, "dollari": round(float(info.get("spesa_appunti") or 0), 2), "server": bool(info.get("server")),
                "server_dollari": round(srv, 3)}

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
            blocchi = [b for b in (d.get("blocchi") or []) if isinstance(b, dict)]
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
                "privacy_ok": bool(self.cfg.get("privacy_ok")),
                "rapporti": bool(self.cfg.get("rapporti_errori")), "rapporti_chiesto": "rapporti_errori" in self.cfg,
                "lingua_lezione": self.cfg.get("lingua_lezione") or testi.LINGUA,
                "formato": self._formato("lezione"), "tipo": self._tipo(), "mio": self.cfg.get("mio") or None,
                "esempi_mio": ap.ESEMPI_MIO.get(testi.LINGUA, ap.ESEMPI_MIO["it"]),
                "cartella": str(cart), "minuti": int(self.cfg.get("parte_minuti", 30)),
                "appunti_on": bool(self.cfg.get("appunti_attivi")) and ha_chiave, "chiave": ha_chiave,
                "licenza": self.lic.stato(),
                "nome_classe": self.cfg.get("nome_classe") or "",
                "lettura": self._lettura(), "aula_rumorosa": bool(self.cfg.get("aula_rumorosa")), "sm_voce_vel": float(self.cfg.get("sm_voce_vel") or 0.9), "sm_timer": int(self.cfg.get("sm_timer") or 15),
                "rg_max": int(self.cfg.get("rg_max") or 20), "rg_modo": self.cfg.get("rg_modo") or "carte",
                "rg_promemoria": bool(self.cfg.get("rg_promemoria", True)), "rg_ora": self.cfg.get("rg_ora") or "18:00",
                "da_invito": self.cfg.get("da_invito") or "", "invito_nascosto": bool(self.cfg.get("invito_nascosto")),
                "ha_server": bool(self._server_dati()),
                "app_codice": int(agg.versione_locale().get("codice") or 0),
                "puo_invitare": bool(ha_chiave or self._server_dati()) and not self.cfg.get("da_invito"),
                "mini": bool(self.cfg.get("mini_finestra", True)), "dnd": bool(self.cfg.get("promemoria_dnd", True)),
                "studente": self.cfg.get("studente") or {}, "recenti": self.cfg.get("materie_recenti") or [],
                "schermo": schermo_risoluzione(), "versione": agg.versione_locale().get("versione", "?"),
                "audio_ok": self.audio_ok, "liberi": self.liberi, "base": str(BASE),
                "modo": "aula" if self.cfg.get("modo") == "aula" else "online", "microfono": self.cfg.get("microfono") or "",
                "diretta": bool(self.cfg.get("diretta")), "parole_n": self._parole_n(),
                "precisa": bool(self.cfg.get("trascrizione_precisa")),
                "chi_parla": bool(self.cfg.get("chi_parla", True)),
                "facilitata": bool(self.cfg.get("lettura_facilitata")), "edizione": ed.EDIZIONE, "nome_app": ed.NOME,
                "dove": self.cfg.get("trascrivi_dove") or "qui", "server_endpoint": (self._server_dati() or {}).get("endpoint", ""),
                "modello": self.cfg.get("modello") or "generica", "modelli_nome": self.cfg.get("modelli_nome") or {},
                "modello_mio": self.cfg.get("modello_mio") or None,
                "modelli": [{"k": k, "nome": v.get(testi.LINGUA, v["it"])} for k, v in ap.MODELLI.items()],
                "quando": "dopo" if self.cfg.get("quando") == "dopo" else "durante",
                "solo_carica": bool(self.cfg.get("solo_carica", True)),
                "velocita": self.cfg.get("velocita_trascrizione_precisa" if self.cfg.get("trascrizione_precisa")
                                         else "velocita_trascrizione")}

    # ------------------------------------------------------------------ impostazioni

    def _lettura(self):
        """«Come leggo meglio»: carattere, grandezza, spazio, sfondo, sillabe colorate, righello."""
        d = self.cfg.get("lettura") or {}
        return {"f": d.get("f") if d.get("f") in el.FONT_DSA else "lexend",
                "g": d.get("g") if d.get("g") in (17, 20, 24, 28) else 20,
                "s": d.get("s") if d.get("s") in (1, 2, 3) else 2,
                "b": d.get("b") if d.get("b") in el.SFONDI_PDF else "grigio",
                "sil": bool(d.get("sil")), "rig": bool(d.get("rig"))}

    def imposta(self, campo, valore):
        if campo == "privacy_ok":
            # «Prima di iniziare»: spunta sul permesso di registrare, con data e ora
            self.cfg["privacy_ok"] = datetime.datetime.now().isoformat(timespec="seconds")
        elif campo == "rapporti_errori":
            # consenso ai rapporti sugli errori (si', no, cambiato in Impostazioni), con data e ora
            self.cfg["rapporti_errori"] = rapporti.attivo = bool(valore)
            self.cfg["rapporti_quando"] = datetime.datetime.now().isoformat(timespec="seconds")
        elif campo == "lingua":
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
            self.cfg["tipo"] = valore if valore in ap.FORMATI_TIPO and not ed.SCRIPTA else "lezione"
        elif campo == "mio":
            v = valore or {}
            self.cfg["mio"] = {"nome": str(v.get("nome") or "").strip()[:60] or tr("fmt_mio"),
                               "descrizione": str(v.get("descrizione") or "").strip()[:2000]}
        elif campo == "modello_mio":
            v = valore or {}
            self.cfg["modello_mio"] = {"nome": str(v.get("nome") or "").strip()[:60] or tr("modello_mio"),
                                       "descrizione": str(v.get("descrizione") or "").strip()[:2000]}
        elif campo == "lingua_lezione":
            if valore not in testi.LEZIONE:
                return {"ok": False, "msg": "?"}
            self.cfg["lingua_lezione"] = valore
            self.cfg["lingua_lezione_scelta"] = True
        elif campo == "lettura":
            self.cfg["lettura"] = {**self._lettura(), **(valore if isinstance(valore, dict) else {})}
            self.cfg["lettura"] = el.LETTURA = self._lettura()
        elif campo == "rg_max":
            self.cfg["rg_max"] = int(valore) if int(valore) in (10, 20, 30) else 20
        elif campo == "rg_modo":
            self.cfg["rg_modo"] = valore if valore in ("carte", "voce", "croc", "lampo") else "carte"
        elif campo == "rg_ora":
            self.cfg["rg_ora"] = valore if re.fullmatch(r"\d{2}:\d{2}", str(valore or "")) else "18:00"
        elif campo == "parte_minuti":
            self.cfg["parte_minuti"] = 60 if int(valore) == 60 else 30
        elif campo == "sm_timer":           # Timer concentrazione: minuti di lavoro (la pausa e' un terzo, almeno 5)
            try:
                self.cfg["sm_timer"] = max(5, min(45, int(valore)))
            except (TypeError, ValueError):
                return {"ok": False, "msg": "?"}
        elif campo == "sm_voce_vel":
            try:
                self.cfg["sm_voce_vel"] = max(0.6, min(1.4, float(valore)))
            except (TypeError, ValueError):
                return {"ok": False, "msg": "?"}
        elif campo in ("aula_rumorosa", "rg_promemoria", "invito_nascosto", "mini_finestra", "promemoria_dnd", "diretta", "trascrizione_precisa", "solo_carica", "chi_parla", "inizia_fatto"):
            self.cfg[campo] = bool(valore)
        elif campo == "lettura_facilitata":
            self.cfg[campo] = el.FACILITATA = bool(valore) or ed.SCRIPTA
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

    # ------------------------------------------------------------------ copia nel cloud (solo PC)

    def copia_cloud(self, cart, aspetta=False):
        """Copia la lezione nel cloud scelto (se acceso), in un thread a parte: non rallenta niente."""
        if (self.cfg.get("cloud") or {}).get("dove", "no") == "no":
            return

        def lavoro():
            import cloud
            try:
                with self._blocco_cloud:
                    n = cloud.copia(cart, self.cfg)
                if n:
                    log.info("cloud: %s file di %s", n, Path(cart).name)
            except Exception as e:
                log.warning("cloud: %s non copiata (%s)", Path(cart).name, e)
                try:
                    el.aggiorna_info(cart, cloud={"ok": False, "quando": datetime.datetime.now().isoformat(timespec="minutes")})
                except Exception:
                    pass
        if aspetta:
            lavoro()
        else:
            threading.Thread(target=lavoro, daemon=True).start()

    def _riprova_cloud(self):
        """Le copie nel cloud non riuscite (Drive chiuso, disco pieno…) si riprovano ogni 10 minuti."""
        while True:
            time.sleep(600)
            try:
                if (self.cfg.get("cloud") or {}).get("dove", "no") == "no":
                    continue
                for p, i in self._lezioni_pronte():
                    if (i.get("cloud") or {}).get("ok") is False:
                        self.copia_cloud(p, aspetta=True)
            except Exception:
                log.exception("riprova cloud")

    def _lezioni_pronte(self):
        out = []
        try:
            for p in BASE.iterdir():
                i = el.leggi_json(p / "info.json") if (p / "info.json").exists() else None
                if isinstance(i, dict) and i.get("stato") == "pronta":
                    out.append((p, i))
        except OSError:
            pass
        return out

    def cloud_stato(self):
        import cloud
        c = self.cfg.get("cloud") or {}
        gd, od, rad = cloud.google_drive(), cloud.onedrive(), cloud.radice(self.cfg)
        ultima, n = None, 0
        for p, i in self._lezioni_pronte():
            q = i.get("cloud") or {}
            if q.get("ok"):
                if ultima is None or q.get("quando", "") > ultima["quando"]:
                    ultima = {"nome": i.get("nome", p.name), "quando": q.get("quando", "")}
            else:
                n += 1
        return {"dove": c.get("dove") or "no", "cartella": c.get("cartella") or "", "gdrive": str(gd) if gd else "",
                "onedrive": str(od) if od else "", "radice": str(rad) if rad else "",
                "cosa": {"appunti": True, "tras": True, "audio": True, **(c.get("cosa") or {})},
                "ultima": ultima, "da_copiare": n}

    def cloud_imposta(self, dove=None, cartella=None, cosa=None):
        c = dict(self.cfg.get("cloud") or {})
        if dove in ("no", "gdrive", "onedrive", "altro"):
            c["dove"] = dove
        if cartella:
            c["cartella"] = str(cartella)
        if isinstance(cosa, dict):
            c["cosa"] = {**(c.get("cosa") or {}), **{k: bool(v) for k, v in cosa.items() if k in ("appunti", "tras", "audio")}}
        self.cfg["cloud"] = c
        salva_config(self.cfg)
        return self.cloud_stato()

    def cloud_tutte(self):
        """«Copia anche le lezioni già fatte»: tutte quelle pronte, una dopo l'altra, in un thread."""
        cartelle = [p for p, _ in self._lezioni_pronte()]

        def tutte():
            for c in cartelle:
                self.copia_cloud(c, aspetta=True)
        threading.Thread(target=tutte, daemon=True).start()
        return {"ok": True, "n": len(cartelle)}

    # ------------------------------------------------------------------ inviti

    _SALE_INVITO = b"VerbaManentIA-invito-1"

    def _mescola(self, dati):
        """Nasconde il contenuto dell'invito (non e' una cassaforte: chi ha il messaggio lo puo' usare)."""
        import hashlib
        flusso = b""
        i = 0
        while len(flusso) < len(dati):
            flusso += hashlib.sha256(self._SALE_INVITO + i.to_bytes(4, "big")).digest()
            i += 1
        return bytes(a ^ b for a, b in zip(dati, flusso))

    def invito_prepara(self, per, claude=True, server=True):
        """Il messaggio da mandare su WhatsApp con le chiavi (solo chi le ha messe a mano)."""
        import base64
        import zlib
        if self.cfg.get("da_invito"):
            return {"ok": False, "msg": tr("inv_no")}
        per = re.sub(r"\s+", " ", str(per or "")).strip()[:40]
        dati = {"v": 1, "da": ((self.cfg.get("studente") or {}).get("nome") or "").strip()[:40], "per": per,
                "quando": datetime.date.today().isoformat()}
        if claude and self.chiave():
            dati["claude"] = self.chiave()
        srv = self._server_dati() if server else None
        if srv and srv.get("endpoint") and srv.get("chiave"):
            dati["srv"] = {"endpoint": srv["endpoint"], "chiave": srv["chiave"]}
        if "claude" not in dati and "srv" not in dati:
            return {"ok": False, "msg": tr("inv_niente")}
        codice = base64.urlsafe_b64encode(self._mescola(zlib.compress(json.dumps(dati).encode("utf-8")))).decode("ascii").rstrip("=")
        msg = tr("inv_msg", n=per or "", c="VMIA-INVITO-1:" + codice).replace("  ", " ")
        return {"ok": True, "messaggio": msg, "claude": "claude" in dati, "server": "srv" in dati}

    def _leggi_invito(self, testo):
        import base64
        import zlib
        # il telefono puo' cambiare l'inizio in minuscolo (correzione automatica dell'iPhone)
        t = re.sub(r"(?i)vmia-invito-1:\s*", "VMIA-INVITO-1:", str(testo or ""))
        m = re.search(r"VMIA-INVITO-1:([A-Za-z0-9_\-]+)", t)
        if not m:
            return None
        c = m.group(1)
        try:
            return json.loads(zlib.decompress(self._mescola(base64.urlsafe_b64decode(c + "=" * (-len(c) % 4)))).decode("utf-8"))
        except Exception:
            return None

    def invito_negli_appunti(self):
        """Al primo avvio: se e' stato appena copiato un messaggio d'invito, chi lo manda (per chiedere «lo attivo?»)."""
        if self.cfg.get("da_invito") or self.chiave() or self._server_dati():
            return {"ok": False}
        testo = testo_appunti() or ""
        d = self._leggi_invito(testo)
        if not d or not (d.get("claude") or d.get("srv")):
            return {"ok": False}
        return {"ok": True, "da": d.get("da") or "", "testo": testo}

    def invito_attiva(self, testo):
        """Incolla del messaggio d'invito: mette la chiave di Claude e il server."""
        dati = self._leggi_invito(testo)
        if not dati:
            return {"ok": False, "msg": tr("inv_err")}
        fatto = []
        if dati.get("claude"):
            self.cfg["chiave"] = ap.nascondi_chiave(dati["claude"])
            self.cfg["appunti_attivi"] = True
            fatto.append("claude")
        srv = dati.get("srv") or {}
        if srv.get("endpoint") and srv.get("chiave"):
            self.cfg["server_trascrizione"] = ap.nascondi_chiave(json.dumps({"endpoint": srv["endpoint"], "chiave": srv["chiave"]}))
            self.cfg["trascrivi_dove"] = "server"
            fatto.append("server")
        if not fatto:
            return {"ok": False, "msg": tr("inv_err")}
        self.cfg["da_invito"] = dati.get("da") or "?"
        salva_config(self.cfg)
        log.info("invito attivato (%s)", ", ".join(fatto))
        return {"ok": True, "da": dati.get("da") or "", "claude": "claude" in fatto, "server": "server" in fatto}

    def togli_chiave(self):
        self.cfg["chiave"] = ""
        self.cfg["appunti_attivi"] = False
        salva_config(self.cfg)
        return {"ok": True}

    def ricorda_materia(self, nome, materia=None):
        m = (materia or "").strip() or materia_di(nome)
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

    # ------------------------------------------------------------------ nomi unici

    @staticmethod
    def _norm_nome(n):
        return re.sub(r"\s+", " ", str(n or "").replace(" - ", " – ")).strip().casefold()

    def _nomi_usati(self, escludi=None):
        """{nome normalizzato: (nome, data gg/mm)} delle registrazioni che ci sono."""
        out = {}
        esc = str(Path(escludi)) if escludi else None
        try:
            cartelle = [p for p in BASE.iterdir() if p.is_dir()]
        except OSError:
            cartelle = []
        for c in cartelle:
            if esc and str(c) == esc:
                continue
            info = el.leggi_json(c / "info.json")
            if not isinstance(info, dict) or not info.get("nome"):
                continue
            try:
                d = datetime.datetime.fromisoformat(info.get("inizio", "")).strftime("%d/%m")
            except Exception:
                d = ""
            out[self._norm_nome(info["nome"])] = (info["nome"], d)
        return out

    def nome_libero(self, nome, escludi=None):
        """Il nome si puo' usare? Se no, il motivo e due nomi liberi da proporre."""
        nome = re.sub(r"\s+", " ", str(nome or "")).strip()
        if not nome:
            return {"ok": False, "vuoto": True, "proposte": []}
        lettere = [c for c in nome.lower() if c.isalpha()]
        if len(lettere) < 3 or len(set(lettere)) < 2:         # «b», «aaa», «12»: non vuol dire niente
            return {"ok": False, "corto": True, "proposte": []}
        if self._norm_nome(nome) in self.NOMI_GENERICI:        # «Lezione», «prova»…: non si ritrova più
            return {"ok": False, "generico": True, "proposte": []}
        usati = self._nomi_usati(escludi)
        if self._norm_nome(nome) not in usati:
            return {"ok": True}
        vecchio, data = usati[self._norm_nome(nome)]
        nome = vecchio                    # le proposte con le maiuscole giuste
        materia = materia_di(nome) or nome
        oggi = datetime.datetime.now().strftime("%d/%m")
        proposte = []
        p1 = f"{materia} – {oggi}"
        n = 2
        while self._norm_nome(p1) in usati:
            p1 = f"{materia} – {oggi} ({n})"
            n += 1
        proposte.append(p1)
        n = 2
        while self._norm_nome(f"{nome} – {n}") in usati or self._norm_nome(f"{nome} – {n}") == self._norm_nome(p1):
            n += 1
        proposte.append(f"{nome} – {n}")
        return {"ok": False, "vuoto": False, "nome": vecchio, "data": data, "proposte": proposte}

    NOMI_GENERICI = {"lezione", "riunione", "webinar", "registrazione", "prova", "test", "nuova", "nuovo",
                     "lecture", "meeting", "recording", "senza nome", "boh", "asd", "aaa", "xxx"}

    def nome_unico(self, nome):
        """Per chi parte da solo (calendario): il nome se e' libero, se no il primo nome libero proposto."""
        v = self.nome_libero(nome)
        if v.get("corto") or v.get("generico") or v.get("vuoto"):
            nome = f"{(nome or '').strip() or 'Lezione'} – {datetime.datetime.now():%d/%m %H.%M}"
            v = self.nome_libero(nome)
        return nome if v.get("ok") else (v.get("proposte") or [nome or "Lezione"])[0]

    def _msg_nome(self, v):
        if v.get("vuoto"):
            return tr("nome_vuoto")
        if v.get("corto") or v.get("generico"):
            return tr("nome_senso")
        return tr("nome_usato", n=v.get("nome", ""), p=" / ".join(v.get("proposte") or []))

    def avvia(self, nome, opzioni=None):
        b = self._lic_blocco()
        if b:
            return b
        opzioni = opzioni or {}
        v = self.nome_libero(nome)
        if not v.get("ok"):
            return {"ok": False, "msg": self._msg_nome(v), "nome": v}
        modo = "aula" if (opzioni.get("modo") or self.cfg.get("modo")) == "aula" else "online"
        microfono = opzioni.get("microfono") or self.cfg.get("microfono") or None
        pdf = opzioni.get("pdf") or None                 # slide del docente: anche online (sostituiscono le foto dallo schermo)
        dopo = (opzioni.get("quando") or self.cfg.get("quando")) == "dopo"
        tipo = opzioni.get("tipo") if opzioni.get("tipo") in ap.FORMATI_TIPO else self._tipo()
        partecipanti = [str(x).strip() for x in (opzioni.get("partecipanti") or []) if str(x).strip()][:30]
        modello = opzioni.get("modello") if opzioni.get("modello") in tuple(ap.MODELLI) + ("mio",) else None
        if tipo == "riunione" and modello:
            self.cfg.setdefault("modelli_nome", {})[nome.strip().lower()[:80]] = modello
            self.cfg["modello"] = modello
            salva_config(self.cfg)
        if tipo != self._tipo():
            self.cfg["tipo"] = tipo
            salva_config(self.cfg)
        with self._lock:
            if self.occupato:
                return {"ok": False}
            nome = (nome or "").strip() or "Lezione"
            materia = str((opzioni or {}).get("materia") or "").strip()[:60]
            self.ricorda_materia(nome, materia)
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
                                                **({"materia": materia} if materia else {}),
                                                **({"rumorosa": True} if self.cfg.get("aula_rumorosa") else {}),
                                                "precisa": bool(self.cfg.get("trascrizione_precisa")),
                                                "quando": "dopo" if dopo else "durante",
                                                "tipo": tipo, "partecipanti": partecipanti,
                                                "chi_parla": bool(self.cfg.get("chi_parla", True)),
                                                "mio": self.cfg.get("mio") or None,
                                                "modello": modello if tipo == "riunione" else None,
                                                "modello_mio": self.cfg.get("modello_mio") if modello == "mio" else None})
            self.aperte = []
            if tipo == "riunione":
                try:
                    import cose
                    self.aperte = cose.aperte_per_nome(BASE, nome, escludi=cart)
                    if self.aperte:
                        el.aggiorna_info(cart, aperte_prima=self.aperte)
                except Exception:
                    log.exception("cose aperte")
            self.trascrivi_dopo = dopo
            self.cartella_corrente = cart
            self.avvisa = {"id": cart.name, "tipo": tipo, "modo": modo, "fatto": "",
                           "lingua": self.cfg.get("lingua_lezione") or testi.LINGUA}
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
        if self._server():          # sul server: circa 15 volte il tempo reale, piu' l'accensione
            i["stima"] = round(i["durata"] / 15 + 60)
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
        b = self._lic_blocco()
        if b:
            return b
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
        b = self._lic_blocco()
        if b:
            return b
        import importa as im
        src = Path(percorso)
        if not src.exists():
            return {"ok": False, "msg": "?"}
        v = self.nome_libero(nome)
        if not v.get("ok"):
            return {"ok": False, "msg": self._msg_nome(v)}
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

    def info_testo(self, percorso):
        """Per la pagina «Importa una trascrizione»: quante pagine/parole, o il motivo per cui non va."""
        import testo_importato as ti
        p = Path(percorso)
        try:
            testo = ti.leggi(p)
        except ti.ErroreTesto as e:
            return {"ok": False, "msg": tr("it_err_tipo" if str(e) == "tipo" else "it_err_vuoto")}
        except Exception:
            log.exception("leggo il testo da importare")
            return {"ok": False, "msg": tr("it_err_vuoto")}
        parole = len(testo.split())
        nome = re.sub(r"^(Per Claude|For Claude)\s*[-–]\s*", "", p.stem).strip() or p.stem
        return {"ok": True, "percorso": str(p), "file": p.name, "parole": parole, "nome": nome,
                "stima": self.stima_appunti_parole(parole)}

    def stima_appunti_parole(self, parole):
        minuti = max(1, round(parole / 140))
        return round(max(0.01, 0.2 * minuti / 60), 2)

    def importa_testo(self, percorso, nome, formato=None):
        """Crea una registrazione dal testo (senza audio) e prepara gli appunti nel formato scelto."""
        b = self._lic_blocco()
        if b:
            return b
        import testo_importato as ti
        src = Path(percorso)
        if self.occupato:
            return {"ok": False, "msg": tr("aspetta_lavoro")}
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            testo = ti.leggi(src)
        except ti.ErroreTesto as e:
            return {"ok": False, "msg": tr("it_err_tipo" if str(e) == "tipo" else "it_err_vuoto")}
        v = self.nome_libero(nome)
        if not v.get("ok"):
            return {"ok": False, "msg": self._msg_nome(v)}
        nome = (nome or "").strip() or src.stem
        self.ricorda_materia(nome)
        quando = datetime.datetime.now()
        cart = BASE / f"{quando:%Y-%m-%d %H%M} - {el.nome_sicuro(nome)}"
        n = 2
        while cart.exists():
            cart = BASE / f"{quando:%Y-%m-%d %H%M} - {el.nome_sicuro(nome)} ({n})"
            n += 1
        cart.mkdir(parents=True)
        segs = ti.segmenti(testo)
        durata = round(segs[-1]["fine"]) if segs else 0
        tipo = self._tipo()
        if formato not in ap.FORMATI:
            formato = self._formato(tipo)
        el.scrivi_json(cart / "info.json", {"nome": nome, "inizio": quando.isoformat(timespec="seconds"),
                                            "durata": durata, "n_slide": 0, "stato": "pronta", "pacchetti": {},
                                            "studente": self.cfg.get("studente") or {}, "importata": True,
                                            "da_testo": True, "file_originale": str(src),
                                            "parte_secondi": max(durata + 60, 3600),
                                            "lingua_appunti": testi.LINGUA,
                                            "lingua_lezione": self.cfg.get("lingua_lezione") or testi.LINGUA,
                                            "formato_appunti": formato, "parole": self.parole_di(nome),
                                            "tipo": tipo, "mio": self.cfg.get("mio") or None, "chi_parla": False})
        el.scrivi_json(cart / "trascrizione_001.json", segs)
        try:
            el.crea_pacchetto(cart, 1, self.cfg["cartella_pacchetti"])
            el.crea_completa(cart, segs)
        except Exception as e:
            log.exception("importa testo")
            return {"ok": False, "msg": f"{type(e).__name__}: {e} [{_dove_errore(e)}]"}
        log.info("testo importato: %s -> %s (%s parole)", src, cart, len(testo.split()))
        r = self.appunti_mancanti(str(cart), formato)
        return {**r, "cartella": str(cart)}

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

    # ------------------------------------------------------------------ «Le tue note» durante la registrazione

    TIPI_NOTA = ("importante", "chiarire", "fare", "")

    def nota(self, testo, tipo=""):
        """Una nota con il minuto della registrazione (⭐ importante, ❓ da chiarire, ✅ cosa da fare, o testo libero)."""
        if self.reg is None or self.cartella_corrente is None:
            return {"ok": False, "note": []}
        testo = str(testo or "").strip()[:300]
        tipo = tipo if tipo in self.TIPI_NOTA else ""
        if not testo and not tipo:
            return {"ok": False, "note": self.note()}
        sec = round(float(self.reg.secondi()), 1)
        with self._blocco_note:
            f = Path(self.cartella_corrente) / "note.json"
            note = el.leggi_json(f, []) or []
            note.append({"sec": sec, "ora": el.hms(sec), "tipo": tipo, "testo": testo})
            el.scrivi_json(f, note)
        return {"ok": True, "note": note}

    def note(self, cartella=None):
        c = cartella or self.cartella_corrente
        return el.leggi_json(Path(c) / "note.json", []) or [] if c else []

    def chiedi_diretta(self, domanda, storia=None):
        """«Chiedi in diretta»: una domanda su quello che si e' detto finora nella registrazione in corso."""
        if self.reg is None or self.cartella_corrente is None:
            return {"ok": False, "msg": tr("dd_finita")}
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            with self._lock:
                diretta = list(self.diretta)
            r = ch.domanda_in_diretta(self.chiave(), self.cartella_corrente, diretta, float(self.reg.secondi()),
                                      storia or [], str(domanda or "")[:500])
            return {"ok": True, **r}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("chiedi in diretta")
            return {"ok": False, "msg": tr("ch_err")}

    def nota_togli(self, i):
        if self.cartella_corrente is None:
            return {"ok": False, "note": []}
        with self._blocco_note:
            f = Path(self.cartella_corrente) / "note.json"
            note = el.leggi_json(f, []) or []
            if 0 <= int(i) < len(note):
                note.pop(int(i))
                el.scrivi_json(f, note)
        return {"ok": True, "note": note}

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

    def _pacchetti_mancanti(self, cart):
        """Parti trascritte senza il loro pacchetto (o con il file sparito): lo rifaccio, se no gli appunti
        di quella parte non si possono creare. Ritorna True se ne ha rifatto qualcuno."""
        info = el.leggi_json(cart / "info.json", {}) or {}
        pac = info.get("pacchetti") or {}
        rifatti = False
        self._err_pacchetto = ""
        for f in sorted(cart.glob("trascrizione_[0-9][0-9][0-9].json")):
            try:
                k = int(f.stem.split("_")[1])
            except ValueError:
                continue
            z = pac.get(str(k))
            if z and Path(z).exists():
                continue
            segs = el.leggi_json(f, [])
            if not isinstance(segs, list) or not segs:
                continue
            try:
                el.crea_pacchetto(cart, k, self.cfg["cartella_pacchetti"])
                log.info("pacchetto della parte %s rifatto (mancava)", k)
                rifatti = True
            except Exception as e:
                log.exception("pacchetto mancante, parte %s", k)
                self._err_pacchetto = f"{type(e).__name__}: {e} [{_dove_errore(e)}]"
        return rifatti

    def diagnosi_appunti(self, cartella):
        """Due righe per capire perche' gli appunti non partono (si fotografano e si mandano)."""
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        pac = info.get("pacchetti") or {}
        righe = [
                 f"durata {info.get('durata')} · parte {el.parte_secondi(cart)} · stato {info.get('stato')}",
                 "pacchetti: " + (", ".join(f"{k}{'' if Path(v).exists() else '(manca file)'}" for k, v in sorted(pac.items())) or "nessuno")]
        for f in sorted(cart.glob("trascrizione_*.json")):
            segs = el.leggi_json(f)
            n = sum(len(str(x.get("testo") or "").split()) for x in segs if isinstance(x, dict)) if isinstance(segs, list) else type(segs).__name__
            righe.append(f"{f.name}: {n} parole")
        righe.append("audio: " + (", ".join(sorted(p.name for p in cart.glob("audio_*"))) or "nessuno"))
        righe.append("vuote: " + str([k for k in pac if ap.parte_vuota(cart, k)]))
        return "\n".join(r for r in righe if r)

    def appunti_mancanti(self, cartella, formato=None):
        """Crea gli appunti che mancano, nel formato indicato (gli altri restano come sono)."""
        cart = Path(cartella)
        ap.sistema_vecchi(cart)
        info = el.leggi_json(cart / "info.json", {}) or {}
        if formato not in ap.FORMATI:
            formato = info.get("formato_appunti") or self._formato()
        if formato == "mio" and not info.get("mio"):
            el.aggiorna_info(cart, mio=self.cfg.get("mio"))
        if self._pacchetti_mancanti(cart):
            info = el.leggi_json(cart / "info.json", {}) or {}
        if self._err_pacchetto:
            return {"ok": False, "msg": self._err_pacchetto}
        pac, fatti = info.get("pacchetti") or {}, info.get(ap.chiave_info(formato)) or {}
        if not info.get("formato_appunti"):
            el.aggiorna_info(cart, formato_appunti=formato)
        with self._lock:
            self.formato_vista = formato
            self.formati_extra = []
            self.cartella_corrente = cart
            self.parti = {}
            for k in ap.parti_utili(cart, pac):
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
        if info.get("stato") == "pronta" and int(info.get("pdf_v") or 0) < ap.PDF_V and not (self.occupato and self.cartella_corrente and Path(self.cartella_corrente) == Path(cart)):
            try:            # PDF fatti con una versione vecchia: rifatti dai .json (colori nuovi, slide sulla lavagna), gratis
                ap.rifai_pdf(cart, self.cfg["cartella_pacchetti"])
                info = el.leggi_json(Path(cart) / "info.json", {}) or {}
            except Exception:
                log.exception("rifai i PDF vecchi")
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
            try:
                tot_video += self._voce_lezione(cart, ha_chiave, out)
            except Exception as e:
                # una registrazione con qualcosa che non va non deve far sparire tutte le altre dall'elenco
                log.exception("elenco: %s", cart.name)
                info = el.leggi_json(cart / "info.json", {}) or {}
                nome = info.get("nome", cart.name)
                out.append({"cartella": str(cart), "nome": nome, "quando": cart.name[:16], "durata": "", "n_slide": 0,
                            "stato": "pronta" if info.get("stato") == "pronta" else "da_completare", "video": "", "video_testo": "",
                            "n_appunti": 0, "n_pacchetti": 0, "formati": [], "crea_appunti": False, "crea_anche": [],
                            "completa_appunti": [], "rifai": [], "rifai_appunti": False, "formato_serie": "cornell",
                            "tipo": info.get("tipo") or "lezione", "nome_mio": "", "capitoli": False, "infografica": False,
                            "voci": 0, "sigla": sigla(info.get("materia") or nome), "colore": colore_materia(info.get("materia") or nome), "materia": info.get("materia") or materia_scritta(nome),
                            "docente": False, "mappa": False, "aula": False, "trascritta": False,
                            "ripasso": {"n": 0, "no": 0, "tre": 0}, "formato": "cornell", "importata": False, "dopo": False,
                            "lingua_lezione": None, "errore": f"{type(e).__name__}: {e} [{_dove_errore(e)}]"[:300]})
        try:
            liberi = shutil.disk_usage(BASE).free
        except OSError:
            liberi = 0
        return {"lezioni": out, "video_tot": tot_video, "video_testo": gb_testo(tot_video),
                "quota": tot_video / (tot_video + liberi) if (tot_video + liberi) else 0, "base": str(BASE)}

    def _voce_lezione(self, cart, ha_chiave, out):
        """Una riga dell'elenco (la aggiunge a out); ritorna i byte del video."""
        tot_video = 0
        if True:
            info = el.leggi_json(cart / "info.json", {}) or {}
            stato = info.get("stato")
            in_corso = self.cartella_corrente is not None and cart == Path(self.cartella_corrente) and self.occupato
            if stato == "pronta" and not in_corso and ((cart / "voci_impronte.tmp").exists() or (
                    (cart / "voci.json").exists() and '"centro"' in (cart / "voci.json").read_text(encoding="utf-8", errors="ignore"))):
                try:       # registrazioni fatte prima: via le impronte della voce rimaste
                    import voci as vc
                    vc.dimentica(cart)
                except Exception:
                    log.exception("impronte vecchie")
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
            el.sistema_in_corso(cart)
            try:
                ap.sistema_vuote(cart, self.cfg["cartella_pacchetti"])
            except Exception:
                log.exception("parti vuote")
            info = el.leggi_json(cart / "info.json", {}) or {}
            pac = info.get("pacchetti") or {}
            utili = set(ap.parti_utili(cart, pac))
            # parti trascritte senza pacchetto: «Crea appunti» lo rifa' (se no non c'e' niente da riassumere)
            senza_pac = [f for f in cart.glob("trascrizione_[0-9][0-9][0-9].json") if f.stem.split("_")[1].lstrip("0") not in pac]
            fatti = {f: ap.appunti_fatti(info, f) for f in ap.FORMATI}
            appunti = {k: v for f in ap.FORMATI for k, v in fatti[f].items()}
            mancano = {f: [k for k, z in pac.items() if k in utili and Path(z).exists() and k not in fatti[f]]
                       for f in ap.FORMATI}
            puo = stato == "pronta" and ha_chiave and not self.occupato and bool(pac or senza_pac)
            tipo = info.get("tipo") if info.get("tipo") in ap.FORMATI_TIPO else "lezione"
            # i formati che hanno senso per questo tipo («Il mio formato» solo se e' stato descritto)
            possibili = [f for f in ap.FORMATI_TIPO[tipo] if f != "mio" or (info.get("mio") or self.cfg.get("mio"))]
            f_serie = self._formato(tipo)
            nome = info.get("nome", cart.name)
            out.append({
                "cartella": str(cart), "nome": nome, "quando": quando,
                "n_foto": len(el.leggi_json(cart / "foto.json", []) or []), "n_scritti": len(el.leggi_json(cart / "scritti.json", []) or []),
                "durata": el.durata_leggibile(info.get("durata", 0)) if info.get("durata") else "",
                "n_slide": info.get("n_slide", 0), "stato": "in_corso" if in_corso else ("pronta" if stato == "pronta" else "da_completare"),
                "video": str(video) if video else "", "video_testo": gb_testo(vb) if video else "",
                "n_appunti": len(appunti), "n_pacchetti": len(pac),
                "formati": [f for f in ap.FORMATI if fatti[f]],
                # nessun appunto: si creano nel formato scelto; altrimenti si puo' creare anche l'altro formato
                "crea_appunti": bool(puo and not appunti and (utili or senza_pac)),
                "crea_anche": [f for f in possibili if puo and appunti and not fatti[f]],
                "completa_appunti": [f for f in ap.FORMATI if puo and fatti[f] and mancano[f]],
                "rifai": [f for f in ap.FORMATI if puo and fatti[f] and not mancano[f]],
                "rifai_appunti": bool(puo and fatti.get(f_serie) and not mancano[f_serie]),
                "formato_serie": f_serie, "tipo": tipo,
                "nome_mio": (info.get("mio") or self.cfg.get("mio") or {}).get("nome") or "",
                "capitoli": any(ap.capitoli_di(cart)),
                "infografica": (cart / "infografica.json").exists(),
                "voci": len((el.leggi_json(cart / "voci.json", {}) or {}).get("voci") or []),
                "sigla": sigla(info.get("materia") or nome), "colore": colore_materia(info.get("materia") or nome), "materia": info.get("materia") or materia_scritta(nome),
                "docente": (cart / "docente.json").exists(), "mappa": (cart / "mappa.json").exists(),
                "aula": info.get("modo") == "aula", "trascritta": any(cart.glob("trascrizione_*.json")),
                "ripasso": rp.conta(cart) if appunti or any(cart.glob("appunti_*.json")) else {"n": 0, "no": 0, "tre": 0},
                "formato": info.get("formato_appunti") or "cornell",
                "importata": bool(info.get("importata")),
                "cloud": (None if (self.cfg.get("cloud") or {}).get("dove", "no") == "no" or stato != "pronta"
                          else bool((info.get("cloud") or {}).get("ok"))),
                "dopo": stato == "da_completare" and info.get("quando") == "dopo" and not in_corso,
                "lingua_lezione": info.get("lingua_rilevata") if info.get("lingua_lezione") == "auto" else info.get("lingua_lezione"),
            })
        return tot_video

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
            import libro as lb
            extra = ""
            try:
                extra = lb.contesto_domanda(BASE, self._materia_lezione(cartelle[0]), testo)
            except Exception:
                log.exception("chiedi: pagine del libro")
            r = ch.domanda(self.chiave(), cartelle, storia, testo.strip(), extra=extra)
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

    _CACHE_TRASCR = {}

    def _frasi(self, cart):
        """Le frasi della registrazione (in memoria finche' i file non cambiano)."""
        files = sorted(cart.glob("trascrizione_*.json"))
        firma = tuple((f.name, f.stat().st_mtime_ns) for f in files)
        c = self._CACHE_TRASCR.get(str(cart))
        if c and c[0] == firma:
            return c[1]
        frasi = []
        for f in files:
            for x in el.leggi_json(f, []) or []:
                frasi.append((x["inizio"], x.get("chi") or "", x.get("testo") or "", _senza_accenti(x.get("testo") or "")))
        frasi.sort()
        self._CACHE_TRASCR[str(cart)] = (firma, frasi)
        return frasi

    def statistiche(self, cartella):
        """Quanto ha parlato ciascuno, domande, intervento piu' lungo, durata degli argomenti (capitoli)."""
        import voci as vc
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        segs = []
        for f in sorted(cart.glob("trascrizione_*.json")):
            segs += el.leggi_json(f, []) or []
        segs.sort(key=lambda x: x["inizio"])
        durata = float(info.get("durata") or (segs[-1]["fine"] if segs else 0))
        nomi = vc.nomi(cart) if (cart / "voci.json").exists() else {}
        persone, turni = {}, []
        for x in segs:
            v = x.get("voce")
            p = persone.setdefault(v, {"voce": v, "nome": nomi.get(v, ""), "sec": 0.0, "domande": 0, "interventi": 0})
            p["sec"] += max(0.0, x["fine"] - x["inizio"])
            if x.get("testo", "").rstrip().endswith("?"):
                p["domande"] += 1
            if turni and turni[-1]["voce"] == v and x["inizio"] - turni[-1]["fine"] < 8:
                turni[-1]["fine"] = x["fine"]
            else:
                turni.append({"voce": v, "inizio": x["inizio"], "fine": x["fine"]})
                p["interventi"] += 1
        parlato = sum(p["sec"] for p in persone.values()) or 1
        lista = sorted((p for p in persone.values() if p["voce"] is not None and nomi), key=lambda p: -p["sec"])
        for p in lista:
            p["quota"] = round(p["sec"] / parlato, 3)
            p["sec"] = round(p["sec"])
        lungo = max((t for t in turni if t["voce"] is not None), key=lambda t: t["fine"] - t["inizio"], default=None)
        caps = sorted(ap.capitoli_di(cart), key=lambda c: c.get("sec", 0))
        argomenti = []
        for i, c in enumerate(caps):
            fine = caps[i + 1]["sec"] if i + 1 < len(caps) else durata
            if fine > c["sec"]:
                argomenti.append({"titolo": c.get("titolo", ""), "sec": round(fine - c["sec"]), "inizio": c["sec"]})
        azioni = 0
        try:
            import condividi as cd
            if ap.appunti_fatti(info, "verbale"):
                azioni = len(cd.documento(cart, "verbale")["azioni"])
        except Exception:
            pass
        return {"nome": info.get("nome", ""), "tipo": info.get("tipo") or "lezione", "durata": round(durata),
                "durata_t": el.durata_leggibile(durata) if durata else "", "persone": lista,
                "n_persone": len(lista) or len(info.get("partecipanti") or []),
                "domande": sum(p["domande"] for p in persone.values()), "azioni": azioni,
                "lungo": {"nome": nomi.get(lungo["voce"], ""), "sec": round(lungo["fine"] - lungo["inizio"]),
                          "inizio": lungo["inizio"], "ora": el.hms(lungo["inizio"])} if lungo and nomi else None,
                "argomenti": argomenti, "voci_fatte": bool(nomi)}

    def spezzone(self, cartella, da, a, solo_audio=False):
        """Un pezzo della registrazione (video con i sottotitoli, o solo audio) da mandare a qualcuno."""
        cart = Path(cartella)
        src = video_di(cart)
        if not src:
            return {"ok": False, "msg": tr("sp_novideo")}
        da, a = max(0.0, float(da or 0)), float(a or 0)
        if a - da < 1:
            return {"ok": False, "msg": tr("sp_corto")}
        if a - da > 3600:
            return {"ok": False, "msg": tr("sp_lungo")}
        info = el.leggi_json(cart / "info.json", {}) or {}
        audio = solo_audio or src.suffix.lower() in (".m4a", ".mp3", ".wav", ".aac", ".ogg", ".opus", ".flac")
        dest_dir = Path(self.cfg["cartella_pacchetti"]) / tr("sp_cartella")
        dest_dir.mkdir(parents=True, exist_ok=True)
        nome = f"{el.nome_sicuro(info.get('nome'))} – {el.hms(da).replace(':', '.')}-{el.hms(a).replace(':', '.')}"
        dest = dest_dir / (nome + (".m4a" if audio else ".mp4"))
        srt = None
        if not audio:
            # i sottotitoli: le frasi di quel tratto (con chi parla), come traccia che si accende nel lettore
            righe, n = [], 0
            for f in sorted(cart.glob("trascrizione_*.json")):
                for x in el.leggi_json(f, []) or []:
                    if x["fine"] <= da or x["inizio"] >= a:
                        continue
                    n += 1
                    t1, t2 = max(0.0, x["inizio"] - da), min(a - da, x["fine"] - da)
                    ts = lambda v: f"{int(v // 3600):02d}:{int(v // 60 % 60):02d}:{int(v % 60):02d},{int(v * 1000 % 1000):03d}"
                    righe.append(f"{n}\n{ts(t1)} --> {ts(t2)}\n" + (f"{x['chi']}: " if x.get("chi") else "") + x["testo"] + "\n")
            if righe:
                srt = cart / "spezzone.srt"
                srt.write_text("\n".join(righe), encoding="utf-8")
        ok = taglia(src, dest, da, a, audio, srt)
        if srt:
            try:
                srt.unlink()
            except OSError:
                pass
        if not ok:
            return {"ok": False, "msg": tr("ap_imprevisto")}
        return {"ok": True, "file": str(dest), "nome": dest.name, "mb": round(dest.stat().st_size / 1e6, 1)}

    def spezzone_email(self, file):
        """Email pronta con lo spezzone allegato (Outlook / Posta)."""
        import condividi as cd
        f = Path(file)
        return {"ok": bool(manda_email([], f.stem, tr("sp_mail"), f.with_suffix(".eml"), [f]))}

    # ------------------------------------------------------------------ preparazione all'esame (per materia)

    def esame_info(self, materia, cartelle, rifai=False):
        import esame as es
        if not getattr(self, "_orale", None):            # audio di un'interrogazione rimasto (programma chiuso a meta')
            shutil.rmtree(self._orale_cartella(), ignore_errors=True)
        L = testi.LINGUA
        d = es.leggi(BASE, materia)
        spesa = 0.0
        if self.chiave() and cartelle:
            try:
                d, spesa = es.classifica(BASE, materia, cartelle, self.chiave(), rifai)
            except ap.ErroreAppunti as e:
                if not d.get("classifica"):
                    return {"ok": False, "msg": str(e)}
            except Exception:
                log.exception("classifica esame")
                if not d.get("classifica"):
                    return {"ok": False, "msg": tr("es_err")}
        elif not d.get("classifica"):
            return {"ok": False, "msg": tr("manca_chiave")}
        oggi = datetime.date.today()
        giorni = (datetime.date.fromisoformat(d["data_esame"]) - oggi).days if d.get("data_esame") else None
        sim = (d.get("simulazioni") or [None])[-1]
        return {"ok": True, "materia": materia, "classifica": d.get("classifica"), "data_esame": d.get("data_esame") or "",
                "giorni": giorni, "piano": es.piano(d, L=L), "n_lezioni": d.get("n_lezioni", len(cartelle)),
                "simulazione": sim, "voti": [s.get("voto") for s in d.get("simulazioni") or [] if s.get("voto") is not None],
                "spesa": spesa}

    def esame_data(self, materia, data):
        import esame as es
        d = es.leggi(BASE, materia)
        try:
            d["data_esame"] = datetime.date.fromisoformat(str(data)).isoformat() if data else ""
        except ValueError:
            return {"ok": False}
        es.salva(BASE, materia, d)
        return {"ok": True}

    def esame_simulazione(self, materia):
        import esame as es
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            sim, spesa = es.simulazione(BASE, materia, self.chiave(), testi.LINGUA)
            return {"ok": True, "simulazione": sim, "spesa": spesa}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("simulazione")
            return {"ok": False, "msg": tr("es_err")}

    def esame_correggi(self, materia, risposte):
        import esame as es
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            sim, spesa = es.correggi(BASE, materia, risposte or [], self.chiave(), testi.LINGUA,
                                     dsa=bool(self.cfg.get("lettura_facilitata")))
            return {"ok": True, "simulazione": sim, "spesa": spesa}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("correzione")
            return {"ok": False, "msg": tr("es_err")}

    def esame_calendario(self, materia, modo="outlook"):
        import condividi as cd
        import esame as es
        import webbrowser
        d = es.leggi(BASE, materia)
        ev = es.eventi_calendario(d, materia, testi.LINGUA)
        if not ev:
            return {"ok": False, "msg": tr("cd_cal_niente")}
        f = BASE / "esami" / f"{el.nome_sicuro(materia)} – {tr('es_pdf_piano')}.ics"
        if modo == "google":
            webbrowser.open("https://calendar.google.com/calendar/r/settings/export")
            mostra_file(cd.crea_ics(ev, f))
        else:
            apri_calendario(ev, f)
        return {"ok": True, "n": len(ev)}

    def esame_pdf(self, materia):
        import esame as es
        try:
            d = es.leggi(BASE, materia)
            f = es.pdf(d, materia, Path(self.cfg["cartella_pacchetti"]) / f"{tr('es_pdf_t')} – {el.nome_sicuro(materia)}.pdf", testi.LINGUA)
            apri(f)
            return {"ok": True, "file": str(f)}
        except Exception:
            log.exception("pdf esame")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    # ------------------------------------------------------------------ test a crocette

    def test_nuovo(self, materia, cartelle, solo_sbagliate=False, n=10, difficolta="media", esame_vero=False):
        import esame as es
        if not solo_sbagliate and not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            test, spesa = es.test_nuovo(BASE, materia, cartelle or [], self.chiave(), testi.LINGUA,
                                        "tutte" if solo_sbagliate == "tutte" else bool(solo_sbagliate),
                                        n, difficolta, bool(esame_vero))
            return {"ok": True, "test": test, "spesa": spesa}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("test a crocette")
            return {"ok": False, "msg": tr("es_err")}

    def test_correggi(self, materia, risposte, sec=0):
        import esame as es
        try:
            return {"ok": True, "test": es.test_correggi(BASE, materia, risposte or [], sec, testi.LINGUA)}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("test a crocette: correzione")
            return {"ok": False, "msg": tr("es_err")}

    # ------------------------------------------------------------------ aula rumorosa

    def rumore_info(self, cartella):
        """Prima e dopo: 15 secondi della lezione cosi' come sono e puliti (per sentire la differenza)."""
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        wav = next(iter(sorted(cart.glob("audio_[0-9][0-9][0-9].wav"))), None)
        out = {"ok": True, "rumorosa": info.get("rumorosa"), "auto": bool(info.get("rumorosa_auto")), "prima": None, "dopo": None,
               "occupato": bool(self.occupato or self.reg is not None)}
        if not wav:
            return out
        try:
            import numpy as np
            import wave as wv
            audio = el.audio_16k(wav)
            if len(audio) < 16000 * 20:
                return out
            out["snr"] = round(el.stima_rumore(audio), 1)
            # 15 s presi dove si parla (non all'inizio, spesso vuoto)
            n = 16000 * 15
            da = min(len(audio) - n, max(0, len(audio) // 5))
            pezzo = audio[da:da + n]
            pulito = el.pulisci_audio(audio[:min(len(audio), da + n)])[da:da + n]
            dove = cart / "rumore"
            dove.mkdir(exist_ok=True)
            for nome, x in (("prima", pezzo), ("dopo", pulito)):
                f = dove / f"{nome}.wav"
                with wv.open(str(f), "wb") as w:
                    w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
                    w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
                out[nome] = servi_video.registra(f)
        except Exception:
            log.exception("aula rumorosa: prova")
        return out

    def rumore_imposta(self, cartella, si):
        el.aggiorna_info(Path(cartella), rumorosa=bool(si))
        return {"ok": True}

    def ritrascrivi(self, cartella):
        """Rifa' la trascrizione (qui, gratis) con l'audio pulito. Gli appunti restano come sono."""
        if self.occupato or self.reg is not None or (getattr(self, "_ritr", None) or {}).get("stato") == "lavoro":
            return {"ok": False, "msg": tr("aspetta_lavoro")}
        cart = Path(cartella)
        el.aggiorna_info(cart, rumorosa=True)
        parti = sorted(el.file_parti(cart).items())
        self._ritr = {"stato": "lavoro", "f": 0.0, "cartella": str(cart)}

        def lavoro():
            try:
                for i, (k, wav) in enumerate(parti):
                    vecchia = cart / f"trascrizione_{k:03d}.json"
                    if vecchia.exists():
                        vecchia.replace(cart / f"trascrizione_{k:03d}.prima.json")
                    el.trascrivi_parte(cart, k, lambda f, i=i: self._ritr.update(f=(i + f) / max(1, len(parti))))
                self._ritr = {"stato": "fatto", "f": 1.0, "cartella": str(cart)}
            except Exception:
                log.exception("ritrascrivi")
                for p in cart.glob("trascrizione_*.prima.json"):          # rimetto quella di prima
                    p.replace(cart / p.name.replace(".prima", ""))
                self._ritr = {"stato": "errore", "msg": tr("ap_imprevisto"), "cartella": str(cart)}
        threading.Thread(target=lavoro, daemon=True).start()
        return {"ok": True}

    def ritrascrivi_avanzamento(self):
        return dict(getattr(self, "_ritr", None) or {"stato": "niente"})

    # ------------------------------------------------------------------ foto in aula

    def scatta_foto(self):
        """Sul PC: si sceglie una foto (sul telefono la fotocamera, in android_motore)."""
        return {"ok": False}

    def foto_aggiungi(self, percorso):
        """Una foto durante la registrazione: si aggancia al minuto, entra fra le slide (appunti, Karaoke)."""
        reg, cart = self.reg, self.cartella_corrente
        if reg is None or cart is None:
            return {"ok": False, "msg": tr("fo_noreg")}
        try:
            cart = Path(cart)
            sec = float(reg.secondi())
            (cart / "slide").mkdir(exist_ok=True)
            lista = el.leggi_json(cart / "foto.json", []) or []
            nome = f"foto_{len(lista) + 1:03d}.jpg"
            ch.jpeg_ridotto(percorso, cart / "slide" / nome)
            with getattr(reg, "_lock", threading.Lock()):
                reg.slides.append({"file": nome, "t": round(sec, 2), "foto": True})
            try:
                reg._salva_meta()
            except Exception:
                log.exception("foto: meta")
            lista.append({"file": nome, "sec": round(sec, 1)})
            el.scrivi_json(cart / "foto.json", lista)
            return {"ok": True, "sec": round(sec, 1), "n": len(lista), "url": servi_video.registra(cart / "slide" / nome)}
        except Exception:
            log.exception("foto in aula")
            return {"ok": False, "msg": tr("fo_err")}

    def foto_lezione(self, cartella):
        cart = Path(cartella)
        out = []
        for f in el.leggi_json(cart / "foto.json", []) or []:
            p = cart / "slide" / f["file"]
            if p.exists():
                out.append({**f, "url": servi_video.registra(p)})
        return {"ok": True, "foto": out}

    def foto_leggi(self, cartella, file):
        """Claude dice cosa c'e' scritto nella foto (una volta, poi resta salvato)."""
        cart = Path(cartella)
        lista = el.leggi_json(cart / "foto.json", []) or []
        f = next((x for x in lista if x["file"] == file), None)
        if not f:
            return {"ok": False}
        if f.get("testo"):
            return {"ok": True, "testo": f["testo"]}
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            r = ch.leggi_foto(self.chiave(), cart / "slide" / file, "lavagna")
            f["testo"] = r["testo"]
            el.scrivi_json(cart / "foto.json", lista)
            info = el.leggi_json(cart / "info.json", {}) or {}
            el.aggiorna_info(cart, spesa_appunti=round(float(info.get("spesa_appunti") or 0) + r["spesa"], 4))
            return {"ok": True, "testo": r["testo"]}
        except Exception:
            log.exception("foto: leggi")
            return {"ok": False, "msg": tr("fo_err")}

    # ------------------------------------------------------------------ appunti a mano e fotocopie

    def scegli_immagini(self):
        return {"ok": False}

    def scritti_lezione(self, cartella):
        cart = Path(cartella)
        out = []
        for f in el.leggi_json(cart / "scritti.json", []) or []:
            p = cart / "scritti" / f["file"]
            out.append({**f, "url": servi_video.registra(p) if p.exists() else None})
        return {"ok": True, "scritti": out}

    def scritti_aggiungi(self, cartella, percorsi):
        """Le foto dei fogli: Claude le legge, il testo va con gli appunti della lezione (Chiedi, tutor, mappe, test…)."""
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        cart = Path(cartella)
        lista = el.leggi_json(cart / "scritti.json", []) or []
        nuovi, spesa = [], 0.0
        for p in [x for x in percorsi or [] if x][:30]:
            try:
                nome = f"foglio_{len(lista) + 1:03d}.jpg"
                ch.jpeg_ridotto(p, cart / "scritti" / nome)
                r = ch.leggi_foto(self.chiave(), cart / "scritti" / nome, "foglio")
                spesa += r["spesa"]
                v = {"file": nome, "testo": r["testo"], "quando": datetime.datetime.now().isoformat(timespec="seconds")}
                lista.append(v)
                nuovi.append(v)
                el.scrivi_json(cart / "scritti.json", lista)
            except Exception:
                log.exception("scritti: foto %s", p)
        info = el.leggi_json(cart / "info.json", {}) or {}
        el.aggiorna_info(cart, spesa_appunti=round(float(info.get("spesa_appunti") or 0) + spesa, 4))
        if not nuovi:
            return {"ok": False, "msg": tr("sc_err")}
        return {"ok": True, "n": len(nuovi), "spesa": spesa, **self.scritti_lezione(cartella)}

    def scritti_correggi(self, cartella, file, testo):
        cart = Path(cartella)
        lista = el.leggi_json(cart / "scritti.json", []) or []
        for v in lista:
            if v["file"] == file:
                v["testo"] = str(testo or "")[:20000]
        el.scrivi_json(cart / "scritti.json", lista)
        return {"ok": True}

    def scritti_togli(self, cartella, file):
        cart = Path(cartella)
        lista = [v for v in el.leggi_json(cart / "scritti.json", []) or [] if v["file"] != file]
        el.scrivi_json(cart / "scritti.json", lista)
        (cart / "scritti" / file).unlink(missing_ok=True)
        return {"ok": True, **self.scritti_lezione(cartella)}

    def libro_foto(self, materia, percorsi):
        """Un libro fotografato o delle fotocopie: Claude legge le pagine e diventano un documento del libro di testo."""
        import libro as lb
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        if getattr(self, "_libro", None) and self._libro.get("stato") == "lavoro":
            return {"ok": False, "msg": tr("lb_lavoro")}
        percorsi = [x for x in percorsi or [] if x][:400]
        self._libro = {"stato": "lavoro", "f": 0.0}

        def lavoro():
            try:
                pag = []
                for i, p in enumerate(percorsi):
                    r = ch.leggi_foto(self.chiave(), p, "foglio")
                    pag.append({"n": i + 1, "et": str(i + 1), "t": r["testo"], "cap": ""})
                    self._libro.update(f=0.9 * (i + 1) / len(percorsi))
                docs = lb.aggiungi_pagine(BASE, materia, pag, tr("lb_foto_nome", n=len(pag)))
                self._libro = {"stato": "fatto", "f": 1.0, "documenti": docs}
            except Exception:
                log.exception("libro fotografato")
                self._libro = {"stato": "errore", "msg": tr("lb_err")}
        threading.Thread(target=lavoro, daemon=True).start()
        return {"ok": True}

    # ------------------------------------------------------------------ libro di testo della materia

    def _materia_lezione(self, cartella):
        info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
        return (info.get("materia") or materia_scritta(info.get("nome", Path(cartella).name))).strip()

    def libro_info(self, materia, cartelle):
        import libro as lb
        try:
            docs = lb.documenti(BASE, materia)
            out = {"ok": True, "documenti": docs, "nascosto": materia.lower() in [x.lower() for x in self.cfg.get("libro_no") or []]}
            if docs:
                cartelle = [c for c in cartelle or [] if Path(c).is_dir()]
                gia = el.leggi_json(lb.cartella(BASE, materia) / "collegamenti.json", {}) or {}
                out["lezioni"] = lb.pagine_per_lezione(BASE, materia, cartelle)
                out["mancano"] = gia.get("mancano")
                import esame as es
                out["mancano_vecchi"] = gia.get("mancano") is not None and gia.get("firma") != [es._firma(sorted(cartelle)), [[d["k"], d["pagine"]] for d in docs]]
            return out
        except Exception:
            log.exception("libro: info")
            return {"ok": False, "msg": tr("lb_err")}

    def libro_aggiungi(self, materia, percorso, sostituisci=False):
        import libro as lb
        if getattr(self, "_libro", None) and self._libro.get("stato") == "lavoro":
            return {"ok": False, "msg": tr("lb_lavoro")}
        self._libro = {"stato": "lavoro", "f": 0.0}

        def lavoro():
            try:
                docs = lb.aggiungi(BASE, materia, percorso, bool(sostituisci), lambda f: self._libro.update(f=f))
                self._libro.update(f=0.85)
                lb.indice(BASE, materia)
                self._libro = {"stato": "fatto", "f": 1.0, "documenti": docs}
            except ap.ErroreAppunti as e:
                self._libro = {"stato": "errore", "msg": str(e)}
            except Exception:
                log.exception("libro: aggiungi")
                self._libro = {"stato": "errore", "msg": tr("lb_err")}
        threading.Thread(target=lavoro, daemon=True).start()
        return {"ok": True}

    def libro_avanzamento(self):
        return dict(getattr(self, "_libro", None) or {"stato": "niente"})

    def libro_togli(self, materia, k):
        import libro as lb
        return {"ok": True, "documenti": lb.togli(BASE, materia, int(k))}

    def libro_nascondi(self, materia):
        no = [x for x in self.cfg.get("libro_no") or [] if x.lower() != materia.lower()] + [materia]
        self.cfg["libro_no"] = no[-50:]
        salva_config(self.cfg)
        return {"ok": True}

    def libro_mancano(self, materia, cartelle, rifai=False):
        import libro as lb
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            d, spesa = lb.mancano(BASE, materia, [c for c in cartelle or [] if Path(c).is_dir()], self.chiave(), bool(rifai), testi.LINGUA)
            return {"ok": True, "mancano": d.get("mancano", []), "spesa": spesa}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("libro: mancano")
            return {"ok": False, "msg": tr("lb_err")}

    def libro_pagina(self, materia, k=None, n=None, et=None, q=""):
        """Il testo di una pagina (per numero o per numero stampato), con le frasi da evidenziare."""
        import libro as lb
        docs = lb.documenti(BASE, materia)
        if not docs:
            return {"ok": False}
        if et is not None and k is None:
            for d in docs:
                for p in lb.pagine(BASE, materia, d["k"]):
                    if str(p["et"]) == str(et):
                        k, n = d["k"], p["n"]
                        break
                if k is not None:
                    break
        k = int(k if k is not None else docs[0]["k"])
        pag = lb.pagine(BASE, materia, k)
        if not pag:
            return {"ok": False}
        n = max(1, min(len(pag), int(n or 1)))
        p = pag[n - 1]
        frasi = [f for f in re.split(r"(?<=[.!?;:])\s+", p["t"]) if f.strip()]
        if q and len(q) < 400 and Path(q).is_dir():          # una lezione: le sue parole chiave
            q = lb._testo_lezione_per_ricerca(q)
        qp = set(lb._parole(q))
        serve = 1 if len(qp) <= 6 else 2
        evid = [i for i, f in enumerate(frasi) if qp and len(qp & set(lb._parole(f))) >= serve]
        doc = next((d for d in docs if d["k"] == k), docs[0])
        return {"ok": True, "k": k, "n": n, "et": p["et"], "cap": p.get("cap", ""), "frasi": frasi, "evid": evid,
                "tot": len(pag), "doc": doc["nome"]}

    def libro_cerca(self, materia, testo):
        import libro as lb
        try:
            if not materia or not lb.documenti(BASE, materia):
                return {"ok": False}
            r = lb.indice(BASE, materia).cerca(testo, 1)
            return {"ok": bool(r and r[0]["punti"] >= 1.5), **(r[0] if r else {})}
        except Exception:
            log.exception("libro: cerca")
            return {"ok": False}

    def libro_lezione(self, cartella):
        import libro as lb
        try:
            m = self._materia_lezione(cartella)
            if not m or not lb.documenti(BASE, m):
                return {"ok": False}
            t = lb.indice(BASE, m).tratto(lb._testo_lezione_per_ricerca(cartella))
            return {"ok": bool(t), "materia": m, "tratto": t}
        except Exception:
            log.exception("libro: lezione")
            return {"ok": False}

    def apri_pdf_libro(self, materia, k):
        import libro as lb
        d = next((x for x in lb.documenti(BASE, materia) if x["k"] == int(k)), None)
        return {"ok": bool(d and Path(d["percorso"]).exists() and apri(d["percorso"]))}

    # ------------------------------------------------------------------ il tuo tutor

    def tutor(self, materia, cartelle):
        import tutor as tu
        try:
            cartelle = [c for c in cartelle or [] if Path(c).is_dir()]
            return {"ok": True, **tu.stato(BASE, materia, cartelle, self.cfg, testi.LINGUA)}
        except Exception:
            log.exception("tutor")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def tutor_fatto(self, chiave, si):
        oggi = datetime.date.today().isoformat()
        tf = {k: v for k, v in (self.cfg.get("tutor_fatti") or {}).items() if k >= (datetime.date.today() - datetime.timedelta(days=7)).isoformat()}
        f = [x for x in tf.get(oggi, []) if x != chiave] + ([chiave] if si else [])
        tf[oggi] = f
        self.cfg["tutor_fatti"] = tf
        salva_config(self.cfg)
        return {"ok": True}

    def tutor_chiedi(self, materia, cartelle, storia, testo):
        import tutor as tu
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        cartelle = [c for c in cartelle or [] if Path(c).is_dir()]
        if not cartelle or not (testo or "").strip():
            return {"ok": False, "msg": tr("ch_vuoto")}
        try:
            st = tu.stato(BASE, materia, cartelle, self.cfg, testi.LINGUA)
            # le lezioni in ordine di data: L1, L2... come le vede il tutor
            import libro as lb
            try:
                extra_libro = lb.contesto_domanda(BASE, materia, testo)
            except Exception:
                extra_libro = ""
            return {"ok": True, **ch.domanda(self.chiave(), st["cartelle"] or cartelle, storia, testo.strip(), extra=tu.contesto(st, materia) + extra_libro)}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("tutor: chiedi")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    # ------------------------------------------------------------------ glossario della materia

    def glossario(self, materia, cartelle=None, rifai=False, solo_salvato=False):
        import glossario as gl
        try:
            if solo_salvato:
                d = gl.leggi(BASE, materia)
                spesa = 0.0
            else:
                d, spesa = gl.crea(BASE, materia, cartelle or [], self.chiave(), bool(rifai), testi.LINGUA)
            voci = []
            media = {}
            for v in d.get("voci") or []:
                v = dict(v)
                dv = dict(v.get("dove") or {}) or None
                if dv:
                    cart = Path(dv["cartella"])
                    if cart.exists():
                        if str(cart) not in media:
                            vid = video_di(cart)
                            media[str(cart)] = servi_video.registra(vid) if vid else None
                        dv["media"] = media[str(cart)]
                        try:
                            dv["slide"] = servi_video.registra(el.immagine_slide(cart, dv["slide_file"])) if dv.get("slide_file") else None
                        except Exception:
                            dv["slide"] = None
                    v["dove"] = dv
                voci.append(v)
            import esame as es
            vecchio = bool(d.get("voci")) and bool(cartelle) and d.get("firma") != es._firma(sorted(str(c) for c in cartelle))
            return {"ok": True, "voci": voci, "lezioni": d.get("lezioni", []), "ripassa": d.get("ripassa", []),
                    "spesa": spesa, "vecchio": vecchio}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("glossario")
            return {"ok": False, "msg": tr("gl_err")}

    def glossario_ripassa(self, materia, termine, si):
        import glossario as gl
        return {"ok": True, "ripassa": gl.segna_ripassa(BASE, materia, termine, bool(si))}

    def glossario_pdf(self, materia):
        import glossario as gl
        d = gl.leggi(BASE, materia)
        if not d.get("voci"):
            return {"ok": False, "msg": tr("gl_err")}
        dest_dir = Path(self.cfg["cartella_pacchetti"])
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{tr('gl_file')} – {el.nome_sicuro(materia)}.pdf"
        try:
            gl.pdf(d, materia, dest, testi.LINGUA)
        except Exception:
            log.exception("PDF glossario")
            return {"ok": False, "msg": tr("ap_imprevisto")}
        apri(dest)
        return {"ok": True, "file": str(dest)}

    # ------------------------------------------------------------------ spazio DSA

    def segna_uso(self, chiave):
        """Uno strumento compensativo usato (per il foglio «Gli strumenti che uso»)."""
        import strumenti_dsa as sd
        if chiave in sd.STRUMENTI and chiave not in (self.cfg.get("dsa_usati") or {}):
            self.cfg.setdefault("dsa_usati", {})[chiave] = datetime.date.today().isoformat()
            salva_config(self.cfg)
        return {"ok": True}

    def strumenti_dsa_pdf(self, materia="", nome_classe="", ha_lezioni=True):
        import strumenti_dsa as sd
        if (nome_classe or "").strip() and nome_classe.strip() != self.cfg.get("nome_classe"):
            self.cfg["nome_classe"] = nome_classe.strip()[:80]
            salva_config(self.cfg)
        dest_dir = Path(self.cfg["cartella_pacchetti"])
        dest = dest_dir / f"{tr('sd_pdf_file')}{' – ' + el.nome_sicuro(materia) if materia else ''}.pdf"
        try:
            sd.pdf(dest, nome_classe, materia, set((self.cfg.get("dsa_usati") or {}).keys()), bool(ha_lezioni), testi.LINGUA)
        except Exception:
            log.exception("PDF strumenti compensativi")
            return {"ok": False, "msg": tr("ap_imprevisto")}
        apri(dest)
        return {"ok": True, "file": str(dest)}

    # ------------------------------------------------------------------ mappa per la verifica (strumento compensativo)

    def mappa_verifica(self, materia, cartelle=None, parole=True, rifai=False):
        """Senza cartelle: solo quella salvata (se c'e'). Con le cartelle: la fa (o la prende dalla cache)."""
        import mappa_verifica as vf
        if not cartelle:
            d = vf.leggi(BASE, materia)
            return {"ok": True, "mv": d or None, "nome_classe": (d or {}).get("nome_classe") or self.cfg.get("nome_classe", "")}
        try:
            d, spesa = vf.crea(BASE, materia, cartelle, self.chiave(), bool(parole), bool(rifai), testi.LINGUA)
            return {"ok": True, "mv": d, "spesa": spesa, "nome_classe": d.get("nome_classe") or self.cfg.get("nome_classe", "")}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("mappa per la verifica")
            return {"ok": False, "msg": tr("mv_err")}

    def mappa_verifica_salva(self, materia, tolte, nome_classe=""):
        import mappa_verifica as vf
        vf.salva_modifiche(BASE, materia, tolte, nome_classe)
        if (nome_classe or "").strip() and nome_classe != self.cfg.get("nome_classe"):
            self.cfg["nome_classe"] = str(nome_classe).strip()[:80]
            salva_config(self.cfg)
        return {"ok": True}

    def mappa_verifica_pdf(self, materia, formule=True, stampa=False):
        import esame as es
        import mappa_verifica as vf
        d = vf.leggi(BASE, materia)
        if not d.get("dati"):
            return {"ok": False, "msg": tr("mv_err")}
        dati = vf.senza_tolte(d["dati"], d.get("tolte"))
        if not formule:
            dati["formule"] = []
        lez = [x for x in es._lezioni_test(d.get("cartelle") or []) if Path(x["cartella"]).exists()]
        pre = re.compile(r"^" + re.escape(materia) + r"\s*[–\-:·]\s*", re.I)
        nomi = ", ".join(pre.sub("", x["nome"]) or x["nome"] for x in lez)
        lezioni = tr("mv_lez1" if len(lez) == 1 else "mv_lezn").format(n=nomi)
        dest_dir = Path(self.cfg["cartella_pacchetti"])
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{tr('mv_titolo')} – {el.nome_sicuro(materia)}.pdf"
        try:
            vf.pdf(dati, materia, lezioni, d.get("nome_classe", ""), dest, testi.LINGUA)
        except Exception:
            log.exception("PDF mappa per la verifica")
            return {"ok": False, "msg": tr("ap_imprevisto")}
        (apri if stampa else mostra_file)(dest)
        return {"ok": True, "file": str(dest)}

    # ------------------------------------------------------------------ karaoke della lezione

    def karaoke(self, cartella):
        """Tutta la trascrizione con gli orari, le slide con il loro minuto e il video/audio della lezione:
        la finestra fa sentire la voce vera del prof e illumina le parole. Niente Claude."""
        cart = Path(cartella)
        try:
            segs = [{"i": round(float(s["inizio"]), 2), "f": round(float(s["fine"]), 2), "t": str(s.get("testo") or "").strip(),
                     **({"c": s["chi"]} if s.get("chi") else {})} for s in ch.segmenti_lezione(cart) if str(s.get("testo") or "").strip()]
            if not segs:
                return {"ok": False, "msg": tr("ch_vuoto")}
            slide = []
            for s in ch.slide_della_lezione(cart):
                try:
                    u = servi_video.registra(el.immagine_slide(cart, s["file"]))
                except Exception:
                    u = None
                if u:
                    slide.append({"n": s["n"], "t": round(float(s["t"]), 2), "url": u})
            v = video_di(cart)
            return {"ok": True, "segmenti": segs, "slide": slide, "media": servi_video.registra(v) if v else None,
                    "durata": segs[-1]["f"]}
        except Exception:
            log.exception("karaoke")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    # ------------------------------------------------------------------ podcast della lezione

    def podcast(self, cartella, durata="breve", rifai=False, stile="uno"):
        import podcast as pc
        cart = Path(cartella)
        dsa = bool(self.cfg.get("lettura_facilitata"))
        if not self.chiave() and not pc.file_podcast(cart, durata, dsa, stile).exists():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            dati, spesa = pc.crea(cart, self.chiave(), durata, dsa, bool(rifai), stile)
            v = video_di(cart)
            return {"ok": True, "podcast": dati, "spesa": spesa, "media": servi_video.registra(v) if v else None,
                    "mp3": sys.platform in ("win32", "darwin")}
        except pc.NienteDibattito:
            return {"ok": False, "msg": tr("pc_niente_dib"), "niente_dibattito": True}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("podcast")
            return {"ok": False, "msg": tr("pc_err")}

    def podcast_mp3(self, cartella, durata="breve", velocita=1.0, stile="uno"):
        import podcast as pc
        cart = Path(cartella)
        dsa = bool(self.cfg.get("lettura_facilitata"))
        dati = el.leggi_json(pc.file_podcast(cart, durata, dsa, stile))
        if not dati:
            return {"ok": False, "msg": tr("pc_err")}
        info = el.leggi_json(cart / "info.json", {}) or {}
        dest = Path(self.cfg["cartella_pacchetti"]) / tr("pc_cartella") / f"{el.nome_sicuro(info.get('nome') or cart.name)} – podcast {durata}{'' if stile == 'uno' else ' ' + tr('pc_stile_' + stile)}.mp3"
        try:
            f = pc.mp3(cart, dati, video_di(cart), dest, float(velocita or 1.0), 2.0 if dsa else 0.0)
            mostra_file(f)
            return {"ok": True, "file": str(f)}
        except Exception:
            log.exception("podcast mp3")
            return {"ok": False, "msg": tr("pc_mp3_err")}

    # ------------------------------------------------------------------ studia (pagina della materia)

    def studia_info(self, materia):
        """Quello che serve alla pagina Studia senza chiamare Claude: data dell'esame, giorni, il piano di oggi, i voti."""
        import esame as es
        d = es.leggi(BASE, materia)
        oggi = datetime.date.today()
        giorni = (datetime.date.fromisoformat(d["data_esame"]) - oggi).days if d.get("data_esame") else None
        piano = es.piano(d, L=testi.LINGUA) if d.get("classifica") else []
        oggi_piano = next((g for g in piano if g["giorno"] == oggi.isoformat()), None)
        voti = lambda lista: [x.get("voto") for x in lista or [] if x.get("voto") is not None]
        return {"ok": True, "data_esame": d.get("data_esame") or "", "giorni": giorni, "oggi": oggi_piano,
                "classifica": bool(d.get("classifica")), "voti_test": voti(d.get("test")),
                "voti_orali": voti(d.get("orali")), "voti_scritti": voti(d.get("simulazioni"))}

    # ------------------------------------------------------------------ dettatura (Modalità DSA)
    # Come l'interrogazione: si registra dal microfono, si trascrive QUI e torna il testo. Niente Claude.

    def detta_avvia(self):
        if self.reg is not None or (getattr(self, "_detta", None) or {}).get("reg") is not None:
            return {"ok": False, "msg": tr("or_occupato")}
        cart = BASE / "esami" / "_detta"
        shutil.rmtree(cart, ignore_errors=True)
        cart.mkdir(parents=True, exist_ok=True)
        try:
            reg = rg.Registratore(cart, "detta", 3600, modo="aula", microfono=self.cfg.get("microfono") or None)
            reg.avvia()
            self._detta = {"reg": reg, "cart": cart}
            return {"ok": True}
        except Exception:
            log.exception("dettatura: microfono")
            self._detta = None
            return {"ok": False, "msg": tr("or_mic")}

    def detta_livello(self):
        r = (getattr(self, "_detta", None) or {}).get("reg")
        return {"ok": True, "livello": float(r.livello or 0), "sec": float(r.secondi())} if r is not None else {"ok": False}

    def detta_fine(self):
        d = getattr(self, "_detta", None) or {}
        r = d.get("reg")
        if r is None:
            return {"ok": False, "msg": tr("es_err")}
        self._detta = None
        cart = d["cart"]
        try:
            r.ferma()
            wav = cart / "audio_001.wav"
            segs = []
            if wav.exists() and wav.stat().st_size > 2000:
                el.scrivi_json(cart / "info.json", {"lingua_lezione": testi.LINGUA, "precisa": True})
                segs = el.trascrivi_campioni(el.audio_16k(wav), cart)
            testo = " ".join(s["testo"] for s in segs if s.get("testo")).strip()
            return {"ok": bool(testo), "testo": testo, **({} if testo else {"msg": tr("or_vuota")})}
        except Exception:
            log.exception("dettatura")
            return {"ok": False, "msg": tr("es_err")}
        finally:
            shutil.rmtree(cart, ignore_errors=True)       # l'audio della dettatura non si tiene

    def detta_sistema(self, testo):
        """✨ Sistema punti e virgole: Claude mette la punteggiatura al testo dettato, senza cambiare le parole."""
        if not str(testo or "").strip():
            return {"ok": False, "msg": tr("lg_vuoto")}
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            return {"ok": True, **ch.sistema_dettato(self.chiave(), testo)}
        except Exception as e:
            log.exception("sistema dettato")
            return {"ok": False, "msg": str(e) if isinstance(e, ap.ErroreAppunti) else tr("es_err")}

    # ------------------------------------------------------------------ 🔊 Leggimi: qualsiasi testo letto a voce
    # PDF, foto di una pagina o testo incollato. Restano in «Letti di recente» (fuori dalle lezioni), cosi' si
    # riaprono senza rifare niente e senza pagare di nuovo Claude.

    LEGGIMI_MAX = 20

    def _lg_cartella(self):
        c = CONFIG.parent / "leggimi"
        c.mkdir(parents=True, exist_ok=True)
        return c

    def _lg_salva(self, v):
        el.scrivi_json(self._lg_cartella() / f"{v['id']}.json", v)
        tutte = sorted(self._lg_cartella().glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
        for f in tutte[self.LEGGIMI_MAX:]:
            f.unlink(missing_ok=True)
            (f.parent / f"{f.stem}.pdf").unlink(missing_ok=True)

    def _lg_nuova(self, tipo, titolo, pagine, pdf=None):
        i = datetime.datetime.now().strftime("%Y%m%d%H%M%S") + f"{len(pagine):03d}"
        v = {"id": i, "tipo": tipo, "titolo": str(titolo)[:120], "pagine": pagine, "pag": 0,
             "quando": datetime.datetime.now().isoformat(timespec="seconds")}
        if pdf and any(not p.strip() for p in pagine):         # pagine scansionate: il PDF serve per farle leggere a Claude
            try:
                shutil.copyfile(pdf, self._lg_cartella() / f"{i}.pdf")
                v["pdf"] = True
            except OSError:
                log.exception("leggimi: copia del pdf")
        self._lg_salva(v)
        return {"ok": True, "voce": v}

    def leggimi_elenco(self):
        out = []
        for f in sorted(self._lg_cartella().glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True):
            v = el.leggi_json(f, None)
            if v:
                out.append({k: v.get(k) for k in ("id", "tipo", "titolo", "quando", "pag")} | {"n": len(v.get("pagine") or [])})
        return {"ok": True, "elenco": out}

    def leggimi_apri(self, i):
        v = el.leggi_json(self._lg_cartella() / f"{Path(str(i)).name}.json", None)
        if not v:
            return {"ok": False, "msg": tr("lg_err")}
        self._lg_salva(v)                                       # torna in cima a «Letti di recente»
        return {"ok": True, "voce": v}

    def leggimi_segna(self, i, pag):
        f = self._lg_cartella() / f"{Path(str(i)).name}.json"
        v = el.leggi_json(f, None)
        if v:
            v["pag"] = max(0, min(int(pag or 0), len(v["pagine"]) - 1))
            el.scrivi_json(f, v)
        return {"ok": bool(v)}

    def leggimi_togli(self, i):
        n = Path(str(i)).name
        (self._lg_cartella() / f"{n}.json").unlink(missing_ok=True)
        (self._lg_cartella() / f"{n}.pdf").unlink(missing_ok=True)
        return self.leggimi_elenco()

    def leggimi_pdf(self, percorso, nome=None):
        def pulisci(p):
            # nel PDF le righe vanno a capo a meta' frase: si riuniscono (anche le parole spezzate col trattino)
            p = re.sub(r"[ \t]*\n[ \t]*", "\n", p or "")
            p = re.sub(r"(\w)-\n(\w)", r"\1\2", p)
            return re.sub(r"(?<!\n)\n(?!\n)", " ", p).strip()
        pagine = [pulisci(p) for p in dc.testi_pagine(percorso)]
        if not pagine:
            return {"ok": False, "msg": tr("lg_err")}
        return self._lg_nuova("pdf", Path(nome or percorso).stem, pagine, pdf=percorso)

    def leggimi_testo(self, testo):
        testo = str(testo or "").strip()[:200000]
        if not testo:
            return {"ok": False, "msg": tr("lg_vuoto")}
        parole = testo.split()
        titolo = " ".join(parole[:7]) + ("…" if len(parole) > 7 else "")
        # i testi lunghi a pagine da circa 3000 caratteri, tagliando tra un paragrafo e l'altro
        pagine, cur = [], ""
        for par in re.split(r"\n\s*\n", testo):
            if cur and len(cur) + len(par) > 3000:
                pagine.append(cur.strip()); cur = ""
            cur += par + "\n\n"
        if cur.strip():
            pagine.append(cur.strip())
        return self._lg_nuova("testo", titolo, pagine)

    # ------------------------------------------------------------------ strumenti di Scripta Manent
    # Correttore gentile, Problema passo passo, Compiti e scadenze (strumenti_sm.py)

    def sm_correggi(self, testo):
        import strumenti_sm as sm
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            return {"ok": True, **sm.correggi(self.chiave(), testo)}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("correttore")
            return {"ok": False, "msg": tr("sm_corr_err")}

    def sm_problema(self, testo, percorsi=None):
        import strumenti_sm as sm
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            spesa, testo = 0.0, str(testo or "")
            for f in [x for x in percorsi or [] if x][:3]:
                r = ch.leggi_foto(self.chiave(), f, "foglio")
                spesa += r["spesa"]
                testo = (testo + "\n" + r["testo"]).strip()
            if not testo.strip():
                return {"ok": False, "msg": tr("sm_pb_vuoto")}
            r = sm.problema(self.chiave(), testo)
            r["spesa"] += spesa
            return {"ok": True, **r}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("problema passo passo")
            return {"ok": False, "msg": tr("sm_pb_err")}

    def sm_diario(self, percorsi):
        import strumenti_sm as sm
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        nuovi, spesa = 0, 0.0
        try:
            for f in [x for x in percorsi or [] if x][:5]:
                r = sm.diario(self.chiave(), BASE, f)
                nuovi += r["nuovi"]
                spesa += r["spesa"]
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("diario")
            return {"ok": False, "msg": tr("sm_dia_err")}
        return {"ok": True, "nuovi": nuovi, "spesa": spesa, "compiti": sm.compiti(BASE)}

    def sm_compiti(self):
        import strumenti_sm as sm
        self._sm_leggi_lezioni()
        self._sm_leggi_formule()
        return {"ok": True, "compiti": sm.compiti(BASE), "ricorda": sm.da_ricordare(BASE),
                "oggi": datetime.date.today().isoformat(), "lavoro": bool(getattr(self, "_sm_lavoro", False))}

    def _sm_leggi_lezioni(self):
        """Scripta Manent: il diario si scrive da solo. Le lezioni nuove (pronte) vanno a Claude, una alla volta e una
        volta sola, per trovare i compiti assegnati e le verifiche annunciate."""
        import strumenti_sm as sm
        if not ed.SCRIPTA or not self.chiave() or getattr(self, "_sm_lavoro", False):
            return
        da = sm.lezioni_da_leggere(BASE)
        if not da:
            return
        self._sm_lavoro = True

        def lavoro():
            try:
                for c in da[:6]:
                    try:
                        r = sm.compiti_da_lezione(self.chiave(), BASE, c)
                        info = el.leggi_json(c / "info.json", {}) or {}
                        el.aggiorna_info(c, compiti_letti=True,
                                         spesa_appunti=round(float(info.get("spesa_appunti") or 0) + r["spesa"], 4))
                        log.info("compiti dalla lezione %s: %s", c.name, r["nuovi"])
                    except Exception:
                        log.exception("compiti dalla lezione %s", c.name)
                        el.aggiorna_info(c, compiti_letti=True)
            finally:
                self._sm_lavoro = False
        threading.Thread(target=lavoro, daemon=True).start()

    # le formule delle mie lezioni (il formulario che si riempie da solo)
    def sm_formule(self):
        import strumenti_sm as sm
        self._sm_leggi_formule()
        return {"ok": True, "formule": sm.formule(BASE), "lavoro": bool(getattr(self, "_sm_lavoro_f", False)),
                "chiave": bool(self.chiave())}

    def _sm_leggi_formule(self):
        """Le lezioni nuove (pronte) vanno a Claude una volta sola per trovare le formule, in sottofondo."""
        import strumenti_sm as sm
        if not ed.SCRIPTA or not self.chiave() or getattr(self, "_sm_lavoro_f", False):
            return
        da = sm.lezioni_per_formule(BASE)
        if not da:
            return
        self._sm_lavoro_f = True

        def lavoro():
            try:
                for c in da[:6]:
                    try:
                        r = sm.formule_da_lezione(self.chiave(), BASE, c)
                        info = el.leggi_json(c / "info.json", {}) or {}
                        el.aggiorna_info(c, formule_lette=True,
                                         spesa_appunti=round(float(info.get("spesa_appunti") or 0) + r["spesa"], 4))
                        log.info("formule dalla lezione %s: %s", c.name, r["nuove"])
                    except Exception:
                        log.exception("formule dalla lezione %s", c.name)
                        el.aggiorna_info(c, formule_lette=True)
            finally:
                self._sm_lavoro_f = False
        threading.Thread(target=lavoro, daemon=True).start()

    def sm_formule_foto(self, percorsi, dove="libro", pagina="", materia=""):
        import strumenti_sm as sm
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        nuove, spesa = 0, 0.0
        try:
            for f in [x for x in percorsi or [] if x][:5]:
                r = sm.formule_da_foto(self.chiave(), BASE, f, dove, pagina, materia)
                nuove += r["nuove"]
                spesa += r["spesa"]
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("formule dalla foto")
            return {"ok": False, "msg": tr("sm_fo_err")}
        return {"ok": True, "nuove": nuove, "spesa": spesa, "formule": sm.formule(BASE)}

    def sm_formula_togli(self, fid):
        import strumenti_sm as sm
        tolta = sm.togli_formula(BASE, fid)
        return {"ok": bool(tolta), "tolta": tolta, "formule": sm.formule(BASE)}

    def sm_formula_rimetti(self, voce):
        import strumenti_sm as sm
        return {"ok": sm.rimetti_formula(BASE, voce), "formule": sm.formule(BASE)}

    def sm_compito_modifica(self, vid, campi):
        import strumenti_sm as sm
        return {"ok": True, "compiti": sm.modifica(BASE, vid, campi or {})}

    def sm_pezzi(self, vid, rifai=False):
        import strumenti_sm as sm
        try:
            r = sm.pezzi(self.chiave(), BASE, vid, bool(rifai))
            return {"ok": True, **r, "compiti": sm.compiti(BASE)}
        except Exception:
            log.exception("pezzi del compito")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def sm_controlla(self, vid, percorsi, testo=""):
        """Controlla il risultato: le foto dello svolgimento di un compito."""
        import strumenti_sm as sm
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        foto = [x for x in percorsi or [] if x][:4]
        if not foto:
            return {"ok": False, "msg": tr("sm_pb_vuoto")}
        try:
            r = sm.controlla(self.chiave(), BASE, vid, foto, testo)
            return {"ok": True, **r, "compiti": sm.compiti(BASE)}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("controlla il risultato")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def sm_scaletta(self, vid, consegna="", idee=""):
        import strumenti_sm as sm
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            r = sm.scaletta(self.chiave(), BASE, vid, consegna, idee)
            return {"ok": True, **r, "compiti": sm.compiti(BASE)}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("scaletta")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def sm_scaletta_ordine(self, vid, ordine):
        import strumenti_sm as sm
        return {"ok": True, "compiti": sm.scaletta_ordine(BASE, vid, ordine or [])}

    def sm_pezzo(self, vid, i, fatto):
        import strumenti_sm as sm
        return {"ok": True, "compiti": sm.pezzo(BASE, vid, i, fatto)}

    def sm_ricordami(self, vid, quando):
        import strumenti_sm as sm
        return {"ok": True, "compiti": sm.ricordami(BASE, vid, quando)}

    # Verifica: cosa porta, piano, ogni giorno, correggi gli errori
    def sm_porta(self, vid, lez=None, pagine="", altro=""):
        import strumenti_sm as sm
        return {"ok": True, "compiti": sm.porta(BASE, vid, lez, pagine, altro)}

    def sm_piano(self, vid, minuti=30, giorni=None, lezioni=None):
        import strumenti_sm as sm
        try:
            return {"ok": True, "compiti": sm.piano_verifica(BASE, vid, minuti, giorni, lezioni)}
        except Exception:
            log.exception("piano della verifica")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def sm_piano_spunta(self, vid, g, i, fatto):
        import strumenti_sm as sm
        return {"ok": True, "compiti": sm.piano_spunta(BASE, vid, g, i, fatto)}

    def sm_ogni(self, vid, ora):
        import strumenti_sm as sm
        return {"ok": True, "compiti": sm.ogni_giorno(BASE, vid, ora)}

    def sm_correggi_verifica(self, vid, percorsi):
        import strumenti_sm as sm
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        foto = [x for x in percorsi or [] if x][:6]
        if not foto:
            return {"ok": False, "msg": tr("sm_pb_vuoto")}
        try:
            r = sm.correggi_verifica(self.chiave(), BASE, vid, foto)
            return {"ok": True, **r, "compiti": sm.compiti(BASE)}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("correggi gli errori")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def sm_errore_ok(self, vid, i, si):
        import strumenti_sm as sm
        return {"ok": True, "compiti": sm.errore_ok(BASE, vid, i, si)}

    def sm_sbagliate(self, materia):
        """Le domande che sbagli: quante crocette sbagliate (da rifare) e gli errori delle verifiche corrette."""
        import strumenti_sm as sm, esame as es
        return {"ok": True, "crocette": len(es.sbagliate_tutte(BASE, materia)), "errori": sm.errori_materia(BASE, materia)}

    def sm_promemoria(self):
        import strumenti_sm as sm
        return {"ok": True, "pronti": sm.promemoria_ora(BASE)}

    # Studia: voti della scuola, momenti segnati, cosa posso usare in verifica
    def sm_voti(self, materia=None):
        import strumenti_sm as sm
        return {"ok": True, "voti": sm.voti_scuola(BASE, materia)}

    def sm_voto_nuovo(self, voto):
        import strumenti_sm as sm
        v = sm.voto_nuovo(BASE, voto or {})
        return {"ok": bool(v), "voti": sm.voti_scuola(BASE, (voto or {}).get("materia"))}

    def sm_voto_togli(self, vid, materia=None):
        import strumenti_sm as sm
        t = sm.voto_togli(BASE, vid)
        return {"ok": bool(t), "tolto": t, "voti": sm.voti_scuola(BASE, materia)}

    def sm_momenti(self, materia, tipi=None):
        import strumenti_sm as sm
        return {"ok": True, "momenti": sm.momenti(BASE, materia, tuple(tipi) if tipi else ("chiarire",))}

    def sm_verifica(self, voci=None):
        """Senza argomenti: le voci spuntate. Con una lista: le salva."""
        import strumenti_sm as sm
        if voci is not None:
            self.cfg["sm_verifica"] = [x for x in voci if x in sm.VERIFICA_VOCI]
            salva_config(self.cfg)
        return {"ok": True, "voci": sm.in_verifica(self.cfg)}

    def sm_compito_nuovo(self, voce):
        import strumenti_sm as sm
        v = sm.aggiungi_voce(voce or {}, BASE)
        return {"ok": bool(v), "compiti": sm.compiti(BASE)}

    def sm_compito(self, vid, fatto=None, togli=False):
        import strumenti_sm as sm
        return {"ok": True, "compiti": sm.segna(BASE, vid, fatto, togli)}

    def leggimi_foto(self, percorsi):
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        pagine, spesa = [], 0.0
        for p in [x for x in percorsi or [] if x][:30]:
            try:
                r = ch.leggi_foto(self.chiave(), p, "leggimi")
                spesa += r["spesa"]
                if r["testo"]:
                    pagine.append(r["testo"])
            except ap.ErroreAppunti as e:
                return {"ok": False, "msg": str(e)}
            except Exception:
                log.exception("leggimi: foto %s", p)
        if not pagine:
            return {"ok": False, "msg": tr("sc_err")}
        r = self._lg_nuova("foto", f"{tr('lg_foto')} – {datetime.date.today().strftime('%d/%m/%Y')}", pagine)
        return {**r, "spesa": spesa}

    def leggimi_pagina(self, i, n):
        """Una pagina scansionata (senza testo): la legge Claude, una volta sola."""
        f = self._lg_cartella() / f"{Path(str(i)).name}.json"
        v = el.leggi_json(f, None)
        if not v:
            return {"ok": False, "msg": tr("lg_err")}
        n = int(n)
        if v["pagine"][n].strip():
            return {"ok": True, "testo": v["pagine"][n], "spesa": 0}
        pdf = f.with_suffix(".pdf")
        if not pdf.exists():
            return {"ok": False, "msg": tr("lg_nofile")}
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        try:
            r = ch.leggi_pagina_pdf(self.chiave(), pdf, n)
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("leggimi: pagina %s", n)
            return {"ok": False, "msg": tr("lg_err")}
        v["pagine"][n] = r["testo"] or "…"
        el.scrivi_json(f, v)
        return {"ok": True, **r}

    def leggimi_file(self, nome, dati_b64):
        """Sulla versione web il file arriva dalla pagina (non c'e' la finestra per sceglierlo)."""
        tmp = self._lg_cartella() / "_arrivo"
        shutil.rmtree(tmp, ignore_errors=True)
        tmp.mkdir()
        p = tmp / Path(str(nome)).name
        try:
            p.write_bytes(base64.b64decode(dati_b64))
            if p.suffix.lower() == ".pdf":
                return self.leggimi_pdf(str(p), nome)
            return self.leggimi_foto([str(p)])
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    # ------------------------------------------------------------------ appunti facili da leggere (Modalità DSA)

    def appunti_dsa(self, cartella, formato=None):
        """Il PDF degli appunti nel formato per DSA (carattere leggibile, piu' spazio, fondo crema), rifatto dai file
        degli appunti gia' fatti: non costa niente."""
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        fatti = [f for f in ap.FORMATI if ap.parti_json(cart, f)]
        if not fatti:
            return {"ok": False, "msg": tr("cd_niente")}
        formato = formato if formato in fatti else fatti[0]
        prima = el.FACILITATA
        try:
            el.FACILITATA = True
            dest = ap.pdf_dsa(cart, formato, Path(self.cfg["cartella_pacchetti"]))
            apri(dest)
            return {"ok": True, "file": str(dest), "formati": fatti}
        except Exception:
            log.exception("appunti DSA")
            return {"ok": False, "msg": tr("ap_imprevisto")}
        finally:
            el.FACILITATA = prima

    # ------------------------------------------------------------------ ascolta gli appunti (lettura ad alta voce)

    def ascolta_appunti(self, cartella):
        import ascolta
        try:
            return {"ok": True, **ascolta.appunti(cartella)}
        except Exception:
            log.exception("ascolta gli appunti")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    # La voce: sul PC (e su Mac e iPhone) parla la pagina con la voce del sistema; sul telefono Android la
    # finestra non ha voce e parla l'app (android_motore cambia queste tre funzioni).
    def voce_parla(self, testo, velocita=1.0, lingua="it"):
        return {"ok": False}

    def voce_occupata(self):
        return {"occupata": False}

    def voce_ferma(self):
        return {"ok": True}

    # ------------------------------------------------------------------ interrogazione a voce
    # Le risposte si registrano dal microfono (come una lezione «In aula», ma in una cartella a parte), si trascrivono
    # QUI sul PC (o sul telefono) e a Claude va solo il testo. L'audio si cancella quando si chiude l'interrogazione.

    def _orale_cartella(self):
        return BASE / "esami" / "_orale"

    def orale_nuova(self, materia):
        import esame as es
        if not self.chiave():
            return {"ok": False, "msg": tr("manca_chiave")}
        if self.reg is not None:
            return {"ok": False, "msg": tr("or_occupato")}
        self.orale_chiudi()
        try:
            orale, spesa = es.orale_nuova(BASE, materia, self.chiave(), testi.LINGUA)
            self._orale = {"materia": materia, "risposte": [], "reg": None, "k": 0}
            return {"ok": True, "orale": orale, "spesa": spesa}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("interrogazione")
            return {"ok": False, "msg": tr("es_err")}

    def orale_ascolta(self):
        """Comincia a registrare la risposta dal microfono."""
        o = getattr(self, "_orale", None)
        if not o or self.reg is not None:
            return {"ok": False, "msg": tr("or_occupato")}
        if o.get("reg") is not None:
            return {"ok": True}
        o["k"] += 1
        cart = self._orale_cartella() / f"r{o['k']:02d}"
        shutil.rmtree(cart, ignore_errors=True)
        cart.mkdir(parents=True, exist_ok=True)
        try:
            o["reg"] = rg.Registratore(cart, "orale", 3600, modo="aula", microfono=self.cfg.get("microfono") or None)
            o["reg"].avvia()
            o["cart"] = cart
            return {"ok": True}
        except Exception:
            log.exception("interrogazione: microfono")
            o["reg"] = None
            return {"ok": False, "msg": tr("or_mic")}

    def orale_livello(self):
        o = getattr(self, "_orale", None)
        r = (o or {}).get("reg")
        if r is None:
            return {"ok": False}
        return {"ok": True, "livello": float(r.livello or 0), "sec": float(r.secondi())}

    def orale_fine(self, n, domanda):
        """Ferma la registrazione, trascrive la risposta e chiede a Claude se fare una domanda in più."""
        import esame as es
        o = getattr(self, "_orale", None)
        r = (o or {}).get("reg")
        if r is None:
            return {"ok": False, "msg": tr("es_err")}
        o["reg"] = None
        cart = o["cart"]
        try:
            sec = float(r.ferma() or 0)
            wav = cart / "audio_001.wav"
            segs = []
            if wav.exists() and wav.stat().st_size > 2000:
                el.scrivi_json(cart / "info.json", {"lingua_lezione": testi.LINGUA, "precisa": True})
                segs = el.trascrivi_campioni(el.audio_16k(wav), cart)
            testo = " ".join(s["testo"] for s in segs if s.get("testo")).strip()
            if not testo:
                return {"ok": False, "vuota": True, "msg": tr("or_vuota")}
            o["risposte"].append({"sec": sec, "segmenti": segs, "wav": str(wav)})
            extra, spesa = es.orale_risposta(BASE, o["materia"], n, domanda, testo, self.chiave(), testi.LINGUA)
            return {"ok": True, "testo": testo, "extra": extra, "spesa": spesa}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("interrogazione: risposta")
            return {"ok": False, "msg": tr("es_err")}

    def orale_correggi(self):
        import esame as es
        o = getattr(self, "_orale", None)
        if not o:
            return {"ok": False, "msg": tr("es_err")}
        try:
            stile = es.come_hai_parlato(o["risposte"], testi.LINGUA)
            orale, spesa = es.orale_correggi(BASE, o["materia"], stile, self.chiave(), testi.LINGUA)
            return {"ok": True, "orale": orale, "ascolta": self._orale_audio(o), "spesa": spesa}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("interrogazione: correzione")
            return {"ok": False, "msg": tr("es_err")}

    def _orale_audio(self, o):
        """Tutte le risposte in un solo file, per «Riascoltati» (indirizzo per la finestra o None)."""
        import wave
        files = [Path(x["wav"]) for x in o["risposte"] if Path(x["wav"]).exists()]
        if not files:
            return None
        dest = self._orale_cartella() / "risposte.wav"
        try:
            with wave.open(str(files[0]), "rb") as w0:
                par = w0.getparams()
            with wave.open(str(dest), "wb") as out:
                out.setnchannels(par.nchannels)
                out.setsampwidth(par.sampwidth)
                out.setframerate(par.framerate)
                for f in files:
                    with wave.open(str(f), "rb") as w:
                        if w.getframerate() == par.framerate:
                            out.writeframes(w.readframes(w.getnframes()))
            return servi_video.registra(dest)
        except Exception:
            log.exception("interrogazione: riascolta")
            return None

    def orale_chiudi(self):
        """Fine dell'interrogazione: si ferma il microfono e si cancella l'audio delle risposte."""
        o = getattr(self, "_orale", None)
        if o and o.get("reg") is not None:
            try:
                o["reg"].ferma()
            except Exception:
                log.exception("interrogazione: stop")
        self._orale = None
        shutil.rmtree(self._orale_cartella(), ignore_errors=True)
        return {"ok": True}

    def andamento(self):
        """La pagina «Andamento»: ore registrate, lezioni, ripasso, esami, voti e cosa resta da sistemare (Studio);
        ore di riunione, cose da fare e decisioni (Lavoro). Solo dati gia' sul dispositivo: niente Claude."""
        import esame as es
        import ripasso_giorno as rg_
        import cose
        oggi = datetime.date.today()
        lun = oggi - datetime.timedelta(days=oggi.weekday())
        settimane = [lun - datetime.timedelta(weeks=7 - i) for i in range(8)]

        def sett(lista):
            out = []
            for d0 in settimane:
                d1 = d0 + datetime.timedelta(days=6)
                out.append({"da": d0.isoformat(), "a": d1.isoformat(),
                            "min": round(sum(x["sec"] for x in lista if d0 <= x["giorno"] <= d1) / 60)})
            return out
        try:
            elenco = self.lezioni().get("lezioni") or []
            studio, lavoro = [], []
            for l in elenco:
                info = el.leggi_json(Path(l["cartella"]) / "info.json", {}) or {}
                try:
                    q = datetime.datetime.fromisoformat(info.get("inizio", ""))
                except ValueError:
                    continue
                x = {"nome": l["nome"], "materia": l.get("materia") or "", "quando": q.isoformat(timespec="minutes"), "giorno": q.date(),
                     "sec": int(info.get("durata") or 0), "formato": l.get("formato") or info.get("formato_appunti") or "",
                     "modo": info.get("modo") or "", "cartella": l["cartella"], "sigla": l.get("sigla", ""), "colore": l.get("colore", ""),
                     "pronta": l.get("stato") == "pronta", "senza_appunti": bool(l.get("crea_appunti")) and not l.get("n_appunti")}
                (lavoro if (l.get("tipo") or "lezione") == "riunione" else studio).append(x)

            # ---- studio
            mese = oggi.replace(day=1)
            fatti = self.cfg.get("rg_fatti") or []
            giorni_rip = sorted({d for d in (rg_._data(g) for g in fatti) if d})
            record, fila, prima = 0, 0, None
            for d in giorni_rip:
                fila = fila + 1 if prima and (d - prima).days == 1 else 1
                record, prima = max(record, fila), d
            n = int(self.cfg.get("rg_max") or 20)
            rgd = rg_.oggi(BASE, n, fatti, False, False)
            carte, lz, esami = rg_._tutte(BASE)
            materie = {}
            for x in studio:
                if x["materia"]:
                    m = materie.setdefault(x["materia"], {"materia": x["materia"], "sec": 0, "colore": x["colore"], "sigla": x["sigla"]})
                    m["sec"] += x["sec"]
            pronto = {m["materia"]: m["pronto"] for m in rgd.get("materie") or []}
            lista_esami, senza_data, voti = [], [], []
            for m in sorted({x["materia"] for x in studio if x["materia"]}):
                d = es.leggi(BASE, m)
                dt = rg_._data(d.get("data_esame"))
                if dt and dt >= oggi:
                    lista_esami.append({"materia": m, "data": dt.isoformat(), "giorni": (dt - oggi).days, "pronto": pronto.get(m, 0)})
                elif not dt:
                    senza_data.append(m)
                vv = []
                for tipo in ("test", "orali", "simulazioni"):
                    for t_ in d.get(tipo) or []:
                        if t_.get("voto") is not None:
                            vv.append({"voto": int(t_["voto"]), "tipo": tipo, "quando": str(t_.get("quando") or "")[:10]})
                vv.sort(key=lambda v: v["quando"])
                if vv:
                    ult = [v["voto"] for v in vv[-3:]]
                    voti.append({"materia": m, "voti": vv[-8:], "media": round(sum(ult) / len(ult))})
            lista_esami.sort(key=lambda e: e["giorni"])
            sette = [oggi - datetime.timedelta(days=6 - i) for i in range(7)]
            visti = [c for c in carte if c.get("visto") and (oggi - c["visto"]).days < 7]
            # cosa resta da sistemare
            per_lez = {}
            for c in carte:
                per_lez.setdefault(c["cartella"], []).append(c)
            nomi = {x["cartella"]: x["nome"] for x in studio}
            mai = [{"nome": nomi.get(k, Path(k).name), "cartella": k} for k, cs in per_lez.items() if cs and all(c["box"] is None for c in cs)]
            sbagli = {}
            for c in carte:
                if c["ultimo"] == 0 and c.get("argomento"):
                    s_ = sbagli.setdefault((c["materia"], c["argomento"]), {"materia": c["materia"], "argomento": c["argomento"], "n": 0, "cartella": c["cartella"]})
                    s_["n"] += 1
            debole = max(sbagli.values(), key=lambda v: v["n"], default=None)
            settimana = sett(studio)
            out_studio = {
                "settimana_min": settimana[-1]["min"], "prima_min": settimana[-2]["min"], "settimane": settimana,
                "lezioni_tot": len(studio), "lezioni_mese": sum(1 for x in studio if x["giorno"] >= mese),
                "serie": rg_._serie(fatti), "record": record, "carte_oggi": len(rgd.get("carte") or []), "minuti_oggi": rgd.get("minuti") or 0,
                "fatto_oggi": bool(rgd.get("fatto_oggi")),
                "materie": sorted(({**m, "min": round(m["sec"] / 60)} for m in materie.values()), key=lambda m: -m["min"]),
                "esami": lista_esami, "senza_data": senza_data, "voti": voti,
                "rip7": [{"giorno": d.isoformat(), "fatto": d in set(giorni_rip)} for d in sette],
                "rip_visti": len(visti), "rip_sapute": sum(1 for c in visti if c["ultimo"] == 1),
                "mai": mai[:6], "n_mai": len(mai), "senza_appunti": [{"nome": x["nome"], "cartella": x["cartella"]} for x in studio if x["senza_appunti"]][:6],
                "debole": debole,
                "lezioni": [{k: (v.isoformat() if isinstance(v, datetime.date) else v) for k, v in x.items()} for x in sorted(studio, key=lambda x: x["quando"], reverse=True)]}

            # ---- lavoro
            lista = cose.tutte(BASE)
            persone = {}
            for a in lista:
                if a["fatto"]:
                    continue
                p = persone.setdefault(a["chi"] or "", {"chi": a["chi"] or "", "aperte": 0, "scadute": 0, "prossima": ""})
                p["aperte"] += 1
                p["scadute"] += 1 if a["scaduta"] else 0
                if a["data"] and (not p["prossima"] or a["data"] < p["prossima"]) and not a["scaduta"]:
                    p["prossima"] = a["data"]
            decisioni, da_decidere = [], []
            for x in sorted(lavoro, key=lambda x: x["quando"], reverse=True):
                cart = Path(x["cartella"])
                info = el.leggi_json(cart / "info.json", {}) or {}
                for k in sorted(info.get(ap.chiave_info("verbale")) or {}, key=int):
                    v = el.leggi_json(ap.file_json(cart, k, "verbale"), {}) or {}
                    for dd in v.get("decisioni") or []:
                        t_ = str(dd.get("testo") or "").strip()
                        if t_ and not any(t_ == y["testo"] for y in decisioni):
                            decisioni.append({"testo": t_, "chi": str(dd.get("chi") or ""), "nome": x["nome"], "quando": x["quando"],
                                              "cartella": x["cartella"], "sec": cose._sec(dd.get("dove"))})
                    for dd in v.get("da_decidere") or []:
                        t_ = str(dd.get("testo") or "").strip()
                        if t_ and not any(t_ == y["testo"] for y in da_decidere):
                            pr = v.get("prossima_riunione") or {}
                            da_decidere.append({"testo": t_, "nome": x["nome"], "quando": x["quando"], "cartella": x["cartella"],
                                                "prossima": str(pr.get("quando") or "") if isinstance(pr, dict) else ""})
            sl = sett(lavoro)
            out_lavoro = {
                "settimana_min": sl[-1]["min"], "settimana_n": sum(1 for x in lavoro if x["giorno"] >= settimane[-1]), "settimane": sl,
                "riunioni_tot": len(lavoro), "riunioni_mese": sum(1 for x in lavoro if x["giorno"] >= mese),
                "aperte": sum(1 for a in lista if not a["fatto"]), "scadute": sum(1 for a in lista if a["scaduta"]),
                "persone": sorted(persone.values(), key=lambda p: (-p["aperte"], p["chi"]))[:5],
                "decisioni": decisioni[:6], "decisioni_mese": sum(1 for d in decisioni if d["quando"][:10] >= mese.isoformat()),
                "da_decidere": da_decidere[:3],
                "riunioni": [{k: (v.isoformat() if isinstance(v, datetime.date) else v) for k, v in x.items()} for x in sorted(lavoro, key=lambda x: x["quando"], reverse=True)]}
            return {"ok": True, "studio": out_studio, "lavoro": out_lavoro, "oggi": oggi.isoformat()}
        except Exception:
            log.exception("andamento")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def cose_da_fare(self):
        import cose
        lista = cose.tutte(BASE)
        persone = sorted({a["chi"] for a in lista if a["chi"]})
        return {"cose": lista, "persone": persone, "aperte": sum(1 for a in lista if not a["fatto"]),
                "scadute": sum(1 for a in lista if a["scaduta"])}

    def cosa_fatta(self, id_, si=True):
        import cose
        cose.segna(BASE, id_, bool(si))
        return self.cose_da_fare()

    def cerca_parole(self, testo, tipo=""):
        """«Cerca in tutto»: le frasi dette, in tutte le registrazioni, che contengono tutte le parole cercate."""
        parole = [w for w in _senza_accenti(testo or "").split() if len(w) >= 2]
        if not parole or len(" ".join(parole)) < 3:
            return {"risultati": [], "volte": 0}
        try:
            cartelle = sorted((p for p in BASE.iterdir() if p.is_dir() and (p / "info.json").exists()),
                              key=lambda p: p.name, reverse=True)
        except OSError:
            cartelle = []
        out, volte = [], 0
        for cart in cartelle:
            info = el.leggi_json(cart / "info.json", {}) or {}
            t = info.get("tipo") or "lezione"
            if tipo and t != tipo:
                continue
            trovate = [f for f in self._frasi(cart) if all(w in f[3] for w in parole)]
            if not trovate:
                continue
            volte += len(trovate)
            try:
                d = datetime.datetime.fromisoformat(info.get("inizio", ""))
                quando = f"{d:%d/%m/%Y}"
            except ValueError:
                quando = ""
            out.append({"cartella": str(cart), "nome": info.get("nome", cart.name), "quando": quando, "tipo": t,
                        "n": len(trovate), "frasi": [{"sec": f[0], "ora": el.hms(f[0]), "chi": f[1], "testo": f[2][:300]}
                                                     for f in trovate[:6]]})
            if len(out) >= 40:
                break
        return {"risultati": out, "volte": volte, "parole": parole}

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
            el.scrivi_json(cart / "mappa_ia.json", d)          # quella di Claude, per «Torna alla mappa di Claude»
            return {"ok": True, "mappa": d, "nuova": True, "spesa": spesa}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("mappa mentale")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def mappa_salva(self, cartella, dati):
        """«La mia mappa»: quello che lo studente ha cambiato o scritto (temi, voci, colori, le sue voci in «Costruiscila tu»)."""
        cart = Path(cartella)
        if not (cart / "info.json").exists() or not isinstance(dati, dict):
            return {"ok": False}
        corto = lambda x, n: str(x or "").strip()[:n]
        rami = []
        for r in (dati.get("rami") or [])[:12]:
            if not isinstance(r, dict):
                continue
            foglie = [corto(f, 120) for f in (r.get("foglie") or [])[:12] if corto(f, 120)]
            mie = [corto(f, 160) for f in (r.get("mie") or [])[:12]]
            try:
                colore = int(r.get("colore")) % 6
            except (TypeError, ValueError):
                colore = len(rami) % 6
            rami.append({"titolo": corto(r.get("titolo"), 60) or "…", "foglie": foglie, "colore": colore, "mie": mie})
        d = {"centro": corto(dati.get("centro"), 60) or "…", "rami": rami, "mia": True}
        if not (cart / "mappa_ia.json").exists():          # la prima volta: si tiene da parte quella di Claude
            vecchia = el.leggi_json(cart / "mappa.json")
            if vecchia:
                el.scrivi_json(cart / "mappa_ia.json", vecchia)
        el.scrivi_json(cart / "mappa.json", d)
        return {"ok": True}

    def mappa_ia(self, cartella):
        """«Torna alla mappa di Claude»: quella fatta da Claude, prima delle modifiche."""
        cart = Path(cartella)
        d = el.leggi_json(cart / "mappa_ia.json") or el.leggi_json(cart / "mappa.json")
        return {"ok": bool(d), "mappa": d}

    def mappa_pdf(self, cartella, apri_dopo=True, mie=False):
        cart = Path(cartella)
        d = el.leggi_json(cart / "mappa.json")
        if not d:
            return {"ok": False}
        if mie:          # «Costruiscila tu»: nel PDF le voci scritte dallo studente
            d = {**d, "rami": [{**r, "foglie": [x for x in (r.get("mie") or []) if str(x).strip()]} for r in d.get("rami") or []]}
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
        return {"capitoli": out, "video": self.video_url(cartella), "nome": info.get("nome", ""), "durata": info.get("durata") or 0,
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

    def avvisati(self):
        """«Fatto, ho avvisato»: segna l'ora (anche in info.json, resta con la registrazione)."""
        a = getattr(self, "avvisa", None)
        if not a or self.cartella_corrente is None:
            return {"ok": False}
        a["fatto"] = datetime.datetime.now().strftime("%H.%M")
        try:
            el.aggiorna_info(self.cartella_corrente, partecipanti_avvisati=datetime.datetime.now().isoformat(timespec="seconds"))
        except Exception:
            log.exception("partecipanti avvisati")
        return {"ok": True, "ora": a["fatto"]}

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
        r = self.avvia(self.nome_unico(ev["titolo"]), {"modo": "aula" if ev.get("aula") else "online", "tipo": tipo,
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

    def anki(self, cartelle, titolo="", modo="tutte"):
        """«⬇ Esporta per Anki»: le stesse carte scelte nella pagina delle flashcard, in un file .apkg (vedi anki.py)."""
        import esporta_anki as ak
        import tempfile
        from PIL import Image
        carte = []
        for c in [c for c in cartelle or [] if Path(c).is_dir()]:
            st = rp._stat(c)
            for x in rp.carte_lezione(c):
                x["ultimo"] = (st.get(x["id"]) or {}).get("ultimo")
                carte.append(x)
        if modo == "stelle":
            carte = [c for c in carte if c["stelle"] >= 3]
        elif modo == "no":
            carte = [c for c in carte if c["ultimo"] == 0]
        if not carte:
            return {"ok": False, "msg": tr("rp_vuoto_anki")}
        tmp = Path(tempfile.mkdtemp(prefix="vmia_anki_"))

        def immagine(c):           # la slide ritagliata, piccola (JPEG 1280 px): il file resta leggero
            if not c.get("slide_file"):
                return None
            try:
                src = el.immagine_slide(c["cartella"], c["slide_file"])
                dest = tmp / (hashlib.sha1(str(src).encode()).hexdigest()[:16] + ".jpg")
                if not dest.exists():
                    with Image.open(src) as im:
                        im.thumbnail((1280, 1280))
                        im.convert("RGB").save(dest, "JPEG", quality=80)
                return dest
            except Exception:
                log.exception("anki: slide")
                return None
        dest_dir = self.pacchetti()
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{el.nome_sicuro(titolo or 'Verba Manent IA')} – {tr('anki_file')}.apkg"
        try:
            n = ak.crea(carte, lambda c: self._materia_lezione(c) or titolo, dest, immagine, testi.LINGUA)
        except Exception:
            log.exception("anki")
            return {"ok": False, "msg": tr("ap_imprevisto")}
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        aperto = apri(dest)
        if not aperto:
            mostra_file(dest)
        return {"ok": True, "n": n, "file": str(dest), "aperto": bool(aperto)}

    def _esame_di(self, cartella):
        """La data dell'esame della materia di una lezione (o None)."""
        import esame as es
        info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
        m = (info.get("materia") or materia_di(info.get("nome", Path(cartella).name))).strip()
        try:
            d = datetime.date.fromisoformat(str(es.leggi(BASE, m).get("data_esame") or "")[:10])
            return d if d >= datetime.date.today() else None
        except ValueError:
            return None

    # ------------------------------------------------------------------ ripasso del giorno

    def ripasso_giorno(self, lampo=False, leggero=False):
        import ripasso_giorno as rg_
        try:
            n = int(self.cfg.get("rg_max") or 20)
            d = rg_.oggi(BASE, n, self.cfg.get("rg_fatti") or [], bool(lampo), not leggero)
            if leggero:
                d["carte"] = len(d["carte"])
            return {"ok": True, **d}
        except Exception:
            log.exception("ripasso del giorno")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def ripasso_giorno_crocette(self, carte):
        import ripasso_giorno as rg_
        carte = [dict(c) for c in carte or [] if isinstance(c, dict) and c.get("id") and c.get("cartella")]
        try:
            spesa = rg_.crocette(carte, self.chiave(), testi.LINGUA)
            return {"ok": True, "carte": [{"id": c["id"], "opzioni": c.get("opzioni"), "giusta": c.get("giusta")} for c in carte],
                    "spesa": spesa}
        except ap.ErroreAppunti as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("ripasso del giorno: crocette")
            return {"ok": False, "msg": tr("rg_croc_err")}

    def ripasso_giorno_fatto(self):
        import ripasso_giorno as rg_
        oggi = datetime.date.today().isoformat()
        fatti = [x for x in (self.cfg.get("rg_fatti") or []) if x != oggi][-399:] + [oggi]
        self.cfg["rg_fatti"] = fatti
        salva_config(self.cfg)
        n = int(self.cfg.get("rg_max") or 20)
        return {"ok": True, "serie": rg_._serie(fatti), "domani": rg_.domani(BASE, n)}

    def ripasso_voto(self, cartella, cid, sapevo):
        if not cartella or not Path(cartella).is_dir():
            return False
        try:
            return rp.voto(cartella, cid, bool(sapevo), self._esame_di(cartella))
        except Exception:
            log.exception("voto ripasso")
            return False

    def cambia_materia(self, cartella, materia):
        """La materia di una registrazione (raggruppa le lezioni in Studia). Vuota = si ricava dal nome."""
        cart = Path(cartella)
        m = str(materia or "").strip()[:60]
        if not (cart / "info.json").exists():
            return {"ok": False}
        el.aggiorna_info(cart, materia=m or None)
        if m:
            self.ricorda_materia("", m)
        return {"ok": True, "materia": m}

    def rinomina(self, cartella, nuovo):
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        vecchio = info.get("nome", "Lezione")
        nuovo = (nuovo or "").strip()
        if nuovo == vecchio:
            return {"ok": True}
        v = self.nome_libero(nuovo, escludi=cart)
        if not v.get("ok"):
            return {"ok": False, "msg": self._msg_nome(v)}
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
                self._sync_tolta(cart.name)
                if self.cartella_corrente == cart:
                    self.cartella_corrente = nuova

    # ------------------------------------------------------------------ sincronizza (Wi-Fi)
    # Il PC fa da centro; il telefono (o un altro PC) si collega una volta con un codice di 6 cifre e poi si
    # sincronizza da solo ogni minuto, quando e' sulla stessa rete. Vedi sincronizza.py.

    def base(self):
        return BASE

    def pacchetti(self):
        return Path(self.cfg["cartella_pacchetti"])

    def salva_cfg(self):
        salva_config(self.cfg)

    def nome_dispositivo(self):
        if self.cfg.get("sync_nome"):
            return self.cfg["sync_nome"]
        import socket
        try:
            n = socket.gethostname()
        except OSError:
            n = ""
        if n and n.lower() not in ("localhost", "android") and not n.lower().startswith("android-"):
            return n
        try:                                   # telefono Android: il modello (es. «Samsung Galaxy A54»)
            from java import jclass
            b = jclass("android.os.Build")
            mod = str(b.MODEL or "")
            marca = str(b.MANUFACTURER or "")
            return (mod if mod.lower().startswith(marca.lower()) else f"{marca.capitalize()} {mod}").strip() or tr("sy_questo")
        except Exception:
            return tr("sy_questo")

    def sync_evento(self, tipo, nome):
        ev = getattr(self, "_sync_ev", None)
        if ev and ev.get("tipo") == "abbinato" and tipo != "abbinato" and time.time() - ev["t"] < 30:
            return          # «Collegati ✓» non si perde dietro alla prima sincronizzazione
        self._sync_ev = {"tipo": tipo, "nome": nome, "t": time.time()}

    def _sync(self):
        if getattr(self, "_sy", None) is None:
            import sincronizza as sy
            sy.CESTINO = al_cestino
            self._sy_mod = sy
            self._sy = sy.Centro(self)
            self._sy_stato = {"in_corso": False, "errore": "", "fase": 0.0, "ultimo": None, "giro": None}
            self._sy_lock = threading.Lock()
            self._sync_ev = None
            threading.Thread(target=self._sync_ciclo, daemon=True).start()
        return self._sy

    def avvia_sincronizza(self):
        """All'avvio: se ci sono dispositivi collegati, il centro si accende e il giro parte da solo."""
        if self._nv_attiva():
            self._nv()["subito"] = True
        if self.cfg.get("sync_dispositivi"):
            c = self._sync()
            if any(d.get("ruolo") == "client" for d in self.cfg["sync_dispositivi"]):
                c.avvia()

    def _sync_ciclo(self):
        while True:
            time.sleep(5)
            centri = [d for d in self.cfg.get("sync_dispositivi") or [] if d.get("ruolo") == "centro"]
            if not centri or self.occupato:
                continue
            ult = self._sy_stato.get("ultimo") or 0
            if time.time() - ult >= 60 or self._sy_stato.get("subito"):
                self._sy_stato["subito"] = False
                self._sync_giro()

    def _sync_opzioni(self):
        o = {"lezioni": True, "studio": True, "materie": True, "libro": True, "video": False}
        o.update(self.cfg.get("sync_opzioni") or {})
        return o

    def _sync_giro(self):
        sy = self._sy_mod
        if not self._sy_lock.acquire(blocking=False):
            return
        st = self._sy_stato
        try:
            st.update(in_corso=True, errore="", fase=0.0)
            for d in [d for d in self.cfg.get("sync_dispositivi") or [] if d.get("ruolo") == "centro"]:
                try:
                    r = sy.sincronizza(d, BASE, self.pacchetti(), self.cfg, self._sync_opzioni(),
                                       lambda f, rel: st.update(fase=f))
                    d["ip"] = r["ip"]
                    d["ultimo"] = time.strftime("%Y-%m-%dT%H:%M:%S")
                    st["giro"] = r
                    st["errore"] = ""
                    try:
                        self._nv_dal_centro(json.loads(sy._chiedi(r["ip"], "/vm/nuvola", d["token"]) or b"{}"))
                    except Exception:
                        log.exception("sincronizza: cloud dal PC")
                except ConnectionError:
                    st["errore"] = "non_trovato"
                except Exception:
                    log.exception("sincronizza")
                    st["errore"] = "rete"
            salva_config(self.cfg)
        finally:
            st.update(in_corso=False, ultimo=time.time())
            self._sy_lock.release()

    def sync_stato(self):
        c = self._sync()
        lista = [{"id": d.get("id"), "nome": d.get("nome"), "ultimo": d.get("ultimo") or "", "ruolo": d.get("ruolo")}
                 for d in self.cfg.get("sync_dispositivi") or []]
        ev, self._sync_ev = self._sync_ev, None
        return {"dispositivi": lista, "opzioni": self._sync_opzioni(), "nome": self.nome_dispositivo(),
                "centro": c.attivo, "ip": self._sy_mod._io_ip(), "codice": c.codice if c.codice and time.time() < c.codice_fino else "",
                "codice_sec": max(0, int(c.codice_fino - time.time())) if c.codice else 0,
                "in_corso": self._sy_stato["in_corso"], "fase": self._sy_stato["fase"], "errore": self._sy_stato["errore"],
                "giro": self._sy_stato["giro"], "evento": ev}

    def _sync_breve(self):
        """Per la riga in basso a sinistra: «🔄 Sincronizzato 2 min fa»."""
        ds = self.cfg.get("sync_dispositivi") or []
        if not ds and self._nv_attiva():
            n = self.cfg.get("nuvola") or {}
            nst = getattr(self, "_nv_stato", None) or {}
            return {"in_corso": bool(nst.get("in_corso")), "errore": nst.get("errore") or "", "ultimo": n.get("ultimo") or "", "client": False}
        if not ds:
            return None
        st = getattr(self, "_sy_stato", None) or {}
        return {"in_corso": bool(st.get("in_corso")), "errore": st.get("errore") or "",
                "ultimo": max((d.get("ultimo") or "" for d in ds), default=""), "client": any(d.get("ruolo") == "centro" for d in ds)}

    def sync_codice(self):
        """«Collega un telefono»: il centro si accende e mostra un codice di 6 cifre (vale 10 minuti)."""
        c = self._sync()
        if not c.avvia():
            return {"ok": False, "msg": tr("sy_err_porta")}
        return {"ok": True, "codice": c.nuovo_codice(), "nome": self.nome_dispositivo(), "ip": self._sy_mod._io_ip()}

    def sync_annulla_codice(self):
        self._sync().codice = None
        return {"ok": True}

    def sync_collega(self, codice):
        """«Collegati al PC»: cerca sulla rete il PC che mostra questo codice."""
        self._sync()
        ips = []
        q = str(codice or "").strip()
        if q.lower().startswith("vmia:"):          # dal QR: «vmia:482913@192.168.1.10,10.0.0.5»
            corpo = q[5:]
            codice, _, dove = corpo.partition("@")
            ips = [x for x in dove.split(",") if re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", x)]
        codice = re.sub(r"\D", "", str(codice or ""))
        if len(codice) != 6:
            return {"ok": False, "msg": tr("sy_err_codice")}
        if not self.cfg.get("sync_id"):
            self.cfg["sync_id"] = __import__("secrets").token_hex(6)
        d, err = self._sy_mod.abbina(codice, self.cfg["sync_id"], self.nome_dispositivo(), ips)
        if not d:
            return {"ok": False, "msg": tr({"non_trovato": "sy_err_trova", "codice": "sy_err_codice", "no_wifi": "sy_err_wifi"}.get(err, "sy_err_rete"))}
        lista = [x for x in self.cfg.get("sync_dispositivi") or [] if x.get("id") != d["id"]]
        lista.append(d)
        self.cfg["sync_dispositivi"] = lista
        salva_config(self.cfg)
        self._sy_stato["subito"] = True
        return {"ok": True, "nome": d["nome"]}

    def sync_adesso(self):
        self._sync()
        if any(d.get("ruolo") == "centro" for d in self.cfg.get("sync_dispositivi") or []):
            threading.Thread(target=self._sync_giro, daemon=True).start()
        return {"ok": True}

    def sync_scollega(self, id_disp):
        self.cfg["sync_dispositivi"] = [d for d in self.cfg.get("sync_dispositivi") or [] if d.get("id") != id_disp]
        salva_config(self.cfg)
        return {"ok": True}

    def sync_opzione(self, chiave, valore):
        if chiave in ("lezioni", "studio", "materie", "libro", "video"):
            self.cfg.setdefault("sync_opzioni", {})[chiave] = bool(valore)
            salva_config(self.cfg)
        elif chiave == "nome":
            self.cfg["sync_nome"] = str(valore or "").strip()[:40]
            salva_config(self.cfg)
        return {"ok": True}

    # ------------------------------------------------------------------ sincronizza anche fuori casa (cloud, zip con password)
    # Vedi nuvola.py. Il PC lo fa ogni 10 minuti; il telefono solo quando non trova il PC sul Wi-Fi.

    def _nv(self):
        if getattr(self, "_nv_stato", None) is None:
            self._nv_stato = {"in_corso": False, "errore": "", "fase": 0.0, "ultimo": 0, "giro": None, "accesso": "", "subito": False}
            self._nv_lock = threading.Lock()
            self._nv_cloud = None
            threading.Thread(target=self._nv_ciclo, daemon=True).start()
        return self._nv_stato

    def _nv_attiva(self):
        n = self.cfg.get("nuvola") or {}
        return bool(n.get("refresh") and n.get("chiave"))

    def _nv_firma(self):
        """Un'impronta veloce delle lezioni (cartelle e data dell'ultima modifica): cambia quando una lezione
        nuova e' pronta o quando arrivano appunti, ripasso, foto."""
        try:
            return hash(tuple(sorted((x.name, int(x.stat().st_mtime)) for x in BASE.iterdir() if x.is_dir() and not x.name.startswith("."))))
        except Exception:
            return None

    def _nv_ciclo(self):
        firma, cambiata = self._nv_firma(), 0.0
        while True:
            time.sleep(10)
            st = self._nv_stato
            if not self._nv_attiva():
                continue
            # lezione appena finita (o appunti nuovi): si carica subito, senza aspettare i 10 minuti
            f = self._nv_firma()
            if f != firma:
                firma, cambiata = f, time.time()
            if cambiata and time.time() - cambiata >= 20:      # 20 secondi di calma: e' finito di scrivere
                cambiata = 0.0
                st["subito"] = True
            if self.occupato:
                continue
            if not st["subito"] and time.time() - st["ultimo"] < 600:
                continue
            st["subito"] = False
            # telefono: se il PC e' raggiungibile sul Wi-Fi basta quello (e niente giga)
            centri = [d for d in self.cfg.get("sync_dispositivi") or [] if d.get("ruolo") == "centro"]
            sy_st = getattr(self, "_sy_stato", None) or {}
            if centri and not sy_st.get("errore") and time.time() - (sy_st.get("ultimo") or 0) < 180:
                st["ultimo"] = time.time()
                continue
            if (self.cfg.get("nuvola") or {}).get("solo_wifi", True) and self._rete_a_consumo():
                st["errore"] = "dati"
                st["ultimo"] = time.time()
                continue
            self._nv_giro()
            firma, cambiata = self._nv_firma(), 0.0      # i file appena scaricati non fanno ripartire il giro

    def nuvola_presto(self):
        """Quando si apre (o si torna su) Verba Manent: un giro fra pochi secondi, con le solite regole
        (sul telefono: niente giga se cosi' e' scelto, niente cloud se il PC e' raggiungibile sul Wi-Fi)."""
        if self._nv_attiva():
            st = self._nv()
            if time.time() - st["ultimo"] > 90:
                st["subito"] = True
        return {"ok": True}

    def _rete_a_consumo(self):
        """Telefono sui dati (non sul Wi-Fi)? Sul PC sempre no."""
        try:
            from java import jclass
            cm = jclass("it.puntowebferrara.registralezione.Ponte").contesto().getSystemService("connectivity")
            return bool(cm.isActiveNetworkMetered())
        except Exception:
            return False

    def _nv_giro(self):
        import nuvola as nv
        import zip_aes as za
        if not self._nv_lock.acquire(blocking=False):
            return
        st = self._nv_stato
        n = self.cfg.get("nuvola") or {}
        try:
            st.update(in_corso=True, fase=0.0)
            if not self._nv_cloud or self._nv_cloud.refresh != n.get("refresh"):
                self._nv_cloud = nv.Cloud.nuovo(n["provider"], n["refresh"])
            r = nv.giro(self._nv_cloud, BASE, self.pacchetti(), self.cfg, self._sync_opzioni(), n["chiave"],
                        lambda f: st.update(fase=f), self.nome_dispositivo())
            if self._nv_cloud.refresh != n.get("refresh"):
                n["refresh"] = self._nv_cloud.refresh
            n["ultimo"] = time.strftime("%Y-%m-%dT%H:%M:%S")
            self.cfg["nuvola"] = n
            st.update(errore="", giro=r)
        except nv.ErroreAccesso:
            st["errore"] = "accesso"
        except za.PasswordSbagliata:
            st["errore"] = "chiave"
        except Exception as e:
            log.exception("nuvola")
            st["errore"] = nv.motivo(e)
        finally:
            salva_config(self.cfg)
            st.update(in_corso=False, ultimo=time.time())
            self._nv_lock.release()

    def nuvola_stato(self):
        import nuvola as nv
        st = self._nv()
        n = self.cfg.get("nuvola") or {}
        cr = nv.credenziali()
        return {"provider": n.get("provider") or "", "email": n.get("email") or "", "attiva": self._nv_attiva(),
                "chiave": n.get("chiave") or "", "manca_chiave": bool(n.get("refresh") and not n.get("chiave")),
                "solo_wifi": n.get("solo_wifi", True), "ultimo": n.get("ultimo") or "",
                "in_corso": st["in_corso"], "fase": st["fase"], "errore": st["errore"], "giro": st["giro"], "accesso": st["accesso"],
                "dettaglio": st.get("dettaglio", ""),
                "disponibili": {"google": bool(cr["google"]), "microsoft": bool(cr["microsoft"])}}

    def nuvola_accedi(self, provider):
        """«Accedi con Google / Microsoft»: il browser si apre; qui si aspetta in un thread."""
        import nuvola as nv
        st = self._nv()
        if provider not in ("google", "microsoft") or not nv.credenziali()[provider]:
            return {"ok": False, "msg": tr("nv_err_nondisp")}
        if st["accesso"] == "in_corso":
            return {"ok": True}
        st["accesso"] = "in_corso"
        st["dettaglio"] = ""

        def lavora():
            try:
                testi_ = {k: tr("nv_pag_" + k) for k in ("ok_t", "ok_s", "no_t", "no_s")}
                r = nv.accedi(provider, apri, testi_)
                n = dict(self.cfg.get("nuvola") or {})
                n.update(provider=provider, refresh=r["refresh"], email=r["email"])
                n.pop("no", None)
                c = nv.Cloud.nuovo(provider, r["refresh"])
                if not n.get("chiave"):
                    va, gia = nv._riprova(lambda: nv.controlla_chiave(c, ""))
                    if gia:
                        n["chiave"] = ""                 # nel cloud ci sono gia' zip: serve la loro password
                    else:
                        n["chiave"] = nv.nuova_chiave()
                else:
                    va, gia = nv._riprova(lambda: nv.controlla_chiave(c, n["chiave"]))
                    if not va:
                        n["chiave"] = ""
                self.cfg["nuvola"] = n
                salva_config(self.cfg)
                st["accesso"] = ""
                st["subito"] = True
            except Exception as e:
                log.exception("nuvola: accesso")
                m = str(e) if str(e) in ("annullato", "tempo") else nv.motivo(e)
                st["dettaglio"] = nv.dettaglio(e)          # la causa tecnica in breve, per capire cosa non va (es. sul telefono)
                st["accesso"] = "errore:" + m
        threading.Thread(target=lavora, daemon=True).start()
        return {"ok": True}

    def nuvola_chiave(self, chiave):
        """La password degli zip scritta a mano (quando nel cloud ci sono gia' zip fatti da un altro dispositivo)."""
        import nuvola as nv
        n = dict(self.cfg.get("nuvola") or {})
        chiave = re.sub(r"[^A-Z0-9]", "", str(chiave or "").upper())
        chiave = "-".join(chiave[i:i + 4] for i in range(0, len(chiave), 4))
        if not n.get("refresh") or len(chiave) < 8:
            return {"ok": False, "msg": tr("nv_err_chiave")}
        try:
            va, _ = nv.controlla_chiave(nv.Cloud.nuovo(n["provider"], n["refresh"]), chiave)
        except Exception:
            log.exception("nuvola: chiave")
            return {"ok": False, "msg": tr("sy_err_rete")}
        if not va:
            return {"ok": False, "msg": tr("nv_err_chiave")}
        n["chiave"] = chiave
        self.cfg["nuvola"] = n
        salva_config(self.cfg)
        self._nv()["subito"] = True
        return {"ok": True}

    def nuvola_scollega(self):
        self.cfg["nuvola"] = {"no": True}
        salva_config(self.cfg)
        self._nv().update(errore="", giro=None)
        return {"ok": True}

    def nuvola_opzione(self, chiave, valore):
        if chiave == "solo_wifi":
            n = dict(self.cfg.get("nuvola") or {})
            n["solo_wifi"] = bool(valore)
            self.cfg["nuvola"] = n
            salva_config(self.cfg)
        return {"ok": True}

    def nuvola_adesso(self):
        if self._nv_attiva():
            self._nv()
            threading.Thread(target=self._nv_giro, daemon=True).start()
        return {"ok": True}

    def nuvola_per_altri(self):
        """Al telefono collegato con il QR (solo sul Wi-Fi, con il suo codice): accesso e password del cloud."""
        n = self.cfg.get("nuvola") or {}
        return {k: n.get(k) for k in ("provider", "refresh", "email", "chiave")} if self._nv_attiva() else {}

    def _nv_dal_centro(self, d):
        """Dopo un giro sul Wi-Fi: se il PC usa il cloud, anche questo dispositivo (a meno che l'abbia scollegato qui)."""
        if not d or (self.cfg.get("nuvola") or {}).get("no"):
            return
        n = dict(self.cfg.get("nuvola") or {})
        if n.get("refresh") and n.get("provider") == d.get("provider") and n.get("chiave") == d.get("chiave"):
            return
        n.update({k: d[k] for k in ("provider", "refresh", "email", "chiave") if d.get(k)})
        self.cfg["nuvola"] = n
        salva_config(self.cfg)
        self._nv()

    def _sync_tolta(self, nome):
        """Una lezione eliminata o rinominata: anche sugli altri dispositivi sparisce (non torna indietro)."""
        if self.cfg.get("sync_dispositivi"):
            el_ = list(self.cfg.get("sync_eliminate") or [])
            if nome not in el_:
                el_.append(nome)
                self.cfg["sync_eliminate"] = el_[-500:]
                salva_config(self.cfg)

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
            self._sync_tolta(cart.name)
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

    def cerca_aggiornamenti(self, silenzioso=False):
        """silenzioso: il controllo all'apertura. Non dice niente se e' tutto aggiornato o se manca la rete;
        se c'e' una versione nuova l'interfaccia mostra l'avviso (agg["avviso"])."""
        if self.occupato:
            if not silenzioso:
                self.agg = {"tipo": "msg", "testo": tr("agg_occupato")}
            return
        if not silenzioso:
            self.agg = {"tipo": "cerco", "testo": tr("agg_cerco")}

        def lavoro():
            try:
                t = agg.cerca()
                if t is None:
                    self.agg = {"tipo": None} if silenzioso else {"tipo": "ok", "testo": tr("agg_ultima")}
                else:
                    self.agg = {"tipo": "trovato", "dato": t, "avviso": bool(silenzioso)}
            except agg.NonTrovato:
                log.exception("aggiorna")
                self.agg = {"tipo": None} if silenzioso else {"tipo": "msg", "testo": tr("agg_404")}
            except Exception:
                log.warning("aggiorna: %s", "controllo all'apertura non riuscito" if silenzioso else "errore")
                if not silenzioso:
                    log.exception("aggiorna")
                self.agg = {"tipo": None} if silenzioso else {"tipo": "msg", "testo": tr("agg_rete")}
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

    def _pezzo_in_corso(self, threads):
        """«Pronta subito»: niente in coda e si sta registrando? Trascrivo intanto la parte in corso, a pezzi
        di 5 minuti, cosi' alla fine resta solo l'ultimo pezzo. (Non con «Dopo» del telefono: li' si aspetta.)"""
        reg, cart = self.reg, self.cartella_corrente
        if reg is None or cart is None or self.trascrivi_dopo:
            return
        try:
            k = int(getattr(reg, "parte", 0) or 0) + 1
            el.pre_trascrivi(cart, k, threads)
        except Exception:
            log.exception("trascrizione della parte in corso")

    def _lavoratore(self):
        while True:
            cores = os.cpu_count() or 2
            try:
                lavoro = self.lavori.get(timeout=float(os.environ.get("RL_ATTESA_PEZZO") or 20))
            except queue.Empty:
                self._pezzo_in_corso(max(1, cores // 2))
                continue
            tipo, cart = lavoro[0], lavoro[1]
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
            except ap.ParteVuota:
                log.info("appunti parte %s: parte vuota, niente appunti", k)
                self.coda.put(("ap_vuota", k))
                self._unisci_appunti(cart)
            except ap.ErroreAppunti as e:
                self.coda.put(("ap_err", (k, str(e))))
            except Exception:
                log.exception("appunti parte %s", k)
                self.coda.put(("ap_err", (k, tr("ap_imprevisto"))))

    def _unisci_appunti(self, cart):
        try:
            fatti = ap.appunti_lezione_completa(cart, self.cfg["cartella_pacchetti"], chiave=self.chiave() or None)
        except Exception:
            log.exception("appunti della lezione completa")
            fatti = None
        self.copia_cloud(cart)
        if fatti is None:
            return
        try:
            if any(fatti or []):
                self._invia_da_solo(cart)
        except Exception:
            log.exception("invio automatico")

    # ------------------------------------------------------------------ «Dove trascrivo»: sul dispositivo o sul server

    def _server_dati(self):
        d = self.cfg.get("server_trascrizione")
        if not d:
            return None
        try:
            return json.loads(ap.leggi_chiave(d) or "{}") or None
        except ValueError:
            return None

    def _server(self):
        """(endpoint, chiave) se si trascrive sul server, altrimenti None."""
        d = self._server_dati()
        if self.cfg.get("trascrivi_dove") != "server" or not d or not d.get("endpoint") or not d.get("chiave"):
            return None
        return d["endpoint"], d["chiave"]

    def server_collega(self, endpoint, chiave):
        """«Collega e prova»: prova il server con 20 secondi di audio, poi salva codice e chiave (cifrati)."""
        import server_trascrizione as st
        endpoint, chiave = str(endpoint or "").strip(), str(chiave or "").strip()
        vecchio = self._server_dati() or {}
        if not chiave and vecchio.get("endpoint") == endpoint:
            chiave = vecchio.get("chiave", "")          # chiave gia' salvata: si riprova senza riscriverla
        if not re.fullmatch(r"[a-z0-9]{6,40}", endpoint):
            return {"ok": False, "msg": tr("srv_codice")}
        if len(chiave) < 10:
            return {"ok": False, "msg": tr("srv_chiave")}
        try:
            r = st.prova(endpoint, chiave)
        except st.ErroreServer as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("prova del server")
            return {"ok": False, "msg": tr("ap_imprevisto")}
        self.cfg["server_trascrizione"] = ap.nascondi_chiave(json.dumps({"endpoint": endpoint, "chiave": chiave}))
        self.cfg["trascrivi_dove"] = "server"
        salva_config(self.cfg)
        log.info("server di trascrizione collegato: %s (prova in %s s)", endpoint, r["secondi"])
        return {"ok": True, **r}

    def server_scegli(self, dove):
        dove = "server" if dove == "server" else "qui"
        if dove == "server" and not self._server_dati():
            return {"ok": False, "msg": tr("srv_manca")}
        self.cfg["trascrivi_dove"] = dove
        salva_config(self.cfg)
        return {"ok": True}

    def server_scollega(self):
        self.cfg.pop("server_trascrizione", None)
        self.cfg["trascrivi_dove"] = "qui"
        salva_config(self.cfg)
        return {"ok": True}

    # ------------------------------------------------------------------ «Condividi e collega»

    def _collegato(self, servizio):
        """I dati di un collegamento (Slack, Teams, Notion, CRM), decifrati. {} se non collegato."""
        c = (self.cfg.get("collega") or {}).get(servizio) or {}
        if not c.get("dati"):
            return {}
        try:
            return json.loads(ap.leggi_chiave(c["dati"]) or "{}")
        except ValueError:
            return {}

    def _manda(self, servizio, doc):
        import condividi as cd
        d = self._collegato(servizio)
        if not d:
            raise cd.ErroreCondividi(tr("cd_non_collegato"))
        if servizio == "slack":
            cd.invia_slack(d["url"], doc)
        elif servizio == "teams":
            cd.invia_teams(d["url"], doc)
        elif servizio == "notion":
            return cd.invia_notion(d["chiave"], d["pagina"], doc)
        elif servizio == "crm":
            if d.get("tipo") == "hubspot":
                rub = self.cfg.get("rubrica") or {}
                emails = [rub[p] for p in doc["partecipanti"] if rub.get(p)]
                cd.invia_hubspot(d["chiave"], doc, emails)
            else:
                cd.invia_webhook(d["url"], doc, self.cfg.get("rubrica") or {})
        return ""

    def _invia_da_solo(self, cart):
        """Verbale pronto di una riunione (o appunti di un webinar): parte da solo dove si e' chiesto."""
        import condividi as cd
        info = el.leggi_json(Path(cart) / "info.json", {}) or {}
        if (info.get("tipo") or "lezione") == "lezione":
            return
        auto = [s for s in cd.SERVIZI if ((self.cfg.get("collega") or {}).get(s) or {}).get("auto") and self._collegato(s)]
        gia = info.get("inviato") or {}
        auto = [s for s in auto if s not in gia]
        if not auto:
            return
        doc = cd.documento(cart)
        for s in auto:
            try:
                self._manda(s, doc)
                gia[s] = datetime.datetime.now().isoformat(timespec="seconds")
                log.info("verbale mandato da solo a %s", s)
            except Exception as e:
                log.warning("invio automatico a %s: %s", s, e)
        el.aggiorna_info(cart, inviato=gia)

    def cond_info(self, cartella):
        import condividi as cd
        try:
            doc = cd.documento(cartella)
        except cd.ErroreCondividi as e:
            return {"ok": False, "msg": str(e)}
        rub = self.cfg.get("rubrica") or {}
        coll = self.cfg.get("collega") or {}
        return {"ok": True, "titolo": doc["titolo"], "formato": doc["formato"], "tipo": doc["tipo"],
                "oggetto": cd.oggetto_email(doc), "testo": cd.testo_email(doc),
                "partecipanti": [{"nome": p, "email": rub.get(p, "")} for p in doc["partecipanti"]],
                "azioni": doc["azioni"], "prossima": doc["prossima"], "pdf": bool(doc["pdf"]),
                "gdrive": cd.cartella_google_drive() is not None,
                "servizi": {s: {"collegato": bool(self._collegato(s)), "nome": (coll.get(s) or {}).get("nome", ""),
                                "auto": bool((coll.get(s) or {}).get("auto"))} for s in cd.SERVIZI}}

    def cond_email(self, cartella, d):
        import condividi as cd
        import webbrowser
        try:
            doc = cd.documento(cartella)
            rub = self.cfg.get("rubrica") or {}
            dest = []
            for nome, em in (d.get("dest") or {}).items():
                em = str(em or "").strip()
                if em:
                    rub[str(nome)] = em
                    dest.append(em)
            dest += [x for x in re.split(r"[\s,;]+", str(d.get("altri") or "")) if "@" in x]
            self.cfg["rubrica"] = rub
            salva_config(self.cfg)
            oggetto, testo = str(d.get("oggetto") or cd.oggetto_email(doc)), str(d.get("testo") or cd.testo_email(doc))
            if d.get("modo") == "gmail":
                webbrowser.open(cd.link_gmail(dest, oggetto, testo))
                if doc["pdf"]:
                    mostra_file(doc["pdf"])
                return {"ok": True}
            cart = Path(cartella) / "condividi"
            cart.mkdir(exist_ok=True)
            allegati = [doc["pdf"]] if doc["pdf"] else []
            ev = cd.eventi(doc)
            if ev:
                allegati.append(cd.crea_ics(ev, cart / ("Calendario – " + el.nome_sicuro(doc["titolo"]) + ".ics")))
            if not manda_email(dest, oggetto, testo, cart / (el.nome_sicuro(oggetto)[:80] + ".eml"), allegati, doc):
                return {"ok": False, "msg": tr("cd_err_eml")}
            return {"ok": True}
        except cd.ErroreCondividi as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("email")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def _docx(self, cartella):
        import condividi as cd
        doc = cd.documento(cartella)
        return cd.crea_docx(doc, Path(self.cfg["cartella_pacchetti"]) / cd.nome_file(doc, "docx"))

    def cond_word(self, cartella):
        import condividi as cd
        try:
            f = self._docx(cartella)
            apri(f)
            return {"ok": True, "file": str(f)}
        except cd.ErroreCondividi as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("word")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def cond_manda(self, cartella):
        """Il PDF (o il Word) da mandare con un'altra app: sul telefono il menu «Manda con…» (WhatsApp, Drive...)."""
        import condividi as cd
        try:
            doc = cd.documento(cartella)
            f = doc["pdf"] or self._docx(cartella)
            return {"ok": bool(mostra_file(f))}
        except cd.ErroreCondividi as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("manda")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def cond_gdocs(self, cartella):
        import condividi as cd
        import webbrowser
        try:
            f = self._docx(cartella)
            drive = cd.cartella_google_drive()
            if drive:
                dest = drive / "Verba Manent IA"
                dest.mkdir(exist_ok=True)
                shutil.copy2(f, dest / f.name)
                mostra_file(dest / f.name)
                return {"ok": True, "drive": True, "nome": f.name}
            webbrowser.open("https://drive.google.com/drive/my-drive")
            mostra_file(f)
            return {"ok": True, "drive": False, "nome": f.name}
        except cd.ErroreCondividi as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("google docs")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def cond_calendario(self, cartella, scelte, modo):
        import condividi as cd
        import webbrowser
        try:
            doc = cd.documento(cartella)
            ev = cd.eventi(doc, scelte)
            if not ev:
                return {"ok": False, "msg": tr("cd_cal_niente")}
            if modo == "google":
                for e in ev:
                    webbrowser.open(cd.link_google_calendar(e))
                return {"ok": True, "n": len(ev)}
            cart = Path(cartella) / "condividi"
            cart.mkdir(exist_ok=True)
            apri_calendario(ev, cart / ("Calendario – " + el.nome_sicuro(doc["titolo"]) + ".ics"))
            return {"ok": True, "n": len(ev)}
        except cd.ErroreCondividi as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("calendario")
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def cond_invia(self, cartella, servizio):
        import condividi as cd
        try:
            url = self._manda(servizio, cd.documento(cartella))
            gia = (el.leggi_json(Path(cartella) / "info.json", {}) or {}).get("inviato") or {}
            gia[servizio] = datetime.datetime.now().isoformat(timespec="seconds")
            el.aggiorna_info(cartella, inviato=gia)
            return {"ok": True, "url": url or ""}
        except cd.ErroreCondividi as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("invio a %s", servizio)
            return {"ok": False, "msg": tr("ap_imprevisto")}

    def collega(self, servizio, d):
        """Prova il collegamento e lo salva (cifrato). d: slack/teams {url}; notion {chiave, pagina};
        crm {tipo: hubspot|webhook, chiave|url}; auto: manda da solo dopo ogni riunione."""
        import condividi as cd
        d = {k: str(v).strip() if isinstance(v, str) else v for k, v in (d or {}).items()}
        try:
            if servizio == "slack":
                cd.invia_slack(d.get("url"), prova=True)
                dati, nome = {"url": d["url"]}, "Slack"
            elif servizio == "teams":
                cd.invia_teams(d.get("url"), prova=True)
                dati, nome = {"url": d["url"]}, "Teams"
            elif servizio == "notion":
                nome = cd.prova_notion(d.get("chiave"), d.get("pagina"))
                dati = {"chiave": d["chiave"], "pagina": d["pagina"]}
            elif servizio == "crm" and d.get("tipo") == "hubspot":
                cd.prova_hubspot(d.get("chiave"))
                dati, nome = {"tipo": "hubspot", "chiave": d["chiave"]}, "HubSpot"
            elif servizio == "crm":
                cd.invia_webhook(d.get("url"), prova=True)
                dati, nome = {"tipo": "webhook", "url": d["url"]}, urllib.parse.urlparse(d["url"]).netloc
            else:
                return {"ok": False, "msg": "?"}
        except cd.ErroreCondividi as e:
            return {"ok": False, "msg": str(e)}
        except Exception:
            log.exception("collega %s", servizio)
            return {"ok": False, "msg": tr("ap_imprevisto")}
        coll = self.cfg.get("collega") or {}
        coll[servizio] = {"dati": ap.nascondi_chiave(json.dumps(dati)), "nome": nome, "auto": bool(d.get("auto"))}
        self.cfg["collega"] = coll
        salva_config(self.cfg)
        return {"ok": True, "nome": nome}

    def scollega(self, servizio):
        coll = self.cfg.get("collega") or {}
        coll.pop(servizio, None)
        self.cfg["collega"] = coll
        salva_config(self.cfg)
        return {"ok": True}

    def collega_auto(self, servizio, si):
        coll = self.cfg.get("collega") or {}
        if servizio in coll:
            coll[servizio]["auto"] = bool(si)
            salva_config(self.cfg)
        return {"ok": True}

    def collegamenti(self):
        import condividi as cd
        coll = self.cfg.get("collega") or {}
        return {s: {"collegato": bool(self._collegato(s)), "nome": (coll.get(s) or {}).get("nome", ""),
                    "auto": bool((coll.get(s) or {}).get("auto"))} for s in cd.SERVIZI}

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
        elif tipo == "ap_vuota":
            self.parti.pop(dato, None)        # niente da riassumere: la parte non compare tra gli appunti
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
