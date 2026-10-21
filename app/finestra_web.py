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


def _leggi_appunti():
    """Il testo copiato (Ctrl+C) in Windows, per «Incolla» del tasto destro."""
    if sys.platform != "win32":
        return ""
    import ctypes
    from ctypes import wintypes
    u32, k32 = ctypes.windll.user32, ctypes.windll.kernel32
    u32.GetClipboardData.restype = wintypes.HANDLE
    k32.GlobalLock.argtypes = [wintypes.HGLOBAL]
    k32.GlobalLock.restype = wintypes.LPVOID
    k32.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
    for _ in range(5):                      # un altro programma puo' tenere gli appunti un attimo
        if u32.OpenClipboard(None):
            break
        time.sleep(0.05)
    else:
        return ""
    try:
        h = u32.GetClipboardData(13)        # CF_UNICODETEXT
        if not h:
            return ""
        p = k32.GlobalLock(h)
        try:
            return ctypes.wstring_at(p) if p else ""
        finally:
            k32.GlobalUnlock(h)
    finally:
        u32.CloseClipboard()


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
            self._m.on_avviso = self.apri_finestra       # calendario: la finestra viene davanti
            self._m.on_avvio_auto = lambda: threading.Thread(target=self._apri_mini, daemon=True).start()
        except Exception:
            import traceback
            self._errore = traceback.format_exc()
            log.error("avvio motore: %s", self._errore)

    def pronto(self):
        if self._errore:
            return {"pronto": False, "errore": self._errore.strip().splitlines()[-1]}
        return {"pronto": self._m is not None, "edizione": __import__("edizione").EDIZIONE}

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

    def nota(self, testo, tipo=""):
        return self._m.nota(testo, tipo)

    def apri_mini(self):
        """«Tieni in miniatura»: durante la registrazione, la finestrella sempre davanti (e la grande si riduce)."""
        if getattr(self._m, "reg", None) is None or self._mini is not None:
            return {"ok": False}
        threading.Thread(target=self._apri_mini, daemon=True).start()
        return {"ok": True}

    def note(self, cartella=None):
        return self._m.note(cartella)

    def chiedi_diretta(self, domanda, storia=None):
        return self._m.chiedi_diretta(domanda, storia)

    def nota_togli(self, i):
        return self._m.nota_togli(i)

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

    def mappa_pdf(self, cartella, apri_dopo=True, mie=False):
        return self._m.mappa_pdf(cartella, apri_dopo, mie)

    def mappa_salva(self, cartella, dati):
        return self._m.mappa_salva(cartella, dati)

    def mappa_ia(self, cartella):
        return self._m.mappa_ia(cartella)

    def capitoli(self, cartella):
        return self._m.capitoli(cartella)

    def infografica(self, cartella, rifai=False):
        return self._m.infografica(cartella, rifai)

    def statistiche(self, cartella):
        return self._m.statistiche(cartella)

    def spezzone(self, cartella, da, a, solo_audio=False):
        return self._m.spezzone(cartella, da, a, solo_audio)

    def spezzone_email(self, file):
        return self._m.spezzone_email(file)

    def esame_info(self, materia, cartelle, rifai=False):
        return self._m.esame_info(materia, cartelle, rifai)

    def esame_data(self, materia, data):
        return self._m.esame_data(materia, data)

    def esame_simulazione(self, materia):
        return self._m.esame_simulazione(materia)

    def esame_correggi(self, materia, risposte):
        return self._m.esame_correggi(materia, risposte)

    def esame_calendario(self, materia, modo="outlook"):
        return self._m.esame_calendario(materia, modo)

    def esame_pdf(self, materia):
        return self._m.esame_pdf(materia)

    def test_nuovo(self, materia, cartelle, solo_sbagliate=False, n=10, difficolta="media", esame_vero=False):
        return self._m.test_nuovo(materia, cartelle, solo_sbagliate, n, difficolta, esame_vero)

    def cambia_materia(self, cartella, materia):
        return self._m.cambia_materia(cartella, materia)

    def ripasso_giorno(self, lampo=False, leggero=False):
        return self._m.ripasso_giorno(lampo, leggero)

    def ripasso_giorno_crocette(self, carte):
        return self._m.ripasso_giorno_crocette(carte)

    def ripasso_giorno_fatto(self):
        return self._m.ripasso_giorno_fatto()

    def rumore_info(self, cartella):
        return self._m.rumore_info(cartella)

    def rumore_imposta(self, cartella, si):
        return self._m.rumore_imposta(cartella, si)

    def ritrascrivi(self, cartella):
        return self._m.ritrascrivi(cartella)

    def ritrascrivi_avanzamento(self):
        return self._m.ritrascrivi_avanzamento()

    def scatta_foto(self):
        """Sul PC: una foto scelta dal disco (per esempio arrivata dal telefono), agganciata al minuto di adesso."""
        r = self.scegli_immagini()
        return self._m.foto_aggiungi(r["percorsi"][0]) if r.get("ok") else {"ok": False}

    def scatta_foglio(self):
        return self.scegli_immagini()

    def scegli_immagini(self):
        try:
            scelta = self._win.create_file_dialog(webview.FileDialog.OPEN, allow_multiple=True,
                                                  file_types=("Immagini (*.jpg;*.jpeg;*.png;*.heic;*.webp)", "Tutti i file (*.*)"),
                                                  directory=str(Path.home() / "Pictures"))
        except Exception:
            log.exception("scegli immagini")
            return {"ok": False, "percorsi": []}
        lista = [str(x) for x in (scelta or [])]
        return {"ok": bool(lista), "percorsi": lista}

    def foto_aggiungi(self, percorso):
        return self._m.foto_aggiungi(percorso)

    def foto_lezione(self, cartella):
        return self._m.foto_lezione(cartella)

    def foto_leggi(self, cartella, file):
        return self._m.foto_leggi(cartella, file)

    def scritti_lezione(self, cartella):
        return self._m.scritti_lezione(cartella)

    def scritti_aggiungi(self, cartella, percorsi):
        return self._m.scritti_aggiungi(cartella, percorsi)

    def scritti_correggi(self, cartella, file, testo):
        return self._m.scritti_correggi(cartella, file, testo)

    def scritti_togli(self, cartella, file):
        return self._m.scritti_togli(cartella, file)

    def libro_foto(self, materia, percorsi):
        return self._m.libro_foto(materia, percorsi)

    def libro_info(self, materia, cartelle):
        return self._m.libro_info(materia, cartelle)

    def libro_aggiungi(self, materia, percorso, sostituisci=False):
        return self._m.libro_aggiungi(materia, percorso, sostituisci)

    def libro_avanzamento(self):
        return self._m.libro_avanzamento()

    def libro_togli(self, materia, k):
        return self._m.libro_togli(materia, k)

    def libro_nascondi(self, materia):
        return self._m.libro_nascondi(materia)

    def libro_mancano(self, materia, cartelle, rifai=False):
        return self._m.libro_mancano(materia, cartelle, rifai)

    def libro_pagina(self, materia, k=None, n=None, et=None, q=""):
        return self._m.libro_pagina(materia, k, n, et, q)

    def libro_cerca(self, materia, testo):
        return self._m.libro_cerca(materia, testo)

    def libro_lezione(self, cartella):
        return self._m.libro_lezione(cartella)

    def apri_pdf_libro(self, materia, k):
        return self._m.apri_pdf_libro(materia, k)

    def tutor(self, materia, cartelle):
        return self._m.tutor(materia, cartelle)

    def tutor_fatto(self, chiave, si):
        return self._m.tutor_fatto(chiave, si)

    def tutor_chiedi(self, materia, cartelle, storia, testo):
        return self._m.tutor_chiedi(materia, cartelle, storia, testo)

    def glossario(self, materia, cartelle=None, rifai=False, solo_salvato=False):
        return self._m.glossario(materia, cartelle, rifai, solo_salvato)

    def glossario_ripassa(self, materia, termine, si):
        return self._m.glossario_ripassa(materia, termine, si)

    def glossario_pdf(self, materia):
        return self._m.glossario_pdf(materia)

    def nuvola_stato(self):
        return self._m.nuvola_stato()

    def nuvola_accedi(self, provider):
        return self._m.nuvola_accedi(provider)

    def nuvola_chiave(self, chiave):
        return self._m.nuvola_chiave(chiave)

    def nuvola_scollega(self):
        return self._m.nuvola_scollega()

    def nuvola_opzione(self, chiave, valore):
        return self._m.nuvola_opzione(chiave, valore)

    def nuvola_presto(self):
        return self._m.nuvola_presto()

    def nuvola_adesso(self):
        return self._m.nuvola_adesso()

    def anki(self, cartelle, titolo="", modo="tutte"):
        return self._m.anki(cartelle, titolo, modo)

    def sync_stato(self):
        return self._m.sync_stato()

    def sync_codice(self):
        return self._m.sync_codice()

    def sync_annulla_codice(self):
        return self._m.sync_annulla_codice()

    def sync_collega(self, codice):
        return self._m.sync_collega(codice)

    def sync_adesso(self):
        return self._m.sync_adesso()

    def sync_scollega(self, id_disp):
        return self._m.sync_scollega(id_disp)

    def sync_opzione(self, chiave, valore):
        return self._m.sync_opzione(chiave, valore)

    def segna_uso(self, chiave):
        return self._m.segna_uso(chiave)

    def strumenti_dsa_pdf(self, materia="", nome_classe="", ha_lezioni=True):
        return self._m.strumenti_dsa_pdf(materia, nome_classe, ha_lezioni)

    def mappa_verifica(self, materia, cartelle, parole=True, rifai=False):
        return self._m.mappa_verifica(materia, cartelle, parole, rifai)

    def mappa_verifica_salva(self, materia, tolte, nome_classe=""):
        return self._m.mappa_verifica_salva(materia, tolte, nome_classe)

    def mappa_verifica_pdf(self, materia, formule=True, stampa=False):
        return self._m.mappa_verifica_pdf(materia, formule, stampa)

    def karaoke(self, cartella):
        return self._m.karaoke(cartella)

    def podcast(self, cartella, durata="breve", rifai=False, stile="uno"):
        return self._m.podcast(cartella, durata, rifai, stile)

    def podcast_mp3(self, cartella, durata="breve", velocita=1.0, stile="uno"):
        return self._m.podcast_mp3(cartella, durata, velocita, stile)

    def studia_info(self, materia):
        return self._m.studia_info(materia)

    def detta_avvia(self):
        return self._m.detta_avvia()

    def detta_livello(self):
        return self._m.detta_livello()

    def detta_fine(self):
        return self._m.detta_fine()

    def appunti_dsa(self, cartella, formato=None):
        return self._m.appunti_dsa(cartella, formato)

    def test_correggi(self, materia, risposte, sec=0):
        return self._m.test_correggi(materia, risposte, sec)

    def ascolta_appunti(self, cartella):
        return self._m.ascolta_appunti(cartella)

    def voce_parla(self, testo, velocita=1.0, lingua="it"):
        return self._m.voce_parla(testo, velocita, lingua)

    def voce_occupata(self):
        return self._m.voce_occupata()

    def voce_ferma(self):
        return self._m.voce_ferma()

    def orale_nuova(self, materia):
        return self._m.orale_nuova(materia)

    def orale_ascolta(self):
        return self._m.orale_ascolta()

    def orale_livello(self):
        return self._m.orale_livello()

    def orale_fine(self, n, domanda):
        return self._m.orale_fine(n, domanda)

    def orale_correggi(self):
        return self._m.orale_correggi()

    def orale_chiudi(self):
        return self._m.orale_chiudi()

    def andamento(self):
        return self._m.andamento()

    def cose_da_fare(self):
        return self._m.cose_da_fare()

    def cosa_fatta(self, id_, si=True):
        return self._m.cosa_fatta(id_, si)

    def cerca_parole(self, testo, tipo=""):
        return self._m.cerca_parole(testo, tipo)

    def cond_info(self, cartella):
        return self._m.cond_info(cartella)

    def cond_email(self, cartella, d):
        return self._m.cond_email(cartella, d)

    def cond_word(self, cartella):
        return self._m.cond_word(cartella)

    def server_collega(self, endpoint, chiave):
        return self._m.server_collega(endpoint, chiave)

    def server_scegli(self, dove):
        return self._m.server_scegli(dove)

    def server_scollega(self):
        return self._m.server_scollega()

    def appunti_testo(self):
        try:
            return _leggi_appunti()
        except Exception:
            log.exception("appunti di Windows")
            return ""

    def cond_manda(self, cartella):
        return self._m.cond_manda(cartella)

    def cond_gdocs(self, cartella):
        return self._m.cond_gdocs(cartella)

    def cond_calendario(self, cartella, scelte, modo):
        return self._m.cond_calendario(cartella, scelte, modo)

    def cond_invia(self, cartella, servizio):
        return self._m.cond_invia(cartella, servizio)

    def collega(self, servizio, d):
        return self._m.collega(servizio, d)

    def scollega(self, servizio):
        return self._m.scollega(servizio)

    def collega_auto(self, servizio, si):
        return self._m.collega_auto(servizio, si)

    def collegamenti(self):
        return self._m.collegamenti()

    def voci(self, cartella):
        return self._m.voci(cartella)

    def voci_nomi(self, cartella, nomi):
        return self._m.voci_nomi(cartella, nomi)

    def voci_rifai(self, cartella):
        return self._m.voci_rifai(cartella)

    def avvisati(self):
        return self._m.avvisati()

    def infografica_pdf(self, cartella, apri_dopo=True):
        return self._m.infografica_pdf(cartella, apri_dopo)

    def prova_mio(self, mio):
        return self._m.prova_mio(mio)

    # ---- calendario
    def cal_elenco(self):
        return self._m.cal_elenco()

    def cal_aggiungi(self, url):
        return self._m.cal_aggiungi(url)

    def cal_togli(self, url):
        return self._m.cal_togli(url)

    def cal_orario(self, righe):
        return self._m.cal_orario(righe)

    def cal_scelta(self, uid, modo):
        return self._m.cal_scelta(uid, modo)

    def cal_rispondi(self, id_, registra):
        r = self._m.cal_rispondi(id_, registra)
        if registra and r.get("ok") and r.get("mini"):
            threading.Thread(target=self._apri_mini, daemon=True).start()
        return r

    def cal_fine_rispondi(self, ferma):
        r = self._m.cal_fine_rispondi(ferma)
        if ferma:
            threading.Thread(target=self._dopo_fine, daemon=True).start()
        return r

    def stima_docente(self, cartella):
        return self._m.stima_docente(cartella)

    def aggiungi_docente(self, cartella, pdf):
        return self._m.aggiungi_docente(cartella, pdf)

    def detta_sistema(self, testo):
        return self._m.detta_sistema(testo)

    def leggimi_elenco(self):
        return self._m.leggimi_elenco()

    def leggimi_apri(self, i):
        return self._m.leggimi_apri(i)

    def leggimi_segna(self, i, pag):
        return self._m.leggimi_segna(i, pag)

    def leggimi_togli(self, i):
        return self._m.leggimi_togli(i)

    def leggimi_pdf(self, percorso, nome=None):
        return self._m.leggimi_pdf(percorso, nome)

    def leggimi_testo(self, testo):
        return self._m.leggimi_testo(testo)

    def leggimi_foto(self, percorsi):
        return self._m.leggimi_foto(percorsi)

    # strumenti di Scripta Manent
    def sm_correggi(self, testo):
        return self._m.sm_correggi(testo)

    def sm_problema(self, testo, percorsi=None):
        return self._m.sm_problema(testo, percorsi)

    def sm_diario(self, percorsi):
        return self._m.sm_diario(percorsi)

    def sm_compiti(self):
        return self._m.sm_compiti()

    def sm_formule(self):
        return self._m.sm_formule()

    def sm_formule_foto(self, percorsi, dove="libro", pagina="", materia=""):
        return self._m.sm_formule_foto(percorsi, dove, pagina, materia)

    def sm_formula_togli(self, fid):
        return self._m.sm_formula_togli(fid)

    def sm_formula_rimetti(self, voce):
        return self._m.sm_formula_rimetti(voce)

    def sm_compito_modifica(self, vid, campi):
        return self._m.sm_compito_modifica(vid, campi)

    def sm_pezzi(self, vid, rifai=False):
        return self._m.sm_pezzi(vid, rifai)

    def sm_pezzo(self, vid, i, fatto):
        return self._m.sm_pezzo(vid, i, fatto)

    def sm_ricordami(self, vid, quando):
        return self._m.sm_ricordami(vid, quando)

    def sm_promemoria(self):
        return self._m.sm_promemoria()

    def sm_voti(self, materia=None):
        return self._m.sm_voti(materia)

    def sm_voto_nuovo(self, voto):
        return self._m.sm_voto_nuovo(voto)

    def sm_voto_togli(self, vid, materia=None):
        return self._m.sm_voto_togli(vid, materia)

    def sm_momenti(self, materia, tipi=None):
        return self._m.sm_momenti(materia, tipi)

    def sm_verifica(self, voci=None):
        return self._m.sm_verifica(voci)

    def sm_compito_nuovo(self, voce):
        return self._m.sm_compito_nuovo(voce)

    def sm_compito(self, vid, fatto=None, togli=False):
        return self._m.sm_compito(vid, fatto, togli)

    def leggimi_pagina(self, i, n):
        return self._m.leggimi_pagina(i, n)

    def leggimi_file(self, nome, dati_b64):
        return self._m.leggimi_file(nome, dati_b64)

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

    def scegli_testo(self):
        """Finestra di Windows per scegliere la trascrizione da importare (PDF, Word, testo)."""
        try:
            scelta = self._win.create_file_dialog(webview.FileDialog.OPEN,
                                                  file_types=("Testo (*.pdf;*.docx;*.txt;*.md)", "Tutti i file (*.*)"),
                                                  directory=str(Path.home() / "Downloads"))
        except Exception:
            log.exception("scegli testo")
            return {"ok": False}
        if not scelta:
            return {"ok": False}
        return self._m.info_testo(scelta[0] if isinstance(scelta, (list, tuple)) else scelta)

    def cloud_stato(self):
        return self._m.cloud_stato()

    def cloud_imposta(self, dove=None, cartella=None, cosa=None):
        return self._m.cloud_imposta(dove, cartella, cosa)

    def cloud_tutte(self):
        return self._m.cloud_tutte()

    def cloud_scegli(self):
        """«Altra cartella…»: la cartella di un cloud qualsiasi (Dropbox, iCloud, una chiavetta…)."""
        try:
            scelta = self._win.create_file_dialog(webview.FileDialog.FOLDER, directory=str(Path.home()))
        except Exception:
            log.exception("scegli cartella cloud")
            return self._m.cloud_stato()
        if not scelta:
            return self._m.cloud_stato()
        c = scelta[0] if isinstance(scelta, (list, tuple)) else scelta
        return self._m.cloud_imposta("altro", c)

    def apri_cloud(self):
        import cloud
        r = cloud.radice(self._m.cfg)
        if r:
            r.mkdir(parents=True, exist_ok=True)
            return self.apri(str(r))
        return False

    def invito_prepara(self, per, claude=True, server=True):
        return self._m.invito_prepara(per, claude, server)

    def invito_negli_appunti(self):
        return self._m.invito_negli_appunti()

    def invito_attiva(self, testo):
        return self._m.invito_attiva(testo)

    def nome_libero(self, nome, escludi=None):
        return self._m.nome_libero(nome, escludi)

    def importa_testo(self, percorso, nome, formato=None):
        return self._m.importa_testo(percorso, nome, formato)

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

    def info_link(self, url):
        return self._m.info_link(url)

    def importa_link(self, url, nome, lingua, cerca_slide):
        return self._m.importa_link(url, nome, lingua, cerca_slide)

    def info_video(self, percorso):
        return self._m.info_video(percorso)

    def licenza(self, forza=False):
        return self._m.licenza(bool(forza))

    def licenza_accedi(self):
        return self._m.licenza_accedi()

    def licenza_abbonati(self):
        return self._m.licenza_abbonati()

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
            w, h = 300, 252 + (44 if __import__("edizione").SCRIPTA else 0)
            x = max(0, int(sw / scala - w - 30))
            y = max(0, int(sh / scala - h - 80))
            log.info("mini finestra: schermo %sx%s, scala %.2f, posizione %s,%s", sw, sh, scala, x, y)
            self._mini = webview.create_window(
                __import__("edizione").NOME + " – in registrazione", url=str(PAGINE / "mini.html"), js_api=self,
                width=w, height=h, x=x, y=y, resizable=False,
                frameless=True, easy_drag=False, on_top=True, background_color="#0F1F24" if __import__("edizione").SCRIPTA else "#0d4275")
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

    def diagnosi_appunti(self, cartella):
        return self._m.diagnosi_appunti(cartella)

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

    def errore_js(self, msg, riga=0):
        import rapporti
        return rapporti.segnala("ErroreInterfaccia", msg, dove=f"app.js:{riga}", origine="js")

    def informativa(self):
        import webbrowser
        webbrowser.open(self._mt.sito_privacy())

    # ------------------------------------------------------------------ Aggiorna
    def cerca_aggiornamenti(self, silenzioso=False):
        self._m.cerca_aggiornamenti(bool(silenzioso))

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
        __import__("edizione").NOME, url=str(PAGINE / "index.html"), js_api=api,
        width=1060, height=730, min_size=(860, 600), background_color="#061e36", text_select=True)
    api._win = win
    win.events.closing += api._chiusura
    win.events.closed += api._chiusa
    # Le versioni 3.0-3.3 tenevano la memoria di Edge (cache) in questa cartella: Edge continuava a
    # mostrare le pagine VECCHIE anche dopo Aggiorna. La tolgo e uso una memoria nuova a ogni avvio.
    vecchia_cache = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local") / "RegistraLezione" / "webview"
    shutil.rmtree(vecchia_cache, ignore_errors=True)
    webview.start(api._carica, private_mode=True)
