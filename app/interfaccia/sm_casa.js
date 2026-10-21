'use strict';
/* Scripta Manent — «I miei strumenti», la casa (stile professionale).
   In alto quello che conta oggi (da fare, verifica in arrivo, ultima lezione), sotto tutti gli strumenti divisi in schede.
   Regola dei clic: riga con › = apre; cerchio = spunta; pulsante verde pieno = azione principale.
   Vale solo in Scripta Manent: Verba Manent continua a usare lo Spazio DSA di app.js. */

const SMC_T = {
  it: {
    'oggi.n': 'Oggi hai {n} cose da fare', 'oggi.1': 'Oggi hai 1 cosa da fare', 'oggi.0': 'Oggi non hai niente da fare',
    'fare.h': 'Da fare oggi', 'fare.tutti': 'Tutti i compiti', 'fare.s': 'In ordine, dal più urgente', 'fare.vuoto': 'Niente per oggi e domani.',
    'fare.inizia': 'Inizia dal primo', 'rg': 'Ripasso del giorno', 'rg.n': '{n} carte', 'rg.fatto': 'fatto', 'rg.0': 'niente da ripassare',
    'per.oggi': 'per oggi', 'per.domani': 'per domani', 'scaduto': 'era per {d}',
    'ver.h': 'Verifica in arrivo', 'ver.tag': 'Verifica', 'int.tag': 'Interrogazione', 'ver.gg': 'giorni', 'ver.g1': 'giorno', 'ver.oggi': 'oggi',
    'ver.ripassa': 'Ripassa oggi', 'ver.scheda': 'Apri la scheda', 'ver.vuota': 'Nessuna verifica nei prossimi giorni.', 'ver.metti': 'Segna una verifica',
    'ul.h': 'Ultima lezione', 'ul.tutte': 'Tutte', 'ul.vuota': 'Ancora nessuna lezione pronta.', 'ul.reg': 'Registra la prima',
    'q.asc': 'Ascolta', 'q.mappa': 'Mappa', 'q.flash': 'Flashcard', 'q.chiedi': 'Chiedi', 'q.pod': 'Podcast', 'q.kar': 'Karaoke',
    'str.h': 'Tutti gli strumenti', 'str.per': 'Per la lezione',
    't.aula': 'In aula', 't.dopo': 'Dopo la lezione', 't.casa': 'A casa', 't.ver': 'Per la verifica', 't.doc': 'Per docente e famiglia',
    'annullato': 'Fatto: {c}', 'cosa': 'Cosa vuol dire', 'segna': 'Segna come fatto',
  },
  en: {
    'oggi.n': 'Today you have {n} things to do', 'oggi.1': 'Today you have 1 thing to do', 'oggi.0': 'Nothing to do today',
    'fare.h': 'To do today', 'fare.tutti': 'All homework', 'fare.s': 'Most urgent first', 'fare.vuoto': 'Nothing for today and tomorrow.',
    'fare.inizia': 'Start with the first', 'rg': 'Daily review', 'rg.n': '{n} cards', 'rg.fatto': 'done', 'rg.0': 'nothing to review',
    'per.oggi': 'for today', 'per.domani': 'for tomorrow', 'scaduto': 'was for {d}',
    'ver.h': 'Test coming up', 'ver.tag': 'Test', 'int.tag': 'Oral test', 'ver.gg': 'days', 'ver.g1': 'day', 'ver.oggi': 'today',
    'ver.ripassa': 'Review today', 'ver.scheda': 'Open the card', 'ver.vuota': 'No tests in the next days.', 'ver.metti': 'Add a test',
    'ul.h': 'Last lesson', 'ul.tutte': 'All', 'ul.vuota': 'No lesson ready yet.', 'ul.reg': 'Record the first one',
    'q.asc': 'Listen', 'q.mappa': 'Map', 'q.flash': 'Flashcards', 'q.chiedi': 'Ask', 'q.pod': 'Podcast', 'q.kar': 'Karaoke',
    'str.h': 'All tools', 'str.per': 'For the lesson',
    't.aula': 'In class', 't.dopo': 'After the lesson', 't.casa': 'At home', 't.ver': 'For the test', 't.doc': 'For teacher and family',
    'annullato': 'Done: {c}', 'cosa': 'What it means', 'segna': 'Mark as done',
  },
};
function tc(k, p) {
  let s = (SMC_T[LINGUA] && SMC_T[LINGUA][k]) ?? SMC_T.it[k] ?? k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
}
const smIco = id => `<svg width="17" height="17"><use href="#${id}"/></svg>`;
const SMC = {tab: 'aula', comp: null, rg: null};

