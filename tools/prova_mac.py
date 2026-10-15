# -*- coding: utf-8 -*-
"""
Prova su un Mac vero (quelli di GitHub): una finta lezione.
  - il Mac "parla" con la sua voce sintetica (say) mentre una finestra mostra slide che cambiano;
  - rl-cattura (il pezzo scritto per macOS) registra audio del Mac e schermo;
  - poi controllo: c'e' audio? la trascrizione contiene le frasi dette? le slide cambiate sono state viste?
Risultati in prova_mac/ (esito.txt, foto, audio, trascrizione).
"""
import json
import os
import re
import subprocess
import sys
import threading
import time
import traceback
import wave
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
OUT = RADICE / "prova_mac"
OUT.mkdir(exist_ok=True)
CATTURA = RADICE / "mac" / "rl-cattura"
righe = []

LEZIONE = {
    "it": ["Buongiorno ragazzi, oggi parliamo di limiti notevoli.",
           "Il primo limite notevole è il seno di x fratto x, che tende a uno quando x tende a zero.",
           "Si dimostra con il teorema del confronto, e vale solo con gli angoli in radianti.",
           "Questo all'esame lo chiedo sempre, segnatevelo.",
           "Passiamo alla seconda slide: il numero di Nepero.",
           "Uno più uno fratto x, tutto elevato alla x, tende al numero e, circa due virgola settantuno.",
           "Terza slide: le forme indeterminate, zero su zero e infinito su infinito."],
    "en": ["Good morning everyone, today we talk about notable limits.",
           "The first notable limit is sine of x over x, which tends to one as x tends to zero.",
           "It is proved with the squeeze theorem, and it only works with angles in radians.",
           "I always ask this at the exam, write it down.",
           "Let's move to the second slide: Euler's number.",
           "One plus one over x, all to the power of x, tends to the number e, about two point seven one.",
           "Third slide: indeterminate forms, zero over zero and infinity over infinity."],
}


def scrivi(s):
    print(s, flush=True)
    righe.append(s)
    (OUT / "esito.txt").write_text("\n".join(righe), encoding="utf-8")


def voce():
    elenco = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
    (OUT / "voci.txt").write_text(elenco)
    for riga in elenco.splitlines():
        if " it_IT " in riga or "it-IT" in riga:
            return riga.split()[0], "it"
    for riga in elenco.splitlines():
        if " en_US " in riga:
            return riga.split()[0], "en"
    return None, "en"


def slide(lingua):
    from PIL import Image, ImageDraw, ImageFont
    titoli = {"it": ["1 · Limiti notevoli", "2 · Il numero e", "3 · Forme indeterminate"],
              "en": ["1 · Notable limits", "2 · The number e", "3 · Indeterminate forms"]}[lingua]
    corpi = ["sin x / x → 1  (x → 0)", "(1 + 1/x)^x → e ≈ 2,718", "0/0     ∞/∞     ∞ − ∞"]
    colori = [(13, 66, 117), (124, 58, 237), (194, 65, 12)]
    font = None
    for f in ("/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf"):
        if Path(f).exists():
            font = f
    out = []
    for i, (t, c, col) in enumerate(zip(titoli, corpi, colori)):
        im = Image.new("RGB", (1600, 900), "white")
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 1600, 170], fill=col)
        ft = ImageFont.truetype(font, 80) if font else ImageFont.load_default()
        fc = ImageFont.truetype(font, 96) if font else ImageFont.load_default()
        d.text((60, 40), t, fill="white", font=ft)
        d.text((120, 420), c, fill=(20, 20, 20), font=fc)
        p = OUT / f"slide_{i + 1}.png"
        im.save(p)
        out.append(p)
    return out


def mostra_slide(immagini, secondi_ognuna, fine_ev):
    """Una finestra a tutto schermo che cambia slide (come la condivisione schermo del docente)."""
    import tkinter as tk
    from PIL import ImageTk, Image
    r = tk.Tk()
    r.attributes("-fullscreen", True)
    r.configure(bg="white")
    W, H = r.winfo_screenwidth(), r.winfo_screenheight()
    foto = [ImageTk.PhotoImage(Image.open(p).resize((W, H))) for p in immagini]
    lab = tk.Label(r, image=foto[0], bd=0)
    lab.pack(fill="both", expand=True)
    stato = {"i": 0}

    def avanti():
        if fine_ev.is_set():
            r.destroy()
            return
        stato["i"] = min(stato["i"] + 1, len(foto) - 1)
        lab.configure(image=foto[stato["i"]])
        r.after(int(secondi_ognuna * 1000), avanti)
    r.after(int(secondi_ognuna * 1000), avanti)
    r.mainloop()


