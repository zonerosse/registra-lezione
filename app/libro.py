# -*- coding: utf-8 -*-
"""
«Libro di testo» della materia: il PDF del libro (o le dispense) collegato alle lezioni.

  - Il testo si legge QUI con pypdf (il libro non va su internet): una pagina alla volta, in pagine.json.
  - Un indice di ricerca fatto qui (BM25 sulle parole delle pagine) trova le pagine giuste per ogni lezione
    (parole chiave e domande degli appunti) e per ogni domanda di «Chiedi» / tutor, e per le flashcard e il glossario.
  - «Nel libro, ma a lezione non si e' detto»: Claude (Haiku) legge SOLO le pagine collegate alle lezioni e gli
    argomenti delle lezioni, e dice cosa c'e' nel libro che a lezione manca; qui si guarda nella trascrizione se il
    docente l'ha almeno nominato (e a che minuto).

Tutto in <registrazioni>/esami/<materia>_libro/: documenti.json, pagine_<k>.json, collegamenti.json.
Il PDF non viene copiato: si ricorda solo dov'e' (per «Apri il PDF»).
"""
import json
import logging
import math
import re
import shutil
import sys
import unicodedata
from collections import Counter
from pathlib import Path

import appunti as ap
import chiedi as ch
import elaborazione as el
import esame as es
import testi
from testi import tr

log = logging.getLogger("registra_lezione")
QUI = Path(__file__).resolve().parent

VUOTE = set("""il lo la i gli le un uno una di a da in con su per tra fra e o ed od ma se che chi cui non piu meno come
quando dove anche ancora gia poi solo molto molti molta molte poco tutto tutti tutta tutte questo questa questi queste
quello quella quelli quelle del dello della dei degli delle al allo alla ai agli alle dal dallo dalla dai dagli dalle nel
nello nella nei negli nelle sul sullo sulla sui sugli sulle col coi essere avere e sono era erano ha hanno hai ho viene
vengono puo possono deve devono fa fanno si ci vi ne loro suo sua suoi sue nostro vostro quindi cosi ovvero cioe infatti
the of and to in is are a an for on with as by from that this these those be it its at or not which into""".split())


def cartella(base, materia):
    f = es._file(base, materia)
    c = f.with_name(f.stem + "_libro")
    c.mkdir(parents=True, exist_ok=True)
    return c


