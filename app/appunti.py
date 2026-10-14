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

ISTRUZIONI = """Sei un tutor universitario. Ricevi il PDF di un'ora di lezione registrata: per ogni slide
mostrata dal docente c'e' l'immagine e, sotto, la trascrizione automatica di cio' che il docente
ha detto (con l'orario dall'inizio della lezione). La trascrizione puo' contenere errori.

Prepara gli appunti di studio di quest'ora, in italiano, per uno studente che deve prepararci
l'esame. Regole:
- Basati solo su slide e parole del docente. Non inventare contenuti. Se completi un passaggio
  con conoscenze generali, dillo esplicitamente.
- Per ogni concetto indica dove si trova: numero di slide e orario (es. "slide 3, 00:25").
- Nel campo "slide" di concetti ed esempi metti il numero N della slide del PDF ("Slide N") da
  mostrare accanto, SOLO se l'immagine aiuta davvero a capire: grafici, schemi, figure, tabelle,
  formule o passaggi scritti. Metti 0 se la slide e' solo testo gia' riportato negli appunti, se e'
  un titolo o un indice, o se mostra solo il docente. Non ripetere la stessa slide due volte.
- Nella legenda metti TUTTI i simboli, le sigle e le formule usati, ciascuno con il significato,
  in forma breve da tenere sott'occhio. Scrivi le formule in testo semplice con simboli Unicode
  (es. lim x→0 sin(x)/x = 1, ∑, √, ≤, ∞, x², xᵢ). Niente LaTeX.
- Gli esempi svolti vanno riportati passo per passo.
- Le domande d'esame devono essere quelle che un docente farebbe davvero su quest'ora.
- In "da controllare" segnala i punti dove l'audio sembra trascritto male, o slide e parole non
  tornano, con l'orario.
Chiama lo strumento salva_appunti con il risultato."""

SCHEMA = {
    "type": "object",
    "properties": {
        "titolo": {"type": "string", "description": "argomento principale dell'ora, breve"},
        "di_cosa_si_parla": {"type": "string", "description": "riassunto di 3-6 frasi"},
        "concetti": {"type": "array", "items": {"type": "object", "properties": {
            "titolo": {"type": "string"}, "spiegazione": {"type": "string"},
            "dove": {"type": "string", "description": "slide e orario"},
            "slide": {"type": "integer", "description": "N della slide da mostrare, 0 se non serve"}},
            "required": ["titolo", "spiegazione", "dove"]}},
        "legenda": {"type": "array", "items": {"type": "object", "properties": {
            "simbolo": {"type": "string"}, "significato": {"type": "string"}},
            "required": ["simbolo", "significato"]}},
        "esempi_svolti": {"type": "array", "items": {"type": "object", "properties": {
            "titolo": {"type": "string"}, "passaggi": {"type": "array", "items": {"type": "string"}},
            "dove": {"type": "string"},
            "slide": {"type": "integer", "description": "N della slide da mostrare, 0 se non serve"}},
            "required": ["titolo", "passaggi"]}},
        "domande_esame": {"type": "array", "items": {"type": "string"}},
        "da_controllare": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["titolo", "di_cosa_si_parla", "concetti", "legenda", "domande_esame", "da_controllare"],
}


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
        "tool_choice": {"type": "tool", "name": "salva_appunti"},
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
    blocco = next((b for b in r.get("content", []) if b.get("type") == "tool_use"), None)
    if not blocco:
        raise ErroreAppunti("risposta di Claude incompleta")
    uso = r.get("usage", {})
    spesa = uso.get("input_tokens", 0) * PREZZO_INGRESSO + uso.get("output_tokens", 0) * PREZZO_USCITA
    return blocco["input"], spesa


def pdf_appunti(dati, info, etichetta, destinazione, slide=None):
    """slide: {N: (percorso immagine, inizio in secondi)} per mettere le slide scelte da Claude."""
    slide = slide or {}
    usate = set()
    from fpdf import FPDF
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

    pdf.add_page()
    pdf.set_font(font, "B", 17)
    testo(f"{info.get('nome', 'Lezione')} · Appunti {etichetta}", 8)
    pdf.set_font(font, "", 9.5)
    pdf.set_text_color(*GRIGIO)
    if el.riga_studente(info):
        testo(el.riga_studente(info), 5)
    testo(f"{el._data_it(info.get('inizio', ''))} · {dati.get('titolo', '')} · appunti creati da Claude "
          "dalla registrazione: controlla sempre sulle slide e sul libro.", 5)
    pdf.set_text_color(0, 0, 0)

    sezione("Di cosa si è parlato")
    testo(dati.get("di_cosa_si_parla", ""))

    if dati.get("concetti"):
        sezione("Concetti chiave")
        for c in dati["concetti"]:
            pdf.set_font(font, "B", 10.5)
            testo(c.get("titolo", ""))
            pdf.set_font(font, "", 10.5)
            testo(c.get("spiegazione", ""))
            if c.get("dove"):
                pdf.set_text_color(*GRIGIO)
                pdf.set_font(font, "", 9)
                testo(f"→ {c['dove']}", 4.6)
                pdf.set_text_color(0, 0, 0)
            immagine(c.get("slide"))
            pdf.ln(2)

    if dati.get("legenda"):
        sezione("Legenda di simboli e formule")
        pdf.set_font(font, "", 10)
        with pdf.table(col_widths=(40, 60), line_height=5.6, text_align="LEFT") as tab:
            r = tab.row()
            r.cell(t("Simbolo / formula"))
            r.cell(t("Significato"))
            for v in dati["legenda"]:
                r = tab.row()
                r.cell(t(v.get("simbolo", "")))
                r.cell(t(v.get("significato", "")))

    if dati.get("esempi_svolti"):
        sezione("Esempi svolti")
        for e in dati["esempi_svolti"]:
            pdf.set_font(font, "B", 10.5)
            testo(e.get("titolo", "") + (f"  ({e['dove']})" if e.get("dove") else ""))
            pdf.set_font(font, "", 10.5)
            for i, p in enumerate(e.get("passaggi", []), 1):
                testo(f"{i}. {p}")
            immagine(e.get("slide"))
            pdf.ln(2)

    if dati.get("domande_esame"):
        sezione("Domande d'esame probabili")
        for i, d in enumerate(dati["domande_esame"], 1):
            testo(f"{i}. {d}")

    if dati.get("da_controllare"):
        sezione("Da controllare")
        pdf.set_text_color(*GRIGIO)
        for d in dati["da_controllare"]:
            testo(f"• {d}")
        pdf.set_text_color(0, 0, 0)
    pdf.output(str(destinazione))


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
    slide = {m["n"]: (str(cartella / "slide" / m["file"]) if m.get("file") else None, m.get("inizio", 0))
             for m in mappa}
    pdf_appunti(dati, info, etichetta, dest, slide)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    appunti = info.get("appunti") or {}
    appunti[str(k)] = str(dest)
    el.aggiorna_info(cartella, appunti=appunti,
                     spesa_appunti=round(float(info.get("spesa_appunti") or 0) + spesa, 4))
    return dest, spesa
