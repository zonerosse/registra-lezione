# -*- coding: utf-8 -*-
"""
Il «ponte» verso l'iPhone, con gli stessi nomi del ponte Android (Ponte, Registrazione, Whisper),
cosi' android_motore.py funziona senza cambiarlo. Qui le funzioni del telefono si chiamano
con rubicon-objc (le librerie di iOS) invece che con Kotlin.

PRIMA PROVA: cartelle, batteria e link sono veri; registrazione e trascrizione arrivano nei passi successivi.
"""
import json
import logging
import os
import threading
import time
from pathlib import Path

log = logging.getLogger("registra_lezione")

CASA = Path.home()
DATI = CASA / "Documents"
CACHE = CASA / "Library" / "Caches" / "VerbaManent"
DATI.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)


def jfloat(x):
    return float(x)


def jarray(_tipo):
    return lambda x: list(x)


def _objc(nome):
    from rubicon.objc import ObjCClass
    return ObjCClass(nome)


def _sul_principale(fn):
    """Le funzioni dello schermo (UIKit) vanno chiamate dal filo principale dell'app."""
    try:
        from rubicon.objc.api import Block  # noqa: F401
        from rubicon.objc import objc_method  # noqa: F401
        import toga
        app = toga.App.app
        app.loop.call_soon_threadsafe(fn)
    except Exception:
        log.exception("iphone: principale")


class _Ponte:
    scaricati = 0
    totale = 0

    def contesto(self):
        return None

    def cartellaDati(self):
        return str(DATI)

    def cartellaCache(self):
        return str(CACHE)

    def versione(self):
        try:
            return str(_objc("NSBundle").mainBundle.infoDictionary.objectForKey_("CFBundleShortVersionString"))
        except Exception:
            return "0.1"

    def codice(self):
        return 10            # come l'app Android 0.10: tutte le funzioni nuove

    def getScaricati(self):
        return self.scaricati

    def getTotale(self):
        return self.totale

    def riavvia(self):
        log.info("iphone: riavvio non possibile, si continua")

    def _dispositivo(self):
        d = _objc("UIDevice").currentDevice
        d.batteryMonitoringEnabled = True
        return d

    def inCarica(self):
        try:
            return int(self._dispositivo().batteryState) in (2, 3)       # in carica o carica completa
        except Exception:
            return False

    def batteria(self):
        try:
            v = float(self._dispositivo().batteryLevel)
            return int(v * 100) if v >= 0 else 100
        except Exception:
            return 100

    def apri(self, percorso):
        log.info("iphone: apri %s (da fare)", percorso)
        return False

    def condividi(self, percorso):
        log.info("iphone: condividi %s (da fare)", percorso)
        return False

    def apriLink(self, url):
        def fai():
            try:
                u = _objc("NSURL").URLWithString_(str(url))
                _objc("UIApplication").sharedApplication.openURL_options_completionHandler_(u, {}, None)
            except Exception:
                log.exception("iphone: link")
        _sul_principale(fai)

    def scegliFile(self, tipo):
        return ""

    def scarica(self, indirizzo, dest):
        import urllib.request
        try:
            with urllib.request.urlopen(indirizzo, timeout=60) as r, open(dest + ".part", "wb") as f:
                self.totale = int(r.headers.get("Content-Length") or 0)
                self.scaricati = 0
                while True:
                    b = r.read(1 << 16)
                    if not b:
                        break
                    f.write(b)
                    self.scaricati += len(b)
            os.replace(dest + ".part", dest)
            return ""
        except Exception as e:
            return str(e)

    def pdfInPng(self, pdf, cartella, larghezza):
        return 0

    def unisciAudio(self, wavs, uscita):
        return False

    def cifra(self, testo):
        import base64
        return base64.b64encode(testo.encode()).decode()          # (prova: poi nel portachiavi dell'iPhone)

    def decifra(self, dati):
        import base64
        return base64.b64decode(dati).decode()

    def email(self, dest, oggetto, testo, allegati):
        return False

    def evento(self, titolo, inizio, fine, tutto, descrizione, luogo):
        return False

    def sveglia(self, i, quando, titolo, testo):
        pass

    def togliSveglia(self, i):
        pass

    def tagliaAudio(self, sorgente, uscita, da, a):
        return False

    def decodificaWav(self, sorgente, uscita, da, durata):
        return False

    def impronta(self, modello, dati, frame):
        import numpy as np
        x = np.asarray(dati, dtype=np.float32).reshape(1, frame, -1)
        v = np.concatenate([x[0].mean(axis=0), x[0].std(axis=0)])
        return list(np.resize(v, 256))

    def notifica(self, titolo, testo):
        log.info("iphone: notifica %s", titolo)


