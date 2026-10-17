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
  else if (!R.privacy_ok) primaDiIniziare();
  else if (!R.rapporti_chiesto) chiediRapporti();
  contaFare();
  ciclo();
  setTimeout(() => { try { if (!S || !S.registro) A.cerca_aggiornamenti(true); } catch (e) {} }, 4000);   // avviso all'apertura, se c'e' una versione nuova
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
// telefono, tasto «Indietro»: chiude dialogo o menu, altrimenti torna a Registra. false = l'app va dietro
window.indietro = () => {
  const m = document.querySelector('.menu'); if (m) { m.remove(); return true; }
  const v = [...document.querySelectorAll('.velo')].pop();
  if (v) { const b = v.querySelector('.bt button'); if (b) b.click(); else v.remove(); return true; }
  if (INTERNE.includes(pagina)) { const b = $('v-' + pagina).querySelector(':scope > .indietro'); if (b) b.click(); else vai('arch'); return true; }
  if (pagina === 'info') { vai('imp'); return true; }
  if (pagina !== 'reg') { vai('reg'); return true; }
  if (IV) { IV = null; vai('reg'); return true; }
  if (IT) { IT = null; vai('reg'); return true; }
  return false;
};

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
// pagine «di dentro»: hanno la freccia per tornare alla pagina da cui sei arrivato
const INTERNE = ['rip', 'chiedi', 'mappa', 'cap', 'ig', 'voci', 'stat', 'esame'];
let STORIA = [];
function titoloPagina(p) {
  const n = document.querySelector(`#nav a[data-p="${p}"]`);
  if (n) return (n.querySelector('span[data-t]') || n).textContent.trim();
  const h = $('v-' + p) && $('v-' + p).querySelector('h2');
  return h ? h.textContent.trim() : '';
}
function frecciaIndietro(p) {
  const sec = $('v-' + p);
  let b = sec.querySelector(':scope > .indietro');
  if (!b) { b = document.createElement('button'); b.className = 'indietro'; sec.insertBefore(b, sec.firstChild); }
  const prima = STORIA[STORIA.length - 1] || 'arch';
  b.textContent = '← ' + (titoloPagina(prima) || t('indietro'));
  b.onclick = () => { STORIA.pop(); vai(prima, true); };
}
function vai(p, tornando = false) {
  if (!tornando) {
    if (INTERNE.includes(p)) { if (pagina && pagina !== p && STORIA[STORIA.length - 1] !== pagina) STORIA.push(pagina); if (STORIA.length > 12) STORIA.shift(); }
    else STORIA = [];
  }
  pagina = p;
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.p === (['rip', 'chiedi', 'mappa', 'cap', 'ig', 'voci', 'stat', 'esame'].includes(p) ? 'arch' : p === 'lic' ? 'info' : p)));
  ['pronto', 'importa', 'itesto', 'reg', 'fine', 'arch', 'rip', 'chiedi', 'mappa', 'cap', 'ig', 'voci', 'stat', 'esame', 'fare', 'imp', 'guida', 'info', 'lic'].forEach(x => $('v-' + x).classList.add('hidden'));
  if (p === 'reg') $('v-' + ((S.vista || 'pronto') === 'pronto' && IT ? 'itesto' : (S.vista || 'pronto') === 'pronto' && IV ? 'importa' : (S.vista || 'pronto'))).classList.remove('hidden');
  else $('v-' + p).classList.remove('hidden');
  if (INTERNE.includes(p)) frecciaIndietro(p);
  $('main').scrollTop = 0;
  if (p === 'arch') caricaLezioni();
  if (p === 'fare') apriCose();
  if (p === 'imp') { avanzate(); disegnaCloud(); disegnaInviti(); disegnaImpostazioni(); disegnaParole(); disegnaCalendario(); disegnaCollegamenti(); }
  if (p === 'info') disegnaAgg();
  if (p === 'lic') apriLicenze();
  if (p === 'guida') disegnaGuida(linguaGuida || LINGUA);
  if (p === 'reg' && S.vista === 'pronto') { setTimeout(() => $('nome').focus(), 50); }
}

/* ------------------------------------------------------------------ licenze */
// i testi (quasi 1 MB) stanno in licenze.js, caricato solo quando si apre la pagina
function apriLicenze() {
  const box = $('licGruppi');
  if (window.LICENZE) { if (box.dataset.l !== LINGUA) disegnaLicenze(); return; }
  box.innerHTML = `<p class="hint">${esc(t('li.carico'))}</p>`;
  const s = document.createElement('script');
  s.src = 'licenze.js';
  s.onload = disegnaLicenze;
  document.head.appendChild(s);
}
function disegnaLicenze() {
  const D = window.LICENZE, box = $('licGruppi');
  const cl = l => /^GPL$|GPL con/.test(l) ? ' gp' : /LGPL/.test(l) ? ' lg' : l === 'Microsoft' ? ' ms' : '';
  const voce = (n, d, l, tx) => `<div class="li-c"><div class="li-r"><div class="t"><b>${esc(n)}</b>${d ? `<span>${esc(d)}</span>` : ''}</div>`
    + (l ? `<span class="li-l${cl(l)}">${esc(l === 'GPL con eccezione' && LINGUA !== 'it' ? 'GPL with exception' : l === 'Libera' && LINGUA !== 'it' ? 'Free' : l)}</span>` : '')
    + `<span class="fr">›</span></div><div class="li-tx">${esc(tx)}</div></div>`;
  let h = D.gruppi.map(g => `<div class="card"><h3>${esc(g[LINGUA] || g.en)}</h3>`
    + g.voci.map(v => voce(v.n, v[LINGUA] || v.en, v.l, v.t.map(k => D.testi[k]).join('\n\n') || '—')).join('') + '</div>').join('');
  h += `<div class="card"><h3>${esc(t('li.comuni'))}</h3>` + D.comuni.map(([n, k]) => voce(n, '', '', D.testi[k])).join('') + '</div>';
  box.innerHTML = h;
  box.dataset.l = LINGUA;
  box.querySelectorAll('.li-r').forEach(r => r.onclick = () => r.parentNode.classList.toggle('on'));
}

function inizializza() {
  document.querySelectorAll('#nav a').forEach(a => a.onclick = () => vai(a.dataset.p));
  scriviVersione();
  $('footAgg').onclick = () => { vai('info'); A.cerca_aggiornamenti(); };
  $('btnCercaAgg').onclick = () => A.cerca_aggiornamenti();
  $('btnAss').onclick = () => A.assistenza();
  $('btnLic').onclick = () => vai('lic');
  $('btnPrivacy').onclick = () => primaDiIniziare(true);
  $('licIndietro').onclick = () => vai('info');
  // pronto
  $('nome').addEventListener('input', () => { anteprimaNome(); modelloDaNome(); controllaNomeRec(); });
  $('ivNome').addEventListener('input', () => controllaNome('ivNome', 'ivNomeMsg', 'ivVai'));
  $('itNome').addEventListener('input', () => controllaNome('itNome', 'itNomeMsg', 'itVai'));
  $('nome').addEventListener('keydown', e => { if (e.key === 'Enter' && nomeOk('nome')) inizia(); });
  $('btnRec').onclick = inizia;
  $('avvCopia').onclick = avvCopia; $('avvFatto').onclick = avvFatto;
  $('avvRiapri').onclick = () => { AVV.aperto = true; AVV.copiato = false; disegnaAvvisa(); };
  $('btnImporta').onclick = scegliVideo;
  collegaRipasso();
  collegaNovita();
  $('ivCambia').onclick = scegliVideo;
  $('ivAnnulla').onclick = () => { IV = null; vai('reg'); };
  $('btnImportaTesto').onclick = scegliTesto;
  $('imAvz').onclick = () => avanzate($('imAvanzate').classList.contains('hidden'));
  $('itCambia').onclick = scegliTesto;
  $('itAnnulla').onclick = () => { IT = null; vai('reg'); };
  $('itVai').onclick = importaTesto;
  $('itFmt').querySelectorAll('.aiopt').forEach(o => o.onclick = () => { if (IT) { IT.formato = o.dataset.f; disegnaTesto(); } });
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
  $('cerca').addEventListener('input', () => { disegnaLezioni(); cercaParole(); });
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
  controllaNomeRec();
  vai('reg');
}
async function rileggi() { R = await A.riepilogo(); disegnaImpostazioni(); disegnaInviti(); disegnaPronto(); }
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
    b.onclick = async () => { v.remove(); await cambiaLingua(b.dataset.l); if (!R.privacy_ok) primaDiIniziare(); };
  });
  document.body.appendChild(v);
}

// «Prima di iniziare»: privacy in breve e spunta sul permesso di registrare (una volta sola; poi da Impostazioni)
function primaDiIniziare(rileggi) {
  const v = document.createElement('div');
  v.className = 'velo';
  const punto = (ic, k, cl) => `<div class="pv-i${cl || ''}"><span class="ic">${ic}</span><div><b>${esc(t(k + '.t'))}</b><span>${esc(t(k))}</span></div></div>`;
  v.innerHTML = `<div class="dlg"><h3>${esc(t('pv.t'))}</h3><div class="tx">${esc(t('pv.s'))}</div>
    <div class="pv-p">${punto('🔒', 'pv.1')}${punto('🚫', 'pv.2')}${punto('🤖', 'pv.3')}${punto('📝', 'pv.4', ' az')}</div>
    <div class="pv-r"><b>${esc(t('pv.r.t'))}</b><p>${esc(t('pv.r'))}</p>
      ${rileggi ? '' : `<label><input type="checkbox" id="pvCk"> ${esc(t('pv.ck'))}</label>`}</div>
    ${rileggi ? '' : `<div class="pv-rap"><label><input type="checkbox" id="pvRap"> <span>🛠️ ${esc(t('pv.rap'))}<span class="hint">${esc(t('pv.rap.s'))}</span></span></label></div>`}
    <div class="pv-bt"><a id="pvLink">${esc(t('pv.link'))}</a>
      <button class="btn b-main" id="pvOk"${rileggi ? '' : ' disabled'}>${esc(t(rileggi ? 'pv.chiudi' : 'pv.inizia'))}</button></div></div>`;
  document.body.appendChild(v);
  v.querySelector('#pvLink').onclick = () => A.informativa();
  const ck = v.querySelector('#pvCk');
  if (ck) ck.onchange = () => { v.querySelector('#pvOk').disabled = !ck.checked; };
  v.querySelector('#pvOk').onclick = async () => {
    if (!rileggi) {
      await A.imposta('privacy_ok', true); R.privacy_ok = true;
      const si = v.querySelector('#pvRap').checked;
      await A.imposta('rapporti_errori', si); R.rapporti = si; R.rapporti_chiesto = true;
    }
    v.remove();
  };
  if (rileggi) v.onclick = e => { if (e.target === v) v.remove(); };
}

// chi aveva già spuntato «Prima di iniziare» prima dei rapporti: la domanda una volta sola
function chiediRapporti() {
  const v = document.createElement('div');
  v.className = 'velo';
  const punto = (ic, k, cl) => `<div class="pv-i${cl || ''}"><span class="ic">${ic}</span><div><b>${esc(t(k + '.t'))}</b><span>${esc(t(k))}</span></div></div>`;
  v.innerHTML = `<div class="dlg" style="max-width:480px"><h3>${esc(t('rq.t'))}</h3><div class="tx">${esc(t('rq'))}</div>
    <div class="pv-p">${punto('✅', 'rq.si')}${punto('🚫', 'rq.no', ' no')}</div><div class="hint">${esc(t('rq.dove'))}</div>
    <div class="pv-bt"><button class="btn b-ghost" data-r="0">${esc(t('rq.b.no'))}</button><button class="btn b-main" data-r="1">${esc(t('rq.b.si'))}</button></div></div>`;
  v.querySelectorAll('[data-r]').forEach(b => b.onclick = async () => {
    const si = b.dataset.r === '1';
    await A.imposta('rapporti_errori', si); R.rapporti = si; R.rapporti_chiesto = true;
    v.remove(); disegnaImpostazioni();
  });
  document.body.appendChild(v);
}
// errori dell'interfaccia: solo se l'utente ha detto sì (il testo lo ripulisce il programma)
window.addEventListener('error', e => { try { if (R && R.rapporti && A.errore_js) A.errore_js(String(e.message || ''), e.lineno || 0); } catch (x) {} });

