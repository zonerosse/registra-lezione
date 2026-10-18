# -*- coding: utf-8 -*-
"""
Il «ponte» verso l'iPhone, con gli stessi nomi del ponte Android (Ponte, Registrazione, Whisper),
cosi' android_motore.py funziona senza cambiarlo. Qui le funzioni del telefono si chiamano
con rubicon-objc (le librerie di iOS) invece che con Kotlin.

Gia' veri: cartelle, batteria, link, registrazione (AVAudioRecorder), trascrizione (whisper.cpp, vmwhisper.so).
"""
import json
import logging
import os
import threading
import time
from pathlib import Path

log = logging.getLogger("registra_lezione")

CASA = Path.home()
# come su Android: il motore mette le registrazioni in HOME/Documents, cosi' finiscono nella cartella
# dell'app visibile in «File»; riconoscitore e impostazioni restano fuori, nella cartella dell'app
DATI = CASA
CACHE = CASA / "Library" / "Caches" / "VerbaManent"
DATI.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)


def jfloat(x):
    return float(x)


def jarray(_tipo):
    return lambda x: list(x)


def _objc(nome):
    from rubicon.objc import ObjCClass
    return ObjCClass(nome)


def _sul_principale(fn):
    """Le funzioni dello schermo (UIKit) vanno chiamate dal filo principale dell'app."""
    try:
        from rubicon.objc.api import Block  # noqa: F401
        from rubicon.objc import objc_method  # noqa: F401
        import toga
        app = toga.App.app
        app.loop.call_soon_threadsafe(fn)
    except Exception:
        log.exception("iphone: principale")


