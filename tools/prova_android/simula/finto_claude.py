import time
import appunti as ap, elaborazione as el
dati = {"titolo": "Limiti", "blocchi": [
    {"domanda": "Quanto vale sin x / x per x→0?", "parole_chiave": ["limite notevole"], "appunti": ["Vale 1: si dimostra col teorema del confronto (cos x ≤ sin x / x ≤ 1).", "Vale solo con x in radianti."], "dove": "slide 2", "slide": 1},
    {"domanda": "Da dove nasce il numero e?", "parole_chiave": ["(1+1/x)^x"], "appunti": ["lim (1 + 1/x)^x = e ≈ 2,718 per x→∞."], "dove": "slide 3", "slide": 2}],
    "riassunto": "Un limite descrive dove va una funzione; i limiti notevoli sciolgono le forme indeterminate.",
    "formulario": [{"simbolo": "e", "significato": "2,718"}], "esercizi_svolti": [], "da_controllare": []}
esame = {"titolo": "Limiti", "domande_probabili": [{"domanda": "Dimostra che sin x / x → 1", "stelle": 3, "schema": ["radianti", "sin x ≤ x ≤ tan x", "confronto"], "parole_chiave": ["confronto"], "errore": "gradi", "dove": "slide 2", "slide": 1},
  {"domanda": "Quali sono le forme indeterminate?", "stelle": 2, "schema": ["elenco", "come si sciolgono"], "parole_chiave": ["0/0"], "dove": "slide 3"}],
  "parole_chiave": [{"parola": "confronto", "significato": "teorema dei carabinieri"}], "simulazione": [{"domanda": "Dimostri sin x/x", "deve_contenere": "confronto"}], "da_controllare": []}
dati_en = {"titolo": "Limits", "blocchi": [
    {"domanda": "What is the limit of sin x / x as x→0?", "parole_chiave": ["notable limit"], "appunti": ["It equals 1: proved with the squeeze theorem (cos x ≤ sin x / x ≤ 1).", "Only valid with x in radians."], "dove": "slide 2", "slide": 1},
    {"domanda": "Where does the number e come from?", "parole_chiave": ["(1+1/x)^x"], "appunti": ["lim (1 + 1/x)^x = e ≈ 2.718 as x→∞."], "dove": "slide 3", "slide": 2}],
    "riassunto": "A limit describes where a function goes; notable limits resolve indeterminate forms.",
    "formulario": [{"simbolo": "e", "significato": "2.718"}], "esercizi_svolti": [], "da_controllare": []}
esame_en = {"titolo": "Limits", "domande_probabili": [{"domanda": "Prove that sin x / x → 1", "stelle": 3, "schema": ["radians", "sin x ≤ x ≤ tan x", "squeeze"], "parole_chiave": ["squeeze"], "errore": "degrees", "dove": "slide 2", "slide": 1},
  {"domanda": "What are the indeterminate forms?", "stelle": 2, "schema": ["list", "how to resolve them"], "parole_chiave": ["0/0"], "dove": "slide 3"}],
  "parole_chiave": [{"parola": "squeeze", "significato": "squeeze theorem"}], "simulazione": [{"domanda": "Prove sin x/x", "deve_contenere": "squeeze"}], "da_controllare": []}
def _chiedi(chiave, pdf, tentativi=4, contesto="", lingua_appunti="it", lingua_lezione="it", formato="cornell", **kw):
    print("PAROLE", kw.get("parole"), flush=True)
    print("CLAUDE", formato, lingua_appunti, lingua_lezione, flush=True); time.sleep(2)
    if lingua_appunti == "en":
        return (dict(esame_en) if formato == "esame" else dict(dati_en)), 0.05
    return (dict(esame) if formato == "esame" else dict(dati)), 0.05