/* ------------------------------------------------------------------ ciclo */
async function ciclo() {
  while (true) {
    try { await aggiorna(); } catch (e) { console.error(e); }
    await pausa(S.registro ? 300 : 700);
  }
}
let vistaPrima = null, contaLz = 0;
/* telefono: «Crea appunti» resta in Le mie lezioni, con la barra sulla scheda della lezione */
let APLAV = null, apVisti = false;
function apPerc() {
  const P = (S && S.parti) || [];
  if (!P.length) return 0;
  return Math.round(100 * P.reduce((a, p) => a + (p.ap === 'ok' ? 1 : p.ap === 'lav' ? (p.ap_perc || 0) : 0), 0) / P.length);
}
function apSegui() {
  const P = (S && S.parti) || [];
  const err = P.find(p => p.ap === 'errore');
  const lav = P.some(p => p.ap === 'lav' || p.ap === 'attesa');
  if (lav) apVisti = true;
  if (err || (!lav && (apVisti || !P.length))) {
    const c = APLAV;
    APLAV = null; apVisti = false;
    apFine(c, err ? (err.ap_err || '') : null);
    return;
  }
  disegnaLezioni();
}
async function apFine(c, err) {
  await caricaLezioni();
  const l = LZ && LZ.lezioni.find(x => x.cartella === c);
  if (err !== null) dialogo({titolo: t('ar.aperr.t'), testo: err});
  else if (l && !l.n_appunti) {
    let d = ''; try { d = 'v' + R.versione + '\n' + await A.diagnosi_appunti(c); } catch (e) { d = String(e); }
    dialogo({titolo: t('ar.aperr.t'), html: `${esc(t('ar.apnulla'))}<div class="hint" style="margin-top:10px;white-space:pre-wrap;font-size:11px">${esc(d)}</div>`});
  }
}
async function creaQui(c, f) {
  APLAV = c; apVisti = false;
  let r;
  try { r = await A.appunti_mancanti(c, f); } catch (e) { r = {ok: false, msg: String(e && e.message || e)}; }
  if (!r || !r.ok) { APLAV = null; dialogo({titolo: t('ar.aperr.t'), testo: (r && r.msg) || ''}); return; }
  S = await A.stato(); vistaPrima = S.vista;
  disegnaLezioni();
}
async function aggiorna() {
  S = await A.stato();
  if (S.vista !== vistaPrima) {
    const prima = vistaPrima; vistaPrima = S.vista;
    if (S.vista === 'reg') slideViste = -1;
    if (pagina === 'reg' || (prima !== null && S.vista !== 'pronto' && !(APLAV && pagina === 'arch'))) vai('reg');
    if (S.vista === 'pronto') { R = await A.riepilogo(); disegnaPronto(); }
  }
  if (S.vista === 'reg') disegnaReg();
  if (S.vista === 'fine') disegnaFine();
  if (S.vista === 'pronto') disegnaSorgenti();
  disegnaStato();
  if (pagina === 'info') disegnaAgg();
  if (APLAV) { if (pagina === 'arch') apSegui(); }
  else if (pagina === 'arch' && ++contaLz % 8 === 0) caricaLezioni();
  avvisiCalendario();
  avvisoAgg();
  for (const m of S.messaggi || []) { A.letto(m.id); await dialogo({titolo: m.titolo, testo: m.testo}); }
}
let AGG_VISTO = false;
async function avvisoAgg() {
  const g = S.agg || {};
  if (AGG_VISTO || g.tipo !== 'trovato' || !g.avviso || S.registro || document.querySelector('.velo')) return;
  AGG_VISTO = true;
  const d = g.dato || {};
  const nov = (LINGUA === 'en' && d.novita_en) ? d.novita_en : (d.novita || '');
  const v = await dialogo({titolo: t('ag.pronta', {v: d.versione}), testo: nov + (d.completo ? '\n\n' + t('ag.completo') : ''),
    html: d.completo ? '' : `<div class="hint" style="margin-top:10px">${esc(t('ag.riapri.s'))}</div>`,
    bottoni: [{t: t('ag.tardi'), v: false}, {t: d.completo ? t('ag.pagina') : t('ag.riapri'), cls: 'b-main', v: true}]});
  if (v) { A.installa_aggiornamento(); vai('info'); }
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

/* ------------------------------------------------------------------ nomi unici */
// Ogni campo «nome»: controlla (con un attimo di pausa) che il nome non sia vuoto né già usato;
// sotto scrive il motivo e propone nomi liberi; finché non va, il bottone resta spento.
const NOMI = {};
function controllaNome(id, msgId, btnId, ok2 = null) {
  const st = NOMI[id] || (NOMI[id] = {ok: false, t: null, n: 0});
  clearTimeout(st.t);
  st.t = setTimeout(async () => {
    const n = ++st.n, val = $(id).value;
    let v; try { v = await A.nome_libero(val, null); } catch (e) { v = {ok: true}; }
    if (n !== st.n) return;
    st.ok = !!v.ok;
    const m = $(msgId), inp = $(id);
    inp.classList.toggle('n-err', !v.ok && !v.vuoto && !v.corto && !v.generico); inp.classList.toggle('n-ok', !!v.ok);
    if (v.ok) { m.className = 'nmsg ok'; m.textContent = t('nm.ok'); }
    else if (v.vuoto) { m.className = 'nmsg grigio'; m.textContent = t('nm.vuoto'); }
    else if (v.corto || v.generico) { m.className = 'nmsg grigio'; m.textContent = t('nm.senso'); }
    else {
      m.className = 'nmsg err';
      m.innerHTML = esc(t('nm.usato', {n: v.nome, d: v.data ? ` (${v.data})` : ''})) + '<div>' + (v.proposte || []).map(p => `<span class="chip" data-p="${esc(p)}">${esc(p)}</span>`).join('') + '</div>';
      m.querySelectorAll('.chip').forEach(c => c.onclick = () => { inp.value = c.dataset.p; inp.dispatchEvent(new Event('input')); });
    }
    if ($(btnId)) $(btnId).disabled = !v.ok;
    if (ok2) ok2(v);
  }, 250);
}
const nomeOk = id => !!(NOMI[id] && NOMI[id].ok);
function controllaNomeRec() {
  controllaNome('nome', 'nomeMsg', 'btnRec', v => { $('recNome').textContent = v.ok ? '' : t(v.vuoto || v.corto || v.generico ? 'nm.prima' : 'nm.prima2'); $('nomeAnt').classList.toggle('hidden', !v.ok); });
}

/* ------------------------------------------------------------------ pronto */
function anteprimaNome() {
  const k = (R && R.tipo) || 'lezione';
  const n = $('nome').value.trim();
  if (!n) { $('nomeAnt').textContent = ''; return; }        // senza nome niente anteprima (il nome serve)
  const d = new Date();
  const ora = LINGUA === 'it' ? `ore ${due(d.getHours())}.${due(d.getMinutes())}` : `${due(d.getHours())}:${due(d.getMinutes())}`;
  $('nomeAnt').textContent = t('pr.ant', {n, d: `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} ${ora}`});
}
function disegnaPronto() {
  if (ANDROID && (R.app_codice || 0) >= 10) { const h = $('btnImportaTesto').querySelector('.hint'); if (h) h.textContent = t('it.b10'); }
  $('pillAI').innerHTML = R.appunti_on ? `<span class="pill p-calma">${ico('spark', 13)}${t(R.formato === 'esame' ? 'pr.pill.ai.e' : 'pr.pill.ai')}</span>`
    : `<span class="pill p-calma">${ico('zip', 13)}${t('pr.pill.pac')}</span>`;
  $('recenti').innerHTML = (R.recenti || []).length ? `<span class="hint">${t('pr.recenti')}</span>` +
    R.recenti.map(m => `<span class="chip" data-m="${esc(m)}">${esc(m)}</span>`).join('') : '';
  $('recenti').querySelectorAll('.chip').forEach(c => c.onclick = () => { const i = $('nome'); i.value = c.dataset.m + ' – '; i.focus(); i.setSelectionRange(i.value.length, i.value.length); anteprimaNome(); controllaNomeRec(); });
  $('srcScr').textContent = t('src.scr.ok') + (R.schermo ? ' · ' + R.schermo : '');
  disegnaLingue();
  anteprimaNome();
  disegnaSorgenti();
  disegnaModo();
  disegnaQuando();
  disegnaTipo();
}
/* tipo di registrazione: lezione, riunione di lavoro, webinar; e chi partecipa (riunioni) */
let PART = [];
const formatoTipo = () => R.tipo === 'riunione' ? 'verbale' : R.tipo === 'webinar' ? 'webinar' : R.formato;
function nomeFormato(f, nomeMio) { return f === 'mio' ? (nomeMio || (R.mio && R.mio.nome) || t('fmt.mio')) : t('fmt.' + f); }
function disegnaTipo() {
  const k = R.tipo || 'lezione';
  $('tipoBox').querySelectorAll('.aiopt').forEach(o => o.classList.toggle('on', o.dataset.k === k));
  $('partBox').classList.toggle('hidden', k !== 'riunione');
  document.querySelector('#v-pronto [data-t="pr.lingua"]').textContent = t(k === 'lezione' ? 'pr.lingua' : 'pr.lingua.si');
  anteprimaNome();
  $('modBox').classList.toggle('hidden', k !== 'riunione');
  if (k === 'riunione') disegnaModelli();
  $('nome').placeholder = k === 'riunione' ? t('tp.ph.riu') : k === 'webinar' ? t('tp.ph.web') : t('pr.ph');
  $('partTags').innerHTML = PART.map((n, i) => `<span class="tag2">${esc(n)}<b data-i="${i}" title="${esc(t('togli'))}">×</b></span>`).join('');
  $('partTags').querySelectorAll('b[data-i]').forEach(b => b.onclick = () => { PART.splice(+b.dataset.i, 1); disegnaTipo(); });
  if (R.appunti_on && k !== 'lezione') $('pillAI').innerHTML = `<span class="pill p-cor">${ico('spark', 13)}${esc(nomeFormato(formatoTipo()))}</span>`;
}
let MOD = null, MOD_RICORDO = false;
function disegnaModelli() {
  const sel = MOD || R.modello || 'generica';
  const L = (R.modelli || []).map(m => [m.k, m.nome]).concat([['mio', R.modello_mio && R.modello_mio.descrizione ? '✎ ' + R.modello_mio.nome : t('md.mio')]]);
  $('modChips').innerHTML = L.map(([k, n]) => `<span class="chip${k === sel ? ' on' : ''}" data-k="${k}">${esc(n)}</span>`).join('');
  $('modChips').querySelectorAll('.chip').forEach(c => c.onclick = async () => {
    if (c.dataset.k === 'mio' && !(R.modello_mio && R.modello_mio.descrizione) && !await modelloMio()) return;
    MOD = c.dataset.k; MOD_RICORDO = false; disegnaModelli();
  });
  const h = sel === 'mio' ? t('md.mio.s', {d: (R.modello_mio || {}).descrizione || ''}) + ` <button class="lnk" id="modMio">${esc(t('md.modifica'))}</button>` : esc(t('md.' + sel + '.s'));
  $('modHint').innerHTML = h + (MOD_RICORDO ? `<div style="margin-top:4px">${esc(t('md.ricordo'))}</div>` : '');
  if ($('modMio')) $('modMio').onclick = () => modelloMio();
}
async function modelloMio() {
  const m = R.modello_mio || {};
  const html = `<input class="in" id="mmNome" placeholder="${esc(t('md.mio.nome'))}" value="${esc(m.nome || '')}" maxlength="60"><textarea class="in" id="mmDesc" rows="4" style="margin-top:8px;resize:vertical">${esc(m.descrizione || '')}</textarea>`;
  return new Promise(fatto => {
    dialogo({titolo: t('md.mio.t'), testo: t('md.mio.d'), html, bottoni: [{t: t('annulla'), v: false}, {t: t('salva'), cls: 'b-main', fn: async () => {
      const d = $('mmDesc').value.trim(); if (!d) { $('mmDesc').focus(); return; }
      await A.imposta('modello_mio', {nome: $('mmNome').value, descrizione: d});
      document.querySelector('.velo').remove(); R = await A.riepilogo(); MOD = 'mio'; disegnaModelli(); fatto(true);
    }}]}).then(v => { if (v === false) fatto(false); });
  });
}
function modelloDaNome() {
  if ((R.tipo || 'lezione') !== 'riunione') return;
  const k = (R.modelli_nome || {})[$('nome').value.trim().toLowerCase()];
  if (k && k !== MOD) { MOD = k; MOD_RICORDO = true; disegnaModelli(); }
}
function aggiungiPartecipante() {
  const v = $('partIn').value.trim();
  if (v && !PART.includes(v)) PART.push(v);
  $('partIn').value = ''; disegnaTipo(); $('partIn').focus();
}
/* telefono: «Quando trascrivo?» (Durante / Dopo), scelto prima di ogni registrazione */
let QUANDO = null;
function disegnaQuando() {
  if (!ANDROID) return;
  if (QUANDO === null) QUANDO = R.quando || 'durante';
  $('quandoBox').querySelectorAll('.aiopt').forEach(o => o.classList.toggle('on', o.dataset.q === QUANDO));
  const v = R.velocita;
  let h = t('and.stima.no');
  if (v) {
    const lav = 7200 / v;
    h = QUANDO === 'dopo' ? t('and.stima.dopo', {t: durataTesto(lav)})
      : t('and.stima.dur', {m: Math.max(2, Math.round(Math.min(lav, 360 / v) / 60 + 2))});
  }
  $('quandoStima').textContent = h;
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
  disegnaCalOra();
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
    if (!v.cartella_ok) { await dialogo({titolo: t('in.cart.t'), testo: t('in.cart')}); vai('imp'); avanzate(true); return; }
    if (ANDROID && !aula && !await conferma(t('and.viva.t'), t('and.viva'), t('and.viva.si'), t('annulla'), 'b-rec')) return;
    if (v.dnd && !ANDROID) {
      const r = await dialogo({
        titolo: t('dnd.t'), testo: t('dnd'), html: `<div class="passi">${t('dnd.passi')}</div>`, ck: t('dnd.ck'),
        bottoni: [{t: t('annulla'), v: 'no'}, {t: t('dnd.apri'), cls: 'b-ghost', fn: () => A.apri_non_disturbare()},
                  {t: t('dnd.stesso'), cls: 'b-ghost', v: 'si'}, {t: t('dnd.fatto'), cls: 'b-rec', v: 'si'}]});
      if (r.ck) { await A.imposta('promemoria_dnd', false); R.dnd = false; }
      if (r.v !== 'si') return;
    }
    const r = await A.avvia($('nome').value, {modo: R.modo, microfono: aula ? $('selMic').value : '', pdf: aula && PDFA ? PDFA.percorso : '', quando: ANDROID ? QUANDO : '',
                                tipo: R.tipo || 'lezione', partecipanti: R.tipo === 'riunione' ? PART : [], modello: R.tipo === 'riunione' ? (MOD || R.modello || 'generica') : ''});
    if (!r.ok && r.msg) { await dialogo({titolo: t('nm.prima2'), testo: r.msg}); return; }
    if (r.ok) { $('nome').value = ''; PDFA = null; QUANDO = null; PART = []; MOD = null; MOD_RICORDO = false; R = await A.riepilogo(); disegnaModo(); await aggiorna(); }
  } finally { $('btnRec').disabled = false; controllaNomeRec(); }
}

/* ------------------------------------------------------------------ avvisa i partecipanti */
// A ogni registrazione: messaggio pronto per dire agli altri che si registra. Non si spegne dalle impostazioni.
const AVV = {id: null, aperto: true, copiato: false};
function avvTipo(a) {
  if (a.modo === 'aula') return 'aula';
  return a.tipo === 'riunione' ? 'riu' : a.tipo === 'webinar' ? 'web' : 'lez';
}
function disegnaAvvisa() {
  const a = S.avvisa;
  const card = $('avvCard'), ok = $('avvOk');
  if (!a) { card.classList.add('hidden'); ok.classList.add('hidden'); return; }
  const k = avvTipo(a);
  if (AVV.id !== a.id) {          // registrazione nuova: messaggio nella lingua di chi parla
    AVV.id = a.id; AVV.aperto = !a.fatto; AVV.copiato = false;
    const L = String(a.lingua || LINGUA).toLowerCase().startsWith('it') ? 'it' : 'en';
    $('avvMsg').value = (TESTI[L] || TESTI.it)['av.m.' + k];
  }
  const aperto = AVV.aperto || !a.fatto;
  card.classList.toggle('hidden', !aperto);
  ok.classList.toggle('hidden', aperto);
  $('avvT').textContent = t('av.t.' + k);
  $('avvSub').textContent = t('av.s.' + k);
  $('avvCopia').textContent = k === 'aula' ? t('av.letto') : AVV.copiato ? t('av.copiato') : t('av.copia');
  if (k === 'aula') $('avvDove').textContent = t('av.dove.aula');
  else $('avvDove').innerHTML = AVV.copiato ? t(ANDROID ? 'av.incolla.tel' : 'av.incolla') : esc(t('av.dove'));
  $('avvOra').textContent = a.fatto ? '· ' + t('av.ok.alle', {o: a.fatto}) : '';
}
async function avvFatto() {
  AVV.aperto = false;
  try { const r = await A.avvisati(); if (S.avvisa && r && r.ora) S.avvisa.fatto = r.ora; } catch (e) {}
  disegnaAvvisa();
}
function avvCopia() {
  const a = S.avvisa; if (!a) return;
  if (avvTipo(a) === 'aula') { avvFatto(); return; }
  const testo = $('avvMsg').value;
  const fatto = () => { AVV.copiato = true; disegnaAvvisa(); };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(testo).then(fatto, () => { copiaVecchia(testo); fatto(); }); return; }
  } catch (e) {}
  copiaVecchia(testo); fatto();
}
function copiaVecchia(testo) {
  const x = $('avvMsg'); x.focus(); x.select();
  try { document.execCommand('copy'); } catch (e) {}
  x.setSelectionRange(0, 0); x.blur();
}

