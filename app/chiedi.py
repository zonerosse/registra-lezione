# -*- coding: utf-8 -*-
"""
"Chiedi alla lezione" e "Mappa mentale": due cose piccole che fa Claude Haiku (costa pochissimo).

Chiedi: lo studente scrive cosa non ha capito; Claude risponde usando SOLO la trascrizione e le
slide di quella lezione (o gli appunti di tutta la materia) e indica dove: [[00:18:02]], [[slide 4]],
oppure, per la materia, [[L2 00:18:02]] (L2 = seconda lezione dell'elenco).
La lezione va nel "prompt caching": dalla seconda domanda in poi costa un decimo.

Mappa: dagli appunti (o dalla trascrizione) Claude fa uno schema ad albero, salvato in mappa.json.
"""
import json
import logging
import re
import time
from pathlib import Path

import appunti as ap
import elaborazione as el
import testi
from testi import tr

log = logging.getLogger("registra_lezione")

MODELLO = "claude-haiku-5-5"
# dollari per token (Haiku 5.5, fino a 100.000 token di domanda)
P_IN, P_OUT, P_CACHE_W, P_CACHE_R = 0.10e-6, 0.50e-6, 0.125e-6, 0.01e-6
P_IN_LUNGO, P_OUT_LUNGO = 0.50e-6, 2.50e-6


def _costo(uso):
    lungo = (uso.get("input_tokens", 0) + uso.get("cache_read_input_tokens", 0) +
             uso.get("cache_creation_input_tokens", 0)) > 100_000
    k = 5 if lungo else 1
    return k * (uso.get("input_tokens", 0) * P_IN + uso.get("output_tokens", 0) * P_OUT +
                uso.get("cache_creation_input_tokens", 0) * P_CACHE_W +
                uso.get("cache_read_input_tokens", 0) * P_CACHE_R)


def _chiama(chiave, corpo, tentativi=3):
    attesa = 5
    for n in range(tentativi):
        try:
            return ap._richiesta(chiave, "messages", corpo, timeout=180)
        except ap._Riprova as e:
            log.warning("Claude occupato (%s): riprovo tra %s s", e, attesa)
            if n == tentativi - 1:
                raise ap.ErroreAppunti(tr("ap_occupato"))
            time.sleep(attesa)
            attesa *= 2


def hms(sec):
    sec = int(sec or 0)
    return f"{sec // 3600:02d}:{sec // 60 % 60:02d}:{sec % 60:02d}"


# --------------------------------------------------------------------------- cosa sa Claude della lezione

def slide_della_lezione(cartella):
    """[{"n", "file", "t"}]: le slide in ordine, numerate come nella trascrizione mandata a Claude."""
    meta = el.leggi_json(Path(cartella) / "meta.json", {}) or {}
    return [{"n": i, "file": s["file"], "t": s["t"]}
            for i, s in enumerate(el.slide_in_tempo_audio(meta, cartella), 1)]


def segmenti_lezione(cartella):
    out = []
    for p in sorted(Path(cartella).glob("trascrizione_*.json")):
        out += el.leggi_json(p, []) or []
    return sorted(out, key=lambda s: s["inizio"])


def testo_lezione(cartella):
    """La trascrizione con gli orari e i punti in cui cambia slide."""
    slides = slide_della_lezione(cartella)
    righe, i = [], 0
    for s in segmenti_lezione(cartella):
        while i < len(slides) and slides[i]["t"] <= s["inizio"]:
            righe.append(f"--- Slide {slides[i]['n']} ({hms(slides[i]['t'])}) ---")
            i += 1
        righe.append(f"[{hms(s['inizio'])}] {s['testo']}")
    return "\n".join(righe)


def _appunti_compatti(cartella):
    """Gli appunti di una lezione in poche righe (per la materia intera)."""
    righe = []
    for f in sorted(Path(cartella).glob("appunti_*.json")):
        d = ap.normalizza(el.leggi_json(f, {}) or {})
        for b in d.get("domande_probabili") or d.get("blocchi") or []:
            corpo = b.get("schema") or b.get("appunti") or []
            righe.append(f"- {b.get('domanda', '')} ({b.get('dove', '')}): " + " / ".join(map(str, corpo)))
        if d.get("riassunto"):
            righe.append("Riassunto: " + d["riassunto"])
    return "\n".join(righe)


