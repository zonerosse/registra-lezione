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


def strumento(chiave, corpo, campo, chiave_errore):
    """Chiama Claude OBBLIGANDOLO a usare lo strumento e torna (input, usage). Se la lista `campo` arriva vuota,
    scritta come testo JSON o tagliata (risposta troppo lunga), riprova con piu' spazio. Se non va: ErroreAppunti."""
    nome = corpo["tools"][0]["name"]
    corpo = dict(corpo, tool_choice={"type": "tool", "name": nome})
    usage = {}
    for prova in range(3):
        r = _chiama(chiave, corpo)
        for k, v in (r.get("usage") or {}).items():
            if isinstance(v, (int, float)):
                usage[k] = usage.get(k, 0) + v
        blocco = next((b for b in r.get("content", []) if b.get("type") == "tool_use"), None)
        dati = (blocco or {}).get("input") or {}
        if not dati:                           # piano B: il JSON scritto nel testo
            testo = "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text")
            try:
                dati = json.loads(testo[testo.find("{"):testo.rfind("}") + 1])
            except ValueError:
                dati = {}
        if isinstance(dati, str):
            try:
                dati = json.loads(dati)
            except ValueError:
                dati = {}
        v = dati.get(campo) if isinstance(dati, dict) else None
        if isinstance(v, str):                 # a volte la lista arriva come testo JSON
            try:
                v = json.loads(v)
            except ValueError:
                v = None
            dati[campo] = v
        if isinstance(v, list) and any(isinstance(x, dict) for x in v):
            dati[campo] = [x for x in v if isinstance(x, dict)]
            return dati, usage
        if isinstance(v, list) and v and all(isinstance(x, str) for x in v):
            return dati, usage
        log.warning("%s: %s vuoto (prova %s, stop=%s, risposta=%.300r)", nome, campo, prova + 1, r.get("stop_reason"),
                    json.dumps(r.get("content", []), ensure_ascii=False))
        corpo = dict(corpo, max_tokens=int(corpo.get("max_tokens", 2000) * 2))
    raise ap.ErroreAppunti(tr(chiave_errore))


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
    segs = segmenti_lezione(cartella)
    voci = len({s.get("chi") for s in segs if s.get("chi")}) >= 2
    for s in segs:
        while i < len(slides) and slides[i]["t"] <= s["inizio"]:
            righe.append(f"--- Slide {slides[i]['n']} ({hms(slides[i]['t'])}) ---")
            i += 1
        chi = f"{s['chi']}: " if voci and s.get("chi") else ""
        righe.append(f"[{hms(s['inizio'])}] {chi}{s['testo']}")
    # foto fatte in aula (lavagna) gia' lette e appunti scritti a mano dello studente
    foto = [f for f in el.leggi_json(Path(cartella) / "foto.json", []) or [] if f.get("testo")]
    if foto:
        righe.append("\n=== FOTO FATTE IN AULA (cosa c'e' scritto) ===")
        righe += [f"[{hms(f['sec'])}] {f['testo']}" for f in foto]
    scritti = [f for f in el.leggi_json(Path(cartella) / "scritti.json", []) or [] if f.get("testo")]
    if scritti:
        righe.append("\n=== APPUNTI SCRITTI A MANO DALLO STUDENTE (o fotocopie) ===")
        righe += [f["testo"] for f in scritti]
    return "\n".join(righe)


def _appunti_compatti(cartella):
    """Gli appunti di una lezione in poche righe (per la materia intera)."""
    righe = []
    for f in sorted(Path(cartella).glob("appunti_*.json")):
        d = ap.normalizza(el.leggi_json(f, {}) or {})
        for b in d.get("domande_probabili") or d.get("blocchi") or d.get("sezioni") or d.get("punti_discussi") or []:
            corpo = b.get("schema") or b.get("appunti") or b.get("punti") or []
            righe.append(f"- {b.get('domanda') or b.get('titolo', '')} ({b.get('dove', '')}): " + " / ".join(map(str, corpo)))
        for x in d.get("decisioni") or []:
            righe.append(f"- Decisione: {x.get('testo', '')}")
        for x in d.get("azioni") or []:
            righe.append(f"- Da fare: {x.get('cosa', '')} ({x.get('chi', '')} {x.get('entro', '')})")
        if d.get("riassunto") or d.get("in_breve"):
            righe.append("Riassunto: " + (d.get("riassunto") or d.get("in_breve")))
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


