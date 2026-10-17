# -*- coding: utf-8 -*-
"""
Rapporti sugli errori (Sentry, dati in Europa), SOLO con il consenso dell'utente.

Niente libreria esterna: il rapporto lo costruisco io, cosi' so esattamente cosa contiene.
Nel rapporto c'e':   tipo di errore, punto del programma (file .py, funzione, riga), versione,
                     sistema operativo e versione di Python.
Non c'e' MAI:        registrazioni, trascrizioni, appunti, nomi di file o di persone, chiavi,
                     variabili del programma, indirizzo del computer. Il testo dell'errore viene
                     ripulito (percorsi, virgolette, indirizzi e-mail e web, numeri lunghi tolti).
"""
import json
import logging
import os
import platform
import re
import ssl
import sys
import threading
import time
import traceback
import urllib.request
import uuid

DSN = "https://a3c8a8418fda59276f26ae4b19ab5aec@o4512271345909760.ingest.de.sentry.io/4512271377498192"
MASSIMO = 20                       # rapporti al massimo per ogni avvio
attivo = False                     # lo accende il motore se l'utente ha detto si'
versione = "?"
_inviati = set()
_conta = 0
_lock = threading.Lock()

_m = re.match(r"https://(\w+)@([^/]+)/(\d+)", DSN)
_CHIAVE, _HOST, _PROGETTO = _m.group(1), _m.group(2), _m.group(3)
URL = f"https://{_HOST}/api/{_PROGETTO}/envelope/"


def sistema():
    if "ANDROID_DATA" in os.environ or "ANDROID_ROOT" in os.environ:
        return "android"
    return {"win32": "windows", "darwin": "mac"}.get(sys.platform, sys.platform)


def pulisci(testo):
    """Toglie dal testo di un errore tutto quello che potrebbe essere personale."""
    t = str(testo or "")
    t = re.sub(r"(?:[A-Za-z]:)?[\\/][^\s'\"<>|]*", "<percorso>", t)        # percorsi
    t = re.sub(r"\S+@\S+", "<email>", t)
    t = re.sub(r"https?://\S+", "<link>", t)
    t = re.sub(r"(['\"«“]).*?(['\"»”])", r"\1…\2", t)                     # tutto tra virgolette
    t = re.sub(r"\b(sk-|key|token)[\w-]*", "<chiave>", t, flags=re.I)
    t = re.sub(r"\d{5,}", "<n>", t)
    return t[:300]


def _fotogrammi(tb):
    out = []
    for f in traceback.extract_tb(tb)[-30:]:
        nome = os.path.basename(f.filename or "?")
        nostro = not re.search(r"site-packages|dist-packages|[\\/]lib[\\/]python|_vendor", f.filename or "")
        out.append({"filename": nome, "function": f.name, "lineno": f.lineno, "in_app": nostro,
                    "module": os.path.splitext(nome)[0]})
    return out


def evento(tipo, valore, tb=None, dove="", origine="python"):
    """Il rapporto vero e proprio (dizionario per Sentry)."""
    return {
        "event_id": uuid.uuid4().hex,
        "timestamp": time.time(),
        "platform": "python",              # anche per gli errori della pagina: cosi' Sentry non ricava l'indirizzo IP
        "level": "error",
        "logger": origine,
        "release": f"verbamanent@{versione}",
        "environment": sistema(),
        "server_name": "",
        "exception": {"values": [{"type": tipo, "value": pulisci(valore),
                                  "stacktrace": {"frames": _fotogrammi(tb) if tb else []}}]},
        "tags": {"dove": pulisci(dove)[:60], "sistema": sistema()},
        "contexts": {"os": {"name": platform.system(), "version": platform.release()},
                     "runtime": {"name": "CPython", "version": platform.python_version()}},
    }


def _manda(ev):
    corpo = (json.dumps({"event_id": ev["event_id"], "dsn": DSN}) + "\n"
             + json.dumps({"type": "event"}) + "\n" + json.dumps(ev, ensure_ascii=False)).encode("utf-8")
    req = urllib.request.Request(URL, data=corpo, method="POST", headers={
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": f"Sentry sentry_version=7, sentry_key={_CHIAVE}, sentry_client=verbamanent/1.0"})
    try:
        urllib.request.urlopen(req, timeout=8, context=ssl.create_default_context()).read()
    except Exception:
        pass                         # un rapporto perso non deve mai disturbare il programma


def segnala(tipo, valore, tb=None, dove="", origine="python"):
    """Manda il rapporto in sottofondo (una volta sola per lo stesso errore, al massimo MASSIMO)."""
    global _conta
    if not attivo:
        return False
    try:
        fr = traceback.extract_tb(tb)[-1] if tb else None
        impronta = (tipo, fr.filename if fr else dove, fr.lineno if fr else 0)
        with _lock:
            if impronta in _inviati or _conta >= MASSIMO:
                return False
            _inviati.add(impronta)
            _conta += 1
        threading.Thread(target=_manda, args=(evento(tipo, valore, tb, dove, origine),), daemon=True).start()
        return True
    except Exception:
        return False


class _Gestore(logging.Handler):
    """Gli errori che il programma scrive nel suo registro (log.exception) diventano rapporti."""
    def emit(self, record):
        if record.levelno >= logging.ERROR and record.exc_info and record.exc_info[0]:
            e, v, tb = record.exc_info
            segnala(e.__name__, v, tb, dove=record.getMessage())


_installato = False


def installa(ver):
    """Da chiamare all'avvio. Finche' attivo e' False non parte niente."""
    global versione, _installato
    versione = ver
    if _installato:
        return
    _installato = True
    logging.getLogger("registra_lezione").addHandler(_Gestore(level=logging.ERROR))
    vecchio = sys.excepthook

    def gancio(e, v, tb):
        segnala(e.__name__, v, tb, dove="non gestito")
        vecchio(e, v, tb)
    sys.excepthook = gancio
    vecchio_t = threading.excepthook

    def gancio_t(a):
        if a.exc_type is not SystemExit:
            segnala(a.exc_type.__name__, a.exc_value, a.exc_traceback, dove="thread")
        vecchio_t(a)
    threading.excepthook = gancio_t
