# -*- coding: utf-8 -*-
"""
Testi del programma in italiano e in inglese.

LINGUA e' la lingua del programma (la imposta il motore dalle impostazioni).
I file di una lezione (appunti, PDF, pacchetti) usano invece la lingua salvata nella lezione
(info.json -> "lingua_appunti"), cosi' le lezioni vecchie restano come erano.
"""
LINGUA = "it"

# lingue in cui puo' parlare il docente (codice per la trascrizione; None = la riconosce da sola)
LEZIONE = ["it", "en", "fr", "es", "de", "auto"]
NOMI_LINGUA = {
    "it": {"it": "italiano", "en": "inglese", "fr": "francese", "es": "spagnolo", "de": "tedesco", "auto": "lingua riconosciuta da sola"},
    "en": {"it": "Italian", "en": "English", "fr": "French", "es": "Spanish", "de": "German", "auto": "detected automatically"},
}

T = {
    "it": {
        # motore
        "avviso_audio_err": "Problema con l'audio: registro solo lo schermo.",
        "avviso_silenzio": "Da un minuto non sento nessun suono: controlla che il volume del PC non sia a zero.",
        "imp_prima": "Si cambia prima di iniziare la registrazione.",
        "imp_chiave": "Prima inserisci la chiave di Claude.",
        "chiave_vuota": "Incolla la chiave.",
        "chiave_non_provata": "Non riesco a provarla: riprova.",
        "chiave_ok": "Chiave valida, salvata. Appunti automatici accesi.",
        "aspetta_completa": "Aspetta che finisca di preparare la lezione completa.",
        "aspetta_lavoro": "Aspetta che finisca il lavoro in corso.",
        "manca_chiave": "Manca la chiave di Claude (Impostazioni).",
        "rinomina_err": "Non sono riuscito a rinominare tutto. Forse un file è aperto: chiudilo e riprova.",
        "elimina_err": "Non sono riuscito a eliminare la registrazione. Forse un file è aperto: chiudilo e riprova.",
        "agg_occupato": "Sto registrando o preparando una lezione: l'aggiornamento si fa quando ho finito.",
        "agg_cerco": "Cerco aggiornamenti…",
        "agg_ultima": "Hai già l'ultima versione.",
        "agg_404": "Non trovo gli aggiornamenti su GitHub.",
        "agg_rete": "Non riesco a collegarmi a GitHub. Riprova più tardi.",
        "agg_fatto": "Aggiornato alla versione {v}. Il programma si riavvia…",
        "agg_err": "Aggiornamento non riuscito. Riprova più tardi.",
        "modello_scarico": "Scarico il modello per la trascrizione (una volta sola)…",
        "modello_err": "Modello per la trascrizione non scaricato: serve internet.",
        "fine_audio": "L'audio non è stato registrato.",
        "fine_video": "Il video ha avuto un problema (le slide catturate ci sono).",
        "err_tit": "Qualcosa è andato storto",
        "err_testo": "La registrazione è salvata: in «Le mie registrazioni» tocca «Completa» per riprovare.",
        "app_tutti": "Appunti della lezione",
        "app_parte": "Appunti parte {k}",
        "pacchetti_cartella": "Pacchetti per Claude",
        # errori degli appunti
        "ap_chiave": "chiave non valida o disattivata",
        "ap_limite": "limite di spesa raggiunto (si cambia su platform.claude.com)",
        "ap_credito": "credito finito (si ricarica su platform.claude.com)",
        "ap_errore": "errore da Claude ({c}) {m}",
        "ap_sk": "la chiave deve iniziare con sk-ant-: controlla di averla copiata tutta",
        "ap_rete": "non riesco a collegarmi: serve internet",
        "ap_pacchetto": "il pacchetto di questa parte non si trova piu'",
        "ap_pdf": "nel pacchetto manca il PDF",
        "ap_occupato": "Claude non risponde o manca internet: tocca Riprova piu' tardi",
        "ap_vuoto": "risposta di Claude senza appunti: tocca Riprova",
        "ap_imprevisto": "errore imprevisto (dettagli nel file registra_lezione.log)",
        # file
        "parte": "parte",
        "ore": "ore",
        "file_appunti": "Appunti",
        "file_appunti_esame": "Appunti Formato Esame",
        "fmt_cornell": "Cornell",
        "fmt_esame": "Formato Esame",
        "lezione_completa": "lezione completa",
        # PDF degli appunti
        "pdf_occhiello": "APPUNTI DI STUDIO · FORMATO CORNELL · {e}",
        "pdf_occhiello_tutti": "APPUNTI DELLA LEZIONE COMPLETA · FORMATO CORNELL",
        "pdf_domande": "{n} domande",
        "pdf_parti": "{n} parti",
        "pdf_formulario_b": "formulario",
        "pdf_esercizi_b": "esercizi svolti",
        "pdf_indice": "INDICE DELLE PARTI",
        "pdf_controlla": "Appunti creati da Claude dalla registrazione: controlla sempre sulle slide e sul libro.",
        "pdf_appunti_di": "Appunti {e}",
        "pdf_titolo_parte": "{nome} · Appunti {e}",
        "pdf_sotto": "{data} · {tit} · appunti in formato Cornell creati da Claude dalla registrazione: controlla sempre sulle slide e sul libro.",
        "pdf_studia": "Come si studia: copri la colonna APPUNTI e prova a rispondere alle domande a sinistra; poi controlla. Il riassunto in fondo dice l'essenziale.",
        "pdf_col_dom": "DOMANDE E PAROLE CHIAVE",
        "pdf_col_app": "APPUNTI",
        "pdf_riassunto": "RIASSUNTO",
        "pdf_formulario": "Formulario: simboli e formule",
        "pdf_simbolo": "Simbolo / formula",
        "pdf_significato": "Significato",
        "pdf_esercizi": "Esercizi svolti",
        "pdf_altre": "Altre domande d'esame",
        "pdf_controllare": "Da controllare",
        "fine_dopo": "Registrazione salvata. La trascrivo quando tocchi «Trascrivi ora» in «Le mie lezioni» (meglio col caricatore attaccato).",
        "and_mic": "Microfono del telefono",
        "and_caricatore": "Collega il caricatore: stai trascrivendo durante la lezione e il telefono consuma di più.",
        "and_pronta_t": "Lezione pronta",
        "and_pronta": "«{n}» è pronta: trascrizione e appunti (se attivi) ti aspettano nell'app.",
        "pdf_agg": "aggiunto da Claude",
        "pdf_dav": "da verificare",
        "pdf_leg_agg": "In viola, con «aggiunto da Claude»: completato da Claude, non detto a lezione e non sulle slide.",
        "pdf_leg_dav": "⚠ da verificare: il programma non l'ha trovato nella registrazione (citazione, minuto o slide).",
        "vr_frase": "frase non trovata nella registrazione: «{f}»",
        "vr_tolta": "la frase del docente non era nella registrazione: tolta",
        "vr_minuto": "il minuto {m} non c'è nella registrazione",
        "vr_slide": "la slide {n} non c'è",
        "es_tutta": "Le domande più probabili di tutta la lezione",
        "es_h_tutta": "Classifica di tutta la lezione",
        "es_parte1": "parte {p}",
        "es_parti": "parti {p}",
        "ch_vuoto": "Questa lezione non ha ancora la trascrizione.",
        "ch_mappa_err": "Claude non ha preparato la mappa: riprova.",
        "mp_titolo": "Mappa mentale",
        "dc_err": "Non riesco a leggere questo PDF. Prova a salvarlo di nuovo (Stampa → Microsoft Print to PDF) e riprova.",
        "dc_copia": "(prima delle slide del docente)",
        "pdf_creato": "Creato con Verba Manent IA · Punto Web Ferrara",
        "pdf_lingua": "Lezione in {l} · appunti in italiano",
        # pacchetto per l'AI e trascrizione
        "tr_intro": ("Registrazione di una lezione seguita online. Ogni sezione contiene l'immagine della slide "
                     "mostrata dal docente e, sotto, la trascrizione automatica di quello che il docente ha detto "
                     "mentre quella slide era sullo schermo (con l'orario dall'inizio della lezione). "
                     "La trascrizione può contenere errori di riconoscimento."),
        "tr_durata": "durata",
        "tr_nessuna": "(nessuna parola in questo tratto)",
        "tr_parte_di": "{e} della lezione, da {a} a {b}",
        "tr_noimg": "Nessuna slide catturata",
        "tr_silenzio": "(in questo tratto il docente non ha parlato, o l'audio non si sentiva)",
        "tr_nota": "Il testo è una trascrizione automatica: può contenere qualche parola sbagliata. Tocca una slide per ingrandirla.",
        "tr_completa": "Trascrizione completa con orari",
        "tr_nessuna_breve": "(nessuna parola)",
        "anno": "anno",
        "es_occhiello": "APPUNTI · FORMATO ESAME · {e}",
        "es_occhiello_tutti": "APPUNTI DELLA LEZIONE COMPLETA · FORMATO ESAME",
        "es_b_dom": "{n} domande probabili",
        "es_b_kw": "{n} parole chiave",
        "es_b_sim": "simulazione d'esame",
        "es_uso": "Come si usa: parti dalle ★★★, impara lo schema e le parole chiave (non il testo), ripeti a voce. In fondo la simulazione.",
        "es_h_dom": "Domande probabili d'esame",
        "es_err": "Errore da evitare: ",
        "es_leg": "★★★ il docente ci ha insistito o l'ha detto · ★★☆ argomento centrale · ★☆☆ può capitare",
        "es_h_kw": "Parole chiave da tenere a mente",
        "es_kw1": "Parola chiave",
        "es_kw2": "In una riga",
        "es_h_sim": "Simulazione d'esame",
        "es_deve": "deve contenere: ",
        "es_sim_nota": "Fatti fare le domande da qualcuno e rispondi a voce, 2-3 minuti l'una.",
    },
    "en": {
        "avviso_audio_err": "Audio problem: recording the screen only.",
        "avviso_silenzio": "No sound for a minute: check that the PC volume is not at zero.",
        "imp_prima": "Change this before you start recording.",
        "imp_chiave": "First enter your Claude key.",
        "chiave_vuota": "Paste the key.",
        "chiave_non_provata": "I can't test it: try again.",
        "chiave_ok": "Valid key, saved. Automatic notes are on.",
        "aspetta_completa": "Wait until the full lecture is ready.",
        "aspetta_lavoro": "Wait until the current work is finished.",
        "manca_chiave": "The Claude key is missing (Settings).",
        "rinomina_err": "I couldn't rename everything. A file may be open: close it and try again.",
        "elimina_err": "I couldn't delete the recording. A file may be open: close it and try again.",
        "agg_occupato": "I'm recording or preparing a lecture: update when I've finished.",
        "agg_cerco": "Looking for updates…",
        "agg_ultima": "You already have the latest version.",
        "agg_404": "I can't find the updates on GitHub.",
        "agg_rete": "I can't connect to GitHub. Try again later.",
        "agg_fatto": "Updated to version {v}. Restarting…",
        "agg_err": "Update failed. Try again later.",
        "modello_scarico": "Downloading the transcription model (only once)…",
        "modello_err": "Transcription model not downloaded: an internet connection is needed.",
        "fine_audio": "The audio was not recorded.",
        "fine_video": "The video had a problem (the captured slides are there).",
        "err_tit": "Something went wrong",
        "err_testo": "The recording is saved: in «My recordings» tap «Complete» to try again.",
        "app_tutti": "Notes of the lecture",
        "app_parte": "Notes part {k}",
        "pacchetti_cartella": "Packages for Claude",
        "ap_chiave": "invalid or disabled key",
        "ap_limite": "spending limit reached (change it on platform.claude.com)",
        "ap_credito": "credit used up (top up on platform.claude.com)",
        "ap_errore": "error from Claude ({c}) {m}",
        "ap_sk": "the key must start with sk-ant-: check you copied all of it",
        "ap_rete": "I can't connect: an internet connection is needed",
        "ap_pacchetto": "the package of this part can't be found any more",
        "ap_pdf": "the PDF is missing from the package",
        "ap_occupato": "Claude is not answering or there is no internet: tap Retry later",
        "ap_vuoto": "Claude answered without notes: tap Retry",
        "ap_imprevisto": "unexpected error (details in registra_lezione.log)",
        "parte": "part",
        "ore": "",
        "file_appunti": "Notes",
        "file_appunti_esame": "Exam notes",
        "fmt_cornell": "Cornell",
        "fmt_esame": "Exam format",
        "lezione_completa": "full lecture",
        "pdf_occhiello": "STUDY NOTES · CORNELL FORMAT · {e}",
        "pdf_occhiello_tutti": "NOTES OF THE FULL LECTURE · CORNELL FORMAT",
        "pdf_domande": "{n} questions",
        "pdf_parti": "{n} parts",
        "pdf_formulario_b": "formula sheet",
        "pdf_esercizi_b": "worked examples",
        "pdf_indice": "PARTS",
        "pdf_controlla": "Notes created by Claude from the recording: always check them against the slides and the textbook.",
        "pdf_appunti_di": "Notes {e}",
        "pdf_titolo_parte": "{nome} · Notes {e}",
        "pdf_sotto": "{data} · {tit} · Cornell notes created by Claude from the recording: always check them against the slides and the textbook.",
        "pdf_studia": "How to study: cover the NOTES column and try to answer the questions on the left, then check. The summary at the bottom gives the essentials.",
        "pdf_col_dom": "QUESTIONS AND KEYWORDS",
        "pdf_col_app": "NOTES",
        "pdf_riassunto": "SUMMARY",
        "pdf_formulario": "Formula sheet: symbols and formulas",
        "pdf_simbolo": "Symbol / formula",
        "pdf_significato": "Meaning",
        "pdf_esercizi": "Worked examples",
        "pdf_altre": "More exam questions",
        "pdf_controllare": "To check",
        "fine_dopo": "Recording saved. I will transcribe it when you tap «Transcribe now» in «My lectures» (better with the charger plugged in).",
        "and_mic": "Phone microphone",
        "and_caricatore": "Plug in the charger: you are transcribing during the lecture and the phone uses more battery.",
        "and_pronta_t": "Lecture ready",
        "and_pronta": "«{n}» is ready: transcript and notes (if enabled) are waiting in the app.",
        "pdf_agg": "added by Claude",
        "pdf_dav": "to check",
        "pdf_leg_agg": "In purple, with «added by Claude»: completed by Claude, not said in the lecture and not on the slides.",
        "pdf_leg_dav": "⚠ to check: the program did not find it in the recording (quote, minute or slide).",
        "vr_frase": "sentence not found in the recording: «{f}»",
        "vr_tolta": "the lecturer's sentence was not in the recording: removed",
        "vr_minuto": "minute {m} is not in the recording",
        "vr_slide": "slide {n} does not exist",
        "es_tutta": "The most likely questions of the whole lecture",
        "es_h_tutta": "Ranking for the whole lecture",
        "es_parte1": "part {p}",
        "es_parti": "parts {p}",
        "ch_vuoto": "This lecture has no transcript yet.",
        "ch_mappa_err": "Claude did not prepare the map: try again.",
        "mp_titolo": "Mind map",
        "dc_err": "I can't read this PDF. Try saving it again (Print → Microsoft Print to PDF) and retry.",
        "dc_copia": "(before the lecturer's slides)",
        "pdf_creato": "Created with Verba Manent IA · Punto Web Ferrara",
        "pdf_lingua": "Lecture in {l} · notes in English",
        "tr_intro": ("Recording of a lecture followed online. Each section contains the image of the slide shown "
                     "by the lecturer and, below it, the automatic transcript of what the lecturer said while that "
                     "slide was on screen (with the time from the start of the lecture). "
                     "The transcript may contain recognition errors."),
        "tr_durata": "length",
        "tr_nessuna": "(no words in this stretch)",
        "tr_parte_di": "{e} of the lecture, from {a} to {b}",
        "tr_noimg": "No slide captured",
        "tr_silenzio": "(the lecturer did not speak here, or the audio could not be heard)",
        "tr_nota": "The text is an automatic transcript: some words may be wrong. Tap a slide to enlarge it.",
        "tr_completa": "Full transcript with times",
        "tr_nessuna_breve": "(no words)",
        "anno": "year",
        "es_occhiello": "NOTES · EXAM FORMAT · {e}",
        "es_occhiello_tutti": "NOTES OF THE FULL LECTURE · EXAM FORMAT",
        "es_b_dom": "{n} likely questions",
        "es_b_kw": "{n} keywords",
        "es_b_sim": "mock exam",
        "es_uso": "How to use: start from the ★★★, learn the outline and the keywords (not the text), say it out loud. The mock exam is at the end.",
        "es_h_dom": "Likely exam questions",
        "es_err": "Mistake to avoid: ",
        "es_leg": "★★★ the lecturer stressed it or said so · ★★☆ central topic · ★☆☆ may come up",
        "es_h_kw": "Keywords to keep in mind",
        "es_kw1": "Keyword",
        "es_kw2": "In one line",
        "es_h_sim": "Mock exam",
        "es_deve": "must include: ",
        "es_sim_nota": "Have someone ask you the questions and answer out loud, 2-3 minutes each.",
    },
}


def tr(chiave, lingua=None, **kw):
    """Testo nella lingua indicata (o in quella del programma)."""
    lingua = lingua if lingua in T else LINGUA
    s = T[lingua][chiave] if chiave in T[lingua] else T["it"].get(chiave, chiave)
    return s.format(**kw) if kw else s


def nome_lingua(codice, lingua=None):
    lingua = lingua if lingua in NOMI_LINGUA else LINGUA
    return NOMI_LINGUA[lingua].get(codice or "auto", codice or "")


def lingua_di(info):
    """Lingua dei file di una lezione (le lezioni registrate prima della 3.1 sono in italiano)."""
    return info.get("lingua_appunti") if info.get("lingua_appunti") in T else "it"


def lingua_windows():
    """'it' se Windows e' in italiano, altrimenti 'en'."""
    import sys
    try:
        if sys.platform == "win32":
            import ctypes
            return "it" if (ctypes.windll.kernel32.GetUserDefaultUILanguage() & 0x3FF) == 0x10 else "en"
        import locale
        return "it" if (locale.getlocale()[0] or "").lower().startswith("it") else "en"
    except Exception:
        return "it"
