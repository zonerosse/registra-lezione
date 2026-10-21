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
    corpo = dict(corpo, tool_choice={"type": "tool", "name": "testo_corretto"})
    r = ch._chiama(chiave, corpo)
    uso = r.get("usage") or {}
    dati = ch.input_di(r, corpo)
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
    for k in ("cartella", "frase", "sec", "pezzi", "ricorda"):
        if v.get(k) not in (None, ""):
            voce[k] = v[k]
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
                        f"In «frase» copia la frase del docente cosi' com'e' nella trascrizione e in «ora» l'orario di quella riga. "
                        f"Materia della lezione: {materia or 'non indicata'}. Scrivi in {_lingua()}. Rispondi con lo strumento «compiti»."),
             "tools": [{"name": "compiti", "description": "Compiti assegnati e verifiche annunciate nella lezione.",
                        "input_schema": {"type": "object", "properties": {
                            "voci": {"type": "array", "items": {"type": "object", "properties": {
                                "cosa": {"type": "string"}, "per": {"type": "string", "description": "AAAA-MM-GG o vuoto"},
                                "tipo": {"type": "string", "enum": ["compito", "verifica", "interrogazione"]},
                                "frase": {"type": "string", "description": "la frase del docente, parola per parola come nella trascrizione"},
                                "ora": {"type": "string", "description": "l'orario [hh:mm:ss] della riga in cui lo dice"}},
                                "required": ["cosa", "tipo"]}}},
                            "required": ["voci"]}}],
             "messages": [{"role": "user", "content": testo}]}
    # una lezione senza compiti e' normale: lista vuota accettata (niente strumento(), che riproverebbe)
    corpo = dict(corpo, tool_choice={"type": "tool", "name": "compiti"})
    r = ch._chiama(chiave, corpo)
    voci = ch.input_di(r, corpo).get("voci") or []
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
        voce["cartella"] = str(cart)
        if v.get("frase"):
            voce["frase"] = str(v["frase"]).strip()[:400]
        sec = _sec(v.get("ora"))
        if sec is not None:
            voce["sec"] = sec
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


# ------------------------------------------------------------------ le formule delle mie lezioni
# Il formulario si riempie da solo: le formule dette o scritte dal prof nelle lezioni registrate (anche quelle nelle foto
# della lavagna e delle slide fatte in aula), e quelle delle foto del libro o del quaderno. Ognuna ricorda da dove arriva.

_STRUMENTO_FORMULE = {
    "name": "formule", "description": "Le formule trovate.",
    "input_schema": {"type": "object", "properties": {
        "formule": {"type": "array", "items": {"type": "object", "properties": {
            "nome": {"type": "string", "description": "a cosa si riferisce, 2-5 parole (es. «Area del trapezio», «Legge di Ohm»)"},
            "formula": {"type": "string", "description": "la formula scritta leggibile, con × ÷ π ² √ (es. «A = (B + b) × h ÷ 2»)"},
            "lettura": {"type": "string", "description": "come si legge ad alta voce, per intero (es. «area uguale base maggiore piu' base minore, per altezza, diviso 2»)"},
            "simboli": {"type": "string", "description": "cosa vuol dire ogni lettera, breve (es. «B = base maggiore, b = base minore, h = altezza»)"},
            "argomento": {"type": "string", "description": "il gruppo: geometria, algebra, fisica, chimica, unita' di misura..."},
            "ora": {"type": "string", "description": "solo per le lezioni: l'orario [hh:mm:ss] della riga in cui il docente la dice o la scrive"}},
            "required": ["nome", "formula", "lettura"]}}},
        "required": ["formule"]}}

_REGOLE_FORMULE = ("Prendi SOLO formule vere (matematica, geometria, fisica, chimica, conversioni di unita' di misura), non le "
                   "frasi normali e non i singoli calcoli con i numeri di un esercizio (es. «12 × 5 = 60» NO, «A = b × h» SI'). "
                   "Se una formula compare piu' volte mettila una volta sola. Se non ce ne sono, la lista e' vuota: non inventare. "
                   "Scrivi le formule in modo leggibile per uno studente con dislessia o discalculia (× invece di *, ÷ invece di /, "
                   "² e √ veri). Scrivi in {lingua}. Rispondi con lo strumento «formule».")


