# -*- coding: utf-8 -*-
"""
Gli strumenti in piu' di Scripta Manent (servono anche a Verba Manent, ma si vedono solo in Scripta Manent):
  - Correttore gentile: corregge SOLO l'ortografia, non cambia le parole ne' lo stile;
  - Problema passo passo: un problema di matematica (scritto o fotografato) diviso in passi spiegati semplici;
  - Compiti e scadenze: la foto del diario diventa l'elenco dei compiti e delle verifiche, con le date.
Le chiamate a Claude usano lo stesso modello e lo stesso conto degli altri strumenti (chiedi.py).
"""
import datetime
import json
import uuid
from pathlib import Path

import chiedi as ch
import elaborazione as el
import testi

GIORNI_IT = ["lunedi'", "martedi'", "mercoledi'", "giovedi'", "venerdi'", "sabato", "domenica"]


def _lingua():
    return testi.nome_lingua(testi.LINGUA, "it")


# ------------------------------------------------------------------ correttore gentile

def correggi(chiave, testo):
    """{"testo": testo corretto, "correzioni": [{"da", "a"}], "spesa"}. Solo ortografia: le parole restano quelle."""
    testo = str(testo or "").strip()[:12000]
    if not testo:
        return {"testo": "", "correzioni": [], "spesa": 0.0}
    corpo = {"model": ch.MODELLO, "max_tokens": 6000,
             "system": ("Ti mando un testo scritto da uno studente con dislessia o disortografia. Correggi SOLO gli errori di "
                        "ortografia: lettere scambiate, doppie, accenti, apostrofi, h, maiuscole a inizio frase e nei nomi propri. "
                        "NON cambiare, togliere o aggiungere parole, NON correggere lo stile, la grammatica dei verbi o l'ordine "
                        "delle frasi, NON aggiungere punteggiatura che non c'e'. Il testo deve restare suo. "
                        f"Il testo e' in {_lingua()}. Rispondi con lo strumento «testo_corretto»."),
             "tools": [{"name": "testo_corretto", "description": "Il testo con la sola ortografia corretta e l'elenco delle parole cambiate.",
                        "input_schema": {"type": "object", "properties": {
                            "testo": {"type": "string", "description": "il testo intero, con solo l'ortografia corretta"},
                            "correzioni": {"type": "array", "items": {"type": "object", "properties": {
                                "da": {"type": "string", "description": "la parola scritta dallo studente"},
                                "a": {"type": "string", "description": "la parola corretta"}}, "required": ["da", "a"]}}},
                            "required": ["testo", "correzioni"]}}],
             "messages": [{"role": "user", "content": testo}]}
    # qui una lista vuota e' una risposta valida (nessun errore): niente strumento(), che la farebbe riprovare
    r = ch._chiama(chiave, dict(corpo, tool_choice={"type": "tool", "name": "testo_corretto"}))
    uso = r.get("usage") or {}
    blocco = next((b for b in r.get("content", []) if b.get("type") == "tool_use"), None)
    dati = (blocco or {}).get("input") or {}
    if isinstance(dati, str):
        try:
            dati = json.loads(dati)
        except ValueError:
            dati = {}
    if not isinstance(dati, dict) or not dati.get("testo"):
        dati = {"testo": testo, "correzioni": []}
    corr = [c for c in dati.get("correzioni") or [] if isinstance(c, dict) and c.get("da") and c.get("a") and c["da"] != c["a"]]
    return {"testo": str(dati.get("testo") or testo), "correzioni": corr[:200], "spesa": ch._costo(uso)}


# ------------------------------------------------------------------ problema passo passo

def problema(chiave, testo):
    """{"problema", "passi": [{"titolo", "spiegazione", "calcolo"}], "risultato", "spesa"}."""
    testo = str(testo or "").strip()[:6000]
    corpo = {"model": ch.MODELLO, "max_tokens": 4000,
             "system": ("Sei un tutor paziente per uno studente con discalculia o dislessia. Ti mando il testo di un problema di "
                        "matematica (o di fisica, geometria, scienze). Dividilo in pochi passi brevi (da 3 a 7): in ogni passo una "
                        "cosa sola, con parole semplici e frasi corte, e il calcolo scritto in modo leggibile (es. «12 × 3 = 36»). "
                        "Il primo passo dice cosa chiede il problema e quali dati abbiamo. Non saltare passaggi. "
                        "Il risultato finale mettilo solo nel campo «risultato», con l'unita' di misura. "
                        f"Scrivi in {_lingua()}. Rispondi con lo strumento «passi»."),
             "tools": [{"name": "passi", "description": "Il problema diviso in passi.",
                        "input_schema": {"type": "object", "properties": {
                            "problema": {"type": "string", "description": "il testo del problema, ripulito"},
                            "passi": {"type": "array", "items": {"type": "object", "properties": {
                                "titolo": {"type": "string", "description": "3-6 parole"},
                                "spiegazione": {"type": "string", "description": "1-3 frasi corte"},
                                "calcolo": {"type": "string", "description": "il calcolo del passo, se c'e'"}},
                                "required": ["titolo", "spiegazione"]}},
                            "risultato": {"type": "string"}},
                            "required": ["passi", "risultato"]}}],
             "messages": [{"role": "user", "content": testo}]}
    dati, uso = ch.strumento(chiave, corpo, "passi", "sm_pb_err")
    return {"problema": str(dati.get("problema") or testo), "passi": dati.get("passi") or [],
            "risultato": str(dati.get("risultato") or ""), "spesa": ch._costo(uso)}


