'use strict';
/* Scripta Manent — Registra (stile professionale): prima, durante e dopo.
   Prima: tre passi numerati (Dove si tiene? / Che materia è? / Controlla che si senta), «Altre impostazioni» chiuse,
   «Tieni in miniatura sullo schermo», il tasto REGISTRA; di lato «Hai già la lezione?», «Registro da solo», «Ultime registrate».
   Durante: barra scura con tempo, onda, «Tieni in miniatura», Pausa e Fine; «Segna questo momento» con tre tasti.
   Lavora sugli elementi gia' presenti nella pagina (li sposta, non li rifa'): ogni tasto continua a fare quello che faceva. */

const SMR_T = {
  it: {
    p1: 'Dove si tiene?', p2: 'Che materia è?', p3: 'Controlla che si senta', nome: 'Nome della lezione',
    'nome.s': 'Se lo lasci così, quando gli appunti sono pronti lo cambio io con l\'argomento.', altre: 'Altre impostazioni', 'altre.s': '· facoltative', lingua: 'Lingua del prof',
    mini: 'Tieni in miniatura sullo schermo', 'mini.s': 'Quando parte, il programma diventa una finestrella sempre davanti, con Pausa, Fine e i tre «Segna». La finestrella non finisce nel video.',
    gia: 'Hai già la lezione?', imp: 'Importa un audio o un video', 'imp.s': 'Dal telefono, dal registratore, da YouTube, Drive, Zoom…', impt: 'Importa un testo', 'impt.s': 'La trascrizione in PDF, Word o testo',
    solo: 'Registro da solo', orario: 'Orario delle lezioni', 'orario.s': 'Giorno, ora e materia: il nome giusto arriva da solo', cal: 'Collega il calendario', 'cal.s': 'Google, Outlook o iCloud',
    ultime: 'Ultime registrate', 'vai.s': 'Puoi ridurre la finestra: la registrazione continua. Durante la lezione puoi fotografare la lavagna e segnare i momenti importanti.',
    'lv.mini': 'Tieni in miniatura', 'lv.rec': 'Sto registrando', 'lv.pz': 'In pausa', segna: 'Segna questo momento', 'segna.s': 'Un tocco: lo ritrovi negli appunti, al minuto giusto',
    'sg.imp': 'Importante', 'sg.imp.s': 'Lo evidenzio negli appunti', 'sg.chi': 'Non ho capito', 'sg.chi.s': 'Me lo rispiegano gli appunti', 'sg.fare': 'Compito o verifica', 'sg.fare.s': 'Va dritto nei Compiti',
    segnato: 'Segnato: {t}', nota: 'Scrivi una nota (facoltativo)…', 'mini.no': 'La finestrella si apre solo durante la registrazione.',
    'fn.apri': 'Apri la lezione', 'fn.casa': 'Torna a I miei strumenti',
  },
  en: {
    p1: 'Where is it?', p2: 'Which subject?', p3: 'Check that it can hear', nome: 'Lesson name',
    'nome.s': 'If you leave it like this, I change it to the topic when the notes are ready.', altre: 'More settings', 'altre.s': '· optional', lingua: 'Teacher\'s language',
    mini: 'Keep it small on the screen', 'mini.s': 'When it starts, the program becomes a small window always on top, with Pause, Stop and the three «Mark». It does not end up in the video.',
    gia: 'Do you already have the lesson?', imp: 'Import audio or video', 'imp.s': 'From your phone, a recorder, YouTube, Drive, Zoom…', impt: 'Import a text', 'impt.s': 'The transcript as PDF, Word or text',
    solo: 'I record by myself', orario: 'Lesson timetable', 'orario.s': 'Day, time and subject: the right name arrives by itself', cal: 'Connect the calendar', 'cal.s': 'Google, Outlook or iCloud',
    ultime: 'Last recorded', 'vai.s': 'You can minimise the window: recording continues. During the lesson you can photograph the board and mark important moments.',
    'lv.mini': 'Keep it small', 'lv.rec': 'Recording', 'lv.pz': 'Paused', segna: 'Mark this moment', 'segna.s': 'One tap: you find it in the notes, at the right minute',
    'sg.imp': 'Important', 'sg.imp.s': 'I highlight it in the notes', 'sg.chi': 'I did not understand', 'sg.chi.s': 'The notes explain it again', 'sg.fare': 'Homework or test', 'sg.fare.s': 'Goes straight to Homework',
    segnato: 'Marked: {t}', nota: 'Write a note (optional)…', 'mini.no': 'The small window opens only while recording.',
    'fn.apri': 'Open the lesson', 'fn.casa': 'Back to My tools',
  },
};
function tr2(k, p) {
  let s = (SMR_T[LINGUA] && SMR_T[LINGUA][k]) ?? SMR_T.it[k] ?? k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
}