def _file_formule(base):
    return Path(base) / "formule.json"


def formule(base):
    """Le formule salvate, raggruppabili per materia/argomento (le piu' nuove prima dentro ogni gruppo)."""
    lista = el.leggi_json(_file_formule(base), []) or []
    lista = [f for f in lista if isinstance(f, dict) and f.get("id") and f.get("formula")]
    return sorted(lista, key=lambda f: (f.get("materia") or "~", f.get("argomento") or "~", f.get("quando") or ""), reverse=False)


def _chiave_formula(s):
    return "".join(ch_ for ch_ in str(s).lower() if ch_.isalnum() or ch_ in "×÷+-=²√π()")


def _sec(ora):
    try:
        p = [int(x) for x in str(ora).strip("[] ").split(":")]
        return p[0] * 3600 + p[1] * 60 + p[2] if len(p) == 3 else p[0] * 60 + p[1] if len(p) == 2 else None
    except (ValueError, IndexError):
        return None


def _aggiungi_formule(base, trovate, fonte):
    """Aggiunge le formule nuove (le doppie no). Torna quante sono entrate."""
    lista = el.leggi_json(_file_formule(base), []) or []
    gia = {_chiave_formula(f.get("formula")) for f in lista if isinstance(f, dict)}
    n = 0
    for f in trovate if isinstance(trovate, list) else []:
        if not isinstance(f, dict):
            continue
        formula = str(f.get("formula") or "").strip()[:200]
        k = _chiave_formula(formula)
        if len(k) < 3 or ("=" not in formula and "→" not in formula) or k in gia:
            continue
        gia.add(k)
        voce = {"id": uuid.uuid4().hex[:10], "nome": str(f.get("nome") or "").strip()[:80], "formula": formula,
                "lettura": str(f.get("lettura") or formula).strip()[:400], "simboli": str(f.get("simboli") or "").strip()[:300],
                "argomento": str(f.get("argomento") or "").strip()[:40], "materia": fonte.get("materia", "")[:60],
                "fonte": dict(fonte), "quando": datetime.datetime.now().isoformat(timespec="seconds")}
        s = _sec(f.get("ora")) if fonte.get("tipo") == "lezione" else None
        if s is not None:
            voce["fonte"]["sec"] = s
        lista.append(voce)
        n += 1
    el.scrivi_json(_file_formule(base), lista)
    return n


def _chiedi_formule(chiave, corpo):
    # una lezione o una pagina senza formule e' normale: lista vuota accettata (niente strumento(), che riproverebbe)
    corpo = dict(corpo, tools=[_STRUMENTO_FORMULE], tool_choice={"type": "tool", "name": "formule"})
    r = ch._chiama(chiave, corpo)
    trovate = [f for f in ch.input_di(r, corpo).get("formule") or [] if isinstance(f, dict)]
    return trovate, ch._costo(r.get("usage", {}))


def formule_da_lezione(chiave, base, cartella):
    """Le formule di UNA lezione registrata (trascrizione + foto della lavagna/slide fatte in aula). {"nuove", "spesa"}."""
    cart = Path(cartella)
    info = el.leggi_json(cart / "info.json", {}) or {}
    testo = ch.testo_lezione(cart)
    if len(testo.strip()) < 40:
        return {"nuove": 0, "spesa": 0.0}
    testo = testo[:200000]
    corpo = {"model": ch.MODELLO, "max_tokens": 4000,
             "system": ("Ti mando la trascrizione di una lezione registrata da uno studente (con gli orari), e in fondo cosa c'e' "
                        "scritto nelle foto della lavagna e delle slide. Trova le formule che il docente spiega, detta o scrive. "
                        "La trascrizione e' automatica: una formula detta a voce («l'area e' base per altezza diviso due») va "
                        "riscritta come formula. Per ognuna metti l'orario della riga in cui la dice o la scrive. "
                        + _REGOLE_FORMULE.format(lingua=_lingua())),
             "messages": [{"role": "user", "content": testo}]}
    trovate, spesa = _chiedi_formule(chiave, corpo)
    try:
        giorno = datetime.datetime.fromisoformat(str(info.get("inizio") or "")).date().isoformat()
    except ValueError:
        giorno = ""
    fonte = {"tipo": "lezione", "nome": str(info.get("nome") or cart.name)[:120], "cartella": str(cart), "data": giorno,
             "materia": str(info.get("materia") or "")}
    return {"nuove": _aggiungi_formule(base, trovate, fonte), "spesa": spesa}