/* ------------------------------------------------------------------ solo titoli: le spiegazioni piccole diventano (i) */
// Le righe di spiegazione sotto i titoli si nascondono; accanto al titolo compare (i): al tocco si legge e si ascolta.
// Restano le informazioni brevi con i numeri (date, minuti, carte): sono dati, non spiegazioni.
const SM_SPIEGA = '.smi-card .set .t > span:not([id]), .smi-sez .aiopt > small, .side .brand small, .tile small, .sml-gc small.sp, .smr-mom small.sp, .smx-ft small.sp, .smx-ft small:not(.dato), .pg .hd p, .smfm .sp > .hint';
// spiegazioni scritte piccole nelle pagine che arrivano da Verba Manent: anche loro diventano (i)
function smSpiegazioniPiccole(radice) {
  const out = [];
  (radice || document).querySelectorAll('small, .sp, .hint, .tx, p, span, div').forEach(el => {
    if (el.dataset.st || el.offsetParent === null || el.closest('.velo, .dlg, .info-pop, .smi-card, .side, .chat, .msg, .bolla, svg, .stx, .karaoke, .kar, .carta, .flash, .rip-c, table')) return;
    if ([...el.children].some(c => !['B', 'I', 'EM', 'STRONG', 'BR', 'A', 'SPAN'].includes(c.tagName))) return;   // solo testo
    const testo = el.textContent.trim();
    if (testo.length < 35 || !/\s/.test(testo) || parseFloat(getComputedStyle(el).fontSize) >= 15) return;
    const pa = el.parentElement; if (!pa) return;
    const tit = [...pa.children].find(c => c !== el && /^(B|STRONG|H3|H4)$/.test(c.tagName) && c.textContent.trim());
    if (tit) out.push(el);
  });
  return out;
}
function smInfoGiro(radice) {
  if (typeof SCRIPTA === 'undefined' || !SCRIPTA) return;
  const tutti = [...(radice || document).querySelectorAll(SM_SPIEGA)];
  try { tutti.push(...smSpiegazioniPiccole(radice)); } catch (e) {}
  tutti.forEach(el => {
    if (el.dataset.st) return;
    el.dataset.st = 1;
    const testo = el.textContent.trim();
    if (!testo || (/\d/.test(testo) && testo.length < 60 && !el.classList.contains('sp') && !el.closest('.brand'))) return;
    el.classList.add('st-nasc');
    const tit = el.parentElement.querySelector(':scope > b') || el.parentElement.querySelector('b') || el.parentElement.querySelector('h2');
    const i = document.createElement('span');
    i.className = 'info-i'; i.setAttribute('role', 'button'); i.title = tc('cosa'); i.textContent = 'i';
    i.onclick = ev => {
      ev.stopPropagation(); ev.preventDefault(); smInfoChiudi();
      const r = i.getBoundingClientRect(), pp = document.createElement('div');
      const nome = tit ? [...tit.childNodes].filter(n => !(n.classList && n.classList.contains('info-i'))).map(n => n.textContent).join('').trim() : '';
      const ora = el.textContent.trim() || testo;
      pp.className = 'info-pop'; pp.innerHTML = `<b>${esc(nome || tc('cosa'))}</b>${esc(ora)}`;
      document.body.appendChild(pp);
      pp.style.left = Math.max(8, Math.min(innerWidth - pp.offsetWidth - 8, r.left - 20)) + 'px';
      pp.style.top = Math.min(innerHeight - pp.offsetHeight - 8, r.bottom + 8) + 'px';
      try { voceFerma(); voceParla(ora, (R && R.sm_voce_vel) || 0.9); } catch (e) {}
    };
    // un titolo con data-t si ritraduce (textContent): la (i) va accanto, non dentro
    if (tit && (tit.hasAttribute('data-t') || tit.querySelector('[data-t]'))) tit.after(i); else (tit || el.parentElement).appendChild(i);
  });
}
// nessuna scritta sotto i 15 px (regola di Scripta Manent): quello che resta piccolo si ingrandisce
function smTestoGrande(radice) {
  if (typeof SCRIPTA === 'undefined' || !SCRIPTA || !radice) return;
  const w = document.createTreeWalker(radice, NodeFilter.SHOW_TEXT);
  const visti = new Set(); let n;
  while ((n = w.nextNode())) {
    const el = n.parentElement;
    if (!el || visti.has(el) || !n.textContent.trim()) continue;
    visti.add(el);
    if (el.closest('kbd, svg, .info-i, .recdot, .lmsf, .an-graf, canvas') || el.classList.contains('st-nasc')) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < 15) el.style.fontSize = '15px';
  }
}
function smInfoChiudi() { document.querySelectorAll('.info-pop').forEach(x => x.remove()); }
document.addEventListener('click', smInfoChiudi);

