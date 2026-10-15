/* Registra Lezione — la pagina parla con Python tramite window.pywebview.api */
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico = (n, w) => `<svg${w ? ` width="${w}" height="${w}"` : ''}><use href="#i-${n}"/></svg>`;
const due = n => String(n).padStart(2, '0');
const hms = s => due(Math.floor(s / 3600)) + ':' + due(Math.floor(s / 60) % 60) + ':' + due(s % 60);
const ms = s => due(Math.floor(s / 60)) + ':' + due(s % 60);
const num = x => LINGUA === 'it' ? String(x).replace('.', ',') : String(x);
const gb = x => x >= 0.1 ? num(x.toFixed(1)) + ' GB' : Math.round(x * 1000) + ' MB';
let A = null;            // api
let S = {};              // ultimo stato
let R = {};              // riepilogo (impostazioni)
let pagina = 'reg';
let LZ = null;           // elenco registrazioni
let slideViste = -1;

/* ------------------------------------------------------------------ collegamento con Python */
function collega() {
  if (window.pywebview && window.pywebview.api) { A = window.pywebview.api; avvio(); return; }
  window.addEventListener('pywebviewready', () => { A = window.pywebview.api; avvio(); }, {once: true});
  // prove nel browser (fuori dal programma): stesse funzioni via HTTP
  if (location.protocol.startsWith('http')) setTimeout(() => {
    if (A) return;
    A = new Proxy({}, {get: (t, n) => (...a) => fetch('/api/' + n, {method: 'POST', body: JSON.stringify(a)}).then(r => r.json())});
    avvio();
  }, 300);
}
collega();

async function avvio() {
  let p = 5, t0 = Date.now();
  try { LINGUA = (navigator.language || 'it').toLowerCase().startsWith('it') ? 'it' : 'en'; } catch (e) {}
  const msg = ['spl.1', 'spl.2', 'spl.3', 'spl.4'];
  const anim = setInterval(() => { p = Math.min(92, p + (92 - p) * 0.08); $('splBar').style.width = p + '%'; $('splTxt').textContent = t(msg[Math.min(3, Math.floor(p / 25))]); }, 120);
  while (true) {
    let r = {};
    try { r = await A.pronto(); } catch (e) { r = {}; }
    if (r.errore) { clearInterval(anim); $('splErr').textContent = t('spl.err') + r.errore; $('splErr').classList.remove('hidden'); return; }
    if (r.pronto) break;
    await pausa(150);
  }
  clearInterval(anim);
  $('splBar').style.width = '100%'; $('splTxt').textContent = t('spl.ok');
  await pausa(Math.max(250, 1100 - (Date.now() - t0)));
  R = await A.riepilogo();
  LINGUA = R.lingua || LINGUA;
  traduciPagina();
  inizializza();
  $('splash').classList.add('via');
  setTimeout(() => $('splash').remove(), 500);
  if (!R.lingua_scelta) benvenuto();
  ciclo();
}
const pausa = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------------ dialoghi */
function dialogo({titolo, testo = '', html = '', bottoni = null, ck = null}) {
  bottoni = bottoni || [{t: t('ok'), cls: 'b-main', v: true}];
  return new Promise(ok => {
    const v = document.createElement('div');
    v.className = 'velo';
    v.innerHTML = `<div class="dlg"><h3>${esc(titolo)}</h3><div class="tx">${esc(testo)}</div>${html}
      ${ck ? `<label class="ck"><input type="checkbox" id="dlgCk"> ${esc(ck)}</label>` : ''}
      <div class="bt"></div></div>`;
    const bt = v.querySelector('.bt');
    bottoni.forEach(b => {
      const e = document.createElement('button');
      e.className = 'btn b-sm ' + (b.cls || 'b-ghost');
      e.innerHTML = b.t;
      e.onclick = () => {
        if (b.fn) { b.fn(); return; }
        const c = v.querySelector('#dlgCk');
        const campo = v.querySelector('input.in');
        dialogo.valore = campo ? campo.value : null;
        v.remove(); ok(ck ? {v: b.v, ck: c && c.checked} : b.v);
      };
      bt.appendChild(e);
    });
    document.body.appendChild(v);
    const f = v.querySelector('input:not([type=checkbox])'); if (f) { f.focus(); f.select(); }
    v.addEventListener('keydown', e => {
      if (e.key === 'Escape') { v.remove(); ok(ck ? {v: false} : false); }
      if (e.key === 'Enter' && e.target.matches('input.in')) bt.lastElementChild.click();
    });
  });
}
const conferma = (titolo, testo, si = t('si'), no = t('annulla'), cls = 'b-main') =>
  dialogo({titolo, testo, bottoni: [{t: no, v: false}, {t: si, cls, v: true}]});
function toast(t) {
  const e = document.createElement('div'); e.className = 'toast'; e.textContent = t;
  document.body.appendChild(e); setTimeout(() => e.remove(), 3000);
}
// chiamata da Python quando si prova a chiudere la finestra
window.chiusura = async c => {
  if (c === 'registro') { dialogo({titolo: t('chiusura.rec.t'), testo: t('chiusura.rec')}); return; }
  if (await conferma(t('chiusura.lav.t'), t('chiusura.lav'), t('chiudi'), t('chiusura.aspetto'), 'b-end')) A.esci();
};

/* ------------------------------------------------------------------ navigazione */
function vai(p) {
  pagina = p;
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.p === (['rip', 'chiedi', 'mappa'].includes(p) ? 'arch' : p)));
  ['pronto', 'importa', 'reg', 'fine', 'arch', 'rip', 'chiedi', 'mappa', 'imp', 'guida', 'info'].forEach(x => $('v-' + x).classList.add('hidden'));
  if (p === 'reg') $('v-' + ((S.vista || 'pronto') === 'pronto' && IV ? 'importa' : (S.vista || 'pronto'))).classList.remove('hidden');
  else $('v-' + p).classList.remove('hidden');
  $('main').scrollTop = 0;
  if (p === 'arch') caricaLezioni();
  if (p === 'imp') { disegnaImpostazioni(); disegnaParole(); }
  if (p === 'info') disegnaAgg();
  if (p === 'guida') disegnaGuida(linguaGuida || LINGUA);
  if (p === 'reg' && S.vista === 'pronto') { setTimeout(() => $('nome').focus(), 50); }
}

function inizializza() {
  document.querySelectorAll('#nav a').forEach(a => a.onclick = () => vai(a.dataset.p));
  scriviVersione();
  $('footAgg').onclick = () => { vai('info'); A.cerca_aggiornamenti(); };
  $('btnCercaAgg').onclick = () => A.cerca_aggiornamenti();
  $('btnAss').onclick = () => A.assistenza();
  // pronto
  $('nome').addEventListener('input', anteprimaNome);
  $('nome').addEventListener('keydown', e => { if (e.key === 'Enter') inizia(); });
  $('btnRec').onclick = inizia;
  $('btnImporta').onclick = scegliVideo;
  collegaRipasso();
  collegaNovita();
  $('ivCambia').onclick = scegliVideo;
  $('ivAnnulla').onclick = () => { IV = null; vai('reg'); };
  $('ivVai').onclick = importaVideo;
  $('ivSlide').querySelectorAll('span').forEach(x => x.onclick = () => { IV.slide = x.dataset.v === '1'; disegnaImporta(); });
  // registrazione
  $('btnPausa').onclick = () => A.pausa().then(aggiorna);
  $('btnFine').onclick = chiediFine;
  // fine
  $('fTras').onclick = () => A.apri_lezione(null);
  $('fPac').onclick = () => A.apri_pacchetti();
  $('fNuova').onclick = async () => { const r = await A.nuova(); if (!r.ok) toast(r.msg); else { R = await A.riepilogo(); disegnaPronto(); await aggiorna(); } };
  // archivio
  $('cerca').addEventListener('input', disegnaLezioni);
  $('aCart').onclick = () => A.apri_base();
  $('aVidDel').onclick = eliminaTuttiVideo;
  // impostazioni
  $('aiA').onclick = e => { if (!e.target.closest('#chiaveBox')) sceltaAI(true); };
  $('aiB').onclick = () => sceltaAI(false);
  $('segDur').querySelectorAll('span').forEach(s => s.onclick = async () => { await A.imposta('parte_minuti', +s.dataset.v); await rileggi(); });
  $('swMini').onclick = async () => { await A.imposta('mini_finestra', !R.mini); await rileggi(); };
  $('swDnd').onclick = async () => { await A.imposta('promemoria_dnd', !R.dnd); await rileggi(); };
  $('btnCart').onclick = async () => { const r = await A.scegli_cartella(); if (r.ok) await rileggi(); };
  $('btnBase').onclick = () => A.apri_base();
  $('segLingua').querySelectorAll('span').forEach(s => s.onclick = () => cambiaLingua(s.dataset.l));
  $('segGuida').querySelectorAll('span').forEach(s => s.onclick = () => disegnaGuida(s.dataset.l));
  $('fmtBox').querySelectorAll('.aiopt').forEach(o => o.onclick = async () => { await A.imposta('formato_appunti', o.dataset.f); await rileggi(); });
  document.querySelectorAll('.dati input').forEach(i => {
    i.addEventListener('change', salvaDati);
    i.addEventListener('blur', salvaDati);
  });
  disegnaPronto();
  vai('reg');
}
async function rileggi() { R = await A.riepilogo(); disegnaImpostazioni(); disegnaPronto(); }
function scriviVersione() {
  $('footVer').textContent = t('ver', {v: R.versione});
  $('infoVer').textContent = t('ver', {v: R.versione});
}
async function cambiaLingua(l) {
  await A.imposta('lingua', l);
  R = await A.riepilogo();
  LINGUA = R.lingua;
  traduciPagina(); scriviVersione();
  document.querySelectorAll('[data-h]').forEach(e => { e.dataset.h = ''; });
  disegnaPronto(); disegnaImpostazioni(); disegnaStato();
  if (LZ) disegnaLezioni();
  if (S.vista === 'fine') disegnaFine();
  if (S.vista === 'reg') disegnaReg();
  if (pagina === 'info') disegnaAgg();
  if (pagina === 'guida') { linguaGuida = LINGUA; disegnaGuida(LINGUA); }
}
function benvenuto() {
  const v = document.createElement('div');
  v.className = 'velo';
  v.innerHTML = `<div class="dlg" style="text-align:center;max-width:460px">
    <div class="logo" style="width:64px;height:64px;border-radius:18px;margin:0 auto 12px"><svg width="34" height="34"><use href="#i-logo"/></svg></div>
    <h3>${esc(t('bv.t'))}</h3><div class="tx">${esc(t('bv'))}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
      <button class="btn b-ghost" data-l="it" style="padding:16px">Italiano</button><button class="btn b-ghost" data-l="en" style="padding:16px">English</button></div>
    <div class="hint" style="margin-top:12px">${esc(t('bv.s'))}</div></div>`;
  v.querySelectorAll('[data-l]').forEach(b => {
    if (b.dataset.l === LINGUA) b.className = 'btn b-main';
    b.onclick = async () => { v.remove(); await cambiaLingua(b.dataset.l); };
  });
  document.body.appendChild(v);
}

