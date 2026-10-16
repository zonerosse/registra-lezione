/* Guida all'uso, in italiano e in inglese. Ogni capitolo: icona, video (video/<v>-<lingua>.webm), titolo, passi (HTML semplice). */
'use strict';
const GUIDA = {
 "it": {
  "titolo": "Guida",
  "sotto": "Come si usa Verba Manent IA, passo per passo. Quasi ogni capitolo ha un video breve.",
  "capitoli": [
   {
    "ico": "spark",
    "t": "Perché Verba Manent IA",
    "perche": true,
    "p": [
     "<b>Per studiare e per lavorare</b>: lezioni, riunioni di lavoro e webinar. Per ognuno prepara la cosa giusta: appunti per studiare, <b>verbale</b> con decisioni e cose da fare, punti chiave.",
     "<b>Nessun bot nella riunione</b>: registra dal tuo PC quello che vedi e senti. Nessun «assistente» entra nella chiamata e nessuno deve accettarlo.",
     "<b>Funziona con tutto</b>: Meet, Teams, Zoom, webinar, video online, <b>anche in aula</b> col microfono del portatile. E con «Importa un video» anche un file o un link (YouTube, Google Drive, OneDrive, Dropbox…).",
     "<b>La trascrizione e «Chi parla» si fanno sul tuo PC</b>: l'audio non va su internet. A Claude arrivano solo testo e slide, e solo se scegli gli appunti automatici.",
     "<b>Sa chi parla</b>: separa le voci da solo e nella trascrizione e nel verbale scrive chi ha detto cosa.",
     "<b>Le slide le fotografa da solo</b> e le mette negli appunti accanto alle parole, al minuto giusto.",
     "<b>Tutto in un posto</b>: cerca una parola in tutte le registrazioni, le cose da fare di tutte le riunioni, il calendario che avvisa (o registra da solo), il verbale per email, Word, Google Docs, Slack, Teams, Notion o il CRM.",
     "<b>Per l'esame</b>: Cornell, Formato Esame, flashcard, «Chiedi alla lezione» e la preparazione all'esame su tutto il corso, con simulazione corretta da Claude.",
     "<b>Niente abbonamento</b>: paghi solo quello che usi con la tua chiave di Claude (circa 0,20 $ per ora registrata), oppure porti i pacchetti all'AI che preferisci.",
     "Video, appunti e trascrizioni restano <b>sul tuo PC</b>: sono tuoi."
    ]
   },
   {
    "ico": "rec",
    "v": "registrare",
    "t": "Registrare",
    "p": [
     "<b>Prima di iniziare</b> entra nella lezione o nella riunione (Meet, Teams, Zoom…) e tieni la sua finestra sullo <b>schermo principale</b>, con il volume acceso.",
     "In <b>Registra</b>, sotto «Che cosa registri?», scegli <b>Lezione</b>, <b>Riunione di lavoro</b> o <b>Webinar o corso</b>.",
     "Scegli <b>dove si tiene</b>: <b>Online</b> (registra schermo e audio del PC) o <b>In aula</b> (registra dal microfono del portatile: scegli quale e guarda le tacche verdi che si muovono). In aula, se il docente pubblica le slide in PDF, aggiungile con <b>Scegli il PDF…</b>.",
     "Scrivi il <b>nome</b>, per esempio «Analisi 1 – Limiti». Data e ora le aggiunge il programma. Le materie usate di recente compaiono sotto: un tocco e sono già scritte.",
     "Scegli <b>in che lingua si parla</b>. Se non è la lingua del programma, gli appunti arrivano comunque nella tua lingua, con i termini tecnici originali tra parentesi.",
     "Tocca il pulsante rosso <b>REGISTRA</b>. Se te lo chiede, attiva «Non disturbare» di Windows: così i suoni delle notifiche non finiscono nella registrazione.",
     "Se hai collegato il <b>calendario</b>, sopra il nome compare l'impegno di adesso: un tocco e nome e partecipanti sono già scritti (capitolo «Calendario»)."
    ]
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
    ]
   },
   {
    "ico": "imp",
    "v": "importa",
    "t": "Importare un video o un link",
    "p": [
     "Sotto il pulsante rosso tocca <b>Importa un video…</b> e scegli <b>Un file sul PC</b> (mp4, mov, mkv, mp3…) oppure <b>Un link</b>.",
     "Con <b>Un link</b> incolla l'indirizzo: YouTube, Google Drive, OneDrive, Dropbox, Vimeo, registrazioni di Zoom… Il programma controlla il link e mostra titolo e durata. I video privati non si possono scaricare: rendili visibili a chi ha il link.",
     "Nome e lingua li propone il programma: correggili se serve. Dì se il video mostra lo schermo con le slide o è <b>solo audio</b>.",
     "Tocca <b>Importa e prepara gli appunti</b>: scarica (se è un link), estrae l'audio, cerca le slide, trascrive e prepara gli appunti. Il file originale resta dov'è."
    ]
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
     "Le slide vengono fotografate da sole quando cambiano. Ogni 30 minuti (o ogni ora) prepara un <b>pacchetto</b>; con gli appunti automatici Claude comincia subito a scriverli."
    ]
   },
   {
    "ico": "stop",
    "v": "fine",
    "t": "Fine della registrazione",
    "p": [
     "Tocca <b>Fine</b> nella mini finestra o nella finestra grande e conferma.",
     "Il programma trascrive l'ultima parte, riconosce chi parla, prepara il video e la trascrizione completa. Puoi fare altro, ma <b>non spegnere il PC</b>.",
     "Quando compare «Registrazione salvata!», tocca <b>Apri gli appunti</b>. Li trovi anche nella <b>Cartella dei pacchetti</b> (di solito Documenti → Pacchetti per Claude)."
    ]
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
     "Il formato si sceglie in <b>Impostazioni</b> e vale per le prossime registrazioni. Su una registrazione già fatta: menu <b>⋯</b> → «Crea anche in…».",
     "Gli appunti li scrive Claude: <b>controllali sempre</b>. Quello che Claude aggiunge di suo è <b>in viola</b> («aggiunto da Claude»); citazioni, minuti e slide che non tornano con la registrazione hanno <b>⚠ da verificare</b>."
    ]
   },
   {
    "ico": "lib",
    "v": "registrazioni",
    "t": "Le mie registrazioni e Cerca in tutto",
    "p": [
     "Qui trovi tutto quello che hai registrato o importato.",
     "<b>Cerca in tutto</b>: nella casella in alto scrivi un nome, una data <b>o una parola detta</b>. Sopra l'elenco compare «Detto in…»: in quali registrazioni, a che minuto e chi parlava. Tocca una frase e la riascolti da lì. Trova anche se scrivi senza accenti.",
     "Su ogni registrazione: <b>Apri appunti</b>, <b>Chiedi</b>, <b>Capitoli</b> (l'indice: tocca un argomento e il video riparte da lì), <b>Chi parla</b>, <b>Condividi</b>, <b>Trascrizione</b> e <b>Video</b>.",
     "Nel menu <b>⋯</b>: crea o rifai gli appunti, mappa mentale, infografica, statistiche, spezzone da mandare, slide del docente, rinomina, apri la cartella, elimina il video (libera spazio, gli appunti restano) o tutta la registrazione (va nel Cestino).",
     "Se il PC si è spento mentre preparava i file, tocca <b>Completa</b>."
    ]
   },
   {
    "ico": "chat",
    "v": "chiparla",
    "t": "Chi parla e statistiche",
    "p": [
     "Il programma <b>separa le voci da solo</b>, sul PC: nella trascrizione, negli appunti e nel verbale c'è scritto chi ha detto cosa. La prima volta scarica un modello di 26 MB.",
     "Nelle riunioni e nei webinar Claude <b>propone i nomi</b> guardando i partecipanti e come si chiamano tra loro (✨ = suggerito). Se non è sicuro resta «Voce 3». In aula: chi parla di più è «Docente», gli altri «Domanda».",
     "Tocca <b>Chi parla</b> sulla registrazione: vedi la trascrizione con i nomi. Tocca una frase per riascoltarla.",
     "<b>Dai i nomi alle voci…</b>: ascolta un pezzo (▶ Ascolta) e scrivi chi è, oppure tocca uno dei nomi proposti sotto. Salva: trascrizione e file si aggiornano.",
     "<b>Statistiche</b> (da Chi parla o dal menu ⋯): durata, persone, domande, cose da fare; quanto ha parlato ciascuno, l'intervento più lungo e quanto è durato ogni argomento.",
     "Per le registrazioni fatte prima: menu <b>⋯</b> → «Riconosci chi parla». Si spegne in Impostazioni («Riconosci chi parla»). Può sbagliare: i nomi si correggono quando vuoi."
    ]
   },
   {
    "ico": "share",
    "v": "condividi",
    "t": "Condividi, calendario e spezzoni",
    "p": [
     "Tocca <b>Condividi</b> sulla registrazione e scegli dove mandare il verbale (o gli appunti).",
     "<b>Email</b>: scrivi gli indirizzi (si ricordano per la prossima volta) e tocca <b>Apri in Outlook / Posta</b> (il PDF e il calendario delle cose da fare sono già allegati) oppure <b>Apri in Gmail</b> (si apre Gmail con tutto scritto: il PDF lo trascini dalla cartella che si apre). Il programma non manda niente da solo: premi Invia tu.",
     "<b>Word</b>: il file .docx da modificare. <b>Google Docs</b>: se sul PC c'è «Google Drive per computer» il file va da solo nel tuo Drive, cartella «Verba Manent IA»; altrimenti lo trascini nella pagina di Drive che si apre.",
     "<b>Cose da fare nel calendario</b>: controlla le date (quelle dette a voce, come «venerdì», sono già calcolate) e tocca <b>Outlook</b> o <b>Google Calendar</b>.",
     "<b>Slack, Teams, Notion, CRM</b>: si collegano una volta sola, con pochi passi spiegati e un indirizzo (o una chiave) da incollare. Con «Manda il riassunto da solo» il verbale parte da solo dopo ogni riunione. Indirizzi e chiavi restano sul PC, protetti.",
     "<b>✂ Spezzone da mandare</b> (menu ⋯, o ✂ accanto a un capitolo): scegli dal… al… e tocca <b>Video con sottotitoli</b> o <b>Solo audio</b>. Lo trovi nella cartella «Spezzoni»: da lì lo mandi per email o lo trascini in WhatsApp."
    ]
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
    ]
   },
   {
    "ico": "cards",
    "v": "ripasso",
    "t": "Ripassare con le flashcard",
    "p": [
     "In «Le mie registrazioni» tocca <b>Ripassa</b> su una lezione, oppure in alto <b>Ripassa la materia</b>: le domande di tutte le lezioni della stessa materia insieme.",
     "Scegli quali domande: <b>prima quelle da rivedere</b> (consigliato), tutte in ordine sparso, o solo le ★★★ del Formato Esame.",
     "Leggi la domanda e pensa alla risposta. Tocca la carta per girarla, poi <b>La sapevo</b> o <b>Da rivedere</b> (tastiera: spazio, ← e →).",
     "Quelle da rivedere tornano per prime la volta dopo. Non costa niente: usa le domande già negli appunti."
    ]
   },
   {
    "ico": "spark",
    "v": "esame",
    "t": "Preparazione all'esame",
    "p": [
     "In «Le mie registrazioni», nel riquadro <b>Ripassa la materia</b>, tocca <b>🎯 Preparati all'esame</b> (per le materie con almeno una lezione con gli appunti).",
     "<b>Le domande più probabili di tutto il corso</b>: Claude guarda gli appunti di tutte le lezioni. Sale quello che torna in più lezioni o su cui il docente insiste. Tocca una domanda per vedere lo schema della risposta. Si aggiorna da solo quando arriva una lezione nuova (circa 1-3 centesimi).",
     "<b>Data dell'esame</b>: sceglila e arriva il <b>piano di studio</b> giorno per giorno: gli argomenti in ordine, ripassi, simulazioni, la domenica riposo. Con <b>📅 Nel calendario</b> va in Outlook o Google Calendar. <b>Salva in PDF</b> per stamparlo.",
     "<b>🎯 Simulazione d'esame completa</b>: domande nuove su tutto il corso. Rispondi come all'esame scritto, senza guardare gli appunti, poi tocca <b>Correggi</b>: punti per ogni domanda, cosa va bene, cosa manca, voto in trentesimi e cosa ripassare prima."
    ]
   },
   {
    "ico": "chat",
    "v": "chiedi",
    "t": "Chiedi, mappa, infografica e slide del docente",
    "p": [
     "<b>Chiedi</b> (bottone viola): scrivi cosa non hai capito. La risposta usa solo quello che si è detto e indica slide e minuto: tocca il minuto e rivedi quel punto. Puoi chiedere anche su <b>tutta la materia</b>. Meno di 1 centesimo a domanda.",
     "<b>Mappa mentale</b> (menu ⋯): lo schema ad albero, da salvare in PDF o stampare. <b>Infografica</b> (menu ⋯): tutta la registrazione in una pagina. Circa 1 centesimo, una volta sola.",
     "<b>Slide del docente</b> (menu ⋯ → «Aggiungi le slide del docente (PDF)…»): gli appunti vengono rifatti con le slide originali, nitide. Gli appunti di prima restano come copia."
    ]
   },
   {
    "ico": "info",
    "v": "calendario",
    "t": "Calendario",
    "p": [
     "In <b>Impostazioni → Calendario</b> tocca <b>Collega Gmail (Google Calendar)…</b>, <b>Collega Outlook / Hotmail…</b> o <b>Altro calendario (iCloud…)…</b>: segui i passi, copia il link del calendario e incollalo. Il programma legge il calendario, non lo modifica.",
     "Per le lezioni puoi scrivere l'<b>Orario delle lezioni…</b>: giorno, ora, materia, in aula o online.",
     "<b>Quando inizia un impegno</b>: <b>Avvisami</b> (due minuti prima chiede se registrare), <b>Registra da solo</b> (parte da solo, con il nome e i partecipanti) o <b>Niente</b>. Per un impegno solo lo cambi nell'elenco «Prossimi impegni».",
     "Se l'impegno ha il link di Meet, Teams o Zoom, il programma lo apre. Alla fine dell'impegno chiede se fermare la registrazione."
    ]
   },
   {
    "ico": "set",
    "v": "impostazioni",
    "t": "Impostazioni",
    "p": [
     "<b>Lingua</b> del programma e degli appunti: italiano o inglese.",
     "<b>Intelligenza artificiale</b>: «Appunti automatici con Claude» con la tua chiave (circa 0,20 $ per ora registrata; si crea su platform.claude.com e resta sul PC, protetta da Windows), oppure «Cartella per l'AI che vuoi»: solo i pacchetti zip da portare a Claude, ChatGPT, Gemini…",
     "<b>Formato degli appunti</b> e <b>✎ Il mio formato</b>; <b>ogni quanto preparo un pacchetto</b> (30 minuti o 1 ora); <b>mini finestra</b>; <b>Trascrizione più precisa</b> (sbaglia meno, ci mette una volta e mezza il tempo); <b>Testo in diretta</b>; <b>Riconosci chi parla</b>; promemoria <b>Non disturbare</b>.",
     "<b>Parole difficili</b>: per ogni materia scrivi nomi e termini tecnici (o tocca quelli proposti). La trascrizione li sbaglia molto meno e Claude li scrive giusti.",
     "<b>Condividi e collega</b> (Slack, Teams, Notion, CRM), <b>Calendario</b>, <b>Dove salvo i pacchetti</b> e <b>I tuoi dati</b> (compaiono sugli appunti)."
    ]
   },
   {
    "ico": "info",
    "v": "aggiornamenti",
    "t": "Aggiornamenti e assistenza",
    "p": [
     "In basso a sinistra tocca <b>Aggiorna</b>: se c'è una versione nuova, <b>Installa</b> e il programma si riapre già aggiornato. Le novità sono scritte lì.",
     "In <b>Informazioni</b> trovi <b>Assistenza</b> (Punto Web Ferrara)."
    ]
   },
   {
    "ico": "aud",
    "t": "Se qualcosa non va",
    "p": [
     "<b>«Non sento nessun suono»</b>: controlla che il volume del PC non sia a zero e che l'audio esca dalle casse o dalle cuffie.",
     "<b>In aula le tacche verdi non si muovono</b>: scegli un altro microfono, controlla che non sia spento e in Windows → Impostazioni → Privacy e sicurezza → Microfono lascia usare il microfono alle app.",
     "<b>Gli appunti non arrivano</b>: serve internet; tocca <b>Riprova</b> accanto alla parte. Se manca la chiave, inseriscila in Impostazioni.",
     "<b>Un link non si scarica</b>: il video è privato o richiede l'accesso. Rendilo visibile a «chiunque abbia il link», oppure scaricalo e usa «Un file sul PC».",
     "<b>Le voci sono sbagliate</b>: in «Chi parla» → «Dai i nomi alle voci…». Con molte persone che parlano insieme può confondersi.",
     "<b>Slack, Teams, Notion o il CRM non ricevono</b>: in Impostazioni → Condividi e collega tocca «Scollega» e ricollega (il messaggio di prova dice se funziona).",
     "<b>Poco spazio</b>: in «Le mie registrazioni» elimina i video delle registrazioni vecchie (gli appunti restano).",
     "Il file <b>registra_lezione.log</b> nella cartella delle registrazioni racconta cosa è successo: mandalo all'assistenza."
    ]
   }
  ]
 },
 "en": {
  "titolo": "Guide",
  "sotto": "How to use Verba Manent IA, step by step. Almost every chapter has a short video.",
  "capitoli": [
   {
    "ico": "spark",
    "t": "Why Verba Manent IA",
    "perche": true,
    "p": [
     "<b>For studying and for work</b>: lectures, work meetings and webinars. For each it prepares the right thing: study notes, <b>minutes</b> with decisions and action items, key points.",
     "<b>No bot in the meeting</b>: it records from your PC what you see and hear. No «assistant» joins the call and nobody has to admit it.",
     "<b>Works with everything</b>: Meet, Teams, Zoom, webinars, online videos, <b>also in the classroom</b> with the laptop microphone. With «Import a video» also a file or a link (YouTube, Google Drive, OneDrive, Dropbox…).",
     "<b>Transcription and «Who is speaking» run on your PC</b>: the audio never goes online. Claude only receives text and slides, and only if you choose automatic notes.",
     "<b>It knows who is speaking</b>: it separates the voices by itself and the transcript and minutes say who said what.",
     "<b>Slides are captured automatically</b> and placed in the notes next to the words, at the right minute.",
     "<b>Everything in one place</b>: search a word in all recordings, the to-dos of all meetings, a calendar that reminds you (or records by itself), the minutes by email, Word, Google Docs, Slack, Teams, Notion or the CRM.",
     "<b>For the exam</b>: Cornell, Exam format, flashcards, «Ask the lecture» and exam preparation on the whole course, with a mock exam corrected by Claude.",
     "<b>No subscription</b>: you only pay for what you use with your Claude key (about 0.20 $ per recorded hour), or take the packages to the AI you prefer.",
     "Videos, notes and transcripts stay <b>on your PC</b>: they are yours."
    ]
   },
   {
    "ico": "rec",
    "v": "registrare",
    "t": "Recording",
    "p": [
     "<b>Before starting</b> join the lecture or meeting (Meet, Teams, Zoom…) and keep its window on the <b>main screen</b>, with the volume on.",
     "In <b>Record</b>, under «What are you recording?», choose <b>Lecture</b>, <b>Work meeting</b> or <b>Webinar or course</b>.",
     "Choose <b>where it takes place</b>: <b>Online</b> (records the screen and PC audio) or <b>In the classroom</b> (records from the laptop microphone: choose which one and watch the green bars move). In class, if the lecturer publishes the slides as a PDF, add them with <b>Choose the PDF…</b>.",
     "Type the <b>name</b>, e.g. «Calculus 1 – Limits». The program adds date and time. Recent subjects appear below: one tap and they are typed in.",
     "Choose <b>which language is spoken</b>. If it is not the program language, the notes still arrive in your language, with the original technical terms in brackets.",
     "Tap the red <b>RECORD</b> button. If asked, turn on Windows «Do not disturb», so notification sounds don't end up in the recording.",
     "If you connected the <b>calendar</b>, the current event appears above the name: one tap and name and participants are filled in (chapter «Calendar»)."
    ]
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
    ]
   },
   {
    "ico": "imp",
    "v": "importa",
    "t": "Importing a video or a link",
    "p": [
     "Below the red button tap <b>Import a video…</b> and choose <b>A file on the PC</b> (mp4, mov, mkv, mp3…) or <b>A link</b>.",
     "With <b>A link</b> paste the address: YouTube, Google Drive, OneDrive, Dropbox, Vimeo, Zoom recordings… The program checks the link and shows title and length. Private videos cannot be downloaded: make them visible to anyone with the link.",
     "The program suggests name and language: fix them if needed. Say whether the video shows the screen with slides or is <b>audio only</b>.",
     "Tap <b>Import and prepare the notes</b>: it downloads (if it is a link), extracts the audio, looks for slides, transcribes and prepares the notes. The original file stays where it is."
    ]
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
     "Slides are captured automatically when they change. Every 30 minutes (or every hour) a <b>package</b> is prepared; with automatic notes Claude starts writing them straight away."
    ]
   },
   {
    "ico": "stop",
    "v": "fine",
    "t": "End of the recording",
    "p": [
     "Tap <b>Stop</b> in the mini window or in the main window and confirm.",
     "The program transcribes the last part, recognises who is speaking, prepares the video and the full transcript. You can do something else, but <b>don't turn the PC off</b>.",
     "When «Recording saved!» appears, tap <b>Open the notes</b>. You also find them in the <b>Packages folder</b> (usually Documents → Packages for Claude)."
    ]
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
     "Choose the format in <b>Settings</b>: it applies to the next recordings. For a finished recording: <b>⋯</b> menu → «Also create in…».",
     "Claude writes the notes: <b>always check them</b>. What Claude adds on its own is <b>in purple</b> («added by Claude»); quotes, minutes and slides that don't match the recording show <b>⚠ to check</b>."
    ]
   },
   {
    "ico": "lib",
    "v": "registrazioni",
    "t": "My recordings and Search everything",
    "p": [
     "Everything you recorded or imported is here.",
     "<b>Search everything</b>: in the box at the top type a name, a date <b>or a word that was said</b>. «Said in…» appears above the list: in which recordings, at which minute and who was speaking. Tap a sentence to hear it again from there. It also finds words typed without accents.",
     "On each recording: <b>Open notes</b>, <b>Ask</b>, <b>Chapters</b> (the index: tap a topic and the video starts from there), <b>Who speaks</b>, <b>Share</b>, <b>Transcript</b> and <b>Video</b>.",
     "In the <b>⋯</b> menu: create or redo notes, mind map, infographic, statistics, clip to send, lecturer's slides, rename, open the folder, delete the video (frees space, notes stay) or the whole recording (goes to the Recycle Bin).",
     "If the PC switched off while preparing the files, tap <b>Complete</b>."
    ]
   },
   {
    "ico": "chat",
    "v": "chiparla",
    "t": "Who is speaking and statistics",
    "p": [
     "The program <b>separates the voices by itself</b>, on the PC: the transcript, notes and minutes say who said what. The first time it downloads a 26 MB model.",
     "In meetings and webinars Claude <b>suggests the names</b> from the participants and how they call each other (✨ = suggested). If unsure it stays «Voice 3». In class: whoever speaks most is «Teacher», the others «Question».",
     "Tap <b>Who speaks</b> on the recording: you see the transcript with the names. Tap a sentence to hear it again.",
     "<b>Name the voices…</b>: listen to a piece (▶ Listen) and type who it is, or tap one of the names below. Save: transcript and files are updated.",
     "<b>Statistics</b> (from Who is speaking or the ⋯ menu): length, people, questions, to-dos; how much each person spoke, the longest turn and how long each topic took.",
     "For older recordings: <b>⋯</b> menu → «Recognise who is speaking». Turn it off in Settings («Recognise who is speaking»). It can make mistakes: fix the names whenever you like."
    ]
   },
   {
    "ico": "share",
    "v": "condividi",
    "t": "Share, calendar and clips",
    "p": [
     "Tap <b>Share</b> on the recording and choose where to send the minutes (or the notes).",
     "<b>Email</b>: type the addresses (remembered for next time) and tap <b>Open in Outlook / Mail</b> (the PDF and the to-do calendar are already attached) or <b>Open in Gmail</b> (Gmail opens with everything filled in: drag the PDF from the folder that opens). The program never sends by itself: you press Send.",
     "<b>Word</b>: the .docx file to edit. <b>Google Docs</b>: if «Google Drive for desktop» is on the PC the file goes into your Drive by itself, folder «Verba Manent IA»; otherwise drag it onto the Drive page that opens.",
     "<b>To-dos in the calendar</b>: check the dates (spoken ones like «Friday» are already worked out) and tap <b>Outlook</b> or <b>Google Calendar</b>.",
     "<b>Slack, Teams, Notion, CRM</b>: connected once, with a few explained steps and an address (or key) to paste. With «Send the summary by itself» the minutes go out after each meeting. Addresses and keys stay on the PC, protected.",
     "<b>✂ Clip to send</b> (⋯ menu, or ✂ next to a chapter): choose from… to… and tap <b>Video with subtitles</b> or <b>Audio only</b>. You find it in the «Clips» folder: send it by email or drag it into WhatsApp."
    ]
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
    ]
   },
   {
    "ico": "cards",
    "v": "ripasso",
    "t": "Reviewing with flashcards",
    "p": [
     "In «My recordings» tap <b>Review</b> on a lecture, or at the top <b>Review the subject</b>: the questions from all lectures of the same subject together.",
     "Choose which questions: <b>to review first</b> (recommended), all shuffled, or only the ★★★ of the Exam format.",
     "Read the question and think of the answer. Tap the card to flip it, then <b>I knew it</b> or <b>To review</b> (keyboard: space, ← and →).",
     "The ones to review come back first next time. It's free: it uses the questions already in the notes."
    ]
   },
   {
    "ico": "spark",
    "v": "esame",
    "t": "Exam preparation",
    "p": [
     "In «My recordings», in the <b>Review the subject</b> box, tap <b>🎯 Prepare for the exam</b> (for subjects with at least one lecture with notes).",
     "<b>The most likely questions of the whole course</b>: Claude looks at the notes of all lectures. What comes back in several lectures or what the lecturer stresses rises. Tap a question to see the answer outline. It updates by itself when a new lecture arrives (about 1-3 cents).",
     "<b>Exam date</b>: choose it and you get the <b>study plan</b> day by day: topics in order, reviews, mock exams, Sunday off. With <b>📅 Into the calendar</b> it goes to Outlook or Google Calendar. <b>Save as PDF</b> to print it.",
     "<b>🎯 Full mock exam</b>: new questions on the whole course. Answer as in the written exam, without looking at the notes, then tap <b>Correct</b>: points for each question, what is right, what is missing, the mark out of 30 and what to review first."
    ]
   },
   {
    "ico": "chat",
    "v": "chiedi",
    "t": "Ask, mind map, infographic and lecturer's slides",
    "p": [
     "<b>Ask</b> (purple button): type what you didn't understand. The answer uses only what was said and shows slide and minute: tap the minute to see that point again. You can also ask about <b>the whole subject</b>. Less than 1 cent per question.",
     "<b>Mind map</b> (⋯ menu): the tree outline, to save as PDF or print. <b>Infographic</b> (⋯ menu): the whole recording on one page. About 1 cent, once.",
     "<b>Lecturer's slides</b> (⋯ menu → «Add the lecturer's slides (PDF)…»): the notes are redone with the original, sharp slides. The previous notes stay as a copy."
    ]
   },
   {
    "ico": "info",
    "v": "calendario",
    "t": "Calendar",
    "p": [
     "In <b>Settings → Calendar</b> tap <b>Connect Gmail (Google Calendar)…</b>, <b>Connect Outlook / Hotmail…</b> or <b>Other calendar (iCloud…)…</b>: follow the steps, copy the calendar link and paste it. The program reads the calendar, it does not change it.",
     "For lectures you can type the <b>Lecture timetable…</b>: day, time, subject, in class or online.",
     "<b>When an event starts</b>: <b>Remind me</b> (two minutes before it asks whether to record), <b>Record by itself</b> (starts by itself, with the name and participants) or <b>Nothing</b>. For a single event change it in the «Upcoming events» list.",
     "If the event has a Meet, Teams or Zoom link, the program opens it. At the end of the event it asks whether to stop recording."
    ]
   },
   {
    "ico": "set",
    "v": "impostazioni",
    "t": "Settings",
    "p": [
     "<b>Language</b> of the program and notes: Italian or English.",
     "<b>Artificial intelligence</b>: «Automatic notes with Claude» with your key (about 0.20 $ per recorded hour; create it on platform.claude.com, it stays on the PC, protected by Windows), or «Folder for the AI of your choice»: only the zip packages, to take to Claude, ChatGPT, Gemini…",
     "<b>Notes format</b> and <b>✎ My format</b>; <b>how often a package is prepared</b> (30 minutes or 1 hour); <b>mini window</b>; <b>More accurate transcript</b> (fewer mistakes, one and a half times as long); <b>Live text</b>; <b>Recognise who is speaking</b>; <b>Do not disturb</b> reminder.",
     "<b>Difficult words</b>: for each subject type names and technical terms (or tap the suggested ones). The transcript gets them wrong far less and Claude spells them right.",
     "<b>Share and connect</b> (Slack, Teams, Notion, CRM), <b>Calendar</b>, <b>Where packages are saved</b> and <b>Your details</b> (they appear on the notes)."
    ]
   },
   {
    "ico": "info",
    "v": "aggiornamenti",
    "t": "Updates and support",
    "p": [
     "Bottom left, tap <b>Update</b>: if there is a new version, <b>Install</b> and the program reopens already updated. What's new is written there.",
     "In <b>About</b> you find <b>Support</b> (Punto Web Ferrara)."
    ]
   },
   {
    "ico": "aud",
    "t": "If something goes wrong",
    "p": [
     "<b>«No sound»</b>: check that the PC volume is not at zero and that sound comes out of the speakers or headphones.",
     "<b>In class the green bars don't move</b>: choose another microphone, check it isn't muted and in Windows → Settings → Privacy & security → Microphone allow apps to use the microphone.",
     "<b>Notes don't arrive</b>: an internet connection is needed; tap <b>Retry</b> next to the part. If the key is missing, enter it in Settings.",
     "<b>A link won't download</b>: the video is private or needs a login. Make it visible to «anyone with the link», or download it and use «A file on the PC».",
     "<b>Voices are wrong</b>: in «Who is speaking» → «Name the voices…». With many people talking at once it can get confused.",
     "<b>Slack, Teams, Notion or the CRM don't receive</b>: in Settings → Share and connect tap «Disconnect» and connect again (the test message tells you whether it works).",
     "<b>Low disk space</b>: in «My recordings» delete the videos of old recordings (notes stay).",
     "The <b>registra_lezione.log</b> file in the recordings folder tells what happened: send it to support."
    ]
   }
  ]
 }
};
