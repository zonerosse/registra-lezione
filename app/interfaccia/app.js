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
  disegnaFacilitata();
  inizializza();
  disegnaHoPronto();
  $('splash').classList.add('via');
  setTimeout(() => $('splash').remove(), 500);
  if (!R.lingua_scelta) benvenuto();
  else if (!R.privacy_ok) primaDiIniziare();
  else if (!R.rapporti_chiesto) chiediRapporti();
  else invitoCopiato();
  contaFare();
  ciclo();
  setTimeout(() => { try { if (!S || !S.registro) A.cerca_aggiornamenti(true); } catch (e) {} }, 4000);   // avviso all'apertura, se c'e' una versione nuova
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
// aprendo o tornando su Verba Manent: le lezioni nuove degli altri dispositivi arrivano subito dal cloud
function nuvolaPresto() { try { if (A && A.nuvola_presto && document.visibilityState !== 'hidden') A.nuvola_presto(); } catch (e) {} }
document.addEventListener('visibilitychange', nuvolaPresto);
window.addEventListener('focus', nuvolaPresto);
// telefono, tasto «Indietro»: chiude dialogo o menu, altrimenti torna a Registra. false = l'app va dietro
window.indietro = () => {
  if (videoInteroChiudi()) return true;
  const m = document.querySelector('.menu'); if (m) { m.remove(); return true; }
  const v = [...document.querySelectorAll('.velo')].pop();
  if (v) { const b = v.querySelector('.bt button'); if (b) b.click(); else v.remove(); return true; }
  if (STORIA.length) { const b = $('v-' + pagina).querySelector(':scope > .perc .torna'); if (b) b.click(); else vai('arch'); return true; }
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
        const ta = v.querySelector('textarea'); dialogo.area = ta ? ta.value : null;
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
const INTERNE = ['lg', 'dp', 'lezione', 'podcast', 'karaoke', 'verifica', 'rg', 'lm', 'sy', 'gl', 'tu', 'lb', 'fo', 'sc', 'ru', 'rip', 'chiedi', 'mappa', 'ascolta', 'cap', 'ig', 'voci', 'stat', 'esame'];
let STORIA = [];
function titoloPagina(p) {
  const n = document.querySelector(`#nav a[data-p="${p}"]`);
  if (n) return (n.querySelector('span[data-t]') || n).textContent.trim();
  const h = $('v-' + p) && $('v-' + p).querySelector('h2');
  return h ? h.textContent.trim() : '';
}
// La barra del percorso, uguale in tutte le pagine interne: «← Indietro» e da dove sei arrivato
// (es. «🎓 Studia · Fisiologia › 🎯 Preparazione all'esame»); ogni parte blu riporta li'.
const ICO_PAG = {lg: '🔊', dp: '🎙', sy: '🔄', fo: '📷', sc: '✍', ru: '🔇', lb: '📘', tu: '🧑‍🏫', gl: '📖', lm: '👓', rg: '🃏', dsa: '⭐', verifica: '🗺', karaoke: '🎤', podcast: '🎧', arch: '📚', studia: '🎓', lezione: '📄', esame: '🎯', rip: '🃏', chiedi: '💬', mappa: '🗺', ascolta: '🔊', cap: '📑', ig: '🖼', voci: '👥', stat: '📊',
                 reg: '⏺', fare: '✓', imp: '⚙', guida: '📖', info: 'ℹ', lic: '📄'};
function nomePagina(p) {
  if (p === 'lezione' && LEZ) return LEZ.nome;
  if (p === 'podcast') return t('tl.pc');
  if (p === 'karaoke') return t('tl.kk');
  if (p === 'verifica') return t('tl.mv');
  if (p === 'rg') return t('rg.h');
  if (p === 'lm') return t('lm.nome');
  if (p === 'sy') return t('sy.nome');
  if (p === 'gl') return t('gl.nome');
  if (p === 'tu') return t('tu.nome');
  if (p === 'lb') return t('lb.nome');
  if (p === 'fo') return t('fo.nome');
  if (p === 'sc') return t('sc.nome');
  if (p === 'ru') return t('ru.nome');
  if (p === 'lg') return t('lg.nome');
  if (p === 'dp') return t('dp.nome');
  if (p === 'rip') return RP && RP.giorno ? RP.titolo : t('tl.flash');
  if (p === 'studia') return t('nav.studia') + (STU.m ? ' · ' + STU.m : '');
  return titoloPagina(p) || t('indietro');
}
function barraPercorso(p) {
  const sec = $('v-' + p);
  let b = sec.querySelector(':scope > .perc');
  if (!b) { b = document.createElement('div'); b.className = 'perc'; sec.insertBefore(b, sec.firstChild); }
  const giro = [...STORIA, p];
  b.innerHTML = `<button class="torna">← ${esc(t('indietro'))}</button><div class="briciole">` +
    giro.map((x, i) => (i ? '<span class="sep">›</span>' : '') + (i === giro.length - 1 ? `<b>${esc(nomePagina(x))}</b>`
      : `<a data-i="${i}">${esc(nomePagina(x))}</a>`)).join('') + '</div>';
  b.querySelector('.torna').onclick = () => { const prima = STORIA.pop() || 'arch'; vai(prima, true); };
  b.querySelectorAll('.briciole a').forEach(a => a.onclick = () => { const i = +a.dataset.i, x = giro[i]; STORIA = STORIA.slice(0, i); vai(x, true); });
}
function vai(p, tornando = false) {
  if (p !== 'esame' && OR && OR.orale) orChiudi();
  if (p !== 'ascolta' && AS && AS.attivo) asFerma();
  if (p !== 'podcast' && PCS && PCS.attivo) pcFerma();
  if (p !== 'karaoke' && KK && KK.au) KK.au.pause();
  if (p !== 'gl' && GL && GL.au) GL.au.pause();
  if (p !== 'lb' && LB && LB.poll) { clearInterval(LB.poll); LB.poll = null; }
  if (p !== 'ru' && RU && RU.poll) { clearInterval(RU.poll); RU.poll = null; }
  if (p !== 'sy' && SY.poll) syChiudi();
  if (p !== 'rip' && RP && RP.ascolto) { RP.ascolto = false; try { A.detta_fine(); } catch (e) {} }
  if (p !== 'lg' && LG.attivo) lgFerma();
  if (DT) dettaVia();
  if (!tornando) {
    const interna = INTERNE.includes(p) || (p === 'studia' && STU.dentro);
    STU.dentro = false;
    if (interna) { if (pagina && pagina !== p && STORIA[STORIA.length - 1] !== pagina) STORIA.push(pagina); if (STORIA.length > 12) STORIA.shift(); }
    else STORIA = [];
  }
  pagina = p;
  // nel menu resta acceso da dove si e' partiti (Le mie registrazioni o Studia)
  const radice = STORIA.length ? STORIA[0] : p;
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.p === (['lezione', 'podcast', 'karaoke', 'rip', 'chiedi', 'mappa', 'ascolta', 'cap', 'ig', 'voci', 'stat', 'esame'].includes(radice) ? 'arch' : radice === 'lic' ? 'info' : radice)));
  ['pronto', 'importa', 'itesto', 'reg', 'fine', 'arch', 'dsa', 'lg', 'dp', 'rg', 'lm', 'sy', 'gl', 'tu', 'lb', 'fo', 'sc', 'ru', 'lezione', 'podcast', 'karaoke', 'verifica', 'studia', 'rip', 'chiedi', 'mappa', 'ascolta', 'cap', 'ig', 'voci', 'stat', 'esame', 'fare', 'imp', 'guida', 'info', 'lic'].forEach(x => $('v-' + x).classList.add('hidden'));
  if (p === 'reg') $('v-' + ((S.vista || 'pronto') === 'pronto' && IT ? 'itesto' : (S.vista || 'pronto') === 'pronto' && IV ? 'importa' : (S.vista || 'pronto'))).classList.remove('hidden');
  else $('v-' + p).classList.remove('hidden');
  document.querySelectorAll('.pg > .perc').forEach(x => x.remove());
  if (STORIA.length) barraPercorso(p);
  $('main').scrollTop = 0;
  if (p === 'arch') caricaLezioni();
  if (p === 'dsa') disegnaSpazioDsa();
  if (p === 'lg') apriLeggimi();
  if (p === 'dp') apriDetta();
  if (p === 'lm') disegnaLM();
  if (p === 'sy') apriSY();
  segnaUso(p);
  if (p === 'studia') apriStudia();
  if (p === 'fare') apriCose();
  if (p === 'imp') { avanzate(); disegnaCloud(); disegnaInviti(); disegnaImpostazioni(); disegnaParole(); disegnaCalendario(); disegnaCollegamenti(); }
  if (p === 'info') { disegnaAgg(); $('swRap').classList.toggle('on', !!R.rapporti); }
  if (p === 'lic') apriLicenze();
  if (p === 'guida') disegnaGuida(linguaGuida || LINGUA);
  if (p === 'reg' && S.vista === 'pronto') { setTimeout(() => $('nome').focus(), 50); }
}

/* ------------------------------------------------------------------ icone a linea al posto delle emoji */
// Nei riquadri (.ico) le emoji diventano icone disegnate, tutte dello stesso stile e colore. Si guarda prima
// l'azione del riquadro (karaoke e interrogazione hanno la stessa emoji 🎤), poi l'emoji.
const ICO_AZ = {karaoke: 'g-kar', orale: 'i-mic', detta: 'i-mic', reg: 'g-reg', glos: 'g-libro', libro: 'g-libro', leggimi: 'g-voce', ascolta: 'g-voce', ascm: 'g-voce'};
const ICO_EM = {'📄': 'g-note', '🔊': 'g-voce', '📅': 'g-cal', '🗓': 'g-cal', '📑': 'g-cap', '💬': 'i-chat', '📤': 'i-share', '✉': 'g-mail', '🃏': 'i-cards',
  '📷': 'g-foto', '🖼': 'g-img', '🎤': 'g-kar', '📖': 'g-libro', '📘': 'g-libro', '📚': 'g-lezioni', '📲': 'g-tel', '🗺': 'i-map', '🎧': 'g-cuffie', '⭐': 'g-stella',
  '✍': 'g-penna', '✂': 'g-forbici', '🎓': 'g-tocco', '☑': 'g-test', '📝': 'g-note', '🧑‍🏫': 'g-tutor', '▶': 'g-play', '🎙': 'i-mic', '🖨': 'g-stampa', '📋': 'g-lista',
  '⏺': 'g-reg', '⚡': 'g-lampo', '🔇': 'g-voce', '🎯': 'g-test', '👥': 'g-tutor', '📊': 'g-lista'};
function icoLinea(el) {
  if (el.firstElementChild) return;
  const em = (el.textContent || '').trim().replace(/️/g, '');
  if (!em) return;
  const az = el.closest('[data-ta],[data-sd]'), k = az && (az.dataset.ta || az.dataset.sd);
  const id = (k && ICO_AZ[k]) || ICO_EM[em];
  if (id) { el.innerHTML = `<svg><use href="#${id}"/></svg>`; el.classList.add('ico-l'); }
}
function icoTutte(r) { if (r.matches && r.matches('.ico')) icoLinea(r); if (r.querySelectorAll) r.querySelectorAll('.ico').forEach(icoLinea); }
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) icoTutte(n); else if (n.parentElement && n.parentElement.matches('.ico')) icoLinea(n.parentElement); })))
  .observe(document.documentElement, {childList: true, subtree: true});
document.addEventListener('DOMContentLoaded', () => icoTutte(document.body));
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
  $('lmApri').onclick = () => vai('lm');
  $('syApri').onclick = () => vai('sy');
  $('footSync').onclick = () => vai('sy');
  $('licIndietro').onclick = () => vai('info');
  // pronto
  $('nome').addEventListener('input', () => { anteprimaNome(); modelloDaNome(); controllaNomeRec(); });
  $('materia').addEventListener('input', () => { clearTimeout(MPF.t); MPF.t = setTimeout(disegnaMatProf, 400); anteprimaNome(); controllaNomeRec(); $('recenti').querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.m.toLowerCase() === $('materia').value.trim().toLowerCase())); });
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
async function rileggi() { R = await A.riepilogo(); disegnaImpostazioni(); disegnaInviti(); disegnaPronto(); disegnaHoPronto(); }
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
  disegnaPronto(); disegnaImpostazioni(); disegnaStato(); controllaNomeRec();
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
    if (!rileggi) { if (!ANDROID && window.iniziaQui) iniziaQui(invitoCopiato); else invitoCopiato(); }   // «Inizia qui» (inizia.js): Google, Claude, telefono e web
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
  footSync();
  $('navRec').classList.toggle('hidden', !S.registro);
  const nuovo = S.agg && S.agg.tipo === 'trovato';
  const fa = esc(t('agg')) + (nuovo ? '<span class="nuovo"></span>' : '');
  if ($('footAgg').innerHTML !== fa) $('footAgg').innerHTML = fa;
}