class _Reg:
    """Registrazione dal microfono dell'iPhone (AVAudioRecorder): audio_001.wav, audio_002.wav... a 16 kHz mono,
    una parte ogni N secondi, come su Android. Con «UIBackgroundModes: audio» continua a schermo spento."""
    RATE = 16000

    def __init__(self):
        self.attiva = False
        self.inPausa = False
        self.livello = 0.0
        self.partiChiuse = 0
        self.errore = ""
        self.richiestaFine = False
        self._fatti = 0.0          # secondi delle parti gia' chiuse
        self._rec = None
        self._th = None

    def getPartiChiuse(self):
        return self.partiChiuse

    def getErrore(self):
        return self.errore

    def getRichiestaFine(self):
        return self.richiestaFine

    def setRichiestaFine(self, v):
        self.richiestaFine = bool(v)

    def getLivello(self):
        return self.livello

    def getInPausa(self):
        return self.inPausa

    def secondi(self):
        try:
            return self._fatti + (float(self._rec.currentTime) if self._rec is not None else 0.0)
        except Exception:
            return self._fatti

    def pausa(self, si):
        self.inPausa = bool(si)
        try:
            if self._rec is not None:
                self._rec.pause() if si else self._rec.record()
        except Exception:
            log.exception("iphone: pausa")
        if si:
            self.livello = 0.0

    def livelloAdesso(self):
        return self.livello if self.attiva else 0.3

    def tieniSveglio(self, ctx, si):
        def fai():
            try:
                _objc("UIApplication").sharedApplication.idleTimerDisabled = bool(si)
            except Exception:
                log.exception("iphone: schermo acceso")
        _sul_principale(fai)

    def _sessione(self):
        from rubicon.objc.runtime import load_library
        load_library("AVFoundation")
        s = _objc("AVAudioSession").sharedInstance()
        # registrare e, se serve, sentire; Bluetooth e altoparlante ammessi
        s.setCategory_mode_options_error_("AVAudioSessionCategoryPlayAndRecord", "AVAudioSessionModeDefault", 4 | 8, None)
        s.setActive_error_(True, None)

    def _nuovo(self, k):
        from rubicon.objc import ns_from_py
        url = _objc("NSURL").fileURLWithPath_(f"{self._cartella}/audio_{k:03d}.wav")
        imp = ns_from_py({"AVFormatIDKey": 1819304813, "AVSampleRateKey": 16000.0, "AVNumberOfChannelsKey": 1,
                          "AVLinearPCMBitDepthKey": 16, "AVLinearPCMIsFloatKey": False, "AVLinearPCMIsBigEndianKey": False})
        r = _objc("AVAudioRecorder").alloc().initWithURL_settings_error_(url, imp, None)
        if r is None:
            raise RuntimeError("microfono non disponibile")
        r.meteringEnabled = True
        r.prepareToRecord()
        if not r.record():
            raise RuntimeError("il microfono non parte (permesso negato?)")
        return r

    def avvia(self, ctx, cartella, parte, nome):
        if self.attiva:
            return False
        self._cartella, self._parte = str(cartella), int(parte)
        self.partiChiuse, self._fatti, self.errore, self.richiestaFine, self.inPausa = 0, 0.0, "", False, False
        try:
            self._sessione()
            self._k = 1
            self._rec = self._nuovo(1)
        except Exception as e:
            log.exception("iphone: registrazione")
            self.errore = str(e)
            return False
        self.attiva = True
        self._th = threading.Thread(target=self._guarda, daemon=True)
        self._th.start()
        return True

    def _guarda(self):
        import math
        while self.attiva:
            time.sleep(0.2)
            r = self._rec
            if r is None or self.inPausa:
                continue
            try:
                r.updateMeters()
                db = float(r.averagePowerForChannel_(0))
                self.livello = max(0.0, min(1.0, math.pow(10, db / 20) * 4))
                if float(r.currentTime) >= self._parte:            # parte piena: chiudo e ne apro un'altra
                    durata = float(r.currentTime)
                    r.stop()
                    self._fatti += durata
                    self.partiChiuse = self._k
                    self._k += 1
                    self._rec = self._nuovo(self._k)
            except Exception as e:
                log.exception("iphone: registrazione in corso")
                self.errore = str(e)

    def ferma(self, ctx):
        self.attiva = False
        if self._th is not None:
            self._th.join(5)
        r, self._rec = self._rec, None
        try:
            if r is not None:
                durata = float(r.currentTime)
                r.stop()
                self._fatti += durata
                f = Path(f"{self._cartella}/audio_{self._k:03d}.wav")
                if durata >= 0.5:
                    self.partiChiuse = self._k
                elif f.exists():
                    f.unlink()
        except Exception:
            log.exception("iphone: fine registrazione")
        try:
            _objc("AVAudioSession").sharedInstance().setActive_error_(False, None)
        except Exception:
            pass
        return self._fatti


class _Whisper:
    def progresso(self):
        return 0

    def trascriviFile(self, *a):
        raise RuntimeError("La trascrizione sull'iPhone arriva in un prossimo passo.")


class _W:
    INSTANCE = _Whisper()


class _MMR:
    METADATA_KEY_DURATION = 9

    def setDataSource(self, p):
        self.p = p

    def extractMetadata(self, k):
        return None

    def release(self):
        pass


_P = _Ponte()
_R = _Reg()


def jclass(nome):
    if nome == "android.media.MediaMetadataRetriever":
        return _MMR
    if nome.endswith("Ponte"):
        return _P
    if nome.endswith("Registrazione"):
        return _R
    if nome.endswith("Whisper"):
        return _W
    if nome == "java.lang.String":
        return str
    raise KeyError(nome)
