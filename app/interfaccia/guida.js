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
    "g": "primi"
   },
   {
    "ico": "set",
    "t": "La chiave di Claude o un invito",
    "p": [
     "Gli appunti, «Chiedi», le mappe e l'esame li scrive <b>Claude</b>. Serve una chiave, oppure un invito di chi te la presta.",
     "<b>Con la tua chiave</b>: in <b>Impostazioni → Intelligenza artificiale</b> scegli «Appunti automatici con Claude», incolla la chiave (si crea su platform.claude.com → Settings → API keys) e tocca <b>Prova e salva</b>. Resta solo su questo PC, protetta da Windows. Costo: circa 0,20 $ per ora registrata.",
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
     "Per cambiarlo dopo: <b>⋯ Altro → Rinomina</b>. Cambia anche il nome dei file e degli appunti."
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
    "t": "Le slide del docente",
    "p": [
     "Se il docente pubblica le slide in PDF, il programma le mette negli appunti <b>accanto a quando il docente ne parla</b>, al posto delle foto prese dallo schermo: sono più nitide.",
     "<b>Prima di registrare</b> (in aula): in «Dove si tiene?» → <b>In aula</b> → <b>Slide del docente</b> → <b>Scegli il PDF…</b>. Valgono solo per quella registrazione.",
     "<b>A lezione finita</b>: sulla registrazione tocca <b>⋯ Altro → Aggiungi le slide del docente (PDF)…</b>. Gli appunti vengono rifatti con le slide (prima ti dice quanto costa); quelli di prima restano come copia.",
     "Il PDF viene copiato nella cartella della lezione: puoi spostare o cancellare l'originale."
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
     "Il formato si sceglie in <b>Impostazioni</b> e vale per le prossime registrazioni. Su una registrazione già fatta: <b>⋯ Altro</b> → «Crea anche in…».",
     "Gli appunti li scrive Claude: <b>controllali sempre</b>. Quello che Claude aggiunge di suo è <b>in viola</b> («aggiunto da Claude»); citazioni, minuti e slide che non tornano con la registrazione hanno <b>⚠ da verificare</b>."
    ],
    "g": "studio"
   },
   {
    "ico": "cards",
    "v": "ripasso",
    "t": "Ripassare con le flashcard",
    "p": [
     "In «Le mie registrazioni» tocca <b>Ripassa</b> su una lezione. Oppure usa la riga in alto <b>Ripassa</b>: scegli la materia dal menu (dice quante domande ci sono) e tocca <b>Ripassa</b>, con le domande di tutte le lezioni di quella materia.",
     "Scegli quali domande: <b>prima quelle da rivedere</b> (consigliato), tutte in ordine sparso, o solo le ★★★ del Formato Esame.",
     "Leggi la domanda e pensa alla risposta. Tocca la carta per girarla, poi <b>La sapevo</b> o <b>Da rivedere</b> (tastiera: spazio, ← e →).",
     "Quelle da rivedere tornano per prime la volta dopo. Non costa niente: usa le domande già negli appunti."
    ],
    "g": "studio"
   },
   {
    "ico": "spark",
    "v": "esame",
    "t": "Preparazione all'esame",
    "p": [
     "In «Le mie registrazioni», nella riga in alto <b>Ripassa</b>, scegli la materia e tocca <b>🎯 Preparati all'esame</b> (per le materie con almeno una lezione con gli appunti).",
     "<b>Le domande più probabili di tutto il corso</b>: Claude guarda gli appunti di tutte le lezioni. Sale quello che torna in più lezioni o su cui il docente insiste. Tocca una domanda per vedere lo schema della risposta. Si aggiorna da solo quando arriva una lezione nuova (circa 1-3 centesimi).",
     "<b>Data dell'esame</b>: sceglila e arriva il <b>piano di studio</b> giorno per giorno: gli argomenti in ordine, ripassi, simulazioni, la domenica riposo. Con <b>📅 Nel calendario</b> va in Outlook o Google Calendar. <b>Salva in PDF</b> per stamparlo.",
     "<b>✍ Simulazione scritta</b>: domande nuove su tutto il corso. Rispondi come all'esame scritto, senza guardare gli appunti, poi tocca <b>Correggi</b>: punti per ogni domanda, cosa va bene, cosa manca, voto in trentesimi e cosa ripassare prima.",
     "<b>🎤 Interrogazione a voce</b>: come all'orale. Il docente fa 3 domande, tu tocchi il microfono e rispondi parlando; se manca qualcosa ti fa una <b>domanda in più</b>. Alla fine: voto, cosa va bene e cosa manca, e <b>come hai parlato</b> (tempo, «cioè» ed «ehm», pause). La voce si trascrive sul PC: a Claude va solo il testo.",
     "<b>☑ Test a crocette</b>: 10 domande a 4 risposte su tutta la materia, come i test d'esame. <b>Correggi</b>: voto, risposte giuste e sbagliate, e per ogni errore <b>perché era sbagliata</b>, con la lezione e il minuto (tocca per rivederlo) e «Chiedi alla lezione». Le sbagliate vanno nelle flashcard «da rivedere»; puoi rifare <b>solo le sbagliate</b> (gratis).",
     "<b>La pagina della lezione</b>: tocca una lezione in «Le mie registrazioni» e trovi tutto in riquadri: <b>Leggi</b>, <b>Capisci</b>, <b>Ripassa</b>, <b>Condividi</b>. In «⋯ Altro» restano rinomina, rifai gli appunti, slide del docente, cartella, elimina.",
     "<b>🎧 Podcast della lezione</b> (pagina della lezione): i punti importanti in 8 o 20 minuti, con una voce narrante e, nei momenti chiave, <b>la voce vera del prof</b> presa dalla registrazione; la parola che senti si illumina. Sul PC si salva in MP3 o si manda sul telefono.",
     "<b>🗺 Mappa per la verifica</b> (Studia): scegli le lezioni della verifica e ottieni un foglio A4 con le parole chiave e il riquadro di formule e valori. Togli le parole che non vuoi, scrivi nome e classe, poi PDF o Stampa (strumento compensativo, L. 170/2010).",
     "<b>🎤 Karaoke della lezione</b> (pagina della lezione): la voce vera del prof con le parole che si illuminano, la slide di quel momento accanto; tocca una parola per ripartire da lì. «📏 Una riga alla volta» oscura le altre righe.",
     "<b>🎓 Studia</b> (menu a sinistra): scegli la materia e hai i giorni all'esame, il piano di oggi, test a crocette, interrogazione, simulazione scritta, flashcard e Chiedi su tutto il corso, e i tuoi voti.",
     "<b>Test a crocette</b>: scegli 10, 20 o 30 domande, la difficoltà e, se vuoi, <b>come all'esame vero</b> (1 minuto a domanda, −0,25 per ogni risposta sbagliata).",
     "<b>Modalità DSA</b> (in alto nella lezione e in Studia, o in Impostazioni): in cima gli strumenti più utili per chi ha un DSA (ascolto, mappe, appunti facili da leggere, flashcard e test letti a voce, Chiedi e scritto dettati a voce), il resto in grigio sotto; carattere leggibile, più spazio, fondo crema e 30% di tempo in più nei test.",
     "In alto a sinistra la freccia <b>←</b> ti riporta alla pagina da cui sei arrivato."
    ],
    "g": "studio"
   },
   {
    "ico": "chat",
    "v": "chiedi",
    "t": "Chiedi, mappa e infografica",
    "p": [
     "<b>Chiedi alla lezione</b> (sulla registrazione: <b>⋯ Altro → Chiedi alla lezione</b>): scrivi cosa non hai capito. La risposta usa solo quello che si è detto e indica slide e minuto: tocca il minuto e rivedi quel punto. Puoi chiedere anche su <b>tutta la materia</b>. Meno di 1 centesimo a domanda.",
     "<b>🔊 Ascolta gli appunti</b> (⋯ Altro): il programma legge gli appunti ad alta voce ed evidenzia la frase; tocca una frase per ripartire da lì. Con <b>Aa Lettura facilitata</b> (anche in Impostazioni) il carattere è più leggibile, con più spazio e fondo crema: utile per chi ha un DSA.",
     "<b>Mappa mentale</b> (⋯ Altro): lo schema ad albero, da salvare in PDF o stampare. <b>Infografica</b> (⋯ Altro): tutta la registrazione in una pagina. Circa 1 centesimo, una volta sola.",
     "Da queste pagine torni indietro con la freccia <b>←</b> in alto: ti riporta alla pagina da cui eri arrivato."
    ],
    "g": "studio"
   },
   {
    "ico": "lib",
    "v": "registrazioni",
    "t": "Le mie registrazioni e Cerca in tutto",
    "p": [
     "Qui trovi tutto quello che hai registrato o importato. La copertina ha il colore della materia: stessa materia, stesso colore.",
     "<b>Cerca in tutto</b>: nella casella in alto scrivi un nome, una data <b>o una parola detta</b>. Sopra l'elenco compare «Detto in…»: in quali registrazioni, a che minuto e chi parlava. Tocca una frase e la riascolti da lì. Trova anche se scrivi senza accenti.",
     "Su ogni registrazione: <b>Apri appunti</b>, <b>Ripassa</b> e <b>⋯ Altro</b>. Se gli appunti non ci sono ancora c'è <b>Crea appunti</b>: resti qui e vedi la barra che avanza.",
     "In <b>⋯ Altro</b>: Chiedi alla lezione, Capitoli (l'indice: tocca un argomento e il video riparte da lì), Chi parla, Condividi, Trascrizione, Video; poi crea o rifai gli appunti, mappa mentale, infografica, statistiche, spezzone da mandare, slide del docente, rinomina, apri la cartella, elimina il video (libera spazio, gli appunti restano) o tutta la registrazione (va nel Cestino).",
     "<b>☁ nel cloud</b> vuol dire che la copia nel cloud è fatta (capitolo «Copia nel cloud»). Se il PC si è spento mentre preparava i file, tocca <b>Completa</b>."
    ],
    "g": "lez"
   },
   {
    "ico": "lib",
    "v": "menu",
    "g": "lez",
    "t": "Il menu «⋯ Altro», voce per voce",
    "p": [
     "Su ogni registrazione tocca <b>⋯ Altro</b>. Le voci cambiano un po' da una registrazione all'altra: compaiono solo quelle che servono. Ecco cosa fa ognuna.",
     "<b>Chiedi alla lezione</b>: scrivi una domanda su quello che si è detto; risponde con slide e minuto. Meno di 1 centesimo a domanda.",
     "<b>Capitoli</b>: l'indice degli argomenti. Tocca un argomento e il video riparte da lì; con ✂ accanto a un capitolo fai uno spezzone.",
     "<b>Chi parla</b>: la trascrizione con i nomi di chi ha parlato; da qui dai i nomi alle voci e apri le statistiche.",
     "<b>Condividi</b>: manda appunti o verbale per email, Word, Google Docs, calendario, Slack, Teams, Notion o CRM.",
     "<b>Trascrizione</b>: apre il PDF «Per Claude» con tutto quello che è stato detto. <b>Video</b>: riguardi la registrazione (se il video c'è ancora).",
     "<b>Crea appunti con Claude</b>: c'è quando gli appunti non sono stati fatti. <b>Crea anche in Formato Esame</b> (o in Cornell): aggiunge l'altro formato, quelli che hai restano. <b>Completa gli appunti</b>: fa le parti che mancano. Costo: circa 0,20 $ per ora di registrazione (prima te lo dice).",
     "<b>Rifai appunti</b>: li rifà da capo, per esempio dopo aver aggiunto le parole difficili. Quelli di prima vengono sostituiti. Stesso costo.",
     "<b>Mappa mentale</b>: lo schema ad albero della lezione. <b>Infografica (una pagina)</b>: tutta la registrazione in un foglio. Circa 1 centesimo ciascuna, una volta sola; si salvano in PDF.",
     "<b>Riconosci chi parla</b>: separa le voci, se non è già stato fatto. Gratis, sul PC. <b>Statistiche</b>: durata, chi ha parlato e quanto, domande, argomenti. Gratis.",
     "<b>✂ Spezzone da mandare</b>: scegli dal… al… e crei un pezzo di video con sottotitoli o solo audio.",
     "<b>Aggiungi le slide del docente (PDF)…</b>: mette le slide originali negli appunti, accanto alle parole (capitolo «Le slide del docente»).",
     "<b>Rinomina</b>: cambia il nome della registrazione, dei file e degli appunti. <b>Apri la cartella</b>: apre in Esplora file la cartella della lezione.",
     "<b>Elimina il video</b>: libera spazio; appunti, slide e trascrizione restano. <b>Elimina la registrazione</b>: va nel Cestino di Windows, da dove la recuperi se ti sbagli."
    ]
   },
   {
    "ico": "chat",
    "v": "chiparla",
    "t": "Chi parla e statistiche",
    "p": [
     "Il programma <b>separa le voci da solo</b>, sul PC: nella trascrizione, negli appunti e nel verbale c'è scritto chi ha detto cosa. La prima volta scarica un modello di 26 MB.",
     "Nelle riunioni e nei webinar Claude <b>propone i nomi</b> guardando i partecipanti e come si chiamano tra loro (✨ = suggerito). Se non è sicuro resta «Voce 3». In aula: chi parla di più è «Docente», gli altri «Domanda».",
     "Tocca <b>⋯ Altro → Chi parla</b>: vedi la trascrizione con i nomi. Tocca una frase per riascoltarla.",
     "<b>Dai i nomi alle voci…</b>: ascolta un pezzo (▶ Ascolta) e scrivi chi è, oppure tocca uno dei nomi proposti sotto. Salva: trascrizione e file si aggiornano.",
     "<b>Statistiche</b> (da Chi parla o dal ⋯ Altro): durata, persone, domande, cose da fare; quanto ha parlato ciascuno, l'intervento più lungo e quanto è durato ogni argomento.",
     "Per le registrazioni fatte prima: <b>⋯ Altro</b> → «Riconosci chi parla». Si spegne in Impostazioni («Riconosci chi parla»). Può sbagliare: i nomi si correggono quando vuoi."
    ],
    "g": "lez"
   },
   {
    "ico": "share",
    "v": "condividi",
    "t": "Condividi, calendario e spezzoni",
    "p": [
     "Tocca <b>⋯ Altro → Condividi</b> e scegli dove mandare il verbale (o gli appunti).",
     "<b>Email</b>: scrivi gli indirizzi (si ricordano per la prossima volta) e tocca <b>Apri in Outlook / Posta</b> (il PDF e il calendario delle cose da fare sono già allegati) oppure <b>Apri in Gmail</b> (si apre Gmail con tutto scritto: il PDF lo trascini dalla cartella che si apre). Il programma non manda niente da solo: premi Invia tu.",
     "<b>Word</b>: il file .docx da modificare. <b>Google Docs</b>: se sul PC c'è «Google Drive per computer» il file va da solo nel tuo Drive, cartella «Verba Manent IA»; altrimenti lo trascini nella pagina di Drive che si apre.",
     "<b>Cose da fare nel calendario</b>: controlla le date (quelle dette a voce, come «venerdì», sono già calcolate) e tocca <b>Outlook</b> o <b>Google Calendar</b>.",
     "<b>Slack, Teams, Notion, CRM</b>: si collegano una volta sola, con pochi passi spiegati e un indirizzo (o una chiave) da incollare. Con «Manda il riassunto da solo» il verbale parte da solo dopo ogni riunione. Indirizzi e chiavi restano sul PC, protetti.",
     "<b>✂ Spezzone da mandare</b> (⋯ Altro, o ✂ accanto a un capitolo): scegli dal… al… e tocca <b>Video con sottotitoli</b> o <b>Solo audio</b>. Lo trovi nella cartella «Spezzoni»: da lì lo mandi per email o lo trascini in WhatsApp."
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
   "studio": "Studiare",
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
    "g": "primi"
   },
   {
    "ico": "set",
    "t": "The Claude key or an invitation",
    "p": [
     "Notes, «Ask», maps and the exam are written by <b>Claude</b>. You need a key, or an invitation from someone who lends you theirs.",
     "<b>With your own key</b>: in <b>Settings → Artificial intelligence</b> choose «Automatic notes with Claude», paste the key (create it on platform.claude.com → Settings → API keys) and tap <b>Test and save</b>. It stays only on this PC, protected by Windows. Cost: about 0.20 $ per recorded hour.",
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
     "To change it later: <b>⋯ More → Rename</b>. It also renames the files and the notes."
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
    "t": "The lecturer's slides",
    "p": [
     "If the lecturer publishes the slides as a PDF, the program puts them in the notes <b>next to when the lecturer talks about them</b>, instead of the screen photos: they are sharper.",
     "<b>Before recording</b> (in class): «Where is it held?» → <b>In class</b> → <b>Lecturer's slides</b> → <b>Choose the PDF…</b>. They are only for that recording.",
     "<b>After the lecture</b>: on the recording tap <b>⋯ More → Add the lecturer's slides (PDF)…</b>. The notes are redone with the slides (it tells you the cost first); the previous ones stay as a copy.",
     "The PDF is copied into the lecture's folder: you can move or delete the original."
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
     "Choose the format in <b>Settings</b>: it applies to the next recordings. For a finished recording: <b>⋯ More</b> → «Also create in…».",
     "Claude writes the notes: <b>always check them</b>. What Claude adds on its own is <b>in purple</b> («added by Claude»); quotes, minutes and slides that don't match the recording show <b>⚠ to check</b>."
    ],
    "g": "studio"
   },
   {
    "ico": "cards",
    "v": "ripasso",
    "t": "Reviewing with flashcards",
    "p": [
     "In «My recordings» tap <b>Review</b> on a lecture. Or use the <b>Review</b> line at the top: choose the subject from the menu (it shows how many questions there are) and tap <b>Review</b>, with the questions of all the lectures of that subject.",
     "Choose which questions: <b>those to review first</b> (recommended), all in random order, or only the ★★★ ones from the Exam format.",
     "Read the question and think of the answer. Tap the card to flip it, then <b>I knew it</b> or <b>To review</b> (keyboard: space, ← and →).",
     "Those to review come first next time. It's free: it uses the questions already in the notes."
    ],
    "g": "studio"
   },
   {
    "ico": "spark",
    "v": "esame",
    "t": "Exam preparation",
    "p": [
     "In «My recordings», in the <b>Review</b> line at the top, choose the subject and tap <b>🎯 Prepare for the exam</b> (for subjects with at least one lecture with notes).",
     "<b>The most likely questions of the whole course</b>: Claude looks at the notes of all lectures. What comes back in several lectures, or what the lecturer stresses, goes up. Tap a question to see the outline of the answer. It updates by itself when a new lecture arrives (about 1-3 cents).",
     "<b>Exam date</b>: choose it and the day-by-day <b>study plan</b> arrives: topics in order, reviews, simulations, Sunday off. With <b>📅 To calendar</b> it goes to Outlook or Google Calendar. <b>Save as PDF</b> to print it.",
     "<b>✍ Written mock exam</b>: new questions on the whole course. Answer as in the written exam, without looking at the notes, then tap <b>Correct</b>: points for each question, what is right, what is missing, mark out of 30 and what to review first.",
     "<b>🎤 Oral exam</b>: as in an oral exam. The examiner asks 3 questions, you tap the microphone and answer out loud; if something is missing you get a <b>follow-up question</b>. At the end: mark, what is right and what is missing, and <b>how you spoke</b> (time, «um» and «uh», pauses). Your voice is transcribed on the PC: Claude only receives the text.",
     "<b>☑ Multiple-choice test</b>: 10 questions with 4 answers on the whole course, like exam tests. <b>Correct</b>: mark, right and wrong answers and, for every mistake, <b>why it was wrong</b>, with the lecture and minute (tap to see it again) and «Ask the lecture». Wrong ones go to the «to review» flashcards; you can redo <b>only the wrong ones</b> (free).",
     "<b>The lecture page</b>: tap a lecture in «My recordings» and find everything in tiles: <b>Read</b>, <b>Understand</b>, <b>Review</b>, <b>Share</b>. «⋯ More» keeps rename, redo the notes, lecturer slides, folder, delete.",
     "<b>🎧 Lecture podcast</b> (lecture page): the key points in 8 or 20 minutes, with a narrator and, at the key moments, <b>the lecturer's real voice</b> from the recording; the word you hear lights up. On the PC you can save it as MP3 or send it to the phone.",
     "<b>🗺 Test map</b> (Study): choose the lectures of the test and get an A4 sheet with the key words and a formulas and values box. Remove the words you don't want, write name and class, then PDF or Print (compensatory tool, Italian Law 170/2010).",
     "<b>🎤 Lecture karaoke</b> (lecture page): the lecturer's real voice with the words lighting up and the slide of that moment beside it; tap a word to start from there. «📏 One line at a time» dims the other lines.",
     "<b>🎓 Study</b> (menu on the left): choose the course and get the days to the exam, today's plan, multiple-choice test, oral exam, written mock exam, flashcards and Ask on the whole course, and your marks.",
     "<b>Multiple-choice test</b>: choose 10, 20 or 30 questions, the difficulty and, if you want, <b>like the real exam</b> (1 minute per question, −0.25 for each wrong answer).",
     "<b>Dyslexia mode</b> (at the top of the lecture and Study pages, or in Settings): the most useful tools first (listening, maps, easy-to-read notes, flashcards and tests read aloud, dictated Ask and written answers), everything else in grey below; legible font, more space, cream background and 30% more time in tests.",
     "At the top left the <b>←</b> arrow takes you back to the page you came from."
    ],
    "g": "studio"
   },
   {
    "ico": "chat",
    "v": "chiedi",
    "t": "Ask, map and infographic",
    "p": [
     "<b>Ask the lecture</b> (on the recording: <b>⋯ More → Ask the lecture</b>): write what you didn't understand. The answer uses only what was said and shows slide and minute: tap the minute to see that point again. You can also ask about the <b>whole subject</b>. Less than 1 cent per question.",
     "<b>🔊 Listen to the notes</b> (⋯ More): the program reads the notes aloud and highlights the sentence; tap a sentence to start from there. With <b>Aa Easy reading</b> (also in Settings) the font is more legible, with more space and a cream background: helpful with dyslexia.",
     "<b>Mind map</b> (⋯ More): the tree outline, to save as PDF or print. <b>Infographic</b> (⋯ More): the whole recording on one page. About 1 cent, once.",
     "From these pages go back with the <b>←</b> arrow at the top: it takes you to the page you came from."
    ],
    "g": "studio"
   },
   {
    "ico": "lib",
    "v": "registrazioni",
    "t": "My recordings and Search everything",
    "p": [
     "Here you find everything you recorded or imported. The cover has the subject's colour: same subject, same colour.",
     "<b>Search everything</b>: in the box at the top type a name, a date <b>or a word that was said</b>. «Said in…» appears above the list: in which recordings, at which minute and who was speaking. Tap a sentence to hear it again from there. It also finds words typed without accents.",
     "On each recording: <b>Open notes</b>, <b>Review</b> and <b>⋯ More</b>. If there are no notes yet there is <b>Create notes</b>: you stay here and see the progress bar.",
     "In <b>⋯ More</b>: Ask the lecture, Chapters (the index: tap a topic and the video starts from there), Who speaks, Share, Transcript, Video; then create or redo notes, mind map, infographic, statistics, clip to send, lecturer's slides, rename, open the folder, delete the video (frees space, notes stay) or the whole recording (goes to the Recycle Bin).",
     "<b>☁ in the cloud</b> means the cloud copy is done (chapter «Copy to the cloud»). If the PC turned off while preparing the files, tap <b>Complete</b>."
    ],
    "g": "lez"
   },
   {
    "ico": "lib",
    "v": "menu",
    "g": "lez",
    "t": "The «⋯ More» menu, item by item",
    "p": [
     "On each recording tap <b>⋯ More</b>. The items change a little from one recording to another: only the useful ones appear. Here is what each does.",
     "<b>Ask the lecture</b>: type a question about what was said; it answers with slide and minute. Less than 1 cent per question.",
     "<b>Chapters</b>: the index of topics. Tap a topic and the video starts from there; with ✂ next to a chapter you make a clip.",
     "<b>Who speaks</b>: the transcript with the names of who spoke; from here you name the voices and open the statistics.",
     "<b>Share</b>: send notes or minutes by email, Word, Google Docs, calendar, Slack, Teams, Notion or CRM.",
     "<b>Transcript</b>: opens the «Per Claude» PDF with everything that was said. <b>Video</b>: watch the recording again (if the video is still there).",
     "<b>Create notes with Claude</b>: there when notes were not made. <b>Also create in Exam format</b> (or Cornell): adds the other format, the ones you have stay. <b>Complete the notes</b>: makes the missing parts. Cost: about 0.20 $ per recorded hour (it tells you first).",
     "<b>Redo notes</b>: redoes them from scratch, for example after adding difficult words. The previous ones are replaced. Same cost.",
     "<b>Mind map</b>: the tree outline of the lecture. <b>Infographic (one page)</b>: the whole recording on one sheet. About 1 cent each, once; saved as PDF.",
     "<b>Recognise who is speaking</b>: separates the voices, if not done yet. Free, on the PC. <b>Statistics</b>: length, who spoke and how much, questions, topics. Free.",
     "<b>✂ Clip to send</b>: choose from… to… and make a piece of video with subtitles or audio only.",
     "<b>Add the lecturer's slides (PDF)…</b>: puts the original slides in the notes, next to the words (chapter «The lecturer's slides»).",
     "<b>Rename</b>: changes the name of the recording, files and notes. <b>Open the folder</b>: opens the lecture's folder in File Explorer.",
     "<b>Delete the video</b>: frees space; notes, slides and transcript stay. <b>Delete the recording</b>: goes to the Windows Recycle Bin, where you can recover it if you make a mistake."
    ]
   },
   {
    "ico": "chat",
    "v": "chiparla",
    "t": "Who is speaking and statistics",
    "p": [
     "The program <b>separates the voices by itself</b>, on the PC: the transcript, notes and minutes say who said what. The first time it downloads a 26 MB model.",
     "In meetings and webinars Claude <b>suggests the names</b> from the participants and how they call each other (✨ = suggested). If unsure it stays «Voice 3». In class: whoever speaks most is «Teacher», the others «Question».",
     "Tap <b>⋯ More → Who speaks</b>: you see the transcript with the names. Tap a sentence to hear it again.",
     "<b>Name the voices…</b>: listen to a piece (▶ Listen) and type who it is, or tap one of the names below. Save: transcript and files are updated.",
     "<b>Statistics</b> (from Who is speaking or the ⋯ More): length, people, questions, to-dos; how much each person spoke, the longest turn and how long each topic took.",
     "For older recordings: <b>⋯ More</b> → «Recognise who is speaking». Turn it off in Settings («Recognise who is speaking»). It can make mistakes: fix the names whenever you like."
    ],
    "g": "lez"
   },
   {
    "ico": "share",
    "v": "condividi",
    "t": "Share, calendar and clips",
    "p": [
     "Tap <b>⋯ More → Share</b> and choose where to send the minutes (or the notes).",
     "<b>Email</b>: type the addresses (remembered for next time) and tap <b>Open in Outlook / Mail</b> (the PDF and the to-do calendar are already attached) or <b>Open in Gmail</b> (Gmail opens with everything filled in: drag the PDF from the folder that opens). The program never sends by itself: you press Send.",
     "<b>Word</b>: the .docx file to edit. <b>Google Docs</b>: if «Google Drive for desktop» is on the PC the file goes into your Drive by itself, folder «Verba Manent IA»; otherwise drag it onto the Drive page that opens.",
     "<b>To-dos in the calendar</b>: check the dates (spoken ones like «Friday» are already worked out) and tap <b>Outlook</b> or <b>Google Calendar</b>.",
     "<b>Slack, Teams, Notion, CRM</b>: connected once, with a few explained steps and an address (or key) to paste. With «Send the summary by itself» the minutes go out after each meeting. Addresses and keys stay on the PC, protected.",
     "<b>✂ Clip to send</b> (⋯ More, or ✂ next to a chapter): choose from… to… and tap <b>Video with subtitles</b> or <b>Audio only</b>. You find it in the «Clips» folder: send it by email or drag it into WhatsApp."
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
   "studio": "Studying",
   "lez": "My recordings",
   "imp": "Settings",
   "prob": "Help"
  }
 }
};
