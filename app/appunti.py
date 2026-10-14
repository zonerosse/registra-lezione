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
import ssl
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

import elaborazione as el

log = logging.getLogger("registra_lezione")

API = "https://api.anthropic.com/v1"
VERSIONE_API = "2023-06-01"
MODELLO = "claude-sonnet-5-5"
PREZZO_INGRESSO = 2.0 / 1_000_000     # dollari per token (Sonnet 5.5)
PREZZO_USCITA = 10.0 / 1_000_000


class ErroreAppunti(Exception):
    """Errore con un messaggio gia' comprensibile da mostrare nella finestra."""


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
            raise ErroreAppunti("chiave non valida o disattivata")
        if e.code == 400 and "usage limit" in msg.lower():
            raise ErroreAppunti("limite di spesa raggiunto (si cambia su platform.claude.com)")
        if e.code == 400 and "credit" in msg.lower():
            raise ErroreAppunti("credito finito (si ricarica su platform.claude.com)")
        if e.code in (429, 500, 502, 503, 504, 529):
            raise _Riprova(msg or str(e.code))
        raise ErroreAppunti(f"errore da Claude ({e.code}) {msg}".strip())
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise _Riprova(str(e))


class _Riprova(Exception):
    pass


def prova_chiave(chiave):
    """True se la chiave funziona. Altrimenti ErroreAppunti con il motivo."""
    chiave = (chiave or "").strip()
    if not chiave.startswith("sk-ant-"):
        raise ErroreAppunti("la chiave deve iniziare con sk-ant-: controlla di averla copiata tutta")
    try:
        _richiesta(chiave, "models?limit=1", timeout=30)
    except _Riprova:
        raise ErroreAppunti("non riesco a collegarmi: serve internet")
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
Basati solo su slide e parole del docente. Non inventare contenuti; se completi un passaggio con
conoscenze generali, dillo. Meglio pochi blocchi chiari che tanti blocchi ripetitivi.
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


def normalizza(dati):
    """Gli appunti fatti prima del formato Cornell (concetti/legenda/domande) diventano blocchi."""
    if "blocchi" in dati:
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
        raise ErroreAppunti("il pacchetto di questa parte non si trova piu'")
    with zipfile.ZipFile(zp) as z:
        nome = next((n for n in z.namelist() if n.lower().endswith(".pdf")), None)
        if not nome:
            raise ErroreAppunti("nel pacchetto manca il PDF")
        return Path(zp), z.read(nome)


def chiedi_a_claude(chiave, pdf_bytes, tentativi=4, contesto=""):
    corpo = {
        "model": MODELLO,
        "max_tokens": 12000,
        "system": ISTRUZIONI,
        "tools": [{"name": "salva_appunti", "description": "Salva gli appunti di studio dell'ora di lezione.",
                   "input_schema": SCHEMA}],
        # Sonnet 5.5 non accetta tool_choice "tool"/"any" (errore 400): si usa "auto"
        # e le istruzioni chiedono di chiamare lo strumento; c'e' comunque il piano B sotto.
        "tool_choice": {"type": "auto"},
        "messages": [{"role": "user", "content": [
            {"type": "document", "source": {"type": "base64", "media_type": "application/pdf",
                                            "data": base64.b64encode(pdf_bytes).decode()}},
            {"type": "text", "text": "Ecco l'ora di lezione. Prepara gli appunti." +
             (f" Lo studente: {contesto}. Adatta il livello degli appunti al suo corso e anno."
              if contesto else "")}]}],
    }
    attesa = 10
    for n in range(tentativi):
        try:
            r = _richiesta(chiave, "messages", corpo, timeout=600)
            break
        except _Riprova as e:
            log.warning("Claude occupato o rete assente (%s): riprovo tra %s s", e, attesa)
            if n == tentativi - 1:
                raise ErroreAppunti("Claude non risponde o manca internet: tocca Riprova piu' tardi")
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
        raise ErroreAppunti("risposta di Claude senza appunti: tocca Riprova")
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
    return dati if isinstance(dati, dict) and ("blocchi" in dati or "concetti" in dati) else None


def pdf_appunti(dati, info, etichetta, destinazione, slide=None):
    """Appunti di una parte. slide: {N: (percorso immagine, inizio)} per le slide scelte da Claude."""
    pdf_appunti_parti([(dati, etichetta, slide or {})], info, destinazione)