/* ------------------------------------------------------------------ la casa */
function smCasaPrepara() {
  if (typeof SCRIPTA === 'undefined' || !SCRIPTA) return;
  disegnaSpazioDsa = smCasa;           // al posto dello Spazio DSA di Verba Manent (e dei riquadri verifica sopra)
  const sec = $('v-dsa');
  if (sec) sec.classList.add('smcasa');
  smInfoGiro(document.querySelector('.side'));
  if (!(typeof ANDROID !== 'undefined' && ANDROID)) smTestoGrande(document.querySelector('.side'));   // sul telefono la barra in basso resta com'è
  // le pagine si ridisegnano da sole (dati che arrivano, finestre): ogni volta si ricontrolla, con calma
  let attesa = null;
  new MutationObserver(() => {
    if (attesa) return;                 // al massimo una volta al secondo (la pagina di registrazione cambia di continuo)
    attesa = setTimeout(() => {
      attesa = null;
      const s = document.querySelector('#main > section.pg:not(.hidden)'); if (s) { smInfoGiro(s); smTestoGrande(s); }
      document.querySelectorAll('.velo .dlg').forEach(smTestoGrande);
    }, 1000);
  }).observe(document.body, {childList: true, subtree: true});
  if (typeof smLezioniPrepara === 'function') smLezioniPrepara();
  if (typeof smRegistraAttiva === 'function') smRegistraAttiva();
  if (typeof smStudiaPrepara === 'function') smStudiaPrepara();
  if (typeof smImpAttiva === 'function') smImpAttiva();
  if (typeof LZ !== 'undefined' && LZ) { smlCaricaExtra().then(() => { try { disegnaLezioni(); } catch (e) {} }); }
  // ogni pagina che si apre: le spiegazioni diventano (i) (anche quelle che arrivano dopo, con i dati)
  const vaiPrima = vai;
  vai = function (p, tornando) {
    const r = vaiPrima.apply(this, arguments);
    const giro = () => { const s = document.querySelector('#main > section.pg:not(.hidden)'); if (s) { smInfoGiro(s); smTestoGrande(s); } };
    setTimeout(giro, 0); setTimeout(giro, 700); setTimeout(giro, 2000);
    return r;
  };
}
function smDataLunga() {
  const s = new Date().toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {weekday: 'long', day: 'numeric', month: 'long'});
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function smGg(iso) { return typeof smGiorni === 'function' ? smGiorni(iso) : Math.round((new Date(iso) - new Date(new Date().toDateString())) / 864e5); }

