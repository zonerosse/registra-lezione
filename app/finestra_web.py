# -*- coding: utf-8 -*-
"""
Registra Lezione - la finestra nuova: pagine HTML (cartella "interfaccia") mostrate con
Edge WebView2 tramite pywebview. La pagina chiama i metodi di Api (window.pywebview.api).
"""
import logging
import os
import shutil
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
        threading.Thread(target=self._sentinella, daemon=True).start()
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
        self._battito = time.monotonic()
        return self._m.stato()

    def _sentinella(self):
        """Se la pagina smette di chiedere lo stato (finestra bloccata), scrive nel log dove sono
        fermi i thread: serve a capire il problema."""
        import faulthandler
        ultimo = 0.0
        while not self._esci:
            time.sleep(5)
            b = getattr(self, "_battito", None)
            if b is None or self._m is None:
                continue
            fermo = time.monotonic() - b
            if fermo > 30 and time.monotonic() - ultimo > 300:
                ultimo = time.monotonic()
                try:
                    f = self._mt.BASE / "blocco.txt"
                    with open(f, "a", encoding="utf-8") as out:
                        out.write(f"\n===== {time.strftime('%Y-%m-%d %H:%M:%S')}: pagina ferma da {fermo:.0f} s\n")
                        out.flush()
                        faulthandler.dump_traceback(file=out, all_threads=True)
                    log.warning("pagina ferma da %.0f s: dettagli in blocco.txt", fermo)
                except Exception:
                    log.exception("sentinella")

    def riepilogo(self):
        return self._m.riepilogo()

    def miniature(self):
        return self._m.miniature()

    def lezioni(self):
        return self._m.lezioni()

    def ripasso(self, cartelle, modo="prima"):
        return self._m.ripasso(cartelle, modo)

    def ripasso_voto(self, cartella, cid, sapevo):
        return self._m.ripasso_voto(cartella, cid, sapevo)

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

    def avvia(self, nome, opzioni=None):
        r = self._m.avvia(nome, opzioni)
        if r.get("ok") and r.get("mini"):
            threading.Thread(target=self._apri_mini, daemon=True).start()
        return r

    def pausa(self):
        return self._m.pausa()

    # ---- in aula, parole difficili, chiedi, mappa, slide del docente
    def microfoni(self):
        return self._m.microfoni()

    def livello_microfono(self, mid=None):
        return self._m.livello_microfono(mid)

    def parole(self, materia=None):
        return self._m.parole(materia)

    def salva_parole(self, materia, lista):
        return self._m.salva_parole(materia, lista)

    def chiedi(self, cartelle, storia, testo):
        return self._m.chiedi(cartelle, storia, testo)

    def chiedi_storia(self, cartella):
        return self._m.chiedi_storia(cartella)

    def chiedi_cancella(self, cartella):
        return self._m.chiedi_cancella(cartella)

    def momento(self, cartella, sec=0, slide=None):
        return self._m.momento(cartella, sec, slide)

    def video_url(self, cartella):
        return self._m.video_url(cartella)

    def mappa(self, cartella, rifai=False):
        return self._m.mappa(cartella, rifai)

    def mappa_pdf(self, cartella, apri_dopo=True):
        return self._m.mappa_pdf(cartella, apri_dopo)

    def capitoli(self, cartella):
        return self._m.capitoli(cartella)

    def infografica(self, cartella, rifai=False):
        return self._m.infografica(cartella, rifai)

    def infografica_pdf(self, cartella, apri_dopo=True):
        return self._m.infografica_pdf(cartella, apri_dopo)

    def prova_mio(self, mio):
        return self._m.prova_mio(mio)

    def stima_docente(self, cartella):
        return self._m.stima_docente(cartella)

    def aggiungi_docente(self, cartella, pdf):
        return self._m.aggiungi_docente(cartella, pdf)

    def scegli_pdf(self):
        """Finestra di Windows per scegliere il PDF delle slide del docente."""
        try:
            scelta = self._win.create_file_dialog(webview.FileDialog.OPEN, file_types=("PDF (*.pdf)",),
                                                  directory=str(Path.home() / "Downloads"))
        except Exception:
            log.exception("scegli pdf")
            return {"ok": False}
        if not scelta:
            return {"ok": False}
        f = scelta[0] if isinstance(scelta, (list, tuple)) else scelta
        r = self._m.info_pdf(f)
        from testi import tr
        return {**r, "percorso": f} if r.get("ok") else {"ok": False, "msg": tr("dc_err")}

    def scegli_video(self):
        """Finestra di Windows per scegliere il video (o l'audio) da importare."""
        tipi = ("Video e audio (*.mp4;*.mov;*.mkv;*.webm;*.avi;*.m4v;*.3gp;*.wmv;*.mp3;*.m4a;*.wav;*.aac;*.ogg;*.opus;*.flac)",
                "Tutti i file (*.*)")
        try:
            scelta = self._win.create_file_dialog(webview.FileDialog.OPEN, file_types=tipi,
                                                  directory=str(Path.home() / "Videos"))
        except Exception:
            log.exception("scegli video")
            return {"ok": False}
        if not scelta:
            return {"ok": False}
        f = scelta[0] if isinstance(scelta, (list, tuple)) else scelta
        try:
            return {"ok": True, **self._m.info_video(f)}
        except Exception:
            log.exception("info video")
            return {"ok": False, "msg": "?"}

    def info_video(self, percorso):
        return self._m.info_video(percorso)

    def importa(self, percorso, nome, lingua, cerca_slide):
        return self._m.importa(percorso, nome, lingua, cerca_slide)

    def fine(self):
        log.info("fine: richiesta dalla pagina")
        r = self._m.fine()                     # chiude la mini finestra (fra poco, in un altro thread)
        threading.Thread(target=self._dopo_fine, daemon=True).start()
        log.info("fine: risposta alla pagina")
        return r

    def _dopo_fine(self):
        time.sleep(0.5)                        # prima la pagina riceve la risposta, poi si toccano le finestre
        self.apri_finestra()

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
            # lo schermo e' in pixel veri, la posizione della finestra in pixel "logici":
            # con lo zoom di Windows al 125-150% senza questa divisione la finestra finiva fuori schermo
            scala = 1.0
            if sys.platform == "win32":
                try:
                    import ctypes
                    scala = max(1.0, ctypes.windll.shcore.GetScaleFactorForDevice(0) / 100)
                except Exception:
                    pass
            w, h = 300, 252
            x = max(0, int(sw / scala - w - 30))
            y = max(0, int(sh / scala - h - 80))
            log.info("mini finestra: schermo %sx%s, scala %.2f, posizione %s,%s", sw, sh, scala, x, y)
            self._mini = webview.create_window(
                "Verba Manent IA – in registrazione", url=str(PAGINE / "mini.html"), js_api=self,
                width=w, height=h, x=x, y=y, resizable=False,
                frameless=True, easy_drag=False, on_top=True, background_color="#0d4275")
            ok = self._mini.events.shown.wait(10)
            log.info("mini finestra mostrata: %s", ok)
            if ok and sys.platform == "win32":
                # la mini finestra non deve finire nel video ne' nelle slide catturate
                try:
                    import ctypes
                    hwnd = int(self._mini.native.Handle.ToInt64())
                    r = ctypes.windll.user32.SetWindowDisplayAffinity(hwnd, 0x11)   # WDA_EXCLUDEFROMCAPTURE
                    log.info("mini finestra esclusa dalla registrazione: %s", bool(r))
                except Exception:
                    log.exception("esclusione mini finestra dalla registrazione")
            time.sleep(0.5)
            if ok:
                self._win.minimize()
        except Exception:
            log.exception("mini finestra")

    def _chiudi_mini(self, subito=False):
        m, self._mini = self._mini, None
        if m is None:
            return

        def chiudi():
            if not subito:
                time.sleep(0.5)             # la mini finestra riceve prima la risposta alla sua chiamata
            try:
                m.destroy()
                log.info("mini finestra chiusa")
            except Exception:
                log.exception("chiusura mini finestra")
        if subito:
            chiudi()
        else:
            threading.Thread(target=chiudi, daemon=True).start()

    def apri_finestra(self):
        try:
            self._win.restore()
            self._win.show()
        except Exception:
            log.exception("apri finestra")

    # ------------------------------------------------------------------ lezioni gia' registrate
    def appunti_mancanti(self, cartella, formato=None):
        return self._m.appunti_mancanti(cartella, formato)

    def stima_appunti(self, cartella):
        return self._m.stima_appunti(cartella)

    def rifai_appunti(self, cartella, formati=None):
        return self._m.rifai_appunti(cartella, formati)

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
        self._chiudi_mini(subito=True)
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
        self._chiudi_mini(subito=True)
        if self._m is not None:
            self._m.chiusura()


def main(prova=False):
    api = Api()
    win = webview.create_window(
        "Verba Manent IA", url=str(PAGINE / "index.html"), js_api=api,
        width=1060, height=730, min_size=(860, 600), background_color="#061e36", text_select=True)
    api._win = win
    win.events.closing += api._chiusura
    win.events.closed += api._chiusa
    # Le versioni 3.0-3.3 tenevano la memoria di Edge (cache) in questa cartella: Edge continuava a
    # mostrare le pagine VECCHIE anche dopo Aggiorna. La tolgo e uso una memoria nuova a ogni avvio.
    vecchia_cache = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local") / "RegistraLezione" / "webview"
    shutil.rmtree(vecchia_cache, ignore_errors=True)
    webview.start(api._carica, private_mode=True)
