# -*- coding: utf-8 -*-
"""
Registra Lezione per Android: avvio della parte in Python.

Il motore e' lo stesso del programma per Windows (motore.py, appunti.py, ripasso.py...). Qui sostituisco
solo le parti che su Windows usano cose di Windows:
  - registrazione   -> servizio Android "Registrazione" (microfono, notifica fissa con Pausa / Fine)
  - trascrizione    -> whisper.cpp dentro l'app (Whisper.trascriviFile)
  - riconoscitore   -> scaricato una volta (ggml-small-q5_1.bin, 190 MB)
  - audio finale    -> le parti WAV unite in audio.m4a dal telefono
  - PDF del docente -> disegnati con il lettore PDF di Android
  - aprire i file   -> l'app giusta del telefono; chiave di Claude protetta dal telefono
Poi apro un piccolo server solo dentro il telefono (127.0.0.1) che da' le pagine e risponde a /api/...
"""
import json
import logging
import mimetypes
import os
import sys
import threading
import time
import types
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from java import jarray, jclass, jfloat

Ponte = jclass("it.puntowebferrara.registralezione.Ponte")
Reg = jclass("it.puntowebferrara.registralezione.Registrazione")
Whisper = jclass("it.puntowebferrara.registralezione.Whisper")

MODELLO_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin"
AGG_URL = "https://raw.githubusercontent.com/zonerosse/registra-lezione/android-app/versione-android.json"
log = logging.getLogger("registra_lezione")
M = None          # il motore
API = None        # finestra_web.Api


def _modello():
    return Path(str(Ponte.cartellaDati())) / "ggml-small-q5_1.bin"


def _ctx():
    return Ponte.contesto()


# ----------------------------------------------------------------------------- registrazione

class RegistratoreAndroid:
    """Stessa forma di registratore.Registratore, ma registra il servizio Android (solo audio, 16 kHz)."""

    def __init__(self, cartella, nome, parte_secondi=3600, modo="online", microfono=None, diretta=False):
        self.cartella = Path(cartella)
        self.nome = nome
        self.modo = "aula" if modo == "aula" else "online"
        self.diretta = False
        self.parte_secondi = int(os.environ.get("RL_PARTE_SECONDI") or parte_secondi)
        self.n_slide = 0
        self.slides = []
        self.errori = []
        self.parte = 0
        self.on_parte = None
        self.audio_t0 = 0.0
        self.video_t0 = 0.0
        self._fermo = False
        self._pausa_da = None
        self._lock = threading.Lock()

    def avvia(self):
        (self.cartella / "slide").mkdir(parents=True, exist_ok=True)
        self.inizio = time.strftime("%Y-%m-%dT%H:%M:%S")
        self._salva_meta()
        Reg.avvia(_ctx(), str(self.cartella), self.parte_secondi, self.nome)
        threading.Thread(target=self._guarda, daemon=True).start()

    def _guarda(self):
        """Parti completate, errori e "Fine" toccato nella notifica."""
        while not self._fermo:
            self._annuncia(int(Reg.getPartiChiuse()), guardia=True)
            if str(Reg.getErrore()) and "audio" not in self.errori:
                self.errori.append("audio")
            if Reg.getRichiestaFine():
                Reg.setRichiestaFine(False)
                if M is not None and M.reg is self:
                    M.fine()
            time.sleep(0.5)

    def _annuncia(self, fino, guardia=False):
        """Parti complete (si possono gia' trascrivere): come on_parte del registratore di Windows."""
        with self._lock:
            if guardia and self._fermo:       # si sta fermando: ci pensa ferma()
                return
            while self.parte < fino:
                self.parte += 1
                if self.on_parte:
                    try:
                        self.on_parte(self.parte)
                    except Exception:
                        log.exception("avviso parte")

    @property
    def livello(self):
        return 0.0 if self.in_pausa else float(Reg.getLivello())

    @property
    def in_pausa(self):
        p = bool(Reg.getInPausa())
        if p and self._pausa_da is None:
            self._pausa_da = time.monotonic()
        elif not p:
            self._pausa_da = None
        return p

    def secondi(self):
        return float(Reg.secondi())

    def secondi_di_pausa(self):
        return (time.monotonic() - self._pausa_da) if self.in_pausa and self._pausa_da else 0.0

    def pausa(self):
        Reg.pausa(True)

    def riprendi(self):
        Reg.pausa(False)

    def prendi_diretta(self):
        return None

    def ferma(self):
        self._fermo = True
        self.durata = float(Reg.ferma(_ctx()))
        ultima = int(Reg.getPartiChiuse())
        self._annuncia(ultima - 1)          # parti chiuse proprio mentre si fermava: l'ultima la gestisce il motore
        with self._lock:
            self.parte = ultima
        if str(Reg.getErrore()) and "audio" not in self.errori:
            self.errori.append("audio")
        self._salva_meta()
        return self.durata

    def _salva_meta(self):
        import elaborazione as el
        el.scrivi_json(self.cartella / "meta.json", {
            "nome": self.nome, "inizio": getattr(self, "inizio", ""), "audio_t0": 0.0, "video_t0": 0.0,
            "durata": getattr(self, "durata", None), "slides": [], "errori": self.errori,
            "parte_secondi": self.parte_secondi})


