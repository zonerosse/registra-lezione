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
    """Chiama Claude con lo strumento e torna (input, usage): vedi chiedi.strumento."""
    return ch.strumento(chiave, corpo, campo, "es_err")


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


def correggi(base, materia, risposte, chiave, L="it", dsa=False):
    """Claude corregge l'ultima simulazione: punti per domanda, cosa va bene, cosa manca, voto in trentesimi."""
    d = leggi(base, materia)
    sim = (d.get("simulazioni") or [None])[-1]
    if not sim:
        raise ap.ErroreAppunti(tr("es_err"))
    sim["risposte"] = [str(x or "")[:4000] for x in risposte]
    corpo = {"model": ch.MODELLO, "max_tokens": 2000,
             "system": ("Lo studente ha un DSA e ha risposto anche dettando a voce: valuta SOLO il contenuto, MAI ortografia, "
                        "punteggiatura o forma. " if dsa else "") +
                       "Correggi questa simulazione d'esame come un docente giusto ma esigente. Per ogni risposta: \"punti\" "
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


# ------------------------------------------------------------------ test a crocette (come i test d'esame)

N_TEST = 10
SCHEMA_TEST = {"type": "object", "properties": {"domande": {"type": "array", "items": {"type": "object", "properties": {
    "domanda": {"type": "string"},
    "opzioni": {"type": "array", "items": {"type": "string"}, "description": "esattamente 4 risposte"},
    "giusta": {"type": "integer", "description": "indice (0-3) della risposta giusta in opzioni"},
    "spiegazione": {"type": "string", "description": "perche' e' giusta quella e perche' l'errore tipico e' sbagliato, 1-2 frasi"},
    "lezione": {"type": "string", "description": "L1, L2... la lezione da cui viene"},
    "orario": {"type": "string", "description": "hh:mm:ss del punto della lezione, preso da \"dove\", o vuoto"},
    "carta": {"type": "string", "description": "la domanda degli appunti da cui viene, copiata uguale"}},
    "required": ["domanda", "opzioni", "giusta", "spiegazione", "lezione"]}}}, "required": ["domande"]}


def _lezioni_test(cartelle):
    """Le lezioni della materia in ordine di data: [{"n", "cartella", "data", "nome"}]."""
    out = []
    for i, (quando, c) in enumerate(sorted(((_data(c)[0], c) for c in cartelle), key=lambda x: x[0]), 1):
        out.append({"n": i, "cartella": str(c), "data": f"{quando:%d/%m}", "nome": _data(c)[1].get("nome", "")})
    return out


def _secondi(orario):
    m = re.search(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", str(orario or ""))
    if not m:
        return None
    a, b, c = m.group(1), m.group(2), m.group(3)
    return int(a) * 3600 + int(b) * 60 + int(c) if c is not None else int(a) * 60 + int(b)


def _mescola(q):
    """Le 4 risposte in ordine casuale (la giusta non sta sempre nello stesso posto)."""
    import random
    idx = list(range(len(q["opzioni"])))
    random.shuffle(idx)
    giusta = q["opzioni"][q["giusta"]]
    q["opzioni"] = [q["opzioni"][i] for i in idx]
    q["giusta"] = q["opzioni"].index(giusta)
    return q


def test_nuovo(base, materia, cartelle, chiave, L="it", solo_sbagliate=False, n=10, difficolta="media", esame_vero=False):
    """Un test a crocette sulla materia (10 domande, 4 risposte). Con solo_sbagliate: di nuovo le domande sbagliate
    dell'ultimo test, con le risposte rimescolate (non costa niente). Torna (test, spesa)."""
    d = leggi(base, materia)
    if solo_sbagliate:
        ult = (d.get("test") or [None])[-1]
        if not ult or not ult.get("risposte"):
            raise ap.ErroreAppunti(tr("es_err"))
        sbagliate = [dict(q) for q, r in zip(ult["domande"], ult["risposte"]) if r != q["giusta"]]
        if not sbagliate:
            raise ap.ErroreAppunti(tr("tc_nessuna"))
        test = {"quando": datetime.datetime.now().isoformat(timespec="seconds"), "lezioni": ult.get("lezioni") or [],
                "domande": [_mescola(q) for q in sbagliate], "risposte": None, "voto": None, "ripasso": True,
                "difficolta": ult.get("difficolta", "media"), "esame_vero": bool(esame_vero)}
        d.setdefault("test", []).append(test)
        d["test"] = d["test"][-20:]
        salva(base, materia, d)
        return test, 0.0
    lezioni = _lezioni_test(cartelle)
    blocchi = []
    for x in lezioni:
        testo = ch._appunti_compatti(x["cartella"])
        if testo.strip():
            blocchi.append(f"=== L{x['n']} · {x['data']} · {x['nome']} ===\n{testo}")
    if not blocchi:
        raise ap.ErroreAppunti(tr("es_vuoto"))
    top = [q["domanda"] for q in ((d.get("classifica") or {}).get("domande") or []) if q.get("stelle", 1) >= 2]
    gia = [q["domanda"] for t in d.get("test") or [] for q in t.get("domande") or []][-40:]
    n = 30 if int(n or 10) >= 30 else 20 if int(n or 10) >= 20 else 10
    difficolta = difficolta if difficolta in ("facile", "media", "difficile") else "media"
    livello = {"facile": "FACILE: domande sui concetti principali e le definizioni, risposte sbagliate ben distinguibili",
               "media": "MEDIA: come un normale test d'esame",
               "difficile": "DIFFICILE: dettagli, valori precisi, collegamenti fra lezioni e risposte sbagliate molto simili alla giusta"}[difficolta]
    corpo = {"model": ch.MODELLO, "max_tokens": 600 * n + 1000,
             "system": "Sei il docente di questa materia e prepari un TEST A CROCETTE d'esame: " + str(n) + " domande, "
                       "difficolta' " + livello + ", "
                       "ciascuna con ESATTAMENTE 4 risposte e una sola giusta. Prendi le domande soprattutto dagli argomenti "
                       "piu' importanti (\"domande_importanti\") ma copri piu' lezioni. Le risposte sbagliate devono essere "
                       "plausibili: gli errori tipici degli studenti (valori confusi, concetti scambiati), mai assurde, niente "
                       "\"tutte le precedenti\" o \"nessuna\". Domande brevi e chiare. \"spiegazione\": perche' la giusta e' "
                       "giusta e dove sta l'errore tipico, 1-2 frasi. \"lezione\" = L1, L2... da cui viene; \"orario\" = "
                       "hh:mm:ss preso dal \"dove\" di quel punto (vuoto se non c'e'); \"carta\" = la domanda degli appunti "
                       "da cui viene, copiata uguale. Usa solo il materiale ricevuto. Non ripetere le domande gia' fatte se "
                       "puoi. Scrivi in " + testi.nome_lingua(L, "it") + ". Chiama lo strumento salva_test.",
             "tools": [{"name": "salva_test", "description": "Salva il test.", "input_schema": SCHEMA_TEST}],
             "messages": [{"role": "user", "content": json.dumps({"materia": materia, "domande_importanti": top[:15],
                                                                  "gia_fatte": gia}, ensure_ascii=False)
                           + "\n\nAPPUNTI DELLE LEZIONI:\n" + "\n\n".join(blocchi)[:200_000]}]}
    dati, usage = _strumento(chiave, corpo, "domande")
    domande = []
    per_n = {f"L{x['n']}": x for x in lezioni}
    for q in dati["domande"]:
        op = [str(o).strip() for o in (q.get("opzioni") or []) if str(o or "").strip()]
        try:
            g = int(q.get("giusta"))
        except (TypeError, ValueError):
            continue
        if len(op) != 4 or not 0 <= g < 4 or not str(q.get("domanda") or "").strip():
            continue
        lez = per_n.get(str(q.get("lezione") or "").strip().upper().replace(" ", ""))
        domande.append(_mescola({"domanda": str(q["domanda"])[:400], "opzioni": [o[:300] for o in op], "giusta": g,
                                 "spiegazione": str(q.get("spiegazione") or "")[:500], "lezione": lez["n"] if lez else None,
                                 "sec": _secondi(q.get("orario")), "carta": str(q.get("carta") or "")[:400]}))
    if len(domande) < 3:
        raise ap.ErroreAppunti(tr("es_err"))
    test = {"quando": datetime.datetime.now().isoformat(timespec="seconds"), "lezioni": lezioni,
            "domande": domande[:n], "risposte": None, "voto": None, "difficolta": difficolta, "esame_vero": bool(esame_vero)}
    d.setdefault("test", []).append(test)
    d["test"] = d["test"][-20:]
    salva(base, materia, d)
    return test, ch._costo(usage)


def test_correggi(base, materia, risposte, sec=0, L="it"):
    """Corregge qui (senza Claude): giuste, sbagliate, vuote, voto in trentesimi, lezioni da ripassare.
    Le domande sbagliate mettono «da rivedere» la flashcard da cui vengono."""
    import difflib
    import ripasso as rp
    d = leggi(base, materia)
    test = (d.get("test") or [None])[-1]
    if not test:
        raise ap.ErroreAppunti(tr("es_err"))
    dom = test["domande"]
    ris = []
    for i in range(len(dom)):
        try:
            v = int(risposte[i]) if i < len(risposte) and risposte[i] is not None else None
        except (TypeError, ValueError):
            v = None
        ris.append(v if v in (0, 1, 2, 3) else None)
    giuste = sum(1 for q, r in zip(dom, ris) if r == q["giusta"])
    vuote = sum(1 for r in ris if r is None)
    sbagliate = len(dom) - giuste - vuote
    # «come all'esame vero»: ogni risposta sbagliata toglie 0,25 punti (le vuote no)
    punti = giuste - (0.25 * sbagliate if test.get("esame_vero") else 0)
    test.update(risposte=ris, giuste=giuste, sbagliate=sbagliate, vuote=vuote, sec=int(sec or 0), punti=punti,
                voto=max(0, round(30 * punti / max(1, len(dom)))))
    # lezioni con piu' errori: da ripassare
    lez = {x["n"]: x for x in test.get("lezioni") or []}
    errori = {}
    for q, r in zip(dom, ris):
        if r != q["giusta"] and q.get("lezione") in lez:
            errori[q["lezione"]] = errori.get(q["lezione"], 0) + 1
    peggio = sorted(errori, key=lambda n: -errori[n])[:2]
    test["da_ripassare"] = [f"L{n} · {lez[n]['data']} · {lez[n]['nome']}" for n in peggio]
    # le sbagliate tornano «da rivedere» nelle flashcard
    segnate = 0
    for q, r in zip(dom, ris):
        if r == q["giusta"] or q.get("lezione") not in lez:
            continue
        try:
            carte = rp.carte_lezione(lez[q["lezione"]]["cartella"])
            cerca = (q.get("carta") or q["domanda"]).lower()
            meglio = max(carte, key=lambda c: difflib.SequenceMatcher(None, cerca, c["domanda"].lower()).ratio(), default=None)
            if meglio and difflib.SequenceMatcher(None, cerca, meglio["domanda"].lower()).ratio() >= 0.5:
                rp.voto(lez[q["lezione"]]["cartella"], meglio["id"], False)
                segnate += 1
        except Exception:
            logging.getLogger("registra_lezione").exception("test: flashcard da rivedere")
    test["flashcard"] = segnate
    d.setdefault("voti_test", []).append(test["voto"])
    salva(base, materia, d)
    return test


# ------------------------------------------------------------------ interrogazione a voce (come all'orale)

SCHEMA_INCALZA = {"type": "object", "properties": {"domanda_in_piu": {"type": "string"}}, "required": ["domanda_in_piu"]}
N_ORALE = 3


def orale_nuova(base, materia, chiave, L="it"):
    """Le domande di un'interrogazione a voce (3, come le farebbe il docente all'orale). Torna (orale, spesa)."""
    d = leggi(base, materia)
    if not d.get("classifica"):
        raise ap.ErroreAppunti(tr("es_vuoto"))
    gia = [q["domanda"] for s in (d.get("simulazioni") or []) + (d.get("orali") or []) for q in s.get("domande") or []][-30:]
    corpo = {"model": ch.MODELLO, "max_tokens": 1500,
             "system": "Sei il docente di questa materia e fai un'INTERROGAZIONE ORALE: prepara " + str(N_ORALE) + " domande "
                       "da dire a voce, brevi e naturali come le direbbe il docente (\"Mi parli di...\", \"Come funziona...\"), "
                       "la prima sulle domande piu' probabili. \"deve_contenere\" = cosa deve dire una risposta completa, "
                       "\"punti\" = quanto vale (totale 30). Non ripetere le domande gia' fatte se puoi. Scrivi in "
                       + testi.nome_lingua(L, "it") + ". Chiama lo strumento salva_simulazione.",
             "tools": [{"name": "salva_simulazione", "description": "Salva.", "input_schema": SCHEMA_SIM}],
             "tool_choice": {"type": "tool", "name": "salva_simulazione"},
             "messages": [{"role": "user", "content": json.dumps({"materia": materia, "classifica": d["classifica"]["domande"],
                                                                  "argomenti": d["classifica"]["argomenti"], "gia_fatte": gia},
                                                                 ensure_ascii=False)}]}
    dati, usage = _strumento(chiave, corpo, "domande")
    dom = [q for q in dati["domande"] if isinstance(q, dict) and q.get("domanda")]
    if not dom:
        raise ap.ErroreAppunti(tr("es_err"))
    orale = {"quando": datetime.datetime.now().isoformat(timespec="seconds"),
             "domande": [{"domanda": str(q.get("domanda", "")), "deve_contenere": str(q.get("deve_contenere", "")),
                          "punti": int(q.get("punti") or 10)} for q in dom[:N_ORALE]], "turni": [], "voto": None}
    d.setdefault("orali", []).append(orale)
    d["orali"] = d["orali"][-20:]
    salva(base, materia, d)
    return orale, ch._costo(usage)


def orale_risposta(base, materia, n, domanda, testo, chiave, L="it"):
    """Salva la risposta detta a voce. Se e' la prima risposta alla domanda n e manca qualcosa di importante,
    Claude fa una «domanda in più» (come all'orale vero). Torna (domanda_in_piu o "", spesa)."""
    d = leggi(base, materia)
    orale = (d.get("orali") or [None])[-1]
    if not orale or not (0 <= int(n) < len(orale["domande"])):
        raise ap.ErroreAppunti(tr("es_err"))
    n = int(n)
    prima = not any(t["n"] == n for t in orale["turni"])
    orale["turni"].append({"n": n, "domanda": str(domanda or orale["domande"][n]["domanda"]), "extra": not prima,
                           "testo": str(testo or "")[:4000]})
    salva(base, materia, d)
    if not prima or not str(testo or "").strip():
        return "", 0.0
    q = orale["domande"][n]
    corpo = {"model": ch.MODELLO, "max_tokens": 300,
             "system": "Sei il docente all'esame orale. Lo studente ha appena risposto a voce (trascrizione automatica, "
                       "ignora errori di trascrizione). Se nella risposta manca un punto IMPORTANTE di \"deve_contenere\" o "
                       "c'e' un errore, fai UNA domanda in piu' breve, naturale, che lo porti su quel punto (senza dare la "
                       "risposta). Se la risposta e' gia' completa, \"domanda_in_piu\" = \"\". Scrivi in "
                       + testi.nome_lingua(L, "it") + ". Chiama lo strumento incalza.",
             "tools": [{"name": "incalza", "description": "Salva.", "input_schema": SCHEMA_INCALZA}],
             "tool_choice": {"type": "tool", "name": "incalza"},
             "messages": [{"role": "user", "content": json.dumps({"domanda": q["domanda"], "deve_contenere": q["deve_contenere"],
                                                                  "risposta": str(testo)[:4000]}, ensure_ascii=False)}]}
    r = ch._chiama(chiave, corpo)
    blocco = next((b for b in r.get("content", []) if b.get("type") == "tool_use"), None)
    extra = str(((blocco or {}).get("input") or {}).get("domanda_in_piu") or "").strip()
    return extra, ch._costo(r.get("usage") or {})


def orale_correggi(base, materia, stile, chiave, L="it"):
    """Claude corregge l'interrogazione: per ogni domanda (con le eventuali domande in più) punti, cosa va bene,
    cosa manca; voto in trentesimi e cosa ripassare. `stile` = come ha parlato (calcolato sul PC). Torna (orale, spesa)."""
    d = leggi(base, materia)
    orale = (d.get("orali") or [None])[-1]
    if not orale:
        raise ap.ErroreAppunti(tr("es_err"))
    lez = {q["domanda"]: q.get("lezioni") or [] for q in (d.get("classifica") or {}).get("domande") or []}
    corpo = {"model": ch.MODELLO, "max_tokens": 2000,
             "system": "Correggi questa INTERROGAZIONE ORALE come un docente giusto ma esigente. Le risposte sono state dette "
                       "a voce e trascritte in automatico: ignora errori di trascrizione e di forma parlata. Per ogni domanda "
                       "(conta anche la risposta alla domanda in piu'): \"punti\" ottenuti su \"su\", \"bene\" (cosa c'e' di "
                       "giusto, una riga) e \"manca\" (cosa manca o e' sbagliato, una riga, concreto; se aiuta, di' in quale "
                       "lezione ripassarlo, es. L4, guardando \"lezioni_della_classifica\"). Risposta vuota = 0 punti. "
                       "\"voto\" in trentesimi (somma), \"consiglio\" = cosa ripassare prima di tutto e come rispondere meglio "
                       "a voce. Scrivi in " + testi.nome_lingua(L, "it") + ". Chiama lo strumento salva_correzione.",
             "tools": [{"name": "salva_correzione", "description": "Salva.", "input_schema": SCHEMA_VOTO}],
             "tool_choice": {"type": "tool", "name": "salva_correzione"},
             "messages": [{"role": "user", "content": json.dumps({
                 "domande": [{"n": i + 1, "domanda": q["domanda"], "punti": q["punti"], "deve_contenere": q["deve_contenere"],
                              "risposte": [{"domanda_detta": t["domanda"], "in_piu": t["extra"], "risposta": t["testo"]}
                                           for t in orale["turni"] if t["n"] == i]}
                             for i, q in enumerate(orale["domande"])],
                 "lezioni_della_classifica": lez}, ensure_ascii=False)}]}
    v, usage = _strumento(chiave, corpo, "risposte")
    orale["correzione"] = [x for x in v["risposte"] if isinstance(x, dict)]
    orale["voto"] = max(0, min(31, int(v.get("voto") or 0)))
    orale["consiglio"] = str(v.get("consiglio") or "")
    orale["stile"] = stile or {}
    salva(base, materia, d)
    return orale, ch._costo(usage)


INTERCALARI = {"it": ("cioè", "cioe'", "ehm", "eh", "ehh", "uhm", "mmh", "praticamente", "diciamo"),
               "en": ("um", "uh", "erm", "uhm", "basically", "you know")}


def come_hai_parlato(risposte, L="it"):
    """Dalle risposte trascritte [{"sec", "segmenti":[{inizio, fine, testo}]}]: tempo totale, intercalari, pause lunghe.
    Calcolato qui, senza Claude."""
    sec = sum(float(r.get("sec") or 0) for r in risposte)
    testo = " ".join(s.get("testo", "") for r in risposte for s in r.get("segmenti") or []).lower()
    parole = re.findall(r"[\w']+", testo)
    lista = INTERCALARI.get(L, INTERCALARI["it"])
    singole = [x for x in lista if " " not in x]
    n_int = sum(1 for p in parole if p in singole) + sum(testo.count(x) for x in lista if " " in x)
    pause = 0
    for r in risposte:
        seg = r.get("segmenti") or []
        pause += sum(1 for a, b in zip(seg, seg[1:]) if float(b["inizio"]) - float(a["fine"]) > 2.5)
        if seg and float(seg[0]["inizio"]) > 4:          # ci ha messo tanto a cominciare
            pause += 1
    minuti = max(sec / 60, 0.5)
    giudizio = "sicuro" if pause / minuti < 1 else "esitante" if pause / minuti < 2.5 else "molte_pause"
    return {"sec": round(sec), "intercalari": n_int, "pause": pause, "giudizio": giudizio}


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
