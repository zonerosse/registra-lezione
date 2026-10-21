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

import appunti as ap
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
        if "voto" in campi:          # il voto preso (dalla scheda della verifica)
            v["voto"] = str(campi["voto"] or "").strip()[:12]
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
    pronti = [v for v in lista if isinstance(v, dict) and v.get("ricorda") and v["ricorda"] <= adesso and not v.get("fatto")]
    for v in pronti:
        v.pop("ricorda", None)
    ogni = _ogni_pronti(lista, datetime.datetime.now())      # «Ricordamelo ogni giorno» delle verifiche
    if pronti or ogni:
        _salva(base, lista)
    return pronti + [v for v in ogni if v not in pronti]


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


# ------------------------------------------------------------------ Verifica: cosa porta, il piano, ricordamelo ogni giorno, correggi gli errori

def porta(base, vid, lez=None, pagine="", altro=""):
    """«Cambia cosa porta»: le lezioni scelte (cartelle), le pagine del libro e altro, scritti dallo studente."""
    lista, v = _voce(base, vid)
    if v is not None:
        lz = [str(x)[:400] for x in (lez or []) if str(x).strip()][:30]
        v["porta"] = {"lez": lz, "pagine": str(pagine or "").strip()[:120], "altro": str(altro or "").strip()[:300]}
        _salva(base, lista)
    return compiti(base)


# i pezzi del piano: f = l'azione che apre la scheda (come nei riquadri), m = minuti
_PZ_IT = {"ap": "Ascolta gli appunti: {n}", "mappa": "Guarda la mappa: {n}", "flash": "Flashcard", "test": "Test a crocette",
          "sbag": "Le domande che sbagli", "orale": "Interrogazione a voce", "mverif": "Ripasso veloce con la mappa per la verifica",
          "rg": "Ripasso del giorno"}
_PZ_EN = {"ap": "Listen to the notes: {n}", "mappa": "Look at the map: {n}", "flash": "Flashcards", "test": "Multiple-choice test",
          "sbag": "The questions you get wrong", "orale": "Oral test", "mverif": "Quick review with the test map", "rg": "Daily review"}


def piano_verifica(base, vid, minuti=30, giorni=None, lezioni=None, oggi=None):
    """«Rifai il piano»: da oggi al giorno prima della verifica, nei giorni scelti (0 = lunedi'), con i minuti al giorno.
    Senza Claude: ogni lezione (ascolta + mappa), poi flashcard, test e domande sbagliate; l'ultimo giorno ripasso veloce
    e interrogazione. Se non ci sta, i minuti crescono (si dice di quanto). Si salva nella voce."""
    lista, v = _voce(base, vid)
    if v is None:
        return compiti(base)
    T = _PZ_EN if testi.LINGUA == "en" else _PZ_IT
    oggi = oggi or datetime.date.today()
    try:
        minuti = max(10, min(120, int(minuti)))
    except (TypeError, ValueError):
        minuti = 30
    gs = {int(g) for g in (giorni if giorni is not None else range(6)) if str(g).strip().lstrip("-").isdigit() and 0 <= int(g) <= 6} or set(range(7))
    try:
        fine = datetime.date.fromisoformat(v.get("per") or "")
    except ValueError:
        fine = oggi + datetime.timedelta(days=7)
    giorni_ok = [oggi + datetime.timedelta(days=i) for i in range(max(1, (fine - oggi).days))]
    giorni_ok = [g for g in giorni_ok if g.weekday() in gs] or [oggi]
    lez = [x for x in (lezioni or []) if isinstance(x, dict) and x.get("c")][:12]
    coda = []
    for x in lez:
        nome = str(x.get("nome") or "")[:80]
        coda.append({"f": "l:appunti_dsa", "c": x["c"], "t": T["ap"].format(n=nome), "m": 15})
        coda.append({"f": "l:mappa", "c": x["c"], "t": T["mappa"].format(n=nome), "m": 10})
    coda += [{"f": "m:fcorso", "t": T["flash"], "m": 15}, {"f": "m:test", "t": T["test"], "m": 15}, {"f": "sbag", "t": T["sbag"], "m": 10}]
    ultimo = [{"f": "m:mverif", "t": T["mverif"], "m": 10}, {"f": "m:orale", "t": T["orale"], "m": 15}]
    # poco tempo: si tengono le cose che servono di piu' (prima le mappe al posto degli appunti, poi via test e flashcard)
    posto = len(giorni_ok) * minuti * 1.25
    tolto = False
    for via in ("l:appunti_dsa", "m:test", "m:fcorso"):
        if sum(p["m"] for p in coda + ultimo) <= posto:
            break
        coda = [p for p in coda if p["f"] != via]
        tolto = True
    studio = giorni_ok[:-1] if len(giorni_ok) > 1 else giorni_ok
    # i due pezzi della stessa lezione (ascolta + mappa) restano nello stesso giorno
    gruppi = []
    for p in coda:
        if gruppi and p.get("c") and gruppi[-1][0].get("c") == p["c"]:
            gruppi[-1].append(p)
        else:
            gruppi.append([p])
    coda = gruppi

    def riempi(budget):
        out, i = [], 0
        for g in studio:
            cose, m = [], 0
            while i < len(coda) and (m + sum(x["m"] for x in coda[i]) <= budget or not cose):
                cose += [dict(x) for x in coda[i]]; m += sum(x["m"] for x in coda[i]); i += 1
            out.append({"g": g.isoformat(), "cose": cose or [{"f": "rg", "t": T["rg"], "m": min(10, minuti)}]})
        return out, i
    budget = minuti if len(giorni_ok) > 1 else 999
    giorni_out, i = riempi(budget)
    while i < len(coda) and budget < 240:       # non ci sta: qualche minuto in piu' al giorno, l'ordine resta quello
        budget += 5
        giorni_out, i = riempi(budget)
    for gr in coda[i:]:
        giorni_out[-1]["cose"] += [dict(x) for x in gr]
    if len(giorni_ok) > 1:
        giorni_out.append({"g": giorni_ok[-1].isoformat(), "cose": [dict(p) for p in ultimo]})
    else:
        giorni_out[0]["cose"] += [dict(p) for p in ultimo]
    for d in giorni_out:
        d["min"] = sum(p["m"] for p in d["cose"])
    v["piano"] = {"minuti": minuti, "giorni": sorted(gs), "di_piu": max(0, max(d["min"] for d in giorni_out) - minuti), "ridotto": tolto,
                  "fatto": datetime.datetime.now().isoformat(timespec="minutes"), "lista": giorni_out}
    _salva(base, lista)
    return compiti(base)