/* ------------------------------------------------------------------ nomi unici */
// Ogni campo «nome»: controlla (con un attimo di pausa) che il nome non sia vuoto né già usato;
// sotto scrive il motivo e propone nomi liberi; finché non va, il bottone resta spento.
const NOMI = {};
function nomeCompleto() {
  const m = ($('materia') && R && (R.tipo || 'lezione') === 'lezione') ? $('materia').value.trim() : '', n = $('nome').value.trim();
  if (!m || !n || n.toLowerCase().startsWith(m.toLowerCase())) return n;
  return m + ' – ' + n;
}
function controllaNome(id, msgId, btnId, ok2 = null) {
  const st = NOMI[id] || (NOMI[id] = {ok: false, t: null, n: 0});
  clearTimeout(st.t);
  st.t = setTimeout(async () => {
    const n = ++st.n, val = id === 'nome' ? nomeCompleto() : $(id).value;
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
      m.querySelectorAll('.chip').forEach(c => c.onclick = () => { let v2 = c.dataset.p; const mt = id === 'nome' && $('materia') ? $('materia').value.trim() : ''; if (mt && v2.startsWith(mt + ' – ')) v2 = v2.slice(mt.length + 3); inp.value = v2; inp.dispatchEvent(new Event('input')); });
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
  const n = nomeCompleto();
  if (!n) { $('nomeAnt').textContent = ''; return; }        // senza nome niente anteprima (il nome serve)
  const d = new Date();
  const ora = LINGUA === 'it' ? `ore ${due(d.getHours())}.${due(d.getMinutes())}` : `${due(d.getHours())}:${due(d.getMinutes())}`;
  $('nomeAnt').textContent = t('pr.ant', {n, d: `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} ${ora}`});
}
function disegnaPronto() {
  if (ANDROID && (R.app_codice || 0) >= 10) { const h = $('btnImportaTesto').querySelector('.hint'); if (h) h.textContent = t('it.b10'); }
  $('pillAI').innerHTML = R.appunti_on ? `<span class="pill p-calma">${ico('spark', 13)}${t(R.formato === 'esame' ? 'pr.pill.ai.e' : 'pr.pill.ai')}</span>`
    : `<span class="pill p-calma">${ico('zip', 13)}${t('pr.pill.pac')}</span>`;
  const lez = (R.tipo || 'lezione') === 'lezione';
  $('matBox').classList.toggle('hidden', !lez); $('nomeLbl').classList.toggle('hidden', lez);
  const mt = $('materia').value.trim().toLowerCase();
  $('recenti').innerHTML = (R.recenti || []).length ? `<span class="hint">${t('mt.tue')}</span>` +
    R.recenti.map(m => `<span class="chip${m.toLowerCase() === mt ? ' on' : ''}" data-m="${esc(m)}">${esc(m)}</span>`).join('') : '';
  $('recenti').querySelectorAll('.chip').forEach(c => c.onclick = () => { $('materia').value = c.dataset.m; disegnaPronto(); anteprimaNome(); controllaNomeRec(); $('nome').focus(); });
  $('srcScr').textContent = t('src.scr.ok') + (R.schermo ? ' · ' + R.schermo : '');
  disegnaLingue();
  anteprimaNome();
  disegnaSorgenti();
  disegnaModo();
  disegnaQuando();
  disegnaTipo();
  disegnaMatProf();
}
/* «📎 Materiali del prof»: slide in PDF di questa lezione e libro (o dispense) della materia, in un posto solo */
let MPF = {m: null, docs: null, lav: null, t: null};
async function disegnaMatProf() {
  const tipo = R.tipo || 'lezione', lez = tipo === 'lezione';
  $('mpCard').classList.toggle('hidden', tipo === 'riunione');
  $('mpLb').classList.toggle('hidden', !lez);
  if (!lez) return;
  const m = $('materia').value.trim(), riga = $('mpLb'), tx = $('mpLbTx'), b = $('mpLbB');
  $('mpLbT').textContent = m ? t('mpf.lb', {m}) : t('mpf.lb0');
  if (MPF.lav) { tx.className = 'mutt'; tx.textContent = t('mpf.lb.lav', {p: MPF.lav}); b.classList.add('hidden'); return; }
  b.classList.remove('hidden');
  if (!m) { riga.classList.add('off'); tx.className = 'mutt'; tx.textContent = t('mpf.lb.serve'); b.textContent = t('src.pdf.b'); b.onclick = null; return; }
  riga.classList.remove('off');
  if (MPF.m !== m) {
    MPF.m = m; MPF.docs = null;
    const r = await A.libro_info(m, []);
    if (MPF.m !== m) return;
    MPF.docs = r && r.ok ? (r.documenti || []) : [];
  }
  const docs = MPF.docs || [];
  if (docs.length) {
    tx.className = 'okt'; tx.textContent = '✓ ' + docs.map(d => d.nome).join(' · ');
    b.textContent = t('mpf.apri');
    b.onclick = () => { const x = materieStudia().find(y => y.m.toLowerCase() === m.toLowerCase()); if (x) apriLibro(x); else toast(t('mpf.lb.s')); };
  } else {
    tx.className = 'mutt'; tx.textContent = t('mpf.lb.s');
    b.textContent = t('src.pdf.b');
    b.onclick = () => libroQui(m, disegnaMatProf);
  }
}
/* aggiunge il libro della materia senza lasciare la pagina; ridisegna con la percentuale */
async function libroQui(m, ridisegna) {
  const f = await A.scegli_pdf();
  if (!f.ok) { if (f.msg) await dialogo({titolo: t('lb.nome'), testo: f.msg}); return; }
  const r = await A.libro_aggiungi(m, f.percorso, false);
  if (!r.ok) { await dialogo({titolo: t('lb.nome'), testo: r.msg || ''}); return; }
  MPF.lav = 1; ridisegna();
  const giro = setInterval(async () => {
    const a = await A.libro_avanzamento();
    MPF.lav = Math.max(1, Math.round((a.f || 0) * 100));
    if (a.stato === 'fatto' || a.stato === 'errore') {
      clearInterval(giro); MPF.lav = null; MPF.m = null;
      if (a.stato === 'errore') await dialogo({titolo: t('lb.nome'), testo: a.msg || ''});
    }
    ridisegna();
  }, 800);
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
    const r = await A.avvia(nomeCompleto(), {materia: (R.tipo || 'lezione') === 'lezione' ? $('materia').value.trim() : '', modo: R.modo, microfono: aula ? $('selMic').value : '', pdf: R.tipo !== 'riunione' && PDFA ? PDFA.percorso : '', quando: ANDROID ? QUANDO : '',
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
  const aulaReg = ANDROID ? (R.app_codice || 0) >= 12 : R.modo === 'aula';   // la fotocamera serve l'app nuova (codice 12)
  $('lFotoBox').classList.toggle('hidden', !aulaReg);
  if ($('lFotoT').textContent === '') $('lFotoT').textContent = t(ANDROID ? 'fo.btn.and' : 'fo.btn.pc');
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
  const L = LZ.lezioni.filter(l => !q || (l.nome + ' ' + l.quando + ' ' + (l.materia || '')).toLowerCase().includes(q));
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
    else if (l.n_appunti) { pill = ''; prim = ''; }
    else if (l.crea_appunti) { pill = `<span class="pill p-blue">${t('ar.pac')}</span>`; prim = `<button class="btn b-cor b-sm" data-a="crea">${ico('spark')}${t('ar.crea')}</button>`; }
    else { pill = `<span class="pill p-blue">${t('ar.pac')}</span>`; prim = ANDROID ? '' : `<button class="btn b-main b-sm" data-a="pacchetti">${ico('folder')}${t('ar.cartpac')}</button>`; }
    const rip = l.ripasso && l.ripasso.n && l.stato !== 'in_corso' ? `<button class="btn b-rip b-sm" data-a="ripassa">${ico('cards')}${t('ar.rip', {n: l.ripasso.n})}</button>` : '';
    const chiedi = l.trascritta && l.stato === 'pronta' ? `<button class="btn b-cor b-sm" data-a="chiedi">${ico('chat')}${t('ar.chiedi')}</button>` : '';
    const capi = (l.capitoli && l.stato === 'pronta' ? `<button class="btn b-ghost b-sm" data-a="capitoli">${ico('text')}${t('ar.cap')}</button>` : '') +
      (l.voci >= 2 && l.stato === 'pronta' ? `<button class="btn b-ghost b-sm" data-a="voci">${ico('chat')}${t('ar.voci')}</button>` : '') +
      (l.n_appunti && l.stato === 'pronta' ? `<button class="btn b-ghost b-sm" data-a="condividi">${ico('share')}${t('ar.cond')}</button>` : '');
    // (Chiedi, Capitoli, Chi parla, Condividi, Trascrizione, Video: nel menu «⋯ Altro»)
    const altro = l.stato !== 'in_corso' ? `<button class="btn b-ghost b-sm b-altro" data-a="menu" title="${t('ar.altre')}">⋯ ${t('ar.altro')}</button>` : '';
    const apre = l.stato === 'pronta' && l.n_appunti && !(APLAV && APLAV === l.cartella);
    const sec = apre ? `<span class="hint">${esc(t('lz.apri'))}</span>` : rip + altro;
    const tags = l.n_appunti ? (l.formati || []).map(f => `<span class="ftag ${f}">${esc(nomeFormato(f, l.nome_mio))}</span>`).join('') : '';
    const badge = l.stato === 'pronta' ? (l.video ? t('ar.b.video') : t('ar.b.solo')) : l.stato === 'in_corso' ? t('ar.b.corso') : t('ar.b.finire');
    return `<div class="lez${apre ? ' apri' : ''}" data-i="${LZ.lezioni.indexOf(l)}"><div class="cov c${l.colore}">${esc(l.sigla)}<small>${badge}</small></div>
      <div class="inf"><b title="${esc(l.nome)}">${esc(l.nome)}</b>${tags}<div class="meta">${meta}</div>${errL}<div class="acts">${pill}${prim}${sec}</div></div>${apre ? '<span class="chev">›</span>' : ''}</div>`;
  }).join('');
  disegnaBanda();
  if ($('lista').dataset.h === h) return;
  $('lista').dataset.h = h; $('lista').innerHTML = h;
  $('lista').querySelectorAll('[data-a]').forEach(b => b.onclick = e => azioneLezione(LZ.lezioni[+b.closest('.lez').dataset.i], b.dataset.a, e));
  $('lista').querySelectorAll('.lez.apri').forEach(r => r.onclick = () => apriLezione(LZ.lezioni[+r.dataset.i]));
}
async function azioneLezione(l, a, e) {
  const c = l.cartella;
  if (a === 'appunti') return apriAppunti(c);
  if (a === 'ripassa') return iniziaRipasso([c], l.nome, 'prima');
  if (a === 'chiedi') return apriChiedi(l);
  if (a === 'mappa') return apriMappa(l);
  if (a === 'ascolta') return apriAscolta(l);
  if (a === 'capitoli') return apriCapitoli(l);
  if (a === 'infografica') return apriInfografica(l);
  if (a === 'voci') return apriVoci(l);
  if (a === 'stat') return apriStatistiche(l);
  if (a === 'spezzone') { await apriCapitoli(l); $('spCard').scrollIntoView({block: 'center'}); return; }
  if (a === 'condividi') return apriCondividi(l);
  if (a === 'voci_rifai') return apriVoci(l, true);
  if (a === 'rumore') return apriRumore(l);
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
function menuLezione(l, btn, servizio = false) {
  document.querySelectorAll('.menu').forEach(m => m.remove());
  const m = document.createElement('div'); m.className = 'menu';
  const voci = [];
  const pronta = l.stato === 'pronta';
  if (!servizio) {
  if (l.trascritta && pronta) voci.push(['chiedi', 'chat', t('ar.m.chiedi')]);
  if (l.capitoli && pronta) voci.push(['capitoli', 'text', t('ar.cap')]);
  if (l.voci >= 2 && pronta) voci.push(['voci', 'chat', t('ar.voci')]);
  if (l.n_appunti && pronta) voci.push(['condividi', 'share', t('ar.cond')]);
  if (pronta) voci.push(['tras', 'text', t('ar.tras')]);
  if (l.video && pronta) voci.push(['video', 'play', t('ar.vid')]);
  }
  if (voci.length) voci.push(['-']);
  if (l.crea_appunti) voci.push(['crea', 'spark', t('ar.m.crea')]);
  if (!servizio) (l.crea_anche || []).forEach(f => voci.push(['anche:' + f, 'spark', t('ar.m.anche', {f: nomeFormato(f, l.nome_mio)})]));
  (l.completa_appunti || []).forEach(f => voci.push(['compl:' + f, 'spark', t('ar.m.compl', {f: nomeFormato(f, l.nome_mio)})]));
  if (l.rifai_appunti) voci.push(['rifai', 'redo', t('ar.m.rifai.x', {f: nomeFormato(l.formato_serie || R.formato, l.nome_mio)})]);
  if (l.n_appunti && !servizio) voci.push(['ascolta', 'play', t('ar.m.asc')]);
  if (l.trascritta && l.stato === 'pronta' && !servizio) voci.push(['mappa', 'map', t('ar.m.mappa')], ['infografica', 'sli', t('ar.m.ig')]);
  if (l.trascritta && l.stato === 'pronta' && l.voci < 2) voci.push(['voci_rifai', 'chat', t('ar.m.voci')]);
  if (l.trascritta && l.stato === 'pronta' && !servizio) voci.push(['stat', 'chat', t('ar.m.stat')]);
  if (l.stato === 'pronta' && l.video) voci.push(['rumore', 'mic', t('ar.m.rumore')]);
  if (l.video && l.stato === 'pronta' && !servizio) voci.push(['spezzone', 'film', t('ar.m.sp')]);
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
// chi riceve un invito: se ha appena copiato il messaggio (WhatsApp), il programma lo riconosce e chiede «lo attivo?»
function senzaChiavi() { return !R.chiave && !R.ha_server && !R.da_invito; }
async function invitoCopiato() {
  disegnaHoPronto();
  if (!senzaChiavi()) return;
  const r = await A.invito_negli_appunti();
  if (!r || !r.ok) return;
  const si = await dialogo({titolo: t('ho.trovato.t'), testo: r.da ? t('ho.trovato', {d: r.da}) : t('ho.trovato.anon'),
    bottoni: [{t: t('annulla'), v: false}, {t: t('ho.trovato.si'), cls: 'b-main', v: true}]});
  if (si) await attivaInvito(r.testo);
}
async function attivaInvito(testo) {
  const r = await A.invito_attiva(testo);
  if (!r.ok) { await dialogo({titolo: t('ho.h'), testo: r.msg || ''}); return false; }
  await rileggi();
  disegnaHoPronto();
  await dialogo({titolo: t('ho.h'), testo: t('ho.ok', {c: [r.claude ? t('ho.ok.cl') : '', r.server ? t('ho.ok.srv') : ''].filter(Boolean).join(' ' + t('ho.e') + ' ')})});
  return true;
}
function disegnaHoPronto() {
  $('hoPronto').classList.toggle('hidden', !senzaChiavi() || !!R.invito_nascosto);
}
function collegaHoPronto() {
  $('hoPrX').onclick = async () => { R.invito_nascosto = true; disegnaHoPronto(); await A.imposta('invito_nascosto', true); };
  $('hoPrB').onclick = async () => {
    const v = await dialogo({titolo: t('ho.pronto.t'), testo: t('ho.s'), html: '<input class="in" style="margin-top:10px" placeholder="VMIA-INVITO-1:…">',
      bottoni: [{t: t('annulla'), v: false}, {t: t('ho.vai'), cls: 'b-main', v: true}]});
    const testo = dialogo.valore;
    if (v && testo) await attivaInvito(testo);
  };
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
  disegnaFacilitata();
  $('swRap').classList.toggle('on', !!R.rapporti);
  disegnaDove();
  if (ANDROID) {
    $('segQuando').querySelectorAll('span').forEach(x => x.classList.toggle('on', x.dataset.v === R.quando));
    $('swCarica').classList.toggle('on', !!R.solo_carica);
    $('andVer').textContent = t('and.agg.s', {v: R.versione});
    if (IPHONE) $('andAgg').classList.add('hidden');
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
    return tit + `<details class="cap${c.perche ? ' perche' : ''}"${(aperti.length ? aperti[i] : i === 0) ? ' open' : ''}><summary><span class="n">${n}</span><span class="ico ${c.perche ? 'i-vio' : 'i-blue'}">${ico(c.ico)}</span>${esc(c.t)}${c.v ? `<span class="pill p-blue gvp">${ico('play', 11)}video</span>` : ''}<span class="fr">›</span></summary>${c.v ? `<video class="gv" src="video/${c.v}-${l}.webm" controls muted playsinline preload="metadata"></video><div class="gvint"><button class="btn b-ghost b-sm" data-gv="1">⛶ ${esc(t('gv.intero'))}</button></div>` : ''}${c.guida ? guidaPerche(c.guida, G) : `<${c.perche ? 'ul' : 'ol'}>${c.p.map(x => `<li>${x}</li>`).join('')}</${c.perche ? 'ul' : 'ol'}>`}</details>`;
  }).join('');
  // aprendo un capitolo il suo video parte da capo; chiudendolo si ferma
  $('gCap').querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
    const v = d.querySelector('video'); if (!v) return;
    if (d.open) { try { v.currentTime = 0; v.play().catch(() => {}); } catch (e) {} } else v.pause();
  }));
  $('gCap').querySelectorAll('[data-gv]').forEach(b => b.onclick = e => { e.preventDefault(); videoIntero(b.closest('details').querySelector('video')); });
  $('gCap').querySelectorAll('[data-gvai]').forEach(b => b.onclick = () => guidaVai(b.dataset.gvai, G));
  $('segGuida').querySelectorAll('span').forEach(s => s.classList.toggle('on', s.dataset.l === l));
}
// «Perché Verba Manent IA»: i tre momenti e «Per tutti», ogni riga apre il suo capitolo
const capGuida = (G, k) => G.capitoli.findIndex(c => c.v === k || c.v === 'tel-' + k || c.k === k);
function guidaPerche(g, G) {
  const riga = r => `<div class="gpr"><span class="e">${r.e}</span><span class="x"><b>${esc(r.b)}</b>${/^[,:.]/.test(r.x) ? '' : ' '}${esc(r.x)}</span>${capGuida(G, r.v) >= 0 ? `<button class="lnk" data-gvai="${esc(r.v)}">${esc(g.vedi)}</button>` : ''}</div>`;
  return `<div class="gper"><div class="gfr">${g.frase}</div><div class="gmom">${g.mom.map(m => `<div class="gmb"><h4><span class="n">${esc(m.n)}</span>${esc(m.t)}</h4>${m.r.map(riga).join('')}</div>`).join('')}</div>
    <div class="get">${g.et.map(x => `<span>${esc(x)}</span>`).join('')}</div></div>`;
}
function guidaVai(k, G) {
  const ds = [...$('gCap').querySelectorAll('details.cap')], i = capGuida(G, k);
  if (i < 0 || !ds[i]) return;
  const per = ds.find(d => d.classList.contains('perche')), dest = ds[i];
  const g = (G.capitoli.find(c => c.guida) || {}).guida || {};
  if (per) per.open = false;
  $('gCap').querySelectorAll('.gtorna').forEach(b => b.remove());
  dest.open = true;
  const b = document.createElement('button');
  b.className = 'btn b-ghost b-sm gtorna'; b.textContent = g.torna || '←';
  b.onclick = () => { b.remove(); dest.open = false; if (per) { per.open = true; per.scrollIntoView({block: 'start', behavior: 'smooth'}); } };
  dest.querySelector('summary').after(b);
  setTimeout(() => dest.scrollIntoView({block: 'start', behavior: 'smooth'}), 60);
}
// video della Guida a schermo intero: un velo nero che copre tutta la finestra (il pulsante del lettore non funziona dentro il programma)
function videoIntero(v) {
  if (!v || $('gvVelo')) return;
  const d = document.createElement('div'); d.id = 'gvVelo';
  d.innerHTML = `<button class="gvchiudi">✕ ${esc(t('chiudi'))}</button><video src="${v.getAttribute('src')}" controls muted playsinline autoplay></video>`;
  document.body.appendChild(d);
  const g = d.querySelector('video');
  g.addEventListener('loadedmetadata', () => { try { g.currentTime = v.currentTime || 0; } catch (e) {} g.play().catch(() => {}); }, {once: true});
  v.pause();
  d.querySelector('.gvchiudi').onclick = () => videoInteroChiudi();
}
function videoInteroChiudi() {
  const d = $('gvVelo'); if (!d) return false;
  const g = d.querySelector('video'), v = [...document.querySelectorAll('#gCap video')].find(x => x.getAttribute('src') === g.getAttribute('src'));
  if (v) { try { v.currentTime = g.currentTime; } catch (e) {} }
  g.pause(); d.remove(); return true;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') videoInteroChiudi(); });

/* ------------------------------------------------------------------ in aula (microfono) */
let PDFA = null, MICS = null, micOcc = false;
async function disegnaModo() {
  const aula = R.modo === 'aula';
  $('doveBox').querySelectorAll('.aiopt').forEach(o => o.classList.toggle('on', o.dataset.m === (aula ? 'aula' : 'online')));
  $('srcAula').classList.toggle('hidden', !aula);
  $('srcRum').classList.toggle('hidden', !aula); $('swRum').classList.toggle('on', !!R.aula_rumorosa);
  $('srcOnline').classList.toggle('hidden', aula);
  $('prP').textContent = t(aula ? 'pr.p.aula' : 'pr.p');
  $('prPrima').textContent = t(aula ? 'pr.prima.aula' : 'pr.prima');
  $('pdfTxt').textContent = PDFA ? '✓ ' + PDFA.nome + (PDFA.mb != null ? ' · ' + t('dc.pag', {p: PDFA.pagine, mb: num(PDFA.mb)}) : '') : t(aula || ANDROID ? 'mpf.sl.s' : 'mpf.sl.on');
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
function testoRisposta(x, nomi) {
  nomi = nomi || CH.nomi || [];
  let h = esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  h = h.replace(/\[\[\s*libro\s*p\.?\s*([\w-]+)\s*\]\]/gi, (m, p) => `<button class="cita lbcita" data-lbp="${esc(p)}">📘 ${esc(t('lb.p', {a: p}))}</button>`);
  return h.replace(/\[\[\s*(?:L(\d+)\s+)?(?:slide\s*(\d+)|(\d{1,2}:\d{2}(?::\d{2})?))\s*\]\]/gi, (m, li, sl, tm) => {
    const i = li ? +li - 1 : 0;
    let sec = 0;
    if (tm) { const p = tm.split(':').map(Number); sec = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }
    const nome = li && nomi[i] ? '«' + (nomi[i].split(' – ').slice(-1)[0]) + '» · ' : '';
    const et = sl ? 'slide ' + sl : sec >= 60 ? t('ch.min', {m: Math.floor(sec / 60)}) : ms(sec);
    return `<button class="cita" data-i="${i}" data-s="${sl || ''}" data-t="${sec}">▶ ${esc(nome)}${et}</button>`;
  });
}
function disegnaChiedi() {
  const L = CH.lez;
  $('chSub').textContent = CH.tutta ? `${CH.materia} · ${t('ch.lezioni', {n: CH.cartelle.length})}` : `${L.nome} · ${L.quando}`;
  const h = CH.storia.length ? CH.storia.map((m, k) => m.chi === 'io' ? `<div class="msg io">${esc(m.testo)}</div>`
    : m.chi === 'att' ? `<div class="msg cl"><span class="spin" style="width:14px;height:14px;vertical-align:-2px"></span> ${esc(t('ch.pensa'))}</div>`
    : m.chi === 'err' ? `<div class="msg cl" style="color:#be123c">⚠ ${esc(m.testo)}</div>`
    : `<div class="msg cl">${testoRisposta(m.testo)}<div class="solo-dsa" style="margin-top:6px"><button class="btn b-ghost ascolta" data-voce="${k}">${esc(t('ch.asc'))}</button></div></div>`).join('')
    : `<div class="msg vuoto">${esc(t('ch.vuoto'))}</div>`;
  $('chat').innerHTML = h;
  $('chat').querySelectorAll('[data-voce]').forEach(b => b.onclick = () => voceParla(String(CH.storia[+b.dataset.voce].testo || '').replace(/\[\[[^\]]*\]\]/g, '').replace(/\*\*/g, '')));
  $('chat').querySelectorAll('.lbcita').forEach(b => b.onclick = () => lbApriEt(CH.materia, b.dataset.lbp));
  $('chat').querySelectorAll('.cita:not(.lbcita)').forEach(b => b.onclick = () => mostraMomento(CH.cartelle[+b.dataset.i] || CH.cartelle[0], +b.dataset.t, b.dataset.s ? +b.dataset.s : null, CH.nomi[+b.dataset.i] || ''));
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
  MP.dati = mpNorma(r.mappa);
  MP.modo = 'vedi'; MP.sel = -1; MP.aiuti = {}; MP.prima = [];
  document.querySelectorAll('#mpModi button').forEach(x => x.classList.toggle('on', x.dataset.m === 'vedi'));
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
  if (OR.orale && (!ES.m || ES.m.m !== m.m)) orChiudi();
  if (TC.test && (!ES.m || ES.m.m !== m.m)) { clearInterval(TC.timer); TC = {test: null}; }
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
      <div class="row mt" style="justify-content:flex-end;gap:8px"><button class="lnk sp" id="esRifai" style="text-align:left">${esc(t('es.rifai'))}</button><button class="btn b-ghost b-sm" id="esSim">${esc(t('es.sim'))}</button><button class="btn b-ghost b-sm" id="esOrale">${esc(t('or.b'))}</button><button class="btn b-cor b-sm" id="esTest">${esc(t('tc.b'))}</button></div>
      <div class="hint" style="margin-top:8px;text-align:right">${esc(t('tc.s'))}</div>${voti}</div>
    <div class="card mt hidden" id="esTestBox"></div>
    <div class="card mt hidden" id="esOrBox"></div>
    <div class="card mt" id="esSimBox"></div>
    <div class="card mt"><div class="row" style="margin-bottom:8px"><div class="lbl sp" style="margin:0">${esc(t('es.piano'))}</div>${P.length ? `<button class="btn b-ghost b-sm" id="esCal">${esc(t('es.cal'))}</button>` : ''}</div>
      ${piano || `<div class="hint">${esc(t('es.nodata'))}</div>`}<div class="hint" style="margin-top:8px">${esc(t('es.piano.s'))}</div></div>`;
  $('esData').onchange = async () => { await A.esame_data(ES.m.m, $('esData').value); apriEsame(ES.m); };
  $('esBox').querySelectorAll('.esq').forEach(e => e.onclick = () => e.querySelector('ol').classList.toggle('hidden'));
  $('esRifai').onclick = () => apriEsame(ES.m, true);
  $('esSim').onclick = () => nuovaSimulazione();
  $('esOrale').onclick = () => nuovaOrale();
  $('esTest').onclick = () => sceltaTest();
  if (TC.test) disegnaTest();
  if (OR.orale) disegnaOrale();
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
        <textarea class="in" rows="4" data-i="${i}" placeholder="${esc(t('es.risp'))}"${sim.voto != null ? ' readonly' : ''}>${esc((sim.risposte || [])[i] || '')}</textarea>${sim.voto == null ? `<div class="row solo-dsa" style="margin-top:6px;gap:6px"><button class="btn b-ghost b-sm" data-det="${i}">${esc(t('dt.detta'))}</button><button class="btn b-ghost b-sm" data-sasc="${i}">${esc(t('tc.ascolta'))}</button></div>` : ''}
        ${c ? `<div class="escorr"><b>${esc(t('es.punti', {p: num(c.punti), s: num(c.su)}))}</b>${c.bene ? `<div><span style="color:var(--ok)">✓</span> ${esc(c.bene)}</div>` : ''}${c.manca ? `<div><span style="color:#be123c">✗</span> ${esc(c.manca)}</div>` : ''}</div>` : ''}</div>`; }).join('')}
    ${sim.consiglio ? `<div class="avviso2 mt">${esc(sim.consiglio)}</div>` : ''}
    <div class="row mt" style="justify-content:flex-end;gap:8px">${sim.voto == null ? `<button class="btn b-main b-sm" id="esCorr">${esc(t('es.correggi'))}</button>` : `<button class="btn b-cor b-sm" id="esNuova">${esc(t('es.nuova'))}</button>`}</div>`;
  box.querySelectorAll('[data-det]').forEach(b => b.onclick = () => detta(b, box.querySelector(`textarea[data-i="${b.dataset.det}"]`)));
  box.querySelectorAll('[data-sasc]').forEach(b => b.onclick = () => voceParla(sim.domande[+b.dataset.sasc].domanda));
  if ($('esCorr')) $('esCorr').onclick = async () => {
    const b = $('esCorr'); b.disabled = true; b.innerHTML = `<span class="spin" style="width:13px;height:13px"></span>${esc(t('es.corr.lav'))}`;
    const r = await A.esame_correggi(ES.m.m, [...box.querySelectorAll('textarea')].map(x => x.value));
    if (!r.ok) { b.disabled = false; b.textContent = t('es.correggi'); return toast(r.msg); }
    ES.d.simulazione = r.simulazione; ES.d.voti = (ES.d.voti || []).concat([r.simulazione.voto]); disegnaEsame(); $('esSimBox').scrollIntoView({block: 'start'});
  };
  if ($('esNuova')) $('esNuova').onclick = () => nuovaSimulazione();
}
/* ------------------------------------------------------------------ pagina della lezione */
// Le funzioni della lezione in riquadri divisi per gruppi; con la Modalità DSA in cima «Per te», il resto in grigio.
var LEZ = null;
const tile = (a, icona, tit, sub, num, dup) => `<button class="tile${dup ? ' dup' : ''}" data-ta="${a}"><span class="ico i-blue">${icona}</span><span><b>${esc(tit)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}${num ? `<span class="num">${esc(num)}</span>` : ''}</span></button>`;
const gruppo = (titolo, tiles) => tiles.filter(Boolean).length ? `<div class="grp"><div class="lbl">${esc(titolo)}</div><div class="tiles">${tiles.filter(Boolean).join('')}</div></div>` : '';
function apriLezione(l) { LEZ = l; disegnaLezione(); vai('lezione'); }
function disegnaLezione() {
  const l = LZ && LZ.lezioni.find(x => x.cartella === LEZ.cartella) || LEZ; LEZ = l;
  const pronta = l.stato === 'pronta', dsa = !!(R && R.facilitata);
  $('lzTit').textContent = l.nome;
  $('lzSub').innerHTML = esc([l.quando, l.durata, ...(l.formati || []).map(f => nomeFormato(f, l.nome_mio))].filter(Boolean).join(' · ')) +
    ((l.tipo || 'lezione') === 'lezione' ? `<br><span class="matlez${l.materia ? '' : ' manca'}">${esc(l.materia ? t('mt.lez', {m: l.materia}) : t('mt.manca'))}<button id="lzMat">${esc(t(l.materia ? 'mt.cambia' : 'mt.metti'))}</button></span>` : '');
  if ($('lzMat')) $('lzMat').onclick = () => cambiaMateria(l);
  const rip = l.ripasso && l.ripasso.n ? (l.ripasso.no ? t('tl.flash.n', {n: l.ripasso.n, r: l.ripasso.no}) : t(l.ripasso.n === 1 ? 'tl.flash.n1' : 'tl.flash.n0', {n: l.ripasso.n})) : '';
  const ha = {ap: l.n_appunti, asc: l.n_appunti, tras: pronta, vid: l.video && pronta, chiedi: l.trascritta && pronta, mappa: l.trascritta && pronta, ig: l.trascritta && pronta,
              cap: l.capitoli && pronta, voci: l.trascritta && pronta, flash: l.ripasso && l.ripasso.n, mat: l.materia && lezioniMateria(l).length, cond: l.n_appunti && pronta, sp: l.video && pronta};
  ha.pc = l.trascritta && pronta; ha.kk = l.trascritta && pronta;
  const D = new Set(dsa ? ['ap', 'asc', 'mappa', 'cap', 'chiedi', 'flash', 'pc', 'kk'] : []);
  const dsaGr = dsa ? `<div class="dsagr">${gruppo(t('g.dsa'), [
      ha.kk && tile('karaoke', '🎤', t('tl.kk'), t('tl.dsa.kk.s')), ha.pc && tile('podcast', '🎧', t('tl.pc'), t('tl.dsa.pc.s')), ha.asc && tile('ascolta', '🔊', t('tl.asc'), t('tl.dsa.asc.s')), ha.mappa && tile('mappa', '🗺', t('tl.mappa'), t('tl.dsa.mappa.s')),
      ha.ap && tile('appunti_dsa', '📄', t('tl.dsa.ap'), t('tl.dsa.ap.s')), ha.flash && tile('ripassa', '🃏', t('tl.dsa.flash'), t('tl.dsa.flash.s'), rip),
      ha.chiedi && tile('chiedi', '💬', t('tl.dsa.chiedi'), t('tl.dsa.chiedi.s')), ha.cap && tile('capitoli', '📑', t('tl.cap'), t('tl.dsa.cap.s'))])}<div class="altrihd">${esc(t('g.resto'))}</div></div>` : '';
  const d = k => D.has(k);
  const fmtTiles = ha.ap ? (l.formati || []).map(f => tile('apf:' + f, f === 'esame' ? '⭐' : '📄', t('tl.appunti.f', {f: nomeFormato(f, l.nome_mio)}), t('tl.appunti.s'), '', d('ap'))) : [];
  const ancheTiles = pronta ? (l.crea_anche || []).map(f => tile('anche:' + f, '＋', t('tl.anche', {f: nomeFormato(f, l.nome_mio)}), t('tl.anche.s')).replace('class="tile', 'class="tile da')) : [];
  const fotoTiles = [pronta && l.n_foto && tile('foto', '📷', t('tl.fo'), t('tl.fo.s', {n: l.n_foto})), pronta && tile('scritti', '✍', t('tl.sc'), t('tl.sc.s'), l.n_scritti ? t('tl.sc.n', {n: l.n_scritti}) : '')];
  const resto = gruppo(t('g.leggi'), [...(fmtTiles.length ? fmtTiles : [ha.ap && tile('appunti', '📄', t('tl.appunti'), t('tl.appunti.s'), '', d('ap'))]), ...ancheTiles, ...fotoTiles, ha.kk && tile('karaoke', '🎤', t('tl.kk'), t('tl.kk.s'), '', d('kk')), ha.pc && tile('podcast', '🎧', t('tl.pc'), t('tl.pc.s'), '', d('pc')), ha.asc && tile('ascolta', '🔊', t('tl.asc'), t('tl.asc.s'), '', d('asc')),
      ha.tras && tile('tras', '📝', t('tl.tras'), t('tl.tras.s')), ha.vid && tile('video', '▶', t('tl.vid'), t('tl.vid.s'))]) +
    gruppo(t('g.capisci'), [ha.chiedi && tile('chiedi', '💬', t('tl.chiedi'), t('tl.chiedi.s'), '', d('chiedi')), ha.mappa && tile('mappa', '🗺', t('tl.mappa'), t('tl.mappa.s'), '', d('mappa')),
      ha.ig && tile('infografica', '🖼', t('tl.ig'), t('tl.ig.s')), ha.cap && tile('capitoli', '📑', t('tl.cap'), t('tl.cap.s'), '', d('cap')),
      ha.voci && tile(l.voci >= 2 ? 'voci' : 'stat', '👥', t('tl.voci'), t('tl.voci.s'))]) +
    gruppo(t('g.ripassa'), [ha.flash && tile('ripassa', '🃏', t('tl.flash'), t('tl.flash.s'), rip, d('flash')), ha.mat && tile('studia_mat', '🎓', t('tl.mat', {m: l.materia}), t('tl.mat.s'))]) +
    gruppo(t('g.condividi'), [ha.cond && tile('condividi', '📤', t('tl.cond'), t('tl.cond.s')), ha.sp && tile('spezzone', '✂', t('tl.sp'), t('tl.sp.s'))]);
  $('lzBox').innerHTML = dsaGr + `<div class="altri">${resto}</div>`;
  // un gruppo con tutto gia' in «Per te» non si mostra
  $('lzBox').querySelectorAll('.altri .grp').forEach(g => { if ([...g.querySelectorAll('.tile')].every(x => x.classList.contains('dup'))) g.classList.add('dup'); });
  $('lzBox').querySelectorAll('[data-ta]').forEach(b => b.onclick = () => tileLezione(l, b.dataset.ta));
  disegnaMatLez(l, pronta);
}
/* pagina della lezione: «📎 Materiali del prof» (slide in PDF e libro della materia) */
async function disegnaMatLez(l, pronta) {
  const tipo = l.tipo || 'lezione';
  if (!pronta || tipo === 'riunione') return;
  const lez = tipo === 'lezione';
  const sl = l.docente ? `<small class="okt">${esc(t('mpf.lz.ok'))}</small>` : `<small class="mutt">${esc(l.aula || !l.n_slide ? t('mpf.lz.aula') : t('mpf.lz.foto', {n: l.n_slide}))}</small>`;
  const box = document.createElement('div');
  box.className = 'card mt'; box.id = 'lzMp';
  box.innerHTML = `<div class="mp"><div class="mph"><b>${esc(t('mpf.h'))}</b></div>
    ${l.n_pacchetti ? `<div class="mpr"><span class="ico i-vio">🖼</span><div class="sp"><b>${esc(t('mpf.sl'))}</b>${sl}</div><button class="btn b-ghost b-sm" id="lzMpSl">${esc(t(l.docente ? 'dc.cambia' : 'mpf.agg'))}</button></div>` : ''}
    ${lez ? `<div class="mpr" id="lzMpLb"><span class="ico i-blue">📘</span><div class="sp"><b>${esc(l.materia ? t('mpf.lb', {m: l.materia}) : t('mpf.lb0'))}</b><small class="mutt"></small></div><button class="btn b-ghost b-sm"></button></div>` : ''}</div>`;
  if (!box.querySelector('.mpr')) return;
  const vecchio = $('lzMp'); if (vecchio) vecchio.remove();
  $('lzBox').appendChild(box);
  if ($('lzMpSl')) $('lzMpSl').onclick = () => aggiungiPdf(l);
  const riga = $('lzMpLb');
  if (!riga) return;
  const tx = riga.querySelector('small'), b = riga.querySelector('button');
  if (!l.materia) { tx.textContent = t('mpf.lz.mt'); b.textContent = t('mpf.lz.mtb'); b.onclick = () => cambiaMateria(l); return; }
  if (MPF.lav) { tx.textContent = t('mpf.lb.lav', {p: MPF.lav}); b.classList.add('hidden'); return; }
  const r = await A.libro_info(l.materia, []);
  if (LEZ !== l || !document.body.contains(riga)) return;
  const docs = r && r.ok ? (r.documenti || []) : [];
  if (!docs.length) {
    tx.textContent = t('mpf.lb.s'); b.textContent = t('src.pdf.b');
    b.onclick = () => libroQui(l.materia, () => { if (LEZ === l) disegnaMatLez(l, true); });
    return;
  }
  tx.className = 'okt'; tx.textContent = '✓ ' + docs.map(d => d.nome).join(' · ');
  b.textContent = t('mpf.apri');
  const lz = await A.libro_lezione(l.cartella);
  if (LEZ !== l) return;
  const tr_ = lz && lz.ok ? lz.tratto : null;
  if (tr_) tx.insertAdjacentHTML('beforeend', ` <span class="mutt">· ${esc(t('mpf.lz.p', {p: tr_.da === tr_.a ? t('lb.p', {a: tr_.et_da}) : t('lb.pp', {a: tr_.et_da, b: tr_.et_a})}))}</span>`);
  b.onclick = () => { const m = materieStudia().find(x => x.m.toLowerCase() === l.materia.toLowerCase()); if (m) apriLibro(m, tr_ ? {k: tr_.k, n: tr_.da, q: l.cartella} : undefined); };
}
async function cambiaMateria(l, dopo) {
  const mie = [...new Set([...(R.recenti || []), ...materieStudia().map(x => x.m)])];
  const html = `<div class="chips" style="margin-top:0">${mie.map(m => `<span class="chip" data-m="${esc(m)}">${esc(m)}</span>`).join('')}</div>
    <input class="in" id="mtNuova" placeholder="${esc(t('mt.nuova'))}" maxlength="60" style="margin-top:10px"><div class="hint" style="margin-top:6px">${esc(t('mt.dopo'))}</div>`;
  let scelta = null;
  const p = dialogo({titolo: t('mt.q'), html, bottoni: [{t: t('annulla'), v: false}, {t: t('mt.salva'), cls: 'b-main', v: true}]});
  setTimeout(() => document.querySelectorAll('.velo .chip[data-m]').forEach(c => c.onclick = () => { scelta = c.dataset.m; const i = $('mtNuova'); if (i) i.value = scelta; document.querySelectorAll('.velo .chip[data-m]').forEach(x => x.classList.toggle('on', x === c)); }), 50);
  const ok = await p;
  const m = (dialogo.valore || scelta || '').trim();
  if (ok !== true || !m) return;
  const r = await A.cambia_materia(l.cartella, m);
  if (!r.ok) return;
  toast(t('mt.ok', {m}));
  R = await A.riepilogo(); await caricaLezioni();
  if (dopo) dopo(m); else disegnaLezione();
}
async function tileLezione(l, a) {
  if (a.startsWith('apf:')) { const f = a.slice(4), x = (await A.appunti_di(l.cartella)).find(y => y.formato === f); if (x) A.apri(x.file); else apriAppunti(l.cartella); return; }
  if (a === 'appunti_dsa') { toast(t('as.lav')); const r = await A.appunti_dsa(l.cartella); if (!r.ok) toast(r.msg || ''); return; }
  if (a === 'studia_mat') return apriStudia(l.materia);
  if (a === 'podcast') return apriPodcast(l);
  if (a === 'karaoke') return apriKaraoke(l);
  if (a === 'foto') return apriFoto(l);
  if (a === 'scritti') return apriScritti(l);
  return azioneLezione(l, a);
}

/* ------------------------------------------------------------------ karaoke della lezione */
// La voce vera del prof (video/audio della lezione) con le parole della trascrizione che si illuminano;
// tocchi una parola e la voce riparte da li'; accanto la slide di quel momento.
var KK = {lez: null, d: null, au: null, vel: 1, riga: -1, w: null, tick: null};
async function apriKaraoke(l) {
  if (KK.au) KK.au.pause();
  clearInterval(KK.tick);
  KK = {lez: l, d: null, au: null, vel: KK.vel || 1, riga: -1, w: null, tick: null};
  $('kkSub').textContent = t('kk.sub', {n: l.nome});
  $('kkTesto').innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('kk.lav'))}</div>`;
  $('kkSlideBox').classList.add('hidden'); $('kkNo').classList.add('hidden'); $('kkPlay').textContent = '▶';
  kkVel(); disegnaFacilitata();
  vai('karaoke');
  const r = await A.karaoke(l.cartella);
  if (KK.lez !== l) return;
  if (!r.ok) { $('kkTesto').innerHTML = `<div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>`; return; }
  KK.d = r;
  $('kkT1').textContent = kkOra(Math.round(r.durata));
  $('kkNo').classList.toggle('hidden', !!r.media); $('kkPlay').disabled = !r.media;
  $('kkSlideBox').classList.toggle('hidden', !r.slide.length); document.querySelector('.kkgrid').classList.toggle('solo', !r.slide.length);
  let minuto = -1, h = '';
  r.segmenti.forEach((s, i) => {
    const m = Math.floor(s.i / 60);
    const lab = m !== minuto ? `<span class="min">${kkOra(Math.floor(s.i))}${s.c ? ' · ' + esc(s.c) : ''}</span>` : '';
    minuto = m;
    h += `<div class="r" data-r="${i}">${lab}${s.t.split(/\s+/).map((w, j) => `<span class="w" data-j="${j}">${esc(w)}</span>`).join(' ')}</div>`;
  });
  $('kkTesto').innerHTML = h;
  silabizza($('kkTesto'));
  if (r.media) {
    KK.au = new Audio(r.media); KK.au.preload = 'metadata'; KK.au.playbackRate = KK.vel;
    KK.au.onplay = () => { $('kkPlay').textContent = '⏸'; clearInterval(KK.tick); KK.tick = setInterval(kkSegna, 120); };
    KK.au.onpause = KK.au.onended = () => { $('kkPlay').textContent = '▶'; clearInterval(KK.tick); };
  }
  kkSlide(0);
}
const kkOra = s => KK.d && KK.d.durata >= 3600 ? hms(s) : mmss(s);
function kkTrova(tt) {          // la frase in quel secondo (ricerca dicotomica)
  const S = KK.d.segmenti; let a = 0, b = S.length - 1, k = -1;
  while (a <= b) { const m = (a + b) >> 1; if (S[m].i <= tt) { k = m; a = m + 1; } else b = m - 1; }
  return k;
}
function kkSlide(tt) {
  const L = KK.d && KK.d.slide; if (!L || !L.length) return;
  let k = 0; for (let i = 0; i < L.length; i++) { if (L[i].t <= tt) k = i; else break; }
  if ($('kkSlide').dataset.u !== L[k].url) { $('kkSlide').src = L[k].url; $('kkSlide').dataset.u = L[k].url; }
}
function kkSegna() {
  if (!KK.au || !KK.d) return;
  const tt = KK.au.currentTime, S = KK.d.segmenti;
  $('kkT0').textContent = kkOra(Math.floor(tt)); $('kkBarI').style.width = Math.min(100, tt / KK.d.durata * 100) + '%';
  kkSlide(tt);
  const k = kkTrova(tt);
  if (k !== KK.riga) {
    const box = $('kkTesto');
    if (KK.riga >= 0) { const v = box.querySelector(`.r[data-r="${KK.riga}"]`); if (v) { v.classList.remove('ora'); v.querySelectorAll('.det,.on').forEach(x => x.classList.remove('det', 'on')); } }
    box.querySelectorAll('.r').forEach(x => x.classList.toggle('fatta', +x.dataset.r < k));
    KK.riga = k;
    const n = box.querySelector(`.r[data-r="${k}"]`); if (n) { n.classList.add('ora'); n.scrollIntoView({block: 'center', behavior: 'smooth'}); }
  }
  if (k < 0) return;
  const s = S[k], ws = $('kkTesto').querySelectorAll(`.r[data-r="${k}"] .w`);
  const j = Math.max(0, Math.min(ws.length - 1, Math.floor((tt - s.i) / Math.max(0.3, s.f - s.i) * ws.length)));
  ws.forEach((x, n) => { x.classList.toggle('on', n === j); x.classList.toggle('det', n < j); });
}
function kkVai(tt) {
  if (!KK.au) return;
  KK.au.currentTime = Math.max(0, tt); KK.au.playbackRate = KK.vel;
  KK.au.play().catch(() => {}); kkSegna();
}
function kkVel() { $('kkVel').querySelectorAll('span').forEach(s => s.classList.toggle('on', +s.dataset.v === KK.vel)); }
function collegaKaraoke() {
  $('kkPlay').onclick = () => { if (!KK.au) return; if (KK.au.paused) { voceFerma(); if (KK.riga < 0 && KK.au.currentTime < 0.5 && KK.d.segmenti.length) KK.au.currentTime = KK.d.segmenti[0].i; KK.au.playbackRate = KK.vel; KK.au.play().catch(() => {}); } else KK.au.pause(); };
  $('kkVel').querySelectorAll('span').forEach(s => s.onclick = () => { KK.vel = +s.dataset.v; kkVel(); if (KK.au) KK.au.playbackRate = KK.vel; });
  $('kkRiga').onclick = () => { $('kkTesto').classList.toggle('righello'); $('kkRiga').classList.toggle('b-main'); $('kkRiga').classList.toggle('b-ghost'); };
  $('kkBar').onclick = e => { if (!KK.d) return; const r = $('kkBar').getBoundingClientRect(); kkVai((e.clientX - r.left) / r.width * KK.d.durata); };
  $('kkTesto').onclick = e => {
    const w = e.target.closest('.w'); if (!w || !KK.d) return;
    const r = +w.closest('.r').dataset.r, s = KK.d.segmenti[r], n = w.parentNode.querySelectorAll('.w').length;
    kkVai(s.i + (+w.dataset.j) / n * (s.f - s.i));
  };
}

