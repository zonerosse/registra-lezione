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
CAP = [{"inizio": "00:00:00", "titolo": "Il listino 2027", "dettaglio": "aumento del 4%"}, {"inizio": "00:00:08", "titolo": "Costi di consegna"}, {"inizio": "00:00:16", "titolo": "Concorrenti e sconti"}]
_chiedi_base = _chiedi
def _chiedi(chiave, pdf, tentativi=4, contesto="", lingua_appunti="it", lingua_lezione="it", formato="cornell", **kw):
    if formato == "verbale":
        print("CLAUDE verbale", kw.get("partecipanti"), "NOTE", kw.get("note"), flush=True); time.sleep(2)
        return dict(verbale, capitoli=CAP), 0.04
    d, sp = _chiedi_base(chiave, pdf, tentativi, contesto, lingua_appunti, lingua_lezione, formato, **kw)
    return dict(d, capitoli=CAP), sp
ap.chiedi_a_claude = _chiedi
