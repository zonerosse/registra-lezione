# -*- coding: utf-8 -*-
"""
Registra Lezione per Android: la parte in Python che adatta il motore al telefono.
(Sta qui, con il resto del programma, cosi' si aggiorna anche con l'aggiornamento leggero dell'app.)

Il motore e' lo stesso del programma per Windows (motore.py, appunti.py, ripasso.py...). Qui sostituisco
solo le parti che su Windows usano cose di Windows:
  - registrazione   -> servizio Android "Registrazione" (microfono, notifica fissa con Pausa / Fine)
  - trascrizione    -> whisper.cpp dentro l'app (Whisper.trascriviFile), anche a pezzi mentre registra
  - riconoscitore   -> scaricato una volta (ggml-small-q5_1.bin, 190 MB)
  - audio finale    -> le parti WAV unite in audio.m4a dal telefono
  - PDF del docente -> disegnati con il lettore PDF di Android
  - aprire i file   -> l'app giusta del telefono; chiave di Claude protetta dal telefono
  - email           -> Gmail (o l'app di posta) con gli allegati; impegni -> calendario del telefono
  - spezzoni        -> pezzi dell'audio copiati dal telefono; chi parla -> modello delle voci dentro l'app
  - calendario      -> notifica all'ora dell'impegno, anche con l'app chiusa
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
CARTELLA = Path(".")   # cartella del programma in uso (rl o rl_agg)
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
            "durata": getattr(self, "durata", None), "slides": list(self.slides), "errori": self.errori,
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


def trascrivi_locale(audio, cartella, progresso=lambda f: None, threads=None):
    """Come elaborazione.trascrivi_locale, ma con whisper.cpp dentro l'app: i campioni vanno in un WAV
    nella cache e il riconoscitore lo legge. Orari dall'inizio dei campioni."""
    import wave
    import numpy as np
    import elaborazione as el
    cartella = Path(cartella)
    _aspetta_modello()
    _aspetta_caricatore(cartella)
    info_lez = el.leggi_json(cartella / "info.json", {}) or {}
    lingua = info_lez.get("lingua_lezione") or "it"
    parole = el.parole_lezione(cartella)
    # i telefoni hanno 4 processori veloci e 4 lenti: oltre 4 thread si va piu' piano
    n = max(2, min(4, int(threads or 4)))
    beam = 5 if info_lez.get("precisa") else 1
    tmp = Path(str(Ponte.cartellaCache())) / f"pezzo_{threading.get_ident()}.wav"
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes((np.clip(np.asarray(audio, dtype=np.float32), -1, 1) * 32767).astype("<i2").tobytes())
    esito = {}

    def lavora():
        try:
            esito["r"] = str(Whisper.INSTANCE.trascriviFile(str(_modello()), str(tmp), "", jfloat(0.0), lingua,
                                                            ", ".join(parole), n, beam))
        except Exception as e:
            esito["r"] = "ERRORE " + str(e)
    t0 = time.monotonic()
    th = threading.Thread(target=lavora, daemon=True)
    th.start()
    while th.is_alive():
        th.join(0.7)
        progresso(min(0.99, int(Whisper.INSTANCE.progresso()) / 100))
    try:
        tmp.unlink()
    except OSError:
        pass
    r = esito.get("r", "ERRORE")
    if r.startswith("ERRORE"):
        raise RuntimeError("trascrizione: " + r)
    out = []
    for riga in r.splitlines():
        if riga.startswith("PRIMA|"):
            continue
        if riga.startswith("LANG|"):
            if lingua == "auto":
                el.aggiorna_info(cartella, lingua_rilevata=riga[5:].strip())
            continue
        c = riga.split("|", 2)
        if len(c) == 3:
            out.append({"inizio": float(c[0]), "fine": float(c[1]), "testo": c[2].strip()})
    progresso(1.0)
    log.info("whisper: %.0f s di audio in %.0f s (%s thread, beam %s)", len(audio) / 16000, time.monotonic() - t0, n, beam)
    return out


