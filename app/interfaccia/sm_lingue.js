'use strict';
/* Scripta Manent — Lingue facili: «Leggi e traduci» (testo scritto o foto della pagina, frase per frase con la
   traduzione e le parole difficili), «Come si dice» (dall'italiano alla lingua straniera), «Le mie parole» (le parole
   salvate, da ascoltare e ripassare). La voce legge nella lingua del testo, anche piano. */

const SML2_T = {
  it: {
    h: 'Lingue facili', p: 'Inglese, francese, spagnolo e tedesco: leggere, capire, pronunciare.',
    't.leggi': 'Leggi e traduci', 't.dici': 'Come si dice', 't.parole': 'Le mie parole',
    'l.auto': 'Riconoscila tu', 'l.en': 'Inglese', 'l.fr': 'Francese', 'l.es': 'Spagnolo', 'l.de': 'Tedesco',
    'in.h': 'Il testo in lingua', 'in.ph': 'Scrivi o incolla qui il testo (o fotografa la pagina del libro)', 'in.foto': 'Fotografa la pagina', 'in.scegli': 'Scegli una foto',
    'in.n': '{n} foto pronte', 'in.lingua': 'Che lingua è', 'in.vai': 'Traducimelo', 'in.lav': 'Divido il testo in frasi e lo traduco…',
    prima: 'I testi di prima', 'prima.0': 'I testi che traduci restano qui (gli ultimi 10).', nuovo: 'Nuovo testo', togli: 'Togli',
    tutto: 'Leggi tutto', ferma: 'Ferma', piano: 'Piano', normale: 'Normale', 'tr.sempre': 'Traduzione sempre visibile', 'tr.tocca': 'Tocca una frase per vedere la traduzione',
    frasi: '{n} frasi', ascolta: 'Ascolta', 'si.legge': 'si legge «{p}»', aggiungi: 'Aggiungi a Le mie parole', aggiunta: 'Aggiunta a Le mie parole', gia: 'C\'è già in Le mie parole',
    'dici.h': 'Cosa vuoi dire, in italiano', 'dici.ph': 'es. Posso andare in bagno?', 'dici.in': 'In che lingua', 'dici.vai': 'Come si dice?', 'dici.lav': 'Cerco il modo più semplice…',
    'dici.altre': 'Altri modi di dirlo', 'dici.ult': 'Le ultime che hai chiesto',
    'par.0': 'Ancora nessuna parola. Le aggiungi da «Leggi e traduci» o da «Come si dice», oppure a mano.', 'par.n': '{n} parole', 'par.imp': 'imparate {n}',
    'par.rip': 'Ripassa le parole ({n})', 'par.rip0': 'Hai imparato tutte le parole: bravo!', 'par.mano': 'Aggiungi a mano', 'par.w': 'La parola (in lingua)', 'par.it': 'Cosa vuol dire',
    'par.pron': 'Come si legge (facoltativo)', 'par.tolta': 'Parola tolta', 'rip.h': 'Ripasso: {i} di {n}', 'rip.mostra': 'Mostra cosa vuol dire', 'rip.so': 'La so', 'rip.ancora': 'Ancora',
    'rip.fine': 'Fatto! Le parole che sai tornano meno spesso.', 'rip.torna': 'Torna alle parole', 'novoce': 'Su questo PC non c\'è la voce in {l}: si aggiunge da Impostazioni di Windows › Ora e lingua › Voce.',
    salva: 'Salva', annulla: 'Annulla',
  },
  en: {
    h: 'Easy languages', p: 'English, French, Spanish and German: read, understand, pronounce.',
    't.leggi': 'Read and translate', 't.dici': 'How do you say', 't.parole': 'My words',
    'l.auto': 'Detect it', 'l.en': 'English', 'l.fr': 'French', 'l.es': 'Spanish', 'l.de': 'German',
    'in.h': 'The text', 'in.ph': 'Write or paste the text here (or photograph the book page)', 'in.foto': 'Photograph the page', 'in.scegli': 'Choose a photo',
    'in.n': '{n} photos ready', 'in.lingua': 'Which language', 'in.vai': 'Translate it', 'in.lav': 'Splitting the text into sentences and translating…',
    prima: 'Earlier texts', 'prima.0': 'The texts you translate stay here (the last 10).', nuovo: 'New text', togli: 'Remove',
    tutto: 'Read it all', ferma: 'Stop', piano: 'Slow', normale: 'Normal', 'tr.sempre': 'Translation always visible', 'tr.tocca': 'Tap a sentence to see the translation',
    frasi: '{n} sentences', ascolta: 'Listen', 'si.legge': 'sounds like «{p}»', aggiungi: 'Add to My words', aggiunta: 'Added to My words', gia: 'Already in My words',
    'dici.h': 'What you want to say', 'dici.ph': 'e.g. May I go to the toilet?', 'dici.in': 'In which language', 'dici.vai': 'How do you say it?', 'dici.lav': 'Looking for the simplest way…',
    'dici.altre': 'Other ways to say it', 'dici.ult': 'Your last questions',
    'par.0': 'No words yet. Add them from «Read and translate» or «How do you say», or by hand.', 'par.n': '{n} words', 'par.imp': 'learnt {n}',
    'par.rip': 'Review the words ({n})', 'par.rip0': 'You learnt all the words: well done!', 'par.mano': 'Add by hand', 'par.w': 'The word (in the language)', 'par.it': 'What it means',
    'par.pron': 'How it sounds (optional)', 'par.tolta': 'Word removed', 'rip.h': 'Review: {i} of {n}', 'rip.mostra': 'Show what it means', 'rip.so': 'I know it', 'rip.ancora': 'Again',
    'rip.fine': 'Done! The words you know come back less often.', 'rip.torna': 'Back to the words', 'novoce': 'This PC has no {l} voice: add it from Windows Settings › Time & language › Speech.',
    salva: 'Save', annulla: 'Cancel',
  },
};
function tl2(k, p) {
  let s = (SML2_T[LINGUA] && SML2_T[LINGUA][k]) ?? SML2_T.it[k] ?? k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
}
const SMG = {tab: 'leggi', d: null, testo: null, foto: [], lingua: 'auto', vel: 0.85, sempre: true, aperte: {}, letta: -1, giro: 0, dici: null, dici_l: 'en', dici_st: [], rip: null};
const SMG_LANG = {en: 'en-GB', fr: 'fr-FR', es: 'es-ES', de: 'de-DE'};

