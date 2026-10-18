# -*- coding: utf-8 -*-
"""
«Gli strumenti che uso» (Spazio DSA → Per il docente): un foglio A4 da portare a scuola o all'universita',
da confrontare con il PDP. Elenca gli strumenti compensativi che il programma offre; quelli che lo studente
ha usato davvero (segnati quando apre la pagina) hanno gia' la spunta, gli altri un quadratino da spuntare a mano.
Niente Claude: si fa qui, gratis.
"""
import datetime
from pathlib import Path

import elaborazione as el
from testi import tr

# chiave, sempre spuntato (vero se lo studente registra con la Modalita' DSA accesa)
STRUMENTI = ["reg", "facili", "voce", "karaoke", "podcast", "mappe", "mappa_verifica", "detta", "orale", "test",
             "scritto", "flashcard"]


def pdf(dest, nome_classe, materia, usati, ha_lezioni, L="it"):
    from fpdf import FPDF
    p = FPDF(format="A4")
    p.set_auto_page_break(False)
    p.set_margins(16, 14, 16)
    p.add_page()
    reg, bold = el.font_dsa()
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
    p.set_text_color(13, 66, 117)
    p.set_font(font, "B", 18)
    p.cell(0, 10, t(tr("sd_pdf_titolo", L)), new_x="LMARGIN", new_y="NEXT")
    p.set_text_color(71, 85, 105)
    p.set_font(font, "", 10.5)
    p.multi_cell(0, 5.4, t(tr("sd_pdf_intro", L)), align="L", new_x="LMARGIN", new_y="NEXT")
    p.ln(3)
    p.set_text_color(31, 41, 55)
    p.set_font(font, "", 11.5)
    nc = (nome_classe or "").strip() or "_" * 34
    p.cell(0, 7, t(f"{tr('sd_pdf_nome', L)}: {nc}"), new_x="LMARGIN", new_y="NEXT")
    p.cell(110, 7, t(f"{tr('sd_pdf_materia', L)}: {materia or '_' * 24}"))
    p.cell(0, 7, t(f"{tr('mv_data', L)}: {datetime.date.today():%d/%m/%Y}"), new_x="LMARGIN", new_y="NEXT")
    p.ln(3)
    # tabella: spunta, strumento, a cosa mi serve
    p.set_fill_color(13, 66, 117)
    p.set_text_color(255, 255, 255)
    p.set_font(font, "B", 10.5)
    p.cell(14, 8, t(tr("sd_pdf_uso", L)), fill=True, align="C")
    p.cell(72, 8, t(tr("sd_pdf_strumento", L)), fill=True)
    p.cell(0, 8, t(tr("sd_pdf_serve", L)), fill=True, new_x="LMARGIN", new_y="NEXT")
    for i, k in enumerate(STRUMENTI):
        fatto = k in usati or k == "facili" or (k == "reg" and ha_lezioni)
        y = p.get_y()
        if i % 2:
            p.set_fill_color(241, 246, 251)
            p.rect(16, y, 178, 12.5, style="F")
        p.set_draw_color(13, 66, 117)
        p.set_line_width(0.5)
        p.rect(20.5, y + 3.5, 5.5, 5.5)
        if fatto:
            p.set_line_width(0.8)
            p.line(21.5, y + 6.3, 23, y + 8)
            p.line(23, y + 8, 25.6, y + 4.2)
        p.set_text_color(31, 41, 55)
        p.set_font(font, "B", 10.5)
        p.set_xy(30, y + 1.5)
        p.multi_cell(70, 4.8, t(tr(f"sd_s_{k}", L)), align="L")
        p.set_font(font, "", 10)
        p.set_text_color(71, 85, 105)
        p.set_xy(102, y + 1.5)
        p.multi_cell(92, 4.8, t(tr(f"sd_s_{k}_s", L)), align="L")
        p.set_y(y + 12.5)
    p.ln(4)
    p.set_font(font, "", 9.5)
    p.set_text_color(100, 116, 139)
    p.multi_cell(0, 5, t(tr("sd_pdf_legenda", L)), new_x="LMARGIN", new_y="NEXT")
    # firme
    y = 262
    p.set_text_color(31, 41, 55)
    p.set_font(font, "", 10.5)
    p.set_draw_color(148, 163, 184)
    p.set_line_width(0.3)
    for j, chi in enumerate(("sd_pdf_studente", "sd_pdf_docente", "sd_pdf_famiglia")):
        x = 16 + j * 61
        p.line(x, y, x + 54, y)
        p.set_xy(x, y + 1.5)
        p.cell(54, 5, t(tr(chi, L)), align="C")
    p.set_font(font, "", 8.5)
    p.set_text_color(100, 116, 139)
    p.set_xy(16, 282)
    p.cell(110, 5, t(tr("sd_pdf_legge", L)))
    p.cell(0, 5, t(tr("mv_fatta", L)), align="R")
    Path(dest).parent.mkdir(parents=True, exist_ok=True)
    p.output(str(dest))
    return dest