def piano_spunta(base, vid, g, i, fatto):
    """Spunta (o toglie la spunta a) un pezzo del piano: giorno g (AAAA-MM-GG), pezzo i."""
    lista, v = _voce(base, vid)
    p = (v or {}).get("piano") or {}
    for d in p.get("lista") or []:
        if d.get("g") == g and isinstance(i, int) and 0 <= i < len(d.get("cose") or []):
            d["cose"][i]["ok"] = bool(fatto)
            _salva(base, lista)
    return compiti(base)


def ogni_giorno(base, vid, ora):
    """«Ricordamelo ogni giorno» all'ora scelta (HH:MM) fino alla verifica; vuoto = togli."""
    lista, v = _voce(base, vid)
    o = str(ora or "").strip()[:5]
    try:
        datetime.time.fromisoformat(o)
    except ValueError:
        o = ""
    if v is not None:
        if o:
            v["ogni"] = o
        else:
            v.pop("ogni", None)
        _salva(base, lista)
    return compiti(base)


def _ogni_pronti(lista, adesso):
    """Le verifiche con «ogni giorno» arrivato oggi (una volta al giorno, fino al giorno della verifica compreso).
    Se c'e' un piano, solo nei giorni del piano."""
    oggi, ora = adesso.date().isoformat(), adesso.strftime("%H:%M")
    out = []
    for v in lista:
        if not isinstance(v, dict) or not v.get("ogni") or v.get("fatto") or v.get("ogni_ultimo") == oggi:
            continue
        if v.get("per") and oggi > v["per"]:
            continue
        piano = [d.get("g") for d in ((v.get("piano") or {}).get("lista") or [])]
        if piano and oggi not in piano:
            continue
        if ora >= v["ogni"]:
            v["ogni_ultimo"] = oggi
            out.append(v)
    return out