def domanda(chiave, cartelle, storia, testo_domanda, lingua=None, extra=""):
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
                                parole=("\n- Termini corretti della materia: " + ", ".join(parole)) if parole else "") + (extra or "")
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
    corpo = {"model": MODELLO, "max_tokens": 3000,
             "system": "Fai la mappa mentale di una lezione universitaria per uno studente: l'argomento al centro, "
                       "3-6 rami con i grandi temi nell'ordine della lezione, per ogni ramo 1-4 foglie brevissime "
                       "(definizioni, formule, nomi di teoremi, esempi). Niente frasi lunghe. Scrivi in "
                       f"{testi.nome_lingua(lingua, 'it')}. Chiama lo strumento salva_mappa.",
             "tools": [{"name": "salva_mappa", "description": "Salva la mappa mentale.", "input_schema": SCHEMA_MAPPA}],
             "messages": [{"role": "user", "content": materiale}]}
    dati, usage = strumento(chiave, corpo, "rami", "ch_mappa_err")
    r = {"usage": usage}

    def foglie(x):
        f = x.get("foglie") or []
        if isinstance(f, str):
            try:
                f = json.loads(f)
            except ValueError:
                f = [f]
        return [str(v)[:80] for v in (f if isinstance(f, list) else [f])[:4] if v]
    dati = {"centro": str(dati.get("centro", ""))[:60],
            "rami": [{"titolo": str(x.get("titolo", ""))[:60], "foglie": foglie(x)} for x in dati["rami"][:6]]}
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
    for extra in (Path(r"C:\Windows\Fonts\seguisym.ttf"), el.CARTELLA_FONT / "DejaVuSans.ttf"):
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
    colore = lambda i, r: rgb(COLORI[(r["ramo"].get("colore", i) if isinstance(r["ramo"].get("colore", i), int) else i) % len(COLORI)])
    for i, r in enumerate(D["rami"]):
        c = colore(i, r)
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
        c = colore(i, r)
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


# --------------------------------------------------------------------------- infografica: tutto in una pagina
SCHEMA_INFO = {"type": "object", "properties": {
    "titolo": {"type": "string", "description": "massimo 6 parole"},
    "concetti": {"type": "array", "description": "3-4 concetti chiave", "items": {"type": "object", "properties": {
        "grande": {"type": "string", "description": "formula, numero o parola chiave, cortissimo"},
        "testo": {"type": "string", "description": "una riga"},
        "importante": {"type": "boolean", "description": "true se e' il punto su cui si e' insistito di piu'"}},
        "required": ["grande", "testo"]}},
    "passi": {"type": "array", "items": {"type": "string"}, "description": "3-5 passi brevi: come si fa / come si procede"},
    "attenzione": {"type": "string", "description": "l'errore tipico o l'avvertenza principale, una riga"},
    "citazione": {"type": "string", "description": "una frase detta davvero, copiata dalla trascrizione (vuoto se nessuna)"}},
    "required": ["titolo", "concetti", "passi"]}