/* ------------------------------------------------------------------ la voce nella lingua giusta */
function smgVoce(lg) {
  try {
    const vv = speechSynthesis.getVoices(), c = SMG_LANG[lg] || 'en-GB';
    return vv.find(v => v.lang === c) || vv.find(v => (v.lang || '').slice(0, 2).toLowerCase() === lg) || null;
  } catch (e) { return null; }
}
function smgParla(testo, lg, vel) {
  const giro = ++SMG.giro;
  return new Promise(async fatto => {
    if (!testo) return fatto(true);
    try { voceFerma(); } catch (e) {}
    if (typeof VOCE_APP === 'function' && VOCE_APP()) {
      const r = await A.voce_parla(testo, vel || SMG.vel, lg);
      if (!r || !r.ok) return fatto(false);
      while (giro === SMG.giro) { await pausa(200); const o = await A.voce_occupata(); if (!o || !o.occupata) break; }
      return fatto(giro === SMG.giro);
    }
    try {
      if (!window.speechSynthesis) return fatto(false);
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(testo); u.lang = SMG_LANG[lg] || 'en-GB'; u.rate = vel || SMG.vel;
      const v = smgVoce(lg);
      if (v) u.voice = v;
      else if (speechSynthesis.getVoices().length && !SMG.avvisato) { SMG.avvisato = true; toast(tl2('novoce', {l: tl2('l.' + lg).toLowerCase()})); }
      u.onend = () => fatto(giro === SMG.giro); u.onerror = () => fatto(false);
      speechSynthesis.speak(u);
    } catch (e) { fatto(false); }
  });
}
function smgFerma() { SMG.giro++; SMG.letta = -1; try { voceFerma(); } catch (e) {} try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }
const smgIt = testo => { const v = SMS.voce; SMS.voce = true; parlaSm(testo); SMS.voce = v; };