/* ------------------------------------------------------------------ importa un video */
let IV = null;   // video scelto da importare
let IT = null;   // trascrizione (PDF, Word, testo) scelta da importare
async function scegliTesto() {
  if (S.registro || S.occupato) { toast(t('aspetta')); return; }
  const r = await A.scegli_testo();
  if (!r || !r.ok) { if (r && r.msg) dialogo({titolo: t('it.h'), testo: r.msg}); return; }
  IT = {...r, formato: (IT && IT.formato) || (R.formato === 'esame' ? 'esame' : 'cornell')};
  $('itNome').value = r.nome || '';
  disegnaTesto();
  controllaNome('itNome', 'itNomeMsg', 'itVai');
  vai('reg');
}
function disegnaTesto() {
  if (!IT) return;
  $('itFile').textContent = IT.file;
  $('itInfo').textContent = t('it.info', {n: num(IT.parole)});
  $('itFmt').querySelectorAll('.aiopt').forEach(o => o.classList.toggle('on', o.dataset.f === IT.formato));
  const cc = Math.max(1, Math.round((IT.stima || 0.01) * 100));
  $('itStima').textContent = cc === 1 ? t('it.stima1') : t('it.stima', {c: cc});
}
async function importaTesto() {
  if (!IT) return;
  if (!R.chiave) { dialogo({titolo: t('it.h'), testo: t('it.manca')}); return; }
  $('itVai').disabled = true;
  let r;
  try { r = await A.importa_testo(IT.percorso, $('itNome').value, IT.formato); }
  catch (e) { r = {ok: false, msg: String(e && e.message || e)}; }
  finally { $('itVai').disabled = !nomeOk('itNome'); }
  if (!r || !r.ok) { dialogo({titolo: t('ar.aperr.t'), testo: (r && r.msg) || ''}); return; }
  IT = null;
  S = await A.stato(); vistaPrima = S.vista;
  if (ANDROID) { APLAV = r.cartella; apVisti = false; vai('arch'); }
  else vai('reg');
}
function durataTesto(sec) {
  const m = Math.round(sec / 60), h = Math.floor(m / 60);
  return h ? t('dur.h', {h, m: m % 60}) : t('dur.m', {m: Math.max(1, m)});
}
async function scegliVideo() {
  if (S.registro || S.occupato) { toast(t('aspetta')); return; }
  const da = ANDROID ? 'file' : await dialogo({titolo: t('il.t'), testo: t('il.s'),
    bottoni: [{t: t('annulla'), v: null}, {t: '🔗 ' + t('il.link'), cls: 'b-ghost', v: 'link'}, {t: '📁 ' + t('il.file'), cls: 'b-main', v: 'file'}]});
  if (da === 'link') return scegliLink();
  if (da !== 'file') return;
  const r = await A.scegli_video();
  if (!r.ok) { if (r.msg) toast(t('iv.err')); return; }
  IV = {...r, slide: !!r.ha_video, lingua: R.lingua_lezione || LINGUA, nome: (IV && IV.nome) || ''};
  $('ivNome').value = r.nome_proposto || '';
  disegnaImporta();
  controllaNome('ivNome', 'ivNomeMsg', 'ivVai');
  vai('reg');
  setTimeout(() => { $('ivNome').focus(); $('ivNome').select(); }, 50);
}
async function scegliLink() {
  const ok = await dialogo({titolo: t('il.link.t'), html: `<input class="in" placeholder="https://…"><div class="hint" style="margin-top:8px">${esc(t('il.siti'))}</div>`,
    bottoni: [{t: t('annulla'), v: false}, {t: t('il.vai'), cls: 'b-main', v: true}]});
  const url = (dialogo.valore || '').trim();
  if (!ok || !url) return;
  const v = document.createElement('div'); v.className = 'velo';
  v.innerHTML = `<div class="dlg"><div class="row" style="gap:10px"><span class="spin"></span>${esc(t('il.cerco'))}</div></div>`;
  document.body.appendChild(v);
  let r;
  try { r = await A.info_link(url); } finally { v.remove(); }
  if (!r.ok) { await dialogo({titolo: t('il.link.t'), testo: r.msg || t('iv.err')}); return; }
  IV = {...r, slide: !!r.ha_video, lingua: R.lingua_lezione || LINGUA};
  $('ivNome').value = r.nome_proposto || '';
  disegnaImporta();
  controllaNome('ivNome', 'ivNomeMsg', 'ivVai');
  vai('reg');
  setTimeout(() => { $('ivNome').focus(); $('ivNome').select(); }, 50);
}
function disegnaImporta() {
  if (!IV) return;
  $('ivFile').textContent = IV.nome_file;
  const d = new Date(IV.data);
  const q = `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} ${due(d.getHours())}.${due(d.getMinutes())}`;
  $('ivInfo').textContent = IV.link ? [IV.sito, IV.durata ? durataTesto(IV.durata) : '', t('il.scarico')].filter(Boolean).join(' · ')
    : t('iv.info', {d: durataTesto(IV.durata), g: gb(IV.peso / 1e9), q}) + (IV.ha_video ? '' : ' · ' + t('iv.solo_audio'));
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
    const r = IV.link ? await A.importa_link(IV.link, $('ivNome').value, IV.lingua, IV.slide && IV.ha_video)
      : await A.importa(IV.percorso, $('ivNome').value, IV.lingua, IV.slide && IV.ha_video);
    if (!r.ok) { dialogo({titolo: t('iv.h'), testo: r.msg && r.msg !== '?' ? r.msg : t('iv.err')}); return; }
    IV = null;
    await aggiorna(); vai('reg');
  } finally { $('ivVai').disabled = !nomeOk('ivNome'); }
}
function disegnaFasi() {
  const g = S.importa;
  $('fImp').classList.toggle('hidden', !g);
  if (!g) return;
  const testi = [...(g.link ? [t('iv.fl')] : []), t('iv.f0'), t('iv.f1'), !g.cerca_slide ? t('iv.f2x') : g.slide != null ? t('iv.f2n', {n: g.slide}) : t('iv.f2'), t('iv.f3')];
  const h = testi.map((x, i) => {
    const st = i < g.fase ? 'ok' : i === g.fase ? 'lav' : 'att';
    const segno = st === 'ok' ? '✓' : st === 'lav' ? '<span class="spin" style="width:14px;height:14px"></span>' : '·';
    const perc = st === 'lav' && i < testi.length - 1 ? ` ${Math.round((g.perc || 0) * 100)}%` : '';
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
  $('lSl').textContent = ANDROID ? (S.batteria >= 0 ? S.batteria + '%' : '–') : S.slide;
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
  disegnaAvvisa();
  $('lAvv').classList.toggle('hidden', !S.avviso);
  $('lAvv').textContent = S.avviso ? '⚠ ' + S.avviso : '';
  disegnaParti($('lParti'));
  disegnaDiretta();
  if (S.n_note !== NOTE.n) { NOTE.n = S.n_note; A.note().then(disegnaNote); }
  disegnaDD();
  const ap = S.aperte || [];
  $('aperteCard').classList.toggle('hidden', !ap.length);
  if (ap.length) $('aperteCard').innerHTML = `<b>${esc(t('cf.ultima', {n: ap.length}))}</b><div>${esc(t('cf.ultima.s', {l: ap.map(a => a.cosa + (a.chi ? ' (' + a.chi + ')' : '')).join('; ')}))}</div>`;
  $('slideCard').classList.toggle('hidden', S.modo === 'aula' && !S.slide);
  if (S.slide !== slideViste) { slideViste = S.slide; A.miniature().then(m => {
    $('thumbs').innerHTML = m.length ? m.map(x => `<div class="th" style="background-image:url('${x.src}')"><em>${x.ora}</em></div>`).join('')
      : `<div class="vuoto">${t('lv.vuoto')}</div>`;
    $('thumbs').scrollLeft = 99999;
  }); }
}
const DD = {storia: [], nome: null};
function disegnaDD() {
  $('ddNoDir').classList.toggle('hidden', !!S.diretta_on);
  if (DD.nome !== S.nome) {           // registrazione nuova: si riparte da zero
    DD.nome = S.nome; DD.storia = [];
    const c2 = (S.tipo || R.tipo) === 'lezione' ? 'dd.c2.lez' : 'dd.c2.riu';
    $('ddChips').innerHTML = ['dd.c1', c2, 'dd.c3'].map(k => `<span class="chip" data-q="${esc(t(k))}">${esc(t(k))}</span>`).join('');
    $('ddChips').querySelectorAll('.chip').forEach(c => c.onclick = () => chiediDiretta(c.dataset.q));
    disegnaDDChat();
  }
}
function disegnaDDChat(lav) {
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[\[(\d{1,2}:\d{2}(?::\d{2})?)\]\]/g, '<span class="pill p-blue">▶ $1</span>').replace(/\n/g, '<br>');
  $('ddChat').innerHTML = DD.storia.map(m => `<div class="bolla${m.chi === 'io' ? ' io' : ''}">${m.chi === 'io' ? esc(m.testo) : md(m.testo)}</div>`).join('') +
    (lav ? `<div class="bolla"><span class="spin" style="width:12px;height:12px"></span> ${esc(t('dd.lav'))}</div>` : '');
}
async function chiediDiretta(q) {
  q = (q || $('ddIn').value).trim(); if (!q) return;
  $('ddIn').value = ''; DD.storia.push({chi: 'io', testo: q}); disegnaDDChat(true);
  const r = await A.chiedi_diretta(q, DD.storia.slice(0, -1));
  if (r.ok) DD.storia.push({chi: 'cl', testo: r.testo}); else DD.storia.push({chi: 'cl', testo: '⚠ ' + (r.msg || '')});
  disegnaDDChat();
}
const NOTE = {n: -1};
const ICO_NOTA = {importante: '⭐', chiarire: '❓', fare: '✅'};
function disegnaNote(note) {
  NOTE.n = note.length;
  $('noteLista').innerHTML = note.length ? note.map((n, i) => `<div class="nota2"><span class="t">${esc(n.ora)}</span><span class="sp">${n.tipo ? ICO_NOTA[n.tipo] + ' <b>' + esc(t(n.tipo === 'importante' ? 'nt.imp' : n.tipo === 'chiarire' ? 'nt.chi' : 'nt.fare')) + '</b>' + (n.testo ? ' – ' : '') : ''}${esc(n.testo)}</span><button class="lnk" data-i="${i}" title="${esc(t('togli'))}">✕</button></div>`).join('')
    : `<div class="hint">${esc(t('nt.vuoto'))}</div>`;
  $('noteLista').querySelectorAll('[data-i]').forEach(b => b.onclick = async () => disegnaNote((await A.nota_togli(+b.dataset.i)).note));
}
async function aggiungiNota(tipo) {
  const testo = $('notaIn').value.trim();
  if (!testo && !tipo) return;
  const r = await A.nota(testo, tipo || '');
  if (r.ok) { $('notaIn').value = ''; disegnaNote(r.note); }
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
    else if (p.stato === 'dopo') st = `<span class="pill p-vio">${t('pt.dopo')}</span>`;
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
  const sp = !S.spesa ? '' : (S.spesa.n ? t('fn.spesa', {n: S.spesa.n, d: num(S.spesa.dollari.toFixed(2))}) : '') + (S.spesa.server ? t('fn.spesa.srv', {c: num((S.spesa.server_dollari * 100).toFixed(1))}) : '');
  $('fSub').textContent = (S.titolo_fine || '') + sp;
  $('fBar').classList.toggle('hidden', pronto || perc === null);
  if (perc !== null) $('fBar').firstElementChild.style.width = (perc * 100) + '%';
  const avvF = S.aspetta_carica ? t('and.aspetto') : S.avviso_fine;
  $('fAvv').classList.toggle('hidden', !avvF);
  $('fAvv').textContent = avvF ? (S.aspetta_carica ? '🔌 ' : '⚠ ') + avvF : '';
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
    const fc = c ? c.formato : S.formato;
    const det = !c ? t('fn.det0') : esame ? t('fn.det.esame', {n: c.n_domande, k: c.n_kw, s: c.simulazione ? t('fn.det.sim') : ''})
      : fc === 'verbale' ? t('fn.det.vb', {d: c.n_dec, a: c.n_az}) : fc === 'mio' ? t('fn.det.mio', {n: c.n_sez})
      : fc === 'webinar' ? t('fn.det.wb', {n: c.n_domande, f: c.formulario ? t('fn.det.f') : ''})
      : t('fn.det', {n: c.n_domande, f: c.formulario ? t('fn.det.f') : '', e: c.esercizi ? t('fn.det.e') : ''});
    const stelle = n => '★'.repeat(Math.max(1, Math.min(3, n || 1))) + '☆'.repeat(3 - Math.max(1, Math.min(3, n || 1)));
    const prev = c ? `<div class="cornell${esame ? ' esame' : ''}">${c.blocchi.map(b => `<div class="q">${esame ? `<span style="color:#ea580c">${stelle(b.stelle)}</span><br>` : ''}${esc(b.domanda)}</div><div class="a">${esc(b.appunto)}</div>`).join('')}${c.riassunto ? `<div class="s"><b>${t('fn.riass')}</b> — ${esc(c.riassunto)}</div>` : ''}</div>` : '';
    const pillFmt = fc === 'mio' ? esc((c && c.nome) || t('fn.mio')) : t(esame ? 'fn.esame' : ['verbale', 'webinar'].includes(fc) ? 'fn.' + fc : 'fn.cornell');
    h = `<div class="ap-card"><div><span class="pill ${esame ? 'p-warn' : fc === 'verbale' ? 'p-blue' : fc === 'mio' ? 'p-mio' : 'p-cor'}">${ico('spark', 13)}${pillFmt}</span>
      <div style="font-size:19px;font-weight:700;color:var(--ink);margin:8px 0 4px">${inCorso ? t('fn.primi') : t('fn.tuoi')}</div>
      <div class="hint" style="margin-bottom:14px">${esc(det)}${inCorso ? t('fn.altri') : ''}</div>
      <button class="btn b-main" style="width:100%" id="fApri">${ico('doc', 18)}${t('fn.apri')}</button></div>${prev}</div>`;
  } else if (inCorso && R.appunti_on) {
    h = `<div class="row"><span class="ico i-vio"><svg><use href="#i-spark"/></svg></span><div class="sp"><b style="color:var(--ink);font-size:16px">${t({esame: 'fn.claude.e.t', verbale: 'fn.claude.v.t', webinar: 'fn.claude.w.t', mio: 'fn.claude.m.t'}[S.formato] || 'fn.claude.t')}</b>
      <div class="hint">${t('fn.claude')}</div></div><span class="spin"></span></div>`;
  } else {
    h = `<div class="row"><span class="ico i-blue"><svg><use href="#i-zip"/></svg></span><div class="sp"><b style="color:var(--ink);font-size:16px">${t('fn.pac.t')}</b>
      <div class="hint">${t('fn.pac')}</div></div>
      ${ANDROID ? '' : `<button class="btn b-main b-sm" id="fApriPac">${ico('folder')}${t('fn.apricart')}</button>`}</div>`;
  }
  $('fAp').classList.toggle('hidden', P.length > 0 && P.every(p => p.stato === 'dopo'));
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
  const r = await dialogo({titolo: t('ap.quali'), bottoni: [{t: t('annulla'), v: null}, ...l.map((x, i) => ({t: esc(x.titolo), cls: x.formato === 'esame' ? 'b-pz' : x.formato === 'cornell' ? 'b-cor' : 'b-main', v: i}))]});
  if (r !== null && r !== false) A.apri(l[r].file);
}

