# -*- coding: utf-8 -*-
"""
«Mappa per la verifica»: la mappa concettuale di una o piu' lezioni della materia, su un foglio A4 orizzontale da
portare alla verifica come strumento compensativo (legge 170/2010).

  - Claude (Haiku) sceglie argomento centrale, 4-6 rami e per ogni ramo fino a 4 foglie: SOLO PAROLE CHIAVE
    (come chiedono molti docenti) oppure frasi brevissime; a parte le formule e i valori da ricordare.
  - Lo studente toglie le parole che non vuole (la mappa la sistema lui: anche questo conta per il docente).
  - Il PDF ha il carattere ad alta leggibilita' (Atkinson Hyperlegible), gli spazi per nome e data e in fondo
    «strumento compensativo (L. 170/2010)».

Salvata in <registrazioni>/esami/<materia>_mappa_verifica.json.
La disposizione (dove va ogni ramo) e' calcolata uguale qui (PDF) e nella finestra (app.js: mvDisposizione).
"""
import json
import logging
import math
import re
from pathlib import Path

import appunti as ap
import chiedi as ch
import elaborazione as el
import esame as es
import testi
from testi import tr

log = logging.getLogger("registra_lezione")

SCHEMA = {"type": "object", "properties": {
    "centro": {"type": "string", "description": "argomento generale, 1-4 parole"},
    "rami": {"type": "array", "minItems": 3, "maxItems": 6, "items": {"type": "object", "properties": {
        "titolo": {"type": "string", "description": "1-3 parole"},
        "foglie": {"type": "array", "minItems": 1, "maxItems": 4, "items": {"type": "string"}}},
        "required": ["titolo", "foglie"]}},
    "formule": {"type": "array", "maxItems": 6, "items": {"type": "string"},
                "description": "formule, valori, date da ricordare, copiati esatti dalle lezioni; vuoto se non ce ne sono"}},
    "required": ["centro", "rami"]}

W, H = 900, 520
COLORI = ["#0369a1", "#0d4275", "#0891b2", "#475569", "#1e5fbf", "#0f766e"]   # blu e grigi: niente arlecchino


def _file(base, materia):
    f = es._file(base, materia)
    return f.with_name(f.stem + "_mappa_verifica.json")


def leggi(base, materia):
    return el.leggi_json(_file(base, materia), {}) or {}


def _lista(x, n, lung):
    if isinstance(x, str):
        try:
            x = json.loads(x)
        except ValueError:
            x = [x]
    return [str(v).strip()[:lung] for v in (x if isinstance(x, list) else [x]) if str(v or "").strip()][:n]


def crea(base, materia, cartelle, chiave, parole=True, rifai=False, L="it"):
    """La mappa (dalla cache se le lezioni e il tipo sono gli stessi). Torna (salvato, spesa)."""
    cartelle = sorted(str(c) for c in cartelle if c)
    if not cartelle:
        raise ap.ErroreAppunti(tr("mv_nessuna", L))
    f = _file(base, materia)
    gia = el.leggi_json(f, {}) or {}
    if not rifai and gia.get("dati") and gia.get("cartelle") == cartelle and bool(gia.get("parole")) == bool(parole):
        return gia, 0.0
    if not chiave:
        raise ap.ErroreAppunti(tr("manca_chiave", L))
    materiale, _ = ch.contesto(cartelle)
    if not materiale.strip():
        raise ap.ErroreAppunti(tr("ch_vuoto", L))
    foglie = ("Le foglie sono SOLO PAROLE CHIAVE: da 1 a 4 parole, niente frasi, niente verbi coniugati, niente "
              "spiegazioni (es. \"pompa Na+/K+\", \"-70 mV\", \"tutto o niente\")." if parole else
              "Le foglie sono frasi brevissime, al massimo 8 parole.")
    corpo = {"model": ch.MODELLO, "max_tokens": 3000,
             "system": "Fai la MAPPA CONCETTUALE da portare a una verifica scritta, per uno studente con DSA (strumento "
                       "compensativo). Deve stare in un foglio A4: l'argomento generale al centro, da 4 a 6 rami con i grandi "
                       "temi, per ogni ramo da 2 a 4 foglie con quello che serve ricordare. " + foglie + " Rami di 1-3 "
                       "parole. Metti a parte in \"formule\" le formule, i valori numerici e le date importanti (al massimo "
                       "6, scritti esatti, brevi). Usa solo cose dette nelle lezioni. Scrivi in " +
                       testi.nome_lingua(L, "it") + ". Chiama lo strumento salva_mappa.",
             "tools": [{"name": "salva_mappa", "description": "Salva la mappa per la verifica.", "input_schema": SCHEMA}],
             "messages": [{"role": "user", "content": f"MATERIA: {materia}\n\n{materiale[:200_000]}"}]}
    dati, usage = ch.strumento(chiave, corpo, "rami", "mv_err")
    lung = 40 if parole else 70
    rami = [{"titolo": str(r.get("titolo", "")).strip()[:30], "foglie": _lista(r.get("foglie"), 4, lung)}
            for r in (dati.get("rami") or [])[:6] if isinstance(r, dict) and str(r.get("titolo", "")).strip()]
    rami = [r for r in rami if r["foglie"]]
    if len(rami) < 2:
        raise ap.ErroreAppunti(tr("mv_err", L))
    pulito = {"centro": str(dati.get("centro", "")).strip()[:40] or materia, "rami": rami,
              "formule": _lista(dati.get("formule"), 6, 60)}
    salvato = {"cartelle": cartelle, "parole": bool(parole), "dati": pulito, "tolte": [],
               "nome_classe": gia.get("nome_classe", "")}
    el.scrivi_json(f, salvato)
    spesa = ch._costo(usage)
    log.info("mappa per la verifica (%s): %s, spesa %.4f $", materia, usage, spesa)
    return salvato, spesa


