/* Registra Lezione — la pagina parla con Python tramite window.pywebview.api */
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico = (n, w) => `<svg${w ? ` width="${w}" height="${w}"` : ''}><use href="#i-${n}"/></svg>`;
const due = n => String(n).padStart(2, '0');
const hms = s => due(Math.floor(s / 3600)) + ':' + due(Math.floor(s / 60) % 60) + ':' + due(s % 60);
const ms = s => due(Math.floor(s / 60)) + ':' + due(s % 60);
const virgola = x => String(x).replace('.', ',');
const gb = x => x >= 0.1 ? virgola(x.toFixed(1)) + ' GB' : Math.round(x * 1000) + ' MB';
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
  const msg = ['Avvio…', 'Preparo la registrazione…', 'Controllo l\'audio del PC…', 'Quasi pronto…'];
  const anim = setInterval(() => { p = Math.min(92, p + (92 - p) * 0.08); $('splBar').style.width = p + '%'; $('splTxt').textContent = msg[Math.min(3, Math.floor(p / 25))]; }, 120);
  while (true) {
    let r = {};
    try { r = await A.pronto(); } catch (e) { r = {}; }
    if (r.errore) { clearInterval(anim); $('splErr').textContent = 'Il programma non è partito: ' + r.errore; $('splErr').classList.remove('hidden'); return; }
    if (r.pronto) break;
    await pausa(150);
  }
  clearInterval(anim);
  $('splBar').style.width = '100%'; $('splTxt').textContent = 'Pronto!';
  await pausa(Math.max(250, 1100 - (Date.now() - t0)));
  R = await A.riepilogo();
  inizializza();
  $('splash').classList.add('via');
  setTimeout(() => $('splash').remove(), 500);
  ciclo();
}
const pausa = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------------ dialoghi */
function dialogo({titolo, testo = '', html = '', bottoni = [{t: 'OK', cls: 'b-main', v: true}], ck = null}) {
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
const conferma = (titolo, testo, si = 'Sì', no = 'Annulla', cls = 'b-main') =>
  dialogo({titolo, testo, bottoni: [{t: no, v: false}, {t: si, cls, v: true}]});
function toast(t) {
  const e = document.createElement('div'); e.className = 'toast'; e.textContent = t;
  document.body.appendChild(e); setTimeout(() => e.remove(), 3000);
}
// chiamata da Python quando si prova a chiudere la finestra
window.chiusura = async c => {
  if (c === 'registro') { dialogo({titolo: 'Sto registrando', testo: 'Prima tocca «Fine», poi puoi chiudere il programma.'}); return; }
  if (await conferma('Sto ancora preparando la lezione', 'Se chiudi adesso potrai finire dopo con «Completa» in «Le mie registrazioni».\n\nChiudo lo stesso?', 'Chiudi', 'Aspetto', 'b-end')) A.esci();
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
  $('footVer').textContent = 'Versione ' + R.versione;
  $('infoVer').textContent = 'Versione ' + R.versione;
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
  document.querySelectorAll('.dati input').forEach(i => {
    i.addEventListener('change', salvaDati);
    i.addEventListener('blur', salvaDati);
  });
  disegnaPronto();
  vai('reg');
}
async function rileggi() { R = await A.riepilogo(); disegnaImpostazioni(); disegnaPronto(); }

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
  if (S.registro) h = `<b><span class="dot rec"></span>${S.pausa ? 'In pausa' : 'In registrazione'}</b>${esc(S.nome)}`;
  else if (S.occupato) h = `<b><span class="dot lav"></span>Preparo la lezione</b>Trascrizione e pacchetti`;
  else h = `<b><span class="dot"></span>Pronto</b>Appunti AI: ${R.appunti_on ? 'accesi' : 'spenti'}`;
  if ($('statobox').innerHTML !== h) $('statobox').innerHTML = h;
  $('navRec').classList.toggle('hidden', !S.registro);
  const nuovo = S.agg && S.agg.tipo === 'trovato';
  $('footAgg').innerHTML = 'Aggiorna' + (nuovo ? '<span class="nuovo"></span>' : '');
}