/* ------------------------------------------------------------------ le mie registrazioni */
async function caricaLezioni() {
  LZ = await A.lezioni();
  if (!LZ || !LZ.lezioni) {        // il motore non e' riuscito a fare l'elenco: lo dico, con il motivo
    $('lista').innerHTML = `<div class="card" style="padding:24px;color:#be123c">⚠ ${esc(t('ar.err'))}<div class="hint" style="margin-top:6px">${esc((LZ && LZ.errore) || '')}</div></div>`;
    LZ = null; return;
  }
  const n = LZ.lezioni.length;
  $('navCnt').textContent = n; $('navCnt').classList.toggle('hidden', !n);
  contaFare();
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
    const meta = [l.tipo === 'riunione' ? t('tp.b.riu') : l.tipo === 'webinar' ? t('tp.b.web') : '', l.quando, l.durata, l.n_slide ? l.n_slide + ' slide' : '', lg, l.importata ? t('ar.importata') : ''].filter(Boolean).join(' · ') +
      (l.cloud === true ? ` · <span style="color:#0284c7">${t('ar.cloud')}</span>` : l.cloud === false ? ` · <span style="color:#ea580c">${t('ar.cloud.no')}</span>` : '') +
      (!l.video_testo || (ANDROID && /^0 MB/.test(l.video_testo)) ? '' : ANDROID ? ` · <span style="color:var(--mut)">🎧 ${l.video_testo}</span>` : ` · <span style="color:var(--mut)">🎬 ${l.video_testo}</span>`);
    const errL = l.errore ? `<div class="hint" style="color:#be123c">⚠ ${esc(l.errore)}</div>` : '';
    let pill, prim = '';
    if (APLAV && APLAV === l.cartella) { const pc = apPerc(); pill = `<span class="pill p-cor">${ico('spark', 12)}${t('ar.aplav', {p: pc})}</span><div class="bar cor" style="width:100%;margin:2px 0 4px"><i style="width:${pc}%"></i></div>`; }
    else if (l.stato === 'in_corso') pill = `<span class="pill p-blue"><span class="spin" style="width:12px;height:12px"></span>${t('ar.lav')}</span>`;
    else if (l.dopo) { pill = `<span class="pill p-vio">${t('and.datr')}</span>`; prim = `<button class="btn b-main b-sm" data-a="completa">${ico('play')}${t('and.trascrivi')}</button>`; }
    else if (l.stato === 'da_completare') { pill = `<span class="pill p-warn">${t('ar.dacomp')}</span>`; prim = `<button class="btn b-main b-sm" data-a="completa">${ico('redo')}${t('ar.completa')}</button>`; }
    else if (l.n_appunti) { pill = ''; prim = `<button class="btn b-main b-sm" data-a="appunti">${ico('doc')}${t('ar.apriap')}</button>`; }
    else if (l.crea_appunti) { pill = `<span class="pill p-blue">${t('ar.pac')}</span>`; prim = `<button class="btn b-cor b-sm" data-a="crea">${ico('spark')}${t('ar.crea')}</button>`; }
    else { pill = `<span class="pill p-blue">${t('ar.pac')}</span>`; prim = ANDROID ? '' : `<button class="btn b-main b-sm" data-a="pacchetti">${ico('folder')}${t('ar.cartpac')}</button>`; }
    const rip = l.ripasso && l.ripasso.n && l.stato !== 'in_corso' ? `<button class="btn b-rip b-sm" data-a="ripassa">${ico('cards')}${t('ar.rip', {n: l.ripasso.n})}</button>` : '';
    const chiedi = l.trascritta && l.stato === 'pronta' ? `<button class="btn b-cor b-sm" data-a="chiedi">${ico('chat')}${t('ar.chiedi')}</button>` : '';
    const capi = (l.capitoli && l.stato === 'pronta' ? `<button class="btn b-ghost b-sm" data-a="capitoli">${ico('text')}${t('ar.cap')}</button>` : '') +
      (l.voci >= 2 && l.stato === 'pronta' ? `<button class="btn b-ghost b-sm" data-a="voci">${ico('chat')}${t('ar.voci')}</button>` : '') +
      (l.n_appunti && l.stato === 'pronta' ? `<button class="btn b-ghost b-sm" data-a="condividi">${ico('share')}${t('ar.cond')}</button>` : '');
    // (Chiedi, Capitoli, Chi parla, Condividi, Trascrizione, Video: nel menu «⋯ Altro»)
    const altro = l.stato !== 'in_corso' ? `<button class="btn b-ghost b-sm b-altro" data-a="menu" title="${t('ar.altre')}">⋯ ${t('ar.altro')}</button>` : '';
    const sec = rip + altro;
    const tags = l.n_appunti ? (l.formati || []).map(f => `<span class="ftag ${f}">${esc(nomeFormato(f, l.nome_mio))}</span>`).join('') : '';
    const badge = l.stato === 'pronta' ? (l.video ? t('ar.b.video') : t('ar.b.solo')) : l.stato === 'in_corso' ? t('ar.b.corso') : t('ar.b.finire');
    return `<div class="lez" data-i="${LZ.lezioni.indexOf(l)}"><div class="cov c${l.colore}">${esc(l.sigla)}<small>${badge}</small></div>
      <div class="inf"><b title="${esc(l.nome)}">${esc(l.nome)}</b>${tags}<div class="meta">${meta}</div>${errL}<div class="acts">${pill}${prim}${sec}</div></div></div>`;
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
  if (a === 'capitoli') return apriCapitoli(l);
  if (a === 'infografica') return apriInfografica(l);
  if (a === 'voci') return apriVoci(l);
  if (a === 'stat') return apriStatistiche(l);
  if (a === 'spezzone') { await apriCapitoli(l); $('spCard').scrollIntoView({block: 'center'}); return; }
  if (a === 'condividi') return apriCondividi(l);
  if (a === 'voci_rifai') return apriVoci(l, true);
  if (a === 'pdf') return aggiungiPdf(l);
  if (a === 'tras') return A.apri_lezione(c);
  if (a === 'video') return A.apri(l.video);
  if (a === 'pacchetti') return A.apri_pacchetti();
  if (a === 'cartella') return A.apri(c);
  if (a === 'completa') { const r = await A.completa(c); if (!r.ok) toast(r.msg); else { await aggiorna(); vai('reg'); } return; }
  if (a === 'crea' && ANDROID) return creaQui(c, null);
  if (a === 'crea') { const r = await A.appunti_mancanti(c, null); if (r.ok) { await aggiorna(); vai('reg'); } return; }
  if (a.startsWith('anche:') || a.startsWith('compl:')) {
    const f = a.split(':')[1];
    if (a.startsWith('anche:')) {
      const st = await A.stima_appunti(c);
      if (!await conferma(t('ar.anche.t', {f: nomeFormato(f, l.nome_mio)}), t('ar.anche', {n: l.nome, c: num(st.toFixed(2))}), t('ar.anche.si'), t('annulla'), f === 'esame' ? 'b-pz' : 'b-cor')) return;
    }
    if (ANDROID) return creaQui(c, f);
    const r = await A.appunti_mancanti(c, f); if (r.ok) { await aggiorna(); vai('reg'); } return;
  }
  if (a === 'rifai') {
    const st = await A.stima_appunti(c);
    if (await conferma(t('ar.rifai.t'), t('ar.rifai.f', {n: l.nome, f: nomeFormato(l.formato_serie || R.formato, l.nome_mio), c: num(st.toFixed(2))}), t('ar.rifai.si'), t('annulla'), 'b-cor')) {
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
  const pronta = l.stato === 'pronta';
  if (l.trascritta && pronta) voci.push(['chiedi', 'chat', t('ar.m.chiedi')]);
  if (l.capitoli && pronta) voci.push(['capitoli', 'text', t('ar.cap')]);
  if (l.voci >= 2 && pronta) voci.push(['voci', 'chat', t('ar.voci')]);
  if (l.n_appunti && pronta) voci.push(['condividi', 'share', t('ar.cond')]);
  if (pronta) voci.push(['tras', 'text', t('ar.tras')]);
  if (l.video && pronta) voci.push(['video', 'play', t('ar.vid')]);
  if (voci.length) voci.push(['-']);
  if (l.crea_appunti) voci.push(['crea', 'spark', t('ar.m.crea')]);
  (l.crea_anche || []).forEach(f => voci.push(['anche:' + f, 'spark', t('ar.m.anche', {f: nomeFormato(f, l.nome_mio)})]));
  (l.completa_appunti || []).forEach(f => voci.push(['compl:' + f, 'spark', t('ar.m.compl', {f: nomeFormato(f, l.nome_mio)})]));
  if (l.rifai_appunti) voci.push(['rifai', 'redo', t('ar.m.rifai.x', {f: nomeFormato(l.formato_serie || R.formato, l.nome_mio)})]);
  if (l.trascritta && l.stato === 'pronta') voci.push(['mappa', 'map', t('ar.m.mappa')], ['infografica', 'sli', t('ar.m.ig')]);
  if (l.trascritta && l.stato === 'pronta' && l.voci < 2) voci.push(['voci_rifai', 'chat', t('ar.m.voci')]);
  if (l.trascritta && l.stato === 'pronta') voci.push(['stat', 'chat', t('ar.m.stat')]);
  if (l.video && l.stato === 'pronta') voci.push(['spezzone', 'film', t('ar.m.sp')]);
  if (l.stato === 'pronta' && l.n_pacchetti) voci.push(['pdf', 'pdf', t(l.docente ? 'ar.m.pdf2' : 'ar.m.pdf')]);
  voci.push(['rinomina', 'edit', t('ar.m.rin')]);
  if (!ANDROID) voci.push(['cartella', 'folder', t('ar.m.cart')]);
  if (l.video) voci.push(['video1', 'film', t('ar.m.vid', {g: l.video_testo}), 'r']);
  voci.push(['elimina', 'trash', t('ar.m.el'), 'r']);
  m.innerHTML = voci.map(v => v[0] === '-' ? '<hr>' : (v[3] && !m.dataset.sep ? (m.dataset.sep = 1, '<hr>') : '') + `<button data-a="${v[0]}" class="${v[3] || ''}">${ico(v[1], 16)}${esc(v[2])}</button>`).join('');
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
/* «Dove trascrivo»: sul PC/telefono o sul server (RunPod) */
const DV = {scelto: null};
async function disegnaCloud(c) {
  if (ANDROID) return;
  c = c || await A.cloud_stato();
  $('clOpts').querySelectorAll('.clopt').forEach(o => {
    o.classList.toggle('on', o.dataset.d === c.dove);
    o.onclick = async () => {
      if (o.dataset.d === 'altro') disegnaCloud(await A.cloud_scegli());
      else disegnaCloud(await A.cloud_imposta(o.dataset.d, null, null));
    };
  });
  $('clBox').classList.toggle('hidden', c.dove === 'no');
  const trovato = c.dove === 'gdrive' ? c.gdrive : c.dove === 'onedrive' ? c.onedrive : c.cartella;
  const k = c.dove === 'gdrive' ? 'cl.gd' : c.dove === 'onedrive' ? 'cl.od' : 'cl.al';
  $('clTrov').className = 'cltrov' + (trovato ? '' : ' no');
  $('clTrov').textContent = t(k + (trovato || c.dove === 'altro' ? '.ok' : '.no'));
  $('clPath').textContent = c.radice || '';
  $('clPath').parentElement.classList.toggle('hidden', !c.radice);
  $('clApri').onclick = () => A.apri_cloud();
  const ck = {clAp: 'appunti', clTr: 'tras', clAu: 'audio'};
  Object.keys(ck).forEach(id => { $(id).checked = !!c.cosa[ck[id]]; $(id).onchange = async () => disegnaCloud(await A.cloud_imposta(null, null, {[ck[id]]: $(id).checked})); });
  $('clTutte').textContent = t('cl.tutte', {n: c.da_copiare});
  $('clTutte').classList.toggle('hidden', !c.radice || !c.da_copiare);
  $('clTutteS').classList.toggle('hidden', !c.radice || !c.da_copiare);
  $('clTel').textContent = c.radice ? t(c.dove === 'gdrive' ? 'cl.tel.gd' : c.dove === 'onedrive' ? 'cl.tel.od' : 'cl.tel.al') : '';
  $('clRiprova').classList.toggle('hidden', c.dove === 'no');
  $('clTutte').onclick = async () => { const r = await A.cloud_tutte(); $('clStato').className = 'dvstato'; $('clStato').textContent = t('cl.tutte.ok', {n: r.n}); };
  $('clStato').className = 'dvstato';
  $('clStato').textContent = c.dove !== 'no' && c.ultima ? t('cl.ultima', {n: c.ultima.nome, q: c.ultima.quando.replace('T', ' ')}) : '';
}
function avanzate(apri) {
  // «Impostazioni avanzate»: chiuse di serie; il programma si ricorda se le avevi aperte
  let a = apri;
  if (a === undefined) { try { a = localStorage.getItem('vm_avanzate') === '1'; } catch (e) { a = false; } }
  $('imAvanzate').classList.toggle('hidden', !a); $('imAvz').classList.toggle('aperto', !!a);
  const l = $('imAvz').querySelector('[data-t="im.avz.apri"]'); if (l) l.textContent = t(a ? 'im.avz.chiudi' : 'im.avz.apri');
  try { localStorage.setItem('vm_avanzate', a ? '1' : '0'); } catch (e) {}
}
function disegnaInviti() {
  $('invCard').classList.toggle('hidden', !R.puo_invitare);
  $('hoCard').classList.toggle('hidden', !!R.puo_invitare);
  $('hoGia').classList.toggle('hidden', !R.da_invito);
  $('hoGia').textContent = R.da_invito ? t('ho.gia') : '';
  $('invVai').onclick = async () => {
    const r = await A.invito_prepara($('invPer').value, $('invCl').checked, $('invSrv').checked);
    if (!r.ok) { dialogo({titolo: t('inv.h'), testo: r.msg || ''}); return; }
    $('invRis').classList.remove('hidden');
    $('invOk').textContent = t('inv.ok', {n: $('invPer').value.trim() || '…'});
    $('invMsg').value = r.messaggio; $('invCopiato').textContent = '';
  };
  $('invCopia').onclick = () => {
    const x = $('invMsg'), fatto = () => { $('invCopiato').textContent = t('inv.copiato'); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(x.value).then(fatto, () => { x.focus(); x.select(); document.execCommand('copy'); fatto(); }); return; } } catch (e) {}
    x.focus(); x.select(); try { document.execCommand('copy'); } catch (e) {} fatto();
  };
  $('hoVai').onclick = async () => {
    const r = await A.invito_attiva($('hoTxt').value);
    if (!r.ok) { $('hoEsito').style.color = '#be123c'; $('hoEsito').textContent = '⚠ ' + (r.msg || ''); return; }
    $('hoTxt').value = '';
    $('hoEsito').style.color = '#059669';
    $('hoEsito').textContent = t('ho.ok', {c: [r.claude ? t('ho.ok.cl') : '', r.server ? t('ho.ok.srv') : ''].filter(Boolean).join(' ' + t('ho.e') + ' ')});
    await rileggi();
  };
}
function disegnaDove() {
  const dove = DV.scelto || R.dove || 'qui';
  $('dvBox').querySelectorAll('[data-d]').forEach(o => o.classList.toggle('on', o.dataset.d === dove));
  $('dvIcoQui').textContent = ANDROID ? '📱' : '💻';
  if (document.activeElement !== $('srvCod')) $('srvCod').value = R.server_endpoint || $('srvCod').value || '';
  $('srvKey').placeholder = R.server_endpoint ? t('dv.chiave.gia') : '';
  $('srvVia').classList.toggle('hidden', !R.server_endpoint);
  $('dvPc').classList.toggle('hidden', dove === 'server');
  $('dvSrv').classList.toggle('hidden', dove !== 'server');
  const v = parseFloat(R.velocita || 0);
  $('dvVel').textContent = v > 0 ? t('dv.vel', {m: Math.max(1, Math.round(60 / v))}) : t('dv.vel0');
  // la scelta che vale davvero adesso (spunta nella tendina e riga verde)
  const attivo = R.server_endpoint && R.dove === 'server' ? 'server' : 'qui';
  $('dvAttivo').textContent = attivo === 'server' ? t('dv.att.srv') : dove === 'server' ? t('dv.att.manca') : t('dv.att.qui');
  $('dvStato').textContent = '';
  if (!DV.esito) { $('srvEsito').textContent = ''; $('srvEsito').style.color = ''; }
  $('dvBox').querySelectorAll('[data-d]').forEach(o => o.onclick = async () => {
    DV.esito = '';
    if (o.dataset.d === 'qui') { DV.scelto = null; await A.server_scegli('qui'); await rileggi(); return; }
    if (R.server_endpoint) { DV.scelto = null; await A.server_scegli('server'); await rileggi(); return; }
    DV.scelto = 'server'; disegnaDove(); $('dvAltre').open = true; $('srvCod').focus();
  });
  $('srvVai').onclick = async () => {
    const b = $('srvVai'); b.disabled = true; DV.esito = 'lav';
    $('srvEsito').style.color = ''; $('srvEsito').textContent = t('dv.lav');
    const r = await A.server_collega($('srvCod').value.trim(), $('srvKey').value.trim());
    b.disabled = false;
    if (!r.ok) { $('srvEsito').textContent = '⚠ ' + (r.msg || ''); $('srvEsito').style.color = '#be123c'; DV.esito = 'err'; return; }
    $('srvKey').value = ''; DV.scelto = null;
    await rileggi();
    DV.esito = 'ok'; $('srvEsito').style.color = '#047857';
    $('srvEsito').textContent = t('dv.ok', {s: r.secondi, c: num((r.dollari * 100).toFixed(2))});
  };
  $('srvVia').onclick = async () => {
    if (!await conferma(t('dv.via.t'), t('dv.via.s'), t('dv.via.si'), t('annulla'), 'b-rec')) return;
    DV.esito = ''; DV.scelto = null; $('srvCod').value = ''; await A.server_scollega(); await rileggi();
  };
}
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
  $('swPrec').classList.toggle('on', !!R.precisa);
  $('swVoci').classList.toggle('on', !!R.chi_parla);
  $('swRap').classList.toggle('on', !!R.rapporti);
  disegnaDove();
  if (ANDROID) {
    $('segQuando').querySelectorAll('span').forEach(x => x.classList.toggle('on', x.dataset.v === R.quando));
    $('swCarica').classList.toggle('on', !!R.solo_carica);
    $('andVer').textContent = t('and.agg.s', {v: R.versione});
  }
  $('impCart').textContent = R.cartella;
  $('impBase').textContent = R.base;
  $('segLingua').querySelectorAll('span').forEach(s => s.onclick = () => cambiaLingua(s.dataset.l));
  $('fmtBox').querySelectorAll('.aiopt').forEach(o => o.onclick = async () => {
    MIO_SCELTO = o.dataset.f === 'mio';
    const r = await A.imposta('formato_appunti', o.dataset.f);
    if (!r.ok) { $('mioBox').classList.remove('hidden'); $('fmtBox').querySelectorAll('.aiopt').forEach(x => x.classList.toggle('on', x === o)); $('mioDesc').focus(); toast(r.msg); return; }
    await rileggi();
  });
  $('mioBox').classList.toggle('hidden', R.formato !== 'mio' && !MIO_SCELTO);
  if (document.activeElement !== $('mioNome')) $('mioNome').value = (R.mio && R.mio.nome) || '';
  if (document.activeElement !== $('mioDesc')) $('mioDesc').value = (R.mio && R.mio.descrizione) || '';
  $('mioEsempi').innerHTML = `<span class="hint">${esc(t('mio.esempi'))}</span>` + (R.esempi_mio || []).map((e, i) => `<span class="chip" data-i="${i}">${esc(e.nome)}</span>`).join('');
  $('mioEsempi').querySelectorAll('.chip').forEach(c => c.onclick = async () => {
    const e = R.esempi_mio[+c.dataset.i];
    $('mioNome').value = e.nome; $('mioDesc').value = e.descrizione;
    await A.imposta('mio', {nome: e.nome, descrizione: e.descrizione});
    if (MIO_SCELTO || R.formato === 'mio') await A.imposta('formato_appunti', 'mio');
    await rileggi();
  });
  document.querySelectorAll('.dati input').forEach(i => { if (document.activeElement !== i) i.value = (R.studente || {})[i.dataset.k] || ''; });
}
let MIO_SCELTO = false;
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
  const gr = G.gruppi || {};
  let num = 0, prima = null;
  $('gCap').innerHTML = G.capitoli.map((c, i) => {
    const n = c.perche ? '★' : ++num;
    let tit = '';
    if (c.g && c.g !== prima) { prima = c.g; if (gr[c.g]) tit = `<div class="gtit">${esc(gr[c.g])}</div>`; }
    return tit + `<details class="cap${c.perche ? ' perche' : ''}"${(aperti.length ? aperti[i] : i === 0) ? ' open' : ''}><summary><span class="n">${n}</span><span class="ico ${c.perche ? 'i-vio' : 'i-blue'}">${ico(c.ico)}</span>${esc(c.t)}${c.v ? `<span class="pill p-blue gvp">${ico('play', 11)}video</span>` : ''}<span class="fr">›</span></summary>${c.v ? `<video class="gv" src="video/${c.v}-${l}.webm" controls muted playsinline preload="metadata"></video>` : ''}<${c.perche ? 'ul' : 'ol'}>${c.p.map(x => `<li>${x}</li>`).join('')}</${c.perche ? 'ul' : 'ol'}></details>`;
  }).join('');
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
  $('pwTit').textContent = vuoto ? '' : t('pw.tue', {m: r.materia});
  if (PWNUOVA.length) [...$('pwTags').querySelectorAll('.tag2')].forEach(e => { if (e.firstChild && PWNUOVA.includes(e.firstChild.textContent)) e.classList.add('nuova'); });
  $('pwProp').querySelectorAll('.prop').forEach(e => e.onclick = () => aggiuntaParola(e.dataset.w));
}
let PWNUOVA = [];
async function aggiuntaParola(...ww) {
  const m = PW.materia;
  await salvaParole([...PW.parole, ...ww], ww);
  $('pwOk').textContent = t('pw.ok', {w: ww.join('», «'), m});
}
async function salvaParole(lista, nuova) {
  if (!PW.materia) return;
  await A.salva_parole(PW.materia, lista);
  PWNUOVA = nuova || [];
  await disegnaParole(PW.materia);
  PWNUOVA = [];
  if (!nuova) $('pwOk').textContent = '';
  R.parole_n = (R.parole_n || 0);
}
function aggiungiParola() {
  const w = $('pwIn').value.trim();
  if (!w) return;
  $('pwIn').value = '';
  aggiuntaParola(...w.split(/[,;]/).map(x => x.trim()).filter(Boolean));
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
/* ------------------------------------------------------------------ calendario */
const CAL_VISTI = new Set();
function avvisiCalendario() {
  const a = S.cal_avviso;
  if (a && !CAL_VISTI.has(a.id)) {
    CAL_VISTI.add(a.id);
    const tit = a.minuti > 0 ? t('cal.av.t', {m: a.minuti, t: a.titolo}) : t('cal.av.t0', {t: a.titolo});
    dialogo({titolo: tit, testo: t('cal.av', {o: a.ora, l: a.link ? t('cal.av.link') : ''}) + (a.partecipanti.length ? t('cal.part', {n: a.partecipanti.length}) : ''),
             bottoni: [{t: t('cal.av.no'), v: false}, {t: a.link ? t('cal.av.si') : t('cal.av.si2'), cls: 'b-rec', v: true}]})
      .then(async v => { await A.cal_rispondi(a.id, !!v); if (v) { await aggiorna(); vai('reg'); } });
  }
  const f = S.cal_fine;
  if (f && !CAL_VISTI.has('fine' + f.id)) {
    CAL_VISTI.add('fine' + f.id);
    dialogo({titolo: t('cal.fi.t', {t: f.titolo, f: f.fine}), testo: t('cal.fi'),
             bottoni: [{t: t('cal.fi.no'), v: false}, {t: t('cal.fi.si'), cls: 'b-end', v: true}]})
      .then(async v => { await A.cal_fine_rispondi(!!v); await aggiorna(); });
  }
}
function disegnaCalOra() {
  const c = S.cal_ora, e = $('calOra');
  if (!c || S.registro || S.occupato) { e.classList.add('hidden'); e.dataset.h = ''; return; }
  const h = `<span class="sp">${t('cal.dal', {t: esc(c.titolo), o: esc(c.ora), p: c.partecipanti.length ? t('cal.part', {n: c.partecipanti.length}) : ''})}</span><button class="btn b-ghost b-sm" id="calUsa">${esc(t('cal.usa'))}</button>`;
  e.classList.remove('hidden');
  if (e.dataset.h === h) return;
  e.dataset.h = h; e.innerHTML = h;
  $('calUsa').onclick = async () => {
    $('nome').value = c.titolo; anteprimaNome(); controllaNomeRec();
    if (c.partecipanti.length) { PART = [...c.partecipanti]; if (R.tipo !== 'riunione' && !c.aula) { await A.imposta('tipo', 'riunione'); R.tipo = 'riunione'; } }
    await A.imposta('modo', c.aula ? 'aula' : 'online'); R.modo = c.aula ? 'aula' : 'online';
    disegnaPronto();
  };
}
function giornoCal(iso) {
  const d = new Date(iso + 'T12:00'), oggi = new Date(); oggi.setHours(12, 0, 0, 0);
  const g = Math.round((d - oggi) / 864e5);
  return g === 0 ? t('cal.oggi') : g === 1 ? t('cal.domani') : `${t('cal.giorni')[(d.getDay() + 6) % 7].slice(0, 3)} ${due(d.getDate())}/${due(d.getMonth() + 1)}`;
}
async function disegnaCalendario() {
  const c = await A.cal_elenco();
  $('calFonti').innerHTML = (c.fonti.length || c.orario.length) ? c.fonti.map((f, i) => `<div class="cfonte"><span class="ico i-blue">📅</span><div class="sp"><b style="color:var(--ink)">${esc(f.nome)}</b><div class="hint">${f.errore ? '⚠ ' + esc(t('cal.err')) : '✓'}</div></div><button class="lnk" data-i="${i}">${esc(t('cal.togli'))}</button></div>`).join('')
    + (c.orario.length ? `<div class="cfonte"><span class="ico i-teal">🗓</span><div class="sp"><b style="color:var(--ink)">${esc(t('cal.or.t'))}</b><div class="hint">${c.orario.length} · ${c.orario.map(r => esc(r.nome)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 4).join(', ')}</div></div></div>` : '')
    : `<div class="hint">${esc(t('cal.nessuno'))}</div>`;
  $('calFonti').querySelectorAll('[data-i]').forEach(b => b.onclick = async () => { await A.cal_togli(c.fonti[+b.dataset.i].url); disegnaCalendario(); });
  $('segCal').querySelectorAll('span').forEach(x => { x.classList.toggle('on', x.dataset.v === c.modo); x.onclick = async () => { await A.cal_scelta('*', x.dataset.v); disegnaCalendario(); }; });
  const I = c.impegni;
  $('calImpegni').innerHTML = I.length ? I.map((e, i) => `<div class="cev"><div class="o">${esc(e.ora.split('–')[0])}<small>${esc(giornoCal(e.giorno))}</small></div><div class="sp"><b style="color:var(--ink)">${esc(e.titolo)}</b><div class="hint">${esc([e.fonte === 'orario' ? t('cal.or.t') : e.fonte, e.aula ? t('cal.aula') : e.link ? 'Meet/Teams/Zoom' : '', e.partecipanti.length ? t('cal.part', {n: e.partecipanti.length}).replace(' · ', '') : ''].filter(Boolean).join(' · '))}</div></div>
      <div class="seg" data-i="${i}">${['avvisa', 'solo', 'niente'].map(m => `<span data-v="${m}" class="${e.modo === m ? 'on' : ''}">${esc(t('cal.' + m))}</span>`).join('')}</div></div>`).join('')
    : `<div class="hint">${esc(t('cal.vuoto'))}</div>`;
  $('calImpegni').querySelectorAll('.seg').forEach(g => g.querySelectorAll('span').forEach(x => x.onclick = async () => { await A.cal_scelta(I[+g.dataset.i].uid, x.dataset.v); disegnaCalendario(); }));
}
async function collegaCalendario(quale) {
  const html = `<div class="passi">${t('cal.' + quale + '.passi')}</div><input class="in" style="margin-top:12px" placeholder="${esc(t('cal.link.ph'))}"><div class="hint" style="margin-top:8px">${esc(t('cal.privato'))}</div>`;
  const ok = await dialogo({titolo: t('cal.' + quale + '.t'), html, bottoni: [{t: t('annulla'), v: false}, {t: t('cal.collega'), cls: 'b-main', v: true}]});
  if (!ok || !dialogo.valore) return;
  const r = await A.cal_aggiungi(dialogo.valore);
  if (r.ok) toast(t('cal.ok', {n: r.n})); else await dialogo({titolo: t('cal.' + quale + '.t'), testo: r.msg || ''});
  disegnaCalendario();
}
async function orarioLezioni() {
  const c = await A.cal_elenco();
  const G = t('cal.giorni');
  const riga = (r = {giorno: 0, dalle: '09:00', alle: '11:00', nome: '', dove: 'aula'}) => `<div class="orrow">
    <select class="in sel">${G.map((g, i) => `<option value="${i}"${+r.giorno === i ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select>
    <input class="in" type="time" value="${esc(r.dalle)}"><input class="in" type="time" value="${esc(r.alle)}">
    <input class="in" placeholder="${esc(t('cal.or.nome'))}" value="${esc(r.nome)}" maxlength="90">
    <select class="in sel"><option value="aula"${r.dove === 'aula' ? ' selected' : ''}>${esc(t('cal.aula'))}</option><option value="online"${r.dove !== 'aula' ? ' selected' : ''}>${esc(t('cal.online'))}</option></select>
    <button class="lnk" title="${esc(t('togli'))}">✕</button></div>`;
  const html = `<div id="orLista">${(c.orario.length ? c.orario : [undefined]).map(r => riga(r)).join('')}</div><button class="lnk" id="orAgg">${esc(t('cal.or.agg'))}</button>`;
  const leggi = () => [...document.querySelectorAll('#orLista .orrow')].map(e => { const x = e.querySelectorAll('.in'); return {giorno: +x[0].value, dalle: x[1].value, alle: x[2].value, nome: x[3].value, dove: x[4].value}; }).filter(r => r.nome.trim());
  const p = dialogo({titolo: t('cal.or.t'), testo: t('cal.or.s'), html, bottoni: [{t: t('annulla'), v: false}, {t: t('cal.salva'), cls: 'b-main', fn: async () => { await A.cal_orario(leggi()); document.querySelector('.velo').remove(); disegnaCalendario(); }}]});
  const colega = () => document.querySelectorAll('#orLista .orrow .lnk').forEach(b => b.onclick = () => b.closest('.orrow').remove());
  setTimeout(() => { colega(); $('orAgg').onclick = () => { $('orLista').insertAdjacentHTML('beforeend', riga()); colega(); }; const d = document.querySelector('.velo .dlg'); if (d) d.style.maxWidth = '720px'; }, 0);
  return p;
}

/* ------------------------------------------------------------------ capitoli */
async function apriCapitoli(l) {
  $('cpSub').textContent = `${l.nome} · ${l.quando}`;
  $('cpLista').innerHTML = `<span class="spin"></span>`; $('cpMedia').innerHTML = '';
  vai('cap');
  const r = await A.capitoli(l.cartella);
  const C = r.capitoli || [];
  $('cpMedia').innerHTML = r.video ? (r.audio ? `<audio id="cpV" controls preload="metadata" src="${esc(r.video)}"></audio>` : `<video id="cpV" controls preload="metadata" src="${esc(r.video)}"></video>`)
    : `<div class="hint" style="padding:14px">${esc(t('mom.novid'))}</div>`;
  $('cpLista').innerHTML = C.length ? C.map((c, i) => `<div class="capi" data-i="${i}"><span class="t">${esc(c.inizio)}</span><div class="sp"><b>${esc(c.titolo)}</b>${c.dettaglio ? `<div class="hint">${esc(c.dettaglio)}</div>` : ''}</div><button class="lnk spz" title="${esc(t('sp.h'))}">✂</button></div>`).join('')
    : `<div class="hint">${esc(t('cp.vuoto'))}</div>`;
  SPZ = {l, C, durata: r.durata || 0};
  spSegna();
  $('cpLista').querySelectorAll('.spz').forEach(b => b.onclick = ev => {
    ev.stopPropagation();
    const i = +b.closest('.capi').dataset.i, c = C[i];
    const fine = i + 1 < C.length ? C[i + 1].sec : (SPZ.durata || c.sec + 120);
    $('spDa').value = hms(Math.floor(c.sec)); $('spA').value = hms(Math.round(Math.min(fine, c.sec + 3600))); spSegna();
    $('spCard').scrollIntoView({behavior: 'smooth', block: 'center'});
  });
  $('cpLista').querySelectorAll('.capi').forEach(e => e.onclick = () => {
    $('cpLista').querySelectorAll('.capi').forEach(x => x.classList.toggle('on', x === e));
    const v = $('cpV'), c = C[+e.dataset.i];
    if (!v) { mostraMomento(l.cartella, c.sec, null, l.nome); return; }
    try { v.currentTime = c.sec; v.play().catch(() => {}); } catch (err) {}
  });
}

/* ------------------------------------------------------------------ chi parla */
const COL_VOCI = ['#0369a1', '#7c3aed', '#c2410c', '#059669', '#be123c', '#a16207', '#0f766e', '#6d28d9', '#b45309', '#1d4ed8', '#9d174d', '#4d7c0f'];
const PILL_VOCI = [['#e0f2fe', '#0369a1'], ['#ede9fe', '#7c3aed'], ['#fff7ed', '#c2410c'], ['#ecfdf5', '#059669'], ['#fff1f2', '#be123c'], ['#fefce8', '#a16207']];
let VC = {lez: null, d: null};
const colVoce = id => COL_VOCI[((id || 1) - 1) % COL_VOCI.length];
async function apriVoci(l, rifai = false) {
  VC = {lez: l, d: null};
  $('vcSub').textContent = `${l.nome} · ${l.quando}`;
  $('vcRighe').innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(rifai ? t('vc.lav') : '…')}</div>`;
  $('vcPill').innerHTML = ''; $('vcMedia').innerHTML = '';
  vai('voci');
  const r = rifai ? await A.voci_rifai(l.cartella) : await A.voci(l.cartella);
  if (VC.lez !== l) return;
  if (r.ok === false) { $('vcRighe').innerHTML = `<div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>`; return; }
  disegnaVoci(r);
  if (rifai) caricaLezioni();
}
function disegnaVoci(d) {
  VC.d = d;
  const l = VC.lez, n = d.voci.length;
  $('vcSub').textContent = [l.nome, l.quando, d.durata, n > 1 ? t('vc.n', {n}) : n === 1 ? t('vc.n1') : ''].filter(Boolean).join(' · ');
  if (!$('vcMedia').innerHTML && d.video) $('vcMedia').innerHTML = d.audio ? `<audio id="vcV" controls preload="metadata" src="${esc(d.video)}"></audio>` : `<video id="vcV" controls preload="metadata" src="${esc(d.video)}"></video>`;
  $('vcNomi').classList.toggle('hidden', !n);
  if (!d.fatte) {
    $('vcRighe').innerHTML = `<div class="hint">${esc(t('vc.nessuna'))}</div><button class="btn b-main b-sm mt" id="vcVia">${ico('chat')}${esc(t('vc.avvia'))}</button>`;
    $('vcVia').onclick = () => apriVoci(l, true);
  } else {
    $('vcRighe').innerHTML = d.righe.map((r, i) => `<div class="spk" data-i="${i}"><div class="n" style="color:${r.voce ? colVoce(r.voce) : 'var(--mut)'}">${esc(r.chi || '—')}<span class="t">${esc(r.ora)}</span></div><div>${esc(r.testo)}</div></div>`).join('');
    $('vcRighe').querySelectorAll('.spk').forEach(e => e.onclick = () => {
      $('vcRighe').querySelectorAll('.spk').forEach(x => x.classList.toggle('on', x === e));
      const v = $('vcV'), r = d.righe[+e.dataset.i];
      if (!v) { mostraMomento(l.cartella, r.sec, null, l.nome); return; }
      try { v.currentTime = r.sec; v.play().catch(() => {}); } catch (err) {}
    });
  }
  $('vcPill').innerHTML = d.voci.map(v => { const c = PILL_VOCI[(v.id - 1) % PILL_VOCI.length] || ['#f1f5f9', colVoce(v.id)];
    return `<span class="pill" style="background:${c[0]};color:${colVoce(v.id)}">${esc(t('vc.voce', {n: v.id}))} → ${esc(v.mostra)}${v.suggerito ? ' ✨' : ''} · ${Math.round(v.quota * 100)}%</span>`; }).join('');
  document.querySelector('#v-voci [data-t="vc.nota"]').textContent = t(d.tipo === 'lezione' ? 'vc.nota.lez' : 'vc.nota');
}
async function nomiVoci() {
  const d = VC.d; if (!d || !d.voci.length) return;
  const proposte = [...new Set([...(d.partecipanti || []), ...d.voci.map(v => v.nome).filter(Boolean)])];
  const html = `<div>${d.voci.map(v => `<div class="vrow" data-id="${v.id}"><span class="dot" style="background:${colVoce(v.id)}"></span>
      <div class="q">${v.esempio ? `<button class="lnk" data-s="${v.esempio.sec}">▶ ${esc(t('vc.ascolta'))}</button> «${esc(v.esempio.testo)}»` : esc(t('vc.voce', {n: v.id}))}${v.suggerito ? `<div class="hint">✨ ${esc(t('vc.suggerito'))}</div>` : ''}</div>
      <input class="in" maxlength="60" placeholder="${esc(v.mostra || t('vc.chi'))}" value="${esc(v.nome || '')}"></div>`).join('')}</div>
    ${proposte.length ? `<div class="vchips">${proposte.map(p => `<button type="button">${esc(p)}</button>`).join('')}</div>` : ''}`;
  let ultimo = null;
  setTimeout(() => {
    const box = document.querySelector('.velo .dlg'); if (!box) return;
    box.style.maxWidth = '720px';
    box.querySelectorAll('.vrow .in').forEach(i => i.onfocus = () => { ultimo = i; });
    box.querySelectorAll('.vchips button').forEach(b => b.onclick = () => { const i = ultimo || [...box.querySelectorAll('.vrow .in')].find(x => !x.value); if (i) { i.value = b.textContent; i.focus(); } });
    box.querySelectorAll('.vrow [data-s]').forEach(b => b.onclick = () => { const v = $('vcV'); if (v) { try { v.currentTime = +b.dataset.s; v.play().catch(() => {}); } catch (e) {} } else mostraMomento(VC.lez.cartella, +b.dataset.s, null, VC.lez.nome); });
  }, 0);
  const salva = async () => {
    const out = {};
    document.querySelectorAll('.velo .vrow').forEach(r => { out[r.dataset.id] = r.querySelector('.in').value.trim(); });
    document.querySelector('.velo').remove();
    const r = await A.voci_nomi(VC.lez.cartella, out);
    if (r.ok) { disegnaVoci(r); toast(t('vc.salvato')); } else toast(r.msg || '');
  };
  return dialogo({titolo: t('vc.dlg.t'), testo: t('vc.dlg.s'), html, bottoni: [{t: t('annulla'), v: false}, {t: t('salva'), cls: 'b-main', fn: salva}]});
}

/* ------------------------------------------------------------------ preparazione all'esame */
let ES = {m: null, d: null};
async function apriEsame(m, rifai = false) {
  ES = {m, d: null};
  $('esTit').textContent = t('es.h', {m: m.m}); $('esSub').textContent = m.cartelle.length === 1 ? t('rp.lez1') : t('es.sub', {n: m.cartelle.length});
  $('esBox').innerHTML = `<div class="card"><div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('es.lav'))}</div></div>`;
  vai('esame');
  const d = await A.esame_info(m.m, m.cartelle, rifai);
  if (ES.m !== m) return;
  if (!d.ok) { $('esBox').innerHTML = `<div class="card"><div class="hint" style="color:#be123c">⚠ ${esc(d.msg || '')}</div></div>`; return; }
  ES.d = d; disegnaEsame();
}
const fmtG = (iso, o) => new Date(iso + 'T12:00').toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', o);
function disegnaEsame() {
  const d = ES.d, C = d.classifica || {domande: []};
  const quando = d.giorni == null ? `<span class="hint">${esc(t('es.nodata'))}</span>` : `<span class="pill ${d.giorni < 0 ? 'p-grey' : d.giorni <= 7 ? 'p-red' : 'p-blue'}">${esc(d.giorni > 0 ? t('es.tra', {n: d.giorni}) : d.giorni === 0 ? t('es.oggi') : t('es.passato'))}</span>`;
  const dom = C.domande.map((q, i) => `<div class="esq" data-i="${i}"><span class="st">${'★'.repeat(q.stelle)}</span><div class="sp"><b>${esc(q.domanda)}</b>
      <div class="hint">${esc(q.lezioni.length === 1 ? t('es.lez1') : t('es.lez', {n: q.lezioni.length}))}${q.lezioni.length ? ' (' + esc(q.lezioni.join(', ')) + ')' : ''}${q.perche ? ' · ' + esc(q.perche) : ''}</div>
      <ol class="hidden">${(q.schema || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol></div></div>`).join('');
  const P = d.piano || [];
  let piano = '';
  if (P.length) {
    const primo = new Date(P[0].giorno + 'T12:00'), vuoti = (primo.getDay() + 6) % 7;
    const celle = Array(vuoti).fill('<div class="esd vuoto"></div>').concat(P.map(g => `<div class="esd ${g.tipo}"><b>${esc(fmtG(g.giorno, {weekday: 'short', day: '2-digit', month: '2-digit'}))}</b>${g.cose.map(x => `<div>${esc(x)}</div>`).join('')}</div>`));
    piano = `<div class="escal">${celle.join('')}</div>`;
  }
  const voti = d.voti && d.voti.length ? `<div class="hint" style="margin-top:8px">${esc(t('es.voti', {v: d.voti.join(', ')}))}</div>` : '';
  $('esBox').innerHTML = `<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap"><div class="lbl sp" style="margin:0">${esc(t('es.data'))}</div><input class="in" type="date" id="esData" value="${esc(d.data_esame)}" style="width:170px">${quando}</div></div>
    <div class="card mt"><div class="lbl">${esc(t('es.dom'))}</div>${dom}
      <div class="row mt" style="justify-content:flex-end;gap:8px"><button class="lnk sp" id="esRifai" style="text-align:left">${esc(t('es.rifai'))}</button><button class="btn b-cor b-sm" id="esSim">${esc(t('es.sim'))}</button></div>${voti}</div>
    <div class="card mt" id="esSimBox"></div>
    <div class="card mt"><div class="row" style="margin-bottom:8px"><div class="lbl sp" style="margin:0">${esc(t('es.piano'))}</div>${P.length ? `<button class="btn b-ghost b-sm" id="esCal">${esc(t('es.cal'))}</button>` : ''}</div>
      ${piano || `<div class="hint">${esc(t('es.nodata'))}</div>`}<div class="hint" style="margin-top:8px">${esc(t('es.piano.s'))}</div></div>`;
  $('esData').onchange = async () => { await A.esame_data(ES.m.m, $('esData').value); apriEsame(ES.m); };
  $('esBox').querySelectorAll('.esq').forEach(e => e.onclick = () => e.querySelector('ol').classList.toggle('hidden'));
  $('esRifai').onclick = () => apriEsame(ES.m, true);
  $('esSim').onclick = () => nuovaSimulazione();
  if ($('esCal')) $('esCal').onclick = () => dialogo({titolo: t('es.cal.t'), testo: t('es.cal.s'), bottoni: ANDROID ? [{t: t('annulla'), v: false},
    {t: t('cd.cal.tel'), cls: 'b-main', fn: () => { A.esame_calendario(ES.m.m, 'telefono'); document.querySelector('.velo').remove(); }}] : [{t: t('annulla'), v: false},
    {t: 'Google Calendar', fn: () => { A.esame_calendario(ES.m.m, 'google'); document.querySelector('.velo').remove(); }}, {t: 'Outlook', cls: 'b-main', fn: () => { A.esame_calendario(ES.m.m, 'outlook'); document.querySelector('.velo').remove(); }}]});
  disegnaSimulazione(d.simulazione);
}
function disegnaSimulazione(sim) {
  const box = $('esSimBox');
  if (!sim) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const corr = sim.correzione || [];
  box.innerHTML = `<div class="row"><div class="lbl sp" style="margin:0">${esc(t('es.sim.h'))}</div>${sim.voto != null ? `<span class="pill ${sim.voto >= 18 ? 'p-ok' : 'p-red'}" style="font-size:14px">${esc(t('es.voto', {v: sim.voto}))}</span>` : ''}</div>
    ${sim.voto == null ? `<div class="hint" style="margin:4px 0 8px">${esc(t('es.sim.s'))}</div>` : ''}
    ${sim.domande.map((q, i) => { const c = corr.find(x => x.n === i + 1);
      return `<div class="essim"><b>${i + 1}. ${esc(q.domanda)}</b> <span class="hint">(${q.punti})</span>
        <textarea class="in" rows="4" data-i="${i}" placeholder="${esc(t('es.risp'))}"${sim.voto != null ? ' readonly' : ''}>${esc((sim.risposte || [])[i] || '')}</textarea>
        ${c ? `<div class="escorr"><b>${esc(t('es.punti', {p: num(c.punti), s: num(c.su)}))}</b>${c.bene ? `<div><span style="color:var(--ok)">✓</span> ${esc(c.bene)}</div>` : ''}${c.manca ? `<div><span style="color:#be123c">✗</span> ${esc(c.manca)}</div>` : ''}</div>` : ''}</div>`; }).join('')}
    ${sim.consiglio ? `<div class="avviso2 mt">${esc(sim.consiglio)}</div>` : ''}
    <div class="row mt" style="justify-content:flex-end;gap:8px">${sim.voto == null ? `<button class="btn b-main b-sm" id="esCorr">${esc(t('es.correggi'))}</button>` : `<button class="btn b-cor b-sm" id="esNuova">${esc(t('es.nuova'))}</button>`}</div>`;
  if ($('esCorr')) $('esCorr').onclick = async () => {
    const b = $('esCorr'); b.disabled = true; b.innerHTML = `<span class="spin" style="width:13px;height:13px"></span>${esc(t('es.corr.lav'))}`;
    const r = await A.esame_correggi(ES.m.m, [...box.querySelectorAll('textarea')].map(x => x.value));
    if (!r.ok) { b.disabled = false; b.textContent = t('es.correggi'); return toast(r.msg); }
    ES.d.simulazione = r.simulazione; ES.d.voti = (ES.d.voti || []).concat([r.simulazione.voto]); disegnaEsame(); $('esSimBox').scrollIntoView({block: 'start'});
  };
  if ($('esNuova')) $('esNuova').onclick = () => nuovaSimulazione();
}
async function nuovaSimulazione() {
  const box = $('esSimBox'); box.classList.remove('hidden');
  box.innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('es.sim.lav'))}</div>`;
  box.scrollIntoView({block: 'start'});
  const r = await A.esame_simulazione(ES.m.m);
  if (!r.ok) { box.innerHTML = `<div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>`; return; }
  ES.d.simulazione = r.simulazione; disegnaSimulazione(r.simulazione);
}

/* ------------------------------------------------------------------ cose da fare */
let CF = {filtro: 'aperte', chi: '', d: null};
function contaFare() { A.cose_da_fare().then(c => { $('navFare').textContent = c.aperte; $('navFare').classList.toggle('hidden', !c.aperte); }); }
async function apriCose() { disegnaCose(await A.cose_da_fare()); }
function disegnaCose(d) {
  CF.d = d;
  $('navFare').textContent = d.aperte; $('navFare').classList.toggle('hidden', !d.aperte);
  $('cfSub').textContent = !d.cose.length ? t('cf.sub0') : d.scadute ? t('cf.sub2', {a: d.aperte, s: d.scadute}) : t('cf.sub', {a: d.aperte});
  $('cfFiltri').classList.toggle('hidden', !d.cose.length);
  if (!d.cose.length) {
    const passo = (n) => `<div class="cfpasso"><div class="n">${n}</div><b>${esc(t('cf.v' + n + '.t'))}</b><span>${esc(t('cf.v' + n))}</span></div>`;
    $('cfLista').innerHTML = `<div class="cfvuoto"><div class="ic">✅</div><h3>${esc(t('cf.v.t'))}</h3><p>${esc(t('cf.v.s'))}</p>
      <div class="cfpassi">${passo(1)}${passo(2)}${passo(3)}</div>
      <button class="btn b-main" id="cfRiu">${esc(t('cf.v.b'))}</button><div class="hint" style="margin-top:14px">${esc(t('cf.v.studio'))}</div></div>`;
    $('cfRiu').onclick = async () => { await A.imposta('tipo', 'riunione'); R.tipo = 'riunione'; disegnaPronto(); vai('reg'); };
    return;
  }
  const chip = (k, v, n) => `<span class="chip${CF[k] === v ? ' on' : ''}" data-k="${k}" data-v="${esc(v)}">${esc(n)}</span>`;
  $('cfFiltri').innerHTML = chip('filtro', 'aperte', t('cf.aperte')) + chip('filtro', 'fatte', t('cf.fatte')) + chip('filtro', 'tutte', t('cf.tutte')) + '<span class="sp"></span>' +
    (d.persone.length > 1 ? chip('chi', '', t('cf.tutti')) + d.persone.map(p => chip('chi', p, p)).join('') : '');
  $('cfFiltri').querySelectorAll('.chip').forEach(c => c.onclick = () => { CF[c.dataset.k] = c.dataset.v; disegnaCose(CF.d); });
  const L = d.cose.filter(a => (CF.filtro === 'tutte' || (CF.filtro === 'fatte') === a.fatto) && (!CF.chi || a.chi === CF.chi));
  const fmt = a => a.data ? new Date(a.data + 'T12:00').toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {weekday: 'short', day: '2-digit', month: '2-digit'}) : (a.entro || '—');
  $('cfLista').innerHTML = !d.cose.length ? `<div class="hint">${esc(t('cf.vuoto'))}</div>` : !L.length ? `<div class="hint">${esc(t('cf.vuoto2'))}</div>` :
    `<div class="fare testa"><span></span><span>${t('cf.cosa')}</span><span>${t('cf.chi')}</span><span>${t('cf.entro')}</span><span>${t('cf.da')}</span></div>` +
    L.map(a => `<div class="fare${a.fatto ? ' ok' : ''}${a.scaduta ? ' tardi' : ''}" data-id="${a.id}"><input type="checkbox"${a.fatto ? ' checked' : ''}>
      <div><b>${esc(a.cosa)}</b>${a.fatto && a.come && a.come !== 'mano' ? `<div class="hint">${esc(t('cf.auto', {d: a.quando_fatto.slice(8, 10) + '/' + a.quando_fatto.slice(5, 7)}))}</div>` : ''}</div>
      <span>${esc(a.chi || '—')}</span><span class="en">${esc(fmt(a))}${a.scaduta ? ' ⚠' : ''}</span>
      <button class="lnk" data-sec="${a.sec ?? ''}">${esc(a.nome)} ${esc(a.giorno)}${a.sec != null ? ' ▶' : ''}</button></div>`).join('');
  $('cfLista').querySelectorAll('.fare[data-id]').forEach(r => {
    const a = d.cose.find(x => x.id === r.dataset.id);
    r.querySelector('input').onchange = async e => disegnaCose(await A.cosa_fatta(a.id, e.target.checked));
    r.querySelector('.lnk').onclick = () => { if (a.sec != null) mostraMomento(a.cartella, a.sec, null, a.nome); else { const l = LZ && LZ.lezioni.find(x => x.cartella === a.cartella); if (l) apriAppunti(a.cartella); } };
  });
}

/* ------------------------------------------------------------------ statistiche */
async function apriStatistiche(l) {
  $('stTit').textContent = l.nome; $('stSub').textContent = '';
  $('stBox').innerHTML = '<span class="spin"></span>';
  vai('stat');
  const d = await A.statistiche(l.cartella);
  const min = s => s < 90 ? Math.round(s) + ' s' : t('st.min', {n: Math.round(s / 60)});
  $('stSub').textContent = [l.quando, d.durata_t, d.voci_fatte ? t('vc.n', {n: d.persone.length}) : ''].filter(Boolean).join(' · ');
  const max = Math.max(1, ...d.persone.map(p => p.sec)), maxA = Math.max(1, ...d.argomenti.map(a => a.sec));
  const riga = (nome, larg, col, dx) => `<div class="strow"><b title="${esc(nome)}">${esc(nome)}</b><div><span class="sbar" style="width:${Math.max(2, larg)}%;background:${col}"></span></div><span>${dx}</span></div>`;
  const dom = d.persone.filter(p => p.domande).map(p => `${p.nome} ${p.domande}`).join(', ');
  $('stBox').innerHTML = `<div class="card"><div class="lbl">${esc(t('st.num'))}</div><div class="stnum">
      <div><b>${esc(d.durata_t || '–')}</b><span class="hint">${esc(t('st.durata'))}</span></div><div><b>${d.n_persone || '–'}</b><span class="hint">${esc(t('st.persone'))}</span></div>
      <div><b>${d.domande}</b><span class="hint">${esc(t('st.domande'))}</span></div><div><b>${d.azioni}</b><span class="hint">${esc(t('st.azioni'))}</span></div></div></div>
    <div class="card mt"><div class="lbl">${esc(t('st.parlato'))}</div>${d.voci_fatte ? d.persone.map(p => riga(p.nome, 100 * p.sec / max, colVoce(p.voce), `${Math.round(p.quota * 100)}% · ${esc(min(p.sec))}`)).join('') +
      `<div class="hint" style="margin-top:8px">${d.lungo ? esc(t('st.lungo', {n: d.lungo.nome, d: min(d.lungo.sec), o: d.lungo.ora})) + ' ' : ''}${dom ? esc(t('st.dom', {l: dom})) : ''}</div>`
      : `<div class="hint">${esc(t('st.novoci'))}</div><button class="btn b-main b-sm mt" id="stVoci">${ico('chat')}${esc(t('vc.avvia'))}</button>`}</div>
    <div class="card mt"><div class="lbl">${esc(t('st.arg'))}</div>${d.argomenti.length ? d.argomenti.map(a => riga(a.titolo, 100 * a.sec / maxA, '#0284c7', esc(min(a.sec)))).join('') : `<div class="hint">${esc(t('st.noarg'))}</div>`}</div>`;
  if ($('stVoci')) $('stVoci').onclick = () => apriVoci(l, true);
}

/* ------------------------------------------------------------------ cerca in tutto (parole dette) */
let CP = {timer: 0, tipo: '', q: ''};
const ACC = {a: '[aàáâä]', e: '[eèéêë]', i: '[iìíîï]', o: '[oòóôö]', u: '[uùúûü]', c: '[cç]', n: '[nñ]'};
function evidenzia(testo, parole) {
  let h = esc(testo);
  if (!parole || !parole.length) return h;
  const re = new RegExp('(' + parole.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split('').map(c => ACC[c] || c).join('')).join('|') + ')', 'gi');
  return h.replace(re, '<mark>$1</mark>');
}
function cercaParole() {
  clearTimeout(CP.timer);
  const q = $('cerca').value.trim();
  if (q.length < 3) { $('paroleRis').classList.add('hidden'); $('paroleRis').innerHTML = ''; return; }
  CP.timer = setTimeout(async () => {
    CP.q = q;
    const r = await A.cerca_parole(q, CP.tipo);
    if (CP.q !== $('cerca').value.trim()) return;
    disegnaParole2(r, q);
  }, 350);
}
function disegnaParole2(r, q) {
  const R2 = r.risultati || [], box = $('paroleRis');
  const chips = [['', 'cp.tutte'], ['riunione', 'cp.riu'], ['lezione', 'cp.lez'], ['webinar', 'cp.web']].map(([k, n]) => `<span class="chip${CP.tipo === k ? ' on' : ''}" data-tipo="${k}">${esc(t(n))}</span>`).join('');
  const testa = `<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px"><b style="color:var(--ink)">${esc(R2.length === 1 ? t('cp.detto1') : R2.length ? t('cp.detto', {n: R2.length}) : t('cp.nessuna', {q}))}</b>${R2.length ? `<span class="hint">· ${esc(t('cp.volte', {n: r.volte}))}</span>` : ''}<span class="sp"></span>${chips}</div>`;
  box.innerHTML = `<div class="card">${testa}${R2.map((x, i) => `<div class="lbl" style="margin-top:10px">${esc(x.nome)} · ${esc(x.quando)}</div>
    ${x.frasi.map((f, j) => `<div class="pris" data-i="${i}" data-j="${j}"><span class="t">${esc(f.ora)}</span><div>${f.chi ? `<b>${esc(f.chi)}:</b> ` : ''}${evidenzia(f.testo, r.parole)}</div></div>`).join('')}
    ${x.n > x.frasi.length ? `<div class="hint" style="padding-left:84px">${esc(t('cp.altre', {n: x.n - x.frasi.length}))}</div>` : ''}`).join('')}</div>`;
  box.classList.remove('hidden');
  box.querySelectorAll('.pris').forEach(e => e.onclick = () => { const x = R2[+e.dataset.i]; mostraMomento(x.cartella, x.frasi[+e.dataset.j].sec, null, x.nome); });
  box.querySelectorAll('[data-tipo]').forEach(c => c.onclick = () => { CP.tipo = c.dataset.tipo; cercaParole(); });
}

