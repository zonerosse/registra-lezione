# -*- coding: utf-8 -*-
"""
«Ripasso del giorno»: poche carte ogni giorno, scelte fra tutte le lezioni, fino all'esame.

Le carte sono quelle del ripasso (domande gia' negli appunti: ripasso.carte_lezione). Ogni carta ha una
«scatola» (0-5) e una scadenza in ripasso.json:
  - sbagliata  -> scatola 0, torna domani;
  - saputa     -> scatola +1, torna dopo 2, 4, 8, 16, 30 giorni;
  - con la data dell'esame l'intervallo si accorcia (al massimo un terzo dei giorni che mancano, mai dopo l'esame).
Ogni giorno: prima le sbagliate, poi quelle scadute, poi le ★★★ se l'esame e' vicino, poi qualche nuova; al massimo
N carte (10/20/30) cosi' se si salta un giorno non si accumulano.

Modalita' «A crocette»: le 3 risposte sbagliate le prepara Claude (Haiku) e cambiano ogni settimana
(crocette.json nella cartella della lezione); l'ordine delle 4 risposte e' a caso ogni volta.
"""
import datetime
import json
import logging
import random
import re
from pathlib import Path

import appunti as ap
import chiedi as ch
import elaborazione as el
import esame as es
import ripasso as rp
import testi
from testi import tr

log = logging.getLogger("registra_lezione")

SEC_CARTA = 30                          # circa mezzo minuto a carta


def _oggi():
    return datetime.date.today()


def _data(x):
    try:
        return datetime.date.fromisoformat(str(x)[:10])
    except (TypeError, ValueError):
        return None


def lezioni(base):
    """Le lezioni pronte con le carte: [{"cartella", "nome", "materia"}]."""
    out = []
    try:
        cartelle = [p for p in Path(base).iterdir() if p.is_dir() and (p / "info.json").exists()]
    except OSError:
        return out
    for c in cartelle:
        info = el.leggi_json(c / "info.json", {}) or {}
        if info.get("stato") != "pronta" or (info.get("tipo") or "lezione") != "lezione":
            continue
        nome = info.get("nome", c.name)
        materia = (info.get("materia") or nome.split(" – ")[0].split(" - ")[0]).strip()
        out.append({"cartella": str(c), "nome": nome, "materia": materia, "inizio": info.get("inizio", "")})
    return out


def _date_esami(base, materie):
    out = {}
    for m in materie:
        d = _data(es.leggi(base, m).get("data_esame"))
        if d and d >= _oggi():
            out[m] = d
    return out


def _argomento(c):
    if c.get("parole"):
        return re.sub(r"\s*[:–-].*$", "", c["parole"][0]).strip()[:40]
    d = re.sub(r"^(che cos'?e'?|cos'?e'?|qual e'?|quali sono|come|perche'?|descrivi|spiega)\s+", "", c["domanda"], flags=re.I)
    return d.rstrip("?").strip()[:40]


def _tutte(base):
    """Tutte le carte con il loro stato."""
    lz = lezioni(base)
    esami = _date_esami(base, {l["materia"] for l in lz})
    carte = []
    for l in lz:
        st = rp._stat(l["cartella"])
        for c in rp.carte_lezione(l["cartella"]):
            s = st.get(c["id"])
            box, scad = rp.stato_carta(s)
            c.update(materia=l["materia"], box=box, scad=scad, ultimo=(s or {}).get("ultimo"),
                     visto=_data((s or {}).get("quando")), argomento=_argomento(c), esame=esami.get(l["materia"]))
            carte.append(c)
    return carte, lz, esami


