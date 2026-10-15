# -*- coding: utf-8 -*-
"""
Registra Lezione - "Importa un video": un video (o un audio) gia' registrato, per esempio col
telefono o dato dall'universita', diventa una lezione come quelle registrate dal programma:
  video.mp4 (o audio.*), audio_001.wav, audio_002.wav ... (parti), slide/ e meta.json.
Poi trascrizione, pacchetti e appunti li fa il motore come sempre.
"""
import datetime
import logging
import re
import shutil
import subprocess
from pathlib import Path

import elaborazione as el

log = logging.getLogger("registra_lezione")

VIDEO = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".3gp", ".wmv"}
AUDIO = {".mp3", ".m4a", ".wav", ".aac", ".ogg", ".opus", ".flac", ".wma"}
LARGHEZZA_SLIDE = 1280


def info_file(percorso):
    """Durata, se c'e' il video, peso e data del file (letti con ffmpeg)."""
    p = Path(percorso)
    r = subprocess.run([el.ffmpeg_exe(), "-hide_banner", "-i", str(p)], stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, creationflags=el.NO_WINDOW)
    testo = r.stderr.decode("utf-8", "replace")
    durata = 0.0
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", testo)
    if m:
        durata = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    ha_video = bool(re.search(r"Stream #.*Video:", testo)) and not re.search(r"Video:.*\(attached pic\)", testo) \
        and p.suffix.lower() not in AUDIO
    ha_audio = bool(re.search(r"Stream #.*Audio:", testo))
    st = p.stat()
    return {"percorso": str(p), "nome_file": p.name, "durata": durata, "ha_video": ha_video, "ha_audio": ha_audio,
            "peso": st.st_size, "data": datetime.datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
            "nome_proposto": re.sub(r"[_\-]+", " ", p.stem).strip()[:80]}


def _ffmpeg(args, avanzamento=None, durata=0):
    """Esegue ffmpeg; con avanzamento(0..1) legge il tempo dai messaggi di ffmpeg."""
    cmd = [el.ffmpeg_exe(), "-hide_banner", "-nostdin", "-y"] + args
    log.info("ffmpeg: %s", " ".join(cmd))
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, creationflags=el.NO_WINDOW)
    coda = []
    buf = b""
    while True:
        c = proc.stderr.read(512)
        if not c:
            break
        buf += c
        *righe, buf = re.split(rb"[\r\n]", buf)
        for r in righe:
            coda = (coda + [r])[-30:]
            m = re.search(rb"time=(\d+):(\d+):(\d+(?:\.\d+)?)", r)
            if m and avanzamento and durata:
                t = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
                avanzamento(min(1.0, t / durata))
    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError("ffmpeg: " + b"\n".join(coda[-5:]).decode("utf-8", "replace"))


def copia(src, cart, avanzamento):
    """Copia il file nella cartella della lezione (l'originale resta dov'e')."""
    src = Path(src)
    ext = src.suffix.lower()
    if ext in AUDIO:
        dest = cart / f"audio_originale{ext}"
    elif ext == ".mp4":
        dest = cart / "video.mp4"
    else:
        dest = cart / f"video{ext}"
    tot = max(1, src.stat().st_size)
    fatto = 0
    with open(src, "rb") as a, open(dest, "wb") as b:
        while True:
            pezzo = a.read(8 * 1024 * 1024)
            if not pezzo:
                break
            b.write(pezzo)
            fatto += len(pezzo)
            avanzamento(fatto / tot)
    shutil.copystat(src, dest)
    if ext not in AUDIO and ext != ".mp4":
        # per il lettore di Windows: provo a rimetterlo in un .mp4 senza ricodificare
        try:
            _ffmpeg(["-i", str(dest), "-map", "0", "-c", "copy", "-movflags", "+faststart", str(cart / "video.mp4")])
            dest.unlink()
            dest = cart / "video.mp4"
        except Exception:
            log.warning("video importato lasciato nel formato originale (%s)", ext)
            (cart / "video.mp4").unlink(missing_ok=True)
    return dest


def dividi_audio(sorgente, cart, parte_sec, durata, avanzamento):
    """Audio a 16 kHz mono, diviso in parti: audio_001.wav, audio_002.wav, ..."""
    _ffmpeg(["-i", str(sorgente), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
             "-f", "segment", "-segment_time", str(int(parte_sec)), "-segment_start_number", "1",
             "-reset_timestamps", "1", str(cart / "audio_%03d.wav")], avanzamento, durata)
    return el.file_parti(cart)


def cerca_slide(sorgente, cart, durata, avanzamento):
    """Guarda un fotogramma ogni 2 secondi e salva le slide nuove, come durante la registrazione."""
    from PIL import Image
    import registratore as rg
    (cart / "slide").mkdir(exist_ok=True)
    W, H = LARGHEZZA_SLIDE, LARGHEZZA_SLIDE * 9 // 16
    passo = rg.CONTROLLO_SLIDE
    cmd = [el.ffmpeg_exe(), "-hide_banner", "-nostdin", "-i", str(sorgente), "-an",
           "-vf", f"fps=1/{passo},scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, creationflags=el.NO_WINDOW)
    ril = rg.RilevatoreSlide()
    dim = W * H * 3
    slides, n, i = [], 0, 0
    while True:
        dati = proc.stdout.read(dim)
        if len(dati) < dim:
            break
        t = i * passo
        i += 1
        img = Image.frombytes("RGB", (W, H), dati)
        if ril.nuova(img, t):
            n += 1
            nome = f"slide_{n:03d}.jpg"
            img.save(cart / "slide" / nome, "JPEG", quality=82)
            slides.append({"file": nome, "t": round(t, 2)})
        if durata:
            avanzamento(min(1.0, t / durata))
    proc.wait()
    return slides
