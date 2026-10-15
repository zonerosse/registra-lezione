"""Ripasso con le flashcard: le domande sono quelle gia' scritte negli appunti (Cornell o Formato Esame),
quindi non si chiama Claude e non costa niente.

Per ogni lezione il file ripasso.json ricorda come e' andata ogni carta:
    {"<id>": {"ok": 2, "no": 1, "ultimo": 1, "quando": "2026-10-15T12:30:00"}}
"ultimo" = 1 se l'ultima volta la sapevi, 0 se era "da rivedere".
"""
import base64
import datetime
import hashlib
import io
import logging
import random
from pathlib import Path

import appunti as ap
import elaborazione as el

log = logging.getLogger("registra_lezione")


def _id(formato, k, domanda):
    return hashlib.md5(f"{formato}|{k}|{domanda}".encode("utf-8")).hexdigest()[:12]


def _lista(x):
    if isinstance(x, list):
        return [str(v) for v in x if v]
    return [str(x)] if x else []


def carte_lezione(cartella):
    """Le carte di una lezione, senza immagini. Se la lezione ha il Formato Esame uso quello (ha le
    stelle e lo schema della risposta), altrimenti il Cornell: cosi' la stessa domanda non compare due volte."""
    cart = Path(cartella)
    info = el.leggi_json(cart / "info.json", {}) or {}
    nome = info.get("nome", cart.name)
    for formato in ("esame", "cornell"):
        carte = []
        for f in sorted(cart.glob("appunti_esame_*.json" if formato == "esame" else "appunti_[0-9]*.json")):
            try:
                k = int(f.stem.rsplit("_", 1)[1])
            except ValueError:
                continue
            d = el.leggi_json(f)
            if not d:
                continue
            d = ap.normalizza(d)
            if (formato == "esame") != bool(ap.e_esame(d)):
                continue
            mappa = {m.get("n"): m for m in (el.leggi_json(cart / f"pacchetto_{k:03d}.json", []) or [])}
            voci = d.get("domande_probabili") if formato == "esame" else d.get("blocchi")
            for v in voci or []:
                dom = (v.get("domanda") or "").strip()
                if not dom:
                    continue
                try:
                    n = int(v.get("slide") or 0)
                except (TypeError, ValueError):
                    n = 0
                m = mappa.get(n) or {}
                try:
                    stelle = max(1, min(3, int(v.get("stelle") or 0))) if formato == "esame" else 0
                except (TypeError, ValueError):
                    stelle = 1
                carte.append({
                    "id": _id(formato, k, dom), "cartella": str(cart), "lezione": nome, "formato": formato,
                    "domanda": dom, "stelle": stelle,
                    "schema": _lista(v.get("schema") if formato == "esame" else v.get("appunti")),
                    "parole": _lista(v.get("parole_chiave")),
                    "errore": (v.get("errore") or "") if formato == "esame" else "",
                    "dove": v.get("dove") or "",
                    "slide_n": n if m.get("file") else 0, "slide_file": m.get("file") or "",
                    "minuto": int((m.get("inizio") or 0) // 60) if m.get("file") else None,
                })
        if carte:
            return carte
    return []


def _stat(cartella):
    return el.leggi_json(Path(cartella) / "ripasso.json", {}) or {}


def conta(cartella):
    """{"n": domande, "no": da rivedere, "tre": quante ★★★} di una lezione."""
    carte = carte_lezione(cartella)
    st = _stat(cartella)
    return {"n": len(carte), "no": sum(1 for c in carte if (st.get(c["id"]) or {}).get("ultimo") == 0),
            "tre": sum(1 for c in carte if c["stelle"] >= 3)}


def _miniatura(cartella, file):
    if not file:
        return ""
    try:
        from PIL import Image
        p = el.immagine_slide(cartella, file)
        with Image.open(p) as im:
            im.thumbnail((360, 220))
            b = io.BytesIO()
            im.convert("RGB").save(b, "JPEG", quality=72)
        return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
    except Exception:
        log.exception("miniatura ripasso %s", file)
        return ""


def prepara(cartelle, modo="prima"):
    """Le carte da ripassare, in ordine.
    modo: "prima"  = prima quelle da rivedere (e quelle mai viste), poi le altre
          "tutte"  = tutte in ordine sparso
          "stelle" = solo le ★★★ (Formato Esame)
          "no"     = solo quelle da rivedere"""
    carte = []
    for c in cartelle:
        st = _stat(c)
        for x in carte_lezione(c):
            s = st.get(x["id"]) or {}
            x["ultimo"] = s.get("ultimo")
            carte.append(x)
    random.shuffle(carte)
    if modo == "stelle":
        carte = [c for c in carte if c["stelle"] >= 3]
    elif modo == "no":
        carte = [c for c in carte if c["ultimo"] == 0]
    elif modo == "prima":
        # da rivedere -> mai viste -> sapute
        carte.sort(key=lambda c: {0: 0, None: 1, 1: 2}.get(c["ultimo"], 1))
    for c in carte:
        c["img"] = _miniatura(c["cartella"], c.pop("slide_file"))
    return carte


def voto(cartella, cid, sapevo):
    p = Path(cartella) / "ripasso.json"
    st = _stat(cartella)
    s = st.get(cid) or {"ok": 0, "no": 0}
    s["ok" if sapevo else "no"] = s.get("ok" if sapevo else "no", 0) + 1
    s["ultimo"] = 1 if sapevo else 0
    s["quando"] = datetime.datetime.now().isoformat(timespec="seconds")
    st[cid] = s
    el.scrivi_json(p, st)
    return True
