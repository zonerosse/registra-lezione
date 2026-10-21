'use strict';
/* Scripta Manent — Studia (stile professionale).
   Casa di Studia: il ripasso di oggi (con i giorni di fila), le materie in riquadri con la verifica e quanto sei pronto.
   Pagina della materia: numeri in alto, schede Piano fino alla verifica / Esercitati / Ripassa / Libro e lezioni / Voti,
   di lato il tutor della materia e gli strumenti. Vale solo in Scripta Manent. */

const SMS_T = {
  it: {
    h: 'Studia', 'rg.h': 'Il ripasso di oggi', 'rg.s': '{n} flashcard da tutte le materie · circa {m} minuti · con la voce', 'rg.0': 'Per oggi hai fatto tutto', 'rg.vuoto': 'Ancora nessuna flashcard',
    'rg.vai': 'Inizia il ripasso', fila: '{n} giorni di fila · record {r}', fila0: 'Comincia oggi la serie',
    mat: 'Le mie materie', 'mat.s': 'Tocca una materia per il piano, i test e i materiali', 'mat.agg': 'Aggiungi una materia', pronto: 'Pronto al {p}%',
    'ver.gg': 'tra {n} giorni', 'ver.g1': 'domani', 'ver.g0': 'oggi', 'nodata': 'Nessuna verifica in calendario', 'nodata.s': 'Metti la data e arriva il piano', lez: '{n} lezioni', lez1: '1 lezione', carte: '{n} carte da ripassare',
    tutte: 'Per tutte le materie', tutor: 'Il tuo tutor', 'tutor.s': 'Sa quando hai le verifiche e ti dice cosa fare oggi', and: 'Come sto andando', 'and.s': 'Voti, ore di studio, giorni di ripasso',
    lm: 'Come leggo meglio', 'lm.s': 'Carattere, grandezza, sfondo, sillabe colorate, righello', anki: 'Esporta le flashcard per Anki', 'anki.s': 'Per chi usa già Anki o AnkiDroid',
    // materia
    'k.pronto': 'pronto per la verifica', 'k.carte': 'carte da ripassare', 'k.media': 'media degli ultimi voti', 'k.oggi': 'cose fatte oggi', data: 'Cambia la data', mettidata: 'Metti la data',
    't.piano': 'Piano fino alla verifica', 't.eserc': 'Esercitati', 't.rip': 'Ripassa', 't.libro': 'Libro e lezioni', 't.voti': 'Voti',
    'piano.oggi': 'Oggi, in circa {m} minuti', 'piano.oggi0': 'Per oggi hai fatto tutto', 'piano.tutto': 'Il piano giorno per giorno', 'piano.tutto.s': 'Fino alla verifica, si aggiorna da solo quando arriva una lezione nuova', inizia: 'Inizia',
    'prob.h': 'Le domande più probabili', 'prob.s': 'Quelle che il prof ha ripetuto di più', 'prob.apri': 'Apri la classifica',
    momenti: 'Riascolta i pezzi difficili', 'momenti.s': 'I momenti che hai segnato «Non ho capito», con la voce del prof', 'momenti.0': 'Nessun momento segnato «Non ho capito» in questa materia.',
    'libro.non': 'Nel libro ma non detto a lezione', 'libro.non.s': 'Gli argomenti che in verifica possono uscire', 'lezioni': 'Le lezioni di {m}',
    'voti.h': 'I tuoi voti', 'voti.s': 'Test, interrogazioni e simulazioni fatti qui, e i voti della scuola', 'voti.0': 'Ancora nessun voto.', 'voti.media': 'Media degli ultimi tre: {m}',
    'voti.agg': 'Aggiungi un voto della scuola', 'v.test': 'Test', 'v.orale': 'Interr.', 'v.scritto': 'Simul.', 'v.scuola': 'Scuola', voto: 'Voto', 'v.data': 'Data', 'v.tipo': 'Tipo', 'v.nota': 'Su cosa (facoltativo)',
    'v.scritto2': 'Scritto', 'v.orale2': 'Orale', 'v.pratico': 'Pratico', salva: 'Salva', annulla: 'Annulla', tolto: 'Voto tolto', 'tutor.h': 'Il tuo tutor di {m}', 'tutor.ph': 'Chiedi al tutor…',
    strumenti: 'Strumenti di {m}', 'str.form': 'Formulario e calcolatrice', 'str.gl': 'Glossario', 'str.comp': 'Compiti di {m}', apri: 'Apri',
  },
  en: {
    h: 'Study', 'rg.h': 'Today\'s review', 'rg.s': '{n} flashcards from all subjects · about {m} minutes · with voice', 'rg.0': 'All done for today', 'rg.vuoto': 'No flashcards yet',
    'rg.vai': 'Start the review', fila: '{n} days in a row · record {r}', fila0: 'Start your streak today',
    mat: 'My subjects', 'mat.s': 'Tap a subject for the plan, tests and materials', 'mat.agg': 'Add a subject', pronto: '{p}% ready',
    'ver.gg': 'in {n} days', 'ver.g1': 'tomorrow', 'ver.g0': 'today', 'nodata': 'No test in the calendar', 'nodata.s': 'Set the date and the plan arrives', lez: '{n} lessons', lez1: '1 lesson', carte: '{n} cards to review',
    tutte: 'For all subjects', tutor: 'Your tutor', 'tutor.s': 'Knows when your tests are and tells you what to do today', and: 'How I am doing', 'and.s': 'Grades, study time, review days',
    lm: 'How I read best', 'lm.s': 'Font, size, background, coloured syllables, ruler', anki: 'Export flashcards to Anki', 'anki.s': 'For Anki or AnkiDroid users',
    'k.pronto': 'ready for the test', 'k.carte': 'cards to review', 'k.media': 'average of the last grades', 'k.oggi': 'things done today', data: 'Change the date', mettidata: 'Set the date',
    't.piano': 'Plan until the test', 't.eserc': 'Practise', 't.rip': 'Review', 't.libro': 'Book and lessons', 't.voti': 'Grades',
    'piano.oggi': 'Today, in about {m} minutes', 'piano.oggi0': 'All done for today', 'piano.tutto': 'Day by day plan', 'piano.tutto.s': 'Until the test, it updates when a new lesson arrives', inizia: 'Start',
    'prob.h': 'Most likely questions', 'prob.s': 'The ones the teacher repeated most', 'prob.apri': 'Open the ranking',
    momenti: 'Listen to the hard parts again', 'momenti.s': 'The moments you marked «I did not understand», with the teacher\'s voice', 'momenti.0': 'No moments marked in this subject.',
    'libro.non': 'In the book but not said in class', 'libro.non.s': 'Topics that may come up in the test', 'lezioni': '{m} lessons',
    'voti.h': 'Your grades', 'voti.s': 'Tests, oral tests and mock exams done here, and school grades', 'voti.0': 'No grades yet.', 'voti.media': 'Average of the last three: {m}',
    'voti.agg': 'Add a school grade', 'v.test': 'Test', 'v.orale': 'Oral', 'v.scritto': 'Mock', 'v.scuola': 'School', voto: 'Grade', 'v.data': 'Date', 'v.tipo': 'Type', 'v.nota': 'On what (optional)',
    'v.scritto2': 'Written', 'v.orale2': 'Oral', 'v.pratico': 'Practical', salva: 'Save', annulla: 'Cancel', tolto: 'Grade removed', 'tutor.h': 'Your {m} tutor', 'tutor.ph': 'Ask the tutor…',
    strumenti: '{m} tools', 'str.form': 'Formulas and calculator', 'str.gl': 'Glossary', 'str.comp': '{m} homework', apri: 'Open',
  },
};
function tst(k, p) {
  let s = (SMS_T[LINGUA] && SMS_T[LINGUA][k]) ?? SMS_T.it[k] ?? k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
}
const SMSt = {tab: 'piano', tutor: {}, voti: [], info: null, comp: []};

