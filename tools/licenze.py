# -*- coding: utf-8 -*-
"""
Prepara le licenze dei componenti di Verba Manent IA:
  app/LICENZE.txt              testo completo (va nella cartella del programma)
  app/interfaccia/licenze.js   la pagina Informazioni > Licenze (caricata solo quando si apre)

Uso:  python tools/licenze.py CARTELLA_RUOTE
CARTELLA_RUOTE contiene i pacchetti .whl per Windows di requirements.txt e delle loro dipendenze
(pip download ... --no-deps --platform win_amd64 --python-version 3.12 --only-binary=:all:).
I testi che non stanno nei pacchetti sono in tools/licenze/ e in app/_vendor/licenze/.
Rifallo quando cambia requirements.txt o si aggiunge un componente.
"""
import glob, json, re, sys, tarfile, zipfile
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
EXTRA = RADICE / "tools" / "licenze"
VENDOR = RADICE / "app" / "_vendor"

# Gruppi della pagina. Ogni voce: nome, descrizione it, descrizione en, etichetta licenza, testi
# (nome pacchetto pip, oppure "x:file" per tools/licenze, "v:file" per app/_vendor).
GRUPPI = [
    ("Trascrizione della voce", "Speech transcription", [
        ("faster-whisper", "Trascrive l'audio sul tuo computer", "Transcribes audio on your computer", "MIT", ["faster-whisper"]),
        ("CTranslate2", "Fa girare il modello di trascrizione velocemente", "Runs the transcription model fast", "MIT", ["x:ctranslate2"]),
        ("Modello Whisper «small» (OpenAI)", "Il riconoscitore vocale vero e proprio", "The speech recognition model itself", "MIT", ["x:whisper"]),
        ("Silero VAD", "Riconosce i momenti in cui qualcuno parla", "Detects when someone is speaking", "MIT", ["x:silero"]),
        ("ONNX Runtime", "Fa girare Silero VAD e il modello delle voci", "Runs Silero VAD and the voice model", "MIT", ["onnxruntime"]),
        ("whisper.cpp (solo Android)", "La trascrizione sul telefono", "Transcription on the phone", "MIT", ["x:whispercpp"]),
    ]),
    ("Chi parla", "Who's speaking", [
        ("Modello WeSpeaker ResNet34 (VoxCeleb)", "Distingue le voci dentro la stessa registrazione, senza conservarle", "Tells voices apart within one recording, without keeping them", "CC BY 4.0", ["x:wespeaker"]),
    ]),
    ("Registrazione, audio e video", "Recording, audio and video", [
        ("FFmpeg", "Converte e unisce audio e video (programma separato, incluso così com'è)", "Converts and joins audio and video (separate program, included unchanged)", "GPL", ["x:ffmpeg", "imageio-ffmpeg"]),
        ("PyAV", "Legge i file audio e video", "Reads audio and video files", "BSD", ["av"]),
        ("SoundCard", "Registra l'audio del computer e il microfono", "Records computer audio and the microphone", "BSD", ["soundcard"]),
        ("MSS", "Cattura lo schermo per le slide", "Captures the screen for the slides", "MIT", ["mss"]),
        ("NumPy", "Calcoli sull'audio", "Audio calculations", "BSD", ["numpy"]),
        ("Pillow", "Immagini e slide", "Images and slides", "MIT", ["pillow"]),
    ]),
    ("Finestra del programma", "Program window", [
        ("pywebview", "Apre la finestra del programma", "Opens the program window", "BSD", ["pywebview"]),
        ("Python.NET", "Collega il programma a Windows", "Connects the program to Windows", "MIT", ["x:pythonnet", "clr-loader"]),
        ("Bottle", "Piccolo server interno della finestra", "Small internal server for the window", "MIT", ["bottle"]),
        ("Microsoft Edge WebView2", "Disegna la finestra (fa parte di Windows, non è incluso)", "Draws the window (part of Windows, not included)", "Microsoft", []),
    ]),
    ("Appunti, PDF e calendario", "Notes, PDF and calendar", [
        ("fpdf2", "Crea i PDF degli appunti", "Creates the notes PDFs", "LGPL", ["fpdf2"]),
        ("fontTools", "Prepara i caratteri dei PDF", "Prepares the PDF fonts", "MIT", ["fonttools"]),
        ("Caratteri DejaVu (solo Android)", "Simboli matematici negli appunti", "Math symbols in the notes", "Libera", ["a:LICENZA-DejaVu.txt"]),
        ("Carattere Atkinson Hyperlegible (Braille Institute)", "Il carattere della «Lettura facilitata»", "The «Easy reading» font", "SIL OFL 1.1", ["f:OFL.txt"]),
        ("pypdf", "Legge le slide in PDF del docente", "Reads the lecturer's PDF slides", "BSD", ["v:pypdf-LICENSE.txt"]),
        ("icalendar", "Legge i calendari Google e Outlook", "Reads Google and Outlook calendars", "BSD", ["v:licenze/icalendar-7.3.0-LICENSE.rst"]),
        ("recurring-ical-events", "Gli impegni che si ripetono", "Recurring events", "LGPL", ["v:licenze/recurring_ical_events-3.8.2-LICENSE"]),
        ("x-wr-timezone", "Fusi orari dei calendari", "Calendar time zones", "LGPL", ["v:licenze/x_wr_timezone-2.0.1-LICENSE"]),
        ("python-dateutil, six, tzdata", "Date e fusi orari", "Dates and time zones", "Apache · BSD · MIT", ["v:licenze/python_dateutil-2.9.0.post0-LICENSE", "v:licenze/six-1.17.0-LICENSE", "v:licenze/tzdata-2026.5-LICENSE"]),
    ]),
    ("Base del programma", "Program foundation", [
        ("Python", "Il linguaggio del programma, con le sue librerie", "The program's language, with its libraries", "PSF", ["x:python", "typing-extensions"]),
        ("PyInstaller", "Prepara il programma per Windows", "Packages the program for Windows", "GPL con eccezione", ["x:pyinstaller"]),
        ("Hugging Face Hub, tokenizers", "Scaricano e leggono il modello di trascrizione", "Download and read the transcription model", "Apache", ["huggingface-hub", "x:tokenizers", "hf-xet"]),
        ("Chaquopy (solo Android)", "Python dentro l'app Android", "Python inside the Android app", "MIT", ["x:chaquopy"]),
        ("AndroidX (solo Android)", "Componenti di base dell'app Android", "Basic Android app components", "Apache", ["x:androidx-core"]),
        ("Inno Setup", "Crea l'installatore", "Builds the installer", "Libera", ["x:innosetup"]),
    ]),
]
ALTRI = ("Altre librerie di supporto", "Other supporting libraries")
TESTI_COMUNI = [("GNU GENERAL PUBLIC LICENSE v3", "x:GPL-3"), ("GNU LESSER GENERAL PUBLIC LICENSE v3", "x:LGPL-3")]


