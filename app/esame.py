# -*- coding: utf-8 -*-
"""
«Preparazione all'esame» di una materia (tutte le sue lezioni):
  - la classifica unica delle domande piu' probabili di tutto il corso (Claude guarda gli appunti di tutte le
    lezioni: sale quello che torna in piu' lezioni o su cui il docente insiste) e gli argomenti in ordine;
  - il piano di studio giorno per giorno fino alla data dell'esame (calcolato qui, senza Claude);
  - la simulazione d'esame completa: domande nuove su tutto il corso, poi Claude corregge le risposte.
Tutto in <cartella registrazioni>/esami/<materia>.json; si aggiorna quando arriva una lezione nuova.
"""
import datetime
import hashlib
import json
import logging
import re
from pathlib import Path

import appunti as ap
import chiedi as ch
import elaborazione as el
import testi
from testi import tr


def _strumento(chiave, corpo, campo):
    """Chiama Claude con lo strumento e torna (input, usage). Se la lista `campo` arriva vuota, scritta come testo
    o tagliata (risposta troppo lunga), riprova una volta con piu' spazio. Se non va: ErroreAppunti con il messaggio giusto."""
    usage = {}
    for prova in range(2):
        r = ch._chiama(chiave, corpo)
        for k, v in (r.get("usage") or {}).items():
            if isinstance(v, (int, float)):
                usage[k] = usage.get(k, 0) + v
        blocco = next((b for b in r.get("content", []) if b.get("type") == "tool_use"), None)
        dati = (blocco or {}).get("input") or {}
        v = dati.get(campo)
        if isinstance(v, str):                 # a volte la lista arriva come testo JSON
            try:
                v = json.loads(v)
            except ValueError:
                v = None
            dati[campo] = v
        if isinstance(v, list) and v:
            return dati, usage
        log.warning("esame: %s vuoto (prova %s, stop=%s)", campo, prova + 1, r.get("stop_reason"))
        corpo = dict(corpo, max_tokens=int(corpo.get("max_tokens", 2000) * 2))
    raise ap.ErroreAppunti(tr("es_err"))

log = logging.getLogger("registra_lezione")


def _file(base, materia):
    nome = re.sub(r"[^\w\- ]+", "", materia, flags=re.UNICODE).strip()[:60] or "materia"
    p = Path(base) / "esami"
    p.mkdir(parents=True, exist_ok=True)
    return p / f"{nome}.json"


def leggi(base, materia):
    return el.leggi_json(_file(base, materia), {}) or {}


def salva(base, materia, d):
    el.scrivi_json(_file(base, materia), d)


def _firma(cartelle):
    parti = []
    for c in sorted(cartelle):
        for f in sorted(Path(c).glob("appunti_*.json")):
            parti.append(f"{f}:{f.stat().st_mtime_ns}")
    return hashlib.sha1("|".join(parti).encode("utf-8")).hexdigest()[:16]


def _data(c):
    info = el.leggi_json(Path(c) / "info.json", {}) or {}
    try:
        return datetime.datetime.fromisoformat(info.get("inizio", "")), info
    except ValueError:
        return datetime.datetime.now(), info


SCHEMA_CLASSIFICA = {"type": "object", "properties": {
    "domande": {"type": "array", "items": {"type": "object", "properties": {
        "domanda": {"type": "string"}, "stelle": {"type": "integer"}, "lezioni": {"type": "array", "items": {"type": "string"}},
        "perche": {"type": "string"}, "schema": {"type": "array", "items": {"type": "string"}}}, "required": ["domanda", "stelle", "lezioni"]}},
    "argomenti": {"type": "array", "items": {"type": "object", "properties": {
        "titolo": {"type": "string"}, "lezione": {"type": "string"}, "peso": {"type": "integer"}}, "required": ["titolo", "lezione", "peso"]}}},
    "required": ["domande", "argomenti"]}