# ------------------------------------------------------------------ compiti e scadenze

def _file(base):
    return Path(base) / "compiti.json"


def compiti(base):
    """L'elenco salvato, in ordine di data (i fatti in fondo)."""
    lista = el.leggi_json(_file(base), []) or []
    lista = [v for v in lista if isinstance(v, dict) and v.get("id")]
    return sorted(lista, key=lambda v: (bool(v.get("fatto")), v.get("per") or "9999", v.get("materia") or ""))


def _salva(base, lista):
    el.scrivi_json(_file(base), lista)


def diario(chiave, base, foto):
    """La foto del diario: Claude la legge e le voci nuove si aggiungono all'elenco. {"nuovi": n, "spesa"}."""
    import base64
    oggi = datetime.date.today()
    dati_foto = ch.jpeg_ridotto(foto)
    corpo = {"model": ch.MODELLO, "max_tokens": 3000,
             "system": ("Ti mando la foto della pagina del diario (o del registro) di uno studente. Trova i compiti da fare e le "
                        "verifiche o interrogazioni, con la materia e il giorno per cui sono. "
                        f"Oggi e' {GIORNI_IT[oggi.weekday()]} {oggi.isoformat()}: scrivi le date come AAAA-MM-GG (se c'e' solo il "
                        "giorno della settimana, prendi il primo che viene dopo oggi; se la data non si capisce lasciala vuota). "
                        "«cosa» deve essere breve e chiaro (es. «Esercizi 3, 4 e 5 a pagina 82»). "
                        f"Scrivi in {_lingua()}. Rispondi con lo strumento «diario»."),
             "tools": [{"name": "diario", "description": "Compiti e verifiche trovati nel diario.",
                        "input_schema": {"type": "object", "properties": {
                            "voci": {"type": "array", "items": {"type": "object", "properties": {
                                "materia": {"type": "string"},
                                "cosa": {"type": "string"},
                                "per": {"type": "string", "description": "AAAA-MM-GG o vuoto"},
                                "tipo": {"type": "string", "enum": ["compito", "verifica", "interrogazione"]}},
                                "required": ["cosa", "tipo"]}}},
                            "required": ["voci"]}}],
             "messages": [{"role": "user", "content": [
                 {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.b64encode(dati_foto).decode()}},
                 {"type": "text", "text": "Ecco la pagina del diario."}]}]}
    dati, uso = ch.strumento(chiave, corpo, "voci", "sm_dia_err")
    lista = el.leggi_json(_file(base), []) or []
    gia = {(v.get("materia", "").lower(), v.get("cosa", "").lower(), v.get("per", "")) for v in lista}
    n = 0
    for v in dati.get("voci") or []:
        voce = aggiungi_voce(v, salva=False)
        if not voce or (voce["materia"].lower(), voce["cosa"].lower(), voce["per"]) in gia:
            continue
        lista.append(voce)
        n += 1
    _salva(base, lista)
    return {"nuovi": n, "spesa": ch._costo(uso)}


def aggiungi_voce(v, base=None, salva=True):
    cosa = str(v.get("cosa") or "").strip()[:300]
    if not cosa:
        return None
    per = str(v.get("per") or "").strip()[:10]
    try:
        datetime.date.fromisoformat(per)
    except ValueError:
        per = ""
    voce = {"id": uuid.uuid4().hex[:10], "materia": str(v.get("materia") or "").strip()[:60], "cosa": cosa, "per": per,
            "tipo": v.get("tipo") if v.get("tipo") in ("compito", "verifica", "interrogazione") else "compito",
            "fatto": False, "quando": datetime.datetime.now().isoformat(timespec="seconds")}
    if v.get("fonte"):                    # «Annulla» dopo «Togli»: torna com'era, anche da quale lezione arrivava
        voce["fonte"] = str(v["fonte"])[:120]
    if salva and base is not None:
        lista = el.leggi_json(_file(base), []) or []
        lista.append(voce)
        _salva(base, lista)
    return voce


def segna(base, vid, fatto=None, togli=False):
    lista = el.leggi_json(_file(base), []) or []
    if togli:
        lista = [v for v in lista if v.get("id") != vid]
    else:
        for v in lista:
            if v.get("id") == vid:
                v["fatto"] = bool(fatto)
    _salva(base, lista)
    return compiti(base)


