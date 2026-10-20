/* Guida all'uso, in italiano e in inglese. Ogni capitolo: icona, video (video/<v>-<lingua>.webm), titolo, passi (HTML semplice). */
'use strict';
const GUIDA = {
 "it": {
  "titolo": "Guida",
  "sotto": "Come si usa Verba Manent IA, passo per passo, diviso per argomento. Quasi ogni capitolo ha un video breve.",
  "capitoli": [
   {
    "ico": "spark",
    "t": "Perché Verba Manent IA",
    "perche": true,
    "p": [
     "<b>Per studiare e per lavorare</b>: lezioni, riunioni di lavoro e webinar. Per ognuno prepara la cosa giusta: appunti per studiare, <b>verbale</b> con decisioni e cose da fare, punti chiave.",
     "<b>Nessun bot nella riunione</b>: registra dal tuo PC quello che vedi e senti. Nessun «assistente» entra nella chiamata.",
     "<b>Funziona con tutto</b>: Meet, Teams, Zoom, webinar, <b>anche in aula</b> col microfono del portatile. E c'è anche l'app per il telefono Android.",
     "<b>Hai già la lezione?</b> Un video, un audio, un link (YouTube, Drive, OneDrive…) o la trascrizione già scritta: ne fa gli appunti.",
     "<b>Trascrive sul PC, o in un minuto sul server</b>: sul PC è gratis e l'audio non esce dal computer; col server veloce un'ora di lezione è pronta in circa un minuto, per pochi centesimi.",
     "<b>Sa chi parla</b>: separa le voci da solo e nella trascrizione e nel verbale scrive chi ha detto cosa.",
     "<b>Le slide</b>: le fotografa da sole dallo schermo, oppure usa il PDF del docente, e le mette negli appunti accanto alle parole.",
     "<b>Scrive giusti i termini difficili</b>: per ogni materia gli dai nomi e parole tecniche, e non li sbaglia più.",
     "<b>Tutto in un posto</b>: cerca una parola in tutte le registrazioni, le cose da fare di tutte le riunioni, il calendario. Con la copia nel cloud ritrovi le lezioni anche sul telefono.",
     "<b>Per l'esame</b>: Cornell, Formato Esame, flashcard, «Chiedi alla lezione», la preparazione all'esame su tutto il corso, la simulazione scritta e l'interrogazione a voce corrette da Claude.",
     "<b>Da dare a chi ti fidi</b>: con un invito dai il programma già pronto, con le tue chiavi, senza fargliele vedere.",
     "<b>Due modi di pagare</b>: con la tua chiave di Claude paghi solo quello che usi (circa 0,20 $ per ora registrata). Oppure, prossimamente, con un abbonamento che comprende già Claude e il server veloce, senza chiavi da mettere.",
     "Video, appunti e trascrizioni restano <b>sul tuo PC</b>: sono tuoi."
    ],
    "g": "primi",
    "guida": {
     "frase": "Registri la lezione, ti dà gli appunti e ti accompagna <b>fino all'esame</b>. Tutto resta sul tuo PC e sul tuo telefono.",
     "mom": [
      {
       "n": "1",
       "t": "A lezione",
       "r": [
        {
         "e": "🎙",
         "b": "Online o in aula",
         "x": ": Meet, Teams, Zoom o il microfono del portatile. Nessun bot nella chiamata.",
         "v": "registrare"
        },
        {
         "e": "🖼",
         "b": "Le slide",
         "x": "le fotografa da solo; con il PDF del prof sono più nitide.",
         "v": "docente"
        },
        {
         "e": "📷",
         "b": "Foto alla lavagna",
         "x": ", appunti a mano e aula rumorosa.",
         "v": "foto"
        },
        {
         "e": "⬇",
         "b": "Hai già la lezione?",
         "x": "Video, audio, link o trascrizione.",
         "v": "importa"
        }
       ]
      },
      {
       "n": "2",
       "t": "Dopo la lezione",
       "r": [
        {
         "e": "📄",
         "b": "Appunti",
         "x": "Cornell o Formato Esame, con le slide accanto.",
         "v": "formati"
        },
        {
         "e": "💬",
         "b": "Chiedi alla lezione",
         "x": ", mappa e infografica.",
         "v": "chiedi"
        },
        {
         "e": "🎤",
         "b": "Karaoke e podcast",
         "x": "con la voce vera del prof.",
         "v": "podcast"
        },
        {
         "e": "🃏",
         "b": "Flashcard",
         "x": "della lezione (anche per Anki).",
         "v": "ripasso"
        }
       ]
      },
      {
       "n": "3",
       "t": "Prima dell'esame",
       "r": [
        {
         "e": "🧑‍🏫",
         "b": "Il tuo tutor",
         "x": ": sa quando hai l'esame e cosa fare oggi.",
         "v": "tutor"
        },
        {
         "e": "📅",
         "b": "Ripasso del giorno",
         "x": ", pochi minuti.",
         "v": "rg"
        },
        {
         "e": "☑",
         "b": "Crocette, interrogazione a voce e scritto",
         "x": ", corretti con il voto.",
         "v": "esame"
        },
        {
         "e": "📘",
         "b": "Libro di testo e glossario",
         "x": "della materia.",
         "v": "libro"
        }
       ]
      },
      {
       "n": "✓",
       "t": "Per tutti",
       "r": [
        {
         "e": "⭐",
         "b": "Modalità DSA",
         "x": ": Leggimi, Scrivi parlando, mappe, carattere e sillabe colorate.",
         "v": "dsa"
        },
        {
         "e": "💼",
         "b": "Riunioni e webinar",
         "x": ": verbale con chi fa cosa ed entro quando.",
         "v": "riunioni"
        },
        {
         "e": "🔄",
         "b": "PC e telefono insieme",
         "x": ", sul Wi-Fi o dal tuo Google Drive.",
         "v": "sincronizza"
        },
        {
         "e": "🎁",
         "b": "Da dare a chi ti fidi",
         "x": ": un invito con il programma già pronto.",
         "v": "inviti"
        }
       ]
      }
     ],
     "et": [
      "🔒 Trascrive sul tuo dispositivo, gratis",
      "💶 Con la tua chiave di Claude: circa 0,20 $ per ora",
      "📁 Video e appunti restano tuoi"
     ],
     "vedi": "Vedi ›",
     "torna": "← Torna a «Perché Verba Manent IA»"
    }
   },
   {
    "ico": "set",
    "t": "🚀 Inizia qui: tutto pronto in 3 passi",
    "p": [
     "Al primo avvio, dopo «Prima di iniziare», Verba Manent ti guida in 3 passi. Lo rifai quando vuoi da <b>Impostazioni → 🚀 Inizia qui</b>.",
     "<b>1 · Google</b>: un accesso solo, per tutto. Collega il tuo Google Drive per avere le stesse lezioni su PC, telefono e web, e riconosce se hai l'abbonamento. Puoi saltarlo se usi Verba Manent solo su questo PC.",
     "<b>2 · Claude</b>: se hai l'abbonamento (o sei della famiglia) Claude è già compreso. Altrimenti incolli la tua chiave, con i passi e i link per prenderla: tornando dalla pagina delle chiavi, si incolla da sola.",
     "<b>3 · Telefono e web</b>: il telefono inquadra il QR e riceve da solo lezioni, Drive e password. La <b>password degli zip</b>, con il bottone Copia, serve per Verba Manent sul web (verbamanent.app/studia)."
    ],
    "g": "primi",
    "v": "inizia-qui"
   },
   {
    "ico": "set",
    "t": "La chiave di Claude o un invito",
    "p": [
     "Gli appunti, «Chiedi», le mappe e l'esame li scrive <b>Claude</b>. Serve una chiave, oppure un invito di chi te la presta.",
     "<b>Il modo più facile</b>: <b>Impostazioni → 🚀 Inizia qui</b>. Ti guida in 3 passi (Google, Claude, telefono e web), con i link alle pagine giuste e il bottone <b>📋 Incolla</b>. Se hai l'abbonamento o sei della famiglia, Claude è già compreso: non metti nessuna chiave.",
     "<b>Con la tua chiave</b>: si crea su <b>console.anthropic.com → Chiavi API → Crea chiave</b>. La prima volta metti un po' di credito in <b>Fatturazione</b> (bastano 5 $). Nella finestra della chiave scegli l'<b>Ambito</b> che ti propone (altrimenti il bottone Crea resta grigio) e come <b>Scadenza</b> «Mai». Premi <b>Copia</b>: la chiave inizia con <b>sk-ant-</b> e si vede una volta sola. Poi in <b>Impostazioni → Intelligenza artificiale</b> incollala e tocca <b>Prova e salva</b>. Resta solo su questo PC, protetta da Windows. Costo: circa 0,20 $ per ora registrata.",
     "<b>Con un invito</b>: chi ti invita ti manda un messaggio su WhatsApp. In <b>Impostazioni → Ho un invito</b> incolla tutto il messaggio e tocca <b>Attiva</b>. Le chiavi arrivano già pronte, senza che tu le veda; quello che usi lo paga chi ti ha invitato.",
     "<b>Senza chiave</b>: scegli «Cartella per l'AI che vuoi». Il programma registra e trascrive lo stesso e prepara un file per ogni parte, da portare a Claude, ChatGPT o Gemini."
    ],
    "g": "primi",
    "v": "chiave"
   },
   {
    "ico": "info",
    "v": "aggiornamenti",
    "t": "Aggiornamenti e assistenza",
    "p": [
     "Quando apri il programma e c'è una versione nuova, dopo qualche secondo compare l'avviso <b>«È pronta la versione…»</b> con le novità.",
     "Tocca <b>Aggiorna e riapri</b>: il programma si chiude e si riapre da solo, già aggiornato. Ci vogliono pochi secondi e le registrazioni non si perdono. Con <b>Più tardi</b> l'avviso torna alla prossima apertura.",
     "Mentre registri l'avviso non compare. Puoi cercare gli aggiornamenti anche a mano: in basso a sinistra tocca <b>Aggiorna</b>.",
     "In <b>Informazioni</b> trovi <b>Assistenza</b> (Punto Web Ferrara)."
    ],
    "g": "primi"
   },
   {
    "ico": "rec",
    "v": "registrare",
    "t": "Registrare",
    "p": [
     "<b>Prima di iniziare</b> entra nella lezione o nella riunione (Meet, Teams, Zoom…) e tieni la sua finestra sullo <b>schermo principale</b>, con il volume acceso.",
     "In <b>Registra</b>, sotto «Che cosa registri?», scegli <b>Lezione</b>, <b>Riunione di lavoro</b> o <b>Webinar o corso</b>.",
     "In «Dove si tiene?» scegli <b>Online</b> o <b>In aula</b>. Online sotto compare una riga con <b>Schermo ✓ · Audio del PC ✓ · Slide ✓</b>. In aula compaiono il <b>microfono</b> (scegli quale e guarda le tacche verdi che si muovono) e <b>Slide del docente</b>: se il docente pubblica il PDF, aggiungilo con <b>Scegli il PDF…</b>.",
     "Scrivi il <b>nome</b>, per esempio «Analisi 1 – Limiti»: deve dire cos'è (capitolo «Il nome della registrazione»). Data e ora le aggiunge il programma. Le materie usate di recente compaiono sotto: un tocco e sono già scritte.",
     "Scegli <b>in che lingua si parla</b>. Se non è la lingua del programma, gli appunti arrivano comunque nella tua lingua, con i termini tecnici originali tra parentesi.",
     "Tocca il pulsante rosso <b>REGISTRA</b>. Sotto c'è scritto «Salvo una parte ogni 30 minuti, così non si perde niente». Se te lo chiede, attiva «Non disturbare» di Windows: così i suoni delle notifiche non finiscono nella registrazione.",
     "Se hai collegato il <b>calendario</b>, sopra il nome compare l'impegno di adesso: un tocco e nome e partecipanti sono già scritti (capitolo «Calendario»)."
    ],
    "g": "reg"
   },
   {
    "ico": "edit",
    "t": "Il nome della registrazione",
    "p": [
     "Il nome deve dire cos'è: <b>la materia o l'argomento</b>, per esempio «Chimica – Zuccheri». Nomi come «b», «aaa», «Lezione» o «prova» non vanno bene: compare un avviso grigio e REGISTRA resta spento.",
     "<b>Due registrazioni non possono avere lo stesso nome.</b> Se il nome c'è già, il programma lo dice e propone nomi liberi, per esempio «Analisi 1 – 17/10»: un tocco e lo usi.",
     "Se parte dal calendario con un titolo generico, il programma aggiunge da solo data e ora (per esempio «Lezione – 17/10 19.10»), così la registrazione non si blocca mai.",
     "Per cambiarlo dopo: pagina della lezione → <b>Rinomina</b>. Cambia anche il nome dei file e degli appunti."
    ],
    "g": "reg",
    "v": "nome"
   },
   {
    "ico": "chat",
    "v": "riunioni",
    "t": "Riunioni di lavoro e webinar",
    "p": [
     "Scegli <b>Riunione di lavoro</b>: compaiono <b>Che riunione è?</b> e <b>Chi partecipa</b>.",
     "<b>Che riunione è?</b> Generica, Vendita / cliente, Colloquio di lavoro, Riunione 1 a 1, Consiglio di classe, Assemblea di condominio, Consulenza / visita, oppure <b>✎ Il mio modello</b> (scrivi tu le parti che vuoi). Il verbale avrà le parti giuste: per una vendita obiezioni, prezzo detto, prossimo passo; per un'assemblea delibere e voti. Il programma si ricorda il modello per le riunioni con lo stesso nome.",
     "<b>Chi partecipa</b>: scrivi i nomi e premi Invio. Finiscono giusti nel verbale e servono a dare un nome alle voci.",
     "Alla fine arriva il <b>verbale</b>: in breve, decisioni, <b>cose da fare</b> (chi, entro quando), cosa resta da decidere, prossima riunione, punti discussi e capitoli. Per i <b>webinar</b> arrivano i <b>punti chiave</b>.",
     "<b>Dall'ultima volta</b>: se la riunione ha lo stesso nome di una precedente, all'inizio compare cosa è rimasto aperto. Claude lo sa: se si dice che una cosa è fatta, viene spuntata da sola e il verbale lo scrive.",
     "Nomi, date e cifre li scrive Claude dalla registrazione: <b>controllali sempre</b> prima di mandare il verbale."
    ],
    "g": "reg"
   },
   {
    "ico": "pause",
    "v": "durante",
    "t": "Durante la registrazione",
    "p": [
     "La finestra grande si riduce e compare la <b>mini finestra</b> in basso a destra, sempre in primo piano (non finisce nel video). Si sposta trascinandola dall'alto.",
     "Nella mini finestra il tasto <b>⭐</b> segna il momento come importante, senza scrivere niente.",
     "<b>Le tue note</b> (nella finestra grande): scrivi due parole e premi Invio, oppure tocca <b>⭐ Importante</b>, <b>❓ Da chiarire</b>, <b>✅ Cosa da fare</b>. Ogni nota prende il minuto. Claude le usa: quei punti negli appunti sono più completi e segnati «(tua nota)».",
     "<b>Chiedi adesso</b>: fai una domanda su quello che si è detto finora, per esempio «cosa ha detto 5 minuti fa sui costi?» o «riassumi gli ultimi 10 minuti». Risponde in pochi secondi con il minuto. Circa 1 centesimo a domanda. Funziona meglio con <b>Testo in diretta</b> acceso (Impostazioni).",
     "<b>Pausa</b> durante l'intervallo: non registra niente e il tempo si ferma. <b>Riprendi</b> quando ricomincia.",
     "Le slide vengono fotografate da sole quando cambiano. Ogni 30 minuti (o ogni ora) salva una <b>parte</b>, così non si perde niente; con gli appunti automatici Claude comincia subito a scriverli."
    ],
    "g": "reg"
   },
   {
    "ico": "stop",
    "v": "fine",
    "t": "Fine della registrazione",
    "p": [
     "Tocca <b>Fine</b> nella mini finestra o nella finestra grande e conferma.",
     "Il programma trascrive l'ultima parte, riconosce chi parla, prepara il video e la trascrizione completa. Puoi fare altro, ma <b>non spegnere il PC</b>.",
     "Quando compare «Registrazione salvata!», tocca <b>Apri gli appunti</b>. Li trovi anche nella <b>Cartella delle lezioni</b> (di solito Documenti → Pacchetti per Claude)."
    ],
    "g": "reg"
   },
   {
    "ico": "scr",
    "v": "foto",
    "t": "Foto in aula, appunti a mano e aula rumorosa",
    "p": [
     "<b>📷 Foto alla lavagna</b>: mentre registri tocca «Foto alla lavagna» (sul PC «Aggiungi una foto»). La foto si aggancia al minuto della lezione e Claude legge cosa c'è scritto.",
     "Dopo, nella pagina della lezione, <b>Foto della lezione</b>: vedi la foto, il testo letto e senti il prof proprio in quel momento.",
     "<b>✍ Appunti a mano e fotocopie</b> (pagina della lezione): fotografa i tuoi fogli o le fotocopie; Claude li legge e li aggiunge alla lezione, così finiscono anche in «Chiedi», nel tutor e negli appunti rifatti.",
     "<b>🔇 Aula rumorosa</b>: toglie il rumore di fondo prima di trascrivere. Si accende da solo quando serve; puoi accenderlo tu in Registra. Per una lezione già fatta: pagina della lezione → «Aula rumorosa» → ritrascrivi."
    ],
    "g": "reg"
   },
   {
    "ico": "imp",
    "v": "importa",
    "t": "Importare un video, un audio o un link",
    "p": [
     "In <b>Registra</b>, sotto il pulsante rosso, nel riquadro <b>Hai già un video o un audio della lezione?</b> tocca <b>Importa un video o un audio…</b>.",
     "Scegli <b>Un file sul PC</b> (registrato col telefono, un registratore, una nota vocale, dato dall'università: mp4, mov, mkv, mp3, m4a…) oppure <b>Un link</b>: YouTube, Google Drive, OneDrive, Dropbox, Vimeo, registrazioni di Zoom… I video privati non si scaricano: rendili visibili a chi ha il link.",
     "Il programma mostra durata e peso e propone nome e lingua: correggili se serve. Dì se c'è lo schermo con le slide o è <b>solo audio</b>. Sotto c'è quanto ci mette il tuo PC.",
     "Tocca <b>Importa e prepara gli appunti</b>: copia il file, estrae l'audio, cerca le slide, trascrive e prepara gli appunti. Puoi usare il PC nel frattempo. Il file originale resta dov'è."
    ],
    "g": "gia"
   },
   {
    "ico": "text",
    "t": "Importare una trascrizione (testo o PDF)",
    "p": [
     "Hai già quello che ha detto il docente scritto in un file? In <b>Registra</b>, nel riquadro <b>Hai già la trascrizione della lezione?</b>, tocca <b>Importa un testo…</b>.",
     "Va bene un <b>PDF</b>, un file <b>Word</b> o di <b>testo</b>, anche il «Per Claude» di un'altra registrazione (per esempio una lezione registrata sul telefono).",
     "Il programma mostra quante parole ci sono e quanto costa (pochi centesimi). Scegli il nome, <b>Cornell</b> o <b>Formato Esame</b>, e tocca <b>Crea gli appunti</b>.",
     "Si apre la pagina della registrazione mentre Claude prepara gli appunti; quando sono pronti tocca <b>Apri gli appunti</b>. Serve la chiave di Claude (o un invito)."
    ],
    "g": "gia",
    "v": "itesto"
   },
   {
    "ico": "pdf",
    "t": "Materiali del prof: slide e libro",
    "p": [
     "Nel riquadro <b>📎 Materiali del prof</b> metti i PDF che ti dà il prof. C'è sempre nello stesso posto: nella schermata Registra (sotto la materia, online e in aula) e nella pagina della lezione.",
     "<b>Slide di questa lezione</b>: il PDF delle slide. Il programma le mette negli appunti <b>accanto a quando il prof ne parla</b>. Online le fotografa già dallo schermo: il PDF le rende più nitide.",
     "<b>Libro o dispense</b>: valgono per tutta la materia. Per ogni lezione ti dice le pagine giuste e quello che a lezione non si è detto (capitolo «Libro di testo»).",
     "<b>A lezione finita</b>: nella pagina della lezione, riquadro <b>📎 Materiali del prof</b> → <b>Aggiungi il PDF…</b>. Gli appunti vengono rifatti con le slide (prima ti dice quanto costa); quelli di prima restano come copia.",
     "I PDF restano sul tuo dispositivo: non vanno su internet."
    ],
    "g": "gia",
    "v": "docente"
   },
   {
    "ico": "doc",
    "v": "formati",
    "t": "I formati degli appunti",
    "p": [
     "<b>Cornell</b> (lezioni): domande a sinistra, appunti a destra, riassunto in fondo. Copri la colonna degli appunti e prova a rispondere.",
     "<b>Formato Esame</b> (lezioni): le domande più probabili con le stelle (★★★ = il docente ci ha insistito), lo schema della risposta, le parole chiave e una simulazione d'esame. Con più parti, il PDF completo comincia con la classifica unica delle domande.",
     "<b>Verbale</b> (riunioni) e <b>Punti chiave</b> (webinar): li sceglie il programma in base a cosa registri.",
     "<b>✎ Il mio formato</b>: in Impostazioni scrivi a parole come vuoi gli appunti (o tocca un esempio pronto) e prova il risultato con <b>Prova</b> su una registrazione già fatta.",
     "Il formato si sceglie in <b>Impostazioni</b> e vale per le prossime registrazioni. Su una registrazione già fatta: nella pagina della lezione, <b>＋ Crea anche in…</b>.",
     "Gli appunti li scrive Claude: <b>controllali sempre</b>. Quello che Claude aggiunge di suo è <b>in viola</b> («aggiunto da Claude»); citazioni, minuti e slide che non tornano con la registrazione hanno <b>⚠ da verificare</b>."
    ],
    "g": "studio"
   },
   {
    "ico": "lib",
    "v": "lezione",
    "t": "La pagina della lezione",
    "p": [
     "In «Le mie registrazioni» tocca una lezione: si apre la sua pagina, con tutto in <b>riquadri</b> divisi per gruppi.",
     "<b>Leggi</b>: gli appunti in ogni formato (Cornell, Formato Esame…), Ascolta gli appunti, trascrizione, video. Con «＋ Crea anche in…» aggiungi un altro formato.",
     "<b>Capisci</b>: Chiedi alla lezione, mappa, infografica, capitoli, Karaoke, Podcast, foto della lezione, appunti a mano, libro di testo.",
     "<b>Ripassa</b>: flashcard e, se la lezione ha la materia, Studia. <b>Condividi</b>: email, Word, calendario, spezzoni, chi parla, statistiche.",
     "Sotto ci sono il riquadro <b>📎 Materiali del prof</b> (slide in PDF e libro) e le cose di servizio: rinomina, rifai gli appunti, aula rumorosa, apri la cartella, elimina il video o la lezione.",
     "Se la lezione non ha la materia compare «⚠ Materia mancante»: tocca <b>✎ Metti la materia</b> e la ritrovi in Studia.",
     "In alto c'è sempre <b>← Indietro</b> con il percorso (per esempio «Le mie registrazioni › Fisiologia – Lezione 3»): ogni parte blu ti riporta lì."
    ],
    "g": "studio"
   },
   {
    "ico": "cards",
    "v": "ripasso",
    "t": "Ripassare con le flashcard",
    "p": [
     "Nella pagina della lezione tocca <b>Flashcard</b>, oppure in <b>Studia</b> scegli la materia: le domande di tutte le sue lezioni.",
     "Scegli quali domande: <b>prima quelle da rivedere</b> (consigliato), tutte in ordine sparso, o solo le ★★★ del Formato Esame.",
     "Leggi la domanda e pensa alla risposta. Tocca la carta per girarla: vedi lo schema, la slide e il minuto della lezione. Poi <b>La sapevo</b> o <b>Da rivedere</b> (spazio, ← e →).",
     "Quelle da rivedere tornano per prime la volta dopo. Non costa niente: usa le domande già negli appunti.",
     "<b>⬇ Esporta per Anki</b>: le stesse carte in un file per Anki (PC, Mac, AnkiDroid, iPhone), con la slide e un mazzo per materia. Se esporti di nuovo dopo nuove lezioni, Anki aggiorna le carte senza doppioni e senza perdere i ripassi."
    ],
    "g": "studio"
   },
   {
    "ico": "chat",
    "v": "chiedi",
    "t": "Chiedi, mappa e infografica",
    "p": [
     "<b>Chiedi alla lezione</b> (pagina della lezione): scrivi cosa non hai capito. La risposta usa solo quello che si è detto e indica slide e minuto: tocca il minuto e rivedi quel punto. Se c'è il libro di testo, cita anche la pagina. In Studia chiedi su <b>tutta la materia</b>. Meno di 1 centesimo a domanda.",
     "Puoi anche <b>dettare</b> la domanda con il microfono 🎤.",
     "<b>🗺 La mia mappa</b> (riquadro «Mappa mentale» della lezione): la mappa mentale della lezione, che puoi cambiare. <b>👁 Guarda</b> (tocca 🔊 o una voce per sentirla), <b>✏️ Modifica</b> (tocca una parola per cambiarla; su ogni tema ➕ voce, 🎨 colore, 🗑 togli; ↶ Annulla se sbagli) e <b>🧩 Costruiscila tu</b> (scrivi o detta 🎙 le voci, 💡 Aiuto se sei bloccato). Si salva da sola; «Stampa o PDF» stampa quella che vedi. <b>Infografica</b>: tutta la registrazione in una pagina. Circa 1 centesimo, una volta sola.",
     "<b>Capitoli</b>: l'indice degli argomenti; tocca un argomento e la lezione riparte da lì."
    ],
    "g": "studio"
   },
   {
    "ico": "aud",
    "v": "ascolta",
    "t": "Ascolta gli appunti e Karaoke",
    "p": [
     "<b>🔊 Ascolta gli appunti</b> (pagina della lezione): il programma legge gli appunti ad alta voce e la frase letta si illumina; tocca una frase per ripartire da lì. Scegli la velocità.",
     "<b>🎤 Karaoke della lezione</b>: la voce vera del prof con le parole che si illuminano mentre parla, e accanto la slide di quel momento. Tocca una parola per ripartire da lì.",
     "<b>📏 Una riga alla volta</b> (Karaoke): oscura le altre righe, per non perdere il segno.",
     "Non costa niente: usa la registrazione e gli appunti che hai già."
    ],
    "g": "studio"
   },
   {
    "ico": "aud",
    "v": "podcast",
    "t": "Podcast della lezione",
    "p": [
     "Nella pagina della lezione tocca <b>🎧 Podcast</b>: i punti importanti in <b>8 minuti</b> (Breve) o <b>20</b> (Completo), da ascoltare in autobus o mentre cammini.",
     "Tre stili: <b>Una voce</b> (una voce narrante), <b>Due voci</b> (Giulia fa le domande che faresti tu, Marco spiega) e <b>Dibattito</b> (due idee opposte su un punto della lezione, per diritto, storia, filosofia…).",
     "Nei momenti chiave parla sempre <b>il prof, con la sua voce vera</b> presa dalla registrazione. Le parole che senti si illuminano; tocca un pezzo per ascoltarlo da lì, «Rivedi» apre la lezione a quel minuto.",
     "<b>⬇ Salva in MP3</b> o <b>📤 Manda sul telefono</b>.",
     "Costo: pochi centesimi, una volta sola (Claude scrive solo la scaletta; le voci sono quelle del PC)."
    ],
    "g": "studio"
   },
   {
    "ico": "cards",
    "v": "studia",
    "t": "Studia: la pagina della materia",
    "p": [
     "Nel menu tocca <b>🎓 Studia</b> e scegli la materia in alto: qui c'è tutto quello che serve per l'esame di quella materia, su tutte le sue lezioni.",
     "In cima: <b>Il tuo tutor</b> e il <b>Ripasso del giorno</b>. Poi i <b>giorni all'esame</b> e il piano di oggi (se non hai messo la data, tocca «Metti la data»).",
     "Sotto, in riquadri: domande più probabili, piano di studio, test a crocette, interrogazione a voce, simulazione scritta, flashcard, Chiedi su tutta la materia, glossario, libro di testo, mappa per la verifica. In fondo i tuoi voti.",
     "Le lezioni con gli appunti ma <b>senza materia</b> compaiono in cima con «✎ Metti la materia»: un tocco e passano sotto la materia giusta."
    ],
    "g": "materia"
   },
   {
    "ico": "spark",
    "v": "esame",
    "t": "Preparazione all'esame",
    "p": [
     "In <b>Studia</b> scegli la materia e tocca <b>🎯 Domande più probabili</b>: Claude guarda gli appunti di tutte le lezioni e mette in cima quello che torna più volte o su cui il docente insiste. Tocca una domanda per lo schema della risposta.",
     "<b>Data dell'esame e piano di studio</b>: scegli la data e arriva il piano giorno per giorno (argomenti, ripassi, simulazioni, la domenica riposo). <b>📅 Nel calendario</b> o <b>PDF</b>.",
     "<b>☑ Test a crocette</b>: 10, 20 o 30 domande, la difficoltà e, se vuoi, <b>come all'esame vero</b> (1 minuto a domanda, −0,25 per gli errori). Poi voto e, per ogni errore, perché era sbagliata con lezione e minuto. Le sbagliate vanno nelle flashcard; puoi rifare solo quelle.",
     "<b>🎤 Interrogazione a voce</b>: il docente fa 3 domande, tu rispondi parlando; se manca qualcosa ti fa una domanda in più. Alla fine voto, cosa va bene e cosa manca, e come hai parlato (tempo, «cioè» ed «ehm», pause).",
     "<b>✍ Simulazione scritta</b>: domande nuove su tutto il corso; rispondi senza guardare gli appunti, poi <b>Correggi</b>: punti, voto in trentesimi e cosa ripassare.",
     "Costo: da 1 a pochi centesimi per prova. La voce si trascrive sul PC: a Claude va solo il testo."
    ],
    "g": "materia"
   },
   {
    "ico": "cards",
    "v": "rg",
    "t": "Ripasso del giorno",
    "p": [
     "In <b>Studia</b> (o nello Spazio DSA) tocca <b>🃏 Ripasso del giorno</b>: ogni giorno poche carte scelte fra tutte le lezioni, con materia, lezione e argomento ben visibili.",
     "Le sbagliate tornano il giorno dopo, le sapute dopo 2, 4, 8 giorni… e più spesso quando l'esame è vicino.",
     "Quattro modi: <b>con le carte</b>, <b>a voce</b> (dici la risposta e ti dice le parole chiave dette e mancanti), <b>a crocette</b> (risposte sbagliate nuove ogni settimana) e <b>lampo</b> (5 minuti).",
     "Vedi i giorni di fila e quanto sei pronto per l'esame.",
     "Non costa niente."
    ],
    "g": "materia"
   },
   {
    "ico": "chat",
    "v": "tutor",
    "t": "Il tuo tutor",
    "p": [
     "In <b>Studia</b> tocca <b>🧑‍🏫 Il tuo tutor</b>: sa quando hai l'esame, quanto sei pronto e dove sbagli (test, interrogazioni, ripasso).",
     "Ogni giorno ti dice <b>cosa fare oggi</b>, con i minuti, da spuntare: toccando una cosa si apre lo strumento giusto (per esempio il punto della lezione da riascoltare).",
     "<b>Dove sbagli</b>: gli argomenti con più errori e da dove vengono; le lezioni mai ripassate.",
     "<b>La chat</b>: chiedigli cosa studiare, se ce la fai, di interrogarti. Risponde sapendo tutto questo, con i minuti della lezione e le pagine del libro."
    ],
    "g": "materia"
   },
   {
    "ico": "pdf",
    "v": "libro",
    "t": "Libro di testo",
    "p": [
     "In <b>Studia</b> tocca <b>📘 Libro di testo</b> e aggiungi il PDF del libro o delle dispense (o le foto delle pagine). Lo leggo sul tuo PC: non va su internet.",
     "Per ogni lezione trovi <b>le pagine giuste</b> del libro, con le frasi della lezione evidenziate.",
     "<b>«Nel libro, ma a lezione non si è detto»</b>: le cose del libro che il prof ha saltato, da guardare prima dell'esame.",
     "Il libro compare anche nella pagina della lezione, nelle flashcard, nel glossario e nelle risposte di Chiedi e del tutor («libro p. 42»)."
    ],
    "g": "materia"
   },
   {
    "ico": "abc",
    "v": "glossario",
    "t": "Glossario della materia",
    "p": [
     "In <b>Studia</b> tocca <b>📖 Glossario</b>: tutte le parole difficili delle lezioni, spiegate semplici, con i doppioni uniti da Claude.",
     "Per ogni parola: la slide, la frase vera del prof e <b>▶ Senti il prof</b> dal punto giusto; le parole collegate e le ★ importanti.",
     "Cerca una parola, salva il <b>PDF</b> o tocca <b>🃏 Ripassa le parole</b>.",
     "Costo: circa 1 centesimo, si aggiorna quando arrivano lezioni nuove."
    ],
    "g": "materia"
   },
   {
    "ico": "star",
    "v": "dsa",
    "t": "Modalità DSA",
    "p": [
     "Accendi la <b>Modalità DSA</b> (in alto nella lezione e in Studia, o in Impostazioni): in cima trovi gli strumenti più utili per chi ha un DSA, il resto sotto in «Altro». Appena la accendi il programma passa a uno stile più riposante: sfondo grigio chiaro, carattere Lexend, colore verde petrolio.",
     "<b>Spazio DSA</b> (prima voce del menu, compare quando la Modalità DSA è accesa): scegli materia e lezione e trovi gli strumenti in ordine: in aula, dopo la lezione, per la verifica, per il docente. «Gli strumenti che uso» prepara il foglio per il <b>PDP</b>.",
     "<b>🔊 Leggimi</b> (Spazio DSA): qualsiasi PDF, foto di una pagina o testo copiato letto ad alta voce, con la frase che si illumina; tocca una frase per sentire da lì. Il PDF è gratis, la foto la legge Claude (meno di 1 centesimo). In «Letti di recente» lo riapri dove eri rimasto.",
     "<b>🎙 Scrivi parlando</b> (Spazio DSA): parli e il testo si scrive da solo, anche senza internet. <b>🔊 Rileggimelo</b> te lo fa sentire, <b>✨ Sistema punti e virgole</b> mette solo la punteggiatura, poi <b>📋 Copia</b>.",
     "<b>👓 Come leggo meglio</b>: carattere (Lexend, quello di partenza, Atkinson Hyperlegible, OpenDyslexic), grandezza, spazio, colore dello sfondo (grigio, azzurro, verde, crema, scuro), <b>sillabe colorate</b> e <b>righello di lettura</b>. Vale per appunti, Ascolta, Karaoke, flashcard e PDF. Nello Spazio DSA il pulsante <b>Aa Come leggo</b> cambia al volo sfondo, carattere, grandezza e spazio; «Come all'inizio» torna alle scelte di partenza.",
     "<b>🗺 La mia mappa</b> (Spazio DSA → Mappa della lezione): Guarda e ascolta, Modifica, oppure Costruiscila tu scrivendo o dettando le voci con 🎙 Detta.",
     "<b>🗺 Mappa per la verifica</b> (Studia): un foglio A4 con le parole chiave delle lezioni della verifica e le formule; togli quello che non vuoi, scrivi nome e classe, poi PDF o Stampa (strumento compensativo, L. 170/2010).",
     "Nei test il 30% di tempo in più; domande e risposte si possono ascoltare e dettare a voce."
    ],
    "g": "dsa"
   },
   {
    "ico": "lib",
    "v": "registrazioni",
    "t": "Le mie registrazioni e Cerca in tutto",
    "p": [
     "Qui trovi tutto quello che hai registrato o importato. La copertina ha il colore della materia: stessa materia, stesso colore.",
     "<b>Cerca in tutto</b>: nella casella in alto scrivi un nome, una data <b>o una parola detta</b>. Sopra l'elenco compare «Detto in…»: in quali registrazioni, a che minuto e chi parlava. Tocca una frase e la riascolti da lì. Trova anche se scrivi senza accenti.",
     "Tocca una registrazione per aprire <b>la sua pagina</b>, con tutto in riquadri (capitolo «La pagina della lezione»). Se gli appunti non ci sono ancora c'è <b>Crea appunti</b>: resti qui e vedi la barra che avanza.",
     "<b>☁ nel cloud</b> vuol dire che la copia nel cloud è fatta (capitolo «Copia nel cloud»). Se il PC si è spento mentre preparava i file, tocca <b>Completa</b>."
    ],
    "g": "lez"
   },
   {
    "ico": "chat",
    "v": "chiparla",
    "t": "Chi parla e statistiche",
    "p": [
     "Il programma <b>separa le voci da solo</b>, sul PC: nella trascrizione, negli appunti e nel verbale c'è scritto chi ha detto cosa. La prima volta scarica un modello di 26 MB.",
     "Nelle riunioni e nei webinar Claude <b>propone i nomi</b> guardando i partecipanti e come si chiamano tra loro (✨ = suggerito). Se non è sicuro resta «Voce 3». In aula: chi parla di più è «Docente», gli altri «Domanda».",
     "Nella pagina della lezione tocca <b>Chi parla</b>: vedi la trascrizione con i nomi. Tocca una frase per riascoltarla.",
     "<b>Dai i nomi alle voci…</b>: ascolta un pezzo (▶ Ascolta) e scrivi chi è, oppure tocca uno dei nomi proposti sotto. Salva: trascrizione e file si aggiornano.",
     "<b>Statistiche</b> (da Chi parla o dalla pagina della lezione): durata, persone, domande, cose da fare; quanto ha parlato ciascuno, l'intervento più lungo e quanto è durato ogni argomento.",
     "Per le registrazioni fatte prima: nella pagina della lezione, «Riconosci chi parla». Si spegne in Impostazioni («Riconosci chi parla»). Può sbagliare: i nomi si correggono quando vuoi."
    ],
    "g": "lez"
   },
   {
    "ico": "share",
    "v": "condividi",
    "t": "Condividi, calendario e spezzoni",
    "p": [
     "Nella pagina della lezione tocca <b>Condividi</b> e scegli dove mandare il verbale (o gli appunti).",
     "<b>Email</b>: scrivi gli indirizzi (si ricordano per la prossima volta) e tocca <b>Apri in Outlook / Posta</b> (il PDF e il calendario delle cose da fare sono già allegati) oppure <b>Apri in Gmail</b> (si apre Gmail con tutto scritto: il PDF lo trascini dalla cartella che si apre). Il programma non manda niente da solo: premi Invia tu.",
     "<b>Word</b>: il file .docx da modificare. <b>Google Docs</b>: se sul PC c'è «Google Drive per computer» il file va da solo nel tuo Drive, cartella «Verba Manent IA»; altrimenti lo trascini nella pagina di Drive che si apre.",
     "<b>Cose da fare nel calendario</b>: controlla le date (quelle dette a voce, come «venerdì», sono già calcolate) e tocca <b>Outlook</b> o <b>Google Calendar</b>.",
     "<b>Slack, Teams, Notion, CRM</b>: si collegano una volta sola, con pochi passi spiegati e un indirizzo (o una chiave) da incollare. Con «Manda il riassunto da solo» il verbale parte da solo dopo ogni riunione. Indirizzi e chiavi restano sul PC, protetti.",
     "<b>✂ Spezzone da mandare</b> (pagina della lezione, o ✂ accanto a un capitolo): scegli dal… al… e tocca <b>Video con sottotitoli</b> o <b>Solo audio</b>. Lo trovi nella cartella «Spezzoni»: da lì lo mandi per email o lo trascini in WhatsApp."
    ],
    "g": "lez"
   },
   {
    "ico": "check",
    "v": "cose",
    "t": "Cose da fare",
    "p": [
     "Nel menu a sinistra <b>Cose da fare</b>: tutte le cose da fare uscite dai verbali, con chi, entro quando e da quale riunione. Il numero accanto dice quante sono aperte.",
     "Spunta la casella quando una cosa è fatta. In alto scegli <b>Aperte</b>, <b>Fatte</b> o <b>Tutte</b>, e una persona per vedere solo le sue.",
     "In rosso con ⚠ quelle scadute. Tocca il nome della riunione (▶) per riascoltare il momento in cui se n'è parlato.",
     "Le cose spuntate da sole nella riunione dopo hanno scritto «spuntata dal verbale del…»."
    ],
    "g": "lez"
   },
   {
    "ico": "share",
    "v": "sincronizza",
    "t": "Sincronizza PC e telefono",
    "p": [
     "Le stesse lezioni, gli stessi appunti e lo stesso ripasso sul PC e sul telefono. Si fa una volta sola, in <b>Impostazioni → 🔄 Sincronizza</b>.",
     "<b>Sul PC</b>: «Collega un telefono». Compare un <b>QR</b> con sotto un codice di 6 cifre.",
     "<b>Sul telefono</b>: «Collegati al PC» → <b>📷 Inquadra il QR del PC</b> (oppure scrivi il codice). PC e telefono devono essere sulla stessa rete Wi-Fi o sull'hotspot del telefono.",
     "Da lì in poi si scambiano da soli lezioni, appunti, foto, ripasso e voti, ogni minuto, quando sono sulla stessa rete. Se la stessa cosa cambia su tutti e due, si unisce senza perdere niente; una lezione eliminata da una parte sparisce anche dall'altra.",
     "<b>☁️ Anche fuori casa</b>: accedi con Google Drive e le lezioni passano dal tuo Drive, ognuna in uno <b>zip chiuso con una password</b>. Il telefono collegato col QR riceve accesso e password dal PC. Una lezione finita va nel Drive dopo pochi secondi, e quando apri Verba Manent sull'altro dispositivo la trovi già lì. La stessa password serve anche per <b>Verba Manent sul web</b> (verbamanent.app/studia). Scrivila su un foglio: serve anche se perdi PC e telefono insieme.",
     "In basso a sinistra (PC) vedi sempre «🔄 Sincronizzato 2 min fa». I video non passano, a meno che tu li scelga."
    ],
    "g": "lez"
   },
   {
    "ico": "folder",
    "t": "Copia nel cloud",
    "p": [
     "Le registrazioni restano sul PC. Con la copia nel cloud, appena una lezione è pronta il programma ne mette una copia nella cartella <b>«Verba Manent IA»</b> del tuo cloud, una cartella per ogni lezione: la apri anche dal telefono.",
     "In <b>Impostazioni → Copia nel cloud</b> scegli dove: <b>OneDrive</b> (c'è già su Windows, 5 GB gratis), <b>Google Drive</b> (serve «Google Drive per desktop», 15 GB gratis), <b>Altra cartella…</b> (Dropbox, una chiavetta, un disco esterno) oppure <b>No</b>.",
     "Spunta cosa copiare: <b>Appunti (PDF)</b> e <b>Trascrizione</b> occupano pochissimo; <b>Audio compresso</b> circa 30 MB per ora. Il video non viene copiato.",
     "Tocca una volta <b>Copia anche le lezioni già fatte</b>: da lì in poi le nuove si copiano da sole. Se manca internet il programma riprova da solo ogni 10 minuti.",
     "Dal telefono: apri l'app OneDrive o Google Drive → cartella «Verba Manent IA»."
    ],
    "g": "lez",
    "v": "cloud"
   },
   {
    "ico": "set",
    "v": "impostazioni",
    "t": "Impostazioni essenziali e avanzate",
    "p": [
     "In <b>Impostazioni</b> in alto ci sono le <b>essenziali</b>: lingua, intelligenza artificiale (chiave di Claude o «Ho un invito»), dove trascrivo, formato degli appunti, copia nel cloud, parole difficili e i tuoi dati.",
     "Più sotto, il riquadro <b>Impostazioni avanzate</b> si apre con un tocco: collegamenti (Slack, Teams, Notion, CRM), calendario, privacy, inviti, cartella delle lezioni, ogni quanto salvo una parte, mini finestra, <b>Trascrizione più precisa</b>, <b>Testo in diretta</b>, <b>Riconosci chi parla</b>, «Non disturbare». Il programma si ricorda se l'avevi aperto.",
     "<b>✎ Il mio formato</b>: scrivi a parole come vuoi gli appunti (o tocca un esempio pronto) e provalo con <b>Prova</b> su una registrazione già fatta."
    ],
    "g": "imp"
   },
   {
    "ico": "scr",
    "t": "Dove trascrivo: sul PC o sul server",
    "p": [
     "In <b>Impostazioni → Dove trascrivo</b> ci sono due riquadri. Quello scelto ha il bordo blu e sotto c'è scritto in verde <b>✓ Adesso trascrivo…</b>.",
     "<b>Sul PC</b>: gratis, l'audio non esce dal PC. La trascrizione è pronta un paio di minuti dopo la fine; sotto c'è quanto ci mette il tuo PC.",
     "<b>Sul server (veloce)</b>: un computer potente a noleggio (RunPod, in Europa) trascrive un'ora di lezione in circa un minuto, anche se il PC è lento. Pochi centesimi l'ora. Si collega con un invito, oppure in <b>⚙ Altre opzioni</b> con codice e chiave.",
     "Le righe grigie <b>«Da sapere»</b> dicono i limiti di ognuno. Se manca internet o il server non risponde, il programma trascrive sul PC: la registrazione non si perde mai."
    ],
    "g": "imp",
    "v": "dove"
   },
   {
    "ico": "abc",
    "t": "Parole difficili",
    "p": [
     "Nomi, termini tecnici, il nome del docente: il programma li passa alla trascrizione e a Claude, così li scrivono giusti invece di «indovinarli».",
     "In <b>Impostazioni → Parole difficili</b> scegli la materia, scrivi una parola e premi Invio (o tocca <b>Aggiungi</b>). La × la toglie.",
     "Sotto, <b>«Trovate nei tuoi appunti»</b>: parole proposte dal programma. Toccandone una la aggiungi alla lista.",
     "Valgono per quella materia e <b>dalla prossima registrazione</b>: le lezioni già fatte non cambiano. Esempio: il docente dice «ciclo di Krebs» e la trascrizione scrive «ciclo di crebs»; con «ciclo di Krebs» tra le parole di Biochimica, dalla lezione dopo lo scrive giusto."
    ],
    "g": "imp",
    "v": "parole"
   },
   {
    "ico": "info",
    "v": "calendario",
    "t": "Calendario",
    "p": [
     "In <b>Impostazioni avanzate → Calendario</b> tocca <b>Collega Gmail (Google Calendar)…</b>, <b>Collega Outlook / Hotmail…</b> o <b>Altro calendario (iCloud…)…</b>: segui i passi, copia il link del calendario e incollalo. Il programma legge il calendario, non lo modifica.",
     "Per le lezioni puoi scrivere l'<b>Orario delle lezioni…</b>: giorno, ora, materia, in aula o online.",
     "<b>Quando inizia un impegno</b>: <b>Avvisami</b> (due minuti prima chiede se registrare), <b>Registra da solo</b> (parte da solo, con il nome e i partecipanti) o <b>Niente</b>. Per un impegno solo lo cambi nell'elenco «Prossimi impegni».",
     "Se l'impegno ha il link di Meet, Teams o Zoom, il programma lo apre. Alla fine dell'impegno chiede se fermare la registrazione."
    ],
    "g": "imp"
   },
   {
    "ico": "share",
    "t": "Inviti",
    "p": [
     "Con un invito dai il programma già pronto a qualcuno di cui ti fidi: riceve le tue chiavi <b>senza vederle</b>. Quello che usa lo paghi tu.",
     "Il riquadro <b>Inviti</b> (in Impostazioni avanzate) c'è solo se le chiavi le hai messe tu a mano: chi ha ricevuto un invito non può invitare altri.",
     "Scrivi <b>per chi è</b>, spunta cosa gli dai (<b>la chiave di Claude</b>, <b>il server per trascrivere</b>) e tocca <b>Prepara l'invito</b>. Poi <b>Copia il messaggio</b> e mandalo su WhatsApp.",
     "Chi lo riceve apre il programma → <b>Impostazioni → Ho un invito</b>, incolla tutto il messaggio e tocca <b>Attiva</b>."
    ],
    "g": "imp",
    "v": "inviti"
   },
   {
    "ico": "aud",
    "t": "Se qualcosa non va",
    "p": [
     "<b>«Non sento nessun suono»</b>: controlla che il volume del PC non sia a zero e che l'audio esca dalle casse o dalle cuffie.",
     "<b>In aula le tacche verdi non si muovono</b>: scegli un altro microfono, controlla che non sia spento e in Windows → Impostazioni → Privacy e sicurezza → Microfono lascia usare il microfono alle app.",
     "<b>Gli appunti non arrivano</b>: serve internet; tocca <b>Riprova</b> accanto alla parte. Se manca la chiave, inseriscila in Impostazioni. Se compare «Appunti non creati», manda la foto all'assistenza.",
     "<b>REGISTRA resta spento</b>: guarda la scritta grigia sotto il nome (capitolo «Il nome della registrazione»).",
     "<b>Un link non si scarica</b>: il video è privato o richiede l'accesso. Rendilo visibile a «chiunque abbia il link», oppure scaricalo e usa «Un file sul PC».",
     "<b>Le voci sono sbagliate</b>: in «Chi parla» → «Dai i nomi alle voci…». Con molte persone che parlano insieme può confondersi.",
     "<b>Slack, Teams, Notion o il CRM non ricevono</b>: in Impostazioni avanzate → Condividi e collega tocca «Scollega» e ricollega (il messaggio di prova dice se funziona).",
     "<b>Poco spazio</b>: in «Le mie registrazioni» elimina i video delle registrazioni vecchie (gli appunti restano).",
     "Il file <b>registra_lezione.log</b> nella cartella delle registrazioni racconta cosa è successo: mandalo all'assistenza."
    ],
    "g": "prob"
   }
  ],
  "gruppi": {
   "primi": "Primi passi",
   "reg": "Registrare",
   "gia": "Hai già la lezione?",
   "studio": "Studiare una lezione",
   "materia": "Studiare una materia",
   "dsa": "Per chi ha un DSA",
   "lez": "Le mie registrazioni",
   "imp": "Impostazioni",
   "prob": "Aiuto"
  }
 },
 "en": {
  "titolo": "Guide",
  "sotto": "How to use Verba Manent IA, step by step, by topic. Almost every chapter has a short video.",
  "capitoli": [
   {
    "ico": "spark",
    "t": "Why Verba Manent IA",
    "perche": true,
    "p": [
     "<b>For studying and for work</b>: lectures, work meetings and webinars. For each it prepares the right thing: notes to study, <b>minutes</b> with decisions and to-dos, key points.",
     "<b>No bot in the meeting</b>: it records from your PC what you see and hear. No «assistant» joins the call.",
     "<b>Works with everything</b>: Meet, Teams, Zoom, webinars, <b>also in the classroom</b> with the laptop microphone. And there is also the Android phone app.",
     "<b>Already have the lecture?</b> A video, an audio, a link (YouTube, Drive, OneDrive…) or the transcript already written: it makes the notes.",
     "<b>It transcribes on the PC, or in a minute on the server</b>: on the PC it's free and the audio never leaves the computer; with the fast server an hour of lecture is ready in about a minute, for a few cents.",
     "<b>It knows who is speaking</b>: it separates the voices by itself and writes who said what in the transcript and the minutes.",
     "<b>Slides</b>: it photographs them from the screen by itself, or uses the lecturer's PDF, and puts them in the notes next to the words.",
     "<b>It writes difficult terms correctly</b>: for each subject you give it names and technical words, and it stops getting them wrong.",
     "<b>Everything in one place</b>: search a word in all recordings, the to-dos of all meetings, the calendar. With the cloud copy you find the lectures on the phone too.",
     "<b>For the exam</b>: Cornell, Exam format, flashcards, «Ask the lecture», exam preparation on the whole course, the written mock exam and the oral exam marked by Claude.",
     "<b>To give to people you trust</b>: with an invitation you give the program ready to use, with your keys, without them seeing them.",
     "<b>Two ways to pay</b>: with your own Claude key you only pay for what you use (about 0.20 $ per recorded hour). Or, coming soon, with a subscription that already includes Claude and the fast server, with no keys to enter.",
     "Videos, notes and transcripts stay <b>on your PC</b>: they are yours."
    ],
    "g": "primi",
    "guida": {
     "frase": "You record the lecture, it gives you the notes and takes you <b>all the way to the exam</b>. Everything stays on your PC and your phone.",
     "mom": [
      {
       "n": "1",
       "t": "In class",
       "r": [
        {
         "e": "🎙",
         "b": "Online or in class",
         "x": ": Meet, Teams, Zoom or the laptop microphone. No bot in the call.",
         "v": "registrare"
        },
        {
         "e": "🖼",
         "b": "The slides",
         "x": "captured by itself; with the lecturer's PDF they are sharper.",
         "v": "docente"
        },
        {
         "e": "📷",
         "b": "Board photos",
         "x": ", handwritten notes and noisy classroom.",
         "v": "foto"
        },
        {
         "e": "⬇",
         "b": "Already have the lecture?",
         "x": "Video, audio, link or transcript.",
         "v": "importa"
        }
       ]
      },
      {
       "n": "2",
       "t": "After the lecture",
       "r": [
        {
         "e": "📄",
         "b": "Notes",
         "x": "Cornell or Exam Format, with the slides alongside.",
         "v": "formati"
        },
        {
         "e": "💬",
         "b": "Ask the lecture",
         "x": ", mind map and infographic.",
         "v": "chiedi"
        },
        {
         "e": "🎤",
         "b": "Karaoke and podcast",
         "x": "with the lecturer's real voice.",
         "v": "podcast"
        },
        {
         "e": "🃏",
         "b": "Flashcards",
         "x": "from the lecture (also for Anki).",
         "v": "ripasso"
        }
       ]
      },
      {
       "n": "3",
       "t": "Before the exam",
       "r": [
        {
         "e": "🧑‍🏫",
         "b": "Your tutor",
         "x": ": it knows when your exam is and what to do today.",
         "v": "tutor"
        },
        {
         "e": "📅",
         "b": "Daily review",
         "x": ", a few minutes.",
         "v": "rg"
        },
        {
         "e": "☑",
         "b": "Multiple choice, oral and written exam",
         "x": ", marked with a grade.",
         "v": "esame"
        },
        {
         "e": "📘",
         "b": "Textbook and glossary",
         "x": "for the subject.",
         "v": "libro"
        }
       ]
      },
      {
       "n": "✓",
       "t": "For everyone",
       "r": [
        {
         "e": "⭐",
         "b": "Dyslexia mode",
         "x": ": Read to me, write by speaking, maps, font and coloured syllables.",
         "v": "dsa"
        },
        {
         "e": "💼",
         "b": "Meetings and webinars",
         "x": ": minutes with who does what and by when.",
         "v": "riunioni"
        },
        {
         "e": "🔄",
         "b": "PC and phone together",
         "x": ", over Wi-Fi or through your Google Drive.",
         "v": "sincronizza"
        },
        {
         "e": "🎁",
         "b": "For people you trust",
         "x": ": an invite with the program ready to go.",
         "v": "inviti"
        }
       ]
      }
     ],
     "et": [
      "🔒 Transcribes on your device, free",
      "💶 With your own Claude key: about $0.20 per hour",
      "📁 Videos and notes stay yours"
     ],
     "vedi": "See ›",
     "torna": "← Back to «Why Verba Manent IA»"
    }
   },
   {
    "ico": "set",
    "t": "🚀 Start here: ready in 3 steps",
    "p": [
     "At the first start, after «Before you start», Verba Manent guides you in 3 steps. Do it again anytime from <b>Settings → 🚀 Start here</b>.",
     "<b>1 · Google</b>: one sign-in, for everything. It connects your Google Drive so you have the same lectures on PC, phone and web, and it recognises your subscription. You can skip it if you only use Verba Manent on this PC.",
     "<b>2 · Claude</b>: with a subscription (or as family) Claude is already included. Otherwise you paste your own key, with the steps and links to get it: when you come back from the keys page, it pastes itself.",
     "<b>3 · Phone and web</b>: the phone scans the QR and gets lectures, Drive and password by itself. The <b>zip password</b>, with its Copy button, opens Verba Manent on the web (verbamanent.app/studia)."
    ],
    "g": "primi",
    "v": "inizia-qui"
   },
   {
    "ico": "set",
    "t": "The Claude key or an invitation",
    "p": [
     "Notes, «Ask», maps and the exam are written by <b>Claude</b>. You need a key, or an invitation from someone who lends you theirs.",
     "<b>The easiest way</b>: <b>Settings → 🚀 Start here</b>. It guides you in 3 steps (Google, Claude, phone and web), with links to the right pages and a <b>📋 Paste</b> button. If you have a subscription or are family, Claude is already included: no key needed.",
     "<b>With your own key</b>: create it on <b>console.anthropic.com → API keys → Create Key</b>. The first time add some credit under <b>Billing</b> ($5 is enough). In the key window choose the <b>Workspace</b> offered (otherwise the Create button stays grey) and «Never» as <b>Expiry</b>. Press <b>Copy</b>: the key starts with <b>sk-ant-</b> and is shown only once. Then in <b>Settings → Artificial intelligence</b> paste it and tap <b>Test and save</b>. It stays only on this PC, protected by Windows. Cost: about 0.20 $ per recorded hour.",
     "<b>With an invitation</b>: whoever invites you sends you a WhatsApp message. In <b>Settings → I have an invitation</b> paste the whole message and tap <b>Activate</b>. The keys arrive ready, without you seeing them; what you use is paid by whoever invited you.",
     "<b>Without a key</b>: choose «Folder for the AI of your choice». The program still records and transcribes and prepares a file for each part, to take to Claude, ChatGPT or Gemini."
    ],
    "g": "primi",
    "v": "chiave"
   },
   {
    "ico": "info",
    "v": "aggiornamenti",
    "t": "Updates and support",
    "p": [
     "When you open the program and a new version is out, after a few seconds the notice <b>«Version … is ready»</b> appears with what's new.",
     "Tap <b>Update and reopen</b>: the program closes and reopens by itself, already updated. It takes a few seconds and recordings are not lost. With <b>Later</b> the notice comes back the next time you open it.",
     "The notice does not appear while you are recording. You can also look for updates by hand: tap <b>Update</b> at the bottom left.",
     "In <b>About</b> you find <b>Support</b> (Punto Web Ferrara)."
    ],
    "g": "primi"
   },
   {
    "ico": "rec",
    "v": "registrare",
    "t": "Recording",
    "p": [
     "<b>Before you start</b> join the lecture or meeting (Meet, Teams, Zoom…) and keep its window on the <b>main screen</b>, with the volume on.",
     "In <b>Record</b>, under «What are you recording?», choose <b>Lecture</b>, <b>Work meeting</b> or <b>Webinar or course</b>.",
     "In «Where is it held?» choose <b>Online</b> or <b>In class</b>. Online, a line with <b>Screen ✓ · PC audio ✓ · Slides ✓</b> appears below. In class, the <b>microphone</b> appears (choose which one and watch the green bars move) and <b>Lecturer's slides</b>: if the lecturer publishes the PDF, add it with <b>Choose the PDF…</b>.",
     "Type the <b>name</b>, for example «Calculus 1 – Limits»: it must say what it is (chapter «The recording's name»). Date and time are added by the program. Recently used subjects appear below: one tap and they are typed.",
     "Choose <b>which language is spoken</b>. If it is not the program's language, the notes still arrive in your language, with the original technical terms in brackets.",
     "Tap the red <b>RECORD</b> button. Below it says «I save a part every 30 minutes, so nothing gets lost». If asked, turn on Windows «Do not disturb»: notification sounds won't end up in the recording.",
     "If you connected the <b>calendar</b>, the current event appears above the name: one tap and name and participants are filled in (chapter «Calendar»)."
    ],
    "g": "reg"
   },
   {
    "ico": "edit",
    "t": "The recording's name",
    "p": [
     "The name must say what it is: <b>the subject or the topic</b>, for example «Chemistry – Sugars». Names like «b», «aaa», «Lecture» or «test» are not accepted: a grey notice appears and RECORD stays off.",
     "<b>Two recordings cannot have the same name.</b> If the name is taken, the program says so and suggests free names, for example «Calculus 1 – 17/10»: one tap and you use it.",
     "If it starts from the calendar with a generic title, the program adds date and time by itself (for example «Lecture – 17/10 19.10»), so the recording never gets stuck.",
     "To change it later: lecture page → <b>Rename</b>. It also renames the files and the notes."
    ],
    "g": "reg",
    "v": "nome"
   },
   {
    "ico": "chat",
    "v": "riunioni",
    "t": "Work meetings and webinars",
    "p": [
     "Choose <b>Work meeting</b>: <b>What kind of meeting?</b> and <b>Participants</b> appear.",
     "<b>What kind of meeting?</b> General, Sales / customer, Job interview, 1-to-1 meeting, Class council, Condominium meeting, Consultation / visit, or <b>✎ My template</b> (you write the parts you want). The minutes get the right parts: for a sale objections, price said, next step; for a condominium meeting resolutions and votes. The program remembers the template for meetings with the same name.",
     "<b>Participants</b>: type the names and press Enter. They come out right in the minutes and help name the voices.",
     "At the end you get the <b>minutes</b>: summary, decisions, <b>action items</b> (who, by when), open points, next meeting, topics discussed and chapters. <b>Webinars</b> get <b>key points</b>.",
     "<b>Since last time</b>: if the meeting has the same name as a previous one, what is still open appears at the start. Claude knows it: if someone says a task is done, it is ticked by itself and the minutes say so.",
     "Names, dates and figures are written by Claude from the recording: <b>always check them</b> before sending the minutes."
    ],
    "g": "reg"
   },
   {
    "ico": "pause",
    "v": "durante",
    "t": "While recording",
    "p": [
     "The main window minimises and the <b>mini window</b> appears at the bottom right, always on top (it does not end up in the video). Drag it from the top to move it.",
     "In the mini window the <b>⭐</b> button marks the moment as important, without typing.",
     "<b>Your notes</b> (in the main window): type a couple of words and press Enter, or tap <b>⭐ Important</b>, <b>❓ To clarify</b>, <b>✅ To-do</b>. Each note takes the minute. Claude uses them: those points are more complete in the notes and marked «(your note)».",
     "<b>Ask now</b>: ask about what has been said so far, e.g. «what did they say about costs 5 minutes ago?» or «summarise the last 10 minutes». It answers in a few seconds with the minute. About 1 cent per question. It works best with <b>Live text</b> on (Settings).",
     "<b>Pause</b> during the break: nothing is recorded and the clock stops. <b>Resume</b> when it restarts.",
     "Slides are captured automatically when they change. Every 30 minutes (or every hour) a <b>part</b> is saved, so nothing gets lost; with automatic notes Claude starts writing them straight away."
    ],
    "g": "reg"
   },
   {
    "ico": "stop",
    "v": "fine",
    "t": "End of the recording",
    "p": [
     "Tap <b>Stop</b> in the mini window or in the main window and confirm.",
     "The program transcribes the last part, recognises who is speaking, prepares the video and the full transcript. You can do something else, but <b>don't turn the PC off</b>.",
     "When «Recording saved!» appears, tap <b>Open the notes</b>. You also find them in the <b>Lectures folder</b> (usually Documents → Packages for Claude)."
    ],
    "g": "reg"
   },
   {
    "ico": "scr",
    "v": "foto",
    "t": "Classroom photos, handwritten notes and noisy rooms",
    "p": [
     "<b>📷 Photo of the board</b>: while recording tap «Photo of the board» (on the PC «Add a photo»). The photo is linked to the minute of the lecture and Claude reads what's written.",
     "Later, on the lecture page, <b>Lecture photos</b>: see the photo, the text that was read and hear the lecturer at that very moment.",
     "<b>✍ Handwritten notes and photocopies</b> (lecture page): photograph your sheets or photocopies; Claude reads them and adds them to the lecture, so they also end up in «Ask», the tutor and redone notes.",
     "<b>🔇 Noisy classroom</b>: removes background noise before transcribing. It switches on by itself when needed; you can turn it on in Record. For a lecture already done: lecture page → «Noisy classroom» → transcribe again."
    ],
    "g": "reg"
   },
   {
    "ico": "imp",
    "v": "importa",
    "t": "Importing a video, an audio or a link",
    "p": [
     "In <b>Record</b>, below the red button, in the box <b>Already have a video or audio of the lecture?</b> tap <b>Import a video or audio…</b>.",
     "Choose <b>A file on the PC</b> (recorded with the phone, a recorder, a voice note, given by the university: mp4, mov, mkv, mp3, m4a…) or <b>A link</b>: YouTube, Google Drive, OneDrive, Dropbox, Vimeo, Zoom recordings… Private videos cannot be downloaded: make them visible to anyone with the link.",
     "The program shows length and size and suggests name and language: fix them if needed. Say whether the screen with slides is there or it is <b>audio only</b>. Below it says how long your PC takes.",
     "Tap <b>Import and prepare the notes</b>: it copies the file, extracts the audio, looks for slides, transcribes and prepares the notes. You can use the PC meanwhile. The original file stays where it is."
    ],
    "g": "gia"
   },
   {
    "ico": "text",
    "t": "Importing a transcript (text or PDF)",
    "p": [
     "Already have what the lecturer said written in a file? In <b>Record</b>, in the box <b>Already have the lecture's transcript?</b>, tap <b>Import a text…</b>.",
     "A <b>PDF</b>, a <b>Word</b> or a <b>text</b> file is fine, even the «Per Claude» file of another recording (for example a lecture recorded on the phone).",
     "The program shows how many words there are and the cost (a few cents). Choose the name, <b>Cornell</b> or <b>Exam format</b>, and tap <b>Create the notes</b>.",
     "The recording's page opens while Claude prepares the notes; when they are ready tap <b>Open the notes</b>. You need the Claude key (or an invitation)."
    ],
    "g": "gia",
    "v": "itesto"
   },
   {
    "ico": "pdf",
    "t": "Lecturer's materials: slides and textbook",
    "p": [
     "In the <b>📎 Lecturer's materials</b> box you put the PDFs the lecturer gives you. It's always in the same place: on the Record screen (under the subject, online and in class) and on the lecture page.",
     "<b>Slides for this lecture</b>: the slides PDF. The program puts them in the notes <b>next to when the lecturer talks about them</b>. Online it already captures them from the screen: the PDF makes them sharper.",
     "<b>Textbook or handouts</b>: they apply to the whole subject. For each lecture it tells you the right pages and what wasn't said in class (chapter «Textbook»).",
     "<b>After the lecture</b>: on the lecture page, <b>📎 Lecturer's materials</b> box → <b>Add the PDF…</b>. The notes are redone with the slides (it tells you the cost first); the previous ones stay as a copy.",
     "The PDFs stay on your device: they don't go online."
    ],
    "g": "gia",
    "v": "docente"
   },
   {
    "ico": "doc",
    "v": "formati",
    "t": "Note formats",
    "p": [
     "<b>Cornell</b> (lectures): questions on the left, notes on the right, summary at the bottom. Cover the notes column and try to answer.",
     "<b>Exam format</b> (lectures): the most likely questions with stars (★★★ = the lecturer stressed it), the answer outline, keywords and a mock exam. With several parts, the full PDF starts with a single ranking of the questions.",
     "<b>Minutes</b> (meetings) and <b>Key points</b> (webinars): chosen by the program from what you record.",
     "<b>✎ My format</b>: in Settings describe in your own words how you want the notes (or tap a ready example) and test it with <b>Try it</b> on a finished recording.",
     "Choose the format in <b>Settings</b>: it applies to the next recordings. For a finished recording: on the lecture page, <b>＋ Also create in…</b>.",
     "Claude writes the notes: <b>always check them</b>. What Claude adds on its own is <b>in purple</b> («added by Claude»); quotes, minutes and slides that don't match the recording show <b>⚠ to check</b>."
    ],
    "g": "studio"
   },
   {
    "ico": "lib",
    "v": "lezione",
    "t": "The lecture page",
    "p": [
     "In «My recordings» tap a lecture: its page opens, with everything in <b>tiles</b> grouped by purpose.",
     "<b>Read</b>: the notes in every format (Cornell, Exam format…), Listen to the notes, transcript, video. With «＋ Also create in…» you add another format.",
     "<b>Understand</b>: Ask the lecture, map, infographic, chapters, Karaoke, Podcast, lecture photos, handwritten notes, textbook.",
     "<b>Review</b>: flashcards and, if the lecture has a course, Study. <b>Share</b>: email, Word, calendar, clips, who's speaking, statistics.",
     "Below are the <b>📎 Lecturer's materials</b> box (slides PDF and textbook) and the housekeeping items: rename, redo the notes, noisy classroom, open the folder, delete the video or the lecture.",
     "If the lecture has no course you see «⚠ No subject»: tap <b>✎ Add the subject</b> and you'll find it in Study.",
     "At the top there's always <b>← Back</b> with the path (for example «My recordings › Physiology – Lecture 3»): each blue part takes you back there."
    ],
    "g": "studio"
   },
   {
    "ico": "cards",
    "v": "ripasso",
    "t": "Reviewing with flashcards",
    "p": [
     "On the lecture page tap <b>Flashcards</b>, or in <b>Study</b> choose the course: the questions of all its lectures.",
     "Choose which questions: <b>the ones to review first</b> (recommended), all shuffled, or only the ★★★ of the Exam format.",
     "Read the question and think of the answer. Tap the card to flip it: you see the outline, the slide and the minute of the lecture. Then <b>I knew it</b> or <b>To review</b> (space, ← and →).",
     "The ones to review come first next time. It costs nothing: it uses the questions already in the notes.",
     "<b>⬇ Export for Anki</b>: the same cards in a file for Anki (PC, Mac, AnkiDroid, iPhone), with the slide and one deck per course. If you export again after new lectures, Anki updates the cards with no duplicates and without losing your reviews."
    ],
    "g": "studio"
   },
   {
    "ico": "chat",
    "v": "chiedi",
    "t": "Ask, map and infographic",
    "p": [
     "<b>Ask the lecture</b> (lecture page): write what you didn't understand. The answer only uses what was said and shows slide and minute: tap the minute to see that point again. If there's a textbook, it also quotes the page. In Study you ask about <b>the whole course</b>. Less than 1 cent per question.",
     "You can also <b>dictate</b> the question with the 🎤 microphone.",
     "<b>🗺 My map</b> (the «Mind map» tile on the lecture page): the lecture's mind map, which you can change. <b>👁 View</b> (tap 🔊 or an item to hear it), <b>✏️ Edit</b> (tap a word to change it; on each topic ➕ item, 🎨 colour, 🗑 remove; ↶ Undo if you slip) and <b>🧩 Build it yourself</b> (write or dictate 🎙 the items, 💡 Help if you are stuck). It saves itself; «Print or PDF» prints what you see. <b>Infographic</b>: the whole recording on one page. About 1 cent, only once.",
     "<b>Chapters</b>: the index of topics; tap a topic and the lecture restarts from there."
    ],
    "g": "studio"
   },
   {
    "ico": "aud",
    "v": "ascolta",
    "t": "Listen to the notes and Karaoke",
    "p": [
     "<b>🔊 Listen to the notes</b> (lecture page): the program reads the notes aloud and the sentence being read lights up; tap a sentence to restart from there. Choose the speed.",
     "<b>🎤 Lecture karaoke</b>: the lecturer's real voice with the words lighting up as they speak, and next to it the slide of that moment. Tap a word to restart from there.",
     "<b>📏 One line at a time</b> (Karaoke): darkens the other lines, so you don't lose your place.",
     "It costs nothing: it uses the recording and notes you already have."
    ],
    "g": "studio"
   },
   {
    "ico": "aud",
    "v": "podcast",
    "t": "Lecture podcast",
    "p": [
     "On the lecture page tap <b>🎧 Podcast</b>: the key points in <b>8 minutes</b> (Short) or <b>20</b> (Full), to listen to on the bus or while walking.",
     "Three styles: <b>One voice</b> (a narrator), <b>Two voices</b> (Emma asks the questions you'd ask, Jack explains) and <b>Debate</b> (two opposite ideas on a point of the lecture, for law, history, philosophy…).",
     "At the key moments it's always <b>the lecturer, with their real voice</b> from the recording. The words you hear light up; tap a piece to listen from there, «Review» opens the lecture at that minute.",
     "<b>⬇ Save as MP3</b> or <b>📤 Send to the phone</b>.",
     "Cost: a few cents, only once (Claude only writes the running order; the voices are the PC's)."
    ],
    "g": "studio"
   },
   {
    "ico": "cards",
    "v": "studia",
    "t": "Study: the course page",
    "p": [
     "In the menu tap <b>🎓 Study</b> and choose the course at the top: here is everything you need for that course's exam, across all its lectures.",
     "At the top: <b>Your tutor</b> and the <b>Daily review</b>. Then the <b>days to the exam</b> and today's plan (if you haven't set the date, tap «Set the date»).",
     "Below, in tiles: most likely questions, study plan, multiple-choice test, oral exam, written mock exam, flashcards, Ask about the whole course, glossary, textbook, test map. At the bottom your marks.",
     "Lectures with notes but <b>no course</b> appear at the top with «✎ Add the course»: one tap and they move under the right course."
    ],
    "g": "materia"
   },
   {
    "ico": "spark",
    "v": "esame",
    "t": "Exam preparation",
    "p": [
     "In <b>Study</b> choose the course and tap <b>🎯 Most likely questions</b>: Claude reads the notes of all lectures and puts at the top what comes up most or what the lecturer stresses. Tap a question for the answer outline.",
     "<b>Exam date and study plan</b>: pick the date and you get a day-by-day plan (topics, reviews, mock exams, Sunday off). <b>📅 To the calendar</b> or <b>PDF</b>.",
     "<b>☑ Multiple-choice test</b>: 10, 20 or 30 questions, the difficulty and, if you like, <b>like the real exam</b> (1 minute per question, −0.25 per mistake). Then a mark and, for each mistake, why it was wrong with lecture and minute. Wrong ones go to the flashcards; you can redo just those.",
     "<b>🎤 Oral exam</b>: the lecturer asks 3 questions, you answer by speaking; if something is missing you get a follow-up question. At the end a mark, what's good and what's missing, and how you spoke (time, «like» and «um», pauses).",
     "<b>✍ Written mock exam</b>: new questions on the whole course; answer without looking at the notes, then <b>Correct</b>: points, mark out of 30 and what to review.",
     "Cost: from 1 to a few cents per attempt. Your voice is transcribed on the PC: only the text goes to Claude."
    ],
    "g": "materia"
   },
   {
    "ico": "cards",
    "v": "rg",
    "t": "Daily review",
    "p": [
     "In <b>Study</b> (or the DSA space) tap <b>🃏 Daily review</b>: a few cards a day chosen from all lectures, with course, lecture and topic clearly shown.",
     "Wrong ones come back the next day, known ones after 2, 4, 8 days… and more often as the exam gets closer.",
     "Four ways: <b>with cards</b>, <b>by voice</b> (say the answer and it tells you the keywords you said and missed), <b>multiple choice</b> (new wrong answers every week) and <b>quick</b> (5 minutes).",
     "You see your streak and how ready you are for the exam.",
     "It costs nothing."
    ],
    "g": "materia"
   },
   {
    "ico": "chat",
    "v": "tutor",
    "t": "Your tutor",
    "p": [
     "In <b>Study</b> tap <b>🧑‍🏫 Your tutor</b>: it knows when your exam is, how ready you are and where you make mistakes (tests, oral exams, reviews).",
     "Every day it tells you <b>what to do today</b>, with the minutes, to tick off: tapping an item opens the right tool (for example the point of the lecture to listen to again).",
     "<b>Where you go wrong</b>: the topics with the most mistakes and where they come from; lectures never reviewed.",
     "<b>The chat</b>: ask it what to study, whether you'll make it, to quiz you. It answers knowing all this, with lecture minutes and textbook pages."
    ],
    "g": "materia"
   },
   {
    "ico": "pdf",
    "v": "libro",
    "t": "Textbook",
    "p": [
     "In <b>Study</b> tap <b>📘 Textbook</b> and add the PDF of the book or handouts (or photos of the pages). It's read on your PC: it doesn't go online.",
     "For each lecture you find <b>the right pages</b> of the book, with the lecture's sentences highlighted.",
     "<b>«In the book, but not said in class»</b>: what the lecturer skipped, to check before the exam.",
     "The book also shows on the lecture page, in flashcards, in the glossary and in the answers of Ask and the tutor («book p. 42»)."
    ],
    "g": "materia"
   },
   {
    "ico": "abc",
    "v": "glossario",
    "t": "Course glossary",
    "p": [
     "In <b>Study</b> tap <b>📖 Glossary</b>: all the difficult words of the lectures, explained simply, with duplicates merged by Claude.",
     "For each word: the slide, the lecturer's real sentence and <b>▶ Hear the lecturer</b> from the right point; related words and ★ important ones.",
     "Search a word, save the <b>PDF</b> or tap <b>🃏 Review the words</b>.",
     "Cost: about 1 cent; it updates when new lectures arrive."
    ],
    "g": "materia"
   },
   {
    "ico": "star",
    "v": "dsa",
    "t": "Dyslexia mode",
    "p": [
     "Turn on <b>Dyslexia mode</b> (at the top of the lecture and in Study, or in Settings): the most useful tools for dyslexic students come first, the rest below in «More». As soon as you turn it on, the program switches to a calmer look: light grey background, Lexend font, teal accent.",
     "<b>DSA space</b> (first menu item, shown when Dyslexia mode is on): choose course and lecture and find the tools in order: in class, after the lecture, for the test, for the teacher. «The tools I use» prepares the sheet for the learning plan (<b>PDP</b>).",
     "<b>🔊 Read to me</b> (DSA space): any PDF, photo of a page or copied text read aloud, with the sentence lighting up; tap a sentence to listen from there. PDFs are free, photos are read by Claude (less than 1 cent). «Recently read» reopens it where you left off.",
     "<b>🎙 Write by speaking</b> (DSA space): you speak and the text writes itself, even offline. <b>🔊 Read it back</b> lets you hear it, <b>✨ Fix full stops and commas</b> only adds punctuation, then <b>📋 Copy</b>.",
     "<b>👓 How I read best</b>: font (Lexend, the default, Atkinson Hyperlegible, OpenDyslexic), size, spacing, background colour (grey, blue, green, cream, dark), <b>coloured syllables</b> and <b>reading ruler</b>. It applies to notes, Listen, Karaoke, flashcards and PDFs. In the DSA space the <b>Aa How I read</b> button changes background, font, size and spacing on the spot; «Back to default» restores the starting choices.",
     "<b>🗺 My map</b> (DSA space → Lecture map): View and listen, Edit, or Build it yourself by typing or dictating the items with 🎙 Dictate.",
     "<b>🗺 Test map</b> (Study): an A4 sheet with the keywords of the lectures in the test and the formulas; remove what you don't want, write name and class, then PDF or Print (compensatory tool, Italian law 170/2010).",
     "Tests give 30% more time; questions and answers can be listened to and dictated by voice."
    ],
    "g": "dsa"
   },
   {
    "ico": "lib",
    "v": "registrazioni",
    "t": "My recordings and Search everything",
    "p": [
     "Here you find everything you recorded or imported. The cover has the subject's colour: same subject, same colour.",
     "<b>Search everything</b>: in the box at the top type a name, a date <b>or a word that was said</b>. «Said in…» appears above the list: in which recordings, at which minute and who was speaking. Tap a sentence to hear it again from there. It also finds words typed without accents.",
     "Tap a recording to open <b>its page</b>, with everything in tiles (chapter «The lecture page»). If the notes aren't there yet there's <b>Create notes</b>: you stay here and see the progress bar.",
     "<b>☁ in the cloud</b> means the cloud copy is done (chapter «Copy to the cloud»). If the PC turned off while preparing the files, tap <b>Complete</b>."
    ],
    "g": "lez"
   },
   {
    "ico": "chat",
    "v": "chiparla",
    "t": "Who is speaking and statistics",
    "p": [
     "The program <b>separates the voices by itself</b>, on the PC: the transcript, notes and minutes say who said what. The first time it downloads a 26 MB model.",
     "In meetings and webinars Claude <b>suggests the names</b> from the participants and how they call each other (✨ = suggested). If unsure it stays «Voice 3». In class: whoever speaks most is «Teacher», the others «Question».",
     "On the lecture page tap <b>Who speaks</b>: you see the transcript with the names. Tap a sentence to hear it again.",
     "<b>Name the voices…</b>: listen to a piece (▶ Listen) and type who it is, or tap one of the names below. Save: transcript and files are updated.",
     "<b>Statistics</b> (from Who is speaking or the lecture page): length, people, questions, to-dos; how much each person spoke, the longest turn and how long each topic took.",
     "For older recordings: lecture page → «Recognise who is speaking». Turn it off in Settings («Recognise who is speaking»). It can make mistakes: fix the names whenever you like."
    ],
    "g": "lez"
   },
   {
    "ico": "share",
    "v": "condividi",
    "t": "Share, calendar and clips",
    "p": [
     "On the lecture page tap <b>Share</b> and choose where to send the minutes (or the notes).",
     "<b>Email</b>: type the addresses (remembered for next time) and tap <b>Open in Outlook / Mail</b> (the PDF and the to-do calendar are already attached) or <b>Open in Gmail</b> (Gmail opens with everything filled in: drag the PDF from the folder that opens). The program never sends by itself: you press Send.",
     "<b>Word</b>: the .docx file to edit. <b>Google Docs</b>: if «Google Drive for desktop» is on the PC the file goes into your Drive by itself, folder «Verba Manent IA»; otherwise drag it onto the Drive page that opens.",
     "<b>To-dos in the calendar</b>: check the dates (spoken ones like «Friday» are already worked out) and tap <b>Outlook</b> or <b>Google Calendar</b>.",
     "<b>Slack, Teams, Notion, CRM</b>: connected once, with a few explained steps and an address (or key) to paste. With «Send the summary by itself» the minutes go out after each meeting. Addresses and keys stay on the PC, protected.",
     "<b>✂ Clip to send</b> (lecture page, or ✂ next to a chapter): choose from… to… and tap <b>Video with subtitles</b> or <b>Audio only</b>. You find it in the «Clips» folder: send it by email or drag it into WhatsApp."
    ],
    "g": "lez"
   },
   {
    "ico": "check",
    "v": "cose",
    "t": "To-dos",
    "p": [
     "In the left menu <b>To-dos</b>: all the action items from the minutes, with who, by when and from which meeting. The number next to it says how many are open.",
     "Tick the box when something is done. At the top choose <b>Open</b>, <b>Done</b> or <b>All</b>, and a person to see only theirs.",
     "Overdue ones are red with ⚠. Tap the meeting name (▶) to hear the moment it was discussed.",
     "Items ticked by themselves in the following meeting say «ticked by the minutes of…»."
    ],
    "g": "lez"
   },
   {
    "ico": "share",
    "v": "sincronizza",
    "t": "Sync PC and phone",
    "p": [
     "The same lectures, notes and reviews on PC and phone. You set it up once, in <b>Settings → 🔄 Sync</b>.",
     "<b>On the PC</b>: «Link a phone». A <b>QR code</b> appears with a 6-digit code under it.",
     "<b>On the phone</b>: «Link to PC» → <b>📷 Scan the PC's QR code</b> (or type the code). PC and phone must be on the same Wi-Fi or the phone's hotspot.",
     "From then on they exchange lectures, notes, photos, reviews and marks by themselves, every minute, when they're on the same network. If the same thing changes on both, it's merged without losing anything; a lecture deleted on one side disappears on the other too.",
     "<b>☁️ Away from home too</b>: sign in with Google Drive and lectures go through your Drive, each in a <b>password-locked zip</b>. The phone linked with the QR gets access and password from the PC. A finished lecture goes to Drive within seconds, and when you open Verba Manent on the other device it is already there. The same password also opens <b>Verba Manent on the web</b> (verbamanent.app/studia). Write it on paper: you also need it if you lose PC and phone together.",
     "At the bottom left (PC) you always see «🔄 Synced 2 min ago». Videos don't go across unless you choose them."
    ],
    "g": "lez"
   },
   {
    "ico": "folder",
    "t": "Copy to the cloud",
    "p": [
     "Recordings stay on the PC. With the cloud copy, as soon as a lecture is ready the program puts a copy in the <b>«Verba Manent IA»</b> folder of your cloud, one folder per lecture: you can open it from the phone too.",
     "In <b>Settings → Copy to the cloud</b> choose where: <b>OneDrive</b> (already in Windows, 5 GB free), <b>Google Drive</b> (needs «Google Drive for desktop», 15 GB free), <b>Other folder…</b> (Dropbox, a USB stick, an external disk) or <b>No</b>.",
     "Tick what to copy: <b>Notes (PDF)</b> and <b>Transcript</b> take very little space; <b>Compressed audio</b> about 30 MB per hour. The video is not copied.",
     "Tap <b>Also copy the lectures already done</b> once: from then on new ones are copied by themselves. If there is no internet the program retries every 10 minutes.",
     "From the phone: open the OneDrive or Google Drive app → «Verba Manent IA» folder."
    ],
    "g": "lez",
    "v": "cloud"
   },
   {
    "ico": "set",
    "v": "impostazioni",
    "t": "Essential and advanced settings",
    "p": [
     "At the top of <b>Settings</b> are the <b>essentials</b>: language, artificial intelligence (Claude key or «I have an invitation»), where I transcribe, notes format, copy to the cloud, difficult words and your details.",
     "Further down, the <b>Advanced settings</b> box opens with a tap: connections (Slack, Teams, Notion, CRM), calendar, privacy, invitations, lectures folder, how often a part is saved, mini window, <b>More accurate transcript</b>, <b>Live text</b>, <b>Recognise who is speaking</b>, «Do not disturb». The program remembers if you had it open.",
     "<b>✎ My format</b>: describe in words how you want the notes (or tap a ready example) and try it with <b>Try</b> on a recording already made."
    ],
    "g": "imp"
   },
   {
    "ico": "scr",
    "t": "Where I transcribe: on the PC or on the server",
    "p": [
     "In <b>Settings → Where I transcribe</b> there are two boxes. The chosen one has a blue border and below it says in green <b>✓ Now I transcribe…</b>.",
     "<b>On the PC</b>: free, the audio never leaves the PC. The transcript is ready a couple of minutes after the end; below it says how long your PC takes.",
     "<b>On the server (fast)</b>: a powerful rented computer (RunPod, in Europe) transcribes an hour of lecture in about a minute, even if the PC is slow. A few cents per hour. Connect it with an invitation, or in <b>⚙ More options</b> with code and key.",
     "The grey <b>«Good to know»</b> lines say the limits of each. If there is no internet or the server doesn't answer, the program transcribes on the PC: the recording is never lost."
    ],
    "g": "imp",
    "v": "dove"
   },
   {
    "ico": "abc",
    "t": "Difficult words",
    "p": [
     "Names, technical terms, the lecturer's name: the program passes them to the transcription and to Claude, so they are written correctly instead of «guessed».",
     "In <b>Settings → Difficult words</b> choose the subject, type a word and press Enter (or tap <b>Add</b>). The × removes it.",
     "Below, <b>«Found in your notes»</b>: words suggested by the program. Tap one to add it to the list.",
     "They are for that subject and <b>from the next recording</b>: lectures already made don't change. Example: the lecturer says «Krebs cycle» and the transcript writes «crebs cycle»; with «Krebs cycle» among the Biochemistry words, from the next lecture it is written correctly."
    ],
    "g": "imp",
    "v": "parole"
   },
   {
    "ico": "info",
    "v": "calendario",
    "t": "Calendar",
    "p": [
     "In <b>Advanced settings → Calendar</b> tap <b>Connect Gmail (Google Calendar)…</b>, <b>Connect Outlook / Hotmail…</b> or <b>Other calendar (iCloud…)…</b>: follow the steps, copy the calendar link and paste it. The program reads the calendar, it does not change it.",
     "For lectures you can type the <b>Lecture timetable…</b>: day, time, subject, in class or online.",
     "<b>When an event starts</b>: <b>Remind me</b> (two minutes before it asks whether to record), <b>Record by itself</b> (starts by itself, with the name and participants) or <b>Nothing</b>. For a single event change it in the «Upcoming events» list.",
     "If the event has a Meet, Teams or Zoom link, the program opens it. At the end of the event it asks whether to stop recording."
    ],
    "g": "imp"
   },
   {
    "ico": "share",
    "t": "Invitations",
    "p": [
     "With an invitation you give the program ready to use to someone you trust: they get your keys <b>without seeing them</b>. What they use, you pay.",
     "The <b>Invitations</b> box (in Advanced settings) is there only if you typed the keys yourself: whoever received an invitation cannot invite others.",
     "Type <b>who it is for</b>, tick what you give (<b>the Claude key</b>, <b>the transcription server</b>) and tap <b>Prepare the invitation</b>. Then <b>Copy the message</b> and send it on WhatsApp.",
     "Whoever receives it opens the program → <b>Settings → I have an invitation</b>, pastes the whole message and taps <b>Activate</b>."
    ],
    "g": "imp",
    "v": "inviti"
   },
   {
    "ico": "aud",
    "t": "If something goes wrong",
    "p": [
     "<b>«I can't hear any sound»</b>: check the PC volume is not at zero and the audio comes out of the speakers or headphones.",
     "<b>In class the green bars don't move</b>: choose another microphone, check it is not muted, and in Windows → Settings → Privacy & security → Microphone let apps use the microphone.",
     "<b>Notes don't arrive</b>: internet is needed; tap <b>Retry</b> next to the part. If the key is missing, add it in Settings. If «Notes not created» appears, send a photo to support.",
     "<b>RECORD stays off</b>: read the grey line under the name (chapter «The recording's name»).",
     "<b>A link won't download</b>: the video is private or needs a login. Make it visible to «anyone with the link», or download it and use «A file on the PC».",
     "<b>Voices are wrong</b>: in «Who speaks» → «Name the voices…». With many people talking at once it can get confused.",
     "<b>Slack, Teams, Notion or the CRM don't receive</b>: in Advanced settings → Share and connect tap «Disconnect» and connect again (the test message says if it works).",
     "<b>Low disk space</b>: in «My recordings» delete the videos of old recordings (notes stay).",
     "The <b>registra_lezione.log</b> file in the recordings folder tells what happened: send it to support."
    ],
    "g": "prob"
   }
  ],
  "gruppi": {
   "primi": "Getting started",
   "reg": "Recording",
   "gia": "Already have the lecture?",
   "studio": "Studying a lecture",
   "materia": "Studying a course",
   "dsa": "For dyslexic students",
   "lez": "My recordings",
   "imp": "Settings",
   "prob": "Help"
  }
 }
};
