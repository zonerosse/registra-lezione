/* Registra Lezione per Android: le stesse pagine del PC, con i testi e la guida adattati al telefono.
   Sul PC questo file non fa niente (la pagina non ha ?android=1 nell'indirizzo). */
'use strict';
const ANDROID = /[?&]android=1/.test(location.search);
if (ANDROID) {
  document.documentElement.classList.add('android');
  const AND = {
    it: {
      'pr.p': 'Microfono del telefono: penso a tutto io.',
      'pr.online': 'Meet, Teams, Zoom sul telefono: registro dal microfono (metti il vivavoce).',
      'pr.aula': 'Il docente è lì davanti: registro dal microfono del telefono.',
      'pr.prima': 'Prima di iniziare entra nella lezione e metti il vivavoce, con il volume alto.',
      'pr.prima.aula': 'Metti il telefono vicino alla cattedra, con il microfono verso il docente.',
      'lv.slide': 'batteria', 'lv.riduci': 'Puoi spegnere lo schermo o usare altre app: la registrazione continua. La vedi anche nelle notifiche.',
      'nav.arch': 'Lezioni', 'ar.h': 'Le mie lezioni',
      'ag.completo': "Si scarica l'app nuova: aprila e tocca «Installa».", 'ag.pagina': 'Scarica',
      'pt.dopo': '🌙 da trascrivere',
      'and.quando': 'Quando trascrivo?',
      'and.durante.t': 'Durante', 'and.durante': 'Pronta poco dopo la fine. Tieni il telefono in carica.',
      'and.dopo.t': 'Dopo', 'and.dopo': 'Consuma poca batteria. Trascrivo a fine lezione.',
      'and.stima.dur': 'Su questo telefono: 2 ore di lezione → pronta circa {m} min dopo la fine.',
      'and.stima.dopo': 'Su questo telefono: 2 ore di lezione → circa {t} di trascrizione dopo la fine (meglio sotto carica).',
      'and.stima.no': 'Dopo la prima lezione ti dico quanto ci mette questo telefono.',
      'and.imp': 'Telefono',
      'and.q.t': 'Quando trascrivo, di solito', 'and.q.s': 'Si può cambiare prima di ogni lezione.',
      'and.c.t': 'Trascrivi solo sotto carica', 'and.c.s': 'Con «Dopo»: aspetta il caricatore, così non scarichi la batteria fuori casa.',
      'and.agg.t': "Aggiorna l'app", 'and.agg.s': 'Versione {v}',
      'and.trascrivi': 'Trascrivi ora', 'and.datr': '🌙 Da trascrivere',
      'and.aspetto': 'Aspetto il caricatore: comincio a trascrivere appena colleghi il telefono (si cambia in Impostazioni).',
      'and.viva.t': 'Metti il vivavoce',
      'and.viva': "In questa versione l'app registra le lezioni online dal microfono: tieni la lezione in vivavoce, con il volume alto e il telefono fermo sul tavolo.",
      'and.viva.si': 'Ho capito, registra',
      'and.batt': 'Batteria {b}%',
      'mom.apri': "Apri l'audio", 'ar.vid': 'Audio', 'ar.b.video': '▶ audio', 'ar.elv.t': "Eliminare l'audio?", 'ar.m.vid': "Elimina l'audio ({g})",
      'fn.tras': 'Trascrizione',
      'pr.dnd': '', 'pt.mostra': 'Condividi',
      'im.k.dove': 'Si crea su platform.claude.com → Settings → API keys. Resta salvata solo su questo telefono, protetta.',
      'fn.pac': "Ogni parte è un pacchetto (slide + parole del docente): toccando «Condividi» lo mandi all'AI che usi (o metti la chiave di Claude in Impostazioni per gli appunti automatici).",
    },
    en: {
      'pr.p': 'Phone microphone: I take care of everything.',
      'pr.online': 'Meet, Teams, Zoom on the phone: I record from the microphone (use the speaker).',
      'pr.aula': 'The lecturer is right there: I record from the phone microphone.',
      'pr.prima': 'Before starting, join the lecture and turn on the speaker, with the volume up.',
      'pr.prima.aula': 'Put the phone close to the lecturer\'s desk, with the microphone towards the lecturer.',
      'lv.slide': 'battery', 'lv.riduci': 'You can turn the screen off or use other apps: recording continues. You also see it in the notifications.',
      'nav.arch': 'Lectures', 'ar.h': 'My lectures',
      'ag.completo': 'The new app is downloaded: open it and tap «Install».', 'ag.pagina': 'Download',
      'pt.dopo': '🌙 to transcribe',
      'and.quando': 'When do I transcribe?',
      'and.durante.t': 'During', 'and.durante': 'Ready soon after the end. Keep the phone charging.',
      'and.dopo.t': 'After', 'and.dopo': 'Uses little battery. I transcribe after the lecture.',
      'and.stima.dur': 'On this phone: a 2-hour lecture → ready about {m} min after the end.',
      'and.stima.dopo': 'On this phone: a 2-hour lecture → about {t} of transcription after the end (better while charging).',
      'and.stima.no': 'After the first lecture I will tell you how long this phone takes.',
      'and.imp': 'Phone',
      'and.q.t': 'When I transcribe, usually', 'and.q.s': 'You can change it before each lecture.',
      'and.c.t': 'Transcribe only while charging', 'and.c.s': 'With «After»: wait for the charger, so you don\'t drain the battery when out.',
      'and.agg.t': 'Update the app', 'and.agg.s': 'Version {v}',
      'and.trascrivi': 'Transcribe now', 'and.datr': '🌙 To transcribe',
      'and.aspetto': 'Waiting for the charger: I start transcribing as soon as you plug the phone in (you can change this in Settings).',
      'and.viva.t': 'Turn on the speaker',
      'and.viva': 'In this version the app records online lectures from the microphone: keep the lecture on speaker, with the volume up and the phone still on the table.',
      'and.viva.si': 'Got it, record',
      'and.batt': 'Battery {b}%',
      'mom.apri': 'Open the audio', 'ar.vid': 'Audio', 'ar.b.video': '▶ audio', 'ar.elv.t': 'Delete the audio?', 'ar.m.vid': 'Delete the audio ({g})',
      'fn.tras': 'Transcript',
      'pr.dnd': '', 'pt.mostra': 'Share',
      'im.k.dove': 'Create it on platform.claude.com → Settings → API keys. It is stored only on this phone, protected.',
      'fn.pac': 'Each part is a package (slides + the lecturer\'s words): tap «Share» to send it to the AI you use (or add your Claude key in Settings for automatic notes).',
    },
  };
  Object.assign(TESTI.it, AND.it);
  Object.assign(TESTI.en, AND.en);

  // la guida del telefono (i video arrivano con una prossima versione)
  GUIDA.it = {
    titolo: 'Guida', sotto: 'Come si usa Registra Lezione sul telefono, in pochi minuti.',
    capitoli: [
      {ico: 'spark', t: 'Perché Registra Lezione', perche: true, p: [
        '<b>Nessun bot nella riunione</b>: registra dal telefono quello che senti. Nessun «assistente» entra nella chiamata.',
        '<b>In aula e online</b>: in aula col microfono del telefono; online con la lezione in vivavoce.',
        '<b>La trascrizione si fa sul telefono</b>: l\'audio non va su internet. A Claude arriva solo il testo, e solo se scegli gli appunti automatici.',
        '<b>Appunti per studiare, non un riassunto</b>: Cornell per capire e ripassare, Formato Esame per prepararsi a rispondere, più le <b>flashcard</b> e <b>Chiedi alla lezione</b>.',
        '<b>Niente abbonamento</b>: paghi solo quello che usi con la tua chiave (circa 0,20 $ per ora registrata).',
        'Audio, appunti e trascrizioni restano <b>sul tuo telefono</b>: sono tuoi.']},
      {ico: 'rec', t: 'Registrare una lezione', p: [
        'Scegli <b>dove si tiene la lezione</b>. <b>In aula</b>: metti il telefono vicino alla cattedra (guarda le tacche verdi che si muovono); se il docente pubblica le slide in PDF, aggiungile con <b>Scegli il PDF…</b>. <b>Online</b>: entra nella lezione e metti il <b>vivavoce</b>, con il volume alto.',
        'Scrivi il nome, per esempio «Analisi 1 – Limiti». Le materie usate di recente compaiono sotto: un tocco e sono già scritte.',
        'Scegli <b>in che lingua parla il docente</b>.',
        'Scegli <b>Quando trascrivo</b>: <b>Durante</b> (la lezione è pronta poco dopo la fine, ma tieni il caricatore attaccato) o <b>Dopo</b> (il telefono registra e basta e trascrive a fine lezione, quando tocchi «Trascrivi ora»). Sotto c\'è quanto ci mette il tuo telefono.',
        'Tocca il pulsante rosso <b>REGISTRA</b>. La prima volta Android chiede il permesso di usare il microfono: tocca <b>Consenti</b>.']},
      {ico: 'pause', t: 'Durante la lezione', p: [
        'Puoi <b>spegnere lo schermo</b> o usare altre app: la registrazione continua. In alto, nelle notifiche, c\'è «Registro» con <b>Pausa</b> e <b>Fine</b>.',
        '<b>Pausa</b> durante l\'intervallo: non registra niente e il tempo si ferma. <b>Riprendi</b> quando ricomincia.',
        'Se hai scelto «Durante» e il telefono non è in carica, compare <b>Collega il caricatore</b>.',
        'Ogni 30 minuti (o ogni ora, in Impostazioni) prepara una <b>parte</b>. Con gli appunti automatici, Claude comincia a scriverli subito.']},
      {ico: 'stop', t: 'Fine della lezione', p: [
        'Tocca <b>Fine</b> (nell\'app o nella notifica) e conferma.',
        'Con «Durante»: trascrive l\'ultima parte e prepara la lezione. Puoi chiudere l\'app: una <b>notifica</b> ti avvisa quando è pronta.',
        'Con «Dopo»: la lezione resta in «Le mie lezioni» con <b>Trascrivi ora</b>. Toccalo quando vuoi, meglio la sera col caricatore attaccato.',
        'Quando è pronta, tocca <b>Apri gli appunti</b>: si aprono con il lettore PDF del telefono, da dove puoi anche condividerli.']},
      {ico: 'doc', t: 'I due formati degli appunti', p: [
        '<b>Cornell</b>: domande a sinistra, appunti a destra, riassunto in fondo. Per capire e ripassare.',
        '<b>Formato Esame</b>: le domande più probabili, con le stelle (★★★ = il docente ci ha insistito), lo schema della risposta e le parole chiave; in fondo una simulazione d\'esame.',
        'Il formato si sceglie in <b>Impostazioni</b>. Una lezione può avere anche tutti e due: in «Le mie lezioni» ⋯ → «Crea anche in…».',
        'Gli appunti li scrive Claude: <b>controllali sempre</b>. Quello che Claude aggiunge di suo è <b>in viola</b>; citazioni, minuti e slide che non tornano con la registrazione hanno <b>⚠ da verificare</b>.']},
      {ico: 'lib', t: 'Le mie lezioni', p: [
        'Qui trovi tutte le lezioni, con la ricerca per nome o data.',
        '<b>Apri appunti</b>, <b>Trascrizione</b> e <b>Audio</b>. <b>Trascrivi ora</b> sulle lezioni registrate con «Dopo».',
        'Nel menu <b>⋯</b>: crea o rifai gli appunti, mappa mentale, slide del docente in PDF, rinomina, elimina l\'audio (libera spazio, gli appunti restano) o tutta la lezione.',
        'Se il telefono si è spento mentre lavorava, tocca <b>Completa</b>.']},
      {ico: 'cards', t: 'Ripassare con le flashcard', p: [
        'Tocca <b>Ripassa</b> su una lezione, oppure in alto <b>Ripassa la materia</b>.',
        'Leggi la domanda e pensa alla risposta. Tocca la carta per girarla, poi tocca <b>La sapevo</b> o <b>Da rivedere</b>.',
        'Quelle da rivedere tornano per prime la volta dopo. Non costa niente.']},
      {ico: 'chat', t: 'Chiedi, mappa mentale e slide del docente', p: [
        '<b>Chiedi</b>: scrivi cosa non hai capito. La risposta usa solo quello che ha detto il docente e indica slide e minuto: tocca il minuto e riascolti quel punto. Meno di 1 centesimo a domanda.',
        '<b>Mappa mentale</b> (menu <b>⋯</b>): lo schema ad albero della lezione, da salvare in PDF. Circa 1 centesimo, una volta sola.',
        '<b>Slide del docente</b> (menu <b>⋯</b>): scegli il PDF delle slide e gli appunti vengono rifatti con le slide originali.']},
      {ico: 'set', t: 'Impostazioni', p: [
        '<b>Lingua</b>, <b>Appunti con Claude</b> (la chiave resta protetta dal telefono), <b>Formato degli appunti</b>.',
        '<b>Quando trascrivo, di solito</b> e <b>Trascrivi solo sotto carica</b>: con «Dopo» il telefono aspetta il caricatore prima di trascrivere.',
        '<b>Trascrizione più precisa</b>: sbaglia meno, ma ci mette circa una volta e mezza il tempo.',
        '<b>Parole difficili</b>: per ogni materia nomi e termini tecnici, così la trascrizione li sbaglia molto meno.',
        '<b>I tuoi dati</b> (nome, università, corso, anno): compaiono sugli appunti.']},
      {ico: 'info', t: 'Aggiornamenti e assistenza', p: [
        'In Impostazioni tocca <b>Aggiorna l\'app</b> → <b>Cerca aggiornamenti</b>. Se c\'è una versione nuova tocca <b>Scarica</b>, poi apri il file scaricato e tocca <b>Installa</b>: lezioni e appunti restano.',
        'Nella stessa pagina c\'è <b>Assistenza</b> (Punto Web Ferrara).']},
      {ico: 'aud', t: 'Se qualcosa non va', p: [
        '<b>Le tacche verdi non si muovono</b>: in Impostazioni di Android → App → Registra Lezione → Autorizzazioni, consenti il <b>Microfono</b>.',
        '<b>La registrazione si ferma a schermo spento</b>: in Impostazioni di Android → App → Registra Lezione → Batteria, scegli <b>Senza restrizioni</b>.',
        '<b>Gli appunti non arrivano</b>: serve internet; tocca <b>Riprova</b> accanto alla parte.',
        '<b>La prima volta</b> l\'app scarica il riconoscitore vocale (circa 190 MB): meglio col Wi-Fi.',
        '<b>Poco spazio</b>: in «Le mie lezioni» elimina l\'audio delle lezioni vecchie (gli appunti restano).']},
    ]};
  GUIDA.en = {
    titolo: 'Guide', sotto: 'How to use Registra Lezione on your phone, in a few minutes.',
    capitoli: [
      {ico: 'spark', t: 'Why Registra Lezione', perche: true, p: [
        '<b>No bot in the meeting</b>: it records on the phone what you hear. No «assistant» joins the call.',
        '<b>In class and online</b>: in class with the phone microphone; online with the lecture on speaker.',
        '<b>Transcription happens on the phone</b>: the audio does not go on the internet. Claude only gets the text, and only if you choose automatic notes.',
        '<b>Notes to study, not a summary</b>: Cornell to understand and review, Exam Format to get ready to answer, plus <b>flashcards</b> and <b>Ask the lecture</b>.',
        '<b>No subscription</b>: you only pay what you use with your key (about $0.20 per recorded hour).',
        'Audio, notes and transcripts stay <b>on your phone</b>: they are yours.']},
      {ico: 'rec', t: 'Recording a lecture', p: [
        'Choose <b>where the lecture is</b>. <b>In the classroom</b>: put the phone close to the desk (watch the green bars move); if the lecturer publishes the slides as a PDF, add them with <b>Choose the PDF…</b>. <b>Online</b>: join the lecture and turn on the <b>speaker</b>, with the volume up.',
        'Type the name, for example «Calculus 1 – Limits». Recent subjects appear below: one tap and they are typed.',
        'Choose <b>which language the lecturer speaks</b>.',
        'Choose <b>When do I transcribe</b>: <b>During</b> (ready soon after the end, but keep the charger plugged in) or <b>After</b> (the phone only records and transcribes after the lecture, when you tap «Transcribe now»). Below you see how long your phone takes.',
        'Tap the red <b>RECORD</b> button. The first time Android asks to use the microphone: tap <b>Allow</b>.']},
      {ico: 'pause', t: 'During the lecture', p: [
        'You can <b>turn the screen off</b> or use other apps: recording continues. In the notifications there is «Recording» with <b>Pause</b> and <b>Stop</b>.',
        '<b>Pause</b> during the break: nothing is recorded and the time stops. <b>Resume</b> when it starts again.',
        'If you chose «During» and the phone is not charging, <b>Plug in the charger</b> appears.',
        'Every 30 minutes (or every hour, in Settings) a <b>part</b> is prepared. With automatic notes, Claude starts writing them right away.']},
      {ico: 'stop', t: 'End of the lecture', p: [
        'Tap <b>Stop</b> (in the app or in the notification) and confirm.',
        'With «During»: it transcribes the last part and prepares the lecture. You can close the app: a <b>notification</b> tells you when it is ready.',
        'With «After»: the lecture stays in «My lectures» with <b>Transcribe now</b>. Tap it whenever you like, better in the evening with the charger plugged in.',
        'When it is ready, tap <b>Open notes</b>: they open in the phone PDF reader, where you can also share them.']},
      {ico: 'doc', t: 'The two note formats', p: [
        '<b>Cornell</b>: questions on the left, notes on the right, summary at the bottom. To understand and review.',
        '<b>Exam Format</b>: the most likely questions, with stars (★★★ = the lecturer insisted on it), the answer outline and keywords; at the end a mock exam.',
        'Choose the format in <b>Settings</b>. A lecture can have both: in «My lectures» ⋯ → «Also create in…».',
        'The notes are written by Claude: <b>always check them</b>. What Claude adds on its own is <b>in purple</b>; quotes, minutes and slides that do not match the recording have <b>⚠ to check</b>.']},
      {ico: 'lib', t: 'My lectures', p: [
        'Here are all your lectures, with search by name or date.',
        '<b>Open notes</b>, <b>Transcript</b> and <b>Audio</b>. <b>Transcribe now</b> on lectures recorded with «After».',
        'In the <b>⋯</b> menu: create or redo the notes, mind map, lecturer\'s slides as PDF, rename, delete the audio (frees space, notes stay) or the whole lecture.',
        'If the phone switched off while working, tap <b>Complete</b>.']},
      {ico: 'cards', t: 'Reviewing with flashcards', p: [
        'Tap <b>Review</b> on a lecture, or <b>Review the subject</b> at the top.',
        'Read the question and think of the answer. Tap the card to flip it, then tap <b>I knew it</b> or <b>Review again</b>.',
        'Cards to review come back first next time. It costs nothing.']},
      {ico: 'chat', t: 'Ask, mind map and lecturer\'s slides', p: [
        '<b>Ask</b>: write what you did not understand. The answer only uses what the lecturer said and shows slide and minute: tap the minute to listen to that point again. Less than 1 cent per question.',
        '<b>Mind map</b> (<b>⋯</b> menu): the tree outline of the lecture, to save as PDF. About 1 cent, once.',
        '<b>Lecturer\'s slides</b> (<b>⋯</b> menu): choose the slides PDF and the notes are redone with the original slides.']},
      {ico: 'set', t: 'Settings', p: [
        '<b>Language</b>, <b>Notes with Claude</b> (the key stays protected by the phone), <b>Note format</b>.',
        '<b>When I transcribe, usually</b> and <b>Transcribe only while charging</b>: with «After» the phone waits for the charger before transcribing.',
        '<b>More accurate transcription</b>: fewer mistakes, but about one and a half times the time.',
        '<b>Difficult words</b>: names and technical terms for each subject, so the transcription gets them right.',
        '<b>Your details</b> (name, university, course, year): they appear on the notes.']},
      {ico: 'info', t: 'Updates and support', p: [
        'In Settings tap <b>Update the app</b> → <b>Check for updates</b>. If there is a new version tap <b>Download</b>, then open the downloaded file and tap <b>Install</b>: lectures and notes stay.',
        'On the same page there is <b>Support</b> (Punto Web Ferrara).']},
      {ico: 'aud', t: 'If something goes wrong', p: [
        '<b>The green bars do not move</b>: in Android Settings → Apps → Registra Lezione → Permissions, allow the <b>Microphone</b>.',
        '<b>Recording stops with the screen off</b>: in Android Settings → Apps → Registra Lezione → Battery, choose <b>Unrestricted</b>.',
        '<b>Notes do not arrive</b>: you need internet; tap <b>Retry</b> next to the part.',
        '<b>The first time</b> the app downloads the speech recogniser (about 190 MB): better on Wi-Fi.',
        '<b>Low space</b>: in «My lectures» delete the audio of old lectures (notes stay).']},
    ]};
}