# ----------------------------------------------------------------------------- trascrizione

def _aspetta_modello():
    """Il riconoscitore si scarica al primo avvio: se serve prima, aspetto (e riprovo se non era riuscito)."""
    import elaborazione as el
    from testi import tr
    while not el.modello_presente():
        if M is not None and M.modello_msg == tr("modello_err"):
            M.modello_msg = tr("modello_scarico")
            try:
                el.scarica_modello()
                M.modello_msg = ""
            except Exception:
                M.modello_msg = tr("modello_err")
                raise
        time.sleep(2)


def _aspetta_caricatore(cartella):
    """«Trascrivi solo sotto carica»: con «Dopo» aspetto che il telefono sia collegato."""
    import elaborazione as el
    info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
    if M is None or info.get("quando") != "dopo" or not M.cfg.get("solo_carica", True):
        return
    while not Ponte.inCarica():
        M.aspetta_carica = True
        time.sleep(3)
    M.aspetta_carica = False


def trascrivi_parte(cartella, k, progresso=lambda f: None, threads=None):
    import elaborazione as el
    cartella = Path(cartella)
    pj = cartella / f"trascrizione_{k:03d}.json"
    gia = el.leggi_json(pj)
    if gia is not None:
        progresso(1.0)
        return gia
    wav = cartella / f"audio_{k:03d}.wav"
    if not wav.exists() or el.durata_wav(wav) < 1:
        el.scrivi_json(pj, [])
        progresso(1.0)
        return []
    _aspetta_modello()
    _aspetta_caricatore(cartella)
    info_lez = el.leggi_json(cartella / "info.json", {}) or {}
    lingua = info_lez.get("lingua_lezione") or "it"
    parole = el.parole_lezione(cartella)
    prec = cartella / f"audio_{k - 1:03d}.wav"
    # i telefoni hanno 4 processori veloci e 4 lenti: oltre 4 thread si va piu' piano
    n = max(2, min(4, int(threads or 4)))
    beam = 5 if info_lez.get("precisa") else 1
    esito = {}

    def lavora():
        try:
            esito["r"] = str(Whisper.INSTANCE.trascriviFile(
                str(_modello()), str(wav), str(prec) if k > 1 and prec.exists() else "",
                jfloat(el.SOVRAPPOSIZIONE), lingua, ", ".join(parole), n, beam))
        except Exception as e:
            esito["r"] = "ERRORE " + str(e)
    t0 = time.monotonic()
    th = threading.Thread(target=lavora, daemon=True)
    th.start()
    while th.is_alive():
        th.join(0.7)
        progresso(min(0.99, int(Whisper.INSTANCE.progresso()) / 100))
    r = esito.get("r", "ERRORE")
    if r.startswith("ERRORE"):
        raise RuntimeError("trascrizione: " + r)
    prima, offset, out = 0.0, (k - 1) * el.parte_secondi(cartella), []
    for riga in r.splitlines():
        if riga.startswith("PRIMA|"):
            prima = float(riga[6:] or 0)
        elif riga.startswith("LANG|"):
            if lingua == "auto":
                el.aggiorna_info(cartella, lingua_rilevata=riga[5:].strip())
        else:
            c = riga.split("|", 2)
            if len(c) < 3:
                continue
            a, b, testo = float(c[0]), float(c[1]), c[2].strip()
            if testo and b > prima + 0.3:
                out.append({"inizio": round(offset + max(0.0, a - prima), 2), "fine": round(offset + b - prima, 2),
                            "testo": testo})
    progresso(1.0)
    el.scrivi_json(pj, out)
    log.info("trascrizione parte %s: %.0f s di audio in %.0f s (%s thread, beam %s)", k, el.durata_wav(wav),
             time.monotonic() - t0, n, beam)
    return out


def audio_16k(wav):
    """Le parti registrate dal telefono sono gia' WAV 16 kHz mono."""
    import wave
    import numpy as np
    with wave.open(str(wav), "rb") as w:
        d = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768.0
        if w.getnchannels() > 1:
            d = d.reshape(-1, w.getnchannels()).mean(axis=1)
    return d


def modello_presente():
    f = _modello()
    return f.exists() and f.stat().st_size > 100_000_000


