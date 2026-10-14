# -*- coding: utf-8 -*-
"""
Prova automatica dell'exe (la usa GitHub dopo averlo costruito):
  "Registra Lezione.exe" --prova
Controlla che dentro l'exe ci siano tutte le librerie e che la preparazione dei
file (slide + testo -> HTML, PDF, pacchetto zip, video) funzioni davvero.
Scrive il risultato in prova_avvio.txt accanto all'exe.
"""
import json
import os
import sys
import tempfile
import traceback
import wave
from pathlib import Path


def main(radice):
    esito = Path(radice) / "prova_avvio.txt"
    righe = []
    try:
        import numpy as np
        from PIL import Image, ImageDraw
        import mss  # noqa: F401
        if sys.platform == "win32":
            import soundcard  # noqa: F401
        import imageio_ffmpeg
        import fpdf  # noqa: F401
        import ctranslate2  # noqa: F401
        import av  # noqa: F401
        import onnxruntime  # noqa: F401
        import faster_whisper
        from faster_whisper.vad import get_vad_model  # noqa: F401
        righe.append("librerie: ok")
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        assert Path(ff).exists(), "ffmpeg mancante"
        righe.append(f"ffmpeg: {ff}")
        assets = Path(faster_whisper.__file__).parent / "assets"
        assert any(assets.glob("*.onnx")), "modello VAD mancante"
        righe.append("vad: ok")

        os.environ.setdefault("RL_PARTE_SECONDI", "4")
        import importlib
        import elaborazione as el
        importlib.reload(el)
        with tempfile.TemporaryDirectory() as t:
            c = Path(t) / "lezione"
            (c / "slide").mkdir(parents=True)
            slides = []
            for i in range(3):
                im = Image.new("RGB", (640, 360), (255, 255, 255))
                ImageDraw.Draw(im).text((40, 40), f"Slide {i + 1} è già così", fill=(0, 0, 0))
                im.save(c / "slide" / f"slide_{i + 1:03d}.jpg", "JPEG")
                slides.append({"file": f"slide_{i + 1:03d}.jpg", "t": i * 3.0})
            rate = 16000
            for k in (1, 2):
                n = rate * (4 if k == 1 else 3)
                a = (0.1 * np.sin(2 * np.pi * 440 * np.arange(n) / rate) * 32767).astype("<i2")
                with wave.open(str(c / f"audio_{k:03d}.wav"), "wb") as w:
                    w.setnchannels(1)
                    w.setsampwidth(2)
                    w.setframerate(rate)
                    w.writeframes(a.tobytes())
                el.scrivi_json(c / f"trascrizione_{k:03d}.json",
                               [{"inizio": (k - 1) * 4 + 0.5, "fine": (k - 1) * 4 + 2.5,
                                 "testo": f"Frase della parte {k}, con accenti: è perché."}])
            el.scrivi_json(c / "meta.json", {"nome": "Prova", "audio_t0": 0, "video_t0": 0, "slides": slides})
            el.scrivi_json(c / "info.json", {"nome": "Prova – àèìòù", "inizio": "2026-10-14T09:00:00",
                                             "durata": 7, "stato": "registrazione", "pacchetti": {}})
            pac = Path(t) / "pacchetti"
            el.elabora_finale(c, pac)
            info = json.loads((c / "info.json").read_text(encoding="utf-8"))
            assert info["stato"] == "pronta", info
            assert (c / "Lezione.html").exists() and (c / "audio.m4a").exists()
            zips = sorted(p.name for p in pac.glob("*.zip"))
            assert len(zips) == 2, zips
            righe.append("pacchetti: " + ", ".join(zips))
        righe.append("TUTTO A POSTO")
        esito.write_text("\n".join(righe), encoding="utf-8")
        return 0
    except Exception:
        righe.append("ERRORE")
        righe.append(traceback.format_exc())
        esito.write_text("\n".join(righe), encoding="utf-8")
        return 1


if __name__ == "__main__":
    sys.exit(main(Path(__file__).resolve().parent.parent))