def salva_modifiche(base, materia, tolte, nome_classe):
    f = _file(base, materia)
    d = el.leggi_json(f, {}) or {}
    if not d:
        return d
    d["tolte"] = [str(x) for x in (tolte or [])][:60]
    d["nome_classe"] = str(nome_classe or "")[:80]
    el.scrivi_json(f, d)
    return d


def senza_tolte(dati, tolte):
    """La mappa senza le parole tolte dallo studente ("r:j" = foglia j del ramo r, "f:k" = formula k)."""
    tolte = set(tolte or [])
    rami = [{"titolo": r["titolo"], "foglie": [x for j, x in enumerate(r["foglie"]) if f"{i}:{j}" not in tolte]}
            for i, r in enumerate(dati.get("rami") or [])]
    return {"centro": dati.get("centro", ""), "rami": rami,
            "formule": [x for k, x in enumerate(dati.get("formule") or []) if f"f:{k}" not in tolte]}


def disposizione(dati):
    """Rami meta' sopra e meta' sotto il centro, foglie verso l'esterno, centro in mezzo. Uguale a mvDisposizione in app.js."""
    rami = dati.get("rami") or []
    n = len(rami)
    su = math.ceil(n / 2)
    out = []
    for riga, gruppo in ((0, rami[:su]), (1, rami[su:])):
        k = len(gruppo) or 1
        cw = W / k
        for i, r in enumerate(gruppo):
            x = cw * (i + 0.5)
            y = 158 if riga == 0 else H - 158
            fl = []
            for j, testo in enumerate(r["foglie"]):
                # le foglie verso l'esterno: le linee dal centro non le attraversano
                fy = y - 46 - (len(r["foglie"]) - 1 - j) * 32 if riga == 0 else y + 46 + j * 32
                fl.append({"y": fy, "t": testo, "j": j})
            out.append({"x": x, "y": y, "su": riga == 0, "bw": min(cw - 30, 220), "fw": min(cw - 14, 280),
                        "titolo": r["titolo"], "foglie": fl})
    return {"W": W, "H": H, "cx": W / 2, "cy": H / 2, "rami": out}


# --------------------------------------------------------------------------- PDF (A4 orizzontale)

def _rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def _chiaro(c, f=0.88):
    return tuple(int(v + (255 - v) * f) for v in c)


