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
    def __init__(self):
        self.attiva = False
        self.errore = ""

    def getPartiChiuse(self):
        return 0

    def getErrore(self):
        return self.errore

    def getRichiestaFine(self):
        return False

    def setRichiestaFine(self, v):
        pass

    def getLivello(self):
        return 0.0

    def getInPausa(self):
        return False

    def secondi(self):
        return 0.0

    def pausa(self, si):
        pass

    def livelloAdesso(self):
        return 0.0

    def tieniSveglio(self, ctx, si):
        def fai():
            try:
                _objc("UIApplication").sharedApplication.idleTimerDisabled = bool(si)
            except Exception:
                log.exception("iphone: schermo acceso")
        _sul_principale(fai)

    def avvia(self, ctx, cartella, parte, nome):
        self.errore = "La registrazione sull'iPhone arriva nel prossimo passo."
        return False

    def ferma(self, ctx):
        return 0.0


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