def leggi_ruote(cartella):
    info = {}
    for w in glob.glob(str(Path(cartella) / "*.whl")):
        z = zipfile.ZipFile(w)
        nomi = z.namelist()
        meta = z.read(next(n for n in nomi if n.endswith(".dist-info/METADATA"))).decode("utf8", "replace")
        testa = meta.split("\n\n")[0]
        nome = re.search(r"^Name: (.+)$", testa, re.M).group(1).strip()
        ver = re.search(r"^Version: (.+)$", testa, re.M).group(1).strip()
        lic = re.search(r"^License-Expression: (.+)$", testa, re.M) or re.search(r"^License: (.+)$", testa, re.M)
        file = [n for n in nomi if re.search(r"(LICEN[CS]E|COPYING|NOTICE)[^/]*$", n, re.I) and not n.endswith("/")]
        testo = "\n\n".join(z.read(f).decode("utf8", "replace").strip() for f in sorted(file))
        cls = re.findall(r"^Classifier: License :: OSI Approved :: (.+?)(?: License)?$", testa, re.M)
        lic = lic.group(1).strip() if lic else (cls[0] if cls else "")
        info[chiave(nome)] = {"nome": nome, "ver": ver, "lic": lic, "testo": testo}
    for t in glob.glob(str(Path(cartella) / "*.tar.gz")):   # pacchetti senza .whl (proxy_tools)
        with tarfile.open(t) as tf:
            pk = next(m for m in tf.getmembers() if m.name.count("/") == 1 and m.name.endswith("/PKG-INFO"))
            meta = tf.extractfile(pk).read().decode("utf8", "replace")
        nome = re.search(r"^Name: (.+)$", meta, re.M).group(1).strip()
        ver = re.search(r"^Version: (.+)$", meta, re.M).group(1).strip()
        aut = re.search(r"^Author: (.+)$", meta, re.M)
        lic = re.search(r"^License: (.+)$", meta, re.M).group(1).strip()
        testo = f"{nome} {ver}: {lic} License" + (f", Copyright (c) {aut.group(1).strip()}" if aut else "")
        info[chiave(nome)] = {"nome": nome, "ver": ver, "lic": lic, "testo": testo}
    return info


