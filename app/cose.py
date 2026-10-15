# -*- coding: utf-8 -*-
"""
«Cose da fare»: tutte le cose da fare uscite dai verbali, in un posto solo.
Le cose da fare stanno nei verbali (appunti_verbale_00k.json); qui si tiene solo cosa e' stato fatto
(cose_da_fare.json nella cartella delle registrazioni). Quando comincia una riunione con lo stesso nome di una
precedente, le cose rimaste aperte vanno a Claude: se nella riunione si dice che sono fatte, si spuntano da sole.
"""
import datetime
import hashlib
import re
from pathlib import Path

import appunti as ap
import elaborazione as el


def _file(base):
    return Path(base) / "cose_da_fare.json"


def id_cosa(cartella, cosa):
    k = re.sub(r"\W+", " ", str(cosa or "").lower()).strip()
    return hashlib.sha1(f"{Path(cartella).name}|{k}".encode("utf-8")).hexdigest()[:12]


def _nome_serie(nome):
    """«Riunione commerciale – 15/10» e «Riunione commerciale» sono la stessa serie."""
    n = re.sub(r"[\s–-]*\d{1,2}[/.]\d{1,2}([/.]\d{2,4})?\s*$", "", str(nome or "").lower())
    return re.sub(r"\W+", " ", n).strip()


def _cartelle(base):
    try:
        return sorted((p for p in Path(base).iterdir() if p.is_dir() and (p / "info.json").exists()),
                      key=lambda p: p.name, reverse=True)
    except OSError:
        return []


def _sec(dove):
    m = re.search(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", str(dove or ""))
    if not m:
        return None
    a, b, c = m.groups()
    return int(a) * 3600 + int(b) * 60 + int(c) if c else int(a) * 60 + int(b)


def azioni_di(cartella):
    """Le cose da fare del verbale di una registrazione (tutte le parti, senza doppioni)."""
    import condividi as cd
    cartella = Path(cartella)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    fatti = info.get(ap.chiave_info("verbale")) or {}
    out, visti = [], set()
    try:
        quando = datetime.datetime.fromisoformat(info.get("inizio", ""))
    except ValueError:
        quando = datetime.datetime.now()
    for k in sorted(fatti, key=int):
        d = el.leggi_json(ap.file_json(cartella, k, "verbale"), {}) or {}
        for a in d.get("azioni") or []:
            cosa = re.sub(r"\s+", " ", str(a.get("cosa") or "")).strip()
            i = id_cosa(cartella, cosa)
            if not cosa or i in visti:
                continue
            visti.add(i)
            data = cd.data_da_testo(a.get("entro"), quando)
            out.append({"id": i, "cosa": cosa, "chi": str(a.get("chi") or "").strip(), "entro": str(a.get("entro") or "").strip(),
                        "data": data.isoformat() if data else "", "sec": _sec(a.get("dove"))})
    return out, info, quando


def tutte(base):
    """Tutte le cose da fare di tutti i verbali, con fatto/non fatto."""
    stato = el.leggi_json(_file(base), {}) or {}
    oggi = datetime.date.today().isoformat()
    out, viste = [], set()
    for cart in _cartelle(base):          # dalla piu' recente: la stessa cosa ripetuta in una riunione dopo vale una volta
        az, info, quando = azioni_di(cart)
        serie = _nome_serie(info.get("nome"))
        for a in az:
            k = (serie, re.sub(r"\W+", " ", a["cosa"].lower()).strip())
            if k in viste:
                continue
            viste.add(k)
            s = stato.get(a["id"]) or {}
            a.update({"fatto": bool(s.get("fatto")), "quando_fatto": s.get("quando", ""), "come": s.get("come", ""),
                      "cartella": str(cart), "nome": info.get("nome", cart.name), "giorno": quando.strftime("%d/%m"),
                      "scaduta": bool(a["data"] and a["data"] < oggi and not s.get("fatto"))})
            out.append(a)
    # prima le aperte (le scadute e quelle con la data piu' vicina in cima), poi le fatte
    out.sort(key=lambda a: (a["fatto"], a["data"] or "9999", a["nome"]))
    return out


def segna(base, id_, fatto=True, come="mano"):
    stato = el.leggi_json(_file(base), {}) or {}
    if fatto:
        stato[id_] = {"fatto": True, "quando": datetime.datetime.now().isoformat(timespec="seconds"), "come": come}
    else:
        stato.pop(id_, None)
    el.scrivi_json(_file(base), stato)


def aperte_per_nome(base, nome, escludi=None):
    """Le cose rimaste aperte delle riunioni precedenti con lo stesso nome (la serie)."""
    serie = _nome_serie(nome)
    if not serie:
        return []
    stato = el.leggi_json(_file(base), {}) or {}
    out = []
    for cart in _cartelle(base):
        if escludi and Path(cart) == Path(escludi):
            continue
        info = el.leggi_json(cart / "info.json", {}) or {}
        if _nome_serie(info.get("nome")) != serie:
            continue
        az, _, quando = azioni_di(cart)
        for a in az:
            if not (stato.get(a["id"]) or {}).get("fatto"):
                out.append({"id": a["id"], "cosa": a["cosa"], "chi": a["chi"], "entro": a["entro"], "data": a["data"],
                            "da": quando.strftime("%d/%m")})
    return out[:30]


def applica_fatte(base, cartella, dati):
    """Il verbale nuovo dice che alcune cose aperte sono state fatte: le spunto e ci metto il testo."""
    info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
    aperte = {a["id"]: a for a in info.get("aperte_prima") or []}
    buone = []
    for f in dati.get("fatte") or []:
        a = aperte.get(str(f.get("id") or ""))
        if not a:
            continue
        segna(base, a["id"], True, come=Path(cartella).name)
        buone.append({"id": a["id"], "cosa": a["cosa"], "chi": a.get("chi", ""), "dove": f.get("dove", "")})
    dati["fatte"] = buone
    return dati