/* ------------------------------------------------------------------ condividi e collega */
const SERV = {slack: ['💬', '#f3e8ff'], teams: ['👥', '#e0e7ff'], notion: ['🧱', '#f1f5f9'], crm: ['🤝', '#ffedd5']};
const chiudiVelo = () => { const v = document.querySelector('.velo'); if (v) v.remove(); };
async function apriCondividi(l) {
  const info = await A.cond_info(l.cartella);
  if (!info.ok) { await dialogo({titolo: t('ar.cond'), testo: info.msg || ''}); return; }
  const nDate = info.azioni.filter(a => a.data).length + (info.prossima && info.prossima.data ? 1 : 0);
  const voci = info.azioni.length + (info.prossima ? 1 : 0);
  const tile = (k, i, b, sm, cls = '') => `<button class="tile ${cls}" data-k="${k}"><i>${i}</i><b>${esc(b)}</b><small>${sm}</small></button>`;
  const serv = s => { const x = info.servizi[s]; return tile(s, SERV[s][0], t('cd.' + s), x.collegato ? `<span class="ok2">✓</span> ${esc(x.nome)}` : t('cd.nonc'), x.collegato ? '' : 'da'); };
  const html = `<div class="tiles">${tile('email', '✉️', t('cd.email'), esc(t('cd.email.s')))}${tile('word', '📝', t('cd.word'), esc(t('cd.word.s')))}${ANDROID ? tile('manda', '📲', t('cd.manda'), esc(t('cd.manda.s'))) : tile('gdocs', '📄', t('cd.gdocs'), esc(t('cd.gdocs.s')))}
    ${voci ? tile('cal', '📅', t('cd.cal'), esc(t('cd.cal.s', {n: nDate || voci}))) : ''}${['slack', 'notion', 'teams', 'crm'].map(serv).join('')}</div>`;
  setTimeout(() => {
    const box = document.querySelector('.velo .dlg'); if (!box) return;
    box.style.maxWidth = '640px';
    box.querySelectorAll('.tile').forEach(b => b.onclick = () => azioneCondividi(l, info, b.dataset.k, b));
  }, 0);
  return dialogo({titolo: t(info.formato === 'verbale' ? 'cd.t.vb' : 'cd.t'), testo: l.nome, html, bottoni: [{t: t('chiudi'), v: false}]});
}
async function azioneCondividi(l, info, k, b) {
  const lav = () => { if (b) { b.disabled = true; b.querySelector('small').textContent = t('cd.lav'); } };
  if (k === 'email') { chiudiVelo(); return emailCondividi(l, info); }
  if (k === 'cal') { chiudiVelo(); return calendarioCondividi(l, info); }
  if (k === 'word') { lav(); const r = await A.cond_word(l.cartella); chiudiVelo(); toast(r.ok ? t('cd.word.ok') : r.msg); return; }
  if (k === 'manda') { lav(); const r = await A.cond_manda(l.cartella); chiudiVelo(); if (!r.ok) toast(r.msg); return; }
  if (k === 'gdocs') {
    lav(); const r = await A.cond_gdocs(l.cartella); chiudiVelo();
    if (!r.ok) return toast(r.msg);
    return dialogo(r.drive ? {titolo: t('cd.gdocs'), testo: t('cd.gdocs.ok', {f: r.nome})} : {titolo: t('cd.gdocs.no.t'), testo: t('cd.gdocs.no', {f: r.nome})});
  }
  if (!info.servizi[k].collegato) {
    chiudiVelo();
    const ok = await collegaServizio(k);
    if (!ok) return;
  } else lav();
  const r = await A.cond_invia(l.cartella, k);
  chiudiVelo();
  if (!r.ok) return dialogo({titolo: t('cd.' + k), testo: r.msg});
  if (r.url) { const x = await dialogo({titolo: t('cd.inviato', {s: t('cd.' + k)}), bottoni: [{t: t('chiudi'), v: false}, {t: t('cd.notion.apri'), cls: 'b-main', v: true}]}); if (x) A.apri(r.url); return; }
  toast(t('cd.inviato', {s: t('cd.' + k)}));
}
async function emailCondividi(l, info) {
  const html = `<div style="margin-top:6px">${info.partecipanti.map((p, i) => `<div class="dest"><b title="${esc(p.nome)}">${esc(p.nome)}</b><input class="in" data-n="${i}" type="email" placeholder="${esc(t('cd.em.ph'))}" value="${esc(p.email)}"></div>`).join('')}</div>
    <div class="lbl" style="margin-top:10px">${esc(t('cd.em.altri'))}</div><input class="in" id="emAltri" placeholder="${esc(t('cd.em.altri.ph'))}">
    <div class="lbl" style="margin-top:10px">${esc(t('cd.em.ogg'))}</div><input class="in" id="emOgg" value="${esc(info.oggetto)}">
    <div class="lbl" style="margin-top:10px">${esc(t('cd.em.testo'))}</div><textarea class="in" id="emTesto" rows="6" style="resize:vertical">${esc(info.testo)}</textarea>
    <div class="hint" style="margin-top:8px">${esc(t('cd.em.nota'))}</div><div class="dlgerr hidden" id="emErr"></div>`;
  const manda = modo => async () => {
    const dest = {}; document.querySelectorAll('.velo .dest .in').forEach(i => { dest[info.partecipanti[+i.dataset.n].nome] = i.value.trim(); });
    const altri = $('emAltri').value;
    if (!Object.values(dest).some(Boolean) && !altri.includes('@')) { $('emErr').textContent = t('cd.em.nessuno'); $('emErr').classList.remove('hidden'); return; }
    const r = await A.cond_email(l.cartella, {dest, altri, oggetto: $('emOgg').value, testo: $('emTesto').value, modo});
    if (!r.ok) { $('emErr').textContent = r.msg; $('emErr').classList.remove('hidden'); return; }
    chiudiVelo();
  };
  setTimeout(() => { const d = document.querySelector('.velo .dlg'); if (d) d.style.maxWidth = '640px'; }, 0);
  return dialogo({titolo: '✉️ ' + t('cd.em.t'), testo: t('cd.em.s'), html, bottoni: ANDROID ? [{t: t('annulla'), v: false}, {t: t('cd.em.apri'), cls: 'b-main', fn: manda('telefono')}]
    : [{t: t('annulla'), v: false}, {t: t('cd.em.gmail'), fn: manda('gmail')}, {t: t('cd.em.outlook'), cls: 'b-main', fn: manda('outlook')}]});
}
async function calendarioCondividi(l, info) {
  const righe = info.azioni.map((a, i) => ({i, cosa: a.cosa, chi: a.chi, data: a.data, ora: ''}));
  if (info.prossima) righe.push({i: 'prossima', cosa: t('cd.cal.pross'), chi: t('cd.cal.tutti'), data: info.prossima.data, ora: info.prossima.ora || '', pross: true});
  const html = `<table class="calt" style="width:100%;border-collapse:collapse;margin-top:8px"><tr><th></th><th>${esc(t('cd.cal.cosa'))}</th><th>${esc(t('cd.cal.chi'))}</th><th>${esc(t('cd.cal.quando'))}</th></tr>
    ${righe.map(r => `<tr data-i="${r.i}"><td><input type="checkbox"${r.data ? ' checked' : ''}></td><td>${r.pross ? `<b>${esc(r.cosa)}</b>` : esc(r.cosa)}</td><td>${esc(r.chi)}</td>
      <td style="white-space:nowrap"><input class="in" type="date" value="${esc(r.data)}">${r.pross ? ` <input class="in" type="time" value="${esc(r.ora)}">` : ''}</td></tr>`).join('')}</table>
    <div class="hint" style="margin-top:10px">${t('cd.cal.nota')}</div><div class="dlgerr hidden" id="calErr"></div>`;
  const manda = modo => async () => {
    const scelte = [...document.querySelectorAll('.velo .calt tr[data-i]')].filter(tr => tr.querySelector('input[type=checkbox]').checked)
      .map(tr => ({i: tr.dataset.i, data: tr.querySelector('input[type=date]').value, ora: (tr.querySelector('input[type=time]') || {}).value || ''})).filter(x => x.data);
    const r = await A.cond_calendario(l.cartella, scelte, modo);
    if (!r.ok) { $('calErr').textContent = r.msg; $('calErr').classList.remove('hidden'); return; }
    chiudiVelo(); toast(t(ANDROID && r.n > 1 ? 'cd.cal.ok.tel' : 'cd.cal.ok', {n: r.n}));
  };
  setTimeout(() => {
    const d = document.querySelector('.velo .dlg'); if (!d) return; d.style.maxWidth = '680px';
    d.querySelectorAll('.calt input[type=date]').forEach(i => i.oninput = () => { if (i.value) i.closest('tr').querySelector('input[type=checkbox]').checked = true; });
  }, 0);
  return dialogo({titolo: '📅 ' + t('cd.cal.t'), html, bottoni: ANDROID ? [{t: t('annulla'), v: false}, {t: t('cd.cal.tel'), cls: 'b-main', fn: manda('telefono')}]
    : [{t: t('annulla'), v: false}, {t: 'Google Calendar', fn: manda('google')}, {t: 'Outlook', cls: 'b-main', fn: manda('outlook')}]});
}
function collegaServizio(s) {
  return new Promise(fatto => {
    const campo = (id, ph, tipo = 'text') => `<input class="in" id="${id}" type="${tipo}" placeholder="${esc(ph)}" style="margin-top:8px" autocomplete="off">`;
    let html;
    if (s === 'notion') html = `<div class="passi2">${t('cg.notion.p')}</div>${campo('cgK', t('cg.notion.k'), 'password')}${campo('cgU', t('cg.notion.l'))}`;
    else if (s === 'crm') html = `<div class="seg" id="cgTipo" style="margin-top:6px"><span data-v="hubspot" class="on">${esc(t('cg.crm.hs'))}</span><span data-v="webhook">${esc(t('cg.crm.wh'))}</span></div>
      <div class="passi2" id="cgP">${t('cg.hs.p')}</div>${campo('cgK', t('cg.hs.k'), 'password')}${campo('cgU', t('cg.url'))}`;
    else html = `<div class="passi2">${t('cg.' + s + '.p')}</div>${campo('cgU', s === 'slack' ? 'https://hooks.slack.com/services/…' : t('cg.url'))}`;
    html += `<label class="ck" style="margin-top:10px"><input type="checkbox" id="cgAuto"> ${esc(t('cg.auto.ck'))}</label><div class="dlgerr hidden" id="cgErr"></div>`;
    let tipo = 'hubspot';
    const prova = async () => {
      const d = {auto: $('cgAuto').checked};
      if ($('cgU')) d.url = $('cgU').value.trim();
      if (s === 'notion') { d.chiave = $('cgK').value.trim(); d.pagina = d.url; }
      if (s === 'crm') { d.tipo = tipo; d.chiave = $('cgK').value.trim(); }
      const btn = document.querySelector('.velo .bt .b-main'); btn.disabled = true;
      const r = await A.collega(s, d);
      btn.disabled = false;
      if (!r.ok) { $('cgErr').textContent = r.msg; $('cgErr').classList.remove('hidden'); return; }
      chiudiVelo(); toast(t('cg.fatto', {n: r.nome})); if (!$('v-imp').classList.contains('hidden')) disegnaCollegamenti(); fatto(true);
    };
    setTimeout(() => {
      const d = document.querySelector('.velo .dlg'); if (!d) return; d.style.maxWidth = '640px';
      if (s === 'crm') {
        const mostra = () => { $('cgK').classList.toggle('hidden', tipo !== 'hubspot'); $('cgU').classList.toggle('hidden', tipo === 'hubspot'); $('cgP').innerHTML = t(tipo === 'hubspot' ? 'cg.hs.p' : 'cg.wh.p'); };
        d.querySelectorAll('#cgTipo span').forEach(b => b.onclick = () => { tipo = b.dataset.v; d.querySelectorAll('#cgTipo span').forEach(x => x.classList.toggle('on', x === b)); mostra(); });
        mostra();
      }
      d.querySelector('.bt button').onclick = () => { chiudiVelo(); fatto(false); };
    }, 0);
    dialogo({titolo: SERV[s][0] + ' ' + t('cg.' + s + '.t'), html, bottoni: [{t: t('annulla'), v: false}, {t: t('cg.prova'), cls: 'b-main', fn: prova}]});
  });
}
async function disegnaCollegamenti() {
  const c = await A.collegamenti();
  $('cgLista').innerHTML = ['slack', 'teams', 'notion', 'crm'].map(s => { const x = c[s];
    return `<div class="cgrow" data-s="${s}"><span class="ic" style="background:${SERV[s][1]}">${SERV[s][0]}</span><div class="sp"><b>${esc(s === 'crm' ? t('cg.crm.n') : t('cd.' + s))}</b><div class="hint">${esc(x.collegato ? x.nome : t('cg.' + s + '.s'))}</div></div>
      ${x.collegato ? `<span class="pill p-ok">${esc(t('cg.ok'))}</span><span class="hint">${esc(t('cg.auto'))}</span><div class="sw${x.auto ? ' on' : ''}" data-a="auto"></div><button class="lnk" data-a="togli">${esc(t('cg.togli'))}</button>`
        : `<button class="btn b-ghost b-sm" data-a="collega">${esc(t('cg.collega'))}</button>`}</div>`; }).join('');
  $('cgLista').querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
    const s = b.closest('.cgrow').dataset.s;
    if (b.dataset.a === 'collega') await collegaServizio(s);
    if (b.dataset.a === 'togli') { await A.scollega(s); disegnaCollegamenti(); }
    if (b.dataset.a === 'auto') { await A.collega_auto(s, !b.classList.contains('on')); disegnaCollegamenti(); }
  });
}

