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


class _Salta(Exception):
    pass


def prova_finestra():
    """La finestra nuova: Edge WebView2 c'e', la pagina si carica e parla con Python."""
    import threading
    import time
    import webview
    from webview.platforms import winforms
    assert winforms.renderer == "edgechromium", f"la pagina userebbe {winforms.renderer}, non Edge WebView2"
    import registra_lezione as rl
    assert rl.finestra_nuova_possibile(), "finestra nuova non disponibile"
    esito = {}

    class Api:
        def pronto(self):
            esito["pronto"] = time.monotonic()
            return {"pronto": False}

    pagina = Path(__file__).resolve().parent / "interfaccia" / "index.html"
    w = webview.create_window("prova", url=str(pagina), js_api=Api(), width=900, height=600)

    def attendi():
        t0 = time.monotonic()
        while "pronto" not in esito and time.monotonic() - t0 < 90:
            time.sleep(0.3)
        try:
            esito["titolo"] = w.evaluate_js("document.title + ' / ' + document.querySelectorAll('section').length")
        except Exception as e:
            esito["titolo"] = f"errore: {e}"
        w.destroy()
    webview.start(lambda: threading.Thread(target=attendi, daemon=True).start())
    assert "pronto" in esito, "la pagina non ha chiamato Python entro 90 secondi"
    return f"finestra nuova (Edge WebView2): ok ({esito.get('titolo')})"