def _scelta(carte, n, lampo=False, oggi=None):
    """Le carte di oggi in ordine, al massimo n."""
    oggi = oggi or _oggi()

    def vicino(c):
        return c["esame"] and (c["esame"] - oggi).days <= 14
    sbagliate = [c for c in carte if c["box"] is not None and c["ultimo"] == 0 and c["scad"] <= oggi]
    scadute = [c for c in carte if c["box"] is not None and c["ultimo"] != 0 and c["scad"] <= oggi]
    gia = {c["id"] for c in sbagliate + scadute}
    esame = [c for c in carte if c["id"] not in gia and c["box"] is not None and c["stelle"] >= 3 and vicino(c)
             and (not c["visto"] or (oggi - c["visto"]).days >= 2)]
    nuove = [c for c in carte if c["box"] is None]
    # le nuove: prima le materie con l'esame vicino, poi le piu' importanti, poi le lezioni in ordine
    nuove.sort(key=lambda c: (0 if vicino(c) else 1, -c["stelle"]))
    for g in (sbagliate, scadute, esame):
        random.shuffle(g)
        g.sort(key=lambda c: (c["scad"] or oggi, -c["stelle"]))
    for c in sbagliate:
        c["perche"] = "rivedere"
    for c in scadute:
        c["perche"] = "ripasso"
    for c in esame:
        c["perche"] = "esame"
    for c in nuove:
        c["perche"] = "nuova"
    if lampo:
        tutte = sbagliate + scadute + esame + nuove
        tutte.sort(key=lambda c: -c["stelle"])
        return tutte[:min(n, 8)]
    scelte = (sbagliate + scadute + esame)[:n]
    posto = n - len(scelte)
    # le nuove al massimo un terzo del giorno (se c'e' gia' da ripassare), cosi' non diventa troppo
    max_nuove = posto if not scelte else min(posto, max(3, n // 3))
    return scelte + nuove[:max_nuove]


def _riassunto(scelte):
    """Per «Oggi ripassi»: una riga per lezione con materia, titolo, argomenti e perche'."""
    righe = {}
    for c in scelte:
        r = righe.setdefault(c["cartella"], {"cartella": c["cartella"], "materia": c["materia"], "lezione": c["lezione"],
                                             "n": 0, "rivedere": 0, "nuove": 0, "esame": 0, "argomenti": []})
        r["n"] += 1
        if c["perche"] in ("rivedere", "nuova", "esame"):
            r[{"rivedere": "rivedere", "nuova": "nuove", "esame": "esame"}[c["perche"]]] += 1
        if c["argomento"] and c["argomento"] not in r["argomenti"] and len(r["argomenti"]) < 4:
            r["argomenti"].append(c["argomento"])
    return sorted(righe.values(), key=lambda r: -r["n"])


def _serie(fatti, oggi=None):
    oggi = oggi or _oggi()
    giorni = {d for d in (_data(x) for x in fatti or []) if d}
    g = oggi if oggi in giorni else oggi - datetime.timedelta(days=1)
    n = 0
    while g in giorni:
        n += 1
        g -= datetime.timedelta(days=1)
    return n


def pronto(carte):
    """Quanto si e' pronti all'esame (0-100): la parte di carte sapute almeno due volte di fila (le ★★★ contano doppio)."""
    tot = sum(2 if c["stelle"] >= 3 else 1 for c in carte)
    if not tot:
        return 0
    ok = sum((2 if c["stelle"] >= 3 else 1) * (1 if (c["box"] or 0) >= 2 else 0.5 if (c["box"] or 0) == 1 else 0)
             for c in carte if c["ultimo"] != 0)
    return int(round(100 * ok / tot))


def oggi(base, n=20, fatti=None, lampo=False, immagini=True):
    """Tutto quello che serve alla pagina: le carte di oggi, il riassunto, le materie, i prossimi giorni, la serie."""
    carte, lz, esami = _tutte(base)
    giorno = _oggi()
    fatto_oggi = giorno.isoformat() in (fatti or [])
    scelte = _scelta(carte, n, lampo)
    materie = []
    for m in sorted({c["materia"] for c in carte}):
        cm = [c for c in carte if c["materia"] == m]
        materie.append({"materia": m, "carte": len(cm), "oggi": sum(1 for c in scelte if c["materia"] == m),
                        "giorni": (esami[m] - giorno).days if m in esami else None, "pronto": pronto(cm)})
    # i prossimi 7 giorni: quante scadono (al massimo n al giorno), contando che oggi si fa
    prossimi = []
    for i in range(7):
        g = giorno + datetime.timedelta(days=i)
        if i == 0:
            k = len(scelte)
        else:
            oggi_ids = {c["id"] for c in scelte}
            k = sum(1 for c in carte if c["box"] is not None and c["scad"] == g and c["id"] not in oggi_ids)
            if i == 1:          # le sbagliate di oggi tornano domani
                k += sum(1 for c in scelte if c["perche"] == "rivedere")
            k = min(n, k)
        prossimi.append({"giorno": g.isoformat(), "n": k})
    for c in scelte:
        f = c.pop("slide_file", "")
        c["img"] = rp._miniatura(c["cartella"], f) if immagini else ""
        for k in ("scad", "visto", "esame"):
            c[k] = c[k].isoformat() if isinstance(c[k], datetime.date) else c[k]
    return {"carte": scelte, "lezioni": _riassunto(scelte), "materie": materie, "prossimi": prossimi,
            "minuti": max(1, round(len(scelte) * SEC_CARTA / 60)) if scelte else 0, "serie": _serie(fatti),
            "fatto_oggi": fatto_oggi, "totale": len(carte), "lezioni_n": len(lz)}


def domani(base, n=20):
    carte, _, _ = _tutte(base)
    d = _oggi() + datetime.timedelta(days=1)
    k = sum(1 for c in carte if c["box"] is not None and c["scad"] <= d)
    return min(n, k)


# --------------------------------------------------------------------------- crocette (risposte sbagliate)

SCHEMA_CROC = {"type": "object", "properties": {"carte": {"type": "array", "items": {"type": "object", "properties": {
    "id": {"type": "string"},
    "giusta": {"type": "string", "description": "la risposta giusta in breve (massimo 15 parole), presa dallo schema"},
    "sbagliate": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 3,
                  "description": "3 risposte sbagliate ma verosimili, lunghe come la giusta, dello stesso argomento"}},
    "required": ["id", "giusta", "sbagliate"]}}}, "required": ["carte"]}


def _settimana(oggi=None):
    y, w, _ = (oggi or _oggi()).isocalendar()
    return f"{y}-W{w:02d}"


def crocette(carte, chiave, L="it"):
    """Le 4 risposte per ogni carta (aggiunge "opzioni" e "giusta" all'indice). Le sbagliate si rifanno ogni
    settimana. Torna la spesa."""
    sett = _settimana()
    per_lez = {}
    for c in carte:
        per_lez.setdefault(c["cartella"], []).append(c)
    spesa = 0.0
    for cart, cs in per_lez.items():
        f = Path(cart) / "crocette.json"
        d = el.leggi_json(f, {}) or {}
        if d.get("settimana") != sett:
            d = {"settimana": sett, "carte": {}}
        mancano = [c for c in cs if c["id"] not in d["carte"]]
        if mancano:
            if not chiave:
                raise ap.ErroreAppunti(tr("manca_chiave", L))
            for i in range(0, len(mancano), 25):
                gruppo = mancano[i:i + 25]
                testo = "\n\n".join(f"ID: {c['id']}\nDOMANDA: {c['domanda']}\nRISPOSTA GIUSTA (schema): " + " / ".join(c["schema"])
                                    for c in gruppo)
                corpo = {"model": ch.MODELLO, "max_tokens": 4000,
                         "system": "Per ogni domanda di ripasso prepara una domanda a crocette: la risposta giusta in breve "
                                   "(massimo 15 parole, fedele allo schema) e 3 risposte sbagliate verosimili, dello stesso "
                                   "argomento, lunghe e scritte come la giusta (niente risposte assurde o ovviamente false, "
                                   "niente «tutte le precedenti»). Settimana " + sett + ": scegli errori diversi da quelli "
                                   "piu' banali. Scrivi in " + testi.nome_lingua(L, "it") + ". Chiama lo strumento salva_crocette.",
                         "tools": [{"name": "salva_crocette", "description": "Salva le crocette.", "input_schema": SCHEMA_CROC}],
                         "messages": [{"role": "user", "content": testo}]}
                dati, usage = ch.strumento(chiave, corpo, "carte", "rg_croc_err")
                spesa += ch._costo(usage)
                for x in dati.get("carte") or []:
                    if not isinstance(x, dict):
                        continue
                    sb = x.get("sbagliate")
                    if isinstance(sb, str):
                        try:
                            sb = json.loads(sb)
                        except ValueError:
                            sb = [sb]
                    sb = [str(v).strip()[:160] for v in (sb or []) if str(v or "").strip()][:3]
                    if str(x.get("id")) and str(x.get("giusta") or "").strip() and len(sb) == 3:
                        d["carte"][str(x["id"])] = {"giusta": str(x["giusta"]).strip()[:160], "sbagliate": sb}
            el.scrivi_json(f, d)
        for c in cs:
            q = d["carte"].get(c["id"])
            if not q:
                continue
            opz = [q["giusta"]] + q["sbagliate"]
            random.shuffle(opz)
            c["opzioni"] = opz
            c["giusta"] = opz.index(q["giusta"])
    return spesa