def crea_infografica(cartella, chiave, rifai=False, lingua=None):
    """La registrazione in una pagina (concetti chiave, procedimento, attenzione). Salvata in infografica.json."""
    cartella = Path(cartella)
    f = cartella / "infografica.json"
    gia = el.leggi_json(f) if not rifai else None
    if gia:
        return {"dati": gia, "spesa": 0.0}
    info = el.leggi_json(cartella / "info.json", {}) or {}
    lingua = lingua or testi.lingua_di(info)
    materiale = _appunti_compatti(cartella)
    if len(materiale) < 200:
        materiale = testo_lezione(cartella)[:200_000]
    if not materiale.strip():
        raise ap.ErroreAppunti(tr("ch_vuoto"))
    tipo = info.get("tipo") or "lezione"
    corpo = {"model": MODELLO, "max_tokens": 3000,
             "system": f"Fai l'infografica di una {'riunione di lavoro' if tipo == 'riunione' else 'lezione' if tipo == 'lezione' else 'presentazione'}: "
                       "tutto quello che conta in UNA pagina da guardare in un minuto. 3-4 concetti chiave (ognuno con una "
                       "parte 'grande' cortissima: formula, cifra o parola), i passi del procedimento (o le prossime mosse), "
                       "l'avvertenza principale. Usa solo il materiale ricevuto, niente di inventato. Testi brevissimi. "
                       f"Scrivi in {testi.nome_lingua(lingua, 'it')}. Chiama lo strumento salva_infografica.",
             "tools": [{"name": "salva_infografica", "description": "Salva l'infografica.", "input_schema": SCHEMA_INFO}],
             "messages": [{"role": "user", "content": materiale}]}
    dati, usage = strumento(chiave, corpo, "concetti", "if_err")
    r = {"usage": usage}
    # la citazione deve esserci davvero, altrimenti la tolgo
    if dati.get("citazione"):
        try:
            import verifica
            if not verifica.Trascrizione(cartella).contiene(dati["citazione"]):
                dati["citazione"] = ""
        except Exception:
            dati["citazione"] = ""
    durata = info.get("durata") or 0
    dati = {"titolo": str(dati.get("titolo", ""))[:70],
            "concetti": [{"grande": str(c.get("grande", ""))[:40], "testo": str(c.get("testo", ""))[:160],
                          "importante": bool(c.get("importante"))} for c in dati["concetti"][:4]],
            "passi": [str(x)[:90] for x in (dati.get("passi") or [])[:5]],
            "attenzione": str(dati.get("attenzione") or "")[:200], "citazione": str(dati.get("citazione") or "")[:200],
            "nome": info.get("nome", ""), "data": el._data_it(info.get("inizio", "")),
            "durata": el.durata_leggibile(durata) if durata else "", "n_slide": info.get("n_slide", 0),
            "n_capitoli": len(ap.capitoli_di(cartella)), "tipo": tipo}
    spesa = _costo(r.get("usage", {}))
    el.scrivi_json(f, dati)
    el.aggiorna_info(cartella, spesa_appunti=round(float(info.get("spesa_appunti") or 0) + spesa, 4))
    log.info("infografica: %s, spesa %.4f $", r.get("usage"), spesa)
    return {"dati": dati, "spesa": spesa}


def pdf_infografica(cartella, cartella_pacchetti):
    """L'infografica in PDF (A4 orizzontale), nella cartella dei pacchetti."""
    from fpdf import FPDF
    cartella = Path(cartella)
    d = el.leggi_json(cartella / "infografica.json")
    if not d:
        raise ap.ErroreAppunti(tr("if_err"))
    info = el.leggi_json(cartella / "info.json", {}) or {}
    L = testi.lingua_di(info)
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(False)
    pdf.add_page()
    font, solo_latin = el._font_pdf(pdf)
    for extra in (Path(r"C:\Windows\Fonts\seguisym.ttf"), el.CARTELLA_FONT / "DejaVuSans.ttf"):
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
    from fpdf.pattern import LinearGradient
    with pdf.use_pattern(LinearGradient(0, 0, pdf.w, pdf.h, ["#061e36", "#0d4275"])):
        pdf.rect(0, 0, pdf.w, pdf.h, style="F")
    W = pdf.w
    pdf.set_text_color(147, 197, 253)
    pdf.set_font(font, "B", 8)
    pdf.set_xy(14, 12)
    pdf.cell(0, 4, t(f"{d.get('nome', '')} · {d.get('data', '')}".upper()))
    pdf.set_text_color(255, 255, 255)
    pdf.set_font(font, "B", 24)
    pdf.set_xy(14, 18)
    pdf.cell(0, 11, t(d.get("titolo") or tr("if_titolo", L)))
    # colonna sinistra: concetti
    y = 36
    for c in d.get("concetti") or []:
        pdf.set_fill_color(25, 80, 130)
        pdf.rect(14, y, 150, 30, style="F", round_corners=True, corner_radius=3)
        pdf.set_xy(19, y + 3)
        pdf.set_font(font, "B", 17)
        pdf.set_text_color(125, 211, 252)
        pdf.cell(140, 9, t(c.get("grande", "") + ("  ★" if c.get("importante") else "")))
        pdf.set_xy(19, y + 13)
        pdf.set_font(font, "", 10)
        pdf.set_text_color(230, 240, 250)
        pdf.multi_cell(140, 5, t(c.get("testo", "")))
        y += 34
    # colonna destra: passi, attenzione, numeri
    x0, w0 = 172, W - 172 - 14
    y = 36

    def riquadro(titolo, righe, y, h):
        pdf.set_fill_color(25, 80, 130)
        pdf.rect(x0, y, w0, h, style="F", round_corners=True, corner_radius=3)
        pdf.set_xy(x0 + 5, y + 3)
        pdf.set_font(font, "B", 7.5)
        pdf.set_text_color(147, 197, 253)
        pdf.cell(w0 - 10, 4, t(titolo.upper()))
        pdf.set_xy(x0 + 5, y + 9)
        pdf.set_font(font, "", 10)
        pdf.set_text_color(255, 255, 255)
        pdf.multi_cell(w0 - 10, 5.2, t(righe))
    passi = "\n".join(f"{i}. {p}" for i, p in enumerate(d.get("passi") or [], 1))
    riquadro(tr("if_passi", L), passi, y, 52)
    y += 56
    if d.get("attenzione") or d.get("citazione"):
        testo = d.get("attenzione", "") + (f"\n«{d['citazione']}»" if d.get("citazione") else "")
        riquadro(tr("if_attenzione", L), testo, y, 38)
        y += 42
    numeri = " · ".join(x for x in (d.get("durata"), tr("if_slide", L, n=d["n_slide"]) if d.get("n_slide") else "",
                                     tr("if_cap", L, n=d["n_capitoli"]) if d.get("n_capitoli") else "") if x)
    if numeri:
        riquadro(tr("if_numeri", L), numeri, y, 22)
    pdf.set_xy(14, pdf.h - 10)
    pdf.set_font(font, "", 7.5)
    pdf.set_text_color(147, 197, 253)
    pdf.cell(0, 4, t(tr("pdf_creato", L)))
    dest = Path(cartella_pacchetti) / f"{tr('if_file', L)} – {el.nome_sicuro(info.get('nome', ''))}.pdf"
    Path(cartella_pacchetti).mkdir(parents=True, exist_ok=True)
    pdf.output(str(dest))
    return dest