/* ------------------------------------------------------------------ podcast della lezione */
// Voce narrante (voce del sistema) + pezzi veri della lezione (il video/audio dal minuto giusto). Mentre ascolti la
// parola si illumina: per la voce narrante con le parole che dice la voce, per il prof con gli orari della trascrizione.
var PCS = {lez: null, d: null, i: 0, attivo: false, vel: 1.25, dur: 'breve', stile: 'uno', media: null, audio: null};
// i nomi delle due voci (Giulia e Marco) e la legenda
const pcNomi = () => (PCS.d && PCS.d.nomi) || (LINGUA === 'en' ? ['Emma', 'Jack'] : ['Giulia', 'Marco']);
function pcChi(p) { return p.tipo === 'prof' ? t('pc.prof') : p.tipo === 'a' ? pcNomi()[0] : p.tipo === 'b' ? pcNomi()[1] : t('pc.narr'); }
function pcStileTesti() {
  $('pcStile').querySelectorAll('span').forEach(s => s.classList.toggle('on', s.dataset.v === PCS.stile));
  const [a, b] = pcNomi();
  $('pcStileS').innerHTML = t('pc.s.' + (PCS.stile === 'dibattito' ? 'dib' : PCS.stile) + '.s', {a: esc(a), b: esc(b)});
  const voce = (c, n) => `<span><i style="background:${c}"></i><span>${esc(n)}</span></span>`;
  $('pcLeg').innerHTML = (PCS.stile === 'uno' ? voce('#cbd5e1', t('pc.narr')) : voce('#94a3b8', a) + voce('#cbd5e1', b)) + voce('#0d4275', t('pc.prof.reg'));
}
const parole = s => String(s || '').split(/\s+/).filter(Boolean);
function pcDurata(p) { return p.tipo === 'prof' ? p.a - p.da : Math.max(p.tipo === 'narratore' ? 3 : 1.5, parole(p.testo).length * 0.42); }
async function apriPodcast(l, rifai = false) {
  pcFerma();
  PCS = {...PCS, lez: l, d: null, i: 0, attivo: false};
  if (R && R.facilitata && !rifai) PCS.vel = 0.8; else if (PCS.vel === 0.8 && !(R && R.facilitata)) PCS.vel = 1.25;
  $('pcSub').textContent = l.nome;
  $('pcLista').innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('pc.lav'))}</div>`;
  $('pcTl').innerHTML = ''; $('pcMp3Box').classList.add('hidden');
  $('pcDur').querySelectorAll('span').forEach(s => s.classList.toggle('on', s.dataset.v === PCS.dur));
  pcStileTesti(); pcVel(); disegnaFacilitata();
  if (pagina !== 'podcast') vai('podcast');
  const r = await A.podcast(l.cartella, PCS.dur, rifai, PCS.stile);
  if (PCS.lez !== l) return;
  if (!r.ok) {
    $('pcLista').innerHTML = `<div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>` + (r.niente_dibattito ? `<div class="row mt"><button class="btn b-main b-sm" id="pcProvaDue">${esc(t('pc.prova.due'))}</button></div>` : '');
    if ($('pcProvaDue')) $('pcProvaDue').onclick = () => { PCS.stile = 'due'; apriPodcast(PCS.lez); };
    return;
  }
  PCS.d = r.podcast; PCS.media = r.media;
  pcStileTesti();
  const tot = PCS.d.pezzi.reduce((a, p) => a + pcDurata(p), 0);
  $('pcSub').textContent = t('pc.sub', {n: l.nome, m: Math.max(1, Math.round(tot / 60))});
  $('pcT1').textContent = mmss(Math.round(tot));
  $('pcMp3Box').classList.toggle('hidden', !r.mp3);
  disegnaPodcast();
}
function pcVel() { $('pcVel').querySelectorAll('span').forEach(s => s.classList.toggle('on', +s.dataset.v === PCS.vel)); }
function disegnaPodcast() {
  const P = PCS.d.pezzi, tot = P.reduce((a, p) => a + pcDurata(p), 0);
  const cl = p => ({prof: 'p', a: 'a', b: 'b'})[p.tipo] || 'n';
  $('pcTl').innerHTML = P.map((p, i) => `<span class="${cl(p)}" data-i="${i}" style="width:${pcDurata(p) / tot * 100}%"></span>`).join('');
  const testo = p => p.tipo === 'prof' ? p.frasi.map(f => f.testo).join(' ') : p.testo;
  $('pcLista').innerHTML = (PCS.media ? '' : `<div class="hint" style="margin-bottom:6px">${esc(t('pc.novideo'))}</div>`) + P.map((p, i) => `<div class="pz ${p.tipo === 'prof' ? 'p' : 'n'}" data-i="${i}"><div class="chi">${p.tipo === 'prof' ? '🎓' : p.tipo === 'b' ? '💬' : p.tipo === 'a' ? '🙋' : '🎙'}</div><div>
    <b>${esc(pcChi(p))}${p.tipo === 'prof' ? ` <span class="min">· ${esc(t('pc.min', {m: Math.floor(p.da / 60)}))}</span> <button class="lnk" data-riv="${i}">${esc(t('pc.rivedi'))}</button>` : ''}</b>
    <div class="tx">${p.tipo === 'prof' ? '«' : ''}${parole(testo(p)).map(w => `<span class="w">${esc(w)}</span>`).join(' ')}${p.tipo === 'prof' ? '»' : ''}</div></div></div>`).join('');
  document.querySelectorAll('#v-podcast [data-i]').forEach(e => e.onclick = ev => { if (ev.target.closest('[data-riv]')) return; pcSuona(+e.dataset.i); });
  document.querySelectorAll('#v-podcast [data-riv]').forEach(b => b.onclick = () => { const p = PCS.d.pezzi[+b.dataset.riv]; pcFerma(); mostraMomento(PCS.lez.cartella, p.da, null, PCS.lez.nome); });
  pcSegna(-1);
}
function pcSegna(k, w = -1) {
  document.querySelectorAll('#v-podcast [data-i]').forEach(e => e.classList.toggle('ora', +e.dataset.i === k));
  document.querySelectorAll('#v-podcast .pz .w.on').forEach(x => x.classList.remove('on'));
  if (k >= 0 && w >= 0) { const x = document.querySelectorAll(`#v-podcast .pz[data-i="${k}"] .w`)[w]; if (x) x.classList.add('on'); }
  const P = PCS.d ? PCS.d.pezzi : [], fatto = P.slice(0, Math.max(0, k)).reduce((a, p) => a + pcDurata(p), 0);
  if (k >= 0) $('pcT0').textContent = mmss(Math.round(fatto));
}
function pcProf(p, k, giro) {
  // il pezzo vero della lezione, dal video/audio; le parole si illuminano con gli orari della trascrizione
  return new Promise(fatto => {
    const au = PCS.audio || (PCS.audio = new Audio(PCS.media));
    au.playbackRate = PCS.vel;
    const parti = p.frasi.map(f => ({...f, n: parole(f.testo).length}));
    const fine = () => { au.ontimeupdate = null; au.onended = null; au.pause(); fatto(PCS.giro === giro); };
    au.ontimeupdate = () => {
      if (PCS.giro !== giro) return fine();
      const tt = au.currentTime - p.da;
      if (au.currentTime >= p.a) return fine();
      let base = 0;
      for (const f of parti) { if (tt < f.fine) { const q = Math.max(0, Math.min(f.n - 1, Math.floor((tt - f.inizio) / Math.max(0.5, f.fine - f.inizio) * f.n))); pcSegna(k, base + q); break; } base += f.n; }
    };
    au.onended = fine;
    const via = () => { au.currentTime = p.da; au.play().catch(() => fatto(false)); };
    if (au.readyState >= 1) via(); else au.addEventListener('loadedmetadata', via, {once: true});
  });
}
async function pcSuona(k) {
  if (!PCS.d) return;
  pcFerma(true);
  const giro = {}; PCS.giro = giro; PCS.attivo = true; PCS.i = k; $('pcPlay').textContent = '⏸';
  const dsa = !!(R && R.facilitata);
  while (PCS.giro === giro && PCS.i < PCS.d.pezzi.length) {
    const p = PCS.d.pezzi[PCS.i], kk = PCS.i;
    pcSegna(kk, 0);
    const el = document.querySelector(`#v-podcast .pz[data-i="${kk}"]`); if (el) el.scrollIntoView({block: 'center', behavior: 'smooth'});
    let ok;
    if (p.tipo === 'prof' && PCS.media) ok = await pcProf(p, kk, giro);
    else {
      const testo = p.tipo === 'prof' ? p.frasi.map(f => f.testo).join(' ') : p.testo;
      const pos = []; let c = 0; parole(testo).forEach(w => { const j = testo.indexOf(w, c); pos.push(j); c = j + w.length; });
      let stima = null;
      if (VOCE_APP()) { let w = 0; stima = setInterval(() => { if (PCS.giro === giro) pcSegna(kk, Math.min(pos.length - 1, w++)); }, 420 / PCS.vel); }
      ok = await voceParla(testo, PCS.vel, ci => { let w = 0; while (w + 1 < pos.length && pos[w + 1] <= ci) w++; pcSegna(kk, w); }, p.tipo === 'a' ? 0 : p.tipo === 'b' ? 1 : -1);
      if (stima) clearInterval(stima);
    }
    if (PCS.giro !== giro) return;
    if (!ok) { pcFerma(); toast(t('as.novoce')); return; }
    if (dsa && p.tipo === 'prof') await pausa(2000);
    PCS.i++;
  }
  if (PCS.giro === giro) { PCS.attivo = false; PCS.i = 0; $('pcPlay').textContent = '▶'; pcSegna(-1); $('pcT0').textContent = '0:00'; }
}
function pcFerma(tieni) {
  PCS.giro = null; PCS.attivo = false;
  if (PCS.audio) { try { PCS.audio.pause(); PCS.audio.ontimeupdate = null; } catch (e) {} }
  voceFerma();
  if ($('pcPlay')) $('pcPlay').textContent = '▶';
}
function collegaPodcast() {
  $('pcPlay').onclick = () => { if (PCS.attivo) pcFerma(); else pcSuona(PCS.i || 0); };
  $('pcVel').querySelectorAll('span').forEach(s => s.onclick = () => { PCS.vel = +s.dataset.v; pcVel(); if (PCS.audio) PCS.audio.playbackRate = PCS.vel; if (PCS.attivo && PCS.d.pezzi[PCS.i].tipo !== 'prof') pcSuona(PCS.i); });
  $('pcDur').querySelectorAll('span').forEach(s => s.onclick = () => { if (PCS.dur === s.dataset.v || !PCS.lez) return; PCS.dur = s.dataset.v; apriPodcast(PCS.lez); });
  $('pcStile').querySelectorAll('span').forEach(s => s.onclick = () => { if (PCS.stile === s.dataset.v || !PCS.lez) return; PCS.stile = s.dataset.v; PCS.mp3 = null; apriPodcast(PCS.lez); });
  $('pcRifai').onclick = async () => { if (PCS.lez && await conferma(t('pc.rifai.t'), t('pc.rifai.c'))) apriPodcast(PCS.lez, true); };
  $('pcMp3').onclick = async () => { const b = $('pcMp3'); b.disabled = true; toast(t('pc.mp3.lav')); const r = await A.podcast_mp3(PCS.lez.cartella, PCS.dur, PCS.vel, PCS.stile); b.disabled = false; toast(r.ok ? t('pc.mp3.ok') : r.msg || ''); PCS.mp3 = r.ok ? r.file : null; };
  $('pcManda').onclick = async () => {
    if (!PCS.mp3) { toast(t('pc.mp3.lav')); const r = await A.podcast_mp3(PCS.lez.cartella, PCS.dur, PCS.vel, PCS.stile); if (!r.ok) return toast(r.msg || ''); PCS.mp3 = r.file; }
    A.spezzone_email(PCS.mp3);
  };
}

