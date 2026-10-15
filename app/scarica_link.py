# -*- coding: utf-8 -*-
"""
"Importa da link": un video (o audio) su YouTube, Google Drive, OneDrive, Dropbox, Vimeo, registrazioni di Zoom...
si scarica e poi diventa una registrazione come le altre (importa.py).

Lo scaricamento lo fa yt-dlp (programma libero, aggiornato spesso perche' i siti cambiano):
su Windows yt-dlp.exe si scarica la prima volta nella cartella "strumenti" e si aggiorna da solo ogni settimana.
Per Dropbox, OneDrive/SharePoint e i link diretti a un file c'e' anche lo scaricamento semplice.
"""
import json
import logging
import os
import re
import shutil
import ssl
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import elaborazione as el

log = logging.getLogger("registra_lezione")
YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
# YouTube vuole un "motore JavaScript" per dare tutti i formati: yt-dlp usa Deno (gratuito), scaricato solo se serve
DENO_URL = "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip"
SITI = {"youtube": "YouTube", "googledrive": "Google Drive", "dropbox": "Dropbox", "vimeo": "Vimeo", "zoom": "Zoom",
        "onedrive": "OneDrive", "sharepoint": "SharePoint", "dailymotion": "Dailymotion", "loom": "Loom",
        "facebook": "Facebook", "instagram": "Instagram", "twitch": "Twitch", "rai": "RaiPlay", "generic": ""}
ESTENSIONI = (".mp4", ".mov", ".mkv", ".webm", ".m4v", ".mp3", ".m4a", ".wav", ".aac", ".ogg", ".opus", ".flac")


class ErroreLink(Exception):
    """Errore con un codice: privato | non_trovato | rete | non_video"""


def cartella_strumenti():
    base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / ".local" / "share") / "RegistraLezione" / "strumenti"
    base.mkdir(parents=True, exist_ok=True)
    return base