ap.chiedi_a_claude = _chiedi
import chiedi as chm
def _chiama(chiave, corpo, tentativi=3):
    time.sleep(1.2)
    if corpo.get("tools"):
        en = "inglese" in corpo["system"] or "English" in corpo["system"]
        return {"usage": {"input_tokens": 3000, "output_tokens": 300}, "content": [{"type": "tool_use", "input": {
            "centro": "Limits" if en else "Limiti", "rami": [
              {"titolo": "What a limit is" if en else "Che cos'è un limite", "foglie": ["where f(x) goes near x₀", "left and right limit"] if en else ["dove va f(x) vicino a x₀", "limite destro e sinistro"]},
              {"titolo": "Notable limits" if en else "Limiti notevoli", "foglie": ["sin x / x → 1", "(1+1/x)^x → e"]},
              {"titolo": "Indeterminate forms" if en else "Forme indeterminate", "foglie": ["0/0, ∞/∞, ∞−∞", "factor out" if en else "si sciolgono con raccoglimenti"]},
              {"titolo": "Theorems" if en else "Teoremi", "foglie": ["squeeze theorem" if en else "confronto (carabinieri)", "uniqueness" if en else "unicità del limite", "sign permanence" if en else "permanenza del segno"]},
              {"titolo": "Exercises" if en else "Esercizi", "foglie": ["lim x→0 (1−cos x)/x²"]}]}}]}
    dom = corpo["messages"][-1]["content"]
    c0 = corpo["messages"][0]["content"]
    print("CHIEDI", len(c0 if isinstance(c0, str) else c0[0]["text"]), "caratteri;", dom, flush=True)
    materia = "L2" in corpo["system"]
    if "inglese" in corpo["system"]:
        rif = "[[L2 00:00:12]] and [[L1 slide 2]]" if materia else "[[00:00:12]] and [[slide 2]]"
        return {"usage": {"input_tokens": 200, "output_tokens": 180}, "content": [{"type": "text", "text": f"The lecturer explains it with the **squeeze theorem**: for x close to 0, in radians, cos x ≤ sin x / x ≤ 1, so the limit is 1.\nThey said: «in degrees it doesn't work, you always fall for it at the exam». It's covered here: {rif}."}]}
    rif = "[[L2 00:00:12]] e [[L1 slide 2]]" if materia else "[[00:00:12]] e [[slide 2]]"
    return {"usage": {"input_tokens": 200, "cache_creation_input_tokens": 9000, "output_tokens": 180},
            "content": [{"type": "text", "text": f"Il docente lo spiega con il **teorema del confronto**: per x vicino a 0, in radianti, vale cos x ≤ sin x / x ≤ 1, quindi il limite è 1.\nHa detto: «in gradi non vale, all'esame ci cascate sempre». Se ne parla qui: {rif}."}]}
chm._chiama = _chiama
ap.prova_chiave = lambda k: None if k.startswith("sk-ant") else (_ for _ in ()).throw(ap.ErroreAppunti("Chiave non valida."))
# riunioni: il verbale (con cose da fare e prossima riunione) e i capitoli
verbale = {"titolo": "Listino 2027", "in_breve": "Listino 2027 con aumento medio del 4%, prodotti di punta invariati, consegna separata dal prezzo.",
  "decisioni": [{"testo": "Aumento medio del 4% sul listino 2027", "chi": "Marco Rossi", "dove": "00:00:12"}],
  "azioni": [{"cosa": "Numeri sui costi di consegna", "chi": "Giulia Bianchi", "entro": "venerdì 23/10", "dove": "00:00:30"},
             {"cosa": "Bozza del listino 2027", "chi": "Marco Rossi", "entro": "martedì 27/10", "dove": "00:00:40"}],
  "da_decidere": [{"testo": "Sconti ai clienti storici", "dove": "00:00:50"}], "prossima_riunione": {"quando": "giovedì 29/10 ore 15:30", "note": ""},
  "punti_discussi": [{"titolo": "Prezzi", "punti": ["Aumento 4%", "Prodotti di punta invariati"], "dove": "00:00:12"}], "da_controllare": []}
verbale_en = {"titolo": "2027 price list", "in_breve": "2027 price list with an average 4% increase, flagship products unchanged, delivery priced separately.",
  "decisioni": [{"testo": "Average 4% increase on the 2027 price list", "chi": "Mark Ross", "dove": "00:00:12"}],
  "azioni": [{"cosa": "Figures on delivery costs", "chi": "Julia White", "entro": "Friday 23/10", "dove": "00:00:30"},
             {"cosa": "Draft of the 2027 price list", "chi": "Mark Ross", "entro": "Tuesday 27/10", "dove": "00:00:40"}],
  "da_decidere": [{"testo": "Discounts for long-standing customers", "dove": "00:00:50"}], "prossima_riunione": {"quando": "Thursday 29/10 at 15:30", "note": ""},
  "punti_discussi": [{"titolo": "Prices", "punti": ["4% increase", "Flagship products unchanged"], "dove": "00:00:12"}], "da_controllare": []}