/* ------------------------------------------------------------------ ciclo */
async function ciclo() {
  while (true) {
    try { await aggiorna(); } catch (e) { console.error(e); }
    await pausa(S.registro ? 300 : 700);
  }
}
let vistaPrima = null, contaLz = 0;
async function aggiorna() {
  S = await A.stato();
  if (S.vista !== vistaPrima) {
    const prima = vistaPrima; vistaPrima = S.vista;
    if (S.vista === 'reg') slideViste = -1;
    if (pagina === 'reg' || (prima !== null && S.vista !== 'pronto')) vai('reg');
    if (S.vista === 'pronto') { R = await A.riepilogo(); disegnaPronto(); }
  }
  if (S.vista === 'reg') disegnaReg();
  if (S.vista === 'fine') disegnaFine();
  if (S.vista === 'pronto') disegnaSorgenti();
  disegnaStato();
  if (pagina === 'info') disegnaAgg();
  if (pagina === 'arch' && ++contaLz % 8 === 0) caricaLezioni();
  for (const m of S.messaggi || []) { A.letto(m.id); await dialogo({titolo: m.titolo, testo: m.testo}); }
}

function disegnaStato() {
  let h;
  if (S.registro) h = `<b><span class="dot rec"></span>${S.pausa ? t('st.pausa') : t('st.rec')}</b>${esc(S.nome)}`;
  else if (S.occupato) h = `<b><span class="dot lav"></span>${t('st.lav')}</b>${t('st.lav2')}`;
  else h = `<b><span class="dot"></span>${t('st.pronto')}</b>${t('st.ai', {x: R.appunti_on ? t('st.on') : t('st.off')})}`;
  if ($('statobox').innerHTML !== h) $('statobox').innerHTML = h;
  $('navRec').classList.toggle('hidden', !S.registro);
  const nuovo = S.agg && S.agg.tipo === 'trovato';
  const fa = esc(t('agg')) + (nuovo ? '<span class="nuovo"></span>' : '');
  if ($('footAgg').innerHTML !== fa) $('footAgg').innerHTML = fa;
}

/* ------------------------------------------------------------------ pronto */
function anteprimaNome() {
  const n = $('nome').value.trim() || t('pr.lezione');
  const d = new Date();
  const ora = LINGUA === 'it' ? `ore ${due(d.getHours())}.${due(d.getMinutes())}` : `${due(d.getHours())}:${due(d.getMinutes())}`;
  $('nomeAnt').textContent = t('pr.ant', {n, d: `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} ${ora}`});
}
function disegnaPronto() {
  $('pillAI').innerHTML = R.appunti_on ? `<span class="pill p-cor">${ico('spark', 13)}${t(R.formato === 'esame' ? 'pr.pill.ai.e' : 'pr.pill.ai')}</span>`
    : `<span class="pill p-blue">${ico('zip', 13)}${t('pr.pill.pac')}</span>`;
  $('recenti').innerHTML = (R.recenti || []).length ? `<span class="hint">${t('pr.recenti')}</span>` +
    R.recenti.map(m => `<span class="chip" data-m="${esc(m)}">${esc(m)}</span>`).join('') : '';
  $('recenti').querySelectorAll('.chip').forEach(c => c.onclick = () => { const i = $('nome'); i.value = c.dataset.m + ' – '; i.focus(); i.setSelectionRange(i.value.length, i.value.length); anteprimaNome(); });
  $('srcScr').textContent = t('src.scr.ok') + (R.schermo ? ' · ' + R.schermo : '');
  disegnaLingue();
  anteprimaNome();
  disegnaSorgenti();
  disegnaModo();
}
function disegnaLingue() {
  const L = ['it', 'en', 'fr', 'es', 'de', 'auto'];
  const scelta = R.lingua_lezione || LINGUA;
  // prima la lingua del programma
  const ord = [LINGUA, ...L.filter(x => x !== LINGUA)];
  $('lingue').innerHTML = ord.map(l => `<span class="chip${l === scelta ? ' on' : ''}" data-l="${l}">${esc(t('lingueTit')[l])}</span>`).join('');
  $('lingue').querySelectorAll('.chip').forEach(c => c.onclick = async () => { await A.imposta('lingua_lezione', c.dataset.l); R.lingua_lezione = c.dataset.l; disegnaLingue(); });
  $('linguaTr').textContent = scelta === LINGUA ? '' : scelta === 'auto' ? t('pr.lingua.auto') : t('pr.lingua.tr', {l: t('lingue')[scelta]});
}
function disegnaSorgenti() {
  const a = S.audio_ok;
  const e = $('srcAud');
  if (a === true) { e.textContent = t('src.aud.ok'); e.className = 'okt'; }
  else if (a === false) { e.textContent = t('src.aud.ko'); e.className = 'kot'; }
  else { e.textContent = t('src.aud.cerco'); e.className = 'mutt'; }
  const lib = S.liberi != null ? t('pr.liberi', {g: Math.round(S.liberi)}) : '';
  $('recHint').textContent = t('pr.hint', {p: R.minuti === 60 ? t('pr.ora') : t('pr.30')}) + lib + (R.dnd ? t('pr.dnd') : '');
  $('recModello').textContent = S.modello || '';
}

async function inizia() {
  if (S.registro || S.occupato) { toast(t('aspetta')); return; }
  $('btnRec').disabled = true;
  try {
    const v = await A.verifica_inizio();
    if (v.occupato) { toast(t('aspetta')); return; }
    const aula = R.modo === 'aula';
    if (aula && MICS && !MICS.length) { await dialogo({titolo: t('src.mic.no'), testo: t('in.mic')}); return; }
    if (!aula && !v.audio_ok && !await conferma(t('in.audio.t'), t('in.audio'), t('in.audio.si'), t('annulla'))) return;
    if (v.liberi != null && v.liberi < 3 && !await conferma(t('in.spazio.t'), t('in.spazio', {g: num(v.liberi.toFixed(1))}), t('continua'))) return;
    if (!v.cartella_ok) { await dialogo({titolo: t('in.cart.t'), testo: t('in.cart')}); vai('imp'); return; }
    if (v.dnd) {
      const r = await dialogo({
        titolo: t('dnd.t'), testo: t('dnd'), html: `<div class="passi">${t('dnd.passi')}</div>`, ck: t('dnd.ck'),
        bottoni: [{t: t('annulla'), v: 'no'}, {t: t('dnd.apri'), cls: 'b-ghost', fn: () => A.apri_non_disturbare()},
                  {t: t('dnd.stesso'), cls: 'b-ghost', v: 'si'}, {t: t('dnd.fatto'), cls: 'b-rec', v: 'si'}]});
      if (r.ck) { await A.imposta('promemoria_dnd', false); R.dnd = false; }
      if (r.v !== 'si') return;
    }
    const r = await A.avvia($('nome').value, {modo: R.modo, microfono: aula ? $('selMic').value : '', pdf: aula && PDFA ? PDFA.percorso : ''});
    if (r.ok) { $('nome').value = ''; PDFA = null; disegnaModo(); await aggiorna(); }
  } finally { $('btnRec').disabled = false; }
}