/* ------------------------------------------------------------------ spezzoni */
let SPZ = {l: null, C: [], durata: 0};
const daHms = v => { const p = String(v || '').trim().split(/[:.]/).map(Number); if (p.some(isNaN)) return NaN; return p.reduce((a, x) => a * 60 + x, 0); };
function spSegna() {
  const v = $('cpV'), d = (v && v.duration && isFinite(v.duration)) ? v.duration : (SPZ.durata || 0);
  const a = daHms($('spDa').value), b = daHms($('spA').value);
  if (d && !isNaN(a) && !isNaN(b) && b > a) { $('spSel').style.left = (100 * a / d) + '%'; $('spSel').style.width = Math.max(0.6, 100 * (b - a) / d) + '%'; $('spSel').classList.remove('hidden'); }
  else $('spSel').classList.add('hidden');
  if (v && d) $('spPos').style.left = (100 * (v.currentTime || 0) / d) + '%';
  const cap = [...SPZ.C].reverse().find(c => c.sec <= a + 1);
  $('spDur').textContent = !isNaN(a) && !isNaN(b) && b > a ? t('sp.dur', {d: durataBreve(b - a), c: cap ? cap.titolo : ''}).replace(' · «»', '') : '';
}
const durataBreve = s => s < 60 ? Math.round(s) + ' s' : Math.floor(s / 60) + ' min' + (Math.round(s % 60) ? ' ' + Math.round(s % 60) + ' s' : '');
async function faiSpezzone(soloAudio) {
  const a = daHms($('spDa').value), b = daHms($('spA').value);
  const btn = soloAudio ? $('spAudio') : $('spVideo'); const prima = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = `<span class="spin" style="width:13px;height:13px"></span>${esc(t('sp.lav'))}`;
  const r = await A.spezzone(SPZ.l.cartella, a, b, soloAudio);
  btn.disabled = false; btn.innerHTML = prima;
  if (!r.ok) return dialogo({titolo: t('sp.h'), testo: r.msg});
  dialogo({titolo: t('sp.ok.t'), testo: t('sp.ok', {f: r.nome, mb: num(r.mb)}), bottoni: [{t: t('sp.email'), fn: () => { A.spezzone_email(r.file); document.querySelector('.velo').remove(); }},
    {t: t('sp.cartella'), fn: () => { A.mostra_file(r.file); document.querySelector('.velo').remove(); }}, {t: t('sp.apri'), cls: 'b-main', fn: () => { A.apri(r.file); document.querySelector('.velo').remove(); }}]});
}

