'use strict';
/* Scripta Manent — Matematica (stile professionale): Calcolatrice, Tabelline, Formulario, Problema passo passo, Altri strumenti.
   Sostituisce smMate/smCalc/smTab/smForm/smPb di strumenti_sm.js (questo file si carica dopo); usa i loro dati
   (CALC_TASTI, NOME_TASTO, calcola, numParlato, FORME, formulaParlata, smFormule). */

const SMM_T = {
  it: {
    'tab.altro': 'Altri strumenti', voce: 'Voce', rileggi: 'Rileggi il calcolo', copia: 'Copia', copiato: 'Copiato',
    'storia.h': 'I calcoli di oggi', 'storia.s': 'Tocca una riga per riascoltarla', 'storia.0': 'I calcoli che fai compaiono qui, con il risultato.',
    insieme: 'Insieme alla calcolatrice', 'tab.ripeti': 'Ripeti', 'tab.tutta': 'Ascolta una tabellina intera', 'tab.stampa': 'Stampa la tabella',
    'form.cat.piane': 'Figure piane', 'form.cat.solidi': 'Solidi', 'form.cat.unita': 'Unità di misura', 'form.cat.fraz': 'Frazioni e percentuali',
    'pb.h': 'Il problema', 'pb.leggi': 'Leggimi il testo', 'pb.passi': 'Passo passo', 'pb.passi.s': '{n} passi · tocca un passo per sentirlo',
    'pb.ascolta': 'Ascolta', 'pb.riascolta': 'Riascolta', 'pb.prima': 'Passo prima', 'pb.dopo': 'Passo {n}', 'pb.ris.h': 'Il risultato', 'pb.ris.nasc': 'Nascosto, così prima provi da solo',
    'pb.ris.mostra': 'Mostra il risultato', 'pb.aiuti': 'Ti aiutano', 'pb.chiedi': 'Chiedi su questo passo', 'pb.chiedi.s': 'Scrivi cosa non hai capito', 'pb.detta': 'Dettalo',
    'al.capire': 'Per capire', 'al.verifica': 'Per la verifica', 'fraz.h': 'Frazioni da vedere', 'fraz.s': 'La torta divisa in parti',
    'perc.h': 'Percentuali facili', 'perc.s': 'Quanto è il tanto per cento di un numero', 'conv.h': 'Convertitore di unità', 'conv.s': 'Metri, grammi, litri, minuti',
    'foglio.h': 'Il mio foglio per la verifica', 'foglio.s': 'Le formule delle tue lezioni e quelle di base, da stampare', 'test.h': 'Esercizi come in verifica', 'test.s': 'Test a crocette di Matematica',
    'fraz.di': 'su', 'fraz.dice': '{a} fratto {b} uguale {d}, cioè il {p} per cento', 'perc.di': 'di', 'perc.fa': 'Il {p} per cento di {n} fa {r}', 'perc.sconto': 'Con lo sconto: {r}',
    'conv.da': 'Da', 'conv.a': 'A', 'conv.fa': '{v} {u1} sono {r} {u2}', 'chiudi': 'Chiudi',
  },
  en: {
    'tab.altro': 'More tools', voce: 'Voice', rileggi: 'Read the sum again', copia: 'Copy', copiato: 'Copied',
    'storia.h': 'Today\'s sums', 'storia.s': 'Tap a row to hear it again', 'storia.0': 'Your sums appear here, with the result.',
    insieme: 'With the calculator', 'tab.ripeti': 'Repeat', 'tab.tutta': 'Listen to a whole table', 'tab.stampa': 'Print the table',
    'form.cat.piane': 'Flat shapes', 'form.cat.solidi': 'Solids', 'form.cat.unita': 'Units', 'form.cat.fraz': 'Fractions and percentages',
    'pb.h': 'The problem', 'pb.leggi': 'Read me the text', 'pb.passi': 'Step by step', 'pb.passi.s': '{n} steps · tap a step to hear it',
    'pb.ascolta': 'Listen', 'pb.riascolta': 'Again', 'pb.prima': 'Previous step', 'pb.dopo': 'Step {n}', 'pb.ris.h': 'The result', 'pb.ris.nasc': 'Hidden, so you try first',
    'pb.ris.mostra': 'Show the result', 'pb.aiuti': 'They help you', 'pb.chiedi': 'Ask about this step', 'pb.chiedi.s': 'Write what you did not understand', 'pb.detta': 'Dictate it',
    'al.capire': 'To understand', 'al.verifica': 'For the test', 'fraz.h': 'See fractions', 'fraz.s': 'The cake cut in parts',
    'perc.h': 'Easy percentages', 'perc.s': 'How much is a percentage of a number', 'conv.h': 'Unit converter', 'conv.s': 'Metres, grams, litres, minutes',
    'foglio.h': 'My sheet for the test', 'foglio.s': 'Your lesson formulas and the basic ones, to print', 'test.h': 'Exercises like the test', 'test.s': 'Maths multiple choice',
    'fraz.di': 'of', 'fraz.dice': '{a} over {b} equals {d}, that is {p} percent', 'perc.di': 'of', 'perc.fa': '{p} percent of {n} is {r}', 'perc.sconto': 'With the discount: {r}',
    'conv.da': 'From', 'conv.a': 'To', 'conv.fa': '{v} {u1} are {r} {u2}', 'chiudi': 'Close',
  },
};
function tm(k, p) {
  let s = (SMM_T[LINGUA] && SMM_T[LINGUA][k]) ?? SMM_T.it[k] ?? k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
}
SMS.calcStoria = SMS.calcStoria || [];