/* ------------------------------------------------------------------ importa un video */
let IV = null;   // video scelto da importare
function durataTesto(sec) {
  const m = Math.round(sec / 60), h = Math.floor(m / 60);
  return h ? t('dur.h', {h, m: m % 60}) : t('dur.m', {m: Math.max(1, m)});
}
async function scegliVideo() {
  if (S.registro || S.occupato) { toast(t('aspetta')); return; }
  const r = await A.scegli_video();
  if (!r.ok) { if (r.msg) toast(t('iv.err')); return; }
  IV = {...r, slide: !!r.ha_video, lingua: R.lingua_lezione || LINGUA, nome: (IV && IV.nome) || ''};
  $('ivNome').value = r.nome_proposto || '';
  disegnaImporta();
  vai('reg');
  setTimeout(() => { $('ivNome').focus(); $('ivNome').select(); }, 50);
}
function disegnaImporta() {
  if (!IV) return;
  $('ivFile').textContent = IV.nome_file;
  const d = new Date(IV.data);
  const q = `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} ${due(d.getHours())}.${due(d.getMinutes())}`;
  $('ivInfo').textContent = t('iv.info', {d: durataTesto(IV.durata), g: gb(IV.peso / 1e9), q}) + (IV.ha_video ? '' : ' · ' + t('iv.solo_audio'));
  const L = ['it', 'en', 'fr', 'es', 'de', 'auto'], ord = [LINGUA, ...L.filter(x => x !== LINGUA)];
  $('ivLingue').innerHTML = ord.map(l => `<span class="chip${l === IV.lingua ? ' on' : ''}" data-l="${l}">${esc(t('lingueTit')[l])}</span>`).join('');
  $('ivLingue').querySelectorAll('.chip').forEach(c => c.onclick = () => { IV.lingua = c.dataset.l; disegnaImporta(); });
  $('ivSlideRiga').classList.toggle('hidden', !IV.ha_video);
  $('ivSlide').querySelectorAll('span').forEach(x => x.classList.toggle('on', (x.dataset.v === '1') === IV.slide));
  $('ivStima').textContent = IV.stima ? t('iv.stima', {t: durataTesto(IV.stima)}) : '';
}
async function importaVideo() {
  if (!IV) return;
  $('ivVai').disabled = true;
  try {
    const r = await A.importa(IV.percorso, $('ivNome').value, IV.lingua, IV.slide && IV.ha_video);
    if (!r.ok) { toast(r.msg && r.msg !== '?' ? r.msg : t('iv.err')); return; }
    IV = null;
    await aggiorna(); vai('reg');
  } finally { $('ivVai').disabled = false; }
}
function disegnaFasi() {
  const g = S.importa;
  $('fImp').classList.toggle('hidden', !g);
  if (!g) return;
  const testi = [t('iv.f0'), t('iv.f1'), !g.cerca_slide ? t('iv.f2x') : g.slide != null ? t('iv.f2n', {n: g.slide}) : t('iv.f2'), t('iv.f3')];
  const h = testi.map((x, i) => {
    const st = i < g.fase ? 'ok' : i === g.fase ? 'lav' : 'att';
    const segno = st === 'ok' ? '✓' : st === 'lav' ? '<span class="spin" style="width:14px;height:14px"></span>' : '·';
    const perc = st === 'lav' && i < 3 ? ` ${Math.round((g.perc || 0) * 100)}%` : '';
    return `<div class="fase ${st}"><span class="s">${segno}</span>${esc(x)}${perc}</div>`;
  }).join('');
  if ($('fFasi').innerHTML !== h) $('fFasi').innerHTML = h;
}

/* ------------------------------------------------------------------ registrazione */
(function () { const w = $('lWave'); for (let i = 0; i < 48; i++) w.appendChild(document.createElement('i')); })();
function disegnaReg() {
  if (!S.registro) return;
  $('lT').textContent = hms(S.secondi || 0);
  $('lNm').textContent = S.nome;
  $('lSl').textContent = S.slide;
  $('lGb').textContent = gb(S.gb || 0);
  $('lPk').textContent = S.pronti;
  $('live').classList.toggle('pz', !!S.pausa);
  $('lTag').className = 'tag' + (S.pausa ? ' pz' : '');
  $('lTag').innerHTML = S.pausa ? esc(t('lv.pausa', {t: ms(S.pausa_sec)})) : '<i></i>REC';
  const lv = S.livelli || [];
  $('lWave').querySelectorAll('i').forEach((b, i) => { const x = lv[i] || 0; b.style.height = Math.max(6, Math.min(100, Math.sqrt(x) * 160)) + '%'; });
  const bp = $('btnPausa');
  bp.className = 'btn sp ' + (S.pausa ? 'b-ri' : 'b-pz');
  bp.innerHTML = S.pausa ? ico('play') + t('lv.ri') : ico('pause') + t('lv.pz');
  $('lAvv').classList.toggle('hidden', !S.avviso);
  $('lAvv').textContent = S.avviso ? '⚠ ' + S.avviso : '';
  disegnaParti($('lParti'));
  disegnaDiretta();
  $('slideCard').classList.toggle('hidden', S.modo === 'aula' && !S.slide);
  if (S.slide !== slideViste) { slideViste = S.slide; A.miniature().then(m => {
    $('thumbs').innerHTML = m.length ? m.map(x => `<div class="th" style="background-image:url('${x.src}')"><em>${x.ora}</em></div>`).join('')
      : `<div class="vuoto">${t('lv.vuoto')}</div>`;
    $('thumbs').scrollLeft = 99999;
  }); }
}
async function chiediFine() {
  if (await conferma(t('fine.t'), t('fine'), t('fine.si'), t('continua'), 'b-end')) {
    await A.fine(); await aggiorna();
  }
}

function disegnaParti(el) {
  const P = S.parti || [];
  if (!P.length) { el.innerHTML = `<div class="vuoto">${t('pt.nessuna')}</div>`; return; }
  const h = P.map(p => {
    let st = '';
    if (p.stato === 'reg') st = `<span class="pill p-grey">${t('pt.reg')}</span>`;
    else if (p.stato === 'attesa') st = `<span class="pill p-grey">${t('pt.coda')}</span>`;
    else if (p.stato === 'lav') st = `<span class="pill p-blue">${t('pt.lav', {p: Math.round((p.perc || 0) * 100)})}</span><div class="bar" style="width:100%;margin:0"><i style="width:${(p.perc || 0) * 100}%"></i></div>`;
    else if (p.stato === 'ok') st = `<span class="pill p-ok">${t('pt.ok')}</span><button class="lnk" data-f="${esc(p.file || '')}">${t('pt.mostra')}</button>`;
    else st = `<span class="pill p-red">${t('pt.err')}</span>`;
    let a = '';
    if (p.ap === 'attesa') a = `<span class="pill p-grey">${t('pt.ap.coda')}</span>`;
    else if (p.ap === 'lav') a = `<span class="pill p-cor">${ico('spark', 12)}${t('pt.ap.lav')}</span><div class="bar cor" style="width:100%;margin:0"><i style="width:${(p.ap_perc || 0) * 100}%"></i></div>`;
    else if (p.ap === 'ok') a = `<span class="pill p-cor">${t('pt.ap.ok')}</span><button class="lnk" data-a="${esc(p.ap_file || '')}">${t('pt.apri')}</button>`;
    else if (p.ap === 'errore') a = `<span class="err">${esc(t('pt.ap.err', {m: p.ap_err || ''}))}</span><button class="lnk" data-r="${p.k}">${t('pt.riprova')}</button>`;
    return `<div class="part"><div class="t"><b>${t('pt.parte', {k: p.k})}</b><span class="o">${esc(p.orario || '')}</span></div><div class="r">${st}</div>${a ? `<div class="r">${a}</div>` : ''}</div>`;
  }).join('');
  if (el.dataset.h === h) return;
  el.dataset.h = h; el.innerHTML = h;
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => A.mostra_file(b.dataset.f));
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => A.apri(b.dataset.a));
  el.querySelectorAll('[data-r]').forEach(b => b.onclick = async () => { const r = await A.riprova_appunti(+b.dataset.r); if (!r.ok) toast(r.msg); });
}