def scarica_modello():
    err = str(Ponte.scarica(MODELLO_URL, str(_modello())))
    if err:
        raise RuntimeError("download riconoscitore: " + err)


def unisci_video(cartella, meta):
    """Sul telefono non c'e' video: le parti audio diventano un solo audio.m4a."""
    import elaborazione as el
    cartella = Path(cartella)
    out = cartella / "audio.m4a"
    parti = el.file_parti(cartella)
    if out.exists():
        return True
    wavs = [str(p) for p in parti.values() if el.durata_wav(p) > 0]
    if not wavs:
        return False
    return bool(Ponte.unisciAudio(jarray(jclass("java.lang.String"))(wavs), str(out)))


def disegna_pagine(pdf, cartella_tmp):
    import docente as dc
    cartella_tmp = Path(cartella_tmp)
    Ponte.pdfInPng(str(pdf), str(cartella_tmp), dc.LARGHEZZA)
    return sorted(cartella_tmp.glob("p[0-9][0-9][0-9].png"))


# ----------------------------------------------------------------------------- aggiornamenti

def cerca_aggiornamento():
    import aggiorna as agg
    import urllib.request
    import ssl
    req = urllib.request.Request(AGG_URL + f"?t={int(time.time())}", headers={"User-Agent": "RegistraLezione"})
    with urllib.request.urlopen(req, timeout=20, context=ssl.create_default_context()) as r:
        remota = json.loads(r.read().decode("utf-8"))
    if agg._num(remota.get("versione")) <= agg._num(str(Ponte.versione())):
        return None
    return {"versione": remota.get("versione"), "novita": remota.get("novita", ""),
            "novita_en": remota.get("novita_en", ""), "completo": True, "pagina": remota.get("apk")}


# ----------------------------------------------------------------------------- avvio

def _prepara(cartella_app, lingua_tel):
    os.environ["HOME"] = str(Ponte.cartellaDati())
    os.environ.pop("APPDATA", None)
    os.environ["RL_FONT_DIR"] = str(Path(cartella_app) / "font")
    os.environ.setdefault("TMPDIR", str(Ponte.cartellaCache()))
    sys.path.insert(0, cartella_app)

    # pywebview non c'e': finestra_web lo usa solo per i nomi delle finestre di scelta file
    wv = types.ModuleType("webview")
    wv.FileDialog = types.SimpleNamespace(OPEN=10, FOLDER=20, SAVE=30)
    wv.screens = []
    sys.modules["webview"] = wv

    import testi
    testi.lingua_windows = lambda: "it" if str(lingua_tel).lower().startswith("it") else "en"

    import elaborazione as el
    el.trascrivi_parte = trascrivi_parte
    el.audio_16k = audio_16k
    el.modello_presente = modello_presente
    el.scarica_modello = scarica_modello
    el.unisci_video = unisci_video

    import registratore as rg
    rg.Registratore = RegistratoreAndroid
    rg.controlla_audio = lambda: True
    rg.tieni_sveglio = lambda si: Reg.tieniSveglio(_ctx(), bool(si))
    rg.microfoni = lambda: [{"id": "", "nome": testi.tr("and_mic"), "predefinito": True}]
    rg.livello_microfono = lambda mid=None: float(Reg.livelloAdesso())

    import docente as dc
    dc._disegna_pagine = disegna_pagine

    import appunti as ap
    ap.nascondi_chiave = lambda k: "android:" + str(Ponte.cifra(k))
    _leggi = ap.leggi_chiave
    ap.leggi_chiave = lambda s: str(Ponte.decifra(s.split(":", 1)[1])) if (s or "").startswith("android:") else _leggi(s)

    import aggiorna as agg
    agg.versione_locale = lambda: {"versione": str(Ponte.versione())}
    agg.cerca = cerca_aggiornamento

    import motore as mt

    def apri(percorso):
        p = Path(str(percorso))
        if p.is_dir():
            return False
        return bool(Ponte.apri(str(p)))
    mt.apri = apri
    mt.mostra_file = lambda percorso: bool(Ponte.condividi(str(percorso)))     # "mostra" = manda (WhatsApp, Drive...)
    mt.apri_non_disturbare = lambda: None
    mt.schermo_risoluzione = lambda: ""
    return mt


