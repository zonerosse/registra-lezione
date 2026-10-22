# -*- coding: utf-8 -*-
"""
Verba Manent IA per iPhone.
Come su Android: le pagine sono quelle del programma, mostrate in una WebView; il motore (Python) e' lo stesso
e apre un piccolo server solo sul telefono (127.0.0.1). Le funzioni del telefono stanno in java.py
(lo stesso «ponte» che su Android e' scritto in Kotlin), cosi' android_motore.py si usa senza cambiarlo.
"""
import os
import shutil
import sys
import threading
import traceback
from pathlib import Path

import toga
from toga.style import Pack

QUI = Path(__file__).resolve().parent


def _lingua():
    try:
        from rubicon.objc import ObjCClass
        return str(ObjCClass("NSLocale").preferredLanguages.objectAtIndex(0))[:2]
    except Exception:
        return "it"


def _prepara_cartella():
    """Le pagine e il motore vanno copiati in una cartella scrivibile (solo se e' una versione nuova)."""
    dati = Path.home() / "Library" / "Application Support" / "VerbaManent"
    dest = dati / "rl"
    segno = dest / ".versione"
    v = (QUI / "rl" / "versione_android.json").read_text(encoding="utf-8") + str((QUI / "rl").stat().st_mtime)
    if not (segno.exists() and segno.read_text(encoding="utf-8") == v):
        shutil.rmtree(dest, ignore_errors=True)
        shutil.copytree(QUI / "rl", dest)
        segno.write_text(v, encoding="utf-8")
    return dest