/* ------------------------------------------------------------------ fine */
function disegnaFine() {
  const pronto = S.finale === 'ok';
  const perc = typeof S.finale === 'number' ? S.finale : null;
  $('fHero').classList.toggle('lav', !pronto);
  $('fCheck').className = 'check' + (pronto ? '' : ' lav');
  const chk = pronto ? ico('check') : '<span class="spin"></span>';
  if ($('fCheck').dataset.p !== String(pronto)) { $('fCheck').innerHTML = chk; $('fCheck').dataset.p = String(pronto); }
  $('fTit').textContent = pronto ? t('fn.ok') : S.importa ? t('fn.imp') : t('fn.lav');
  disegnaFasi();
  const sp = S.spesa ? t('fn.spesa', {n: S.spesa.n, d: num(S.spesa.dollari.toFixed(2))}) : '';
  $('fSub').textContent = (S.titolo_fine || '') + sp;
  $('fBar').classList.toggle('hidden', pronto || perc === null);
  if (perc !== null) $('fBar').firstElementChild.style.width = (perc * 100) + '%';
  $('fAvv').classList.toggle('hidden', !S.avviso_fine);
  $('fAvv').textContent = S.avviso_fine ? '⚠ ' + S.avviso_fine : '';
  disegnaParti($('fParti'));
  $('fTras').disabled = !pronto;
  $('fNuova').disabled = !!S.occupato;
  // riquadro appunti
  const P = S.parti || [];
  const inCorso = P.some(p => p.ap === 'lav' || p.ap === 'attesa' || (p.stato !== 'ok' && p.stato !== 'errore' && R.appunti_on));
  let h;
  if (S.ha_appunti) {
    const c = S.cornell;
    const esame = c && c.formato === 'esame';
    const det = !c ? t('fn.det0') : esame ? t('fn.det.esame', {n: c.n_domande, k: c.n_kw, s: c.simulazione ? t('fn.det.sim') : ''})
      : t('fn.det', {n: c.n_domande, f: c.formulario ? t('fn.det.f') : '', e: c.esercizi ? t('fn.det.e') : ''});
    const stelle = n => '★'.repeat(Math.max(1, Math.min(3, n || 1))) + '☆'.repeat(3 - Math.max(1, Math.min(3, n || 1)));
    const prev = c ? `<div class="cornell${esame ? ' esame' : ''}">${c.blocchi.map(b => `<div class="q">${esame ? `<span style="color:#ea580c">${stelle(b.stelle)}</span><br>` : ''}${esc(b.domanda)}</div><div class="a">${esc(b.appunto)}</div>`).join('')}${c.riassunto ? `<div class="s"><b>${t('fn.riass')}</b> — ${esc(c.riassunto)}</div>` : ''}</div>` : '';
    h = `<div class="ap-card"><div><span class="pill ${esame ? 'p-warn' : 'p-cor'}">${ico('spark', 13)}${t(esame ? 'fn.esame' : 'fn.cornell')}</span>
      <div style="font-size:19px;font-weight:700;color:var(--ink);margin:8px 0 4px">${inCorso ? t('fn.primi') : t('fn.tuoi')}</div>
      <div class="hint" style="margin-bottom:14px">${esc(det)}${inCorso ? t('fn.altri') : ''}</div>
      <button class="btn b-main" style="width:100%" id="fApri">${ico('doc', 18)}${t('fn.apri')}</button></div>${prev}</div>`;
  } else if (inCorso && R.appunti_on) {
    h = `<div class="row"><span class="ico i-vio"><svg><use href="#i-spark"/></svg></span><div class="sp"><b style="color:var(--ink);font-size:16px">${t(S.formato === 'esame' ? 'fn.claude.e.t' : 'fn.claude.t')}</b>
      <div class="hint">${t('fn.claude')}</div></div><span class="spin"></span></div>`;
  } else {
    h = `<div class="row"><span class="ico i-blue"><svg><use href="#i-zip"/></svg></span><div class="sp"><b style="color:var(--ink);font-size:16px">${t('fn.pac.t')}</b>
      <div class="hint">${t('fn.pac')}</div></div>
      <button class="btn b-main b-sm" id="fApriPac">${ico('folder')}${t('fn.apricart')}</button></div>`;
  }
  if ($('fAp').dataset.h !== h) {
    $('fAp').dataset.h = h; $('fAp').innerHTML = h;
    if ($('fApri')) $('fApri').onclick = () => apriAppunti(null);
    if ($('fApriPac')) $('fApriPac').onclick = () => A.apri_pacchetti();
  }
}
async function apriAppunti(cartella) {
  const l = await A.appunti_di(cartella);
  if (!l.length) { toast(t('ap.non')); return; }
  if (l.length === 1) { A.apri(l[0].file); return; }
  const r = await dialogo({titolo: t('ap.quali'), bottoni: [{t: t('annulla'), v: null}, ...l.map((x, i) => ({t: esc(x.titolo), cls: x.formato === 'esame' ? 'b-pz' : 'b-cor', v: i}))]});
  if (r !== null && r !== false) A.apri(l[r].file);
}