def _api_android(api, mt):
    """Le scelte di file del telefono (non ci sono le finestre di Windows)."""
    from testi import tr

    def scegli_pdf():
        f = str(Ponte.scegliFile("pdf"))
        if not f:
            return {"ok": False}
        r = api._m.info_pdf(f)
        return {**r, "percorso": f} if r.get("ok") else {"ok": False, "msg": tr("dc_err")}

    def scegli_video():
        f = str(Ponte.scegliFile("video"))
        if not f:
            return {"ok": False}
        try:
            return {"ok": True, **api._m.info_video(f)}
        except Exception:
            log.exception("info video")
            return {"ok": False, "msg": "?"}

    api.scegli_pdf = scegli_pdf
    api.scegli_video = scegli_video
    api.scegli_cartella = lambda: {"ok": False}
    api.apri_pacchetti = lambda: False
    api.assistenza = lambda: Ponte.apriLink(mt.SITO_ASSISTENZA)
    api.esci = lambda: None
    api._apri_mini = lambda: None
    api.apri_finestra = lambda: None
    api.condividi = lambda percorso: bool(Ponte.condividi(str(percorso)))


def _stato_android(m):
    """Lo stato per la pagina, con batteria e caricatore."""
    from testi import tr
    base = type(m).stato

    def stato():
        s = base(m)
        carica = bool(Ponte.inCarica())
        s.update(android=True, in_carica=carica, batteria=int(Ponte.batteria()),
                 aspetta_carica=bool(getattr(m, "aspetta_carica", False)))
        if s.get("registro") and not m.trascrivi_dopo and not carica and not s.get("avviso"):
            s["avviso"] = tr("and_caricatore")
        return s
    m.stato = stato


def _avvisi(m):
    """Notifica quando la lezione e' pronta (l'app puo' essere chiusa o dietro)."""
    from testi import tr
    prima = None
    while True:
        time.sleep(2)
        try:
            f = m.finale
            if f == "ok" and isinstance(prima, float) and not m.occupato and m.avviso_fine != tr("fine_dopo"):
                Ponte.notifica(tr("and_pronta_t"), tr("and_pronta", n=m.titolo_fine or ""))
            prima = f
        except Exception:
            log.exception("avvisi")


def _server(api, pagine):
    pagine = Path(pagine).resolve()

    class H(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass

        def _invia(self, codice, corpo, tipo, extra=None):
            self.send_response(codice)
            self.send_header("Content-Type", tipo)
            self.send_header("Content-Length", str(len(corpo)))
            self.send_header("Cache-Control", "no-store")
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(corpo)

        def do_GET(self):
            p = (pagine / self.path.split("?")[0].lstrip("/")).resolve()
            if pagine not in p.parents or not p.is_file():
                self._invia(404, b"", "text/plain")
                return
            tipo = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
                    ".js": "application/javascript; charset=utf-8", ".webm": "video/webm",
                    ".mp4": "video/mp4"}.get(p.suffix) or mimetypes.guess_type(p.name)[0] or "application/octet-stream"
            dim = p.stat().st_size
            rng = self.headers.get("Range")
            if rng and rng.startswith("bytes="):          # i video della guida: si puo' andare avanti e indietro
                a, _, b = rng[6:].partition("-")
                a = int(a or 0)
                b = min(int(b) if b else dim - 1, dim - 1)
                with open(p, "rb") as f:
                    f.seek(a)
                    corpo = f.read(b - a + 1)
                self._invia(206, corpo, tipo, {"Content-Range": f"bytes {a}-{b}/{dim}", "Accept-Ranges": "bytes"})
                return
            self._invia(200, p.read_bytes(), tipo, {"Accept-Ranges": "bytes"})

        def do_POST(self):
            n = self.path.split("?")[0].split("/")[-1]
            corpo = self.rfile.read(int(self.headers.get("Content-Length") or 0))
            try:
                args = json.loads(corpo or b"[]")
                if n.startswith("_") or not hasattr(api, n):
                    raise AttributeError(n)
                r = getattr(api, n)(*args)
            except Exception as e:
                log.exception("api %s", n)
                r = {"ok": False, "errore": str(e)}
            self._invia(200, json.dumps(r).encode("utf-8"), "application/json")

    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]


_PORTA = None


def avvia(cartella_app, lingua_tel="it"):
    """Chiamata dall'app all'avvio: ritorna la porta del server delle pagine."""
    global M, API, _PORTA
    if _PORTA:                      # l'app e' stata riaperta ma Python era ancora vivo
        return _PORTA
    mt = _prepara(cartella_app, lingua_tel)
    import finestra_web as fw
    API = fw.Api()
    API._win = types.SimpleNamespace(evaluate_js=lambda *a: None, minimize=lambda: None, restore=lambda: None,
                                     show=lambda: None, destroy=lambda: None)
    _api_android(API, mt)
    API._carica()
    M = API._m
    if M is not None:
        M.aspetta_carica = False
        _stato_android(M)
        threading.Thread(target=_avvisi, args=(M,), daemon=True).start()
    _PORTA = _server(API, Path(cartella_app) / "interfaccia")
    log.info("Android: pagine su 127.0.0.1:%s", _PORTA)
    return _PORTA
