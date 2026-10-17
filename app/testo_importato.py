# -*- coding: utf-8 -*-
"""«Importa una trascrizione»: il testo di una lezione (PDF, Word, .txt) diventa una registrazione senza audio,
con la sua trascrizione e il suo pacchetto, cosi' gli appunti si fanno come per le altre."""
import re
import zipfile
from pathlib import Path

PAROLE_MINUTO = 140        # per dare un orario finto alle frasi (serve ai capitoli e ai rimandi «al minuto»)
TIPI = (".pdf", ".docx", ".txt", ".md")


class ErroreTesto(Exception):
    pass


def leggi(percorso):
    """Il testo del file. ErroreTesto se il tipo non va o se dentro non c'e' testo (es. PDF fatto di foto)."""
    p = Path(percorso)
    est = p.suffix.lower()
    if est == ".pdf":
        import docente
        lettore = docente._pypdf().PdfReader(str(p))
        testo = "\n\n".join((pg.extract_text() or "") for pg in lettore.pages)
    elif est == ".docx":
        with zipfile.ZipFile(p) as z:
            xml = z.read("word/document.xml").decode("utf-8", "replace")
        paragrafi = re.findall(r"<w:p[ >].*?</w:p>", xml, flags=re.S)
        testo = "\n".join("".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", x, flags=re.S)) for x in paragrafi)
        import html
        testo = html.unescape(testo)
    elif est in (".txt", ".md"):
        b = p.read_bytes()
        for cod in ("utf-8-sig", "cp1252", "latin-1"):
            try:
                testo = b.decode(cod)
                break
            except UnicodeDecodeError:
                continue
    else:
        raise ErroreTesto("tipo")
    testo = testo.replace("\r", "")
    if len(testo.split()) < 30:
        raise ErroreTesto("vuoto")
    return testo


def segmenti(testo):
    """Frasi di circa 40 parole con orari finti (PAROLE_MINUTO), come quelle di una trascrizione vera."""
    righe = [r.strip() for r in re.split(r"\n\s*\n|\n", testo) if r.strip()]
    out, t, pezzo = [], 0.0, []

    def chiudi():
        nonlocal t, pezzo
        if pezzo:
            s = " ".join(pezzo)
            d = max(2.0, len(s.split()) * 60 / PAROLE_MINUTO)
            out.append({"inizio": round(t, 2), "fine": round(t + d, 2), "testo": s})
            t += d
            pezzo = []

    for r in righe:
        for frase in re.split(r"(?<=[.!?…])\s+", r):
            pezzo.append(frase)
            if len(" ".join(pezzo).split()) >= 40:
                chiudi()
        chiudi()            # un paragrafo non si mescola col successivo
    return out