function smRegistraPrepara() {
  const pg = $('v-pronto');
  if (!pg || pg.dataset.smr) return;
  pg.dataset.smr = 1; pg.dataset.sk = 1;          // schede.js non deve rimpaginarla
  pg.classList.add('smr');
  const q = s => pg.querySelector(s);
  const passo = (n, tit, ...el) => { const d = document.createElement('div'); d.className = 'smr-passo'; d.innerHTML = `<div class="smr-ph"><span class="smr-n">${n}</span><b>${esc(tit)}</b></div>`; el.filter(Boolean).forEach(e => d.append(e)); return d; };
  const blocco = (cls, html) => { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; return d; };
  // colonne
  const w = blocco('smr-w'), sx = blocco('smr-sx'), dx = blocco('smr-dx'), card = blocco('card smr-card');
  // 1 dove
  const p1 = passo(1, tr2('p1'), q('#doveBox'), q('#prPrima'));
  // 2 materia e nome
  const nomeBox = blocco('smr-campo', `<label>${esc(tr2('nome'))}</label>`);
  nomeBox.append(q('#nome'), q('#nomeMsg'), q('#nomeAnt'));
  nomeBox.insertAdjacentHTML('beforeend', `<small class="sp smr-nota">${esc(tr2('nome.s'))}</small>`);
  const p2 = passo(2, tr2('p2'), q('#calOra'), q('#materia'), q('#recenti'), nomeBox);
  // 3 si sente
  const p3 = passo(3, tr2('p3'), q('#srcAula'), q('#srcRum'), q('#srcOnline'));
  // altre impostazioni
  const det = document.createElement('details'); det.className = 'smr-altre';
  det.innerHTML = `<summary><span>${esc(tr2('altre'))}</span><small>${esc(tr2('altre.s'))}</small><span class="smx-chev">›</span></summary><div class="smr-in"></div>`;
  const lin = blocco('smr-campo', `<label>${esc(tr2('lingua'))}</label>`); lin.append(q('#lingue'), q('#linguaTr'));
  det.querySelector('.smr-in').append(q('#mpCard'), lin, q('#quandoCard'));
  // miniatura
  const mini = blocco('smr-opz solo-pc', `<span class="smx-fi">${smIco('i-scr')}</span><span class="smx-ft"><b>${esc(tr2('mini'))}</b><small class="sp">${esc(tr2('mini.s'))}</small></span><span class="sw" id="smrMini"></span>`);
  // registra
  const vai = blocco('smr-vai'); vai.append(q('.recwrap'));
  vai.insertAdjacentHTML('beforeend', `<small class="sp smr-vai-s">${esc(tr2('vai.s'))}</small>`);
  card.append(p1, p2, p3, det, mini, vai);
  sx.append(card);
  // di lato
  dx.innerHTML = `<h3 class="smx-h3">${esc(tr2('gia'))}</h3><div class="smx-lista">
      <button class="smx-f" data-r="imp"><span class="smx-fi">${smIco('i-imp')}</span><span class="smx-ft"><b>${esc(tr2('imp'))}</b><small class="sp">${esc(tr2('imp.s'))}</small></span><span class="smx-chev">›</span></button>
      <button class="smx-f" data-r="impt"><span class="smx-fi">${smIco('i-pdf')}</span><span class="smx-ft"><b>${esc(tr2('impt'))}</b><small class="sp">${esc(tr2('impt.s'))}</small></span><span class="smx-chev">›</span></button></div>
    <h3 class="smx-h3">${esc(tr2('solo'))}</h3><div class="smx-lista">
      <button class="smx-f" data-r="orario"><span class="smx-fi ind">${smIco('g-orologio')}</span><span class="smx-ft"><b>${esc(tr2('orario'))}</b><small class="sp">${esc(tr2('orario.s'))}</small></span><span class="smx-chev">›</span></button>
      <button class="smx-f solo-pc" data-r="cal"><span class="smx-fi ind">${smIco('g-cal')}</span><span class="smx-ft"><b>${esc(tr2('cal'))}</b><small class="sp">${esc(tr2('cal.s'))}</small></span><span class="smx-chev">›</span></button></div>
    <div id="smrUltime"></div>`;
  w.append(sx, dx);
  const hd = q('.hd'); hd.after(w);
  // quello che non serve piu' in vista (resta nella pagina, nascosto)
  ['#btnImporta', '#btnImportaTesto'].forEach(s => { const e = q(s); if (e) { e.classList.add('smr-via'); w.append(e); } });
  dx.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
    const r = b.dataset.r;
    if (r === 'imp') return $('btnImporta').click();
    if (r === 'impt') return $('btnImportaTesto').click();
    if (r === 'orario') return orarioLezioni();
    if (r === 'cal') { vai('imp'); setTimeout(() => { const c = $('calOrario'); if (c) c.scrollIntoView({block: 'center'}); }, 300); }
  });
  $('smrMini').onclick = async () => { await A.imposta('mini_finestra', !R.mini); await rileggi(); smRegistraAggiorna(); };
  smRegistraAggiorna();
  smInfoGiro(pg);
}
function smRegistraAggiorna() {
  if ($('smrMini')) $('smrMini').classList.toggle('on', !!(R && R.mini));
  const u = $('smrUltime'); if (!u || !LZ) return;
  const lz = LZ.lezioni.slice(0, 3);
  u.innerHTML = lz.length ? `<h3 class="smx-h3">${esc(tr2('ultime'))}</h3><div class="smx-lista">${lz.map((l, i) => `<button class="smx-f" data-u="${i}"><span class="smx-ft"><b>${esc(typeof smlNome === 'function' ? smlNome(l) : l.nome)}</b><small class="dato">${esc([l.materia, l.quando].filter(Boolean).join(' · '))}</small></span><span class="smx-chev">›</span></button>`).join('')}</div>` : '';
  u.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const l = lz[+b.dataset.u]; if (l.stato === 'pronta') apriLezione(l); else vai('arch'); });
}