/* ------------------------------------------------------------------ Studia: la materia */
var STU = {m: null, info: null, dentro: false};
function materieStudia() {
  const M = [];
  (LZ ? LZ.lezioni : []).forEach(l => {
    if (!l.n_appunti || l.stato !== 'pronta' || !l.materia || (l.tipo || 'lezione') !== 'lezione') return;   // Studia: solo lezioni (non riunioni)
    let m = M.find(x => x.m.toLowerCase() === l.materia.toLowerCase());
    if (!m) M.push(m = {m: l.materia, cartelle: [], lez: [], n: 0, no: 0, tre: 0});
    m.cartelle.push(l.cartella); m.lez.push(l);
    if (l.ripasso) { m.n += l.ripasso.n || 0; m.no += l.ripasso.no || 0; m.tre += l.ripasso.tre || 0; }
  });
  return M;
}
async function apriStudia(materia) {
  if (materia) STU.m = materia;
  if (pagina !== 'studia') { STU.dentro = !!materia; vai('studia'); return; }       // vai() richiama apriStudia
  if (!LZ) await caricaLezioni();
  disegnaStudia();
}
// lezioni con gli appunti ma senza materia: in Studia non comparirebbero; qui si mette la materia con un tocco
function senzaMateria() { return (LZ ? LZ.lezioni : []).filter(l => l.n_appunti && l.stato === 'pronta' && !l.materia && (l.tipo || 'lezione') === 'lezione'); }
function cardSenzaMateria() {
  const S = senzaMateria();
  if (!S.length) return '';
  return `<div class="card" id="stSenza" style="margin-bottom:14px"><div class="avviso">${esc(t(S.length === 1 ? 'st.senza1' : 'st.senza', {n: S.length}))}</div>
    ${S.map((l, i) => `<div class="row mt" style="gap:10px"><span class="sp" style="color:var(--ink);font-weight:600">${esc(l.nome)}</span><button class="btn b-ghost b-sm" data-sm="${i}">${esc(t('mt.metti'))}</button></div>`).join('')}</div>`;
}
function collegaSenzaMateria() {
  const S = senzaMateria();
  document.querySelectorAll('#stSenza [data-sm]').forEach(b => b.onclick = () => cambiaMateria(S[+b.dataset.sm], m => { STU.m = m; disegnaStudia(); }));
}
async function disegnaStudia() {
  const M = materieStudia();
  if (!M.length) {
    $('stMat').innerHTML = '';
    $('stBox2').innerHTML = cardSenzaMateria() || `<div class="card"><div class="hint">${esc(t('st.vuoto'))}</div></div>`;
    collegaSenzaMateria();
    return;
  }
  const m = M.find(x => STU.m && x.m.toLowerCase() === STU.m.toLowerCase()) || M[0];
  STU.m = m.m;
  $('stMat').innerHTML = M.map(x => `<span data-m="${esc(x.m)}" class="${x === m ? 'on' : ''}">${esc(x.m)} · ${esc(x.lez.length === 1 ? t('rp.lez1') : t('rp.lezn', {n: x.lez.length}))}</span>`).join('');
  $('stMat').querySelectorAll('span').forEach(s => s.onclick = () => { STU.m = s.dataset.m; disegnaStudia(); });
  if (STORIA.length) barraPercorso('studia');
  const info = await A.studia_info(m.m);
  if (STU.m !== m.m) return;
  STU.info = info;
  const dsa = !!(R && R.facilitata), ult = v => v && v.length ? t('tl.ultimo', {v: v[v.length - 1]}) : '';
  let gg;
  if (info.giorni == null || info.giorni < 0) gg = `<div class="card stgg"><div style="flex:1"><b style="color:var(--ink)">${esc(t('st.nodata', {m: m.m}))}</b><div class="hint">${esc(t('st.nodata.s'))}</div></div><button class="btn b-ghost b-sm" data-sa="piano">${esc(t('st.data'))}</button></div>`;
  else gg = `<div class="card stgg">${info.giorni ? `<div class="gg">${info.giorni}</div>` : ''}<div style="flex:1"><b style="color:var(--ink)">${esc(info.giorni ? t(info.giorni === 1 ? 'st.gg1' : 'st.gg', {m: m.m}) : t('st.oggi.esame', {m: m.m}))}</b><div class="hint">${esc(fmtG(info.data_esame, {day: 'numeric', month: 'long'}))}${info.oggi && info.oggi.cose ? ' · ' + esc(t('st.oggi', {c: info.oggi.cose.join(', ')})) : ''}</div></div><button class="btn b-ghost b-sm" data-sa="piano">${esc(t('st.piano'))}</button></div>`;
  const D = new Set(dsa ? ['test', 'orale', 'scritto', 'ascm', 'fcorso', 'mverif', 'rgiorno', 'glos', 'tutor'] : []), d = k => D.has(k);
  const fl = m.n ? (m.no ? t('tl.flash.n', {n: m.n, r: m.no}) : t(m.n === 1 ? 'tl.flash.n1' : 'tl.flash.n0', {n: m.n})) : '';
  const dsaGr = dsa ? `<div class="dsagr">${gruppo(t('g.dsa'), [
      tile('orale', '🎤', t('tl.orale'), t('tl.dsa.orale.s'), ult(info.voti_orali)), tile('test', '☑', t('tl.dsa.test'), t('tl.dsa.test.s'), ult(info.voti_test)),
      tile('ascm', '🔊', t('tl.ascm'), t('tl.ascm.s')), m.n && tile('fcorso', '🃏', t('tl.dsa.flash'), t('tl.dsa.flc.s'), fl),
      tile('mverif', '🗺', t('tl.mv'), t('tl.dsa.mv.s')), tile('rgiorno', '🃏', t('tl.rg'), t('tl.rg.s')), tile('glos', '📖', t('tl.gl'), t('tl.dsa.gl.s')), tile('tutor', '🧑‍🏫', t('tl.tu'), t('tl.tu.s')), tile('mappe', '🗺', t('tl.dsa.mappe'), t('tl.dsa.mappe.s')), tile('scritto', '✍', t('tl.dsa.scr'), t('tl.dsa.scr.s'), ult(info.voti_scritti))])}<div class="altrihd">${esc(t('g.resto'))}</div></div>` : '';
  const resto = gruppo(t('g.prova'), [tile('test', '☑', t('tl.test'), t('tl.test.s'), ult(info.voti_test), d('test')), tile('orale', '🎤', t('tl.orale'), t('tl.orale.s'), ult(info.voti_orali), d('orale')),
      tile('scritto', '✍', t('tl.scritto'), t('tl.scritto.s'), ult(info.voti_scritti), d('scritto')), tile('mverif', '🗺', t('tl.mv'), t('tl.mv.s'), '', d('mverif'))]) +
    gruppo(t('g.ripassa'), [tile('rgiorno', '🃏', t('tl.rg'), t('tl.rg.s'), '', d('rgiorno')), tile('prob', '⭐', t('tl.prob'), t('tl.prob.s')), m.n && tile('fcorso', '🃏', t('tl.fcorso'), t('tl.fcorso.s'), fl, d('fcorso')), tile('ascm', '🔊', t('tl.ascm'), t('tl.ascm.s'), '', d('ascm'))]) +
    gruppo(t('g.capisci'), [tile('tutor', '🧑‍🏫', t('tl.tu'), t('tl.tu.s'), '', d('tutor')), tile('libro', '📘', t('tl.lb'), t('tl.lb.s')), tile('glos', '📖', t('tl.gl'), t('tl.gl.s'), '', d('glos')), tile('chm', '💬', t('tl.chm'), t('tl.chm.s')), tile('lezioni', '📚', t('tl.lez'), t('tl.lez.s', {n: m.lez.length, m: m.m}))]);
  const v = x => x && x.length ? x.join(' · ') : '—';
  const voti = info.voti_test.length || info.voti_orali.length || info.voti_scritti.length ? t('st.voti.v', {t: v(info.voti_test), o: v(info.voti_orali), s: v(info.voti_scritti)}) : t('st.voti0');
  $('stBox2').innerHTML = cardSenzaMateria() + `<div class="card tustudia" id="tuStudia"><span class="gr">🧑‍🏫</span><div class="sp"><b style="color:var(--ink)">${esc(t('tl.tu'))}</b><div class="hint" id="tuStudiaT">${esc(t('tl.tu.s'))}</div></div><button class="btn b-ghost b-sm">${esc(t('tu.studia.b'))}</button></div><div class="mt"></div><div class="card rgstudia" id="rgStudia"><span class="gr">🃏</span><div class="sp"><b style="color:var(--ink)">${esc(t('tl.rg'))}</b><div class="hint" id="rgStudiaT"></div></div><button class="btn b-main b-sm">${esc(t('rg.studia.b'))}</button></div><div class="mt"></div>` + gg + `<div class="card mt">${dsaGr}<div class="altri">${resto}</div></div><div class="card mt"><div class="lbl">${esc(t('st.voti'))}</div><div class="hint">${esc(voti)}</div></div>`;
  collegaSenzaMateria();
  $('stBox2').querySelectorAll('.altri .grp').forEach(g => { if ([...g.querySelectorAll('.tile')].every(x => x.classList.contains('dup'))) g.classList.add('dup'); });
  $('stBox2').querySelectorAll('[data-ta],[data-sa]').forEach(b => b.onclick = () => tileStudia(m, b.dataset.ta || b.dataset.sa));
  $('rgStudia').onclick = () => apriRipassoGiorno();
  $('tuStudia').onclick = () => apriTutor(m);
  if (m.lez.length >= 2) A.libro_info(m.m, []).then(r => {
    if (!r.ok || r.documenti.length || r.nascosto || STU.m !== m.m || !$('stBox2') || $('lbInv')) return;
    $('stBox2').insertAdjacentHTML('afterbegin', `<div class="card lbinv" id="lbInv" style="margin-bottom:14px"><span style="font-size:26px">📘</span><div class="sp"><b style="color:var(--ink)">${esc(t('lb.inv.t', {m: m.m}))}</b><div class="hint">${esc(t('lb.inv.s'))}</div></div><button class="btn b-ghost b-sm" id="lbInvSi">${esc(t('lb.inv.b'))}</button><button class="btn b-ghost b-sm" id="lbInvNo">✕</button></div>`);
    $('lbInvSi').onclick = () => apriLibro(m);
    $('lbInvNo').onclick = async () => { $('lbInv').remove(); await A.libro_nascondi(m.m); };
  });
  A.tutor(m.m, m.cartelle).then(r => { if (!r.ok || !$('tuStudiaT')) return; const n = r.cose.filter(c => !c.fatto).length;
    $('tuStudiaT').textContent = [r.giorni != null ? t('tu.studia.gg', {g: r.giorni}) : '', n ? t('tu.studia', {n, m: r.minuti}) : t('tu.studia0')].filter(Boolean).join(' · '); });
  A.ripasso_giorno(false, true).then(r => { if (!r.ok || !$('rgStudiaT')) return;
    $('rgStudiaT').textContent = r.carte ? `${r.carte} ${t(r.carte === 1 ? 'rg.studia1' : r.minuti === 1 ? 'rg.studia' : 'rg.studia', {m: r.minuti})}` : r.totale ? t('rg.studia0') : t('tl.rg.s'); });
}
async function tileStudia(m, a) {
  const esame = {m: m.m, cartelle: m.cartelle};
  if (a === 'piano' || a === 'prob') { await apriEsame(esame); return; }
  if (a === 'test' || a === 'orale' || a === 'scritto') {
    await apriEsame(esame);
    if (!ES.d) return;
    if (a === 'test') sceltaTest(); else if (a === 'orale') nuovaOrale(); else nuovaSimulazione();
    return;
  }
  if (a === 'fcorso') return iniziaRipasso(m.cartelle, m.m, 'prima');
  if (a === 'ascm') return apriAscoltaMateria(m);
  if (a === 'mverif') return apriMappaVerifica(m);
  if (a === 'rgiorno') return apriRipassoGiorno();
  if (a === 'glos') return apriGlossario(m);
  if (a === 'tutor') return apriTutor(m);
  if (a === 'libro') return apriLibro(m);
  if (a === 'chm') { await apriChiedi(m.lez[0]); const b = $('chSeg').querySelector('[data-x="1"]'); if (b && !$('chSeg').classList.contains('hidden')) b.click(); return; }
  if (a === 'lezioni') { $('cerca').value = m.m; vai('arch'); return; }
  if (a === 'mappe') {
    const lz = m.lez.filter(l => l.trascritta);
    const v = await dialogo({titolo: t('st.mappe.t', {m: m.m}), bottoni: [{t: t('annulla'), v: null}, ...lz.map((l, i) => ({t: esc(l.nome), cls: 'b-main', v: i}))]});
    if (v !== null && v !== false && lz[v]) apriMappa(lz[v]);
  }
}
/* ------------------------------------------------------------------ foto in aula */
async function scattaFotoLive() {
  const b = $('lFoto'); b.disabled = true;
  const r = await A.scatta_foto();
  b.disabled = false;
  if (!r || !r.ok) { if (r && r.msg) toast(r.msg); return; }
  $('lFotoStrip').insertAdjacentHTML('beforeend', `<div class="fth" style="background-image:url('${r.url}')"><em>${hms(r.sec)}</em></div>`);
  toast(t('fo.ok', {t: hms(r.sec)}));
}
var FO = {l: null, foto: [], i: 0};
async function apriFoto(l) {
  FO = {l, foto: [], i: 0};
  $('foSub').textContent = ''; $('foGal').innerHTML = '<span class="spin"></span>'; $('foDet').innerHTML = '';
  vai('fo');
  const r = await A.foto_lezione(l.cartella);
  if (FO.l !== l) return;
  FO.foto = r.foto || [];
  $('foSub').textContent = t('fo.sub', {n: FO.foto.length, l: l.nome});
  $('foGal').innerHTML = FO.foto.map((f, i) => `<div class="fth" data-i="${i}" style="background-image:url('${f.url}')"><em>${hms(f.sec)}</em></div>`).join('');
  $('foGal').querySelectorAll('.fth').forEach(x => x.onclick = () => foMostra(+x.dataset.i));
  if (FO.foto.length) foMostra(0);
}
async function foMostra(i) {
  FO.i = i; const f = FO.foto[i], l = FO.l;
  $('foGal').querySelectorAll('.fth').forEach(x => x.classList.toggle('on', +x.dataset.i === i));
  $('foDet').innerHTML = `<div class="lbl">${esc(t('fo.alle', {t: hms(f.sec)}))}</div><img class="fobig" src="${f.url}" alt="">
    <div class="lbl" style="margin-top:12px">${esc(t('fo.cosa'))}</div><div class="foocr" id="foOcr">${f.testo ? esc(f.testo) : `<span class="spin" style="width:14px;height:14px"></span> ${esc(t('fo.lav'))}`}</div>
    <div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn b-ghost b-sm" id="foSenti">${esc(t('fo.senti'))}</button><button class="btn b-ghost b-sm" id="foZoom">${esc(t('fo.zoom'))}</button></div>`;
  $('foSenti').onclick = () => mostraMomento(l.cartella, f.sec, null, l.nome);
  const zoom = () => dialogo({titolo: t('fo.alle', {t: hms(f.sec)}), html: `<img src="${f.url}" style="width:100%;border-radius:10px">`});
  $('foZoom').onclick = zoom; $('foDet').querySelector('.fobig').onclick = zoom;
  if (!f.testo) {
    const r = await A.foto_leggi(l.cartella, f.file);
    if (FO.l !== l || FO.i !== i || !$('foOcr')) return;
    if (r.ok) { f.testo = r.testo; $('foOcr').textContent = r.testo; silabizza($('foOcr')); } else $('foOcr').innerHTML = `<span style="color:#be123c">⚠ ${esc(r.msg || '')}</span>`;
  } else silabizza($('foOcr'));
}
/* ------------------------------------------------------------------ appunti a mano e fotocopie */
var SC = {l: null};
async function apriScritti(l) {
  SC = {l};
  const vecchia = ANDROID && (R.app_codice || 0) < 12;
  $('scScatta').classList.toggle('hidden', vecchia); $('scScegli').classList.toggle('hidden', vecchia);
  $('scSub').textContent = l.nome;
  $('scBox').innerHTML = '<span class="spin"></span>';
  vai('sc');
  const r = await A.scritti_lezione(l.cartella);
  if (SC.l === l) disegnaScritti(r.scritti || []);
}
function disegnaScritti(lista) {
  const l = SC.l;
  $('scBox').innerHTML = lista.length ? `<div class="hint" style="margin-bottom:10px">${esc(t('sc.dubbi'))}</div>` + lista.map((v, i) => `<div class="card scfo"><div>${v.url ? `<img src="${v.url}" alt="" data-z="${i}">` : ''}<div class="row mt" style="gap:6px"><b style="color:var(--ink)">${esc(t('sc.foglio', {n: i + 1}))}</b><span class="sp"></span><button class="btn b-ghost b-sm b-red" data-togli="${esc(v.file)}">${esc(t('sc.togli'))}</button></div></div>
      <div><textarea class="in" data-f="${esc(v.file)}">${esc(v.testo || '')}</textarea><div class="hint" data-ok="${esc(v.file)}"></div></div></div>`).join('')
    : `<div class="card"><div class="hint">${esc(t('sc.vuoto'))}</div></div>`;
  $('scBox').querySelectorAll('textarea').forEach(x => x.onchange = async () => { await A.scritti_correggi(l.cartella, x.dataset.f, x.value); const h = $('scBox').querySelector(`[data-ok="${x.dataset.f}"]`); if (h) h.textContent = t('sc.salvato'); });
  $('scBox').querySelectorAll('[data-togli]').forEach(b => b.onclick = async () => { const r = await A.scritti_togli(l.cartella, b.dataset.togli); disegnaScritti(r.scritti || []); });
  $('scBox').querySelectorAll('[data-z]').forEach(x => x.onclick = () => dialogo({titolo: t('sc.foglio', {n: +x.dataset.z + 1}), html: `<img src="${x.src}" style="width:100%;border-radius:10px">`}));
}
async function scrittiAggiungi(scatta) {
  const l = SC.l; if (!l) return;
  const s = scatta ? await A.scatta_foglio() : await A.scegli_immagini();
  if (!s || !s.ok || !s.percorsi.length) return;
  $('scBox').insertAdjacentHTML('afterbegin', `<div class="card" id="scLav" style="margin-bottom:12px"><div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('sc.lav', {n: s.percorsi.length}))}</div></div>`);
  const r = await A.scritti_aggiungi(l.cartella, s.percorsi);
  if (SC.l !== l) return;
  if (!r.ok) { if ($('scLav')) $('scLav').remove(); await dialogo({titolo: t('sc.nome'), testo: r.msg || ''}); return; }
  disegnaScritti(r.scritti || []);
  toast(t('sc.ok', {n: r.n}));
  l.n_scritti = (r.scritti || []).length;
}
/* ------------------------------------------------------------------ aula rumorosa (dopo) */
var RU = {l: null, poll: null};
async function apriRumore(l) {
  if (RU.poll) clearInterval(RU.poll);
  RU = {l, poll: null};
  $('ruSub').textContent = l.nome;
  $('ruBox').innerHTML = `<div class="card"><div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('ru.lav'))}</div></div>`;
  vai('ru');
  const r = await A.rumore_info(l.cartella);
  if (RU.l !== l) return;
  if (!r.prima) { $('ruBox').innerHTML = `<div class="card"><div class="hint">${esc(t('ru.noaudio'))}</div></div>`; return; }
  const g = r.snr >= 20 ? 'ru.g1' : r.snr >= 14 ? 'ru.g2' : 'ru.g3';
  $('ruBox').innerHTML = `<div class="card"><div class="hint">${esc(t('ru.snr', {d: r.snr, g: t(g)}))}</div>${r.auto ? `<div class="avviso mt">${esc(t('ru.auto'))}</div>` : ''}
      <div class="set mt"><div class="t"><b>${esc(t('ru.sw'))}</b><span>${esc(t('ru.sw.s'))}</span></div><div class="sw${r.rumorosa || (r.rumorosa == null && r.auto) ? ' on' : ''}" id="ruSw"></div></div></div>
    <div class="card mt"><div class="lbl">${esc(t('ru.senti'))}</div>
      <div class="ruonda"><b style="width:60px">${esc(t('ru.prima'))}</b><audio controls preload="none" src="${r.prima}"></audio></div>
      <div class="ruonda"><b style="width:60px">${esc(t('ru.dopo'))}</b><audio controls preload="none" src="${r.dopo}"></audio></div></div>
    <div class="card mt"><button class="btn b-main b-sm" id="ruRifai"${r.occupato ? ' disabled' : ''}>${esc(t('ru.rifai'))}</button><div class="hint mt">${esc(t('ru.rifai.s'))}</div><div id="ruAv"></div></div>`;
  $('ruSw').onclick = async () => { const on = !$('ruSw').classList.contains('on'); $('ruSw').classList.toggle('on', on); await A.rumore_imposta(l.cartella, on); };
  $('ruRifai').onclick = async () => {
    const x = await A.ritrascrivi(l.cartella);
    if (!x.ok) { toast(x.msg || ''); return; }
    $('ruSw').classList.add('on'); $('ruRifai').disabled = true;
    $('ruAv').innerHTML = `<div class="row mt" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('ru.rifai.lav'))}</div><div class="bar"><i id="ruBar" style="width:0%"></i></div>`;
    RU.poll = setInterval(async () => {
      const a = await A.ritrascrivi_avanzamento();
      if ($('ruBar')) $('ruBar').style.width = Math.round((a.f || 0) * 100) + '%';
      if (a.stato === 'fatto' || a.stato === 'errore') {
        clearInterval(RU.poll); RU.poll = null;
        $('ruAv').innerHTML = `<div class="${a.stato === 'fatto' ? 'okt' : 'kot'} mt" style="font-weight:700">${esc(a.stato === 'fatto' ? t('ru.rifai.ok') : '⚠ ' + (a.msg || ''))}</div>`;
        if ($('ruRifai')) $('ruRifai').disabled = false;
      }
    }, 800);
  };
}
/* ------------------------------------------------------------------ libro di testo */
// Il PDF del libro letto sul dispositivo (libro.py): le pagine di ogni lezione, cosa c'e' nel libro ma non a lezione,
// la pagina da leggere con le frasi della lezione evidenziate.
var LB = {m: null, d: null, pag: null, poll: null, q: ''};
async function apriLibro(m, pagina) {
  if (LB.poll) clearInterval(LB.poll);
  LB = {m, d: null, pag: null, poll: null, q: ''};
  $('lbH').textContent = t('lb.h', {m: m.m});
  $('lbBox').innerHTML = `<div class="card"><span class="spin"></span></div>`;
  vai('lb');
  await lbCarica(pagina);
}
async function lbCarica(pagina) {
  const m = LB.m;
  const r = await A.libro_info(m.m, m.cartelle);
  if (LB.m !== m) return;
  if (!r.ok) { $('lbBox').innerHTML = `<div class="card"><div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div></div>`; return; }
  LB.d = r;
  if (!r.documenti.length) return lbVuoto();
  disegnaLibro();
  const l0 = r.lezioni.find(x => x.tratto);
  if (pagina) lbPagina(pagina.k, pagina.n, pagina.q || '');
  else if (l0) lbPagina(l0.tratto.k, l0.tratto.da, l0.cartella);
  else lbPagina(r.documenti[0].k, 1, '');
}
function lbVuoto() {
  $('lbBox').innerHTML = `<div class="card lbvuoto"><div class="ic">📘</div><b style="display:block;font-size:19px;color:var(--ink);margin:6px 0 4px">${esc(t('lb.v.t', {m: LB.m.m}))}</b>
    <div class="hint" style="max-width:520px;margin:0 auto">${esc(t('lb.v.s'))}</div>
    <div class="row" style="justify-content:center;margin-top:16px"><button class="btn b-main" id="lbScegli">${esc(t('lb.v.b'))}</button></div>
    <div class="hint" style="margin-top:10px">${esc(t('lb.v.n'))}</div></div>`;
  $('lbScegli').onclick = () => lbAggiungi(true);
  $('lbBox').querySelector('.lbvuoto .row').insertAdjacentHTML('beforeend', `<button class="btn b-ghost" id="lbFoto">${esc(t('lb.foto'))}</button>`);
  $('lbFoto').onclick = () => lbFoto();
}
async function lbFoto() {
  const s = await A.scegli_immagini();
  if (!s || !s.ok || !s.percorsi.length) return;
  if (!await conferma(t('lb.foto'), t('lb.foto.q', {n: s.percorsi.length, c: num((s.percorsi.length * 0.004).toFixed(2))}), t('si'), t('annulla'))) return;
  const m = LB.m;
  const r = await A.libro_foto(m.m, s.percorsi);
  if (!r.ok) { await dialogo({titolo: t('lb.nome'), testo: r.msg || ''}); return; }
  lbAttendi(m, t('lb.foto.lav'));
}
function lbAttendi(m, testo) {
  $('lbBox').innerHTML = `<div class="card" style="padding:22px"><div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(testo)}</div><div class="bar" style="margin-top:12px"><i id="lbBar" style="width:2%"></i></div></div>`;
  LB.poll = setInterval(async () => {
    const a = await A.libro_avanzamento();
    if (LB.m !== m) return;
    if ($('lbBar')) $('lbBar').style.width = Math.max(2, Math.round((a.f || 0) * 100)) + '%';
    if (a.stato === 'fatto' || a.stato === 'errore') {
      clearInterval(LB.poll); LB.poll = null;
      if (a.stato === 'errore') await dialogo({titolo: t('lb.nome'), testo: a.msg || ''});
      lbCarica();
    }
  }, 700);
}
async function lbAggiungi(sostituisci) {
  const f = await A.scegli_pdf();
  if (!f.ok) { if (f.msg) await dialogo({titolo: t('lb.nome'), testo: f.msg}); return; }
  const m = LB.m;
  const r = await A.libro_aggiungi(m.m, f.percorso, !!sostituisci);
  if (!r.ok) { await dialogo({titolo: t('lb.nome'), testo: r.msg || ''}); return; }
  $('lbBox').innerHTML = `<div class="card" style="padding:22px"><div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('lb.lav'))} <b>${esc(f.nome || '')}</b></div><div class="bar" style="margin-top:12px"><i id="lbBar" style="width:2%"></i></div></div>`;
  LB.poll = setInterval(async () => {
    const a = await A.libro_avanzamento();
    if (LB.m !== m) return;
    if ($('lbBar')) $('lbBar').style.width = Math.max(2, Math.round((a.f || 0) * 100)) + '%';
    if (a.stato === 'fatto' || a.stato === 'errore') {
      clearInterval(LB.poll); LB.poll = null;
      if (a.stato === 'errore') { await dialogo({titolo: t('lb.nome'), testo: a.msg || ''}); }
      lbCarica();
    }
  }, 700);
}
function disegnaLibro() {
  const r = LB.d, m = LB.m;
  const tot = r.documenti.reduce((a, d) => a + d.pagine, 0);
  const docs = r.documenti.map(d => `<div class="lbdoc">${d.tipo === 'libro' ? '📘' : '📄'} <b>${esc(d.nome)}</b> · ${d.pagine} p. <button class="lnk" data-apri="${d.k}">${esc(t('lb.apri'))}</button> · <button class="lnk" data-togli="${d.k}">${esc(t('lb.togli'))}</button></div>`).join('');
  const lez = r.lezioni.map(l => {
    const tr_ = l.tratto, pp = tr_ ? (tr_.da === tr_.a ? t('lb.p', {a: tr_.et_da}) : t('lb.pp', {a: tr_.et_da, b: tr_.et_a})) : t('lb.nolez');
    return `<div class="lbr" data-k="${tr_ ? tr_.k : ''}" data-n="${tr_ ? tr_.da : ''}" data-q="${esc(l.cartella)}"><span class="pill p-vio">L${l.n}</span><div class="sp"><b>${esc(mvSenzaMateria(l.nome, m.m))}</b><small>${esc(l.data)}${tr_ && tr_.cap ? ' · ' + esc(tr_.cap) : ''}</small></div><span class="pg2">${esc(pp)}${tr_ ? ' ›' : ''}</span></div>`;
  }).join('');
  $('lbBox').innerHTML = `<div class="lbgrid"><div>
      <div class="card"><div class="lbfile"><span class="ic">📘</span><div class="sp"><b style="color:var(--ink)">${esc(r.documenti[0].nome)}</b><div class="hint">${esc(t('lb.info', {p: tot}))}</div></div>
        <button class="btn b-ghost b-sm" id="lbDisp">${esc(t('lb.disp'))}</button><button class="btn b-ghost b-sm" id="lbCambia">${esc(t('lb.cambia'))}</button></div>
        ${docs}<div class="hint" style="margin-top:10px">${esc(t('lb.dove'))}</div></div>
      <div class="card mt"><div class="lbl">${esc(t('lb.lez'))}</div>${lez}</div>
      <div class="card mt" id="lbManc"></div></div>
    <div class="card"><div class="row" style="justify-content:space-between"><div class="lbl" style="margin:0" id="lbNum"></div><div class="row" style="gap:6px"><button class="btn b-ghost b-sm" id="lbPrima">‹</button><button class="btn b-ghost b-sm" id="lbDopo">›</button><button class="btn b-ghost b-sm" id="lbVoce">🔊</button></div></div>
      <div class="lbpag mt" id="lbPag"></div></div></div>`;
  $('lbDisp').onclick = async () => { const v = await dialogo({titolo: t('lb.quale'), bottoni: [{t: t('annulla'), v: null}, {t: esc(t('lb.quale.foto')), cls: 'b-ghost', v: 'foto'}, {t: esc(t('lb.quale.pdf')), cls: 'b-main', v: 'pdf'}]}); if (v === 'pdf') lbAggiungi(false); else if (v === 'foto') lbFoto(); };
  $('lbCambia').onclick = () => lbAggiungi(true);
  $('lbBox').querySelectorAll('[data-apri]').forEach(b => b.onclick = () => A.apri_pdf_libro(m.m, +b.dataset.apri));
  $('lbBox').querySelectorAll('[data-togli]').forEach(b => b.onclick = async () => {
    const d = r.documenti.find(x => x.k === +b.dataset.togli);
    if (!await conferma(t('lb.nome'), t('lb.togli.q', {n: d.nome}), t('lb.togli'), t('annulla'), 'b-rec')) return;
    await A.libro_togli(m.m, d.k); lbCarica();
  });
  $('lbBox').querySelectorAll('.lbr[data-k]').forEach(x => x.onclick = () => { if (!x.dataset.k) return; $('lbBox').querySelectorAll('.lbr').forEach(y => y.classList.toggle('on', y === x)); lbPagina(+x.dataset.k, +x.dataset.n, x.dataset.q); });
  $('lbPrima').onclick = () => LB.pag && lbPagina(LB.pag.k, LB.pag.n - 1, LB.q);
  $('lbDopo').onclick = () => LB.pag && lbPagina(LB.pag.k, LB.pag.n + 1, LB.q);
  $('lbVoce').onclick = () => LB.pag && voceParla(LB.pag.frasi.join(' '));
  lbMancano();
}
function lbMancano() {
  const r = LB.d, box = $('lbManc');
  const testa = `<div class="lbl">${esc(t('lb.manc'))}</div><div class="hint">${esc(t('lb.manc.s'))}</div>`;
  if (r.mancano == null) { box.innerHTML = testa + `<div class="row mt"><button class="btn b-main b-sm" id="lbTrova">${esc(t('lb.manc.b'))}</button></div>`; $('lbTrova').onclick = () => lbTrova(false); return; }
  const lista = r.mancano.map((x, i) => `<div class="lbm" data-i="${i}"><span style="font-size:20px">⚠</span><div class="sp"><b>${esc(x.argomento)}</b><small>${esc(x.nominato ? t('lb.nom', {p: x.et, l: x.nominato.lezione, m: Math.floor(x.nominato.sec / 60)}) : t('lb.mai', {p: x.et}))}</small></div>
      <button class="btn b-ghost b-sm" data-sp="${i}">${esc(t('lb.spiega'))}</button><button class="btn b-ghost b-sm" data-in="${i}">${esc(t('lb.interr'))}</button></div>`).join('');
  box.innerHTML = testa + (r.mancano_vecchi ? `<div class="avviso row mt"><span class="sp">${esc(t('lb.manc.vecchio'))}</span><button class="btn b-ghost b-sm" id="lbAgg">${esc(t('lb.manc.agg'))}</button></div>` : '') +
    (lista || `<div class="hint mt">${esc(t('lb.manc0'))}</div>`);
  if ($('lbAgg')) $('lbAgg').onclick = () => lbTrova(true);
  box.querySelectorAll('.lbm').forEach(x => x.onclick = e => { if (e.target.closest('button')) return; const v = r.mancano[+x.dataset.i]; if (v.k) lbPagina(v.k, v.n, v.argomento); });
  const chiedi = (v, q) => { apriTutor(LB.m).then(() => tuInvia(q)); };
  box.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { const v = r.mancano[+b.dataset.sp]; chiedi(v, t('lb.spiega.q', {a: v.argomento, p: v.et})); });
  box.querySelectorAll('[data-in]').forEach(b => b.onclick = () => { const v = r.mancano[+b.dataset.in]; chiedi(v, t('lb.interr.q', {a: v.argomento, p: v.et})); });
}
async function lbTrova(rifai) {
  const m = LB.m;
  $('lbManc').innerHTML = `<div class="lbl">${esc(t('lb.manc'))}</div><div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('lb.manc.lav'))}</div>`;
  const r = await A.libro_mancano(m.m, m.cartelle, !!rifai);
  if (LB.m !== m) return;
  if (!r.ok) { $('lbManc').innerHTML = `<div class="lbl">${esc(t('lb.manc'))}</div><div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>`; return; }
  LB.d.mancano = r.mancano; LB.d.mancano_vecchi = false;
  lbMancano();
}
async function lbPagina(k, n, q) {
  LB.q = q || '';
  const r = await A.libro_pagina(LB.m.m, k, n, null, LB.q);
  if (!r.ok || !$('lbPag')) return;
  LB.pag = r;
  $('lbNum').textContent = t('lb.pag', {p: r.et}) + (r.cap ? ' · ' + r.cap : '');
  $('lbPag').innerHTML = `<h4>${esc(r.doc)}</h4>` + r.frasi.map((f, i) => r.evid.includes(i) ? `<mark>${esc(f)}</mark>` : esc(f)).join(' ');
  $('lbPag').scrollTop = 0;
  const e = $('lbPag').querySelector('mark'); if (e) e.scrollIntoView({block: 'center'});
  $('lbPrima').disabled = r.n <= 1; $('lbDopo').disabled = r.n >= r.tot;
  silabizza($('lbPag'));
}
async function lbApriEt(materia, et) {
  const m = materieStudia().find(x => x.m.toLowerCase() === String(materia || '').toLowerCase()); if (!m) return;
  const r = await A.libro_pagina(m.m, null, null, et, '');
  if (r.ok) apriLibro(m, {k: r.k, n: r.n, q: ''});
}
// «📘 Libro p. N» sotto una flashcard o nel glossario: la pagina piu' adatta (ricerca fatta sul dispositivo)
async function lbRif(box, materia, testo) {
  if (!box || !materia) return;
  const r = await A.libro_cerca(materia, testo);
  if (!r.ok || !document.body.contains(box)) return;
  const b = document.createElement('button'); b.className = 'lbref'; b.textContent = t('lb.ref', {p: r.et});
  b.onclick = e => { e.stopPropagation(); const m = materieStudia().find(x => x.m.toLowerCase() === materia.toLowerCase()); if (m) apriLibro(m, {k: r.k, n: r.n, q: testo}); };
  box.appendChild(b);
}
/* ------------------------------------------------------------------ il tuo tutor */
// Sa la data dell'esame, cosa e' stato studiato e dove si sbaglia (tutor.py, gratis); la chat usa Claude con queste
// informazioni in piu' (come «Chiedi» su tutta la materia).
var TU = {m: null, d: null, storia: [], ascolto: false};
async function apriTutor(m) {
  if (!TU.m || TU.m.m !== m.m) TU = {m, d: null, storia: [], ascolto: false}; else TU.m = m;
  $('tuH').textContent = t('tu.h', {m: m.m});
  $('tuIn').placeholder = t('tu.ph');
  $('tuOggi').innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('tu.lav'))}</div>`;
  $('tuDeb').innerHTML = ''; $('tuVa').innerHTML = '';
  vai('tu');
  disegnaTuChat();
  const r = await A.tutor(m.m, m.cartelle);
  if (TU.m !== m) return;
  if (!r.ok) { $('tuOggi').innerHTML = `<div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>`; return; }
  TU.d = r;
  disegnaTutor();
}
function disegnaTutor() {
  const r = TU.d, m = TU.m;
  const testa = r.giorni == null ? `<div class="tuoggi"><div><b>${esc(t('tu.nodata', {m: m.m}))}</b><span>${esc(t('tu.info', {p: r.pronto}))}${r.serie ? ' · ' + esc(t('tu.serie', {n: r.serie})) : ''}</span></div></div>`
    : `<div class="tuoggi">${r.giorni ? `<div class="gg">${r.giorni}</div>` : ''}<div><b>${esc(r.giorni ? t(r.giorni === 1 ? 'tu.gg1' : 'tu.gg', {m: m.m}) : t('tu.gg0', {m: m.m}))}</b><span>${esc(fmtG(r.data_esame, {weekday: 'long', day: 'numeric', month: 'long'}))} · ${esc(t('tu.info', {p: r.pronto}))}${r.serie ? ' · ' + esc(t('tu.serie', {n: r.serie})) : ''}</span></div></div>`;
  const resta = r.cose.filter(c => !c.fatto).reduce((a, c) => a + c.min, 0);
  $('tuOggi').innerHTML = testa + `<div class="lbl" style="margin-top:16px">${esc(resta ? t('tu.oggi', {m: resta}) : t('tu.oggi0'))}</div>
    <div class="tucosa">${r.cose.map((c, i) => `<div class="tuc${c.fatto ? ' ok' : ''}" data-i="${i}"><span class="ck">${c.fatto ? '✓' : ''}</span><div class="sp"><b>${esc(c.t)}</b><small>${esc(c.s)}</small></div><span class="min">${esc(t('tu.min', {m: c.min}))}</span></div>`).join('')}</div>`;
  $('tuOggi').querySelectorAll('.tuc').forEach(x => {
    const c = r.cose[+x.dataset.i];
    x.querySelector('.ck').onclick = async e => { e.stopPropagation(); c.fatto = !c.fatto; await A.tutor_fatto(c.k, c.fatto); disegnaTutor(); };
    x.onclick = () => tuAzione(c);
  });
  $('tuDeb').innerHTML = `<div class="lbl">${esc(t('tu.deb'))}</div>` + (r.deboli.length ? r.deboli.map(x => x.mai
      ? `<div class="tudeb"><span class="pill p-warn">${esc(t('tu.mai'))}</span><div class="sp"><b>${esc(x.argomento)}</b><span class="hint">${esc(t('tu.mai.s'))}</span></div></div>`
      : `<div class="tudeb"><span class="pill ${x.bene ? 'p-ok' : 'p-red'}">${x.ok}/${x.tot}</span><div class="sp"><b>${esc(x.argomento)}</b><span class="hint">${esc(x.fonte)}</span></div></div>`).join('')
    : `<div class="hint">${esc(t('tu.deb0'))}</div>`);
  const v = a => a.join(' · ');
  $('tuVa').innerHTML = `<div class="lbl">${esc(t('tu.va'))}</div>` + (r.voti_test.length || r.voti_orali.length
      ? (r.voti_test.length ? `<div class="hint">${esc(t('tu.vt', {v: v(r.voti_test)}))}</div>` : '') + (r.voti_orali.length ? `<div class="hint" style="margin-top:4px">${esc(t('tu.vo', {v: v(r.voti_orali)}))}</div>` : '')
      : `<div class="hint">${esc(t('tu.nov'))}</div>`) +
    `<div class="bar" style="margin-top:10px"><i style="width:${r.pronto}%"></i></div><div class="hint" style="margin-top:6px">${esc(t('tu.pronto', {p: r.pronto}) + (r.obiettivo ? t('tu.obiettivo', {o: r.obiettivo}) : ''))}</div>`;
  const deb = r.deboli.find(x => !x.mai && !x.bene);
  const q = [t('tu.q1'), deb ? t('tu.q2', {a: deb.argomento}) : t('tu.q2b'), t('tu.q3'), r.giorni != null ? t('tu.q4', {d: fmtG(r.data_esame, {day: 'numeric', month: 'long'})}) : t('tu.q4b'), t('tu.q5')];
  $('tuChips').innerHTML = q.map(x => `<button class="chip2">${esc(x)}</button>`).join('');
  $('tuChips').querySelectorAll('.chip2').forEach(b => b.onclick = () => tuInvia(b.textContent));
}
async function tuAzione(c) {
  const m = TU.m;
  if (c.k === 'rg') return apriRipassoGiorno();
  if (c.k === 'piano' || c.k === 'data') return tileStudia(m, 'piano');
  if (c.k === 'orale') return tileStudia(m, 'orale');
  const l = (LZ ? LZ.lezioni : []).find(x => x.cartella === c.cartella);
  if (!l) return;
  if (c.k === 'lezione') return apriLezione(l);
  if (c.k === 'riascolta') { await apriKaraoke(l); if (KK.lez === l && KK.au) kkVai(c.sec); }
}
function disegnaTuChat() {
  const h = [`<div class="msg cl">${esc(t('tu.ciao'))}</div>`, ...TU.storia.map((x, k) => x.chi === 'io' ? `<div class="msg io">${esc(x.testo)}</div>`
    : x.chi === 'att' ? `<div class="msg cl"><span class="spin" style="width:14px;height:14px;vertical-align:-2px"></span> ${esc(t('tu.pensa'))}</div>`
    : x.chi === 'err' ? `<div class="msg cl" style="color:#be123c">⚠ ${esc(x.testo)}</div>`
    : `<div class="msg cl">${testoRisposta(x.testo, (TU.d && TU.d.nomi) || [])}<div class="solo-dsa" style="margin-top:6px"><button class="btn b-ghost ascolta" data-voce="${k}">${esc(t('ch.asc'))}</button></div></div>`)];
  $('tuChat').innerHTML = h.join('');
  $('tuChat').querySelectorAll('[data-voce]').forEach(b => b.onclick = () => voceParla(String(TU.storia[+b.dataset.voce].testo || '').replace(/\[\[[^\]]*\]\]/g, '').replace(/\*\*/g, '')));
  $('tuChat').querySelectorAll('.lbcita').forEach(b => b.onclick = () => lbApriEt(TU.m.m, b.dataset.lbp));
  $('tuChat').querySelectorAll('.cita:not(.lbcita)').forEach(b => b.onclick = () => { const cs = (TU.d && TU.d.cartelle) || TU.m.cartelle; mostraMomento(cs[+b.dataset.i] || cs[0], +b.dataset.t, b.dataset.s ? +b.dataset.s : null, ((TU.d && TU.d.nomi) || [])[+b.dataset.i] || ''); });
  $('tuChat').scrollTop = $('tuChat').scrollHeight;
  silabizza($('tuChat'));
}
async function tuInvia(testo) {
  const q = String(testo || '').trim();
  if (!q || TU.storia.some(x => x.chi === 'att')) return;
  $('tuIn').value = '';
  const prima = TU.storia.filter(x => x.chi === 'io' || x.chi === 'cl');
  TU.storia = [...prima, {chi: 'io', testo: q}, {chi: 'att'}];
  disegnaTuChat();
  const m = TU.m;
  const r = await A.tutor_chiedi(m.m, m.cartelle, prima, q);
  if (TU.m !== m) return;
  TU.storia = TU.storia.filter(x => x.chi !== 'att');
  TU.storia.push(r.ok ? {chi: 'cl', testo: r.testo} : {chi: 'err', testo: r.msg});
  disegnaTuChat();
}
function collegaTutor() {
  $('tuVai').onclick = () => tuInvia($('tuIn').value);
  $('tuIn').addEventListener('keydown', e => { if (e.key === 'Enter') tuInvia($('tuIn').value); });
  $('tuMic').onclick = () => detta($('tuMic'), $('tuIn'));
}
/* ------------------------------------------------------------------ glossario della materia */
// Le parole difficili di tutte le lezioni (glossario.py: le prende dagli appunti, Claude unisce i doppioni), con la
// slide e la frase vera del prof nel punto in cui ne parla.
var GL = {m: null, d: null, cur: null, f: 'tutte', lez: '', q: '', au: null};
const glMin = s => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
const glIniz = x => (String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[A-Za-z0-9]/) || ['#'])[0].toUpperCase();
async function apriGlossario(m, rifai) {
  if (GL.au) GL.au.pause();
  GL = {m, d: null, cur: null, f: 'tutte', lez: '', q: '', au: null};
  $('glH').textContent = t('gl.h', {m: m.m});
  $('glBox').innerHTML = `<div class="card"><div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('gl.lav'))}</div></div>`;
  ['glPdf', 'glRip'].forEach(id => $(id).disabled = true);
  vai('gl');
  const r = await A.glossario(m.m, m.cartelle, !!rifai, false);
  if (GL.m !== m) return;
  if (!r.ok) { $('glBox').innerHTML = `<div class="card"><div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div></div>`; return; }
  GL.d = r; GL.cur = r.voci.find(v => v.importante) || r.voci[0] || null;
  ['glPdf', 'glRip'].forEach(id => $(id).disabled = !r.voci.length);
  disegnaGlossario();
}
function glFiltrate() {
  const q = rgNorm(GL.q);
  return GL.d.voci.filter(v => (GL.f !== 'imp' || v.importante) && (!GL.lez || v.lezioni.includes(GL.lez)) &&
    (!q || rgNorm([v.termine, ...v.uguali].join(' ')).includes(q)));
}
function disegnaGlossario() {
  const d = GL.d, imp = d.voci.filter(v => v.importante).length;
  if (!$('glLista')) {
    $('glBox').innerHTML = (d.vecchio ? `<div class="avviso row" style="margin-bottom:12px"><span class="sp">${esc(t('gl.vecchio'))}</span><button class="btn b-ghost b-sm" id="glAgg">${esc(t('gl.aggiorna'))}</button></div>` : '') +
      `<div class="card"><div class="glbar"><input class="in sm" id="glCerca" placeholder="${esc(t('gl.cerca'))}">
        <div class="seg" id="glF"><span data-v="tutte" class="on">${esc(t('gl.tutte', {n: d.voci.length}))}</span><span data-v="imp">${esc(t('gl.imp', {n: imp}))}</span></div>
        ${d.lezioni.length > 1 ? `<select id="glLez"><option value="">${esc(t('gl.ognilez'))}</option>${d.lezioni.map(l => `<option value="L${l.n}">L${l.n} · ${esc(mvSenzaMateria(l.nome, GL.m.m))}</option>`).join('')}</select>` : ''}</div>
        <div class="glaz" id="glAz"></div></div>
      <div class="glgrid"><div class="card gllista" id="glLista"></div><div class="card glsch" id="glScheda"></div></div>`;
    if ($('glAgg')) $('glAgg').onclick = () => apriGlossario(GL.m, true);
    $('glCerca').oninput = () => { GL.q = $('glCerca').value; disegnaGlossario(); };
    $('glF').querySelectorAll('span').forEach(x => x.onclick = () => { GL.f = x.dataset.v; $('glF').querySelectorAll('span').forEach(y => y.classList.toggle('on', y === x)); disegnaGlossario(); });
    if ($('glLez')) $('glLez').onchange = () => { GL.lez = $('glLez').value; disegnaGlossario(); };
  }
  const vv = glFiltrate();
  let h = '', l0 = '';
  vv.forEach((v, i) => {
    const L = glIniz(v.termine);
    if (L !== l0) { h += `<div class="gllet" data-l="${L}">${L}</div>`; l0 = L; }
    h += `<div class="glv${v === GL.cur ? ' on' : ''}" data-i="${d.voci.indexOf(v)}">${v.importante ? '<span class="st">★</span>' : ''}${esc(v.termine)}<small>${esc(v.lezioni.join(' '))}</small></div>`;
  });
  $('glLista').innerHTML = h || `<div class="hint" style="padding:10px">${esc(t('gl.niente'))}</div>`;
  $('glLista').querySelectorAll('.glv').forEach(x => x.onclick = () => { GL.cur = d.voci[+x.dataset.i]; disegnaGlossario(); });
  const ci = new Set(vv.map(v => glIniz(v.termine)));
  $('glAz').innerHTML = [...new Set([...'ABCDEFGHILMNOPQRSTUVZ', ...ci])].sort().map(c => `<span data-l="${c}" class="${ci.has(c) ? '' : 'no'}${GL.cur && glIniz(GL.cur.termine) === c ? ' on' : ''}">${c}</span>`).join('');
  $('glAz').querySelectorAll('span:not(.no)').forEach(x => x.onclick = () => { const e = $('glLista').querySelector(`.gllet[data-l="${x.dataset.l}"]`); if (e) e.scrollIntoView({block: 'start', behavior: 'smooth'}); });
  glScheda();
}
function glScheda() {
  const v = GL.cur, box = $('glScheda');
  if (!v) { box.innerHTML = ''; return; }
  const dv = v.dove, rip = GL.d.ripassa.includes(v.termine);
  box.innerHTML = `<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h3>${esc(v.termine)} ${v.importante ? `<span class="pill p-warn">${esc(t('gl.importante'))}</span>` : ''}</h3>
      <div class="row" style="gap:6px"><button class="btn b-ghost b-sm" id="glAsc">${esc(t('gl.ascolta'))}</button><button class="btn b-ghost b-sm${rip ? ' on' : ''}" id="glDr">${esc(t(rip ? 'gl.darip.on' : 'gl.darip'))}</button></div></div>
    ${v.uguali.length ? `<div class="ugu">${esc(t('gl.ugu', {u: v.uguali.join(', ')}))}</div>` : ''}
    <div class="def" id="glDef">${esc(v.definizione)}</div>
    <div class="glimg${dv && dv.slide ? '' : ' solo'}">
      ${dv && dv.slide ? `<div class="glslide"><img src="${dv.slide}" alt=""><div>${esc(t('gl.slide', {n: dv.slide_n, l: dv.lezione}))}</div></div>` : ''}
      <div>${dv ? `<div class="lbl">${esc(t('gl.prof'))}</div><div class="glprof"><i>«${esc(dv.frase)}»</i>${dv.media ? `<div><button class="gltag" id="glSenti">${esc(t('gl.senti', {l: dv.lezione, m: glMin(dv.sec)}))}</button></div>` : ''}</div>` : `<div class="hint">${esc(t('gl.nodove'))}</div>`}
        ${v.collegate.length ? `<div class="lbl" style="margin-top:14px">${esc(t('gl.coll'))}</div><div class="glrel">${v.collegate.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}</div>
    </div>`;
  silabizza($('glDef'));
  lbRif($('glDef'), GL.m.m, v.termine + ' ' + v.definizione);
  $('glAsc').onclick = () => voceParla(v.termine + '. ' + v.definizione);
  $('glDr').onclick = async () => { const r = await A.glossario_ripassa(GL.m.m, v.termine, !rip); if (r.ok) { GL.d.ripassa = r.ripassa; glScheda(); } };
  box.querySelectorAll('.glrel span').forEach(x => x.onclick = () => { const y = GL.d.voci.find(z => rgNorm(z.termine) === rgNorm(x.textContent)); if (y) { GL.cur = y; GL.q = ''; if ($('glCerca')) $('glCerca').value = ''; disegnaGlossario(); } });
  if ($('glSenti')) $('glSenti').onclick = () => {
    const b = $('glSenti');
    if (GL.au && !GL.au.paused) { GL.au.pause(); return; }
    voceFerma();
    if (!GL.au || GL.au.dataset_src !== dv.media) { if (GL.au) GL.au.pause(); GL.au = new Audio(dv.media); GL.au.dataset_src = dv.media; }
    const au = GL.au, fine = dv.fine + 1.5;
    au.currentTime = Math.max(0, dv.sec - 0.5);
    au.ontimeupdate = () => { if (au.currentTime >= fine) au.pause(); };
    au.onplay = () => { b.textContent = t('gl.ferma'); };
    au.onpause = au.onended = () => { if ($('glSenti')) $('glSenti').textContent = t('gl.senti', {l: dv.lezione, m: glMin(dv.sec)}); };
    au.play().catch(() => {});
  };
}
function glRipassa() {
  const d = GL.d; if (!d) return;
  let vv = d.voci.filter(v => d.ripassa.includes(v.termine));
  if (!vv.length) vv = glFiltrate();
  const carte = vv.map((v, i) => ({id: 'gl' + i, cartella: '', lezione: GL.m.m, formato: 'cornell', domanda: t('gl.q', {t: v.termine}), stelle: 0,
    schema: [v.definizione], parole: [], errore: '', aggiunte: [], avvisi: [], dove: '', slide_n: v.dove && v.dove.slide ? v.dove.slide_n : 0, minuto: null,
    img: v.dove && v.dove.slide ? v.dove.slide : ''})).sort(() => Math.random() - .5);
  if (!carte.length) return;
  RP = {carte, i: 0, ok: 0, no: [], titolo: t('gl.nome'), cartelle: [], glossario: true};
  $('rpH2').textContent = t('rp.h', {m: GL.m.m});
  mostraRip('rpCarte'); vai('rip'); cartaRip();
}
function collegaGlossario() {
  $('glPdf').onclick = async () => { const r = await A.glossario_pdf(GL.m.m); if (!r.ok) dialogo({titolo: t('gl.nome'), testo: r.msg || ''}); };
  $('glRip').onclick = glRipassa;
}
/* ------------------------------------------------------------------ come leggo meglio */
// Carattere, grandezza, spazio, sfondo, sillabe colorate e righello per la Modalita' DSA (R.lettura, salvato in cfg).
const LM_FONT = {lexend: '"Lexend",Verdana,sans-serif', atkinson: '"Atkinson Hyperlegible",Verdana,sans-serif', opendyslexic: '"OpenDyslexic",Verdana,sans-serif'};
const LM_NOMI = {lexend: 'Lexend', atkinson: 'Atkinson Hyperlegible', opendyslexic: 'OpenDyslexic'};
// [sfondo del testo, colore del testo, sfondo dei riquadri, sfondo della pagina in Modalità DSA]
const LM_SF = {grigio: ['#f7f7f5', '#1d2320', '#fbfbfa', '#f1f2f0'], azzurro: ['#eef5fa', '#1f2937', '#f7fbfe', '#eaf2f7'], verde: ['#eef5ef', '#1f2937', '#f7fbf7', '#e9f2ea'], crema: ['#fdf6e3', '#1f2937', '#fffbeb', '#f6f1e4'], scuro: ['#1f2937', '#f1f5f9', '#f1f5f9', '#f1f2f0']};
const LM_INIZIO = {f: 'lexend', g: 20, s: 2, b: 'grigio', sil: false, rig: false};
const LMo = () => Object.assign({}, LM_INIZIO, (R && R.lettura) || {});
function lettura() {
  const o = LMo(), st = document.documentElement.style, sf = LM_SF[o.b] || LM_SF.grigio;
  st.setProperty('--dsa-font', LM_FONT[o.f] || LM_FONT.lexend);
  st.setProperty('--dsa-size', o.g + 'px');
  st.setProperty('--dsa-lh', [1.55, 1.95, 2.25][o.s - 1]);
  st.setProperty('--dsa-ls', ['0', '.03em', '.07em'][o.s - 1]);
  st.setProperty('--dsa-ws', ['0', '.14em', '.28em'][o.s - 1]);
  st.setProperty('--dsa-rbg', sf[0]); st.setProperty('--dsa-rfg', sf[1]); st.setProperty('--dsa-cbg', sf[2]); st.setProperty('--dsa-pbg', sf[3]);
  document.documentElement.classList.toggle('dsascuro', o.b === 'scuro');
}
const silOn = () => !!(R && R.facilitata && LMo().sil && LINGUA === 'it');
// le sillabe italiane: consonante singola con la vocale dopo, doppie divise, l/m/n/r + consonante divise,
// s + consonante con la vocale dopo, muta + liquida insieme, a/e/o vicine divise
function sillabe(w) {
  const VOC = 'aeiouàèéìíòóùú', V = ch => VOC.includes(ch.toLowerCase()), forti = 'aeoàèéòó';
  const s = [...w], out = []; let cur = '';
  for (let i = 0; i < s.length; i++) {
    cur += s[i];
    if (!V(s[i])) continue;
    const n = s[i + 1];
    if (n === undefined) break;
    if (V(n)) { if (forti.includes(s[i].toLowerCase()) && forti.includes(n.toLowerCase())) { out.push(cur); cur = ''; } continue; }
    let j = i + 1; while (j < s.length && !V(s[j])) j++;
    if (j >= s.length) continue;
    const cons = s.slice(i + 1, j).join('').toLowerCase();
    let k;
    if (cons.length === 1) k = 0;
    else if (cons[0] === cons[1] || (cons[0] === 'c' && cons[1] === 'q')) k = 1;
    else if (cons[0] === 's') k = 0;
    else if ('lmnr'.includes(cons[0])) k = 1;
    else k = 0;
    if (cons.length >= 3 && k === 0 && cons[0] !== 's' && !'lr'.includes(cons[1])) k = 1;
    cur += s.slice(i + 1, i + 1 + k).join('');
    out.push(cur); cur = ''; i += k;
  }
  if (cur) out.push(cur);
  return out;
}
function silabizza(el) {
  if (!el || !silOn()) return;
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {acceptNode: n => n.parentNode && n.parentNode.closest('.sil1,.sil2,button,script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
  const nodi = []; while (w.nextNode()) nodi.push(w.currentNode);
  nodi.forEach(n => {
    if (!/[A-Za-zÀ-ú]{4,}/.test(n.nodeValue)) return;
    const f = document.createElement('span'); f.className = 'silw';
    f.innerHTML = esc(n.nodeValue).replace(/[A-Za-zÀ-ú]+/g, x => x.length < 4 ? x : sillabe(x).map((y, i) => `<span class="sil${i % 2 + 1}">${y}</span>`).join(''));
    n.parentNode.replaceChild(f, n);
  });
}
// il righello: una striscia che segue il dito o il mouse sopra i testi da leggere
const LM_LEGGI = '.ap, .kktesto, .carta, .lmprova, #esTestBox, .rgcroc, .pz';
function righello(e) {
  const b = $('rghd'); if (!b) return;
  const p = e.touches ? e.touches[0] : e;
  const dove = R && R.facilitata && LMo().rig && p && document.elementFromPoint(p.clientX, p.clientY);
  const box = dove && dove.closest && dove.closest(LM_LEGGI);
  if (!box) { b.style.display = 'none'; return; }
  const h = Math.round(parseFloat(getComputedStyle(box).fontSize) * 2.1);
  b.style.display = 'block'; b.style.height = h + 'px'; b.style.top = Math.round(p.clientY - h / 2) + 'px';
}
document.addEventListener('mousemove', righello, {passive: true});
document.addEventListener('touchmove', righello, {passive: true});
document.addEventListener('touchstart', righello, {passive: true});
// «Aa Come leggo» nello Spazio DSA: sfondo, carattere, grandezza e spazio a portata di mano; il resto in «Come leggo meglio»
function disegnaAa() {
  const o = LMo(), pop = $('aaPop');
  const bt = (k, v, n, st) => `<button data-k="${k}" data-v="${v}" class="${String(o[k]) === String(v) ? 'on' : ''}"${st ? ` style="${st}"` : ''} title="${esc(n)}">${st && st.includes('background') ? '' : esc(n)}</button>`;
  pop.innerHTML = `<div class="l">${esc(t('lm.sf'))}</div><div class="op col">${Object.keys(LM_SF).map(k => bt('b', k, t('lm.b.' + k), `background:${LM_SF[k][k === 'scuro' ? 0 : 3]}`)).join('')}</div>
    <div class="l">${esc(t('lm.car'))}</div><div class="op">${Object.keys(LM_FONT).map(k => bt('f', k, LM_NOMI[k].replace(' Hyperlegible', ''), `font-family:${LM_FONT[k].replace(/"/g, "'")}`)).join('')}</div>
    <div class="l">${esc(t('lm.gr'))}</div><div class="op">${[[17, 13], [20, 15], [24, 17], [28, 19]].map(([g, px]) => bt('g', g, 'A', `font-size:${px}px`)).join('')}</div>
    <div class="l">${esc(t('lm.sp'))}</div><div class="op">${[1, 2, 3].map(s => bt('s', s, t('lm.sp' + s))).join('')}</div>
    <div class="giu"><button id="aaTutte">${esc(t('aa.tutte'))}</button><button id="aaInizio">${esc(t('aa.inizio'))}</button></div>`;
  const salva = async x => { R.lettura = {...LMo(), ...x}; lettura(); disegnaAa(); await A.imposta('lettura', R.lettura); };
  pop.querySelectorAll('[data-k]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.k; salva({[k]: k === 'g' || k === 's' ? +b.dataset.v : b.dataset.v}); });
  $('aaTutte').onclick = () => { aaChiudi(); vai('lm'); };
  $('aaInizio').onclick = e => { e.stopPropagation(); salva({...LM_INIZIO}); };
}
function aaChiudi() { $('aaPop').classList.add('hidden'); $('aaB').setAttribute('aria-expanded', 'false'); }
function collegaAa() {
  $('aaB').onclick = e => { e.stopPropagation(); const ap = $('aaPop').classList.contains('hidden'); if (ap) disegnaAa(); $('aaPop').classList.toggle('hidden', !ap); $('aaB').setAttribute('aria-expanded', ap); };
  $('aaPop').onclick = e => e.stopPropagation();
  document.addEventListener('click', () => { if (!$('aaPop').classList.contains('hidden')) aaChiudi(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('aaPop').classList.contains('hidden')) aaChiudi(); });
}
function disegnaLM() {
  const o = LMo();
  const seg = (id, vals, cur) => `<div class="seg" id="${id}">${vals.map(([v, n, st]) => `<span data-v="${v}" class="${v === cur ? 'on' : ''}"${st ? ` style="${st}"` : ''}>${esc(n)}</span>`).join('')}</div>`;
  $('lmBox').innerHTML = (R.facilitata ? '' : `<div class="avviso" style="margin-bottom:10px">${esc(t('lm.off'))}</div>`) +
    `<div class="lmset"><b>${esc(t('lm.car'))}</b><div class="lmfonti">${Object.keys(LM_FONT).map(k => `<button class="lmfonte${k === o.f ? ' on' : ''}" data-f="${k}" style="font-family:${esc(LM_FONT[k])}">${LM_NOMI[k]}<small>${esc(t('lm.f.' + k))}</small></button>`).join('')}</div></div>
    <div class="lmset"><b>${esc(t('lm.gr'))}</b>${seg('lmG', [[17, 'A'], [20, 'A', 'font-size:15px'], [24, 'A', 'font-size:18px'], [28, 'A', 'font-size:21px']], o.g)}</div>
    <div class="lmset"><b>${esc(t('lm.sp'))}</b>${seg('lmS', [[1, t('lm.sp1')], [2, t('lm.sp2')], [3, t('lm.sp3')]], o.s)}</div>
    <div class="lmset"><b>${esc(t('lm.sf'))}</b><div class="lmsfondi">${Object.keys(LM_SF).map(k => `<div class="lmsf${k === o.b ? ' on' : ''}" data-b="${k}" style="background:${LM_SF[k][0]};color:${LM_SF[k][1]}">${esc(t('lm.b.' + k))}</div>`).join('')}</div><div class="hint">${esc(t('lm.sf.s'))}</div></div>
    <div class="lmset"><div class="lmriga"><div><b>${esc(t('lm.sil'))}</b><small>${esc(t('lm.sil.s'))}</small></div><div class="sw${o.sil ? ' on' : ''}" id="lmSil"></div></div></div>
    <div class="lmset"><div class="lmriga"><div><b>${esc(t('lm.rig'))}</b><small>${esc(t('lm.rig.s'))}</small></div><div class="sw${o.rig ? ' on' : ''}" id="lmRig"></div></div></div>`;
  $('lmProva').innerHTML = `<h3>${esc(t('lm.prova.t'))}</h3><p>${esc(t('lm.prova1'))}</p><p>${esc(t('lm.prova2'))}</p>`;
  silabizza($('lmProva'));
  const salva = async x => { R.lettura = {...LMo(), ...x}; lettura(); disegnaLM(); await A.imposta('lettura', R.lettura); };
  $('lmBox').querySelectorAll('[data-f]').forEach(b => b.onclick = () => salva({f: b.dataset.f}));
  $('lmBox').querySelectorAll('[data-b]').forEach(b => b.onclick = () => salva({b: b.dataset.b}));
  $('lmG').querySelectorAll('span').forEach(b => b.onclick = () => salva({g: +b.dataset.v}));
  $('lmS').querySelectorAll('span').forEach(b => b.onclick = () => salva({s: +b.dataset.v}));
  $('lmSil').onclick = () => salva({sil: !o.sil});
  $('lmRig').onclick = () => salva({rig: !o.rig});
}
/* ------------------------------------------------------------------ sincronizza */
// Il PC fa da centro; il telefono (o un altro PC) si collega una volta con un codice di 6 cifre e poi si
// sincronizza da solo quando sono sulla stessa rete Wi-Fi (sincronizza.py).
var SY = {d: null, poll: null, modo: '', msg: '', fatto: ''};
function syFa(iso) {
  if (!iso) return t('sy.mai');
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return t('sy.ora');
  if (m < 60) return t('sy.min', {n: m});
  if (m < 60 * 24) return t('sy.ore', {n: Math.round(m / 60)});
  return t('sy.giorni', {n: Math.round(m / 1440)});
}
function footSync() {
  const y = S.sync, f = $('footSync');
  f.classList.toggle('hidden', !y);
  if (!y) return;
  const h = y.in_corso ? '🔄 ' + esc(t('sy.incorso')) : y.errore && y.client ? '🔄 ' + esc(t('sy.lontano')) : '🔄 ' + esc(t('sy.fatto', {q: syFa(y.ultimo)}));
  if (f.innerHTML !== h) f.innerHTML = h;
}
function apriSY() {
  SY.modo = ''; SY.msg = ''; SY.fatto = '';
  disegnaSY(true);
  if (!SY.poll) SY.poll = setInterval(() => disegnaSY(false), 2000);
}
function syChiudi() {
  clearInterval(SY.poll); SY.poll = null;
  if (SY.modo === 'codice') A.sync_annulla_codice();
  SY.modo = '';
}
async function disegnaSY(tutto) {
  const r = SY.d = await A.sync_stato();
  if (pagina !== 'sy') return;
  if (r.evento && r.evento.tipo === 'abbinato') { SY.modo = ''; SY.fatto = r.evento.nome; tutto = true; }
  if (SY.modo === 'codice' && !r.codice) { SY.modo = ''; tutto = true; }
  if (!tutto) {     // ogni 2 secondi: solo lo stato e il tempo del codice (senza toccare quello che si sta scrivendo)
    if ($('syStato')) $('syStato').innerHTML = syStato(r);
    if ($('syDisp')) $('syDisp').innerHTML = syDispositivi(r);
    if ($('syScade')) $('syScade').textContent = t('sy.scade', {n: Math.max(1, Math.ceil(r.codice_sec / 60))});
    syBottoniDisp();
    disegnaNV();
    return;
  }
  const box = $('syBox');
  const fatto = SY.fatto ? `<div class="syok" style="margin-bottom:14px">✓ ${esc(t('sy.collegati', {a: r.nome, b: SY.fatto}))}</div>` : '';
  const rete = `<div class="card mt"><div class="lbl">${esc(t('sy.nontrova.l'))}</div><div class="hint">${t('sy.nontrova')}${ANDROID ? '' : '<br><br>' + t('sy.firewall')}</div></div>`;
  if (SY.modo === 'codice') {
    box.innerHTML = `<div class="card" style="text-align:center"><div class="lbl" style="text-align:left">💻 ${esc(t('sy.questopc', {n: r.nome}))}</div>
      <div class="syqr">${syQr(r)}</div>
      <div class="sycod">${esc(r.codice.slice(0, 3) + ' ' + r.codice.slice(3))}</div>
      <div class="hint">${esc(t('sy.scrivilo'))}</div><div class="hint" id="syScade">${esc(t('sy.scade', {n: Math.max(1, Math.ceil(r.codice_sec / 60))}))}</div>
      <div class="row mt" style="gap:10px;justify-content:center;color:var(--mut)"><span class="spin"></span>${esc(t('sy.aspetto'))}</div>
      <div class="row mt" style="justify-content:center"><button class="btn b-ghost b-sm" id="syAnn">${esc(t('annulla'))}</button></div></div>` + rete;
    $('syAnn').onclick = () => { A.sync_annulla_codice(); SY.modo = ''; disegnaSY(true); };
    return;
  }
  if (SY.modo === 'collega') {
    box.innerHTML = `<div class="card" style="text-align:center"><div class="lbl" style="text-align:left">🔄 ${esc(t('sy.collegati.t'))}</div>
      ${QRTEL() ? `<button class="btn b-main" id="syQr" style="width:100%;max-width:320px">📷 ${esc(t('sy.qr'))}</button><div class="hint mt">${esc(t('sy.oppure'))}</div>` : `<div class="hint">${esc(t('sy.scrivi'))}</div>`}
      <input class="in syin" id="syCod" inputmode="numeric" autocomplete="off" maxlength="7" placeholder="000 000">
      <div class="row mt" style="gap:8px;justify-content:center"><button class="btn b-main b-sm" id="syVai">${esc(t('sy.collega'))}</button><button class="btn b-ghost b-sm" id="syAnn">${esc(t('annulla'))}</button></div>
      <div id="syMsg" class="mt"></div></div>` + rete;
    const vai_ = async () => {
      const b = $('syVai'); b.disabled = true;
      $('syMsg').innerHTML = `<div class="row" style="gap:10px;justify-content:center;color:var(--mut)"><span class="spin"></span>${esc(t('sy.cerco'))}</div>`;
      const x = await A.sync_collega($('syCod').value);
      b.disabled = false;
      if (x.ok) { SY.modo = ''; SY.fatto = x.nome; disegnaSY(true); }
      else $('syMsg').innerHTML = `<div class="avviso">${esc(x.msg)}</div>`;
    };
    $('syVai').onclick = vai_;
    if ($('syQr')) $('syQr').onclick = async () => {
      $('syMsg').innerHTML = '';
      const x = await A.sync_qr();
      if (x.ok) { SY.modo = ''; SY.fatto = x.nome; disegnaSY(true); }
      else if (!x.annullato) $('syMsg').innerHTML = `<div class="avviso">${esc(x.msg || '')}</div>`;
    };
    $('syCod').onkeydown = e => { if (e.key === 'Enter') vai_(); };
    $('syAnn').onclick = () => { SY.modo = ''; disegnaSY(true); };
    setTimeout(() => $('syCod') && $('syCod').focus(), 50);
    return;
  }
  const bott = ANDROID ? `<button class="btn b-main b-sm" id="syColl">📱 ${esc(t('sy.collegati.t'))}</button>`
    : `<button class="btn b-main b-sm" id="syCodice">💻 ${esc(t('sy.colltel'))}</button><button class="btn b-ghost b-sm" id="syColl">${esc(t('sy.collpc'))}</button>`;
  if (!r.dispositivi.length) {
    box.innerHTML = fatto + `<div class="card"><div class="lbl">${esc(t('sy.una'))}</div>
      <div class="sypasso"><span class="n">1</span><div><b>${esc(t('sy.p1'))}</b><span>${esc(t('sy.p1s'))}</span></div></div>
      <div class="sypasso"><span class="n">2</span><div><b>${esc(t('sy.p2'))}</b><span>${esc(t('sy.p2s'))}</span></div></div>
      <div class="sypasso"><span class="n">3</span><div><b>${esc(t('sy.p3'))}</b><span>${esc(t('sy.p3s'))}</span></div></div>
      <div class="row mt" style="gap:8px;flex-wrap:wrap">${bott}</div></div>` + NV_BOX + rete;
  } else {
    const o = r.opzioni;
    const ck = (k, s) => `<label class="syck"><input type="checkbox" data-o="${k}"${o[k] ? ' checked' : ''}><span>${esc(t('sy.o.' + k))}<small>${esc(t('sy.o.' + k + '.s'))}</small></span></label>`;
    box.innerHTML = fatto + `<div class="sygrid"><div class="card"><div class="lbl">${esc(t('sy.disp'))}</div>
      <div id="syDisp">${syDispositivi(r)}</div>
      <div id="syStato" class="mt">${syStato(r)}</div>
      <div class="row mt" style="gap:8px;flex-wrap:wrap">${r.dispositivi.some(d => d.ruolo === 'centro') ? `<button class="btn b-main b-sm" id="syOra">🔄 ${esc(t('sy.adesso'))}</button>` : ''}
        <button class="btn b-ghost b-sm" id="${ANDROID ? 'syColl' : 'syCodice'}">+ ${esc(t('sy.altro'))}</button></div>
      <div class="hint mt">${esc(t(ANDROID ? 'sy.nota.tel' : 'sy.nota.pc'))}</div></div>
      <div class="card"><div class="lbl">${esc(t('sy.cosa'))}</div>${['lezioni', 'studio', 'materie', 'libro', 'video'].map(k => ck(k)).join('')}
      <div class="hint mt">${esc(t('sy.unisce'))}</div></div></div>` + NV_BOX + rete;
    box.querySelectorAll('[data-o]').forEach(c => c.onchange = () => A.sync_opzione(c.dataset.o, c.checked));
    if ($('syOra')) $('syOra').onclick = async () => { await A.sync_adesso(); setTimeout(() => disegnaSY(false), 300); };
    syBottoniDisp();
  }
  disegnaNV();
  if ($('syCodice')) $('syCodice').onclick = async () => {
    const x = await A.sync_codice();
    if (!x.ok) { dialogo({titolo: t('sy.nome'), testo: x.msg}); return; }
    SY.modo = 'codice'; SY.fatto = ''; disegnaSY(true);
  };
  if ($('syColl')) $('syColl').onclick = () => { SY.modo = 'collega'; SY.fatto = ''; disegnaSY(true); };
}
// il telefono legge il QR con il lettore di Google (app nuova, codice 13); il QR porta codice e indirizzi del PC
const QRTEL = () => ANDROID && (R.app_codice || 0) >= 13;
function syQr(r) {
  try {
    const q = qrcode(0, 'M');
    q.addData(`vmia:${r.codice}@${(r.ip || []).join(',')}`);
    q.make();
    return q.createSvgTag({cellSize: 6, margin: 2, scalable: true});
  } catch (e) { return ''; }
}
/* «anche fuori casa»: il cloud con gli zip chiusi da password (nuvola.py) */
const NV_BOX = '<div class="card mt" id="nvBox"></div>';
var NV = {p: 'google', d: null, h: ''};
async function disegnaNV() {
  const box = $('nvBox');
  if (!box) return;
  if (document.activeElement && document.activeElement.id === 'nvChiave') return;
  const r = NV.d = await A.nuvola_stato();
  const nomeP = p => p === 'microsoft' ? 'OneDrive' : 'Google Drive';
  let h = `<div class="lbl">☁️ ${esc(t('nv.lbl'))}</div>`;
  const coll = `<div class="syok">✓ ${esc(t('nv.collegato', {p: nomeP(r.provider), e: r.email || ''}))}</div>`;
  if (r.accesso === 'in_corso') {
    h += `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('nv.browser'))}</div>`;
  } else if (r.manca_chiave) {
    h += coll + `<div class="hint mt">${esc(t('nv.manca'))}</div>
      <input class="in sm mt" id="nvChiave" autocomplete="off" placeholder="XXXX-XXXX-XXXX-XXXX" style="max-width:320px;font-family:ui-monospace,Consolas,monospace;letter-spacing:2px">
      <div class="row mt" style="gap:8px"><button class="btn b-main b-sm" id="nvOk">${esc(t('nv.ok'))}</button><button class="btn b-ghost b-sm" id="nvVia">${esc(t('nv.scollega'))}</button></div><div id="nvMsg" class="mt"></div>`;
  } else if (r.attiva) {
    const g = r.giro;
    const stato = r.in_corso ? `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('nv.incorso'))} ${Math.round((r.fase || 0) * 100)}%</div>`
      : r.errore === 'accesso' ? `<div class="avviso">${esc(t('nv.err.accesso'))}</div>`
      : r.errore === 'chiave' ? `<div class="avviso">${esc(t('nv.err.chiave'))}</div>`
      : r.errore === 'dati' ? `<div class="hint">${esc(t('nv.err.dati'))}</div>`
      : r.errore === 'spazio' ? `<div class="avviso">${esc(t('nv.err.spazio'))}</div>`
      : r.errore === 'api' ? `<div class="avviso">${esc(t('nv.err.api'))}</div>`
      : r.errore ? `<div class="avviso">${esc(t('nv.err.rete'))}</div>`
      : r.ultimo ? `<div class="hint">☁️ ${esc(t('nv.fatto', {q: syFa(r.ultimo)}))}${g && (g.su || g.giu) ? ' · ' + esc(t('nv.ultimo', {s: g.su, g: g.giu})) : ''}</div>`
      : `<div class="hint">${esc(t('nv.primo'))}</div>`;
    h += coll + `<div class="mt">${stato}</div>
      <div class="lbl mt">🔑 ${esc(t('nv.chiave'))}</div><div class="nvchiave">${esc(r.chiave)}</div>
      <div class="hint mt">${esc(t('nv.chiave.s'))}</div>
      ${ANDROID ? `<label class="syck mt"><input type="checkbox" id="nvWifi"${r.solo_wifi ? ' checked' : ''}><span>${esc(t('nv.wifi'))}<small>${esc(t('nv.wifi.s'))}</small></span></label>` : ''}
      <div class="row mt" style="gap:8px;flex-wrap:wrap">${r.errore === 'accesso' ? `<button class="btn b-main b-sm" id="nvAcc">${esc(t('nv.riaccedi'))}</button>` : `<button class="btn b-main b-sm" id="nvOra">☁️ ${esc(t('nv.adesso'))}</button>`}
        <button class="btn b-ghost b-sm b-red" id="nvVia">${esc(t('nv.scollega'))}</button></div>`;
    if (r.provider) NV.p = r.provider;
  } else {
    const disp = r.disponibili[NV.p];
    h += `<div class="hint">${t('nv.spiega')}</div><div class="lbl mt">${esc(t('nv.quale'))}</div>
      <div class="nvscel"><label><input type="radio" name="nvp" value="google"${NV.p === 'google' ? ' checked' : ''}>Google Drive<small>${esc(t('nv.g.s'))}</small></label>
      <label><input type="radio" name="nvp" value="microsoft"${NV.p === 'microsoft' ? ' checked' : ''}>OneDrive<small>${esc(t('nv.m.s'))}</small></label></div>
      <div class="row mt" style="gap:8px"><button class="btn b-main b-sm" id="nvAcc"${disp ? '' : ' disabled'}>${esc(t(NV.p === 'microsoft' ? 'nv.acc.m' : 'nv.acc.g'))}</button></div>
      ${disp ? '' : `<div class="hint mt">${esc(t('nv.presto'))}</div>`}
      ${String(r.accesso).startsWith('errore') ? `<div class="avviso mt">${esc(t({'errore:annullato': 'nv.err.annullato', 'errore:tempo': 'nv.err.tempo', 'errore:api': 'nv.err.api', 'errore:accesso': 'nv.err.permesso'}[r.accesso] || 'nv.err.accrete'))}${r.dettaglio ? `<div class="hint" style="margin-top:4px">${esc(r.dettaglio)}</div>` : ''}</div>` : ''}
      <div class="hint mt">${esc(t('nv.contro'))}</div>`;
  }
  if (h === NV.h) return;
  NV.h = h;
  box.innerHTML = h;
  box.querySelectorAll('[name=nvp]').forEach(x => x.onchange = () => { NV.p = x.value; NV.h = ''; disegnaNV(); });
  if ($('nvAcc')) $('nvAcc').onclick = async () => {
    const x = await A.nuvola_accedi(r.attiva || r.errore === 'accesso' ? r.provider : NV.p);
    if (!x.ok) dialogo({titolo: t('nv.lbl'), testo: x.msg}); else { NV.h = ''; disegnaNV(); }
  };
  if ($('nvOra')) $('nvOra').onclick = async () => { await A.nuvola_adesso(); setTimeout(() => { NV.h = ''; disegnaNV(); }, 400); };
  if ($('nvWifi')) $('nvWifi').onchange = () => A.nuvola_opzione('solo_wifi', $('nvWifi').checked);
  if ($('nvVia')) $('nvVia').onclick = async () => {
    if (!await conferma(t('nv.scollega'), t('nv.scollega.d'), t('nv.scollega'), t('annulla'), 'b-end')) return;
    await A.nuvola_scollega(); NV.h = ''; disegnaNV();
  };
  if ($('nvOk')) $('nvOk').onclick = async () => {
    $('nvMsg').innerHTML = `<span class="spin"></span>`;
    const x = await A.nuvola_chiave($('nvChiave').value);
    if (x.ok) { NV.h = ''; $('nvChiave').blur(); disegnaNV(); } else $('nvMsg').innerHTML = `<div class="avviso">${esc(x.msg)}</div>`;
  };
}
function syDispositivi(r) {
  return r.dispositivi.map(d => `<div class="sydisp"><span class="ic">${d.ruolo === 'centro' ? '💻' : '📱'}</span><div class="sp"><b>${esc(d.nome)}</b>
    <small>${esc(d.ultimo ? t('sy.fatto', {q: syFa(d.ultimo)}) : t('sy.ancora'))}</small></div>
    <button class="btn b-ghost b-sm b-red" data-sc="${esc(d.id)}" data-n="${esc(d.nome)}">${esc(t('sy.scollega'))}</button></div>`).join('');
}
function syBottoniDisp() {
  document.querySelectorAll('#syDisp [data-sc]').forEach(b => b.onclick = async () => {
    if (!await conferma(t('sy.scollega'), t('sy.scollega.d', {n: b.dataset.n}), t('sy.scollega'), t('annulla'), 'b-end')) return;
    await A.sync_scollega(b.dataset.sc); disegnaSY(true);
  });
}
function syStato(r) {
  if (r.in_corso) return `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('sy.incorso'))} ${Math.round((r.fase || 0) * 100)}%</div>`;
  const client = r.dispositivi.some(d => d.ruolo === 'centro');
  if (client && r.errore === 'non_trovato') return `<div class="avviso">${esc(t('sy.err.lontano'))}</div>`;
  if (client && r.errore) return `<div class="avviso">${esc(t('sy.err.rete'))}</div>`;
  const ult = r.dispositivi.reduce((a, d) => (d.ultimo || '') > a ? d.ultimo : a, '');
  if (!ult) return `<div class="hint">${esc(t(client ? 'sy.attesa.c' : 'sy.attesa.s'))}</div>`;
  const g = r.giro;
  const det = g && (g.arrivati || g.mandati || g.uniti) ? `<div class="hint mt">${esc(t('sy.ultimo', {a: g.arrivati, m: g.mandati, u: g.uniti}))}</div>` : '';
  return `<div class="syok">🔄 ${esc(t('sy.fatto', {q: syFa(ult)}))}</div>` + det;
}
/* ------------------------------------------------------------------ ripasso del giorno */
// Poche carte ogni giorno fra tutte le lezioni (ripasso_giorno.py). Si ripassa nella pagina delle flashcard (v-rip)
// con quattro modalita': carte, a voce (parole chiave dette), a crocette (risposte sbagliate nuove ogni settimana), lampo.
var RG = {d: null};
const RG_GIORNI = [1, 2, 4, 8, 16, 30];
const rgDopo = c => RG_GIORNI[Math.min(5, (c.box == null ? 0 : c.box) + 1)];
function apriRipassoGiorno() { vai('rg'); disegnaRG(); }
async function disegnaRG() {
  const box = $('rgBox');
  box.innerHTML = `<div class="card"><div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('rg.lav'))}</div></div>`;
  const r = await A.ripasso_giorno(false, false);
  if (pagina !== 'rg') return;
  if (!r.ok) { box.innerHTML = `<div class="card"><div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div></div>`; return; }
  RG.d = r;
  if (!r.totale) { box.innerHTML = `<div class="card"><div class="hint">${esc(t('rg.vuoto'))}</div></div>`; return; }
  const modo = R.rg_modo || 'carte', n = r.carte.length;
  const serie = r.serie ? `<div class="rgserie">${esc(r.serie === 1 ? t('rg.serie1') : t('rg.serie', {n: r.serie}))}<small>${esc(t('rg.serie.s'))}</small></div>` : '';
  const righe = r.lezioni.map(l => {
    const pill = l.rivedere ? `<span class="pill p-red">${esc(t('rg.p.riv', {n: l.rivedere}))}</span>` : l.esame ? `<span class="pill p-warn">${esc(t('rg.p.esame'))}</span>` : l.nuove ? `<span class="pill p-blue">${esc(t('rg.p.nuove'))}</span>` : '';
    return `<div class="rgcr">${l.materia ? `<span class="mtag">${esc(l.materia)}</span>` : ''}<div class="sp"><b>${esc(mvSenzaMateria(l.lezione, l.materia))}</b><span>${esc(l.argomenti.join(' · '))}</span></div><span class="nc">${esc(l.n === 1 ? t('rg.ncarta') : t('rg.ncarte', {n: l.n}))}</span>${pill}</div>`;
  }).join('');
  const modi = ['carte', 'voce', 'croc', 'lampo'].map(k => `<div class="aiopt${k === modo ? ' on' : ''}" data-m="${k}"><span class="rd"></span><span class="ico i-blue">${{carte: '🃏', voce: '🎙', croc: '☑', lampo: '⚡'}[k]}</span><b>${esc(t('rg.m.' + k))}</b><small>${esc(t('rg.m.' + k + '.s'))}</small></div>`).join('');
  const oggi = n ? `<div class="rgoggi"><div class="gr">${n}</div><div class="tx"><b>${esc(t(n === 1 ? 'rg.carta' : 'rg.carte'))}</b><span>${esc(t(r.minuti === 1 ? 'rg.min1' : 'rg.min', {m: r.minuti}))}</span></div>${serie}</div>
      <div class="lbl" style="margin-top:16px">${esc(t('rg.oggi'))}</div><div class="rgcosa">${righe}</div>
      <div class="lbl" style="margin-top:16px">${esc(t('rg.come'))}</div><div class="rgmodi" id="rgModi">${modi}</div>
      <div class="row mt"><span class="hint sp" id="rgModoH">${esc(t('rg.h.' + modo))}</span><button class="btn b-main" id="rgVia">${esc(t('rg.via'))}</button></div>`
    : `<div class="rgoggi"><div class="tx"><b>${esc(t('rg.finito'))}</b><span>${esc(t('rg.finito.s'))}</span></div>${serie}</div>`;
  const gg = d => { const x = new Date(d + 'T12:00:00'); return x.toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {weekday: 'short'}); };
  const mat = r.materie.map(m => `<div class="rgmat"><div><b>${esc(m.materia)}</b><span class="hint">${m.giorni == null ? esc(t('rg.nodata', {n: m.carte})) + ` · <a class="lnk" data-dm="${esc(m.materia)}">${esc(t('rg.data'))}</a>` : esc(t(m.giorni === 0 ? 'rg.esame0' : m.giorni === 1 ? 'rg.esame1' : 'rg.esame', {g: m.giorni, n: m.carte}))}</span></div>
      <div class="barw"><div class="hint">${esc(t('rg.pronto', {p: m.pronto}))}</div><div class="bar"><i style="width:${m.pronto}%"></i></div></div><div class="n">${esc(t('rg.noggi', {n: m.oggi}))}</div></div>`).join('');
  const sett = r.prossimi.map((g, i) => `<div class="${i ? '' : 'oggi'}">${esc(i ? gg(g.giorno) : t('rg.oggi.g'))}<b>${g.n}</b></div>`).join('');
  box.innerHTML = `<div class="card">${oggi}</div>
    <div class="card mt"><div class="lbl">${esc(t('rg.materie'))}</div>${mat}</div>
    <div class="card mt"><div class="lbl">${esc(t('rg.prossimi'))}</div><div class="rgsett">${sett}</div><div class="hint mt">${esc(t('rg.spiega'))}</div></div>
    <div class="card mt"><div class="lbl">${esc(t('rg.imp'))}</div>
      <div class="set"><div class="t"><b>${esc(t('rg.max'))}</b><span>${esc(t('rg.max.s'))}</span></div><div class="seg" id="rgMax">${[10, 20, 30].map(v => `<span data-v="${v}" class="${v === (R.rg_max || 20) ? 'on' : ''}">${v}</span>`).join('')}</div></div>
      <div class="set solo-and"><div class="t"><b>${esc(t('rg.prom'))}</b><span>${esc(t('rg.prom.s'))}</span></div><input type="time" class="in sm" id="rgOra" value="${esc(R.rg_ora || '18:00')}" style="width:auto"><div class="sw${R.rg_promemoria ? ' on' : ''}" id="rgProm"></div></div>
    </div>`;
  if ($('rgModi')) $('rgModi').querySelectorAll('.aiopt').forEach(o => o.onclick = async () => {
    $('rgModi').querySelectorAll('.aiopt').forEach(x => x.classList.toggle('on', x === o));
    R.rg_modo = o.dataset.m; $('rgModoH').textContent = t('rg.h.' + o.dataset.m); await A.imposta('rg_modo', o.dataset.m);
  });
  if ($('rgVia')) $('rgVia').onclick = () => iniziaRipassoGiorno(R.rg_modo || 'carte');
  box.querySelectorAll('[data-dm]').forEach(a => a.onclick = () => { const m = materieStudia().find(x => x.m.toLowerCase() === a.dataset.dm.toLowerCase()); if (m) tileStudia(m, 'piano'); });
  $('rgMax').querySelectorAll('span').forEach(x => x.onclick = async () => { R.rg_max = +x.dataset.v; await A.imposta('rg_max', R.rg_max); disegnaRG(); });
  $('rgProm').onclick = async () => { R.rg_promemoria = !R.rg_promemoria; $('rgProm').classList.toggle('on', R.rg_promemoria); await A.imposta('rg_promemoria', R.rg_promemoria); };
  $('rgOra').onchange = async () => { R.rg_ora = $('rgOra').value || '18:00'; await A.imposta('rg_ora', R.rg_ora); };
}
async function iniziaRipassoGiorno(modo) {
  let carte = RG.d.carte;
  if (modo === 'lampo') { const r = await A.ripasso_giorno(true, false); if (r.ok) carte = r.carte; }
  if (!carte.length) return;
  if (modo === 'croc') {
    $('rgVia').disabled = true; $('rgModoH').innerHTML = `<span class="spin" style="width:13px;height:13px;vertical-align:-2px"></span> ${esc(t('rg.croc.lav'))}`;
    const r = await A.ripasso_giorno_crocette(carte.map(c => ({id: c.id, cartella: c.cartella, domanda: c.domanda, schema: c.schema})));
    if ($('rgVia')) $('rgVia').disabled = false;
    if (!r.ok) { if ($('rgModoH')) $('rgModoH').textContent = t('rg.h.croc'); await dialogo({titolo: t('rg.h'), testo: r.msg || ''}); return; }
    const per = Object.fromEntries(r.carte.map(x => [x.id, x]));
    carte = carte.map(c => ({...c, opzioni: (per[c.id] || {}).opzioni, giusta: (per[c.id] || {}).giusta}));
  }
  segnaUso('flashcard');
  RP = {carte, i: 0, ok: 0, no: [], titolo: t('rg.m.' + modo), cartelle: [], giorno: true, modo};
  $('rpH2').textContent = t('rg.h2');
  mostraRip('rpCarte'); vai('rip'); cartaRip();
}
// la parte del ripasso del giorno di ogni carta (chiamata da cartaRip)
function cartaGiorno(c) {
  const g = !!RP.giorno, croc = g && RP.modo === 'croc' && c.opzioni && c.opzioni.length === 4, voce = g && RP.modo === 'voce';
  $('rpAdesso').classList.toggle('hidden', !g);
  if (g) $('rpAdesso').innerHTML = `${c.materia ? `<span class="mtag">${esc(c.materia)}</span>` : ''}<b>${esc(mvSenzaMateria(c.lezione, c.materia || ''))}</b>${c.argomento ? `<span class="hint">· ${esc(t('rg.arg', {a: c.argomento}))}</span>` : ''}`;
  $('rpCroc').classList.toggle('hidden', !croc); $('rpVoce').classList.toggle('hidden', !voce);
  $('voto').style.display = croc ? 'none' : '';
  const dopo = rgDopo(c);
  $('rpQuando').textContent = g && !croc ? t(dopo === 2 ? 'rg.quando1' : 'rg.quando', {g: dopo}) : '';
  RP.risposto = false; RP.ascolto = false;
  if (croc) {
    $('rpCroc').innerHTML = c.opzioni.map((o, k) => `<button class="rgopz" data-k="${k}">${'ABCD'[k]} · ${esc(o)}</button>`).join('') + `<div class="hint" id="rgCrocEs"></div><div class="row hidden" id="rgAv" style="justify-content:center"><button class="btn b-main" id="rgAvB">${esc(t('rg.avanti'))}</button></div>`;
    $('rpCroc').querySelectorAll('.rgopz').forEach(b => b.onclick = () => rgScegli(+b.dataset.k));
    $('rgAvB').onclick = () => { RP.i++; if (RP.i >= RP.carte.length) fineRip(); else cartaRip(); };
  }
  if (voce) {
    $('rgEsito').classList.add('hidden'); $('rgMic').textContent = t('rg.mic'); $('rgMic').disabled = false;
    voceParla(c.domanda);
  }
}
function rgScegli(k) {
  if (RP.risposto) return;
  RP.risposto = true;
  const c = RP.carte[RP.i], ok = k === c.giusta;
  $('rpCroc').querySelector(`[data-k="${c.giusta}"]`).classList.add('giusta');
  if (!ok) $('rpCroc').querySelector(`[data-k="${k}"]`).classList.add('sbagliata');
  $('carta').classList.add('giro');
  $('rgCrocEs').textContent = ok ? t('rg.croc.si', {g: rgDopo(c)}) : t('rg.croc.no', {l: 'ABCD'[c.giusta]});
  A.ripasso_voto(c.cartella, c.id, ok);
  if (ok) RP.ok++; else RP.no.push(c);
  $('rgAv').classList.remove('hidden');
}
const rgNorm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function rgParole(c) {
  const base = c.parole && c.parole.length ? c.parole : c.schema;
  return base.slice(0, 5).map(x => String(x).split(/[:–(;]/)[0].trim().split(/\s+/).slice(0, 4).join(' ')).filter(Boolean);
}
function rgDetto(k, testo) {
  const T = rgNorm(testo), ws = rgNorm(k).split(' ').filter(w => w.length > 3);
  if (!ws.length) return T.includes(rgNorm(k));
  return ws.filter(w => T.includes(w.slice(0, Math.max(4, w.length - 2)))).length >= Math.ceil(ws.length / 2);
}
async function rgMic() {
  const b = $('rgMic'), c = RP.carte[RP.i];
  if (RP.ascolto) {
    RP.ascolto = false; b.disabled = true; b.innerHTML = `<span class="spin" style="width:13px;height:13px"></span>${esc(t('dt.lav'))}`;
    const r = await A.detta_fine();
    b.disabled = false; b.textContent = t('rg.mic2');
    if (!r.ok || !r.testo) { $('rgEsito').classList.remove('hidden'); $('rgEsito').textContent = t('rg.niente'); return; }
    const kw = rgParole(c), si = kw.filter(k => rgDetto(k, r.testo)), no = kw.filter(k => !si.includes(k));
    $('rgEsito').classList.remove('hidden');
    $('rgEsito').innerHTML = `<div class="tu">«${esc(r.testo)}»</div><div><b>${esc(t('rg.detto', {k: si.length, n: kw.length}))}</b> ${si.map(k => `<span class="rgkw si">${esc(k)}</span>`).join('')}${no.length ? ` · <b>${esc(t('rg.manca'))}</b> ${no.map(k => `<span class="rgkw no">${esc(k)}</span>`).join('')}` : ''}</div>`;
    $('carta').classList.add('giro'); $('voto').classList.add('on');
    return;
  }
  voceFerma(); segnaUso('detta');
  const r = await A.detta_avvia();
  if (!r.ok) { toast(r.msg || ''); return; }
  RP.ascolto = true; b.textContent = t('rg.micstop');
}
async function fineGiorno() {
  // per lezione: quante sapute e cosa rivedere
  const fatte = RP.carte.slice(0, RP.i), per = {};
  fatte.forEach(c => { const p = per[c.cartella] = per[c.cartella] || {c, n: 0, ok: 0, riv: []}; p.n++; if (RP.no.includes(c)) { if (c.argomento && !p.riv.includes(c.argomento)) p.riv.push(c.argomento); } else p.ok++; });
  let extra = `<div class="rgcosa" style="text-align:left;margin-top:12px">` + Object.values(per).map(p => `<div class="rgcr">${p.c.materia ? `<span class="mtag">${esc(p.c.materia)}</span>` : ''}<div class="sp"><b>${esc(mvSenzaMateria(p.c.lezione, p.c.materia || ''))}</b><span>${esc(t('rg.fine.lez', {ok: p.ok, n: p.n}) + (p.riv.length ? ' · ' + t('rg.fine.riv', {a: p.riv.join(', ')}) : ' ✓'))}</span></div></div>`).join('') + '</div>';
  if (RP.i >= RP.carte.length) {
    const r = await A.ripasso_giorno_fatto();
    if (r.ok) extra = `<div class="hint" style="margin-top:8px">${esc(t(r.serie === 1 ? 'rg.fine.serie1' : 'rg.fine.serie', {n: r.serie}))} · ${esc(r.domani ? t(r.domani === 1 ? 'rg.fine.domani1' : 'rg.fine.domani', {n: r.domani}) : t('rg.fine.domani0'))}</div>` + extra;
  }
  $('rL').innerHTML = extra + $('rL').innerHTML;
}
/* ------------------------------------------------------------------ spazio DSA */
// Con la Modalita' DSA accesa: la prima voce del menu. Gli strumenti per DSA in ordine di momento (in aula, dopo la
// lezione, per la verifica, per il docente); il resto in «Altro». Le funzioni sono quelle di sempre: cambia la porta.
var SD = {m: null, c: null, altro: false};
const SD_USO = {ascolta: 'voce', karaoke: 'karaoke', podcast: 'podcast', mappa: 'mappe', verifica: 'mappa_verifica', rip: 'flashcard'};
function segnaUso(k) {
  if (!R || !R.facilitata) return;
  k = SD_USO[k] || k;
  if (['voce', 'karaoke', 'podcast', 'mappe', 'mappa_verifica', 'flashcard', 'detta', 'orale', 'test', 'scritto'].includes(k)) { try { A.segna_uso(k); } catch (e) {} }
}
const lezioniDsa = () => (LZ ? LZ.lezioni : []).filter(l => l.stato === 'pronta' && (l.n_appunti || l.trascritta));
async function disegnaSpazioDsa() {
  if (!LZ) await caricaLezioni();
  if (pagina !== 'dsa') return;
  const lz = lezioniDsa();
  const mats = [...new Set(lz.map(l => l.materia || ''))];
  if (SD.m === null || !mats.includes(SD.m)) SD.m = mats.length ? mats[0] : '';
  const lm = lz.filter(l => (l.materia || '') === SD.m);
  if (!lm.some(l => l.cartella === SD.c)) SD.c = lm.length ? lm[0].cartella : null;
  const l = lm.find(x => x.cartella === SD.c) || null;
  const m = SD.m ? materieStudia().find(x => x.m.toLowerCase() === SD.m.toLowerCase()) : null;
  SD.l = l; SD.mat = m;
  $('sdScegli').innerHTML = lz.length ? `<label for="sdM">${esc(t('sd.materia'))}</label><select id="sdM">${mats.map(x => `<option value="${esc(x)}"${x === SD.m ? ' selected' : ''}>${esc(x || t('sd.senza'))}</option>`).join('')}</select>
    <label for="sdL" style="margin-left:6px">${esc(t('sd.lezione'))}</label><select id="sdL">${lm.map(x => `<option value="${esc(x.cartella)}"${x.cartella === SD.c ? ' selected' : ''}>${esc((SD.m ? mvSenzaMateria(x.nome, SD.m) : x.nome) + (x.quando ? ' · ' + x.quando : ''))}</option>`).join('')}</select>`
    : `<div class="hint">${esc(t('sd.nessuna'))}</div>`;
  if ($('sdM')) { $('sdM').onchange = () => { SD.m = $('sdM').value; SD.c = null; disegnaSpazioDsa(); }; $('sdL').onchange = () => { SD.c = $('sdL').value; disegnaSpazioDsa(); }; }
  // perche' uno strumento non si puo' usare ancora (la piastrella resta, in chiaro, e al tocco lo dice)
  const nl = !l && 'sd.no.lez', tr = nl || (!l.trascritta && 'sd.no.tr'), ap = nl || (!l.n_appunti && 'sd.no.ap'), cap = nl || (!l.capitoli && 'sd.no.cap');
  const mt = !lz.length ? 'sd.no.lez' : !m && 'sd.no.mat';
  const T = (a, ico, tit, sub, no, bd) => `<button class="tile${no ? ' no' : ''}" data-sd="${a}"${no ? ` data-no="${no}"` : ''}><span class="ico i-blue">${ico}</span><span><b>${esc(tit)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}${bd ? `<span class="bd">${esc(bd)}</span>` : ''}</span></button>`;
  const mom = (n, tit, sub, tiles) => `<div class="sdmom"><h3><span class="n">${n}</span>${esc(tit)} <small>${esc(sub)}</small></h3><div class="tiles">${tiles.join('')}</div></div>`;
  $('sdBox').innerHTML =
    mom(1, t('sd.m1'), t('sd.m1.s'), [T('reg', '⏺', t('sd.reg'), t('sd.reg.s')), T('detta', '🎙', t('sd.detta'), t('sd.detta.s'))]) +
    mom(2, t('sd.m2'), t('sd.m2.s'), [T('leggimi', '🔊', t('lg.nome'), t('sd.lg.s')), T('ascolta', '🔊', t('tl.asc'), t('sd.asc.s'), ap), T('karaoke', '🎤', t('tl.kk'), t('sd.kk.s'), tr), T('appunti_dsa', '📄', t('sd.ap'), t('sd.ap.s'), ap),
      T('podcast', '🎧', t('sd.pc'), t('sd.pc.s'), tr), T('mappa', '🗺', t('sd.mappa'), t('sd.mappa.s'), tr), T('giorno', '🃏', t('sd.rg'), t('sd.rg.s')), T('glos', '📖', t('tl.gl'), t('tl.dsa.gl.s'), mt)]) +
    mom(3, t('sd.m3'), t('sd.m3.s'), [T('tutor', '🧑‍🏫', t('tl.tu'), t('tl.tu.s'), mt), T('mverif', '🗺', t('tl.mv'), t('sd.mv.s'), mt), T('orale', '🎤', t('tl.orale'), t('sd.orale.s'), mt),
      T('test', '☑', t('tl.dsa.test'), t('sd.test.s'), mt), T('scritto', '✍', t('tl.dsa.scr'), t('sd.scr.s'), mt)]) +
    mom(4, t('sd.m4'), t('sd.m4.s'), [T('firma', '🖨', t('sd.firma'), t('sd.firma.s'), mt), T('strumenti', '📋', t('sd.str'), t('sd.str.s'))]) +
    `<button class="sdaltro" id="sdAltroB">${esc(t(SD.altro ? 'sd.altro.su' : 'sd.altro'))}<span style="font-weight:400">${esc(t('sd.altro.s'))}</span></button>
    <div class="sdaltri${SD.altro ? '' : ' hidden'}" id="sdAltri"><div class="tiles" style="margin-top:12px">${[T('chiedi', '💬', t('tl.chiedi'), t('tl.chiedi.s'), tr), T('capitoli', '📑', t('tl.cap'), t('tl.cap.s'), cap),
      T('infografica', '🖼', t('tl.ig'), t('tl.ig.s'), tr), T('piano', '📅', t('st.piano').replace(/^📅\s*/, ''), t('sd.piano.s'), mt), T('prob', '⭐', t('tl.prob'), t('tl.prob.s'), mt), T('arch', '📚', t('sd.tutte'), t('sd.tutte.s'))].join('')}</div></div>`;
  $('sdAltroB').onclick = () => { SD.altro = !SD.altro; disegnaSpazioDsa(); };
  $('sdBox').querySelectorAll('[data-sd]').forEach(b => b.onclick = () => b.dataset.no ? toast(t(b.dataset.no)) : azioneDsa(b.dataset.sd));
}
async function azioneDsa(a) {
  const l = SD.l, m = SD.mat;
  if (a === 'reg') return vai('reg');
  if (a === 'detta') return vai('dp');
  if (a === 'leggimi') return vai('lg');
  if (a === 'giorno') return apriRipassoGiorno();
  if (a === 'arch') return vai('arch');
  if (a === 'strumenti') return strumentiDsa();
  if (a === 'firma') return apriMappaVerifica(m);
  if (['mverif', 'orale', 'test', 'scritto', 'piano', 'prob', 'glos', 'tutor'].includes(a)) return tileStudia(m, a);
  return tileLezione(l, a);
}
async function strumentiDsa() {
  const ok = await dialogo({titolo: t('sd.str.t'), testo: t('sd.str.q'), html: `<input class="in" style="margin-top:10px" maxlength="60" placeholder="${esc(t('mv.nome.ph'))}" value="${esc(R.nome_classe || '')}">`,
    bottoni: [{t: t('annulla'), v: false}, {t: t('sd.str.si'), cls: 'b-main', v: true}]});
  if (!ok) return;
  const nome = (dialogo.valore || '').trim();
  R.nome_classe = nome || R.nome_classe;
  const r = await A.strumenti_dsa_pdf(SD.m || '', nome, lezioniDsa().length > 0);
  if (!r.ok) dialogo({titolo: t('sd.str.t'), testo: r.msg || ''});
}
/* ------------------------------------------------------------------ mappa per la verifica */
// Un foglio A4 con le parole chiave di una o piu' lezioni, da portare alla verifica (strumento compensativo).
// La disposizione e' uguale a mappa_verifica.disposizione in Python (cosi' il PDF e' come quello che si vede).
var MV = {m: null, d: null, scelte: [], parole: true, formule: true, mod: false, tolte: new Set()};
function mvDisposizione(d) {
  const W = 900, H = 520, rami = d.rami || [], su = Math.ceil(rami.length / 2), out = [];
  [[0, rami.slice(0, su)], [1, rami.slice(su)]].forEach(([riga, g]) => {
    const cw = W / (g.length || 1);
    g.forEach((r, i) => {
      const y = riga === 0 ? 158 : H - 158;
      out.push({x: cw * (i + 0.5), y, su: riga === 0, bw: Math.min(cw - 30, 220), fw: Math.min(cw - 14, 280), titolo: r.titolo, r: r.r,
        foglie: r.foglie.map((f, j) => ({t: f.t, k: f.k, y: riga === 0 ? y - 46 - (r.foglie.length - 1 - j) * 32 : y + 46 + j * 32}))});
    });
  });
  return {W, H, cx: W / 2, cy: H / 2, rami: out};
}
const MV_COL = ['#0369a1', '#0d4275', '#0891b2', '#475569', '#1e5fbf', '#0f766e'];
async function apriMappaVerifica(m) {
  const lz = m.lez;
  MV = {m, lz, d: null, scelte: lz.map(l => l.cartella), parole: MV.parole !== false, formule: MV.formule !== false, mod: false, tolte: new Set()};
  vai('verifica');
  $('mvNome').placeholder = t('mv.nome.ph');
  $('mvLez').innerHTML = lz.length ? lz.map((l, i) => `<label class="mvck"><input type="checkbox" data-i="${i}" checked><span>${esc(l.nome)} <small>${esc(l.quando || '')}</small></span></label>`).join('')
    : `<div class="hint">${esc(t('mv.nessuna'))}</div>`;
  $('mvParole').classList.toggle('on', MV.parole); $('mvFormule').classList.toggle('on', MV.formule);
  const r = await A.mappa_verifica(m.m, null);
  if (MV.m !== m) return;
  $('mvNome').value = r.nome_classe || '';
  if (r.mv && r.mv.dati) {
    const ok = r.mv.cartelle.filter(c => lz.some(l => l.cartella === c));
    if (ok.length) {
      MV.scelte = ok; MV.parole = !!r.mv.parole; MV.d = r.mv.dati; MV.tolte = new Set(r.mv.tolte || []);
      $('mvLez').querySelectorAll('input').forEach(x => x.checked = ok.includes(lz[+x.dataset.i].cartella));
      $('mvParole').classList.toggle('on', MV.parole);
    }
  }
  mvDisegna();
}
function mvDisegna() {
  const f = $('mvFoglio'), d = MV.d, m = MV.m;
  $('mvMod').textContent = t(MV.mod ? 'mv.fatto' : 'mv.mod');
  f.classList.toggle('mod', MV.mod); $('mvModH').classList.toggle('hidden', !MV.mod);
  ['mvMod', 'mvPdf', 'mvStampa'].forEach(id => $(id).disabled = !d);
  $('mvCrea').classList.toggle('hidden', !!d && !MV.sporca); $('mvRifai').classList.toggle('hidden', !d || MV.sporca);
  $('mvCrea').disabled = !MV.scelte.length;
  const scelte = MV.lz.filter(l => MV.scelte.includes(l.cartella));
  const lezioni = t(scelte.length === 1 ? 'mv.lez1' : 'mv.lezn', {n: scelte.map(l => mvSenzaMateria(l.nome, m.m)).join(', ')});
  const testa = `<div class="testa"><span><b>${esc(m.m)}</b> · ${esc(lezioni)}</span><span>${esc(t('mv.nome'))}: ${$('mvNome').value.trim() ? esc($('mvNome').value.trim()) : '____________________'} &nbsp; ${esc(t('mv.data'))}: ________</span></div>`;
  const piede = `<div class="piede"><span>${esc(t('mv.piede'))}</span><span>${esc(t('mv.fatta'))}</span></div>`;
  if (!d) { f.innerHTML = testa + `<div class="vuoto hint">${esc(t(MV.lz.length ? 'mv.vuoto' : 'mv.nessuna'))}</div>` + piede; return; }
  // in modifica si vedono anche le parole tolte (in rosso), altrimenti spariscono
  const vis = k => MV.mod || !MV.tolte.has(k);
  const rami = d.rami.map((r, i) => ({titolo: r.titolo, r: i, foglie: r.foglie.map((x, j) => ({t: x, k: `${i}:${j}`})).filter(x => vis(x.k))}));
  const D = mvDisposizione({rami});
  const fit = (s, w, base) => Math.max(9, Math.min(base, w / (String(s).length * 0.56)));
  const g = [`<svg viewBox="0 0 ${D.W} ${D.H}" preserveAspectRatio="xMidYMid meet">`];
  D.rami.forEach(r => g.push(`<line x1="${D.cx}" y1="${D.cy}" x2="${r.x}" y2="${r.y + (r.su ? 24 : -24)}" stroke="#94a3b8" stroke-width="3"/>`));
  const cen = String(d.centro || '').toUpperCase();
  g.push(`<rect x="${D.cx - 150}" y="${D.cy - 30}" width="300" height="60" rx="30" fill="#0d4275"/><text x="${D.cx}" y="${D.cy + 7}" text-anchor="middle" fill="#fff" font-size="${fit(cen, 280, 21)}" font-weight="700">${esc(cen)}</text>`);
  D.rami.forEach(r => {
    const c = MV_COL[r.r % MV_COL.length];
    r.foglie.forEach(fo => g.push(`<g data-k="${fo.k}" class="${MV.tolte.has(fo.k) ? 'no' : ''}"><rect x="${r.x - r.fw / 2}" y="${fo.y - 14}" width="${r.fw}" height="28" rx="14" fill="${mvChiaro(c)}"/><text x="${r.x}" y="${fo.y + 6}" text-anchor="middle" fill="#1f2937" font-size="${fit(fo.t, r.fw - 8, 17.5)}">${esc(fo.t)}</text></g>`));
    const tt = String(r.titolo).toUpperCase();
    g.push(`<rect x="${r.x - r.bw / 2}" y="${r.y - 24}" width="${r.bw}" height="48" rx="12" fill="#fff" stroke="${c}" stroke-width="3"/><text x="${r.x}" y="${r.y + 7}" text-anchor="middle" fill="${c}" font-size="${fit(tt, r.bw - 10, 19)}" font-weight="700">${esc(tt)}</text>`);
  });
  g.push('</svg>');
  const fo = (d.formule || []).map((x, k) => ({x, k: 'f:' + k})).filter(x => vis(x.k));
  const formule = MV.formule && fo.length ? `<div class="mvfo"><b>${esc(t('mv.formule.t'))}</b>${fo.map(x => `<span data-k="${x.k}" class="${MV.tolte.has(x.k) ? 'no' : ''}">${esc(x.x)}</span>`).join('')}</div>` : '';
  f.innerHTML = testa + g.join('') + formule + piede;
  if (MV.mod) f.querySelectorAll('[data-k]').forEach(x => x.onclick = () => {
    const k = x.dataset.k;
    if (MV.tolte.has(k)) MV.tolte.delete(k); else MV.tolte.add(k);
    x.classList.toggle('no', MV.tolte.has(k));
  });
}
// «Fisiologia – Lezione 3» sotto «Fisiologia» diventa «Lezione 3»
function mvSenzaMateria(n, m) { const r = new RegExp('^' + m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[–\\-:·]\\s*', 'i'); return String(n).replace(r, '') || n; }
function mvChiaro(h) {
  const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).map(x => Math.round(x + (255 - x) * 0.88));
  return `rgb(${v.join(',')})`;
}
async function mvSalva() { await A.mappa_verifica_salva(MV.m.m, [...MV.tolte], $('mvNome').value.trim()); }
async function mvCrea(rifai) {
  if (!MV.scelte.length) return;
  const m = MV.m;
  MV.mod = false;
  $('mvFoglio').innerHTML = `<div class="vuoto row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('mv.lav'))}</div>`;
  ['mvCrea', 'mvMod', 'mvPdf', 'mvStampa'].forEach(id => $(id).disabled = true);
  const r = await A.mappa_verifica(m.m, MV.scelte, MV.parole, !!rifai);
  if (MV.m !== m) return;
  if (!r.ok) { MV.d = null; MV.sporca = true; mvDisegna(); $('mvFoglio').querySelector('.vuoto').innerHTML = `<span style="color:#be123c">⚠ ${esc(r.msg || '')}</span>`; return; }
  MV.d = r.mv.dati; MV.tolte = new Set(r.mv.tolte || []); MV.sporca = false;
  mvDisegna();
}
async function mvPdf(stampa) {
  if (MV.mod) { MV.mod = false; mvDisegna(); }
  await mvSalva();
  const r = await A.mappa_verifica_pdf(MV.m.m, MV.formule, !!stampa);
  if (!r.ok) await dialogo({titolo: t('tl.mv'), testo: r.msg || ''});
}
function collegaVerifica() {
  $('mvLez').onchange = () => {
    MV.scelte = [...$('mvLez').querySelectorAll('input:checked')].map(x => MV.lz[+x.dataset.i].cartella);
    MV.sporca = true; mvDisegna();
  };
  $('mvParole').onclick = () => { MV.parole = !MV.parole; $('mvParole').classList.toggle('on', MV.parole); if (MV.d) { MV.sporca = true; mvDisegna(); } };
  $('mvFormule').onclick = () => { MV.formule = !MV.formule; $('mvFormule').classList.toggle('on', MV.formule); if (MV.m) mvDisegna(); };
  $('mvNome').oninput = () => { if (MV.m) mvDisegna(); };
  $('mvNome').onchange = () => { if (MV.m && MV.d) mvSalva(); };
  $('mvCrea').onclick = () => mvCrea(false);
  $('mvRifai').onclick = () => mvCrea(true);
  $('mvMod').onclick = () => { MV.mod = !MV.mod; mvDisegna(); if (!MV.mod) mvSalva(); };
  $('mvPdf').onclick = () => mvPdf(false);
  $('mvStampa').onclick = () => mvPdf(true);
}
async function apriAscoltaMateria(m) {
  asFerma(true);
  const finta = {cartella: '', nome: m.m, quando: m.lez.length === 1 ? t('rp.lez1') : t('rp.lezn', {n: m.lez.length}), nome_mio: ''};
  AS = {lez: finta, d: null, f: 0, frasi: [], i: 0, attivo: false, vel: AS.vel || 1};
  $('asSub').textContent = `${m.m} · ${finta.quando}`;
  $('asFmt').classList.add('hidden');
  $('asBox').innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('as.lav'))}</div>`;
  disegnaVel(); disegnaPlay(); disegnaFacilitata(); vai('ascolta');
  const sezioni = [];
  for (const l of m.lez) {
    const r = await A.ascolta_appunti(l.cartella);
    if (AS.lez !== finta) return;
    const f = r.ok && r.formati[0];
    if (!f) continue;
    sezioni.push({titolo: l.nome, punti: f.riassunto ? [f.riassunto] : []}, ...f.sezioni);
  }
  if (!sezioni.length) { $('asBox').innerHTML = `<div class="hint">${esc(t('as.vuoto'))}</div>`; return; }
  AS.d = {formati: [{formato: 'cornell', titolo: m.m, sezioni, riassunto: ''}]};
  disegnaAscolta();
}

/* ------------------------------------------------------------------ dettatura (Modalità DSA) */
// Si registra dal microfono, si trascrive sul PC o sul telefono e il testo va nel campo. Niente Claude.
var DT = null;
// si esce dalla pagina mentre si detta: il microfono si spegne (quello che si e' detto si perde)
function dettaVia() { const d = DT; DT = null; clearInterval(d.poll); try { A.detta_fine(); } catch (e) {} }
async function detta(btn, campo, testi) {
  if (SUL_WEB()) { toast(t('dp.noweb')); return; }
  if (DT && !document.body.contains(DT.btn)) dettaVia();
  if (DT && DT.btn !== btn) return;
  if (DT) {                                   // secondo tocco: fine
    const d = DT; DT = null; clearInterval(d.poll);
    btn.disabled = true; btn.innerHTML = `<span class="spin" style="width:13px;height:13px"></span>${esc(t('dt.lav'))}`;
    const r = await A.detta_fine();
    btn.disabled = false; btn.textContent = d.testo; if (!d.rosso) btn.classList.remove('b-rec'); if (d.testi) d.testi(false);
    if (r.ok) { if (typeof campo === 'function') campo(r.testo); else { campo.value = (campo.value.trim() ? campo.value.trim() + ' ' : '') + r.testo; campo.dispatchEvent(new Event('input')); } } else toast(r.msg || '');
    return;
  }
  voceFerma(); segnaUso('detta');
  const r = await A.detta_avvia();
  if (!r.ok) { toast(r.msg || ''); return; }
  DT = {btn, testo: btn.textContent, testi, rosso: btn.classList.contains('b-rec')};
  btn.classList.add('b-rec'); btn.textContent = t('dt.ferma'); if (testi) testi(true);
  DT.poll = setInterval(async () => { const l = await A.detta_livello(); if (DT && l.ok) btn.style.boxShadow = `0 0 0 ${2 + Math.round((l.livello || 0) * 10)}px rgba(225,29,72,.15)`; }, 300);
}

/* ------------------------------------------------------------------ test a crocette */
// 10 domande a 4 risposte su tutta la materia; si corregge sul PC (gratis): voto, perche' era sbagliata, dove ripassare.
var TC = {test: null};   // var: apriEsame() lo guarda subito
var TCS = {n: 10, diff: 'media', vero: false};      // le scelte dell'ultimo test
function sceltaTest() {
  clearInterval(TC.timer); TC = {test: null};
  const box = $('esTestBox'); box.classList.remove('hidden');
  const seg = (id, vals, cur) => `<div class="seg" id="${id}">${vals.map(([v, n]) => `<span data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${esc(n)}</span>`).join('')}</div>`;
  const dsa = !!(R && R.facilitata);
  box.innerHTML = `<div class="lbl">${esc(t('tc.come'))}</div>
    <div class="set"><div class="t"><b>${esc(t('tc.quante'))}</b></div>${seg('tcN', [[10, '10'], [20, '20'], [30, '30']], TCS.n)}</div>
    <div class="set"><div class="t"><b>${esc(t('tc.diff'))}</b></div>${seg('tcD', [['facile', t('tc.facile')], ['media', t('tc.media')], ['difficile', t('tc.difficile')]], TCS.diff)}</div>
    <div class="set"><div class="t"><b>${esc(t('tc.vero'))}</b><span>${esc(t('tc.vero.s'))}${dsa ? ' ' + esc(t('tc.vero.dsa')) : ''}</span></div><div class="sw${TCS.vero ? ' on' : ''}" id="tcV"></div></div>
    <div class="row mt" style="justify-content:flex-end"><button class="btn b-cor b-sm" id="tcVia">${esc(t('tc.inizia'))}</button></div>`;
  [['tcN', v => TCS.n = +v], ['tcD', v => TCS.diff = v]].forEach(([id, f]) => $(id).querySelectorAll('span').forEach(x => x.onclick = () => {
    $(id).querySelectorAll('span').forEach(y => y.classList.toggle('on', y === x)); f(x.dataset.v); }));
  $('tcV').onclick = () => { TCS.vero = !TCS.vero; $('tcV').classList.toggle('on', TCS.vero); };
  $('tcVia').onclick = () => nuovoTest(false);
  box.scrollIntoView({block: 'start'});
}
async function nuovoTest(soloSbagliate) {
  segnaUso('test');
  clearInterval(TC.timer);
  const box = $('esTestBox'); box.classList.remove('hidden');
  box.innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('tc.lav'))}</div>`;
  box.scrollIntoView({block: 'start'});
  const r = await A.test_nuovo(ES.m.m, ES.m.cartelle, !!soloSbagliate, TCS.n, TCS.diff, TCS.vero);
  if (!r.ok) { box.innerHTML = `<div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>`; return; }
  TC = {test: r.test, scelte: [], sec: 0, corretto: false};
  // «come all'esame vero»: 1 minuto a domanda (30% in piu' con la Modalita' DSA), poi si corregge da solo
  TC.limite = r.test.esame_vero ? Math.round(r.test.domande.length * 60 * (R && R.facilitata ? 1.3 : 1)) : 0;
  TC.timer = setInterval(() => {
    TC.sec++;
    if ($('tcT')) $('tcT').textContent = TC.limite ? '⏱ ' + mmss(Math.max(0, TC.limite - TC.sec)) : mmss(TC.sec);
    if (TC.limite && TC.sec >= TC.limite && $('tcCorr')) $('tcCorr').click();
  }, 1000);
  disegnaTest();
}
const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
function tcLezione(n) { return (TC.test.lezioni || []).find(x => x.n === n); }
function disegnaTest() {
  const T = TC.test, box = $('esTestBox'); if (!box || !T) return;
  box.classList.remove('hidden');
  const fatto = T.voto != null && T.risposte;
  const sc = fatto ? T.risposte : TC.scelte;
  let h = `<div class="row"><div class="lbl sp" style="margin:0">${esc(t(T.ripasso ? 'tc.h.rip' : 'tc.h', {n: T.domande.length}))}</div>${fatto
    ? `<span class="pill ${T.voto >= 18 ? 'p-ok' : 'p-red'}" style="font-size:14px">${esc(t('es.voto', {v: T.voto}))}</span>` : `<span class="tctempo" id="tcT">${TC.limite ? '⏱ ' + mmss(Math.max(0, TC.limite - (TC.sec || 0))) : mmss(TC.sec || 0)}</span>`}</div>`;
  if (fatto) h += `<div class="tcris"><div><b>${T.giuste}</b>${esc(t('tc.giuste'))}</div><div><b>${T.sbagliate}</b>${esc(t('tc.sbagliate'))}</div><div><b>${T.vuote}</b>${esc(t('tc.vuote'))}</div><div><b>${mmss(T.sec || 0)}</b>${esc(t('tc.tempo'))}</div></div>` +
    (T.esame_vero ? `<div class="hint" style="margin-top:6px">${esc(t('tc.calc', {g: T.giuste, s: T.sbagliate, p: num(T.punti), n: T.domande.length}))}</div>` : '');
  h += T.domande.map((q, i) => {
    const lz = tcLezione(q.lezione);
    const dove = fatto && lz ? `<div class="tcdove">${q.sec != null ? `<button class="lnk" data-mom="${i}">${esc(t('tc.dove.min', {n: lz.n, d: lz.data, m: Math.floor(q.sec / 60)}))}</button>` : esc(t('tc.dove', {n: lz.n, d: lz.data}))}</div>` : '';
    const opz = q.opzioni.map((o, j) => {
      let c = sc[i] === j ? 'sc' : '';
      if (fatto) c = j === q.giusta ? 'giusta' : sc[i] === j ? 'errata' : '';
      return `<button data-i="${i}" data-j="${j}" class="${c}"><span class="l">${'ABCD'[j]}</span><span>${esc(o)}</span></button>`;
    }).join('');
    const spieg = fatto && sc[i] !== q.giusta ? `<div class="tcspieg"><b>${esc(sc[i] == null ? t('tc.vuota') : t('tc.perche'))}</b> ${esc(q.spiegazione)}${lz ? ` <button class="lnk" data-ch="${i}">${esc(t('tc.chiedi'))}</button>` : ''}</div>` : '';
    const asc = `<button class="btn b-ghost ascolta solo-dsa" data-asc="${i}">${esc(t('tc.ascolta'))}</button>`;
    return `<div class="tcq"><b>${i + 1}. ${esc(q.domanda)}</b>${asc}${dove}<div class="tcopz${fatto ? ' chiusa' : ''}">${opz}</div>${spieg}</div>`;
  }).join('');
  if (fatto) {
    const consigli = [(T.da_ripassare || []).length ? t('tc.ripassa', {l: T.da_ripassare.join(', ')}) : '', T.flashcard ? t('tc.flash') : ''].filter(Boolean).join(' ');
    h += (consigli ? `<div class="avviso2 mt">${esc(consigli)}</div>` : '') +
      `<div class="row mt" style="justify-content:flex-end;gap:8px">${T.sbagliate + T.vuote ? `<button class="btn b-ghost b-sm" id="tcSolo">${esc(t('tc.solo'))}</button>` : ''}<button class="btn b-cor b-sm" id="tcNuovo">${esc(t('tc.nuovo'))}</button></div>`;
  } else h += `<div class="row mt" style="justify-content:flex-end"><button class="btn b-main b-sm" id="tcCorr">${esc(t('tc.correggi'))}</button></div>`;
  box.innerHTML = h;
  box.querySelectorAll('.tcopz:not(.chiusa) button').forEach(b => b.onclick = () => {
    TC.scelte[+b.dataset.i] = +b.dataset.j;
    box.querySelectorAll(`.tcopz button[data-i="${b.dataset.i}"]`).forEach(x => x.classList.toggle('sc', x === b));
  });
  box.querySelectorAll('[data-asc]').forEach(b => b.onclick = () => { const q = T.domande[+b.dataset.asc]; voceParla(q.domanda + '. ' + q.opzioni.map((o, j) => 'ABCD'[j] + ': ' + o).join('. ')); });
  box.querySelectorAll('[data-mom]').forEach(b => b.onclick = () => { const q = T.domande[+b.dataset.mom], lz = tcLezione(q.lezione); mostraMomento(lz.cartella, q.sec, null, lz.nome); });
  box.querySelectorAll('[data-ch]').forEach(b => b.onclick = async () => {
    const q = T.domande[+b.dataset.ch], lz = tcLezione(q.lezione);
    if (!LZ) await caricaLezioni();
    const l = LZ && LZ.lezioni.find(x => x.cartella === lz.cartella);
    if (!l) { if (q.sec != null) mostraMomento(lz.cartella, q.sec, null, lz.nome); return; }
    await apriChiedi(l);
    $('chIn').value = t('tc.chiedi.q', {q: q.domanda, r: q.opzioni[q.giusta]});
  });
  if ($('tcCorr')) $('tcCorr').onclick = async () => {
    const b = $('tcCorr'); b.disabled = true;
    clearInterval(TC.timer);
    const r = await A.test_correggi(ES.m.m, T.domande.map((_, i) => TC.scelte[i] ?? null), TC.sec || 0);
    if (!r.ok) { b.disabled = false; return toast(r.msg || ''); }
    TC.test = r.test; disegnaTest(); box.scrollIntoView({block: 'start'});
    caricaLezioni();     // i numeri «da rivedere» delle flashcard cambiano
  };
  if ($('tcSolo')) $('tcSolo').onclick = () => nuovoTest(true);
  if ($('tcNuovo')) $('tcNuovo').onclick = () => sceltaTest();
}