# --------------------------------------------------------------------------- «Chi parla»: i nomi delle voci

SCHEMA_NOMI = {"type": "object", "properties": {"voci": {"type": "array", "items": {"type": "object", "properties": {
    "voce": {"type": "integer"}, "nome": {"type": "string"}}, "required": ["voce", "nome"]}}}, "required": ["voci"]}


def suggerisci_nomi(cartella, chiave):
    """Le voci senza nome di una riunione/webinar: Claude guarda i partecipanti e come si chiamano tra loro
    («Giulia, mi prepari i numeri?») e propone un nome solo se e' chiaro. Il nome deve comparire nella
    trascrizione o fra i partecipanti, altrimenti lo scarto. Ritorna quanti nomi ha dato."""
    import voci
    cartella = Path(cartella)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    if (info.get("tipo") or "lezione") == "lezione":
        return 0            # in aula bastano «Docente» e «Domanda»
    d = voci._leggi(cartella)
    senza = [v["id"] for v in d.get("voci") or [] if not v.get("nome") and v.get("sec", 0) >= 5]
    if not senza or len(d.get("voci") or []) < 2:
        return 0
    righe, prima = [], None
    for s in segmenti_lezione(cartella):
        if s.get("voce") != prima:
            righe.append(f"\n[{hms(s['inizio'])}] Voce {s.get('voce', '?')}: {s['testo']}")
            prima = s.get("voce")
        else:
            righe[-1] += " " + s["testo"]
    testo = "".join(righe)[:120_000]
    part = info.get("partecipanti") or []
    corpo = {"model": MODELLO, "max_tokens": 600,
             "system": "Ricevi la trascrizione di una registrazione in cui le voci sono state separate in automatico "
                       "(«Voce 1», «Voce 2»...). Per ciascuna delle voci indicate trova il NOME della persona, ma solo "
                       "se e' chiaro: si presenta («sono Marco»), gli altri la chiamano per nome subito prima che parli "
                       "o le rispondono per nome, oppure un solo partecipante dell'elenco puo' essere quella voce. "
                       "Se non e' chiaro, nome vuoto. Mai inventare. Due voci diverse non possono avere lo stesso nome. "
                       "Chiama lo strumento salva_nomi.",
             "tools": [{"name": "salva_nomi", "description": "Salva i nomi delle voci.", "input_schema": SCHEMA_NOMI}],
             "tool_choice": {"type": "tool", "name": "salva_nomi"},
             "messages": [{"role": "user", "content":
                           (f"Partecipanti: {', '.join(part)}.\n" if part else "Partecipanti: non indicati.\n") +
                           f"Voci da riconoscere: {', '.join('Voce %d' % i for i in senza)}.\n\nTrascrizione:{testo}"}]}
    r = _chiama(chiave, corpo)
    blocco = next((b for b in r.get("content", []) if b.get("type") == "tool_use"), None)
    proposte = (blocco or {}).get("input", {}).get("voci") or []
    usati = {str(v.get("nome") or "").lower() for v in d.get("voci") or [] if v.get("nome")}
    testo_l = testo.lower()
    dati = 0
    for p in proposte:
        nome = str(p.get("nome") or "").strip()[:60]
        if not nome or p.get("voce") not in senza or nome.lower() in usati:
            continue
        nel_testo = all(x in testo_l for x in nome.lower().split()[:1])
        tra_part = any(nome.lower() in x.lower() or x.lower() in nome.lower() for x in part)
        if not (nel_testo or tra_part):
            continue
        usati.add(nome.lower())
        dati += 1
        for v in d["voci"]:
            if v["id"] == p["voce"]:
                v["nome"], v["suggerito"] = nome, True
    if dati:
        voci._salva(cartella, d)
        voci.rinomina(cartella, {})
    spesa = _costo(r.get("usage", {}))
    el.aggiorna_info(cartella, spesa_appunti=round(float(info.get("spesa_appunti") or 0) + spesa, 4))
    log.info("nomi delle voci: %s su %s, spesa %.4f $", dati, len(senza), spesa)
    return dati


