'use strict';
/* Scripta Manent — Impostazioni (stile professionale): sezioni a sinistra, una alla volta a destra.
   Le impostazioni che c'erano gia' si SPOSTANO nella sezione giusta (gli stessi elementi, con i loro tasti);
   quelle nuove (Voce, Ripasso del giorno, In verifica posso usare, Privacy, Lingua e informazioni) si disegnano qui.
   «Come leggo meglio» usa i comandi della sua pagina (si spostano qui e tornano al loro posto quando esci). */

const SMI_T = {
  it: {
    h: 'Impostazioni', salvate: 'Si salvano da sole',
    's.leggo': 'Come leggo meglio', 's.voce': 'Voce', 's.rip': 'Ripasso del giorno', 's.mat': 'Materie e orario', 's.reg': 'Registrazione', 's.tras': 'Trascrizione',
    's.ap': 'Appunti e Claude', 's.ver': 'In verifica posso usare', 's.sync': 'PC, telefono e cloud', 's.inv': 'Inviti', 's.priv': 'Privacy', 's.io': 'I miei dati e famiglia', 's.info': 'Lingua e informazioni',
    vel: 'Velocità della voce', lenta: 'Lenta', normale: 'Normale', veloce: 'Veloce', prova: 'Prova la voce', 'prova.t': 'Il trapezio ha due lati paralleli: la base maggiore e la base minore.',
    'rg.n': 'Quante carte al giorno', 'rg.n.s': 'Il ripasso di oggi non supera questo numero', 'rg.prom': 'Ricordamelo', 'rg.prom.s': 'Un avviso sul PC o sul telefono', 'rg.ora': 'A che ora',
    'rg.anki': 'Esporta per Anki', 'rg.anki.s': 'Per chi usa già Anki o AnkiDroid', esporta: 'Esporta',
    'mat.h': 'Le mie materie', 'mat.0': 'Le materie arrivano con le lezioni: quando registri, scegli la materia.', 'mat.lez': '{n} lezioni', orario: 'Orario delle lezioni', 'orario.s': 'Con l\'orario la materia giusta arriva da sola',
    iz: 'Inizia qui', 'iz.s': 'Google, Claude, telefono e web in 3 passi', apri: 'Apri', 'r.dur': 'Durante la registrazione', 'r.audio': 'Audio', 'r.dove': 'Dove salvo', 'aula': 'Aula rumorosa, sempre', 'aula.s': 'Toglie brusio e sedie in tutte le lezioni. Spento: decide il programma',
    'ver.nota': 'Quello che spunti qui decide cosa ti preparo da stampare e portare in verifica, e come ti alleno.',
    'v.mappe': 'Mappe', 'v.formulario': 'Formulario', 'v.calcolatrice': 'Calcolatrice', 'v.tabelline': 'Tabella delle tabelline', 'v.tempo': 'Tempo in più', 'v.orale': 'Interrogazione al posto dello scritto', 'v.lettore': 'Lettura ad alta voce del testo', 'v.meno': 'Meno esercizi',
    'p.pc': 'Le registrazioni restano sul tuo PC', 'p.pc.s': 'Audio, trascrizioni e appunti non vengono mandati a noi', 'p.voce': 'Nessuna impronta della voce', 'p.voce.s': '«Chi parla» distingue le voci solo mentre lavora, poi cancella tutto',
    'p.testo': 'Per gli appunti esce solo il testo', 'p.testo.s': 'A Claude va il testo della lezione, mai l\'audio', sempre: 'Sempre', 'p.err': 'Manda i rapporti degli errori', 'p.err.s': 'Se il programma si blocca, ci arriva solo cosa è andato storto',
    'p.perm': 'Registrare il prof e i compagni', 'p.perm.s': 'Chiedi il permesso: di solito basta dirlo al prof', leggi: 'Leggi',
    fam: 'Riepilogo per la famiglia', 'fam.s': 'Cosa si è fatto nella settimana, da stampare', lingua: 'Lingua del programma', versione: 'Versione e aggiornamenti', guida: 'Guida', 'guida.s': 'Come si usa, pagina per pagina',
  },
  en: {
    h: 'Settings', salvate: 'Saved automatically',
    's.leggo': 'How I read best', 's.voce': 'Voice', 's.rip': 'Daily review', 's.mat': 'Subjects and timetable', 's.reg': 'Recording', 's.tras': 'Transcription',
    's.ap': 'Notes and Claude', 's.ver': 'In tests I can use', 's.sync': 'PC, phone and cloud', 's.inv': 'Invitations', 's.priv': 'Privacy', 's.io': 'My details and family', 's.info': 'Language and information',
    vel: 'Voice speed', lenta: 'Slow', normale: 'Normal', veloce: 'Fast', prova: 'Try the voice', 'prova.t': 'A trapezoid has two parallel sides: the long base and the short base.',
    'rg.n': 'Cards per day', 'rg.n.s': 'Today\'s review never goes over this', 'rg.prom': 'Remind me', 'rg.prom.s': 'A notice on the PC or phone', 'rg.ora': 'At what time',
    'rg.anki': 'Export to Anki', 'rg.anki.s': 'For Anki or AnkiDroid users', esporta: 'Export',
    'mat.h': 'My subjects', 'mat.0': 'Subjects come with lessons: choose the subject when you record.', 'mat.lez': '{n} lessons', orario: 'Lesson timetable', 'orario.s': 'With the timetable the right subject arrives by itself',
    iz: 'Start here', 'iz.s': 'Google, Claude, phone and web in 3 steps', apri: 'Open', 'r.dur': 'While recording', 'r.audio': 'Audio', 'r.dove': 'Where I save', 'aula': 'Noisy classroom, always', 'aula.s': 'Removes chatter and chairs in all lessons. Off: the program decides',
    'ver.nota': 'What you tick here decides what I prepare for you to print and bring to tests, and how I train you.',
    'v.mappe': 'Maps', 'v.formulario': 'Formulas', 'v.calcolatrice': 'Calculator', 'v.tabelline': 'Times table', 'v.tempo': 'Extra time', 'v.orale': 'Oral instead of written', 'v.lettore': 'Text read aloud', 'v.meno': 'Fewer exercises',
    'p.pc': 'Recordings stay on your PC', 'p.pc.s': 'Audio, transcripts and notes are not sent to us', 'p.voce': 'No voice print', 'p.voce.s': '«Who is speaking» tells voices apart only while working, then deletes everything',
    'p.testo': 'Only text leaves for the notes', 'p.testo.s': 'Claude gets the text of the lesson, never the audio', sempre: 'Always', 'p.err': 'Send error reports', 'p.err.s': 'If the program crashes, we only get what went wrong',
    'p.perm': 'Recording the teacher and classmates', 'p.perm.s': 'Ask for permission: usually telling the teacher is enough', leggi: 'Read',
    fam: 'Summary for the family', 'fam.s': 'What was done during the week, to print', lingua: 'Program language', versione: 'Version and updates', guida: 'Guide', 'guida.s': 'How to use it, page by page',
  },
};
function ti(k, p) {
  let s = (SMI_T[LINGUA] && SMI_T[LINGUA][k]) ?? SMI_T.it[k] ?? k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
}
const SMI = {sez: 'leggo', ver: null};
const SMI_SEZ = [['leggo', 'g-occhiali'], ['voce', 'g-voce'], ['rip', 'i-cards'], ['mat', 'g-cal'], ['reg', 'g-reg'], ['tras', 'i-text'], ['ap', 'i-spark'], ['ver', 'g-test'],
  ['sync', 'g-tel'], ['inv', 'g-regalo'], ['priv', 'g-lucchetto'], ['io', 'g-utenti'], ['info', 'i-info']];