def contesto(cartelle):
    """(testo per Claude, tipo) - tipo "lezione" (una) o "materia" (piu' lezioni)."""
    if len(cartelle) == 1:
        c = Path(cartelle[0])
        info = el.leggi_json(c / "info.json", {}) or {}
        return f"LEZIONE: {info.get('nome', c.name)}\n\n{testo_lezione(c)}", "lezione"
    pezzi = []
    trascrizioni = [testo_lezione(c) for c in cartelle]
    # se le trascrizioni stanno comode (circa 80.000 token) uso quelle, altrimenti gli appunti
    usa_tr = sum(len(t) for t in trascrizioni) < 280_000
    for i, c in enumerate(cartelle, 1):
        info = el.leggi_json(Path(c) / "info.json", {}) or {}
        corpo = trascrizioni[i - 1] if usa_tr else _appunti_compatti(c)
        pezzi.append(f"=== L{i}: {info.get('nome', Path(c).name)} ({str(info.get('inizio', ''))[:10]}) ===\n{corpo}")
    return "\n\n".join(pezzi), "materia"


ISTRUZIONI = """Sei il tutor di uno studente universitario. Ti do la trascrizione automatica di {cosa}
(con gli orari e i punti in cui il docente cambia slide). La trascrizione puo' contenere errori di parole.

Lo studente ti fa domande su cio' che non ha capito. Regole:
- Rispondi usando SOLO quello che c'e' nel materiale. Se il docente non ne ha parlato, dillo chiaramente
  ("in questa lezione il docente non ne parla") e solo dopo, in una frase, cosa dice in generale la materia.
- Spiega in modo semplice e chiaro, come un compagno bravo: frasi brevi, un esempio se aiuta.
  Massimo 180 parole. Niente titoli; puoi usare **grassetto** per i termini importanti.
- Indica sempre DOVE se ne parla, con questi segni esatti (verranno trasformati in bottoni):
  {segni}
- Riporta tra virgolette le frasi del docente quando sono utili (es. un avvertimento per l'esame).
- Scrivi in {lingua}.{parole}"""


def domanda(chiave, cartelle, storia, testo_domanda, lingua=None):
    """Ritorna {"testo", "spesa"}. storia = [{"chi": "io"|"cl", "testo"}] (le ultime domande)."""
    lingua = lingua or testi.LINGUA
    ctx, tipo = contesto(cartelle)
    if not ctx.strip():
        raise ap.ErroreAppunti(tr("ch_vuoto"))
    if tipo == "lezione":
        cosa, segni = "una lezione", "[[00:18:02]] per un momento della lezione, [[slide 4]] per una slide."
    else:
        cosa = "piu' lezioni della stessa materia (L1, L2, ...)"
        segni = "[[L2 00:18:02]] per un momento della lezione L2, [[L2 slide 4]] per una slide della lezione L2."
    parole = el.parole_lezione(cartelle[0])
    sistema = ISTRUZIONI.format(cosa=cosa, segni=segni, lingua=testi.nome_lingua(lingua, "it"),
                                parole=("\n- Termini corretti della materia: " + ", ".join(parole)) if parole else "")
    messaggi = [{"role": "user", "content": [
        {"type": "text", "text": ctx, "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": "Ecco il materiale. Ora le domande dello studente."}]},
        {"role": "assistant", "content": "Ho letto tutto. Chiedimi pure."}]
    for m in (storia or [])[-8:]:
        messaggi.append({"role": "user" if m.get("chi") == "io" else "assistant", "content": str(m.get("testo", ""))})
    messaggi.append({"role": "user", "content": testo_domanda})
    r = _chiama(chiave, {"model": MODELLO, "max_tokens": 900, "system": sistema, "messages": messaggi})
    risposta = "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text").strip()
    spesa = _costo(r.get("usage", {}))
    log.info("chiedi alla lezione: %s, spesa %.4f $", r.get("usage"), spesa)
    return {"testo": risposta, "spesa": spesa}