/* ------------------------------------------------------------------ le mie registrazioni */
async function caricaLezioni() {
  LZ = await A.lezioni();
  const n = LZ.lezioni.length;
  $('navCnt').textContent = n; $('navCnt').classList.toggle('hidden', !n);
  disegnaLezioni();
}
function disegnaLezioni() {
  if (!LZ) return;
  const q = $('cerca').value.trim().toLowerCase();
  const L = LZ.lezioni.filter(l => !q || (l.nome + ' ' + l.quando).toLowerCase().includes(q));
  const n = LZ.lezioni.length;
  $('aSub').textContent = n === 1 ? t('ar.sub1') : n ? t('ar.subn', {n}) : t('ar.sub0');
  $('aVid').textContent = LZ.video_testo;
  $('aVidBar').style.width = Math.max(2, Math.min(100, LZ.quota * 100)) + '%';
  $('aVidDel').classList.toggle('hidden', !LZ.video_tot);
  if (!L.length) { $('lista').dataset.h = ''; $('lista').innerHTML = `<div class="card" style="text-align:center;padding:40px 20px;color:var(--mut)">${n ? t('ar.trovata0') : t('ar.vuoto')}</div>`; return; }
  const h = L.map((l, i) => {
    const lg = l.lingua_lezione && l.lingua_lezione !== LINGUA && t('lingue')[l.lingua_lezione] && l.lingua_lezione !== 'auto' ? t('ar.lingua', {l: t('lingue')[l.lingua_lezione]}) : '';
    const meta = [l.quando, l.durata, l.n_slide ? l.n_slide + ' slide' : '', lg, l.importata ? t('ar.importata') : ''].filter(Boolean).join(' · ') +
      (l.video_testo ? ` · <span style="color:#be123c">🎬 ${l.video_testo}</span>` : '');
    let pill, prim = '';
    if (l.stato === 'in_corso') pill = `<span class="pill p-blue"><span class="spin" style="width:12px;height:12px"></span>${t('ar.lav')}</span>`;
    else if (l.stato === 'da_completare') { pill = `<span class="pill p-warn">${t('ar.dacomp')}</span>`; prim = `<button class="btn b-main b-sm" data-a="completa">${ico('redo')}${t('ar.completa')}</button>`; }
    else if (l.n_appunti) { pill = (l.formati || []).map(f => f === 'esame' ? `<span class="pill p-warn">${ico('spark', 12)}${t('fmt.esame')}</span>` : `<span class="pill p-cor">${ico('spark', 12)}${t('fmt.cornell')}</span>`).join(''); prim = `<button class="btn b-main b-sm" data-a="appunti">${ico('doc')}${t('ar.apriap')}</button>`; }
    else if (l.crea_appunti) { pill = `<span class="pill p-blue">${t('ar.pac')}</span>`; prim = `<button class="btn b-cor b-sm" data-a="crea">${ico('spark')}${t('ar.crea')}</button>`; }
    else { pill = `<span class="pill p-blue">${t('ar.pac')}</span>`; prim = `<button class="btn b-main b-sm" data-a="pacchetti">${ico('folder')}${t('ar.cartpac')}</button>`; }
    const rip = l.ripasso && l.ripasso.n && l.stato !== 'in_corso' ? `<button class="btn b-rip b-sm" data-a="ripassa">${ico('cards')}${t('ar.rip', {n: l.ripasso.n})}</button>` : '';
    const chiedi = l.trascritta && l.stato === 'pronta' ? `<button class="btn b-cor b-sm" data-a="chiedi">${ico('chat')}${t('ar.chiedi')}</button>` : '';
    const sec = chiedi + (l.stato === 'pronta' ? `<button class="btn b-ghost b-sm" data-a="tras">${ico('text')}${t('ar.tras')}</button>` + (l.video ? `<button class="btn b-ghost b-sm" data-a="video">${ico('play')}${t('ar.vid')}</button>` : '') : '') + rip;
    const badge = l.stato === 'pronta' ? (l.video ? t('ar.b.video') : t('ar.b.solo')) : l.stato === 'in_corso' ? t('ar.b.corso') : t('ar.b.finire');
    return `<div class="lez" data-i="${LZ.lezioni.indexOf(l)}"><div class="cov c${l.colore}">${esc(l.sigla)}<small>${badge}</small></div>
      <div class="inf"><b title="${esc(l.nome)}">${esc(l.nome)}</b><div class="meta">${meta}</div><div class="acts">${pill}${prim}${sec}</div></div>
      ${l.stato !== 'in_corso' ? `<button class="more" data-a="menu" title="${t('ar.altre')}">⋯</button>` : ''}</div>`;
  }).join('');
  disegnaBanda();
  if ($('lista').dataset.h === h) return;
  $('lista').dataset.h = h; $('lista').innerHTML = h;
  $('lista').querySelectorAll('[data-a]').forEach(b => b.onclick = e => azioneLezione(LZ.lezioni[+b.closest('.lez').dataset.i], b.dataset.a, e));
}
async function azioneLezione(l, a, e) {
  const c = l.cartella;
  if (a === 'appunti') return apriAppunti(c);
  if (a === 'ripassa') return iniziaRipasso([c], l.nome, 'prima');
  if (a === 'chiedi') return apriChiedi(l);
  if (a === 'mappa') return apriMappa(l);
  if (a === 'pdf') return aggiungiPdf(l);
  if (a === 'tras') return A.apri_lezione(c);
  if (a === 'video') return A.apri(l.video);
  if (a === 'pacchetti') return A.apri_pacchetti();
  if (a === 'cartella') return A.apri(c);
  if (a === 'completa') { const r = await A.completa(c); if (!r.ok) toast(r.msg); else { await aggiorna(); vai('reg'); } return; }
  if (a === 'crea') { const r = await A.appunti_mancanti(c, null); if (r.ok) { await aggiorna(); vai('reg'); } return; }
  if (a.startsWith('anche:') || a.startsWith('compl:')) {
    const f = a.split(':')[1];
    if (a.startsWith('anche:')) {
      const st = await A.stima_appunti(c);
      if (!await conferma(t('ar.anche.t', {f: t('fmt.' + f)}), t('ar.anche', {n: l.nome, c: num(st.toFixed(2))}), t('ar.anche.si'), t('annulla'), f === 'esame' ? 'b-pz' : 'b-cor')) return;
    }
    const r = await A.appunti_mancanti(c, f); if (r.ok) { await aggiorna(); vai('reg'); } return;
  }
  if (a === 'rifai') {
    const st = await A.stima_appunti(c);
    if (await conferma(t('ar.rifai.t'), t('ar.rifai.f', {n: l.nome, f: t('fmt.' + R.formato), c: num(st.toFixed(2))}), t('ar.rifai.si'), t('annulla'), 'b-cor')) {
      const r = await A.rifai_appunti(c); if (r.ok) { await aggiorna(); vai('reg'); }
    }
    return;
  }
  if (a === 'rinomina') {
    const r = await dialogo({titolo: t('ar.rin.t'), html: `<input class="in" id="dlgNome" value="${esc(l.nome)}" maxlength="90"><div class="hint" style="margin-top:8px">${t('ar.rin')}</div>`,
      bottoni: [{t: t('annulla'), v: false}, {t: t('salva'), cls: 'b-main', v: true}]});
    if (!r) return;
    const x = await A.rinomina(c, dialogo.valore);
    if (!x.ok) await dialogo({titolo: t('ar.rin.err'), testo: x.msg});
    caricaLezioni();
    return;
  }
  if (a === 'video1') {
    if (await conferma(t('ar.elv.t'), t('ar.elv', {n: l.nome, g: l.video_testo}), t('ar.elv.si'), t('annulla'), 'b-rec')) {
      await A.elimina_video([c]); caricaLezioni();
    }
    return;
  }
  if (a === 'elimina') {
    const r = await dialogo({titolo: t('ar.el.t'), testo: t('ar.el', {n: l.nome, q: l.quando}),
      ck: t('ar.el.ck'), bottoni: [{t: t('annulla'), v: false}, {t: ico('trash') + t('ar.el.si'), cls: 'b-rec', v: true}]});
    if (r.v) { const x = await A.elimina(c, r.ck); if (!x.ok) await dialogo({titolo: t('ar.el.err'), testo: x.msg}); caricaLezioni(); }
    return;
  }
  if (a === 'menu') return menuLezione(l, e.currentTarget || e.target);
}
function menuLezione(l, btn) {
  document.querySelectorAll('.menu').forEach(m => m.remove());
  const m = document.createElement('div'); m.className = 'menu';
  const voci = [];
  if (l.crea_appunti) voci.push(['crea', 'spark', t('ar.m.crea')]);
  (l.crea_anche || []).forEach(f => voci.push(['anche:' + f, 'spark', t('ar.m.anche', {f: t('fmt.' + f)})]));
  (l.completa_appunti || []).forEach(f => voci.push(['compl:' + f, 'spark', t('ar.m.compl', {f: t('fmt.' + f)})]));
  if (l.rifai_appunti) voci.push(['rifai', 'redo', t('ar.m.rifai.x', {f: t('fmt.' + R.formato)})]);
  if (l.trascritta && l.stato === 'pronta') voci.push(['mappa', 'map', t('ar.m.mappa')]);
  if (l.stato === 'pronta' && l.n_pacchetti) voci.push(['pdf', 'pdf', t(l.docente ? 'ar.m.pdf2' : 'ar.m.pdf')]);
  voci.push(['rinomina', 'edit', t('ar.m.rin')], ['cartella', 'folder', t('ar.m.cart')]);
  if (l.video) voci.push(['video1', 'film', t('ar.m.vid', {g: l.video_testo}), 'r']);
  voci.push(['elimina', 'trash', t('ar.m.el'), 'r']);
  m.innerHTML = voci.map(v => (v[3] && !m.dataset.sep ? (m.dataset.sep = 1, '<hr>') : '') + `<button data-a="${v[0]}" class="${v[3] || ''}">${ico(v[1], 16)}${esc(v[2])}</button>`).join('');
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect();
  m.style.top = Math.min(innerHeight - m.offsetHeight - 10, r.bottom + 6) + 'px';
  m.style.left = Math.max(10, r.right - m.offsetWidth) + 'px';
  m.querySelectorAll('button').forEach(b => b.onclick = () => { m.remove(); azioneLezione(l, b.dataset.a); });
  setTimeout(() => document.addEventListener('click', function f(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', f); } }), 0);
}
async function eliminaTuttiVideo() {
  const L = LZ.lezioni.filter(l => l.video);
  if (!L.length) return;
  if (await conferma(t('ar.elt.t'), t('ar.elt', {n: L.length, g: LZ.video_testo}), t('ar.elt.si'), t('annulla'), 'b-rec')) {
    await A.elimina_video(L.map(l => l.cartella)); caricaLezioni();
  }
}

/* ------------------------------------------------------------------ impostazioni */
function disegnaImpostazioni() {
  $('aiA').classList.toggle('on', !!R.appunti_on);
  $('aiB').classList.toggle('on', !R.appunti_on);
  const box = $('chiaveBox');
  if (R.chiave) {
    box.innerHTML = `<div class="key"><span class="pill p-ok">${t('im.k.ok')}</span><span class="sp"></span><button class="btn b-ghost b-sm" id="kCambia">${t('im.k.cambia')}</button><button class="btn b-ghost b-sm b-red" id="kTogli">${t('im.k.togli')}</button></div>`;
    $('kCambia').onclick = () => { R.chiave = false; disegnaImpostazioni(); $('kIn').focus(); };
    $('kTogli').onclick = async () => { if (await conferma(t('im.k.togli.t'), t('im.k.togli.x'), t('im.k.togli'), t('annulla'), 'b-rec')) { await A.togli_chiave(); rileggi(); } };
  } else {
    box.innerHTML = `<div class="key"><input class="in sm" id="kIn" type="password" placeholder="${t('im.k.ph')}" autocomplete="off"><button class="btn b-main b-sm" id="kProva">${t('im.k.prova')}</button></div>
      <div class="hint" style="margin-top:6px">${t('im.k.dove')}</div><div class="esito" id="kEsito"></div>`;
    const prova = async () => {
      $('kEsito').style.color = 'var(--mut)'; $('kEsito').textContent = t('im.k.provo');
      const r = await A.prova_chiave($('kIn').value);
      $('kEsito').style.color = r.ok ? 'var(--ok)' : '#be123c';
      $('kEsito').textContent = (r.ok ? '✓ ' : '✕ ') + r.msg;
      if (r.ok) setTimeout(rileggi, 1200);
    };
    $('kProva').onclick = prova;
    $('kIn').addEventListener('keydown', e => { if (e.key === 'Enter') prova(); });
  }
  $('segDur').querySelectorAll('span').forEach(s => s.classList.toggle('on', +s.dataset.v === R.minuti));
  $('segLingua').querySelectorAll('span').forEach(s => s.classList.toggle('on', s.dataset.l === LINGUA));
  $('fmtBox').querySelectorAll('.aiopt').forEach(o => o.classList.toggle('on', o.dataset.f === R.formato));
  $('swMini').classList.toggle('on', !!R.mini);
  $('swDnd').classList.toggle('on', !!R.dnd);
  $('swDir').classList.toggle('on', !!R.diretta);
  $('impCart').textContent = R.cartella;
  $('impBase').textContent = R.base;
  $('segLingua').querySelectorAll('span').forEach(s => s.onclick = () => cambiaLingua(s.dataset.l));
  $('fmtBox').querySelectorAll('.aiopt').forEach(o => o.onclick = async () => { await A.imposta('formato_appunti', o.dataset.f); await rileggi(); });
  document.querySelectorAll('.dati input').forEach(i => { if (document.activeElement !== i) i.value = (R.studente || {})[i.dataset.k] || ''; });
}
async function sceltaAI(claude) {
  if (claude && !R.chiave) { $('aiA').classList.add('on'); $('aiB').classList.remove('on'); const k = $('kIn'); if (k) k.focus(); return; }
  const r = await A.imposta('appunti_attivi', claude);
  if (!r.ok) toast(r.msg);
  rileggi();
}
async function salvaDati() {
  const d = {};
  document.querySelectorAll('.dati input').forEach(i => d[i.dataset.k] = i.value.trim());
  await A.imposta('studente', d);
  R.studente = d;
}

/* ------------------------------------------------------------------ guida */
let linguaGuida = null;
function disegnaGuida(l) {
  linguaGuida = l;
  const G = GUIDA[l] || GUIDA.it;
  $('gT').textContent = G.titolo; $('gS').textContent = G.sotto;
  const aperti = [...document.querySelectorAll('#gCap details')].map(d => d.open);
  $('gCap').innerHTML = G.capitoli.map((c, i) => `<details class="cap${c.perche ? ' perche' : ''}"${(aperti.length ? aperti[i] : i === 0) ? ' open' : ''}><summary><span class="n">${c.perche ? '★' : i}</span><span class="ico ${c.perche ? 'i-vio' : 'i-blue'}">${ico(c.ico)}</span>${esc(c.t)}${c.v ? `<span class="pill p-blue gvp">${ico('play', 11)}video</span>` : ''}<span class="fr">›</span></summary>${c.v ? `<video class="gv" src="video/${c.v}-${l}.webm" controls muted playsinline preload="metadata"></video>` : ''}<${c.perche ? 'ul' : 'ol'}>${c.p.map(x => `<li>${x}</li>`).join('')}</${c.perche ? 'ul' : 'ol'}></details>`).join('');
  // aprendo un capitolo il suo video parte da capo; chiudendolo si ferma
  $('gCap').querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
    const v = d.querySelector('video'); if (!v) return;
    if (d.open) { try { v.currentTime = 0; v.play().catch(() => {}); } catch (e) {} } else v.pause();
  }));
  $('segGuida').querySelectorAll('span').forEach(s => s.classList.toggle('on', s.dataset.l === l));
}

