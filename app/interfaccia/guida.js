/* Guida all'uso, in italiano e in inglese. Ogni capitolo: icona, video (video/<v>-<lingua>.webm), titolo, passi (HTML semplice). */
'use strict';
const GUIDA = {
  it: {
    titolo: 'Guida', sotto: 'Come si usa Registra Lezione, in pochi minuti. Ogni capitolo ha un video breve.',
    capitoli: [
      {ico: 'spark', t: 'Perché Registra Lezione', perche: true, p: [
        '<b>Nessun bot nella riunione</b>: registra dal tuo PC quello che vedi e senti. Nessun «assistente» entra nella chiamata e nessuno deve accettarlo.',
        '<b>Funziona con tutto</b>: Meet, Teams, Zoom, webinar, video online… e con «Importa un video» anche le lezioni riprese col telefono o scaricate dall\'università.',
        '<b>La trascrizione si fa sul tuo PC</b>: l\'audio non va su internet. A Claude arrivano solo testo e slide, e solo se scegli gli appunti automatici.',
        '<b>Le slide le fotografa da solo</b> e le mette negli appunti accanto alle parole del docente, con il punto preciso della lezione.',
        '<b>Appunti per studiare, non un riassunto</b>: Cornell per capire e ripassare, Formato Esame per prepararsi a rispondere. Anche tutti e due sulla stessa lezione.',
        '<b>Niente abbonamento</b>: paghi solo quello che usi con la tua chiave (circa 0,20 $ per ora registrata), oppure porti i pacchetti all\'AI che preferisci.',
        '<b>Lezioni in altre lingue</b>: gli appunti arrivano nella tua lingua, con i termini tecnici originali tra parentesi.',
        'Video, appunti e trascrizioni restano <b>sul tuo PC</b>: sono tuoi.']},
      {ico: 'rec', v: 'registrare', t: 'Registrare una lezione', p: [
        'Entra nella lezione (Meet, Teams, Zoom…) e tieni la sua finestra sullo <b>schermo principale</b>, con il volume acceso.',
        'In <b>Registra</b> scrivi il nome, per esempio «Analisi 1 – Limiti». Data e ora le aggiunge il programma. Le materie usate di recente compaiono sotto: un tocco e sono già scritte.',
        'Scegli <b>in che lingua parla il docente</b>. Se non è la lingua del programma, gli appunti arrivano comunque tradotti, con i termini tecnici originali tra parentesi.',
        'Tocca il pulsante rosso <b>REGISTRA</b>. Se te lo chiede, attiva «Non disturbare» di Windows: così i suoni delle notifiche non finiscono nella registrazione.',
        'Hai già un video della lezione (dal telefono o dall\'università)? Tocca <b>Importa un video…</b> sotto il pulsante rosso: diventa una registrazione come le altre, con trascrizione, slide e appunti.']},
      {ico: 'imp', v: 'importa', t: 'Importare un video', p: [
        'Tocca <b>Importa un video…</b> sotto il pulsante rosso e scegli il file (mp4, mov, mkv…): per esempio una lezione ripresa col telefono.',
        'Nome e lingua li propone il programma: correggili se serve. Dì se il video mostra lo schermo con le slide o solo il docente.',
        'Tocca <b>Importa e prepara gli appunti</b>: copia il video, estrae l\'audio, cerca le slide, trascrive e prepara gli appunti. Il file originale resta dov\'è.']},
      {ico: 'pause', v: 'durante', t: 'Durante la lezione', p: [
        'La finestra grande si riduce e compare la <b>mini finestra</b> in basso a destra, sempre in primo piano. Si sposta trascinandola dall\'alto. Non finisce nel video.',
        '<b>Pausa</b> durante l\'intervallo: non registra niente e il tempo si ferma. <b>Riprendi</b> quando ricomincia.',
        'Le slide vengono fotografate da sole quando cambiano sullo schermo.',
        'Ogni 30 minuti (o ogni ora, in Impostazioni) prepara un <b>pacchetto</b>: slide e parole del docente di quel tratto. Con gli appunti automatici, Claude comincia a scriverli subito.']},
      {ico: 'stop', v: 'fine', t: 'Fine della lezione', p: [
        'Tocca <b>Fine</b> nella mini finestra o nella finestra grande e conferma.',
        'Il programma trascrive l\'ultima parte, prepara il video e la trascrizione completa. Puoi lasciarlo lavorare e fare altro, ma <b>non spegnere il PC</b>.',
        'Quando compare «Registrazione salvata!», tocca <b>Apri gli appunti</b>.']},
      {ico: 'doc', v: 'formati', t: 'I due formati degli appunti', p: [
        '<b>Cornell</b>: domande a sinistra, appunti a destra, riassunto in fondo. Per capire e ripassare: copri la colonna degli appunti e prova a rispondere.',
        '<b>Formato Esame</b>: le domande più probabili, con le stelle (★★★ = il docente ci ha insistito). Per ognuna c\'è lo schema della risposta e le parole chiave; in fondo una simulazione d\'esame. Per prepararsi a rispondere.',
        'Il formato si sceglie in <b>Impostazioni</b>. Una lezione può avere anche tutti e due: in «Le mie registrazioni» ⋯ → «Crea anche in…».',
        'Gli appunti li scrive Claude dalla registrazione: <b>controllali sempre</b> sulle slide e sul libro.']},
      {ico: 'lib', v: 'registrazioni', t: 'Le mie registrazioni', p: [
        'Qui trovi tutte le lezioni, con la ricerca per nome o data.',
        '<b>Apri appunti</b>, <b>Trascrizione</b> (slide con sotto le parole del docente) e <b>Video</b>.',
        'Nel menu <b>⋯</b>: crea o rifai gli appunti, rinomina, apri la cartella, elimina il video (libera spazio, gli appunti restano) o tutta la registrazione (va nel Cestino).',
        'Se il PC si è spento mentre preparava i file, tocca <b>Completa</b>.']},
      {ico: 'set', v: 'impostazioni', t: 'Impostazioni', p: [
        '<b>Lingua</b>: italiano o inglese, per il programma e per gli appunti.',
        '<b>Intelligenza artificiale</b>: «Appunti automatici con Claude» con la tua chiave (circa 0,20 $ per ora registrata), oppure «Cartella per l\'AI che vuoi»: prepara solo i pacchetti zip da portare a Claude, ChatGPT, Gemini…',
        '<b>Formato degli appunti</b>, <b>ogni quanto preparo un pacchetto</b> (30 minuti o 1 ora), <b>mini finestra</b>, promemoria <b>Non disturbare</b>.',
        '<b>Dove salvo i pacchetti</b> e <b>I tuoi dati</b> (nome, università, corso, anno): compaiono sugli appunti e aiutano Claude.']},
      {ico: 'info', v: 'aggiornamenti', t: 'Aggiornamenti e assistenza', p: [
        'In basso a sinistra tocca <b>Aggiorna</b>: se c\'è una versione nuova, <b>Installa</b> e il programma si riapre già aggiornato.',
        'In <b>Informazioni</b> trovi <b>Assistenza</b> (Punto Web Ferrara).']},
      {ico: 'aud', t: 'Se qualcosa non va', p: [
        '<b>«Non sento nessun suono»</b>: controlla che il volume del PC non sia a zero e che l\'audio esca dalle casse o dalle cuffie.',
        '<b>Gli appunti non arrivano</b>: serve internet; tocca <b>Riprova</b> accanto alla parte. Se manca la chiave, inseriscila in Impostazioni.',
        '<b>Poco spazio</b>: in «Le mie registrazioni» elimina i video delle lezioni vecchie (gli appunti restano).',
        'Il file <b>registra_lezione.log</b> nella cartella «Lezioni registrate» racconta cosa è successo: mandalo all\'assistenza.']},
    ]},
  en: {
    titolo: 'Guide', sotto: 'How to use Registra Lezione, in a few minutes. Each chapter has a short video.',
    capitoli: [
      {ico: 'spark', t: 'Why Registra Lezione', perche: true, p: [
        '<b>No bot in the meeting</b>: it records from your PC what you see and hear. No «assistant» joins the call and nobody has to admit it.',
        '<b>Works with everything</b>: Meet, Teams, Zoom, webinars, online videos… and with «Import a video» also lectures filmed with your phone or downloaded from the university.',
        '<b>Transcription happens on your PC</b>: the audio never goes online. Claude only receives text and slides, and only if you choose automatic notes.',
        '<b>Slides are captured automatically</b> and placed in the notes next to the lecturer\'s words, with the exact point of the lecture.',
        '<b>Notes for studying, not a summary</b>: Cornell to understand and review, Exam format to get ready to answer. Even both for the same lecture.',
        '<b>No subscription</b>: you only pay for what you use with your own key (about 0.20 $ per recorded hour), or take the packages to the AI you prefer.',
        '<b>Lectures in other languages</b>: notes arrive in your language, with the original technical terms in brackets.',
        'Videos, notes and transcripts stay <b>on your PC</b>: they are yours.']},
      {ico: 'rec', v: 'registrare', t: 'Recording a lecture', p: [
        'Join the lecture (Meet, Teams, Zoom…) and keep its window on the <b>main screen</b>, with the volume on.',
        'In <b>Record</b> type the name, e.g. «Calculus 1 – Limits». The program adds date and time. Recent subjects appear below: one tap and they are typed in.',
        'Choose <b>which language the lecturer speaks</b>. If it is not the program language, the notes still arrive translated, with the original technical terms in brackets.',
        'Tap the red <b>RECORD</b> button. If asked, turn on Windows «Do not disturb», so notification sounds don\'t end up in the recording.',
        'Already have a video of the lecture (from your phone or the university)? Tap <b>Import a video…</b> below the red button: it becomes a recording like the others, with transcript, slides and notes.']},
      {ico: 'imp', v: 'importa', t: 'Importing a video', p: [
        'Tap <b>Import a video…</b> below the red button and pick the file (mp4, mov, mkv…): for example a lecture filmed with your phone.',
        'The program suggests name and language: fix them if needed. Say whether the video shows the screen with slides or only the lecturer.',
        'Tap <b>Import and prepare the notes</b>: it copies the video, extracts the audio, looks for slides, transcribes and prepares the notes. The original file stays where it is.']},
      {ico: 'pause', v: 'durante', t: 'During the lecture', p: [
        'The main window minimises and the <b>mini window</b> appears at the bottom right, always on top. Drag it from the top to move it. It does not end up in the video.',
        '<b>Pause</b> during the break: nothing is recorded and the clock stops. <b>Resume</b> when the lecture restarts.',
        'Slides are captured automatically when they change on screen.',
        'Every 30 minutes (or every hour, in Settings) a <b>package</b> is prepared: slides and the lecturer\'s words for that stretch. With automatic notes, Claude starts writing them straight away.']},
      {ico: 'stop', v: 'fine', t: 'End of the lecture', p: [
        'Tap <b>Stop</b> in the mini window or in the main window and confirm.',
        'The program transcribes the last part and prepares the video and the full transcript. You can do something else meanwhile, but <b>don\'t turn the PC off</b>.',
        'When «Recording saved!» appears, tap <b>Open the notes</b>.']},
      {ico: 'doc', v: 'formati', t: 'The two note formats', p: [
        '<b>Cornell</b>: questions on the left, notes on the right, summary at the bottom. To understand and review: cover the notes column and try to answer.',
        '<b>Exam format</b>: the most likely questions, with stars (★★★ = the lecturer stressed it). Each has an answer outline and keywords; a mock exam at the end. To get ready to answer.',
        'Choose the format in <b>Settings</b>. A lecture can also have both: in «My recordings» ⋯ → «Also create in…».',
        'Claude writes the notes from the recording: <b>always check them</b> against the slides and the textbook.']},
      {ico: 'lib', v: 'registrazioni', t: 'My recordings', p: [
        'All your lectures, with search by name or date.',
        '<b>Open notes</b>, <b>Transcript</b> (slides with the lecturer\'s words below) and <b>Video</b>.',
        'In the <b>⋯</b> menu: create or redo notes, rename, open the folder, delete the video (frees space, notes stay) or the whole recording (goes to the Recycle Bin).',
        'If the PC switched off while preparing the files, tap <b>Complete</b>.']},
      {ico: 'set', v: 'impostazioni', t: 'Settings', p: [
        '<b>Language</b>: Italian or English, for the program and the notes.',
        '<b>Artificial intelligence</b>: «Automatic notes with Claude» with your key (about 0.20 $ per recorded hour), or «Folder for the AI of your choice»: only the zip packages, to take to Claude, ChatGPT, Gemini…',
        '<b>Notes format</b>, <b>how often a package is prepared</b> (30 minutes or 1 hour), <b>mini window</b>, <b>Do not disturb</b> reminder.',
        '<b>Where packages are saved</b> and <b>Your details</b> (name, university, course, year): they appear on the notes and help Claude.']},
      {ico: 'info', v: 'aggiornamenti', t: 'Updates and support', p: [
        'Bottom left, tap <b>Update</b>: if there is a new version, <b>Install</b> and the program reopens already updated.',
        'In <b>About</b> you find <b>Support</b> (Punto Web Ferrara).']},
      {ico: 'aud', t: 'If something goes wrong', p: [
        '<b>«No sound for a minute»</b>: check that the PC volume is not at zero and that sound comes out of the speakers or headphones.',
        '<b>Notes don\'t arrive</b>: an internet connection is needed; tap <b>Retry</b> next to the part. If the key is missing, enter it in Settings.',
        '<b>Low disk space</b>: in «My recordings» delete the videos of old lectures (notes stay).',
        'The <b>registra_lezione.log</b> file in the recordings folder tells what happened: send it to support.']},
    ]},
};