def _norm(x):
    x = unicodedata.normalize("NFKD", str(x or "").lower())
    x = "".join(c for c in x if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", x)


def _parole(x):
    out = []
    for w in _norm(x).split():
        if len(w) < 3 or w in VUOTE or w.isdigit():
            continue
        out.append(w[:7])         # radice grezza: «potenziale», «potenziali» -> «potenzi»
    return out


def documenti(base, materia):
    return el.leggi_json(cartella(base, materia) / "documenti.json", []) or []


def pagine(base, materia, k):
    return el.leggi_json(cartella(base, materia) / f"pagine_{k}.json", []) or []


# --------------------------------------------------------------------------- lettura del PDF

def _pypdf():
    v = str(QUI / "_vendor")
    if v not in sys.path:
        sys.path.insert(0, v)
    import pypdf
    return pypdf


def leggi_pdf(percorso, avanzamento=lambda f: None):
    """[{"n": indice, "et": numero stampato, "t": testo, "cap": capitolo}] di un PDF."""
    pypdf = _pypdf()
    r = pypdf.PdfReader(str(percorso))
    try:
        etichette = list(r.page_labels)
    except Exception:
        etichette = []
    # i capitoli dall'indice del PDF (segnalibri), se ci sono
    cap = {}
    try:
        def giro(voci):
            for v in voci:
                if isinstance(v, list):
                    giro(v)
                    continue
                try:
                    cap.setdefault(r.get_destination_page_number(v), str(v.title).strip()[:80])
                except Exception:
                    pass
        giro(r.outline)
    except Exception:
        pass
    out, attuale, tot = [], "", len(r.pages)
    for i, p in enumerate(r.pages):
        try:
            testo = p.extract_text() or ""
        except Exception:
            testo = ""
        testo = re.sub(r"[ \t]+", " ", testo)
        testo = re.sub(r"-\n(\w)", r"\1", testo)           # parole spezzate a fine riga
        attuale = cap.get(i, attuale)
        out.append({"n": i + 1, "et": etichette[i] if i < len(etichette) and etichette[i] else str(i + 1),
                    "t": testo.strip()[:12000], "cap": attuale})
        if i % 10 == 0:
            avanzamento(0.7 * (i + 1) / max(1, tot))
    return out


def aggiungi(base, materia, percorso, sostituisci, avanzamento=lambda f: None):
    """Legge il PDF e lo aggiunge (o sostituisce i documenti). Errore se e' fatto di foto."""
    pag = leggi_pdf(percorso, avanzamento)
    if not pag:
        raise ap.ErroreAppunti(tr("lb_err"))
    caratteri = sum(len(p["t"]) for p in pag) / len(pag)
    if caratteri < 150:
        raise ap.ErroreAppunti(tr("lb_foto"))
    c = cartella(base, materia)
    docs = [] if sostituisci else documenti(base, materia)
    if sostituisci:
        for f in c.glob("pagine_*.json"):
            f.unlink()
        (c / "collegamenti.json").unlink(missing_ok=True)
    k = max([d["k"] for d in docs] + [0]) + 1
    el.scrivi_json(c / f"pagine_{k}.json", pag)
    docs.append({"k": k, "nome": Path(percorso).name, "percorso": str(percorso), "pagine": len(pag),
                 "tipo": "libro" if not docs else "dispense"})
    el.scrivi_json(c / "documenti.json", docs)
    (c / "indice.json").unlink(missing_ok=True)
    return docs


def togli(base, materia, k):
    c = cartella(base, materia)
    docs = [d for d in documenti(base, materia) if d["k"] != k]
    (c / f"pagine_{k}.json").unlink(missing_ok=True)
    el.scrivi_json(c / "documenti.json", docs)
    (c / "indice.json").unlink(missing_ok=True)
    (c / "collegamenti.json").unlink(missing_ok=True)
    if not docs:
        shutil.rmtree(c, ignore_errors=True)
    return docs


# --------------------------------------------------------------------------- ricerca (BM25, fatta qui)

class Indice:
    def __init__(self, base, materia):
        self.docs = documenti(base, materia)
        self.pag = []                      # (k, n, et, cap, parole Counter, lunghezza)
        self.df = Counter()
        for d in self.docs:
            for p in pagine(base, materia, d["k"]):
                w = Counter(_parole(p["t"]))
                self.pag.append((d["k"], p["n"], p["et"], p.get("cap", ""), w, sum(w.values()) or 1))
                self.df.update(w.keys())
        self.N = len(self.pag) or 1
        self.lm = sum(x[5] for x in self.pag) / self.N

    def punteggi(self, testo):
        q = Counter(_parole(testo))
        if not q:
            return []
        out = []
        for i, (k, n, et, cap, w, lung) in enumerate(self.pag):
            s = 0.0
            for t, qt in q.items():
                f = w.get(t)
                if not f:
                    continue
                idf = math.log(1 + (self.N - self.df[t] + 0.5) / (self.df[t] + 0.5))
                s += idf * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * lung / self.lm)) * min(qt, 3)
            if s > 0:
                out.append((s, i))
        out.sort(reverse=True)
        return out

    def cerca(self, testo, n=3):
        """Le n pagine migliori: [{"k", "n", "et", "cap", "punti"}]."""
        return [{"k": self.pag[i][0], "n": self.pag[i][1], "et": self.pag[i][2], "cap": self.pag[i][3], "punti": round(s, 2)}
                for s, i in self.punteggi(testo)[:n]]

    def tratto(self, testo):
        """Il tratto di pagine consecutive piu' adatto (per una lezione): {"k", "da", "a", "et_da", "et_a", "cap"}."""
        p = self.punteggi(testo)
        if not p:
            return None
        meglio = p[0][0]
        forti = {i for s, i in p if s >= 0.35 * meglio}
        i0 = p[0][1]
        k0 = self.pag[i0][0]
        da = a = i0
        while da - 1 >= 0 and self.pag[da - 1][0] == k0 and (da - 1 in forti or da - 2 in forti) and i0 - da < 12:
            da -= 1
        while a + 1 < len(self.pag) and self.pag[a + 1][0] == k0 and (a + 1 in forti or a + 2 in forti) and a - i0 < 12:
            a += 1
        while da < i0 and da not in forti:
            da += 1
        while a > i0 and a not in forti:
            a -= 1
        return {"k": k0, "da": self.pag[da][1], "a": self.pag[a][1], "et_da": self.pag[da][2], "et_a": self.pag[a][2],
                "cap": self.pag[i0][3]}