def pdf_appunti_parti(parti, info, destinazione):
    """Uno o piu' blocchi di appunti nello stesso PDF: parti = [(dati, etichetta, slide), ...].
    Con piu' parti diventa "Appunti della lezione completa"."""
    from fpdf import FPDF
    stato = {"slide": {}, "usate": set()}
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(True, margin=15)
    pdf.set_margins(16, 15, 16)
    font, solo_latin = el._font_pdf(pdf)
    # simboli matematici che Arial non ha (es. ᵢ, ∮): li prende da Segoe UI Symbol / DejaVu
    for extra in (Path(r"C:\Windows\Fonts\seguisym.ttf"),
                  Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")):
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
    for indice, (dati, etichetta, slide) in enumerate(parti):
        stato["slide"], stato["usate"] = slide or {}, set()
        pdf.add_page()
        if completa and indice == 0:
            pdf.set_font(font, "B", 19)
            testo(f"{info.get('nome', 'Lezione')} · Appunti della lezione completa", 9)
            pdf.set_font(font, "", 9.5)
            pdf.set_text_color(*GRIGIO)
            if el.riga_studente(info):
                testo(el.riga_studente(info), 5)
            testo(f"{el._data_it(info.get('inizio', ''))} · {len(parti)} parti · appunti creati da Claude "
                  "dalla registrazione: controlla sempre sulle slide e sul libro.", 5)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(4)
            for d, et, _ in parti:
                testo(f"• {et}: {d.get('titolo', '')}")
            pdf.add_page()
        _scrivi_parte(pdf, font, t, testo, sezione, immagine, dati, info, etichetta, completa, GRIGIO)
    pdf.output(str(destinazione))


def _scrivi_parte(pdf, font, t, testo, sezione, immagine, dati, info, etichetta, completa, GRIGIO):
    """Una parte di appunti nel formato Cornell: domande a sinistra, appunti a destra,
    riassunto in fondo; poi formulario, esercizi svolti, punti da controllare."""
    from fpdf.enums import MethodReturnValue
    dati = normalizza(dati)
    VIOLA, VIOLA_CHIARO, LINEA = (124, 58, 237), (243, 237, 255), (214, 204, 245)
    pdf.set_font(font, "B", 17)
    testo((f"{etichetta[:1].upper()}{etichetta[1:]} · {dati.get('titolo', '')}" if completa
           else f"{info.get('nome', 'Lezione')} · Appunti {etichetta}"), 8)
    if not completa:
        pdf.set_font(font, "", 9.5)
        pdf.set_text_color(*GRIGIO)
        if el.riga_studente(info):
            testo(el.riga_studente(info), 5)
        testo(f"{el._data_it(info.get('inizio', ''))} · {dati.get('titolo', '')} · appunti creati da Claude "
              "dalla registrazione: controlla sempre sulle slide e sul libro.", 5)
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
        pdf.cell(wl, 5, t("DOMANDE E PAROLE CHIAVE"))
        pdf.set_xy(xr, y)
        pdf.cell(wr, 5, t("APPUNTI"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(*VIOLA)
        pdf.line(xl, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.set_text_color(0, 0, 0)
        pdf.ln(2)

    pdf.ln(3)
    intestazione_colonne()
    for b in dati.get("blocchi", []):
        domanda = b.get("domanda", "")
        chiavi = " · ".join(b.get("parole_chiave") or [])
        punti = "\n".join(f"• {p}" for p in (b.get("appunti") or []) if p)
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
        if dove:
            pdf.set_font(font, "", 8.5)
            pdf.set_text_color(*GRIGIO)
            pdf.set_x(xr)
            pdf.multi_cell(wr, 4.2, t(f"→ {dove}"), new_x="LEFT", new_y="NEXT")
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
        pdf.cell(0, 4.5, t("RIASSUNTO"), new_x="LEFT", new_y="NEXT")
        pdf.set_x(xl + 4)
        pdf.set_font(font, "", 10)
        pdf.set_text_color(0, 0, 0)
        pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin - 8, 5.0, t(dati["riassunto"]),
                       new_x="LMARGIN", new_y="NEXT")
        pdf.set_y(y + h + 2)

    if dati.get("formulario"):
        sezione("Formulario: simboli e formule")
        pdf.set_font(font, "", 10)
        with pdf.table(col_widths=(42, 58), line_height=5.6, text_align="LEFT") as tab:
            r = tab.row()
            r.cell(t("Simbolo / formula"))
            r.cell(t("Significato"))
            for v in dati["formulario"]:
                r = tab.row()
                r.cell(t(v.get("simbolo", "")))
                r.cell(t(v.get("significato", "")))

    if dati.get("esercizi_svolti"):
        sezione("Esercizi svolti")
        for e in dati["esercizi_svolti"]:
            pdf.set_font(font, "B", 10.5)
            testo(e.get("titolo", "") + (f"  ({e['dove']})" if e.get("dove") else ""))
            pdf.set_font(font, "", 10.5)
            for k, p in enumerate(e.get("passaggi", []), 1):
                testo(f"{k}. {p}")
            immagine(e.get("slide"))
            pdf.ln(2)

    if dati.get("domande_esame"):
        sezione("Altre domande d'esame")
        for k, d in enumerate(dati["domande_esame"], 1):
            testo(f"{k}. {d}")

    if dati.get("da_controllare"):
        sezione("Da controllare")
        pdf.set_text_color(*GRIGIO)
        for d in dati["da_controllare"]:
            testo(f"• {d}")
        pdf.set_text_color(0, 0, 0)


def appunti_lezione_completa(cartella, cartella_pacchetti):
    """Se la lezione e' finita e tutte le parti hanno gli appunti, li mette in un PDF unico.
    Con una parte sola il PDF unico e' quello della parte. Ritorna il percorso o None."""
    cartella = Path(cartella)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    pac = info.get("pacchetti") or {}
    fatti = info.get("appunti") or {}
    if info.get("stato") != "pronta" or not pac or any(k not in fatti for k in pac):
        return None
    if len(pac) == 1:
        dest = fatti[next(iter(pac))]
    else:
        parti = []
        for k in sorted(pac, key=int):
            dati = el.leggi_json(cartella / f"appunti_{int(k):03d}.json")
            if dati is None:
                return None
            base = Path(pac[k]).stem
            etichetta = base.split(" – ")[-1] if " – " in base else f"parte {k}"
            mappa = el.leggi_json(cartella / f"pacchetto_{int(k):03d}.json", []) or []
            slide = {m["n"]: (str(el.immagine_slide(cartella, m["file"])) if m.get("file") else None,
                              m.get("inizio", 0)) for m in mappa}
            parti.append((dati, etichetta, slide))
        primo = Path(pac[sorted(pac, key=int)[0]]).stem
        base = primo.rsplit(" – ", 1)[0] if " – " in primo else el.nome_sicuro(info.get("nome"))
        dest = str(Path(cartella_pacchetti) / f"Appunti – {base} – lezione completa.pdf")
        pdf_appunti_parti(parti, info, dest)
    el.aggiorna_info(cartella, appunti_completi=str(dest))
    return dest


def crea_appunti(cartella, k, chiave, cartella_pacchetti):
    """Crea gli appunti della parte k. Ritorna (percorso PDF, spesa in dollari)."""
    cartella = Path(cartella)
    zp, pdf_bytes = _pdf_del_pacchetto(cartella, k)
    gia = el.leggi_json(cartella / f"appunti_{k:03d}.json")
    spesa = 0.0
    if gia is None:
        info0 = el.leggi_json(cartella / "info.json", {}) or {}
        dati, spesa = chiedi_a_claude(chiave, pdf_bytes, contesto=el.riga_studente(info0))
        el.scrivi_json(cartella / f"appunti_{k:03d}.json", dati)
    else:
        dati = gia
    info = el.leggi_json(cartella / "info.json", {}) or {}
    # stesso nome del pacchetto: "<nome> – parte k (00h-01h)"
    base = zp.stem
    etichetta = base.split(" – ")[-1] if " – " in base else f"parte {k}"
    dest = Path(cartella_pacchetti) / f"Appunti – {base}.pdf"
    mappa = el.leggi_json(cartella / f"pacchetto_{k:03d}.json", []) or []
    slide = {m["n"]: (str(el.immagine_slide(cartella, m["file"])) if m.get("file") else None, m.get("inizio", 0))
             for m in mappa}
    pdf_appunti(dati, info, etichetta, dest, slide)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    appunti = info.get("appunti") or {}
    appunti[str(k)] = str(dest)
    el.aggiorna_info(cartella, appunti=appunti,
                     spesa_appunti=round(float(info.get("spesa_appunti") or 0) + spesa, 4))
    return dest, spesa