/* ------------------------------------------------------------------ la voce (lettura ad alta voce) */
// Sul PC (e su Mac e iPhone) parla la finestra con la voce del sistema; sul telefono Android la finestra
// non ha voce e parla l'app (A.voce_*). voceParla() finisce quando la frase e' detta (true) o fermata (false).
let VOCE_GIRO = 0;
// la voce del telefono solo nell'app Android; sul web (anche dal telefono) quella del browser
const VOCE_APP = () => ANDROID && !document.documentElement.classList.contains('web');
const voceDisponibile = () => VOCE_APP() || !!window.speechSynthesis;
const perLaVoce = s => String(s || '').replace(/[★•]/g, '').replace(/−/g, '-').replace(/→/g, ', ').replace(/\s+/g, ' ').trim();
// chi: -1 la voce di sempre; 0 / 1 le due voci del podcast a due voci (Giulia femminile, Marco maschile o piu' basso)
function vocePer(chi) {
  const L = LINGUA === 'en' ? 'en' : 'it';
  const vv = speechSynthesis.getVoices().filter(x => (x.lang || '').toLowerCase().startsWith(L));
  if (chi < 0 || !vv.length) return {v: vv[0], tono: 1};
  const F = /elsa|isabella|alice|federica|paola|giulia|elena|sara|chiara|zira|hazel|susan|libby|sonia|kate|emma|aria|jenny|samantha|serena/i;
  const M = /cosimo|diego|luca|giuseppe|marco|paolo|david|george|mark|ryan|daniel|guy|alex|thomas|oliver/i;
  const f = vv.find(x => F.test(x.name)) || vv[0];
  if (chi === 0) return {v: f, tono: 1};
  const m = vv.find(x => M.test(x.name)) || vv.find(x => x !== f);
  return m ? {v: m, tono: 1} : {v: f, tono: 0.7};
}
function voceParla(testo, vel = 1, onParola = null, chi = -1) {
  const giro = ++VOCE_GIRO;
  testo = perLaVoce(testo);
  return new Promise(async fatto => {
    if (!testo) return fatto(true);
    if (VOCE_APP()) {
      const r = await A.voce_parla(testo, vel, LINGUA, chi);
      if (!r || !r.ok) return fatto(false);
      while (giro === VOCE_GIRO) { await pausa(200); const o = await A.voce_occupata(); if (!o.occupata) break; }
      return fatto(giro === VOCE_GIRO);
    }
    try {
      if (!window.speechSynthesis) return fatto(false);
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(testo); u.lang = LINGUA === 'en' ? 'en-GB' : 'it-IT'; u.rate = vel;
      const vp = vocePer(chi);
      if (vp.v) u.voice = vp.v;
      u.pitch = vp.tono;
      if (onParola) u.onboundary = e => { if (e.name === 'word' || e.name === undefined) onParola(e.charIndex); };
      u.onend = () => fatto(giro === VOCE_GIRO); u.onerror = () => fatto(false);
      speechSynthesis.speak(u);
    } catch (e) { fatto(false); }
  });
}
function voceFerma() {
  VOCE_GIRO++;
  if (VOCE_APP()) { try { A.voce_ferma(); } catch (e) {} return; }
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
}