def formule_da_foto(chiave, base, foto, dove="libro", pagina="", materia=""):
    """Le formule di una foto: dove = "libro" (pagina del libro), "lavagna" (lavagna o slide), "quaderno". {"nuove", "spesa"}."""
    import base64
    dati_foto = ch.jpeg_ridotto(foto)
    cosa = {"lavagna": "di una lavagna o di una slide proiettata", "quaderno": "di una pagina del quaderno"}.get(dove, "di una pagina del libro")
    corpo = {"model": ch.MODELLO, "max_tokens": 3000,
             "system": f"Ti mando la foto {cosa} di uno studente. Trova le formule che ci sono. " + _REGOLE_FORMULE.format(lingua=_lingua()),
             "messages": [{"role": "user", "content": [
                 {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.b64encode(dati_foto).decode()}},
                 {"type": "text", "text": "Ecco la foto."}]}]}
    trovate, spesa = _chiedi_formule(chiave, corpo)
    fonte = {"tipo": dove if dove in ("lavagna", "quaderno") else "libro", "pagina": str(pagina or "").strip()[:12],
             "data": datetime.date.today().isoformat(), "materia": str(materia or "").strip()}
    return {"nuove": _aggiungi_formule(base, trovate, fonte), "spesa": spesa}


def togli_formula(base, fid):
    """Toglie una formula e la restituisce (per «Annulla»)."""
    lista = el.leggi_json(_file_formule(base), []) or []
    tolta = next((f for f in lista if isinstance(f, dict) and f.get("id") == fid), None)
    el.scrivi_json(_file_formule(base), [f for f in lista if not (isinstance(f, dict) and f.get("id") == fid)])
    return tolta


def rimetti_formula(base, voce):
    """«Annulla» dopo «Togli»: la formula torna com'era, con la sua provenienza."""
    if not isinstance(voce, dict) or not voce.get("id") or not voce.get("formula"):
        return False
    lista = el.leggi_json(_file_formule(base), []) or []
    if not any(isinstance(f, dict) and f.get("id") == voce["id"] for f in lista):
        lista.append(voce)
        el.scrivi_json(_file_formule(base), lista)
    return True


def lezioni_per_formule(base, giorni=60):
    """Le lezioni pronte e trascritte degli ultimi giorni non ancora lette per le formule."""
    limite = datetime.date.today() - datetime.timedelta(days=giorni)
    out = []
    try:
        cartelle = [p for p in Path(base).iterdir() if p.is_dir() and (p / "info.json").exists()]
    except OSError:
        return out
    for c in cartelle:
        info = el.leggi_json(c / "info.json", {}) or {}
        if info.get("stato") != "pronta" or info.get("formule_lette") or info.get("tipo", "lezione") != "lezione":
            continue
        try:
            if datetime.datetime.fromisoformat(str(info.get("inizio") or "")).date() < limite:
                continue
        except ValueError:
            continue
        if any(c.glob("trascrizione_*.json")):
            out.append(c)
    return out


# ------------------------------------------------------------------ la scheda del compito: modifica, pezzi, promemoria