/* ------------------------------------------------------------------ la pagina */
async function smLingue() {
  const sec = $('v-smlingue'); if (!sec) return;
  sec.classList.add('smm');
  const box = smTitolo('smlingue', tl2('h'), tl2('p'));
  if (!SMG.d) { box.innerHTML = `<div class="hint row" style="gap:8px"><span class="spin"></span></div>`; const r = await A.sm_lingue(); SMG.d = {parole: (r && r.parole) || [], testi: (r && r.testi) || []}; }
  const T = [['leggi', tl2('t.leggi')], ['dici', tl2('t.dici')], ['parole', tl2('t.parole')]];
  box.innerHTML = `<div class="smx-tabs smm-tabs">${T.map(([k, n]) => `<button class="${SMG.tab === k ? 'on' : ''}" data-k="${k}">${esc(n)}${k === 'parole' && SMG.d.parole.length ? ` <span class="smg-n">${SMG.d.parole.length}</span>` : ''}</button>`).join('')}</div><div id="smgIn"></div>`;
  box.querySelectorAll('.smm-tabs button').forEach(b => b.onclick = () => { SMG.tab = b.dataset.k; SMG.rip = null; smgFerma(); smLingue(); });
  ({leggi: smgLeggi, dici: smgDici, parole: smgParole})[SMG.tab]($('smgIn'));
  smInfoGiro(sec);
}
const smgSeg = (id, vals, cur) => `<div class="seg smk-seg" id="${id}">${vals.map(([v, n]) => `<span data-v="${v}" class="${v === cur ? 'on' : ''}">${esc(n)}</span>`).join('')}</div>`;
const smgSegOn = (el, id, f) => el.querySelectorAll(`#${id} span`).forEach(x => x.onclick = () => { el.querySelectorAll(`#${id} span`).forEach(y => y.classList.toggle('on', y === x)); f(x.dataset.v); });