def a_wav(f32, frequenza, dest):
    import numpy as np
    a = np.fromfile(f32, dtype=np.float32)
    with wave.open(str(dest), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(int(frequenza))
        w.writeframes((np.clip(a, -1, 1) * 32767).astype("<i2").tobytes())
    return len(a) / frequenza, float(np.sqrt(np.mean(a ** 2))) if len(a) else 0.0


def parole(s):
    return set(re.findall(r"[a-zàèéìòù]{4,}", s.lower()))


def main():
    scrivi(f"macOS {subprocess.run(['sw_vers', '-productVersion'], capture_output=True, text=True).stdout.strip()} "
           f"· {os.uname().machine}")
    audio_dev = subprocess.run(["system_profiler", "SPAudioDataType"], capture_output=True, text=True).stdout
    (OUT / "audio_dispositivi.txt").write_text(audio_dev)
    v, lingua = voce()
    scrivi(f"voce: {v} ({lingua})")
    testo = LEZIONE[lingua]
    # la lezione parlata, gia' pronta in un file (cosi' so quanto dura)
    aiff = OUT / "lezione.aiff"
    subprocess.run(["say"] + (["-v", v] if v else []) + ["-o", str(aiff), " ".join(testo)], check=True)
    durata = float(subprocess.run(["afinfo", str(aiff)], capture_output=True, text=True).stdout
                   .split("estimated duration:")[1].split()[0])
    scrivi(f"lezione parlata: {durata:.1f} s")
    immagini = slide(lingua)
    rec = OUT / "rec"
    fine_ev = threading.Event()
    # 1. parte la registrazione
    p = subprocess.Popen([str(CATTURA), str(rec), str(durata + 8)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    eventi = []
    pronto = threading.Event()

    def leggi():
        for riga in p.stdout:
            riga = riga.strip()
            eventi.append(riga)
            if riga.startswith("PRONTO") or riga.startswith("ERRORE"):
                pronto.set()
    threading.Thread(target=leggi, daemon=True).start()
    pronto.wait(30)
    scrivi("avvio cattura: " + next((e for e in eventi if e.startswith(("PRONTO", "ERRORE"))), "nessuna risposta"))
    # 2. il "docente" parla mentre le slide cambiano
    def parla():
        time.sleep(2)
        subprocess.run(["afplay", str(aiff)])
    threading.Thread(target=parla, daemon=True).start()
    threading.Timer(durata + 6, fine_ev.set).start()
    try:
        mostra_slide(immagini, (durata + 4) / 3, fine_ev)
    except Exception:
        scrivi("finestra slide: " + traceback.format_exc()[-300:])
        fine_ev.wait()
    p.wait(timeout=120)
    (OUT / "eventi.txt").write_text("\n".join(eventi))
    livelli = [float(e.split()[1]) for e in eventi if e.startswith("LIVELLO")]
    foto = [e for e in eventi if e.startswith("FOTO")]
    scrivi(f"eventi: {len(livelli)} livelli (max {max(livelli, default=0):.2f}), {len(foto)} foto, "
           f"fine: {'FINE' in eventi}")
    info = json.loads((rec / "cattura.json").read_text()) if (rec / "cattura.json").exists() else {}
    esito = True
    # 3. audio registrato
    if (rec / "audio.f32").exists():
        sec, rms = a_wav(rec / "audio.f32", info.get("frequenza", 48000), OUT / "audio_registrato.wav")
        scrivi(f"audio registrato: {sec:.1f} s, volume medio {rms:.4f}")
        if rms < 0.002:
            scrivi("NO   audio: e' silenzio")
            esito = False
        else:
            # 4. trascrizione
            from faster_whisper import WhisperModel
            m = WhisperModel("small", device="cpu", compute_type="int8")
            import numpy as np
            a = np.fromfile(rec / "audio.f32", dtype=np.float32)
            a = a[:len(a) // 3 * 3].reshape(-1, 3).mean(axis=1).astype(np.float32)     # 48 -> 16 kHz
            segs, _ = m.transcribe(a, language=lingua, vad_filter=True, beam_size=1)
            tras = " ".join(s.text.strip() for s in segs)
            (OUT / "trascrizione.txt").write_text(tras, encoding="utf-8")
            attese = parole(" ".join(testo))
            trovate = attese & parole(tras)
            q = len(trovate) / max(1, len(attese))
            scrivi(f"trascrizione: {q:.0%} delle parole ritrovate · «{tras[:160]}…»")
            if q < 0.6:
                esito = False
    else:
        scrivi("NO   audio: file non creato")
        esito = False
    # 5. slide viste: le foto devono essere cambiate (colori diversi della testata)
    from PIL import Image
    colori = set()
    for f in sorted((rec / "schermo").glob("*.jpg")):
        with Image.open(f) as im:
            px = im.convert("RGB").resize((32, 18)).getpixel((16, 1))
            colori.add(tuple(c // 40 for c in px))
    scelte = sorted((rec / "schermo").glob("*.jpg"))
    for i, f in enumerate(scelte[::max(1, len(scelte) // 4)][:4]):
        Image.open(f).convert("RGB").resize((640, 360)).save(OUT / f"foto_{i + 1}.jpg")
    scrivi(f"slide: {len(colori)} testate diverse viste in {len(scelte)} foto")
    if len(scelte) == 0:
        esito = False
    scrivi("TUTTO A POSTO" if esito else "QUALCOSA NON VA")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        scrivi("ERRORE " + traceback.format_exc()[-1500:])
    os._exit(0)
