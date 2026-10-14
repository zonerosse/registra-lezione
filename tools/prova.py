# -*- coding: utf-8 -*-
"""
Prove automatiche di Registra Lezione (senza audio vero e senza modello di trascrizione).
Uso:  python tools/prova.py      -> deve finire con "TUTTO A POSTO"
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import wave
import zipfile
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
os.environ["RL_PARTE_SECONDI"] = "20"          # parti da 20 secondi invece di un'ora
sys.path.insert(0, str(RADICE / "app"))

import numpy as np                              # noqa: E402
from PIL import Image, ImageDraw, ImageFont     # noqa: E402
import elaborazione as el                       # noqa: E402
import registratore as rg                       # noqa: E402

W, H = 1920, 1080


def font(n):
    for p in ("C:/Windows/Fonts/arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, n)
    return ImageFont.load_default()


F = font(60)


def schermo(n, faccia):
    im = Image.new("RGB", (W, H), (32, 33, 36))
    d = ImageDraw.Draw(im)
    d.rectangle((100, 80, 1500, 1000), fill=(255, 255, 255))
    d.text((160, 140), f"Slide {n}: " + ["Limiti", "Definizione", "Esempi", "Derivata"][(n - 1) % 4],
           fill=(20, 40, 120), font=F)
    for r in range(8):
        d.line((160, 300 + r * 80, 1400 - (r * 37 + n * 91) % 500, 300 + r * 80), fill=(80, 80, 80), width=12)
    d.rectangle((1560, 80, 1880, 320), fill=(60, 60, 60))
    d.ellipse((1640 + faccia, 120, 1800 + faccia, 280), fill=(220, 180, 150))
    return im


def controlla(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print("  ok -", msg)


def prova_slide():
    print("Rilevamento slide")
    ril = rg.RilevatoreSlide()
    salvate = [n for k in range(80) for n in [1 + int(k * 2 // 40)]
               if ril.nuova(schermo(n, int(40 * np.sin(k * 1.7))), k * 2.0)]
    controlla(salvate == [1, 2, 3, 4], f"4 slide in 160 s con il docente che si muove ({salvate})")
    ril = rg.RilevatoreSlide()
    n = sum(ril.nuova(schermo(1, int(40 * np.sin(k * 1.7))), k * 2.0) for k in range(60))
    controlla(n == 1, "stessa slide per 2 minuti -> 1 sola foto")

    def cam(k):
        im = Image.new("RGB", (W, H), (60, 60, 60))
        x = int(80 * np.sin(k * 1.3))
        ImageDraw.Draw(im).ellipse((700 + x, 200, 1200 + x, 900), fill=(220, 180, 150))
        return im
    ril = rg.RilevatoreSlide()
    n = sum(ril.nuova(cam(k), k * 2.0) for k in range(60))
    controlla(n == 1, "solo videocamera a tutto schermo -> nessuna foto in piu'")


def prova_lezione(t):
    print("Lezione di 50 s in parti da 20 s")
    c = t / "lezione"
    (c / "slide").mkdir(parents=True)
    ff = el.ffmpeg_exe()
    cmd = [ff, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}",
           "-framerate", "4", "-i", "-", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
           "-pix_fmt", "yuv420p", "-g", "40", str(c / "video_tmp.mkv")]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    slides = []
    for k in range(4 * 50):                      # 50 s, slide nuova ogni 12,5 s
        n = 1 + k // 50
        im = schermo(n, k % 30)
        if k % 50 == 0:
            nome = f"slide_{n:03d}.jpg"
            im.save(c / "slide" / nome, "JPEG", quality=80)
            slides.append({"file": nome, "t": round(0.4 + k / 4, 2)})
        p.stdin.write(im.convert("RGBA").tobytes("raw", "BGRA"))
    p.stdin.close()
    p.wait()
    rate = 48000
    for k, dur in ((1, 20), (2, 20), (3, 10)):
        tt = np.arange(rate * dur) / rate
        a = (0.2 * np.sin(2 * np.pi * 440 * tt) * 32767).astype("<i2")
        with wave.open(str(c / f"audio_{k:03d}.wav"), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(a.tobytes())
    # trascrizione finta, gia' sull'orologio della lezione (il modello vero qui non c'e')
    frasi = {1: [(1, 5, "Buongiorno a tutti, oggi iniziamo con i limiti."),
                 (14, 18, "Come vedete qui, quando x tende a zero la funzione tende a uno.")],
             2: [(26, 31, "Facciamo un esempio: seno di x fratto x."),
                 (38, 39.5, "Ecco la terza slide.")],
             3: [(41, 47, "Quindi la derivata non è altro che il limite del rapporto incrementale…")]}
    for k, ff_ in frasi.items():
        el.scrivi_json(c / f"trascrizione_{k:03d}.json",
                       [{"inizio": a, "fine": b, "testo": s} for a, b, s in ff_])
    el.scrivi_json(c / "meta.json", {"nome": "Analisi 1 – Limiti", "audio_t0": 0.35, "video_t0": 0.30,
                                     "slides": slides})
    el.scrivi_json(c / "info.json", {"nome": "Analisi 1 – Limiti", "inizio": "2026-10-14T09:00:00",
                                     "durata": 50, "stato": "registrazione", "pacchetti": {}})

    pac = t / "Pacchetti per Claude"
    zp = el.crea_pacchetto(c, 1, pac)            # come durante la lezione
    controlla(zp.name == "Analisi 1 – Limiti – parte 1 (00h-00h00).zip" or zp.exists(), f"pacchetto parte 1: {zp.name}")
    with zipfile.ZipFile(zp) as z:
        nomi = z.namelist()
        testo = z.read([n for n in nomi if n.endswith(".txt")][0]).decode("utf-8")
    controlla(len(nomi) == 2 and any(n.endswith(".pdf") for n in nomi), "nel pacchetto: PDF + testo")
    controlla("limiti" in testo and "esempio" not in testo, "la parte 1 contiene solo le frasi della parte 1")
    controlla("=== Slide 1" in testo and "=== Slide 2" in testo, "la parte 1 ha le sue 2 slide")

    avanz = []
    info = el.elabora_finale(c, pac, avanz.append)
    controlla(info["stato"] == "pronta", "lezione completa pronta")
    controlla(avanz[-1] == 1.0, "barra di avanzamento arriva al 100%")
    zips = sorted(p.name for p in pac.glob("*.zip"))
    controlla(len(zips) == 3, f"3 pacchetti: {zips}")
    with zipfile.ZipFile(pac / [z for z in zips if "parte 2" in z][0]) as z:
        t2 = z.read([n for n in z.namelist() if n.endswith(".txt")][0]).decode("utf-8")
    controlla("esempio" in t2 and "Slide 1" in t2 and "Ecco la terza" in t2,
              "la parte 2 parte con la slide che era sullo schermo alle 00:20")
    controlla(not list(c.glob("audio_*.wav")), "audio grezzo tolto dopo averlo messo nel video")
    r = subprocess.run([ff, "-i", str(c / "video.mp4")], capture_output=True, text=True)
    controlla("Video: h264" in r.stderr and "Audio: aac" in r.stderr, "video.mp4 con video e audio")
    controlla("Duration: 00:00:5" in r.stderr or "Duration: 00:00:4" in r.stderr, "durata del video ~50 s")
    html = (c / "Lezione.html").read_text(encoding="utf-8")
    controlla(html.count("<section") == 4, "Lezione.html con 4 slide")
    txt = (c / "trascrizione.txt").read_text(encoding="utf-8")
    controlla(txt.index("limiti") < txt.index("esempio") < txt.index("derivata"), "testo completo in ordine")
    controlla((c / "Per Claude - Analisi 1 – Limiti.pdf").exists(), "PDF della lezione completa")


def prova_appunti(t):
    print("Appunti automatici (risposta di Claude simulata)")
    import appunti as ap
    c = t / "lezione"
    pac = t / "Pacchetti per Claude"
    finta = {"titolo": "Limiti", "di_cosa_si_parla": "Definizione di limite e forme indeterminate.",
             "concetti": [{"titolo": "Limite finito", "spiegazione": "f(x) si avvicina a L.", "dove": "slide 2, 00:12"}],
             "legenda": [{"simbolo": "lim x→0 sin(x)/x = 1", "significato": "limite notevole"}],
             "esempi_svolti": [{"titolo": "sin(3x)/x", "passaggi": ["moltiplico per 3", "= 3"]}],
             "domande_esame": ["Definisci il limite."], "da_controllare": ["00:31 audio poco chiaro"]}
    visti = []

    def chiedi(chiave, pdf_bytes, tentativi=4):
        visti.append((chiave, pdf_bytes[:5]))
        return finta, 0.19
    ap.chiedi_a_claude = chiedi
    dest, spesa = ap.crea_appunti(c, 2, "sk-ant-prova", pac)
    controlla(visti and visti[0][1] == b"%PDF-", "a Claude arriva il PDF del pacchetto della parte 2")
    controlla(dest.exists() and dest.name.startswith("Appunti – Analisi 1 – Limiti – parte 2"),
              f"PDF degli appunti accanto ai pacchetti: {dest.name}")
    info = json.loads((c / "info.json").read_text(encoding="utf-8"))
    controlla(info["appunti"]["2"] == str(dest) and abs(info["spesa_appunti"] - 0.19) < 1e-9,
              "info.json ricorda appunti e spesa")
    ap.crea_appunti(c, 2, "sk-ant-prova", pac)
    controlla(len(visti) == 1, "rifacendo il PDF non richiama Claude (risposta salvata)")
    k = ap.nascondi_chiave("sk-ant-abc")
    controlla(ap.leggi_chiave(k) == "sk-ant-abc" and "sk-ant-abc" not in k, "chiave salvata non in chiaro")
    try:
        ap.prova_chiave("ciao")
        controlla(False, "chiave sbagliata rifiutata")
    except ap.ErroreAppunti:
        controlla(True, "chiave sbagliata rifiutata")


def prova_aggiornamento(t):
    print("Aggiornamento e lanciatore")
    prog = t / "programma"
    shutil.copytree(RADICE / "app", prog / "app", ignore=shutil.ignore_patterns("__pycache__"))
    shutil.copy(RADICE / "avvio.py", prog)
    shutil.copy(RADICE / "dipendenze.py", prog)
    nuova = t / "nuova"
    shutil.copytree(RADICE / "app", nuova, ignore=shutil.ignore_patterns("__pycache__"))
    v = json.loads((nuova / "versione.json").read_text(encoding="utf-8"))
    v["versione"] = "9.9"
    (nuova / "versione.json").write_text(json.dumps(v), encoding="utf-8")
    zp = t / "aggiornamento.zip"
    with zipfile.ZipFile(zp, "w") as z:
        for f in nuova.rglob("*"):
            z.write(f, f.relative_to(nuova).as_posix())
    codice = f"""