/* ------------------------------------------------------------------ pronto */
function anteprimaNome() {
  const n = $('nome').value.trim() || 'Lezione';
  const d = new Date();
  $('nomeAnt').textContent = `Data e ora le aggiungo io: ${n} · ${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} ore ${due(d.getHours())}.${due(d.getMinutes())}`;
}
function disegnaPronto() {
  $('pillAI').innerHTML = R.appunti_on ? `<span class="pill p-cor">${ico('spark', 13)}Appunti Cornell attivi</span>`
    : `<span class="pill p-blue">${ico('zip', 13)}Pacchetti per l'AI</span>`;
  $('recenti').innerHTML = (R.recenti || []).length ? '<span class="hint">Ultime usate:</span>' +
    R.recenti.map(m => `<span class="chip" data-m="${esc(m)}">${esc(m)}</span>`).join('') : '';
  $('recenti').querySelectorAll('.chip').forEach(c => c.onclick = () => { const i = $('nome'); i.value = c.dataset.m + ' – '; i.focus(); i.setSelectionRange(i.value.length, i.value.length); anteprimaNome(); });
  if (R.schermo) $('srcScr').textContent = '✓ Schermo principale · ' + R.schermo;
  anteprimaNome();
  disegnaSorgenti();
}
function disegnaSorgenti() {
  const a = S.audio_ok;
  const e = $('srcAud');
  if (a === true) { e.textContent = '✓ Casse e cuffie'; e.className = 'okt'; }
  else if (a === false) { e.textContent = '✕ Non trovato: controlla il volume'; e.className = 'kot'; }
  else { e.textContent = 'Controllo…'; e.className = 'mutt'; }
  const lib = S.liberi != null ? ` · Spazio libero ${Math.round(S.liberi)} GB` : '';
  $('recHint').textContent = `Un pacchetto ogni ${R.minuti === 60 ? 'ora' : '30 minuti'}${lib}` + (R.dnd ? ' · Ti ricordo «Non disturbare»' : '');
  $('recModello').textContent = S.modello || '';
}