def pdf(dati, materia, lezioni, nome_classe, dest, L="it"):
    from fpdf import FPDF
    p = FPDF(orientation="L", unit="mm", format="A4")
    p.set_auto_page_break(False)
    p.add_page()
    reg, bold = el.FONT_FACILE / "AtkinsonHyperlegible-Regular.ttf", el.FONT_FACILE / "AtkinsonHyperlegible-Bold.ttf"
    if reg.exists() and bold.exists():
        p.add_font("A", "", str(reg))
        p.add_font("A", "B", str(bold))
        font, solo_latin = "A", False
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

    # intestazione: materia e lezioni a sinistra, nome e data a destra
    p.set_text_color(71, 85, 105)
    p.set_font(font, "B", 11)
    p.set_xy(12, 8)
    p.cell(150, 6, t(materia))
    p.set_font(font, "", 9.5)
    p.set_xy(12, 14)
    p.cell(150, 5, t(lezioni))
    p.set_font(font, "", 10)
    p.set_xy(150, 9)
    nc = (nome_classe or "").strip()
    p.cell(135, 6, t(f"{tr('mv_nome', L)}: " + (nc if nc else "_" * 26) + f"     {tr('mv_data', L)}: ________"), align="R")
    p.set_draw_color(226, 232, 240)
    p.set_line_width(0.3)
    p.line(12, 21, 285, 21)

    formule = dati.get("formule") or []
    D = disposizione(dati)
    alto = 152 if formule else 172
    sc = min(273 / W, alto / H)
    ox, oy = 12 + (273 - W * sc) / 2, 24 + (alto - H * sc) / 2

    def P(x, y):
        return ox + x * sc, oy + y * sc

    def scrivi(testo, cx, cy, larg, size, stile=""):
        """Testo centrato che sta nella larghezza: se e' lungo rimpicciolisce."""
        testo = t(testo)
        p.set_font(font, stile, size)
        while size > 6 and p.get_string_width(testo) > larg - 2:
            size -= 0.5
            p.set_font(font, stile, size)
        p.set_xy(cx - larg / 2, cy - size * 0.2)
        p.cell(larg, size * 0.4, testo, align="C")

    # collegamenti dal centro ai rami (sotto a tutto)
    p.set_line_width(0.9)
    p.set_draw_color(148, 163, 184)
    for r in D["rami"]:
        x0, y0 = P(D["cx"], D["cy"])
        x1, y1 = P(r["x"], r["y"] + (24 if r["su"] else -24))
        p.line(x0, y0, x1, y1)
    # centro
    cx, cy = P(D["cx"], D["cy"])
    p.set_fill_color(13, 66, 117)
    p.rect(cx - 150 * sc, cy - 30 * sc, 300 * sc, 60 * sc, style="F", round_corners=True, corner_radius=30 * sc)
    p.set_text_color(255, 255, 255)
    scrivi(dati.get("centro", "").upper(), cx, cy, 290 * sc, 15, "B")
    for i, r in enumerate(D["rami"]):
        c = _rgb(COLORI[i % len(COLORI)])
        for fo in r["foglie"]:
            fx, fy = P(r["x"] - r["fw"] / 2, fo["y"] - 14)
            p.set_fill_color(*_chiaro(c))
            p.rect(fx, fy, r["fw"] * sc, 28 * sc, style="F", round_corners=True, corner_radius=14 * sc)
            p.set_text_color(31, 41, 55)
            scrivi(fo["t"], *P(r["x"], fo["y"]), r["fw"] * sc, 12.5)
        bx, by = P(r["x"] - r["bw"] / 2, r["y"] - 24)
        p.set_draw_color(*c)
        p.set_fill_color(255, 255, 255)
        p.set_line_width(0.8)
        p.rect(bx, by, r["bw"] * sc, 48 * sc, style="DF", round_corners=True, corner_radius=10 * sc)
        p.set_text_color(*c)
        scrivi(r["titolo"].upper(), *P(r["x"], r["y"]), r["bw"] * sc, 13, "B")
    # formule e valori
    if formule:
        y = 24 + alto + 3
        p.set_fill_color(255, 251, 235)
        p.set_draw_color(245, 158, 11)
        p.set_line_width(0.5)
        p.rect(12, y, 273, 20, style="DF", round_corners=True, corner_radius=3)
        p.set_text_color(146, 64, 14)
        p.set_font(font, "B", 9.5)
        p.set_xy(16, y + 2.5)
        p.cell(0, 5, t(tr("mv_formule", L).upper()))
        p.set_text_color(31, 41, 55)
        size = 11.5
        riga = "     ·     ".join(t(x) for x in formule)
        p.set_font(font, "", size)
        while size > 7 and p.get_string_width(riga) > 2 * 262:
            size -= 0.5
            p.set_font(font, "", size)
        p.set_xy(16, y + 8)
        p.multi_cell(265, size * 0.42, riga)
    p.set_text_color(100, 116, 139)
    p.set_font(font, "", 8.5)
    p.set_xy(12, 201)
    p.cell(150, 5, t(tr("mv_piede", L)))
    p.set_xy(150, 201)
    p.cell(135, 5, t(tr("mv_fatta", L)), align="R")
    p.output(str(dest))
    return dest