/* ------------------------------------------------------------------ infografica */
let IG = {lez: null, dati: null};
async function apriInfografica(l, rifai = false) {
  IG = {lez: l, dati: null};
  $('igSub').textContent = `${l.nome} · ${l.quando}`;
  $('igBox').innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('ig.lav'))}</div>`;
  vai('ig');
  const r = await A.infografica(l.cartella, rifai);
  if (IG.lez !== l) return;
  if (!r.ok) { $('igBox').innerHTML = `<div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>`; return; }
  const d = IG.dati = r.dati;
  const num_ = [d.durata, d.n_slide ? t('ig.slide', {n: d.n_slide}) : '', d.n_capitoli ? t('ig.cap', {n: d.n_capitoli}) : ''].filter(Boolean).join(' · ');
  $('igBox').innerHTML = `<div class="ig"><div><div class="occ">${esc((d.nome + ' · ' + d.data).toUpperCase())}</div><h3>${esc(d.titolo)}</h3>
    ${d.concetti.map(c => `<div class="k${c.importante ? ' top' : ''}"><b>${esc(c.grande)}</b>${esc(c.testo)}</div>`).join('')}</div>
    <div><div class="k"><small>${esc(t('ig.passi').toUpperCase())}</small><ol>${d.passi.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>
    ${d.attenzione || d.citazione ? `<div class="k"><small>${esc(t('ig.att').toUpperCase())}</small>${esc(d.attenzione)}${d.citazione ? `<div style="margin-top:6px;opacity:.85">«${esc(d.citazione)}»</div>` : ''}</div>` : ''}
    ${num_ ? `<div class="k"><small>${esc(t('ig.num').toUpperCase())}</small>${esc(num_)}</div>` : ''}</div></div>`;
  if (!rifai) caricaLezioni();
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
  $('quandoBox').querySelectorAll('.aiopt').forEach(o => o.onclick = () => { QUANDO = o.dataset.q; disegnaQuando(); });
  $('tipoBox').querySelectorAll('.aiopt').forEach(o => o.onclick = async () => { await A.imposta('tipo', o.dataset.k); R.tipo = o.dataset.k; disegnaPronto(); });
  $('partIn').addEventListener('keydown', e => { if (e.key === 'Enter') aggiungiPartecipante(); });
  $('partAgg').onclick = aggiungiPartecipante;
  const salvaMio = async () => {
    const r = await A.imposta('mio', {nome: $('mioNome').value, descrizione: $('mioDesc').value});
    if (r.ok) { R = await A.riepilogo(); toast(t('mio.salvato')); }
  };
  $('mioNome').addEventListener('change', salvaMio);
  $('mioDesc').addEventListener('change', async () => { await salvaMio(); if (MIO_SCELTO && $('mioDesc').value.trim()) { await A.imposta('formato_appunti', 'mio'); await rileggi(); } });
  $('mioProva').onclick = async () => {
    if (!$('mioDesc').value.trim()) { toast(t('mio.desc.ph')); $('mioDesc').focus(); return; }
    if (!await conferma(t('mio.prova.t'), t('mio.prova.x'), t('mio.prova'), t('annulla'), 'b-cor')) return;
    const b = $('mioProva'); b.disabled = true; b.innerHTML = '<span class="spin" style="width:14px;height:14px"></span>';
    try {
      const r = await A.prova_mio({nome: $('mioNome').value, descrizione: $('mioDesc').value});
      if (r.ok) toast(t('mio.prova.ok', {n: r.lezione, c: num(r.spesa)})); else await dialogo({titolo: t('mio.h'), testo: r.msg || ''});
    } finally { b.disabled = false; b.textContent = t('mio.prova'); }
  };
  $('calGoogle').onclick = () => collegaCalendario('g');
  $('calOutlook').onclick = () => collegaCalendario('o');
  $('calAltro').onclick = () => collegaCalendario('a');
  $('calOrario').onclick = orarioLezioni;
  $('igPdf').onclick = async () => { if (!IG.dati) return; const r = await A.infografica_pdf(IG.lez.cartella, true); if (r.ok) toast(t('ig.salvata')); };
  $('igRifai').onclick = async () => { if (IG.lez && await conferma(t('ig.rifai.t'), t('ig.rifai.c'))) apriInfografica(IG.lez, true); };
  $('segQuando').querySelectorAll('span').forEach(x => x.onclick = async () => { await A.imposta('quando', x.dataset.v); QUANDO = null; await rileggi(); });
  $('swCarica').onclick = async () => { await A.imposta('solo_carica', !R.solo_carica); await rileggi(); };
  $('andAgg').onclick = () => { vai('info'); A.cerca_aggiornamenti(); };
  $('swPrec').onclick = async () => { await A.imposta('trascrizione_precisa', !R.precisa); await rileggi(); };
  $('swVoci').onclick = async () => { await A.imposta('chi_parla', !R.chi_parla); await rileggi(); };
  $('swRap').onclick = async () => { await A.imposta('rapporti_errori', !R.rapporti); await rileggi(); };
  $('vcNomi').onclick = () => nomiVoci();
  $('vcRifai').onclick = () => VC.lez && apriVoci(VC.lez, true);
  $('vcStat').onclick = () => VC.lez && apriStatistiche(VC.lez);
  $('esPdf').onclick = () => ES.m && A.esame_pdf(ES.m.m);
  ['spDa', 'spA'].forEach(i => $(i).addEventListener('input', spSegna));
  $('spDaQui').onclick = () => { const v = $('cpV'); if (v) { $('spDa').value = hms(Math.floor(v.currentTime || 0)); spSegna(); } };
  $('spAQui').onclick = () => { const v = $('cpV'); if (v) { $('spA').value = hms(Math.ceil(v.currentTime || 0)); spSegna(); } };
  $('spVideo').onclick = () => faiSpezzone(false); $('spAudio').onclick = () => faiSpezzone(true);
  setInterval(() => { if (!$('v-cap').classList.contains('hidden') && $('cpV')) spSegna(); }, 500);
  $('notaIn').addEventListener('keydown', e => { if (e.key === 'Enter') aggiungiNota(''); });
  $('ddIn').addEventListener('keydown', e => { if (e.key === 'Enter') chiediDiretta(); });
  $('ddVai').onclick = () => chiediDiretta();
  document.querySelectorAll('[data-nota]').forEach(c => c.onclick = () => aggiungiNota(c.dataset.nota));
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
    if (!m) M.push(m = {m: l.materia, cartelle: [], n: 0, no: 0, tre: 0, lezioni: true});
    if ((l.tipo || 'lezione') !== 'lezione') m.lezioni = false;
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
    const opz = x => [x.m, t('rp.dom', {n: x.n})].concat(x.no ? [t('rp.dariv', {n: x.no})] : []).join(' · ');
    const scelta = M.length > 1 ? `<select class="sel" id="bandaMat">${M.map(x => `<option value="${esc(x.m)}"${x.m === m.m ? ' selected' : ''}>${esc(opz(x))}</option>`).join('')}</select>`
      : `<span class="hint">${esc(opz(m))}</span>`;
    h = `<div class="banda corta"><b class="bt">${ico('cards')}${esc(t('rp.corto'))}</b>${scelta}<span class="sp"></span>
      ${m.lezioni ? `<button class="btn b-cor b-sm" id="bandaEsame">${esc(t('es.banda'))}</button>` : ''}<button class="btn b-rip b-sm" id="bandaVai">${ico('cards')}${esc(t('rp.corto'))}</button></div>`;
  }
  const b = $('ripBanda');
  if (b.dataset.h === h) return;
  b.dataset.h = h; b.innerHTML = h;
  if ($('bandaMat')) $('bandaMat').onchange = () => { materiaRip = $('bandaMat').value; disegnaBanda(); };
  if ($('bandaVai')) $('bandaVai').onclick = () => sceltaRipasso(M.find(x => x.m === materiaRip) || M[0]);
  if ($('bandaEsame')) $('bandaEsame').onclick = () => apriEsame(M.find(x => x.m === materiaRip) || M[0]);
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
  $('cSc').innerHTML = c.schema.map(x => `<li>${esc(x)}</li>`).join('') +
    (c.aggiunte || []).map(x => `<li class="agg">${esc(x)} <span class="aggb">${esc(t('rp.agg'))}</span></li>`).join('');
  $('cAv').innerHTML = (c.avvisi || []).map(x => `<div class="avv">⚠ ${esc(t('rp.dav'))}: ${esc(x)}</div>`).join('');
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
      <div class="hint" style="margin:4px 0 10px">${esc(nov)}${d.completo ? '<br>' + t('ag.completo') : '<br><br>' + esc(t('ag.riapri.s'))}</div>
      <div class="row"><span class="sp"></span><button class="btn b-ghost b-sm" id="aggX">${t('ag.tardi')}</button><button class="btn b-main b-sm" id="aggOk">${d.completo ? t('ag.pagina') : t('ag.riapri')}</button></div></div>`;
  } else if (g.tipo === 'scarico') h = `<div class="card" style="padding:12px 14px">${t('ag.scarico', {p: Math.round((g.perc || 0) * 100)})}<div class="bar"><i style="width:${(g.perc || 0) * 100}%"></i></div></div>`;
  else if (g.tipo === 'fatto') h = `<div class="card row" style="padding:12px 14px"><span class="pill p-ok">✓</span><span>${esc(g.testo)}</span></div>`;
  const b = $('aggBox');
  if (b.dataset.h === h) return;
  b.dataset.h = h; b.innerHTML = h;
  if ($('aggX')) $('aggX').onclick = () => A.chiudi_agg();
  if ($('aggOk')) $('aggOk').onclick = () => A.installa_aggiornamento();
}