def chiave(n):
    return re.sub(r"[-_.]+", "-", n).lower()


def testo_di(rif, ruote):
    if rif.startswith("x:"):
        return (EXTRA / (rif[2:] + ".txt")).read_text(encoding="utf8").strip()
    if rif.startswith("v:"):
        return (VENDOR / rif[2:]).read_text(encoding="utf8").strip()
    if rif.startswith("f:"):
        return (RADICE / "app" / "interfaccia" / "font" / rif[2:]).read_text(encoding="utf8").strip()
    if rif.startswith("a:"):
        return (RADICE / "android" / "risorse" / "font" / rif[2:]).read_text(encoding="utf8", errors="replace").strip()
    r = ruote[chiave(rif)]
    return r["testo"] or f"{r['nome']} {r['ver']}: {r['lic']}"


def main():
    ruote = leggi_ruote(sys.argv[1])
    usati = set()
    gruppi, testi = [], {}
    for it, en, voci in GRUPPI:
        g = {"it": it, "en": en, "voci": []}
        for nome, dit, den, lic, rif in voci:
            ids = []
            for r in rif:
                if not r[1:2] == ":":
                    usati.add(chiave(r))
                testi.setdefault(r, testo_di(r, ruote))
                ids.append(r)
            g["voci"].append({"n": nome, "it": dit, "en": den, "l": lic, "t": ids})
        gruppi.append(g)
    usati |= {"ctranslate2", "pythonnet", "tokenizers"}   # testi presi da tools/licenze
    altri = {"it": ALTRI[0], "en": ALTRI[1], "voci": []}
    for k in sorted(set(ruote) - usati):
        r = ruote[k]
        testi[k] = r["testo"] or (testo_di("x:" + k, ruote) if (EXTRA / (k + ".txt")).exists() else testo_di(k, ruote))
        altri["voci"].append({"n": f"{r['nome']} {r['ver']}", "it": "", "en": "", "l": r["lic"][:40], "t": [k]})
    gruppi.append(altri)
    for _, rif in TESTI_COMUNI:
        testi[rif] = testo_di(rif, ruote)

    js = ("/* Generato da tools/licenze.py: non modificare a mano. */\nwindow.LICENZE = "
          + json.dumps({"gruppi": gruppi, "testi": testi, "comuni": TESTI_COMUNI}, ensure_ascii=False, separators=(",", ":"))
          + ";\n")
    (RADICE / "app" / "interfaccia" / "licenze.js").write_text(js, encoding="utf8")

    righe = ["VERBA MANENT IA — LICENZE / LICENSES", "",
             "Verba Manent IA © 2026 Sara Boldrini (Punto Web Ferrara). Tutti i diritti riservati. All rights reserved.",
             "", "Verba Manent IA usa i componenti liberi elencati qui sotto, ciascuno con la sua licenza.",
             "Verba Manent IA uses the free components listed below, each under its own license.", ""]
    for g in gruppi:
        righe += ["", "=" * 78, f"{g['it']} / {g['en']}".upper(), "=" * 78]
        for v in g["voci"]:
            righe += ["", "-" * 78, f"{v['n']}  [{v['l']}]", "-" * 78]
            for r in v["t"]:
                righe += ["", testi[r]]
    for titolo, rif in TESTI_COMUNI:
        righe += ["", "=" * 78, titolo, "=" * 78, "", testi[rif]]
    (RADICE / "app" / "LICENZE.txt").write_text("\n".join(righe) + "\n", encoding="utf-8-sig")
    print("componenti:", sum(len(g["voci"]) for g in gruppi), "| altri:", len(altri["voci"]),
          "| licenze.js:", len(js) // 1024, "KB")


if __name__ == "__main__":
    main()
