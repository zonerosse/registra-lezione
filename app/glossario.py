# -*- coding: utf-8 -*-
"""
«Glossario della materia»: tutte le parole difficili delle lezioni di una materia, spiegate semplici, con la slide
in cui il docente ne parla, la sua frase vera e il minuto della registrazione.

  1. Le parole vengono dagli appunti gia' fatti (parole chiave del Formato Esame, formulario del Cornell, parole
     chiave delle domande): niente da inventare.
  2. Claude (Haiku) unisce i doppioni fra le lezioni («pompa Na/K» = «pompa sodio-potassio»), scrive una
     spiegazione semplice di due righe, dice quali sono importanti e quali parole sono collegate.
  3. Qui si cercano nella trascrizione la frase del docente e il minuto, e la slide di quel momento.

Salvato in <registrazioni>/esami/<materia>_glossario.json; si rifa' quando cambiano gli appunti delle lezioni.
"""
import json
import logging
import re
import unicodedata
from pathlib import Path

import appunti as ap
import chiedi as ch
import elaborazione as el
import esame as es
import testi
from testi import tr

log = logging.getLogger("registra_lezione")

SCHEMA = {"type": "object", "properties": {"voci": {"type": "array", "items": {"type": "object", "properties": {
    "termine": {"type": "string", "description": "la forma migliore della parola (come la scriverebbe il libro)"},
    "definizione": {"type": "string", "description": "spiegazione semplice, 1-2 frasi corte, per uno studente (anche con DSA)"},
    "importante": {"type": "boolean", "description": "true se il docente ci ha insistito o e' un concetto centrale per l'esame"},
    "uguali": {"type": "array", "items": {"type": "string"}, "description": "le parole dell'elenco che sono la STESSA cosa (doppioni, sigle, grafie diverse)"},
    "collegate": {"type": "array", "items": {"type": "string"}, "description": "2-4 altri termini del glossario collegati"},
    "lezioni": {"type": "array", "items": {"type": "string"}, "description": "le sigle delle lezioni (L1, L2...) in cui compare"}},
    "required": ["termine", "definizione", "uguali", "lezioni"]}}}, "required": ["voci"]}


def _file(base, materia):
    f = es._file(base, materia)
    return f.with_name(f.stem + "_glossario.json")


def leggi(base, materia):
    return el.leggi_json(_file(base, materia), {}) or {}