/* ------------------------------------------------------------------ ascolta gli appunti + lettura facilitata */
var AS = {lez: null, d: null, f: 0, frasi: [], i: 0, attivo: false, vel: 1};   // var: vai() lo guarda subito
function disegnaFacilitata() {
  const on = !!(R && R.facilitata);
  document.documentElement.classList.toggle('dsa', on);
  lettura();
  ['swFac', 'asFac'].forEach(id => { if ($(id)) $(id).classList.toggle('on', on); });
  document.querySelectorAll('[data-dsa] .sw').forEach(x => x.classList.toggle('on', on));
}
async function cambiaDsa() { await A.imposta('lettura_facilitata', !R.facilitata); await rileggi(); if (pagina === 'dsa' && !R.facilitata) { vai('reg'); return; } if (pagina === 'lezione' && LEZ) disegnaLezione(); if (pagina === 'studia') disegnaStudia(); if (TC.test && !TC.test.voto && TC.test.risposte == null) disegnaTest(); }
const disegnaVel = () => $('asVel').querySelectorAll('span').forEach(s => s.classList.toggle('on', +s.dataset.v === AS.vel));
const disegnaPlay = () => { $('asPlay').textContent = t(AS.attivo ? 'as.pausa' : AS.i > 0 ? 'as.continua' : 'as.leggi'); };
async function apriAscolta(l) {
  asFerma(true);
  AS = {lez: l, d: null, f: 0, frasi: [], i: 0, attivo: false, vel: AS.vel || 1};
  $('asSub').textContent = `${l.nome} · ${l.quando}`;
  $('asFmt').classList.add('hidden');
  $('asBox').innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('as.lav'))}</div>`;
  disegnaVel(); disegnaPlay(); disegnaFacilitata();
  vai('ascolta');
  const r = await A.ascolta_appunti(l.cartella);
  if (AS.lez !== l) return;
  if (!r.ok) { $('asBox').innerHTML = `<div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>`; return; }
  AS.d = r;
  if (!r.formati.length) { $('asBox').innerHTML = `<div class="hint">${esc(t('as.vuoto'))}</div>`; return; }
  disegnaAscolta();
}
function disegnaAscolta() {
  const F = AS.d.formati, f = F[AS.f] || F[0];
  const fmt = $('asFmt');
  fmt.classList.toggle('hidden', F.length < 2);
  fmt.innerHTML = F.map((x, i) => `<span data-i="${i}" class="${i === AS.f ? 'on' : ''}">${esc(nomeFormato(x.formato, AS.lez.nome_mio))}</span>`).join('');
  fmt.querySelectorAll('span').forEach(s => s.onclick = () => { asFerma(true); AS.f = +s.dataset.i; disegnaAscolta(); });
  // ogni frase e' uno <span> da evidenziare e toccare
  let n = 0;
  const frasi = x => String(x || '').split(/(?<=[.?!;])\s+/).filter(p => p.trim()).map(p => `<span class="fr" data-n="${n++}">${esc(p)}</span>`).join(' ');
  $('asBox').innerHTML = `<h3>${frasi(f.titolo)}</h3>` +
    f.sezioni.map(s => `<div class="asbl"><div class="k">${frasi(s.titolo)}</div><div>${s.punti.length ? '<ul>' + s.punti.map(p => `<li>${frasi(p)}</li>`).join('') + '</ul>' : ''}</div></div>`).join('') +
    (f.riassunto ? `<div class="asrias"><b>${esc(t('as.rias'))}</b> ${frasi(f.riassunto)}</div>` : '');
  AS.frasi = [...$('asBox').querySelectorAll('.fr')];
  AS.frasi.forEach((x, k) => x.onclick = () => asLeggi(k));
  silabizza($('asBox'));
  AS.i = 0; disegnaPlay();
}
function asEvidenzia(k) {
  AS.frasi.forEach((x, j) => x.classList.toggle('ora', j === k));
  if (AS.frasi[k]) AS.frasi[k].scrollIntoView({block: 'center', behavior: 'smooth'});
}
async function asLeggi(k) {
  if (!voceDisponibile()) { toast(t('as.novoce')); return; }
  voceFerma();
  const giro = {};
  AS.giro = giro; AS.attivo = true; AS.i = Math.max(0, k); disegnaPlay();
  while (AS.giro === giro && AS.i < AS.frasi.length) {
    asEvidenzia(AS.i);
    const ok = await voceParla(AS.frasi[AS.i].textContent, AS.vel);
    if (AS.giro !== giro) return;
    if (!ok) { AS.attivo = false; disegnaPlay(); if (AS.i === k) toast(t('as.novoce')); return; }
    AS.i++;
  }
  if (AS.giro === giro) { AS.attivo = false; AS.i = 0; asEvidenzia(-1); disegnaPlay(); }
}
function asPlay() {
  if (!AS.frasi.length) return;
  if (AS.attivo) { asFerma(false); return; }          // pausa: si riprende dalla stessa frase
  asLeggi(AS.i);
}
function asFerma(daCapo) {
  AS.giro = null; AS.attivo = false; voceFerma();
  if (daCapo) { AS.i = 0; if (AS.frasi && AS.frasi.length) asEvidenzia(-1); }
  if ($('asPlay')) disegnaPlay();
}

/* ------------------------------------------------------------------ interrogazione a voce */
// Il docente fa la domanda (scritta e, se il sistema ha una voce, letta ad alta voce); lo studente risponde al
// microfono; la risposta si trascrive sul PC e Claude decide se fare una «domanda in più». Alla fine il voto.
var OR = {orale: null};   // var: vai() lo guarda anche prima che arrivi qui
function orLeggi(testo) { voceParla(testo); }
const orVoce = () => voceDisponibile() && (VOCE_APP() || (() => { try { return speechSynthesis.getVoices().length > 0; } catch (e) { return false; } })());
function orStop() {
  if (OR.poll) clearInterval(OR.poll); OR.poll = null;
  if (OR.audio) { try { OR.audio.pause(); } catch (e) {} OR.audio = null; }
  voceFerma();
}
function orChiudi() {
  const c = !!OR.orale; orStop(); OR = {orale: null};
  if ($('esOrBox')) { $('esOrBox').classList.add('hidden'); $('esOrBox').innerHTML = ''; }
  if (c) A.orale_chiudi();
}
async function nuovaOrale() {
  segnaUso('orale');
  orChiudi();
  const box = $('esOrBox'); box.classList.remove('hidden');
  box.innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('or.prep'))}</div>`;
  box.scrollIntoView({block: 'start'});
  const r = await A.orale_nuova(ES.m.m);
  if (!r.ok) { box.innerHTML = `<div class="hint" style="color:#be123c">⚠ ${esc(r.msg || '')}</div>`; return; }
  OR = {orale: r.orale, materia: ES.m.m, n: 0, storia: '', fase: 'domanda', domanda: r.orale.domande[0].domanda, extra: false, msg: ''};
  orDomanda(OR.domanda, false);
}
function orProf(testo, extra) {
  const voce = orVoce() ? `<div class="hint">🔊 <button class="lnk orleggi" data-q="${esc(testo)}">${esc(t('or.riascolta'))}</button></div>` : '';
  return `<div class="orprof"><div class="av">🎓</div><div class="bal">${extra ? `<span class="pill p-blue" style="margin-bottom:6px">${esc(t('or.extra'))}</span><br>` : ''}${esc(testo)}${voce}</div></div>`;
}
const orTu = testo => `<div class="ortu"><div class="bal">${esc(testo)}</div></div>`;
function orDomanda(testo, extra) {
  OR.domanda = testo; OR.extra = extra; OR.fase = 'domanda'; OR.msg = '';
  OR.storia += orProf(testo, extra);
  disegnaOrale(); orLeggi(testo);
}
function disegnaOrale() {
  const box = $('esOrBox'); if (!box || !OR.orale) return;
  box.classList.remove('hidden');
  if (OR.fase === 'fine') return disegnaOrRisultato();
  const tot = OR.orale.domande.length;
  const passi = '<div class="orpassi">' + OR.orale.domande.map((_, i) => `<span class="${i <= OR.n ? 'f' : ''}"></span>`).join('') + '</div>';
  let sotto = '';
  if (OR.fase === 'domanda') sotto = `${OR.msg ? `<div class="hint" style="color:#be123c;text-align:center;margin-top:10px">⚠ ${esc(OR.msg)}</div>` : ''}<div class="orcentro"><button class="ormic" id="orMic">🎤</button><div class="hint">${esc(t('or.tocca'))}</div></div>`;
  else if (OR.fase === 'ascolto') sotto = `<div class="orcentro"><button class="ormic on" id="orMic">■</button><div class="ortempo" id="orT">0:00</div><div class="hint">${esc(t('or.ascolto'))}</div></div>`;
  else sotto = `<div class="row mt" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(OR.fase === 'trascrivo' ? t('or.trascrivo') : OR.fase === 'correggo' ? t('or.corr') : t('or.pensa'))}</div>`;
  box.innerHTML = `<div class="row" style="margin-bottom:4px"><div class="lbl sp" style="margin:0">${esc(t('or.h', {n: OR.n + 1, t: tot}))}</div>${passi}</div>${OR.storia}${sotto}
    <div class="row mt"><span class="sp"></span><button class="lnk" id="orX">${esc(t('or.chiudi'))}</button></div>`;
  box.querySelectorAll('.orleggi').forEach(b => b.onclick = () => orLeggi(b.dataset.q));
  $('orX').onclick = () => orChiudi();
  if ($('orMic')) $('orMic').onclick = OR.fase === 'ascolto' ? orFine : orAscolta;
}
async function orAscolta() {
  voceFerma();
  const r = await A.orale_ascolta();
  if (!r.ok) { OR.msg = r.msg || ''; return disegnaOrale(); }
  OR.fase = 'ascolto'; disegnaOrale();
  OR.poll = setInterval(async () => {
    const l = await A.orale_livello();
    if (!l.ok || OR.fase !== 'ascolto') return;
    const s = Math.floor(l.sec || 0);
    if ($('orT')) $('orT').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    if ($('orMic')) $('orMic').style.boxShadow = `0 0 0 ${6 + Math.round((l.livello || 0) * 22)}px rgba(225,29,72,.15)`;
  }, 250);
}
async function orFine() {
  orStop(); OR.fase = 'trascrivo'; disegnaOrale();
  const r = await A.orale_fine(OR.n, OR.domanda);
  if (!OR.orale) return;
  if (!r.ok) { OR.fase = 'domanda'; OR.msg = r.msg || ''; return disegnaOrale(); }
  OR.storia += orTu(r.testo);
  if (r.extra && !OR.extra) { OR.fase = 'pensa'; disegnaOrale(); return setTimeout(() => OR.orale && orDomanda(r.extra, true), 600); }
  if (OR.n + 1 < OR.orale.domande.length) { OR.n++; return orDomanda(OR.orale.domande[OR.n].domanda, false); }
  OR.fase = 'correggo'; disegnaOrale();
  const c = await A.orale_correggi();
  if (!OR.orale) return;
  if (!c.ok) { OR.fase = 'domanda'; OR.msg = c.msg || ''; OR.n = OR.orale.domande.length - 1; return disegnaOrale(); }
  OR.orale = c.orale; OR.ascolta = c.ascolta; OR.fase = 'fine';
  if (ES.d) ES.d.voti_orali = (ES.d.voti_orali || []).concat([c.orale.voto]);
  disegnaOrRisultato(); $('esOrBox').scrollIntoView({block: 'start'});
}
function disegnaOrRisultato() {
  const o = OR.orale, corr = o.correzione || [], st = o.stile || {};
  const m = Math.floor((st.sec || 0) / 60), s = (st.sec || 0) % 60;
  const giud = {sicuro: t('or.sicuro'), esitante: t('or.esitante'), molte_pause: t('or.molte')}[st.giudizio] || '—';
  $('esOrBox').innerHTML = `<div class="row"><div class="lbl sp" style="margin:0">${esc(t('or.h.ris'))}</div><span class="pill ${o.voto >= 18 ? 'p-ok' : 'p-red'}" style="font-size:14px">${esc(t('es.voto', {v: o.voto}))}</span></div>
    ${o.domande.map((q, i) => { const c = corr.find(x => x.n === i + 1);
      return `<div class="essim"><b>${i + 1}. ${esc(q.domanda)}</b>${c ? ` <span class="hint">(${esc(t('es.punti', {p: num(c.punti), s: num(c.su)}))})</span>` : ''}
        ${c ? `<div class="escorr">${c.bene ? `<div><span style="color:var(--ok)">✓</span> ${esc(c.bene)}</div>` : ''}${c.manca ? `<div><span style="color:#be123c">✗</span> ${esc(c.manca)}</div>` : ''}</div>` : ''}</div>`; }).join('')}
    <div class="lbl mt">${esc(t('or.stile'))}</div>
    <div class="orstile"><div><b>${m}:${String(s).padStart(2, '0')}</b>${esc(t('or.tempo'))}</div><div><b>${esc(t('or.int.n', {n: st.intercalari || 0}))}</b>${esc(t('or.int'))}</div><div><b>${esc(giud)}</b>${esc(t('or.pause', {n: st.pause || 0}))}</div></div>
    ${o.consiglio ? `<div class="avviso2 mt">${esc(o.consiglio)}</div>` : ''}
    <div class="hint mt">${esc(t('or.privacy'))}</div>
    <div class="row mt" style="justify-content:flex-end;gap:8px"><button class="lnk sp" id="orX" style="text-align:left">${esc(t('or.chiudi'))}</button>${OR.ascolta ? `<button class="btn b-ghost b-sm" id="orAsc">${esc(t('or.riascoltati'))}</button>` : ''}<button class="btn b-cor b-sm" id="orNuova">${esc(t('or.nuova'))}</button></div>`;
  $('orX').onclick = () => orChiudi();
  $('orNuova').onclick = () => nuovaOrale();
  if ($('orAsc')) $('orAsc').onclick = () => {
    const b = $('orAsc');
    if (OR.audio) { OR.audio.pause(); OR.audio = null; b.textContent = t('or.riascoltati'); return; }
    OR.audio = new Audio(OR.ascolta); OR.audio.play().catch(() => {}); b.textContent = t('or.ferma');
    OR.audio.onended = () => { OR.audio = null; if ($('orAsc')) $('orAsc').textContent = t('or.riascoltati'); };
  };
}
async function nuovaSimulazione() {
  segnaUso('scritto');
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
/* «La mia mappa»: 👁 Guarda (🔊 per sentire), ✏️ Modifica (temi e voci, colore, togli), 🧩 Costruiscila tu (le voci le scrive lo studente).
   Ogni cambio si salva da solo (mappa_salva); «↶ Annulla» torna indietro fino a 50 passi; il PDF e' quello che si vede. */
function mpNorma(d) {
  d = d || {centro: '', rami: []};
  (d.rami || []).forEach((r, i) => {
    r.foglie = r.foglie || [];
    if (typeof r.colore !== 'number') r.colore = i % COLORI_MAPPA.length;
    r.mie = Array.from({length: r.foglie.length}, (_, j) => (r.mie || [])[j] || '');
  });
  return d;
}
let MP_SALVA = null;
function mpSalva() { clearTimeout(MP_SALVA); MP_SALVA = setTimeout(() => { if (MP.lez && MP.dati) A.mappa_salva(MP.lez.cartella, MP.dati); }, 400); }
function mpRicorda() { MP.prima = MP.prima || []; MP.prima.push(JSON.stringify(MP.dati)); if (MP.prima.length > 50) MP.prima.shift(); }
function mpAnnulla() {
  if (!MP.prima || !MP.prima.length) return;
  MP.dati = JSON.parse(MP.prima.pop()); MP.sel = -1; mpToastVia(); mpSalva(); disegnaMappa();
}
let MP_TT = null;
function mpToast(x) { $('mpToastT').textContent = x; $('mpToast').classList.add('v'); clearTimeout(MP_TT); MP_TT = setTimeout(mpToastVia, 6000); }
function mpToastVia() { $('mpToast').classList.remove('v'); }
async function mpParla(el, testo) {
  if (!testo || !voceDisponibile()) { if (!voceDisponibile()) toast(t('as.novoce')); return; }
  voceFerma(); document.querySelectorAll('#mpBox .parla').forEach(x => x.classList.remove('parla'));
  el.classList.add('parla');
  try { await voceParla(testo, 0.95); } finally { el.classList.remove('parla'); }
}
function disegnaMappa() {
  const d = MP.dati, modo = MP.modo || 'vedi', box = $('mpBox');
  if (!d) return;
  box.className = 'mappa mp-nuova' + (modo !== 'vedi' ? ' mp-mod' : '');
  const ed = modo !== 'vedi';
  const tema = (r, i) => {
    const c = COLORI_MAPPA[r.colore % COLORI_MAPPA.length], scelto = modo === 'mod' && MP.sel === i;
    const voci = r.foglie.map((x, j) => {
      const mia = r.mie[j] || '', vuota = modo === 'tu' && !mia;
      const testo = modo === 'tu' ? mia : x;
      return `<div class="mp-v${vuota ? ' vuota' : ''}"${ed ? ' contenteditable="true"' : ''} data-i="${i}" data-j="${j}">${esc(testo || (vuota ? t('mp.scrivi') : ''))}</div>`
        + (modo === 'tu' && MP.aiuti[i] ? `<div class="mp-sugg">💡 ${esc(x)}</div>` : '');
    }).join('');
    const tasti = modo === 'mod' ? `<div class="mp-tasti mp-sel"><button data-a="voce" data-i="${i}">${esc(t('mp.voce'))}</button><button data-a="colore" data-i="${i}">${esc(t('mp.colore'))}</button><button data-a="togli" data-i="${i}" class="r">${esc(t('mp.togli'))}</button></div>` : '';
    const aiuto = modo === 'tu' ? `<div class="mp-tasti"><button data-a="aiuto" data-i="${i}">${esc(t(MP.aiuti[i] ? 'mp.aiuto.via' : 'mp.aiuto'))}</button><button data-a="detta" data-i="${i}" class="con-mic">${esc(t('mp.detta'))}</button></div>` : '';
    return `<div class="mp-t${scelto ? ' scelto' : ''}" style="--c:${c}" data-r="${i}"><div class="mp-tt"><button class="mp-ic" data-a="senti" data-i="${i}" title="${esc(t('mp.senti'))}">🔊</button><div class="mp-tit"${modo === 'mod' ? ' contenteditable="true"' : ''} data-i="${i}">${esc(r.titolo)}</div></div>${voci}${tasti}${aiuto}</div>`;
  };
  const meta = Math.ceil(d.rami.length / 2);
  const col = (da, a) => d.rami.slice(da, a).map((r, k) => tema(r, da + k)).join('');
  box.innerHTML = `<svg class="mp-fili" id="mpFili"></svg><div class="mp-col mp-sx">${col(meta, d.rami.length)}${modo === 'mod' ? `<button class="mp-agg" data-a="tema">${esc(t('mp.tema'))}</button>` : ''}</div>
    <div class="mp-centro"${modo === 'mod' ? ' contenteditable="true"' : ''} id="mpCen">${esc(d.centro)}</div><div class="mp-col mp-dx">${col(0, meta)}</div>`;
  requestAnimationFrame(mpFili);
  const tot = d.rami.reduce((s, r) => s + r.foglie.length, 0), fatte = d.rami.reduce((s, r) => s + r.mie.filter(x => x.trim()).length, 0);
  $('mpAiutoBox').classList.toggle('mod-on', modo !== 'vedi');
  $('mpAnn').disabled = !(MP.prima && MP.prima.length);
  $('mpAiuto').innerHTML = modo === 'tu' ? `${esc(t('mp.a.tu'))} <span class="mp-bar"><i style="width:${tot ? Math.round(fatte / tot * 100) : 0}%"></i></span> <b>${esc(t('mp.di', {a: fatte, b: tot}))}</b>` : esc(t(modo === 'mod' ? 'mp.a.mod' : 'mp.a.vedi'));
  $('mpPiede').textContent = t(modo === 'mod' ? 'mp.p.mod' : modo === 'tu' ? 'mp.p.tu' : 'mp.nota');
}
function mpScegli(i) {
  MP.sel = i;
  $('mpBox').querySelectorAll('.mp-t').forEach(x => x.classList.toggle('scelto', +x.dataset.r === i));
  requestAnimationFrame(mpFili);
}
function mpFili() {
  const box = $('mpBox'), s = $('mpFili'), cen = $('mpCen');
  if (!box || !s || !cen || getComputedStyle(s).display === 'none') return;
  const B = box.getBoundingClientRect(), C = cen.getBoundingClientRect();
  const cx = C.left + C.width / 2 - B.left, cy = C.top + C.height / 2 - B.top;
  s.innerHTML = [...box.querySelectorAll('.mp-t')].map(r => {
    const R = r.getBoundingClientRect(), x = R.left > C.left ? R.left - B.left : R.right - B.left, y = R.top + 22 - B.top;
    return `<path d="M${cx} ${cy} C ${(cx + x) / 2} ${cy}, ${(cx + x) / 2} ${y}, ${x} ${y}" stroke="${r.style.getPropertyValue('--c')}" stroke-width="3" fill="none" opacity=".5"/>`;
  }).join('');
}
window.addEventListener('resize', () => { if (pagina === 'mappa') mpFili(); });
function collegaMappa() {
  const box = $('mpBox');
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'), d = MP.dati;
    MP.giu = false;
    if (!d) return;
    if (!b) {
      const r = e.target.closest('.mp-t');
      // il tema si sceglie senza ridisegnare: così la parola toccata resta pronta da scrivere
      if (MP.modo === 'mod' && r && +r.dataset.r !== MP.sel) mpScegli(+r.dataset.r);
      const v = e.target.closest('.mp-v');
      if (MP.modo === 'vedi' && v) mpParla(v, v.textContent);
      return;
    }
    const a = b.dataset.a, i = +b.dataset.i, r = d.rami[i];
    if (a === 'senti') { const voci = MP.modo === 'tu' ? r.mie.filter(Boolean) : r.foglie; mpParla(b.closest('.mp-t'), [r.titolo, ...voci].join('. ')); return; }
    if (a === 'aiuto') { MP.aiuti[i] = !MP.aiuti[i]; disegnaMappa(); return; }
    // 🎙 Detta: quello che dici va nella prima voce ancora vuota del tema
    if (a === 'detta') { detta(b, tx => { const rr = MP.dati.rami[i], j = rr.mie.findIndex(x => !String(x || '').trim()); if (j < 0) { toast(t('mp.piene')); return; } mpRicorda(); rr.mie[j] = tx; mpSalva(); disegnaMappa(); }); return; }
    mpRicorda();
    if (a === 'voce') { r.foglie.push(t('mp.nuova')); r.mie.push(''); }
    if (a === 'colore') r.colore = (r.colore + 1) % COLORI_MAPPA.length;
    if (a === 'togli') { mpToast(t('mp.tolto', {x: r.titolo})); d.rami.splice(i, 1); MP.sel = -1; }
    if (a === 'tema') { d.rami.push({titolo: t('mp.nuovo'), foglie: ['…'], mie: [''], colore: d.rami.length % COLORI_MAPPA.length}); MP.sel = d.rami.length - 1; }
    mpSalva(); disegnaMappa();
  });
  // premendo un tasto mentre si scrive: non ridisegnare prima del clic, se no il tasto sparisce sotto il dito
  box.addEventListener('pointerdown', e => { MP.giu = !!e.target.closest('[data-a]'); });
  box.addEventListener('focusin', e => { const x = e.target; if (x.classList && x.classList.contains('vuota')) x.textContent = ''; });
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.isContentEditable) { e.preventDefault(); e.target.blur(); } });
  box.addEventListener('focusout', e => {
    const x = e.target, d = MP.dati;
    if (!d || !x.isContentEditable) return;
    const tx = x.textContent.replace(/\s+/g, ' ').trim(), prima = JSON.stringify(d);
    if (x.id === 'mpCen') d.centro = tx || d.centro;
    else if (x.classList.contains('mp-tit')) d.rami[+x.dataset.i].titolo = tx || d.rami[+x.dataset.i].titolo;
    else if (x.classList.contains('mp-v')) {
      const r = d.rami[+x.dataset.i], j = +x.dataset.j;
      if (MP.modo === 'tu') r.mie[j] = tx;
      else if (tx) r.foglie[j] = tx;
      else { mpToast(t('mp.tolta', {x: r.foglie[j]})); r.foglie.splice(j, 1); r.mie.splice(j, 1); }
    }
    const cambiato = JSON.stringify(d) !== prima;
    if (cambiato) { MP.prima = MP.prima || []; MP.prima.push(prima); if (MP.prima.length > 50) MP.prima.shift(); mpSalva(); }
    if (MP.giu) { $('mpAnn').disabled = !(MP.prima && MP.prima.length); return; }
    if (cambiato) disegnaMappa();
    else if (x.classList.contains('vuota') && !tx) x.textContent = t('mp.scrivi');
  });
  $('mpModi').onclick = e => {
    const b = e.target.closest('button'); if (!b || !MP.dati) return;
    MP.modo = b.dataset.m; MP.sel = -1;
    document.querySelectorAll('#mpModi button').forEach(x => x.classList.toggle('on', x === b));
    disegnaMappa();
  };
  $('mpAnn').onclick = mpAnnulla; $('mpToastB').onclick = mpAnnulla;
  $('mpIa').onclick = async () => {
    if (!MP.lez) return;
    const r = await A.mappa_ia(MP.lez.cartella);
    if (!r.ok) return;
    mpRicorda(); MP.dati = mpNorma(r.mappa); MP.sel = -1; mpSalva(); disegnaMappa(); mpToast(t('mp.rimessa'));
  };
  document.addEventListener('keydown', e => {
    if (pagina !== 'mappa' || (document.activeElement && document.activeElement.isContentEditable)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); mpAnnulla(); }
  });
}
/* ------------------------------------------------------------------ 🔊 Leggimi */
// PDF, foto di una pagina o testo incollato, letti a voce con la frase che si illumina. «Letti di recente» resta
// fuori dalle lezioni (nella cartella del programma): si riapre senza rifare niente e senza pagare di nuovo Claude.
const SUL_WEB = () => document.documentElement.classList.contains('web');
var LG = {attivo: false, v: null, pag: 0, frasi: [], i: 0, vel: 1};
function lgBriciole() {
  // nel percorso in alto, col testo aperto: «… › Leggimi › titolo»
  const br = $('v-lg').querySelector(':scope > .perc .briciole');
  if (br) { br.querySelectorAll('.lgbr').forEach(x => x.remove()); br.querySelectorAll('b.hidden').forEach(x => x.classList.remove('hidden')); }
  return br;
}
async function apriLeggimi() {
  lgFerma(); LG.v = null; lgBriciole();
  $('lgScelta').classList.remove('hidden'); $('lgLettore').classList.add('hidden');
  $('lgH').textContent = t('lg.h'); $('lgSub').textContent = t('lg.sub');
  $('lgFotoS').textContent = t(ANDROID ? 'lg.foto.s' : 'lg.foto.s.pc');
  disegnaFacilitata();
  const r = await A.leggimi_elenco();
  const el = (r && r.elenco) || [];
  const ico = {pdf: '📄', foto: '📷', testo: '📋'};
  $('lgRecenti').innerHTML = el.length ? `<div class="lbl" style="margin-top:18px">${esc(t('lg.recenti'))} <span class="hint" style="font-weight:400">${esc(t('lg.recenti.s'))}</span></div>` +
    el.map(v => `<div class="lgrec">${ico[v.tipo] || '📄'}<span class="sp"><b>${esc(v.titolo)}</b> <span class="hint">· ${esc(v.n === 1 ? t('lg.pagina1') : t('lg.pagine', {n: v.n}))} · ${esc(quandoBreve(v.quando))}</span></span>
      <button class="btn b-ghost b-sm" data-ap="${esc(v.id)}">${esc(t('lg.riapri'))}</button><button class="lgx" data-via="${esc(v.id)}" title="${esc(t('lg.togli'))}">✕</button></div>`).join('') : '';
  $('lgRecenti').querySelectorAll('[data-ap]').forEach(b => b.onclick = async () => { const x = await A.leggimi_apri(b.dataset.ap); if (x.ok) lgMostra(x.voce); else toast(x.msg || ''); });
  $('lgRecenti').querySelectorAll('[data-via]').forEach(b => b.onclick = async () => { await A.leggimi_togli(b.dataset.via); apriLeggimi(); });
}
function quandoBreve(iso) {
  try { const d = new Date(iso), oggi = new Date(); const g = Math.round((new Date(oggi.toDateString()) - new Date(d.toDateString())) / 864e5);
    if (g === 0) return t('lg.oggi'); if (g === 1) return t('lg.ieri'); return d.toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {day: 'numeric', month: 'short'}); } catch (e) { return ''; }
}
const lgSpesa = x => x < 0.01 ? t('lg.spesa0') : t('lg.spesa', {c: num(x.toFixed(2))});
function lgAttesa(testo) { $('lgRecenti').innerHTML = `<div class="row mt" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(testo)}</div>`; }
async function lgDaFile(f) {
  // versione web: il file si sceglie nella pagina e arriva al motore come testo base64
  const b64 = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(f); });
  lgAttesa(t(/\.pdf$/i.test(f.name) ? 'lg.lav.pdf' : 'lg.lav.foto'));
  lgFatto(await A.leggimi_file(f.name, b64));
}
function lgFatto(r) {
  if (!r || !r.ok) { if (r && r.msg) dialogo({titolo: t('lg.nome'), testo: r.msg}); apriLeggimi(); return; }
  if (r.spesa) toast(lgSpesa(r.spesa));
  lgMostra(r.voce);
}
async function lgScegliPdf() {
  if (SUL_WEB()) { $('lgFile').accept = '.pdf'; $('lgFile').click(); return; }
  const f = await A.scegli_pdf();
  if (!f || !f.ok) { if (f && f.msg) dialogo({titolo: t('lg.nome'), testo: f.msg}); return; }
  lgAttesa(t('lg.lav.pdf'));
  lgFatto(await A.leggimi_pdf(f.percorso, f.nome));
}
async function lgScegliFoto() {
  if (SUL_WEB()) { $('lgFile').accept = 'image/*'; $('lgFile').click(); return; }
  let s;
  if (ANDROID) {
    const come = await dialogo({titolo: t('lg.foto'), testo: t('lg.foto.come'), bottoni: [{t: t('lg.foto.galleria'), v: 'g'}, {t: t('lg.foto.scatta'), cls: 'b-main', v: 's'}]});
    if (!come) return;
    s = come === 's' ? await A.scatta_foglio() : await A.scegli_immagini();
  } else s = await A.scegli_immagini();
  const per = s && (s.percorsi || (s.percorso ? [s.percorso] : []));
  if (!s || !s.ok || !per || !per.length) return;
  lgAttesa(t('lg.lav.foto'));
  lgFatto(await A.leggimi_foto(per));
}
async function lgIncolla() {
  const p = dialogo({titolo: t('lg.incolla.t'), testo: t('lg.incolla.q'), html: `<textarea class="in" id="lgIn" rows="8" style="margin-top:10px;resize:vertical"></textarea>`,
    bottoni: [{t: t('annulla'), v: false}, {t: t('lg.incolla.si'), cls: 'b-main', v: true}]});
  setTimeout(() => $('lgIn') && $('lgIn').focus(), 60);
  if (!await p) return;
  lgFatto(await A.leggimi_testo(dialogo.area || ''));
}
function lgMostra(v) {
  lgFerma(); LG.v = v; LG.pag = Math.min(v.pag || 0, v.pagine.length - 1);
  $('lgScelta').classList.add('hidden'); $('lgLettore').classList.remove('hidden');
  $('lgH').textContent = v.titolo;
  // nel percorso in alto compare anche il titolo: «Spazio DSA › Leggimi › …»
  const br = lgBriciole();
  if (br) {
    br.querySelector('b:not(.lgbr)').classList.add('hidden');
    br.insertAdjacentHTML('beforeend', `<a class="lgbr">${esc(t('lg.nome'))}</a><span class="sep lgbr">›</span><b class="lgbr">${esc(corto(v.titolo, 40))}</b>`);
    br.querySelector('a.lgbr').onclick = () => apriLeggimi();
  }
  lgVel(); lgPagina();
}
function lgVel() { $('lgVel').querySelectorAll('span').forEach(s => s.classList.toggle('on', +s.dataset.v === LG.vel)); }
function lgPlayTesto() { $('lgPlay').textContent = t(LG.attivo ? 'as.pausa' : LG.i > 0 ? 'as.continua' : 'as.leggi'); }
async function lgPagina() {
  const v = LG.v, n = v.pagine.length, testo = v.pagine[LG.pag] || '';
  $('lgPag').classList.toggle('hidden', n < 2);
  $('lgPagN').textContent = t('lg.pagn', {a: LG.pag + 1, b: n});
  $('lgPrima').disabled = LG.pag === 0; $('lgDopo').disabled = LG.pag >= n - 1;
  $('lgSub').textContent = v.tipo === 'pdf' ? t('lg.sub.pdf', {a: LG.pag + 1, b: n}) : v.tipo === 'foto' ? t('lg.sub.foto', {n: n === 1 ? t('lg.pagina1') : t('lg.pagine', {n})}) : t('lg.sub.testo');
  A.leggimi_segna(v.id, LG.pag);
  LG.i = 0; LG.frasi = [];
  if (!testo.trim()) {
    $('lgTesto').innerHTML = v.tipo === 'pdf' ? `<div class="lgscan"><div>${esc(t('lg.scan'))}</div><button class="btn b-main b-sm mt" id="lgScan">${esc(t('lg.scan.b'))}</button> <span class="hint">${esc(t('lg.scan.c'))}</span></div>` : `<div class="hint">${esc(t('lg.vuota'))}</div>`;
    if ($('lgScan')) $('lgScan').onclick = async () => {
      $('lgTesto').innerHTML = `<div class="row" style="gap:10px;color:var(--mut)"><span class="spin"></span>${esc(t('lg.lav.pag'))}</div>`;
      const r = await A.leggimi_pagina(v.id, LG.pag);
      if (LG.v !== v) return;
      if (!r.ok) { dialogo({titolo: t('lg.nome'), testo: r.msg || ''}); v.pagine[LG.pag] = ''; return lgPagina(); }
      v.pagine[LG.pag] = r.testo; if (r.spesa) toast(lgSpesa(r.spesa));
      lgPagina();
    };
    lgPlayTesto(); return false;
  }
  let k = 0;
  $('lgTesto').innerHTML = testo.split(/\n{2,}/).map(par => `<p>${par.split(/(?<=[.?!;:])\s+|\n/).filter(x => x.trim()).map(f => `<span class="fr" data-n="${k++}">${esc(f)}</span>`).join(' ')}</p>`).join('');
  LG.frasi = [...$('lgTesto').querySelectorAll('.fr')];
  LG.frasi.forEach((x, j) => x.onclick = () => lgLeggi(j));
  silabizza($('lgTesto'));
  lgPlayTesto(); return true;
}
function lgSegna(k) { LG.frasi.forEach((x, j) => x.classList.toggle('ora', j === k)); if (LG.frasi[k]) LG.frasi[k].scrollIntoView({block: 'center', behavior: 'smooth'}); }
async function lgLeggi(k) {
  if (!voceDisponibile()) { toast(t('as.novoce')); return; }
  voceFerma();
  const giro = {}; LG.giro = giro; LG.attivo = true; LG.i = Math.max(0, k); lgPlayTesto();
  while (LG.giro === giro) {
    if (LG.i >= LG.frasi.length) {                    // fine pagina: si passa da soli alla prossima (se ha testo)
      if (LG.pag < LG.v.pagine.length - 1) { LG.pag++; if (await lgPagina()) { LG.attivo = true; lgPlayTesto(); continue; } }
      break;
    }
    lgSegna(LG.i);
    const ok = await voceParla(LG.frasi[LG.i].textContent, LG.vel);
    if (LG.giro !== giro) return;
    if (!ok) { LG.attivo = false; lgPlayTesto(); if (LG.i === k) toast(t('as.novoce')); return; }
    LG.i++;
  }
  if (LG.giro === giro) { LG.attivo = false; LG.i = 0; lgSegna(-1); lgPlayTesto(); }
}
function lgFerma() { LG.giro = null; if (LG.attivo) voceFerma(); LG.attivo = false; if ($('lgPlay')) lgPlayTesto(); }
function collegaLeggimi() {
  $('lgPdf').onclick = lgScegliPdf; $('lgFoto').onclick = lgScegliFoto; $('lgIncolla').onclick = lgIncolla;
  $('lgFile').onchange = () => { const f = $('lgFile').files[0]; $('lgFile').value = ''; if (f) lgDaFile(f); };
  $('lgPlay').onclick = () => { if (!LG.frasi.length) return; if (LG.attivo) lgFerma(); else lgLeggi(LG.i); };
  $('lgVel').onclick = e => { const s = e.target.closest('span[data-v]'); if (!s) return; LG.vel = +s.dataset.v; lgVel(); if (LG.attivo) lgLeggi(LG.i); };
  $('lgPrima').onclick = () => { if (LG.pag > 0) { lgFerma(); LG.pag--; lgPagina(); } };
  $('lgDopo').onclick = () => { if (LG.pag < LG.v.pagine.length - 1) { lgFerma(); LG.pag++; lgPagina(); } };
}