_INDICI = {}


def indice(base, materia):
    c = cartella(base, materia)
    firma = tuple((d["k"], d["pagine"]) for d in documenti(base, materia))
    x = _INDICI.get(str(c))
    if not x or x[0] != firma:
        x = (firma, Indice(base, materia))
        _INDICI[str(c)] = x
    return x[1]


def _testo_lezione_per_ricerca(cart):
    """Le parole che descrivono una lezione: titolo, domande, parole chiave degli appunti."""
    righe = []
    for f in sorted(Path(cart).glob("appunti_*.json")):
        d = ap.normalizza(el.leggi_json(f, {}) or {})
        righe.append(str(d.get("titolo") or ""))
        for b in (d.get("domande_probabili") or []) + (d.get("blocchi") or []):
            if isinstance(b, dict):
                righe.append(str(b.get("domanda") or ""))
                righe += [str(x) for x in (b.get("parole_chiave") or []) if isinstance(x, str)]
        for v in d.get("parole_chiave") or []:
            righe.append(str(v.get("parola") if isinstance(v, dict) else v))
    return "\n".join(righe)


def pagine_per_lezione(base, materia, cartelle):
    idx = indice(base, materia)
    out = []
    for l in es._lezioni_test(cartelle):
        t = idx.tratto(_testo_lezione_per_ricerca(l["cartella"]))
        out.append({"n": l["n"], "cartella": l["cartella"], "nome": l["nome"], "data": l["data"], "tratto": t})
    return out


# --------------------------------------------------------------------------- nel libro ma non a lezione

SCHEMA = {"type": "object", "properties": {"mancano": {"type": "array", "items": {"type": "object", "properties": {
    "argomento": {"type": "string", "description": "2-6 parole"},
    "pagina": {"type": "string", "description": "il numero della pagina (come scritto in [PAGINA ...])"},
    "perche": {"type": "string", "description": "una frase: perche' e' importante"}},
    "required": ["argomento", "pagina"]}}}, "required": ["mancano"]}


