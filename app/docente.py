# -*- coding: utf-8 -*-
"""
Slide del docente in PDF.

Se il docente pubblica le slide, le aggiungo alla lezione:
  - ogni pagina diventa un'immagine nitida in slide/docente_001.jpg ... (Windows le disegna da solo:
    uso il lettore PDF di Windows 10/11, niente librerie in piu');
  - dal PDF leggo anche il testo di ogni pagina (pypdf, copiato in _vendor);
  - poi abbino le pagine alla lezione:
      * se lo schermo e' stato registrato, ogni foto dello schermo viene sostituita dalla pagina
        del PDF che le somiglia di piu' (immagine contro immagine);
      * se la lezione era in aula (nessuna foto), metto le pagine sulla linea del tempo
        confrontando il loro testo con le parole del docente.
Tutto finisce in docente.json; elaborazione.py lo usa quando prepara pacchetti e appunti.
"""
import json
import logging
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

log = logging.getLogger("registra_lezione")
QUI = Path(__file__).resolve().parent
NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0
LARGHEZZA = 1600

# il lettore PDF di Windows (Windows.Data.Pdf), usato da PowerShell
_PS = r"""
param([string]$pdf, [string]$out, [int]$w)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$m = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 }
$opT = $m | Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$acT = $m | Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1
function Aspetta($op, [Type]$t) { $k = $opT.MakeGenericMethod($t).Invoke($null, @($op)); $k.Wait() | Out-Null; $k.Result }
function AspettaA($op) { $acT.Invoke($null, @($op)).Wait() | Out-Null }
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
$f = Aspetta ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdf)) ([Windows.Storage.StorageFile])
$doc = Aspetta ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($f)) ([Windows.Data.Pdf.PdfDocument])
for ($i = 0; $i -lt $doc.PageCount; $i++) {
  $p = $doc.GetPage($i)
  $o = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $o.DestinationWidth = $w
  $s = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  AspettaA ($p.RenderToStreamAsync($s, $o))
  $in = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($s.GetInputStreamAt(0))
  $fs = [System.IO.File]::Create((Join-Path $out ('p{0:D3}.png' -f ($i + 1))))
  $in.CopyTo($fs); $fs.Close(); $in.Close(); $p.Dispose()
}
Write-Output $doc.PageCount
"""


class ErroreDocente(Exception):
    pass


def _pypdf():
    v = str(QUI / "_vendor")
    if v not in sys.path:
        sys.path.insert(0, v)
    import pypdf
    return pypdf


def _disegna_pagine(pdf, cartella_tmp):
    """Disegna ogni pagina del PDF in cartella_tmp/p001.png ... Ritorna l'elenco dei file."""
    cartella_tmp = Path(cartella_tmp)
    if sys.platform == "win32":
        ps1 = cartella_tmp / "disegna.ps1"
        ps1.write_text(_PS, encoding="utf-8-sig")
        r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps1),
                            "-pdf", str(Path(pdf).resolve()), "-out", str(cartella_tmp), "-w", str(LARGHEZZA)],
                           capture_output=True, timeout=900, creationflags=NO_WINDOW)
        if r.returncode != 0:
            log.error("PDF non disegnato: %s", r.stderr.decode("utf-8", "replace")[-1500:])
    elif shutil.which("pdftoppm"):          # solo per le prove su Linux
        subprocess.run(["pdftoppm", "-png", "-scale-to-x", str(LARGHEZZA), "-scale-to-y", "-1",
                        str(pdf), str(cartella_tmp / "p")], capture_output=True, timeout=900)
        for f in cartella_tmp.glob("p-*.png"):
            f.rename(cartella_tmp / f"p{int(f.stem.split('-')[1]):03d}.png")
    return sorted(cartella_tmp.glob("p[0-9][0-9][0-9].png"))


def testi_pagine(pdf):
    try:
        lettore = _pypdf().PdfReader(str(pdf))
        out = []
        for pg in lettore.pages:
            try:
                out.append(pg.extract_text() or "")
            except Exception:
                out.append("")
        return out
    except Exception:
        log.exception("testo del PDF")
        return []


def info_pdf(pdf):
    """{"pagine", "mb"} per mostrarlo prima di aggiungerlo."""
    n = 0
    try:
        n = len(_pypdf().PdfReader(str(pdf)).pages)
    except Exception:
        log.exception("pagine del PDF")
    return {"pagine": n, "mb": round(Path(pdf).stat().st_size / 1e6, 1), "nome": Path(pdf).name}