def classifica(base, materia, cartelle, chiave, rifai=False):
    """Le domande piu' probabili di tutto il corso e gli argomenti in ordine. Si rifa' solo se cambiano le lezioni."""
    d = leggi(base, materia)
    firma = _firma(cartelle)
    if d.get("classifica") and d.get("firma") == firma and not rifai:
        return d, 0.0
    lezioni = sorted(((_data(c)[0], c) for c in cartelle), key=lambda x: x[0])
    blocchi, L = [], "it"
    for quando, c in lezioni:
        info = _data(c)[1]
        L = testi.lingua_di(info)
        testo = ch._appunti_compatti(c)
        if testo.strip():
            blocchi.append(f"=== Lezione del {quando:%d/%m} ({info.get('nome', '')}) ===\n{testo}")
    if not blocchi:
        raise ap.ErroreAppunti(tr("es_vuoto"))
    corpo = {"model": ch.MODELLO, "max_tokens": 4000,
             "system": "Sei un tutor universitario esperto di esami. Ricevi gli appunti di TUTTE le lezioni di una materia, "
                       "in ordine. Fai:\n"
                       "1) \"domande\": la classifica unica delle 8-15 domande d'esame piu' probabili di tutto il corso, dalla "
                       "piu' probabile. Sale una domanda se l'argomento torna in piu' lezioni, se il docente ci insiste o dice "
                       "che e' da esame. \"stelle\" 3/2/1 sull'intero corso (3 solo a circa un quarto). \"lezioni\" = le date "
                       "(gg/mm) delle lezioni in cui se ne parla. \"perche\" in poche parole. \"schema\" = 3-6 passi brevi "
                       "della risposta ideale. Unisci le domande simili.\n"
                       "2) \"argomenti\": gli argomenti del corso in ordine di lezione (15-40), ciascuno con \"titolo\" breve, "
                       "\"lezione\" (gg/mm) e \"peso\" 3/2/1 (quanto conta per l'esame).\n"
                       "Usa solo il materiale ricevuto. Scrivi in " + testi.nome_lingua(L, "it") + ". Chiama lo strumento salva_classifica.",
             "tools": [{"name": "salva_classifica", "description": "Salva la classifica.", "input_schema": SCHEMA_CLASSIFICA}],
             "tool_choice": {"type": "tool", "name": "salva_classifica"},
             "messages": [{"role": "user", "content": f"Materia: {materia}\n\n" + "\n\n".join(blocchi)[:250_000]}]}
    dati, usage = _strumento(chiave, corpo, "domande")
    r = {"usage": usage}
    d["classifica"] = {"domande": [{"domanda": str(x.get("domanda", ""))[:300], "stelle": max(1, min(3, int(x.get("stelle") or 1))),
                                    "lezioni": [str(y)[:10] for y in x.get("lezioni") or []][:8], "perche": str(x.get("perche") or "")[:200],
                                    "schema": [str(y)[:160] for y in x.get("schema") or []][:6]} for x in dati["domande"][:15]],
                       "argomenti": [{"titolo": str(x.get("titolo", ""))[:90], "lezione": str(x.get("lezione") or "")[:10],
                                      "peso": max(1, min(3, int(x.get("peso") or 1)))} for x in dati.get("argomenti") or []][:40]}
    d["firma"] = firma
    d["n_lezioni"] = len(lezioni)
    d["aggiornata"] = datetime.datetime.now().isoformat(timespec="seconds")
    salva(base, materia, d)
    return d, ch._costo(r.get("usage", {}))


