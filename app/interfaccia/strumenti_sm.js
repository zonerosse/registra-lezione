/* Gli strumenti in più di Scripta Manent: Matematica, Correttore gentile, Compiti e scadenze.
   Le pagine si creano qui (non sono in index.html) e si aprono da «I miei strumenti».
   Stili: solo quelli già presenti nel programma (card, lbl, seg, btn, in, tiles). */
'use strict';
const SMT = {
  it: {
    'mate.h': 'Matematica', 'mate.p': 'Calcoli a voce, tabelle e formule pronte, problemi spiegati un passo alla volta.',
    'mate.calc': 'Calcolatrice', 'mate.tab': 'Tabelline', 'mate.form': 'Formulario', 'mate.pb': 'Problema',
    'calc.voce': 'Voce', 'calc.rileggi': 'Rileggi', 'calc.fa': 'fa', 'calc.err': 'Il calcolo non è completo',
    'tab.s': 'Tocca un numero: ti dico la moltiplicazione.', 'tab.per': 'per', 'stampa': 'Stampa',
    'form.s': 'Le formule delle figure, da portare in verifica se il tuo piano lo prevede.', 'form.per': 'Perimetro', 'form.area': 'Area',
    'pb.s': 'Scrivi il problema o fotografalo: te lo divido in passi piccoli e te li leggo.',
    'pb.ph': 'Es. Un rettangolo è lungo 12 cm e largo 5 cm. Quanto misura il perimetro?',
    'pb.foto': 'Fotografa il problema', 'pb.vai': 'Spiegamelo', 'pb.lav': 'Divido il problema in passi…',
    'pb.passo': 'Passo {n} di {t}', 'pb.dopo': 'Passo dopo', 'pb.prima': 'Passo prima', 'pb.ris': 'Mostra il risultato', 'pb.risultato': 'Risultato',
    'pb.nuovo': 'Un altro problema', 'ascolta': 'Ascolta', 'foto.ok': 'Foto pronta: {n}',
    'corr.h': 'Correttore gentile', 'corr.p': 'Corregge solo l\'ortografia. Le parole sono tue: non le cambio.',
    'corr.ph': 'Scrivi o incolla qui il tuo testo…', 'corr.vai': 'Correggi', 'corr.lav': 'Controllo l\'ortografia…',
    'corr.n0': 'Nessun errore di ortografia. Bravo!', 'corr.n': 'Ho corretto {n} parole:', 'corr.n1': 'Ho corretto 1 parola:',
    'corr.leggi': 'Leggimelo', 'corr.copia': 'Copia', 'corr.copiato': 'Testo copiato', 'corr.modifica': 'Modifica ancora',
    'comp.h': 'Compiti e scadenze', 'comp.p': 'Fotografa il diario: i compiti e le verifiche si mettono in ordine da soli.',
    'comp.foto': 'Fotografa il diario', 'comp.scegli': 'Scegli una foto', 'comp.mano': 'Aggiungi a mano', 'comp.lav': 'Leggo il diario…',
    'comp.nuovi': 'Aggiunti {n}', 'comp.nuovi0': 'Niente di nuovo nel diario',
    'comp.vuoto': 'Ancora niente: fotografa la pagina del diario con i compiti.',
    'comp.oggi': 'Per oggi', 'comp.domani': 'Per domani', 'comp.sett': 'Nei prossimi giorni', 'comp.poi': 'Più avanti', 'comp.senza': 'Senza data', 'comp.fatti': 'Fatti',
    'comp.verifica': 'Verifica', 'comp.interrogazione': 'Interrogazione', 'comp.togli': 'Togli',
    'comp.materia': 'Materia', 'comp.cosa': 'Cosa devo fare', 'comp.per': 'Per quando', 'comp.tipo': 'Che cos\'è', 'comp.compito': 'Compito',
    'comp.salva': 'Aggiungi', 'comp.annulla': 'Annulla', 'comp.ricorda': 'Da fare per domani: {c}',
    'sd.m.casa': 'A casa', 'sd.m.casa.s': 'compiti, scritti e calcoli',
    'sd.mate.s': 'Calcolatrice che parla, tabelline, formule, problemi', 'sd.corr.s': 'Corregge l\'ortografia, le parole restano tue',
    'sd.comp.s': 'Foto del diario: compiti e verifiche in ordine',
    'come.h': 'Come arrivano qui i compiti', 'come.1.t': 'Dalle lezioni, da soli',
    'come.1.s': 'Registri la lezione: quando il prof dà i compiti o annuncia una verifica, li trovo e li metto qui con la data.',
    'come.1.b': 'Sempre acceso', 'come.2.t': 'Dalla foto del diario', 'come.2.s': 'Fotografa la pagina del diario: leggo i compiti e le date.',
    'come.3.t': 'Scritti da te', 'come.3.s': 'Scrivi tu cosa devi fare e per quando.', 'come.3.b': 'Aggiungi',
    'lista.h': 'I tuoi compiti', 'v.fatto': 'Fatto', 'v.ascolta': 'Ascolta', 'v.togli': 'Togli',
    'nav.comp': 'Compiti', 'comp.da.lez': 'dalla lezione «{l}»', 'comp.lav.lez': 'Sto cercando i compiti nelle lezioni nuove…',
    'ver.arriva': '{t} di {m}', 'ver.quando0': 'oggi', 'ver.quando1': 'domani', 'ver.quando': '{d}', 'ver.ripassa': 'Ripassa adesso',
    'ver.flash': 'Flashcard', 'ver.mappa': 'Mappa per la verifica', 'ver.orale': 'Interrogazione a voce', 'ver.studia': 'Apri Studia',
    'gen.t': 'Settimana per i genitori', 'gen.s': 'Cosa ha studiato, compiti e verifiche', 'gen.h': 'La settimana di studio',
    'gen.dal': 'Dal {a} al {b}', 'gen.lez': 'Lezioni registrate', 'gen.fatti': 'Compiti fatti', 'gen.dafare': 'Da fare',
    'gen.ver': 'Verifiche e interrogazioni in arrivo', 'gen.niente': 'Niente', 'm4': 'Per docente e famiglia',
  },
  en: {
    'mate.h': 'Maths', 'mate.p': 'Spoken calculations, ready tables and formulas, problems explained one step at a time.',
    'mate.calc': 'Calculator', 'mate.tab': 'Times tables', 'mate.form': 'Formulas', 'mate.pb': 'Problem',
    'calc.voce': 'Voice', 'calc.rileggi': 'Read again', 'calc.fa': 'equals', 'calc.err': 'The calculation is not complete',
    'tab.s': 'Tap a number: I will tell you the multiplication.', 'tab.per': 'times', 'stampa': 'Print',
    'form.s': 'The formulas of the shapes, to bring to tests if your plan allows it.', 'form.per': 'Perimeter', 'form.area': 'Area',
    'pb.s': 'Type the problem or take a photo: I split it into small steps and read them to you.',
    'pb.ph': 'E.g. A rectangle is 12 cm long and 5 cm wide. What is its perimeter?',
    'pb.foto': 'Take a photo of the problem', 'pb.vai': 'Explain it', 'pb.lav': 'Splitting the problem into steps…',
    'pb.passo': 'Step {n} of {t}', 'pb.dopo': 'Next step', 'pb.prima': 'Previous step', 'pb.ris': 'Show the result', 'pb.risultato': 'Result',
    'pb.nuovo': 'Another problem', 'ascolta': 'Listen', 'foto.ok': 'Photo ready: {n}',
    'corr.h': 'Gentle spell-checker', 'corr.p': 'It only fixes spelling. The words are yours: I do not change them.',
    'corr.ph': 'Type or paste your text here…', 'corr.vai': 'Check', 'corr.lav': 'Checking the spelling…',
    'corr.n0': 'No spelling mistakes. Well done!', 'corr.n': 'I fixed {n} words:', 'corr.n1': 'I fixed 1 word:',
    'corr.leggi': 'Read it to me', 'corr.copia': 'Copy', 'corr.copiato': 'Text copied', 'corr.modifica': 'Edit again',
    'comp.h': 'Homework and deadlines', 'comp.p': 'Take a photo of your planner: homework and tests sort themselves out.',
    'comp.foto': 'Photo of the planner', 'comp.scegli': 'Choose a photo', 'comp.mano': 'Add by hand', 'comp.lav': 'Reading the planner…',
    'comp.nuovi': '{n} added', 'comp.nuovi0': 'Nothing new in the planner',
    'comp.vuoto': 'Nothing yet: take a photo of the planner page with your homework.',
    'comp.oggi': 'For today', 'comp.domani': 'For tomorrow', 'comp.sett': 'In the next few days', 'comp.poi': 'Later', 'comp.senza': 'No date', 'comp.fatti': 'Done',
    'comp.verifica': 'Test', 'comp.interrogazione': 'Oral test', 'comp.togli': 'Remove',
    'comp.materia': 'Subject', 'comp.cosa': 'What to do', 'comp.per': 'For when', 'comp.tipo': 'What is it', 'comp.compito': 'Homework',
    'comp.salva': 'Add', 'comp.annulla': 'Cancel', 'comp.ricorda': 'To do for tomorrow: {c}',
    'sd.m.casa': 'At home', 'sd.m.casa.s': 'homework, writing and maths',
    'sd.mate.s': 'Talking calculator, tables, formulas, problems', 'sd.corr.s': 'Fixes spelling, the words stay yours',
    'sd.comp.s': 'Planner photo: homework and tests in order',
    'come.h': 'How homework gets here', 'come.1.t': 'From lectures, by itself',
    'come.1.s': 'Record the lecture: when the teacher gives homework or announces a test, I find it and add it here with the date.',
    'come.1.b': 'Always on', 'come.2.t': 'From a planner photo', 'come.2.s': 'Take a photo of the planner page: I read the homework and the dates.',
    'come.3.t': 'Written by you', 'come.3.s': 'Write what you have to do and when.', 'come.3.b': 'Add',
    'lista.h': 'Your homework', 'v.fatto': 'Done', 'v.ascolta': 'Listen', 'v.togli': 'Remove',
    'nav.comp': 'Homework', 'comp.da.lez': 'from the lecture «{l}»', 'comp.lav.lez': 'Looking for homework in the new lectures…',
    'ver.arriva': '{t} in {m}', 'ver.quando0': 'today', 'ver.quando1': 'tomorrow', 'ver.quando': '{d}', 'ver.ripassa': 'Revise now',
    'ver.flash': 'Flashcards', 'ver.mappa': 'Map for the test', 'ver.orale': 'Spoken oral test', 'ver.studia': 'Open Study',
    'gen.t': 'Week for parents', 'gen.s': 'What was studied, homework and tests', 'gen.h': 'The study week',
    'gen.dal': 'From {a} to {b}', 'gen.lez': 'Recorded lectures', 'gen.fatti': 'Homework done', 'gen.dafare': 'To do',
    'gen.ver': 'Upcoming tests', 'gen.niente': 'Nothing', 'm4': 'For teachers and family',
  },
};
function ts(k, p) {
  let s = (SMT[LINGUA] && SMT[LINGUA][k]) ?? SMT.it[k] ?? k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
}
const SM_PAGINE = ['smmate', 'smcorr', 'smcomp'];
const SMS = {storia: [], mate: 'calc', calc: '', voce: true, pb: null, pbi: 0, pbris: false, pbfoto: [], corr: null, comp: [], mano: false, ricordato: false};