def _norm(x):
    x = unicodedata.normalize("NFKD", str(x or "").lower())
    x = "".join(c for c in x if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", x).strip()


def _lista(x):
    if isinstance(x, str):
        try:
            x = json.loads(x)
        except ValueError:
            x = [x]
    return [str(v).strip() for v in (x if isinstance(x, list) else [x]) if str(v or "").strip()]


def candidati(cartelle):
    """Le parole degli appunti: [{"t", "s" (significato), "l" (L1...)}] e le lezioni [{"n", "cartella", "nome"}]."""
    lez = es._lezioni_test(cartelle)
    out, visti = [], set()
    for l in lez:
        for f in sorted(Path(l["cartella"]).glob("appunti_*.json")):
            d = ap.normalizza(el.leggi_json(f, {}) or {})
            coppie = []
            for v in d.get("parole_chiave") or []:
                if isinstance(v, dict):
                    coppie.append((v.get("parola"), v.get("significato")))
                elif isinstance(v, str):
                    coppie.append((v, ""))
            for v in d.get("formulario") or []:
                if isinstance(v, dict):
                    coppie.append((v.get("simbolo"), v.get("significato")))
            for b in (d.get("domande_probabili") or []) + (d.get("blocchi") or []):
                if isinstance(b, dict):
                    for k in _lista(b.get("parole_chiave")):
                        coppie.append((k, ""))
            for t, s in coppie:
                t = str(t or "").strip()[:80]
                if len(t) < 2:
                    continue
                k = (_norm(t), l["n"])
                if k in visti:
                    if s:
                        for c in out:
                            if (_norm(c["t"]), c["n"]) == k and not c["s"]:
                                c["s"] = str(s).strip()[:300]
                    continue
                visti.add(k)
                out.append({"t": t, "s": str(s or "").strip()[:300], "n": l["n"]})
    return out, lez


_CACHE = {}


def _segs(cart):
    k = ("s", str(cart))
    if k not in _CACHE:
        _CACHE[k] = [(s, " " + _norm(s.get("testo")) + " ") for s in ch.segmenti_lezione(cart)]
    return _CACHE[k]


def _slides(cart):
    k = ("l", str(cart))
    if k not in _CACHE:
        _CACHE[k] = ch.slide_della_lezione(cart)
    return _CACHE[k]


def _dove(voce, lez):
    """La prima frase della trascrizione (nelle lezioni della voce) che contiene la parola: frase, minuto, slide."""
    nomi = [voce["termine"]] + voce.get("uguali", [])
    chiavi = [k for k in {_norm(x) for x in nomi} if len(k) >= 3]
    if not chiavi:
        return None
    ordine = sorted(lez, key=lambda l: (0 if f"L{l['n']}" in voce.get("lezioni", []) else 1, l["n"]))
    for l in ordine:
        cart = Path(l["cartella"])
        for s, nt in _segs(cart):
            testo = str(s.get("testo") or "")
            if any(" " + k + " " in nt or (len(k) > 6 and k in nt) for k in chiavi):
                t = float(s.get("inizio") or 0)
                slide = None
                for sl in _slides(cart):
                    if float(sl.get("t") or 0) <= t + 1:
                        slide = sl
                return {"cartella": str(cart), "lezione": f"L{l['n']}", "nome": l["nome"], "sec": round(t, 1),
                        "fine": round(float(s.get("fine") or t + 8), 1), "frase": testo.strip()[:300],
                        "slide_n": slide["n"] if slide else None, "slide_file": slide["file"] if slide else None}
    return None


def crea(base, materia, cartelle, chiave, rifai=False, L="it"):
    """Il glossario (dalla cache se gli appunti non sono cambiati). Torna (glossario, spesa)."""
    cartelle = sorted(str(c) for c in cartelle if c)
    firma = es._firma(cartelle)
    f = _file(base, materia)
    gia = el.leggi_json(f, {}) or {}
    if not rifai and gia.get("voci") and gia.get("firma") == firma:
        return gia, 0.0
    cand, lez = candidati(cartelle)
    if not cand:
        raise ap.ErroreAppunti(tr("gl_vuoto", L))
    if not chiave:
        if gia.get("voci"):
            return gia, 0.0
        raise ap.ErroreAppunti(tr("manca_chiave", L))
    elenco = "\n".join(f"- {c['t']}" + (f": {c['s']}" if c["s"] else "") + f" [L{c['n']}]" for c in cand[:400])
    lezioni = "\n".join(f"L{l['n']} = {l['nome']}" for l in lez)
    corpo = {"model": ch.MODELLO, "max_tokens": 12000,
             "system": "Prepara il GLOSSARIO della materia da un elenco di parole prese dagli appunti di piu' lezioni. "
                       "Unisci i doppioni: parole che sono la stessa cosa (sigle, sinonimi, singolare/plurale, grafie "
                       "diverse) diventano UNA voce, e in \"uguali\" metti tutte le forme dell'elenco. Togli le parole "
                       "troppo generiche (es. \"cellula\" da sola se non e' spiegata) e i simboli senza significato. "
                       "Per ogni voce una spiegazione semplice di 1-2 frasi corte, come a un compagno, fedele agli appunti. "
                       "\"importante\" solo per i concetti centrali. Scrivi in " + testi.nome_lingua(L, "it") +
                       ". Chiama lo strumento salva_glossario.",
             "tools": [{"name": "salva_glossario", "description": "Salva il glossario.", "input_schema": SCHEMA}],
             "messages": [{"role": "user", "content": f"MATERIA: {materia}\nLEZIONI:\n{lezioni}\n\nPAROLE:\n{elenco}"}]}
    dati, usage = ch.strumento(chiave, corpo, "voci", "gl_err")
    voci, nomi = [], set()
    _CACHE.clear()
    for v in dati.get("voci") or []:
        if not isinstance(v, dict) or not str(v.get("termine") or "").strip() or not str(v.get("definizione") or "").strip():
            continue
        termine = str(v["termine"]).strip()[:80]
        if _norm(termine) in nomi:
            continue
        nomi.add(_norm(termine))
        voce = {"termine": termine, "definizione": str(v["definizione"]).strip()[:400], "importante": bool(v.get("importante")),
                "uguali": [x for x in _lista(v.get("uguali")) if _norm(x) != _norm(termine)][:8],
                "collegate": _lista(v.get("collegate"))[:4],
                "lezioni": [x for x in _lista(v.get("lezioni")) if re.fullmatch(r"L\d+", x)][:10]}
        voce["dove"] = _dove(voce, lez)
        voci.append(voce)
    if not voci:
        raise ap.ErroreAppunti(tr("gl_err", L))
    # le parole collegate solo se sono nel glossario
    for v in voci:
        v["collegate"] = [c for c in v["collegate"] if _norm(c) in nomi and _norm(c) != _norm(v["termine"])]
    voci.sort(key=lambda v: _norm(v["termine"]))
    out = {"firma": firma, "cartelle": cartelle, "voci": voci, "lezioni": [{"n": l["n"], "nome": l["nome"]} for l in lez],
           "ripassa": [x for x in gia.get("ripassa", []) if _norm(x) in nomi]}
    el.scrivi_json(f, out)
    spesa = ch._costo(usage)
    log.info("glossario %s: %d voci da %d parole, spesa %.4f $", materia, len(voci), len(cand), spesa)
    return out, spesa


def segna_ripassa(base, materia, termine, si):
    f = _file(base, materia)
    d = el.leggi_json(f, {}) or {}
    r = [x for x in d.get("ripassa", []) if x != termine]
    if si:
        r.append(termine)
    d["ripassa"] = r
    el.scrivi_json(f, d)
    return r


# --------------------------------------------------------------------------- PDF

def pdf(d, materia, dest, L="it"):
    from fpdf import FPDF
    p = FPDF(format="A4")
    p.set_auto_page_break(True, margin=16)
    p.set_margins(16, 14, 16)
    p.add_page()
    facile = bool(el.FACILITATA)
    if facile:
        reg, bold = el.font_dsa()
        p.add_font("G", "", str(reg))
        p.add_font("G", "B", str(bold))
        font, solo_latin = "G", False
    else:
        font, solo_latin = el._font_pdf(p)
    if not solo_latin and (el.CARTELLA_FONT / "DejaVuSans.ttf").exists():
        try:
            p.add_font("Simboli", "", str(el.CARTELLA_FONT / "DejaVuSans.ttf"))
            p.set_fallback_fonts(["Simboli"], exact_match=False)
        except Exception:
            pass

    def t(x):
        x = str(x or "")
        if solo_latin:
            x = x.replace("–", "-").replace("’", "'").replace("…", "...")
            return x.encode("latin-1", "replace").decode("latin-1")
        return x
    p.set_text_color(13, 66, 117)
    p.set_font(font, "B", 18)
    p.cell(0, 10, t(tr("gl_pdf_titolo", L, m=materia)), new_x="LMARGIN", new_y="NEXT")
    p.set_text_color(100, 116, 139)
    p.set_font(font, "", 9.5)
    p.multi_cell(0, 5, t(", ".join(f"L{l['n']} {l['nome']}" for l in d.get("lezioni", []))), align="L", new_x="LMARGIN", new_y="NEXT")
    p.ln(2)
    lettera = ""
    for v in d.get("voci", []):
        iniz = _norm(v["termine"])[:1].upper() or "#"
        if iniz != lettera:
            lettera = iniz
            p.ln(2)
            p.set_text_color(148, 163, 184)
            p.set_font(font, "B", 13)
            p.cell(0, 7, lettera, new_x="LMARGIN", new_y="NEXT")
        if p.get_y() > 265:
            p.add_page()
        p.set_text_color(15, 27, 45)
        p.set_font(font, "B", 11.5 if not facile else 12.5)
        p.cell(0, 6.5, t(("★ " if v.get("importante") else "") + v["termine"]), new_x="LMARGIN", new_y="NEXT")
        p.set_text_color(38, 53, 74)
        p.set_font(font, "", 10.5 if not facile else 11.5)
        p.multi_cell(0, 5.4 if not facile else 6.4, t(v["definizione"]), align="L", new_x="LMARGIN", new_y="NEXT")
        dv = v.get("dove")
        if dv:
            p.set_text_color(100, 116, 139)
            p.set_font(font, "", 8.5)
            sec = int(dv["sec"])
            ora = f"{sec // 3600}:{sec % 3600 // 60:02d}:{sec % 60:02d}" if sec >= 3600 else f"{sec // 60}:{sec % 60:02d}"
            p.cell(0, 4.6, t(f"{dv['lezione']} · min {ora}") +
                   (t(f" · slide {dv['slide_n']}") if dv.get("slide_n") else ""), new_x="LMARGIN", new_y="NEXT")
        p.ln(1.5)
    p.output(str(dest))
    return dest
