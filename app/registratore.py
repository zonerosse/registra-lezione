# -*- coding: utf-8 -*-
"""
Registra Lezione - parte che REGISTRA.

Tre lavori in parallelo, tutti sullo stesso orologio:
  - audio del PC (quello che si sente dalle casse/cuffie) -> audio_001.wav, audio_002.wav (un file per ora)
  - schermo principale, 4 immagini al secondo            -> video_tmp.mkv
  - ogni 2 secondi controlla se la slide e' cambiata      -> slide/slide_001.jpg ...
Gli orari di tutto finiscono in meta.json, cosi' dopo testo e slide si possono abbinare.
"""
import ctypes
import json
import logging
import os
import subprocess
import sys
import threading
import time
import wave
from pathlib import Path

import numpy as np
from PIL import Image

log = logging.getLogger("registra_lezione")

FPS = 4                    # immagini al secondo nel video
CONTROLLO_SLIDE = 2.0      # ogni quanti secondi guardo se la slide e' cambiata
NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0


def co_init():
    """Ogni thread che usa l'audio di Windows deve inizializzare COM."""
    if sys.platform == "win32":
        try:
            ctypes.windll.ole32.CoInitializeEx(None, 0)
        except Exception:
            pass


class RilevatoreSlide:
    """Decide quando lo schermo mostra una slide nuova.

    Lo schermo viene diviso in una griglia di 32 x 18 quadretti. Conta solo un
    quadretto che e':
      - diverso dall'ultima slide salvata, e
      - fermo (uguale ai due controlli precedenti, cioe' da 4 secondi).
    Cosi' il riquadro con la faccia del docente, che si muove sempre, non conta,
    e non salvo immagini a meta' di un'animazione. Se abbastanza quadretti sono
    "diversi e fermi" (e sono passati almeno 10 secondi) e' una slide nuova.
    """
    COLONNE, RIGHE, LATO = 32, 18, 10   # immagine ridotta a 320 x 180
    SOGLIA_QUADRETTO = 8                # differenza media (0-255) per dire "cambiato"
    MINIMO_QUADRETTI = 17               # circa il 3% dello schermo
    MINIMO_SECONDI = 10

    def __init__(self):
        self.ultima_salvata = None
        self.precedenti = []          # ultimi due controlli
        self.t_ultima = -1e9

    def riduci(self, img):
        dim = (self.COLONNE * self.LATO, self.RIGHE * self.LATO)
        return np.asarray(img.convert("L").resize(dim, Image.BILINEAR), dtype=np.int16)

    def cambiati(self, a, b):
        d = np.abs(a - b).reshape(self.RIGHE, self.LATO, self.COLONNE, self.LATO).mean(axis=(1, 3))
        return d > self.SOGLIA_QUADRETTO

    def nuova(self, img, t):
        """True se img (PIL) va salvata come slide nuova al tempo t."""
        p = self.riduci(img)
        prima = self.precedenti
        self.precedenti = (prima + [p])[-2:]
        if self.ultima_salvata is None:
            self.ultima_salvata, self.t_ultima = p, t
            return True
        if len(prima) < 2 or t - self.t_ultima < self.MINIMO_SECONDI:
            return False
        fermi = ~(self.cambiati(p, prima[0]) | self.cambiati(p, prima[1]))
        n = int((self.cambiati(p, self.ultima_salvata) & fermi).sum())
        if n >= self.MINIMO_QUADRETTI:
            self.ultima_salvata, self.t_ultima = p, t
            return True
        return False