def mancano(base, materia, cartelle, chiave, rifai=False, L="it"):
    """Gli argomenti delle pagine collegate alle lezioni che a lezione non si sono detti. Torna (dati, spesa)."""
    c = cartella(base, materia)
    firma = [es._firma(sorted(cartelle)), [[d["k"], d["pagine"]] for d in documenti(base, materia)]]
    f = c / "collegamenti.json"
    gia = el.leggi_json(f, {}) or {}
    if not rifai and gia.get("firma") == firma:
        return gia, 0.0
    lez = pagine_per_lezione(base, materia, cartelle)
    pg = {}
    for d in documenti(base, materia):
        for p in pagine(base, materia, d["k"]):
            pg[(d["k"], p["n"])] = p
    blocchi, argomenti = [], []
    usate = 0
    for l in lez:
        t = l["tratto"]
        argomenti.append(f"L{l['n']} {l['nome']}: " + _testo_lezione_per_ricerca(l["cartella"]).replace("\n", " · ")[:1500])
        if not t:
            continue
        for n in range(t["da"], t["a"] + 1):
            p = pg.get((t["k"], n))
            if p and usate < 45:
                blocchi.append(f"[PAGINA {p['et']}]\n{p['t'][:3500]}")
                usate += 1
    out = {"firma": firma, "lezioni": lez, "mancano": []}
    spesa = 0.0
    if blocchi and chiave:
        corpo = {"model": ch.MODELLO, "max_tokens": 2500,
                 "system": "Confronta le pagine del libro con gli argomenti trattati a lezione. Elenca al massimo 8 argomenti "
                           "IMPORTANTI per l'esame che nel libro ci sono ma a lezione NON sono stati trattati (o solo di "
                           "sfuggita), con la pagina in cui il libro li spiega. Non elencare cose secondarie (esempi, box "
                           "di curiosita', esercizi). Scrivi in " + testi.nome_lingua(L, "it") + ". Chiama lo strumento salva_mancano.",
                 "tools": [{"name": "salva_mancano", "description": "Salva gli argomenti mancanti.", "input_schema": SCHEMA}],
                 "messages": [{"role": "user", "content": "ARGOMENTI DELLE LEZIONI:\n" + "\n".join(argomenti) +
                               "\n\nPAGINE DEL LIBRO:\n" + "\n\n".join(blocchi)}]}
        dati, usage = ch.strumento(chiave, corpo, "mancano", "lb_err")
        spesa = ch._costo(usage)
        etichette = {}
        for (k, n), p in pg.items():
            etichette.setdefault(str(p["et"]), (k, n))
        for x in dati.get("mancano") or []:
            if not isinstance(x, dict) or not str(x.get("argomento") or "").strip():
                continue
            pagina = str(x.get("pagina") or "").strip()
            kn = etichette.get(pagina)
            voce = {"argomento": str(x["argomento"]).strip()[:80], "perche": str(x.get("perche") or "").strip()[:200],
                    "et": pagina, "k": kn[0] if kn else None, "n": kn[1] if kn else None, "nominato": None}
            voce["nominato"] = _nominato(voce["argomento"], lez)
            out["mancano"].append(voce)
    el.scrivi_json(f, out)
    return out, spesa


def _nominato(argomento, lez):
    """Se il docente l'ha almeno nominato: {"lezione", "sec"}."""
    parole = [w for w in _norm(argomento).split() if len(w) > 4 and w not in VUOTE]
    if not parole:
        return None
    for l in lez:
        for s in ch.segmenti_lezione(l["cartella"]):
            t = _norm(s.get("testo"))
            if sum(1 for w in parole if w[:6] in t) >= max(1, (len(parole) + 1) // 2):
                return {"lezione": f"L{l['n']}", "cartella": l["cartella"], "sec": round(float(s.get("inizio") or 0), 1)}
    return None


def contesto_domanda(base, materia, domanda, n=3):
    """Per «Chiedi» e il tutor: le pagine del libro piu' adatte alla domanda (testo da mettere nelle istruzioni)."""
    if not documenti(base, materia):
        return ""
    idx = indice(base, materia)
    righe = []
    for r in idx.cerca(domanda, n):
        if r["punti"] < 1.5:
            continue
        p = next((x for x in pagine(base, materia, r["k"]) if x["n"] == r["n"]), None)
        if p:
            righe.append(f"[LIBRO pagina {p['et']}]\n{p['t'][:3500]}")
    if not righe:
        return ""
    return ("\n\nHAI ANCHE QUESTE PAGINE DEL LIBRO DI TESTO DELLO STUDENTE. Usale quando la lezione non basta (dillo: "
            "«a lezione no, ma il libro…») e indica la pagina con il segno esatto [[libro p. NUMERO]].\n" + "\n\n".join(righe))