/* forme in piu': solidi, unita', frazioni (le figure piane sono FORME di strumenti_sm.js) */
const FORME_ALTRE = {
  solidi: [
    {n: {it: 'Cubo', en: 'Cube'}, svg: '<path d="M18 26 L46 14 L66 26 L66 58 L38 70 L18 58 Z M18 26 L38 38 L66 26 M38 38 L38 70"/>', p: 'A tot = 6 × l × l', a: 'V = l × l × l', lp: {it: 'Area totale', en: 'Total area'}, la: {it: 'Volume', en: 'Volume'}},
    {n: {it: 'Parallelepipedo', en: 'Cuboid'}, svg: '<path d="M10 30 L46 18 L70 28 L70 56 L34 68 L10 58 Z M10 30 L34 40 L70 28 M34 40 L34 68"/>', p: 'A tot = 2 × (ab + bc + ac)', a: 'V = a × b × c', lp: {it: 'Area totale', en: 'Total area'}, la: {it: 'Volume', en: 'Volume'}},
    {n: {it: 'Cilindro', en: 'Cylinder'}, svg: '<ellipse cx="40" cy="20" rx="24" ry="8"/><path d="M16 20 V60 A24 8 0 0 0 64 60 V20"/>', p: 'A lat = 2 × π × r × h', a: 'V = π × r × r × h', lp: {it: 'Area laterale', en: 'Side area'}, la: {it: 'Volume', en: 'Volume'}},
  ],
  unita: [
    {n: {it: 'Lunghezze', en: 'Length'}, svg: '<path d="M8 50 H72 M8 44 V56 M24 46 V54 M40 44 V56 M56 46 V54 M72 44 V56"/>', p: '1 m = 100 cm', a: '1 km = 1000 m', lp: {it: '', en: ''}, la: {it: '', en: ''}},
    {n: {it: 'Pesi', en: 'Weight'}, svg: '<path d="M20 64 L28 28 H52 L60 64 Z"/><circle cx="40" cy="22" r="6"/>', p: '1 kg = 1000 g', a: '1 hg = 100 g', lp: {it: '', en: ''}, la: {it: '', en: ''}},
    {n: {it: 'Capacità', en: 'Capacity'}, svg: '<path d="M26 14 H54 L50 66 H30 Z"/>', p: '1 l = 10 dl', a: '1 l = 100 cl', lp: {it: '', en: ''}, la: {it: '', en: ''}},
  ],
  fraz: [
    {n: {it: 'Frazione', en: 'Fraction'}, svg: '<circle cx="40" cy="40" r="28"/><path d="M40 12 V68 M40 40 L64 26"/>', p: 'a/b = a ÷ b', a: '3/4 = 0,75', lp: {it: '', en: ''}, la: {it: '', en: ''}},
    {n: {it: 'Percentuale', en: 'Percentage'}, svg: '<path d="M16 64 L64 16"/><circle cx="22" cy="22" r="7"/><circle cx="58" cy="58" r="7"/>', p: 'x% di N = N × x ÷ 100', a: '25% = 1/4', lp: {it: '', en: ''}, la: {it: '', en: ''}},
  ],
};