function smStudiaPrepara() {
  if (smStudiaPrepara.fatto) return; smStudiaPrepara.fatto = true;
  const vm = disegnaStudia;
  disegnaStudia = function () { return SCRIPTA ? smStudia() : vm(); };
  $('v-studia').classList.add('sms');
}
async function smStudia() {
  const M = materieStudia(), box = $('stBox2');
  if (!M.length) { $('stMat').innerHTML = ''; box.innerHTML = cardSenzaMateria() || studiaVuota(); collegaSenzaMateria(); collegaStudiaVuota(); return; }
  const m = STU.dentro ? (M.find(x => STU.m && x.m.toLowerCase() === STU.m.toLowerCase()) || null) : null;
  try { const c = await A.sm_compiti(); SMSt.comp = (c && c.compiti) || []; if (c && c.oggi) SMS.oggi = c.oggi; } catch (e) {}
  if (m) return smStudiaMateria(m);
  // ---- casa di Studia
  $('v-studia').querySelector('.hd h2').textContent = tst('h');
  const [rg, an] = await Promise.all([A.ripasso_giorno(false, true), A.andamento ? A.andamento() : null]);
  const tutti = await Promise.all(M.map(x => A.tutor(x.m, x.cartelle).catch(() => null)));
  if (pagina !== 'studia') return;
  M.forEach((x, i) => { SMSt.tutor[x.m] = tutti[i] || {}; });
  const st = an && an.studio ? an.studio : {}, serie = st.serie || 0, rec = st.record || 0;
  const giorni = ['L', 'M', 'M', 'G', 'V', 'S', 'D'], oggiI = (new Date().getDay() + 6) % 7;
  const verDi = mm => SMSt.comp.filter(v => !v.fatto && v.tipo !== 'compito' && v.per && smGiorni(v.per) >= 0 && (v.materia || '').toLowerCase() === mm.toLowerCase()).sort((a, b) => a.per.localeCompare(b.per))[0];
  const quando = g => g === 0 ? tst('ver.g0') : g === 1 ? tst('ver.g1') : tst('ver.gg', {n: g});
  box.innerHTML = cardSenzaMateria() + `
    <div class="card sms-oggi"><span class="smx-fi sms-big">${smIco('i-cards')}</span>
      <div class="sms-gr"><b>${esc(tst('rg.h'))}</b><small class="dato">${esc(rg && rg.carte ? tst('rg.s', {n: rg.carte, m: rg.minuti || Math.max(1, Math.round(rg.carte / 2))}) : rg && rg.totale ? tst('rg.0') : tst('rg.vuoto'))}</small></div>
      <div><div class="sms-serie">${giorni.map((g, i) => `<i class="${i < oggiI && i >= oggiI - Math.min(serie, oggiI) ? 'si' : ''}${i === oggiI ? ' og' : ''}">${g}</i>`).join('')}</div><small class="dato sms-fila">${esc(serie ? tst('fila', {n: serie, r: Math.max(rec, serie)}) : tst('fila0'))}</small></div>
      <button class="btn b-main b-sm" id="smsRg"${rg && rg.carte ? '' : ' disabled'}><svg width="13" height="13"><use href="#i-play"/></svg> ${esc(tst('rg.vai'))}</button></div>
    <h3 class="smx-h3">${esc(tst('mat'))}<small class="sp" style="display:none">${esc(tst('mat.s'))}</small></h3>
    <div class="sms-mgrid">${M.map(x => {
      const tu = SMSt.tutor[x.m] || {}, col = typeof smlColore === 'function' ? smlColore(x.m) : '#0F766E', v = verDi(x.m);
      const g = tu.giorni != null && tu.giorni >= 0 ? tu.giorni : v ? smGiorni(v.per) : null;
      const cosa = tu.giorni != null && tu.giorni >= 0 ? (LINGUA === 'en' ? 'Test' : 'Verifica') + ' ' + smData(tu.data_esame) : v ? ts('comp.' + v.tipo) + ' ' + smData(v.per) : '';
      return `<button class="sms-mc" style="--c:${col}" data-m="${esc(x.m)}"><span class="sms-tt"><b>${esc(x.m)}</b><span class="smx-chev">›</span></span>
        ${g != null ? `<span class="sms-ver"><b>${esc(cosa)}</b> · ${esc(quando(g))}</span><span class="sms-pr">${esc(tst('pronto', {p: tu.pronto || 0}))}<span class="sms-bar"><i style="width:${tu.pronto || 0}%;background:${col}"></i></span></span>`
          : `<span class="sms-ver" style="color:var(--sm-ard)">${esc(tst('nodata'))}</span><span class="sms-pr" style="color:var(--sm-pet);font-weight:600">${esc(tst('nodata.s'))} ›</span>`}
        <span class="sms-piede">${esc([x.lez.length === 1 ? tst('lez1') : tst('lez', {n: x.lez.length}), x.no ? tst('carte', {n: x.no}) : ''].filter(Boolean).join(' · '))}</span></button>`;
    }).join('')}</div>
    <h3 class="smx-h3">${esc(tst('tutte'))}</h3><div class="smx-lista">
      <button class="smx-f" data-a="and"><span class="smx-fi ind">${smIco('g-andamento')}</span><span class="smx-ft"><b>${esc(tst('and'))}</b><small class="sp">${esc(tst('and.s'))}</small></span><span class="smx-chev">›</span></button>
      <button class="smx-f" data-a="lm"><span class="smx-fi ind">${smIco('g-occhiali')}</span><span class="smx-ft"><b>${esc(tst('lm'))}</b><small class="sp">${esc(tst('lm.s'))}</small></span><span class="smx-chev">›</span></button></div>`;
  collegaSenzaMateria();
  smsPercorso(null);
  if ($('smsRg')) $('smsRg').onclick = () => apriRipassoGiorno();
  box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { STU.m = b.dataset.m; STU.dentro = true; SMSt.tab = 'piano'; smStudia(); });
  box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { if (b.dataset.a === 'and') { STU.dentro = false; vai('and'); } else vai('lm'); });
  smInfoGiro(box);
}

