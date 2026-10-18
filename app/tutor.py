# -*- coding: utf-8 -*-
"""
«Il tuo tutor»: sa quando c'e' l'esame della materia, cosa e' gia' stato studiato e dove lo studente sbaglia.

Tutto calcolato qui, gratis (Claude solo per le risposte della chat, come «Chiedi»):
  - giorni all'esame, «pronto all'esame» (ripasso_giorno.pronto), giorni di fila (ripasso del giorno);
  - le cose di oggi: ripasso del giorno, il punto della lezione da riascoltare dove si e' sbagliato di piu',
    l'argomento del piano di studio, l'interrogazione a voce se non si fa da giorni;
  - dove sbaglia: domande sbagliate nei test (con lezione e minuto), punti persi all'interrogazione,
    carte «da rivedere», lezioni mai ripassate.
"""
import datetime
import logging
import re
from pathlib import Path

import esame as es
import ripasso as rp
import ripasso_giorno as rgi
from testi import tr

log = logging.getLogger("registra_lezione")


def _d(x):
    try:
        return datetime.datetime.fromisoformat(str(x)[:19])
    except (TypeError, ValueError):
        return None


def _corto(x, n=60):
    x = re.sub(r"\s+", " ", str(x or "")).strip().rstrip("?")
    return x if len(x) <= n else x[:n - 1].rstrip() + "…"


def stato(base, materia, cartelle, cfg, L="it"):
    oggi = datetime.date.today()
    d = es.leggi(base, materia)
    esame = None
    try:
        esame = datetime.date.fromisoformat(str(d.get("data_esame") or "")[:10])
    except ValueError:
        pass
    giorni = (esame - oggi).days if esame and esame >= oggi else None
    lez = es._lezioni_test(cartelle)
    per_cart = {l["cartella"]: l for l in lez}

    # carte della materia (per «pronto», le sbagliate e le lezioni mai ripassate)
    carte = []
    mai = []
    for l in lez:
        st = rp._stat(l["cartella"])
        cs = rp.carte_lezione(l["cartella"])
        for c in cs:
            s = st.get(c["id"])
            box, _ = rp.stato_carta(s)
            c.update(box=box, ultimo=(s or {}).get("ultimo"), argomento=rgi._argomento(c), n=l["n"])
            carte.append(c)
        if cs and not any(c["id"] in st for c in cs):
            mai.append(l)
    pronto = rgi.pronto(carte) if carte else 0

    # dove sbaglia: argomento -> {"ok", "tot", "fonte", "dove"}
    deboli = {}

    def segna(arg, giusto, fonte, dove=None):
        k = _corto(arg, 50)
        if not k:
            return
        x = deboli.setdefault(k, {"argomento": k, "ok": 0, "tot": 0, "fonti": [], "dove": None})
        x["tot"] += 1
        x["ok"] += 1 if giusto else 0
        if fonte not in x["fonti"]:
            x["fonti"].append(fonte)
        if dove and not giusto and not x["dove"]:
            x["dove"] = dove
    limite = datetime.datetime.now() - datetime.timedelta(days=21)
    for t in (d.get("test") or [])[-6:]:
        if t.get("risposte") is None or (_d(t.get("quando")) or limite) < limite:
            continue
        lz = {x["n"]: x for x in t.get("lezioni") or []}
        quando = _d(t.get("quando"))
        fonte = tr("tu_f_test", L, g=_quando(quando, L))
        for q, r in zip(t.get("domande") or [], t.get("risposte") or []):
            ln = lz.get(q.get("lezione"))
            dove = None
            if ln and q.get("sec") is not None:
                dove = {"cartella": ln["cartella"], "lezione": f"L{ln['n']}", "sec": q["sec"]}
            segna(q.get("carta") or q.get("domanda"), r == q.get("giusta"), fonte, dove)
    for o in (d.get("orali") or [])[-4:]:
        quando = _d(o.get("quando"))
        if not o.get("correzione") or (quando or limite) < limite:
            continue
        fonte = tr("tu_f_orale", L, g=_quando(quando, L))
        for x in o["correzione"]:
            try:
                i = int(x.get("n") or 0) - 1
                q = o["domande"][i]
                segna(q["domanda"], float(x.get("punti") or 0) >= 0.7 * float(x.get("su") or q.get("punti") or 10), fonte)
            except (IndexError, ValueError, TypeError, KeyError):
                continue
    for c in carte:
        if c["ultimo"] is not None:
            segna(c["argomento"], c["ultimo"] == 1, tr("tu_f_rip", L))
    lista = sorted(deboli.values(), key=lambda x: (x["ok"] / max(1, x["tot"]), -x["tot"]))
    male = [x for x in lista if x["ok"] < x["tot"]][:4]
    bene = [x for x in reversed(lista) if x["tot"] >= 2 and x["ok"] == x["tot"]][:1]

    # le cose di oggi
    fatti = (cfg.get("tutor_fatti") or {}).get(oggi.isoformat(), [])
    cose = []
    try:
        rg = rgi.oggi(base, int(cfg.get("rg_max") or 20), cfg.get("rg_fatti") or [], False, False)
        n_rg = sum(1 for c in rg["carte"] if c.get("materia", "").lower() == materia.lower())
        if rg["carte"] and not rg["fatto_oggi"]:
            argom = [c["argomento"] for c in rg["carte"] if c.get("materia", "").lower() == materia.lower() and c.get("argomento")]
            cose.append({"k": "rg", "ico": "🃏", "t": tr("tu_c_rg", L),
                         "s": tr("tu_c_rg_s", L, n=len(rg["carte"]), m=n_rg) + (f" · {', '.join(dict.fromkeys(argom[:3]))}" if argom else ""),
                         "min": max(3, rg["minuti"])})
    except Exception:
        log.exception("tutor: ripasso del giorno")
    debole = next((x for x in male if x["dove"]), None)
    if debole:
        dv = debole["dove"]
        cose.append({"k": "riascolta", "ico": "🔊", "t": tr("tu_c_ria", L, a=debole["argomento"], l=dv["lezione"], m=f"{int(dv['sec']) // 60}:{int(dv['sec']) % 60:02d}"),
                     "s": tr("tu_c_ria_s", L, e=debole["tot"] - debole["ok"], f=debole["fonti"][0]), "min": 10,
                     "cartella": dv["cartella"], "sec": dv["sec"]})
    try:
        piano = es.piano(d, L=L) if d.get("classifica") else []
    except Exception:
        log.exception("tutor: piano")
        piano = []
    p_oggi = next((g for g in piano if g["giorno"] == oggi.isoformat()), None)
    if p_oggi and p_oggi.get("tipo") != "riposo":
        cose.append({"k": "piano", "ico": "📅", "t": tr("tu_c_piano", L, c=", ".join(p_oggi["cose"][:2])),
                     "s": tr("tu_c_piano_s", L), "min": 20 if p_oggi.get("tipo") == "studio" else 15})
    elif mai and (giorni is None or giorni > 0):
        cose.append({"k": "lezione", "ico": "📄", "t": tr("tu_c_mai", L, n=mai[0]["nome"]), "s": tr("tu_c_mai_s", L),
                     "min": 20, "cartella": mai[0]["cartella"]})
    ult_orale = max((_d(o.get("quando")) for o in d.get("orali") or [] if o.get("voto") is not None), default=None)
    gg_orale = (datetime.datetime.now() - ult_orale).days if ult_orale else None
    if giorni is not None and giorni <= 30 and (gg_orale is None or gg_orale >= 4):
        cose.append({"k": "orale", "ico": "🎤", "t": tr("tu_c_orale", L),
                     "s": tr("tu_c_orale_s", L, g=gg_orale) if gg_orale is not None else tr("tu_c_orale_s0", L), "min": 8})
    if giorni is None:
        cose.append({"k": "data", "ico": "📅", "t": tr("tu_c_data", L), "s": tr("tu_c_data_s", L), "min": 1})
    for c in cose:
        c["fatto"] = c["k"] in fatti

    voti = lambda lista: [x.get("voto") for x in lista or [] if x.get("voto") is not None][-4:]
    return {"giorni": giorni, "data_esame": esame.isoformat() if esame else "", "pronto": pronto,
            "serie": rgi._serie(cfg.get("rg_fatti") or []), "cose": cose,
            "minuti": sum(c["min"] for c in cose if not c["fatto"]),
            "deboli": [{"argomento": x["argomento"], "ok": x["ok"], "tot": x["tot"], "fonte": ", ".join(x["fonti"][:2])} for x in male] +
                      [{"argomento": l["nome"], "mai": True} for l in mai[:2]] +
                      [{"argomento": x["argomento"], "ok": x["ok"], "tot": x["tot"], "fonte": tr("tu_bene", L), "bene": True} for x in bene],
            "voti_test": voti(d.get("test")), "voti_orali": voti(d.get("orali")),
            "obiettivo": 85 if giorni is not None else None,
            "lezioni": len(lez), "carte": len(carte),
            "cartelle": [l["cartella"] for l in lez], "nomi": [l["nome"] for l in lez]}


