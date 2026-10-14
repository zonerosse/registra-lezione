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
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.p === p));
  ['pronto', 'reg', 'fine', 'arch', 'imp', 'info'].forEach(x => $('v-' + x).classList.add('hidden'));
  if (p === 'reg') $('v-' + (S.vista || 'pronto')).classList.remove('hidden');
  else $('v-' + p).classList.remove('hidden');
  $('main').scrollTop = 0;
  if (p === 'arch') caricaLezioni();
  if (p === 'imp') disegnaImpostazioni();
  if (p === 'info') disegnaAgg();
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
    if (!v.audio_ok && !await conferma(t('in.audio.t'), t('in.audio'), t('in.audio.si'), t('annulla'))) return;
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
    const r = await A.avvia($('nome').value);
    if (r.ok) { $('nome').value = ''; await aggiorna(); }
  } finally { $('btnRec').disabled = false; }
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
  $('fTit').textContent = pronto ? t('fn.ok') : t('fn.lav');
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
    h = `<div class="row"><span class="ico i-vio"><svg><use href="#i-spark"/></svg></span><div class="sp"><b style="color:var(--ink);font-size:16px">${t(R.formato === 'esame' ? 'fn.claude.e.t' : 'fn.claude.t')}</b>
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
  const r = await dialogo({titolo: t('ap.quali'), bottoni: [{t: t('annulla'), v: null}, ...l.map((x, i) => ({t: esc(x.titolo), cls: 'b-main', v: i}))]});
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
    const meta = [l.quando, l.durata, l.n_slide ? l.n_slide + ' slide' : '', lg].filter(Boolean).join(' · ') +
      (l.video_testo ? ` · <span style="color:#be123c">🎬 ${l.video_testo}</span>` : '');
    let pill, prim = '';
    if (l.stato === 'in_corso') pill = `<span class="pill p-blue"><span class="spin" style="width:12px;height:12px"></span>${t('ar.lav')}</span>`;
    else if (l.stato === 'da_completare') { pill = `<span class="pill p-warn">${t('ar.dacomp')}</span>`; prim = `<button class="btn b-main b-sm" data-a="completa">${ico('redo')}${t('ar.completa')}</button>`; }
    else if (l.n_appunti) { pill = l.formato === 'esame' ? `<span class="pill p-warn">${ico('spark', 12)}${t('ar.esame')}</span>` : `<span class="pill p-cor">${ico('spark', 12)}${t('ar.cornell')}</span>`; prim = `<button class="btn b-main b-sm" data-a="appunti">${ico('doc')}${t('ar.apriap')}</button>`; }
    else if (l.crea_appunti) { pill = `<span class="pill p-blue">${t('ar.pac')}</span>`; prim = `<button class="btn b-cor b-sm" data-a="crea">${ico('spark')}${t('ar.crea')}</button>`; }
    else { pill = `<span class="pill p-blue">${t('ar.pac')}</span>`; prim = `<button class="btn b-main b-sm" data-a="pacchetti">${ico('folder')}${t('ar.cartpac')}</button>`; }
    const sec = l.stato === 'pronta' ? `<button class="btn b-ghost b-sm" data-a="tras">${ico('text')}${t('ar.tras')}</button>` + (l.video ? `<button class="btn b-ghost b-sm" data-a="video">${ico('play')}${t('ar.vid')}</button>` : '') : '';
    const badge = l.stato === 'pronta' ? (l.video ? t('ar.b.video') : t('ar.b.solo')) : l.stato === 'in_corso' ? t('ar.b.corso') : t('ar.b.finire');
    return `<div class="lez" data-i="${LZ.lezioni.indexOf(l)}"><div class="cov c${l.colore}">${esc(l.sigla)}<small>${badge}</small></div>
      <div class="inf"><b title="${esc(l.nome)}">${esc(l.nome)}</b><div class="meta">${meta}</div><div class="acts">${pill}${prim}${sec}</div></div>
      ${l.stato !== 'in_corso' ? `<button class="more" data-a="menu" title="${t('ar.altre')}">⋯</button>` : ''}</div>`;
  }).join('');
  if ($('lista').dataset.h === h) return;
  $('lista').dataset.h = h; $('lista').innerHTML = h;
  $('lista').querySelectorAll('[data-a]').forEach(b => b.onclick = e => azioneLezione(LZ.lezioni[+b.closest('.lez').dataset.i], b.dataset.a, e));
}
async function azioneLezione(l, a, e) {
  const c = l.cartella;
  if (a === 'appunti') return apriAppunti(c);
  if (a === 'tras') return A.apri_lezione(c);
  if (a === 'video') return A.apri(l.video);
  if (a === 'pacchetti') return A.apri_pacchetti();
  if (a === 'cartella') return A.apri(c);
  if (a === 'completa') { const r = await A.completa(c); if (!r.ok) toast(r.msg); else { await aggiorna(); vai('reg'); } return; }
  if (a === 'crea') { const r = await A.appunti_mancanti(c); if (r.ok) { await aggiorna(); vai('reg'); } return; }
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
  if (l.rifai_appunti) voci.push(['rifai', 'redo', t('ar.m.rifai.f', {f: t('fmt.' + R.formato)})]);
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