class VerbaManent(toga.App):
    def startup(self):
        self.web = toga.WebView(style=Pack(flex=1))
        self.attesa = toga.Label("Verba Manent IA\n\nAvvio…", style=Pack(flex=1, text_align="center"))
        self.main_window = toga.MainWindow(title=self.formal_name)
        self.main_window.content = self.attesa
        self.main_window.show()
        threading.Thread(target=self._avvia, daemon=True).start()

    def _avvia(self):
        try:
            os.environ["VM_IPHONE"] = "1"                 # niente aggiornamenti scaricati dall'app: li da' l'App Store
            # su iPhone Python non vede i certificati di sistema: senza questo ogni collegamento https (Google, Claude,
            # Drive) fallisce con CERTIFICATE_VERIFY_FAILED. Si usano quelli di certifi.
            try:
                import certifi
                os.environ["SSL_CERT_FILE"] = certifi.where()
                os.environ.setdefault("SSL_CERT_DIR", str(Path(certifi.where()).parent))
            except Exception:
                traceback.print_exc()
            sys.path.insert(0, str(QUI))                  # java.py (il ponte) e avvio_android.py
            cartella = _prepara_cartella()
            import avvio_android
            porta = avvio_android.avvia(str(cartella), _lingua())
            url = f"http://127.0.0.1:{porta}/index.html?android=1&iphone=1"
            self.loop.call_soon_threadsafe(self._mostra, url)
            self._prova_comando()
            if (Path.home() / "prova_js_attiva").exists():
                threading.Thread(target=self._prova_js, daemon=True).start()
            self._prova_whisper()
        except Exception:
            err = traceback.format_exc()
            print(err, flush=True)
            try:
                (Path.home() / "Documents" / "errore_avvio.txt").write_text(err, encoding="utf-8")
            except OSError:
                pass
            self.loop.call_soon_threadsafe(lambda: setattr(self.attesa, "text", "Verba Manent IA\n\n⚠ " + err[-600:]))

    def _prova_js(self):
        """Solo per la prova automatica: tocca la pagina al posto della persona (prova_js.txt = codice JavaScript)."""
        import time
        f = Path.home() / "prova_js.txt"
        while True:
            time.sleep(0.5)
            if f.exists():
                try:
                    codice = f.read_text(encoding="utf-8")
                    f.unlink()
                    self.loop.call_soon_threadsafe(lambda c=codice: self.web.evaluate_javascript(c))
                except Exception:
                    pass

    def _prova_comando(self):
        """Solo per la prova automatica: prova_comando.json = ["funzione del ponte", argomenti...]."""
        f = Path.home() / "prova_comando.json"
        if not f.exists():
            return
        import json
        import logging
        import time
        import java
        h = logging.FileHandler(Path.home() / "prova_comando.log", encoding="utf-8")
        h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        logging.getLogger("registra_lezione").addHandler(h)
        logging.getLogger("registra_lezione").setLevel(logging.INFO)
        try:
            nome, *arg = json.loads(f.read_text(encoding="utf-8"))
            f.unlink()
            time.sleep(5)
            if nome == "eventi":
                for e in arg:
                    java._P.evento(*e)
                    time.sleep(0.4)
            else:
                getattr(java._P, nome)(*arg)
        except Exception:
            (Path.home() / "prova_comando_errore.txt").write_text(traceback.format_exc(), encoding="utf-8")

    def _prova_whisper(self):
        """Solo per la prova automatica sull'iPhone simulato: se c'e' prova_whisper.wav lo trascrive."""
        casa = Path.home()
        wav, mod = casa / "prova_whisper.wav", casa / "ggml-small-q5_1.bin"
        if not wav.exists():
            return
        import time
        import java
        self._prova_audio(casa, wav)
        if not mod.exists():
            return
        t0 = time.monotonic()
        try:
            r = java._W.INSTANCE.trascriviFile(str(mod), str(wav), "", 0.0, "en", "", 4, 1)
        except Exception:
            r = traceback.format_exc()
        try:
            info = java._W.INSTANCE._carica().vm_info().decode(errors="replace")
        except Exception:
            info = "?"
        (casa / "prova_whisper.txt").write_text(f"{time.monotonic() - t0:.1f} s\n{info}\n{r}", encoding="utf-8")

    def _prova_audio(self, casa, wav):
        """Prova automatica: unisci, taglia, decodifica, durata, PDF in immagini."""
        import java
        import wave
        P = java._P
        r = []
        def prova(nome, fn):
            try:
                r.append(f"{nome}: {fn()}")
            except Exception:
                r.append(f"{nome}: ERRORE {traceback.format_exc()}")
        m4a, tg, dec = casa / "prova.m4a", casa / "prova_taglio.m4a", casa / "prova_dec.wav"
        prova("unisci", lambda: (P.unisciAudio([str(wav), str(wav)], str(m4a)), m4a.stat().st_size if m4a.exists() else 0))
        def durata(p):
            m = java._MMR()
            m.setDataSource(str(p))
            return m.extractMetadata(9)
        prova("durata m4a (ms, attesi ~22000)", lambda: durata(m4a))
        prova("taglia 2-6 s", lambda: (P.tagliaAudio(str(m4a), str(tg), 2000, 6000), durata(tg)))
        def decod():
            ok = P.decodificaWav(str(m4a), str(dec), 1000, 5000)
            with wave.open(str(dec)) as w:
                return ok, w.getframerate(), w.getnchannels(), round(w.getnframes() / w.getframerate(), 2)
        prova("decodifica 1-6 s", decod)
        def chiave():
            segreto = "sk-prova-12345"
            c = P.cifra(segreto)
            return c, "uguale" if P.decifra(c) == segreto else "DIVERSA: " + repr(P.decifra(c)), \
                "assente" if segreto not in c else "VISIBILE"
        prova("portachiavi", chiave)
        pdf = casa / "prova.pdf"
        if pdf.exists():
            cart = casa / "prova_pdf"
            cart.mkdir(exist_ok=True)
            prova("pdf in png", lambda: (P.pdfInPng(str(pdf), str(cart), 800), sorted(x.name for x in cart.iterdir())))
        (casa / "prova_audio.txt").write_text("\n".join(r), encoding="utf-8")

    def _mostra(self, url):
        self.web.url = url
        self.main_window.content = self.web


def main():
    return VerbaManent("Verba Manent IA", "it.puntowebferrara.verbamanent")