def _quando(q, L):
    if not q:
        return ""
    g = (datetime.date.today() - q.date()).days
    if g == 0:
        return tr("tu_oggi", L)
    if g == 1:
        return tr("tu_ieri", L)
    return tr("tu_giorni_fa", L, n=g)


def contesto(st, materia, L="it"):
    """Quello che il tutor sa dello studente, da aggiungere alle istruzioni della chat."""
    righe = [f"MATERIA: {materia}"]
    if st["giorni"] is not None:
        righe.append(f"ESAME: il {st['data_esame']}, fra {st['giorni']} giorni.")
    else:
        righe.append("ESAME: data non ancora inserita (consiglia di metterla in Studia > Piano di studio).")
    righe.append(f"PRONTO ALL'ESAME: {st['pronto']}% (obiettivo 85%). Giorni di fila di ripasso: {st['serie']}.")
    if st["cose"]:
        righe.append("COSE DI OGGI (nel programma): " + "; ".join(f"{c['t']} ({c['min']} min{', FATTO' if c['fatto'] else ''})" for c in st["cose"]))
    deb = [x for x in st["deboli"] if not x.get("bene")]
    if deb:
        righe.append("DOVE SBAGLIA: " + "; ".join(x["argomento"] + (" (mai ripassata)" if x.get("mai") else f" ({x['ok']}/{x['tot']}, {x['fonte']})") for x in deb))
    if st["voti_test"] or st["voti_orali"]:
        righe.append(f"VOTI: test {st['voti_test']}, interrogazioni {st['voti_orali']}.")
    return ("\n\nSEI ANCHE IL SUO TUTOR PER L'ESAME. Ecco cosa sai di lui (usalo quando serve: per dire cosa studiare, "
            "quanto manca, se ce la fa, dove ha sbagliato; sii concreto e incoraggiante, mai generico; se ha poco tempo "
            "scegli solo le cose piu' utili; se chiede di essere interrogato fai UNA domanda alla volta e poi correggi "
            "la sua risposta):\n" + "\n".join(righe))