/* ------------------------------------------------------------------ 🎙 Scrivi parlando */
var DP = {prima: null};
function apriDetta() { disegnaFacilitata(); $('dpH').textContent = t('dp.h1'); setTimeout(() => $('dpTx').focus(), 50); }
function collegaDetta() {
  const tx = $('dpTx');
  $('dpMic').onclick = () => detta($('dpMic'), tx, on => { $('dpH').textContent = t(on ? 'dp.h2' : 'dp.h3'); });
  $('dpRileggi').onclick = () => { if (!tx.value.trim()) return toast(t('dp.vuoto')); voceFerma(); voceParla(tx.value.trim()); };
  $('dpCopia').onclick = () => {
    if (!tx.value.trim()) return toast(t('dp.vuoto'));
    const fatto = () => toast(t('dp.copiato'));
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(tx.value).then(fatto, () => { tx.focus(); tx.select(); document.execCommand('copy'); fatto(); }); return; } } catch (e) {}
    tx.focus(); tx.select(); try { document.execCommand('copy'); } catch (e) {} fatto();
  };
  $('dpSistema').onclick = async () => {
    if (!tx.value.trim()) return toast(t('dp.vuoto'));
    const b = $('dpSistema'), prima = tx.value; b.disabled = true; b.textContent = t('dp.lav');
    const r = await A.detta_sistema(prima);
    b.disabled = false; b.textContent = t('dp.sistema');
    if (!r.ok) { dialogo({titolo: t('dp.nome'), testo: r.msg || ''}); return; }
    DP.prima = prima; tx.value = r.testo; dpAvviso(t('dp.sistemato'));
  };
  $('dpSvuota').onclick = () => { if (!tx.value.trim()) return; DP.prima = tx.value; tx.value = ''; dpAvviso(t('dp.svuotato')); };
}
function dpAvviso(x) {
  // come nella mappa: l'avviso col tasto Annulla (si torna al testo di prima)
  $('mpToastT').textContent = x; $('mpToast').classList.add('v');
  $('mpToastB').onclick = () => { if (DP.prima != null) { $('dpTx').value = DP.prima; DP.prima = null; } mpToastVia(); $('mpToastB').onclick = mpAnnulla; };
  clearTimeout(MP_TT); MP_TT = setTimeout(() => { mpToastVia(); $('mpToastB').onclick = mpAnnulla; }, 6000);
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
  $('swFac').onclick = $('asFac').onclick = cambiaDsa;
  document.querySelectorAll('[data-dsa]').forEach(x => x.onclick = cambiaDsa);
  $('lzAltro').onclick = e => LEZ && menuLezione(LEZ, e.currentTarget, true);
  collegaPodcast();
  collegaKaraoke();
  collegaVerifica();
  collegaGlossario();
  collegaTutor();
  $('lFoto').onclick = scattaFotoLive;
  $('swRum').onclick = async () => { R.aula_rumorosa = !R.aula_rumorosa; $('swRum').classList.toggle('on', R.aula_rumorosa); await A.imposta('aula_rumorosa', R.aula_rumorosa); };
  $('scScatta').onclick = () => scrittiAggiungi(true);
  $('scScegli').onclick = () => scrittiAggiungi(false);
  collegaHoPronto();
  $('chMic').onclick = () => detta($('chMic'), $('chIn'));
  $('asPlay').onclick = asPlay; $('asStop').onclick = () => asFerma(true);
  $('asVel').querySelectorAll('span').forEach(s => s.onclick = () => { AS.vel = +s.dataset.v; disegnaVel(); if (AS.attivo) asLeggi(AS.i); });
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
  $('mpPdf').onclick = async () => { if (!MP.dati) return; clearTimeout(MP_SALVA); await A.mappa_salva(MP.lez.cartella, MP.dati); await A.mappa_pdf(MP.lez.cartella, true, MP.modo === 'tu'); };
  collegaMappa(); collegaLeggimi(); collegaDetta(); collegaAa();
  $('mpRifai').onclick = async () => { if (MP.lez && await conferma(t('mp.rifai.t'), t('mp.rifai.c'))) apriMappa(MP.lez, true); };
}