def modifica(base, vid, campi):
    """Cambia testo, materia, data o tipo di una voce."""
    lista = el.leggi_json(_file(base), []) or []
    for v in lista:
        if v.get("id") != vid:
            continue
        if "cosa" in campi and str(campi["cosa"]).strip():
            v["cosa"] = str(campi["cosa"]).strip()[:300]
        if "materia" in campi:
            v["materia"] = str(campi["materia"] or "").strip()[:60]
        if "per" in campi:
            per = str(campi["per"] or "").strip()[:10]
            try:
                datetime.date.fromisoformat(per)
            except ValueError:
                per = ""
            v["per"] = per
        if campi.get("tipo") in ("compito", "verifica", "interrogazione"):
            v["tipo"] = campi["tipo"]
    _salva(base, lista)
    return compiti(base)


def _pezzi_semplici(cosa):
    """Senza Claude: esercizi elencati diventano un pezzo ciascuno, con una pausa a meta'."""
    import re
    numeri = re.findall(r"\b\d+\b", cosa.split(" pag")[0]) if re.search(r"eserciz", cosa, re.I) else []
    if len(numeri) >= 2:
        pz = [{"t": f"Esercizio {n}", "m": 10} for n in numeri[:8]]
        if len(pz) >= 3:
            pz.insert(len(pz) // 2, {"t": "Pausa", "m": 5, "pausa": True})
        return pz
    return [{"t": "Leggi bene cosa devi fare", "m": 5}, {"t": cosa[:120], "m": 25}, {"t": "Ricontrolla", "m": 5}]


def pezzi(chiave, base, vid, rifai=False):
    """Il compito diviso in pezzi brevi con i minuti. Si salva nella voce (Claude una volta sola)."""
    lista = el.leggi_json(_file(base), []) or []
    v = next((x for x in lista if x.get("id") == vid), None)
    if not v:
        return {"pezzi": [], "spesa": 0.0}
    if v.get("pezzi") and not rifai:
        return {"pezzi": v["pezzi"], "spesa": 0.0}
    spesa = 0.0
    pz = None
    if chiave:
        corpo = {"model": ch.MODELLO, "max_tokens": 1200,
                 "system": ("Uno studente con dislessia o discalculia deve fare questo compito a casa. Dividilo in pezzi brevi (da 2 a 6), "
                            "in ordine, ognuno con i minuti che servono (da 5 a 20). Se e' lungo metti una pausa di 5 minuti a meta' "
                            "(titolo «Pausa», pausa: true). Titoli brevissimi e concreti (es. «Esercizio 3», «Rileggi l'esempio»). "
                            f"Scrivi in {_lingua()}. Rispondi con lo strumento «pezzi»."),
                 "tools": [{"name": "pezzi", "description": "Il compito diviso in pezzi.",
                            "input_schema": {"type": "object", "properties": {"pezzi": {"type": "array", "items": {"type": "object", "properties": {
                                "t": {"type": "string"}, "m": {"type": "integer"}, "pausa": {"type": "boolean"}}, "required": ["t", "m"]}}},
                                "required": ["pezzi"]}}],
                 "messages": [{"role": "user", "content": f"Materia: {v.get('materia') or '-'}\nCompito: {v.get('cosa')}"}]}
        try:
            dati, uso = ch.strumento(chiave, corpo, "pezzi", "sm_pb_err")
            spesa = ch._costo(uso)
            pz = [{"t": str(x.get("t") or "")[:120], "m": max(2, min(60, int(x.get("m") or 10))), **({"pausa": True} if x.get("pausa") else {})}
                  for x in dati.get("pezzi") or [] if x.get("t")][:8]
        except Exception:
            pz = None
    v["pezzi"] = pz or _pezzi_semplici(str(v.get("cosa") or ""))
    _salva(base, lista)
    return {"pezzi": v["pezzi"], "spesa": spesa}


def pezzo(base, vid, i, fatto):
    lista = el.leggi_json(_file(base), []) or []
    for v in lista:
        if v.get("id") == vid and 0 <= int(i) < len(v.get("pezzi") or []):
            v["pezzi"][int(i)]["f"] = bool(fatto)
    _salva(base, lista)
    return compiti(base)


def ricordami(base, vid, quando):
    """«Ricordamelo»: AAAA-MM-GGTHH:MM (vuoto = togli il promemoria)."""
    lista = el.leggi_json(_file(base), []) or []
    q = str(quando or "").strip()[:16]
    try:
        datetime.datetime.fromisoformat(q)
    except ValueError:
        q = ""
    for v in lista:
        if v.get("id") == vid:
            if q:
                v["ricorda"] = q
            else:
                v.pop("ricorda", None)
    _salva(base, lista)
    return compiti(base)


def promemoria_ora(base):
    """Le voci con «Ricordamelo» arrivato (e non ancora fatte): il programma le mostra e toglie il promemoria."""
    adesso = datetime.datetime.now().isoformat(timespec="minutes")
    lista = el.leggi_json(_file(base), []) or []
    pronti = [v for v in lista if v.get("ricorda") and v["ricorda"] <= adesso and not v.get("fatto")]
    if pronti:
        for v in pronti:
            v.pop("ricorda", None)
        _salva(base, lista)
    return pronti


# ------------------------------------------------------------------ Studia: voti della scuola, momenti segnati, cosa posso usare in verifica

def voti_scuola(base, materia=None):
    lista = el.leggi_json(Path(base) / "voti_scuola.json", []) or []
    lista = [v for v in lista if isinstance(v, dict) and v.get("id")]
    if materia:
        lista = [v for v in lista if str(v.get("materia") or "").lower() == str(materia).lower()]
    return sorted(lista, key=lambda v: v.get("data") or "")


def voto_nuovo(base, v):
    try:
        voto = round(float(str(v.get("voto")).replace(",", ".")), 2)
    except (TypeError, ValueError):
        return None
    if not 0 <= voto <= 10:
        return None
    data = str(v.get("data") or "")[:10]
    try:
        datetime.date.fromisoformat(data)
    except ValueError:
        data = datetime.date.today().isoformat()
    x = {"id": uuid.uuid4().hex[:10], "materia": str(v.get("materia") or "").strip()[:60], "voto": voto, "data": data,
         "tipo": v.get("tipo") if v.get("tipo") in ("scritto", "orale", "pratico") else "scritto", "nota": str(v.get("nota") or "").strip()[:120]}
    lista = el.leggi_json(Path(base) / "voti_scuola.json", []) or []
    lista.append(x)
    el.scrivi_json(Path(base) / "voti_scuola.json", lista)
    return x


def voto_togli(base, vid):
    lista = el.leggi_json(Path(base) / "voti_scuola.json", []) or []
    tolto = next((v for v in lista if v.get("id") == vid), None)
    el.scrivi_json(Path(base) / "voti_scuola.json", [v for v in lista if v.get("id") != vid])
    return tolto


def momenti(base, materia, tipi=("chiarire",)):
    """I momenti segnati durante le lezioni di una materia (di base «Non ho capito»), dal piu' recente."""
    out = []
    try:
        cartelle = [p for p in Path(base).iterdir() if p.is_dir() and (p / "note.json").exists()]
    except OSError:
        return out
    for c in cartelle:
        info = el.leggi_json(c / "info.json", {}) or {}
        if materia and str(info.get("materia") or "").lower() != str(materia).lower():
            continue
        for n in el.leggi_json(c / "note.json", []) or []:
            if isinstance(n, dict) and (not tipi or n.get("tipo") in tipi):
                out.append({"cartella": str(c), "nome": info.get("nome", c.name), "inizio": info.get("inizio", ""), "sec": n.get("sec", 0),
                            "ora": n.get("ora", ""), "tipo": n.get("tipo", ""), "testo": n.get("testo", "")})
    return sorted(out, key=lambda x: (x["inizio"], x["sec"]), reverse=True)


VERIFICA_VOCI = ("mappe", "formulario", "calcolatrice", "tabelline", "tempo", "orale", "lettore", "meno")


def in_verifica(cfg):
    """Cosa il piano della scuola permette in verifica (Impostazioni): le voci spuntate."""
    v = cfg.get("sm_verifica")
    return [x for x in v if x in VERIFICA_VOCI] if isinstance(v, list) else ["mappe", "formulario", "calcolatrice", "tempo"]


# ------------------------------------------------------------------ Controlla il risultato (foto dello svolgimento)

def _voce(base, vid):
    lista = el.leggi_json(_file(base), []) or []
    return lista, next((v for v in lista if isinstance(v, dict) and v.get("id") == vid), None)


def controlla(chiave, base, vid, foto, testo=""):
    """Le foto dello svolgimento di un esercizio: Claude dice se il risultato e' giusto e, passo per passo, dove
    c'e' l'errore (con gentilezza, senza rifarlo al posto dello studente). Si salva nel compito. {"controllo", "spesa"}."""
    import base64
    lista, v = _voce(base, vid)
    consegna = str(testo or (v or {}).get("cosa") or "").strip()[:1500]
    contenuto = [{"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                              "data": base64.b64encode(ch.jpeg_ridotto(f)).decode()}} for f in foto[:4]]
    contenuto.append({"type": "text", "text": ("Il compito: " + consegna if consegna else "Il compito e' nella foto.")
                      + "\nEcco il mio svolgimento."})
    corpo = {"model": ch.MODELLO, "max_tokens": 3000,
             "system": ("Sei un tutor gentile per uno studente con dislessia o discalculia. Ti mando le foto del suo svolgimento "
                        "di un esercizio (matematica, fisica, geometria...) e, se c'e', il testo del compito. Controlla: "
                        "«esito» = giusto (risultato e passaggi corretti), quasi (un errore piccolo: un segno, un conto, l'unita' "
                        "di misura) o rivedere (errore di metodo). In «passi» riporta i suoi passaggi in ordine, ciascuno in "
                        "breve come l'ha scritto lui, con ok vero o falso; dove e' falso, «nota» spiega in una o due frasi corte "
                        "e gentili cosa non va e come accorgersene, SENZA dare il risultato giusto. «consiglio»: una frase per "
                        "rifarlo bene. «soluzione»: i passaggi giusti, brevi (li vede solo se li chiede). Se nella foto non si "
                        "legge, dillo nel consiglio e lascia i passi vuoti. "
                        f"Scrivi in {_lingua()}, frasi corte. Rispondi con lo strumento «controllo»."),
             "tools": [{"name": "controllo", "description": "Il controllo dello svolgimento.",
                        "input_schema": {"type": "object", "properties": {
                            "esito": {"type": "string", "enum": ["giusto", "quasi", "rivedere"]},
                            "risultato": {"type": "string", "description": "il risultato scritto dallo studente"},
                            "passi": {"type": "array", "items": {"type": "object", "properties": {
                                "testo": {"type": "string"}, "ok": {"type": "boolean"}, "nota": {"type": "string"}},
                                "required": ["testo", "ok"]}},
                            "consiglio": {"type": "string"},
                            "soluzione": {"type": "array", "items": {"type": "string"}}},
                            "required": ["esito", "passi", "consiglio"]}}],
             "messages": [{"role": "user", "content": contenuto}]}
    corpo = dict(corpo, tool_choice={"type": "tool", "name": "controllo"})
    r = ch._chiama(chiave, corpo)
    d = ch.input_di(r, corpo)
    esito = d.get("esito") if d.get("esito") in ("giusto", "quasi", "rivedere") else "rivedere"
    out = {"esito": esito, "risultato": str(d.get("risultato") or "")[:200],
           "passi": [{"testo": str(p.get("testo") or "")[:300], "ok": str(p.get("ok")).strip().lower() not in ("false", "no", "0", "none"), "nota": str(p.get("nota") or "")[:400]}
                     for p in d.get("passi") or [] if isinstance(p, dict) and str(p.get("testo") or "").strip()][:15],
           "consiglio": str(d.get("consiglio") or "")[:400],
           "soluzione": [str(x)[:300] for x in d.get("soluzione") or [] if str(x).strip()][:12],
           "quando": datetime.datetime.now().isoformat(timespec="minutes")}
    if v is not None:
        v["controllo"] = out
        _salva(base, lista)
    return {"controllo": out, "spesa": ch._costo(r.get("usage") or {})}


# ------------------------------------------------------------------ Scaletta (i punti in ordine prima di scrivere)

def scaletta(chiave, base, vid, consegna="", idee=""):
    """La scaletta di un tema, riassunto, relazione o risposta aperta: i punti in ordine, ciascuno con una domanda
    che aiuta a scriverlo e 2-3 parole chiave. Le idee dello studente vanno messe al posto giusto. Si salva nel compito."""
    lista, v = _voce(base, vid)
    consegna = str(consegna or (v or {}).get("cosa") or "").strip()[:1500]
    idee = str(idee or "").strip()[:4000]
    materia = str((v or {}).get("materia") or "")
    corpo = {"model": ch.MODELLO, "max_tokens": 2500,
             "system": ("Sei un tutor per uno studente con dislessia che deve scrivere un testo (tema, riassunto, relazione, "
                        "risposta aperta, lettera...). Prepara la SCALETTA: da 4 a 7 punti in ordine (inizio, parte centrale, "
                        "fine). Per ogni punto: «titolo» di 2-5 parole, «domanda» = una domanda semplice a cui rispondere per "
                        "scrivere quel pezzo, «parole» = 2-3 parole chiave. Se lo studente ha scritto delle idee, mettile nel "
                        "punto giusto («sue» = le sue idee per quel punto, con le sue parole). Non scrivere il testo al suo "
                        "posto. «tipo» = che testo e' (es. tema argomentativo), «consiglio» = una frase su quanto scrivere. "
                        f"Scrivi in {_lingua()}, frasi corte. Rispondi con lo strumento «scaletta»."),
             "tools": [{"name": "scaletta", "description": "La scaletta.",
                        "input_schema": {"type": "object", "properties": {
                            "tipo": {"type": "string"},
                            "punti": {"type": "array", "items": {"type": "object", "properties": {
                                "titolo": {"type": "string"}, "domanda": {"type": "string"},
                                "parole": {"type": "array", "items": {"type": "string"}},
                                "sue": {"type": "array", "items": {"type": "string"}}},
                                "required": ["titolo", "domanda"]}},
                            "consiglio": {"type": "string"}},
                            "required": ["punti"]}}],
             "messages": [{"role": "user", "content": (f"Materia: {materia}\n" if materia else "") + f"Cosa devo scrivere: {consegna}"
                           + (f"\nLe mie idee: {idee}" if idee else "")}]}
    dati, uso = ch.strumento(chiave, corpo, "punti", "sm_pb_err")
    out = {"tipo": str(dati.get("tipo") or "")[:80], "consiglio": str(dati.get("consiglio") or "")[:300],
           "punti": [{"titolo": str(p.get("titolo") or "")[:80], "domanda": str(p.get("domanda") or "")[:300],
                      "parole": [str(x)[:40] for x in p.get("parole") or []][:4], "sue": [str(x)[:300] for x in p.get("sue") or []][:5]}
                     for p in dati.get("punti") or [] if isinstance(p, dict) and str(p.get("titolo") or "").strip()][:9],
           "idee": idee, "quando": datetime.datetime.now().isoformat(timespec="minutes")}
    if v is not None:
        v["scaletta"] = out
        _salva(base, lista)
    return {"scaletta": out, "spesa": ch._costo(uso)}


def scaletta_ordine(base, vid, ordine):
    """Lo studente sposta i punti: si salva il nuovo ordine (indici della scaletta di prima)."""
    lista, v = _voce(base, vid)
    if v and isinstance(v.get("scaletta"), dict):
        p = v["scaletta"].get("punti") or []
        try:
            nuovi = [p[int(i)] for i in ordine if 0 <= int(i) < len(p)]
        except (TypeError, ValueError):
            nuovi = p
        if len(nuovi) == len(p):
            v["scaletta"]["punti"] = nuovi
            _salva(base, lista)
    return compiti(base)