/* ------------------------------------------------------------------ in aula (microfono) */
let PDFA = null, MICS = null, micOcc = false;
async function disegnaModo() {
  const aula = R.modo === 'aula';
  $('doveBox').querySelectorAll('.aiopt').forEach(o => o.classList.toggle('on', o.dataset.m === (aula ? 'aula' : 'online')));
  $('srcAula').classList.toggle('hidden', !aula);
  $('srcOnline').classList.toggle('hidden', aula);
  $('prP').textContent = t(aula ? 'pr.p.aula' : 'pr.p');
  $('prPrima').textContent = t(aula ? 'pr.prima.aula' : 'pr.prima');
  $('pdfTxt').textContent = PDFA ? `${PDFA.nome} · ${t('dc.pag', {p: PDFA.pagine, mb: num(PDFA.mb)})}` : t('src.pdf.s');
  $('pdfTxt').className = PDFA ? 'okt' : 'mutt';
  $('btnPdfA').textContent = PDFA ? t('dc.cambia') : t('src.pdf.b');
  $('btnPdfX').classList.toggle('hidden', !PDFA);
  if (aula && MICS === null) {
    MICS = await A.microfoni();
    const sel = $('selMic');
    sel.innerHTML = MICS.length ? MICS.map(m => `<option value="${esc(m.id)}">${esc(m.predefinito ? t('src.mic.pred', {n: m.nome}) : m.nome)}</option>`).join('')
      : `<option value="">${esc(t('src.mic.no'))}</option>`;
    const scelto = MICS.find(m => m.id === R.microfono) || MICS.find(m => m.predefinito);
    if (scelto) sel.value = scelto.id;
  }
}
function livelloMic() {
  if (micOcc || pagina !== 'reg' || R.modo !== 'aula' || S.registro || S.occupato || (S.vista || 'pronto') !== 'pronto' || IV) return;
  micOcc = true;
  A.livello_microfono($('selMic').value || null).then(x => {
    const n = x < 0 ? 0 : Math.round(Math.min(1, Math.sqrt(x) * 1.6) * 10);
    $('micLiv').innerHTML = Array.from({length: 10}, (_, i) => `<i class="${i < n ? 'on' : ''}" style="height:${6 + i * 1.4}px"></i>`).join('');
  }).finally(() => { micOcc = false; });
}
setInterval(() => { if (A) livelloMic(); }, 600);

/* ------------------------------------------------------------------ testo in diretta */
function disegnaDiretta() {
  $('dirCard').classList.toggle('hidden', !S.diretta_on);
  if (!S.diretta_on) return;
  const D = S.diretta || [];
  const h = (D.length ? D.map(d => `<p><span class="o">${hms(d.t)}</span>${esc(d.testo)}</p>`).join('') : `<p class="ult">${t('lv.dir.att')}</p>`)
    + (S.diretta_lav ? `<p class="ult">${t('lv.dir.lav')}</p>` : '');
  const b = $('dirTxt');
  if (b.dataset.h === h) return;
  const giu = b.scrollTop + b.clientHeight >= b.scrollHeight - 30;
  b.dataset.h = h; b.innerHTML = h;
  if (giu) b.scrollTop = b.scrollHeight;
}

/* ------------------------------------------------------------------ parole difficili */
let PW = {materia: null};
async function disegnaParole(materia) {
  const r = await A.parole(materia || PW.materia || null);
  PW = r;
  const mats = r.materie.length ? r.materie : [];
  $('pwMat').innerHTML = mats.map(m => `<span class="chip${m === r.materia ? ' on' : ''}" data-m="${esc(m)}">${esc(m)}</span>`).join('') + `<span class="chip" id="pwNuova">${esc(t('pw.nuova'))}</span>`;
  $('pwMat').querySelectorAll('.chip[data-m]').forEach(c => c.onclick = () => disegnaParole(c.dataset.m));
  $('pwNuova').onclick = async () => {
    const ok = await dialogo({titolo: t('pw.nuova.t'), html: `<input class="in" maxlength="60"><div class="hint" style="margin-top:8px">${esc(t('pw.nuova.s'))}</div>`,
      bottoni: [{t: t('annulla'), v: false}, {t: t('salva'), cls: 'b-main', v: true}]});
    const m = (dialogo.valore || '').trim();
    if (ok && m) { PW = {materia: m, parole: [], proposte: [], materie: [...mats, m]}; disegnaParole(m); }
  };
  const vuoto = !r.materia;
  $('pwIn').disabled = $('pwAgg').disabled = vuoto;
  $('pwTags').innerHTML = vuoto ? `<span class="hint">${esc(t('pw.nomat'))}</span>`
    : r.parole.length ? r.parole.map((w, i) => `<span class="tag2">${esc(w)}<b data-i="${i}" title="${esc(t('togli'))}">×</b></span>`).join('')
    : `<span class="hint">${esc(t('pw.vuoto', {m: r.materia}))}</span>`;
  $('pwTags').querySelectorAll('b[data-i]').forEach(b => b.onclick = () => salvaParole(PW.parole.filter((_, i) => i !== +b.dataset.i)));
  $('pwProp').innerHTML = r.proposte && r.proposte.length ? `<div class="lbl" style="margin-top:14px">${esc(t('pw.prop', {m: r.materia}))}</div><div class="tags">` +
    r.proposte.map(w => `<span class="tag2 prop" data-w="${esc(w)}">+ ${esc(w)}</span>`).join('') + '</div>' : '';
  $('pwProp').querySelectorAll('.prop').forEach(e => e.onclick = () => salvaParole([...PW.parole, e.dataset.w]));
}
async function salvaParole(lista) {
  if (!PW.materia) return;
  await A.salva_parole(PW.materia, lista);
  await disegnaParole(PW.materia);
  R.parole_n = (R.parole_n || 0);
}
function aggiungiParola() {
  const w = $('pwIn').value.trim();
  if (!w) return;
  $('pwIn').value = '';
  salvaParole([...PW.parole, ...w.split(/[,;]/).map(x => x.trim()).filter(Boolean)]);
}

/* ------------------------------------------------------------------ chiedi alla lezione */
let CH = {lez: null, cartelle: [], storia: [], tutta: false, materia: null, nomi: []};
function lezioniMateria(l) {
  return (LZ ? LZ.lezioni : []).filter(x => x.trascritta && x.stato === 'pronta' && x.materia.toLowerCase() === l.materia.toLowerCase());
}
async function apriChiedi(l) {
  CH = {lez: l, cartelle: [l.cartella], storia: await A.chiedi_storia(l.cartella), tutta: false, materia: l.materia, nomi: [l.nome]};
  const altre = lezioniMateria(l);
  $('chSeg').classList.toggle('hidden', altre.length < 2);
  $('chSeg').innerHTML = `<span data-x="0" class="on">${esc(t('ch.questa'))}</span><span data-x="1">${esc(t('ch.tutta', {m: l.materia}))}</span>`;
  $('chSeg').querySelectorAll('span').forEach(sp => sp.onclick = async () => {
    const tutta = sp.dataset.x === '1';
    $('chSeg').querySelectorAll('span').forEach(x => x.classList.toggle('on', x === sp));
    CH.tutta = tutta;
    const L = tutta ? lezioniMateria(l) : [l];
    CH.cartelle = L.map(x => x.cartella); CH.nomi = L.map(x => x.nome);
    CH.storia = tutta ? [] : await A.chiedi_storia(l.cartella);
    disegnaChiedi();
  });
  vai('chiedi'); disegnaChiedi();
  setTimeout(() => $('chIn').focus(), 50);
}
function testoRisposta(x) {
  let h = esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  return h.replace(/\[\[\s*(?:L(\d+)\s+)?(?:slide\s*(\d+)|(\d{1,2}:\d{2}(?::\d{2})?))\s*\]\]/gi, (m, li, sl, tm) => {
    const i = li ? +li - 1 : 0;
    let sec = 0;
    if (tm) { const p = tm.split(':').map(Number); sec = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }
    const nome = li && CH.nomi[i] ? '«' + (CH.nomi[i].split(' – ').slice(-1)[0]) + '» · ' : '';
    const et = sl ? 'slide ' + sl : sec >= 60 ? t('ch.min', {m: Math.floor(sec / 60)}) : ms(sec);
    return `<button class="cita" data-i="${i}" data-s="${sl || ''}" data-t="${sec}">▶ ${esc(nome)}${et}</button>`;
  });
}
function disegnaChiedi() {
  const L = CH.lez;
  $('chSub').textContent = CH.tutta ? `${CH.materia} · ${t('ch.lezioni', {n: CH.cartelle.length})}` : `${L.nome} · ${L.quando}`;
  const h = CH.storia.length ? CH.storia.map(m => m.chi === 'io' ? `<div class="msg io">${esc(m.testo)}</div>`
    : m.chi === 'att' ? `<div class="msg cl"><span class="spin" style="width:14px;height:14px;vertical-align:-2px"></span> ${esc(t('ch.pensa'))}</div>`
    : m.chi === 'err' ? `<div class="msg cl" style="color:#be123c">⚠ ${esc(m.testo)}</div>`
    : `<div class="msg cl">${testoRisposta(m.testo)}</div>`).join('')
    : `<div class="msg vuoto">${esc(t('ch.vuoto'))}</div>`;
  $('chat').innerHTML = h;
  $('chat').querySelectorAll('.cita').forEach(b => b.onclick = () => mostraMomento(CH.cartelle[+b.dataset.i] || CH.cartelle[0], +b.dataset.t, b.dataset.s ? +b.dataset.s : null, CH.nomi[+b.dataset.i] || ''));
  $('chat').scrollTop = $('chat').scrollHeight;
}
async function inviaDomanda() {
  const q = $('chIn').value.trim();
  if (!q || CH.storia.some(m => m.chi === 'att')) return;
  $('chIn').value = '';
  const prima = CH.storia.filter(m => m.chi === 'io' || m.chi === 'cl');
  CH.storia = [...prima, {chi: 'io', testo: q}, {chi: 'att'}];
  disegnaChiedi();
  const r = await A.chiedi(CH.cartelle, prima, q);
  CH.storia = CH.storia.filter(m => m.chi !== 'att');
  CH.storia.push(r.ok ? {chi: 'cl', testo: r.testo} : {chi: 'err', testo: r.msg});
  disegnaChiedi();
}
async function mostraMomento(cartella, sec, slide, nome) {
  const [m, url] = await Promise.all([A.momento(cartella, sec, slide), A.video_url(cartella)]);
  const frasi = m.frasi.map(f => `<p><span class="o">${f.ora}</span>${esc(f.testo)}</p>`).join('');
  const html = `<div class="mom">${url ? `<video id="momV" controls preload="auto" src="${esc(url)}#t=${m.sec}"></video><div class="hint hidden" id="momErr" style="margin:6px 0">${esc(t('mom.novid'))}</div>` : `<div class="hint" style="margin-bottom:8px">${esc(t('mom.novid'))}</div>`}
    ${m.img && !url ? `<img src="${m.img}" alt="">` : ''}<div class="frasi">${frasi}</div></div>`;
  const tit = `${nome ? nome + ' · ' : ''}${m.slide ? 'slide ' + m.slide + ' · ' : ''}${m.ora}`;
  setTimeout(() => {
    const v = $('momV');
    if (!v) return;
    v.addEventListener('loadedmetadata', () => { try { v.currentTime = m.sec; v.play().catch(() => {}); } catch (e) {} }, {once: true});
    v.addEventListener('error', () => { v.remove(); $('momErr').classList.remove('hidden'); if (m.img) $('momErr').insertAdjacentHTML('afterend', `<img src="${m.img}" alt="">`); }, {once: true});
  }, 0);
  await dialogo({titolo: tit, html, bottoni: url ? [{t: t('mom.apri'), cls: 'b-ghost', fn: () => A.apri(LZ.lezioni.find(x => x.cartella === cartella)?.video || '')}, {t: t('chiudi'), cls: 'b-main', v: true}] : null});
}