# --------------------------------------------------------------------------- «Chiedi in diretta»

def domanda_in_diretta(chiave, cartella, diretta, adesso, storia, testo_domanda, lingua=None):
    """Una domanda su quello che si e' detto FINORA in una registrazione in corso: le parti gia' trascritte,
    poi il testo in diretta, poi le note. Ritorna {"testo", "spesa"}."""
    lingua = lingua or testi.LINGUA
    cartella = Path(cartella)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    righe, fino = [], -1.0
    segs = segmenti_lezione(cartella)
    voci = len({s.get("chi") for s in segs if s.get("chi")}) >= 2
    for s in segs:
        chi = f"{s['chi']}: " if voci and s.get("chi") else ""
        righe.append(f"[{hms(s['inizio'])}] {chi}{s['testo']}")
        fino = max(fino, s["fine"])
    for d in diretta or []:
        if d["t"] > fino:
            righe.append(f"[{hms(d['t'])}] {d['testo']}")
    note = el.leggi_json(cartella / "note.json", []) or []
    if note:
        righe.append("\nNOTE DI CHI REGISTRA: " + "; ".join(f"[{n.get('ora')}] {n.get('tipo', '')} {n.get('testo', '')}".strip() for n in note))
    if not righe:
        raise ap.ErroreAppunti(tr("dd_vuoto"))
    tipo = {"riunione": "una riunione di lavoro", "webinar": "un webinar"}.get(info.get("tipo"), "una lezione")
    sistema = (f"Stai ascoltando insieme a chi registra {tipo} ANCORA IN CORSO («{info.get('nome', '')}»). Adesso siamo a "
               f"{hms(adesso)} dall'inizio. Ricevi la trascrizione automatica di quello che si e' detto finora (puo' avere "
               "errori; gli ultimi minuti possono mancare). Rispondi alla domanda in modo BREVE (2-5 frasi o pochi punti), "
               "solo con quello che c'e' nella trascrizione; se non c'e', dillo. Quando riporti qualcosa indica il minuto "
               "cosi': [[00:26:12]]. Le parole tra «» copiale come sono. Scrivi in " + testi.nome_lingua(lingua, "it") + ".")
    messaggi = [{"role": "user", "content": "TRASCRIZIONE FINORA:\n" + "\n".join(righe)[-150_000:]},
                {"role": "assistant", "content": "Ho letto. Chiedimi pure."}]
    for m in (storia or [])[-6:]:
        messaggi.append({"role": "user" if m.get("chi") == "io" else "assistant", "content": str(m.get("testo", ""))})
    messaggi.append({"role": "user", "content": testo_domanda})
    r = _chiama(chiave, {"model": MODELLO, "max_tokens": 600, "system": sistema, "messages": messaggi})
    risposta = "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text").strip()
    spesa = _costo(r.get("usage", {}))
    el.aggiorna_info(cartella, spesa_appunti=round(float(info.get("spesa_appunti") or 0) + spesa, 4))
    return {"testo": risposta, "spesa": spesa}


# --------------------------------------------------------------------------- leggere le foto (lavagna, fogli scritti a mano, fotocopie)

