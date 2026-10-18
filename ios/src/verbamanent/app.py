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
            sys.path.insert(0, str(QUI))                  # java.py (il ponte) e avvio_android.py
            cartella = _prepara_cartella()
            import avvio_android
            porta = avvio_android.avvia(str(cartella), _lingua())
            url = f"http://127.0.0.1:{porta}/index.html?android=1&iphone=1"
            self.loop.call_soon_threadsafe(self._mostra, url)
            self._prova_whisper()
        except Exception:
            err = traceback.format_exc()
            print(err, flush=True)
            try:
                (Path.home() / "Documents" / "errore_avvio.txt").write_text(err, encoding="utf-8")
            except OSError:
                pass
            self.loop.call_soon_threadsafe(lambda: setattr(self.attesa, "text", "Verba Manent IA\n\n⚠ " + err[-600:]))

    def _prova_whisper(self):
        """Solo per la prova automatica sull'iPhone simulato: se c'e' prova_whisper.wav lo trascrive."""
        casa = Path.home()
        wav, mod = casa / "prova_whisper.wav", casa / "ggml-small-q5_1.bin"
        if not (wav.exists() and mod.exists()):
            return
        import time
        import java
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

    def _mostra(self, url):
        self.web.url = url
        self.main_window.content = self.web


def main():
    return VerbaManent("Verba Manent IA", "it.puntowebferrara.verbamanent")