async function smCasa() {
  if (!LZ) await caricaLezioni();
  if (pagina !== 'dsa') return;
  const [rc, rg] = await Promise.all([A.sm_compiti(), A.ripasso_giorno(false, true)]);
  if (pagina !== 'dsa') return;
  SMC.comp = (rc && rc.compiti) || []; SMC.rg = rg && rg.ok ? rg : null;
  if (rc && rc.oggi) SMS.oggi = rc.oggi;
  const lz = lezioniDsa();
  // lezione scelta per gli strumenti (una sola tendina: materia · lezione · quando)
  if (!lz.some(l => l.cartella === SD.c)) SD.c = lz.length ? lz[0].cartella : null;
  const l = lz.find(x => x.cartella === SD.c) || null;
  SD.l = l; SD.m = l ? (l.materia || '') : '';
  SD.mat = SD.m ? materieStudia().find(x => x.m.toLowerCase() === SD.m.toLowerCase()) : null;

  // --- da fare oggi: compiti per oggi/domani (e quelli rimasti indietro), poi il ripasso del giorno
  const fare = SMC.comp.filter(v => !v.fatto && v.tipo === 'compito' && v.per && smGg(v.per) <= 1)
    .sort((a, b) => a.per.localeCompare(b.per)).slice(0, 4);
  const rgN = SMC.rg ? SMC.rg.carte : 0, rgFatto = SMC.rg && !rgN && SMC.rg.totale;
  const quanti = fare.length + (rgN ? 1 : 0);
  const perQ = v => { const g = smGg(v.per); return g === 0 ? tc('per.oggi') : g === 1 ? tc('per.domani') : tc('scaduto', {d: smData(v.per)}); };
  const rigaFare = fare.map(v => `<div class="smc-r" data-id="${esc(v.id)}"><button class="smx-cer" data-a="fatto" aria-label="${esc(tc('segna'))}"></button>
      <button class="smc-rt" data-a="apri"><b>${esc(v.cosa)}</b><small class="dato">${esc([v.materia, perQ(v)].filter(Boolean).join(' · '))}</small></button><span class="smx-chev">›</span></div>`).join('')
    + (SMC.rg && (rgN || rgFatto) ? `<div class="smc-r" data-rg="1"><span class="smx-cer${rgFatto ? ' si' : ''}">${rgFatto ? '✓' : ''}</span>
      <button class="smc-rt" data-a="rg"><b>${esc(tc('rg'))}</b><small class="dato">${esc(rgFatto ? tc('rg.fatto') : tc('rg.n', {n: rgN}))}</small></button><span class="smx-chev">›</span></div>` : '');

  // --- verifica in arrivo: la piu' vicina tra verifiche e interrogazioni segnate
  const ver = SMC.comp.filter(v => !v.fatto && v.tipo !== 'compito' && v.per && smGg(v.per) >= 0).sort((a, b) => a.per.localeCompare(b.per))[0];
  const gv = ver ? smGg(ver.per) : 0;

  // --- ultima lezione
  const ul = lz[0];

  const box = $('sdBox');
  box.innerHTML = `
    <div class="smc-testa"><div class="smc-data">${esc(smDataLunga())}</div>
      <h1 class="smc-oggi">${esc(quanti === 0 ? tc('oggi.0') : quanti === 1 ? tc('oggi.1') : tc('oggi.n', {n: quanti}))}</h1></div>
    <div class="smc-pann">
      <section class="smc-p"><h2>${esc(tc('fare.h'))}<button class="smc-link" data-a="comp">${esc(tc('fare.tutti'))} ›</button></h2>
        <div class="smc-righe">${rigaFare || `<div class="hint" style="padding:10px 0">${esc(tc('fare.vuoto'))}</div>`}</div>
        ${quanti ? `<button class="btn b-main b-sm smc-vai" data-a="primo"><svg width="14" height="14"><use href="#i-play"/></svg>${esc(tc('fare.inizia'))}</button>` : ''}</section>
      <section class="smc-p">${ver ? `<h2>${esc(tc('ver.h'))}<span class="smx-chip amb">${esc(tc(ver.tipo === 'interrogazione' ? 'int.tag' : 'ver.tag'))}</span></h2>
        <div class="smc-mat">${esc(ver.materia || '—')}</div>
        <div class="smc-gg"><b>${gv === 0 ? esc(tc('ver.oggi')) : gv}</b>${gv ? ` ${esc(tc(gv === 1 ? 'ver.g1' : 'ver.gg'))}` : ''} · ${esc(smData(ver.per))}</div>
        <div class="smc-cosa">${esc(ver.cosa)}</div>
        <div class="smc-az"><button class="btn b-sm smc-amb" data-a="ripver">${esc(tc('ver.ripassa'))}</button><button class="btn b-ghost b-sm" data-a="comp">${esc(tc('ver.scheda'))}</button></div>`
        : `<h2>${esc(tc('ver.h'))}</h2><div class="hint" style="padding:10px 0">${esc(tc('ver.vuota'))}</div><div class="smc-az"><button class="btn b-ghost b-sm" data-a="comp">${esc(tc('ver.metti'))} ›</button></div>`}</section>
      <section class="smc-p">${ul ? `<h2>${esc(tc('ul.h'))}<button class="smc-link" data-a="arch">${esc(tc('ul.tutte'))} ›</button></h2>
        <div class="smc-mat">${esc([ul.materia, ul.quando, ul.durata].filter(Boolean).join(' · '))}</div><div class="smc-lez">${esc(ul.nome)}</div>
        <div class="smc-rapide">${[['ascolta', 'g-voce', 'q.asc', ul.n_appunti], ['mappa', 'i-map', 'q.mappa', ul.trascritta], ['ripassa', 'i-cards', 'q.flash', ul.n_appunti],
          ['chiedi', 'i-chat', 'q.chiedi', ul.trascritta], ['podcast', 'g-cuffie', 'q.pod', ul.trascritta], ['karaoke', 'g-kar', 'q.kar', ul.trascritta]]
          .map(([a, i, k, ok]) => `<button class="btn b-ghost b-sm" data-ul="${a}"${ok ? '' : ' disabled'}>${smIco(i)}${esc(tc(k))}</button>`).join('')}</div>`
        : `<h2>${esc(tc('ul.h'))}</h2><div class="hint" style="padding:10px 0">${esc(tc('ul.vuota'))}</div><div class="smc-az"><button class="btn b-main b-sm" data-a="reg">${esc(tc('ul.reg'))}</button></div>`}</section>
    </div>
    <div class="smc-str"><div class="smc-strt"><h2>${esc(tc('str.h'))}</h2>
      ${lz.length ? `<label class="smc-per">${esc(tc('str.per'))}<select id="smcLez">${lz.map(x => `<option value="${esc(x.cartella)}"${x.cartella === SD.c ? ' selected' : ''}>${esc([x.materia, x.materia ? mvSenzaMateria(x.nome, x.materia) : x.nome, x.quando].filter(Boolean).join(' · '))}</option>`).join('')}</select></label>` : ''}</div>
      <div class="smx-tabs" id="smcTabs"></div><div id="smcCorpo"></div></div>`;
  smCasaStrumenti();

  box.querySelectorAll('[data-a]').forEach(b => b.onclick = ev => {
    const a = b.dataset.a, riga = b.closest('.smc-r'), v = riga && SMC.comp.find(x => x.id === riga.dataset.id);
    if (a === 'comp') return vai('smcomp');
    if (a === 'arch') return vai('arch');
    if (a === 'reg') return vai('reg');
    if (a === 'rg') return apriRipassoGiorno();
    if (a === 'ripver') return smRipassa(ver.materia, 'piano');
    if (a === 'apri') { if (v) SMS.apri = v.id; return vai('smcomp'); }
    if (a === 'primo') { if (fare[0]) { SMS.apri = fare[0].id; return vai('smcomp'); } return apriRipassoGiorno(); }
    if (a === 'fatto' && v) return smCasaFatto(v);
  });
  box.querySelectorAll('[data-ul]').forEach(b => b.onclick = () => tileLezione(ul, b.dataset.ul));
  if ($('smcLez')) $('smcLez').onchange = () => { SD.c = $('smcLez').value; smCasa(); };
  smInfoGiro(box); smInfoGiro($('v-dsa'));
}
async function smCasaFatto(v) {
  const r = await A.sm_compito(v.id, true, false); if (!r) return;
  smCasa();
  smAnnulla(tc('annullato', {c: v.cosa}), async () => { await A.sm_compito(v.id, false, false); smCasa(); });
}