/* ------------------------------------------------------------------ durante */
function smRegLivePrepara() {
  const pg = $('v-reg');
  if (!pg || pg.dataset.smr) return;
  pg.dataset.smr = 1; pg.classList.add('smr-live');
  const live = $('live');
  // Pausa e Fine (e «Tieni in miniatura») dentro la barra scura
  const az = document.createElement('div'); az.className = 'smr-laz';
  az.innerHTML = `<button class="btn b-sm smr-lmini solo-pc" id="smrLMini">${smIco('i-scr')} ${esc(tr2('lv.mini'))}</button>`;
  az.append($('btnPausa'), $('btnFine'));
  live.append(az);
  $('smrLMini').onclick = async () => { const r = await A.apri_mini(); if (!r || !r.ok) toast(tr2('mini.no')); };
  // «Segna questo momento»: tre tasti grandi al posto dei chip
  const nc = $('noteCard');
  const tre = document.createElement('div'); tre.className = 'smr-momenti';
  tre.innerHTML = [['importante', 'g-stella', 'sg.imp', ''], ['chiarire', 'i-chat', 'sg.chi', 'amb'], ['fare', 'g-cal', 'sg.fare', 'ind']]
    .map(([k, i, n, c]) => `<button class="smr-mom" data-segna="${k}"><span class="smx-fi ${c}">${smIco(i)}</span><b>${esc(tr2(n))}</b><small class="sp">${esc(tr2(n + '.s'))}</small></button>`).join('');
  nc.querySelector('.lbl').after(tre);
  tre.querySelectorAll('[data-segna]').forEach(b => b.onclick = async () => {
    await aggiungiNota(b.dataset.segna);
    b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 900);
    toast(tr2('segnato', {t: b.querySelector('b').textContent}));
  });
  $('notaIn').placeholder = tr2('nota');
  smInfoGiro(pg);
}

/* ------------------------------------------------------------------ attivazione */
function smRegistraAttiva() {
  if (typeof SCRIPTA === 'undefined' || !SCRIPTA) return;
  smRegistraPrepara(); smRegLivePrepara();
  const vaiPrima = vai;
  vai = function (p) {
    const r = vaiPrima.apply(this, arguments);
    if (p === 'pronto' || p === 'reg') smRegistraAggiorna();
    return r;
  };
}
