'use strict';
/* Scripta Manent — Le mie lezioni e la pagina della lezione (stile professionale).
   Elenco: cerca, filtri per materia, lezioni divise per settimana con stato, compiti, formule e verifica; di lato materie e «Da sistemare».
   Lezione: lettore con i capitoli, schede Appunti / Ascolta e segui / Ripassa / Chiedi / Materiali / Condividi.
   Vale solo in Scripta Manent: in Verba Manent restano disegnaLezioni e disegnaLezione di app.js. */

const SML_T = {
  it: {
    h: 'Le mie lezioni', sub: '{n} lezioni · {d} registrate', sub1: '1 lezione · {d} registrata', sub0: 'Qui trovi tutte le lezioni che registri.', prep: '{n} in preparazione',
    tutte: 'Tutte', darip: 'Da ripassare', imp: 'Importa audio o video', reg: 'Registra una lezione', vuoto: 'Nessuna lezione trovata.',
    'sett.0': 'Questa settimana', 'sett.1': 'Settimana scorsa', 'sett.n': 'Prima',
    's.prep': 'Preparo gli appunti… {p}%', 's.lav': 'In preparazione', 's.darip': 'Da ripassare', 's.ok': 'Pronta', 's.noap': 'Senza appunti', 's.comp': 'Da completare', completa: 'Completa', crea: 'Crea gli appunti',
    aula: 'in aula', online: 'online', compiti1: '1 compito', compitin: '{n} compiti', formule: '{n} formule', formula1: '1 formula',
    mat: 'Le mie materie', lez1: '1 lez.', lezn: '{n} lez.', sist: 'Da sistemare', 'sist.noap': 'Lezioni senza appunti: {n}', 'sist.nomat': 'Lezioni senza materia: {n}', 'sist.rip': 'Da ripassare prima della verifica: {n}', 'sist.0': 'Niente da sistemare.',
    // lezione
    'lz.rinomina': 'Rinomina', 'lz.altro': 'Altro', 'lz.cambia': 'Cambia materia', 'lz.metti': 'Metti la materia',
    't.ap': 'Appunti', 't.asc': 'Ascolta e segui', 't.rip': 'Ripassa', 't.ch': 'Chiedi', 't.mat': 'Materiali', 't.cond': 'Condividi',
    'ver.nota': '{t} {d}: il prof l\'ha detto in questa lezione. È già nei tuoi Compiti.',
    'ap.parti': 'Gli appunti, in {n} parti', 'ap.parti.s': 'Tocca «Ascolta» per sentirle una alla volta', ascolta: 'Ascolta', riascolta: 'Riascolta', 'ap.tutto': 'Ascolta tutto dall\'inizio', 'ap.pdf': 'Apri il PDF da studiare', 'ap.lm': 'Come leggo meglio',
    'ap.vuoti': 'Gli appunti di questa lezione non ci sono ancora.', 'ap.inbreve': 'In breve',
    'da.h': 'Da questa lezione', 'da.comp': 'Compiti e verifiche', 'da.form': 'Formule', 'da.gl': 'Parole difficili', 'da.libro': 'Sul libro', 'da.rip': 'Ripassa questa lezione', 'da.rip.n': '{n} flashcard',
    'asc.h': 'Ascolta la lezione', 'asc.cap': 'Salta a una parte', 'asc.cap0': 'Questa lezione non ha i capitoli.', apri: 'Apri',
    'rip.h': 'Ripassa la lezione', 'rip.mat': 'Per tutta la materia',
    'ch.h': 'Chiedi alla lezione', 'ch.ph': 'Scrivi cosa non hai capito…', 'ch.vai': 'Chiedi', 'ch.s1': 'Cosa devo sapere per la verifica?', 'ch.s2': 'Rispiegami la parte più difficile', 'ch.s3': 'Fammi un esempio',
    'ch.dove': 'Dove cerco', 'ch.qui': 'Solo questa lezione', 'ch.mat': 'Tutta {m}',
    'mat.prof': 'Dal prof', 'mat.slide': 'Slide del prof', 'mat.slide.ok': 'Negli appunti', 'mat.slide.agg': 'Aggiungi', 'mat.libro': 'Libro di {m}', 'mat.altri': 'Aggiungi dispense o altri PDF', 'mat.tue': 'Le tue foto',
    'mat.info': 'Questa lezione', 'mat.reg': 'Registrata', 'mat.cart': 'Apri la cartella',
    'cond.h': 'Manda o stampa', 'cond.pdf': 'PDF degli appunti', 'cond.pdf.s': 'Con il tuo carattere e i tuoi colori', 'cond.sp': 'Spezzone', 'cond.sp.s': 'Un pezzo della lezione con la voce del prof',
    'cond.manda': 'Manda la lezione', 'cond.manda.s': 'Appunti, mappa e audio a chi vuoi', 'cond.mappa': 'Mappa da stampare', 'cond.fam': 'Per la famiglia', 'cond.fam.s': 'La settimana, scritta semplice',
    vel: 'Velocità',
  },
  en: {
    h: 'My lessons', sub: '{n} lessons · {d} recorded', sub1: '1 lesson · {d} recorded', sub0: 'All the lessons you record are here.', prep: '{n} being prepared',
    tutte: 'All', darip: 'To review', imp: 'Import audio or video', reg: 'Record a lesson', vuoto: 'No lessons found.',
    'sett.0': 'This week', 'sett.1': 'Last week', 'sett.n': 'Earlier',
    's.prep': 'Preparing notes… {p}%', 's.lav': 'Being prepared', 's.darip': 'To review', 's.ok': 'Ready', 's.noap': 'No notes', 's.comp': 'To complete', completa: 'Complete', crea: 'Create notes',
    aula: 'in class', online: 'online', compiti1: '1 task', compitin: '{n} tasks', formule: '{n} formulas', formula1: '1 formula',
    mat: 'My subjects', lez1: '1 les.', lezn: '{n} les.', sist: 'To fix', 'sist.noap': 'Lessons without notes: {n}', 'sist.nomat': 'Lessons without a subject: {n}', 'sist.rip': 'To review before the test: {n}', 'sist.0': 'Nothing to fix.',
    'lz.rinomina': 'Rename', 'lz.altro': 'More', 'lz.cambia': 'Change subject', 'lz.metti': 'Set the subject',
    't.ap': 'Notes', 't.asc': 'Listen and follow', 't.rip': 'Review', 't.ch': 'Ask', 't.mat': 'Materials', 't.cond': 'Share',
    'ver.nota': '{t} {d}: the teacher said it in this lesson. It is already in your Homework.',
    'ap.parti': 'The notes, in {n} parts', 'ap.parti.s': 'Tap «Listen» to hear them one at a time', ascolta: 'Listen', riascolta: 'Again', 'ap.tutto': 'Listen to everything', 'ap.pdf': 'Open the PDF', 'ap.lm': 'How I read best',
    'ap.vuoti': 'The notes for this lesson are not ready yet.', 'ap.inbreve': 'In short',
    'da.h': 'From this lesson', 'da.comp': 'Homework and tests', 'da.form': 'Formulas', 'da.gl': 'Difficult words', 'da.libro': 'In the book', 'da.rip': 'Review this lesson', 'da.rip.n': '{n} flashcards',
    'asc.h': 'Listen to the lesson', 'asc.cap': 'Jump to a part', 'asc.cap0': 'This lesson has no chapters.', apri: 'Open',
    'rip.h': 'Review the lesson', 'rip.mat': 'For the whole subject',
    'ch.h': 'Ask the lesson', 'ch.ph': 'Write what you did not understand…', 'ch.vai': 'Ask', 'ch.s1': 'What do I need for the test?', 'ch.s2': 'Explain the hardest part again', 'ch.s3': 'Give me an example',
    'ch.dove': 'Where I look', 'ch.qui': 'Only this lesson', 'ch.mat': 'All of {m}',
    'mat.prof': 'From the teacher', 'mat.slide': 'Teacher\'s slides', 'mat.slide.ok': 'In the notes', 'mat.slide.agg': 'Add', 'mat.libro': '{m} book', 'mat.altri': 'Add handouts or other PDFs', 'mat.tue': 'Your photos',
    'mat.info': 'This lesson', 'mat.reg': 'Recorded', 'mat.cart': 'Open the folder',
    'cond.h': 'Send or print', 'cond.pdf': 'Notes PDF', 'cond.pdf.s': 'With your font and colours', 'cond.sp': 'Clip', 'cond.sp.s': 'A piece of the lesson with the teacher\'s voice',
    'cond.manda': 'Send the lesson', 'cond.manda.s': 'Notes, map and audio to anyone', 'cond.mappa': 'Map to print', 'cond.fam': 'For the family', 'cond.fam.s': 'The week, written simply',
    vel: 'Speed',
  },
};
function tl(k, p) {
  let s = (SML_T[LINGUA] && SML_T[LINGUA][k]) ?? SML_T.it[k] ?? k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
}
const SML = {filtro: 'tutte', comp: [], form: [], tab: 'ap', ap: null, cap: null, parte: -1, fatte: new Set(), au: null};
const SML_COL = ['#3F4A80', '#0F766E', '#B45309', '#5B6B70', '#15803D', '#155E75', '#4D7C0F'];
function smlColore(m) { const tutte = [...new Set((LZ ? LZ.lezioni : []).map(l => l.materia).filter(Boolean))].sort(); const i = tutte.indexOf(m); return i < 0 ? '#5B6B70' : SML_COL[i % SML_COL.length]; }
function smlData(l) { const m = String(l.quando || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1], 12) : null; }
function smlMesi(d) { return d ? d.toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {month: 'short'}).replace('.', '') : ''; }
function smlNome(l) { const n = l.materia ? mvSenzaMateria(l.nome, l.materia) : l.nome; return n ? n.charAt(0).toUpperCase() + n.slice(1) : l.nome; }
function smlMinuti(l) { const s = String(l.durata || ''); const h = s.match(/(\d+)\s*h/), m = s.match(/(\d+)\s*min/); return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0); }
function smlDurata(min) { const h = Math.floor(min / 60), m = min % 60; return LINGUA === 'en' ? `${h} h ${m} min` : `${h} ore e ${m} minuti`; }