/* ------------------------------------------------------------------ tutti gli strumenti, in schede */
function smCasaStrumenti() {
  const l = SD.l, m = SD.mat, lz = lezioniDsa();
  const nl = !l && 'sd.no.lez', tr = nl || (!l.trascritta && 'sd.no.tr'), ap = nl || (!l.n_appunti && 'sd.no.ap'), cap = nl || (!l.capitoli && 'sd.no.cap');
  const mt = !lz.length ? 'sd.no.lez' : !m && 'sd.no.mat';
  const R = (a, ico, tit, sub, no, cl = '') => ({a, ico, tit, sub, no, cl});
  const SCHEDE = [
    ['aula', tc('t.aula'), [R('reg', 'g-reg', t('sd.reg'), t('sd.reg.s')), R('detta', 'i-mic', t('sd.detta'), t('sd.detta.s'))]],
    ['dopo', tc('t.dopo'), [R('ascolta', 'g-voce', t('tl.asc'), t('sd.asc.s'), ap), R('karaoke', 'g-kar', t('tl.kk'), t('sd.kk.s'), tr), R('appunti_dsa', 'g-note', t('sd.ap'), t('sd.ap.s'), ap),
      R('podcast', 'g-cuffie', t('sd.pc'), t('sd.pc.s'), tr), R('mappa', 'i-map', t('sd.mappa'), t('sd.mappa.s'), tr), R('ripassa', 'i-cards', t('tl.flash'), t('tl.flash.s'), ap),
      R('chiedi', 'i-chat', t('tl.chiedi'), t('tl.chiedi.s'), tr), R('capitoli', 'g-cap', t('tl.cap'), t('tl.cap.s'), cap), R('infografica', 'g-img', t('tl.ig'), t('tl.ig.s'), tr),
      R('glos', 'g-libro', t('tl.gl'), t('tl.dsa.gl.s'), mt), R('leggimi', 'g-voce', t('lg.nome'), t('sd.lg.s')), R('arch', 'g-lezioni', t('sd.tutte'), t('sd.tutte.s'))]],
    ['casa', tc('t.casa'), [R('smcomp', 'g-cal', ts('comp.h'), ts('sd.comp.s'), '', 'amb'), R('smmate', 'g-calc', ts('mate.h'), ts('sd.mate.s'), '', 'ind'),
      R('smcorr', 'g-penna', ts('corr.h'), ts('sd.corr.s'), '', 'ind'), R('smlingue', 'g-mondo', ts('ling.h'), ts('sd.ling.s'), '', 'ind'), R('giorno', 'i-cards', t('sd.rg'), t('sd.rg.s'))]],
    ['ver', tc('t.ver'), [R('tutor', 'g-tutor', t('tl.tu'), t('tl.tu.s'), mt), R('piano', 'g-cal', t('st.piano').replace(/^📅\s*/, ''), t('sd.piano.s'), mt), R('mverif', 'i-map', t('tl.mv'), t('sd.mv.s'), mt),
      R('orale', 'i-mic', t('tl.orale'), t('sd.orale.s'), mt), R('test', 'g-test', t('tl.dsa.test'), t('sd.test.s'), mt), R('scritto', 'g-penna', t('tl.dsa.scr'), t('sd.scr.s'), mt),
      R('prob', 'g-stella', t('tl.prob'), t('tl.prob.s'), mt)]],
    ['doc', tc('t.doc'), [R('firma', 'g-stampa', t('sd.firma'), t('sd.firma.s'), mt), R('strumenti', 'g-lista', t('sd.str'), t('sd.str.s')), R('smgen', 'g-utenti', ts('gen.t'), ts('gen.s')), R('smdet', 'g-euro', ts('det.h'), ts('sd.det.s'))]],
  ];
  if (!SCHEDE.some(s => s[0] === SMC.tab)) SMC.tab = 'aula';
  $('smcTabs').innerHTML = SCHEDE.map(([k, n, r]) => `<button class="${k === SMC.tab ? 'on' : ''}" data-k="${k}">${esc(n)}<span class="c">${r.length}</span></button>`).join('');
  const voci = SCHEDE.find(s => s[0] === SMC.tab)[2];
  const riga = r => `<button class="smx-f${r.no ? ' no' : ''}" data-sd="${r.a}"${r.no ? ` data-no="${r.no}"` : ''}>
      <span class="smx-fi ${r.cl}">${smIco(r.ico)}</span><span class="smx-ft"><b>${esc(r.tit)}</b><small class="sp">${esc(r.sub || '')}</small></span><span class="smx-chev">›</span></button>`;
  const meta = Math.ceil(voci.length / 2);
  $('smcCorpo').innerHTML = `<div class="smc-griglia"><div class="smx-lista">${voci.slice(0, meta).map(riga).join('')}</div>${voci.length > 1 ? `<div class="smx-lista">${voci.slice(meta).map(riga).join('')}</div>` : ''}</div>`;
  $('smcTabs').querySelectorAll('button').forEach(b => b.onclick = () => { SMC.tab = b.dataset.k; smCasaStrumenti(); });
  $('smcCorpo').querySelectorAll('[data-sd]').forEach(b => b.onclick = () => b.dataset.no ? toast(t(b.dataset.no)) : azioneDsa(b.dataset.sd));
  smInfoGiro($('smcCorpo'));
}