CAP_EN = [{"inizio": "00:00:00", "titolo": "The 2027 price list", "dettaglio": "4% increase"}, {"inizio": "00:00:08", "titolo": "Delivery costs"}, {"inizio": "00:00:16", "titolo": "Competitors and discounts"}]
CAP = [{"inizio": "00:00:00", "titolo": "Il listino 2027", "dettaglio": "aumento del 4%"}, {"inizio": "00:00:08", "titolo": "Costi di consegna"}, {"inizio": "00:00:16", "titolo": "Concorrenti e sconti"}]
_chiedi_base = _chiedi
def _chiedi(chiave, pdf, tentativi=4, contesto="", lingua_appunti="it", lingua_lezione="it", formato="cornell", **kw):
    if formato == "verbale":
        print("CLAUDE verbale", kw.get("partecipanti"), "NOTE", kw.get("note"), flush=True); time.sleep(2)
        return (dict(verbale_en, capitoli=CAP_EN) if lingua_appunti == "en" else dict(verbale, capitoli=CAP)), 0.04
    d, sp = _chiedi_base(chiave, pdf, tentativi, contesto, lingua_appunti, lingua_lezione, formato, **kw)
    return dict(d, capitoli=CAP_EN if lingua_appunti == "en" else CAP), sp
ap.chiedi_a_claude = _chiedi

# preparazione all'esame: classifica, simulazione e correzione finte
_chiama_base = chm._chiama
def _chiama(chiave, corpo, tentativi=3):
    n = (corpo.get("tools") or [{}])[0].get("name")
    en = "inglese" in corpo.get("system", "") or "English" in corpo.get("system", "")
    if n == "salva_classifica":
        return {"usage": {"input_tokens": 9000, "output_tokens": 900}, "content": [{"type": "tool_use", "input": {
            "domande": [{"domanda": "Prove that sin x / x → 1" if en else "Dimostra che sin x / x → 1", "stelle": 3, "lezioni": ["13/10", "16/10"], "perche": "repeated in two lectures" if en else "ripetuta in due lezioni", "schema": ["radians" if en else "radianti", "squeeze" if en else "confronto", "conclusion" if en else "conclusione"]},
                        {"domanda": "Lagrange's theorem" if en else "Teorema di Lagrange", "stelle": 3, "lezioni": ["13/10"], "perche": "«I always ask it at the exam»" if en else "«all'esame lo chiedo sempre»", "schema": ["statement" if en else "enunciato", "geometric meaning" if en else "significato geometrico"]},
                        {"domanda": "Indeterminate forms" if en else "Forme indeterminate", "stelle": 2, "lezioni": ["16/10"], "schema": ["list" if en else "elenco", "how to resolve them" if en else "come si sciolgono"]}],
            "argomenti": [{"titolo": "Notable limits" if en else "Limiti notevoli", "lezione": "16/10", "peso": 3}, {"titolo": "Indeterminate forms" if en else "Forme indeterminate", "lezione": "16/10", "peso": 2},
                          {"titolo": "Derivative" if en else "Derivata: definizione", "lezione": "13/10", "peso": 2}, {"titolo": "Lagrange", "lezione": "13/10", "peso": 3}]}}]}
    if n == "salva_simulazione":
        return {"usage": {"input_tokens": 2000, "output_tokens": 500}, "content": [{"type": "tool_use", "input": {"domande": [
            {"domanda": "Prove that sin x / x → 1 as x → 0" if en else "Dimostra che sin x / x → 1 per x → 0", "deve_contenere": "radians, squeeze" if en else "radianti, confronto", "punti": 10},
            {"domanda": "State Lagrange's theorem" if en else "Enuncia il teorema di Lagrange", "deve_contenere": "continuous, differentiable" if en else "continua in [a,b], derivabile in (a,b)", "punti": 10},
            {"domanda": "Compute lim x→0 (1−cos x)/x²" if en else "Calcola lim x→0 (1−cos x)/x²", "deve_contenere": "1/2", "punti": 10}]}}]}
    if n == "salva_correzione":
        return {"usage": {"input_tokens": 2000, "output_tokens": 400}, "content": [{"type": "tool_use", "input": {"risposte": [
            {"n": 1, "punti": 8, "su": 10, "bene": "Squeeze theorem used well" if en else "Teorema del confronto usato bene", "manca": "You don't say x must be in radians" if en else "Non dici che x deve essere in radianti"},
            {"n": 2, "punti": 0, "su": 10, "bene": "", "manca": "Empty answer" if en else "Risposta vuota"}, {"n": 3, "punti": 10, "su": 10, "bene": "Result 1/2 correct" if en else "Risultato 1/2 corretto", "manca": ""}],
            "voto": 18, "consiglio": "Review Lagrange's theorem (lecture of 13/10)." if en else "Ripassa il teorema di Lagrange (lezione del 13/10)."}}]}
    return _chiama_base(chiave, corpo, tentativi)
chm._chiama = _chiama
