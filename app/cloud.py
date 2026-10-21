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
CARTELLA = __import__("edizione").NOME


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


def _voci(cart, info, cosa):
    """Cosa copiare di una lezione: lista di (file sul PC, nome nel cloud). L'audio dal video si estrae in un file temporaneo."""
    import elaborazione as el
    out = []
    if cosa.get("appunti", True):
        pdf = set()
        for k, v in info.items():
            if k.startswith("appunti_completi") and isinstance(v, str):
                pdf.add(v)
            elif k.startswith("appunti") and isinstance(v, dict):
                pdf.update(x for x in v.values() if isinstance(x, str))
        out += [(Path(f), Path(f).name) for f in sorted(pdf) if Path(f).exists()]
    if cosa.get("tras", True):
        out += [(f, f.name) for f in sorted(cart.glob("Per Claude - *.pdf"))]
    if cosa.get("audio", True):
        a = cart / "audio.m4a"
        orig = sorted(cart.glob("audio_originale.*"))
        if a.exists():
            out.append((a, "audio.m4a"))
        elif orig:
            out.append((orig[0], "audio" + orig[0].suffix))
        elif (cart / "video.mp4").exists():
            out.append((None, "audio.m4a"))          # da estrarre dal video, solo se serve
    return out


def _audio_dal_video(cart, dest):
    import elaborazione as el
    r = subprocess.run([el.ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(cart / "video.mp4"), "-vn",
                        "-c:a", "copy", "-f", "mp4", str(dest)], creationflags=el.NO_WINDOW)
    return r.returncode == 0 and Path(dest).exists()


# --------------------------------------------------------------------- Google Drive senza il programma di Google
# Con l'account Google collegato (accesso una volta col browser, permesso «drive.file»: il programma vede solo i file
# che crea lui) le copie vanno direttamente nel Drive, nella cartella «Verba Manent IA – Lezioni», una per lezione.

def cartella_api():
    return f"{CARTELLA} – Lezioni"


def usa_api(cfg):
    """Google Drive scelto, il programma di Google non c'e' sul PC, l'account e' collegato."""
    c = cfg.get("cloud") or {}
    return c.get("dove") == "gdrive" and bool((c.get("google") or {}).get("refresh")) and google_drive() is None


def _drive(cfg):
    import nuvola as nv
    return nv.Drive((cfg["cloud"]["google"])["refresh"])


def _q(nome):
    return nome.replace("\\", "\\\\").replace("'", "\\'")


def _cartella_drive(d, nome, padre=None):
    import urllib.parse
    q = f"name='{_q(nome)}' and mimeType='application/vnd.google-apps.folder' and trashed=false" + (f" and '{padre}' in parents" if padre else "")
    r = d._req("GET", f"{d.API}/files?q={urllib.parse.quote(q)}&fields=files(id)&spaces=drive")
    if r.get("files"):
        return r["files"][0]["id"]
    meta = {"name": nome, "mimeType": "application/vnd.google-apps.folder"}
    if padre:
        meta["parents"] = [padre]
    return d._req("POST", f"{d.API}/files?fields=id", json_=meta)["id"]


def _copia_api(cart, info, cfg):
    import tempfile
    d = _drive(cfg)
    voci = _voci(cart, info, (cfg.get("cloud") or {}).get("cosa") or {})
    radice_id = _cartella_drive(d, cartella_api())
    lez_id = _cartella_drive(d, cart.name, radice_id)
    gia = d.elenco(lez_id)
    n = 0
    for src, nome in voci:
        if src is None:
            if nome in gia:
                continue
            with tempfile.TemporaryDirectory() as t:
                tmp = Path(t) / "audio.m4a"
                if _audio_dal_video(cart, tmp):
                    d.carica(lez_id, nome, str(tmp))
                    n += 1
            continue
        x = gia.get(nome)
        if x and x["s"] == src.stat().st_size:
            continue
        d.carica(lez_id, nome, str(src), x["id"] if x else None)
        n += 1
    if d.refresh != cfg["cloud"]["google"].get("refresh"):
        cfg["cloud"]["google"]["refresh"] = d.refresh       # Google a volte da' un accesso nuovo: si tiene quello
    return n, f"Google Drive › {cartella_api()} › {cart.name}"


def copia(cart, cfg):
    """Copia una lezione nel cloud. Ritorna il numero di file copiati (0 = gia' tutto li'). Eccezione se non riesce."""
    import elaborazione as el
    cart = Path(cart)
    info = el.leggi_json(cart / "info.json", {}) or {}
    if usa_api(cfg):
        n, dove = _copia_api(cart, info, cfg)
    else:
        rad = radice(cfg)
        if rad is None:
            raise RuntimeError("cloud")
        dest = rad / cart.name
        n = 0
        for src, nome in _voci(cart, info, (cfg.get("cloud") or {}).get("cosa") or {}):
            if src is not None:
                n += _copia_file(src, dest / nome)
            elif not (dest / nome).exists():
                dest.mkdir(parents=True, exist_ok=True)
                tmp = dest / (nome + ".tmp")
                if _audio_dal_video(cart, tmp):
                    os.replace(tmp, dest / nome)
                    n += 1
                else:
                    tmp.unlink(missing_ok=True)
        dove = str(dest)
    el.aggiorna_info(cart, cloud={"ok": True, "quando": datetime.datetime.now().isoformat(timespec="minutes"), "dove": dove})
    return n