def momento(cartella, sec, slide_n=None):
    """Cosa succede in un punto della lezione: slide (immagine piccola) e parole del docente intorno."""
    import base64
    import io
    from PIL import Image
    slides = slide_della_lezione(cartella)
    if slide_n:
        s = next((x for x in slides if x["n"] == int(slide_n)), None)
        if s:
            sec = s["t"]
    attuale = None
    for s in slides:
        if s["t"] <= (sec or 0) + 1:
            attuale = s
    img = ""
    if attuale:
        try:
            with Image.open(el.immagine_slide(cartella, attuale["file"])) as im:
                im.thumbnail((640, 400))
                b = io.BytesIO()
                im.convert("RGB").save(b, "JPEG", quality=80)
            img = "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
        except Exception:
            log.exception("slide del momento")
    frasi = [s for s in segmenti_lezione(cartella) if sec - 20 <= s["inizio"] <= sec + 70]
    return {"sec": int(sec or 0), "ora": hms(sec), "slide": attuale["n"] if attuale else None, "img": img,
            "frasi": [{"ora": hms(s["inizio"]), "testo": s["testo"]} for s in frasi]}


# --------------------------------------------------------------------------- mappa mentale

SCHEMA_MAPPA = {"type": "object", "properties": {
    "centro": {"type": "string", "description": "argomento della lezione, 1-4 parole"},
    "rami": {"type": "array", "minItems": 3, "maxItems": 6, "items": {"type": "object", "properties": {
        "titolo": {"type": "string", "description": "2-5 parole"},
        "foglie": {"type": "array", "minItems": 1, "maxItems": 4,
                   "items": {"type": "string", "description": "al massimo 7 parole"}}},
        "required": ["titolo", "foglie"]}}},
    "required": ["centro", "rami"]}


def crea_mappa(chiave, cartella, lingua=None):
    cartella = Path(cartella)
    lingua = lingua or testi.lingua_di(el.leggi_json(cartella / "info.json", {}) or {})
    materiale = _appunti_compatti(cartella)
    if len(materiale) < 200:
        materiale = testo_lezione(cartella)[:200_000]
    if not materiale.strip():
        raise ap.ErroreAppunti(tr("ch_vuoto"))
    corpo = {"model": MODELLO, "max_tokens": 1500,
             "system": "Fai la mappa mentale di una lezione universitaria per uno studente: l'argomento al centro, "
                       "3-6 rami con i grandi temi nell'ordine della lezione, per ogni ramo 1-4 foglie brevissime "
                       "(definizioni, formule, nomi di teoremi, esempi). Niente frasi lunghe. Scrivi in "
                       f"{testi.nome_lingua(lingua, 'it')}. Chiama lo strumento salva_mappa.",
             "tools": [{"name": "salva_mappa", "description": "Salva la mappa mentale.", "input_schema": SCHEMA_MAPPA}],
             # come per gli appunti: "auto" (alcuni modelli non accettano "tool"); le istruzioni chiedono lo strumento
             # e c'e' il piano B (JSON nel testo)
             "tool_choice": {"type": "auto"},
             "messages": [{"role": "user", "content": materiale}]}
    r = _chiama(chiave, corpo)
    blocco = next((b for b in r.get("content", []) if b.get("type") == "tool_use"), None)
    dati = blocco["input"] if blocco else None
    if not dati:
        testo = "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text")
        try:
            dati = json.loads(testo[testo.find("{"):testo.rfind("}") + 1])
        except ValueError:
            dati = None
    if not dati or not dati.get("rami"):
        raise ap.ErroreAppunti(tr("ch_mappa_err"))
    dati = {"centro": str(dati.get("centro", ""))[:60],
            "rami": [{"titolo": str(x.get("titolo", ""))[:60], "foglie": [str(f)[:80] for f in (x.get("foglie") or [])[:4]]}
                     for x in dati["rami"][:6]]}
    spesa = _costo(r.get("usage", {}))
    el.scrivi_json(cartella / "mappa.json", dati)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    el.aggiorna_info(cartella, spesa_appunti=round(float(info.get("spesa_appunti") or 0) + spesa, 4))
    log.info("mappa mentale: %s, spesa %.4f $", r.get("usage"), spesa)
    return dati, spesa


