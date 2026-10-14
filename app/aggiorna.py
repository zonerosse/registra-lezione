# -*- coding: utf-8 -*-
"""
Registra Lezione - tasto Aggiorna.

Il programma e' diviso in due:
  - le librerie (dentro l'exe, 300-400 MB): cambiano quasi mai;
  - il codice (questa cartella "app", circa 100 KB): cambia a ogni versione.
Aggiorna controlla l'ultima versione pubblicata su GitHub e scarica solo il codice.
Se la versione nuova richiede librerie diverse, lo dice e apre la pagina per
scaricare il pacchetto completo.
"""
import json
import logging
import shutil
import ssl
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

log = logging.getLogger("registra_lezione")

REPO = "zonerosse/registra-lezione"
QUI = Path(__file__).resolve().parent          # cartella app
RADICE = QUI.parent                            # cartella del programma (dove c'e' l'exe)
NUOVA = RADICE / "app_nuova"


def _leggi(p):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8"))
    except Exception:
        return {}


def versione_locale():
    return _leggi(QUI / "versione.json")


def librerie_installate():
    """Versione delle librerie dentro l'exe (scritta nel modulo dipendenze)."""
    try:
        import dipendenze
        return int(dipendenze.LIBRERIE)
    except Exception:
        return int(versione_locale().get("librerie", 1))


class NonTrovato(Exception):
    """GitHub risponde 404: repository privato o senza versioni pubblicate."""


def _num(v):
    try:
        return tuple(int(x) for x in str(v).lstrip("v").split("."))
    except ValueError:
        return (0,)


def _apri(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "RegistraLezione",
                                               "Accept": "application/vnd.github+json"})
    return urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context())


def cerca():
    """Ritorna None se non ci sono novita', altrimenti un dizionario con:
    versione, novita, completo (True = servono le librerie nuove), url_zip, peso, pagina."""
    import urllib.error
    try:
        with _apri(f"https://api.github.com/repos/{REPO}/releases/latest") as r:
            rel = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise NonTrovato() from e
        raise
    asset = {a["name"]: a for a in rel.get("assets", [])}
    if "versione.json" not in asset or "aggiornamento.zip" not in asset:
        return None
    with _apri(asset["versione.json"]["browser_download_url"]) as r:
        remota = json.loads(r.read().decode("utf-8"))
    if _num(remota.get("versione")) <= _num(versione_locale().get("versione", "0")):
        return None
    return {
        "versione": remota.get("versione"),
        "novita": remota.get("novita", ""),
        "completo": int(remota.get("librerie", 1)) != librerie_installate(),
        "url_zip": asset["aggiornamento.zip"]["browser_download_url"],
        "peso": asset["aggiornamento.zip"].get("size", 0),
        "pagina": rel.get("html_url", f"https://github.com/{REPO}/releases/latest"),
    }


def installa(agg, progresso=lambda f: None):
    """Scarica il codice nuovo in app_nuova. Al prossimo avvio prende il posto di app."""
    with tempfile.TemporaryDirectory() as tmp:
        zp = Path(tmp) / "agg.zip"
        with _apri(agg["url_zip"], timeout=60) as r, open(zp, "wb") as f:
            tot = int(r.headers.get("Content-Length") or agg.get("peso") or 0)
            letti = 0
            while True:
                b = r.read(65536)
                if not b:
                    break
                f.write(b)
                letti += len(b)
                if tot:
                    progresso(min(0.95, letti / tot))
        shutil.rmtree(NUOVA, ignore_errors=True)
        NUOVA.mkdir()
        with zipfile.ZipFile(zp) as z:
            for n in z.namelist():
                dest = (NUOVA / n).resolve()
                if not str(dest).startswith(str(NUOVA.resolve())):
                    raise RuntimeError("file non valido nell'aggiornamento")
            z.extractall(NUOVA)
    if not (NUOVA / "registra_lezione.py").exists():
        shutil.rmtree(NUOVA, ignore_errors=True)
        raise RuntimeError("l'aggiornamento scaricato e' incompleto")
    progresso(1.0)


def riavvia():
    """Riapre il programma (il lanciatore mette al suo posto la versione nuova)."""
    import subprocess
    if getattr(sys, "frozen", False):
        subprocess.Popen([sys.executable], cwd=str(RADICE))
    else:
        subprocess.Popen([sys.executable, str(RADICE / "avvio.py")], cwd=str(RADICE))