async function inizia() {
  if (S.registro || S.occupato) { toast('Aspetta che finisca il lavoro in corso.'); return; }
  $('btnRec').disabled = true;
  try {
    const v = await A.verifica_inizio();
    if (v.occupato) { toast('Aspetta che finisca il lavoro in corso.'); return; }
    if (!v.audio_ok && !await conferma('Non trovo l\'audio del PC', 'Controlla che casse o cuffie siano collegate e il volume sia acceso.\n\nVuoi registrare lo stesso (solo schermo)?', 'Registra lo stesso', 'Annulla')) return;
    if (v.liberi != null && v.liberi < 3 && !await conferma('Poco spazio sul disco', `Restano ${virgola(v.liberi.toFixed(1))} GB. Una lezione di 2 ore occupa circa 1-2 GB.\n\nContinuo?`, 'Continua')) return;
    if (!v.cartella_ok) { await dialogo({titolo: 'Cartella dei pacchetti', testo: 'Non riesco a usare la cartella dei pacchetti. Scegline un\'altra in Impostazioni.'}); vai('imp'); return; }
    if (v.dnd) {
      const r = await dialogo({
        titolo: '🔕 Prima di iniziare: «Non disturbare»',
        testo: 'Così i suoni delle notifiche (mail, WhatsApp, Windows) non finiscono nella registrazione.',
        html: '<div class="passi">1. Tocca «Apri Non disturbare»<br>2. Nella finestra di Windows accendi «Non disturbare»<br>3. Torna qui e tocca «Fatto, inizia»</div>',
        ck: 'Non mostrarlo più (si riattiva in Impostazioni)',
        bottoni: [{t: 'Annulla', v: 'no'}, {t: 'Apri Non disturbare', cls: 'b-ghost', fn: () => A.apri_non_disturbare()},
                  {t: 'Inizia lo stesso', cls: 'b-ghost', v: 'si'}, {t: 'Fatto, inizia', cls: 'b-rec', v: 'si'}]});
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
  $('lTag').innerHTML = S.pausa ? `❚❚ IN PAUSA da ${ms(S.pausa_sec)} · non registro niente` : '<i></i>REC';
  const lv = S.livelli || [];
  $('lWave').querySelectorAll('i').forEach((b, i) => { const x = lv[i] || 0; b.style.height = Math.max(6, Math.min(100, Math.sqrt(x) * 160)) + '%'; });
  const bp = $('btnPausa');
  bp.className = 'btn sp ' + (S.pausa ? 'b-ri' : 'b-pz');
  bp.innerHTML = S.pausa ? ico('play') + 'Riprendi la registrazione' : ico('pause') + 'Pausa (intervallo)';
  $('lAvv').classList.toggle('hidden', !S.avviso);
  $('lAvv').textContent = S.avviso ? '⚠ ' + S.avviso : '';
  disegnaParti($('lParti'));
  if (S.slide !== slideViste) { slideViste = S.slide; A.miniature().then(m => {
    $('thumbs').innerHTML = m.length ? m.map(x => `<div class="th" style="background-image:url('${x.src}')"><em>${x.ora}</em></div>`).join('')
      : '<div class="vuoto">Le slide compaiono qui appena cambiano sullo schermo.</div>';
    $('thumbs').scrollLeft = 99999;
  }); }
}
async function chiediFine() {
  if (await conferma('Fermo la registrazione?', 'Poi preparo il video, la trascrizione e gli ultimi pacchetti.', 'Sì, ferma', 'Continua', 'b-end')) {
    await A.fine(); await aggiorna();
  }
}

function disegnaParti(el) {
  const P = S.parti || [];
  if (!P.length) { el.innerHTML = '<div class="vuoto">Nessuna parte registrata.</div>'; return; }
  const h = P.map(p => {
    let st = '';
    if (p.stato === 'reg') st = '<span class="pill p-grey">● in registrazione</span>';
    else if (p.stato === 'attesa') st = '<span class="pill p-grey">in coda…</span>';
    else if (p.stato === 'lav') st = `<span class="pill p-blue">Trascrivo… ${Math.round((p.perc || 0) * 100)}%</span><div class="bar" style="width:100%;margin:0"><i style="width:${(p.perc || 0) * 100}%"></i></div>`;
    else if (p.stato === 'ok') st = `<span class="pill p-ok">✓ Pacchetto pronto</span><button class="lnk" data-f="${esc(p.file || '')}">Mostra</button>`;
    else st = '<span class="pill p-red">⚠ problema</span>';
    let a = '';
    if (p.ap === 'attesa') a = '<span class="pill p-grey">Appunti in coda…</span>';
    else if (p.ap === 'lav') a = `<span class="pill p-cor">${ico('spark', 12)}Claude scrive…</span><div class="bar cor" style="width:100%;margin:0"><i style="width:${(p.ap_perc || 0) * 100}%"></i></div>`;
    else if (p.ap === 'ok') a = `<span class="pill p-cor">✓ Appunti pronti</span><button class="lnk" data-a="${esc(p.ap_file || '')}">Apri</button>`;
    else if (p.ap === 'errore') a = `<span class="err">⚠ Appunti non creati: ${esc(p.ap_err || '')}</span><button class="lnk" data-r="${p.k}">Riprova</button>`;
    return `<div class="part"><div class="t"><b>Parte ${p.k}</b><span class="o">${esc(p.orario || '')}</span></div><div class="r">${st}</div>${a ? `<div class="r">${a}</div>` : ''}</div>`;
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
  $('fTit').textContent = pronto ? 'Registrazione salvata!' : 'Preparo la registrazione completa…';
  const sp = S.spesa ? ` · ${S.spesa.n} appunti creati da Claude · spesa circa ${virgola(S.spesa.dollari.toFixed(2))} $` : '';
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
    const det = c ? `${c.n_domande} domande d'esame, riassunto${c.formulario ? ', formulario' : ''}${c.esercizi ? ', esercizi svolti' : ''}, con le slide al posto giusto.` : 'Domande, appunti e riassunto, con le slide al posto giusto.';
    const prev = c ? `<div class="cornell">${c.blocchi.map(b => `<div class="q">${esc(b.domanda)}</div><div class="a">${esc(b.appunto)}</div>`).join('')}${c.riassunto ? `<div class="s"><b>Riassunto</b> — ${esc(c.riassunto)}</div>` : ''}</div>` : '';
    h = `<div class="ap-card"><div><span class="pill p-cor">${ico('spark', 13)}Formato Cornell</span>
      <div style="font-size:19px;font-weight:700;color:var(--ink);margin:8px 0 4px">${inCorso ? 'I primi appunti sono pronti' : 'I tuoi appunti sono pronti'}</div>
      <div class="hint" style="margin-bottom:14px">${esc(det)}${inCorso ? ' Gli altri arrivano tra poco.' : ''}</div>
      <button class="btn b-main" style="width:100%" id="fApri">${ico('doc', 18)}Apri gli appunti</button></div>${prev}</div>`;
  } else if (inCorso && R.appunti_on) {
    h = `<div class="row"><span class="ico i-vio"><svg><use href="#i-spark"/></svg></span><div class="sp"><b style="color:var(--ink);font-size:16px">Claude prepara gli appunti in formato Cornell</b>
      <div class="hint">Di solito servono 1-3 minuti per ogni parte. Puoi lasciare il programma aperto e fare altro.</div></div><span class="spin"></span></div>`;
  } else {
    h = `<div class="row"><span class="ico i-blue"><svg><use href="#i-zip"/></svg></span><div class="sp"><b style="color:var(--ink);font-size:16px">Pacchetti pronti per l'AI</b>
      <div class="hint">Nella cartella dei pacchetti trovi un file zip per ogni parte: caricalo nell'AI che usi e chiedi gli appunti.</div></div>
      <button class="btn b-main b-sm" id="fApriPac">${ico('folder')}Apri la cartella</button></div>`;
  }
  if ($('fAp').dataset.h !== h) {
    $('fAp').dataset.h = h; $('fAp').innerHTML = h;
    if ($('fApri')) $('fApri').onclick = () => apriAppunti(null);
    if ($('fApriPac')) $('fApriPac').onclick = () => A.apri_pacchetti();
  }
}
async function apriAppunti(cartella) {
  const l = await A.appunti_di(cartella);
  if (!l.length) { toast('Gli appunti non ci sono ancora.'); return; }
  if (l.length === 1) { A.apri(l[0].file); return; }
  const r = await dialogo({titolo: 'Quali appunti apro?', bottoni: [{t: 'Annulla', v: null}, ...l.map((x, i) => ({t: esc(x.titolo), cls: 'b-main', v: i}))]});
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
  $('aSub').textContent = n ? `${n} registrazion${n === 1 ? 'e' : 'i'} · gli appunti restano anche se elimini il video` : 'Qui trovi tutto quello che registri.';
  $('aVid').textContent = LZ.video_testo;
  $('aVidBar').style.width = Math.max(2, Math.min(100, LZ.quota * 100)) + '%';
  $('aVidDel').classList.toggle('hidden', !LZ.video_tot);
  if (!L.length) { $('lista').innerHTML = `<div class="card" style="text-align:center;padding:40px 20px;color:var(--mut)">${n ? 'Nessuna registrazione trovata.' : 'Nessuna registrazione, per ora.<br>Quando registri, la trovi qui.'}</div>`; return; }
  const h = L.map((l, i) => {
    const meta = [l.quando, l.durata, l.n_slide ? l.n_slide + ' slide' : ''].filter(Boolean).join(' · ') +
      (l.video_testo ? ` · <span style="color:#be123c">🎬 ${l.video_testo}</span>` : '');
    let pill, prim = '';
    if (l.stato === 'in_corso') pill = '<span class="pill p-blue"><span class="spin" style="width:12px;height:12px"></span>In lavorazione</span>';
    else if (l.stato === 'da_completare') { pill = '<span class="pill p-warn">⚠ Da completare</span>'; prim = `<button class="btn b-main b-sm" data-a="completa">${ico('redo')}Completa</button>`; }
    else if (l.n_appunti) { pill = `<span class="pill p-cor">${ico('spark', 12)}Appunti Cornell</span>`; prim = `<button class="btn b-main b-sm" data-a="appunti">${ico('doc')}Apri appunti</button>`; }
    else if (l.crea_appunti) { pill = '<span class="pill p-blue">📦 Pacchetto per l\'AI</span>'; prim = `<button class="btn b-cor b-sm" data-a="crea">${ico('spark')}Crea appunti</button>`; }
    else { pill = '<span class="pill p-blue">📦 Pacchetto per l\'AI</span>'; prim = `<button class="btn b-main b-sm" data-a="pacchetti">${ico('folder')}Cartella pacchetti</button>`; }
    const sec = l.stato === 'pronta' ? `<button class="btn b-ghost b-sm" data-a="tras">${ico('text')}Trascrizione</button>` + (l.video ? `<button class="btn b-ghost b-sm" data-a="video">${ico('play')}Video</button>` : '') : '';
    const badge = l.stato === 'pronta' ? (l.video ? '▶ video' : 'solo appunti') : l.stato === 'in_corso' ? 'in corso' : 'da finire';
    return `<div class="lez" data-i="${LZ.lezioni.indexOf(l)}"><div class="cov c${l.colore}">${esc(l.sigla)}<small>${badge}</small></div>
      <div class="inf"><b title="${esc(l.nome)}">${esc(l.nome)}</b><div class="meta">${meta}</div><div class="acts">${pill}${prim}${sec}</div></div>
      ${l.stato !== 'in_corso' ? '<button class="more" data-a="menu" title="Altre azioni">⋯</button>' : ''}</div>`;
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
    if (await conferma('Rifaccio gli appunti?', `«${l.nome}»\n\nSaranno nel formato Cornell, con le lavagne unite e le slide ritagliate. Gli appunti di prima vengono sostituiti.\n\nCosto stimato: circa ${virgola(st.toFixed(2))} $`, 'Rifai appunti', 'Annulla', 'b-cor')) {
      const r = await A.rifai_appunti(c); if (r.ok) { await aggiorna(); vai('reg'); }
    }
    return;
  }
  if (a === 'rinomina') {
    const r = await dialogo({titolo: 'Rinomina', html: `<input class="in" id="dlgNome" value="${esc(l.nome)}" maxlength="90"><div class="hint" style="margin-top:8px">Cambia anche il nome di pacchetti e appunti.</div>`,
      bottoni: [{t: 'Annulla', v: false}, {t: 'Salva', cls: 'b-main', v: true}]});
    if (!r) return;
    const x = await A.rinomina(c, dialogo.valore);
    if (!x.ok) await dialogo({titolo: 'Rinomina non riuscita', testo: x.msg});
    caricaLezioni();
    return;
  }
  if (a === 'video1') {
    if (await conferma('Eliminare il video?', `«${l.nome}»\nLibera ${l.video_testo}.\n\nIl video si elimina definitivamente, così lo spazio si libera subito.\nRestano: appunti, slide, trascrizione e pacchetti.`, 'Elimina video', 'Annulla', 'b-rec')) {
      await A.elimina_video([c]); caricaLezioni();
    }
    return;
  }
  if (a === 'elimina') {
    const r = await dialogo({titolo: 'Eliminare questa registrazione?', testo: `«${l.nome}»  ${l.quando}\n\nVa nel Cestino di Windows: registrazione, video, slide e testo. Se ti sbagli, la recuperi da lì.`,
      ck: 'Elimina anche i pacchetti e gli appunti', bottoni: [{t: 'Annulla', v: false}, {t: ico('trash') + 'Elimina', cls: 'b-rec', v: true}]});
    if (r.v) { const x = await A.elimina(c, r.ck); if (!x.ok) await dialogo({titolo: 'Non eliminata', testo: x.msg}); caricaLezioni(); }
    return;
  }
  if (a === 'menu') return menuLezione(l, e.currentTarget || e.target);
}
function menuLezione(l, btn) {
  document.querySelectorAll('.menu').forEach(m => m.remove());
  const m = document.createElement('div'); m.className = 'menu';
  const voci = [];
  if (l.crea_appunti) voci.push(['crea', 'spark', 'Crea appunti con Claude']);
  if (l.rifai_appunti) voci.push(['rifai', 'redo', 'Rifai appunti (Cornell)']);
  voci.push(['rinomina', 'edit', 'Rinomina'], ['cartella', 'folder', 'Apri la cartella']);
  if (l.video) voci.push(['video1', 'film', 'Elimina il video (' + l.video_testo + ')', 'r']);
  voci.push(['elimina', 'trash', 'Elimina la registrazione', 'r']);
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
  if (await conferma('Eliminare tutti i video?', `Di ${L.length} registrazion${L.length === 1 ? 'e' : 'i'}: libera ${LZ.video_testo}.\n\nI video si eliminano definitivamente. Restano appunti, slide, trascrizioni e pacchetti.`, 'Elimina i video', 'Annulla', 'b-rec')) {
    await A.elimina_video(L.map(l => l.cartella)); caricaLezioni();
  }
}

/* ------------------------------------------------------------------ impostazioni */
function disegnaImpostazioni() {
  $('aiA').classList.toggle('on', !!R.appunti_on);
  $('aiB').classList.toggle('on', !R.appunti_on);
  const box = $('chiaveBox');
  if (R.chiave) {
    box.innerHTML = `<div class="key"><span class="pill p-ok">✓ Chiave salvata (protetta da Windows)</span><span class="sp"></span><button class="btn b-ghost b-sm" id="kCambia">Cambia</button><button class="btn b-ghost b-sm b-red" id="kTogli">Togli</button></div>`;
    $('kCambia').onclick = () => { R.chiave = false; disegnaImpostazioni(); $('kIn').focus(); };
    $('kTogli').onclick = async () => { if (await conferma('Togliere la chiave?', 'Gli appunti automatici si spengono. Restano i pacchetti per l\'AI.', 'Togli', 'Annulla', 'b-rec')) { await A.togli_chiave(); rileggi(); } };
  } else {
    box.innerHTML = `<div class="key"><input class="in sm" id="kIn" type="password" placeholder="Incolla la chiave (sk-ant-…)" autocomplete="off"><button class="btn b-main b-sm" id="kProva">Prova e salva</button></div>
      <div class="hint" style="margin-top:6px">Si crea su platform.claude.com → Settings → API keys. Resta salvata solo su questo PC.</div><div class="esito" id="kEsito"></div>`;
    const prova = async () => {
      $('kEsito').style.color = 'var(--mut)'; $('kEsito').textContent = 'Provo la chiave…';
      const r = await A.prova_chiave($('kIn').value);
      $('kEsito').style.color = r.ok ? 'var(--ok)' : '#be123c';
      $('kEsito').textContent = (r.ok ? '✓ ' : '✕ ') + r.msg;
      if (r.ok) setTimeout(rileggi, 1200);
    };
    $('kProva').onclick = prova;
    $('kIn').addEventListener('keydown', e => { if (e.key === 'Enter') prova(); });
  }
  $('segDur').querySelectorAll('span').forEach(s => s.classList.toggle('on', +s.dataset.v === R.minuti));
  $('swMini').classList.toggle('on', !!R.mini);
  $('swDnd').classList.toggle('on', !!R.dnd);
  $('impCart').textContent = R.cartella;
  $('impBase').textContent = R.base;
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
  else if (g.tipo === 'ok') h = `<div class="card row" style="padding:12px 14px"><span class="pill p-ok">✓</span><span class="sp">${esc(g.testo)}</span><button class="lnk" id="aggX">Chiudi</button></div>`;
  else if (g.tipo === 'msg') h = `<div class="card row" style="padding:12px 14px"><span class="sp">${esc(g.testo)}</span><button class="lnk" id="aggX">Chiudi</button></div>`;
  else if (g.tipo === 'trovato') {
    const d = g.dato;
    h = `<div class="card" style="padding:14px 16px;border-color:#bae6fd"><b style="color:var(--ink)">C'è la versione ${esc(d.versione)}</b>
      <div class="hint" style="margin:4px 0 10px">${esc(d.novita || '')}${d.completo ? '<br>Questa versione cambia anche le librerie: va scaricato il programma completo (Setup).' : ''}</div>
      <div class="row"><span class="sp"></span><button class="btn b-ghost b-sm" id="aggX">Più tardi</button><button class="btn b-main b-sm" id="aggOk">${d.completo ? 'Apri la pagina' : 'Installa'}</button></div></div>`;
  } else if (g.tipo === 'scarico') h = `<div class="card" style="padding:12px 14px">Scarico l'aggiornamento… ${Math.round((g.perc || 0) * 100)}%<div class="bar"><i style="width:${(g.perc || 0) * 100}%"></i></div></div>`;
  else if (g.tipo === 'fatto') h = `<div class="card row" style="padding:12px 14px"><span class="pill p-ok">✓</span><span>${esc(g.testo)}</span></div>`;
  const b = $('aggBox');
  if (b.dataset.h === h) return;
  b.dataset.h = h; b.innerHTML = h;
  if ($('aggX')) $('aggX').onclick = () => A.chiudi_agg();
  if ($('aggOk')) $('aggOk').onclick = () => A.installa_aggiornamento();
}
