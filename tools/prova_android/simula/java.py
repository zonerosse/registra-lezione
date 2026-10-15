"""Finto modulo 'java' di Chaquopy: fa finta di essere il telefono (Ponte, Registrazione, Whisper)
per provare la parte Python dell'app Android su un PC normale, senza emulatore."""
import os, threading, time, wave, base64, subprocess, shutil, glob
from pathlib import Path
DATI = Path(os.environ["SIM_DATI"]); DATI.mkdir(parents=True, exist_ok=True)
CACHE = DATI / "cache"; CACHE.mkdir(exist_ok=True)
def jfloat(x): return float(x)
def jarray(t): return lambda x: list(x)
class _Ponte:
    scaricati = 0; totale = 0
    def contesto(self): return None
    def cartellaDati(self): return str(DATI)
    def cartellaCache(self): return str(CACHE)
    def versione(self): return "0.7"
    def codice(self): return 7
    def getScaricati(self): return self.scaricati
    def getTotale(self): return self.totale
    def riavvia(self):
        print("RIAVVIA", flush=True)
        (DATI / "riavviato.txt").write_text("si")
    def inCarica(self): return os.environ.get("SIM_CARICA") == "1"
    def batteria(self): return 74
    def apri(self, p): print("APRI", p, flush=True); return True
    def condividi(self, p): print("CONDIVIDI", p, flush=True); return True
    def apriLink(self, u):
        print("LINK", u, flush=True)
        with open(DATI / "link_aperti.txt", "a") as f: f.write(u + "\n")
    def scegliFile(self, tipo): return os.environ.get("TEST_PDF" if tipo == "pdf" else "TEST_VIDEO", "")
    def scarica(self, url, dest):
        print("SCARICA", url, flush=True); time.sleep(1)
        if url.endswith(".zip"):
            shutil.copy(os.environ["SIM_ZIP"], dest); self.totale = self.scaricati = os.path.getsize(dest)
            return ""
        with open(dest, "wb") as f: f.truncate(200_000_000)
        return ""
    def pdfInPng(self, pdf, cart, w):
        subprocess.run(["pdftoppm", "-png", "-scale-to-x", str(w), "-scale-to-y", "-1", pdf, cart + "/p"])
        n = 0
        for f in Path(cart).glob("p-*.png"):
            f.rename(Path(cart) / f"p{int(f.stem.split('-')[1]):03d}.png"); n += 1
        return n
    def unisciAudio(self, wavs, out):
        import imageio_ffmpeg
        lst = Path(out).with_suffix(".txt"); lst.write_text("".join(f"file '{w}'\n" for w in wavs))
        r = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c:a", "aac", "-f", "mp4", out + ".tmp"])
        lst.unlink(); os.replace(out + ".tmp", out); return r.returncode == 0
    def cifra(self, s): return base64.b64encode(s[::-1].encode()).decode()
    def decifra(self, s): return base64.b64decode(s).decode()[::-1]
    def notifica(self, a, b): print("NOTIFICA", a, b, flush=True)
SORGENTE = os.environ.get("SIM_WAV")
class _Reg:
    RATE = 16000
    def __init__(self):
        self.attiva = False; self.inPausa = False; self.livello = 0.0; self.campioni = 0; self.partiChiuse = 0
        self.errore = ""; self.richiestaFine = False; self.th = None
    def getPartiChiuse(self): return self.partiChiuse
    def getErrore(self): return self.errore
    def getRichiestaFine(self): return self.richiestaFine
    def setRichiestaFine(self, v): self.richiestaFine = v
    def getLivello(self): return self.livello
    def getInPausa(self): return self.inPausa
    def secondi(self): return self.campioni / 16000
    def pausa(self, si): self.inPausa = si
    def livelloAdesso(self): return 0.3
    def tieniSveglio(self, c, si): print("SVEGLIO", si, flush=True)
    def avvia(self, ctx, cart, parte, nome):
        self.attiva = True; self.campioni = 0; self.partiChiuse = 0; self.inPausa = False
        self.th = threading.Thread(target=self._reg, args=(cart, parte), daemon=True); self.th.start(); return True
    def _reg(self, cart, parte):
        with wave.open(SORGENTE) as w: src = w.readframes(w.getnframes())
        vel = float(os.environ.get("SIM_VELOCITA", "4"))     # piu' veloce del vero
        k, nella, pos = 1, 0, 0
        out = wave.open(f"{cart}/audio_{k:03d}.wav", "wb"); out.setnchannels(1); out.setsampwidth(2); out.setframerate(16000)
        import random
        while self.attiva:
            time.sleep(0.1 / vel)
            if self.inPausa: continue
            b = src[pos:pos + 3200]; pos = (pos + 3200) % len(src)
            if len(b) < 3200: b = b + src[:3200 - len(b)]
            out.writeframes(b); self.campioni += 1600; nella += 1600; self.livello = random.random() * .5
            if nella >= parte * 16000:
                out.close(); self.partiChiuse = k; k += 1; nella = 0
                out = wave.open(f"{cart}/audio_{k:03d}.wav", "wb"); out.setnchannels(1); out.setsampwidth(2); out.setframerate(16000)
        out.close()
        if nella > 0: self.partiChiuse = k
        else: os.remove(f"{cart}/audio_{k:03d}.wav")
    def ferma(self, ctx):
        self.attiva = False; self.th.join(); return self.secondi()
class _Whisper:
    def __init__(self): self.p = 0
    def progresso(self): return self.p
    def trascriviFile(self, mod, wav, prima, sec, lingua, prompt, n, beam):
        print("WHISPER", Path(wav).name, Path(prima).name if prima else "-", lingua, repr(prompt), n, beam, flush=True)
        with wave.open(wav) as w: d = w.getnframes() / 16000
        davanti = min(sec, 6.0) if prima else 0.0
        for i in range(10): self.p = i * 10; time.sleep(0.15)
        righe = [f"PRIMA|{davanti:.6f}", "LANG|it"]
        t = 0.0
        while t < d + davanti:
            righe.append(f"{t:.2f}|{t + 4.5:.2f}| Il limite di seno di x su x vale uno, frase al secondo {int(t)}.")
            t += 5
        self.p = 100
        return "\n".join(righe)
class _W: INSTANCE = _Whisper()
_R = _Reg()
def jclass(n):
    if n.endswith("Ponte"): return _Ponte()
    if n.endswith("Registrazione"): return _R
    if n.endswith("Whisper"): return _W
    if n == "java.lang.String": return str
    raise KeyError(n)