def da_ricordare(base):
    """Le voci non fatte per oggi e per domani (il promemoria all'apertura)."""
    oggi = datetime.date.today()
    domani = (oggi + datetime.timedelta(days=1)).isoformat()
    return [v for v in compiti(base) if not v.get("fatto") and v.get("per") in (oggi.isoformat(), domani)]


# ------------------------------------------------------------------ il diario si scrive da solo
# Dalla registrazione di una lezione: i compiti assegnati e le verifiche annunciate dal prof vanno in «Compiti».

def compiti_da_lezione(chiave, base, cartella):
    """Legge la trascrizione di UNA lezione e aggiunge all'elenco i compiti e le verifiche annunciati. {"nuovi", "spesa"}."""
    cart = Path(cartella)
    info = el.leggi_json(cart / "info.json", {}) or {}
    testo = ch.testo_lezione(cart)
    if len(testo.strip()) < 40:
        return {"nuovi": 0, "spesa": 0.0}
    try:
        giorno = datetime.datetime.fromisoformat(str(info.get("inizio") or "")).date()
    except ValueError:
        giorno = datetime.date.today()
    materia = str(info.get("materia") or "")
    # la fine della lezione e' dove di solito si danno i compiti: se e' lunga tengo l'inizio e soprattutto la fine
    if len(testo) > 60000:
        testo = testo[:15000] + "\n[…]\n" + testo[-45000:]
    corpo = {"model": ch.MODELLO, "max_tokens": 2000,
             "system": ("Ti mando la trascrizione di una lezione registrata da uno studente. Trova SOLO i compiti che il docente "
                        "ASSEGNA (esercizi, pagine da studiare, temi, ricerche) e le verifiche o interrogazioni che ANNUNCIA, con il "
                        f"giorno per cui sono. La lezione e' di {GIORNI_IT[giorno.weekday()]} {giorno.isoformat()}: scrivi le date come "
                        "AAAA-MM-GG («per giovedi'» = il primo giovedi' dopo la lezione; «per la prossima volta» senza giorno = data "
                        "vuota). Non inventare: se il docente non assegna niente, la lista e' vuota. «cosa» breve e chiaro. "
                        f"Materia della lezione: {materia or 'non indicata'}. Scrivi in {_lingua()}. Rispondi con lo strumento «compiti»."),
             "tools": [{"name": "compiti", "description": "Compiti assegnati e verifiche annunciate nella lezione.",
                        "input_schema": {"type": "object", "properties": {
                            "voci": {"type": "array", "items": {"type": "object", "properties": {
                                "cosa": {"type": "string"}, "per": {"type": "string", "description": "AAAA-MM-GG o vuoto"},
                                "tipo": {"type": "string", "enum": ["compito", "verifica", "interrogazione"]}},
                                "required": ["cosa", "tipo"]}}},
                            "required": ["voci"]}}],
             "messages": [{"role": "user", "content": testo}]}
    # una lezione senza compiti e' normale: lista vuota accettata (niente strumento(), che riproverebbe)
    r = ch._chiama(chiave, dict(corpo, tool_choice={"type": "tool", "name": "compiti"}))
    blocco = next((b for b in r.get("content", []) if b.get("type") == "tool_use"), None)
    voci = ((blocco or {}).get("input") or {}).get("voci") or []
    lista = el.leggi_json(_file(base), []) or []
    gia = {(v.get("materia", "").lower(), v.get("cosa", "").lower(), v.get("per", "")) for v in lista}
    n = 0
    for v in voci if isinstance(voci, list) else []:
        if not isinstance(v, dict):
            continue
        voce = aggiungi_voce({**v, "materia": materia}, salva=False)
        if not voce or (voce["materia"].lower(), voce["cosa"].lower(), voce["per"]) in gia:
            continue
        voce["fonte"] = str(info.get("nome") or cart.name)[:120]
        lista.append(voce)
        n += 1
    _salva(base, lista)
    return {"nuovi": n, "spesa": ch._costo(r.get("usage", {}))}


def lezioni_da_leggere(base, giorni=21):
    """Le lezioni pronte e trascritte degli ultimi giorni non ancora lette per i compiti."""
    limite = datetime.date.today() - datetime.timedelta(days=giorni)
    out = []
    try:
        cartelle = [p for p in Path(base).iterdir() if p.is_dir() and (p / "info.json").exists()]
    except OSError:
        return out
    for c in cartelle:
        info = el.leggi_json(c / "info.json", {}) or {}
        if info.get("stato") != "pronta" or info.get("compiti_letti") or info.get("tipo", "lezione") != "lezione":
            continue
        try:
            if datetime.datetime.fromisoformat(str(info.get("inizio") or "")).date() < limite:
                continue
        except ValueError:
            continue
        if any(c.glob("trascrizione_*.json")):
            out.append(c)
    return out