/* ------------------------------------------------------------------ pagine e collegamento con il resto */
function smPrepara() {
  const main = $('main');
  if (!main || $('v-smmate')) return;
  SM_PAGINE.forEach(p => {
    const s = document.createElement('section');
    s.className = 'pg hidden'; s.id = 'v-' + p;
    s.innerHTML = `<div class="hd"><div><h2></h2><p></p></div></div><div class="smbox"></div>`;
    main.appendChild(s);
    if (p !== 'smcomp' && !INTERNE.includes(p)) INTERNE.push(p);
  });
  const nav = $('nav'), arch = nav && nav.querySelector('a[data-p="arch"]');
  if (arch && !nav.querySelector('a[data-p="smcomp"]')) {
    const a = document.createElement('a'); a.dataset.p = 'smcomp';
    a.innerHTML = `<svg><use href="#g-cal"/></svg><span>${esc(ts('nav.comp'))}</span><span class="cnt hidden" id="navComp"></span>`;
    arch.after(a);
  }
  const prima = disegnaSpazioDsa;
  disegnaSpazioDsa = async function () { const r = await prima.apply(this, arguments); smVerifiche(); return r; };
  const vaiPrima = vai;
  vai = function (p, tornando = false) {
    SM_PAGINE.forEach(x => { const s = $('v-' + x); if (s) s.classList.add('hidden'); });
    if (p !== 'smmate' && p !== 'smcorr' && p !== 'smcomp') voceFermaSm();
    if (SM_PAGINE.includes(p)) smTitolo(p, ts({smmate: 'mate.h', smcorr: 'corr.h', smcomp: 'comp.h'}[p]), '');   // il titolo serve gia' al percorso
    const da = pagina;
    vaiPrima(p, tornando);
    if (!tornando && da && da !== p) { SMS.storia.push(da); if (SMS.storia.length > 15) SMS.storia.shift(); }
    if (p === 'dsa') SMS.storia = [];
    smPercorso(p);
    if (p === 'smmate') smMate();
    if (p === 'smcorr') smCorr();
    if (p === 'smcomp') smComp();
  };
}
function smTitolo(p, h, sub) {
  const s = $('v-' + p);
  s.querySelector('.hd h2').textContent = h;
  s.querySelector('.hd p').textContent = sub;
  return s.querySelector('.smbox');
}
let SM_PARLA = false;
function parlaSm(testo) { if (!SMS.voce || !testo) return; SM_PARLA = true; try { voceFerma(); } catch (e) {} voceParla(testo, 0.9); }
function voceFermaSm() { if (SM_PARLA) { SM_PARLA = false; try { voceFerma(); } catch (e) {} } }
const icoSm = id => `<svg width="18" height="18"><use href="#${id}"/></svg>`;

