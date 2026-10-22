/* Scripta Manent: le stesse pagine di Verba Manent IA, ma
   - la Modalità DSA è sempre accesa (lo decide il programma) e la parola «DSA» non compare mai;
   - la prima pagina è «I miei strumenti»;
   - nome, logo e colore verde petrolio di Scripta Manent.
   Si accende solo nell'edizione «scripta» (file edizione.json accanto all'exe). In Verba Manent non fa niente. */
'use strict';
let SCRIPTA = false;
function attivaScripta() {
  if (SCRIPTA) return;
  SCRIPTA = true;
  document.documentElement.classList.add('scripta');
  document.title = 'Scripta Manent';
  const nuovi = {
    it: {
      'nav.dsa': 'I miei strumenti', 'sd.h': 'I miei strumenti', 'nav.arch': 'Le mie lezioni',
      'sd.reg.s': 'Appunti già facili da leggere',
      'pc.dsa': 'Il podcast parte più lento, la voce narrante usa frasi corte e semplici e mentre ascolti la parola che senti si illumina. Pausa di 2 secondi dopo ogni pezzo del prof.',
      'dsa.banda': '', 'g.dsa': 'Per te', 'tc.vero.dsa': '30% di tempo in più.',
      'lm.nota': 'Così vedrai gli appunti, «Ascolta», il Karaoke, le flashcard e i PDF.',
      'im.mini': 'Tieni in miniatura sullo schermo', 'im.mini.s': 'Quando parte la registrazione resta solo una finestrella sempre davanti, con Pausa, Fine e i tre «Segna».', 'nt.chi': 'Non ho capito', 'nt.fare': 'Compito o verifica', 'nt.h': 'Segna questo momento', 'nt.s': 'Lo ritrovi negli appunti, al minuto giusto', 'pr.h': 'Registra una lezione', 'pr.p': 'Tre scelte e premi Registra. Il resto lo faccio io: trascrizione, appunti, compiti e formule.',
    },
    en: {
      'nav.dsa': 'My tools', 'sd.h': 'My tools', 'nav.arch': 'My lectures',
      'sd.reg.s': 'Notes that are already easy to read',
      'pc.dsa': 'The podcast starts slower, the narrator uses short, simple sentences and the word you hear lights up. A 2-second pause after each part of the lecturer.',
      'dsa.banda': '', 'g.dsa': 'For you', 'tc.vero.dsa': '30% more time.',
      'lm.nota': 'This is how you will see your notes, «Listen», Karaoke, flashcards and PDFs.',
      'im.mini': 'Keep it small on the screen', 'im.mini.s': 'When recording starts only a small window stays on top, with Pause, Stop and the three «Mark».', 'nt.chi': 'I did not understand', 'nt.fare': 'Homework or test', 'nt.h': 'Mark this moment', 'nt.s': 'You find it in the notes, at the right minute', 'pr.h': 'Record a lesson', 'pr.p': 'Three choices and press Record. I do the rest: transcript, notes, homework and formulas.',
    },
  };
  for (const l in nuovi) if (TESTI[l]) Object.assign(TESTI[l], nuovi[l]);
  // Scripta Manent è per studenti: niente riunioni né webinar nei testi
  const studenti = {
    it: {'in.desc': "Registra le lezioni in aula e online. Trascrive sul tuo PC, senza mandare l'audio su internet, e prepara appunti facili da leggere, con la voce che te li legge.",
         'pv.3': "Le tue lezioni non vengono usate per addestrare l'IA.",
         'pv.r': 'Quando registri una lezione registri anche la voce del docente e dei compagni. Il permesso di farlo devi averlo tu: molte scuole e università hanno regole precise e il docente ha diritti sulla sua lezione. A ogni registrazione ti propongo un messaggio pronto per avvisare.'},
    en: {'in.desc': 'Records lectures in class and online. Transcribes on your PC, without sending the audio over the internet, and prepares easy-to-read notes, with a voice that reads them to you.',
         'pv.3': 'Your lectures are never used to train AI.',
         'pv.r': "When you record a lecture you also record the voices of the teacher and classmates. You are responsible for having permission: many schools and universities have specific rules and teachers have rights over their lectures. For every recording I offer a ready-made message to let people know."},
  };
  for (const l in studenti) if (TESTI[l]) Object.assign(TESTI[l], studenti[l]);
  // sul telefono la barra in basso è stretta
  if (typeof ANDROID !== 'undefined' && ANDROID) { TESTI.it['nav.dsa'] = 'Strumenti'; TESTI.en['nav.dsa'] = 'Tools'; }
  // il nome del programma in tutti i testi
  for (const l in TESTI) for (const k in TESTI[l]) {
    const v = TESTI[l][k];
    if (typeof v === 'string' && v.includes('Verba Manent')) TESTI[l][k] = v.split('Verba Manent IA').join('Scripta Manent').split('Verba Manent').join('Scripta Manent');
  }
  // il logo: le righe di testo che diventano una piccola mappa
  const logo = document.getElementById('i-logo');
  if (logo) {
    logo.setAttribute('viewBox', '8 12 80 76');
    logo.innerHTML = '<g fill="#fff"><rect x="14" y="33" width="28" height="5" rx="2.5"/><rect x="14" y="43" width="22" height="5" rx="2.5"/>' +
      '<rect x="14" y="53" width="28" height="5" rx="2.5"/><rect x="14" y="63" width="16" height="5" rx="2.5"/></g>' +
      '<g stroke="#5eead4" stroke-width="3.5" stroke-linecap="round"><path d="M66 50L80 32M66 50L82 52M66 50L76 70"/></g>' +
      '<g fill="#5eead4"><circle cx="66" cy="50" r="7"/><circle cx="80" cy="32" r="5"/><circle cx="82" cy="52" r="5"/><circle cx="76" cy="70" r="5"/></g>';
  }
  if (typeof smPrepara === 'function') { smPrepara(); if (typeof smCasaPrepara === 'function') smCasaPrepara(); setTimeout(smRicorda, 6000); }
  // i nomi scritti nella pagina (splash, menu)
  const giro = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const da = [];
  while (giro.nextNode()) if (giro.currentNode.nodeValue.includes('Verba Manent')) da.push(giro.currentNode);
  da.forEach(n => { n.nodeValue = n.nodeValue.split('Verba Manent IA').join('Scripta Manent').split('Verba Manent').join('Scripta Manent'); });
}