def piano(d, oggi=None, L="it"):
    """Il piano di studio da domani al giorno prima dell'esame: argomenti in ordine (quelli che pesano di piu'
    prendono piu' spazio), una pausa a settimana, ripasso delle domande ★★★ e simulazioni verso la fine."""
    if not d.get("data_esame") or not d.get("classifica"):
        return []
    oggi = oggi or datetime.date.today()
    esame = datetime.date.fromisoformat(d["data_esame"])
    giorni = [oggi + datetime.timedelta(days=i) for i in range(1, (esame - oggi).days)]
    if not giorni:
        return []
    arg = d["classifica"]["argomenti"] or [{"titolo": x["domanda"], "peso": x["stelle"], "lezione": ""} for x in d["classifica"]["domande"]]
    top = [x["domanda"] for x in d["classifica"]["domande"] if x["stelle"] == 3] or [x["domanda"] for x in d["classifica"]["domande"][:3]]
    out = []
    finali = []          # gli ultimi giorni: simulazione e ripasso finale
    if len(giorni) >= 3:
        finali = [(giorni[-2], "simulazione", [tr("es_p_sim", L)]), (giorni[-1], "ripasso", [tr("es_p_finale", L)] + top[:3])]
        giorni = giorni[:-2]
    studio = [g for g in giorni if g.weekday() != 6] or giorni          # la domenica si riposa
    # quanti giorni servono per gli argomenti (peso 3 = un giorno, 1-2 = mezzo)
    unita = []
    for a in arg:
        unita += [a] * (2 if a["peso"] == 3 else 1)
    per_giorno = max(1, -(-len(unita) // max(1, int(len(studio) * 0.7))))
    i = giro = dopo = 0
    for g in studio:
        if i < len(unita):
            pezzo = unita[i:i + per_giorno]
            i += per_giorno
            titoli = []
            for x in pezzo:
                if x["titolo"] not in titoli:
                    titoli.append(x["titolo"])
            out.append({"giorno": g.isoformat(), "tipo": "studio", "cose": titoli, "lezione": pezzo[0].get("lezione", "")})
        elif dopo % 3 == 2:
            dopo += 1
            out.append({"giorno": g.isoformat(), "tipo": "simulazione", "cose": [tr("es_p_sim", L)]})
        else:
            dopo += 1
            cose = top[giro % len(top):giro % len(top) + 2] if top else []
            giro += 2
            out.append({"giorno": g.isoformat(), "tipo": "ripasso", "cose": [tr("es_p_rip", L)] + cose})
    for g in giorni:
        if g not in studio:
            out.append({"giorno": g.isoformat(), "tipo": "riposo", "cose": [tr("es_p_riposo", L)]})
    for g, tipo, cose in finali:
        out.append({"giorno": g.isoformat(), "tipo": tipo, "cose": cose})
    out.append({"giorno": esame.isoformat(), "tipo": "esame", "cose": [tr("es_p_esame", L)]})
    return sorted(out, key=lambda x: x["giorno"])


SCHEMA_SIM = {"type": "object", "properties": {"domande": {"type": "array", "items": {"type": "object", "properties": {
    "domanda": {"type": "string"}, "deve_contenere": {"type": "string"}, "punti": {"type": "integer"}}, "required": ["domanda", "deve_contenere"]}}},
    "required": ["domande"]}
SCHEMA_VOTO = {"type": "object", "properties": {"risposte": {"type": "array", "items": {"type": "object", "properties": {
    "n": {"type": "integer"}, "punti": {"type": "number"}, "su": {"type": "number"}, "bene": {"type": "string"}, "manca": {"type": "string"}},
    "required": ["n", "punti", "su"]}}, "voto": {"type": "integer"}, "consiglio": {"type": "string"}}, "required": ["risposte", "voto"]}


def simulazione(base, materia, chiave, L="it"):
    """Una simulazione d'esame nuova su tutto il corso (6 domande, come le farebbe il docente)."""
    d = leggi(base, materia)
    if not d.get("classifica"):
        raise ap.ErroreAppunti(tr("es_vuoto"))
    gia = [q["domanda"] for s in d.get("simulazioni") or [] for q in s.get("domande") or []][-30:]
    corpo = {"model": ch.MODELLO, "max_tokens": 3000,
             "system": "Prepara una SIMULAZIONE D'ESAME scritta per questa materia: 6 domande come le farebbe il docente "
                       "(mescola le piu' probabili con 1-2 meno ovvie, anche un esercizio breve se la materia lo prevede), "
                       "\"deve_contenere\" = cosa deve toccare una risposta completa (o il risultato), \"punti\" = quanto vale "
                       "(totale 30). Non ripetere le domande delle simulazioni precedenti se puoi. Scrivi in "
                       + testi.nome_lingua(L, "it") + ". Chiama lo strumento salva_simulazione.",
             "tools": [{"name": "salva_simulazione", "description": "Salva.", "input_schema": SCHEMA_SIM}],
             "tool_choice": {"type": "tool", "name": "salva_simulazione"},
             "messages": [{"role": "user", "content": json.dumps({"materia": materia, "classifica": d["classifica"]["domande"],
                                                                  "argomenti": d["classifica"]["argomenti"], "gia_fatte": gia},
                                                                 ensure_ascii=False)}]}
    dati, usage = _strumento(chiave, corpo, "domande")
    r = {"usage": usage}
    dom = [q for q in dati["domande"] if isinstance(q, dict)]
    if not dom:
        raise ap.ErroreAppunti(tr("es_err"))
    sim = {"quando": datetime.datetime.now().isoformat(timespec="seconds"),
           "domande": [{"domanda": str(q.get("domanda", "")), "deve_contenere": str(q.get("deve_contenere", "")),
                        "punti": int(q.get("punti") or 5)} for q in dom[:8]], "risposte": [], "voto": None}
    d.setdefault("simulazioni", []).append(sim)
    salva(base, materia, d)
    return sim, ch._costo(r.get("usage", {}))


def correggi(base, materia, risposte, chiave, L="it"):
    """Claude corregge l'ultima simulazione: punti per domanda, cosa va bene, cosa manca, voto in trentesimi."""
    d = leggi(base, materia)
    sim = (d.get("simulazioni") or [None])[-1]
    if not sim:
        raise ap.ErroreAppunti(tr("es_err"))
    sim["risposte"] = [str(x or "")[:4000] for x in risposte]
    corpo = {"model": ch.MODELLO, "max_tokens": 2000,
             "system": "Correggi questa simulazione d'esame come un docente giusto ma esigente. Per ogni risposta: \"punti\" "
                       "ottenuti su \"su\" (i punti della domanda), \"bene\" (cosa c'e' di giusto, una riga) e \"manca\" (cosa "
                       "manca o e' sbagliato, una riga, concreto). Risposta vuota = 0 punti. \"voto\" in trentesimi (somma), "
                       "\"consiglio\" = cosa ripassare prima di tutto. Scrivi in " + testi.nome_lingua(L, "it") +
                       ". Chiama lo strumento salva_correzione.",
             "tools": [{"name": "salva_correzione", "description": "Salva.", "input_schema": SCHEMA_VOTO}],
             "tool_choice": {"type": "tool", "name": "salva_correzione"},
             "messages": [{"role": "user", "content": json.dumps([{"n": i + 1, "domanda": q["domanda"], "punti": q["punti"],
                                                                   "deve_contenere": q["deve_contenere"],
                                                                   "risposta": sim["risposte"][i] if i < len(sim["risposte"]) else ""}
                                                                  for i, q in enumerate(sim["domande"])], ensure_ascii=False)}]}
    v, usage = _strumento(chiave, corpo, "risposte")
    r = {"usage": usage}
    v["risposte"] = [x for x in v["risposte"] if isinstance(x, dict)]
    sim["correzione"] = v.get("risposte")
    sim["voto"] = max(0, min(31, int(v.get("voto") or 0)))
    sim["consiglio"] = str(v.get("consiglio") or "")
    salva(base, materia, d)
    return sim, ch._costo(r.get("usage", {}))


def eventi_calendario(d, materia, L="it"):
    out = []
    for g in piano(d, L=L):
        if g["tipo"] == "riposo":
            continue
        tit = {"studio": f"{tr('es_cal', L)} {materia}: " + ", ".join(g["cose"])[:120],
               "esame": f"{tr('es_p_esame', L)} {materia}"}.get(g["tipo"], f"{materia}: " + " ".join(g["cose"])[:120])
        out.append({"titolo": tit, "data": g["giorno"], "ora": "", "note": "\n".join(g["cose"])})
    return out


def pdf(d, materia, dest, L="it"):
    """La classifica delle domande e il piano di studio in un PDF da stampare."""
    from fpdf import FPDF
    p = FPDF(format="A4")
    p.set_auto_page_break(True, margin=15)
    p.set_margins(15, 15, 15)
    font, solo_latin = el._font_pdf(p)

    def t(s):
        s = str(s or "")
        return s.encode("latin-1", "replace").decode("latin-1") if solo_latin else s.replace("★", "*") if solo_latin else s
    p.add_page()
    p.set_font(font, "B", 18)
    p.multi_cell(0, 9, t(f"{tr('es_pdf_t', L)} – {materia}"), new_x="LMARGIN", new_y="NEXT")
    p.set_font(font, "", 10)
    p.set_text_color(100, 116, 139)
    if d.get("data_esame"):
        p.multi_cell(0, 6, t(datetime.date.fromisoformat(d["data_esame"]).strftime("%d/%m/%Y")), new_x="LMARGIN", new_y="NEXT")
    p.set_text_color(0, 0, 0)
    p.ln(3)
    p.set_font(font, "B", 12)
    p.set_text_color(194, 65, 12)
    p.multi_cell(0, 7, t(tr("es_pdf_dom", L)), new_x="LMARGIN", new_y="NEXT")
    p.set_text_color(0, 0, 0)
    for n, q in enumerate((d.get("classifica") or {}).get("domande") or [], 1):
        p.set_font(font, "B", 10.5)
        stelle = "*" * q["stelle"]
        p.multi_cell(0, 5.5, t(f"{n}. [{stelle}] {q['domanda']}"), new_x="LMARGIN", new_y="NEXT")
        p.set_font(font, "", 9.5)
        if q.get("lezioni"):
            p.set_text_color(100, 116, 139)
            p.multi_cell(0, 5, t(", ".join(q["lezioni"]) + (f" · {q['perche']}" if q.get("perche") else "")), new_x="LMARGIN", new_y="NEXT")
            p.set_text_color(0, 0, 0)
        for x in q.get("schema") or []:
            p.multi_cell(0, 5, t(f"   - {x}"), new_x="LMARGIN", new_y="NEXT")
        p.ln(1.5)
    pi = piano(d, L=L)
    if pi:
        p.ln(2)
        p.set_font(font, "B", 12)
        p.set_text_color(3, 105, 161)
        p.multi_cell(0, 7, t(tr("es_pdf_piano", L)), new_x="LMARGIN", new_y="NEXT")
        p.set_text_color(0, 0, 0)
        p.set_font(font, "", 9.5)
        for g in pi:
            gd = datetime.date.fromisoformat(g["giorno"])
            p.set_font(font, "B", 9.5)
            p.cell(28, 5.2, t(gd.strftime("%d/%m %a")))
            p.set_font(font, "", 9.5)
            p.multi_cell(0, 5.2, t(" ".join(g["cose"])), new_x="LMARGIN", new_y="NEXT")
    p.output(str(dest))
    return Path(dest)