const smiRiga = (tit, sub, dx, id = '') => `<div class="smi-r"${id ? ` id="${id}"` : ''}><span class="smx-ft"><b>${esc(tit)}</b>${sub ? `<small class="${/\d/.test(sub) && sub.length < 60 ? 'dato' : 'sp'}">${esc(sub)}</small>` : ''}</span>${dx}</div>`;
const smiSeg = (id, vals, cur) => `<span class="seg" id="${id}">${vals.map(([v, n]) => `<span data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${esc(n)}</span>`).join('')}</span>`;

function smImpPrepara() {
  const pg = $('v-imp');
  if (!pg || pg.dataset.smi) return;
  pg.dataset.smi = 1; pg.classList.add('smi');
  const q = s => pg.querySelector(s), card = el => el && el.closest('.card');
  const set = id => { const e = $(id); return e && e.closest('.set'); };
  const lblCard = k => card(pg.querySelector(`.lbl[data-t="${k}"]`));
  // contenitori delle sezioni
  const w = document.createElement('div'); w.className = 'smi-w';
  w.innerHTML = `<nav class="smi-nav" id="smiNav"></nav><div id="smiCorpo">${SMI_SEZ.map(([k]) => `<div class="smi-sez hidden" data-sez="${k}"></div>`).join('')}</div>`;
  q('.hd').after(w);
  const sez = k => w.querySelector(`[data-sez="${k}"]`);
  const gruppo = (k, tit, ...el) => { const d = document.createElement('div'); d.className = 'smi-g'; if (tit) d.innerHTML = `<h3 class="smx-h3">${esc(tit)}</h3>`; const c = document.createElement('div'); c.className = 'card smi-card'; el.filter(Boolean).forEach(e => c.append(e)); d.append(c); sez(k).append(d); return c; };
  // Registrazione: righe esistenti
  gruppo('reg', ti('r.dur'), set('swMini'), set('swDir'), set('swDnd'), set('segDur'));
  const audio = gruppo('reg', ti('r.audio'), set('swVoci'));
  audio.insertAdjacentHTML('afterbegin', smiRiga(ti('aula'), ti('aula.s'), `<span class="sw" id="smiAula"></span>`));
  gruppo('reg', ti('r.dove'), set('btnCart'), set('btnBase'));
  // Trascrizione, Appunti e Claude, PC e telefono, Inviti, Dati
  sez('tras').append($('dvCard'));
  sez('ap').append(lblCard('im.ai'), lblCard('im.fmt'), card($('pwIn')), $('hoCard'));
  sez('ap').insertAdjacentHTML('afterbegin', `<div class="card smi-card" style="margin-bottom:14px">${smiRiga(ti('iz'), ti('iz.s'), `<button class="btn b-main b-sm" id="smiIz">${esc(ti('apri'))} ›</button>`)}</div>`);
  $('smiIz').onclick = () => { if (window.iniziaQui) window.iniziaQui(); };
  sez('sync').append(lblCard('sy.lbl'), $('clCard'));
  sez('inv').append($('invCard')); $('invCard').classList.remove('hidden');
  sez('io').append(lblCard('im.dati'));
  sez('io').insertAdjacentHTML('beforeend', `<div class="card smi-card mt">${smiRiga(ti('fam'), ti('fam.s'), `<button class="btn b-ghost b-sm" id="smiFam">${esc(ti('apri'))} ›</button>`)}</div>`);
  // Materie e orario: il calendario esistente sotto le materie
  sez('mat').insertAdjacentHTML('beforeend', `<h3 class="smx-h3">${esc(ti('mat.h'))}</h3><div class="card smi-card" id="smiMat"></div>
    <h3 class="smx-h3">${esc(ti('orario'))}</h3><div class="card smi-card">${smiRiga(ti('orario'), ti('orario.s'), `<button class="btn b-ghost b-sm" id="smiOrario">${esc(ti('apri'))} ›</button>`)}</div>`);
  if ($('calCard')) sez('mat').append($('calCard'));
  // il resto (avanzate, telefono, cose da lavoro) resta nascosto
  pg.querySelectorAll(':scope > .card, :scope > .imavz, :scope > #imAvanzate').forEach(e => e.classList.add('smi-via'));
  $('smiFam').onclick = () => smGenitori();
  $('smiOrario').onclick = () => orarioLezioni();
  $('smiAula').onclick = async () => { await A.imposta('aula_rumorosa', !R.aula_rumorosa); await rileggi(); smImpDisegna(); };
  smImpDisegna();
}
async function smImpDisegna() {
  const pg = $('v-imp'); if (!pg || !pg.dataset.smi) return;
  pg.querySelector('.hd h2').textContent = ti('h');
  const hd = pg.querySelector('.hd');
  if (!hd.querySelector('.smi-ok')) hd.insertAdjacentHTML('beforeend', '<span class="smi-ok"></span>');
  hd.querySelector('.smi-ok').innerHTML = `${smIco('g-ok')} ${esc(ti('salvate'))}`;   // la lingua puo' arrivare dopo
  $('smiNav').innerHTML = SMI_SEZ.map(([k, i]) => `<button class="${k === SMI.sez ? 'on' : ''}" data-s="${k}">${smIco(i)}<span>${esc(ti('s.' + k))}</span></button>`).join('');
  $('smiNav').querySelectorAll('button').forEach(b => b.onclick = () => { SMI.sez = b.dataset.s; smImpDisegna(); });
  pg.querySelectorAll('.smi-sez').forEach(s => s.classList.toggle('hidden', s.dataset.sez !== SMI.sez));
  if ($('smiAula')) $('smiAula').classList.toggle('on', !!R.aula_rumorosa);
  // la pagina «Come leggo meglio»: i comandi vengono qui e tornano indietro quando esci
  const lm = document.querySelector('#v-lm .lmgrid') || document.querySelector('.smi-sez .lmgrid');
  if (SMI.sez === 'leggo' && lm) { pg.querySelector('[data-sez="leggo"]').append(lm); try { disegnaLM(); } catch (e) {} }
  const s = pg.querySelector(`[data-sez="${SMI.sez}"]`);
  if (SMI.sez === 'voce') smiVoce(s);
  if (SMI.sez === 'rip') smiRipasso(s);
  if (SMI.sez === 'mat') smiMaterie();
  if (SMI.sez === 'ver') await smiVerifica(s);
  if (SMI.sez === 'priv') smiPrivacy(s);
  if (SMI.sez === 'info') smiInfo(s);
  smInfoGiro(pg);
  // percorso: I miei strumenti › Impostazioni › sezione
  const p = pg.querySelector('.perc .briciole');
  if (p) p.innerHTML = `<a data-casa="1">${esc(t('nav.dsa'))}</a><span class="sep">›</span><span>${esc(ti('h'))}</span><span class="sep">›</span><b>${esc(ti('s.' + SMI.sez))}</b>`;
  if (p) p.querySelector('[data-casa]').onclick = () => { SMS.storia = []; vai('dsa', true); };
}
function smiLmIndietro() { const g = document.querySelector('.smi-sez .lmgrid'); if (g) $('v-lm').append(g); }
function smiVoce(s) {
  const v = (R && R.sm_voce_vel) || 0.9;
  s.innerHTML = `<div class="card smi-card">${smiRiga(ti('vel'), '', smiSeg('smiVel', [[0.75, ti('lenta')], [0.9, ti('normale')], [1.1, ti('veloce')]], [0.75, 0.9, 1.1].reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a)))}
    <div style="padding:12px 0"><button class="btn b-main b-sm" id="smiProva">${smIco('g-voce')} ${esc(ti('prova'))}</button></div></div>`;
  $('smiVel').querySelectorAll('span').forEach(x => x.onclick = async () => { await A.imposta('sm_voce_vel', +x.dataset.v); R.sm_voce_vel = +x.dataset.v; smiVoce(s); });
  $('smiProva').onclick = () => { try { voceFerma(); voceParla(ti('prova.t'), R.sm_voce_vel || 0.9); } catch (e) {} };
}
function smiRipasso(s) {
  s.innerHTML = `<div class="card smi-card">${smiRiga(ti('rg.n'), ti('rg.n.s'), smiSeg('smiRgN', [[10, '10'], [20, '20'], [30, '30']], R.rg_max || 20))}
    ${smiRiga(ti('rg.prom'), ti('rg.prom.s'), `<span class="sw${R.rg_promemoria ? ' on' : ''}" id="smiRgP"></span>`)}
    ${R.rg_promemoria ? smiRiga(ti('rg.ora'), '', `<input class="in smi-ora" type="time" id="smiRgO" value="${esc(R.rg_ora || '18:00')}">`) : ''}
    ${smiRiga(ti('rg.anki'), ti('rg.anki.s'), `<button class="btn b-ghost b-sm" id="smiAnki">${esc(ti('esporta'))} ›</button>`)}</div>`;
  $('smiRgN').querySelectorAll('span').forEach(x => x.onclick = async () => { R.rg_max = +x.dataset.v; await A.imposta('rg_max', R.rg_max); smiRipasso(s); });
  $('smiRgP').onclick = async () => { R.rg_promemoria = !R.rg_promemoria; await A.imposta('rg_promemoria', R.rg_promemoria); smiRipasso(s); };
  if ($('smiRgO')) $('smiRgO').onchange = async () => { R.rg_ora = $('smiRgO').value || '18:00'; await A.imposta('rg_ora', R.rg_ora); };
  $('smiAnki').onclick = () => { const M = materieStudia(); esportaAnki(M.flatMap(m => m.cartelle), 'Scripta Manent', 'prima'); };
}
function smiMaterie() {
  const el = $('smiMat'); if (!el) return;
  const M = [...new Set((LZ ? LZ.lezioni : []).map(l => l.materia).filter(Boolean))].sort();
  el.innerHTML = M.length ? M.map(m => { const n = LZ.lezioni.filter(l => l.materia === m).length, c = typeof smlColore === 'function' ? smlColore(m) : '#0F766E';
    return `<button class="sml-mat" data-m="${esc(m)}"><i style="background:${c}"></i><span>${esc(m)}</span><small>${esc(ti('mat.lez', {n}))}</small><span class="smx-chev">›</span></button>`; }).join('')
    : `<div class="hint" style="padding:10px 0">${esc(ti('mat.0'))}</div>`;
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { STU.m = b.dataset.m; STU.dentro = true; vai('studia'); });
}
async function smiVerifica(s) {
  if (!SMI.ver) { const r = await A.sm_verifica(); SMI.ver = new Set((r && r.voci) || []); }
  const V = ['mappe', 'formulario', 'calcolatrice', 'tabelline', 'tempo', 'orale', 'lettore', 'meno'];
  s.innerHTML = `<div class="sml-nota" style="background:var(--sm-pett);color:var(--sm-pet2)">${smIco('i-info')}<span>${esc(ti('ver.nota'))}</span></div>
    <div class="smi-spunte">${V.map(k => `<button class="smi-sp${SMI.ver.has(k) ? ' on' : ''}" data-v="${k}"><span class="smx-cer${SMI.ver.has(k) ? ' si' : ''}">${SMI.ver.has(k) ? ckSvg : ''}</span>${esc(ti('v.' + k))}</button>`).join('')}</div>`;
  s.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
    const k = b.dataset.v; SMI.ver.has(k) ? SMI.ver.delete(k) : SMI.ver.add(k);
    const r = await A.sm_verifica([...SMI.ver]); SMI.ver = new Set((r && r.voci) || []); smiVerifica(s);
  });
}
function smiPrivacy(s) {
  const ok = `<span class="smx-chip ok">${esc(ti('sempre'))}</span>`;
  s.innerHTML = `<div class="card smi-card">${smiRiga(ti('p.pc'), ti('p.pc.s'), ok)}${smiRiga(ti('p.voce'), ti('p.voce.s'), ok)}${smiRiga(ti('p.testo'), ti('p.testo.s'), ok)}
    ${smiRiga(ti('p.err'), ti('p.err.s'), `<span class="sw${R.rapporti ? ' on' : ''}" id="smiErr"></span>`)}
    ${smiRiga(ti('p.perm'), ti('p.perm.s'), `<button class="btn b-ghost b-sm" id="smiPerm">${esc(ti('leggi'))} ›</button>`)}</div>`;
  $('smiErr').onclick = async () => { const si = !R.rapporti; await A.imposta('rapporti_errori', si); R.rapporti = si; R.rapporti_chiesto = true; smiPrivacy(s); };
  $('smiPerm').onclick = () => dialogo({titolo: t('pv.r.t').replace(/^\S+\s/, ''), testo: t('pv.r')});
}
function smiInfo(s) {
  s.innerHTML = `<div class="card smi-card">${smiRiga(ti('lingua'), '', smiSeg('smiLin', [['it', 'Italiano'], ['en', 'English']], LINGUA))}
    ${smiRiga(ti('versione'), R.versione ? 'Scripta Manent ' + R.versione : '', `<button class="btn b-ghost b-sm" id="smiVer">${esc(ti('apri'))} ›</button>`)}
    ${smiRiga(ti('guida'), ti('guida.s'), `<button class="btn b-ghost b-sm" id="smiGuida">${esc(ti('apri'))} ›</button>`)}</div>`;
  $('smiLin').querySelectorAll('span').forEach(x => x.onclick = () => { const b = document.querySelector(`#segLingua [data-l="${x.dataset.v}"]`); if (b) b.click(); setTimeout(smImpDisegna, 600); });
  $('smiVer').onclick = () => vai('info');
  $('smiGuida').onclick = () => vai('guida');
}
function smImpAttiva() {
  if (typeof SCRIPTA === 'undefined' || !SCRIPTA || smImpAttiva.fatto) return;
  smImpAttiva.fatto = true;
  smImpPrepara();
  const vaiPrima = vai;
  vai = function (p) {
    if (p !== 'imp') smiLmIndietro();
    const r = vaiPrima.apply(this, arguments);
    if (p === 'imp') setTimeout(smImpDisegna, 0);
    return r;
  };
}
