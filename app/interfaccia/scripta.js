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
    },
    en: {
      'nav.dsa': 'My tools', 'sd.h': 'My tools', 'nav.arch': 'My lectures',
      'sd.reg.s': 'Notes that are already easy to read',
      'pc.dsa': 'The podcast starts slower, the narrator uses short, simple sentences and the word you hear lights up. A 2-second pause after each part of the lecturer.',
      'dsa.banda': '', 'g.dsa': 'For you', 'tc.vero.dsa': '30% more time.',
      'lm.nota': 'This is how you will see your notes, «Listen», Karaoke, flashcards and PDFs.',
    },
  };
  for (const l in nuovi) if (TESTI[l]) Object.assign(TESTI[l], nuovi[l]);
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
  if (typeof smPrepara === 'function') { smPrepara(); setTimeout(smRicorda, 6000); }
  // i nomi scritti nella pagina (splash, menu)
  const giro = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const da = [];
  while (giro.nextNode()) if (giro.currentNode.nodeValue.includes('Verba Manent')) da.push(giro.currentNode);
  da.forEach(n => { n.nodeValue = n.nodeValue.split('Verba Manent IA').join('Scripta Manent').split('Verba Manent').join('Scripta Manent'); });
}