def jpeg_ridotto(sorgente, dest=None, lato=1600):
    """La foto girata giusta (EXIF), al massimo 1600 px, in JPEG. Torna i byte (e la salva in dest)."""
    import io
    from PIL import Image, ImageOps
    with Image.open(sorgente) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        if max(im.size) > lato:
            r = lato / max(im.size)
            im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
        b = io.BytesIO()
        im.save(b, "JPEG", quality=82)
    dati = b.getvalue()
    if dest:
        Path(dest).parent.mkdir(parents=True, exist_ok=True)
        Path(dest).write_bytes(dati)
    return dati


def leggi_foto(chiave, file, tipo="lavagna", lingua=None):
    """Claude legge una foto: {"testo", "spesa"}. tipo: "lavagna" (foto in aula) o "foglio" (appunti a mano,
    fotocopie, pagine di libro)."""
    import base64
    lingua = lingua or testi.LINGUA
    dati = jpeg_ridotto(file)
    if tipo == "lavagna":
        cosa = ("una foto fatta a lezione (lavagna, slide proiettata o cartellone). Scrivi in poche righe cosa c'e' scritto o "
                "disegnato: formule (scritte in modo leggibile), parole, schemi descritti a parole. Niente commenti.")
    elif tipo == "leggimi":
        cosa = ("la foto di una pagina (libro, fotocopia, foglio) che uno studente con dislessia vuole ascoltare letta ad alta "
                "voce. Trascrivi il testo da leggere, nell'ordine di lettura, cosi' com'e': niente numeri di pagina, intestazioni o "
                "note a margine ripetute; le formule scrivile come si leggono. Niente commenti prima o dopo.")
    else:
        cosa = ("la foto di un foglio: appunti scritti a mano dallo studente, una fotocopia o una pagina di libro. Trascrivi TUTTO "
                "il testo, nell'ordine, anche le formule; le parole abbreviate completale tra [quadre] se sei sicuro; se una "
                "parola non si legge scrivi [?]. Gli schemi e le frecce rendili con elenchi. Niente commenti prima o dopo.")
    corpo = {"model": MODELLO, "max_tokens": 2500, "system": f"Ti mando {cosa} Scrivi in {testi.nome_lingua(lingua, 'it')}.",
             "messages": [{"role": "user", "content": [
                 {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.b64encode(dati).decode()}},
                 {"type": "text", "text": "Ecco la foto."}]}]}
    r = _chiama(chiave, corpo)
    testo = "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text").strip()
    return {"testo": testo, "spesa": _costo(r.get("usage", {}))}


def leggi_pagina_pdf(chiave, pdf, n, lingua=None):
    """Una pagina di un PDF scansionato (senza testo): Claude la legge. {"testo", "spesa"}."""
    import base64, io
    import docente
    lingua = lingua or testi.LINGUA
    pp = docente._pypdf()
    w = pp.PdfWriter()
    w.add_page(pp.PdfReader(str(pdf)).pages[n])
    buf = io.BytesIO()
    w.write(buf)
    corpo = {"model": MODELLO, "max_tokens": 2500,
             "system": ("Ti mando una pagina (libro, dispensa, fotocopia) che uno studente con dislessia vuole ascoltare letta ad "
                        "alta voce. Trascrivi il testo da leggere, nell'ordine di lettura, cosi' com'e': niente numeri di pagina o "
                        "intestazioni; le formule scrivile come si leggono. Niente commenti prima o dopo. "
                        f"Scrivi in {testi.nome_lingua(lingua, 'it')}."),
             "messages": [{"role": "user", "content": [
                 {"type": "document", "source": {"type": "base64", "media_type": "application/pdf",
                                                 "data": base64.b64encode(buf.getvalue()).decode()}},
                 {"type": "text", "text": "Ecco la pagina."}]}]}
    r = _chiama(chiave, corpo)
    testo = "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text").strip()
    return {"testo": testo, "spesa": _costo(r.get("usage", {}))}


def sistema_dettato(chiave, testo):
    """Mette punti, virgole e maiuscole a un testo dettato, SENZA cambiare le parole. {"testo", "spesa"}."""
    corpo = {"model": MODELLO, "max_tokens": 4000,
             "system": ("Ti mando un testo dettato a voce da uno studente con dislessia. Aggiungi solo la punteggiatura, le "
                        "maiuscole e gli a capo dove servono. NON cambiare, togliere o aggiungere parole e non correggere lo stile. "
                        "Rispondi solo con il testo sistemato."),
             "messages": [{"role": "user", "content": str(testo)[:12000]}]}
    r = _chiama(chiave, corpo)
    out = "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text").strip()
    return {"testo": out or testo, "spesa": _costo(r.get("usage", {}))}