/* Verba Manent IA: lo Spazio DSA ha la grafica e gli strumenti di Scripta Manent («I miei strumenti», Compiti,
   Matematica, Correttore, Lingue facili, Settimana per i genitori, Detrazione), nei colori blu di Verba Manent.
   Solo lì: mentre si e' in quelle pagine la pagina porta le classi «scripta vmdsa»; uscendo tornano via. */
let VMDSA = false;
const VMDSA_PAGINE = ['dsa', 'smcomp', 'smmate', 'smcorr', 'smlingue', 'smsett', 'smdet'];
function attivaDsaVm() {
  if (SCRIPTA || VMDSA || typeof smPrepara !== 'function' || typeof smCasa !== 'function') return;
  VMDSA = true;
  smPrepara();
  disegnaSpazioDsa = smCasa;
  const sec = $('v-dsa'); if (sec) sec.classList.add('smcasa');
  const vaiPrima = vai;
  vai = function (p, tornando) {
    const on = VMDSA_PAGINE.includes(p);
    document.documentElement.classList.toggle('scripta', on);
    document.documentElement.classList.toggle('vmdsa', on);
    const r = vaiPrima.apply(this, arguments);
    if (on) { const giro = () => { const s = document.querySelector('#main > section.pg:not(.hidden)'); if (s) { smInfoGiro(s); smTestoGrande(s); } }; setTimeout(giro, 0); setTimeout(giro, 700); setTimeout(giro, 2000); }
    return r;
  };
}
