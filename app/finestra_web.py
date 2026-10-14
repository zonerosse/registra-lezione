# -*- coding: utf-8 -*-
"""
Registra Lezione - la finestra nuova: pagine HTML (cartella "interfaccia") mostrate con
Edge WebView2 tramite pywebview. La pagina chiama i metodi di Api (window.pywebview.api).
"""
import logging
import sys
import threading
import time
from pathlib import Path

import webview

QUI = Path(__file__).resolve().parent
PAGINE = QUI / "interfaccia"
log = logging.getLogger("registra_lezione")


class Api:
    """Metodi che la pagina puo' chiamare. Gli attributi iniziano con _ cosi' pywebview non li espone."""

    def __init__(self):
        self._m = None              # il motore: si carica dopo che la finestra e' apparsa
        self._errore = None
        self._win = None
        self._mini = None
        self._esci = False

    # ------------------------------------------------------------------ avvio
    def _carica(self):
        try:
            import motore
            self._mt = motore
            self._m = motore.Motore()
            self._m.on_fine_registrazione = self._chiudi_mini
            self._m.on_riavvia = self._riavvia
        except Exception:
            import traceback
            self._errore = traceback.format_exc()
            log.error("avvio motore: %s", self._errore)

    def pronto(self):
        if self._errore:
            return {"pronto": False, "errore": self._errore.strip().splitlines()[-1]}
        return {"pronto": self._m is not None}

    # ------------------------------------------------------------------ stato
    def stato(self):
        return self._m.stato()

    def riepilogo(self):
        return self._m.riepilogo()

    def miniature(self):
        return self._m.miniature()

    def lezioni(self):
        return self._m.lezioni()

    def letto(self, mid):
        self._m.letto(mid)

    # ------------------------------------------------------------------ impostazioni
    def imposta(self, campo, valore):
        return self._m.imposta(campo, valore)

    def prova_chiave(self, chiave):
        return self._m.prova_chiave(chiave)

    def togli_chiave(self):
        return self._m.togli_chiave()

    def scegli_cartella(self):
        attuale = self._m.cfg["cartella_pacchetti"]
        try:
            scelta = self._win.create_file_dialog(webview.FileDialog.FOLDER,
                                                  directory=attuale if Path(attuale).exists() else str(Path.home()))
        except Exception:
            log.exception("scegli cartella")
            return {"ok": False}
        if not scelta:
            return {"ok": False}
        c = scelta[0] if isinstance(scelta, (list, tuple)) else scelta
        self._m.imposta("cartella_pacchetti", c)
        return {"ok": True, "cartella": self._m.cfg["cartella_pacchetti"]}

    def controlli(self):
        return self._m.controlli()

    # ------------------------------------------------------------------ registrazione
    def verifica_inizio(self):
        return self._m.verifica_inizio()

    def apri_non_disturbare(self):
        self._mt.apri_non_disturbare()

    def avvia(self, nome):
        r = self._m.avvia(nome)
        if r.get("ok") and r.get("mini"):
            threading.Thread(target=self._apri_mini, daemon=True).start()
        return r

    def pausa(self):
        return self._m.pausa()

    def fine(self):
        r = self._m.fine()
        self.apri_finestra()
        return r

    def nuova(self):
        return self._m.nuova()

    def riprova_appunti(self, k):
        return self._m.riprova_appunti(k)

    def _apri_mini(self):
        try:
            time.sleep(0.4)
            sw, sh = 1920, 1080
            try:
                s = webview.screens[0]
                sw, sh = s.width, s.height
            except Exception:
                pass
            w, h = 300, 252
            self._mini = webview.create_window(
                "Registra Lezione – in registrazione", url=str(PAGINE / "mini.html"), js_api=self,
                width=w, height=h, x=max(0, sw - w - 24), y=max(0, sh - h - 90), resizable=False,
                frameless=True, easy_drag=False, on_top=True, background_color="#0d4275", focus=False)
            time.sleep(0.6)
            self._win.minimize()
        except Exception:
            log.exception("mini finestra")

    def _chiudi_mini(self):
        m, self._mini = self._mini, None
        if m is not None:
            try:
                m.destroy()
            except Exception:
                log.exception("chiusura mini finestra")

    def apri_finestra(self):
        try:
            self._win.restore()
            self._win.show()
            self._win.on_top = True
            self._win.on_top = False
        except Exception:
            log.exception("apri finestra")

    # ------------------------------------------------------------------ lezioni gia' registrate
    def appunti_mancanti(self, cartella):
        return self._m.appunti_mancanti(cartella)

    def stima_appunti(self, cartella):
        return self._m.stima_appunti(cartella)

    def rifai_appunti(self, cartella):
        return self._m.rifai_appunti(cartella)

    def completa(self, cartella):
        return self._m.completa(cartella)

    def appunti_di(self, cartella=None):
        return self._m.appunti_di(cartella)

    def apri_lezione(self, cartella=None):
        return self._m.apri_lezione(cartella)

    def rinomina(self, cartella, nuovo):
        return self._m.rinomina(cartella, nuovo)

    def elimina(self, cartella, anche):
        return self._m.elimina(cartella, bool(anche))

    def elimina_video(self, cartelle):
        return self._m.elimina_video(cartelle)

    # ------------------------------------------------------------------ file e siti
    def apri(self, percorso):
        return self._mt.apri(percorso)

    def mostra_file(self, percorso):
        return self._mt.mostra_file(percorso)

    def apri_pacchetti(self):
        p = Path(self._m.cfg["cartella_pacchetti"])
        p.mkdir(parents=True, exist_ok=True)
        return self._mt.apri(p)

    def apri_base(self):
        return self._mt.apri(self._mt.BASE)

    def assistenza(self):
        import webbrowser
        webbrowser.open(self._mt.SITO_ASSISTENZA)

    # ------------------------------------------------------------------ Aggiorna
    def cerca_aggiornamenti(self):
        self._m.cerca_aggiornamenti()

    def installa_aggiornamento(self):
        self._m.installa_aggiornamento()

    def chiudi_agg(self):
        self._m.chiudi_agg()

    def _riavvia(self):
        self._esci = True
        self._chiudi_mini()
        try:
            self._win.destroy()
        except Exception:
            pass

    # ------------------------------------------------------------------ chiusura
    def esci(self):
        """Chiusura confermata dalla pagina (lavoro in corso: si finirà con Completa)."""
        self._esci = True
        threading.Thread(target=self._win.destroy, daemon=True).start()

    def _chiusura(self):
        if self._esci or self._m is None:
            return True
        c = self._m.si_puo_chiudere()
        if c == "si":
            return True
        # la domanda la fa la pagina; evaluate_js va chiamato fuori dal thread della finestra
        threading.Thread(target=lambda: self._win.evaluate_js(f"chiusura('{c}')"), daemon=True).start()
        return False

    def _chiusa(self):
        self._chiudi_mini()
        if self._m is not None:
            self._m.chiusura()


def main(prova=False):
    api = Api()
    win = webview.create_window(
        "Registra Lezione", url=str(PAGINE / "index.html"), js_api=api,
        width=1060, height=730, min_size=(860, 600), background_color="#061e36", text_select=True)
    api._win = win
    win.events.closing += api._chiusura
    win.events.closed += api._chiusa
    webview.start(api._carica, private_mode=False,
                  storage_path=str(Path.home() / "AppData" / "Local" / "RegistraLezione" / "webview")
                  if sys.platform == "win32" else None)