def leggi(cartella):
    p = Path(cartella) / "docente.json"
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _scrivi(cartella, dati):
    p = Path(cartella) / "docente.json"
    tmp = p.with_name(f"docente.{os.getpid()}.tmp")
    tmp.write_text(json.dumps(dati, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, p)


def aggiungi(cartella, pdf):
    """Copia il PDF nella lezione, disegna le pagine e ne legge il testo."""
    from PIL import Image
    cartella = Path(cartella)
    dest = cartella / "slide_docente.pdf"
    if Path(pdf).resolve() != dest.resolve():
        shutil.copy2(pdf, dest)
    (cartella / "slide").mkdir(exist_ok=True)
    for vecchia in (cartella / "slide").glob("docente_*.jpg"):
        vecchia.unlink()
    testi = testi_pagine(dest)
    pagine = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, png in enumerate(_disegna_pagine(dest, tmp), 1):
            nome = f"docente_{i:03d}.jpg"
            with Image.open(png) as im:
                im = im.convert("RGB")
                if im.width > LARGHEZZA:
                    im = im.resize((LARGHEZZA, round(im.height * LARGHEZZA / im.width)), Image.LANCZOS)
                im.save(cartella / "slide" / nome, "JPEG", quality=85)
            pagine.append({"n": i, "file": nome, "testo": testi[i - 1] if i - 1 < len(testi) else ""})
    if not pagine:
        raise ErroreDocente("pdf")
    dati = {"pdf": dest.name, "pagine": pagine, "sostituzioni": {}, "eventi": []}
    _scrivi(cartella, dati)
    log.info("slide del docente: %s pagine da %s", len(pagine), Path(pdf).name)
    return dati


# --------------------------------------------------------------------------- abbinamento

def _impronta(percorso):
    """Immagine piccola in grigio, normalizzata: per confrontare due slide."""
    import numpy as np
    from PIL import Image
    with Image.open(percorso) as im:
        a = np.asarray(im.convert("L").resize((64, 36), Image.BILINEAR), dtype=np.float32)
    a = a - a.mean()
    n = float(np.sqrt((a * a).sum())) or 1.0
    return a / n


def _sostituzioni(cartella, dati, meta):
    """Per ogni foto dello schermo, la pagina del PDF che le somiglia di piu' (se somiglia abbastanza)."""
    import elaborazione as el
    impronte = [(p["file"], _impronta(Path(cartella) / "slide" / p["file"])) for p in dati["pagine"]]
    sost = {}
    for s in meta.get("slides", []):
        nome = s["file"]
        try:
            rit = el.immagine_slide(cartella, nome, originale=True)
            a = _impronta(rit)
        except Exception:
            continue
        migliore, punti = None, 0.0
        for f, b in impronte:
            c = float((a * b).sum())
            if c > punti:
                migliore, punti = f, c
        if migliore and punti >= 0.55:
            sost[nome] = migliore
    return sost


_PAROLA = re.compile(r"[^\W\d_]{4,}", re.UNICODE)


def _parole(testo):
    return [w.lower() for w in _PAROLA.findall(testo or "")]


def _eventi(cartella, dati):
    """Lezione senza foto dello schermo: metto le pagine sulla linea del tempo confrontando il
    loro testo con quello che dice il docente (a finestre di un minuto). Si va quasi sempre avanti:
    tornare indietro di pagina costa di piu' che restare o andare avanti."""
    import elaborazione as el
    segmenti = []
    for f in sorted(Path(cartella).glob("trascrizione_*.json")):
        segmenti += el.leggi_json(f, []) or []
    pagine = [p for p in dati["pagine"] if len(_parole(p["testo"])) >= 3]
    if not segmenti or not pagine:
        return []
    fine = max(s["fine"] for s in segmenti)
    finestre = []
    t = 0.0
    while t < fine:
        parole = []
        for s in segmenti:
            if t <= (s["inizio"] + s["fine"]) / 2 < t + 60:
                parole += _parole(s["testo"])
        finestre.append((t, Counter(parole)))
        t += 60
    # quanto e' rara ogni parola fra le pagine (le parole di tutte le pagine contano poco)
    doc = [Counter(_parole(p["testo"])) for p in pagine]
    df = Counter(w for d in doc for w in d)
    idf = {w: math.log(1 + len(doc) / c) for w, c in df.items()}
    norme = [math.sqrt(sum((idf[w] * c) ** 2 for w, c in d.items())) or 1 for d in doc]

    def somiglia(fin, j):
        d = doc[j]
        return sum(idf[w] * d[w] * min(c, 3) for w, c in fin.items() if w in d) / norme[j]

    P = len(pagine)
    punti = [[somiglia(f, j) for j in range(P)] for _, f in finestre]
    massimo = max((max(r) for r in punti), default=0) or 1
    punti = [[x / massimo for x in r] for r in punti]
    # Viterbi: stato = pagina mostrata
    INDIETRO, AVANTI = 0.35, 0.02
    prec = punti[0][:]
    da = []
    for i in range(1, len(punti)):
        nuovo, scelta = [], []
        for j in range(P):
            migliore, mj = -1e9, j
            for q in range(P):
                v = prec[q] - (0 if q == j else (AVANTI * (j - q) if j > q else INDIETRO))
                if v > migliore:
                    migliore, mj = v, q
            nuovo.append(migliore + punti[i][j])
            scelta.append(mj)
        prec = nuovo
        da.append(scelta)
    j = max(range(P), key=lambda x: prec[x])
    percorso = [j]
    for scelta in reversed(da):
        j = scelta[j]
        percorso.append(j)
    percorso.reverse()
    eventi, ultima = [], None
    for (t, _), j in zip(finestre, percorso):
        if j != ultima:
            eventi.append({"file": pagine[j]["file"], "t": round(t, 1)})
            ultima = j
    return eventi


def allinea(cartella):
    """Ricalcola l'abbinamento pagine <-> lezione (va rifatto quando arriva nuova trascrizione)."""
    import elaborazione as el
    dati = leggi(cartella)
    if not dati:
        return None
    meta = el.leggi_json(Path(cartella) / "meta.json", {}) or {}
    try:
        if meta.get("slides"):
            # se nessuna foto somiglia al PDF restano le foto dello schermo
            dati["sostituzioni"], dati["eventi"] = _sostituzioni(cartella, dati, meta), []
        else:
            dati["sostituzioni"], dati["eventi"] = {}, _eventi(cartella, dati)
    except Exception:
        log.exception("abbinamento slide del docente")
    _scrivi(cartella, dati)
    log.info("slide del docente: %s foto sostituite, %s pagine sulla linea del tempo",
             len(dati["sostituzioni"]), len(dati["eventi"]))
    return dati