import sys; sys.path.insert(0, r"{prog / 'app'}"); sys.path.insert(0, r"{prog}")
import aggiorna
aggiorna.installa({{"url_zip": {zp.as_uri()!r}, "peso": {zp.stat().st_size}}})
print("installato")
"""
    r = subprocess.run([sys.executable, "-c", codice], capture_output=True, text=True)
    controlla(r.returncode == 0 and (prog / "app_nuova" / "registra_lezione.py").exists(),
              "aggiornamento scaricato in app_nuova " + r.stderr[-300:])
    r = subprocess.run([sys.executable, str(prog / "avvio.py"), "--prova"], capture_output=True, text=True,
                       cwd=str(prog))
    esito = (prog / "prova_avvio.txt").read_text(encoding="utf-8")
    controlla(r.returncode == 0 and "TUTTO A POSTO" in esito, "il lanciatore parte con la versione nuova\n" + esito[-600:])
    v2 = json.loads((prog / "app" / "versione.json").read_text(encoding="utf-8"))
    controlla(v2["versione"] == "9.9" and (prog / "app_vecchia").exists() and not (prog / "app_nuova").exists(),
              "app sostituita (la vecchia resta in app_vecchia)")


def main():
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp)
        prova_slide()
        prova_lezione(t)
        prova_appunti(t)
        prova_aggiornamento(t)
    print("\nTUTTO A POSTO")


if __name__ == "__main__":
    main()