# disposizione dei rami: meta' a destra e meta' a sinistra, uno sotto l'altro (uguale in JS e nel PDF)
def disposizione(dati, W=900):
    rami = dati.get("rami") or []
    destra = rami[:(len(rami) + 1) // 2]
    sinistra = rami[(len(rami) + 1) // 2:]

    def alt(r):
        return 44 + 30 * len(r["foglie"])
    H = max(sum(alt(r) + 26 for r in destra), sum(alt(r) + 26 for r in sinistra), 260) + 20
    out = []
    for lato, gruppo in ((1, destra), (-1, sinistra)):
        tot = sum(alt(r) + 26 for r in gruppo) - 26
        y = (H - tot) / 2
        for r in gruppo:
            out.append({"x": W / 2 + lato * (W * 0.31), "y": y + 20, "lato": lato, "ramo": r})
            y += alt(r) + 26
    return {"W": W, "H": H, "cx": W / 2, "cy": H / 2, "rami": out}


COLORI = ["#0369a1", "#7c3aed", "#c2410c", "#059669", "#be123c", "#0891b2"]


def pdf_mappa(dati, info, dest):
    from fpdf import FPDF
    L = testi.lingua_di(info)
    D = disposizione(dati)
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(False)
    pdf.add_page()
    font, solo_latin = el._font_pdf(pdf)
    for extra in (Path(r"C:\Windows\Fonts\seguisym.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")):
        if not solo_latin and extra.exists():
            try:
                pdf.add_font("Simboli", "", str(extra))
                pdf.set_fallback_fonts(["Simboli"], exact_match=False)
            except Exception:
                pass
            break

    def t(x):
        x = str(x or "")
        return x.encode("latin-1", "replace").decode("latin-1") if solo_latin else x
    pdf.set_font(font, "B", 15)
    pdf.set_text_color(13, 66, 117)
    pdf.set_xy(12, 9)
    pdf.cell(0, 8, t(f"{tr('mp_titolo', L)} – {info.get('nome', '')}"))
    # dal disegno (W x H punti) alla pagina (277 x 175 mm, sotto il titolo)
    sc = min(273 / D["W"], 172 / D["H"])
    ox, oy = 12 + (273 - D["W"] * sc) / 2, 22 + (172 - D["H"] * sc) / 2

    def P(x, y):
        return ox + x * sc, oy + y * sc

    def rgb(h):
        return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
    for i, r in enumerate(D["rami"]):
        c = rgb(COLORI[i % len(COLORI)])
        pdf.set_draw_color(*c)
        pdf.set_line_width(0.8)
        x0, y0 = P(D["cx"], D["cy"])
        x1, y1 = P(r["x"] - r["lato"] * 110, r["y"])
        pdf.bezier([(x0, y0), ((x0 + x1) / 2, y0), ((x0 + x1) / 2, y1), (x1, y1)])
    cx, cy = P(D["cx"], D["cy"])
    pdf.set_fill_color(13, 66, 117)
    pdf.rect(cx - 80 * sc, cy - 26 * sc, 160 * sc, 52 * sc, style="F", round_corners=True, corner_radius=26 * sc)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font(font, "B", 13)
    pdf.set_xy(cx - 80 * sc, cy - 26 * sc)
    pdf.cell(160 * sc, 52 * sc, t(dati.get("centro", "")), align="C")
    for i, r in enumerate(D["rami"]):
        c = rgb(COLORI[i % len(COLORI)])
        x, y = P(r["x"] - 110, r["y"] - 20)
        pdf.set_draw_color(*c)
        pdf.set_fill_color(255, 255, 255)
        pdf.set_line_width(0.6)
        pdf.rect(x, y, 220 * sc, 40 * sc, style="DF", round_corners=True, corner_radius=10 * sc)
        pdf.set_text_color(*c)
        pdf.set_font(font, "B", 10.5)
        pdf.set_xy(x, y)
        pdf.cell(220 * sc, 40 * sc, t(r["ramo"]["titolo"]), align="C")
        pdf.set_font(font, "", 9)
        pdf.set_text_color(38, 53, 74)
        for j, f in enumerate(r["ramo"]["foglie"]):
            fx, fy = P(r["x"] - 115, r["y"] + 30 + j * 30)
            pdf.set_fill_color(*[int(v + (255 - v) * 0.9) for v in c])
            pdf.rect(fx, fy, 230 * sc, 24 * sc, style="F", round_corners=True, corner_radius=12 * sc)
            pdf.set_xy(fx, fy)
            pdf.cell(230 * sc, 24 * sc, t(f), align="C")
    pdf.set_text_color(130, 140, 155)
    pdf.set_font(font, "", 8)
    pdf.set_xy(12, 200)
    pdf.cell(0, 5, t(tr("pdf_creato", L)), align="C")
    pdf.output(str(dest))
    return dest
