/* Registra Lezione per Android: le stesse pagine del PC, con i testi e la guida adattati al telefono.
   Sul PC questo file non fa niente (la pagina non ha ?android=1 nell'indirizzo). */
'use strict';
const ANDROID = /[?&]android=1/.test(location.search);
const IPHONE = /[?&]iphone=1/.test(location.search);       // sull'iPhone gli aggiornamenti arrivano dall'App Store
if (ANDROID) {
  document.documentElement.classList.add('android');
  const AND = {
    it: {
      'pv.1.t': 'Le registrazioni restano sul tuo telefono', 'im.pv.s': 'Cosa resta sul tuo telefono, cosa esce e verso chi', 'rq.si': "Il punto del programma in cui è successo l'errore, la versione e il tipo di telefono.",
      'pr.p': 'Microfono del telefono: penso a tutto io.',
      'pr.online': 'Meet, Teams, Zoom sul telefono: registro dal microfono (metti il vivavoce).',
      'pr.aula': 'Il docente è lì davanti: registro dal microfono del telefono.',
      'pr.prima': 'Prima di iniziare entra nella lezione e metti il vivavoce, con il volume alto.',
      'pr.prima.aula': 'Metti il telefono vicino alla cattedra, con il microfono verso il docente.',
      'lv.slide': 'batteria', 'lv.riduci': 'Puoi spegnere lo schermo o usare altre app: la registrazione continua. La vedi anche nelle notifiche.',
      'nav.arch': 'Lezioni', 'ar.h': 'Le mie lezioni',
      'ag.completo': "Si scarica l'app nuova: aprila e tocca «Installa».", 'ag.pagina': 'Scarica', 'ag.riapri.s': "L'app si chiude e si riapre da sola: ci vogliono pochi secondi. Le registrazioni non si perdono.",
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
      'src.mic.pred': '{n} (quello del telefono)', 'im.k.ok': '✓ Chiave salvata (protetta dal telefono)', 'ar.cerca': 'Cerca per nome o data…',
      'im.k.dove': 'Si crea su platform.claude.com → Settings → API keys. Resta salvata solo su questo telefono, protetta.',
      'nav.fare': 'Da fare', 'cf.v.studio': 'Usi il programma per studiare? Per le lezioni questa pagina non serve: trovi tutto in «Le mie lezioni».',
      'im.v.t': 'Hai già un audio della lezione?', 'im.v': 'mp3, m4a, wav… anche da Drive. Lo trascrivo e ne faccio gli appunti.', 'im.v.b': 'Importa un audio…', 'iv.h': 'Importa un audio', 'iv.p': "Il file originale resta dov'è.", 'iv.vai': 'Importa e trascrivi', 'iv.stima': 'Ci vorranno circa {t} per la trascrizione.',
      'it.b10': 'Un PDF, Word o testo con quello che ha detto il docente (anche il «Per Claude» di un\'altra registrazione), anche da Drive. Ne faccio gli appunti.', 'it.b.t': 'Hai già la trascrizione?', 'it.b': 'Un PDF con quello che ha detto il docente (anche il «Per Claude» di un\'altra registrazione), anche da Drive. Ne faccio gli appunti.',
      'dv.qui.t': 'Sul telefono', 'dv.qui': "Gratis, l'audio resta qui. Consuma batteria: meglio col caricatore.", 'dv.srv': "Pronta in un minuto, il telefono non scalda. Pochi centesimi l'ora sul tuo conto RunPod. L'audio va al server (in Europa) e viene cancellato finito il lavoro.", 'dv.chiave.s': 'Resta solo su questo telefono, protetta.', 'dv.via.s': "Il codice e la chiave vengono cancellati da questo telefono. Per usare di nuovo il server dovrai rimetterli. Se vuoi solo trascrivere sul telefono per un po', scegli «Sul telefono» qui sopra: non serve scollegare.", 'dv.qui.b': "Gratis, l'audio resta qui", 'dv.pc.h': 'Trascrizione sul telefono', 'dv.att.qui': '✓ Adesso trascrivo sul telefono', 'dv.att.manca': '✓ Adesso trascrivo sul telefono (il server non è ancora collegato: metti codice e chiave qui sotto)', 'dv.vel.t': 'Velocità di questo telefono', 'dv.lim.pc': "ℹ Da sapere: consuma batteria e il telefono scalda: meglio col caricatore. Non chiudere l'app finché non ha finito.", 'dv.cosa': "Cos'è il server? Un computer molto potente a noleggio (RunPod, in Europa) che trascrive al posto del telefono: un'ora di lezione in circa un minuto, e il telefono non scalda. Si paga solo il tempo che lavora, pochi centesimi per un'ora di lezione. L'audio viene cancellato appena finito.",
      'cal.privato': 'Il link resta solo su questo telefono. Il programma legge il calendario, non lo modifica.',
      'sp.ok': '«{f}» ({mb} MB) è pronto: mandalo con «Manda con…» (WhatsApp, Telegram…) o per email.',
      'vc.nota': "L'app separa le voci da sola, sul telefono: l'audio non va su internet. Può sbagliare: i nomi si correggono con «Dai i nomi alle voci».",
      'vc.nota.lez': "In aula chi parla di più è «Docente», gli altri «Domanda». L'app separa le voci da sola, sul telefono: l'audio non va su internet.",
      'cal.s': "Collega il calendario (o scrivi l'orario delle lezioni): quando inizia un impegno arriva una notifica, anche con l'app chiusa. La tocchi e il nome è già scritto.",
      'cd.em.nota': "Si apre l'app di posta (Gmail…) con il PDF già allegato: controlla e premi Invia.",
      'cd.cal.nota': 'Si apre il calendario del telefono con l\'impegno già scritto: tocca «Salva» (se sono più di uno, uno dopo l\'altro). Le righe senza data non vanno nel calendario.',
      'es.cal.s': 'Le date del piano di studio, da mettere nel calendario: si apre il menu «Manda con…», scegli l\'app del calendario (o salva il file e importalo da calendar.google.com).',
      'dd.nodir': 'Sul telefono Claude vede le parti già trascritte: con «Durante» arrivano mentre registri, con «Dopo» solo alla fine.',
      'sp.cartella': 'Manda con…', 'sp.audio': 'Crea lo spezzone', 'sp.nota': 'Scorciatoia: tocca ✂ accanto a un capitolo. Sul telefono lo spezzone è solo audio.',
      'cg.s': 'Email, Word e calendario funzionano subito, dal pulsante «Condividi» di ogni registrazione. Questi si collegano una volta sola:',
      'im.voci.s': "Nella trascrizione e negli appunti c'è scritto chi ha detto cosa. Tutto sul telefono: l'audio non va su internet. La prima volta scarica un modello di 26 MB.",
      'fn.pac': "Ogni parte è un file per l'AI (slide + parole del docente): toccando «Condividi» lo mandi all'AI che usi (o metti la chiave di Claude in Impostazioni per gli appunti automatici).",
    },
    en: {
      'pv.1.t': 'Recordings stay on your phone', 'im.pv.s': 'What stays on your phone, what leaves and where it goes', 'rq.si': 'Where in the program the error happened, the version and the type of phone.',
      'pr.p': 'Phone microphone: I take care of everything.',
      'pr.online': 'Meet, Teams, Zoom on the phone: I record from the microphone (use the speaker).',
      'pr.aula': 'The lecturer is right there: I record from the phone microphone.',
      'pr.prima': 'Before starting, join the lecture and turn on the speaker, with the volume up.',
      'pr.prima.aula': 'Put the phone close to the lecturer\'s desk, with the microphone towards the lecturer.',
      'lv.slide': 'battery', 'lv.riduci': 'You can turn the screen off or use other apps: recording continues. You also see it in the notifications.',
      'nav.arch': 'Lectures', 'ar.h': 'My lectures',
      'ag.completo': 'The new app is downloaded: open it and tap «Install».', 'ag.pagina': 'Download', 'ag.riapri.s': 'The app closes and reopens by itself: it takes a few seconds. Recordings are not lost.',
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
      'src.mic.pred': '{n} (phone default)', 'im.k.ok': '✓ Key saved (protected by the phone)', 'ar.cerca': 'Search by name or date…',
      'im.k.dove': 'Create it on platform.claude.com → Settings → API keys. It is stored only on this phone, protected.',
      'nav.fare': 'To-dos', 'cf.v.studio': 'Using it to study? For lectures you do not need this page: everything is in «My lectures».',
      'im.v.t': 'Already have an audio of the lecture?', 'im.v': 'mp3, m4a, wav… also from Drive. I transcribe it and make the notes.', 'im.v.b': 'Import an audio…', 'iv.h': 'Import an audio', 'iv.p': 'The original file stays where it is.', 'iv.vai': 'Import and transcribe', 'iv.stima': 'The transcript will take about {t}.',
      'it.b10': 'A PDF, Word or text file with what the lecturer said (even the «For Claude» file of another recording), also from Drive. I turn it into notes.', 'it.b.t': 'Already have the transcript?', 'it.b': 'A PDF with what the lecturer said (even the «For Claude» file of another recording), also from Drive. I turn it into notes.',
      'dv.qui.t': 'On the phone', 'dv.qui': 'Free, the audio stays here. Uses battery: better while charging.', 'dv.srv': 'Ready in a minute, the phone does not heat up. A few cents per hour on your RunPod account. The audio goes to the server (in Europe) and is deleted when the work is done.', 'dv.chiave.s': 'It stays only on this phone, protected.', 'dv.via.s': 'Code and key are deleted from this phone. To use the server again you will have to enter them again. If you just want to transcribe on the phone for a while, choose «On the phone» above: no need to disconnect.', 'dv.qui.b': 'Free, the audio stays here', 'dv.pc.h': 'Transcription on the phone', 'dv.att.qui': '✓ Right now I transcribe on the phone', 'dv.att.manca': '✓ Right now I transcribe on the phone (the server is not connected yet: enter code and key below)', 'dv.vel.t': 'Speed of this phone', 'dv.lim.pc': 'ℹ Good to know: it uses battery and the phone heats up: better while charging. Do not close the app until it has finished.', 'dv.cosa': 'What is the server? A very powerful rented computer (RunPod, in Europe) that transcribes instead of the phone: an hour of lecture in about a minute, and the phone does not heat up. You only pay for the time it works, a few cents per hour of lecture. The audio is deleted as soon as it is done.',
      'cal.privato': 'The link stays only on this phone. The app reads the calendar, it does not change it.',
      'sp.ok': '«{f}» ({mb} MB) is ready: send it with «Send with…» (WhatsApp, Telegram…) or by email.',
      'vc.nota': 'The app separates the voices by itself, on the phone: the audio does not go on the internet. It can make mistakes: fix the names with «Name the voices».',
      'vc.nota.lez': 'In class whoever speaks most is «Lecturer», the others «Question». The app separates the voices by itself, on the phone: the audio does not go on the internet.',
      'cal.s': 'Connect your calendar (or type your timetable): when an event starts you get a notification, even with the app closed. Tap it and the name is already filled in.',
      'cd.em.nota': 'Your mail app (Gmail…) opens with the PDF already attached: check it and press Send.',
      'cd.cal.nota': 'The phone calendar opens with the appointment already filled in: tap «Save» (if there are several, one after the other). Rows without a date do not go into the calendar.',
      'es.cal.s': 'The dates of the study plan, for your calendar: the «Send with…» menu opens, choose your calendar app (or save the file and import it on calendar.google.com).',
      'dd.nodir': 'On the phone Claude sees the parts already transcribed: with «During» they arrive while you record, with «After» only at the end.',
      'sp.cartella': 'Send with…', 'sp.audio': 'Create the clip', 'sp.nota': 'Shortcut: tap ✂ next to a chapter. On the phone the clip is audio only.',
      'cg.s': 'Email, Word and calendar work right away, from the «Share» button of each recording. These are connected once:',
      'im.voci.s': 'The transcript and the notes say who said what. All on the phone: the audio does not go on the internet. The first time it downloads a 26 MB model.',
      'fn.pac': 'Each part is a file for AI (slides + the lecturer\'s words): tap «Share» to send it to the AI you use (or add your Claude key in Settings for automatic notes).',
    },
  };
  // messaggio «Avvisa»: sul telefono la registrazione resta sul telefono, non sul computer
  ['riu', 'lez', 'aula', 'web'].forEach(k => {
    AND.it['av.m.' + k] = TESTI.it['av.m.' + k].replace('sul mio computer', 'sul mio telefono');
    AND.en['av.m.' + k] = TESTI.en['av.m.' + k].replace('on my computer', 'on my phone');
  });
  Object.assign(TESTI.it, AND.it);
  Object.assign(TESTI.en, AND.en);

  // la guida del telefono (video: video/tel-<v>-<lingua>.webm)
  GUIDA.it = {
 "titolo": "Guida",
 "sotto": "Come si usa Verba Manent IA sul telefono, passo per passo, diviso per argomento.",
 "capitoli": [
  {
   "ico": "spark",
   "t": "Perché Verba Manent IA",
   "perche": true,
   "p": [
    "<b>Per studiare e per lavorare</b>: lezioni, riunioni di lavoro e webinar. Per ognuno prepara la cosa giusta: appunti per studiare, <b>verbale</b> con decisioni e cose da fare, punti chiave.",
    "<b>Nessun bot nella riunione</b>: registra dal telefono quello che senti. Nessun «assistente» entra nella chiamata.",
    "<b>In aula e online</b>: in aula col microfono del telefono; online con la chiamata in vivavoce. E c'è anche il programma per il PC.",
    "<b>Hai già la lezione?</b> Un audio o la trascrizione già scritta: ne fa gli appunti.",
    "<b>Trascrive sul telefono, o in un minuto sul server</b>: sul telefono è gratis e l'audio resta lì; col server veloce un'ora di lezione è pronta in circa un minuto, per pochi centesimi, e il telefono non scalda.",
    "<b>Sa chi parla</b>: separa le voci da solo e nella trascrizione e nel verbale scrive chi ha detto cosa.",
    "<b>Le slide del docente</b>: con il PDF delle slide le mette negli appunti accanto alle parole.",
    "<b>Scrive giusti i termini difficili</b>: per ogni materia gli dai nomi e parole tecniche, e non li sbaglia più.",
    "<b>Tutto in un posto</b>: cerca una parola in tutte le registrazioni, le cose da fare di tutte le riunioni in <b>Da fare</b>, il calendario che avvisa; il verbale va per email, WhatsApp, Slack, Teams, Notion o nel CRM.",
    "<b>Per l'esame</b>: Cornell, Formato Esame, flashcard, «Chiedi alla lezione», la preparazione all'esame su tutto il corso, la simulazione scritta e l'interrogazione a voce corrette da Claude.",
    "<b>Da dare a chi ti fidi</b>: con un invito dai l'app già pronta, con le tue chiavi, senza fargliele vedere.",
    "<b>Due modi di pagare</b>: con la tua chiave di Claude paghi solo quello che usi (circa 0,20 $ per ora registrata). Oppure, prossimamente, con un abbonamento che comprende già Claude e il server veloce, senza chiavi da mettere.",
    "Audio, appunti e trascrizioni restano <b>sul tuo telefono</b>: sono tuoi."
   ],
   "g": "primi"
  },
  {
   "ico": "set",
   "t": "La chiave di Claude o un invito",
   "p": [
    "Gli appunti, «Chiedi», le mappe e l'esame li scrive <b>Claude</b>. Serve una chiave, oppure un invito di chi te la presta.",
    "<b>Con la tua chiave</b>: in <b>Impostazioni → Intelligenza artificiale</b> incolla la chiave (si crea su platform.claude.com → Settings → API keys) e tocca <b>Prova e salva</b>. Resta solo sul telefono, protetta. Costo: circa 0,20 $ per ora registrata.",
    "<b>Con un invito</b>: chi ti invita ti manda un messaggio su WhatsApp. Copialo tutto, poi in <b>Impostazioni → Ho un invito</b> incollalo e tocca <b>Attiva</b>. Le chiavi arrivano già pronte, senza che tu le veda; quello che usi lo paga chi ti ha invitato.",
    "<b>Senza chiave</b> l'app registra e trascrive lo stesso, ma gli appunti non si creano."
   ],
   "g": "primi",
   "v": "tel-chiave"
  },
  {
   "ico": "info",
   "t": "Aggiornamenti e assistenza",
   "p": [
    "Quando apri l'app e c'è una versione nuova, dopo qualche secondo compare l'avviso <b>«È pronta la versione…»</b> con le novità.",
    "Tocca <b>Aggiorna e riapri</b>: l'app si chiude e si riapre da sola, già aggiornata, in pochi secondi. Registrazioni e appunti restano. Con <b>Più tardi</b> l'avviso torna alla prossima apertura.",
    "Se serve l'app nuova il bottone è <b>Scarica</b>: apri il file scaricato e tocca <b>Installa</b>. Registrazioni e appunti restano.",
    "Puoi cercare anche a mano: <b>Impostazioni → Aggiorna l'app → Cerca aggiornamenti</b>. Nella stessa pagina c'è <b>Assistenza</b> (Punto Web Ferrara)."
   ],
   "g": "primi",
   "v": "tel-aggiornamenti"
  },
  {
   "ico": "rec",
   "v": "tel-registrare",
   "t": "Registrare",
   "p": [
    "<b>Prima di iniziare</b>: online, entra nella chiamata e metti il <b>vivavoce</b>, con il volume alto; in aula, metti il telefono vicino a chi parla, con il microfono verso di lui.",
    "Sotto «Che cosa registri?» scegli <b>Lezione</b>, <b>Riunione di lavoro</b> o <b>Webinar o corso</b>.",
    "In «Dove si tiene?» scegli <b>In aula</b> o <b>Online</b>. In aula, nella stessa scheda compaiono il <b>microfono</b> (guarda le tacche verdi che si muovono) e <b>Slide del docente</b>: se il docente pubblica il PDF, aggiungilo con <b>Scegli il PDF…</b>.",
    "Scrivi il <b>nome</b>, per esempio «Analisi 1 – Limiti»: deve dire cos'è (capitolo «Il nome della registrazione»). Le materie usate di recente compaiono sotto: un tocco e sono già scritte. Scegli <b>in che lingua si parla</b>.",
    "Scegli <b>Quando trascrivo</b>: <b>Durante</b> (pronta poco dopo la fine, ma tieni il caricatore attaccato) o <b>Dopo</b> (registra e basta; trascrive quando tocchi «Trascrivi ora»). Sotto c'è quanto ci mette il tuo telefono.",
    "Tocca il pulsante rosso <b>REGISTRA</b>. La prima volta Android chiede il permesso di usare il microfono: tocca <b>Consenti</b>."
   ],
   "g": "reg"
  },
  {
   "ico": "edit",
   "t": "Il nome della registrazione",
   "p": [
    "Il nome deve dire cos'è: <b>la materia o l'argomento</b>, per esempio «Chimica – Zuccheri». Nomi come «b», «aaa», «Lezione» o «prova» non vanno bene: compare un avviso grigio e REGISTRA resta spento.",
    "<b>Due registrazioni non possono avere lo stesso nome.</b> Se il nome c'è già, l'app lo dice e propone nomi liberi, per esempio «Analisi 1 – 17/10»: un tocco e lo usi.",
    "Per cambiarlo dopo: <b>⋯ Altro → Rinomina</b>."
   ],
   "g": "reg",
   "v": "tel-nome"
  },
  {
   "ico": "chat",
   "t": "Riunioni di lavoro e webinar",
   "p": [
    "Scegli <b>Riunione di lavoro</b> e scrivi <b>chi partecipa</b>: i nomi finiscono giusti nel verbale.",
    "Alla fine arriva il <b>verbale</b>: in breve, decisioni, <b>cose da fare</b> (chi, entro quando), cosa resta da decidere, prossima riunione e capitoli. Per i <b>webinar</b> arrivano i <b>punti chiave</b>.",
    "Sotto «Che riunione è?» scegli un <b>modello</b> (vendita, colloquio, 1 a 1, consiglio di classe, condominio, consulenza o ✎ il tuo): il verbale ha le sezioni giuste.",
    "Se la riunione ha lo stesso nome di una precedente, compare <b>Dall'ultima volta</b>: le cose rimaste da fare. Se nella riunione si dice che sono fatte, si spuntano da sole.",
    "Nomi, date e cifre li scrive Claude dalla registrazione: <b>controllali sempre</b> prima di mandare il verbale."
   ],
   "g": "reg"
  },
  {
   "ico": "pause",
   "v": "tel-durante",
   "t": "Durante la registrazione",
   "p": [
    "Puoi <b>spegnere lo schermo</b> o usare altre app: la registrazione continua. Nelle notifiche c'è «Registro» con <b>Pausa</b> e <b>Fine</b>.",
    "<b>Pausa</b> durante l'intervallo: non registra niente e il tempo si ferma. <b>Riprendi</b> quando ricomincia.",
    "Se hai scelto «Durante» e il telefono non è in carica, compare <b>Collega il caricatore</b>.",
    "Ogni 30 minuti (o ogni ora, in Impostazioni) prepara una <b>parte</b>. Con gli appunti automatici, Claude comincia subito a scriverli.",
    "<b>Le tue note</b>: scrivi due parole e premi Invio, o tocca ⭐ <b>Importante</b>, ❓ <b>Da chiarire</b>, ✅ <b>Cosa da fare</b>. La nota prende il minuto giusto e Claude la mette negli appunti.",
    "<b>Chiedi adesso</b>: ti sei distratto? Chiedi cosa si è detto. Claude vede le parti già trascritte (con «Durante»). Circa 1 centesimo a domanda."
   ],
   "g": "reg"
  },
  {
   "ico": "stop",
   "v": "tel-fine",
   "t": "Fine della registrazione",
   "p": [
    "Tocca <b>Fine</b> (nell'app o nella notifica) e conferma.",
    "Con «Durante»: trascrive l'ultima parte e prepara tutto. Puoi chiudere l'app: una <b>notifica</b> ti avvisa quando è pronta.",
    "Con «Dopo»: la registrazione resta in «Le mie lezioni» con <b>Trascrivi ora</b>. Toccalo quando vuoi, meglio la sera col caricatore attaccato.",
    "Quando è pronta, tocca <b>Apri gli appunti</b>: si aprono con il lettore PDF del telefono, da dove puoi anche condividerli."
   ],
   "g": "reg"
  },
  {
   "ico": "imp",
   "t": "Importare un audio",
   "p": [
    "In <b>Registra</b>, sotto il pulsante rosso, nel riquadro <b>Hai già un audio della lezione?</b> tocca <b>Importa un audio…</b>.",
    "Scegli il file: mp3, m4a, wav… anche da Drive (una nota vocale, un registratore, un audio dato dall'università).",
    "L'app mostra la durata e propone il nome: correggilo se serve. Tocca <b>Importa e trascrivi</b>: resti in «Le mie lezioni» con la barra che avanza. Il file originale resta dov'è."
   ],
   "g": "gia",
   "v": "tel-importa"
  },
  {
   "ico": "text",
   "t": "Importare una trascrizione",
   "p": [
    "Hai già quello che ha detto il docente scritto in un file? In <b>Registra</b>, nel riquadro <b>Hai già la trascrizione?</b>, tocca <b>Importa un testo…</b>.",
    "Va bene un <b>PDF</b>, un file <b>Word</b> o di <b>testo</b>, anche il «Per Claude» di un'altra registrazione.",
    "L'app mostra quante parole ci sono e quanto costa (pochi centesimi). Scegli il nome, <b>Cornell</b> o <b>Formato Esame</b>, e tocca <b>Crea gli appunti</b>. Quando è finito compare <b>Apri appunti</b>."
   ],
   "g": "gia",
   "v": "tel-itesto"
  },
  {
   "ico": "pdf",
   "t": "Le slide del docente",
   "p": [
    "Se il docente pubblica le slide in PDF, l'app le mette negli appunti <b>accanto a quando il docente ne parla</b>.",
    "<b>Prima di registrare</b> (in aula): in «Dove si tiene?» → <b>In aula</b> → <b>Slide del docente</b> → <b>Scegli il PDF…</b>. Valgono solo per quella registrazione.",
    "<b>A lezione finita</b>: sulla registrazione tocca <b>⋯ Altro → Aggiungi le slide del docente (PDF)…</b>. Gli appunti vengono rifatti con le slide; quelli di prima restano come copia."
   ],
   "g": "gia",
   "v": "tel-docente"
  },
  {
   "ico": "doc",
   "t": "I formati degli appunti",
   "p": [
    "<b>Cornell</b> (lezioni): domande a sinistra, appunti a destra, riassunto in fondo. Per capire e ripassare.",
    "<b>Formato Esame</b> (lezioni): le domande più probabili con le stelle (★★★ = il docente ci ha insistito), lo schema della risposta, le parole chiave e una simulazione d'esame.",
    "<b>Verbale</b> (riunioni) e <b>Punti chiave</b> (webinar): li sceglie l'app in base a cosa registri.",
    "<b>✎ Il mio formato</b>: in Impostazioni scrivi a parole come vuoi gli appunti, o tocca un esempio pronto.",
    "Il formato si sceglie in <b>Impostazioni</b>. Su una registrazione già fatta: <b>⋯ Altro</b> → «Crea anche in…».",
    "Gli appunti li scrive Claude: <b>controllali sempre</b>. Quello che Claude aggiunge di suo è <b>in viola</b>; citazioni, minuti e slide che non tornano hanno <b>⚠ da verificare</b>."
   ],
   "g": "studio"
  },
  {
   "ico": "cards",
   "v": "tel-ripasso",
   "t": "Ripassare con le flashcard",
   "p": [
    "Tocca <b>Ripassa</b> su una lezione. Oppure usa la riga in alto <b>Ripassa</b>: scegli la materia dal menu e tocca <b>Ripassa</b>, con le domande di tutte le lezioni di quella materia.",
    "Leggi la domanda e pensa alla risposta. Tocca la carta per girarla, poi tocca <b>La sapevo</b> o <b>Da rivedere</b>.",
    "Quelle da rivedere tornano per prime la volta dopo. Non costa niente."
   ],
   "g": "studio"
  },
  {
   "ico": "spark",
   "v": "tel-esame",
   "t": "Preparazione all'esame",
   "p": [
    "In «Le mie lezioni», nella riga in alto <b>Ripassa</b>, scegli la materia e tocca <b>🎯 Preparati all'esame</b>.",
    "Le <b>domande più probabili di tutto il corso</b>, con le stelle: quelle ripetute in più lezioni o su cui il docente ha insistito vengono prima. Tocca una domanda per lo schema della risposta.",
    "Scegli la <b>data dell'esame</b>: arriva il <b>piano di studio</b> giorno per giorno, da mettere nel calendario o salvare in PDF.",
    "<b>Simulazione scritta</b>: rispondi come allo scritto, poi <b>Correggi</b>: punti, cosa manca e voto. Pochi centesimi.",
    "<b>🎤 Interrogazione a voce</b>: rispondi parlando, come all'orale; se manca qualcosa arriva una domanda in più. Alla fine voto e come hai parlato.",
    "In alto la freccia <b>←</b> (o il tasto Indietro) ti riporta alla pagina da cui sei arrivato."
   ],
   "g": "studio"
  },
  {
   "ico": "chat",
   "t": "Chiedi, mappa e infografica",
   "p": [
    "<b>Chiedi alla lezione</b> (sulla registrazione: <b>⋯ Altro → Chiedi alla lezione</b>): scrivi cosa non hai capito. La risposta usa solo quello che si è detto e indica slide e minuto: tocca il minuto e riascolti quel punto. Meno di 1 centesimo a domanda.",
    "<b>Mappa mentale</b> e <b>Infografica</b> (⋯ Altro): lo schema ad albero o tutta la registrazione in una pagina, da salvare in PDF. Circa 1 centesimo, una volta sola.",
    "Per tornare indietro: la freccia <b>←</b> in alto o il tasto Indietro del telefono."
   ],
   "g": "studio"
  },
  {
   "ico": "lib",
   "v": "tel-lezioni",
   "t": "Le mie lezioni",
   "p": [
    "Qui trovi tutte le registrazioni. La copertina ha il colore della materia. Cerca per <b>nome o data</b>, o scrivi una parola: trovi <b>dove è stata detta</b>, in tutte le registrazioni. Tocca il minuto e riascolti da lì.",
    "Su ogni registrazione: <b>Apri appunti</b>, <b>Ripassa</b> e <b>⋯ Altro</b>. Se gli appunti non ci sono ancora c'è <b>Crea appunti</b>; su quelle registrate con «Dopo» c'è <b>Trascrivi ora</b>.",
    "In <b>⋯ Altro</b>: Chiedi alla lezione, Capitoli (l'indice: tocca un argomento e l'audio riparte da lì), Chi parla, Condividi, Trascrizione, Audio; poi crea o rifai gli appunti, mappa mentale, infografica, statistiche, spezzone da mandare, slide del docente, rinomina, elimina l'audio (libera spazio, gli appunti restano) o tutta la registrazione.",
    "Se il telefono si è spento mentre lavorava, tocca <b>Completa</b>."
   ],
   "g": "lez"
  },
  {
   "ico": "lib",
   "v": "tel-menu",
   "g": "lez",
   "t": "Il menu «⋯ Altro», voce per voce",
   "p": [
    "Su ogni registrazione tocca <b>⋯ Altro</b>. Le voci cambiano un po' da una registrazione all'altra: compaiono solo quelle che servono. Ecco cosa fa ognuna.",
    "<b>Chiedi alla lezione</b>: scrivi una domanda su quello che si è detto; risponde con slide e minuto. Meno di 1 centesimo a domanda.",
    "<b>Capitoli</b>: l'indice degli argomenti. Tocca un argomento e l'audio riparte da lì; con ✂ accanto a un capitolo fai uno spezzone.",
    "<b>Chi parla</b>: la trascrizione con i nomi di chi ha parlato; da qui dai i nomi alle voci e apri le statistiche.",
    "<b>Condividi</b>: manda appunti o verbale per email, Word, Google Docs, calendario, Slack, Teams, Notion o CRM.",
    "<b>Trascrizione</b>: apre il PDF «Per Claude» con tutto quello che è stato detto. <b>Audio</b>: riascolti la registrazione.",
    "<b>Crea appunti con Claude</b>: c'è quando gli appunti non sono stati fatti. <b>Crea anche in Formato Esame</b> (o in Cornell): aggiunge l'altro formato, quelli che hai restano. <b>Completa gli appunti</b>: fa le parti che mancano. Costo: circa 0,20 $ per ora di registrazione (prima te lo dice).",
    "<b>Rifai appunti</b>: li rifà da capo, per esempio dopo aver aggiunto le parole difficili. Quelli di prima vengono sostituiti. Stesso costo.",
    "<b>Mappa mentale</b>: lo schema ad albero della lezione. <b>Infografica (una pagina)</b>: tutta la registrazione in un foglio. Circa 1 centesimo ciascuna, una volta sola; si salvano in PDF.",
    "<b>Riconosci chi parla</b>: separa le voci, se non è già stato fatto. Gratis, sul telefono. <b>Statistiche</b>: durata, chi ha parlato e quanto, domande, argomenti. Gratis.",
    "<b>✂ Spezzone da mandare</b>: scegli dal… al… e crei un pezzo dell'audio da mandare.",
    "<b>Aggiungi le slide del docente (PDF)…</b>: mette le slide originali negli appunti, accanto alle parole (capitolo «Le slide del docente»).",
    "<b>Rinomina</b>: cambia il nome della registrazione, dei file e degli appunti.",
    "<b>Elimina l'audio</b>: libera spazio; appunti, slide e trascrizione restano. <b>Elimina la registrazione</b>: viene cancellata dal telefono."
   ]
  },
  {
   "ico": "chat",
   "v": "tel-chiparla",
   "t": "Chi parla",
   "p": [
    "Dopo la registrazione il telefono <b>riconosce le voci</b> e scrive chi ha detto cosa, nella trascrizione e negli appunti. L'audio non va su internet; la prima volta scarica un modello di 26 MB.",
    "In aula chi parla di più è «Docente», gli altri «Domanda». Nelle riunioni ci sono Voce 1, Voce 2…: tocca <b>Dai i nomi alle voci</b>, ascolta un pezzo e scrivi chi è.",
    "<b>Statistiche</b>: chi ha parlato e quanto, quante domande, quanto è durato ogni argomento.",
    "Si accende e si spegne in Impostazioni → <b>Riconosci chi parla</b>. Su una registrazione vecchia: <b>⋯ Altro</b> → «Riconosci chi parla»."
   ],
   "g": "lez"
  },
  {
   "ico": "share",
   "v": "tel-condividi",
   "t": "Condividi e spezzoni",
   "p": [
    "Tocca <b>⋯ Altro → Condividi</b> su una registrazione con gli appunti.",
    "<b>Email</b>: scrivi gli indirizzi (si ricordano per la volta dopo): si apre Gmail, o l'app di posta che usi, con oggetto, testo e PDF già allegato. Controlla e premi Invia.",
    "<b>WhatsApp e altre app</b>: il PDF, con il menu «Manda con…» del telefono. <b>Word</b>: il file .docx da modificare.",
    "<b>Nel calendario</b>: le cose da fare e la prossima riunione, con la data giusta. Si apre il calendario del telefono con l'impegno già scritto: tocca «Salva».",
    "<b>Slack, Teams, Notion, CRM</b>: si collegano una volta (te lo chiede al primo uso, o in Impostazioni). Poi il verbale va lì con un tocco, o da solo a fine riunione.",
    "<b>✂ Spezzone</b>: in Capitoli tocca ✂ accanto a un argomento, o <b>⋯ Altro</b> → «Spezzone da mandare». Scegli da dove a dove e tocca <b>Crea lo spezzone</b>: un pezzo dell'audio da mandare a chi vuoi."
   ],
   "g": "lez"
  },
  {
   "ico": "check",
   "v": "tel-cose",
   "t": "Da fare",
   "p": [
    "In basso c'è <b>Da fare</b>: tutte le cose da fare uscite dai verbali, in un posto solo, con chi, entro quando e da quale riunione. Il numero dice quante sono aperte.",
    "Fatta? Tocca la casella. Tocca il nome della riunione per riascoltare il punto in cui se n'è parlato.",
    "Filtra per persona, o guarda le aperte, le fatte o tutte."
   ],
   "g": "lez"
  },
  {
   "ico": "set",
   "v": "tel-impostazioni",
   "t": "Impostazioni essenziali e avanzate",
   "p": [
    "In <b>Impostazioni</b> in alto ci sono le <b>essenziali</b>: lingua, intelligenza artificiale (chiave di Claude o «Ho un invito»), dove trascrivo, quando trascrivo, formato degli appunti, parole difficili e i tuoi dati.",
    "Più sotto, il riquadro <b>Impostazioni avanzate</b> si apre con un tocco: collegamenti (Slack, Teams, Notion, CRM), calendario, privacy, inviti, <b>Trascrivi solo sotto carica</b>, <b>Trascrizione più precisa</b>, <b>Riconosci chi parla</b>.",
    "<b>✎ Il mio formato</b>: scrivi a parole come vuoi gli appunti, o tocca un esempio pronto."
   ],
   "g": "imp"
  },
  {
   "ico": "scr",
   "t": "Dove trascrivo: sul telefono o sul server",
   "p": [
    "In <b>Impostazioni → Dove trascrivo</b> ci sono due riquadri. Quello scelto ha il bordo blu e sotto c'è scritto in verde <b>✓ Adesso trascrivo…</b>.",
    "<b>Sul telefono</b>: gratis, l'audio resta qui. Consuma batteria e il telefono scalda: meglio col caricatore. Sotto c'è quanto ci mette il tuo telefono.",
    "<b>Sul server (veloce)</b>: un computer potente a noleggio (RunPod, in Europa) trascrive un'ora di lezione in circa un minuto e il telefono non scalda. Pochi centesimi l'ora. Si collega con un invito, oppure con codice e chiave.",
    "Le righe grigie <b>«Da sapere»</b> dicono i limiti di ognuno. Se manca internet o il server non risponde, l'app trascrive sul telefono: la registrazione non si perde mai."
   ],
   "g": "imp",
   "v": "tel-dove"
  },
  {
   "ico": "abc",
   "t": "Parole difficili",
   "p": [
    "Nomi, termini tecnici, il nome del docente: l'app li passa alla trascrizione e a Claude, così li scrivono giusti.",
    "In <b>Impostazioni → Parole difficili</b> scegli la materia, scrivi una parola e premi Invio (o tocca <b>Aggiungi</b>). La × la toglie. Sotto, in <b>«Trovate nei tuoi appunti»</b>, tocca le parole proposte per aggiungerle.",
    "Valgono per quella materia e <b>dalla prossima registrazione</b>: le lezioni già fatte non cambiano."
   ],
   "g": "imp",
   "v": "tel-parole"
  },
  {
   "ico": "info",
   "v": "tel-calendario",
   "t": "Calendario",
   "p": [
    "In Impostazioni avanzate → <b>Calendario</b> collega <b>Gmail</b>, <b>Outlook</b> o un altro calendario: segui i passi e incolla il link. Oppure scrivi a mano l'<b>orario delle lezioni</b>.",
    "Quando inizia un impegno arriva una <b>notifica</b>, anche con l'app chiusa. La tocchi e in Registra il nome e i partecipanti sono già scritti: tocca <b>Usa questi dati</b> e registra.",
    "Per ogni impegno scegli <b>Avvisami</b> o <b>Niente</b>. (Sul telefono l'app non può accendere il microfono da sola: basta un tocco sulla notifica.)"
   ],
   "g": "imp"
  },
  {
   "ico": "share",
   "t": "Inviti",
   "p": [
    "Con un invito dai l'app già pronta a qualcuno di cui ti fidi: riceve le tue chiavi <b>senza vederle</b>. Quello che usa lo paghi tu.",
    "Il riquadro <b>Inviti</b> (in Impostazioni avanzate) c'è solo se le chiavi le hai messe tu a mano: chi ha ricevuto un invito non può invitare altri.",
    "Scrivi <b>per chi è</b>, spunta cosa gli dai e tocca <b>Prepara l'invito</b>. Poi <b>Copia il messaggio</b> e mandalo su WhatsApp. Chi lo riceve va in <b>Impostazioni → Ho un invito</b>, incolla e tocca <b>Attiva</b>."
   ],
   "g": "imp",
   "v": "tel-inviti"
  },
  {
   "ico": "aud",
   "t": "Se qualcosa non va",
   "p": [
    "<b>Le tacche verdi non si muovono</b>: in Impostazioni di Android → App → Verba Manent IA → Autorizzazioni, consenti il <b>Microfono</b>.",
    "<b>La registrazione si ferma a schermo spento</b>: in Impostazioni di Android → App → Verba Manent IA → Batteria, scegli <b>Senza restrizioni</b>.",
    "<b>Gli appunti non arrivano</b>: serve internet; tocca <b>Riprova</b> accanto alla parte.",
    "<b>REGISTRA resta spento</b>: guarda la scritta grigia sotto il nome (capitolo «Il nome della registrazione»).",
    "<b>Compare «Appunti non creati»</b>: manda la foto all'assistenza, con le righe che compaiono.",
    "<b>La prima volta</b> l'app scarica il riconoscitore vocale (circa 190 MB): meglio col Wi-Fi.",
    "<b>Poco spazio</b>: in «Le mie lezioni» elimina l'audio delle registrazioni vecchie (gli appunti restano).",
    "<b>La notifica del calendario non arriva</b>: in Impostazioni di Android → App → Verba Manent IA → Notifiche, accendile; e apri l'app almeno una volta dopo aver riacceso il telefono."
   ],
   "g": "prob"
  }
 ],
 "gruppi": {
  "primi": "Primi passi",
  "reg": "Registrare",
  "gia": "Hai già la lezione?",
  "studio": "Studiare",
  "lez": "Le mie lezioni",
  "imp": "Impostazioni",
  "prob": "Aiuto"
 }
};
  GUIDA.en = {
 "titolo": "Guide",
 "sotto": "How to use Verba Manent IA on your phone, step by step, by topic.",
 "capitoli": [
  {
   "ico": "spark",
   "t": "Why Verba Manent IA",
   "perche": true,
   "p": [
    "<b>For studying and for work</b>: lectures, work meetings and webinars. For each it prepares the right thing: notes to study, <b>minutes</b> with decisions and to-dos, key points.",
    "<b>No bot in the meeting</b>: it records from the phone what you hear. No «assistant» joins the call.",
    "<b>In class and online</b>: in class with the phone microphone; online with the call on speakerphone. And there is also the PC program.",
    "<b>Already have the lecture?</b> An audio or the transcript already written: it makes the notes.",
    "<b>It transcribes on the phone, or in a minute on the server</b>: on the phone it's free and the audio stays there; with the fast server an hour of lecture is ready in about a minute, for a few cents, and the phone stays cool.",
    "<b>It knows who is speaking</b>: it separates the voices by itself and writes who said what in the transcript and the minutes.",
    "<b>The lecturer's slides</b>: with the slides' PDF it puts them in the notes next to the words.",
    "<b>It writes difficult terms correctly</b>: for each subject you give it names and technical words, and it stops getting them wrong.",
    "<b>Everything in one place</b>: search a word in all recordings, the to-dos of all meetings in <b>To-dos</b>, the calendar that reminds you; the minutes go by email, WhatsApp, Slack, Teams, Notion or to the CRM.",
    "<b>For the exam</b>: Cornell, Exam format, flashcards, «Ask the lecture», exam preparation on the whole course, the written mock exam and the oral exam marked by Claude.",
    "<b>To give to people you trust</b>: with an invitation you give the app ready to use, with your keys, without them seeing them.",
    "<b>Two ways to pay</b>: with your own Claude key you only pay for what you use (about 0.20 $ per recorded hour). Or, coming soon, with a subscription that already includes Claude and the fast server, with no keys to enter.",
    "Audio, notes and transcripts stay <b>on your phone</b>: they are yours."
   ],
   "g": "primi"
  },
  {
   "ico": "set",
   "t": "The Claude key or an invitation",
   "p": [
    "Notes, «Ask», maps and the exam are written by <b>Claude</b>. You need a key, or an invitation from someone who lends you theirs.",
    "<b>With your own key</b>: in <b>Settings → Artificial intelligence</b> paste the key (create it on platform.claude.com → Settings → API keys) and tap <b>Test and save</b>. It stays only on the phone, protected. Cost: about 0.20 $ per recorded hour.",
    "<b>With an invitation</b>: whoever invites you sends you a WhatsApp message. Copy all of it, then in <b>Settings → I have an invitation</b> paste it and tap <b>Activate</b>. The keys arrive ready, without you seeing them; what you use is paid by whoever invited you.",
    "<b>Without a key</b> the app still records and transcribes, but notes are not created."
   ],
   "g": "primi",
   "v": "tel-chiave"
  },
  {
   "ico": "info",
   "t": "Updates and support",
   "p": [
    "When you open the app and a new version is out, after a few seconds the notice <b>«Version … is ready»</b> appears with what's new.",
    "Tap <b>Update and reopen</b>: the app closes and reopens by itself, already updated, in a few seconds. Recordings and notes stay. With <b>Later</b> the notice comes back next time.",
    "If the new app is needed the button is <b>Download</b>: open the downloaded file and tap <b>Install</b>. Recordings and notes stay.",
    "You can also look by hand: <b>Settings → Update the app → Check for updates</b>. On the same page there is <b>Support</b> (Punto Web Ferrara)."
   ],
   "g": "primi",
   "v": "tel-aggiornamenti"
  },
  {
   "ico": "rec",
   "v": "tel-registrare",
   "t": "Recording",
   "p": [
    "<b>Before you start</b>: online, join the call and turn on the <b>speakerphone</b>, volume up; in class, put the phone close to the speaker, microphone towards them.",
    "Under «What are you recording?» choose <b>Lecture</b>, <b>Work meeting</b> or <b>Webinar or course</b>.",
    "In «Where does it take place?» choose <b>In the classroom</b> or <b>Online</b>. In the classroom, the <b>microphone</b> (watch the green bars move) and <b>Lecturer's slides</b> appear in the same box: if the lecturer publishes the PDF, add it with <b>Choose the PDF…</b>.",
    "Type the <b>name</b>, for example «Calculus 1 – Limits»: it must say what it is (chapter «The recording's name»). Recently used subjects appear below: one tap and they are typed. Choose <b>which language is spoken</b>.",
    "Choose <b>When I transcribe</b>: <b>During</b> (ready shortly after the end, but keep the charger plugged in) or <b>Later</b> (it just records; it transcribes when you tap «Transcribe now»). Below it says how long your phone takes.",
    "Tap the red <b>RECORD</b> button. The first time Android asks permission to use the microphone: tap <b>Allow</b>."
   ],
   "g": "reg"
  },
  {
   "ico": "edit",
   "t": "The recording's name",
   "p": [
    "The name must say what it is: <b>the subject or the topic</b>, for example «Chemistry – Sugars». Names like «b», «aaa», «Lecture» or «test» are not accepted: a grey notice appears and RECORD stays off.",
    "<b>Two recordings cannot have the same name.</b> If the name is taken, the app says so and suggests free names, for example «Calculus 1 – 17/10»: one tap and you use it.",
    "To change it later: <b>⋯ More → Rename</b>."
   ],
   "g": "reg",
   "v": "tel-nome"
  },
  {
   "ico": "chat",
   "t": "Work meetings and webinars",
   "p": [
    "Choose <b>Work meeting</b> and type the <b>participants</b>: the names come out right in the minutes.",
    "At the end you get the <b>minutes</b>: summary, decisions, <b>action items</b> (who, by when), open points, next meeting and chapters. <b>Webinars</b> get <b>key points</b>.",
    "Under «What kind of meeting?» choose a <b>template</b> (sales, interview, 1-to-1, class council, condominium, consultation or ✎ your own): the minutes get the right sections.",
    "If the meeting has the same name as an earlier one, <b>Since last time</b> appears: the open action items. If the meeting says they are done, they are ticked by themselves.",
    "Names, dates and figures are written by Claude from the recording: <b>always check them</b> before sending the minutes."
   ],
   "g": "reg"
  },
  {
   "ico": "pause",
   "v": "tel-durante",
   "t": "While recording",
   "p": [
    "You can <b>turn the screen off</b> or use other apps: recording continues. In the notifications there is «Recording» with <b>Pause</b> and <b>Stop</b>.",
    "<b>Pause</b> during the break: nothing is recorded and the time stops. <b>Resume</b> when it starts again.",
    "If you chose «During» and the phone is not charging, <b>Plug in the charger</b> appears.",
    "Every 30 minutes (or every hour, in Settings) a <b>part</b> is prepared. With automatic notes, Claude starts writing them right away.",
    "<b>Your notes</b>: type a few words and press Enter, or tap ⭐ <b>Important</b>, ❓ <b>To clarify</b>, ✅ <b>To-do</b>. The note gets the right minute and Claude puts it in the notes.",
    "<b>Ask now</b>: distracted? Ask what was said. Claude sees the parts already transcribed (with «During»). About 1 cent per question."
   ],
   "g": "reg"
  },
  {
   "ico": "stop",
   "v": "tel-fine",
   "t": "End of the recording",
   "p": [
    "Tap <b>Stop</b> (in the app or in the notification) and confirm.",
    "With «During»: it transcribes the last part and prepares everything. You can close the app: a <b>notification</b> tells you when it is ready.",
    "With «After»: the recording stays in «My lectures» with <b>Transcribe now</b>. Tap it whenever you like, better in the evening with the charger plugged in.",
    "When it is ready, tap <b>Open notes</b>: they open in the phone PDF reader, where you can also share them."
   ],
   "g": "reg"
  },
  {
   "ico": "imp",
   "t": "Importing an audio",
   "p": [
    "In <b>Record</b>, below the red button, in the box <b>Already have an audio of the lecture?</b> tap <b>Import an audio…</b>.",
    "Choose the file: mp3, m4a, wav… also from Drive (a voice note, a recorder, an audio given by the university).",
    "The app shows the length and suggests the name: fix it if needed. Tap <b>Import and transcribe</b>: you stay in «My lectures» with a progress bar. The original file stays where it is."
   ],
   "g": "gia",
   "v": "tel-importa"
  },
  {
   "ico": "text",
   "t": "Importing a transcript",
   "p": [
    "Already have what the lecturer said written in a file? In <b>Record</b>, in the box <b>Already have the transcript?</b>, tap <b>Import a text…</b>.",
    "A <b>PDF</b>, a <b>Word</b> or a <b>text</b> file is fine, even the «Per Claude» file of another recording.",
    "The app shows how many words there are and the cost (a few cents). Choose the name, <b>Cornell</b> or <b>Exam format</b>, and tap <b>Create the notes</b>. When it is done, <b>Open notes</b> appears."
   ],
   "g": "gia",
   "v": "tel-itesto"
  },
  {
   "ico": "pdf",
   "t": "The lecturer's slides",
   "p": [
    "If the lecturer publishes the slides as a PDF, the app puts them in the notes <b>next to when the lecturer talks about them</b>.",
    "<b>Before recording</b> (in class): «Where does it take place?» → <b>In the classroom</b> → <b>Lecturer's slides</b> → <b>Choose the PDF…</b>. They are only for that recording.",
    "<b>After the lecture</b>: on the recording tap <b>⋯ More → Add the lecturer's slides (PDF)…</b>. The notes are redone with the slides; the previous ones stay as a copy."
   ],
   "g": "gia",
   "v": "tel-docente"
  },
  {
   "ico": "doc",
   "t": "Note formats",
   "p": [
    "<b>Cornell</b> (lectures): questions on the left, notes on the right, summary at the bottom. To understand and review.",
    "<b>Exam format</b> (lectures): the most likely questions with stars (★★★ = the lecturer insisted on it), the answer outline, keywords and a mock exam.",
    "<b>Minutes</b> (meetings) and <b>Key points</b> (webinars): chosen by the app from what you record.",
    "<b>✎ My format</b>: in Settings describe in words how you want the notes, or tap a ready example.",
    "Choose the format in <b>Settings</b>. For a finished recording: <b>⋯ More</b> → «Also create in…».",
    "The notes are written by Claude: <b>always check them</b>. What Claude adds on its own is <b>in purple</b>; quotes, minutes and slides that do not match have <b>⚠ to check</b>."
   ],
   "g": "studio"
  },
  {
   "ico": "cards",
   "v": "tel-ripasso",
   "t": "Reviewing with flashcards",
   "p": [
    "Tap <b>Review</b> on a lecture. Or use the <b>Review</b> line at the top: choose the subject from the menu and tap <b>Review</b>, with the questions of all the lectures of that subject.",
    "Read the question and think of the answer. Tap the card to flip it, then tap <b>I knew it</b> or <b>To review</b>.",
    "Those to review come first next time. It's free."
   ],
   "g": "studio"
  },
  {
   "ico": "spark",
   "v": "tel-esame",
   "t": "Exam preparation",
   "p": [
    "In «My lectures», in the <b>Review</b> line at the top, choose the subject and tap <b>🎯 Prepare for the exam</b>.",
    "The <b>most likely questions of the whole course</b>, with stars: those repeated in several lectures or stressed by the lecturer come first. Tap a question for the outline of the answer.",
    "Choose the <b>exam date</b>: the day-by-day <b>study plan</b> arrives, to put in the calendar or save as PDF.",
    "<b>Written mock exam</b>: answer as in the written exam, then <b>Correct</b>: points, what is missing and the mark. A few cents.",
    "<b>🎤 Oral exam</b>: answer out loud, as in an oral exam; if something is missing you get a follow-up question. At the end the mark and how you spoke.",
    "At the top the <b>←</b> arrow (or the Back key) takes you back to the page you came from."
   ],
   "g": "studio"
  },
  {
   "ico": "chat",
   "t": "Ask, map and infographic",
   "p": [
    "<b>Ask the lecture</b> (on the recording: <b>⋯ More → Ask the lecture</b>): write what you didn't understand. The answer uses only what was said and shows slide and minute: tap the minute to hear that point again. Less than 1 cent per question.",
    "<b>Mind map</b> and <b>Infographic</b> (⋯ More): the tree outline or the whole recording on one page, to save as PDF. About 1 cent, once.",
    "To go back: the <b>←</b> arrow at the top or the phone's Back key."
   ],
   "g": "studio"
  },
  {
   "ico": "lib",
   "v": "tel-lezioni",
   "t": "My lectures",
   "p": [
    "Here you find all recordings. The cover has the subject's colour. Search by <b>name or date</b>, or type a word: you find <b>where it was said</b>, in all recordings. Tap the minute to hear it again from there.",
    "On each recording: <b>Open notes</b>, <b>Review</b> and <b>⋯ More</b>. If there are no notes yet there is <b>Create notes</b>; on those recorded with «Later» there is <b>Transcribe now</b>.",
    "In <b>⋯ More</b>: Ask the lecture, Chapters (the index: tap a topic and the audio starts from there), Who speaks, Share, Transcript, Audio; then create or redo notes, mind map, infographic, statistics, clip to send, lecturer's slides, rename, delete the audio (frees space, notes stay) or the whole recording.",
    "If the phone turned off while working, tap <b>Complete</b>."
   ],
   "g": "lez"
  },
  {
   "ico": "lib",
   "v": "tel-menu",
   "g": "lez",
   "t": "The «⋯ More» menu, item by item",
   "p": [
    "On each recording tap <b>⋯ More</b>. The items change a little from one recording to another: only the useful ones appear. Here is what each does.",
    "<b>Ask the lecture</b>: type a question about what was said; it answers with slide and minute. Less than 1 cent per question.",
    "<b>Chapters</b>: the index of topics. Tap a topic and the audio starts from there; with ✂ next to a chapter you make a clip.",
    "<b>Who speaks</b>: the transcript with the names of who spoke; from here you name the voices and open the statistics.",
    "<b>Share</b>: send notes or minutes by email, Word, Google Docs, calendar, Slack, Teams, Notion or CRM.",
    "<b>Transcript</b>: opens the «Per Claude» PDF with everything that was said. <b>Audio</b>: listen to the recording again.",
    "<b>Create notes with Claude</b>: there when notes were not made. <b>Also create in Exam format</b> (or Cornell): adds the other format, the ones you have stay. <b>Complete the notes</b>: makes the missing parts. Cost: about 0.20 $ per recorded hour (it tells you first).",
    "<b>Redo notes</b>: redoes them from scratch, for example after adding difficult words. The previous ones are replaced. Same cost.",
    "<b>Mind map</b>: the tree outline of the lecture. <b>Infographic (one page)</b>: the whole recording on one sheet. About 1 cent each, once; saved as PDF.",
    "<b>Recognise who is speaking</b>: separates the voices, if not done yet. Free, on the phone. <b>Statistics</b>: length, who spoke and how much, questions, topics. Free.",
    "<b>✂ Clip to send</b>: choose from… to… and make a piece of audio to send.",
    "<b>Add the lecturer's slides (PDF)…</b>: puts the original slides in the notes, next to the words (chapter «The lecturer's slides»).",
    "<b>Rename</b>: changes the name of the recording, files and notes.",
    "<b>Delete the audio</b>: frees space; notes, slides and transcript stay. <b>Delete the recording</b>: it is deleted from the phone."
   ]
  },
  {
   "ico": "chat",
   "v": "tel-chiparla",
   "t": "Who speaks",
   "p": [
    "After the recording the phone <b>recognises the voices</b> and writes who said what, in the transcript and in the notes. The audio does not go on the internet; the first time it downloads a 26 MB model.",
    "In class whoever speaks most is «Lecturer», the others «Question». In meetings there are Voice 1, Voice 2…: tap <b>Name the voices</b>, listen to a piece and type who it is.",
    "<b>Statistics</b>: who spoke and how much, how many questions, how long each topic lasted.",
    "Turn it on and off in Settings → <b>Recognise who is speaking</b>. On an old recording: <b>⋯ More</b> → «Recognise who is speaking»."
   ],
   "g": "lez"
  },
  {
   "ico": "share",
   "v": "tel-condividi",
   "t": "Share and clips",
   "p": [
    "Tap <b>⋯ More → Share</b> on a recording with notes.",
    "<b>Email</b>: type the addresses (remembered for next time): Gmail, or the mail app you use, opens with subject, text and the PDF already attached. Check it and press Send.",
    "<b>WhatsApp and other apps</b>: the PDF, with the phone «Send with…» menu. <b>Word</b>: the .docx file to edit.",
    "<b>Add to calendar</b>: the action items and the next meeting, with the right date. The phone calendar opens with the event already filled in: tap «Save».",
    "<b>Slack, Teams, Notion, CRM</b>: connect them once (it asks the first time, or in Settings). Then the minutes go there with one tap, or by themselves at the end of the meeting.",
    "<b>✂ Clip</b>: in Chapters tap ✂ next to a topic, or <b>⋯ More</b> → «Clip to send». Choose from where to where and tap <b>Create the clip</b>: a piece of the audio to send to anyone."
   ],
   "g": "lez"
  },
  {
   "ico": "check",
   "v": "tel-cose",
   "t": "To-dos",
   "p": [
    "At the bottom there is <b>To-dos</b>: all the action items from the minutes, in one place, with who, by when and from which meeting. The number tells how many are open.",
    "Done? Tap the box. Tap the meeting name to listen to the point where it was discussed.",
    "Filter by person, or look at open, done or all."
   ],
   "g": "lez"
  },
  {
   "ico": "set",
   "v": "tel-impostazioni",
   "t": "Essential and advanced settings",
   "p": [
    "At the top of <b>Settings</b> are the <b>essentials</b>: language, artificial intelligence (Claude key or «I have an invitation»), where I transcribe, when I transcribe, notes format, difficult words and your details.",
    "Further down, the <b>Advanced settings</b> box opens with a tap: connections (Slack, Teams, Notion, CRM), calendar, privacy, invitations, <b>Transcribe only while charging</b>, <b>More accurate transcript</b>, <b>Recognise who is speaking</b>.",
    "<b>✎ My format</b>: describe in words how you want the notes, or tap a ready example."
   ],
   "g": "imp"
  },
  {
   "ico": "scr",
   "t": "Where I transcribe: on the phone or on the server",
   "p": [
    "In <b>Settings → Where I transcribe</b> there are two boxes. The chosen one has a blue border and below it says in green <b>✓ Now I transcribe…</b>.",
    "<b>On the phone</b>: free, the audio stays here. It uses battery and the phone gets warm: better with the charger. Below it says how long your phone takes.",
    "<b>On the server (fast)</b>: a powerful rented computer (RunPod, in Europe) transcribes an hour of lecture in about a minute and the phone stays cool. A few cents per hour. Connect it with an invitation, or with code and key.",
    "The grey <b>«Good to know»</b> lines say the limits of each. If there is no internet or the server doesn't answer, the app transcribes on the phone: the recording is never lost."
   ],
   "g": "imp",
   "v": "tel-dove"
  },
  {
   "ico": "abc",
   "t": "Difficult words",
   "p": [
    "Names, technical terms, the lecturer's name: the app passes them to the transcription and to Claude, so they are written correctly.",
    "In <b>Settings → Difficult words</b> choose the subject, type a word and press Enter (or tap <b>Add</b>). The × removes it. Below, in <b>«Found in your notes»</b>, tap the suggested words to add them.",
    "They are for that subject and <b>from the next recording</b>: lectures already made don't change."
   ],
   "g": "imp",
   "v": "tel-parole"
  },
  {
   "ico": "info",
   "v": "tel-calendario",
   "t": "Calendar",
   "p": [
    "In Advanced settings → <b>Calendar</b> connect <b>Gmail</b>, <b>Outlook</b> or another calendar: follow the steps and paste the link. Or type your <b>lecture timetable</b> by hand.",
    "When an event starts you get a <b>notification</b>, even with the app closed. Tap it and in Record the name and participants are already filled in: tap <b>Use these details</b> and record.",
    "For each event choose <b>Remind me</b> or <b>Nothing</b>. (On the phone the app cannot turn on the microphone by itself: one tap on the notification is enough.)"
   ],
   "g": "imp"
  },
  {
   "ico": "share",
   "t": "Invitations",
   "p": [
    "With an invitation you give the app ready to use to someone you trust: they get your keys <b>without seeing them</b>. What they use, you pay.",
    "The <b>Invitations</b> box (in Advanced settings) is there only if you typed the keys yourself: whoever received an invitation cannot invite others.",
    "Type <b>who it is for</b>, tick what you give and tap <b>Prepare the invitation</b>. Then <b>Copy the message</b> and send it on WhatsApp. Whoever receives it goes to <b>Settings → I have an invitation</b>, pastes and taps <b>Activate</b>."
   ],
   "g": "imp",
   "v": "tel-inviti"
  },
  {
   "ico": "aud",
   "t": "If something goes wrong",
   "p": [
    "<b>The green bars do not move</b>: in Android Settings → Apps → Verba Manent IA → Permissions, allow the <b>Microphone</b>.",
    "<b>Recording stops with the screen off</b>: in Android Settings → Apps → Verba Manent IA → Battery, choose <b>Unrestricted</b>.",
    "<b>Notes do not arrive</b>: you need internet; tap <b>Retry</b> next to the part.",
    "<b>RECORD stays off</b>: read the grey line under the name (chapter «The recording's name»).",
    "<b>«Notes not created» appears</b>: send a photo to support, with the lines it shows.",
    "<b>The first time</b> the app downloads the speech recogniser (about 190 MB): better on Wi-Fi.",
    "<b>Low space</b>: in «My lectures» delete the audio of old recordings (notes stay).",
    "<b>The calendar notification does not arrive</b>: in Android Settings → Apps → Verba Manent IA → Notifications, turn them on; and open the app at least once after restarting the phone."
   ],
   "g": "prob"
  }
 ],
 "gruppi": {
  "primi": "Getting started",
  "reg": "Recording",
  "gia": "Already have the lecture?",
  "studio": "Studying",
  "lez": "My lectures",
  "imp": "Settings",
  "prob": "Help"
 }
};
}