/* ------------------------------------------------------------------ MATEMATICA */
function smMate() {
  const box = smTitolo('smmate', ts('mate.h'), ts('mate.p'));
  const schede = [['calc', ts('mate.calc')], ['tab', ts('mate.tab')], ['form', ts('mate.form')], ['pb', ts('mate.pb')]];
  box.innerHTML = `<div class="seg smseg">${schede.map(([k, n]) => `<span data-k="${k}"${SMS.mate === k ? ' class="on"' : ''}>${esc(n)}</span>`).join('')}</div><div id="smMateIn"></div>`;
  box.querySelectorAll('.smseg span').forEach(s => s.onclick = () => { SMS.mate = s.dataset.k; voceFermaSm(); smMate(); });
  ({calc: smCalc, tab: smTab, form: smForm, pb: smPb})[SMS.mate]($('smMateIn'));
}

// calcolatrice parlante
const CALC_TASTI = ['C', '⌫', '(', ')', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', ',', '=', '+'];
const NOME_TASTO = {it: {'÷': 'diviso', '×': 'per', '−': 'meno', '+': 'più', ',': 'virgola', '(': 'apri parentesi', ')': 'chiudi parentesi', 'C': 'cancella tutto', '⌫': 'cancella'},
  en: {'÷': 'divided by', '×': 'times', '−': 'minus', '+': 'plus', ',': 'point', '(': 'open bracket', ')': 'close bracket', 'C': 'clear', '⌫': 'delete'}};
function numParlato(x) {
  if (!isFinite(x)) return '';
  const r = Math.round(x * 1e8) / 1e8;
  return LINGUA === 'en' ? String(r) : String(r).replace('.', ',');
}
function calcola(espr) {
  const js = espr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '.');
  if (!/^[0-9+\-*/(). ]+$/.test(js)) return null;
  try { const v = Function('"use strict";return (' + js + ')')(); return typeof v === 'number' && isFinite(v) ? v : null; } catch (e) { return null; }
}
function smCalc(el) {
  el.innerHTML = `<div class="card smcalc">
    <div class="smdisp"><div class="smespr" id="smEspr">${esc(SMS.calc || '0')}</div><div class="smris" id="smRis"></div></div>
    <div class="smtasti">${CALC_TASTI.map(k => `<button class="smt${/[0-9,]/.test(k) ? '' : k === '=' ? ' ug' : ' op'}" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>
    <div class="row mt" style="gap:8px;justify-content:space-between;flex-wrap:wrap">
      <span class="smvocesw"><span>${esc(ts('calc.voce'))}</span><span class="sw${SMS.voce ? ' on' : ''}" id="smVoce"></span></span>
      <button class="btn b-ghost b-sm" id="smRileggi">${icoSm('g-voce')} ${esc(ts('calc.rileggi'))}</button>
    </div></div>`;
  const disegna = () => { $('smEspr').textContent = SMS.calc || '0'; };
  el.querySelectorAll('.smt').forEach(b => b.onclick = () => {
    const k = b.dataset.k, nomi = NOME_TASTO[LINGUA === 'en' ? 'en' : 'it'];
    $('smRis').textContent = '';
    if (k === 'C') SMS.calc = '';
    else if (k === '⌫') SMS.calc = SMS.calc.slice(0, -1);
    else if (k === '=') {
      const v = calcola(SMS.calc);
      if (v === null) { $('smRis').textContent = ts('calc.err'); parlaSm(ts('calc.err')); return; }
      $('smRis').textContent = '= ' + numParlato(v);
      parlaSm(`${ts('calc.fa')} ${numParlato(v)}`);
      return;
    } else SMS.calc += k;
    disegna();
    parlaSm(nomi[k] || k);
  });
  $('smVoce').onclick = () => { SMS.voce = !SMS.voce; $('smVoce').classList.toggle('on', SMS.voce); if (!SMS.voce) voceFermaSm(); };
  $('smRileggi').onclick = () => {
    const nomi = NOME_TASTO[LINGUA === 'en' ? 'en' : 'it'];
    const v = calcola(SMS.calc);
    const detto = (SMS.calc || '0').replace(/[÷×−+()]/g, m => ' ' + nomi[m] + ' ');
    const prima = SMS.voce; SMS.voce = true; parlaSm(detto + (v !== null ? ` ${ts('calc.fa')} ${numParlato(v)}` : '')); SMS.voce = prima;
  };
}

// tabelline
function smTab(el) {
  let h = '<table class="smtab"><tr><th>×</th>' + Array.from({length: 10}, (_, i) => `<th data-c="${i + 1}">${i + 1}</th>`).join('') + '</tr>';
  for (let r = 1; r <= 10; r++) h += `<tr><th data-r="${r}">${r}</th>` + Array.from({length: 10}, (_, c) => `<td data-r="${r}" data-c="${c + 1}">${r * (c + 1)}</td>`).join('') + '</tr>';
  el.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px">
    <div class="hint" id="smTabDetto">${esc(ts('tab.s'))}</div><button class="btn b-ghost b-sm" id="smTabSt">${icoSm('g-stampa')} ${esc(ts('stampa'))}</button></div>
    <div class="smtabw">${h}</table></div></div>`;
  el.querySelectorAll('.smtab td').forEach(td => td.onclick = () => {
    const r = +td.dataset.r, c = +td.dataset.c;
    el.querySelectorAll('.smtab .on, .smtab .riga').forEach(x => x.classList.remove('on', 'riga'));
    el.querySelectorAll(`.smtab [data-r="${r}"], .smtab [data-c="${c}"]`).forEach(x => x.classList.add('riga'));
    td.classList.add('on');
    const frase = `${r} ${ts('tab.per')} ${c} ${ts('calc.fa')} ${r * c}`;
    $('smTabDetto').textContent = `${r} × ${c} = ${r * c}`;
    parlaSm(frase);
  });
  $('smTabSt').onclick = () => smStampa(el.querySelector('.smtabw').innerHTML, ts('mate.tab'));
}