class Registratore:
    def __init__(self, cartella, nome):
        self.cartella = Path(cartella)
        self.nome = nome
        self.stop_ev = threading.Event()
        self.livello = 0.0          # volume attuale (0..1) per l'indicatore
        self.n_slide = 0
        self.slides = []
        self.audio_t0 = None
        self.video_t0 = None
        self.errori = []
        self._lock = threading.Lock()
        self._threads = []
        self.parte = 0              # ultima parte audio completata/chiusa
        self.on_parte = None        # funzione chiamata quando un'ora e' completa

    # ---------------------------------------------------------------- avvio / fine

    def avvia(self):
        (self.cartella / "slide").mkdir(parents=True, exist_ok=True)
        self.t0 = time.monotonic()
        self.inizio = time.strftime("%Y-%m-%dT%H:%M:%S")
        self._salva_meta()
        for f in (self._silenzio, self._audio, self._schermo):
            th = threading.Thread(target=f, daemon=True)
            th.start()
            self._threads.append(th)

    def secondi(self):
        return time.monotonic() - self.t0

    def ferma(self):
        self.durata = self.secondi()
        self.stop_ev.set()
        for th in self._threads:
            th.join(timeout=90)
        self._salva_meta()
        return self.durata

    def _salva_meta(self):
        with self._lock:
            dati = {"nome": self.nome, "inizio": self.inizio,
                    "audio_t0": self.audio_t0 or 0.0, "video_t0": self.video_t0 or 0.0,
                    "durata": getattr(self, "durata", None), "slides": list(self.slides),
                    "errori": self.errori}
        p = self.cartella / "meta.json"
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps(dati, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(tmp, p)

    # ---------------------------------------------------------------- audio

    def _silenzio(self):
        """Suona 'silenzio' sulle casse: tiene sveglia la scheda audio, cosi'
        la registrazione scorre regolare anche quando nessuno parla."""
        co_init()
        try:
            import soundcard as sc
            spk = sc.default_speaker()
            zeri = np.zeros((4800, 1), dtype=np.float32)
            with spk.player(samplerate=48000, channels=1) as pl:
                while not self.stop_ev.is_set():
                    pl.play(zeri)
        except Exception:
            log.exception("silenzio")

    def _apri_wav(self, k, rate):
        w = wave.open(str(self.cartella / f"audio_{k:03d}.wav"), "wb")
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        return w

    def _audio(self):
        """Registra l'audio del PC a pezzi da un'ora (audio_001.wav, audio_002.wav, ...).
        Quando un pezzo e' completo chiama on_parte(k): quella parte si puo' gia' trascrivere."""
        co_init()
        w = None
        try:
            import warnings
            import soundcard as sc
            from elaborazione import PARTE_SECONDI
            warnings.filterwarnings("ignore", category=sc.SoundcardRuntimeWarning)
            spk = sc.default_speaker()
            mic = sc.get_microphone(spk.id, include_loopback=True)
            rate = 48000
            blocco = rate // 10
            per_parte = rate * PARTE_SECONDI
            with mic.recorder(samplerate=rate) as rec:
                k, scritti = 1, 0
                w = self._apri_wav(k, rate)
                self.audio_t0 = self.secondi()
                log.info("audio partito a %.3f s (dispositivo: %s)", self.audio_t0, spk.name)
                while not self.stop_ev.is_set():
                    d = rec.record(numframes=blocco)
                    mono = d.mean(axis=1) if d.ndim == 2 else d
                    self.livello = min(1.0, float(np.sqrt(np.mean(mono ** 2))) * 6)
                    w.writeframes((np.clip(mono, -1, 1) * 32767).astype("<i2").tobytes())
                    scritti += len(mono)
                    if scritti >= per_parte:
                        w.close()
                        w = None
                        self.parte = k
                        self._avvisa_parte(k)
                        k, scritti = k + 1, 0
                        w = self._apri_wav(k, rate)
                w.close()
                w = None
                if scritti > 0:
                    self.parte = k
                else:
                    try:
                        (self.cartella / f"audio_{k:03d}.wav").unlink()
                    except OSError:
                        pass
        except Exception:
            log.exception("audio")
            self.errori.append("audio")
        finally:
            if w is not None:
                try:
                    w.close()
                except Exception:
                    pass

    def _avvisa_parte(self, k):
        try:
            if self.on_parte:
                self.on_parte(k)
        except Exception:
            log.exception("avviso parte")

    # ---------------------------------------------------------------- schermo

    def _avvia_ffmpeg(self, W, H):
        try:
            import imageio_ffmpeg
            ff = imageio_ffmpeg.get_ffmpeg_exe()
            cmd = [ff, "-y", "-loglevel", "error",
                   "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-framerate", str(FPS),
                   "-i", "-",
                   "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
                   "-pix_fmt", "yuv420p", "-g", str(FPS * 10),
                   str(self.cartella / "video_tmp.mkv")]
            self._fflog = open(self.cartella / "ffmpeg.log", "wb")
            return subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                                    stderr=self._fflog, creationflags=NO_WINDOW)
        except Exception:
            log.exception("ffmpeg")
            self.errori.append("video")
            return None

    def _salva_slide(self, img, t):
        self.n_slide += 1
        nome = f"slide_{self.n_slide:03d}.jpg"
        im = img.convert("RGB")
        if im.width > 1600:
            im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
        im.save(self.cartella / "slide" / nome, "JPEG", quality=80)
        with self._lock:
            self.slides.append({"file": nome, "t": round(t, 2)})
        self._salva_meta()

    def _schermo(self):
        try:
            import mss
            ril = RilevatoreSlide()
            with mss.mss() as sct:
                mon = sct.monitors[1]                  # schermo principale
                W, H = mon["width"] - mon["width"] % 2, mon["height"] - mon["height"] % 2
                proc = self._avvia_ffmpeg(W, H)
                fotogrammi = 0
                ultimo_controllo = -1e9
                while not self.stop_ev.is_set():
                    shot = sct.grab(mon)
                    adesso = self.secondi()
                    if self.video_t0 is None:
                        self.video_t0 = adesso
                    img = None
                    raw = shot.bgra
                    if (shot.width, shot.height) != (W, H):
                        img = Image.frombytes("RGB", shot.size, raw, "raw", "BGRX")
                        img = img.resize((W, H)) if abs(shot.width - W) > 1 or abs(shot.height - H) > 1 \
                            else img.crop((0, 0, W, H))
                        raw = img.convert("RGBA").tobytes("raw", "BGRA")

                    # video: scrivo quanti fotogrammi servono per restare in orario
                    if proc is not None:
                        dovuti = int((adesso - self.video_t0) * FPS) + 1
                        try:
                            for _ in range(max(1, dovuti - fotogrammi)):
                                proc.stdin.write(raw)
                            fotogrammi = max(dovuti, fotogrammi + 1)
                        except (BrokenPipeError, OSError):
                            log.exception("video interrotto")
                            self.errori.append("video")
                            proc = None

                    # slide
                    if adesso - ultimo_controllo >= CONTROLLO_SLIDE:
                        ultimo_controllo = adesso
                        if img is None:
                            img = Image.frombytes("RGB", shot.size, raw, "raw", "BGRX")
                        if ril.nuova(img, adesso):
                            self._salva_slide(img, adesso)

                    prossimo = self.video_t0 + fotogrammi / FPS
                    attesa = prossimo - self.secondi()
                    if attesa > 0:
                        self.stop_ev.wait(attesa)

                if proc is not None:
                    try:
                        proc.stdin.close()
                        proc.wait(timeout=120)
                    except Exception:
                        proc.kill()
        except Exception:
            log.exception("schermo")
            self.errori.append("schermo")
        finally:
            try:
                self._fflog.close()
            except Exception:
                pass


def tieni_sveglio(si):
    """Impedisce al PC di andare in sospensione durante registrazione ed elaborazione."""
    if sys.platform != "win32":
        return
    ES_CONTINUOUS, ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001
    try:
        ctypes.windll.kernel32.SetThreadExecutionState(
            ES_CONTINUOUS | (ES_SYSTEM_REQUIRED if si else 0))
    except Exception:
        pass


def controlla_audio():
    """True se trovo l'uscita audio del PC da registrare.
    Gira in un thread a parte: cosi' la finestra principale resta in modalita' STA."""
    esito = []

    def prova():
        esito.append(_controlla_audio())
    th = threading.Thread(target=prova, daemon=True)
    th.start()
    th.join(timeout=15)
    return bool(esito and esito[0])


def _controlla_audio():
    try:
        co_init()
        import soundcard as sc
        spk = sc.default_speaker()
        sc.get_microphone(spk.id, include_loopback=True)
        return True
    except Exception:
        log.exception("controllo audio")
        return False