def _scarica_file(url, dest, progresso=lambda f: None, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 VerbaManentIA"})
    with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as r:
        tot = int(r.headers.get("Content-Length") or 0)
        tipo = r.headers.get("Content-Type", "")
        nome = ""
        cd = r.headers.get("Content-Disposition", "")
        m = re.search(r"filename\*?=(?:UTF-8'')?\"?([^\";]+)", cd)
        if m:
            nome = urllib.parse.unquote(m.group(1))
        tmp = Path(str(dest) + ".part")
        letti = 0
        with open(tmp, "wb") as f:
            while True:
                b = r.read(1 << 16)
                if not b:
                    break
                f.write(b)
                letti += len(b)
                if tot:
                    progresso(min(0.99, letti / tot))
        os.replace(tmp, dest)
    return tipo, nome


def comando_ytdlp():
    """Il comando per yt-dlp: yt-dlp.exe (Windows, scaricato e aggiornato da solo) o il modulo Python."""
    if sys.platform == "win32":
        exe = cartella_strumenti() / "yt-dlp.exe"
        segno = cartella_strumenti() / "yt-dlp.controllato"
        if not exe.exists():
            log.info("scarico yt-dlp.exe")
            _scarica_file(YTDLP_URL, exe)
            segno.write_text(str(time.time()))
        elif not segno.exists() or time.time() - float(segno.read_text() or 0) > 7 * 86400:
            try:
                subprocess.run([str(exe), "-U"], capture_output=True, timeout=180, creationflags=el.NO_WINDOW)
            except Exception:
                log.exception("aggiornamento yt-dlp")
            segno.write_text(str(time.time()))
        return [str(exe)]
    try:
        import yt_dlp  # noqa: F401
        return [sys.executable, "-m", "yt_dlp"]
    except ImportError:
        if shutil.which("yt-dlp"):
            return ["yt-dlp"]
    raise ErroreLink("strumento")


def _deno(url):
    """Su Windows, per YouTube: deno.exe nella cartella strumenti (si scarica la prima volta). [] se non serve."""
    if sys.platform != "win32" or not re.search(r"(youtube\.com|youtu\.be)", url, re.I):
        return []
    exe = cartella_strumenti() / "deno.exe"
    if not exe.exists():
        try:
            import zipfile
            z = cartella_strumenti() / "deno.zip"
            log.info("scarico deno per YouTube")
            _scarica_file(DENO_URL, z, timeout=120)
            with zipfile.ZipFile(z) as f:
                f.extract("deno.exe", cartella_strumenti())
            z.unlink()
        except Exception:
            log.exception("deno")
            return []
    return ["--js-runtimes", f"deno:{exe}"]


def nome_sito(chiave):
    k = (chiave or "").lower()
    for a, b in SITI.items():
        if a in k:
            return b
    return chiave or ""


def _diretto(url):
    """Link che si possono scaricare direttamente (Dropbox, OneDrive/SharePoint, file .mp4/.mp3...)."""
    u = urllib.parse.urlparse(url)
    host = u.netloc.lower()
    if "dropbox.com" in host:
        q = dict(urllib.parse.parse_qsl(u.query))
        q["dl"] = "1"
        return urllib.parse.urlunparse(u._replace(query=urllib.parse.urlencode(q)))
    if "sharepoint.com" in host or "1drv.ms" in host or "onedrive.live.com" in host:
        q = dict(urllib.parse.parse_qsl(u.query))
        q.pop("e", None)
        q["download"] = "1"
        return urllib.parse.urlunparse(u._replace(query=urllib.parse.urlencode(q)))
    if u.path.lower().endswith(ESTENSIONI):
        return url
    return None


def _errore_da_testo(t):
    t = t.lower()
    if "unsupported url" in t or "no video formats" in t:
        return ErroreLink("non_video")
    if any(x in t for x in ("private", "sign in", "login", "log in", "members-only", "permission", "401", "403",
                            "confirm you", "cookies")):
        return ErroreLink("privato")
    if any(x in t for x in ("404", "not found", "unavailable", "does not exist", "removed")):
        return ErroreLink("non_trovato")
    if any(x in t for x in ("unable to download webpage", "timed out", "connection", "getaddrinfo", "network")):
        return ErroreLink("rete")
    return ErroreLink("non_video")


def info(url):
    """{"titolo", "durata", "sito", "ha_video"} senza scaricare."""
    url = (url or "").strip()
    if not re.match(r"^https?://", url, re.I):
        raise ErroreLink("non_video")
    diretto = _diretto(url)
    try:
        r = subprocess.run(comando_ytdlp() + _deno(url) + ["-J", "--no-playlist", "--no-warnings", url], capture_output=True,
                           timeout=120, creationflags=el.NO_WINDOW)
        if r.returncode == 0:
            d = json.loads(r.stdout.decode("utf-8", "replace"))
            vcodec = d.get("vcodec")
            return {"titolo": (d.get("title") or "").strip()[:90], "durata": float(d.get("duration") or 0),
                    "sito": nome_sito(d.get("extractor_key") or d.get("extractor") or ""), "ha_video": vcodec not in ("none", None) or bool(d.get("width"))}
        err = r.stderr.decode("utf-8", "replace")
        log.warning("yt-dlp info: %s", err[-600:])
        if not diretto:
            raise _errore_da_testo(err)
    except ErroreLink as e:
        if str(e) == "strumento" and diretto:
            pass
        elif not diretto:
            raise
    nome = urllib.parse.unquote(Path(urllib.parse.urlparse(url).path).stem) or "video"
    return {"titolo": re.sub(r"[_\-]+", " ", nome)[:90], "durata": 0.0, "sito": "", "ha_video": True}


def scarica(url, cartella, progresso=lambda f: None, solo_audio=False):
    """Scarica il video (o l'audio) in cartella. Ritorna il percorso del file."""
    cartella = Path(cartella)
    cartella.mkdir(parents=True, exist_ok=True)
    diretto = _diretto(url)
    ultimo_errore = None
    try:
        fmt = "ba/b" if solo_audio else "bv*[height<=1080]+ba/b[height<=1080]/b"
        cmd = comando_ytdlp() + _deno(url) + ["--no-playlist", "--newline", "--no-part", "-f", fmt, "--ffmpeg-location", el.ffmpeg_exe(),
                                 "-o", str(cartella / "scaricato.%(ext)s")]
        if not solo_audio:
            cmd += ["--merge-output-format", "mp4"]
        log.info("yt-dlp: %s", url)
        proc = subprocess.Popen(cmd + [url], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, creationflags=el.NO_WINDOW)
        coda = []
        for riga in iter(proc.stdout.readline, b""):
            s = riga.decode("utf-8", "replace").strip()
            coda = (coda + [s])[-40:]
            m = re.search(r"\[download\]\s+(\d+(?:\.\d+)?)%", s)
            if m:
                progresso(min(0.99, float(m.group(1)) / 100))
        proc.wait()
        file = sorted((f for f in cartella.glob("scaricato.*") if f.suffix.lower() in ESTENSIONI),
                      key=lambda f: f.stat().st_size, reverse=True)
        if proc.returncode == 0 and file:
            progresso(1.0)
            return file[0]
        ultimo_errore = _errore_da_testo("\n".join(coda))
        log.warning("yt-dlp: %s", "\n".join(coda[-10:]))
    except ErroreLink as e:
        ultimo_errore = e
    if diretto:
        dest = cartella / "scaricato.bin"
        tipo, nome = _scarica_file(diretto, dest, progresso)
        if "text/html" in tipo:
            dest.unlink()
            raise ErroreLink("privato")
        est = Path(nome).suffix.lower() if nome else ""
        if est not in ESTENSIONI:
            est = {"video/mp4": ".mp4", "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "video/webm": ".webm",
                   "audio/wav": ".wav", "video/quicktime": ".mov"}.get(tipo.split(";")[0].strip(), ".mp4")
        finale = dest.with_suffix(est)
        os.replace(dest, finale)
        progresso(1.0)
        return finale
    raise ultimo_errore or ErroreLink("non_video")