/* Leggi e traduci */
function smgLeggi(el) {
  const X = SMG.testo;
  if (!X) {
    el.innerHTML = `<div class="card"><label class="smk-campo"><span>${esc(tl2('in.h'))}</span><textarea class="in smg-ta" id="smgT" rows="6" placeholder="${esc(tl2('in.ph'))}">${esc(SMG.bozza || '')}</textarea></label>
        <div class="smk-cfoto" style="margin-top:10px"><button class="btn b-ghost" data-c="scatta">${smIco('g-foto')} ${esc(tl2('in.foto'))}</button><button class="btn b-ghost" data-c="scegli">${esc(tl2('in.scegli'))}</button><b class="smk-cn" id="smgN">${SMG.foto.length ? esc(tl2('in.n', {n: SMG.foto.length})) : ''}</b></div>
        <div class="smk-campo" style="margin-top:12px"><span>${esc(tl2('in.lingua'))}</span></div>${smgSeg('smgL', ['auto', 'en', 'fr', 'es', 'de'].map(k => [k, tl2('l.' + k)]), SMG.lingua)}
        <div class="row mt"><span class="sp"></span><button class="btn b-main" id="smgVai">${esc(tl2('in.vai'))}</button></div></div>
      <h3 class="smx-h3">${esc(tl2('prima'))}</h3>${SMG.d.testi.length ? `<div class="smx-lista">${[...SMG.d.testi].reverse().map(x => `<button class="smx-f" data-t="${esc(x.id)}"><span class="smx-fi">${smIco('g-mondo')}</span><span class="smx-ft"><b>${esc(x.titolo || x.frasi[0].orig.slice(0, 60))}</b><small class="dato">${esc([tl2('l.' + x.lingua), tl2('frasi', {n: x.frasi.length}), (x.quando || '').slice(0, 10).split('-').reverse().join('/')].join(' · '))}</small></span><span class="smx-chev">›</span></button>`).join('')}</div>` : `<div class="hint">${esc(tl2('prima.0'))}</div>`}`;
    $('smgT').oninput = () => { SMG.bozza = $('smgT').value; };
    smgSegOn(el, 'smgL', v => SMG.lingua = v);
    const prendi = async scatta => {
      const s = scatta ? await A.scatta_foglio() : await A.scegli_immagini();
      if (s && s.ok && s.percorsi && s.percorsi.length) { SMG.foto = [...SMG.foto, ...s.percorsi].slice(0, 4); $('smgN').textContent = tl2('in.n', {n: SMG.foto.length}); }
    };
    el.querySelector('[data-c="scatta"]').onclick = () => prendi(true);
    el.querySelector('[data-c="scegli"]').onclick = () => prendi(false);
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { SMG.testo = SMG.d.testi.find(x => x.id === b.dataset.t); SMG.aperte = {}; smgLeggi(el); });
    $('smgVai').onclick = async () => {
      const testo = $('smgT').value.trim(); if (!testo && !SMG.foto.length) return $('smgT').focus();
      const b = $('smgVai'); b.disabled = true; b.innerHTML = `<span class="spin"></span> ${esc(tl2('in.lav'))}`;
      const r = await A.sm_lingue_traduci(testo, SMG.foto, SMG.lingua === 'auto' ? '' : SMG.lingua);
      if (!r || !r.ok) { b.disabled = false; b.textContent = tl2('in.vai'); return toast((r && r.msg) || ''); }
      SMG.d = {parole: r.parole || SMG.d.parole, testi: r.testi || SMG.d.testi}; SMG.testo = r.testo; SMG.foto = []; SMG.bozza = ''; SMG.aperte = {};
      smgLeggi(el);
    };
    return;
  }
  const lg = X.lingua;
  el.innerHTML = `<div class="smg-testa"><div><b>${esc(X.titolo || tl2('t.leggi'))}</b><span class="smx-chip pet">${esc(tl2('l.' + lg))}</span><small class="dato">${esc(tl2('frasi', {n: X.frasi.length}))}</small></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn b-main b-sm" id="smgTutto">${smIco('g-voce')} ${esc(SMG.letta >= 0 ? tl2('ferma') : tl2('tutto'))}</button>
        ${smgSeg('smgV', [['0.65', tl2('piano')], ['0.9', tl2('normale')]], SMG.vel <= 0.7 ? '0.65' : '0.9')}
        <span class="sp"></span><button class="btn b-ghost b-sm" id="smgNuovo">${esc(tl2('nuovo'))}</button></div>
      <label class="smg-sw"><span class="sw${SMG.sempre ? ' on' : ''}" id="smgSem"></span>${esc(SMG.sempre ? tl2('tr.sempre') : tl2('tr.tocca'))}</label></div>
    <div class="smg-frasi">${X.frasi.map((f, i) => `<div class="smg-f${SMG.letta === i ? ' on' : ''}" data-i="${i}">
        <div class="smg-fr"><button class="smg-play" data-p="${i}" aria-label="${esc(tl2('ascolta'))}"><svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M7 5l12 7-12 7z"/></svg></button><div class="smg-o" lang="${esc(lg)}">${esc(f.orig)}</div></div>
        ${SMG.sempre || SMG.aperte[i] ? `<div class="smg-it">${esc(f.it)}</div>` : ''}
        ${f.parole && f.parole.length ? `<div class="smg-pp">${f.parole.map((p, j) => `<span class="smg-p"><b lang="${esc(lg)}">${esc(p.w)}</b> ${esc(p.it)}${p.pron ? ` · <i>${esc(tl2('si.legge', {p: p.pron}))}</i>` : ''}
          <button class="smg-pa" data-w="${i}|${j}" aria-label="${esc(tl2('ascolta'))}">${smIco('g-voce')}</button><button class="smg-pa" data-a="${i}|${j}" aria-label="${esc(tl2('aggiungi'))}" title="${esc(tl2('aggiungi'))}">${smIco('g-piu')}</button></span>`).join('')}</div>` : ''}</div>`).join('')}</div>`;
  smgSegOn(el, 'smgV', v => SMG.vel = +v);
  $('smgSem').parentElement.onclick = () => { SMG.sempre = !SMG.sempre; smgLeggi(el); };
  $('smgNuovo').onclick = () => { smgFerma(); SMG.testo = null; smgLeggi(el); };
  $('smgTutto').onclick = async () => {
    if (SMG.letta >= 0) { smgFerma(); return smgLeggi(el); }
    for (let i = 0; i < X.frasi.length; i++) {
      SMG.letta = i; smgSegna(el, i);
      const ok = await smgParla(X.frasi[i].orig, lg);
      if (!ok || SMG.letta !== i) break;
    }
    SMG.letta = -1; if (SMG.testo === X) smgLeggi(el);
  };
  el.querySelectorAll('[data-p]').forEach(b => b.onclick = e => { e.stopPropagation(); smgFerma(); const i = +b.dataset.p; smgSegna(el, i); smgParla(X.frasi[i].orig, lg).then(() => smgSegna(el, -1)); });
  el.querySelectorAll('.smg-f').forEach(d => d.onclick = () => { if (SMG.sempre) return; const i = +d.dataset.i; SMG.aperte[i] = !SMG.aperte[i]; smgLeggi(el); });
  el.querySelectorAll('[data-w]').forEach(b => b.onclick = e => { e.stopPropagation(); const [i, j] = b.dataset.w.split('|'); smgParla(X.frasi[+i].parole[+j].w, lg, 0.7); });
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = async e => {
    e.stopPropagation(); const [i, j] = b.dataset.a.split('|'), p = X.frasi[+i].parole[+j];
    smgAggiungi({w: p.w, it: p.it, pron: p.pron, lingua: lg, es: X.frasi[+i].orig});
  });
}
function smgSegna(el, i) { el.querySelectorAll('.smg-f').forEach(d => d.classList.toggle('on', +d.dataset.i === i)); const d = el.querySelector(`.smg-f[data-i="${i}"]`); if (d) d.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }
async function smgAggiungi(p) {
  const gia = SMG.d.parole.some(x => x.w.toLowerCase() === String(p.w).toLowerCase() && x.lingua === p.lingua);
  if (gia) return toast(tl2('gia'));
  const r = await A.sm_parola(p); if (r && r.parole) SMG.d.parole = r.parole;
  toast(tl2('aggiunta'));
  const n = document.querySelector('#v-smlingue .smm-tabs button[data-k="parole"]'); if (n) n.innerHTML = `${esc(tl2('t.parole'))} <span class="smg-n">${SMG.d.parole.length}</span>`;
}