/* ------------------------------------------------------------------ mappa mentale */
let MP = {lez: null, dati: null};
const COLORI_MAPPA = ['#0369a1', '#7c3aed', '#c2410c', '#059669', '#be123c', '#0891b2'];
async function apriMappa(l, rifai = false) {
  MP = {lez: l, dati: null};
  $('mpSub').textContent = `${l.nome} · ${l.quando}`;
  $('mpBox').innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('mp.lav'))}</div>`;
  vai('mappa');
  const r = await A.mappa(l.cartella, rifai);
  if (MP.lez !== l) return;
  if (!r.ok) { $('mpBox').innerHTML = `<div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>`; return; }
  MP.dati = r.mappa;
  disegnaMappa();
  if (r.nuova) caricaLezioni();
}
function disposizione(d, W = 900) {
  const rami = d.rami || [], meta = Math.ceil(rami.length / 2);
  const dx = rami.slice(0, meta), sx = rami.slice(meta);
  const alt = r => 44 + 30 * r.foglie.length;
  const somma = g => g.reduce((a, r) => a + alt(r) + 26, 0);
  const H = Math.max(somma(dx), somma(sx), 260) + 20;
  const out = [];
  [[1, dx], [-1, sx]].forEach(([lato, g]) => {
    let y = (H - (somma(g) - 26)) / 2;
    g.forEach(r => { out.push({x: W / 2 + lato * W * 0.31, y: y + 20, lato, ramo: r}); y += alt(r) + 26; });
  });
  return {W, H, cx: W / 2, cy: H / 2, rami: out};
}
function disegnaMappa() {
  const d = MP.dati, D = disposizione(d);
  const g = [`<svg viewBox="0 0 ${D.W} ${D.H}" font-family="Segoe UI,system-ui,sans-serif"><defs><linearGradient id="gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0369a1"/><stop offset="1" stop-color="#0d4275"/></linearGradient></defs>`];
  D.rami.forEach((r, i) => {
    const c = COLORI_MAPPA[i % 6], x1 = r.x - r.lato * 110;
    g.push(`<path d="M${D.cx} ${D.cy} C ${(D.cx + x1) / 2} ${D.cy}, ${(D.cx + x1) / 2} ${r.y}, ${x1} ${r.y}" stroke="${c}" stroke-width="3" fill="none" opacity=".55"/>`);
  });
  const cw = Math.max(160, Math.min(260, d.centro.length * 11 + 40));
  g.push(`<rect x="${D.cx - cw / 2}" y="${D.cy - 28}" width="${cw}" height="56" rx="28" fill="url(#gc)"/><text x="${D.cx}" y="${D.cy + 6}" text-anchor="middle" fill="#fff" font-size="18" font-weight="700">${esc(d.centro)}</text>`);
  D.rami.forEach((r, i) => {
    const c = COLORI_MAPPA[i % 6];
    g.push(`<rect x="${r.x - 110}" y="${r.y - 20}" width="220" height="40" rx="12" fill="#fff" stroke="${c}" stroke-width="2"/><text x="${r.x}" y="${r.y + 5}" text-anchor="middle" fill="${c}" font-size="14" font-weight="700">${esc(corto(r.ramo.titolo, 28))}</text>`);
    r.ramo.foglie.forEach((f, j) => {
      const yy = r.y + 42 + j * 30;
      g.push(`<rect x="${r.x - 115}" y="${yy - 12}" width="230" height="24" rx="12" fill="${c}" fill-opacity=".08"/><text x="${r.x}" y="${yy + 4}" text-anchor="middle" fill="#26354a" font-size="12.5"><title>${esc(f)}</title>${esc(corto(f, 36))}</text>`);
    });
  });
  g.push('</svg>');
  $('mpBox').innerHTML = g.join('');
}
const corto = (x, n) => (x = String(x || '')).length > n ? x.slice(0, n - 1) + '…' : x;

/* ------------------------------------------------------------------ slide del docente (PDF) */
async function aggiungiPdf(l) {
  if (S.registro || S.occupato) { toast(t('aspetta')); return; }
  const f = await A.scegli_pdf();
  if (!f.ok) { if (f.msg) await dialogo({titolo: t('dc.t'), testo: f.msg}); return; }
  const conAppunti = (l.formati || []).length > 0 && R.chiave;
  const c = conAppunti ? await A.stima_docente(l.cartella) : 0;
  const html = `<div class="file" style="margin-bottom:12px"><span class="ico i-vio"><svg><use href="#i-pdf"/></svg></span><div class="sp"><b style="color:var(--ink)">${esc(f.nome)}</b><div class="hint">${esc(t('dc.pag', {p: f.pagine, mb: num(f.mb)}))}</div></div></div>`;
  const ok = await dialogo({titolo: t('dc.t'), html: html + `<div class="tx">${esc(conAppunti ? t('dc.testo', {n: l.nome, c: num(c.toFixed(2))}) : t('dc.testo0', {n: l.nome}))}</div>`,
    bottoni: [{t: t('annulla'), v: false}, {t: t(conAppunti ? 'dc.si' : 'dc.si0'), cls: 'b-cor', v: true}]});
  if (!ok) return;
  toast(t('dc.lav'));
  const r = await A.aggiungi_docente(l.cartella, f.percorso);
  if (!r.ok) { await dialogo({titolo: t('dc.t'), testo: r.msg || ''}); return; }
  if (r.solo_pacchetti) { toast(t('dc.ok0')); caricaLezioni(); return; }
  await aggiorna(); vai('reg');
}

function collegaNovita() {
  $('doveBox').querySelectorAll('.aiopt').forEach(o => o.onclick = async () => { await A.imposta('modo', o.dataset.m); R.modo = o.dataset.m; disegnaModo(); });
  $('selMic').onchange = () => { A.imposta('microfono', $('selMic').value); R.microfono = $('selMic').value; };
  $('btnPdfA').onclick = async () => { const f = await A.scegli_pdf(); if (f.ok) { PDFA = f; disegnaModo(); } else if (f.msg) toast(f.msg); };
  $('btnPdfX').onclick = () => { PDFA = null; disegnaModo(); };
  $('swDir').onclick = async () => { await A.imposta('diretta', !R.diretta); await rileggi(); };
  $('pwIn').addEventListener('keydown', e => { if (e.key === 'Enter') aggiungiParola(); });
  $('pwAgg').onclick = aggiungiParola;
  $('chVai').onclick = inviaDomanda;
  $('chIn').addEventListener('keydown', e => { if (e.key === 'Enter') inviaDomanda(); });
  $('chNuova').onclick = async () => { if (!CH.tutta) await A.chiedi_cancella(CH.lez.cartella); CH.storia = []; disegnaChiedi(); };
  $('mpPdf').onclick = async () => { if (!MP.dati) return; const r = await A.mappa_pdf(MP.lez.cartella, false); if (r.ok) toast(t('mp.salvata')); };
  $('mpStampa').onclick = async () => { if (MP.dati) await A.mappa_pdf(MP.lez.cartella, true); };
  $('mpRifai').onclick = async () => { if (MP.lez && await conferma(t('mp.rifai.t'), t('mp.rifai.c'))) apriMappa(MP.lez, true); };
}

/* ------------------------------------------------------------------ ripasso (flashcard) */
// Le domande sono quelle gia' negli appunti: niente Claude, niente costi.
let materiaRip = null;
let RP = {carte: [], i: 0, ok: 0, no: [], titolo: '', cartelle: []};
function materieRip() {
  const M = [];
  (LZ ? LZ.lezioni : []).forEach(l => {
    if (!l.ripasso || !l.ripasso.n || l.stato === 'in_corso') return;
    let m = M.find(x => x.m.toLowerCase() === l.materia.toLowerCase());
    if (!m) M.push(m = {m: l.materia, cartelle: [], n: 0, no: 0, tre: 0});
    m.cartelle.push(l.cartella); m.n += l.ripasso.n; m.no += l.ripasso.no; m.tre += l.ripasso.tre;
  });
  return M;
}
function disegnaBanda() {
  const M = materieRip();
  let h = '';
  if (M.length) {
    const m = M.find(x => x.m === materiaRip) || M[0];
    materiaRip = m.m;
    const det = [m.cartelle.length === 1 ? t('rp.lez1') : t('rp.lezn', {n: m.cartelle.length}), t('rp.dom', {n: m.n})];
    if (m.no) det.push(t('rp.dariv', {n: m.no}));
    h = `<div class="banda"><span class="ico">${ico('cards')}</span><div class="sp"><b style="color:var(--ink);font-size:15px">${t('rp.banda.t')}</b><div class="hint">${esc(m.m)}: ${esc(det.join(' · '))}</div>
      ${M.length > 1 ? `<div class="chips">${M.slice(0, 6).map(x => `<span class="chip${x.m === m.m ? ' on' : ''}" data-m="${esc(x.m)}">${esc(x.m)}</span>`).join('')}</div>` : ''}</div>
      <button class="btn b-rip" id="bandaVai">${ico('cards')}${esc(t('rp.vai', {m: m.m}))}</button></div>`;
  }
  const b = $('ripBanda');
  if (b.dataset.h === h) return;
  b.dataset.h = h; b.innerHTML = h;
  b.querySelectorAll('.chip').forEach(c => c.onclick = () => { materiaRip = c.dataset.m; disegnaBanda(); });
  if ($('bandaVai')) $('bandaVai').onclick = () => sceltaRipasso(M.find(x => x.m === materiaRip) || M[0]);
}
let modoRip = 'prima';
function sceltaRipasso(m) {
  modoRip = 'prima';
  $('rpH').textContent = t('rp.h', {m: m.m});
  const modi = [['prima', t('rp.m.prima.t'), t('rp.m.prima')], ['tutte', t('rp.m.tutte.t'), t('rp.m.tutte', {n: m.n})],
    ['stelle', t('rp.m.stelle.t'), m.tre ? t('rp.m.stelle', {n: m.tre}) : t('rp.m.stelle0'), !m.tre]];
  $('rpModi').innerHTML = modi.map(x => `<div class="aiopt${x[0] === modoRip ? ' on' : ''}${x[3] ? ' off' : ''}" data-m="${x[0]}"><span class="rd"></span><b>${esc(x[1])}</b><small>${esc(x[2])}</small></div>`).join('');
  $('rpModi').querySelectorAll('.aiopt').forEach(o => o.onclick = () => { modoRip = o.dataset.m; $('rpModi').querySelectorAll('.aiopt').forEach(x => x.classList.toggle('on', x === o)); });
  $('rpVia').onclick = () => iniziaRipasso(m.cartelle, m.m, modoRip);
  $('rpAnnulla').onclick = () => vai('arch');
  mostraRip('rpScelta'); vai('rip');
}
function mostraRip(id) { ['rpScelta', 'rpCarte', 'rpRis'].forEach(x => $(x).classList.toggle('hidden', x !== id)); }
async function iniziaRipasso(cartelle, titolo, modo) {
  const r = await A.ripasso(cartelle, modo);
  if (!r.ok || !r.carte.length) { toast(t('rp.vuoto')); return; }
  RP = {carte: r.carte, i: 0, ok: 0, no: [], titolo, cartelle};
  $('rpH2').textContent = t('rp.h', {m: titolo});
  mostraRip('rpCarte'); vai('rip'); cartaRip();
}
function cartaRip() {
  const c = RP.carte[RP.i], n = RP.carte.length;
  $('carta').classList.remove('giro'); $('voto').classList.remove('on');
  $('cSt').textContent = c.stelle ? '★'.repeat(c.stelle) + '☆'.repeat(3 - c.stelle) : '';
  $('cD').textContent = c.domanda;
  const ori = [c.lezione]; if (c.slide_n) ori.push('slide ' + c.slide_n); else if (c.dove) ori.push(c.dove);
  if (c.minuto) ori.push(t('rp.min', {m: c.minuto}));
  $('cO').textContent = ori.join(' · ');
  $('cTit').textContent = c.formato === 'esame' ? t('rp.schema') : t('rp.risp');
  $('cSc').innerHTML = c.schema.map(x => `<li>${esc(x)}</li>`).join('');
  $('cK').innerHTML = c.parole.map(x => `<span class="kw">${esc(x)}</span>`).join('');
  $('cSl').innerHTML = c.img ? `<img src="${c.img}" alt=""><div class="hint">${esc(ori.join(' · '))}</div>` : '';
  $('cE').style.display = c.errore ? '' : 'none'; $('cE').textContent = t('rp.err', {e: c.errore});
  $('rpN').textContent = t('rp.n', {i: RP.i + 1, n}); $('rpBar').style.width = (RP.i / n * 100) + '%'; $('rpOk').textContent = '✓ ' + RP.ok;
  $('rpSub').textContent = t('rp.sub', {n});
}
function giraRip() { $('carta').classList.toggle('giro'); $('voto').classList.add('on'); }
function votoRip(v) {
  if (RP.i >= RP.carte.length) return;
  const c = RP.carte[RP.i];
  A.ripasso_voto(c.cartella, c.id, !!v);
  if (v) RP.ok++; else RP.no.push(c);
  RP.i++;
  if (RP.i >= RP.carte.length) fineRip(); else cartaRip();
}
function fineRip() {
  const n = RP.i;
  if (!n) { vai('arch'); return; }
  $('rN').textContent = RP.ok + '/' + n; $('anello').style.setProperty('--p', (RP.ok / n * 100) + '%');
  $('rT').textContent = RP.ok === n ? t('rp.r.tutte') : RP.ok >= n / 2 ? t('rp.r.bene') : t('rp.r.dai');
  $('rL').innerHTML = RP.no.length ? `<div class="lbl">${t('rp.r.lista')}</div>` + RP.no.map(c => `<div>${esc(c.domanda)}<span class="hint" style="display:block">${esc(c.lezione)}${c.slide_n ? ' · slide ' + c.slide_n : ''}</span></div>`).join('') : '';
  $('rAncora').classList.toggle('hidden', !RP.no.length);
  mostraRip('rpRis');
}
function collegaRipasso() {
  $('carta').onclick = giraRip;
  $('vNo').onclick = () => votoRip(0); $('vSi').onclick = () => votoRip(1);
  $('rpBasta').onclick = fineRip;
  $('rFine').onclick = () => vai('arch');
  $('rAncora').onclick = () => { RP = {...RP, carte: RP.no.slice(), i: 0, ok: 0, no: []}; mostraRip('rpCarte'); cartaRip(); };
  document.addEventListener('keydown', e => {
    if (pagina !== 'rip' || $('rpCarte').classList.contains('hidden') || document.querySelector('.velo')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); giraRip(); }
    else if (e.key === 'ArrowLeft' && $('voto').classList.contains('on')) votoRip(0);
    else if (e.key === 'ArrowRight' && $('voto').classList.contains('on')) votoRip(1);
  });
}

/* ------------------------------------------------------------------ aggiornamenti */
function disegnaAgg() {
  const g = S.agg || {};
  let h = '';
  if (g.tipo === 'cerco') h = `<div class="card row" style="padding:12px 14px"><span class="spin"></span><span>${esc(g.testo)}</span></div>`;
  else if (g.tipo === 'ok') h = `<div class="card row" style="padding:12px 14px"><span class="pill p-ok">✓</span><span class="sp">${esc(g.testo)}</span><button class="lnk" id="aggX">${t('chiudi')}</button></div>`;
  else if (g.tipo === 'msg') h = `<div class="card row" style="padding:12px 14px"><span class="sp">${esc(g.testo)}</span><button class="lnk" id="aggX">${t('chiudi')}</button></div>`;
  else if (g.tipo === 'trovato') {
    const d = g.dato;
    const nov = (LINGUA === 'en' && d.novita_en) ? d.novita_en : (d.novita || '');
    h = `<div class="card" style="padding:14px 16px;border-color:#bae6fd"><b style="color:var(--ink)">${esc(t('ag.c', {v: d.versione}))}</b>
      <div class="hint" style="margin:4px 0 10px">${esc(nov)}${d.completo ? '<br>' + t('ag.completo') : ''}</div>
      <div class="row"><span class="sp"></span><button class="btn b-ghost b-sm" id="aggX">${t('ag.tardi')}</button><button class="btn b-main b-sm" id="aggOk">${d.completo ? t('ag.pagina') : t('ag.installa')}</button></div></div>`;
  } else if (g.tipo === 'scarico') h = `<div class="card" style="padding:12px 14px">${t('ag.scarico', {p: Math.round((g.perc || 0) * 100)})}<div class="bar"><i style="width:${(g.perc || 0) * 100}%"></i></div></div>`;
  else if (g.tipo === 'fatto') h = `<div class="card row" style="padding:12px 14px"><span class="pill p-ok">✓</span><span>${esc(g.testo)}</span></div>`;
  const b = $('aggBox');
  if (b.dataset.h === h) return;
  b.dataset.h = h; b.innerHTML = h;
  if ($('aggX')) $('aggX').onclick = () => A.chiudi_agg();
  if ($('aggOk')) $('aggOk').onclick = () => A.installa_aggiornamento();
}