/* ------------------------------------------------------------------ elenco */
async function smlCaricaExtra() {
  try { const [c, f] = await Promise.all([A.sm_compiti(), A.sm_formule()]); SML.comp = (c && c.compiti) || []; SML.form = (f && f.formule) || []; } catch (e) {}
}
function smlCompitiDi(l) { return SML.comp.filter(v => (v.cartella && v.cartella === l.cartella) || (v.fonte && v.fonte === l.nome)); }
function smlFormuleDi(l) { return SML.form.filter(f => f.fonte && f.fonte.cartella === l.cartella); }
function smlStato(l) {
  if (APLAV && APLAV === l.cartella) return `<span class="smx-chip gri">${esc(tl('s.prep', {p: apPerc()}))}</span><span class="sml-barretta"><i style="width:${apPerc()}%"></i></span>`;
  if (l.stato === 'in_corso') return `<span class="smx-chip gri"><span class="spin" style="width:12px;height:12px;margin-right:5px"></span>${esc(tl('s.lav'))}</span>`;
  if (l.stato === 'da_completare' || l.dopo) return `<span class="smx-chip amb">${esc(tl('s.comp'))}</span><button class="btn b-main b-sm" data-a="completa">${esc(tl('completa'))}</button>`;
  if (!l.n_appunti) return `<span class="smx-chip gri">${esc(tl('s.noap'))}</span>${l.crea_appunti ? `<button class="btn b-ghost b-sm" data-a="crea">${esc(tl('crea'))}</button>` : ''}`;
  if (l.ripasso && l.ripasso.no) return `<span class="smx-chip amb">${esc(tl('s.darip'))}</span>`;
  return `<span class="smx-chip ok">${esc(tl('s.ok'))}</span>`;
}
function smlDisegnaLezioni() {
  if (!LZ) return;
  const sec = $('v-arch'); sec.classList.add('sml');
  smlToolbar();
  const q = $('cerca').value.trim().toLowerCase(), tutte = LZ.lezioni.filter(l => (l.tipo || 'lezione') === 'lezione' || true);
  const materie = [...new Set(tutte.map(l => l.materia).filter(Boolean))].sort();
  if (SML.filtro !== 'tutte' && SML.filtro !== 'darip' && !materie.includes(SML.filtro)) SML.filtro = 'tutte';
  const L = tutte.filter(l => (!q || (l.nome + ' ' + l.quando + ' ' + (l.materia || '')).toLowerCase().includes(q))
    && (SML.filtro === 'tutte' || (SML.filtro === 'darip' ? l.ripasso && l.ripasso.no : (l.materia || '') === SML.filtro)));
  const min = tutte.reduce((s, l) => s + smlMinuti(l), 0), prep = tutte.filter(l => l.stato === 'in_corso').length;
  $('aSub').textContent = !tutte.length ? tl('sub0') : (tutte.length === 1 ? tl('sub1', {d: smlDurata(min)}) : tl('sub', {n: tutte.length, d: smlDurata(min)})) + (prep ? ' · ' + tl('prep', {n: prep}) : '');
  // settimane
  const oggi = new Date(), lun = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - ((oggi.getDay() + 6) % 7));
  const settimana = l => { const d = smlData(l); if (!d) return 'n'; const g = Math.floor((lun - d) / 864e5); return d >= lun ? '0' : g < 7 ? '1' : 'n'; };
  const gruppi = {};
  L.forEach(l => (gruppi[settimana(l)] = gruppi[settimana(l)] || []).push(l));
  const riga = l => {
    const d = smlData(l), col = smlColore(l.materia), nc = smlCompitiDi(l), nf = smlFormuleDi(l).length;
    const ver = nc.find(v => v.tipo !== 'compito' && !v.fatto && v.per && smGiorni(v.per) >= 0);
    const meta = [l.materia ? `<span class="smx-chip" style="background:${col}1a;color:${col}">${esc(l.materia)}</span>` : '', esc(l.durata || ''), esc(l.aula ? tl('aula') : tl('online')),
      nc.filter(v => v.tipo === 'compito').length ? esc(nc.filter(v => v.tipo === 'compito').length === 1 ? tl('compiti1') : tl('compitin', {n: nc.filter(v => v.tipo === 'compito').length})) : '',
      nf ? esc(nf === 1 ? tl('formula1') : tl('formule', {n: nf})) : '', ver ? `<b class="sml-ver">${esc(ts('comp.' + ver.tipo))} ${esc(smData(ver.per))}</b>` : ''].filter(Boolean).join(' · ');
    const apre = l.stato === 'pronta';
    return `<div class="sml-r${apre ? ' apri' : ''}" data-i="${LZ.lezioni.indexOf(l)}"><span class="sml-d"><b>${d ? d.getDate() : '–'}</b><small>${esc(smlMesi(d))}</small></span>
      <span class="sml-c"><span class="sml-t">${esc(smlNome(l))}</span><span class="sml-m">${meta}</span>${l.errore ? `<span class="hint" style="color:#9F1D1D">${esc(l.errore)}</span>` : ''}</span>
      <span class="sml-s">${smlStato(l)}</span>${apre ? '<span class="smx-chev">›</span>' : '<span></span>'}</div>`;
  };
  const lista = L.length ? ['0', '1', 'n'].filter(k => gruppi[k]).map(k => `<div class="sml-sett">${esc(tl('sett.' + k))}</div><div class="smx-lista">${gruppi[k].map(riga).join('')}</div>`).join('')
    : `<div class="card" style="text-align:center;padding:30px;color:var(--sm-ard)">${esc(tutte.length ? tl('vuoto') : tl('sub0'))}</div>`;
  const noap = tutte.filter(l => l.stato === 'pronta' && !l.n_appunti), nomat = tutte.filter(l => l.stato === 'pronta' && !l.materia), drip = tutte.filter(l => l.ripasso && l.ripasso.no);
  const h = `<div class="sml-filtri">${[['tutte', tl('tutte')], ['darip', tl('darip')], ...materie.map(m => [m, m])].map(([k, n]) => `<button class="${k === SML.filtro ? 'on' : ''}" data-f="${esc(k)}">${esc(n)}</button>`).join('')}</div>
    <div class="sml-w"><div>${lista}</div><div class="sml-lato">
      ${materie.length ? `<div class="card"><h4>${esc(tl('mat'))}</h4>${materie.map(m => { const n = tutte.filter(l => l.materia === m).length; return `<button class="sml-mat" data-f="${esc(m)}"><i style="background:${smlColore(m)}"></i><span>${esc(m)}</span><small>${esc(n === 1 ? tl('lez1') : tl('lezn', {n}))}</small><span class="smx-chev">›</span></button>`; }).join('')}</div>` : ''}
      <div class="card"><h4>${esc(tl('sist'))}</h4>${[[noap, 'sist.noap', 'noap'], [nomat, 'sist.nomat', 'nomat'], [drip, 'sist.rip', 'darip']].filter(x => x[0].length).map(([x, k, a]) => `<button class="sml-mat" data-s="${a}"><i style="background:var(--sm-amb)"></i><span style="font-weight:500">${esc(tl(k, {n: x.length}))}</span><span class="smx-chev">›</span></button>`).join('') || `<div class="hint">${esc(tl('sist.0'))}</div>`}</div>
    </div></div>`;
  disegnaBanda();
  if ($('lista').dataset.h === h) return;
  $('lista').dataset.h = h; $('lista').innerHTML = h;
  $('lista').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { SML.filtro = b.dataset.f; disegnaLezioni(); });
  $('lista').querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
    const a = b.dataset.s;
    if (a === 'darip') { SML.filtro = 'darip'; return disegnaLezioni(); }
    const l = (a === 'noap' ? noap : nomat)[0]; if (l) { if (a === 'nomat') cambiaMateria(l, () => disegnaLezioni()); else apriLezione(l); }
  });
  $('lista').querySelectorAll('[data-a]').forEach(b => b.onclick = e => { e.stopPropagation(); azioneLezione(LZ.lezioni[+b.closest('.sml-r').dataset.i], b.dataset.a, e); });
  $('lista').querySelectorAll('.sml-r.apri').forEach(r => r.onclick = () => apriLezione(LZ.lezioni[+r.dataset.i]));
}
function smlToolbar() {
  const sec = $('v-arch');
  sec.querySelector('h2').textContent = tl('h');
  const tb = sec.querySelector('.toolbar');
  if (tb && !tb.querySelector('.sml-azioni')) {
    tb.insertAdjacentHTML('beforeend', `<div class="sml-azioni"><button class="btn b-ghost b-sm" id="smlImp">${smIco('i-imp')} <span>${esc(tl('imp'))}</span></button>
      <button class="btn b-main b-sm" id="smlReg">${smIco('g-reg')} <span>${esc(tl('reg'))}</span></button></div>`);
    $('smlImp').onclick = () => vai('importa');
    $('smlReg').onclick = () => vai('reg');
  }
}
// si attiva in Scripta Manent (da smCasaPrepara): elenco, pagina della lezione e conteggi di compiti e formule
function smLezioniPrepara() {
  if (smLezioniPrepara.fatto) return; smLezioniPrepara.fatto = true;
  const vmLista = disegnaLezioni, vmLez = disegnaLezione, vmCarica = caricaLezioni;
  disegnaLezioni = function () { return SCRIPTA ? smlDisegnaLezioni() : vmLista(); };
  disegnaLezione = function () { return SCRIPTA ? smlDisegnaLezione() : vmLez(); };
  caricaLezioni = async function () { if (SCRIPTA) await smlCaricaExtra(); return vmCarica.apply(this, arguments); };
}