def audio_parziale(wav):
    """La parte che si sta ancora registrando: l'intestazione del WAV si scrive alla fine, quindi leggo
    i dati dopo i primi 44 byte (16 kHz, mono, 16 bit, come li scrive il registratore dell'app)."""
    import numpy as np
    with open(wav, "rb") as f:
        f.seek(44)
        b = f.read()
    b = b[:len(b) // 2 * 2]
    return np.frombuffer(b, dtype="<i2").astype(np.float32) / 32768.0


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


# ----------------------------------------------------------------------------- «Importa un audio» (sul telefono)

def _durata_media(percorso):
    """Durata di un audio/video in secondi (lettore di Android), 0 se non si sa."""
    try:
        MMR = jclass("android.media.MediaMetadataRetriever")
        r = MMR()
        try:
            r.setDataSource(str(percorso))
            return float(str(r.extractMetadata(MMR.METADATA_KEY_DURATION) or 0)) / 1000
        finally:
            r.release()
    except Exception:
        log.exception("durata del file")
        return 0.0


def info_file(percorso):
    import datetime
    import re
    p = Path(percorso)
    st = p.stat()
    return {"percorso": str(p), "nome_file": p.name, "durata": _durata_media(p), "ha_video": False, "ha_audio": True,
            "peso": st.st_size, "data": datetime.datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
            "nome_proposto": re.sub(r"[_\-]+", " ", p.stem).strip()[:80]}


def copia(src, cart, avanzamento):
    """Il file scelto e' gia' una copia nella cache dell'app: lo sposto nella lezione."""
    import shutil
    src = Path(src)
    dest = Path(cart) / f"audio_originale{src.suffix.lower() or '.m4a'}"
    if str(src).startswith(str(Ponte.cartellaCache())):
        shutil.move(str(src), str(dest))
    else:
        shutil.copyfile(str(src), str(dest))
    avanzamento(1.0)
    return dest


def dividi_audio(sorgente, cart, parte_sec, durata, avanzamento):
    """Le parti audio_00k.wav (16 kHz mono) decodificate dal lettore di Android, una alla volta."""
    import elaborazione as el
    cart = Path(cart)
    n = max(1, int(-(-durata // parte_sec))) if durata else 10 ** 6
    for i in range(n):
        da = i * parte_sec
        if durata and da >= durata:
            break
        out = cart / f"audio_{i + 1:03d}.wav"
        if not Ponte.decodificaWav(str(sorgente), str(out), int(da * 1000), int(parte_sec * 1000)) or el.durata_wav(out) < 1:
            out.unlink(missing_ok=True)
            break
        avanzamento(min(1.0, (da + parte_sec) / durata) if durata else 0.5)
    return el.file_parti(cart)


def disegna_pagine(pdf, cartella_tmp):
    import docente as dc
    cartella_tmp = Path(cartella_tmp)
    Ponte.pdfInPng(str(pdf), str(cartella_tmp), dc.LARGHEZZA)
    return sorted(cartella_tmp.glob("p[0-9][0-9][0-9].png"))


# ----------------------------------------------------------------------------- le funzioni del PC, sul telefono

def _stringhe(lista):
    return jarray(jclass("java.lang.String"))([str(x) for x in lista])


def manda_email(dest, oggetto, testo, file_eml, allegati, doc=None):
    """Gmail (o l'app di posta del telefono) con destinatari, oggetto, testo e allegati: si preme Invia."""
    return bool(Ponte.email(_stringhe(dest), str(oggetto), str(testo), _stringhe([a for a in allegati if a])))


def apri_calendario(eventi, file_ics):
    """Gli impegni nel calendario del telefono: si aprono gia' scritti, uno sopra l'altro, e si tocca Salva.
    Tanti impegni (il piano di studio): il file .ics, da mandare all'app di calendario."""
    import datetime
    import condividi as cd
    if len(eventi) > 8:
        return bool(Ponte.condividi(str(cd.crea_ics(eventi, file_ics))))
    ok = False
    for e in reversed(eventi):          # l'ultimo aperto resta davanti: cosi' si salvano nell'ordine giusto
        d = datetime.date.fromisoformat(e["data"])
        if e.get("ora"):
            h, m = (int(x) for x in e["ora"].split(":"))
            a = datetime.datetime.combine(d, datetime.time(h, m)).astimezone()
            b, tutto = a + datetime.timedelta(hours=1), False
        else:                           # tutto il giorno: il calendario vuole la mezzanotte UTC
            a = datetime.datetime(d.year, d.month, d.day, tzinfo=datetime.timezone.utc)
            b, tutto = a + datetime.timedelta(days=1), True
        ok = bool(Ponte.evento(str(e["titolo"]), int(a.timestamp() * 1000), int(b.timestamp() * 1000), tutto,
                               str(e.get("note") or ""), "")) or ok
        time.sleep(0.4)
    return ok


def taglia(src, dest, da, a, audio, srt=None):
    """Lo spezzone sul telefono: un pezzo dell'audio, copiato com'e' (niente video: il telefono registra l'audio)."""
    return bool(Ponte.tagliaAudio(str(src), str(dest), int(da * 1000), int(a * 1000)))


class _SessioneVoci:
    """Come onnxruntime.InferenceSession per voci.py, ma il modello gira dentro l'app (onnxruntime per Android)."""

    def get_inputs(self):
        return [types.SimpleNamespace(name="feats")]

    def run(self, _uscite, ingressi):
        import numpy as np
        import voci as vc
        f = np.ascontiguousarray(next(iter(ingressi.values()))[0], dtype=np.float32)
        r = Ponte.impronta(str(vc.file_modello()), jarray(jfloat)(f.ravel()), int(f.shape[0]))
        return [np.asarray(list(r), dtype=np.float32)[None, :]]


def _audio_parte(cartella, k, inizio):
    """L'audio della parte k per «Chi parla»: la parte WAV, o (registrazione finita) il pezzo di audio.m4a."""
    import elaborazione as el
    cartella = Path(cartella)
    wav = cartella / f"audio_{k:03d}.wav"
    if wav.exists() and wav.stat().st_size > 1000:
        return el.audio_16k(wav)
    m4a = cartella / "audio.m4a"
    if not m4a.exists():
        return None
    tmp = Path(str(Ponte.cartellaCache())) / f"voci_{k:03d}.wav"
    try:
        if Ponte.decodificaWav(str(m4a), str(tmp), int(max(0.0, inizio) * 1000), int((el.parte_secondi(cartella) + 1) * 1000)):
            return el.audio_16k(tmp)
        return None
    finally:
        try:
            tmp.unlink()
        except OSError:
            pass


def _sveglie(m):
    """Calendario: per ogni impegno con «Avvisami» una sveglia del telefono, che all'ora giusta mostra la notifica
    anche se l'app e' chiusa. sveglie.json ricorda quelle messe (all'avvio le rimetto tutte: col riavvio si perdono)."""
    import datetime
    import zlib
    from testi import tr
    f = Path(str(Ponte.cartellaDati())) / "sveglie.json"
    prima = {}
    try:
        vecchie = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    except (OSError, ValueError):
        vecchie = {}
    for i in vecchie:                   # quelle di prima (anche di impegni tolti): via, le rimetto qui sotto
        try:
            Ponte.togliSveglia(int(i))
        except Exception:
            pass
    while True:
        try:
            ora = datetime.datetime.now().astimezone()
            nuove = {}
            for ev in list(getattr(m, "cal_lista", None) or []):
                if m._cal_modo(ev) != "avvisa" or ev["inizio"] <= ora:
                    continue
                i = zlib.crc32(str(ev["id"]).encode("utf-8")) & 0x3FFFFFFF
                ms = int((ev["inizio"] - datetime.timedelta(minutes=2)).timestamp() * 1000)
                nuove[str(i)] = ms
                if prima.get(str(i)) != ms:
                    Ponte.sveglia(i, ms, tr("and_cal_t", n=ev["titolo"]), tr("and_cal"))
            # «Ripasso del giorno»: il promemoria dei prossimi 7 giorni all'ora scelta (non oggi se e' gia' fatto)
            if m.cfg.get("rg_promemoria", True) and (m.cfg.get("rg_fatti") or m.cfg.get("rg_modo")):
                hh, mm = (str(m.cfg.get("rg_ora") or "18:00").split(":") + ["0"])[:2]
                fatto = datetime.date.today().isoformat() in (m.cfg.get("rg_fatti") or [])
                for g in range(7):
                    q = (ora.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0) + datetime.timedelta(days=g))
                    if q <= ora or (g == 0 and fatto):
                        continue
                    i = 0x3FFFFF00 + g
                    ms = int(q.timestamp() * 1000)
                    nuove[str(i)] = ms
                    if prima.get(str(i)) != ms:
                        Ponte.sveglia(i, ms, tr("and_rg_t"), tr("and_rg"))
            for i in set(prima) - set(nuove):
                Ponte.togliSveglia(int(i))
            if nuove != prima:
                f.write_text(json.dumps(nuove), encoding="utf-8")
            prima = nuove
        except Exception:
            log.exception("sveglie del calendario")
        time.sleep(60)


def _comprimi(audio):
    """«Sul server» dal telefono: i campioni diventano AAC (m4a) con il codificatore del telefono."""
    import wave
    import numpy as np
    cache = Path(str(Ponte.cartellaCache()))
    wav, m4a = cache / f"srv_{threading.get_ident()}.wav", cache / f"srv_{threading.get_ident()}.m4a"
    try:
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(16000)
            w.writeframes((np.clip(np.asarray(audio, dtype=np.float32), -1, 1) * 32767).astype("<i2").tobytes())
        if not Ponte.unisciAudio(_stringhe([str(wav)]), str(m4a)):
            raise RuntimeError("codifica audio")
        return m4a.read_bytes()
    finally:
        for f in (wav, m4a):
            try:
                f.unlink()
            except OSError:
                pass


def _funzioni_pc(mt):
    """Condividi, spezzoni, chi parla e calendario: le parti di Windows diventano quelle del telefono."""
    mt.manda_email = manda_email
    mt.apri_calendario = apri_calendario
    mt.taglia = taglia
    import server_trascrizione as st
    st.comprimi = _comprimi
    import voci as vc
    vc._sessione = lambda: _SessioneVoci()
    vc.cartella_modelli = lambda: Path(str(Ponte.cartellaDati()))      # accanto al riconoscitore vocale
    vc._audio_parte = _audio_parte
    # «Registra da solo» non si puo': Android non lascia accendere il microfono a un'app chiusa
    modo = mt.Motore._cal_modo
    mt.Motore._cal_modo = lambda self, ev: "avvisa" if modo(self, ev) == "solo" else modo(self, ev)


# ----------------------------------------------------------------------------- aggiornamenti

def _versione_locale():
    """{"versione": "0.7", "codice": 7, "contenuto": 7}: codice = app installata, contenuto = file del programma."""
    v = {}
    try:
        v = json.loads((CARTELLA / "versione_android.json").read_text(encoding="utf-8"))
    except Exception:
        pass
    v["codice"] = int(Ponte.codice())
    v.setdefault("versione", str(Ponte.versione()))
    v.setdefault("contenuto", 0)
    return v


def cerca_aggiornamento():
    """App nuova (APK, si installa dal browser) o solo file nuovi (aggiornamento leggero, dentro l'app)."""
    if os.environ.get("VM_IPHONE") or sys.platform == "ios":      # sull'iPhone gli aggiornamenti arrivano solo dall'App Store
        return None
    import urllib.request
    import ssl
    req = urllib.request.Request(AGG_URL + f"?t={int(time.time())}", headers={"User-Agent": "RegistraLezione"})
    with urllib.request.urlopen(req, timeout=20, context=ssl.create_default_context()) as r:
        remota = json.loads(r.read().decode("utf-8"))
    loc = _versione_locale()
    base = {"versione": remota.get("versione"), "novita": remota.get("novita", ""), "novita_en": remota.get("novita_en", "")}
    if int(remota.get("codice") or 0) > loc["codice"]:
        return {**base, "completo": True, "pagina": remota.get("apk")}
    if int(remota.get("contenuto") or 0) > int(loc["contenuto"]) and remota.get("zip"):
        return {**base, "completo": False, "url_zip": remota["zip"], "contenuto": int(remota["contenuto"])}
    return None


def installa_leggero(dato, progresso=lambda f: None):
    """Scarica i file nuovi del programma (pagine, guida, motore) in rl_agg: al riavvio l'app usa quelli."""
    import shutil
    import zipfile
    dati = Path(str(Ponte.cartellaCache()))
    z = dati / "aggiornamento.zip"
    fatto = {}

    def scarica():
        fatto["err"] = str(Ponte.scarica(dato["url_zip"], str(z)))
    th = threading.Thread(target=scarica, daemon=True)
    th.start()
    while th.is_alive():
        th.join(0.5)
        tot = int(Ponte.getTotale() or 0)
        progresso(min(0.95, int(Ponte.getScaricati()) / tot) if tot > 0 else 0.0)
    if fatto.get("err"):
        raise RuntimeError("download aggiornamento: " + fatto["err"])
    dest = CARTELLA.parent / "rl_agg"
    tmp = CARTELLA.parent / "rl_agg_tmp"
    shutil.rmtree(tmp, ignore_errors=True)
    with zipfile.ZipFile(z) as f:
        f.extractall(tmp)
    if not (tmp / "motore.py").exists() or not (tmp / "interfaccia" / "index.html").exists():
        shutil.rmtree(tmp, ignore_errors=True)
        raise RuntimeError("aggiornamento incompleto")
    shutil.rmtree(dest, ignore_errors=True)
    tmp.rename(dest)
    z.unlink()
    progresso(1.0)
    log.info("aggiornamento leggero pronto: contenuto %s", dato.get("contenuto"))


def riavvia():
    threading.Thread(target=lambda: (time.sleep(2.5), Ponte.riavvia()), daemon=True).start()


# ----------------------------------------------------------------------------- avvio

def _prepara(cartella_app, lingua_tel):
    os.environ["HOME"] = str(Ponte.cartellaDati())
    os.environ.pop("APPDATA", None)
    if os.environ.get("VM_IPHONE"):
        # sull'iPhone vero nella cartella principale dell'app non si puo' scrivere (solo Documents, Library, tmp):
        # impostazioni, modelli e strumenti vanno in Library/Application Support
        sup = Path(os.environ["HOME"]) / "Library" / "Application Support"
        sup.mkdir(parents=True, exist_ok=True)
        os.environ["APPDATA"] = os.environ["LOCALAPPDATA"] = str(sup)
        vecchio = Path(os.environ["HOME"]) / ".config" / "RegistraLezione"
        nuovo = sup / "RegistraLezione"
        if vecchio.exists() and not (nuovo / "config.json").exists():
            import shutil
            shutil.copytree(vecchio, nuovo, dirs_exist_ok=True)
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
    el.trascrivi_locale = trascrivi_locale
    el.audio_parziale = audio_parziale
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

    import importa as im
    im.info_file = info_file
    im.copia = copia
    im.dividi_audio = dividi_audio

    import appunti as ap
    ap.nascondi_chiave = lambda k: "android:" + str(Ponte.cifra(k))
    _leggi = ap.leggi_chiave
    ap.leggi_chiave = lambda s: str(Ponte.decifra(s.split(":", 1)[1])) if (s or "").startswith("android:") else _leggi(s)

    import aggiorna as agg
    agg.versione_locale = _versione_locale
    agg.cerca = cerca_aggiornamento
    agg.installa = installa_leggero
    agg.riavvia = riavvia

    import motore as mt

    def apri(percorso):
        if str(percorso).startswith(("http://", "https://")):     # es. «Scarica» l'app nuova: si apre nel browser
            Ponte.apriLink(str(percorso))
            return True
        p = Path(str(percorso))
        if p.is_dir():
            return False
        return bool(Ponte.apri(str(p)))
    mt.apri = apri
    mt.mostra_file = lambda percorso: bool(Ponte.condividi(str(percorso)))     # "mostra" = manda (WhatsApp, Drive...)
    mt.apri_non_disturbare = lambda: None
    mt.schermo_risoluzione = lambda: ""
    _funzioni_pc(mt)
    return mt


def testo_appunti():
    """Il testo copiato sul telefono (per riconoscere un invito appena copiato da WhatsApp)."""
    try:
        cm = _ctx().getSystemService(jclass("android.content.Context").CLIPBOARD_SERVICE)
        clip = cm.getPrimaryClip()
        if clip is None or clip.getItemCount() == 0:
            return ""
        t = clip.getItemAt(0).coerceToText(_ctx())
        return str(t) if t is not None else ""
    except Exception:
        return ""


# ----------------------------------------------------------------------------- voce (lettura ad alta voce)
# La finestra del telefono (WebView) non ha la voce del browser: parla la sintesi vocale di Android.
_VOCE = {"tts": None, "pronta": None, "da": 0.0}


def _tts():
    if _VOCE["tts"] is None:
        from java import dynamic_proxy
        TTS = jclass("android.speech.tts.TextToSpeech")

        class Pronta(dynamic_proxy(TTS.OnInitListener)):
            def onInit(self, stato):
                _VOCE["pronta"] = (stato == TTS.SUCCESS)
        _VOCE["ascolta"] = Pronta()                     # tengo il riferimento, se no Java lo perde
        _VOCE["tts"] = TTS(_ctx(), _VOCE["ascolta"])
    return _VOCE["tts"]


def _voce_per(t, lingua, chi):
    """Due voci diverse del telefono per il podcast a due voci (Giulia, Marco); se ce n'e' una sola, Marco piu' basso."""
    try:
        chiave = (lingua, chi)
        if chiave not in _VOCE.setdefault("scelte", {}):
            vv = sorted([v for v in t.getVoices().toArray() if str(v.getLocale().getLanguage()) == lingua and not v.isNetworkConnectionRequired()],
                        key=lambda v: str(v.getName()))
            _VOCE["scelte"][chiave] = vv[min(chi, len(vv) - 1)] if vv else None
            _VOCE["scelte"][(lingua, "uniche")] = len(vv) < 2
        v = _VOCE["scelte"][chiave]
        if v is not None:
            t.setVoice(v)
        t.setPitch(0.8 if chi and _VOCE["scelte"].get((lingua, "uniche")) else 1.0)
    except Exception:
        log.exception("voce: scelta")


def voce_parla(testo, velocita=1.0, lingua="it", chi=-1):
    try:
        t = _tts()
        for _ in range(50):                             # la prima volta la voce si prepara (al massimo 5 s)
            if _VOCE["pronta"] is not None:
                break
            time.sleep(0.1)
        if not _VOCE["pronta"]:
            return {"ok": False}
        TTS, Locale = jclass("android.speech.tts.TextToSpeech"), jclass("java.util.Locale")
        t.setLanguage(Locale("it", "IT") if lingua == "it" else Locale("en", "GB"))
        if chi is not None and int(chi) >= 0:
            _voce_per(t, "it" if lingua == "it" else "en", int(chi))
        elif _VOCE.get("scelte"):
            _VOCE["scelte"] = {}
            t.setPitch(1.0)
            t.setLanguage(Locale("it", "IT") if lingua == "it" else Locale("en", "GB"))
        t.setSpeechRate(float(velocita or 1.0))
        t.speak(str(testo or ""), TTS.QUEUE_FLUSH, None, "rl")
        _VOCE["da"] = time.monotonic()
        return {"ok": True}
    except Exception:
        log.exception("voce")
        return {"ok": False}


def voce_occupata():
    t = _VOCE["tts"]
    try:
        # appena dopo speak() la voce non e' ancora partita: per un attimo la conto come occupata
        return {"occupata": bool(t is not None and (t.isSpeaking() or time.monotonic() - _VOCE["da"] < 0.8))}
    except Exception:
        return {"occupata": False}


def voce_ferma():
    try:
        if _VOCE["tts"] is not None:
            _VOCE["tts"].stop()
    except Exception:
        log.exception("voce: stop")
    return {"ok": True}


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

    def scegli_testo():
        # l'app 0.10 (codice 10) sa scegliere anche Word e .txt; quelle prima solo i PDF
        f = str(Ponte.scegliFile("testo" if int(Ponte.codice()) >= 10 else "pdf"))
        if not f:
            return {"ok": False}
        return api._m.info_testo(f)

    def scatta_foto():
        """La fotocamera del telefono (durante la registrazione: foto alla lavagna)."""
        try:
            f = str(Ponte.scatta())
        except Exception:
            log.exception("fotocamera")
            f = ""
        if not f:
            return {"ok": False}
        return api._m.foto_aggiungi(f)

    def scatta_foglio():
        try:
            f = str(Ponte.scatta())
        except Exception:
            log.exception("fotocamera")
            f = ""
        return {"ok": bool(f), "percorsi": [f] if f else []}

    def scegli_immagini():
        f = str(Ponte.scegliFile("immagini"))
        lista = [x for x in f.split("\n") if x]
        return {"ok": bool(lista), "percorsi": lista}

    def sync_qr():
        """«Inquadra il QR»: il lettore di Google; poi si collega al PC con il codice e gli indirizzi del QR."""
        try:
            q = str(Ponte.leggiQr())
        except Exception:
            log.exception("lettore QR")
            q = "!"
        if q == "":
            return {"ok": False, "annullato": True}
        if q == "!":
            from testi import tr
            return {"ok": False, "msg": tr("sy_err_lettore")}
        return api._m.sync_collega(q)

    api.sync_qr = sync_qr
    api.scatta_foto = scatta_foto
    api.scatta_foglio = scatta_foglio
    api.scegli_immagini = scegli_immagini
    api.scegli_testo = scegli_testo
    api.scegli_pdf = scegli_pdf
    api.scegli_video = scegli_video
    api.scegli_cartella = lambda: {"ok": False}
    api.apri_pacchetti = lambda: False
    api.assistenza = lambda: Ponte.apriLink(mt.SITO_ASSISTENZA)
    api.informativa = lambda: Ponte.apriLink(mt.sito_privacy())
    api.esci = lambda: None
    api._apri_mini = lambda: None
    api.apri_finestra = lambda: None
    api.condividi = lambda percorso: bool(Ponte.condividi(str(percorso)))
    api.voce_parla = voce_parla
    mt.testo_appunti = testo_appunti
    api.voce_occupata = voce_occupata
    api.voce_ferma = voce_ferma


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
    global M, API, _PORTA, CARTELLA
    if _PORTA:                      # l'app e' stata riaperta ma Python era ancora vivo
        return _PORTA
    CARTELLA = Path(cartella_app)
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
        threading.Thread(target=_sveglie, args=(M,), daemon=True).start()
    _PORTA = _server(API, Path(cartella_app) / "interfaccia")
    try:      # per le prove automatiche: da qui si sa dove risponde il motore
        (Path(str(Ponte.cartellaDati())) / "porta.txt").write_text(str(_PORTA))
    except OSError:
        pass
    log.info("Android: pagine su 127.0.0.1:%s", _PORTA)
    return _PORTA