/* ------------------------------------------------------------------ la pagina della materia */
async function smStudiaMateria(m) {
  const box = $('stBox2'), sec = $('v-studia');
  sec.querySelector('.hd h2').textContent = m.m;
  const [info, tu, vs] = await Promise.all([A.studia_info(m.m), A.tutor(m.m, m.cartelle), A.sm_voti(m.m)]);
  if (pagina !== 'studia' || STU.m !== m.m) return;
  SMSt.info = info; SMSt.tutor[m.m] = tu || {}; SMSt.voti = (vs && vs.voti) || [];
  const v = SMSt.comp.filter(x => !x.fatto && x.tipo !== 'compito' && x.per && smGiorni(x.per) >= 0 && (x.materia || '').toLowerCase() === m.m.toLowerCase()).sort((a, b) => a.per.localeCompare(b.per))[0];
  const g = info.giorni != null && info.giorni >= 0 ? info.giorni : v ? smGiorni(v.per) : null;
  const chip = g != null ? `<span class="smx-chip amb">${esc((info.giorni != null && info.giorni >= 0 ? (LINGUA === 'en' ? 'Test ' : 'Verifica ') + smData(info.data_esame) : ts('comp.' + v.tipo) + ' ' + smData(v.per)) + ' · ' + (g === 0 ? tst('ver.g0') : g === 1 ? tst('ver.g1') : tst('ver.gg', {n: g})))}</span>` : `<span class="smx-chip gri">${esc(tst('nodata'))}</span>`;
  const tutti = smsVotiTutti(info);
  const media = tutti.length ? (tutti.slice(-3).reduce((s, x) => s + x.v, 0) / Math.min(3, tutti.length)) : null;
  const cose = (tu && tu.cose) || [], fatte = cose.filter(c => c.fatto).length;
  const TABS = [['piano', tst('t.piano')], ['eserc', tst('t.eserc')], ['rip', tst('t.rip')], ['libro', tst('t.libro')], ['voti', tst('t.voti')]];
  box.innerHTML = `<div class="sms-mtesta"><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">${chip}<span class="hint">${esc(m.lez.length === 1 ? tst('lez1') : tst('lez', {n: m.lez.length}))}</span><span class="sp"></span>
      <button class="btn b-ghost b-sm" id="smsData">${smIco('g-cal')} ${esc(info.data_esame ? tst('data') : tst('mettidata'))}</button></div>
    <div class="sms-k"><div class="card"><b>${tu && tu.pronto != null ? tu.pronto : 0}%</b><small>${esc(tst('k.pronto'))}</small></div><div class="card"><b>${m.no || 0}</b><small>${esc(tst('k.carte'))}</small></div>
      <div class="card"><b>${media != null ? numParlato(Math.round(media * 10) / 10) : '—'}</b><small>${esc(tst('k.media'))}</small></div><div class="card"><b>${fatte} / ${cose.length}</b><small>${esc(tst('k.oggi'))}</small></div></div></div>
    <div class="smx-tabs sms-tabs">${TABS.map(([k, n]) => `<button class="${k === SMSt.tab ? 'on' : ''}" data-t="${k}">${esc(n)}</button>`).join('')}</div>
    <div class="sms-pw"><div id="smsCorpo"></div><div>
      <h3 class="smx-h3">${esc(tst('tutor.h', {m: m.m}))}</h3><div class="card sms-tutor"><div class="sms-tt2">${esc(cose.filter(c => !c.fatto).length ? tst('piano.oggi', {m: tu.minuti || cose.filter(c => !c.fatto).reduce((s, c) => s + (c.min || 0), 0)}) : tst('piano.oggi0'))}</div>
        <ol>${cose.filter(c => !c.fatto).slice(0, 3).map((c, i) => `<li><span class="smx-num">${i + 1}</span><span class="sp">${esc(String(c.t || '').replace(/^\S+\s/, ''))}</span><button class="btn b-ghost b-sm" data-tut="1">${esc(tst('inizia'))} ›</button></li>`).join('')}</ol>
        <div class="row" style="gap:8px;margin-top:10px"><input class="in" id="smsTuIn" placeholder="${esc(tst('tutor.ph'))}"><button class="btn b-ghost" id="smsTuVai">›</button></div></div>
      <h3 class="smx-h3">${esc(tst('strumenti', {m: m.m}))}</h3><div class="smx-lista">
        <button class="smx-f" data-s="mate"><span class="smx-fi ind">${smIco('g-calc')}</span><span class="smx-ft"><b>${esc(tst('str.form'))}</b></span><span class="smx-chev">›</span></button>
        <button class="smx-f" data-s="glos"><span class="smx-fi">${smIco('g-libro')}</span><span class="smx-ft"><b>${esc(tst('str.gl'))}</b></span><span class="smx-chev">›</span></button>
        <button class="smx-f" data-s="comp"><span class="smx-fi amb">${smIco('g-cal')}</span><span class="smx-ft"><b>${esc(tst('str.comp', {m: m.m}))}</b></span><span class="smx-chev">›</span></button></div></div></div>`;
  $('smsData').onclick = () => tileStudia(m, 'piano');
  smsPercorso(m);
  box.querySelectorAll('.sms-tabs button').forEach(b => b.onclick = () => { SMSt.tab = b.dataset.t; smStudiaMateria(m); });
  box.querySelectorAll('[data-tut]').forEach(b => b.onclick = () => apriTutor(m));
  $('smsTuVai').onclick = async () => { const q = $('smsTuIn').value.trim(); await apriTutor(m); const i = $('tuIn'); if (i && q) { i.value = q; const b = $('tuVai'); if (b) b.click(); } };
  box.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const s = b.dataset.s; if (s === 'mate') { SMS.mate = 'form'; vai('smmate'); } else if (s === 'glos') tileStudia(m, 'glos'); else vai('smcomp'); });
  smStudiaCorpo(m);
  smInfoGiro(sec);
}
function smsVotiTutti(info) {
  const out = [];
  (info.voti_test || []).forEach(x => out.push({v: +x, t: 'v.test'}));
  (info.voti_orali || []).forEach(x => out.push({v: +x, t: 'v.orale'}));
  (info.voti_scritti || []).forEach(x => out.push({v: +x, t: 'v.scritto'}));
  SMSt.voti.forEach(x => out.push({v: +x.voto, t: 'v.scuola', id: x.id, data: x.data}));
  return out.map(x => ({...x, v: x.v > 10 ? x.v / 3 : x.v}));          // i voti in trentesimi diventano decimi
}
const smsC = (a, ico, tit, sub, piede, cl = '') => `<button class="sml-gc" data-f="${a}"><span class="smx-fi ${cl}">${smIco(ico)}</span><b>${esc(tit)}</b><small class="sp">${esc(sub)}</small><span class="sml-gp"><span>${esc(piede || '')}</span><em>${esc(tst('apri'))} ›</em></span></button>`;
const smsF = (a, ico, tit, sub, cl = '', val = '') => `<button class="smx-f" data-f="${a}"><span class="smx-fi ${cl}">${smIco(ico)}</span><span class="smx-ft"><b>${esc(tit)}</b>${sub ? `<small class="sp">${esc(sub)}</small>` : ''}</span>${val ? `<span class="smx-val">${esc(val)}</span>` : ''}<span class="smx-chev">›</span></button>`;
async function smStudiaCorpo(m) {
  const el = $('smsCorpo'); if (!el) return;
  const info = SMSt.info || {}, tu = SMSt.tutor[m.m] || {}, ult = x => x && x.length ? String(x[x.length - 1]) : '';
  const k = SMSt.tab;
  if (k === 'piano') {
    const cose = tu.cose || [];
    el.innerHTML = `<h3 class="smx-h3">${esc(cose.filter(c => !c.fatto).length ? tst('piano.oggi', {m: tu.minuti || cose.reduce((s, c) => s + (c.fatto ? 0 : c.min || 0), 0)}) : tst('piano.oggi0'))}</h3>
      <div class="smx-lista">${cose.map((c, i) => `<div class="sms-cosa${c.fatto ? ' fatto' : ''}"><span class="smx-cer${c.fatto ? ' si' : ''}">${c.fatto ? ckSvg : ''}</span><span class="sp"><b>${esc(String(c.t || '').replace(/^\S+\s/, ''))}</b><small class="dato">${esc(c.s || '')}</small></span>${c.min ? `<span class="smx-val">${c.min} min</span>` : ''}${c.fatto ? '' : `<button class="btn b-ghost b-sm" data-tut="1">${esc(tst('inizia'))} ›</button>`}</div>`).join('') || `<div class="hint" style="padding:12px 14px">${esc(tst('piano.oggi0'))}</div>`}</div>
      <h3 class="smx-h3">${esc(tst('t.piano'))}</h3><div class="smx-lista">${smsF('piano', 'g-cal', tst('piano.tutto'), tst('piano.tutto.s'))}${smsF('tutor', 'g-tutor', tst('tutor'), tst('tutor.s'))}</div>`;
  } else if (k === 'eserc') {
    el.innerHTML = `<div class="sml-griglia">${smsC('test', 'g-test', t('tl.dsa.test'), t('tl.dsa.test.s'), ult(info.voti_test), 'ind')}${smsC('orale', 'i-mic', t('tl.orale'), t('tl.dsa.orale.s'), ult(info.voti_orali), 'ind')}${smsC('scritto', 'g-penna', t('tl.dsa.scr'), t('tl.dsa.scr.s'), ult(info.voti_scritti), 'ind')}</div>
      <h3 class="smx-h3">${esc(tst('prob.h'))}</h3><div class="smx-lista">${smsF('prob', 'g-stella', tst('prob.apri'), tst('prob.s'))}</div>`;
  } else if (k === 'rip') {
    el.innerHTML = `<div class="sml-griglia">${m.n ? smsC('fcorso', 'i-cards', t('tl.dsa.flash'), t('tl.dsa.flc.s'), m.no ? tst('carte', {n: m.no}) : '') : ''}${smsC('mverif', 'i-map', t('tl.mv'), t('tl.dsa.mv.s'), '')}
      ${smsC('glos', 'g-libro', t('tl.gl'), t('tl.dsa.gl.s'), '')}${smsC('momenti', 'g-kar', tst('momenti'), tst('momenti.s'), '')}${smsC('ascm', 'g-voce', t('tl.ascm'), t('tl.ascm.s'), '')}${smsC('mappe', 'i-map', t('tl.dsa.mappe'), t('tl.dsa.mappe.s'), '')}
      ${smsC('rgiorno', 'i-cards', t('tl.rg'), t('tl.rg.s'), '')}</div>`;
  } else if (k === 'libro') {
    el.innerHTML = `<h3 class="smx-h3">${esc(t('tl.lb'))}</h3><div class="smx-lista">${smsF('libro', 'g-libro', t('tl.lb'), t('tl.lb.s'))}${smsF('libro', 'g-avviso', tst('libro.non'), tst('libro.non.s'), 'amb')}</div>
      <h3 class="smx-h3">${esc(tst('lezioni', {m: m.m}))}</h3><div class="smx-lista">${m.lez.map((l, i) => `<button class="smx-f" data-lez="${i}"><span class="smx-val" style="width:84px">${esc(String(l.quando || '').split(' ')[0])}</span><span class="smx-ft"><b>${esc(typeof smlNome === 'function' ? smlNome(l) : l.nome)}</b></span><span class="smx-chev">›</span></button>`).join('')}</div>`;
    el.querySelectorAll('[data-lez]').forEach(b => b.onclick = () => apriLezione(m.lez[+b.dataset.lez]));
  } else if (k === 'voti') {
    const V = smsVotiTutti(info);
    el.innerHTML = `<h3 class="smx-h3">${esc(tst('voti.h'))}</h3><div class="card">${V.length ? `<div class="sms-voti">${V.slice(-12).map(x => `<div><span class="sms-vv">${esc(numParlato(Math.round(x.v * 10) / 10))}</span><i class="${x.v >= 6 ? 'b' : 'r'}${x.t === 'v.scuola' ? ' s' : ''}" style="height:${Math.max(6, x.v * 9)}px"></i><small>${esc(tst(x.t))}</small></div>`).join('')}</div>
        <div class="hint" style="margin-top:10px">${esc(tst('voti.media', {m: numParlato(Math.round(V.slice(-3).reduce((s, x) => s + x.v, 0) / Math.min(3, V.length) * 10) / 10)}))}</div>` : `<div class="hint">${esc(tst('voti.0'))}</div>`}</div>
      ${SMSt.voti.length ? `<div class="smx-lista" style="margin-top:12px">${SMSt.voti.slice().reverse().map(x => `<div class="smx-f" style="cursor:default"><span class="smx-ft"><b>${esc(numParlato(x.voto))} · ${esc(tst('v.' + x.tipo + '2'))}</b><small class="dato">${esc([smkDataBreve(x.data), x.nota].filter(Boolean).join(' · '))}</small></span><button class="lnk" data-vt="${esc(x.id)}">${esc(LINGUA === 'en' ? 'Remove' : 'Togli')}</button></div>`).join('')}</div>` : ''}
      <div style="margin-top:12px"><button class="btn b-ghost b-sm" id="smsVoto">${smIco('g-piu')} ${esc(tst('voti.agg'))}</button></div>`;
    $('smsVoto').onclick = () => smsNuovoVoto(m);
    el.querySelectorAll('[data-vt]').forEach(b => b.onclick = async () => {
      const r = await A.sm_voto_togli(b.dataset.vt, m.m); SMSt.voti = r.voti; smStudiaCorpo(m);
      if (r.tolto) smAnnulla(tst('tolto'), async () => { const r2 = await A.sm_voto_nuovo(r.tolto); SMSt.voti = r2.voti; smStudiaCorpo(m); });
    });
  }
  el.querySelectorAll('[data-tut]').forEach(b => b.onclick = () => apriTutor(m));
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => b.dataset.f === 'momenti' ? smsMomenti(m) : tileStudia(m, b.dataset.f));
  smInfoGiro(el);
}
function smsNuovoVoto(m) {
  const v = document.createElement('div'); v.className = 'velo';
  v.innerHTML = `<div class="dlg smk-dlg"><h3>${esc(tst('voti.agg'))}</h3><div class="smk-due">
      <label class="smk-campo"><span>${esc(tst('voto'))}</span><input class="in" name="voto" type="number" min="0" max="10" step="0.25" value="7"></label>
      <label class="smk-campo"><span>${esc(tst('v.data'))}</span><input class="in" name="data" type="date" value="${new Date().toISOString().slice(0, 10)}"></label></div>
    <label class="smk-campo"><span>${esc(tst('v.tipo'))}</span><select class="in" name="tipo"><option value="scritto">${esc(tst('v.scritto2'))}</option><option value="orale">${esc(tst('v.orale2'))}</option><option value="pratico">${esc(tst('v.pratico'))}</option></select></label>
    <label class="smk-campo"><span>${esc(tst('v.nota'))}</span><input class="in" name="nota" maxlength="120"></label>
    <div class="bt"><button class="btn b-sm b-ghost" data-x="1">${esc(tst('annulla'))}</button><button class="btn b-sm b-main" data-ok="1">${esc(tst('salva'))}</button></div></div>`;
  document.body.appendChild(v);
  v.querySelector('[data-x]').onclick = () => v.remove();
  v.querySelector('[data-ok]').onclick = async () => {
    const val = n => v.querySelector(`[name="${n}"]`).value;
    const r = await A.sm_voto_nuovo({materia: m.m, voto: val('voto'), data: val('data'), tipo: val('tipo'), nota: val('nota')});
    if (!r || !r.ok) return v.querySelector('[name="voto"]').focus();
    v.remove(); SMSt.voti = r.voti; smStudiaCorpo(m);
  };
}
async function smsMomenti(m) {
  const r = await A.sm_momenti(m.m, ['chiarire']);
  const M = (r && r.momenti) || [];
  if (!M.length) return toast(tst('momenti.0'));
  const html = `<div class="smx-lista" style="margin-top:8px;max-height:50vh;overflow:auto">${M.slice(0, 30).map((x, i) => `<button class="smx-f" data-mo="${i}"><span class="smx-fi amb">${smIco('g-kar')}</span><span class="smx-ft"><b>${esc(x.testo || x.nome)}</b><small class="dato">${esc(x.nome + ' · ' + (x.ora || ''))}</small></span><span class="smx-chev">›</span></button>`).join('')}</div>`;
  const p = dialogo({titolo: tst('momenti'), html, bottoni: [{t: esc(t('chiudi')), v: false}]});
  setTimeout(() => document.querySelectorAll('.velo [data-mo]').forEach(b => b.onclick = () => { const x = M[+b.dataset.mo]; document.querySelectorAll('.velo').forEach(v => v.remove()); mostraMomento(x.cartella, x.sec, null, x.nome); }), 50);
  await p;
}

// il percorso in alto: «I miei strumenti › Studia › Matematica»; dentro una materia «Indietro» torna a Studia
function smsPercorso(m) {
  const p = $('v-studia').querySelector('.perc'); if (!p) return;
  const br = p.querySelector('.briciole'), tb = p.querySelector('.torna');
  if (m) {
    br.innerHTML = `<a data-casa="1">${esc(t('nav.dsa'))}</a><span class="sep">›</span><a data-st="1">${esc(tst('h'))}</a><span class="sep">›</span><b>${esc(m.m)}</b>`;
    br.querySelector('[data-st]').onclick = () => { STU.dentro = false; smStudia(); };
    tb.onclick = () => { STU.dentro = false; smStudia(); };
  } else {
    br.innerHTML = `<a data-casa="1">${esc(t('nav.dsa'))}</a><span class="sep">›</span><b>${esc(tst('h'))}</b>`;
    tb.onclick = () => { const prima = SMS.storia.pop() || 'dsa'; vai(prima, true); };
  }
  br.querySelector('[data-casa]').onclick = () => { SMS.storia = []; vai('dsa', true); };
}