/* ------------------------------------------------------------------ ripasso (flashcard) */
// Le domande sono quelle gia' negli appunti: niente Claude, niente costi.
let materiaRip = null;
var RP = {carte: [], i: 0, ok: 0, no: [], titolo: '', cartelle: []};
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
  $('rpAnki').onclick = () => esportaAnki(m.cartelle, m.m, modoRip);
  $('rpAnnulla').onclick = () => vai('arch');
  mostraRip('rpScelta'); vai('rip');
}
// «⬇ Esporta per Anki»: le carte scelte in un file .apkg (anki.py); si riesporta e Anki aggiorna, senza doppioni
async function esportaAnki(cartelle, titolo, modo) {
  const b = $('rpAnki'); b.disabled = true;
  let r;
  try { r = await A.anki(cartelle, titolo, modo); } finally { b.disabled = false; }
  if (!r.ok) { dialogo({titolo: t('rp.anki'), testo: r.msg || ''}); return; }
  if (ANDROID) toast(t('rp.anki.tel', {n: r.n}));
  else dialogo({titolo: '✓ ' + t('rp.anki.ok', {n: r.n}), testo: t(r.aperto ? 'rp.anki.aperto' : 'rp.anki.manca')});
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
  document.querySelectorAll('#carta .ascolta').forEach(b => b.remove());
  const bF = document.createElement('button'), bR = document.createElement('button');
  [bF, bR].forEach(b => { b.className = 'btn b-ghost ascolta solo-dsa'; b.textContent = t('tc.ascolta'); b.style.marginTop = '10px'; });
  bF.onclick = e => { e.stopPropagation(); voceParla(c.domanda); };
  bR.onclick = e => { e.stopPropagation(); voceParla([...c.schema, ...(c.aggiunte || [])].join('. ')); };
  document.querySelector('#carta .fronte').appendChild(bF); document.querySelector('#carta .retro').appendChild(bR);
  cartaGiorno(c);
  silabizza($('carta'));
  const mat = c.materia || (LZ && (LZ.lezioni.find(x => x.cartella === c.cartella) || {}).materia) || (RP.glossario && GL.m && GL.m.m) || '';
  lbRif(document.querySelector('#carta .retro'), mat, c.domanda + ' ' + (c.schema || []).join(' '));
}
function giraRip() { if (RP.giorno && RP.modo === 'croc' && !RP.risposto && RP.carte[RP.i] && RP.carte[RP.i].opzioni) return; $('carta').classList.toggle('giro'); $('voto').classList.add('on'); }
function votoRip(v) {
  if (RP.i >= RP.carte.length) return;
  const c = RP.carte[RP.i];
  if (c.cartella) A.ripasso_voto(c.cartella, c.id, !!v);
  if (v) RP.ok++; else RP.no.push(c);
  RP.i++;
  if (RP.i >= RP.carte.length) fineRip(); else cartaRip();
}
function fineRip() {
  const n = RP.i;
  if (!n) { if (RP.giorno) apriRipassoGiorno(); else if (RP.glossario) vai('gl'); else vai('arch'); return; }
  $('rN').textContent = RP.ok + '/' + n; $('anello').style.setProperty('--p', (RP.ok / n * 100) + '%');
  $('rT').textContent = RP.ok === n ? t('rp.r.tutte') : RP.ok >= n / 2 ? t('rp.r.bene') : t('rp.r.dai');
  $('rL').innerHTML = RP.no.length ? `<div class="lbl">${t('rp.r.lista')}</div>` + RP.no.map(c => `<div>${esc(c.domanda)}<span class="hint" style="display:block">${esc(c.lezione)}${c.slide_n ? ' · slide ' + c.slide_n : ''}</span></div>`).join('') : '';
  $('rAncora').classList.toggle('hidden', !RP.no.length);
  mostraRip('rpRis');
  if (RP.giorno) fineGiorno();
}
function collegaRipasso() {
  $('carta').onclick = giraRip;
  $('vNo').onclick = () => votoRip(0); $('vSi').onclick = () => votoRip(1);
  $('rpBasta').onclick = fineRip;
  $('rFine').onclick = () => RP.giorno ? apriRipassoGiorno() : RP.glossario ? vai('gl') : vai('arch');
  $('rgMic').onclick = rgMic; $('rgRileggi').onclick = () => { const c = RP.carte[RP.i]; if (c) voceParla(c.domanda); };
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