def correggi_verifica(chiave, base, vid, foto):
    """«Correggi gli errori»: le foto della verifica corretta dal prof. Claude trova il voto (se c'e'), cosa e' andato
    bene e ogni errore con la risposta giusta e il perche', in parole semplici. Si salva nella voce."""
    import base64
    lista, v = _voce(base, vid)
    materia = str((v or {}).get("materia") or "")
    contenuto = [{"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                              "data": base64.b64encode(ch.jpeg_ridotto(f)).decode()}} for f in foto[:6]]
    contenuto.append({"type": "text", "text": (f"Materia: {materia}. " if materia else "") + "Ecco la mia verifica corretta dal prof."})
    corpo = {"model": ch.MODELLO, "max_tokens": 4000,
             "system": ("Sei un tutor gentile per uno studente con dislessia. Ti mando le foto di una verifica gia' corretta dal "
                        "professore (segni rossi, crocette, voto). Leggi: «voto» = il voto scritto dal prof, com'e' scritto "
                        "(es. 6½, 7-, 8); vuoto se non c'e'. «bene» = in una frase cosa ha fatto bene. «errori» = ogni domanda o "
                        "esercizio segnato come sbagliato o incompleto: «domanda» breve, «tua» = cosa aveva scritto lui (breve), "
                        "«giusta» = la risposta giusta in parole semplici, «perche» = una o due frasi corte che spiegano l'errore "
                        "senza rimproverare. «consiglio» = una frase per la prossima verifica. Se non si legge, dillo nel consiglio. "
                        f"Scrivi in {_lingua()}, frasi corte. Rispondi con lo strumento «correzione»."),
             "tools": [{"name": "correzione", "description": "La verifica corretta, spiegata.",
                        "input_schema": {"type": "object", "properties": {
                            "voto": {"type": "string"}, "bene": {"type": "string"},
                            "errori": {"type": "array", "items": {"type": "object", "properties": {
                                "domanda": {"type": "string"}, "tua": {"type": "string"}, "giusta": {"type": "string"},
                                "perche": {"type": "string"}}, "required": ["domanda", "giusta"]}},
                            "consiglio": {"type": "string"}},
                            "required": ["errori"]}}],
             "messages": [{"role": "user", "content": contenuto}]}
    corpo = dict(corpo, tool_choice={"type": "tool", "name": "correzione"})
    r = ch._chiama(chiave, corpo)
    d = ch.input_di(r, corpo)
    out = {"voto": str(d.get("voto") or "").strip()[:12], "bene": str(d.get("bene") or "")[:300],
           "errori": [{"domanda": str(e.get("domanda") or "")[:300], "tua": str(e.get("tua") or "")[:300],
                       "giusta": str(e.get("giusta") or "")[:500], "perche": str(e.get("perche") or "")[:500], "ok": False}
                      for e in d.get("errori") or [] if isinstance(e, dict) and str(e.get("domanda") or "").strip()][:25],
           "consiglio": str(d.get("consiglio") or "")[:400], "quando": datetime.datetime.now().isoformat(timespec="minutes")}
    if v is not None:
        v["correzione"] = out
        _salva(base, lista)
    return {"correzione": out, "spesa": ch._costo(r.get("usage") or {})}


def errore_ok(base, vid, i, si):
    """«Ora la so» su un errore della verifica corretta."""
    lista, v = _voce(base, vid)
    e = ((v or {}).get("correzione") or {}).get("errori") or []
    if isinstance(i, int) and 0 <= i < len(e):
        e[i]["ok"] = bool(si)
        _salva(base, lista)
    return compiti(base)


def errori_materia(base, materia):
    """Gli errori delle verifiche corrette di una materia, non ancora segnati «Ora la so» (per «Le domande che sbagli»)."""
    out = []
    for v in compiti(base):
        if str(v.get("materia") or "").lower() != str(materia or "").lower():
            continue
        for i, e in enumerate(((v.get("correzione") or {}).get("errori")) or []):
            if isinstance(e, dict) and not e.get("ok"):
                out.append({"vid": v["id"], "i": i, "cosa": v.get("cosa", ""), **e})
    return out


# ------------------------------------------------------------------ Lingue facili: leggi e traduci, come si dice, le mie parole

LINGUE = {"en": "inglese", "fr": "francese", "es": "spagnolo", "de": "tedesco"}


def _ling_file(base):
    return Path(base) / "lingue.json"


def lingue_dati(base):
    d = el.leggi_json(_ling_file(base), {}) or {}
    if not isinstance(d, dict):
        d = {}
    d["parole"] = [p for p in d.get("parole") or [] if isinstance(p, dict) and p.get("id") and p.get("w")]
    d["testi"] = [x for x in d.get("testi") or [] if isinstance(x, dict) and x.get("frasi")][-10:]
    return d


def _ling_salva(base, d):
    el.scrivi_json(_ling_file(base), d)


_SCH_PAROLA = {"type": "object", "properties": {
    "w": {"type": "string", "description": "la parola o espressione nella lingua straniera"},
    "it": {"type": "string", "description": "il significato in italiano"},
    "pron": {"type": "string", "description": "come si legge, scritto come lo leggerebbe un italiano (es. «thìnk» -> «sink»)"}},
    "required": ["w", "it"]}


def lingue_traduci(chiave, base, testo="", foto=None, lingua=""):
    """«Leggi e traduci»: un testo in lingua straniera (scritto o fotografato), frase per frase, con la traduzione
    italiana e le parole difficili (significato e come si legge). Si tengono gli ultimi 10. {"testo", "spesa"}."""
    import base64
    contenuto = [{"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                              "data": base64.b64encode(ch.jpeg_ridotto(f)).decode()}} for f in (foto or [])[:4]]
    testo = str(testo or "").strip()[:6000]
    contenuto.append({"type": "text", "text": testo or "Il testo e' nella foto."})
    corpo = {"model": ch.MODELLO, "max_tokens": 6000,
             "system": ("Aiuti uno studente con dislessia a leggere un testo in lingua straniera (inglese, francese, spagnolo o "
                        "tedesco). Ricopia il testo diviso in frasi brevi, nell'ordine, senza cambiare le parole («orig»). Per "
                        "ogni frase: «it» = la traduzione italiana semplice e naturale; «parole» = da 0 a 3 parole o espressioni "
                        "difficili di quella frase, con il significato e come si legge scritto all'italiana. «lingua» = codice "
                        "della lingua del testo (en, fr, es, de). «titolo» = 2-5 parole in italiano su cosa parla. "
                        "Rispondi con lo strumento «testo»."),
             "tools": [{"name": "testo", "description": "Il testo diviso in frasi, tradotto.",
                        "input_schema": {"type": "object", "properties": {
                            "lingua": {"type": "string", "enum": list(LINGUE)}, "titolo": {"type": "string"},
                            "frasi": {"type": "array", "items": {"type": "object", "properties": {
                                "orig": {"type": "string"}, "it": {"type": "string"},
                                "parole": {"type": "array", "items": _SCH_PAROLA}}, "required": ["orig", "it"]}}},
                            "required": ["lingua", "frasi"]}}],
             "messages": [{"role": "user", "content": contenuto}]}
    if lingua in LINGUE:
        corpo["system"] += f" Il testo e' in {LINGUE[lingua]}."
    dati, uso = ch.strumento(chiave, corpo, "frasi", "sm_ling_err")
    lg = dati.get("lingua") if dati.get("lingua") in LINGUE else (lingua if lingua in LINGUE else "en")
    frasi = []
    for f in dati.get("frasi") or []:
        if isinstance(f, dict) and str(f.get("orig") or "").strip():
            frasi.append({"orig": str(f["orig"])[:600], "it": str(f.get("it") or "")[:600],
                          "parole": [{"w": str(p.get("w") or "")[:80], "it": str(p.get("it") or "")[:160], "pron": str(p.get("pron") or "")[:80]}
                                     for p in f.get("parole") or [] if isinstance(p, dict) and str(p.get("w") or "").strip()][:4]})
    out = {"id": uuid.uuid4().hex[:10], "lingua": lg, "titolo": str(dati.get("titolo") or "")[:80], "frasi": frasi[:80],
           "quando": datetime.datetime.now().isoformat(timespec="minutes")}
    d = lingue_dati(base)
    d["testi"] = (d["testi"] + [out])[-10:]
    _ling_salva(base, d)
    return {"testo": out, "spesa": ch._costo(uso)}


def lingue_dici(chiave, base, frase, lingua="en"):
    """«Come si dice»: una frase in italiano -> nella lingua scelta, con come si legge e 2 modi diversi di dirla."""
    lingua = lingua if lingua in LINGUE else "en"
    corpo = {"model": ch.MODELLO, "max_tokens": 1500,
             "system": (f"Uno studente italiano con dislessia vuole dire una cosa in {LINGUE[lingua]}. «frase» = come si dice, "
                        "semplice e naturale; «pron» = come si legge scritto all'italiana; «altre» = 1 o 2 altri modi di dirla "
                        "(ciascuno con «frase», «pron» e «quando» = in che situazione si usa, in italiano); «nota» = un consiglio "
                        "breve in italiano se serve (es. una parola che si scrive diversa da come si legge). "
                        "Rispondi con lo strumento «dici»."),
             "tools": [{"name": "dici", "description": "Come si dice.",
                        "input_schema": {"type": "object", "properties": {
                            "frase": {"type": "string"}, "pron": {"type": "string"}, "nota": {"type": "string"},
                            "altre": {"type": "array", "items": {"type": "object", "properties": {
                                "frase": {"type": "string"}, "pron": {"type": "string"}, "quando": {"type": "string"}}, "required": ["frase"]}}},
                            "required": ["frase"]}}],
             "messages": [{"role": "user", "content": str(frase or "").strip()[:500]}]}
    corpo = dict(corpo, tool_choice={"type": "tool", "name": "dici"})
    r = ch._chiama(chiave, corpo)
    dati, uso = ch.input_di(r, corpo), r.get("usage") or {}
    if not str(dati.get("frase") or "").strip():
        raise ap.ErroreAppunti(testi.tr("sm_ling_err"))
    out = {"it": str(frase or "").strip()[:500], "lingua": lingua, "frase": str(dati.get("frase") or "")[:500],
           "pron": str(dati.get("pron") or "")[:500], "nota": str(dati.get("nota") or "")[:300],
           "altre": [{"frase": str(a.get("frase") or "")[:500], "pron": str(a.get("pron") or "")[:500], "quando": str(a.get("quando") or "")[:160]}
                     for a in dati.get("altre") or [] if isinstance(a, dict) and str(a.get("frase") or "").strip()][:2]}
    return {"dici": out, "spesa": ch._costo(uso)}


def parola_nuova(base, p):
    """«Aggiungi a Le mie parole»: w (straniera), it, pron, lingua, esempio. Senza doppioni (stessa parola e lingua)."""
    w = str((p or {}).get("w") or "").strip()[:80]
    if not w:
        return lingue_dati(base)["parole"]
    d = lingue_dati(base)
    lg = p.get("lingua") if p.get("lingua") in LINGUE else "en"
    if not any(x["w"].lower() == w.lower() and x.get("lingua") == lg for x in d["parole"]):
        d["parole"].append({"id": uuid.uuid4().hex[:10], "w": w, "it": str(p.get("it") or "").strip()[:160],
                            "pron": str(p.get("pron") or "").strip()[:80], "lingua": lg, "es": str(p.get("es") or "").strip()[:300],
                            "so": 0, "quando": datetime.date.today().isoformat()})
        _ling_salva(base, d)
    return d["parole"]


def parola_esito(base, pid, so):
    """Ripasso delle parole: «La so» (+1, fino a 3 = imparata) o «Ancora» (torna a 0)."""
    d = lingue_dati(base)
    for x in d["parole"]:
        if x["id"] == pid:
            x["so"] = min(3, int(x.get("so") or 0) + 1) if so else 0
    _ling_salva(base, d)
    return d["parole"]


def parola_togli(base, pid):
    d = lingue_dati(base)
    tolta = next((x for x in d["parole"] if x["id"] == pid), None)
    d["parole"] = [x for x in d["parole"] if x["id"] != pid]
    _ling_salva(base, d)
    return d["parole"], tolta


def testo_togli(base, tid):
    d = lingue_dati(base)
    d["testi"] = [x for x in d["testi"] if x.get("id") != tid]
    _ling_salva(base, d)
    return d["testi"]


# ------------------------------------------------------------------ Famiglia: Detrazione del 19% (strumenti per DSA)
# Codice 44 del 730 (righi E8-E10): strumenti compensativi e sussidi tecnici e informatici, fino alla fine delle superiori.
# Servono: diagnosi DSA, fattura o scontrino parlante con il codice fiscale e cosa si e' comprato, il collegamento con il
# disturbo (nella diagnosi o in un certificato), la prova del pagamento. Qui si tiene solo l'elenco: niente consulenza.

DET_DOC = ("diagnosi", "collegamento", "fatture", "pagamenti", "online")
DET_PAG = ("carta", "bancomat", "bonifico", "app", "contanti")


def _det_file(base):
    return Path(base) / "detrazione.json"


def det_dati(base):
    d = el.leggi_json(_det_file(base), {}) or {}
    if not isinstance(d, dict):
        d = {}
    d["spese"] = sorted([s for s in d.get("spese") or [] if isinstance(s, dict) and s.get("id")], key=lambda s: s.get("data") or "")
    d["doc"] = {k: bool((d.get("doc") or {}).get(k)) for k in DET_DOC} if isinstance(d.get("doc"), dict) else {k: False for k in DET_DOC}
    return d


def _det_pulisci(s):
    try:
        imp = round(float(str(s.get("importo") or "0").replace("€", "").replace(".", "").replace(",", ".") if "," in str(s.get("importo") or "")
                          else str(s.get("importo") or "0").replace("€", "")), 2)
    except ValueError:
        imp = 0.0
    data = str(s.get("data") or "")[:10]
    try:
        datetime.date.fromisoformat(data)
    except ValueError:
        data = datetime.date.today().isoformat()
    return {"cosa": str(s.get("cosa") or "").strip()[:160], "negozio": str(s.get("negozio") or "").strip()[:80], "importo": max(0.0, imp),
            "data": data, "pag": s.get("pag") if s.get("pag") in DET_PAG else "carta", "cf": bool(s.get("cf")),
            "foto": [str(x)[:500] for x in (s.get("foto") or []) if str(x).strip()][:4]}


def det_spesa(base, s, sid=None):
    """Aggiunge (o cambia, con sid) una spesa."""
    d = det_dati(base)
    x = _det_pulisci(s or {})
    if not x["cosa"]:
        return d
    if sid:
        for v in d["spese"]:
            if v["id"] == sid:
                v.update(x)
    else:
        d["spese"].append({"id": uuid.uuid4().hex[:10], **x})
    el.scrivi_json(_det_file(base), d)
    return det_dati(base)


def det_togli(base, sid):
    d = det_dati(base)
    tolta = next((v for v in d["spese"] if v["id"] == sid), None)
    d["spese"] = [v for v in d["spese"] if v["id"] != sid]
    el.scrivi_json(_det_file(base), d)
    return det_dati(base), tolta


def det_doc(base, k, si):
    d = det_dati(base)
    if k in DET_DOC:
        d["doc"][k] = bool(si)
        el.scrivi_json(_det_file(base), d)
    return d


def det_foto(chiave, base, foto):
    """La foto della fattura o dello scontrino: Claude legge data, negozio, cosa, importo, se c'e' il codice fiscale
    e come si e' pagato. Non salva: la pagina mostra i dati e lo studente (o il genitore) li conferma."""
    import base64
    contenuto = [{"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                              "data": base64.b64encode(ch.jpeg_ridotto(f)).decode()}} for f in foto[:3]]
    contenuto.append({"type": "text", "text": "Ecco la fattura o lo scontrino."})
    corpo = {"model": ch.MODELLO, "max_tokens": 1200,
             "system": ("Leggi la fattura o lo scontrino di un acquisto per uno studente con DSA (computer, programma, "
                        "calcolatrice, registratore, licenza...). «data» = AAAA-MM-GG; «negozio» = chi l'ha venduto; «cosa» = "
                        "cosa si e' comprato, breve; «importo» = il totale pagato in euro, con il punto per i decimali; «cf» = "
                        "vero se c'e' un codice fiscale di una persona (non la partita IVA del negozio); «pag» = carta, bancomat, "
                        "bonifico, app o contanti se si capisce, altrimenti vuoto. Rispondi con lo strumento «spesa»."),
             "tools": [{"name": "spesa", "description": "I dati della spesa.",
                        "input_schema": {"type": "object", "properties": {
                            "data": {"type": "string"}, "negozio": {"type": "string"}, "cosa": {"type": "string"},
                            "importo": {"type": "number"}, "cf": {"type": "boolean"}, "pag": {"type": "string"}},
                            "required": ["cosa", "importo"]}}],
             "messages": [{"role": "user", "content": contenuto}]}
    corpo = dict(corpo, tool_choice={"type": "tool", "name": "spesa"})
    r = ch._chiama(chiave, corpo)
    d = ch.input_di(r, corpo)
    if not str(d.get("cosa") or "").strip():
        raise ap.ErroreAppunti(testi.tr("sm_det_err"))
    x = _det_pulisci({**d, "importo": str(d.get("importo") or 0), "cf": str(d.get("cf")).lower() in ("true", "1", "si", "sì")})
    x["pag"] = d.get("pag") if d.get("pag") in DET_PAG else ""
    x["foto"] = [str(f) for f in foto[:3]]
    return {"spesa": x, "spesa_ai": ch._costo(r.get("usage") or {})}
