/* «Cerca»: scrivi cosa vuoi fare e il programma ti porta lì.
   Sul PC il campo sta in alto nel menu a sinistra (anche Ctrl+K); sul telefono la lente in alto a destra.
   Tre gruppi: Funzioni (con il percorso e «Vai ›»), Nella guida (il capitolo), Nelle tue lezioni (dove la parola è stata detta). */
'use strict';
(function () {
const CQ = {
  it: {
    ph: 'Cerca…', ph_tel: 'Cosa vuoi fare? (libro, chiave, mappa…)', funz: 'Funzioni', guida: 'Nella guida', lez: 'Nelle tue lezioni',
    vai: 'Vai ›', leggi: 'Leggi ›', apri: 'Apri ›', niente: 'Niente trovato per «{q}». Prova con un\'altra parola (es. libro, chiave, mappa, test).',
    materia: 'Per quale materia?', nomat: 'Prima registra o importa una lezione con la materia: poi la trovi in Studia.',
    lezione: 'Apri una lezione e tocca «{f}».', m: 'materia', l: 'apri una lezione', chiudi: 'Chiudi',
  },
  en: {
    ph: 'Search…', ph_tel: 'What do you want to do? (textbook, key, map…)', funz: 'Features', guida: 'In the guide', lez: 'In your lectures',
    vai: 'Go ›', leggi: 'Read ›', apri: 'Open ›', niente: 'Nothing found for «{q}». Try another word (e.g. textbook, key, map, test).',
    materia: 'Which course?', nomat: 'First record or import a lecture with the course: then you find it in Study.',
    lezione: 'Open a lecture and tap «{f}».', m: 'course', l: 'open a lecture', chiudi: 'Close',
  },
};
const cq = (k, p) => { let s = (CQ[LINGUA] || CQ.it)[k] || CQ.it[k] || k; for (const [a, b] of Object.entries(p || {})) s = s.split('{' + a + '}').join(b); return s; };
const sq = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const IT = () => LINGUA !== 'en';
const tt = k => (typeof t === 'function' ? t(k) : k);
const N = k => tt('nav.' + k);                                // nomi delle voci del menu, nella lingua del programma
const TEL = typeof ANDROID !== 'undefined' && ANDROID;
const WEB = () => document.documentElement.classList.contains('web');

// ------------------------------------------------------------------ azioni
async function scegliMateria() {
  const M = typeof materieStudia === 'function' ? materieStudia() : [];
  if (!M.length) { toast(cq('nomat')); vai('studia'); return null; }
  if (M.length === 1) return M[0];
  const v = await dialogo({titolo: cq('materia'), bottoni: [{t: tt('annulla'), v: null}, ...M.map((m, i) => ({t: sq(m.m), cls: 'b-main', v: i}))]});
  return v !== null && v !== false && M[v] ? M[v] : null;
}
const studia = a => async () => { const m = await scegliMateria(); if (m) tileStudia(m, a); };
const lezione = k => () => { vai('arch'); setTimeout(() => toast(cq('lezione', {f: tt(k)})), 400); };
function imposta(id) {
  return () => {
    vai('imp');
    const e = $(id); if (!e) return;
    if ($('imAvanzate') && $('imAvanzate').contains(e)) avanzate(true);
    setTimeout(() => {
      const box = e.closest('.card, .set') || e;
      box.scrollIntoView({block: 'center', behavior: 'smooth'});
      box.classList.add('cx-luce'); setTimeout(() => box.classList.remove('cx-luce'), 2200);
    }, 120);
  };
}
const pagina = p => () => vai(p);
function registra(id) {
  return () => { vai('reg'); setTimeout(() => { const e = $(id); if (e) { e.scrollIntoView({block: 'center', behavior: 'smooth'}); e.classList.add('cx-luce'); setTimeout(() => e.classList.remove('cx-luce'), 2200); } }, 150); };
}

// ------------------------------------------------------------------ le funzioni (titolo, percorso, parole per trovarle)
// s: dove si trova; k: altre parole (italiano e inglese) con cui la si cerca; dove: 'pc' | 'tel' se c'è solo lì
function FUNZIONI() {
  const st = x => `${N('studia')} › ${cq('m')} › ${x}`, lz = x => `${N('arch')} › ${cq('l')} › ${x}`, im = x => `${N('imp')} › ${x}`;
  return [
    {i: 'g-libro', t: tt('tl.lb'), s: st(tt('tl.lb')), k: 'libro testo pdf manuale dispense capitolo carica aggiungi textbook book upload', fa: studia('libro')},
    {i: 'g-foto', t: IT() ? 'Fotografa le pagine del libro' : 'Photograph the textbook pages', s: st(tt('tl.lb')), k: 'foto fotografa pagine libro fotocopie photo pages', fa: studia('libro')},
    {i: 'g-test', t: tt('tl.test'), s: st(tt('tl.test')), k: 'test crocette quiz domande verifica multiple choice', fa: studia('test')},
    {i: 'i-mic', t: tt('tl.orale'), s: st(tt('tl.orale')), k: 'interrogazione orale voce esame domande oral exam', fa: studia('orale')},
    {i: 'g-penna', t: tt('tl.scritto'), s: st(tt('tl.scritto')), k: 'scritto simulazione compito esame written exam', fa: studia('scritto')},
    {i: 'g-stella', t: tt('tl.prob'), s: st(tt('tl.prob')), k: 'domande probabili esame piano studio date stelle likely questions plan', fa: studia('prob')},
    {i: 'g-cal', t: IT() ? 'Data dell\'esame e piano di studio' : 'Exam date and study plan', s: st(IT() ? 'piano' : 'plan'), k: 'data esame piano studio calendario giorni exam date plan', fa: studia('piano')},
    {i: 'g-tutor', t: tt('tl.tu'), s: st(tt('tl.tu')), k: 'tutor cosa studiare oggi aiuto consigli', fa: studia('tutor')},
    {i: 'g-libro', t: tt('tl.gl'), s: st(tt('tl.gl')), k: 'glossario parole termini definizioni senti il prof glossary terms', fa: studia('glos')},
    {i: 'i-chat', t: tt('tl.chm'), s: st(tt('tl.chm')), k: 'chiedi domanda claude materia ask question', fa: studia('chm')},
    {i: 'g-voce', t: tt('tl.ascm'), s: st(tt('tl.ascm')), k: 'ascolta materia audio voce leggi listen', fa: studia('ascm')},
    {i: 'i-cards', t: tt('tl.fcorso'), s: st(tt('tl.fcorso')), k: 'flashcard carte ripasso corso cards', fa: studia('fcorso')},
    {i: 'i-map', t: tt('tl.mv'), s: st(tt('tl.mv')), k: 'mappa verifica dsa a4 compensativa test map', fa: studia('mverif')},
    {i: 'i-map', t: IT() ? 'Mappe mentali della materia' : 'Mind maps of the course', s: st(IT() ? 'mappe' : 'maps'), k: 'mappa mentale mappe schema mind map', fa: studia('mappe')},
    {i: 'i-cards', t: tt('tl.rg'), s: `${N('studia')} › ${tt('tl.rg')}`, k: 'ripasso giorno oggi carte flashcard daily review', fa: () => apriRipassoGiorno()},
    {i: 'g-lista', t: tt('an.h') !== 'an.h' ? tt('an.h') : (IT() ? 'Andamento' : 'Progress'), s: TEL ? `${N('studia')} › ${IT() ? 'Andamento' : 'Progress'}` : (IT() ? 'Andamento' : 'Progress'), k: 'andamento progressi statistiche ore voti grafico dashboard cruscotto progress stats', fa: pagina('and')},
    {i: 'g-ok', t: N('fare'), s: N('fare'), k: 'cose da fare compiti verbale scadenze to-do tasks', fa: pagina('fare')},
    // dalla lezione
    {i: 'g-voce', t: tt('tl.pc'), s: lz(tt('tl.pc')), k: 'podcast audio ascolta voce prof dibattito', fa: lezione('tl.pc')},
    {i: 'g-kar', t: tt('tl.kk'), s: lz(tt('tl.kk')), k: 'karaoke parole illuminate ascolta', fa: lezione('tl.kk')},
    {i: 'i-map', t: tt('tl.mappa'), s: lz(tt('tl.mappa')), k: 'mappa mentale schema albero mind map', fa: lezione('tl.mappa')},
    {i: 'g-img', t: tt('tl.ig'), s: lz(tt('tl.ig')), k: 'infografica pagina riassunto infographic', fa: lezione('tl.ig')},
    {i: 'g-cap', t: tt('tl.cap'), s: lz(tt('tl.cap')), k: 'capitoli indice salta chapters', fa: lezione('tl.cap')},
    {i: 'g-tutor', t: tt('tl.voci'), s: lz(tt('tl.voci')), k: 'chi parla voci statistiche speaker interventi', fa: lezione('tl.voci')},
    {i: 'i-chat', t: tt('tl.chiedi'), s: lz(tt('tl.chiedi')), k: 'chiedi lezione domanda non ho capito claude ask', fa: lezione('tl.chiedi')},
    {i: 'g-voce', t: tt('tl.asc'), s: lz(tt('tl.asc')), k: 'ascolta appunti leggi a voce listen notes', fa: lezione('tl.asc')},
    {i: 'i-cards', t: tt('tl.flash'), s: lz(tt('tl.flash')), k: 'flashcard carte anki esporta cards', fa: lezione('tl.flash')},
    {i: 'i-share', t: tt('tl.cond'), s: lz(tt('tl.cond')), k: 'condividi email word pdf calendario manda share whatsapp google docs', fa: lezione('tl.cond')},
    {i: 'g-forbici', t: tt('tl.sp'), s: lz(tt('tl.sp')), k: 'spezzone video sottotitoli taglia clip subtitles', fa: lezione('tl.sp')},
    {i: 'g-note', t: IT() ? 'Rifai gli appunti in un altro formato' : 'Redo the notes in another format', s: lz('⋯ › ' + (IT() ? 'Rifai appunti' : 'Redo notes')), k: 'rifai appunti formato cornell formato esame verbale redo notes', fa: lezione('tl.appunti')},
    // registrare e importare
    {i: 'g-reg', t: N('reg'), s: N('reg'), k: 'registra lezione riunione meet teams zoom record start', fa: pagina('reg')},
    {i: 'g-cartella', t: IT() ? 'Importa un video o un audio' : 'Import a video or audio', s: `${N('reg')} › ${IT() ? 'Importa' : 'Import'}`, k: 'importa video audio mp3 mp4 file link youtube drive import', fa: registra('btnImporta')},
    {i: 'g-note', t: IT() ? 'Importa una trascrizione (PDF, Word, testo)' : 'Import a transcript (PDF, Word, text)', s: `${N('reg')} › ${IT() ? 'Importa un testo' : 'Import a text'}`, k: 'importa trascrizione testo pdf word sbobinatura transcript', fa: registra('btnImportaTesto')},
    {i: 'g-foto', t: IT() ? 'Foto alla lavagna durante la lezione' : 'Photo of the board during the lecture', s: `${N('reg')} › ${IT() ? 'in registrazione' : 'while recording'} › ${IT() ? 'Foto' : 'Photo'}`, k: 'foto lavagna fotografa appunti a mano board photo', fa: pagina('reg')},
    // DSA
    {i: 'g-stella', t: N('dsa'), s: N('dsa'), k: 'dsa dislessia spazio strumenti compensativi dyslexia', fa: pagina('dsa')},
    {i: 'g-voce', t: IT() ? 'Leggimi: un PDF, una foto o un testo letto a voce' : 'Read to me: a PDF, a photo or a text read aloud', s: `${N('dsa')} › ${IT() ? 'Leggimi' : 'Read to me'}`, k: 'leggimi leggi voce pdf foto testo dsa read aloud', fa: pagina('lg')},
    {i: 'i-mic', t: IT() ? 'Scrivi parlando' : 'Write by speaking', s: `${N('dsa')} › ${IT() ? 'Scrivi parlando' : 'Write by speaking'}`, k: 'scrivi parlando detta dettatura voce dictate', fa: pagina('dp')},
    {i: 'i-map', t: tt('lm.t') !== 'lm.t' ? tt('lm.t') : (IT() ? 'La mia mappa' : 'My map'), s: `${N('dsa')} › ${tt('lm.t')}`, k: 'la mia mappa costruisci mappa dsa my map', fa: pagina('lm')},
    {i: 'g-occhio', t: tt('fa.t') !== 'fa.t' ? tt('fa.t') : (IT() ? 'Modalità DSA' : 'DSA mode'), s: im(tt('fa.t')), k: 'modalita dsa carattere sfondo lexend opendyslexic leggibile font', fa: imposta('swFac')},
    // impostazioni
    {i: 'g-chiave', t: IT() ? 'Chiave di Claude' : 'Claude key', s: im(tt('im.ai')), k: 'chiave claude api sk-ant anthropic intelligenza artificiale key', fa: imposta('chiaveBox')},
    {i: 'g-biglietto', t: tt('ho.h'), s: im(tt('ho.h')), k: 'invito ho un invito incolla vmia chiavi invitation', fa: imposta('hoCard')},
    {i: 'g-biglietto', t: tt('inv.h'), s: im(`${tt('im.avz')} › ${tt('inv.h')}`), k: 'inviti invita prepara invito sara lorenzo famiglia whatsapp invite', fa: imposta('invCard'), dove: 'chiavi'},
    {i: 'g-mondo', t: tt('im.lingua') !== 'im.lingua' ? tt('im.lingua') : (IT() ? 'Lingua' : 'Language'), s: im(tt('im.lingua')), k: 'lingua italiano inglese english language docente', fa: imposta('segLingua')},
    {i: 'g-note', t: tt('im.fmt'), s: im(tt('im.fmt')), k: 'formato appunti cornell formato esame mio verbale notes format', fa: imposta('fmtBox')},
    {i: 'g-lampo', t: tt('dv.h'), s: im(tt('dv.h')), k: 'dove trascrivo server runpod veloce telefono pc trascrizione transcribe', fa: imposta('dvCard')},
    {i: 'g-ingr', t: tt('im.prec'), s: im(tt('im.prec')), k: 'trascrizione precisa accurata precise', fa: imposta('swPrec')},
    {i: 'g-tutor', t: tt('im.voci'), s: im(`${tt('im.avz')} › ${tt('im.voci')}`), k: 'chi parla voci riconosci speaker', fa: imposta('swVoci')},
    {i: 'g-libro', t: tt('pw.t'), s: im(tt('pw.t')), k: 'parole difficili termini nomi docente vocabolario words', fa: imposta('pwIn')},
    {i: 'g-cal', t: tt('cal.h'), s: im(`${tt('im.avz')} › ${tt('cal.h')}`), k: 'calendario orario lezioni google outlook avviso calendar schedule', fa: imposta('calCard')},
    {i: 'g-nuvola', t: tt('sy.t') !== 'sy.t' ? tt('sy.t') : (IT() ? 'Sincronizza' : 'Sync'), s: im(tt('sy.t')), k: 'sincronizza google drive telefono pc web password zip sync qr collega', fa: pagina('sy')},
    {i: 'g-nuvola', t: tt('cl.h'), s: im(tt('cl.h')), k: 'copia cloud onedrive google drive backup', fa: imposta('clCard'), dove: 'pc'},
    {i: 'i-share', t: tt('cg.h'), s: im(`${tt('im.avz')} › ${tt('cg.h')}`), k: 'collegamenti slack notion teams crm integrazioni integrations', fa: imposta('cgCard')},
    {i: 'g-avviso', t: tt('im.dnd'), s: im(`${tt('im.avz')} › ${tt('im.dnd')}`), k: 'non disturbare notifiche suoni do not disturb focus', fa: imposta('swDnd')},
    {i: 'g-cartella', t: tt('im.cart'), s: im(`${tt('im.avz')} › ${tt('im.cart')}`), k: 'cartella lezioni salvo dove disco folder', fa: imposta('btnCart'), dove: 'pc'},
    {i: 'g-pc', t: tt('im.mini'), s: im(`${tt('im.avz')} › ${tt('im.mini')}`), k: 'mini finestra piccola primo piano pausa', fa: imposta('swMini'), dove: 'pc'},
    {i: 'g-lampo', t: tt('im.dir'), s: im(`${tt('im.avz')} › ${tt('im.dir')}`), k: 'testo in diretta live mentre registri', fa: imposta('swDir'), dove: 'pc'},
    {i: 'g-lucchetto', t: tt('im.pv.h'), s: TEL ? im(tt('im.info')) : N('info'), k: 'privacy dati rapporti errori sentry gdpr', fa: pagina('info')},
    {i: 'g-idea', t: IT() ? 'Inizia qui (la guida del primo avvio)' : 'Start here (the first-run guide)', s: im(IT() ? 'Inizia qui' : 'Start here'), k: 'inizia qui primo avvio google claude configura start setup', fa: () => { if (window.iniziaQui) window.iniziaQui(); }, dove: 'noweb'},
    {i: 'g-domanda', t: TEL ? tt('im.info') : N('info'), s: TEL ? im(tt('im.info')) : N('info'), k: 'informazioni versione licenze assistenza aiuto supporto about version support', fa: pagina('info')},
    {i: 'g-ripeti', t: IT() ? 'Aggiorna il programma' : 'Update the program', s: TEL ? im(tt('and.agg.t')) : N('info'), k: 'aggiorna aggiornamento versione nuova update', fa: () => { if (typeof IPHONE !== 'undefined' && IPHONE) { vai('info'); return; } vai('info'); A.cerca_aggiornamenti(); }, dove: 'noweb'},
    {i: 'i-guida', t: N('guida'), s: N('guida'), k: 'guida aiuto come si usa video help guide', fa: pagina('guida')},
  ].filter(f => !f.dove || (f.dove === 'pc' ? !TEL && !WEB() : f.dove === 'noweb' ? !WEB() : f.dove === 'chiavi' ? !WEB() : true));
}

// ------------------------------------------------------------------ ricerca
const ACCENTI = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const parole = q => ACCENTI(q).split(/[^a-z0-9-]+/).filter(w => w.length >= 2);
function punti(testo, ws) {
  const x = ACCENTI(testo);
  let p = 0;
  for (const w of ws) {
    if (new RegExp('\\b' + w).test(x)) p += 3;
    else if (w.length >= 4 && x.includes(w.slice(0, -1))) p += 1;      // libri ~ libro, mappe ~ mappa
    else return 0;
  }
  return p;
}
function evid(testo, ws) {
  let h = sq(testo);
  for (const w of ws) {
    const re = new RegExp('(' + w.split('').map(c => ({a: '[aàá]', e: '[eèé]', i: '[iìí]', o: '[oòó]', u: '[uùú]'}[c] || c.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'))).join('') + ')', 'gi');
    h = h.replace(re, '<mark>$1</mark>');
  }
  return h;
}
function cercaFunzioni(ws) {
  return FUNZIONI().map(f => ({f, p: punti(f.t, ws) * 2 + punti(f.t + ' ' + f.s + ' ' + f.k, ws)})).filter(x => x.p > 0)
    .sort((a, b) => b.p - a.p).slice(0, 6).map(x => x.f);
}
function cercaGuida(ws) {
  const G = (typeof GUIDA !== 'undefined' && (GUIDA[LINGUA] || GUIDA.it)) || {capitoli: []};
  return G.capitoli.map((c, i) => ({c, i, p: punti(c.t, ws) * 2 + punti(c.t + ' ' + (c.p || []).join(' ').replace(/<[^>]+>/g, ''), ws)}))
    .filter(x => x.p > 0 && !x.c.perche).sort((a, b) => b.p - a.p).slice(0, 3);
}
function apriGuida(i) {
  vai('guida');
  setTimeout(() => {
    const ds = [...document.querySelectorAll('#gCap details.cap')], G = GUIDA[linguaGuida || LINGUA] || GUIDA.it;
    const per = G.capitoli.findIndex(c => c.perche), d = ds[i];
    if (!d) return;
    ds.forEach((x, j) => { if (j !== i && j === per) x.open = false; });
    d.open = true;
    d.scrollIntoView({block: 'start', behavior: 'smooth'});
  }, 120);
}

// ------------------------------------------------------------------ il riquadro dei risultati
let P = null, SEL = 0, VOCI = [], LZ = {q: '', r: null}, timer = null;
function riquadro() {
  if (P) return P;
  P = document.createElement('div'); P.id = 'cxRis'; P.className = 'cx-ris hidden';
  document.body.appendChild(P);
  return P;
}
function chiudi() {
  if (P) P.classList.add('hidden');
  document.body.classList.remove('cx-aperto');
  const v = $('cxVelo'); if (v) v.remove();
}
function disegna(q) {
  const box = riquadro(), ws = parole(q);
  const dove = TEL ? $('cxLista') : box;
  if (TEL && !dove) return;
  if (!ws.length) { if (TEL) { dove.innerHTML = ''; VOCI = []; } else chiudi(); return; }
  const F = cercaFunzioni(ws), G = cercaGuida(ws);
  VOCI = [];
  const riga = (ico, tit, sotto, bt, fa, ws2) => { VOCI.push(fa); const n = VOCI.length - 1;
    return `<div class="cx-r${n === SEL ? ' sel' : ''}" data-n="${n}"><span class="cx-ico"><svg><use href="#${ico}"/></svg></span><div class="cx-tx"><b>${evid(tit, ws2)}</b><small>${evid(sotto, ws2)}</small></div><span class="cx-vai">${sq(bt)}</span></div>`; };
  let h = '';
  if (F.length) h += `<div class="cx-gr">${sq(cq('funz'))}</div>` + F.map(f => riga(f.i, f.t, f.s, cq('vai'), f.fa, ws)).join('');
  if (G.length) h += `<div class="cx-gr">${sq(cq('guida'))}</div>` + G.map(x => riga('i-guida', x.c.t, `${N('guida')}`, cq('leggi'), () => apriGuida(x.i), ws)).join('');
  const lr = LZ.q === q && LZ.r ? LZ.r : null;
  if (lr && lr.risultati && lr.risultati.length) {
    h += `<div class="cx-gr">${sq(cq('lez'))}</div>` + lr.risultati.slice(0, 3).map(x => { const f = x.frasi[0] || {};
      return riga('g-lezioni', x.nome, `«…${(f.testo || '').slice(0, 70)}…» · ${f.ora || ''}`, cq('apri'), () => mostraMomento(x.cartella, f.sec, null, x.nome), lr.parole && lr.parole.length ? lr.parole : ws); }).join('');
  }
  if (!h) h = `<div class="cx-vuoto">${sq(cq('niente', {q}))}</div>`;
  dove.innerHTML = h;
  box.classList.remove('hidden');
  dove.querySelectorAll('.cx-r').forEach(r => r.onclick = () => esegui(+r.dataset.n));
}
function esegui(n) {
  const fa = VOCI[n]; if (!fa) return;
  chiudi();
  const i = $('cxIn'); if (i) { i.value = ''; i.blur(); }
  fa();
}
function cambia(q) {
  SEL = 0; disegna(q);
  clearTimeout(timer);
  if (q.trim().length < 3) return;
  timer = setTimeout(async () => {
    try { const r = await A.cerca_parole(q.trim(), ''); LZ = {q, r}; } catch (e) { LZ = {q, r: null}; }
    const cur = TEL ? ($('cxInTel') || {}).value : ($('cxIn') || {}).value;
    if (cur === q) disegna(q);
  }, 400);
}
function tasti(e) {
  if (e.key === 'Escape') { chiudi(); e.target.blur(); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); if (!VOCI.length) return;
    SEL = (SEL + (e.key === 'ArrowDown' ? 1 : -1) + VOCI.length) % VOCI.length;
    P.querySelectorAll('.cx-r').forEach((r, j) => r.classList.toggle('sel', j === SEL));
    const s = P.querySelector('.cx-r.sel'); if (s) s.scrollIntoView({block: 'nearest'});
  }
  if (e.key === 'Enter') { e.preventDefault(); esegui(SEL); }
}

// ------------------------------------------------------------------ il campo (PC) e la lente (telefono)
function monta() {
  if (TEL) {
    if ($('cxLente')) return;
    const b = document.createElement('button'); b.id = 'cxLente'; b.className = 'cx-lente'; b.setAttribute('aria-label', cq('ph'));
    b.innerHTML = '<svg><use href="#i-srch"/></svg>';
    b.onclick = () => { document.body.classList.add('cx-aperto'); SEL = 0; riquadro().innerHTML = ''; disegnaVuoto(); };
    document.body.appendChild(b);
    return;
  }
  const nav = $('nav'); if (!nav || $('cxBox')) return;
  const d = document.createElement('div'); d.className = 'cx-box'; d.id = 'cxBox';
  d.innerHTML = `<svg><use href="#i-srch"/></svg><input id="cxIn" placeholder="${sq(cq('ph'))}" autocomplete="off" spellcheck="false"><kbd>Ctrl K</kbd>`;
  nav.parentNode.insertBefore(d, nav);
  const i = $('cxIn');
  i.oninput = () => cambia(i.value);
  i.onkeydown = tasti;
  i.onfocus = () => { if (i.value.trim()) disegna(i.value); };
  document.addEventListener('mousedown', e => { if (P && !P.contains(e.target) && !d.contains(e.target)) chiudi(); });
}
function disegnaVuoto() {
  const box = riquadro();
  box.innerHTML = `<div class="cx-campo"><svg><use href="#i-srch"/></svg><input id="cxInTel" enterkeyhint="search" placeholder="${sq(cq('ph_tel'))}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="cx-x" id="cxX">✕</button></div><div id="cxLista"></div>`;
  box.classList.remove('hidden');
  const i = $('cxInTel'); i.oninput = () => cambia(i.value); i.onkeydown = tasti; $('cxX').onclick = chiudi;
  setTimeout(() => i.focus(), 50);
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { const i = $('cxIn'); if (i) { e.preventDefault(); i.focus(); i.select(); } }
});
// i testi seguono la lingua del programma
let lingua = null;
const attendi = setInterval(() => {
  if (typeof R === 'undefined' || !R || !$('nav')) return;
  monta();
  if (lingua !== LINGUA) { lingua = LINGUA; const i = $('cxIn'); if (i) i.placeholder = cq('ph'); const b = $('cxLente'); if (b) b.setAttribute('aria-label', cq('ph')); }
}, 700);
})();