function smMate() {
  const sec = $('v-smmate'); sec.classList.add('smm');
  const box = smTitolo('smmate', ts('mate.h'), ts('mate.p'));
  const hd = sec.querySelector('.hd');
  if (!hd.querySelector('.smm-voce')) hd.insertAdjacentHTML('beforeend', `<span class="smm-voce"><span>${esc(tm('voce'))}</span><span class="sw" id="smmVoce"></span></span>`);
  $('smmVoce').classList.toggle('on', !!SMS.voce);
  $('smmVoce').onclick = () => { SMS.voce = !SMS.voce; $('smmVoce').classList.toggle('on', SMS.voce); if (!SMS.voce) voceFermaSm(); };
  const schede = [['calc', ts('mate.calc')], ['tab', ts('mate.tab')], ['form', ts('mate.form')], ['pb', LINGUA === 'en' ? 'Problem step by step' : 'Problema passo passo'], ['altro', tm('tab.altro')]];
  if (!schede.some(s => s[0] === SMS.mate)) SMS.mate = 'calc';
  box.innerHTML = `<div class="smx-tabs smm-tabs">${schede.map(([k, n]) => `<button class="${SMS.mate === k ? 'on' : ''}" data-k="${k}">${esc(n)}</button>`).join('')}</div><div id="smMateIn"></div>`;
  box.querySelectorAll('.smm-tabs button').forEach(s => s.onclick = () => { SMS.mate = s.dataset.k; voceFermaSm(); smMate(); });
  ({calc: smCalc, tab: smTab, form: smForm, pb: smPb, altro: smmAltro})[SMS.mate]($('smMateIn'));
  smInfoGiro(sec);
}
const smmVai = (k) => { SMS.mate = k; smMate(); };