def main(radice):
    esito = Path(radice) / "prova_avvio.txt"
    righe = []
    try:
        if sys.platform == "win32":
            # come la finestra vera: COM in modalita' STA prima della libreria audio
            import ctypes
            ctypes.windll.ole32.CoInitializeEx(None, 0x2)
        import numpy as np
        from PIL import Image, ImageDraw
        import mss  # noqa: F401
        if sys.platform == "win32":
            # come nel programma vero: la libreria audio caricata da un thread a parte,
            # poi usata da altri thread (controllo, silenzio, registrazione)
            import threading
            import registratore as rg
            errori = []

            def usa_audio():
                try:
                    sc = rg.carica_soundcard()
                except Exception:
                    errori.append(traceback.format_exc())
                    return
                try:
                    sc.all_speakers()
                    sc.all_microphones(include_loopback=True)
                except Exception as e:
                    # sul server di GitHub puo' non esserci una scheda audio: va bene,
                    # basta che non sia l'errore di COM gia' inizializzato
                    if "0x100000001" in str(e) or "0x80010106" in str(e):
                        errori.append(traceback.format_exc())
            for _ in range(3):
                th = threading.Thread(target=usa_audio)
                th.start()
                th.join(30)
            assert not errori, "libreria audio: " + errori[0]
            righe.append("libreria audio nei thread: ok")
        import imageio_ffmpeg
        import fpdf  # noqa: F401
        import ctranslate2  # noqa: F401
        import av  # noqa: F401
        import onnxruntime  # noqa: F401
        import faster_whisper
        from faster_whisper.vad import get_vad_model  # noqa: F401
        righe.append("librerie: ok")
        if sys.platform == "win32":
            tipo, q = ctypes.c_int(-1), ctypes.c_int(0)
            ctypes.windll.ole32.CoGetApartmentType(ctypes.byref(tipo), ctypes.byref(q))
            assert tipo.value in (0, 3), f"COM non in STA dopo la libreria audio ({tipo.value})"
            righe.append("COM STA (scelta cartella): ok")
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
            # trascrizione vera, col modello piccolo "tiny" (lo scarica la prima volta)
            a16 = el.audio_16k(c / "audio_001.wav")
            assert abs(len(a16) / 16000 - 4) < 0.1, len(a16)
            try:
                from faster_whisper import WhisperModel
                if os.environ.get("RL_SENZA_INTERNET"):
                    raise _Salta()
                m = WhisperModel("tiny", device="cpu", compute_type="int8")
                segs, inf = m.transcribe(a16, language="it", vad_filter=True, beam_size=1)
                list(segs)
                segs, inf = m.transcribe(a16, language="it", vad_filter=False, beam_size=1)
                list(segs)
                assert abs(inf.duration - 4) < 0.1, inf.duration
                righe.append("trascrizione (modello tiny, con e senza VAD): ok")
            except _Salta:
                righe.append("trascrizione con il modello: saltata (senza internet)")
            pac = Path(t) / "pacchetti"
            el.elabora_finale(c, pac)
            info = json.loads((c / "info.json").read_text(encoding="utf-8"))
            assert info["stato"] == "pronta", info
            assert (c / "Lezione.html").exists() and (c / "audio.m4a").exists()
            zips = sorted(p.name for p in pac.glob("*.zip"))
            assert len(zips) == 2, zips
            righe.append("pacchetti: " + ", ".join(zips))
            import appunti as ap
            dati = {"titolo": "Prova", "di_cosa_si_parla": "x", "concetti": [{"titolo": "a", "spiegazione": "b", "dove": "slide 1"}],
                    "legenda": [{"simbolo": "lim x→0 sin(x)/x = 1, ∑ xᵢ", "significato": "prova"}],
                    "esempi_svolti": [{"titolo": "e", "passaggi": ["1", "2"]}],
                    "domande_esame": ["d"], "da_controllare": ["c"]}
            ap.pdf_appunti(dati, info, "parte 1", Path(t) / "appunti.pdf")
            assert (Path(t) / "appunti.pdf").stat().st_size > 1000
            k = ap.nascondi_chiave("sk-ant-prova")
            assert ap.leggi_chiave(k) == "sk-ant-prova" and k.startswith("dpapi:" if sys.platform == "win32" else "plain:")
            righe.append("appunti e chiave cifrata: ok")
        # eliminazione nel Cestino (usata da "🗑 Elimina")
        import registra_lezione as rl
        with tempfile.TemporaryDirectory() as t:
            cart = Path(t) / "lezione – prova àè"
            (cart / "slide").mkdir(parents=True)
            (cart / "slide" / "a.jpg").write_bytes(b"x")
            f = Path(t) / "Appunti – prova.pdf"
            f.write_bytes(b"x")
            rl.al_cestino([cart, f])
            assert not cart.exists() and not f.exists(), "elimina nel Cestino non riuscita"
        righe.append("elimina nel Cestino: ok")
        # calendario (librerie copiate in _vendor) e «importa da link» (yt-dlp, scaricato al primo uso)
        import calendario
        import datetime as _dt
        ics = (b"BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:p1\r\nDTSTART;TZID=Europe/Rome:20300107T100000\r\n"
               b"DTEND;TZID=Europe/Rome:20300107T120000\r\nRRULE:FREQ=WEEKLY\r\nSUMMARY:Analisi 1\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n")
        ev = calendario.impegni_ics(ics, "prova", _dt.datetime(2030, 1, 1).astimezone(), _dt.datetime(2030, 1, 20).astimezone())
        assert len(ev) == 2, f"calendario: {len(ev)} impegni invece di 2"
        righe.append("calendario (anche impegni che si ripetono): ok")
        try:
            import subprocess
            import scarica_link
            cmd = scarica_link.comando_ytdlp()
            v = subprocess.run(cmd + ["--version"], capture_output=True, timeout=120).stdout.decode().strip()
            assert v, "yt-dlp non risponde"
            righe.append(f"yt-dlp per «importa da link»: {v}")
        except OSError:
            righe.append("yt-dlp: saltato (senza internet)")
        # «Condividi»: Word, calendario ed email si creano senza librerie in piu'
        import condividi
        import zipfile as _zf
        doc = {"titolo": "Prova", "sottotitolo": "oggi", "formato": "verbale", "lingua": "it", "pdf": "", "breve": "x",
               "sezioni": [{"titolo": "In breve", "testo": "ok", "punti": ["a"], "numerati": True, "aggiunte": ["b"],
                            "tabella": {"teste": ["Cosa", "Chi", "Entro"], "righe": [["c", "d", "e"]]}}],
               "azioni": [{"cosa": "c", "chi": "d", "entro": "venerdì", "data": "2030-01-04"}], "prossima": None,
               "partecipanti": [], "data": _dt.datetime(2030, 1, 1), "tipo": "riunione"}
        f = condividi.crea_docx(doc, Path(radice) / "prova.docx")
        assert "word/document.xml" in _zf.ZipFile(f).namelist(), "condividi: Word"
        ics = condividi.crea_ics(condividi.eventi(doc), Path(radice) / "prova.ics").read_text(encoding="utf-8")
        assert "BEGIN:VEVENT" in ics, "condividi: calendario"
        condividi.crea_eml(doc, ["a@b.it"], "Prova", "testo", Path(radice) / "prova.eml", [Path(radice) / "prova.ics"])
        righe.append("condividi (Word, calendario, email): ok")
        # «Chi parla»: modello delle voci (scaricato al primo uso) e onnxruntime dentro il programma
        try:
            import numpy as _np
            import voci
            if not voci.modello_presente():
                voci.scarica_modello()
            t = _np.arange(16000 * 3) / 16000
            suono = (0.2 * _np.sin(2 * _np.pi * 180 * t) * (1 + _np.sin(2 * _np.pi * 3 * t))).astype(_np.float32)
            e = voci.impronta(suono)
            assert e is not None and len(e) == 256, "chi parla: impronta della voce non calcolata"
            righe.append("chi parla (impronta della voce): ok")
        except OSError:
            righe.append("chi parla: saltato (senza internet)")
        if sys.platform == "win32":
            righe.append(prova_finestra())
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