// formulario
const FORME = [
  {n: {it: 'Quadrato', en: 'Square'}, svg: '<rect x="14" y="14" width="52" height="52"/>', p: 'P = 4 × l', a: 'A = l × l'},
  {n: {it: 'Rettangolo', en: 'Rectangle'}, svg: '<rect x="6" y="22" width="68" height="38"/>', p: 'P = 2 × (b + h)', a: 'A = b × h'},
  {n: {it: 'Triangolo', en: 'Triangle'}, svg: '<path d="M40 10 L72 66 L8 66 Z"/><path d="M40 10 L40 66" stroke-dasharray="4 4"/>', p: 'P = l₁ + l₂ + l₃', a: 'A = (b × h) ÷ 2'},
  {n: {it: 'Cerchio', en: 'Circle'}, svg: '<circle cx="40" cy="40" r="30"/><path d="M40 40 L70 40"/>', p: 'C = 2 × π × r', a: 'A = π × r × r'},
  {n: {it: 'Trapezio', en: 'Trapezoid'}, svg: '<path d="M22 18 L58 18 L74 64 L6 64 Z"/>', p: 'P = B + b + l₁ + l₂', a: 'A = (B + b) × h ÷ 2'},
  {n: {it: 'Rombo', en: 'Rhombus'}, svg: '<path d="M40 6 L72 40 L40 74 L8 40 Z"/><path d="M8 40 L72 40 M40 6 L40 74" stroke-dasharray="4 4"/>', p: 'P = 4 × l', a: 'A = (D × d) ÷ 2'},
];
function formulaParlata(f) {
  const it = LINGUA !== 'en';
  return f.replace('P =', it ? 'perimetro uguale' : 'perimeter equals').replace('A =', it ? 'area uguale' : 'area equals').replace('C =', it ? 'circonferenza uguale' : 'circumference equals')
    .replace(/×/g, it ? ' per ' : ' times ').replace(/÷/g, it ? ' diviso ' : ' divided by ').replace(/\+/g, it ? ' più ' : ' plus ').replace(/π/g, ' pi greco ')
    .replace(/[()]/g, ' ').replace(/₁/g, '1').replace(/₂/g, '2').replace(/₃/g, '3');
}
function smForm(el) {
  const L = LINGUA === 'en' ? 'en' : 'it';
  el.innerHTML = `<div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px"><div class="hint">${esc(ts('form.s'))}</div>
    <button class="btn b-ghost b-sm" id="smFoSt">${icoSm('g-stampa')} ${esc(ts('stampa'))}</button></div>
    <div class="smforme">${FORME.map((f, i) => `<div class="card smforma"><svg viewBox="0 0 80 80" class="smfig">${f.svg}</svg>
      <div class="sp"><b>${esc(f.n[L])}</b><div class="smf" data-i="${i}" data-q="p"><span>${esc(ts('form.per'))}</span> ${esc(f.p)}</div>
      <div class="smf" data-i="${i}" data-q="a"><span>${esc(ts('form.area'))}</span> ${esc(f.a)}</div></div></div>`).join('')}</div>`;
  el.querySelectorAll('.smf').forEach(d => d.onclick = () => { const f = FORME[+d.dataset.i]; parlaSm(f.n[L] + '. ' + formulaParlata(d.dataset.q === 'p' ? f.p : f.a)); });
  $('smFoSt').onclick = () => smStampa(el.querySelector('.smforme').innerHTML, ts('mate.form'));
}
function smStampa(html, titolo) {
  const w = window.open('', '_blank');
  if (!w) return;
  const st = [...document.querySelectorAll('style,link[rel=stylesheet]')].map(x => x.outerHTML).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titolo)}</title>${st}</head><body class="smstampa"><h2>${esc(titolo)}</h2>${html}</body></html>`);
  w.document.close(); setTimeout(() => { try { w.print(); } catch (e) {} }, 400);
}

// problema passo passo
function smPb(el) {
  const P = SMS.pb;
  if (!P) {
    el.innerHTML = `<div class="card"><div class="hint" style="margin-bottom:10px">${esc(ts('pb.s'))}</div>
      <textarea class="in" id="smPbT" rows="4" placeholder="${esc(ts('pb.ph'))}"></textarea>
      <div class="row mt" style="gap:8px;flex-wrap:wrap">
        <button class="btn b-ghost b-sm" id="smPbF">${icoSm('g-foto')} ${esc(ts('pb.foto'))}</button><span class="hint" id="smPbFn"></span>
        <span class="sp"></span><button class="btn b-main b-sm" id="smPbVai">${esc(ts('pb.vai'))}</button></div></div>`;
    if (SMS.pbfoto.length) $('smPbFn').textContent = ts('foto.ok', {n: SMS.pbfoto.length});
    $('smPbF').onclick = async () => {
      const s = await A.scatta_foglio();
      if (s && s.ok && s.percorsi && s.percorsi.length) { SMS.pbfoto = s.percorsi.slice(0, 3); $('smPbFn').textContent = ts('foto.ok', {n: SMS.pbfoto.length}); }
    };
    $('smPbVai').onclick = async () => {
      const testo = $('smPbT').value.trim();
      if (!testo && !SMS.pbfoto.length) return toast(ts('pb.s'));
      $('smPbVai').disabled = true; $('smPbVai').textContent = ts('pb.lav');
      const r = await A.sm_problema(testo, SMS.pbfoto);
      if (!r || !r.ok) { $('smPbVai').disabled = false; $('smPbVai').textContent = ts('pb.vai'); return toast((r && r.msg) || ts('pb.lav')); }
      SMS.pb = r; SMS.pbi = 0; SMS.pbris = false; SMS.pbfoto = [];
      smPb(el); smParlaPasso();
    };
    return;
  }
  const n = P.passi.length, i = Math.min(SMS.pbi, n - 1), p = P.passi[i] || {};
  el.innerHTML = `<div class="card"><div class="lbl">${esc(ts('mate.pb'))}</div><div class="smpbtesto">${esc(P.problema)}</div></div>
    <div class="card mt smpasso"><div class="row" style="gap:10px;align-items:center"><span class="smn">${i + 1}</span>
      <div class="sp"><div class="hint">${esc(ts('pb.passo', {n: i + 1, t: n}))}</div><b>${esc(p.titolo || '')}</b></div>
      <button class="btn b-ghost b-sm" id="smPbAs">${icoSm('g-voce')} ${esc(ts('ascolta'))}</button></div>
      <div class="smspieg">${esc(p.spiegazione || '')}</div>${p.calcolo ? `<div class="smcalcolo">${esc(p.calcolo)}</div>` : ''}
      <div class="smpunti">${P.passi.map((_, k) => `<i class="${k < i ? 'f' : k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="row mt" style="gap:8px;flex-wrap:wrap">
        <button class="btn b-ghost b-sm" id="smPbPr"${i === 0 ? ' disabled' : ''}>← ${esc(ts('pb.prima'))}</button><span class="sp"></span>
        ${i < n - 1 ? `<button class="btn b-main b-sm" id="smPbDo">${esc(ts('pb.dopo'))} →</button>` : `<button class="btn b-main b-sm" id="smPbRi">${esc(ts('pb.ris'))}</button>`}</div></div>
    ${SMS.pbris ? `<div class="card mt smrisbox"><div class="lbl">${esc(ts('pb.risultato'))}</div><div class="smcalcolo">${esc(P.risultato)}</div></div>` : ''}
    <div class="row mt"><span class="sp"></span><button class="lnk" id="smPbNu">${esc(ts('pb.nuovo'))}</button></div>`;
  $('smPbAs').onclick = () => { const v = SMS.voce; SMS.voce = true; smParlaPasso(); SMS.voce = v; };
  $('smPbPr').onclick = () => { SMS.pbi = Math.max(0, i - 1); smPb(el); smParlaPasso(); };
  if ($('smPbDo')) $('smPbDo').onclick = () => { SMS.pbi = i + 1; smPb(el); smParlaPasso(); };
  if ($('smPbRi')) $('smPbRi').onclick = () => { SMS.pbris = true; smPb(el); parlaSm(ts('pb.risultato') + ': ' + P.risultato); };
  $('smPbNu').onclick = () => { SMS.pb = null; voceFermaSm(); smPb(el); };
}
function smParlaPasso() {
  const P = SMS.pb; if (!P) return;
  const p = P.passi[SMS.pbi] || {};
  parlaSm([p.titolo, p.spiegazione, p.calcolo].filter(Boolean).join('. ').replace(/×/g, ' per ').replace(/÷/g, ' diviso ').replace(/=/g, ' uguale '));
}

/* ------------------------------------------------------------------ CORRETTORE GENTILE */
function smCorr() {
  const box = smTitolo('smcorr', ts('corr.h'), ts('corr.p'));
  const C = SMS.corr;
  if (!C) {
    box.innerHTML = `<div class="card"><textarea class="in smcorrt" id="smCoT" rows="9" placeholder="${esc(ts('corr.ph'))}">${esc(SMS.corrTesto || '')}</textarea>
      <div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn b-ghost b-sm" id="smCoDe">${icoSm('i-mic')} ${esc(t('sd.detta'))}</button>
      <span class="sp"></span><button class="btn b-main b-sm" id="smCoVai">${esc(ts('corr.vai'))}</button></div></div>`;
    $('smCoT').oninput = () => { SMS.corrTesto = $('smCoT').value; };
    $('smCoDe').onclick = () => vai('dp');
    $('smCoVai').onclick = async () => {
      const testo = $('smCoT').value.trim(); if (!testo) return;
      $('smCoVai').disabled = true; $('smCoVai').textContent = ts('corr.lav');
      const r = await A.sm_correggi(testo);
      if (!r || !r.ok) { $('smCoVai').disabled = false; $('smCoVai').textContent = ts('corr.vai'); return toast((r && r.msg) || ''); }
      SMS.corr = r; smCorr();
    };
    return;
  }
  // il testo corretto, con le parole cambiate evidenziate
  let html = esc(C.testo);
  const usate = new Set();
  C.correzioni.forEach(c => {
    if (usate.has(c.a)) return; usate.add(c.a);
    const re = new RegExp('(^|[^\\p{L}])(' + esc(c.a).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=[^\\p{L}]|$)', 'gu');
    html = html.replace(re, (m, a, b) => `${a}<span class="ev" title="${esc(c.da)}">${b}</span>`);
  });
  const n = C.correzioni.length;
  box.innerHTML = `<div class="card"><div class="smcorrout">${html.replace(/\n/g, '<br>')}</div>
      <div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn b-main b-sm" id="smCoLe">${icoSm('g-voce')} ${esc(ts('corr.leggi'))}</button>
      <button class="btn b-ghost b-sm" id="smCoCo">${esc(ts('corr.copia'))}</button><span class="sp"></span><button class="lnk" id="smCoMo">${esc(ts('corr.modifica'))}</button></div></div>
    <div class="card mt"><div class="lbl">${esc(n ? (n === 1 ? ts('corr.n1') : ts('corr.n', {n})) : ts('corr.n0'))}</div>
      ${n ? `<div class="smcorrl">${C.correzioni.map(c => `<span class="chip"><s>${esc(c.da)}</s> → <b>${esc(c.a)}</b></span>`).join('')}</div>` : ''}</div>`;
  $('smCoLe').onclick = () => { const v = SMS.voce; SMS.voce = true; parlaSm(C.testo); SMS.voce = v; };
  $('smCoCo').onclick = async () => { try { await navigator.clipboard.writeText(C.testo); toast(ts('corr.copiato')); } catch (e) {} };
  $('smCoMo').onclick = () => { SMS.corrTesto = C.testo; SMS.corr = null; voceFermaSm(); smCorr(); };
}

/* ------------------------------------------------------------------ COMPITI E SCADENZE */
async function smComp() {
  const box = smTitolo('smcomp', ts('comp.h'), ts('comp.p'));
  if (!box.dataset.pronta) box.innerHTML = `<div class="hint">…</div>`;
  const r = await A.sm_compiti();
  SMS.comp = (r && r.compiti) || []; SMS.oggi = (r && r.oggi) || new Date().toISOString().slice(0, 10);
  box.dataset.pronta = 1;
  smCompDisegna();
  if (r && r.lavoro) { toast(ts('comp.lav.lez')); clearTimeout(SMS.giroLez); SMS.giroLez = setTimeout(() => { if (pagina === 'smcomp') smComp(); }, 15000); }
}
function smGiorni(d) { return Math.round((new Date(d + 'T12:00') - new Date(SMS.oggi + 'T12:00')) / 864e5); }
function smData(d) {
  try { return new Date(d + 'T12:00').toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {weekday: 'long', day: 'numeric', month: 'long'}); } catch (e) { return d; }
}
function smCompDisegna() {
  const box = $('v-smcomp').querySelector('.smbox');
  const gruppi = {oggi: [], domani: [], sett: [], poi: [], senza: [], fatti: []};
  SMS.comp.forEach(v => {
    if (v.fatto) return gruppi.fatti.push(v);
    if (!v.per) return gruppi.senza.push(v);
    const g = smGiorni(v.per);
    (g <= 0 ? gruppi.oggi : g === 1 ? gruppi.domani : g <= 7 ? gruppi.sett : gruppi.poi).push(v);
  });
  const voce = v => `<div class="smvoce${v.fatto ? ' fatto' : ''}" data-id="${esc(v.id)}">
      <label class="smckl" data-f="1"><span class="smck${v.fatto ? ' on' : ''}"></span><small>${esc(ts('v.fatto'))}</small></label>
      <div class="sp"><b>${esc(v.materia || '')}</b>${v.tipo !== 'compito' ? ` <span class="chip smtipo">${esc(ts('comp.' + v.tipo))}</span>` : ''}
        <div>${esc(v.cosa)}</div>${v.per ? `<small class="mutt">${esc(smData(v.per))}</small>` : ''}${v.fonte ? `<small class="mutt"> · ${esc(ts('comp.da.lez', {l: v.fonte}))}</small>` : ''}
        ${v.tipo !== 'compito' && !v.fatto ? `<div class="mt"><button class="btn b-ghost b-sm" data-r="1">${icoSm('g-ripeti')} ${esc(ts('ver.ripassa'))}</button></div>` : ''}</div>
      <div class="smazioni"><button class="lnk" data-a="1">${icoSm('g-voce')} ${esc(ts('v.ascolta'))}</button>
      <button class="lnk" data-x="1">${icoSm('g-cestino')} ${esc(ts('v.togli'))}</button></div></div>`;
  const sez = (k, aperta = true) => gruppi[k].length ? `<details class="cap smgr"${aperta ? ' open' : ''}><summary>${esc(ts('comp.' + k))} <span class="cnt">${gruppi[k].length}</span><span class="fr">›</span></summary>
      <div class="smlista">${gruppi[k].map(voce).join('')}</div></details>` : '';
  box.innerHTML = `<div class="card"><div class="lbl">${esc(ts('come.h'))}</div><div class="smcome">
      <div class="smcm"><span class="ico fam-studio ico-l"><svg><use href="#g-reg"/></svg></span><div class="sp"><b><span class="smnum">1</span>${esc(ts('come.1.t'))}</b>
        <small>${esc(ts('come.1.s'))}</small><span class="smok">✓ ${esc(ts('come.1.b'))}</span></div></div>
      <div class="smcm"><span class="ico fam-scrivi ico-l"><svg><use href="#g-foto"/></svg></span><div class="sp"><b><span class="smnum">2</span>${esc(ts('come.2.t'))}</b>
        <small>${esc(ts('come.2.s'))}</small><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">
        <button class="btn b-main b-sm" id="smCpF">${esc(ts('comp.foto'))}</button><button class="btn b-ghost b-sm" id="smCpS">${esc(ts('comp.scegli'))}</button></div></div></div>
      <div class="smcm"><span class="ico fam-prova ico-l"><svg><use href="#i-edit"/></svg></span><div class="sp"><b><span class="smnum">3</span>${esc(ts('come.3.t'))}</b>
        <small>${esc(ts('come.3.s'))}</small><div style="margin-top:8px"><button class="btn b-ghost b-sm" id="smCpM">${icoSm('g-piu')} ${esc(ts('come.3.b'))}</button></div></div></div>
      </div><div id="smCpMano"></div></div>
    <div class="lbl" style="margin:18px 0 8px">${esc(ts('lista.h'))}</div>
    <div>${SMS.comp.length ? sez('oggi') + sez('domani') + sez('sett') + sez('poi') + sez('senza') + sez('fatti', false) : `<div class="hint">${esc(ts('comp.vuoto'))}</div>`}</div>`;
  const foto = async scatta => {
    const s = scatta ? await A.scatta_foglio() : await A.scegli_immagini();
    if (!s || !s.ok || !s.percorsi || !s.percorsi.length) return;
    const b = $('smCpF'); b.disabled = true; b.textContent = ts('comp.lav');
    const r = await A.sm_diario(s.percorsi);
    if (!r || !r.ok) { toast((r && r.msg) || ''); return smCompDisegna(); }
    SMS.comp = r.compiti; toast(r.nuovi ? ts('comp.nuovi', {n: r.nuovi}) : ts('comp.nuovi0')); smCompDisegna();
  };
  $('smCpF').onclick = () => foto(true);
  $('smCpS').onclick = () => foto(false);
  $('smCpM').onclick = () => { SMS.mano = !SMS.mano; smCompMano(); };
  smCompMano();
  box.querySelectorAll('.smvoce').forEach(d => {
    const id = d.dataset.id, v = SMS.comp.find(x => x.id === id);
    d.querySelector('[data-f]').onclick = async () => { const r = await A.sm_compito(id, !v.fatto, false); SMS.comp = r.compiti; smCompDisegna(); };
    d.querySelector('[data-a]').onclick = () => { const p = SMS.voce; SMS.voce = true; parlaSm([v.materia, v.tipo !== 'compito' ? ts('comp.' + v.tipo) : '', v.cosa, v.per ? smData(v.per) : ''].filter(Boolean).join('. ')); SMS.voce = p; };
    if (d.querySelector('[data-r]')) d.querySelector('[data-r]').onclick = () => smRipassa(v.materia, 'fcorso');
    d.querySelector('[data-x]').onclick = async () => { const r = await A.sm_compito(id, null, true); SMS.comp = r.compiti; smCompDisegna(); };
  });
}
function smCompMano() {
  const el = $('smCpMano'); if (!el) return;
  if (!SMS.mano) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="smmano mt"><div><div class="lbl">${esc(ts('comp.materia'))}</div><input class="in sm" id="smMaM" maxlength="60"></div>
    <div class="sp2"><div class="lbl">${esc(ts('comp.cosa'))}</div><input class="in sm" id="smMaC" maxlength="300"></div>
    <div><div class="lbl">${esc(ts('comp.per'))}</div><input class="in sm" id="smMaP" type="date"></div>
    <div><div class="lbl">${esc(ts('comp.tipo'))}</div><select class="in sm" id="smMaT"><option value="compito">${esc(ts('comp.compito'))}</option>
      <option value="verifica">${esc(ts('comp.verifica'))}</option><option value="interrogazione">${esc(ts('comp.interrogazione'))}</option></select></div></div>
    <div class="row mt" style="gap:8px;justify-content:flex-end"><button class="btn b-ghost b-sm" id="smMaNo">${esc(ts('comp.annulla'))}</button>
      <button class="btn b-main b-sm" id="smMaOk">${esc(ts('comp.salva'))}</button></div>`;
  $('smMaNo').onclick = () => { SMS.mano = false; smCompMano(); };
  $('smMaOk').onclick = async () => {
    const v = {materia: $('smMaM').value, cosa: $('smMaC').value, per: $('smMaP').value, tipo: $('smMaT').value};
    if (!v.cosa.trim()) return $('smMaC').focus();
    const r = await A.sm_compito_nuovo(v); SMS.comp = r.compiti; SMS.mano = false; smCompDisegna();
  };
}
// all'apertura: cosa c'è da fare per domani (una volta al giorno)
async function smRicorda() {
  try {
    const r = await A.sm_compiti();
    if (!r || !r.ricorda || !r.ricorda.length) return;
    let ult = ''; try { ult = localStorage.getItem('smRicordato') || ''; } catch (e) {}
    if (ult === r.oggi) return;
    try { localStorage.setItem('smRicordato', r.oggi); } catch (e) {}
    toast(ts('comp.ricorda', {c: r.ricorda.map(v => (v.materia ? v.materia + ': ' : '') + v.cosa).slice(0, 3).join(' · ')}));
  } catch (e) {}
}

/* ------------------------------------------------------------------ verifica in arrivo: ripasso pronto */
function smMateria(nome) {
  try { return materieStudia().find(x => x.m.toLowerCase() === String(nome || '').toLowerCase()) || null; } catch (e) { return null; }
}
function smRipassa(materia, a) {
  const m = smMateria(materia);
  if (!m) return vai('studia');
  return tileStudia(m, a);
}
async function smVerifiche() {
  const box = $('sdBox'); if (!box) return;
  const r = await A.sm_compiti(); if (!r || !r.compiti) return;
  SMS.oggi = r.oggi;
  const vv = r.compiti.filter(v => !v.fatto && v.tipo !== 'compito' && v.per && smGiorni(v.per) >= 0 && smGiorni(v.per) <= 7).sort((x, y) => x.per.localeCompare(y.per)).slice(0, 3);
  box.parentNode.querySelectorAll('.smverbox').forEach(x => x.remove());
  if (!vv.length) return;
  const d = document.createElement('div');
  d.innerHTML = vv.map(v => {
    const g = smGiorni(v.per), q = g === 0 ? ts('ver.quando0') : g === 1 ? ts('ver.quando1') : smData(v.per);
    const m = smMateria(v.materia);
    return `<div class="card smver" data-m="${esc(v.materia || '')}"><div class="row" style="gap:12px;align-items:center;flex-wrap:wrap">
      <span class="ico fam-prova ico-l"><svg><use href="#g-bersaglio"/></svg></span>
      <div class="sp"><b>${esc(ts('ver.arriva', {t: ts('comp.' + v.tipo), m: v.materia || '—'}))}</b><div class="hint">${esc(q)} · ${esc(v.cosa)}</div></div>
      ${m ? `<button class="btn b-ghost b-sm" data-a="fcorso">${esc(ts('ver.flash'))}</button><button class="btn b-ghost b-sm" data-a="mverif">${esc(ts('ver.mappa'))}</button>
        <button class="btn b-main b-sm" data-a="orale">${esc(ts('ver.orale'))}</button>` : `<button class="btn b-main b-sm" data-a="studia">${esc(ts('ver.studia'))}</button>`}</div></div>`;
  }).join('');
  box.parentNode.insertBefore(d, box);
  d.className = 'smverbox';
  d.querySelectorAll('.smver').forEach(c => c.querySelectorAll('[data-a]').forEach(b => b.onclick = () => b.dataset.a === 'studia' ? vai('studia') : smRipassa(c.dataset.m, b.dataset.a)));
}

/* ------------------------------------------------------------------ settimana per i genitori (da stampare) */
async function smGenitori() {
  const [r, lz] = await Promise.all([A.sm_compiti(), A.lezioni()]);
  const oggi = new Date(), da = new Date(oggi); da.setDate(oggi.getDate() - 6);
  const fmt = d => d.toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {day: 'numeric', month: 'long'});
  const iso = d => d.toISOString().slice(0, 10);
  SMS.oggi = (r && r.oggi) || iso(oggi);
  const comp = (r && r.compiti) || [];
  const lezioni = ((lz && lz.lezioni) || []).filter(l => {
    const m = String(l.quando || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); if (!m) return false;
    const d = `${m[3]}-${m[2]}-${m[1]}`; return d >= iso(da) && d <= iso(oggi);
  });
  const li = (arr, f) => arr.length ? `<ul>${arr.map(f).join('')}</ul>` : `<p class="hint">${esc(ts('gen.niente'))}</p>`;
  const fatti = comp.filter(v => v.fatto), dafare = comp.filter(v => !v.fatto && v.tipo === 'compito');
  const ver = comp.filter(v => !v.fatto && v.tipo !== 'compito');
  const html = `<p class="hint">${esc(ts('gen.dal', {a: fmt(da), b: fmt(oggi)}))}</p>
    <h3>${esc(ts('gen.lez'))} (${lezioni.length})</h3>${li(lezioni, l => `<li><b>${esc(l.materia || '')}</b> ${esc(l.nome)} <span class="hint">${esc(l.quando)}${l.durata ? ' · ' + esc(l.durata) : ''}</span></li>`)}
    <h3>${esc(ts('gen.ver'))}</h3>${li(ver, v => `<li><b>${esc(v.materia || '')}</b> ${esc(ts('comp.' + v.tipo))}: ${esc(v.cosa)} <span class="hint">${v.per ? esc(smData(v.per)) : ''}</span></li>`)}
    <h3>${esc(ts('gen.dafare'))}</h3>${li(dafare, v => `<li><b>${esc(v.materia || '')}</b> ${esc(v.cosa)} <span class="hint">${v.per ? esc(smData(v.per)) : ''}</span></li>`)}
    <h3>${esc(ts('gen.fatti'))}</h3>${li(fatti, v => `<li><b>${esc(v.materia || '')}</b> ${esc(v.cosa)}</li>`)}`;
  smStampa(`<div class="smgen">${html}</div>`, ts('gen.h'));
}

/* ------------------------------------------------------------------ Indietro e percorso su ogni pagina */
// «I miei strumenti» è la casa: tutte le altre pagine hanno in alto «← Indietro» e «I miei strumenti › pagina».
// Le pagine che hanno già il loro percorso (quelle interne del programma) restano come sono.
function smPercorso(p) {
  if (p === 'dsa') return;
  const sec = document.querySelector('#main > section.pg:not(.hidden)');
  if (!sec || sec.querySelector(':scope > .perc')) return;
  const b = document.createElement('div'); b.className = 'perc';
  const casa = t('nav.dsa'), qui = nomePagina(p) || titoloPagina(p);
  b.innerHTML = `<button class="torna">← ${esc(t('indietro'))}</button><div class="briciole"><a data-casa="1">${esc(casa)}</a><span class="sep">›</span><b>${esc(qui)}</b></div>`;
  sec.insertBefore(b, sec.firstChild);
  b.querySelector('.torna').onclick = () => { const prima = SMS.storia.pop() || 'dsa'; vai(prima, true); };
  b.querySelector('[data-casa]').onclick = () => { SMS.storia = []; vai('dsa', true); };
}