/* ------------------------------------------------------------------ calcolatrice */
function smCalc(el) {
  el.innerHTML = `<div class="smm-calcw"><div class="card smm-calc">
      <div class="smm-disp"><div class="smm-espr" id="smEspr">${esc(SMS.calc || '0')}</div><div class="smm-ris" id="smRis"></div></div>
      <div class="smm-tasti">${CALC_TASTI.map(k => `<button class="smm-t${/[0-9,]/.test(k) ? '' : k === '=' ? ' ug' : /[C⌫]/.test(k) ? ' c' : ' op'}" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>
      <div class="row" style="gap:8px;padding:0 14px 14px;flex-wrap:wrap"><button class="btn b-ghost b-sm" id="smRileggi">${smIco('g-voce')} ${esc(tm('rileggi'))}</button>
        <button class="btn b-ghost b-sm" id="smCopia">${esc(tm('copia'))}</button></div></div>
    <div><h3 class="smx-h3">${esc(tm('storia.h'))}<small class="sp" style="display:none">${esc(tm('storia.s'))}</small></h3><div class="smx-lista" id="smmStoria"></div>
      <h3 class="smx-h3">${esc(tm('insieme'))}</h3><div class="smx-lista">
        <button class="smx-f" data-v="tab"><span class="smx-fi ind">${smIco('g-calc')}</span><span class="smx-ft"><b>${esc(ts('mate.tab'))}</b></span><span class="smx-chev">›</span></button>
        <button class="smx-f" data-v="form"><span class="smx-fi ind">${smIco('g-note')}</span><span class="smx-ft"><b>${esc(ts('mate.form'))}</b></span><span class="smx-chev">›</span></button>
        <button class="smx-f" data-v="pb"><span class="smx-fi ind">${smIco('g-foto')}</span><span class="smx-ft"><b>${esc(LINGUA === 'en' ? 'Problem step by step' : 'Problema passo passo')}</b></span><span class="smx-chev">›</span></button></div></div></div>`;
  const storia = () => {
    $('smmStoria').innerHTML = SMS.calcStoria.length ? SMS.calcStoria.slice(0, 8).map(([e, v], i) => `<button class="smx-f smm-st" data-i="${i}"><span class="smx-ft"><b>${esc(e)}</b></span><span class="smm-stv">= ${esc(v)}</span></button>`).join('')
      : `<div class="hint" style="padding:12px 14px">${esc(tm('storia.0'))}</div>`;
    $('smmStoria').querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const [e, v] = SMS.calcStoria[+b.dataset.i]; const p = SMS.voce; SMS.voce = true; parlaSm(detto(e) + ` ${ts('calc.fa')} ${v}`); SMS.voce = p; });
  };
  const nomi = NOME_TASTO[LINGUA === 'en' ? 'en' : 'it'];
  const detto = e => (e || '0').replace(/[÷×−+()]/g, m => ' ' + nomi[m] + ' ');
  el.querySelectorAll('.smm-t').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    $('smRis').textContent = '';
    if (k === 'C') SMS.calc = '';
    else if (k === '⌫') SMS.calc = SMS.calc.slice(0, -1);
    else if (k === '=') {
      const v = calcola(SMS.calc);
      if (v === null) { $('smRis').textContent = ts('calc.err'); parlaSm(ts('calc.err')); return; }
      $('smRis').textContent = '= ' + numParlato(v);
      SMS.calcStoria.unshift([SMS.calc, numParlato(v)]); storia();
      parlaSm(`${ts('calc.fa')} ${numParlato(v)}`);
      return;
    } else SMS.calc += k;
    $('smEspr').textContent = SMS.calc || '0';
    parlaSm(nomi[k] || k);
  });
  $('smRileggi').onclick = () => { const v = calcola(SMS.calc); const p = SMS.voce; SMS.voce = true; parlaSm(detto(SMS.calc) + (v !== null ? ` ${ts('calc.fa')} ${numParlato(v)}` : '')); SMS.voce = p; };
  $('smCopia').onclick = async () => { const v = calcola(SMS.calc); try { await navigator.clipboard.writeText(v !== null ? numParlato(v) : SMS.calc); toast(tm('copiato')); } catch (e) {} };
  el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => smmVai(b.dataset.v));
  storia();
}

/* ------------------------------------------------------------------ tabelline */
function smTab(el) {
  SMS.tr = SMS.tr || 7; SMS.tc = SMS.tc || 8;
  const R = SMS.tr, C = SMS.tc;
  let h = '<table class="smm-pit"><tr><th>×</th>' + Array.from({length: 10}, (_, i) => `<th>${i + 1}</th>`).join('') + '</tr>';
  for (let r = 1; r <= 10; r++) h += `<tr><th>${r}</th>` + Array.from({length: 10}, (_, c) => `<td data-r="${r}" data-c="${c + 1}" class="${r === R && c + 1 === C ? 'on' : (r === R || c + 1 === C) ? 'riga' : ''}">${r * (c + 1)}</td>`).join('') + '</tr>';
  el.innerHTML = `<div class="smm-tabw"><div class="card smm-pitw">${h}</table></div>
    <div><div class="card"><div class="smm-grande">${R} × ${C} = <b>${R * C}</b></div>
      <button class="btn b-main b-sm" id="smmRip" style="margin-top:12px">${smIco('g-voce')} ${esc(tm('tab.ripeti'))}</button></div>
      <h3 class="smx-h3">${esc(tm('tab.tutta'))}</h3><div class="card"><div class="smm-scelta">${Array.from({length: 10}, (_, i) => `<button class="${i + 1 === R ? 'on' : ''}" data-t="${i + 1}">${i + 1}</button>`).join('')}</div></div>
      <h3 class="smx-h3">${esc(ts('stampa'))}</h3><div class="smx-lista"><button class="smx-f" id="smTabSt"><span class="smx-fi ind">${smIco('g-stampa')}</span><span class="smx-ft"><b>${esc(tm('tab.stampa'))}</b></span><span class="smx-chev">›</span></button></div></div></div>`;
  const dice = (r, c) => `${r} ${ts('tab.per')} ${c} ${ts('calc.fa')} ${r * c}`;
  el.querySelectorAll('td').forEach(td => td.onclick = () => { SMS.tr = +td.dataset.r; SMS.tc = +td.dataset.c; smTab(el); parlaSm(dice(SMS.tr, SMS.tc)); });
  $('smmRip').onclick = () => { const p = SMS.voce; SMS.voce = true; parlaSm(dice(R, C)); SMS.voce = p; };
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const n = +b.dataset.t; SMS.tr = n; smTab(el); const p = SMS.voce; SMS.voce = true; parlaSm(Array.from({length: 10}, (_, k) => dice(n, k + 1)).join('. ')); SMS.voce = p; });
  $('smTabSt').onclick = () => smStampa(el.querySelector('.smm-pitw').innerHTML, ts('mate.tab'));
}

/* ------------------------------------------------------------------ formulario */
function smForm(el) {
  const L = LINGUA === 'en' ? 'en' : 'it';
  SMS.fcat = SMS.fcat || 'piane';
  const cat = SMS.fcat, lista = cat === 'piane' ? FORME.map(f => ({...f, lp: {it: ts('form.per'), en: ts('form.per')}, la: {it: ts('form.area'), en: ts('form.area')}})) : FORME_ALTRE[cat];
  el.innerHTML = `<div id="smFm"></div>
    <div class="smm-fhead"><h3 class="smx-h3" style="margin:0">${esc(ts('fm.base'))}</h3><button class="btn b-ghost b-sm" id="smFoSt">${smIco('g-stampa')} ${esc(ts('stampa'))}</button></div>
    <div class="smm-fcat">${['piane', 'solidi', 'unita', 'fraz'].map(k => `<button class="${k === cat ? 'on' : ''}" data-c="${k}">${esc(tm('form.cat.' + k))}</button>`).join('')}</div>
    <div class="smm-forme">${lista.map((f, i) => `<div class="card smm-forma"><div class="smm-fh"><svg viewBox="0 0 80 80" class="smm-fig">${f.svg}</svg><b>${esc(f.n[L])}</b></div>
      <button class="smm-fr" data-i="${i}" data-q="p">${f.lp[L] ? `<small>${esc(f.lp[L])}</small>` : ''}<span>${esc(f.p)}</span>${smIco('g-voce')}</button>
      <button class="smm-fr" data-i="${i}" data-q="a">${f.la[L] ? `<small>${esc(f.la[L])}</small>` : ''}<span>${esc(f.a)}</span>${smIco('g-voce')}</button></div>`).join('')}</div>`;
  el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { SMS.fcat = b.dataset.c; smForm(el); });
  el.querySelectorAll('.smm-fr').forEach(d => d.onclick = () => { const f = lista[+d.dataset.i]; const p = SMS.voce; SMS.voce = true; parlaSm(f.n[L] + '. ' + formulaParlata(d.dataset.q === 'p' ? f.p : f.a).replace(/=/g, LINGUA === 'en' ? ' equals ' : ' uguale ')); SMS.voce = p; });
  $('smFoSt').onclick = () => smStampa(el.querySelector('.smm-forme').innerHTML, ts('mate.form'));
  smFormule(true);
}

/* ------------------------------------------------------------------ problema passo passo */
function smPb(el) {
  const P = SMS.pb;
  const aiuti = `<h3 class="smx-h3">${esc(tm('pb.aiuti'))}</h3><div class="smx-lista">
      <button class="smx-f" data-v="calc"><span class="smx-fi ind">${smIco('g-calc')}</span><span class="smx-ft"><b>${esc(ts('mate.calc'))}</b></span><span class="smx-chev">›</span></button>
      <button class="smx-f" data-v="form"><span class="smx-fi ind">${smIco('g-note')}</span><span class="smx-ft"><b>${esc(ts('mate.form'))}</b></span><span class="smx-chev">›</span></button>
      ${P ? `<button class="smx-f" data-v="chiedi"><span class="smx-fi">${smIco('i-chat')}</span><span class="smx-ft"><b>${esc(tm('pb.chiedi'))}</b><small class="sp">${esc(tm('pb.chiedi.s'))}</small></span><span class="smx-chev">›</span></button>` : ''}</div>`;
  if (!P) {
    el.innerHTML = `<div class="smm-pbw"><div><h3 class="smx-h3">${esc(tm('pb.h'))}</h3><div class="card">
        <textarea class="in" id="smPbT" rows="4" placeholder="${esc(ts('pb.ph'))}"></textarea>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn b-main b-sm" id="smPbVai">${esc(ts('pb.vai'))}</button>
          <button class="btn b-ghost b-sm" id="smPbF">${smIco('g-foto')} ${esc(ts('pb.foto'))}</button><button class="btn b-ghost b-sm" id="smPbD">${smIco('i-mic')} ${esc(tm('pb.detta'))}</button><span class="hint" id="smPbFn"></span></div></div></div>
      <div>${aiuti}</div></div>`;
    if (SMS.pbfoto.length) $('smPbFn').textContent = ts('foto.ok', {n: SMS.pbfoto.length});
    $('smPbF').onclick = async () => { const s = await A.scatta_foglio(); if (s && s.ok && s.percorsi && s.percorsi.length) { SMS.pbfoto = s.percorsi.slice(0, 3); $('smPbFn').textContent = ts('foto.ok', {n: SMS.pbfoto.length}); } };
    $('smPbD').onclick = () => vai('dp');
    $('smPbVai').onclick = async () => {
      const testo = $('smPbT').value.trim();
      if (!testo && !SMS.pbfoto.length) return toast(ts('pb.s'));
      $('smPbVai').disabled = true; $('smPbVai').innerHTML = `<span class="spin"></span> ${esc(ts('pb.lav'))}`;
      const r = await A.sm_problema(testo, SMS.pbfoto);
      if (!r || !r.ok) { $('smPbVai').disabled = false; $('smPbVai').textContent = ts('pb.vai'); return toast((r && r.msg) || ''); }
      SMS.pb = r; SMS.pbi = 0; SMS.pbris = false; SMS.pbfoto = []; SMS.pbletti = [];
      smPb(el); smParlaPasso();
    };
  } else {
    const n = P.passi.length, i = Math.min(SMS.pbi, n - 1);
    SMS.pbletti = SMS.pbletti || [];
    el.innerHTML = `<div class="smm-pbw"><div><h3 class="smx-h3">${esc(tm('pb.h'))}</h3><div class="card smm-pbtesto">${esc(P.problema)}</div>
        <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn b-ghost b-sm" id="smPbL">${smIco('g-voce')} ${esc(tm('pb.leggi'))}</button><button class="btn b-ghost b-sm" id="smPbNu">${esc(ts('pb.nuovo'))}</button></div>
        <h3 class="smx-h3">${esc(tm('pb.passi'))}<small class="dato" style="font-weight:400;color:var(--sm-ard)">${esc(tm('pb.passi.s', {n}))}</small></h3>
        <div class="smx-lista">${P.passi.map((p, k) => `<div class="smm-ps${k === i ? ' on' : ''}${SMS.pbletti.includes(k) && k !== i ? ' letto' : ''}${k > i && !SMS.pbletti.includes(k) ? ' chiuso' : ''}">
          <span class="smx-num">${k + 1}</span><div><b>${esc(p.titolo || '')}</b><p>${esc(p.spiegazione || '')}</p>${p.calcolo ? `<span class="smm-calcolo">${esc(p.calcolo)}</span>` : ''}</div>
          <button class="btn b-sm ${k === i ? 'b-main' : 'b-ghost'}" data-p="${k}">${smIco('g-voce')} ${esc(tm(k === i ? 'pb.riascolta' : 'pb.ascolta'))}</button></div>`).join('')}</div>
        <div class="row" style="gap:8px;margin-top:10px"><button class="btn b-ghost b-sm" id="smPbPr"${i === 0 ? ' disabled' : ''}>← ${esc(tm('pb.prima'))}</button>
          ${i < n - 1 ? `<button class="btn b-main b-sm" id="smPbDo">${esc(tm('pb.dopo', {n: i + 2}))} →</button>` : ''}</div>
        <h3 class="smx-h3">${esc(tm('pb.ris.h'))}</h3><div class="card row smm-risbox" style="gap:12px;align-items:center"><span class="sp${SMS.pbris ? ' smm-ris-on' : ' hint'}">${esc(SMS.pbris ? P.risultato : tm('pb.ris.nasc'))}</span>
          <button class="btn b-sm ${SMS.pbris ? 'b-ghost' : 'b-main'}" id="smPbRi">${esc(SMS.pbris ? tm('pb.riascolta') : tm('pb.ris.mostra'))}</button></div></div>
      <div>${aiuti}</div></div>`;
    const vaiPasso = k => { if (!SMS.pbletti.includes(SMS.pbi)) SMS.pbletti.push(SMS.pbi); SMS.pbi = k; smPb(el); const p = SMS.voce; SMS.voce = true; smParlaPasso(); SMS.voce = p; };
    el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => vaiPasso(+b.dataset.p));
    $('smPbPr').onclick = () => vaiPasso(Math.max(0, i - 1));
    if ($('smPbDo')) $('smPbDo').onclick = () => vaiPasso(i + 1);
    $('smPbRi').onclick = () => { SMS.pbris = true; smPb(el); const p = SMS.voce; SMS.voce = true; parlaSm(ts('pb.risultato') + ': ' + P.risultato); SMS.voce = p; };
    $('smPbL').onclick = () => { const p = SMS.voce; SMS.voce = true; parlaSm(P.problema); SMS.voce = p; };
    $('smPbNu').onclick = () => { SMS.pb = null; voceFermaSm(); smPb(el); };
  }
  el.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
    if (b.dataset.v === 'chiedi') {
      const ok = await dialogo({titolo: tm('pb.chiedi'), html: `<textarea class="in" rows="3" style="margin-top:8px"></textarea>`, bottoni: [{t: esc(tm('chiudi')), v: false}, {t: esc(ts('pb.vai')), cls: 'b-main', v: true}]});
      const dom = (dialogo.area || '').trim(); if (!ok || !dom) return;
      const p = P.passi[Math.min(SMS.pbi, P.passi.length - 1)];
      const r = await A.sm_problema(`${P.problema}\n\nSono al passo «${p.titolo}: ${p.spiegazione} ${p.calcolo || ''}». Non ho capito: ${dom}. Spiegami solo questo, in passi piccoli.`, []);
      if (r && r.ok) { SMS.pb = {...r, problema: P.problema}; SMS.pbi = 0; SMS.pbris = false; SMS.pbletti = []; smPb(el); smParlaPasso(); } else toast((r && r.msg) || '');
      return;
    }
    smmVai(b.dataset.v);
  });
}

/* ------------------------------------------------------------------ altri strumenti: frazioni, percentuali, convertitore */
function smmAltro(el) {
  const F = (a, ico, tit, sub, cl = '') => `<button class="smx-f" data-a="${a}"><span class="smx-fi ${cl}">${smIco(ico)}</span><span class="smx-ft"><b>${esc(tit)}</b><small class="sp">${esc(sub)}</small></span><span class="smx-chev">›</span></button>`;
  el.innerHTML = `<div class="smm-2"><div><h3 class="smx-h3">${esc(tm('al.capire'))}</h3><div class="smx-lista">${F('fraz', 'g-calc', tm('fraz.h'), tm('fraz.s'), 'ind')}${F('perc', 'g-calc', tm('perc.h'), tm('perc.s'), 'ind')}${F('conv', 'g-calc', tm('conv.h'), tm('conv.s'), 'ind')}</div></div>
    <div><h3 class="smx-h3">${esc(tm('al.verifica'))}</h3><div class="smx-lista">${F('foglio', 'g-stampa', tm('foglio.h'), tm('foglio.s'))}${F('test', 'g-test', tm('test.h'), tm('test.s'))}</div></div></div>
    <div id="smmAltroIn" style="margin-top:16px"></div>`;
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a, box = $('smmAltroIn');
    if (a === 'fraz') smmFrazioni(box);
    else if (a === 'perc') smmPercentuali(box);
    else if (a === 'conv') smmConvertitore(box);
    else if (a === 'foglio') { SMS.mate = 'form'; smMate(); setTimeout(() => { const b2 = $('smFoSt'); if (b2) b2.click(); }, 300); }
    else if (a === 'test') smRipassa(LINGUA === 'en' ? 'Maths' : 'Matematica', 'test');
    box.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  });
  smInfoGiro(el);
}
function smmFrazioni(box) {
  const a = SMS.fa || 3, b = SMS.fb || 4;
  const fette = Array.from({length: b}, (_, i) => {
    const a0 = i / b * 2 * Math.PI - Math.PI / 2, a1 = (i + 1) / b * 2 * Math.PI - Math.PI / 2;
    const x0 = 60 + 50 * Math.cos(a0), y0 = 60 + 50 * Math.sin(a0), x1 = 60 + 50 * Math.cos(a1), y1 = 60 + 50 * Math.sin(a1);
    return `<path d="M60 60 L${x0.toFixed(1)} ${y0.toFixed(1)} A50 50 0 ${1 / b > .5 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${i < a ? '#0F766E' : '#E6F2F1'}" stroke="#fff" stroke-width="2"/>`;
  }).join('');
  const d = numParlato(a / b), p = numParlato(Math.round(a / b * 1000) / 10);
  box.innerHTML = `<div class="card smm-fraz"><svg viewBox="0 0 120 120" width="160" height="160">${b === 1 ? `<circle cx="60" cy="60" r="50" fill="${a ? '#0F766E' : '#E6F2F1'}"/>` : fette}</svg>
    <div><h3 class="smx-h3" style="margin-top:0">${esc(tm('fraz.h'))}</h3><div class="row" style="gap:10px;align-items:center;font-size:20px">
      <input class="in" type="number" min="0" max="12" value="${a}" id="smmFa" style="width:80px"> <span>${esc(tm('fraz.di'))}</span> <input class="in" type="number" min="1" max="12" value="${b}" id="smmFb" style="width:80px"></div>
      <div class="smm-grande" style="margin-top:12px">${a}/${b} = <b>${esc(d)}</b> · ${esc(p)}%</div></div></div>`;
  const ag = () => { SMS.fa = Math.max(0, Math.min(12, +$('smmFa').value || 0)); SMS.fb = Math.max(1, Math.min(12, +$('smmFb').value || 1)); smmFrazioni(box); parlaSm(tm('fraz.dice', {a: SMS.fa, b: SMS.fb, d: numParlato(SMS.fa / SMS.fb), p: numParlato(Math.round(SMS.fa / SMS.fb * 1000) / 10)})); };
  $('smmFa').onchange = ag; $('smmFb').onchange = ag;
}
function smmPercentuali(box) {
  box.innerHTML = `<div class="card"><h3 class="smx-h3" style="margin-top:0">${esc(tm('perc.h'))}</h3><div class="row" style="gap:10px;align-items:center;font-size:18px;flex-wrap:wrap">
    <input class="in" type="number" id="smmPp" value="${SMS.pp || 25}" style="width:100px"> % <span>${esc(tm('perc.di'))}</span> <input class="in" type="number" id="smmPn" value="${SMS.pn || 80}" style="width:140px">
    <button class="btn b-main b-sm" id="smmPv">=</button></div><div class="smm-grande" id="smmPr" style="margin-top:12px"></div></div>`;
  const calc = () => {
    const p = +$('smmPp').value || 0, n = +$('smmPn').value || 0; SMS.pp = p; SMS.pn = n;
    const r = numParlato(n * p / 100), s = numParlato(n - n * p / 100);
    $('smmPr').innerHTML = `${esc(numParlato(p))}% ${esc(tm('perc.di'))} ${esc(numParlato(n))} = <b>${esc(r)}</b><div class="hint" style="font-size:16px;margin-top:6px">${esc(tm('perc.sconto', {r: s}))}</div>`;
    parlaSm(tm('perc.fa', {p: numParlato(p), n: numParlato(n), r}));
  };
  $('smmPv').onclick = calc; calc();
}
const SMM_UNITA = {
  lung: [['mm', .001], ['cm', .01], ['dm', .1], ['m', 1], ['km', 1000]],
  peso: [['mg', .001], ['g', 1], ['hg', 100], ['kg', 1000], ['q', 100000], ['t', 1000000]],
  cap: [['ml', .001], ['cl', .01], ['dl', .1], ['l', 1], ['hl', 100]],
  tempo: [['s', 1], ['min', 60], ['h', 3600], ['giorni', 86400]],
};
function smmConvertitore(box) {
  SMS.cu = SMS.cu || 'lung';
  const U = SMM_UNITA[SMS.cu];
  box.innerHTML = `<div class="card"><h3 class="smx-h3" style="margin-top:0">${esc(tm('conv.h'))}</h3>
    <div class="smm-fcat" style="margin-bottom:12px">${[['lung', 'm'], ['peso', 'g'], ['cap', 'l'], ['tempo', 'min']].map(([k, n]) => `<button class="${k === SMS.cu ? 'on' : ''}" data-u="${k}">${n}</button>`).join('')}</div>
    <div class="row" style="gap:10px;align-items:center;font-size:18px;flex-wrap:wrap"><input class="in" type="number" id="smmCv" value="${SMS.cv || 1}" style="width:140px">
      <select class="in" id="smmCu1" style="width:110px">${U.map(([u], i) => `<option${i === (U.length > 4 ? 3 : 2) ? ' selected' : ''}>${u}</option>`).join('')}</select> →
      <select class="in" id="smmCu2" style="width:110px">${U.map(([u], i) => `<option${i === 1 ? ' selected' : ''}>${u}</option>`).join('')}</select></div>
    <div class="smm-grande" id="smmCr" style="margin-top:12px"></div></div>`;
  box.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { SMS.cu = b.dataset.u; smmConvertitore(box); });
  const calc = () => {
    const v = +$('smmCv').value || 0, u1 = $('smmCu1').value, u2 = $('smmCu2').value; SMS.cv = v;
    const f1 = U.find(x => x[0] === u1)[1], f2 = U.find(x => x[0] === u2)[1], r = numParlato(v * f1 / f2);
    $('smmCr').innerHTML = `${esc(numParlato(v))} ${esc(u1)} = <b>${esc(r)} ${esc(u2)}</b>`;
    parlaSm(tm('conv.fa', {v: numParlato(v), u1, r, u2}));
  };
  ['smmCv', 'smmCu1', 'smmCu2'].forEach(id => $(id).onchange = calc); calc();
}