/* ------------------------------------------------------------------ la pagina della lezione */
function smlDisegnaLezione() {
  const l = LZ && LZ.lezioni.find(x => x.cartella === LEZ.cartella) || LEZ; LEZ = l;
  const sec = $('v-lezione'); sec.classList.add('sml-lez');
  if (SML.lez !== l.cartella) { SML.lez = l.cartella; SML.tab = 'ap'; SML.ap = null; SML.cap = null; SML.parte = -1; SML.fatte = new Set(); if (SML.au) { SML.au.pause(); SML.au = null; } }
  const col = smlColore(l.materia), pronta = l.stato === 'pronta';
  $('lzTit').textContent = smlNome(l);
  $('lzSub').innerHTML = `${l.materia ? `<span class="smx-chip" style="background:${col}1a;color:${col}">${esc(l.materia)}</span>` : ''}<span>${esc([l.quando, l.durata, l.aula ? tl('aula') : tl('online')].filter(Boolean).join(' · '))}</span>
    ${smlStato(l)}<button class="lnk" id="lzMat">${esc(tl(l.materia ? 'lz.cambia' : 'lz.metti'))}</button>`;
  $('lzMat').onclick = () => cambiaMateria(l);
  $('lzSub').dataset.st = 1;              // non e' una spiegazione: resta visibile
  const TABS = [['ap', tl('t.ap')], ['asc', tl('t.asc')], ['rip', tl('t.rip')], ['ch', tl('t.ch')], ['mat', tl('t.mat')], ['cond', tl('t.cond')]];
  $('lzBox').innerHTML = `<div class="sml-player hidden" id="smlPl"><button class="sml-play" id="smlPlay" aria-label="Play"><svg width="16" height="16"><use href="#i-play"/></svg></button>
      <div class="sml-tr"><div class="sml-bar" id="smlBar"><i id="smlBarI"></i></div><div class="sml-tempi"><span id="smlOra">0:00</span><span id="smlTot"></span></div></div>
      <button class="sml-vel" id="smlVel" title="${esc(tl('vel'))}">1×</button></div>
    <div class="smx-tabs sml-tabs">${TABS.map(([k, n]) => `<button class="${k === SML.tab ? 'on' : ''}" data-t="${k}">${esc(n)}</button>`).join('')}</div>
    <div id="smlCorpo"></div>`;
  $('lzBox').querySelectorAll('.sml-tabs button').forEach(b => b.onclick = () => { SML.tab = b.dataset.t; disegnaLezione(); });
  if (pronta) smlPlayer(l);
  smlCorpo(l);
}
async function smlPlayer(l) {
  if (!SML.cap) { try { SML.cap = await A.capitoli(l.cartella); } catch (e) { SML.cap = {capitoli: []}; } }
  if (LEZ !== l || !$('smlPl')) return;
  const c = SML.cap, url = c && c.video;
  if (!url) return;
  $('smlPl').classList.remove('hidden');
  if (!SML.au || SML.au.dataset.c !== l.cartella) { if (SML.au) SML.au.pause(); SML.au = new Audio(url); SML.au.dataset.c = l.cartella; SML.au.preload = 'metadata'; }
  const au = SML.au, fmt = s => smkOra(s || 0);
  const dis = () => {
    if (!$('smlBarI')) return;
    const d = au.duration || c.durata || 1;
    $('smlBarI').style.width = Math.min(100, (au.currentTime / d) * 100) + '%';
    const cap = (c.capitoli || []).filter(x => x.sec <= au.currentTime).pop();
    $('smlOra').textContent = fmt(au.currentTime) + (cap ? ' · ' + cap.titolo : '');
    $('smlTot').textContent = au.duration ? fmt(au.duration) : '';
    $('smlPlay').innerHTML = `<svg width="16" height="16"><use href="#${au.paused ? 'i-play' : 'i-pause'}"/></svg>`;
  };
  $('smlBar').innerHTML = `<i id="smlBarI"></i>` + (c.capitoli || []).map(x => `<u style="left:${Math.min(100, x.sec / ((au.duration || c.durata || 1)) * 100)}%" title="${esc(x.titolo)}"></u>`).join('');
  au.ontimeupdate = dis; au.onloadedmetadata = () => { smlPlayer(l); }; au.onplay = dis; au.onpause = dis;
  $('smlPlay').onclick = () => { if (au.paused) { voceFermaSm(); au.play().catch(() => {}); } else au.pause(); };
  $('smlBar').onclick = e => { const r = $('smlBar').getBoundingClientRect(); au.currentTime = ((e.clientX - r.left) / r.width) * (au.duration || c.durata || 0); dis(); };
  $('smlVel').textContent = (au.playbackRate === 1 ? '1' : String(au.playbackRate).replace('.', ',')) + '×';
  $('smlVel').onclick = () => { const v = [1, 0.8, 1.25][([1, 0.8, 1.25].indexOf(au.playbackRate) + 1) % 3]; au.playbackRate = v; $('smlVel').textContent = String(v).replace('.', ',') + '×'; };
  dis();
}
function smlSalta(l, sec) { if (SML.au && SML.au.dataset.c === l.cartella) { SML.au.currentTime = sec; voceFermaSm(); SML.au.play().catch(() => {}); } else mostraMomento(l.cartella, sec, null, l.nome); }
const smlF = (a, ico, tit, sub, cl = '', val = '') => `<button class="smx-f" data-f="${a}"><span class="smx-fi ${cl}">${smIco(ico)}</span><span class="smx-ft"><b>${esc(tit)}</b>${sub ? `<small class="${/\d/.test(sub) && sub.length < 60 ? 'dato' : 'sp'}">${esc(sub)}</small>` : ''}</span>${val ? `<span class="smx-val">${esc(val)}</span>` : ''}<span class="smx-chev">›</span></button>`;
const smlC = (a, ico, tit, sub, piede, cl = '') => `<button class="sml-gc" data-f="${a}"><span class="smx-fi ${cl}">${smIco(ico)}</span><b>${esc(tit)}</b><small class="sp">${esc(sub)}</small><span class="sml-gp"><span>${esc(piede || '')}</span><em>${esc(tl('apri'))} ›</em></span></button>`;
async function smlCorpo(l) {
  const el = $('smlCorpo'); if (!el) return;
  const pronta = l.stato === 'pronta', m = l.materia ? smMateria(l.materia) : null, tr = l.trascritta && pronta;
  const nc = smlCompitiDi(l), nf = smlFormuleDi(l);
  const k = SML.tab;
  if (k === 'ap') {
    if (!SML.ap && l.n_appunti) { el.innerHTML = `<div class="hint row" style="gap:8px"><span class="spin"></span></div>`; try { SML.ap = await A.ascolta_appunti(l.cartella); } catch (e) { SML.ap = {}; } if (LEZ !== l || SML.tab !== 'ap') return; }
    const f = SML.ap && SML.ap.ok && SML.ap.formati && SML.ap.formati[0];
    const sez = f ? f.sezioni || [] : [];
    const ver = nc.find(v => v.tipo !== 'compito' && !v.fatto && v.per);
    el.innerHTML = `<div class="sml-pw"><div>
      ${ver ? `<div class="sml-nota">${smIco('g-avviso')}<span>${esc(tl('ver.nota', {t: ts('comp.' + ver.tipo), d: smData(ver.per)}))}</span></div>` : ''}
      ${sez.length ? `<h3 class="smx-h3">${esc(tl('ap.parti', {n: sez.length}))}<small class="sp" style="display:none">${esc(tl('ap.parti.s'))}</small></h3>
        <div class="smx-lista">${sez.map((s, i) => `<div class="sml-cap${i === SML.parte ? ' on' : ''}${SML.fatte.has(i) && i !== SML.parte ? ' fatto' : ''}"><span class="smx-num">${SML.fatte.has(i) && i !== SML.parte ? '✓' : i + 1}</span>
          <div><b>${esc(s.titolo)}</b><ul>${(s.punti || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
          <button class="btn b-sm ${i === SML.parte ? 'b-main' : 'b-ghost'}" data-parte="${i}">${smIco('g-voce')} ${esc(tl(i === SML.parte ? 'riascolta' : 'ascolta'))}</button></div>`).join('')}</div>
        <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn b-main b-sm" data-f="ascolta">${smIco('g-voce')} ${esc(tl('ap.tutto'))}</button>
          <button class="btn b-ghost b-sm" data-f="pdf">${smIco('i-pdf')} ${esc(tl('ap.pdf'))}</button><button class="btn b-ghost b-sm" data-f="lm">${esc(tl('ap.lm'))} ›</button></div>`
        : `<div class="card hint">${esc(tl('ap.vuoti'))}</div>`}
      </div><div>
      <h3 class="smx-h3">${esc(tl('da.h'))}</h3><div class="smx-lista">
        ${smlF('comp', 'g-cal', tl('da.comp'), nc.map(v => v.cosa).join(' · ').slice(0, 70), 'amb', nc.length ? String(nc.length) : '')}
        ${smlF('form', 'g-calc', tl('da.form'), nf.map(x => x.nome).join(', ').slice(0, 70), 'ind', nf.length ? String(nf.length) : '')}
        ${m ? smlF('m:glos', 'g-libro', tl('da.gl'), t('tl.dsa.gl.s')) : ''}
        ${m ? smlF('libro', 'g-libro', tl('da.libro'), t('mpf.lb.s')) : ''}
        ${l.ripasso && l.ripasso.n ? smlF('l:ripassa', 'i-cards', tl('da.rip'), tl('da.rip.n', {n: l.ripasso.n})) : ''}</div>
      ${f && f.riassunto ? `<h3 class="smx-h3">${esc(tl('ap.inbreve'))}</h3><div class="card sml-breve">${esc(f.riassunto)}<div style="margin-top:10px"><button class="btn b-ghost b-sm" id="smlBreve">${smIco('g-voce')} ${esc(tl('ascolta'))}</button></div></div>` : ''}
      </div></div>`;
    el.querySelectorAll('[data-parte]').forEach(b => b.onclick = () => {
      const i = +b.dataset.parte; if (SML.parte >= 0) SML.fatte.add(SML.parte); SML.parte = i; smlCorpo(l);
      const s = sez[i]; const p = SMS.voce; SMS.voce = true; parlaSm(`${i + 1}. ${s.titolo}. ${(s.punti || []).join('. ')}`); SMS.voce = p;
    });
    if ($('smlBreve')) $('smlBreve').onclick = () => { const p = SMS.voce; SMS.voce = true; parlaSm(f.riassunto); SMS.voce = p; };
  } else if (k === 'asc') {
    if (!SML.cap) { try { SML.cap = await A.capitoli(l.cartella); } catch (e) { SML.cap = {capitoli: []}; } if (LEZ !== l) return; }
    const caps = (SML.cap && SML.cap.capitoli) || [];
    el.innerHTML = `<h3 class="smx-h3">${esc(tl('asc.h'))}</h3><div class="sml-griglia">
      ${tr ? smlC('l:karaoke', 'g-kar', t('tl.kk'), t('tl.dsa.kk.s'), l.durata) : ''}${l.n_appunti ? smlC('l:ascolta', 'g-voce', t('tl.asc'), t('tl.asc.s'), '') : ''}
      ${tr ? smlC('l:podcast', 'g-cuffie', t('tl.pc'), t('tl.dsa.pc.s'), '') : ''}${l.video && pronta ? smlC('l:video', 'g-play', t('tl.vid'), t('tl.vid.s'), l.video_testo || '') : ''}
      ${pronta ? smlC('l:tras', 'g-note', t('tl.tras'), t('tl.tras.s'), '') : ''}${tr ? smlC(l.voci >= 2 ? 'l:voci' : 'l:stat', 'g-utenti', t('tl.voci'), t('tl.voci.s'), l.voci ? String(l.voci) : '') : ''}</div>
      <h3 class="smx-h3">${esc(tl('asc.cap'))}</h3>${caps.length ? `<div class="smx-lista">${caps.map((c, i) => `<button class="smx-f" data-sec="${c.sec}"><span class="smx-num">${i + 1}</span><span class="smx-ft"><b>${esc(c.titolo)}</b></span><span class="smx-val">${esc(smkOra(c.sec))}</span><span class="smx-chev">›</span></button>`).join('')}</div>` : `<div class="hint">${esc(tl('asc.cap0'))}</div>`}`;
    el.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => smlSalta(l, +b.dataset.sec));
  } else if (k === 'rip') {
    el.innerHTML = `<h3 class="smx-h3">${esc(tl('rip.h'))}</h3><div class="sml-griglia">
      ${l.ripasso && l.ripasso.n ? smlC('l:ripassa', 'i-cards', t('tl.dsa.flash'), t('tl.dsa.flash.s'), tl('da.rip.n', {n: l.ripasso.n})) : ''}
      ${tr ? smlC('l:mappa', 'i-map', t('tl.mappa'), t('tl.mappa.s'), '') : ''}${tr ? smlC('l:infografica', 'g-img', t('tl.ig'), t('tl.ig.s'), '') : ''}
      ${l.capitoli ? smlC('l:capitoli', 'g-cap', t('tl.cap'), t('tl.cap.s'), '') : ''}</div>
      ${m ? `<h3 class="smx-h3">${esc(tl('rip.mat'))}</h3><div class="sml-griglia">${smlC('m:test', 'g-test', t('tl.dsa.test'), t('sd.test.s'), '')}${smlC('m:orale', 'i-mic', t('tl.orale'), t('sd.orale.s'), '')}
        ${smlC('m:glos', 'g-libro', t('tl.gl'), t('tl.dsa.gl.s'), '')}${smlC('m:mverif', 'i-map', t('tl.mv'), t('sd.mv.s'), '')}${smlC('m:fcorso', 'i-cards', t('tl.flash'), t('tl.flash.s'), '')}${smlC('m:prob', 'g-stella', t('tl.prob'), t('tl.prob.s'), '')}</div>` : ''}`;
  } else if (k === 'ch') {
    el.innerHTML = `<div class="sml-pw"><div><h3 class="smx-h3">${esc(tl('ch.h'))}</h3><div class="card">
        <div class="row" style="gap:8px"><input class="in" id="smlChIn" placeholder="${esc(tl('ch.ph'))}" maxlength="600"><button class="btn b-ghost" id="smlChMic" title="🎤">${smIco('i-mic')}</button><button class="btn b-main" id="smlChVai">${esc(tl('ch.vai'))}</button></div>
        <div class="sml-sugg">${['ch.s1', 'ch.s2', 'ch.s3'].map(s => `<button data-q="${esc(tl(s))}">${esc(tl(s))}</button>`).join('')}</div></div></div>
      <div><h3 class="smx-h3">${esc(tl('ch.dove'))}</h3><div class="smx-lista">
        <button class="smx-f sml-on" data-dove="qui"><span class="smx-fi">${smIco('g-lezioni')}</span><span class="smx-ft"><b>${esc(tl('ch.qui'))}</b></span><span style="color:var(--sm-pet);font-weight:700">✓</span></button>
        ${m ? `<button class="smx-f" data-f="m:chm"><span class="smx-fi ind">${smIco('g-libro')}</span><span class="smx-ft"><b>${esc(tl('ch.mat', {m: m.m}))}</b></span><span class="smx-chev">›</span></button>` : ''}</div></div></div>`;
    const chiedi = async q => { if (!q) return; await apriChiedi(l); const i = $('chIn'); if (i) { i.value = q; const b = $('chVai'); if (b) b.click(); } };
    $('smlChVai').onclick = () => chiedi($('smlChIn').value.trim());
    $('smlChIn').onkeydown = e => { if (e.key === 'Enter') chiedi($('smlChIn').value.trim()); };
    $('smlChMic').onclick = async () => { await apriChiedi(l); const b = $('chMic'); if (b) b.click(); };
    el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => chiedi(b.dataset.q));
  } else if (k === 'mat') {
    el.innerHTML = `<div class="sml-pw"><div><h3 class="smx-h3">${esc(tl('mat.prof'))}</h3><div class="smx-lista">
        ${smlF('pdfprof', 'i-pdf', tl('mat.slide'), l.docente ? tl('mat.slide.ok') : t('mpf.sl.s'), '', l.docente ? '✓' : '')}
        ${m ? smlF('libro', 'g-libro', tl('mat.libro', {m: m.m}), t('mpf.lb.s')) : ''}</div>
      <h3 class="smx-h3">${esc(tl('mat.tue'))}</h3><div class="smx-lista">
        ${smlF('l:foto', 'g-foto', t('tl.fo'), t('tl.fo.s', {n: l.n_foto || 0}), '', String(l.n_foto || 0))}
        ${smlF('l:scritti', 'g-penna', t('tl.sc'), t('tl.sc.s'), '', String(l.n_scritti || 0))}</div></div>
      <div><h3 class="smx-h3">${esc(tl('mat.info'))}</h3><div class="smx-lista">
        <div class="smx-f" style="cursor:default"><span class="smx-ft"><b>${esc(tl('mat.reg'))}</b><small class="dato">${esc([l.quando, l.durata].filter(Boolean).join(' · '))}</small></span></div>
        ${l.video_testo ? `<div class="smx-f" style="cursor:default"><span class="smx-ft"><b>${esc(t('ar.video'))}</b><small class="dato">${esc(l.video_testo)}</small></span></div>` : ''}
        ${ANDROID ? '' : smlF('l:cartella', 'i-folder', tl('mat.cart'), '')}</div></div></div>`;
  } else if (k === 'cond') {
    el.innerHTML = `<h3 class="smx-h3">${esc(tl('cond.h'))}</h3><div class="sml-griglia">
      ${l.n_appunti ? smlC('pdf', 'i-pdf', tl('cond.pdf'), tl('cond.pdf.s'), '') : ''}${l.video && pronta ? smlC('l:spezzone', 'g-forbici', tl('cond.sp'), tl('cond.sp.s'), '') : ''}
      ${l.n_appunti && pronta ? smlC('l:condividi', 'i-share', tl('cond.manda'), tl('cond.manda.s'), '') : ''}${tr ? smlC('l:mappa', 'g-stampa', tl('cond.mappa'), t('tl.mappa.s'), '') : ''}
      ${smlC('fam', 'g-utenti', tl('cond.fam'), tl('cond.fam.s'), '')}</div>`;
  }
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => smlAzione(l, b.dataset.f, m));
  smInfoGiro(el);
}
async function smlAzione(l, f, m) {
  if (f.startsWith('l:')) return tileLezione(l, f.slice(2));
  if (f.startsWith('m:')) return m ? tileStudia(m, f.slice(2)) : toast(t('sd.no.mat'));
  if (f === 'ascolta') return tileLezione(l, 'ascolta');
  if (f === 'pdf') { const fm = (l.formati || [])[0]; return tileLezione(l, fm ? 'apf:' + fm : 'appunti'); }
  if (f === 'lm') return vai('lm');
  if (f === 'comp') { const v = smlCompitiDi(l)[0]; if (v) SMS.apri = v.id; return vai('smcomp'); }
  if (f === 'form') { SMS.mate = 'form'; return vai('smmate'); }
  if (f === 'libro') { if (m) return apriLibro(m); return toast(t('sd.no.mat')); }
  if (f === 'pdfprof') return aggiungiPdf(l);
  if (f === 'fam') return smGenitori();
}