/* Come si dice */
function smgDici(el) {
  const D = SMG.dici;
  el.innerHTML = `<div class="card"><label class="smk-campo"><span>${esc(tl2('dici.h'))}</span><input class="in" id="smgDq" maxlength="400" placeholder="${esc(tl2('dici.ph'))}" value="${esc(SMG.dici_q || '')}"></label>
      <div class="smk-campo" style="margin-top:12px"><span>${esc(tl2('dici.in'))}</span></div>${smgSeg('smgDl', ['en', 'fr', 'es', 'de'].map(k => [k, tl2('l.' + k)]), SMG.dici_l)}
      <div class="row mt" style="gap:8px"><button class="btn b-ghost b-sm" id="smgDd">${smIco('i-mic')} ${esc(t('sd.detta'))}</button><span class="sp"></span><button class="btn b-main" id="smgDvai">${esc(tl2('dici.vai'))}</button></div></div>
    ${D ? `<div class="smg-dici"><div class="smg-dq">${esc(D.it)}</div>
      <div class="smg-fr"><button class="smg-play" data-d="0" aria-label="${esc(tl2('ascolta'))}"><svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M7 5l12 7-12 7z"/></svg></button><div class="smg-o big" lang="${esc(D.lingua)}">${esc(D.frase)}</div></div>
      ${D.pron ? `<div class="smg-pron">${esc(tl2('si.legge', {p: D.pron}))}</div>` : ''}${D.nota ? `<div class="smk-cons">${esc(D.nota)}</div>` : ''}
      <div class="row mt"><span class="sp"></span><button class="btn b-ghost b-sm" data-dadd="1">${smIco('g-piu')} ${esc(tl2('aggiungi'))}</button></div>
      ${D.altre && D.altre.length ? `<h3 class="smx-h3">${esc(tl2('dici.altre'))}</h3>${D.altre.map((a, i) => `<div class="smg-alt"><div class="smg-fr"><button class="smg-play" data-d="${i + 1}"><svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M7 5l12 7-12 7z"/></svg></button><div class="smg-o" lang="${esc(D.lingua)}">${esc(a.frase)}</div></div>${a.pron ? `<div class="smg-pron">${esc(tl2('si.legge', {p: a.pron}))}</div>` : ''}${a.quando ? `<div class="hint">${esc(a.quando)}</div>` : ''}</div>`).join('')}` : ''}</div>` : ''}
    ${SMG.dici_st.length > 1 ? `<h3 class="smx-h3">${esc(tl2('dici.ult'))}</h3><div class="smx-lista">${SMG.dici_st.slice(1).map((x, i) => `<button class="smx-f" data-st="${i + 1}"><span class="smx-fi">${smIco('g-mondo')}</span><span class="smx-ft"><b>${esc(x.it)}</b><small class="dato" lang="${esc(x.lingua)}">${esc(x.frase)}</small></span><span class="smx-chev">›</span></button>`).join('')}</div>` : ''}`;
  $('smgDq').oninput = () => { SMG.dici_q = $('smgDq').value; };
  $('smgDq').onkeydown = e => { if (e.key === 'Enter') $('smgDvai').click(); };
  smgSegOn(el, 'smgDl', v => SMG.dici_l = v);
  $('smgDd').onclick = () => vai('dp');
  $('smgDvai').onclick = async () => {
    const q = $('smgDq').value.trim(); if (!q) return $('smgDq').focus();
    const b = $('smgDvai'); b.disabled = true; b.innerHTML = `<span class="spin"></span> ${esc(tl2('dici.lav'))}`;
    const r = await A.sm_lingue_dici(q, SMG.dici_l);
    if (!r || !r.ok) { b.disabled = false; b.textContent = tl2('dici.vai'); return toast((r && r.msg) || ''); }
    SMG.dici = r.dici; SMG.dici_st = [r.dici, ...SMG.dici_st.filter(x => x.it !== r.dici.it || x.lingua !== r.dici.lingua)].slice(0, 8);
    smgDici(el); smgParla(r.dici.frase, r.dici.lingua);
  };
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const i = +b.dataset.d; smgParla(i ? D.altre[i - 1].frase : D.frase, D.lingua); });
  const ad = el.querySelector('[data-dadd]'); if (ad) ad.onclick = () => smgAggiungi({w: D.frase, it: D.it, pron: D.pron, lingua: D.lingua});
  el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { SMG.dici = SMG.dici_st[+b.dataset.st]; SMG.dici_q = SMG.dici.it; smgDici(el); });
}

/* Le mie parole */
function smgParole(el) {
  const P = SMG.d.parole;
  if (SMG.rip) return smgRipasso(el);
  const da = P.filter(p => (p.so || 0) < 3), imp = P.length - da.length;
  const per = {};
  P.forEach(p => (per[p.lingua] = per[p.lingua] || []).push(p));
  el.innerHTML = (P.length ? `<div class="smg-testa"><div><b>${esc(tl2('par.n', {n: P.length}))}</b>${imp ? `<small class="dato">${esc(tl2('par.imp', {n: imp}))}</small>` : ''}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap">${da.length ? `<button class="btn b-main b-sm" id="smgRip">${smIco('i-cards')} ${esc(tl2('par.rip', {n: da.length}))}</button>` : `<span class="hint">${esc(tl2('par.rip0'))}</span>`}
        <span class="sp"></span><button class="btn b-ghost b-sm" id="smgMano">${smIco('g-piu')} ${esc(tl2('par.mano'))}</button></div></div>`
    : `<div class="card"><div class="hint">${esc(tl2('par.0'))}</div><div class="row mt"><span class="sp"></span><button class="btn b-ghost b-sm" id="smgMano">${smIco('g-piu')} ${esc(tl2('par.mano'))}</button></div></div>`)
    + Object.keys(per).map(lg => `<h3 class="smx-h3">${esc(tl2('l.' + lg))}<small class="dato" style="font-weight:400;color:var(--sm-ard)">${per[lg].length}</small></h3><div class="smg-plist">${[...per[lg]].reverse().map(p => `<div class="smg-pr${(p.so || 0) >= 3 ? ' ok' : ''}">
        <button class="smg-play" data-pv="${esc(p.id)}" aria-label="${esc(tl2('ascolta'))}"><svg viewBox="0 0 24 24" width="14" height="14" fill="#fff"><path d="M7 5l12 7-12 7z"/></svg></button>
        <div class="smg-prt"><b lang="${esc(lg)}">${esc(p.w)}</b><span>${esc(p.it)}${p.pron ? ` · <i>${esc(tl2('si.legge', {p: p.pron}))}</i>` : ''}</span></div>
        <span class="smg-liv" title="${esc(tl2('rip.so'))}">${[0, 1, 2].map(k => `<i class="${(p.so || 0) > k ? 'on' : ''}"></i>`).join('')}</span>
        <button class="smg-pa" data-px="${esc(p.id)}" aria-label="${esc(tl2('togli'))}" title="${esc(tl2('togli'))}">${smIco('g-cestino')}</button></div>`).join('')}</div>`).join('');
  const r = $('smgRip'); if (r) r.onclick = () => { SMG.rip = {lista: da.slice(0, 20).sort(() => Math.random() - .5), i: 0, vista: false}; smgParole(el); };
  $('smgMano').onclick = () => smgMano(el);
  el.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => { const p = P.find(x => x.id === b.dataset.pv); if (p) smgParla(p.w, p.lingua, 0.75); });
  el.querySelectorAll('[data-px]').forEach(b => b.onclick = async () => {
    const r2 = await A.sm_parola_togli(b.dataset.px); SMG.d.parole = r2.parole; smLingue();
    if (r2.tolta) smAnnulla(tl2('par.tolta'), async () => { const r3 = await A.sm_parola(r2.tolta); SMG.d.parole = r3.parole; smLingue(); });
  });
}
function smgMano(el) {
  const fin = smkFinestra(tl2('par.mano'), `<label class="smk-campo"><span>${esc(tl2('par.w'))}</span><input class="in" name="w" maxlength="80"></label>
      <label class="smk-campo"><span>${esc(tl2('par.it'))}</span><input class="in" name="it" maxlength="160"></label>
      <label class="smk-campo"><span>${esc(tl2('par.pron'))}</span><input class="in" name="pron" maxlength="80"></label>
      <div class="smk-campo"><span>${esc(tl2('in.lingua'))}</span></div>${smgSeg('smgMl', ['en', 'fr', 'es', 'de'].map(k => [k, tl2('l.' + k)]), SMG.mano_l || 'en')}`, async d => {
    const v = n => d.querySelector(`[name="${n}"]`).value.trim();
    if (!v('w')) { d.querySelector('[name="w"]').focus(); return false; }
    await smgAggiungi({w: v('w'), it: v('it'), pron: v('pron'), lingua: SMG.mano_l || 'en'});
    smLingue();
  });
  smgSegOn(fin, 'smgMl', v => SMG.mano_l = v);
}
function smgRipasso(el) {
  const R2 = SMG.rip, p = R2.lista[R2.i];
  if (!p) {
    el.innerHTML = `<div class="smk-esito giusto"><span class="smk-esito-i">${smIco('g-ok')}</span><div><b>${esc(tl2('rip.fine'))}</b></div></div>
      <div class="row mt"><span class="sp"></span><button class="btn b-main b-sm" id="smgRt">${esc(tl2('rip.torna'))}</button></div>`;
    $('smgRt').onclick = () => { SMG.rip = null; smLingue(); };
    return;
  }
  el.innerHTML = `<div class="smg-carta"><div class="hint">${esc(tl2('rip.h', {i: R2.i + 1, n: R2.lista.length}))} · ${esc(tl2('l.' + p.lingua))}</div>
      <div class="smg-fr" style="justify-content:center;margin:18px 0"><button class="smg-play" id="smgRa"><svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M7 5l12 7-12 7z"/></svg></button><div class="smg-o big" lang="${esc(p.lingua)}">${esc(p.w)}</div></div>
      ${R2.vista ? `<div class="smg-dq">${esc(p.it)}</div>${p.pron ? `<div class="smg-pron">${esc(tl2('si.legge', {p: p.pron}))}</div>` : ''}${p.es ? `<div class="hint" lang="${esc(p.lingua)}" style="margin-top:8px">«${esc(p.es)}»</div>` : ''}
        <div class="row mt" style="gap:8px;justify-content:center"><button class="btn b-ghost" id="smgRn">${esc(tl2('rip.ancora'))}</button><button class="btn b-main" id="smgRs">${ckSvg} ${esc(tl2('rip.so'))}</button></div>`
      : `<div class="row mt" style="justify-content:center"><button class="btn b-main" id="smgRm">${esc(tl2('rip.mostra'))}</button></div>`}</div>
    <div class="row mt"><button class="lnk" id="smgRt">${esc(tl2('rip.torna'))}</button></div>`;
  $('smgRa').onclick = () => smgParla(p.w, p.lingua, 0.75);
  $('smgRt').onclick = () => { SMG.rip = null; smLingue(); };
  if ($('smgRm')) $('smgRm').onclick = () => { R2.vista = true; smgRipasso(el); smgIt(p.it); };
  const esito = async so => { const r = await A.sm_parola_esito(p.id, so); if (r && r.parole) SMG.d.parole = r.parole; R2.i++; R2.vista = false; smgRipasso(el); const q = R2.lista[R2.i]; if (q) smgParla(q.w, q.lingua, 0.75); };
  if ($('smgRs')) $('smgRs').onclick = () => esito(true);
  if ($('smgRn')) $('smgRn').onclick = () => esito(false);
  if (!R2.vista && !R2.detta) { R2.detta = true; smgParla(p.w, p.lingua, 0.75); }
}

/* ------------------------------------------------------------------ la pagina nel programma */
(function () {
  if (typeof SM_PAGINE === 'undefined') return;
  SM_PAGINE.push('smlingue');
  Object.assign(SMT.it, {'ling.h': SML2_T.it.h, 'sd.ling.s': 'Pronuncia e traduzione'});
  Object.assign(SMT.en, {'ling.h': SML2_T.en.h, 'sd.ling.s': 'Pronunciation and translation'});
})();
