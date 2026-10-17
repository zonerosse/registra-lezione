# -*- coding: utf-8 -*-
"""
Registra Lezione - appunti automatici con Claude.

Per ogni parte (un'ora) manda a Claude il PDF del pacchetto (slide + parole del docente)
e riceve gli appunti di studio, che diventano "Appunti – <nome> – parte k (...).pdf"
nella cartella dei pacchetti.

Usa direttamente l'API di Claude (nessuna libreria in piu': solo urllib).
La chiave e' salvata cifrata con la protezione di Windows (DPAPI), legata
all'utente del PC: copiata su un altro PC non funziona.
"""
import base64
import ctypes
import json
import logging
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

import elaborazione as el
import testi
from testi import tr

log = logging.getLogger("registra_lezione")

API = "https://api.anthropic.com/v1"
VERSIONE_API = "2023-06-01"
MODELLO = "claude-sonnet-5-5"
PREZZO_INGRESSO = 2.0 / 1_000_000     # dollari per token (Sonnet 5.5)
PREZZO_USCITA = 10.0 / 1_000_000


class ErroreAppunti(Exception):
    """Errore con un messaggio gia' comprensibile da mostrare nella finestra."""


class ParteVuota(Exception):
    """La parte non ha parole (es. l'ultimo secondo dopo lo scoccare della mezz'ora): niente appunti."""


# --------------------------------------------------------------------------- chiave cifrata

if sys.platform == "win32":
    from ctypes import wintypes

    class _BLOB(ctypes.Structure):
        _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_char))]

    def _dpapi(dati, cifra):
        ingresso = _BLOB(len(dati), ctypes.cast(ctypes.create_string_buffer(dati, len(dati)),
                                                ctypes.POINTER(ctypes.c_char)))
        uscita = _BLOB()
        f = ctypes.windll.crypt32.CryptProtectData if cifra else ctypes.windll.crypt32.CryptUnprotectData
        if not f(ctypes.byref(ingresso), None, None, None, None, 0, ctypes.byref(uscita)):
            raise OSError("DPAPI non riuscito")
        try:
            return ctypes.string_at(uscita.pbData, uscita.cbData)
        finally:
            ctypes.windll.kernel32.LocalFree(uscita.pbData)


def nascondi_chiave(chiave):
    b = chiave.encode("utf-8")
    if sys.platform == "win32":
        return "dpapi:" + base64.b64encode(_dpapi(b, True)).decode()
    return "plain:" + base64.b64encode(b).decode()


def leggi_chiave(salvata):
    if not salvata:
        return ""
    try:
        tipo, dati = salvata.split(":", 1)
        b = base64.b64decode(dati)
        if tipo == "dpapi":
            return _dpapi(b, False).decode("utf-8")
        return b.decode("utf-8")
    except Exception:
        log.exception("lettura chiave")
        return ""


# --------------------------------------------------------------------------- chiamate all'API