class _Ponte:
    scaricati = 0
    totale = 0

    def contesto(self):
        return None

    def cartellaDati(self):
        return str(DATI)

    def cartellaCache(self):
        return str(CACHE)

    def versione(self):
        try:
            return str(_objc("NSBundle").mainBundle.infoDictionary.objectForKey_("CFBundleShortVersionString"))
        except Exception:
            return "0.1"

    def codice(self):
        return 10            # come l'app Android 0.10: tutte le funzioni nuove

    def getScaricati(self):
        return self.scaricati

    def getTotale(self):
        return self.totale

    def riavvia(self):
        log.info("iphone: riavvio non possibile, si continua")

    def _dispositivo(self):
        d = _objc("UIDevice").currentDevice
        d.batteryMonitoringEnabled = True
        return d

    def inCarica(self):
        try:
            return int(self._dispositivo().batteryState) in (2, 3)       # in carica o carica completa
        except Exception:
            return False

    def batteria(self):
        try:
            v = float(self._dispositivo().batteryLevel)
            return int(v * 100) if v >= 0 else 100
        except Exception:
            return 100

    def apri(self, percorso):
        """Mostra il file dentro l'app (anteprima di iOS: PDF, Word, audio, immagini...), con il tasto per mandarlo."""
        f = Path(str(percorso))
        if not f.is_file():
            return False

        def fai():
            try:
                c = _objc("UIDocumentInteractionController").interactionControllerWithURL_(_url(f))
                d = _delegati()["anteprima"].alloc().init()
                c.delegate = d
                _TIENI["anteprima"] = (c, d)
                if not c.presentPreviewAnimated_(True):
                    _condividi_ora(f)                       # tipo che iOS non sa mostrare: lo si manda a un'altra app
            except Exception:
                log.exception("iphone: apri")
        _sul_principale(fai)
        return True

    def condividi(self, percorso):
        """Manda un file (WhatsApp, Mail, File, AirDrop...)."""
        f = Path(str(percorso))
        if not f.exists():
            return False
        _sul_principale(lambda: _condividi_ora(f))
        return True

    def apriLink(self, url):
        def fai():
            try:
                u = _objc("NSURL").URLWithString_(str(url))
                _objc("UIApplication").sharedApplication.openURL_options_completionHandler_(u, {}, None)
            except Exception:
                log.exception("iphone: link")
        _sul_principale(fai)

    def scegliFile(self, tipo):
        """tipo: "video" (video o audio), "pdf" o "testo" (PDF, Word, .txt). Ritorna il percorso di una copia
        nella cache dell'app, o "". La pagina aspetta finche' la persona sceglie (come su Android)."""
        tipi = {"pdf": ["com.adobe.pdf"],
                "testo": ["com.adobe.pdf", "public.plain-text", "net.daringfireball.markdown",
                          "org.openxmlformats.wordprocessingml.document"]}.get(tipo, ["public.audio", "public.movie"])
        fatto = threading.Event()
        esito = {"url": ""}

        def fai():
            try:
                from rubicon.objc.runtime import load_library
                load_library("UniformTypeIdentifiers")
                UT = _objc("UTType")
                ut = [x for x in (UT.typeWithIdentifier_(t) for t in tipi) if x is not None]
                p = _objc("UIDocumentPickerViewController").alloc().initForOpeningContentTypes_asCopy_(ut, True)
                d = _delegati()["scelta"].alloc().init()
                _TIENI["risposta"] = (esito, fatto)                    # dove scrivere la risposta
                p.delegate = d
                _TIENI["scelta"] = (p, d)
                _in_cima().presentViewController_animated_completion_(p, True, None)
            except Exception:
                log.exception("iphone: scegli file")
                fatto.set()
        _sul_principale(fai)
        fatto.wait(30 * 60)
        _TIENI.pop("scelta", None)
        u = esito["url"]
        if not u:
            return ""
        try:
            import shutil
            src = Path(u)
            dest = CACHE / "scelti" / src.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dest)
            return str(dest)
        except Exception:
            log.exception("iphone: copia file scelto")
            return ""

    def scarica(self, indirizzo, dest):
        import urllib.request
        try:
            with urllib.request.urlopen(indirizzo, timeout=60) as r, open(dest + ".part", "wb") as f:
                self.totale = int(r.headers.get("Content-Length") or 0)
                self.scaricati = 0
                while True:
                    b = r.read(1 << 16)
                    if not b:
                        break
                    f.write(b)
                    self.scaricati += len(b)
            os.replace(dest + ".part", dest)
            return ""
        except Exception as e:
            return str(e)

    def pdfInPng(self, pdf, cartella, larghezza):
        """Ogni pagina del PDF in cartella/p001.png ... larga `larghezza` pixel (PDFKit). Ritorna quante pagine."""
        try:
            import ctypes
            from rubicon.objc import ObjCInstance
            from rubicon.objc.runtime import load_library, objc_id
            from rubicon.objc.types import CGSize
            load_library("PDFKit")
            uikit = load_library("UIKit")
            uikit.UIImagePNGRepresentation.restype = objc_id
            uikit.UIImagePNGRepresentation.argtypes = [objc_id]
            doc = _objc("PDFDocument").alloc().initWithURL_(_url(pdf))
            if doc is None:
                return 0
            n = int(doc.pageCount)
            for i in range(n):
                pg = doc.pageAtIndex_(i)
                b = pg.boundsForBox_(1)                                    # 1 = kPDFDisplayBoxCropBox
                w, h = float(b.size.width) or 1.0, float(b.size.height) or 1.0
                img = pg.thumbnailOfSize_forBox_(CGSize(larghezza, max(1, int(larghezza * h / w))), 1)
                dati = ObjCInstance(uikit.UIImagePNGRepresentation(img.ptr))
                dati.writeToFile_atomically_(f"{cartella}/p{i + 1:03d}.png", True)
            return n
        except Exception:
            log.exception("iphone: pdf in png")
            return 0

    def unisciAudio(self, wavs, uscita):
        """Unisce le parti WAV (16 kHz mono) in un solo audio .m4a (AAC, molto piu' piccolo)."""
        tmp = str(uscita) + ".tmp.m4a"
        try:
            dest = None
            for w in wavs:
                src = _audio_leggi(w)
                if dest is None:
                    dest = _audio_scrivi_aac(tmp, src.processingFormat)
                _audio_copia(src, dest, 0, int(src.length))
            if dest is None:
                return False
            _chiudi(dest)
            os.replace(tmp, str(uscita))
            return True
        except Exception:
            log.exception("iphone: unisci audio")
            try:
                os.remove(tmp)
            except OSError:
                pass
            return False

    def cifra(self, testo):
        import base64
        return base64.b64encode(testo.encode()).decode()          # (prova: poi nel portachiavi dell'iPhone)

    def decifra(self, dati):
        import base64
        return base64.b64decode(dati).decode()

    def email(self, dest, oggetto, testo, allegati):
        """Mail dell'iPhone gia' scritta (destinatari, oggetto, testo, allegati): si tocca Invia.
        Senza un account in Mail: la finestra per mandare (Gmail, Outlook, WhatsApp...) con testo e allegati."""
        file = [Path(str(a)) for a in allegati if a and Path(str(a)).exists()]

        def fai():
            try:
                from rubicon.objc.runtime import load_library
                load_library("MessageUI")
                M = _objc("MFMailComposeViewController")
                vc = _in_cima()
                if M.canSendMail():
                    m = M.alloc().init()
                    d = _delegati()["posta"].alloc().init()
                    m.mailComposeDelegate = d
                    _TIENI["posta"] = (m, d)
                    m.setToRecipients_([str(x) for x in dest])
                    m.setSubject_(str(oggetto))
                    m.setMessageBody_isHTML_(str(testo), False)
                    for f in file:
                        m.addAttachmentData_mimeType_fileName_(_objc("NSData").dataWithContentsOfFile_(str(f)),
                                                               _tipo_mime(f), f.name)
                    vc.presentViewController_animated_completion_(m, True, None)
                else:
                    _condividi_ora(*file, testo=f"{oggetto}\n\n{testo}")
            except Exception:
                log.exception("iphone: email")
        _sul_principale(fai)
        return True

    def evento(self, titolo, inizio, fine, tutto, descrizione, luogo):
        """Impegno gia' scritto nel calendario dell'iPhone: si tocca Aggiungi. Arrivano a gruppi (uno ogni 0,4 s):
        li mostro uno dopo l'altro, nell'ordine delle date."""
        _EVENTI.append((str(titolo), float(inizio) / 1000, float(fine) / 1000, bool(tutto), str(descrizione), str(luogo)))
        _EVENTI_ORA[0] = time.monotonic()
        if not _TIENI.get("eventi_attesa"):
            _TIENI["eventi_attesa"] = True

            def aspetta():
                while time.monotonic() - _EVENTI_ORA[0] < 1.0:
                    time.sleep(0.2)
                _TIENI["eventi_attesa"] = False
                _sul_principale(_prossimo_evento)
            threading.Thread(target=aspetta, daemon=True).start()
        return True

    def sveglia(self, i, quando, titolo, testo):
        """Avviso all'ora di un impegno, anche con l'app chiusa (notifica programmata di iOS)."""
        try:
            sec = max(1.0, float(quando) / 1000 - time.time())
            T = _objc("UNTimeIntervalNotificationTrigger").triggerWithTimeInterval_repeats_(sec, False)
            _notifica(f"vm{int(i)}", titolo, testo, T)
        except Exception:
            log.exception("iphone: sveglia")

    def togliSveglia(self, i):
        try:
            _centro().removePendingNotificationRequestsWithIdentifiers_([f"vm{int(i)}"])
        except Exception:
            log.exception("iphone: togli sveglia")

    def tagliaAudio(self, sorgente, uscita, da, a):
        """Un pezzo dell'audio (da..a millisecondi) in un altro file .m4a."""
        tmp = str(uscita) + ".tmp.m4a"
        try:
            src = _audio_leggi(sorgente)
            rate = float(src.processingFormat.sampleRate)
            i0 = int(max(0, da) * rate / 1000)
            i1 = min(int(src.length), int(a * rate / 1000))
            if i1 <= i0:
                return False
            dest = _audio_scrivi_aac(tmp, src.processingFormat)
            _audio_copia(src, dest, i0, i1 - i0)
            _chiudi(dest)
            os.replace(tmp, str(uscita))
            return True
        except Exception:
            log.exception("iphone: taglia audio")
            try:
                os.remove(tmp)
            except OSError:
                pass
            return False

    def decodificaWav(self, sorgente, uscita, da, durata):
        """Il pezzo da..da+durata (millisecondi) di qualsiasi audio come WAV 16 kHz mono, scritto un po' alla volta."""
        import wave
        import numpy as np
        try:
            src = _audio_leggi(sorgente)
            fmt = src.processingFormat                     # float32, canali separati
            rate, canali = float(fmt.sampleRate), int(fmt.channelCount)
            i0 = int(max(0, da) * rate / 1000)
            fine = min(int(src.length), i0 + int(durata * rate / 1000))
            if fine <= i0:
                return False
            src.framePosition = i0
            passo = int(rate * 10)
            buf = _objc("AVAudioPCMBuffer").alloc().initWithPCMFormat_frameCapacity_(fmt, passo)
            scritti = 0
            with wave.open(str(uscita), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(16000)
                pos = i0
                while pos < fine:
                    n = min(passo, fine - pos)
                    if not src.readIntoBuffer_frameCount_error_(buf, n, None):
                        break
                    letti = int(buf.frameLength)
                    if letti <= 0:
                        break
                    dati = buf.floatChannelData
                    x = sum(np.ctypeslib.as_array(dati[c], shape=(letti,)).astype(np.float32) for c in range(canali)) / canali
                    if rate != 16000:
                        m = max(1, int(round(letti * 16000 / rate)))
                        x = np.interp(np.linspace(0, letti - 1, m), np.arange(letti), x)
                    w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
                    scritti += len(x)
                    pos += letti
            return scritti > 0
        except Exception:
            log.exception("iphone: decodifica audio")
            return False

    def impronta(self, modello, dati, frame):
        import numpy as np
        x = np.asarray(dati, dtype=np.float32).reshape(1, frame, -1)
        v = np.concatenate([x[0].mean(axis=0), x[0].std(axis=0)])
        return list(np.resize(v, 256))

    def notifica(self, titolo, testo):
        try:
            _notifica("vm-pronta", titolo, testo, None)
        except Exception:
            log.exception("iphone: notifica")


_TIENI = {}          # finestre e delegati aperti: restano vivi finche' servono
_DEL = {}


def _in_cima():
    """La schermata in primo piano, su cui aprire scelta file, condivisione, anteprima."""
    app = _objc("UIApplication").sharedApplication
    vc = None
    for sc in app.connectedScenes.allObjects():
        try:
            for w in sc.windows:
                if w.isKeyWindow:
                    vc = w.rootViewController
        except Exception:
            pass
    if vc is None:
        vc = app.windows.firstObject.rootViewController
    while vc.presentedViewController is not None:
        vc = vc.presentedViewController
    return vc


def _condividi_ora(*file, testo=""):
    vc = _in_cima()
    cose = ([str(testo)] if testo else []) + [_url(f) for f in file]
    a = _objc("UIActivityViewController").alloc().initWithActivityItems_applicationActivities_(cose, None)
    pop = a.popoverPresentationController             # sull'iPad la finestra deve avere un punto di partenza
    if pop is not None:
        pop.sourceView = vc.view
    vc.presentViewController_animated_completion_(a, True, None)


def _tipo_mime(f):
    import mimetypes
    return mimetypes.guess_type(str(f))[0] or "application/octet-stream"


_EVENTI = []
_EVENTI_ORA = [0.0]


def _prossimo_evento():
    """Mostra il prossimo impegno da aggiungere (l'ultimo arrivato e' il primo per data)."""
    if not _EVENTI or _TIENI.get("evento"):
        return
    titolo, a, b, tutto, descr, luogo = _EVENTI.pop()
    try:
        from rubicon.objc.runtime import load_library
        load_library("EventKit")
        load_library("EventKitUI")
        st = _TIENI.get("calendario") or _objc("EKEventStore").alloc().init()
        _TIENI["calendario"] = st
        e = _objc("EKEvent").eventWithEventStore_(st)
        e.title = titolo
        D = _objc("NSDate")
        e.startDate = D.dateWithTimeIntervalSince1970_(a)
        e.endDate = D.dateWithTimeIntervalSince1970_(b)
        e.allDay = tutto
        if tutto:                               # tutto il giorno: la mezzanotte UTC arriva da Android, qui va la data locale
            import datetime
            g = datetime.datetime.fromtimestamp(a, datetime.timezone.utc).date()
            loc = datetime.datetime(g.year, g.month, g.day).timestamp()
            e.startDate = D.dateWithTimeIntervalSince1970_(loc)
            e.endDate = D.dateWithTimeIntervalSince1970_(loc + 3600)
        if descr:
            e.notes = descr
        if luogo:
            e.location = luogo
        v = _objc("EKEventEditViewController").alloc().init()
        v.eventStore = st
        v.event = e
        d = _delegati()["evento"].alloc().init()
        v.editViewDelegate = d
        _TIENI["evento"] = (v, d)
        _in_cima().presentViewController_animated_completion_(v, True, None)
    except Exception:
        log.exception("iphone: calendario")
        _TIENI.pop("evento", None)


def _centro():
    """Le notifiche di iOS: la prima volta si chiede il permesso; si vedono anche con l'app aperta."""
    c = _TIENI.get("notifiche")
    if c is None:
        from rubicon.objc import Block
        from rubicon.objc.runtime import load_library, objc_id
        import ctypes
        load_library("UserNotifications")
        c = _objc("UNUserNotificationCenter").currentNotificationCenter()
        d = _delegati()["notifiche"].alloc().init()
        c.delegate = d
        risposta = Block(lambda ok, err: log.info("iphone: permesso notifiche %s", bool(ok)), None, ctypes.c_bool, objc_id)
        c.requestAuthorizationWithOptions_completionHandler_(4 | 2 | 1, risposta)    # avvisi, suono, numerino
        _TIENI["notifiche"] = c
        _TIENI["notifiche_extra"] = (d, risposta)
    return c


def _notifica(ident, titolo, testo, quando):
    c = _centro()
    n = _objc("UNMutableNotificationContent").alloc().init()
    n.title = str(titolo)
    n.body = str(testo)
    suono = _objc("UNNotificationSound").defaultSound
    n.sound = suono() if callable(suono) else suono
    r = _objc("UNNotificationRequest").requestWithIdentifier_content_trigger_(ident, n, quando)
    c.addNotificationRequest_withCompletionHandler_(r, None)


def _delegati():
    """Le classi Objective-C che ricevono le risposte di iOS (create una volta sola)."""
    if _DEL:
        return _DEL
    from rubicon.objc import NSObject, objc_method, ObjCInstance, ObjCBlock, NSUInteger
    from rubicon.objc.runtime import objc_block

    class VMAnteprima(NSObject):
        @objc_method
        def documentInteractionControllerViewControllerForPreview_(self, c) -> ObjCInstance:
            return _in_cima()

        @objc_method
        def documentInteractionControllerDidEndPreview_(self, c) -> None:
            _TIENI.pop("anteprima", None)

    class VMScelta(NSObject):
        @objc_method
        def documentPicker_didPickDocumentsAtURLs_(self, p, urls) -> None:
            esito, fatto = _TIENI.get("risposta", ({}, threading.Event()))
            try:
                esito["url"] = str(urls.firstObject.path) if urls.count else ""
            finally:
                fatto.set()

        @objc_method
        def documentPickerWasCancelled_(self, p) -> None:
            _TIENI.get("risposta", ({}, threading.Event()))[1].set()

    class VMPosta(NSObject):
        @objc_method
        def mailComposeController_didFinishWithResult_error_(self, m, r: int, e) -> None:
            m.dismissViewControllerAnimated_completion_(True, None)
            _TIENI.pop("posta", None)

    class VMEvento(NSObject):
        @objc_method
        def eventEditViewController_didCompleteWithAction_(self, v, azione: int) -> None:
            def dopo():
                _TIENI.pop("evento", None)
                _prossimo_evento()
            from rubicon.objc import Block
            b = Block(dopo, None)
            _TIENI["evento_chiudi"] = b
            v.dismissViewControllerAnimated_completion_(True, b)

    class VMNotifiche(NSObject):
        @objc_method
        def userNotificationCenter_willPresentNotification_withCompletionHandler_(self, c, n, fatto: objc_block) -> None:
            ObjCBlock(fatto, None, NSUInteger)(16 | 8 | 2)      # anche con l'app aperta: striscia, elenco, suono

    _DEL.update(anteprima=VMAnteprima, scelta=VMScelta, posta=VMPosta, evento=VMEvento, notifiche=VMNotifiche)
    return _DEL


def _url(percorso):
    return _objc("NSURL").fileURLWithPath_(str(percorso))


def _audio_leggi(percorso):
    from rubicon.objc.runtime import load_library
    load_library("AVFoundation")
    f = _objc("AVAudioFile").alloc().initForReading_error_(_url(percorso), None)
    if f is None:
        raise RuntimeError("audio non leggibile: " + str(percorso))
    return f


def _audio_scrivi_aac(percorso, fmt):
    from rubicon.objc import ns_from_py
    imp = ns_from_py({"AVFormatIDKey": 1633772320,              # kAudioFormatMPEG4AAC
                      "AVSampleRateKey": float(fmt.sampleRate), "AVNumberOfChannelsKey": int(fmt.channelCount),
                      "AVEncoderBitRateKey": 32000 * int(fmt.channelCount)})
    f = _objc("AVAudioFile").alloc().initForWriting_settings_error_(_url(percorso), imp, None)
    if f is None:
        raise RuntimeError("non riesco a creare " + str(percorso))
    return f


def _audio_copia(src, dest, da, quanti):
    """Copia `quanti` campioni da `da`, 10 secondi alla volta (un'ora di audio non sta in memoria)."""
    fmt = src.processingFormat
    passo = int(float(fmt.sampleRate) * 10)
    buf = _objc("AVAudioPCMBuffer").alloc().initWithPCMFormat_frameCapacity_(fmt, passo)
    src.framePosition = da
    resta = quanti
    while resta > 0:
        if not src.readIntoBuffer_frameCount_error_(buf, min(passo, resta), None) or int(buf.frameLength) <= 0:
            break
        if not dest.writeFromBuffer_error_(buf, None):
            raise RuntimeError("scrittura audio non riuscita")
        resta -= int(buf.frameLength)


def _chiudi(f):
    """Chiude il file audio (iOS 18 ha close; prima si chiude quando l'oggetto sparisce)."""
    import gc
    try:
        f.close()
    except Exception:
        pass
    del f
    gc.collect()


class _Reg:
    """Registrazione dal microfono dell'iPhone (AVAudioRecorder): audio_001.wav, audio_002.wav... a 16 kHz mono,
    una parte ogni N secondi, come su Android. Con «UIBackgroundModes: audio» continua a schermo spento."""
    RATE = 16000

    def __init__(self):
        self.attiva = False
        self.inPausa = False
        self.livello = 0.0
        self.partiChiuse = 0
        self.errore = ""
        self.richiestaFine = False
        self._fatti = 0.0          # secondi delle parti gia' chiuse
        self._rec = None
        self._th = None

    def getPartiChiuse(self):
        return self.partiChiuse

    def getErrore(self):
        return self.errore

    def getRichiestaFine(self):
        return self.richiestaFine

    def setRichiestaFine(self, v):
        self.richiestaFine = bool(v)

    def getLivello(self):
        return self.livello

    def getInPausa(self):
        return self.inPausa

    def secondi(self):
        try:
            return self._fatti + (float(self._rec.currentTime) if self._rec is not None else 0.0)
        except Exception:
            return self._fatti

    def pausa(self, si):
        self.inPausa = bool(si)
        try:
            if self._rec is not None:
                self._rec.pause() if si else self._rec.record()
        except Exception:
            log.exception("iphone: pausa")
        if si:
            self.livello = 0.0

    def livelloAdesso(self):
        return self.livello if self.attiva else 0.3

    def tieniSveglio(self, ctx, si):
        def fai():
            try:
                _objc("UIApplication").sharedApplication.idleTimerDisabled = bool(si)
            except Exception:
                log.exception("iphone: schermo acceso")
        _sul_principale(fai)

    def _sessione(self):
        from rubicon.objc.runtime import load_library
        load_library("AVFoundation")
        s = _objc("AVAudioSession").sharedInstance()
        # registrare e, se serve, sentire; Bluetooth e altoparlante ammessi
        s.setCategory_mode_options_error_("AVAudioSessionCategoryPlayAndRecord", "AVAudioSessionModeDefault", 4 | 8, None)
        s.setActive_error_(True, None)

    def _nuovo(self, k):
        from rubicon.objc import ns_from_py
        url = _objc("NSURL").fileURLWithPath_(f"{self._cartella}/audio_{k:03d}.wav")
        imp = ns_from_py({"AVFormatIDKey": 1819304813, "AVSampleRateKey": 16000.0, "AVNumberOfChannelsKey": 1,
                          "AVLinearPCMBitDepthKey": 16, "AVLinearPCMIsFloatKey": False, "AVLinearPCMIsBigEndianKey": False})
        r = _objc("AVAudioRecorder").alloc().initWithURL_settings_error_(url, imp, None)
        if r is None:
            raise RuntimeError("microfono non disponibile")
        r.meteringEnabled = True
        r.prepareToRecord()
        if not r.record():
            raise RuntimeError("il microfono non parte (permesso negato?)")
        return r

    def avvia(self, ctx, cartella, parte, nome):
        if self.attiva:
            return False
        self._cartella, self._parte = str(cartella), int(parte)
        self.partiChiuse, self._fatti, self.errore, self.richiestaFine, self.inPausa = 0, 0.0, "", False, False
        try:
            self._sessione()
            self._k = 1
            self._rec = self._nuovo(1)
        except Exception as e:
            log.exception("iphone: registrazione")
            self.errore = str(e)
            return False
        self.attiva = True
        self._th = threading.Thread(target=self._guarda, daemon=True)
        self._th.start()
        return True

    def _guarda(self):
        import math
        while self.attiva:
            time.sleep(0.2)
            r = self._rec
            if r is None or self.inPausa:
                continue
            try:
                r.updateMeters()
                db = float(r.averagePowerForChannel_(0))
                self.livello = max(0.0, min(1.0, math.pow(10, db / 20) * 4))
                if float(r.currentTime) >= self._parte:            # parte piena: chiudo e ne apro un'altra
                    durata = float(r.currentTime)
                    r.stop()
                    self._fatti += durata
                    self.partiChiuse = self._k
                    self._k += 1
                    self._rec = self._nuovo(self._k)
            except Exception as e:
                log.exception("iphone: registrazione in corso")
                self.errore = str(e)

    def ferma(self, ctx):
        self.attiva = False
        if self._th is not None:
            self._th.join(5)
        r, self._rec = self._rec, None
        try:
            if r is not None:
                durata = float(r.currentTime)
                r.stop()
                self._fatti += durata
                f = Path(f"{self._cartella}/audio_{self._k:03d}.wav")
                if durata >= 0.5:
                    self.partiChiuse = self._k
                elif f.exists():
                    f.unlink()
        except Exception:
            log.exception("iphone: fine registrazione")
        try:
            _objc("AVAudioSession").sharedInstance().setActive_error_(False, None)
        except Exception:
            pass
        return self._fatti


class _Whisper:
    """whisper.cpp compilato per l'iPhone (vmwhisper.so, stesso ponte di Android), chiamato con ctypes."""
    _lib = None

    def _carica(self):
        if self._lib is None:
            import ctypes
            qui = Path(__file__).resolve().parent
            f = qui / "vmwhisper.so"
            if not f.exists():
                # nell'app Xcode trasforma le librerie in «framework» e lascia un file .fwork con il percorso
                fw = qui / "vmwhisper.fwork"
                f = Path(_objc("NSBundle").mainBundle.bundlePath) / fw.read_text().strip()
            lib = ctypes.CDLL(str(f))
            lib.vm_trascrivi_file.restype = ctypes.c_void_p
            lib.vm_trascrivi_file.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_float,
                                              ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int, ctypes.c_int]
            lib.vm_progresso.restype = ctypes.c_int
            lib.vm_info.restype = ctypes.c_char_p
            lib.vm_libera.argtypes = [ctypes.c_void_p]
            # Metal (processore grafico) sull'iPhone vero; nel simulatore si blocca, li' si usa il processore normale
            lib.vm_usa_gpu(0 if os.environ.get("SIMULATOR_DEVICE_NAME") else 1)
            _Whisper._lib = lib
            log.info("iphone: whisper %s", lib.vm_info().decode(errors="replace"))
        return self._lib

    def progresso(self):
        try:
            return int(self._carica().vm_progresso())
        except Exception:
            return 0

    def trascriviFile(self, modello, wav, prima, secPrima, lingua, parole, thread, beam):
        import ctypes
        lib = self._carica()
        b = lambda x: str(x or "").encode("utf-8")
        p = lib.vm_trascrivi_file(b(modello), b(wav), b(prima), float(secPrima), b(lingua), b(parole),
                                  int(thread), int(beam))
        try:
            return ctypes.string_at(p).decode("utf-8", errors="replace")
        finally:
            lib.vm_libera(p)


class _W:
    INSTANCE = _Whisper()


class _MMR:
    """Al posto del lettore di Android: la durata (millisecondi) di un audio."""
    METADATA_KEY_DURATION = 9

    def setDataSource(self, p):
        self.p = p

    def extractMetadata(self, k):
        try:
            f = _audio_leggi(self.p)
            return str(int(int(f.length) * 1000 / float(f.processingFormat.sampleRate)))
        except Exception:
            return None

    def release(self):
        pass


_P = _Ponte()
_R = _Reg()


def jclass(nome):
    if nome == "android.media.MediaMetadataRetriever":
        return _MMR
    if nome.endswith("Ponte"):
        return _P
    if nome.endswith("Registrazione"):
        return _R
    if nome.endswith("Whisper"):
        return _W
    if nome == "java.lang.String":
        return str
    raise KeyError(nome)
