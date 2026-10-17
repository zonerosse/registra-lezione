# -*- coding: utf-8 -*-
"""«Copia nel cloud» (sul PC): le registrazioni restano sul PC; appena una lezione e' pronta ne copio
appunti, trascrizione e audio compresso nella cartella di Google Drive, OneDrive o un'altra scelta.
Il programma del cloud (Google Drive per desktop, OneDrive) poi la carica da solo."""
import datetime
import logging
import os
import shutil
import subprocess
from pathlib import Path

log = logging.getLogger("registra_lezione")
CARTELLA = "Verba Manent IA"


def google_drive():
    try:
        import condividi as cd
        return cd.cartella_google_drive()
    except Exception:
        return None


def onedrive():
    for v in ("OneDrive", "OneDriveConsumer", "OneDriveCommercial"):
        p = os.environ.get(v)
        if p and Path(p).is_dir():
            return Path(p)
    p = Path.home() / "OneDrive"
    return p if p.is_dir() else None


def radice(cfg):
    """La cartella «Verba Manent IA» nel cloud scelto, o None (spento o cloud non trovato)."""
    c = cfg.get("cloud") or {}
    dove = c.get("dove") or "no"
    base = google_drive() if dove == "gdrive" else onedrive() if dove == "onedrive" else \
        (Path(c["cartella"]) if dove == "altro" and c.get("cartella") else None)
    if base is None or not Path(base).is_dir():
        return None
    return Path(base) / CARTELLA


def _copia_file(src, dest):
    src, dest = Path(src), Path(dest)
    if not src.exists():
        return 0
    if dest.exists() and dest.stat().st_size == src.stat().st_size:
        return 0
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".tmp")
    shutil.copyfile(src, tmp)
    os.replace(tmp, dest)
    return 1


def copia(cart, cfg):
    """Copia una lezione nel cloud. Ritorna il numero di file copiati (0 = gia' tutto li'). Eccezione se non riesce."""
    import elaborazione as el
    cart = Path(cart)
    rad = radice(cfg)
    if rad is None:
        raise RuntimeError("cloud")
    info = el.leggi_json(cart / "info.json", {}) or {}
    cosa = (cfg.get("cloud") or {}).get("cosa") or {}
    dest = rad / cart.name
    n = 0
    if cosa.get("appunti", True):
        pdf = set()
        for k, v in info.items():
            if k.startswith("appunti_completi") and isinstance(v, str):
                pdf.add(v)
            elif k.startswith("appunti") and isinstance(v, dict):
                pdf.update(x for x in v.values() if isinstance(x, str))
        for f in pdf:
            n += _copia_file(f, dest / Path(f).name)
    if cosa.get("tras", True):
        for f in cart.glob("Per Claude - *.pdf"):
            n += _copia_file(f, dest / f.name)
    if cosa.get("audio", True):
        a = cart / "audio.m4a"
        orig = sorted(cart.glob("audio_originale.*"))
        if a.exists():
            n += _copia_file(a, dest / "audio.m4a")
        elif orig:
            n += _copia_file(orig[0], dest / ("audio" + orig[0].suffix))
        elif (cart / "video.mp4").exists() and not (dest / "audio.m4a").exists():
            dest.mkdir(parents=True, exist_ok=True)
            tmp = dest / "audio.m4a.tmp"
            r = subprocess.run([el.ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(cart / "video.mp4"), "-vn",
                                "-c:a", "copy", "-f", "mp4", str(tmp)], creationflags=el.NO_WINDOW)
            if r.returncode == 0 and tmp.exists():
                os.replace(tmp, dest / "audio.m4a")
                n += 1
            else:
                tmp.unlink(missing_ok=True)
    el.aggiorna_info(cart, cloud={"ok": True, "quando": datetime.datetime.now().isoformat(timespec="minutes"),
                                  "dove": str(dest)})
    return n