/* ------------------------------------------------------------------ tasto destro: Taglia, Copia, Incolla */
(() => {
  if (ANDROID) return;      // sul telefono c'e' il menu del telefono (tocco lungo)
  const via = () => { const m = document.getElementById('menuDx'); if (m) m.remove(); };
  document.addEventListener('click', via, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') via(); });
  window.addEventListener('blur', via);
  document.addEventListener('contextmenu', e => {
    via();
    const el = e.target.closest('input:not([type=checkbox]):not([type=radio]):not([type=date]):not([type=time]), textarea');
    const selTesto = String(window.getSelection() || '');
    if (!el && !selTesto) { e.preventDefault(); return; }
    e.preventDefault();
    const scrivibile = el && !el.readOnly && !el.disabled;
    const sel = el ? (el.selectionEnd || 0) - (el.selectionStart || 0) > 0 && el.type !== 'password' : !!selTesto;
    const voci = el ? [['taglia', 'dx.taglia', 'Ctrl+X', scrivibile && sel], ['copia', 'dx.copia', 'Ctrl+C', sel], ['incolla', 'dx.incolla', 'Ctrl+V', scrivibile], null, ['tutto', 'dx.tutto', 'Ctrl+A', true]]
      : [['copia', 'dx.copia', 'Ctrl+C', true]];
    const m = document.createElement('div');
    m.className = 'menu'; m.id = 'menuDx';
    m.innerHTML = voci.map(v => v ? `<button data-a="${v[0]}"${v[3] ? '' : ' disabled'}><span class="sp">${esc(t(v[1]))}</span><small class="hint">${v[2]}</small></button>` : '<div class="menusep"></div>').join('');
    document.body.appendChild(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(e.clientX, innerWidth - r.width - 8) + 'px';
    m.style.top = Math.min(e.clientY, innerHeight - r.height - 8) + 'px';
    m.querySelectorAll('button').forEach(b => b.onclick = async ev => {
      ev.stopPropagation(); via();
      const a = b.dataset.a;
      if (el) el.focus();
      if (a === 'copia' || a === 'taglia') document.execCommand(a === 'copia' ? 'copy' : 'cut');
      else if (a === 'tutto') el.select();
      else if (a === 'incolla') {
        let x = await A.appunti_testo();
        if (!x && navigator.clipboard) try { x = await navigator.clipboard.readText(); } catch (_) {}
        if (!x) return;
        if (el.tagName === 'INPUT') x = x.replace(/[\r\n]+/g, ' ').trim();
        const s0 = el.selectionStart ?? el.value.length, s1 = el.selectionEnd ?? el.value.length;
        el.setRangeText(x, s0, s1, 'end');
        el.dispatchEvent(new Event('input', {bubbles: true}));
      }
    });
  });
})();