def _richiesta(chiave, percorso, corpo=None, timeout=60):
    dati = json.dumps(corpo).encode("utf-8") if corpo is not None else None
    req = urllib.request.Request(
        f"{API}/{percorso}", data=dati, method="POST" if dati else "GET",
        headers={"x-api-key": chiave, "anthropic-version": VERSIONE_API,
                 "content-type": "application/json", "user-agent": "RegistraLezione"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read().decode("utf-8")).get("error", {}).get("message", "")
        except Exception:
            msg = ""
        log.warning("API %s: %s %s", percorso, e.code, msg)
        if e.code in (401, 403):
            raise ErroreAppunti(tr("ap_chiave"))
        if e.code == 400 and "usage limit" in msg.lower():
            raise ErroreAppunti(tr("ap_limite"))
        if e.code == 400 and "credit" in msg.lower():
            raise ErroreAppunti(tr("ap_credito"))
        if e.code in (429, 500, 502, 503, 504, 529):
            raise _Riprova(msg or str(e.code))
        raise ErroreAppunti(tr("ap_errore", c=e.code, m=msg).strip())
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise _Riprova(str(e))


class _Riprova(Exception):
    pass


def prova_chiave(chiave):
    """True se la chiave funziona. Altrimenti ErroreAppunti con il motivo."""
    chiave = (chiave or "").strip()
    if not chiave.startswith("sk-ant-"):
        raise ErroreAppunti(tr("ap_sk"))
    try:
        _richiesta(chiave, "models?limit=1", timeout=30)
    except _Riprova:
        raise ErroreAppunti(tr("ap_rete"))
    return True


# --------------------------------------------------------------------------- appunti

ISTRUZIONI = """Sei un tutor universitario. Ricevi il PDF di un tratto di lezione registrata: per ogni slide
mostrata dal docente c'e' l'immagine e, sotto, la trascrizione automatica di cio' che il docente
ha detto (con l'orario dall'inizio della lezione). La trascrizione puo' contenere errori.

Prepara gli appunti di studio con il METODO CORNELL, in italiano, per uno studente che deve
prepararci l'esame:
- "blocchi": la lezione divisa in pochi blocchi, uno per idea. Per ogni blocco:
  * "domanda": la domanda di ripasso a cui il blocco risponde (andra' nella colonna di sinistra:
    lo studente copre la destra e prova a rispondere);
  * "parole_chiave": 1-4 parole o simboli chiave;
  * "appunti": 2-6 punti BREVI e densi (massimo ~20 parole l'uno): definizioni, formule,
    passaggi, condizioni, avvertenze del docente. NON copiare la trascrizione e non ripetere le
    frasi del docente: riformula in modo sintetico, come farebbe il miglior studente del corso;
  * "aggiunte": 0-2 punti brevi che NON vengono dalla lezione ma che servono a completarla (vuoto se non serve);
  * "dove": slide e orario (es. "slide 3, 00:25");
  * "slide": il numero N della slide del PDF ("Slide N") da mostrare accanto, SOLO se l'immagine
    aiuta davvero (grafico, schema, figura, tabella, formula o passaggi scritti); altrimenti 0.
    Non ripetere la stessa slide due volte.
- "riassunto": 3-5 righe che dicono l'essenziale di questo tratto (la fascia in fondo del Cornell).
- "formulario": TUTTI i simboli, le sigle e le formule usati, ciascuno con il significato in
  breve, da tenere sott'occhio. Formule in testo semplice con simboli Unicode (es. lim x→0
  sin(x)/x = 1, ∑, √, ≤, ∞, x², xᵢ). Niente LaTeX.
- "esercizi_svolti": gli esempi svolti dal docente, passo per passo, con slide se utile.
- "da_controllare": i punti dove l'audio sembra trascritto male, o slide e parole non tornano,
  con l'orario.
Basati solo su slide e parole del docente. Non inventare contenuti. Se per completare serve qualcosa
che il docente NON ha detto e che non e' sulle slide (un passaggio saltato, un'avvertenza, una definizione
precisa), NON metterlo tra i punti normali: mettilo in "aggiunte" (verra' mostrato come "aggiunto da Claude").
Quando citi il docente tra virgolette «...», copia le sue parole come sono nella trascrizione: il programma
controlla le citazioni e toglie quelle che non trova. Non inventare orari o numeri di slide.
Meglio pochi blocchi chiari che tanti blocchi ripetitivi.
Rispondi SOLO chiamando lo strumento salva_appunti con il risultato, senza altro testo."""

_SLIDE = {"type": "integer", "description": "N della slide da mostrare, 0 se non serve"}
SCHEMA = {
    "type": "object",
    "properties": {
        "titolo": {"type": "string", "description": "argomento principale, breve"},
        "blocchi": {"type": "array", "items": {"type": "object", "properties": {
            "domanda": {"type": "string"},
            "parole_chiave": {"type": "array", "items": {"type": "string"}},
            "appunti": {"type": "array", "items": {"type": "string"}},
            "aggiunte": {"type": "array", "items": {"type": "string"},
                         "description": "punti NON detti a lezione, aggiunti per completare"},
            "dove": {"type": "string", "description": "slide e orario"},
            "slide": _SLIDE},
            "required": ["domanda", "appunti"]}},
        "riassunto": {"type": "string", "description": "3-5 righe"},
        "formulario": {"type": "array", "items": {"type": "object", "properties": {
            "simbolo": {"type": "string"}, "significato": {"type": "string"}},
            "required": ["simbolo", "significato"]}},
        "esercizi_svolti": {"type": "array", "items": {"type": "object", "properties": {
            "titolo": {"type": "string"}, "passaggi": {"type": "array", "items": {"type": "string"}},
            "dove": {"type": "string"}, "slide": _SLIDE},
            "required": ["titolo", "passaggi"]}},
        "da_controllare": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["titolo", "blocchi", "riassunto", "formulario", "da_controllare"],
}


ISTRUZIONI_ESAME = """Sei un tutor universitario esperto di esami. Ricevi il PDF di un tratto di lezione registrata:
per ogni slide mostrata dal docente c'e' l'immagine e, sotto, la trascrizione automatica di cio' che il
docente ha detto (con l'orario dall'inizio della lezione). La trascrizione puo' contenere errori.

Prepara gli appunti in FORMATO ESAME, in italiano, per uno studente che deve prepararsi a RISPONDERE
alle domande d'esame su questo tratto di lezione:
- "domande_probabili": 4-10 domande d'esame probabili, ORDINATE dalla piu' probabile. Per ognuna:
  * "domanda": formulata come la farebbe il docente all'esame;
  * "stelle": 3 se il docente ci ha insistito, l'ha ripetuta o ha detto che e' da esame; 2 se e' un
    argomento centrale della lezione; 1 se e' secondaria ma puo' capitare;
  * "perche": in poche parole perche' e' probabile (es. una breve frase del docente tra virgolette);
  * "schema": 3-6 passi BREVI (massimo ~15 parole l'uno): la scaletta della risposta ideale, nell'ordine
    in cui esporla (definizione, formula, passaggi, esempio, conclusione). Non frasi da imparare a memoria;
  * "parole_chiave": 2-5 termini, simboli o formule da memorizzare per quella risposta;
  * "errore": l'errore tipico da evitare in quella risposta (stringa vuota se non c'e');
  * "aggiunte": 0-2 passi brevi della risposta che il docente NON ha detto ma che servono (vuoto se non serve);
  * "dove": slide e orario (es. "slide 3, 00:25");
  * "slide": il numero N della slide del PDF ("Slide N") da mostrare accanto, SOLO se l'immagine aiuta
    davvero (grafico, schema, figura, formula o passaggi scritti); altrimenti 0. Mai la stessa due volte.
- "parole_chiave": TUTTE le parole chiave, i simboli e le formule della lezione, ciascuna con il
  significato in UNA riga (la legenda da tenere sott'occhio). Formule in testo semplice con simboli
  Unicode (es. lim x→0 sin(x)/x = 1, ∑, √, ≤, ∞, x², xᵢ). Niente LaTeX.
- "simulazione": 3-6 domande d'esame come le farebbe il docente (anche esercizi brevi), ciascuna con
  "deve_contenere": gli elementi che una buona risposta deve toccare, o il risultato per gli esercizi.
- "da_controllare": i punti dove l'audio sembra trascritto male, o slide e parole non tornano, con l'orario.
Basati solo su slide e parole del docente. Non inventare contenuti. Se per completare serve qualcosa
che il docente NON ha detto e che non e' sulle slide (un passaggio saltato, un'avvertenza, una definizione
precisa), NON metterlo tra i punti normali: mettilo in "aggiunte" (verra' mostrato come "aggiunto da Claude").
Quando citi il docente tra virgolette «...», copia le sue parole come sono nella trascrizione: il programma
controlla le citazioni e toglie quelle che non trova. Non inventare orari o numeri di slide.
Meglio poche domande ben scelte che tante domande simili.
Rispondi SOLO chiamando lo strumento salva_appunti con il risultato, senza altro testo."""

SCHEMA_ESAME = {
    "type": "object",
    "properties": {
        "titolo": {"type": "string", "description": "argomento principale, breve"},
        "domande_probabili": {"type": "array", "items": {"type": "object", "properties": {
            "domanda": {"type": "string"},
            "stelle": {"type": "integer", "description": "1, 2 o 3"},
            "perche": {"type": "string"},
            "schema": {"type": "array", "items": {"type": "string"}},
            "parole_chiave": {"type": "array", "items": {"type": "string"}},
            "errore": {"type": "string"},
            "aggiunte": {"type": "array", "items": {"type": "string"},
                         "description": "passi NON detti a lezione, aggiunti per completare"},
            "dove": {"type": "string"},
            "slide": _SLIDE},
            "required": ["domanda", "stelle", "schema"]}},
        "parole_chiave": {"type": "array", "items": {"type": "object", "properties": {
            "parola": {"type": "string"}, "significato": {"type": "string"}},
            "required": ["parola", "significato"]}},
        "simulazione": {"type": "array", "items": {"type": "object", "properties": {
            "domanda": {"type": "string"}, "deve_contenere": {"type": "string"}},
            "required": ["domanda"]}},
        "da_controllare": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["titolo", "domande_probabili", "parole_chiave", "simulazione"],
}


# --------------------------------------------------------------------------- capitoli (in tutti i formati)
SCHEMA_CAPITOLI = {"type": "array", "items": {"type": "object", "properties": {
    "inizio": {"type": "string", "description": "orario hh:mm:ss dall'inizio della registrazione"},
    "titolo": {"type": "string"}, "dettaglio": {"type": "string"}}, "required": ["inizio", "titolo"]}}
TESTO_CAPITOLI = """
- "capitoli": questo tratto diviso in 2-6 capitoli, in ordine di tempo, come l'indice di un video: "inizio" =
  l'orario hh:mm:ss (preso dalla trascrizione) in cui comincia l'argomento, "titolo" brevissimo (massimo 6
  parole), "dettaglio" in poche parole. Gli orari devono esistere nella trascrizione."""
for _sc in (SCHEMA, SCHEMA_ESAME):
    _sc["properties"]["capitoli"] = SCHEMA_CAPITOLI


ISTRUZIONI_VERBALE = """Sei un segretario di riunione preciso. Ricevi il PDF di un tratto di riunione di lavoro registrata:
le immagini dello schermo condiviso (se c'erano) e, sotto, la trascrizione automatica di cio' che si e' detto
(con l'orario dall'inizio). La trascrizione puo' contenere errori e non sempre dice chi parla.

Prepara il VERBALE di questo tratto di riunione:
- "in_breve": 3-5 righe con l'essenziale (cosa si e' deciso, cosa resta aperto).
- "decisioni": le decisioni prese davvero (non le proposte rimaste in sospeso). Per ognuna "testo" breve,
  "chi" (chi l'ha proposta o decisa, solo se si capisce, altrimenti vuoto), "dove" = orario hh:mm:ss.
- "azioni": le cose da fare emerse. Per ognuna "cosa", "chi" (solo se detto o chiaro), "entro" (la scadenza
  COME DETTA, es. "venerdì", "entro il 30/10"; vuoto se non detta), "dove" = orario.
- "da_decidere": le questioni rimaste aperte o rimandate, con "testo" e "dove".
- "prossima_riunione": quando (come detto) e note; vuoto se non se ne parla.
- "punti_discussi": gli argomenti discussi, in ordine, ciascuno con "titolo", 2-5 "punti" brevi, "dove".
- "da_controllare": i punti dove l'audio sembra trascritto male, con l'orario.
Non inventare nomi, date o cifre: se non sono nella registrazione lascia vuoto. Se aggiungi qualcosa che
NON e' stato detto (es. un chiarimento), mettilo in "aggiunte" (verra' mostrato come "aggiunto da Claude").
Quando citi qualcuno tra virgolette «...», copia le sue parole come sono nella trascrizione.""" + TESTO_CAPITOLI + """
Rispondi SOLO chiamando lo strumento salva_appunti con il risultato, senza altro testo."""

_DOVE = {"type": "string", "description": "orario hh:mm:ss"}
SCHEMA_VERBALE = {
    "type": "object",
    "properties": {
        "titolo": {"type": "string", "description": "argomento principale, breve"},
        "in_breve": {"type": "string"},
        "decisioni": {"type": "array", "items": {"type": "object", "properties": {
            "testo": {"type": "string"}, "chi": {"type": "string"}, "dove": _DOVE}, "required": ["testo"]}},
        "azioni": {"type": "array", "items": {"type": "object", "properties": {
            "cosa": {"type": "string"}, "chi": {"type": "string"}, "entro": {"type": "string"}, "dove": _DOVE},
            "required": ["cosa"]}},
        "da_decidere": {"type": "array", "items": {"type": "object", "properties": {
            "testo": {"type": "string"}, "dove": _DOVE}, "required": ["testo"]}},
        "prossima_riunione": {"type": "object", "properties": {"quando": {"type": "string"}, "note": {"type": "string"}}},
        "punti_discussi": {"type": "array", "items": {"type": "object", "properties": {
            "titolo": {"type": "string"}, "punti": {"type": "array", "items": {"type": "string"}},
            "aggiunte": {"type": "array", "items": {"type": "string"}}, "dove": _DOVE}, "required": ["titolo", "punti"]}},
        "aggiunte": {"type": "array", "items": {"type": "string"}},
        "da_controllare": {"type": "array", "items": {"type": "string"}},
        "capitoli": SCHEMA_CAPITOLI,
        "fatte": {"type": "array", "description": "cose aperte dalle riunioni precedenti che qui risultano fatte",
                  "items": {"type": "object", "properties": {"id": {"type": "string"}, "dove": _DOVE}, "required": ["id"]}},
    },
    "required": ["titolo", "in_breve", "decisioni", "azioni"],
}

ISTRUZIONI_WEBINAR = ISTRUZIONI.replace(
    "Sei un tutor universitario. Ricevi il PDF di un tratto di lezione registrata",
    "Sei un ottimo prendi-appunti. Ricevi il PDF di un tratto di webinar o corso registrato").replace(
    "Prepara gli appunti di studio con il METODO CORNELL, in italiano, per uno studente che deve\nprepararci l'esame:",
    "Prepara i PUNTI CHIAVE di questo tratto, in italiano, per chi vuole ricordare e applicare quello che si e' detto:").replace(
    "* \"domanda\": la domanda di ripasso a cui il blocco risponde (andra' nella colonna di sinistra:\n    lo studente copre la destra e prova a rispondere);",
    "* \"domanda\": il punto chiave in poche parole, come un titolo (andra' nella colonna di sinistra);").replace(
    "- \"formulario\": TUTTI i simboli, le sigle e le formule usati",
    "- \"formulario\": termini, sigle, strumenti, siti e numeri citati").replace(
    "- \"esercizi_svolti\": gli esempi svolti dal docente, passo per passo, con slide se utile.",
    "- \"esercizi_svolti\": esempi pratici, demo o casi mostrati, passo per passo, con slide se utile.").replace(
    "docente", "relatore")

ISTRUZIONI_MIO = """Ricevi il PDF di un tratto di registrazione (lezione, riunione o webinar): le immagini dello schermo o
delle slide e, sotto, la trascrizione automatica di cio' che si e' detto (con l'orario dall'inizio). La
trascrizione puo' contenere errori.

Prepara gli appunti ESATTAMENTE nel formato descritto qui sotto da chi li usera'. Organizzali in "sezioni" (in
ordine): ogni sezione ha "titolo", "punti" brevi, eventuali "aggiunte", "dove" (slide e orario) e "slide" (il
numero N della slide del PDF da mostrare, solo se aiuta davvero, altrimenti 0). Se il formato chiede un
riassunto, mettilo in "riassunto". "da_controllare": punti dove l'audio sembra trascritto male.

COME LI VUOLE:
«{descrizione}»

Basati solo su quello che si vede e si dice nella registrazione. Se per seguire il formato devi aggiungere
qualcosa che NON e' stato detto, mettilo in "aggiunte" (verra' mostrato come "aggiunto da Claude").
Quando citi qualcuno tra virgolette «...», copia le parole come sono nella trascrizione. Non inventare orari o
numeri di slide.""" + TESTO_CAPITOLI + """
Rispondi SOLO chiamando lo strumento salva_appunti con il risultato, senza altro testo."""

SCHEMA_MIO = {
    "type": "object",
    "properties": {
        "titolo": {"type": "string", "description": "argomento principale, breve"},
        "sezioni": {"type": "array", "items": {"type": "object", "properties": {
            "titolo": {"type": "string"}, "punti": {"type": "array", "items": {"type": "string"}},
            "aggiunte": {"type": "array", "items": {"type": "string"}}, "dove": {"type": "string"}, "slide": _SLIDE},
            "required": ["titolo", "punti"]}},
        "riassunto": {"type": "string"},
        "da_controllare": {"type": "array", "items": {"type": "string"}},
        "capitoli": SCHEMA_CAPITOLI,
    },
    "required": ["titolo", "sezioni"],
}

# esempi pronti per «Il mio formato» (Impostazioni)
ESEMPI_MIO = {
    "it": [{"nome": "Schema per l'orale", "descrizione": "Per ogni argomento: definizione in una riga, poi tre punti da dire all'orale, poi un esempio. Formule in un riquadro a parte. In fondo le domande che il docente ha fatto durante la lezione."},
           {"nome": "Mappa concettuale", "descrizione": "Un concetto centrale, poi i concetti collegati: per ognuno il legame con il centro in una riga e 2-3 dettagli. Massimo 8 concetti."},
           {"nome": "Riassunto di 1 pagina", "descrizione": "Un solo riassunto di massimo una pagina: le idee principali in ordine, con i numeri e i nomi importanti. Niente ripetizioni."},
           {"nome": "Punti chiave webinar", "descrizione": "I 5-10 punti chiave da ricordare, ciascuno con come applicarlo nel lavoro. In fondo strumenti, siti e risorse citati."}],
    "en": [{"nome": "Oral exam outline", "descrizione": "For each topic: one-line definition, three points to say at the oral exam, then an example. Formulas in a separate box. At the end the questions the lecturer asked during the lecture."},
           {"nome": "Concept map", "descrizione": "One central concept, then linked concepts: for each one, its link to the centre in one line and 2-3 details. At most 8 concepts."},
           {"nome": "1-page summary", "descrizione": "A single summary of at most one page: the main ideas in order, with the important numbers and names. No repetitions."},
           {"nome": "Webinar key points", "descrizione": "The 5-10 key points to remember, each with how to apply it at work. At the end tools, sites and resources mentioned."}],
}


def capitoli_di(cartella):
    """I capitoli della registrazione, presi dagli appunti (il primo formato che li ha), in ordine di tempo."""
    import re as _re
    cartella = Path(cartella)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    ordine = [info.get("formato_appunti")] + [f for f in FORMATI if f != info.get("formato_appunti")]
    for f in ordine:
        if f not in FORMATI:
            continue
        out, visti = [], set()
        ps = el.parte_secondi(cartella)
        for k in sorted((info.get(chiave_info(f)) or {}), key=int):
            for c in (el.leggi_json(file_json(cartella, k, f), {}) or {}).get("capitoli") or []:
                m = _re.search(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", str(c.get("inizio") or ""))
                if not m:
                    continue
                sec = c.get("sec")
                if sec is None:
                    a, b, cc = m.groups()
                    sec = int(a) * 3600 + int(b) * 60 + int(cc) if cc else int(a) * 60 + int(b)
                # ogni parte ha i suoi capitoli: fuori dal suo tratto di tempo sono sbagliati (o doppi)
                if not ((int(k) - 1) * ps - 90 <= int(sec) <= int(k) * ps + 90):
                    continue
                chiave_c = (int(sec) // 10, str(c.get("titolo", "")).strip().lower())
                if chiave_c in visti:
                    continue
                visti.add(chiave_c)
                out.append({"sec": int(sec), "inizio": el.hms(sec), "titolo": c.get("titolo", ""),
                            "dettaglio": c.get("dettaglio", "")})
        if out:
            return sorted(out, key=lambda c: c["sec"])
    return []


def formato_di(dati):
    """Il formato di un file di appunti: cornell | esame | verbale | webinar | mio."""
    f = dati.get("formato")
    if f in FORMATI:
        return f
    if "domande_probabili" in dati:
        return "esame"
    if "decisioni" in dati or "azioni" in dati:
        return "verbale"
    if "sezioni" in dati:
        return "mio"
    return "cornell"


def e_esame(dati):
    """True se gli appunti sono nel Formato Esame."""
    return dati.get("formato") == "esame" or "domande_probabili" in dati


def ripara(dati):
    """Appunti scritti male (una riga di testo al posto di una domanda o di una sezione): diventano voci vere."""
    if not isinstance(dati, dict):
        return dati
    for chiave, campo, testo in (("blocchi", "domanda", "appunti"), ("domande_probabili", "domanda", "schema"),
                                 ("sezioni", "titolo", "punti")):
        v = dati.get(chiave)
        if isinstance(v, list) and any(not isinstance(b, dict) for b in v):
            dati[chiave] = [b if isinstance(b, dict) else {campo: "", testo: [str(b)]} for b in v]
    return dati


def normalizza(dati):
    """Gli appunti fatti prima del formato Cornell (concetti/legenda/domande) diventano blocchi."""
    dati = ripara(dati)
    if "blocchi" in dati or e_esame(dati):
        return dati
    blocchi = [{"domanda": c.get("titolo", ""), "parole_chiave": [],
                "appunti": [c.get("spiegazione", "")], "dove": c.get("dove", ""), "slide": c.get("slide", 0)}
               for c in dati.get("concetti", [])]
    return {"titolo": dati.get("titolo", ""), "blocchi": blocchi,
            "riassunto": dati.get("di_cosa_si_parla", ""),
            "formulario": dati.get("legenda", []), "esercizi_svolti": dati.get("esempi_svolti", []),
            "domande_esame": dati.get("domande_esame", []), "da_controllare": dati.get("da_controllare", [])}


def _pdf_del_pacchetto(cartella, k):
    info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
    zp = (info.get("pacchetti") or {}).get(str(k))
    if not zp or not Path(zp).exists():
        raise ErroreAppunti(tr("ap_pacchetto"))
    with zipfile.ZipFile(zp) as z:
        nome = next((n for n in z.namelist() if n.lower().endswith(".pdf")), None)
        if not nome:
            raise ErroreAppunti(tr("ap_pdf"))
        return Path(zp), z.read(nome)


def istruzioni_lingua(lingua_appunti="it", lingua_lezione="it", formato="cornell", mio=None, modello=None, modello_mio=None):
    """Le istruzioni, con la lingua degli appunti e quella in cui parla il docente."""
    nome_app = {"it": "ITALIANO", "en": "INGLESE (English)"}.get(lingua_appunti, "ITALIANO")
    extra = (f"\n\nLINGUA DEGLI APPUNTI: {nome_app}. Scrivi TUTTO in questa lingua: titolo, domande, "
             "parole chiave, appunti, riassunto, formulario, esercizi e punti da controllare.")
    if lingua_lezione != lingua_appunti:
        if lingua_lezione in (None, "", "auto"):
            extra += (" Il docente puo' parlare in un'altra lingua: in quel caso traduci, e per i termini "
                      "tecnici aggiungi tra parentesi il termine originale usato a lezione.")
        else:
            orig = testi.nome_lingua(lingua_lezione, "it")
            extra += (f" La lezione e' in {orig}: traduci il contenuto e per i termini tecnici aggiungi tra "
                      f"parentesi il termine originale in {orig}, come compare sulle slide.")
    if formato == "esame":
        return ISTRUZIONI_ESAME.replace("in FORMATO ESAME, in italiano,", "in FORMATO ESAME") \
            .replace("Rispondi SOLO", TESTO_CAPITOLI.strip() + "\nRispondi SOLO") + extra
    if formato == "verbale":
        return ISTRUZIONI_VERBALE + testo_modello(modello, modello_mio) + extra
    if formato == "webinar":
        return ISTRUZIONI_WEBINAR.replace("in italiano, ", "").replace("Rispondi SOLO", TESTO_CAPITOLI.strip() + "\nRispondi SOLO") + extra
    if formato == "mio":
        return ISTRUZIONI_MIO.replace("{descrizione}", (mio or {}).get("descrizione") or "") + extra
    return ISTRUZIONI.replace("con il METODO CORNELL, in italiano,", "con il METODO CORNELL") \
        .replace("Rispondi SOLO", TESTO_CAPITOLI.strip() + "\nRispondi SOLO") + extra


# --------------------------------------------------------------------------- modelli di riunione
# Ogni modello aggiunge al verbale le sue sezioni (in "sezioni_extra"), dopo «In breve».
MODELLI = {
    "generica": {"it": "Riunione generica", "en": "General meeting", "sezioni": []},
    "vendita": {"it": "Vendita / cliente", "en": "Sales / customer", "sezioni": [
        "Cosa vuole il cliente (bisogni, problemi, obiettivi detti)", "Obiezioni e dubbi del cliente",
        "Prezzo, sconti e condizioni dette (solo cifre dette davvero)", "Prossimo passo concordato (chi, cosa, quando)",
        "Probabilita' di chiudere: bassa, media o alta, con il perche' in una riga (dai segnali detti)"]},
    "colloquio": {"it": "Colloquio di lavoro", "en": "Job interview", "sezioni": [
        "Esperienza e competenze raccontate dal candidato", "Punti di forza emersi", "Dubbi o punti da approfondire",
        "Domande fatte dal candidato", "Condizioni dette (disponibilita', stipendio, preavviso), solo se dette"]},
    "uno_a_uno": {"it": "Riunione 1 a 1", "en": "1-to-1 meeting", "sezioni": [
        "Cosa va bene", "Difficolta' e ostacoli", "Obiettivi concordati", "Cosa serve dal responsabile"]},
    "classe": {"it": "Consiglio di classe", "en": "Class council", "sezioni": [
        "Andamento della classe", "Situazioni particolari segnalate (solo come dette, senza giudizi aggiunti)",
        "Decisioni didattiche e disciplinari", "Comunicazioni alle famiglie"]},
    "condominio": {"it": "Assemblea di condominio", "en": "Condominium meeting", "sezioni": [
        "Presenti e deleghe (come detti)", "Ordine del giorno",
        "Delibere: per ognuna favorevoli, contrari, astenuti (e millesimi se detti)", "Spese approvate e ripartizione",
        "Varie ed eventuali"]},
    "consulenza": {"it": "Consulenza / visita", "en": "Consultation / visit", "sezioni": [
        "Situazione del cliente", "Richieste del cliente", "Consigli e indicazioni date",
        "Documenti o cose da portare", "Prossimo appuntamento"]},
}


def testo_modello(modello, mio=None):
    """Le istruzioni da aggiungere al verbale per il modello di riunione scelto."""
    if modello == "mio" and (mio or {}).get("descrizione"):
        return ("\nMODELLO DI RIUNIONE scelto da chi registra: «" + mio["descrizione"] + "». Oltre al verbale normale, metti "
                "in \"sezioni_extra\" le sezioni che chiede (ciascuna con \"titolo\" e \"punti\" brevi; vuote se non se ne "
                "parla). Solo cose dette nella registrazione.")
    m = MODELLI.get(modello)
    if not m or not m["sezioni"]:
        return ""
    return ("\nMODELLO DI RIUNIONE: " + m["it"].upper() + ". Oltre al verbale normale, metti in \"sezioni_extra\" queste "
            "sezioni, in quest'ordine, ciascuna con \"titolo\" (breve) e \"punti\" brevi: " + "; ".join(m["sezioni"]) +
            ". Se di una sezione non si parla, lasciala con i punti vuoti. Solo cose dette nella registrazione: niente "
            "giudizi o cifre inventate.")


SCHEMA_VERBALE["properties"]["sezioni_extra"] = {"type": "array", "items": {"type": "object", "properties": {
    "titolo": {"type": "string"}, "punti": {"type": "array", "items": {"type": "string"}}}, "required": ["titolo", "punti"]}}


SCHEMI = {"cornell": SCHEMA, "esame": SCHEMA_ESAME, "verbale": SCHEMA_VERBALE, "webinar": SCHEMA, "mio": SCHEMA_MIO}


def note_della_parte(cartella, k):
    """Le note scritte durante la registrazione («Le tue note») che cadono in questa parte."""
    note = el.leggi_json(Path(cartella) / "note.json", []) or []
    ps = el.parte_secondi(cartella)
    return [n for n in note if (int(k) - 1) * ps <= float(n.get("sec", 0)) < int(k) * ps]


def _testo_note(note, lingua):
    nomi = {"importante": "IMPORTANTE", "chiarire": "DA CHIARIRE", "fare": "COSA DA FARE"}
    righe = "; ".join(f"[{n.get('ora')}] " + " – ".join(x for x in (nomi.get(n.get("tipo"), ""), n.get("testo", "")) if x)
                      for n in note)
    return (" Durante la registrazione chi registrava ha preso queste NOTE (orario e testo): " + righe + ". "
            "Sono i momenti che contano di piu' per lui: copri bene quei punti (guarda cosa si dice in quel minuto e "
            "subito prima), e alla fine del punto collegato scrivi «(" + tr("nota_tua", lingua) + ")». "
            "IMPORTANTE = dai piu' spazio a quell'argomento; DA CHIARIRE = mettilo anche fra le cose da controllare "
            "(o, in un verbale, fra le cose da decidere); COSA DA FARE = nel verbale mettila fra le cose da fare. "
            "Le note sono di chi registra: non inventare contenuti che non sono nella registrazione.")


def chiedi_a_claude(chiave, pdf_bytes, tentativi=4, contesto="", lingua_appunti="it", lingua_lezione="it",
                    formato="cornell", parole=None, mio=None, partecipanti=None, note=None, aperte=None, modello=None,
                    modello_mio=None):
    corpo = {
        "model": MODELLO,
        "max_tokens": 12000,
        "system": istruzioni_lingua(lingua_appunti, lingua_lezione, formato, mio, modello, modello_mio),
        "tools": [{"name": "salva_appunti", "description": "Salva gli appunti di questo tratto di registrazione.",
                   "input_schema": SCHEMI.get(formato, SCHEMA)}],
        # Sonnet 5.5 non accetta tool_choice "tool"/"any" (errore 400): si usa "auto"
        # e le istruzioni chiedono di chiamare lo strumento; c'e' comunque il piano B sotto.
        "tool_choice": {"type": "auto"},
        "messages": [{"role": "user", "content": [
            {"type": "document", "source": {"type": "base64", "media_type": "application/pdf",
                                            "data": base64.b64encode(pdf_bytes).decode()}},
            {"type": "text", "text": ("Ecco il tratto di riunione. Prepara il verbale." if formato == "verbale" else
                                      "Ecco il tratto di registrazione. Prepara gli appunti.") +
             (f" Lo studente: {contesto}. Adatta il livello degli appunti al suo corso e anno."
              if contesto and formato in ("cornell", "esame") else "") +
             (" Partecipanti (usa questi nomi, scritti cosi'): " + ", ".join(partecipanti) + "."
              if partecipanti else "") +
             (" Se un paragrafo comincia con un nome e i due punti (es. «Giulia: ...», «Voce 2: ...», «Domanda: ...»)"
              " e' chi sta parlando, riconosciuto in automatico dalla voce: usalo per dire chi ha detto o deciso cosa"
              " (puo' sbagliare: se il testo dice chiaramente altro, segui il testo; «Voce N» e' una persona senza nome).") +
             (_testo_note(note, lingua_appunti) if note else "") +
             (" Cose da fare RIMASTE APERTE dalle riunioni precedenti (id: cosa – chi): " +
              "; ".join(f"{a['id']}: {a['cosa']}" + (f" – {a['chi']}" if a.get("chi") else "") for a in aperte) +
              ". Se in questo tratto si dice chiaramente che una di queste e' stata fatta (o non serve piu'), mettila in "
              "\"fatte\" con il suo id e l'orario; non rimetterla fra le azioni nuove." if aperte and formato == "verbale" else "") +
             (" Termini e nomi che il docente usa (la trascrizione automatica puo' averli storpiati: "
              "scrivili esattamente cosi'): " + ", ".join(parole) + "." if parole else "")}]}],
    }
    attesa = 10
    for n in range(tentativi):
        try:
            r = _richiesta(chiave, "messages", corpo, timeout=600)
            break
        except _Riprova as e:
            log.warning("Claude occupato o rete assente (%s): riprovo tra %s s", e, attesa)
            if n == tentativi - 1:
                raise ErroreAppunti(tr("ap_occupato"))
            time.sleep(attesa)
            attesa *= 2
    uso = r.get("usage", {})
    spesa = uso.get("input_tokens", 0) * PREZZO_INGRESSO + uso.get("output_tokens", 0) * PREZZO_USCITA
    blocco = next((b for b in r.get("content", []) if b.get("type") == "tool_use"), None)
    if blocco:
        return blocco["input"], spesa
    # piano B: Claude ha risposto con il testo invece che con lo strumento
    testo = "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text")
    dati = _json_dal_testo(testo)
    if dati is None:
        log.warning("risposta senza appunti: %s", testo[:500])
        raise ErroreAppunti(tr("ap_vuoto"))
    return dati, spesa


def _json_dal_testo(testo):
    """Prende il primo oggetto JSON dentro il testo (anche se e' tra ```json ... ```)."""
    inizio = testo.find("{")
    fine = testo.rfind("}")
    if inizio < 0 or fine <= inizio:
        return None
    try:
        dati = json.loads(testo[inizio:fine + 1])
    except ValueError:
        return None
    return dati if isinstance(dati, dict) and ("blocchi" in dati or "concetti" in dati or "sezioni" in dati
                                                or "decisioni" in dati or "domande_probabili" in dati) else None


def pdf_appunti(dati, info, etichetta, destinazione, slide=None):
    """Appunti di una parte. slide: {N: (percorso immagine, inizio)} per le slide scelte da Claude."""
    pdf_appunti_parti([(dati, etichetta, slide or {})], info, destinazione)


def pdf_appunti_parti(parti, info, destinazione, unite=None):
    """Uno o piu' blocchi di appunti nello stesso PDF: parti = [(dati, etichetta, slide), ...].
    Con piu' parti diventa "Appunti della lezione completa"."""
    from fpdf import FPDF
    parti = [(ripara(d), e, sl) for d, e, sl in parti]

    class PDF(FPDF):
        def footer(self):
            """A pie' di ogni pagina: marchio e numero di pagina."""
            if not getattr(self, "_f", None):
                return
            y = self.h - 10.5
            self.set_fill_color(13, 66, 117)
            self.rect(16, y - 0.6, 4.6, 4.6, style="F", round_corners=True, corner_radius=0.9)
            self.set_xy(16, y - 0.6)
            self.set_font(self._f, "B", 5.2)
            self.set_text_color(255, 255, 255)
            self.cell(4.6, 4.6, "PW", align="C")
            self.set_xy(22, y - 0.6)
            self.set_font(self._f, "", 7.5)
            self.set_text_color(120, 132, 150)
            self.cell(120, 4.6, self._t(self._creato))
            self.set_xy(self.w - 16 - 40, y - 0.6)
            self.cell(40, 4.6, f"{self.page_no()} / {{nb}}", align="R")
            self.set_text_color(0, 0, 0)

    stato = {"slide": {}, "usate": set()}
    pdf = PDF(format="A4")
    pdf.set_auto_page_break(True, margin=16)
    pdf.set_margins(16, 15, 16)
    font, solo_latin = el._font_pdf(pdf)
    # simboli matematici che Arial non ha (es. ᵢ, ∮): li prende da Segoe UI Symbol / DejaVu
    for extra in (Path(r"C:\Windows\Fonts\seguisym.ttf"),
                  el.CARTELLA_FONT / "DejaVuSans.ttf"):
        if not solo_latin and extra.exists():
            try:
                pdf.add_font("Simboli", "", str(extra))
                pdf.set_fallback_fonts(["Simboli"], exact_match=False)
            except Exception:
                pass
            break
    VIOLA, GRIGIO = (124, 58, 237), (107, 118, 134)

    def t(s):
        s = str(s or "")
        if solo_latin:
            return s.encode("latin-1", "replace").decode("latin-1")
        return s
    L = testi.lingua_di(info)
    pdf._f, pdf._t, pdf._creato = font, t, tr("pdf_creato", L)

    def sezione(titolo):
        pdf.ln(4)
        pdf.set_font(font, "B", 11)
        pdf.set_text_color(*VIOLA)
        pdf.cell(0, 7, t(titolo.upper()), new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(*VIOLA)
        pdf.line(16, pdf.get_y(), pdf.w - 16, pdf.get_y())
        pdf.ln(2)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font(font, "", 10.5)

    def testo(s, h=5.4):
        pdf.multi_cell(0, h, t(s), new_x="LMARGIN", new_y="NEXT")

    def immagine(n):
        try:
            n = int(n or 0)
        except (TypeError, ValueError):
            return
        slide, usate = stato["slide"], stato["usate"]
        if n <= 0 or n in usate or n not in slide:
            return
        percorso, inizio = slide[n]
        if not percorso or not Path(percorso).exists():
            return
        usate.add(n)
        from PIL import Image
        with Image.open(percorso) as im:
            w, h = im.size
        larg = 120.0
        alt = larg * h / w
        if alt > 75:
            alt, larg = 75.0, 75.0 * w / h
        if pdf.get_y() + alt + 8 > pdf.h - 15:
            pdf.add_page()
        pdf.ln(1)
        x = (pdf.w - larg) / 2
        pdf.image(str(percorso), x=x, w=larg, h=alt)
        pdf.set_draw_color(*GRIGIO)
        pdf.rect(x, pdf.get_y() - alt, larg, alt)
        pdf.set_font(font, "", 8.5)
        pdf.set_text_color(*GRIGIO)
        pdf.cell(0, 5, t(f"Slide {n} · {el.hms(inizio)}"), align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.set_font(font, "", 10.5)
        pdf.ln(1)

    def slide_info(n):
        """(percorso, inizio) della slide n, se c'e' e non e' gia' stata usata; la segna usata."""
        slide, usate = stato["slide"], stato["usate"]
        if n <= 0 or n in usate or n not in slide:
            return None
        percorso, inizio = slide[n]
        if not percorso or not Path(percorso).exists():
            return None
        usate.add(n)
        return percorso, inizio
    immagine.slide_info = slide_info

    completa = len(parti) > 1
    fmt0 = formato_di(parti[0][0])
    capitoli_tutti = [c for d, _, _ in parti for c in (d.get("capitoli") or [])]
    for indice, (dati, etichetta, slide) in enumerate(parti):
        stato["slide"], stato["usate"] = slide or {}, set()
        pdf.add_page()
        esame = fmt0 == "esame"
        if indice == 0 and fmt0 in ("verbale", "mio"):
            if fmt0 == "verbale":
                na = sum(len(d.get("azioni") or []) for d, _, _ in parti)
                nd = sum(len(d.get("decisioni") or []) for d, _, _ in parti)
                etichette = [tr("vb_b_dec", L, n=nd) if nd else "", tr("vb_b_az", L, n=na) if na else ""]
            else:
                etichette = [parti[0][0].get("mio_nome") or tr("fmt_mio", L)]
            if completa:
                etichette.append(tr("pdf_parti", L, n=len(parti)))
        elif indice == 0 and esame:
            nd = len(unite.get("domande_probabili") or []) if unite else \
                sum(len(d.get("domande_probabili") or []) for d, _, _ in parti)
            nk = sum(len(d.get("parole_chiave") or []) for d, _, _ in parti)
            etichette = [tr("es_b_dom", L, n=nd) if nd else "", tr("es_b_kw", L, n=nk) if nk else "",
                         tr("pdf_parti", L, n=len(parti)) if completa else "",
                         tr("es_b_sim", L) if any(d.get("simulazione") for d, _, _ in parti) else ""]
        elif indice == 0:
            nd = sum(len(normalizza(d).get("blocchi") or []) for d, _, _ in parti)
            etichette = [tr("wb_b_punti" if fmt0 == "webinar" else "pdf_domande", L, n=nd) if nd else "", tr("pdf_parti", L, n=len(parti)) if completa else "",
                         tr("pdf_formulario_b", L) if any(normalizza(d).get("formulario") for d, _, _ in parti) else "",
                         tr("pdf_esercizi_b", L) if any(normalizza(d).get("esercizi_svolti") for d, _, _ in parti) else ""]
        if indice == 0:
            ll = info.get("lingua_lezione")
            if ll and ll != L:
                etichette.append(tr("pdf_lingua", L, l=testi.nome_lingua(ll, L)))
            if esame:
                occhiello = tr("es_occhiello_tutti", L) if completa else tr("es_occhiello", L, e=etichetta.upper())
            elif fmt0 in ("verbale", "webinar", "mio"):
                nome_f = (parti[0][0].get("mio_nome") or tr("fmt_mio", L)) if fmt0 == "mio" else tr(f"fmt_{fmt0}", L)
                occhiello = tr("occhiello_tutti", L, f=nome_f.upper()) if completa else \
                    tr("occhiello_parte", L, f=nome_f.upper(), e=etichetta.upper())
            else:
                occhiello = tr("pdf_occhiello_tutti", L) if completa else tr("pdf_occhiello", L, e=etichetta.upper())
            _copertina(pdf, font, t, info, occhiello,
                       info.get("nome", "Lezione"), [x for x in etichette if x])
            if not completa and capitoli_tutti:
                _scrivi_capitoli(pdf, font, t, testo, capitoli_tutti, L, GRIGIO)
        if completa and indice == 0:
            pdf.set_font(font, "B", 9)
            pdf.set_text_color(13, 66, 117)
            testo(tr("pdf_indice", L), 6)
            pdf.set_text_color(0, 0, 0)
            pdf.set_font(font, "", 10.5)
            for d, et, _ in parti:
                testo(f"• {et}: {d.get('titolo', '')}")
            pdf.ln(3)
            if capitoli_tutti:
                _scrivi_capitoli(pdf, font, t, testo, capitoli_tutti, L, GRIGIO)
            pdf.set_font(font, "", 9)
            pdf.set_text_color(*GRIGIO)
            testo(tr("pdf_controlla", L), 4.6)
            pdf.set_text_color(0, 0, 0)
            pdf.add_page()
            if unite and unite.get("domande_probabili"):
                stato["slide"] = {}
                _scrivi_esame(pdf, font, t, testo, immagine, unite, info, tr("es_tutta", L), True, GRIGIO,
                              classifica=True)
                pdf.add_page()
                stato["slide"] = slide or {}
        f = formato_di(dati)
        cop = indice == 0 and not completa
        if f == "esame":
            _scrivi_esame(pdf, font, t, testo, immagine, dati, info, etichetta, completa, GRIGIO, copertina=cop)
        elif f == "verbale":
            _scrivi_verbale(pdf, font, t, testo, dati, info, etichetta, completa, GRIGIO, copertina=cop)
        elif f == "mio":
            _scrivi_sezioni(pdf, font, t, testo, immagine, dati, info, etichetta, completa, GRIGIO, copertina=cop)
        else:
            _scrivi_parte(pdf, font, t, testo, sezione, immagine, dati, info, etichetta, completa, GRIGIO,
                          copertina=cop, webinar=(f == "webinar"))
    pdf.output(str(destinazione))


def _copertina(pdf, font, t, info, occhiello, titolo, etichette):
    """Fascia blu in cima alla prima pagina, col marchio Punto Web Ferrara."""
    from fpdf.pattern import LinearGradient
    h = 50.0
    with pdf.use_pattern(LinearGradient(0, 0, pdf.w, h, ["#061e36", "#0d4275", "#0369a1"])):
        pdf.rect(0, 0, pdf.w, h, style="F")
    # cerchi decorativi
    pdf.set_draw_color(60, 150, 200)
    pdf.set_line_width(0.4)
    for r in (34, 24, 14):
        pdf.circle(pdf.w - 14, 6, r, style="D")
    pdf.set_line_width(0.2)
    pdf.set_text_color(170, 220, 245)
    pdf.set_font(font, "B", 7.5)
    pdf.set_xy(16, 10)
    pdf.cell(0, 4, t(occhiello))
    pdf.set_text_color(255, 255, 255)
    pdf.set_font(font, "B", 20)
    pdf.set_xy(16, 16)
    pdf.multi_cell(pdf.w - 60, 8.5, t(titolo), new_x="LMARGIN", new_y="NEXT", max_line_height=8.5)
    pdf.set_font(font, "", 9)
    pdf.set_text_color(214, 230, 247)
    righe = [el._data_it(info.get("inizio", "")), el.riga_studente(info)]
    pdf.set_x(16)
    pdf.multi_cell(pdf.w - 60, 4.6, t(" · ".join(r for r in righe if r)), new_x="LMARGIN", new_y="NEXT")
    if etichette:
        x, y = 16, h - 10
        pdf.set_font(font, "", 7.5)
        for e in etichette:
            w = pdf.get_string_width(t(e)) + 7
            pdf.set_draw_color(120, 190, 230)
            pdf.set_fill_color(25, 85, 140)
            pdf.rect(x, y, w, 5.5, style="DF", round_corners=True, corner_radius=2.7)
            pdf.set_xy(x, y)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(w, 5.5, t(e), align="C")
            x += w + 3
    pdf.set_text_color(0, 0, 0)
    pdf.set_draw_color(0, 0, 0)
    pdf.set_xy(16, h + 7)


def _scrivi_capitoli(pdf, font, t, testo, capitoli, L, GRIGIO):
    """L'indice della registrazione: minuto e titolo di ogni capitolo."""
    BLU = (3, 105, 161)
    pdf.set_font(font, "B", 9)
    pdf.set_text_color(*BLU)
    testo(tr("pdf_capitoli", L).upper(), 6)
    for c in capitoli:
        pdf.set_font(font, "B", 9.5)
        pdf.set_text_color(*BLU)
        pdf.cell(20, 5, t(str(c.get("inizio") or "")[:8]))
        pdf.set_text_color(0, 0, 0)
        pdf.set_font(font, "", 9.5)
        det = c.get("dettaglio") or ""
        pdf.multi_cell(0, 5, t((c.get("titolo") or "") + (f" — {det}" if det else "")), new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(3)


def _intestazione_semplice(pdf, font, t, testo, dati, info, etichetta, completa, GRIGIO, copertina, L,
                           avviso="pdf_controlla"):
    pdf.set_font(font, "B", 17)
    if copertina:
        testo(dati.get("titolo", "") or tr("pdf_appunti_di", L, e=etichetta), 8)
    elif completa:
        testo(f"{etichetta[:1].upper()}{etichetta[1:]} · {dati.get('titolo', '')}", 8)
    else:
        testo(tr("pdf_titolo_parte", L, nome=info.get('nome', ''), e=etichetta), 8)
    pdf.set_font(font, "", 9)
    pdf.set_text_color(*GRIGIO)
    testo(tr(avviso, L), 4.6)
    pdf.set_text_color(0, 0, 0)


def _sezione_colore(pdf, font, t, titolo, colore):
    if pdf.get_y() + 20 > pdf.h - pdf.b_margin:
        pdf.add_page()
    pdf.ln(4)
    pdf.set_font(font, "B", 10)
    pdf.set_text_color(*colore)
    pdf.cell(0, 6, t(titolo.upper()), new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(*colore)
    pdf.set_line_width(0.4)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.set_line_width(0.2)
    pdf.ln(2.5)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font(font, "", 10.5)


def _aggiunte_e_avvisi(pdf, font, t, testo, v, L):
    if v.get("aggiunte"):
        pdf.set_text_color(109, 40, 217)
        pdf.set_font(font, "", 10)
        for a in v["aggiunte"]:
            if a:
                testo(f"+ {a}  ({tr('pdf_agg', L)})", 5)
    if v.get("avvisi"):
        pdf.set_text_color(194, 65, 12)
        pdf.set_font(font, "B", 8.5)
        for a in v["avvisi"]:
            testo(f"⚠ {tr('pdf_dav', L)}: {a}", 4.4)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font(font, "", 10.5)


def _scrivi_verbale(pdf, font, t, testo, dati, info, etichetta, completa, GRIGIO, copertina=False):
    """Il verbale di una riunione: in breve, decisioni, cose da fare (chi, entro quando), da decidere,
    prossima riunione, punti discussi."""
    L = testi.lingua_di(info)
    ARANCIO = (194, 65, 12)
    _intestazione_semplice(pdf, font, t, testo, dati, info, etichetta, completa, GRIGIO, copertina, L,
                           avviso="vb_controlla")
    if info.get("partecipanti"):
        pdf.set_font(font, "", 9.5)
        pdf.set_text_color(*GRIGIO)
        testo(tr("vb_partecipanti", L) + ": " + ", ".join(info["partecipanti"]), 5)
        pdf.set_text_color(0, 0, 0)

    def dove(d):
        return f"  ({d})" if d else ""
    if dati.get("in_breve"):
        _sezione_colore(pdf, font, t, tr("vb_breve", L), ARANCIO)
        testo(dati["in_breve"])
    for se in dati.get("sezioni_extra") or []:
        punti = [x for x in se.get("punti") or [] if str(x).strip()]
        if punti:
            _sezione_colore(pdf, font, t, se.get("titolo", ""), ARANCIO)
            for x in punti:
                testo(f"• {x}")
    if dati.get("decisioni"):
        _sezione_colore(pdf, font, t, tr("vb_decisioni", L), ARANCIO)
        for n, d in enumerate(dati["decisioni"], 1):
            chi = f", {d['chi']}" if d.get("chi") else ""
            testo(f"{n}. {d.get('testo', '')}" + (f"  ({d.get('dove', '')}{chi})" if d.get("dove") or chi else ""))
            _aggiunte_e_avvisi(pdf, font, t, testo, d, L)
    if dati.get("azioni"):
        _sezione_colore(pdf, font, t, tr("vb_azioni", L), ARANCIO)
        pdf.set_font(font, "", 9.5)
        pdf.set_fill_color(255, 247, 237)
        pdf.set_draw_color(253, 186, 116)
        pdf.set_text_color(0, 0, 0)
        with pdf.table(col_widths=(58, 22, 20), line_height=5.4, text_align="LEFT") as tab:
            r = tab.row()
            for h in (tr("vb_cosa", L), tr("vb_chi", L), tr("vb_entro", L)):
                r.cell(t(h))
            for a in dati["azioni"]:
                r = tab.row()
                r.cell(t(a.get("cosa", "") + dove(a.get("dove"))))
                r.cell(t(a.get("chi") or "–"))
                r.cell(t(a.get("entro") or "–"))
        pdf.set_font(font, "", 10.5)
    if dati.get("da_decidere"):
        _sezione_colore(pdf, font, t, tr("vb_da_decidere", L), ARANCIO)
        for d in dati["da_decidere"]:
            testo(f"• {d.get('testo', '')}{dove(d.get('dove'))}")
    if dati.get("dall_ultima") and info.get("aperte_prima"):
        _sezione_colore(pdf, font, t, tr("vb_dall_ultima", L), ARANCIO)
        fatte = {f["id"] for f in dati.get("fatte") or []}
        for a in info["aperte_prima"]:
            ok = a["id"] in fatte
            testo(f"• {a['cosa']}" + (f" ({a['chi']})" if a.get("chi") else "") + " – " + tr("vb_fatta" if ok else "vb_aperta", L))
    pr = dati.get("prossima_riunione") or {}
    if pr.get("quando") or pr.get("note"):
        _sezione_colore(pdf, font, t, tr("vb_prossima", L), ARANCIO)
        testo(" · ".join(x for x in (pr.get("quando"), pr.get("note")) if x))
    if dati.get("punti_discussi"):
        _sezione_colore(pdf, font, t, tr("vb_discussi", L), ARANCIO)
        for p_ in dati["punti_discussi"]:
            pdf.set_font(font, "B", 10.5)
            testo(p_.get("titolo", "") + dove(p_.get("dove")))
            pdf.set_font(font, "", 10.5)
            for x in p_.get("punti") or []:
                testo(f"• {x}")
            _aggiunte_e_avvisi(pdf, font, t, testo, p_, L)
            pdf.ln(1.5)
    if dati.get("aggiunte"):
        _aggiunte_e_avvisi(pdf, font, t, testo, {"aggiunte": dati["aggiunte"]}, L)
    if dati.get("da_controllare"):
        _sezione_colore(pdf, font, t, tr("pdf_controllare", L), GRIGIO)
        pdf.set_text_color(*GRIGIO)
        for d in dati["da_controllare"]:
            testo(f"• {d}")
        pdf.set_text_color(0, 0, 0)
    _legenda_verita(pdf, font, t, (dati.get("decisioni") or []) + (dati.get("punti_discussi") or [])
                    + [{"aggiunte": dati.get("aggiunte")}], L)


def _scrivi_sezioni(pdf, font, t, testo, immagine, dati, info, etichetta, completa, GRIGIO, copertina=False):
    """«Il mio formato»: le sezioni come le ha chieste chi usa il programma."""
    L = testi.lingua_di(info)
    VERDE = (5, 122, 85)
    _intestazione_semplice(pdf, font, t, testo, dati, info, etichetta, completa, GRIGIO, copertina, L)
    for sz in dati.get("sezioni") or []:
        _sezione_colore(pdf, font, t, sz.get("titolo", ""), VERDE)
        for x in sz.get("punti") or []:
            testo(f"• {x}")
        _aggiunte_e_avvisi(pdf, font, t, testo, sz, L)
        if sz.get("dove"):
            pdf.set_font(font, "", 8.5)
            pdf.set_text_color(*GRIGIO)
            testo(f"→ {sz['dove']}", 4.4)
            pdf.set_text_color(0, 0, 0)
            pdf.set_font(font, "", 10.5)
        immagine(sz.get("slide"))
    if dati.get("riassunto"):
        _sezione_colore(pdf, font, t, tr("pdf_riassunto", L), VERDE)
        testo(dati["riassunto"])
    if dati.get("da_controllare"):
        _sezione_colore(pdf, font, t, tr("pdf_controllare", L), GRIGIO)
        pdf.set_text_color(*GRIGIO)
        for d in dati["da_controllare"]:
            testo(f"• {d}")
        pdf.set_text_color(0, 0, 0)
    _legenda_verita(pdf, font, t, dati.get("sezioni") or [], L)


def _scrivi_parte(pdf, font, t, testo, sezione, immagine, dati, info, etichetta, completa, GRIGIO, copertina=False,
                  webinar=False):
    """Una parte di appunti nel formato Cornell: domande a sinistra, appunti a destra,
    riassunto in fondo; poi formulario, esercizi svolti, punti da controllare."""
    dati = ripara(dati)
    from fpdf.enums import MethodReturnValue
    dati = normalizza(dati)
    L = testi.lingua_di(info)
    VIOLA, VIOLA_CHIARO, LINEA = (124, 58, 237), (243, 237, 255), (214, 204, 245)
    pdf.set_font(font, "B", 17)
    if copertina:
        testo(dati.get("titolo", "") or tr("pdf_appunti_di", L, e=etichetta), 8)
    else:
        testo((f"{etichetta[:1].upper()}{etichetta[1:]} · {dati.get('titolo', '')}" if completa
               else tr("pdf_titolo_parte", L, nome=info.get('nome', 'Lezione'), e=etichetta)), 8)
    if copertina:
        pdf.set_font(font, "", 9.5)
        pdf.set_text_color(*GRIGIO)
        testo(tr("pdf_controlla", L), 5)
        pdf.set_text_color(0, 0, 0)
    elif not completa:
        pdf.set_font(font, "", 9.5)
        pdf.set_text_color(*GRIGIO)
        if el.riga_studente(info):
            testo(el.riga_studente(info), 5)
        testo(tr("pdf_sotto", L, data=el._data_it(info.get('inizio', '')), tit=dati.get('titolo', '')), 5)
        pdf.set_text_color(0, 0, 0)
    pdf.set_font(font, "", 8.5)
    pdf.set_text_color(124, 58, 237)
    testo(tr("wb_uso" if webinar else "pdf_studia", L), 4.4)
    pdf.set_text_color(0, 0, 0)

    xl, wl = pdf.l_margin, 52.0
    xr = xl + wl + 5
    wr = pdf.w - pdf.r_margin - xr
    fondo = pdf.h - pdf.b_margin

    def altezza(w, h, s):
        righe = pdf.multi_cell(w, h, t(s), dry_run=True, output=MethodReturnValue.LINES)
        return len(righe) * h

    def intestazione_colonne():
        pdf.set_font(font, "B", 8.5)
        pdf.set_text_color(*VIOLA)
        y = pdf.get_y()
        pdf.set_xy(xl, y)
        pdf.cell(wl, 5, t(tr("wb_col" if webinar else "pdf_col_dom", L)))
        pdf.set_xy(xr, y)
        pdf.cell(wr, 5, t(tr("pdf_col_app", L)), new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(*VIOLA)
        pdf.line(xl, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.set_text_color(0, 0, 0)
        pdf.ln(2)

    pdf.ln(3)
    intestazione_colonne()
    for b in dati.get("blocchi") or []:
        if not isinstance(b, dict):          # appunti scritti male: una riga di testo invece del blocco
            b = {"domanda": "", "appunti": [str(b)]}
        domanda = b.get("domanda", "")
        chiavi = " · ".join(b.get("parole_chiave") or [])
        punti = "\n".join(f"• {p}" for p in (b.get("appunti") or []) if p)
        aggiunte = "\n".join(f"+ {p}  ({tr('pdf_agg', L)})" for p in (b.get("aggiunte") or []) if p)
        avvisi = "\n".join(f"⚠ {tr('pdf_dav', L)}: {a}" for a in (b.get("avvisi") or []) if a)
        dove = b.get("dove", "")
        # immagine (se Claude l'ha scelta)
        img, img_h, img_w = None, 0.0, 0.0
        try:
            n = int(b.get("slide") or 0)
        except (TypeError, ValueError):
            n = 0
        dati_slide = immagine.slide_info(n)
        if dati_slide:
            img, inizio_img = dati_slide
            from PIL import Image
            with Image.open(img) as im:
                w_px, h_px = im.size
            img_w = min(wr, 100.0)
            img_h = img_w * h_px / w_px
            if img_h > 58:
                img_h, img_w = 58.0, 58.0 * w_px / h_px
        pdf.set_font(font, "B", 9.5)
        h_sx = altezza(wl, 4.6, domanda)
        pdf.set_font(font, "", 8.5)
        h_sx += altezza(wl, 4.2, chiavi) + 1 if chiavi else 0
        pdf.set_font(font, "", 10)
        h_dx = altezza(wr, 5.0, punti) + (altezza(wr, 4.2, f"→ {dove}") if dove else 0)
        h_dx += (altezza(wr, 5.0, aggiunte) if aggiunte else 0) + (altezza(wr, 4.2, avvisi) if avvisi else 0)
        h_dx += (img_h + 7) if img else 0
        alto = max(h_sx, h_dx) + 2
        if pdf.get_y() + min(alto, fondo - pdf.t_margin - 10) > fondo:
            pdf.add_page()
            intestazione_colonne()
        y0 = pdf.get_y()
        # sinistra: domanda + parole chiave
        pdf.set_xy(xl, y0)
        pdf.set_font(font, "B", 9.5)
        pdf.set_text_color(*VIOLA)
        pdf.multi_cell(wl, 4.6, t(domanda), align="L", new_x="LEFT", new_y="NEXT")
        if chiavi:
            pdf.set_font(font, "", 8.5)
            pdf.set_text_color(*GRIGIO)
            pdf.set_x(xl)
            pdf.multi_cell(wl, 4.2, t(chiavi), align="L", new_x="LEFT", new_y="NEXT")
        y_sx = pdf.get_y()
        # destra: appunti
        pdf.set_text_color(0, 0, 0)
        pdf.set_font(font, "", 10)
        pdf.set_xy(xr, y0)
        pdf.multi_cell(wr, 5.0, t(punti), align="L", new_x="LEFT", new_y="NEXT")
        if aggiunte:          # quello che il docente non ha detto: in viola, con l'etichetta
            pdf.set_text_color(109, 40, 217)
            pdf.set_x(xr)
            pdf.multi_cell(wr, 5.0, t(aggiunte), align="L", new_x="LEFT", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)
        if dove:
            pdf.set_font(font, "", 8.5)
            pdf.set_text_color(*GRIGIO)
            pdf.set_x(xr)
            pdf.multi_cell(wr, 4.2, t(f"→ {dove}"), new_x="LEFT", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)
        if avvisi:
            pdf.set_font(font, "B", 8.5)
            pdf.set_text_color(194, 65, 12)
            pdf.set_x(xr)
            pdf.multi_cell(wr, 4.2, t(avvisi), new_x="LEFT", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)
        if img:
            if pdf.get_y() + img_h + 6 > fondo:
                pdf.add_page()
                intestazione_colonne()
                y0 = pdf.get_y()
            yi = pdf.get_y() + 1
            pdf.image(str(img), x=xr, y=yi, w=img_w, h=img_h)
            pdf.set_draw_color(*GRIGIO)
            pdf.rect(xr, yi, img_w, img_h)
            pdf.set_xy(xr, yi + img_h)
            pdf.set_font(font, "", 8)
            pdf.set_text_color(*GRIGIO)
            pdf.cell(img_w, 4.5, t(f"Slide {n} · {el.hms(inizio_img)}"), align="C", new_x="LEFT", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)
        y1 = max(y_sx, pdf.get_y()) + 2
        if y1 > y0:
            pdf.set_draw_color(*LINEA)
            pdf.line(xr - 2.5, y0, xr - 2.5, y1 - 1)
            pdf.line(xl, y1, pdf.w - pdf.r_margin, y1)
        pdf.set_xy(xl, y1 + 2)

    # riassunto: la fascia in fondo del Cornell
    if dati.get("riassunto"):
        pdf.set_font(font, "", 10)
        h = altezza(pdf.w - pdf.l_margin - pdf.r_margin - 8, 5.0, dati["riassunto"]) + 12
        if pdf.get_y() + h > fondo:
            pdf.add_page()
        y = pdf.get_y() + 1
        pdf.set_fill_color(*VIOLA_CHIARO)
        pdf.set_draw_color(*VIOLA)
        pdf.rect(xl, y, pdf.w - pdf.l_margin - pdf.r_margin, h, style="DF")
        pdf.set_xy(xl + 4, y + 2.5)
        pdf.set_font(font, "B", 8.5)
        pdf.set_text_color(*VIOLA)
        pdf.cell(0, 4.5, t(tr("pdf_riassunto", L)), new_x="LEFT", new_y="NEXT")
        pdf.set_x(xl + 4)
        pdf.set_font(font, "", 10)
        pdf.set_text_color(0, 0, 0)
        pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin - 8, 5.0, t(dati["riassunto"]),
                       new_x="LMARGIN", new_y="NEXT")
        pdf.set_y(y + h + 2)

    if dati.get("formulario"):
        sezione(tr("wb_formulario" if webinar else "pdf_formulario", L))
        pdf.set_font(font, "", 10)
        with pdf.table(col_widths=(42, 58), line_height=5.6, text_align="LEFT") as tab:
            r = tab.row()
            r.cell(t(tr("pdf_simbolo", L)))
            r.cell(t(tr("pdf_significato", L)))
            for v in dati["formulario"]:
                r = tab.row()
                r.cell(t(v.get("simbolo", "")))
                r.cell(t(v.get("significato", "")))

    if dati.get("esercizi_svolti"):
        sezione(tr("pdf_esercizi", L))
        for e in dati["esercizi_svolti"]:
            pdf.set_font(font, "B", 10.5)
            testo(e.get("titolo", "") + (f"  ({e['dove']})" if e.get("dove") else ""))
            pdf.set_font(font, "", 10.5)
            for k, p in enumerate(e.get("passaggi", []), 1):
                testo(f"{k}. {p}")
            immagine(e.get("slide"))
            pdf.ln(2)

    if dati.get("domande_esame"):
        sezione(tr("pdf_altre", L))
        for k, d in enumerate(dati["domande_esame"], 1):
            testo(f"{k}. {d}")

    if dati.get("da_controllare"):
        sezione(tr("pdf_controllare", L))
        pdf.set_text_color(*GRIGIO)
        for d in dati["da_controllare"]:
            testo(f"• {d}")
        pdf.set_text_color(0, 0, 0)
    _legenda_verita(pdf, font, t, dati.get("blocchi") or [], L)


def _legenda_verita(pdf, font, t, voci, L):
    """In fondo: cosa vogliono dire il viola ("aggiunto da Claude") e "da verificare"."""
    agg = any(v.get("aggiunte") for v in voci)
    avv = any(v.get("avvisi") for v in voci)
    if not (agg or avv):
        return
    pdf.ln(3)
    pdf.set_font(font, "", 8.5)
    if agg:
        pdf.set_text_color(109, 40, 217)
        pdf.multi_cell(0, 4.4, t(tr("pdf_leg_agg", L)), new_x="LMARGIN", new_y="NEXT")
    if avv:
        pdf.set_text_color(194, 65, 12)
        pdf.multi_cell(0, 4.4, t(tr("pdf_leg_dav", L)), new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)


def _scrivi_esame(pdf, font, t, testo, immagine, dati, info, etichetta, completa, GRIGIO, copertina=False,
                  classifica=False):
    """Una parte di appunti nel Formato Esame: domande probabili (con stelle, schema della risposta,
    parole chiave, errore da evitare), legenda delle parole chiave, simulazione d'esame."""
    from fpdf.enums import MethodReturnValue
    L = testi.lingua_di(info)
    ARANCIO, ARANCIO_SCURO, ARANCIO_CHIARO, BORDO = (194, 65, 12), (124, 45, 18), (255, 247, 237), (253, 186, 116)
    GIALLO, GIALLO_BORDO, GIALLO_TESTO = (254, 243, 199), (252, 211, 77), (146, 64, 14)
    larg = pdf.w - pdf.l_margin - pdf.r_margin
    fondo = pdf.h - pdf.b_margin

    pdf.set_font(font, "B", 17)
    if classifica:
        testo(etichetta, 8)
    elif copertina:
        testo(dati.get("titolo", "") or tr("pdf_appunti_di", L, e=etichetta), 8)
    elif completa:
        testo(f"{etichetta[:1].upper()}{etichetta[1:]} · {dati.get('titolo', '')}", 8)
    else:
        testo(tr("pdf_titolo_parte", L, nome=info.get('nome', 'Lezione'), e=etichetta), 8)
    pdf.set_font(font, "", 9)
    pdf.set_text_color(*GRIGIO)
    testo(tr("pdf_controlla", L), 4.6)
    pdf.set_text_color(*ARANCIO)
    pdf.set_font(font, "", 8.5)
    testo(tr("es_uso", L), 4.4)
    pdf.set_text_color(0, 0, 0)

    def titolo_sezione(s_):
        if pdf.get_y() + 20 > fondo:
            pdf.add_page()
        pdf.ln(4)
        pdf.set_font(font, "B", 10)
        pdf.set_text_color(*ARANCIO)
        pdf.cell(0, 6, t(s_.upper()), new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(*ARANCIO)
        pdf.set_line_width(0.4)
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.set_line_width(0.2)
        pdf.ln(2.5)
        pdf.set_text_color(0, 0, 0)

    def righe(w, h, s_):
        return len(pdf.multi_cell(w, h, t(s_), dry_run=True, output=MethodReturnValue.LINES)) * h

    def etichette_gialle(parole, x0, w):
        """Parole chiave come etichette gialle, una dopo l'altra (vanno a capo)."""
        pdf.set_font(font, "B", 8)
        x, y = x0, pdf.get_y()
        for k in parole:
            k = str(k)
            wk = min(w, pdf.get_string_width(t(k)) + 4)
            if x + wk > x0 + w:
                x, y = x0, y + 5.4
            pdf.set_fill_color(*GIALLO)
            pdf.set_draw_color(*GIALLO_BORDO)
            pdf.rect(x, y, wk, 4.6, style="DF", round_corners=True, corner_radius=1)
            pdf.set_xy(x, y)
            pdf.set_text_color(*GIALLO_TESTO)
            pdf.cell(wk, 4.6, t(k), align="C")
            x += wk + 2
        pdf.set_text_color(0, 0, 0)
        pdf.set_xy(x0, y + 6)

    titolo_sezione(tr("es_h_tutta" if classifica else "es_h_dom", L))
    for n, d in enumerate(dati.get("domande_probabili") or [], 1):
        try:
            stelle = max(1, min(3, int(d.get("stelle") or 1)))
        except (TypeError, ValueError):
            stelle = 1
        domanda = f"{n}. {d.get('domanda', '')}"
        passi = [p_ for p_ in (d.get("schema") or []) if p_]
        aggiunte = [f"{p_}  ({tr('pdf_agg', L)})" for p_ in (d.get("aggiunte") or []) if p_]
        chiavi = [k for k in (d.get("parole_chiave") or []) if k]
        errore, dove, perche = d.get("errore") or "", d.get("dove") or "", d.get("perche") or ""
        if perche and d.get("perche_ok"):
            perche += " ✓"
        if classifica and d.get("parti"):
            pp = [str(x) for x in d["parti"]]
            dove = tr("es_parte1" if len(pp) == 1 else "es_parti", L, p=", ".join(pp)) + (f" · {dove}" if dove else "")
        avvisi = "  ".join(f"⚠ {tr('pdf_dav', L)}: {a}" for a in (d.get("avvisi") or []) if a)
        try:
            ns = int(d.get("slide") or 0)
        except (TypeError, ValueError):
            ns = 0
        img = immagine.slide_info(ns)
        wtxt = larg - 8 - (52 if img else 0)
        # altezza del riquadro, per non spezzarlo a meta' pagina se ci sta nella successiva
        pdf.set_font(font, "B", 10.5)
        h_tit = righe(larg - 26, 5.2, domanda) + 3
        pdf.set_font(font, "", 9.8)
        h_corpo = sum(righe(wtxt - 6, 4.8, p_) for p_ in passi + aggiunte) + (6 if chiavi else 0) + \
            (righe(wtxt, 4.4, errore) if errore else 0) + (4.4 if (dove or perche) else 0) + \
            (righe(wtxt, 4.4, avvisi) if avvisi else 0) + 4
        if img:
            h_corpo = max(h_corpo, 34)
        if pdf.get_y() + h_tit + h_corpo > fondo and h_tit + h_corpo < fondo - pdf.t_margin:
            pdf.add_page()
        x0, y0 = pdf.l_margin, pdf.get_y()
        # testata arancio chiaro con le stelle
        pdf.set_fill_color(*ARANCIO_CHIARO)
        pdf.set_draw_color(*BORDO)
        pdf.rect(x0, y0, larg, h_tit, style="DF")
        pdf.set_xy(x0 + 3, y0 + 1.5)
        pdf.set_font(font, "B", 10.5)
        pdf.set_text_color(*ARANCIO_SCURO)
        pdf.multi_cell(larg - 26, 5.2, t(domanda), new_x="LEFT", new_y="NEXT")
        pdf.set_xy(x0 + larg - 20, y0 + 1.5)
        pdf.set_font(font, "B", 11)
        pdf.set_text_color(234, 88, 12)
        pdf.cell(17, 5.2, t("★" * stelle + "☆" * (3 - stelle)), align="R")
        # corpo: schema numerato, parole chiave, errore, da dove viene
        yc = y0 + h_tit + 2
        pdf.set_text_color(0, 0, 0)
        pdf.set_font(font, "", 9.8)
        pdf.set_xy(x0 + 4, yc)
        for i, p_ in enumerate(passi + aggiunte, 1):
            pdf.set_x(x0 + 4)
            if i > len(passi):      # passi che il docente non ha detto: in viola, con l'etichetta
                pdf.set_text_color(109, 40, 217)
            pdf.cell(6, 4.8, f"{i}.")
            pdf.multi_cell(wtxt - 6, 4.8, t(p_), new_x="LEFT", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        if chiavi:
            pdf.set_y(pdf.get_y() + 1)
            etichette_gialle(chiavi, x0 + 4, wtxt)
        if errore:
            pdf.set_x(x0 + 4)
            pdf.set_font(font, "", 9)
            pdf.set_text_color(190, 18, 60)
            pdf.multi_cell(wtxt, 4.4, t(tr("es_errore_pdf", L) + errore), new_x="LEFT", new_y="NEXT")
        if dove or perche:
            pdf.set_x(x0 + 4)
            pdf.set_font(font, "", 8)
            pdf.set_text_color(*GRIGIO)
            pdf.multi_cell(wtxt, 4.4, t("→ " + " · ".join(x for x in (perche, dove) if x)), new_x="LEFT", new_y="NEXT")
        if avvisi:
            pdf.set_x(x0 + 4)
            pdf.set_font(font, "B", 8)
            pdf.set_text_color(194, 65, 12)
            pdf.multi_cell(wtxt, 4.4, t(avvisi), new_x="LEFT", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        y_fine = pdf.get_y() + 2
        if img:
            percorso, inizio = img
            from PIL import Image
            with Image.open(percorso) as im:
                wpx, hpx = im.size
            wi = 48.0
            hi = wi * hpx / wpx
            if hi > 40:
                hi, wi = 40.0, 40.0 * wpx / hpx
            xi = x0 + larg - wi - 3
            pdf.image(str(percorso), x=xi, y=yc, w=wi, h=hi)
            pdf.set_draw_color(*GRIGIO)
            pdf.rect(xi, yc, wi, hi)
            pdf.set_xy(xi, yc + hi)
            pdf.set_font(font, "", 7.5)
            pdf.set_text_color(*GRIGIO)
            pdf.cell(wi, 4, t(f"Slide {ns} · {el.hms(inizio)}"), align="C")
            pdf.set_text_color(0, 0, 0)
            y_fine = max(y_fine, yc + hi + 6)
        pdf.set_draw_color(*BORDO)
        if y_fine > y0 + h_tit:
            pdf.line(x0, y0 + h_tit, x0, y_fine)
            pdf.line(x0 + larg, y0 + h_tit, x0 + larg, y_fine)
            pdf.line(x0, y_fine, x0 + larg, y_fine)
        pdf.set_xy(x0, y_fine + 3)

    pdf.set_font(font, "", 8)
    pdf.set_text_color(*GRIGIO)
    testo(tr("es_leg", L), 4.2)
    pdf.set_text_color(0, 0, 0)
    _legenda_verita(pdf, font, t, dati.get("domande_probabili") or [], L)

    if dati.get("parole_chiave"):
        titolo_sezione(tr("es_h_kw", L))
        pdf.set_font(font, "", 9.6)
        pdf.set_draw_color(*BORDO)
        with pdf.table(col_widths=(40, 60), line_height=5.4, text_align="LEFT") as tab:
            r = tab.row()
            r.cell(t(tr("es_kw1", L)))
            r.cell(t(tr("es_kw2", L)))
            for v in dati["parole_chiave"]:
                r = tab.row()
                r.cell(t(v.get("parola", "")))
                r.cell(t(v.get("significato", "")))

    if dati.get("simulazione"):
        titolo_sezione(tr("es_h_sim", L))
        for i, q in enumerate(dati["simulazione"], 1):
            pdf.set_font(font, "B", 10)
            testo(f"{i}. «{q.get('domanda', '')}»", 5.2)
            if q.get("deve_contenere"):
                pdf.set_font(font, "", 9)
                pdf.set_text_color(*GRIGIO)
                pdf.set_x(pdf.l_margin + 5)
                pdf.multi_cell(larg - 5, 4.6, t(tr("es_deve", L) + q["deve_contenere"]), new_x="LMARGIN", new_y="NEXT")
                pdf.set_text_color(0, 0, 0)
            pdf.ln(1.2)
        pdf.set_font(font, "", 8.5)
        pdf.set_text_color(*GRIGIO)
        testo(tr("es_sim_nota", L), 4.4)
        pdf.set_text_color(0, 0, 0)

    if dati.get("da_controllare"):
        titolo_sezione(tr("pdf_controllare", L))
        pdf.set_font(font, "", 9.5)
        pdf.set_text_color(*GRIGIO)
        for d in dati["da_controllare"]:
            testo(f"• {d}", 4.8)
        pdf.set_text_color(0, 0, 0)


# --------------------------------------------------------------------------- due formati sulla stessa lezione
# Cornell:  appunti_00k.json        info["appunti"]        info["appunti_completi"]
# Esame:    appunti_esame_00k.json  info["appunti_esame"]  info["appunti_completi_esame"]
FORMATI = ("cornell", "esame", "verbale", "webinar", "mio")
# formati che hanno senso per ogni tipo di registrazione (il primo e' quello di serie)
FORMATI_TIPO = {"lezione": ("cornell", "esame", "mio"), "riunione": ("verbale", "mio"),
                "webinar": ("webinar", "cornell", "mio")}


def file_json(cartella, k, formato):
    if formato == "cornell":
        return Path(cartella) / f"appunti_{int(k):03d}.json"
    return Path(cartella) / f"appunti_{formato}_{int(k):03d}.json"


def chiave_info(formato):
    return "appunti" if formato == "cornell" else f"appunti_{formato}"


def chiave_completi(formato):
    return "appunti_completi" if formato == "cornell" else f"appunti_completi_{formato}"


def sistema_vecchi(cartella):
    """Le lezioni fatte con le versioni 3.3-3.4 in Formato Esame avevano gli appunti nei posti del
    Cornell: li sposto nei posti del Formato Esame (una volta sola)."""
    cartella = Path(cartella)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    if info.get("formato_appunti") != "esame" or info.get("appunti_esame") is not None or not info.get("appunti"):
        return
    for k in list(info.get("appunti") or {}):
        vecchio, nuovo = file_json(cartella, k, "cornell"), file_json(cartella, k, "esame")
        d = el.leggi_json(vecchio)
        if d is not None and e_esame(d) and not nuovo.exists():
            try:
                vecchio.rename(nuovo)
            except OSError:
                pass
    el.aggiorna_info(cartella, appunti_esame=info.get("appunti") or {}, appunti={},
                     appunti_completi_esame=info.get("appunti_completi"), appunti_completi=None)


PAROLE_MINIME = int(os.environ.get("RL_PAROLE_MINIME") or 15)      # sotto: la parte e' vuota (silenzio, o pochi secondi dopo il cambio di parte)


def parte_vuota(cartella, k):
    """True se la parte k e' un pezzetto (meno di un minuto, es. la fine proprio allo scoccare della
    mezz'ora) e non ha (quasi) parole. Una parte lunga non e' mai vuota: i suoi appunti si fanno sempre."""
    cartella = Path(cartella)
    durata = float((el.leggi_json(cartella / "info.json", {}) or {}).get("durata") or 0)
    if durata and durata - (int(k) - 1) * el.parte_secondi(cartella) >= 60:
        return False
    segs = el.leggi_json(cartella / f"trascrizione_{int(k):03d}.json")
    if not isinstance(segs, list):
        return False
    parole = sum(len(str(s.get("testo") or "").split()) for s in segs if isinstance(s, dict))
    return parole < PAROLE_MINIME


def parti_utili(cartella, pac):
    """I numeri (stringhe) delle parti con qualcosa da riassumere."""
    return [k for k in sorted(pac, key=int) if not parte_vuota(cartella, k)]


def _segna_vuota(cartella, k):
    info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
    vuote = sorted({int(x) for x in info.get("parti_vuote") or []} | {int(k)})
    el.aggiorna_info(cartella, parti_vuote=vuote)


def sistema_vuote(cartella, cartella_pacchetti):
    """Lezioni fatte fino alla 3.32: una parte vuota aveva comunque i suoi appunti («Tratto vuoto…»).
    Li tolgo e rifaccio il PDF unico con le parti vere. Ritorna True se ha cambiato qualcosa."""
    cartella = Path(cartella)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    pac = info.get("pacchetti") or {}
    if len(pac) < 2 or info.get("vuote_controllate") or info.get("stato") != "pronta":
        return False
    el.aggiorna_info(cartella, vuote_controllate=True)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    cambiato = False
    for k in list(pac):
        if not parte_vuota(cartella, k):
            continue
        _segna_vuota(cartella, k)
        cambiato = True
        for f in FORMATI:
            fatti = dict(info.get(chiave_info(f)) or {})
            if str(k) in fatti:
                try:
                    Path(fatti.pop(str(k))).unlink()
                except OSError:
                    pass
                try:
                    file_json(cartella, k, f).unlink()
                except OSError:
                    pass
                try:
                    vecchio = info.get(chiave_completi(f))
                    if vecchio and vecchio not in fatti.values():
                        Path(vecchio).unlink()
                except OSError:
                    pass
                el.aggiorna_info(cartella, **{chiave_info(f): fatti, chiave_completi(f): None})
                info = el.leggi_json(cartella / "info.json", {}) or {}
    if cambiato:
        try:
            p = file_classifica(cartella)
            if p.exists():
                p.unlink()
        except Exception:
            pass
        for f in FORMATI:
            try:
                appunti_lezione_completa(cartella, cartella_pacchetti, f)
            except Exception:
                log.exception("PDF unico dopo aver tolto la parte vuota")
    return cambiato


def appunti_fatti(info, formato):
    """{k: pdf} degli appunti di quel formato che esistono ancora."""
    return {k: v for k, v in (info.get(chiave_info(formato)) or {}).items() if v and Path(v).exists()}


def _nome_file(L, formato):
    return tr("file_appunti" if formato == "cornell" else f"file_appunti_{formato}", L)


ISTRUZIONI_UNISCI = """Sei un tutor universitario esperto di esami. Ricevi le domande d'esame probabili preparate,
parte per parte, per la STESSA lezione (ogni parte e' un tratto di circa mezz'ora). Ora le vedi tutte insieme.
Fai la classifica unica delle domande piu' probabili di TUTTA la lezione:
- unisci le domande uguali o molto simili in una sola (tieni la formulazione migliore, unisci gli schemi
  senza ripetizioni, al massimo 6 passi);
- ordina dalla piu' probabile considerando tutta la lezione: sale un argomento che torna in piu' parti, su
  cui il docente insiste o che dice essere da esame;
- rimetti le stelle sull'intera lezione: ★★★ solo alle domande davvero piu' probabili (circa un quarto),
  ★★ agli argomenti centrali, ★ alle altre;
- al massimo 12 domande;
- per ognuna: "parti" = i numeri delle parti da cui viene; "parte" e "indice" = la domanda di partenza
  principale (numero della parte e posizione nella sua lista, da 1).
NON aggiungere contenuti nuovi: usa solo quello che c'e' nelle domande ricevute. "perche", "errore" e le
citazioni del docente copiale come sono. Mantieni separati i punti in "aggiunte" (non detti a lezione).
Scrivi in {lingua}. Rispondi SOLO chiamando lo strumento salva_classifica."""

SCHEMA_UNISCI = {"type": "object", "properties": {"domande": {"type": "array", "items": {"type": "object", "properties": {
    "domanda": {"type": "string"}, "stelle": {"type": "integer"}, "perche": {"type": "string"},
    "schema": {"type": "array", "items": {"type": "string"}},
    "parole_chiave": {"type": "array", "items": {"type": "string"}},
    "errore": {"type": "string"}, "aggiunte": {"type": "array", "items": {"type": "string"}},
    "dove": {"type": "string"}, "parti": {"type": "array", "items": {"type": "integer"}},
    "parte": {"type": "integer"}, "indice": {"type": "integer"}},
    "required": ["domanda", "stelle", "schema", "parti"]}}}, "required": ["domande"]}


def file_classifica(cartella):
    return Path(cartella) / "appunti_esame_lezione.json"


def unisci_esame(chiave, cartella, info, pac):
    """Visione d'insieme (Formato Esame, lezione con piu' parti): una sola classifica delle domande,
    senza doppioni e con le stelle date su tutta la lezione. Salvata in appunti_esame_lezione.json."""
    cartella = Path(cartella)
    pezzi = []
    for k in sorted(pac, key=int):
        d = el.leggi_json(file_json(cartella, k, "esame")) or {}
        pezzi.append({"parte": int(k), "titolo": d.get("titolo", ""),
                      "domande": [{x: q.get(x) for x in ("domanda", "stelle", "perche", "schema", "parole_chiave",
                                                          "errore", "aggiunte", "dove")}
                                  for q in d.get("domande_probabili") or []]})
    L = testi.lingua_di(info)
    corpo = {"model": MODELLO, "max_tokens": 8000,
             "system": ISTRUZIONI_UNISCI.replace("{lingua}", testi.nome_lingua(L, "it")),
             "tools": [{"name": "salva_classifica", "description": "Salva la classifica delle domande della lezione.",
                        "input_schema": SCHEMA_UNISCI}],
             "tool_choice": {"type": "auto"},
             "messages": [{"role": "user", "content": json.dumps(pezzi, ensure_ascii=False)}]}
    attesa, r = 10, None
    for n in range(4):
        try:
            r = _richiesta(chiave, "messages", corpo, timeout=300)
            break
        except _Riprova:
            if n == 3:
                raise ErroreAppunti(tr("ap_occupato"))
            time.sleep(attesa)
            attesa *= 2
    blocco = next((b for b in r.get("content", []) if b.get("type") == "tool_use"), None)
    dati = blocco["input"] if blocco else None
    if not dati:
        testo = "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text")
        try:
            dati = json.loads(testo[testo.find("{"):testo.rfind("}") + 1])
        except ValueError:
            dati = None
    domande = (dati or {}).get("domande") or []
    if not domande:
        raise ErroreAppunti(tr("ap_vuoto"))
    # la slide della domanda di partenza (cosi' le flashcard hanno l'immagine)
    for q in domande:
        try:
            orig = el.leggi_json(file_json(cartella, q.get("parte"), "esame")) or {}
            src = (orig.get("domande_probabili") or [])[int(q.get("indice") or 0) - 1]
            q["slide"] = src.get("slide") or 0
        except Exception:
            q["slide"] = 0
    out = {"formato": "esame", "titolo": tr("es_tutta", L), "domande_probabili": domande[:12]}
    try:
        import verifica
        verifica.controlla(out, cartella, 0, L)
    except Exception:
        log.exception("controllo classifica")
    uso = r.get("usage", {})
    spesa = uso.get("input_tokens", 0) * PREZZO_INGRESSO + uso.get("output_tokens", 0) * PREZZO_USCITA
    el.scrivi_json(file_classifica(cartella), out)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    el.aggiorna_info(cartella, spesa_appunti=round(float(info.get("spesa_appunti") or 0) + spesa, 4))
    log.info("classifica della lezione: %s domande, spesa %.3f $", len(domande), spesa)
    return out


def appunti_lezione_completa(cartella, cartella_pacchetti, formato=None, chiave=None):
    """Se la lezione e' finita e tutte le parti hanno gli appunti (di quel formato), li mette in un
    PDF unico. Con una parte sola il PDF unico e' quello della parte. Senza formato: tutti e due.
    Formato Esame con piu' parti: prima la classifica unica di tutta la lezione (se c'e' la chiave)."""
    if formato is None:
        return [appunti_lezione_completa(cartella, cartella_pacchetti, f, chiave) for f in FORMATI]
    cartella = Path(cartella)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    pac = info.get("pacchetti") or {}
    fatti = info.get(chiave_info(formato)) or {}
    utili = parti_utili(cartella, pac)
    if info.get("stato") != "pronta" or not utili or any(k not in fatti for k in utili):
        return None
    if len(utili) == 1:
        dest = fatti[utili[0]]
    else:
        parti = []
        for k in utili:
            dati = el.leggi_json(file_json(cartella, k, formato))
            if dati is None:
                return None
            base = Path(pac[k]).stem
            etichetta = base.split(" – ")[-1] if " – " in base else f"{tr('parte', testi.lingua_di(info))} {k}"
            mappa = el.leggi_json(cartella / f"pacchetto_{int(k):03d}.json", []) or []
            slide = {m["n"]: (str(el.immagine_slide(cartella, m["file"])) if m.get("file") else None,
                              m.get("inizio", 0)) for m in mappa}
            parti.append((dati, etichetta, slide))
        unite = None
        if formato == "esame":
            unite = el.leggi_json(file_classifica(cartella))
            if unite is None and chiave:
                try:
                    unite = unisci_esame(chiave, cartella, info, {k: pac[k] for k in utili})
                except Exception:
                    log.exception("classifica della lezione")
        primo = Path(pac[utili[0]]).stem
        base = primo.rsplit(" – ", 1)[0] if " – " in primo else el.nome_sicuro(info.get("nome"))
        L = testi.lingua_di(info)
        compl = tr("lezione_completa", L) if (info.get("tipo") or "lezione") == "lezione" else tr("reg_completa", L)
        dest = str(Path(cartella_pacchetti) / f"{_nome_file(L, formato)} – {base} – {compl}.pdf")
        pdf_appunti_parti(parti, info, dest, unite=unite)
    el.aggiorna_info(cartella, **{chiave_completi(formato): str(dest)})
    return dest


def crea_appunti(cartella, k, chiave, cartella_pacchetti, formato=None):
    """Crea gli appunti della parte k nel formato indicato (di serie: quello scelto per la lezione).
    Ritorna (percorso PDF, spesa in dollari)."""
    cartella = Path(cartella)
    sistema_vecchi(cartella)
    info0 = el.leggi_json(cartella / "info.json", {}) or {}
    if formato not in FORMATI:
        formato = info0.get("formato_appunti") if info0.get("formato_appunti") in FORMATI else "cornell"
    gia = el.leggi_json(file_json(cartella, k, formato))
    if gia is None and parte_vuota(cartella, k):
        _segna_vuota(cartella, k)
        raise ParteVuota(k)
    zp, pdf_bytes = _pdf_del_pacchetto(cartella, k)
    spesa = 0.0
    if gia is None:
        dati, spesa = chiedi_a_claude(chiave, pdf_bytes, contesto=el.riga_studente(info0),
                                      lingua_appunti=testi.lingua_di(info0),
                                      lingua_lezione=info0.get("lingua_lezione") or "it", formato=formato,
                                      parole=el.parole_lezione(cartella), mio=info0.get("mio"),
                                      partecipanti=info0.get("partecipanti") or None,
                                      note=note_della_parte(cartella, k),
                                      aperte=info0.get("aperte_prima") or None,
                                      modello=info0.get("modello"), modello_mio=info0.get("modello_mio"))
        dati = ripara(dati)
        if formato == "mio" and info0.get("mio"):
            dati["mio_nome"] = info0["mio"].get("nome", "")
        dati["formato"] = formato
        if formato == "verbale":
            try:
                import cose
                cose.applica_fatte(cartella.parent, cartella, dati)
                dati["dall_ultima"] = int(k) == 1 and bool(info0.get("aperte_prima"))
            except Exception:
                log.exception("cose fatte")
        try:      # controllo di verita': citazioni, minuti e slide confrontati con la registrazione
            import verifica
            n_slide = len(el.leggi_json(cartella / f"pacchetto_{int(k):03d}.json", []) or [])
            n = verifica.controlla(dati, cartella, n_slide, testi.lingua_di(info0))
            log.info("controllo appunti parte %s (%s): %s avvisi", k, formato, n)
        except Exception:
            log.exception("controllo appunti")
        el.scrivi_json(file_json(cartella, k, formato), dati)
    else:
        dati = gia
    info = el.leggi_json(cartella / "info.json", {}) or {}
    # stesso nome del pacchetto: "<nome> – parte k (00h-01h)"
    base = zp.stem
    L = testi.lingua_di(info)
    etichetta = base.split(" – ")[-1] if " – " in base else f"{tr('parte', L)} {k}"
    dest = Path(cartella_pacchetti) / f"{_nome_file(L, formato)} – {base}.pdf"
    mappa = el.leggi_json(cartella / f"pacchetto_{k:03d}.json", []) or []
    slide = {m["n"]: (str(el.immagine_slide(cartella, m["file"])) if m.get("file") else None, m.get("inizio", 0))
             for m in mappa}
    pdf_appunti(dati, info, etichetta, dest, slide)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    appunti = info.get(chiave_info(formato)) or {}
    appunti[str(k)] = str(dest)
    el.aggiorna_info(cartella, **{chiave_info(formato): appunti},
                     spesa_appunti=round(float(info.get("spesa_appunti") or 0) + spesa, 4))
    return dest, spesa
