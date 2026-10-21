'use strict';
/* Scripta Manent — Compiti (stile professionale): a sinistra la settimana e il diario, a destra la scheda del compito.
   Il diario si scrive da solo dalle lezioni (con la frase e la voce del prof), dalla foto del diario o a mano.
   La scheda ha tutte le funzioni, divise in schede: per un compito «Il compito / Capire / Farlo / Organizzati»,
   per una verifica «La verifica / Il piano / Ripassa / Mettiti alla prova».
   Sostituisce smComp di strumenti_sm.js (questo file si carica dopo). */

const SMK_T = {
  it: {
    h: 'Compiti', sett: 'Questa settimana {f} di {n} fatti', foto: 'Fotografa il diario', scegli: 'Scegli una foto', mano: 'Scrivi a mano', agg: 'Aggiungi',
    oggi: 'Oggi', domani: 'Domani', senza: 'Senza data', fatti: 'Fatti ({n})', vuoto: 'Ancora nessun compito.',
    'come.h': 'Come arrivano i compiti', 'come.1': 'Dalle lezioni', 'come.1.s': 'Quando il prof assegna un compito o annuncia una verifica, lo scrivo io qui, con la sua frase.',
    'come.2': 'Dalla foto del diario', 'come.2.s': 'Fotografa la pagina del diario: leggo materia, compito e data.', 'come.3': 'A mano', 'come.3.s': 'Scrivi tu cosa devi fare e per quando.',
    'tag.lez': 'Dalla lezione', 'tag.verifica': 'Verifica', 'tag.interrogazione': 'Interrogazione',
    'per': 'Per <b>{q}</b>', 'per.oggi': 'oggi', 'per.domani': 'domani', 'ver.per': '{t} <b>{d}</b>', 'ver.fra': 'fra {n} giorni', 'ver.fra1': 'domani', 'ver.oggi': 'oggi', 'nodata': 'Senza data',
    fatto: 'Segna come fatto', rimetti: 'Rimetti da fare', leggi: 'Leggimelo', ripassa: 'Inizia il ripasso di oggi', altro: 'Altro',
    't.compito': 'Il compito', 't.capire': 'Capire', 't.farlo': 'Farlo', 't.org': 'Organizzati',
    't.verifica': 'La verifica', 't.piano': 'Il piano', 't.ripassa': 'Ripassa', 't.prova': 'Mettiti alla prova',
    'prof.h': 'Il prof l\'ha detto così', 'prof.senti': 'Senti il prof', 'prof.kar': 'Karaoke della lezione', 'prof.lez': 'Apri la lezione', 'prof.a': 'alle {o}',
    'g.gest': 'Gestisci', mod: 'Modifica', 'mod.s': 'Testo, materia o tipo', sposta: 'Sposta la data', 'sposta.s': 'Se il prof l\'ha rimandato', stampa: 'Stampa', 'stampa.s': 'Con i pezzi e i tempi',
    manda: 'Manda a un compagno', 'manda.s': 'Copio il testo: incollalo su WhatsApp', 'manda.ok': 'Copiato: incollalo dove vuoi', togli: 'Togli dall\'elenco', 'togli.s': 'Se è sbagliato', tolto: 'Tolto dall\'elenco', fattoT: 'Segnato come fatto', nonfattoT: 'Rimesso da fare',
    'g.lez': 'Dalla lezione', 'g.chiedi': 'Chiedi e guarda', 'g.libro': 'Dal libro', 'g.mate': 'Matematica', 'g.scrivi': 'Scrivere', 'g.studia': 'Studiare', 'g.tempo': 'Il tuo tempo',
    'nolez': 'Questo compito non viene da una lezione: uso l\'ultima lezione di {m}.', 'nolez0': 'Nessuna lezione di questa materia: registrala e qui trovi tutto.',
    'pz.h': 'Diviso in pezzi', 'pz.tot': '{m} minuti in tutto', 'pz.inizia': 'Inizia', 'pz.corso': 'In corso', 'pz.primo': 'Inizia dal primo da fare ({n})', 'pz.fatto': 'Fatto, avanti', 'pz.ferma': 'Ferma',
    'pz.di': 'Pezzo {i} di {n}', 'pz.lav': 'Divido il compito in pezzi…', 'pz.rifai': 'Dividilo in modo diverso', 'pz.rifai.s': 'Pezzi nuovi', 'pz.finito': 'Tutti i pezzi fatti. Segno il compito come fatto?',
    ric: 'Ricordamelo', 'ric.s': 'Scegli giorno e ora', 'ric.si': 'Te lo ricordo {q}', 'ric.no': 'Promemoria tolto', 'ric.on': 'Promemoria: {q}', tutor: 'Il tuo tutor', 'tutor.s': 'Cosa fare oggi, in ordine',
    'porta.h': 'Cosa porta', 'porta.lez': 'Lezioni di {m}', 'porta.libro': 'Il libro di {m}', 'porta.libro.s': 'Le pagine collegate alle lezioni',
    'piano.apri': 'Il piano giorno per giorno', 'piano.apri.s': 'Fino alla verifica, si aggiorna da solo', genitori: 'Manda ai genitori', 'genitori.s': 'Data e argomenti, da incollare',
    'g.asc': 'Ascolta e guarda', 'g.mem': 'Memorizza', 'g.come': 'Come sarà la verifica', 'g.porta': 'Da portare',
    salva: 'Salva', annulla: 'Annulla', materia: 'Materia', cosa: 'Cosa devo fare', perq: 'Per quando', tipo: 'Che cos\'è', compito: 'Compito',
    'ric.giorno': 'Giorno', 'ric.ora': 'Ora', 'ric.togli': 'Togli il promemoria', 'promemoria': 'Promemoria: {c}',
    'vuota.h': 'Scegli un compito', 'vuota.s': 'Tocca un compito a sinistra per vedere la sua scheda.',
  },
  en: {
    h: 'Homework', sett: 'This week {f} of {n} done', foto: 'Photo of the planner', scegli: 'Choose a photo', mano: 'Write it', agg: 'Add',
    oggi: 'Today', domani: 'Tomorrow', senza: 'No date', fatti: 'Done ({n})', vuoto: 'No homework yet.',
    'come.h': 'How homework arrives', 'come.1': 'From lessons', 'come.1.s': 'When the teacher gives homework or announces a test, I write it here, with their words.',
    'come.2': 'From a photo of the planner', 'come.2.s': 'Take a photo of the planner page: I read subject, task and date.', 'come.3': 'By hand', 'come.3.s': 'Write what you have to do and when.',
    'tag.lez': 'From the lesson', 'tag.verifica': 'Test', 'tag.interrogazione': 'Oral test',
    'per': 'For <b>{q}</b>', 'per.oggi': 'today', 'per.domani': 'tomorrow', 'ver.per': '{t} <b>{d}</b>', 'ver.fra': 'in {n} days', 'ver.fra1': 'tomorrow', 'ver.oggi': 'today', 'nodata': 'No date',
    fatto: 'Mark as done', rimetti: 'Back to do', leggi: 'Read it to me', ripassa: 'Start today\'s review', altro: 'More',
    't.compito': 'The task', 't.capire': 'Understand', 't.farlo': 'Do it', 't.org': 'Plan',
    't.verifica': 'The test', 't.piano': 'The plan', 't.ripassa': 'Review', 't.prova': 'Try yourself',
    'prof.h': 'The teacher said it like this', 'prof.senti': 'Hear the teacher', 'prof.kar': 'Lesson karaoke', 'prof.lez': 'Open the lesson', 'prof.a': 'at {o}',
    'g.gest': 'Manage', mod: 'Edit', 'mod.s': 'Text, subject or type', sposta: 'Move the date', 'sposta.s': 'If it was postponed', stampa: 'Print', 'stampa.s': 'With parts and times',
    manda: 'Send to a classmate', 'manda.s': 'I copy the text: paste it on WhatsApp', 'manda.ok': 'Copied: paste it where you want', togli: 'Remove from the list', 'togli.s': 'If it is wrong', tolto: 'Removed', fattoT: 'Marked as done', nonfattoT: 'Back to do',
    'g.lez': 'From the lesson', 'g.chiedi': 'Ask and look', 'g.libro': 'From the book', 'g.mate': 'Maths', 'g.scrivi': 'Writing', 'g.studia': 'Studying', 'g.tempo': 'Your time',
    'nolez': 'This task does not come from a lesson: I use the last {m} lesson.', 'nolez0': 'No lesson for this subject yet.',
    'pz.h': 'In parts', 'pz.tot': '{m} minutes in all', 'pz.inizia': 'Start', 'pz.corso': 'Running', 'pz.primo': 'Start the first to do ({n})', 'pz.fatto': 'Done, next', 'pz.ferma': 'Stop',
    'pz.di': 'Part {i} of {n}', 'pz.lav': 'Splitting the task…', 'pz.rifai': 'Split it differently', 'pz.rifai.s': 'New parts', 'pz.finito': 'All parts done. Mark the task as done?',
    ric: 'Remind me', 'ric.s': 'Choose day and time', 'ric.si': 'I\'ll remind you {q}', 'ric.no': 'Reminder removed', 'ric.on': 'Reminder: {q}', tutor: 'Your tutor', 'tutor.s': 'What to do today, in order',
    'porta.h': 'What it covers', 'porta.lez': '{m} lessons', 'porta.libro': 'The {m} book', 'porta.libro.s': 'The pages linked to the lessons',
    'piano.apri': 'Day by day plan', 'piano.apri.s': 'Until the test, updates by itself', genitori: 'Send to parents', 'genitori.s': 'Date and topics, to paste',
    'g.asc': 'Listen and look', 'g.mem': 'Memorise', 'g.come': 'Like the real test', 'g.porta': 'To bring',
    salva: 'Save', annulla: 'Cancel', materia: 'Subject', cosa: 'What to do', perq: 'For when', tipo: 'What is it', compito: 'Homework',
    'ric.giorno': 'Day', 'ric.ora': 'Time', 'ric.togli': 'Remove the reminder', 'promemoria': 'Reminder: {c}',
    'vuota.h': 'Choose a task', 'vuota.s': 'Tap a task on the left to see its card.',
  },
};
function tk(k, p) {
  let s = (SMK_T[LINGUA] && SMK_T[LINGUA][k]) ?? SMK_T.it[k] ?? k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
}
const SMK = {sel: null, tab: 0, gi: -1, gt: null, sec: 0};
const ckSvg = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';

/* ------------------------------------------------------------------ dati */
async function smComp() {
  const sec = $('v-smcomp');
  sec.classList.add('smk');
  const r = await A.sm_compiti();
  SMS.comp = (r && r.compiti) || []; SMS.oggi = (r && r.oggi) || new Date().toISOString().slice(0, 10);
  if (SMS.apri) { SMK.sel = SMS.apri; SMK.tab = 0; SMS.apri = null; }
  if (!SMS.comp.some(v => v.id === SMK.sel)) { const p = smkOrdinati().find(v => !v.fatto); SMK.sel = p ? p.id : null; SMK.tab = 0; }
  smCompDisegna();
  if (r && r.lavoro) { clearTimeout(SMS.giroLez); SMS.giroLez = setTimeout(() => { if (pagina === 'smcomp') smComp(); }, 15000); }
}
function smkOrdinati() { return [...SMS.comp].sort((a, b) => (a.per || '9999').localeCompare(b.per || '9999')); }
function smkVoce() { return SMS.comp.find(v => v.id === SMK.sel) || null; }
function smkLezione(v) {
  const lz = (LZ ? LZ.lezioni : []).filter(l => l.stato === 'pronta');
  return lz.find(l => v.cartella && l.cartella === v.cartella) || lz.find(l => v.fonte && l.nome === v.fonte) || null;
}
function smkLezMateria(v) {
  return (LZ ? LZ.lezioni : []).filter(l => l.stato === 'pronta' && v.materia && (l.materia || '').toLowerCase() === v.materia.toLowerCase());
}
function smkDataBreve(iso) { try { return new Date(iso + 'T12:00').toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {day: 'numeric', month: 'long'}); } catch (e) { return iso; } }
function smkGiorno(iso) { try { const s = new Date(iso + 'T12:00').toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {weekday: 'long'}); return s.charAt(0).toUpperCase() + s.slice(1); } catch (e) { return iso; } }
function smkOra(sec) { sec = Math.max(0, Math.round(+sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, z = String(sec % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${z}` : `${m}:${z}`; }

/* ------------------------------------------------------------------ pagina */
function smCompDisegna() {
  const sec = $('v-smcomp'), box = sec.querySelector('.smbox');
  const hd = sec.querySelector('.hd');
  hd.innerHTML = `<div><h2>${esc(tk('h'))}</h2></div><div class="row" style="gap:8px;flex-wrap:wrap">
    <button class="btn b-ghost b-sm" id="smkMano">${smIco('g-piu')} ${esc(tk('mano'))}</button>
    <button class="btn b-ghost b-sm" id="smkScegli">${smIco('g-img')} ${esc(tk('scegli'))}</button>
    <button class="btn b-main b-sm" id="smkFoto">${smIco('g-foto')} ${esc(tk('foto'))}</button></div>`;
  // settimana da lunedi'
  const oggi = new Date(SMS.oggi + 'T12:00'), lun = new Date(oggi); lun.setDate(oggi.getDate() - ((oggi.getDay() + 6) % 7));
  const giorni = Array.from({length: 7}, (_, i) => { const d = new Date(lun); d.setDate(lun.getDate() + i); return d.toISOString().slice(0, 10); });
  const nellaSett = SMS.comp.filter(v => v.per && v.per >= giorni[0] && v.per <= giorni[6]);
  const fattiS = nellaSett.filter(v => v.fatto).length;
  const nomeG = iso => new Date(iso + 'T12:00').toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {weekday: 'short'}).replace('.', '');
  const strip = giorni.map(iso => {
    const qui = SMS.comp.filter(v => v.per === iso && !v.fatto);
    return `<button class="smk-g${iso === SMS.oggi ? ' oggi' : ''}" data-g="${iso}">${esc(nomeG(iso))}<b>${+iso.slice(8)}</b><span class="pt">${qui.slice(0, 3).map(v => `<i class="${v.tipo !== 'compito' ? 'v' : ''}"></i>`).join('')}</span></button>`;
  }).join('');
  // diario per giorno
  const aperti = smkOrdinati().filter(v => !v.fatto), fatti = smkOrdinati().filter(v => v.fatto);
  let lista = '', ult = null;
  aperti.forEach(v => {
    const k = v.per || '';
    if (k !== ult) {
      ult = k;
      const g = k ? smGiorni(k) : null;
      const tit = !k ? tk('senza') : g === 0 ? tk('oggi') : g === 1 ? tk('domani') : smkGiorno(k);
      lista += `<div class="smk-gt" data-gt="${esc(k)}"${k && g < 0 ? ' data-tardi="1"' : ''}>${esc(tit)}${k ? ` <small>${esc(smkDataBreve(k))}</small>` : ''}</div>`;
    }
    lista += smkRiga(v);
  });
  if (fatti.length) lista += `<details class="smk-fatti"><summary>${esc(tk('fatti', {n: fatti.length}))}</summary>${fatti.slice(-12).reverse().map(smkRiga).join('')}</details>`;
  box.innerHTML = `<div class="smk-w"><div class="smk-sx">
      <div class="smk-prog"><span>${esc(tk('sett', {f: fattiS, n: nellaSett.length}))}</span><span class="smk-bar"><i style="width:${nellaSett.length ? Math.round(fattiS / nellaSett.length * 100) : 0}%"></i></span></div>
      <div class="smk-strip">${strip}</div>
      <div class="smk-lista" id="smkLista">${lista || `<div class="hint" style="padding:14px 4px">${esc(tk('vuoto'))}</div>`}</div></div>
    <div class="smk-dx" id="smkScheda"></div></div>`;
  $('smkFoto').onclick = () => smkFoto(true);
  $('smkScegli').onclick = () => smkFoto(false);
  $('smkMano').onclick = () => smkModulo(null);
  box.querySelectorAll('.smk-g').forEach(b => b.onclick = () => { const h = box.querySelector(`.smk-gt[data-gt="${b.dataset.g}"]`); if (h) h.scrollIntoView({behavior: 'smooth', block: 'start'}); });
  box.querySelectorAll('.smk-r').forEach(r => {
    r.onclick = () => { SMK.sel = r.dataset.id; SMK.tab = 0; smkStopGuida(); smCompDisegna(); if (ANDROID) $('smkScheda').scrollIntoView({behavior: 'smooth'}); };
    r.querySelector('.smx-cer').onclick = ev => { ev.stopPropagation(); smkFatto(r.dataset.id); };
  });
  smkScheda();
  smInfoGiro(sec);
}
function smkRiga(v) {
  return `<div class="smk-r${v.id === SMK.sel ? ' sel' : ''}${v.fatto ? ' fatto' : ''}" data-id="${esc(v.id)}" tabindex="0">
    <button class="smx-cer${v.fatto ? ' si' : ''}" aria-label="${esc(tk(v.fatto ? 'rimetti' : 'fatto'))}">${v.fatto ? ckSvg : ''}</button>
    <div class="smk-rt"><div class="smk-mat">${esc(v.materia || '—')}${v.tipo !== 'compito' ? `<span class="smx-chip amb">${esc(tk('tag.' + v.tipo))}</span>` : ''}${v.fonte ? `<span class="smx-chip pet">${esc(tk('tag.lez'))}</span>` : ''}</div>
      <div class="smk-cosa">${esc(v.cosa)}</div></div></div>`;
}
async function smkFatto(id) {
  const v = SMS.comp.find(x => x.id === id); if (!v) return;
  const prima = !!v.fatto, r = await A.sm_compito(id, !prima, false);
  SMS.comp = r.compiti; smCompDisegna();
  smAnnulla(tk(prima ? 'nonfattoT' : 'fattoT'), async () => { const r2 = await A.sm_compito(id, prima, false); SMS.comp = r2.compiti; smCompDisegna(); });
}
async function smkFoto(scatta) {
  const s = scatta ? await A.scatta_foglio() : await A.scegli_immagini();
  if (!s || !s.ok || !s.percorsi || !s.percorsi.length) return;
  const b = $('smkFoto'); b.disabled = true; b.innerHTML = `<span class="spin"></span> ${esc(ts('comp.lav'))}`;
  const r = await A.sm_diario(s.percorsi);
  if (!r || !r.ok) { toast((r && r.msg) || ''); return smCompDisegna(); }
  SMS.comp = r.compiti; toast(r.nuovi ? ts('comp.nuovi', {n: r.nuovi}) : ts('comp.nuovi0')); smCompDisegna();
}

/* ------------------------------------------------------------------ modulo (nuovo, modifica, sposta, promemoria) */
function smkFinestra(titolo, corpo, salva) {
  const v = document.createElement('div'); v.className = 'velo';
  v.innerHTML = `<div class="dlg smk-dlg"><h3>${esc(titolo)}</h3>${corpo}<div class="bt"><button class="btn b-sm b-ghost" data-x="1">${esc(tk('annulla'))}</button><button class="btn b-sm b-main" data-ok="1">${esc(tk('salva'))}</button></div></div>`;
  document.body.appendChild(v);
  v.querySelector('[data-x]').onclick = () => v.remove();
  v.querySelector('[data-ok]').onclick = async () => { if (await salva(v) !== false) v.remove(); };
  const f = v.querySelector('input,textarea'); if (f) f.focus();
  return v;
}
function smkModulo(v, soloData) {
  const c = (n, l, h) => `<label class="smk-campo"><span>${esc(l)}</span>${h}</label>`;
  const corpo = soloData ? c('per', tk('perq'), `<input class="in" type="date" name="per" value="${esc((v && v.per) || '')}">`)
    : c('materia', tk('materia'), `<input class="in" name="materia" maxlength="60" value="${esc((v && v.materia) || '')}" list="smkMat">`)
      + `<datalist id="smkMat">${[...new Set((LZ ? LZ.lezioni : []).map(l => l.materia).filter(Boolean))].map(m => `<option value="${esc(m)}">`).join('')}</datalist>`
      + c('cosa', tk('cosa'), `<textarea class="in" name="cosa" rows="3" maxlength="300">${esc((v && v.cosa) || '')}</textarea>`)
      + `<div class="smk-due">${c('per', tk('perq'), `<input class="in" type="date" name="per" value="${esc((v && v.per) || '')}">`)}
        ${c('tipo', tk('tipo'), `<select class="in" name="tipo">${['compito', 'verifica', 'interrogazione'].map(x => `<option value="${x}"${v && v.tipo === x ? ' selected' : ''}>${esc(x === 'compito' ? tk('compito') : tk('tag.' + x))}</option>`).join('')}</select>`)}</div>`;
  smkFinestra(soloData ? tk('sposta') : v ? tk('mod') : tk('mano'), corpo, async d => {
    const val = n => { const e = d.querySelector(`[name="${n}"]`); return e ? e.value : undefined; };
    const campi = soloData ? {per: val('per')} : {materia: val('materia'), cosa: val('cosa'), per: val('per'), tipo: val('tipo')};
    if (!soloData && !String(campi.cosa || '').trim()) { d.querySelector('[name="cosa"]').focus(); return false; }
    const r = v ? await A.sm_compito_modifica(v.id, campi) : await A.sm_compito_nuovo(campi);
    if (!r) return false;
    SMS.comp = r.compiti;
    if (!v) { const n = SMS.comp.find(x => x.cosa === String(campi.cosa).trim() && !x.fatto); if (n) { SMK.sel = n.id; SMK.tab = 0; } }
    smCompDisegna();
  });
}
function smkRicordami(v) {
  const d = new Date(); d.setDate(d.getDate() + (d.getHours() >= 17 ? 1 : 0));
  const q = v.ricorda || `${d.toISOString().slice(0, 10)}T17:00`;
  const fin = smkFinestra(tk('ric'), `<div class="smk-due"><label class="smk-campo"><span>${esc(tk('ric.giorno'))}</span><input class="in" type="date" name="g" value="${esc(q.slice(0, 10))}"></label>
      <label class="smk-campo"><span>${esc(tk('ric.ora'))}</span><input class="in" type="time" name="o" value="${esc(q.slice(11, 16))}"></label></div>
      ${v.ricorda ? `<button class="lnk" data-via="1" style="margin-top:6px">${esc(tk('ric.togli'))}</button>` : ''}`, async el => {
    const g = el.querySelector('[name="g"]').value, o = el.querySelector('[name="o"]').value || '17:00';
    if (!g) return false;
    const r = await A.sm_ricordami(v.id, `${g}T${o}`); SMS.comp = r.compiti; smCompDisegna();
    toast(tk('ric.si', {q: `${smkDataBreve(g)} ${o}`}));
  });
  const via = fin.querySelector('[data-via]');
  if (via) via.onclick = async () => { const r = await A.sm_ricordami(v.id, ''); SMS.comp = r.compiti; fin.remove(); smCompDisegna(); toast(tk('ric.no')); };
}
// i promemoria arrivati: si controlla all'apertura e poi ogni minuto
async function smkPromemoria() {
  try { const r = await A.sm_promemoria(); (r && r.pronti || []).forEach(v => toast(tk('promemoria', {c: (v.materia ? v.materia + ': ' : '') + v.cosa}))); } catch (e) {}
}
if (typeof SCRIPTA !== 'undefined') { setInterval(() => { if (SCRIPTA) smkPromemoria(); }, 60000); setTimeout(() => { if (SCRIPTA) smkPromemoria(); }, 8000); }

/* ------------------------------------------------------------------ la scheda */
const smkF = (a, ico, tit, sub, cl = '', val = '') => `<button class="smx-f" data-f="${a}"><span class="smx-fi ${cl}">${smIco(ico)}</span><span class="smx-ft"><b>${esc(tit)}</b>${sub ? `<small class="sp">${esc(sub)}</small>` : ''}</span>${val ? `<span class="smx-val">${esc(val)}</span>` : ''}<span class="smx-chev">›</span></button>`;
const smkG = (tit, voci) => voci.filter(Boolean).length ? `<h3 class="smx-h3">${esc(tit)}</h3><div class="smx-lista">${voci.filter(Boolean).join('')}</div>` : '';
function smkScheda() {
  const el = $('smkScheda'); if (!el) return;
  const v = smkVoce();
  if (!v) {
    el.innerHTML = `<div class="smk-vuota"><h3 class="smx-h3">${esc(tk('come.h'))}</h3><div class="smx-lista">
      ${smkF('x-lez', 'g-reg', tk('come.1'), tk('come.1.s'))}${smkF('x-foto', 'g-foto', tk('come.2'), tk('come.2.s'))}${smkF('x-mano', 'i-edit', tk('come.3'), tk('come.3.s'))}</div></div>`;
    el.querySelector('[data-f="x-lez"]').onclick = () => vai('reg');
    el.querySelector('[data-f="x-foto"]').onclick = () => smkFoto(true);
    el.querySelector('[data-f="x-mano"]').onclick = () => smkModulo(null);
    smInfoGiro(el); return;
  }
  const ver = v.tipo !== 'compito', g = v.per ? smGiorni(v.per) : null;
  const scad = !v.per ? esc(tk('nodata')) : ver
    ? tk('ver.per', {t: esc(tk('tag.' + v.tipo)), d: esc(smData(v.per))}) + (g >= 0 ? ` · ${esc(g === 0 ? tk('ver.oggi') : g === 1 ? tk('ver.fra1') : tk('ver.fra', {n: g}))}` : '')
    : tk('per', {q: esc(g === 0 ? tk('per.oggi') : g === 1 ? tk('per.domani') : smData(v.per))}) + (g > 1 || g < 0 ? '' : `, ${esc(smData(v.per))}`);
  const TABS = ver ? [['verifica', tk('t.verifica')], ['piano', tk('t.piano')], ['vrip', tk('t.ripassa')], ['prova', tk('t.prova')]]
    : [['compito', tk('t.compito')], ['capire', tk('t.capire')], ['farlo', tk('t.farlo')], ['org', tk('t.org')]];
  if (SMK.tab >= TABS.length) SMK.tab = 0;
  el.innerHTML = `<div class="smk-testa">
      <div class="smk-mat">${esc(v.materia || '—')}${ver ? `<span class="smx-chip amb">${esc(tk('tag.' + v.tipo))}</span>` : ''}${v.fonte ? `<span class="smx-chip pet">${esc(tk('tag.lez'))}</span>` : ''}${v.ricorda ? `<span class="smx-chip gri">${esc(tk('ric.on', {q: smkDataBreve(v.ricorda.slice(0, 10)) + ' ' + v.ricorda.slice(11, 16)}))}</span>` : ''}</div>
      <h2>${esc(v.cosa)}</h2><div class="smk-scad${ver ? ' v' : ''}">${scad}</div>
      <div class="smk-az">${ver ? `<button class="btn b-main b-sm" data-z="ripassa">${esc(tk('ripassa'))}</button>`
        : `<button class="btn b-main b-sm" data-z="fatto">${v.fatto ? esc(tk('rimetti')) : `${ckSvg} ${esc(tk('fatto'))}`}</button>`}
        <button class="btn b-ghost b-sm" data-z="leggi">${smIco('g-voce')} ${esc(tk('leggi'))}</button></div>
      <div class="smx-tabs smk-tabs">${TABS.map(([k, n], i) => `<button class="${i === SMK.tab ? 'on' : ''}" data-t="${i}">${esc(n)}</button>`).join('')}</div></div>
    <div class="smk-corpo" id="smkCorpo"></div>`;
  el.querySelectorAll('.smk-tabs button').forEach(b => b.onclick = () => { SMK.tab = +b.dataset.t; smkStopGuida(); smkScheda(); });
  el.querySelector('[data-z="leggi"]').onclick = () => { const p = SMS.voce; SMS.voce = true; parlaSm([v.materia, ver ? tk('tag.' + v.tipo) : '', v.cosa, v.per ? smData(v.per) : ''].filter(Boolean).join('. ')); SMS.voce = p; };
  if (el.querySelector('[data-z="fatto"]')) el.querySelector('[data-z="fatto"]').onclick = () => smkFatto(v.id);
  if (el.querySelector('[data-z="ripassa"]')) el.querySelector('[data-z="ripassa"]').onclick = () => smRipassa(v.materia, 'tutor');
  smkCorpo(v, TABS[SMK.tab][0]);
}
function smkProf(v, l) {
  if (!v.frase && !(l && v.sec != null)) return '';
  return `<h3 class="smx-h3">${esc(tk('prof.h'))}${l ? `<small class="dato" style="font-weight:400;color:var(--sm-ard)">${esc(l.nome)}${v.sec != null ? ' · ' + esc(tk('prof.a', {o: smkOra(v.sec)})) : ''}</small>` : ''}</h3>
    <div class="smk-prof">${l && v.sec != null ? `<button class="smk-play" data-p="senti" aria-label="${esc(tk('prof.senti'))}"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M7 5l12 7-12 7z"/></svg></button>` : ''}
      <div class="smk-citaz">${v.frase ? `«${esc(v.frase)}»` : esc(v.cosa)}</div>
      ${l ? `<div class="smk-plink">${v.sec != null ? `<button data-p="senti">${esc(tk('prof.senti'))} ›</button>` : ''}<button data-p="kar">${esc(tk('prof.kar'))} ›</button><button data-p="lez">${esc(tk('prof.lez'))} ›</button></div>` : ''}</div>`;
}
function smkCorpo(v, k) {
  const el = $('smkCorpo'), l = smkLezione(v), lm = smkLezMateria(v), lu = l || lm[0] || null, m = smMateria(v.materia);
  const nota = !l && lu ? `<div class="hint" style="margin:-4px 0 10px">${esc(tk('nolez', {m: v.materia || ''}))}</div>` : !lu ? `<div class="hint" style="margin-bottom:10px">${esc(tk('nolez0'))}</div>` : '';
  const gest = smkG(tk('g.gest'), [smkF('mod', 'i-edit', tk('mod'), tk('mod.s')), smkF('sposta', 'g-cal', tk('sposta'), tk('sposta.s')),
    !(v.tipo !== 'compito') && smkF('stampa', 'g-stampa', tk('stampa'), tk('stampa.s')), smkF(v.tipo !== 'compito' ? 'genitori' : 'manda', 'g-manda', tk(v.tipo !== 'compito' ? 'genitori' : 'manda'), tk(v.tipo !== 'compito' ? 'genitori.s' : 'manda.s')),
    smkF('togli', 'g-cestino', tk('togli'), tk('togli.s'))]);
  const lez = lu ? [smkF('l:appunti_dsa', 'g-note', t('sd.ap'), t('sd.ap.s')), smkF('l:ascolta', 'g-voce', t('tl.asc'), t('sd.asc.s')), smkF('l:podcast', 'g-cuffie', t('sd.pc'), t('sd.pc.s')),
    smkF('l:karaoke', 'g-kar', t('tl.kk'), t('sd.kk.s')), smkF('l:mappa', 'i-map', t('sd.mappa'), t('sd.mappa.s')), lu.capitoli && smkF('l:capitoli', 'g-cap', t('tl.cap'), t('tl.cap.s'))] : [];
  let h = '';
  if (k === 'compito') h = smkProf(v, l) + gest;
  else if (k === 'capire') h = nota + `<div class="smk-col2"><div>${smkG(tk('g.lez'), lez)}</div><div>${smkG(tk('g.chiedi'), lu ? [smkF('l:chiedi', 'i-chat', t('tl.chiedi'), t('tl.chiedi.s')),
      smkF('l:infografica', 'g-img', t('tl.ig'), t('tl.ig.s')), lu.n_foto ? smkF('l:foto', 'g-foto', t('tl.fo'), '') : ''] : [])}
      ${m ? smkG(tk('g.libro'), [smkF('m:libro', 'g-libro', tk('porta.libro', {m: m.m}), tk('porta.libro.s')), smkF('m:glos', 'g-libro', t('tl.gl'), t('tl.dsa.gl.s'))]) : ''}</div></div>`;
  else if (k === 'farlo') h = `<div class="smk-col2"><div>${smkG(tk('g.mate'), [smkF('s:pb', 'g-foto', ts('mate.pb'), ts('sd.mate.s'), 'ind'), smkF('s:calc', 'g-calc', ts('mate.calc'), '', 'ind'),
      smkF('s:tab', 'g-calc', ts('mate.tab'), '', 'ind'), smkF('s:form', 'g-note', ts('mate.form'), '', 'ind')])}</div>
      <div>${smkG(tk('g.scrivi'), [smkF('dp', 'i-mic', t('sd.detta'), t('sd.detta.s')), smkF('smcorr', 'g-penna', ts('corr.h'), ts('sd.corr.s'))])}
      ${smkG(tk('g.studia'), lu ? [smkF('l:mappa', 'i-map', t('sd.mappa'), t('sd.mappa.s')), smkF('l:ripassa', 'i-cards', t('tl.flash'), t('tl.flash.s'))] : [])}</div></div>`;
  else if (k === 'org') h = `<div class="smk-guida" id="smkGuida"></div><div id="smkPezzi"><div class="hint row" style="gap:8px"><span class="spin"></span>${esc(tk('pz.lav'))}</div></div>`
      + smkG(tk('g.tempo'), [smkF('ric', 'g-orologio', tk('ric'), v.ricorda ? tk('ric.on', {q: smkDataBreve(v.ricorda.slice(0, 10)) + ' ' + v.ricorda.slice(11, 16)}) : tk('ric.s')),
        smkF('pzrifai', 'g-ripeti', tk('pz.rifai'), tk('pz.rifai.s')), m && smkF('m:tutor', 'g-tutor', tk('tutor'), tk('tutor.s'))]);
  else if (k === 'verifica') h = smkProf(v, l) + `<h3 class="smx-h3">${esc(tk('porta.h'))}</h3><div class="smx-lista">${lm.slice(0, 6).map(x => `<button class="smx-f" data-lez="${esc(x.cartella)}"><span class="smx-fi">${smIco('g-lezioni')}</span><span class="smx-ft"><b>${esc(x.nome)}</b><small class="dato">${esc([x.quando, x.durata].filter(Boolean).join(' · '))}</small></span><span class="smx-chev">›</span></button>`).join('')}
      ${m ? smkF('m:libro', 'g-libro', tk('porta.libro', {m: m.m}), tk('porta.libro.s')) : ''}</div>${lm.length ? '' : `<div class="hint" style="margin-top:8px">${esc(tk('nolez0'))}</div>`}` + gest;
  else if (k === 'piano') h = smkG(tk('t.piano'), m ? [smkF('m:piano', 'g-cal', tk('piano.apri'), tk('piano.apri.s')), smkF('m:tutor', 'g-tutor', tk('tutor'), tk('tutor.s')), smkF('ric', 'g-orologio', tk('ric'), tk('ric.s'))] : [smkF('ric', 'g-orologio', tk('ric'), tk('ric.s'))])
      + (m ? '' : `<div class="hint" style="margin-top:8px">${esc(t('sd.no.mat'))}</div>`);
  else if (k === 'vrip') h = m ? `<div class="smk-col2"><div>${smkG(tk('g.asc'), [smkF('m:ascm', 'g-voce', t('tl.asc'), ''), smkF('m:mappe', 'i-map', t('st.mappe.t', {m: m.m}), ''), smkF('m:libro', 'g-libro', tk('porta.libro', {m: m.m}), '')])}</div>
      <div>${smkG(tk('g.mem'), [smkF('m:fcorso', 'i-cards', t('tl.flash'), t('tl.flash.s')), smkF('rg', 'i-cards', t('sd.rg'), t('sd.rg.s')), smkF('m:glos', 'g-libro', t('tl.gl'), t('tl.dsa.gl.s')), smkF('m:prob', 'g-stella', t('tl.prob'), t('tl.prob.s'))])}</div></div>`
      : `<div class="hint">${esc(t('sd.no.mat'))}</div>`;
  else if (k === 'prova') h = m ? `<div class="smk-col2"><div>${smkG(tk('g.come'), [smkF('m:test', 'g-test', t('tl.dsa.test'), t('sd.test.s')), smkF('m:orale', 'i-mic', t('tl.orale'), t('sd.orale.s')), smkF('m:scritto', 'g-penna', t('tl.dsa.scr'), t('sd.scr.s'))])}</div>
      <div>${smkG(tk('g.porta'), [smkF('m:mverif', 'g-stampa', t('tl.mv'), t('sd.mv.s')), smkF('strumenti', 'g-lista', t('sd.str'), t('sd.str.s'))])}</div></div>`
      : `<div class="hint">${esc(t('sd.no.mat'))}</div>`;
  el.innerHTML = h;
  // azioni
  el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    if (b.dataset.p === 'senti') return mostraMomento(l.cartella, v.sec || 0, null, l.nome);
    if (b.dataset.p === 'kar') return apriKaraoke(l);
    if (b.dataset.p === 'lez') return apriLezione(l);
  });
  el.querySelectorAll('[data-lez]').forEach(b => b.onclick = () => { const x = (LZ ? LZ.lezioni : []).find(y => y.cartella === b.dataset.lez); if (x) apriLezione(x); });
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => smkAzione(v, b.dataset.f, lu, m));
  if (k === 'org') smkPezzi(v);
  smInfoGiro(el);
}
async function smkAzione(v, f, lu, m) {
  if (f.startsWith('l:')) return lu && tileLezione(lu, f.slice(2));
  if (f.startsWith('m:')) return m ? tileStudia(m, f.slice(2)) : toast(t('sd.no.mat'));
  if (f.startsWith('s:')) { SMS.mate = f.slice(2); return vai('smmate'); }
  if (f === 'dp') return vai('dp');
  if (f === 'smcorr') return vai('smcorr');
  if (f === 'rg') return apriRipassoGiorno();
  if (f === 'strumenti') return strumentiDsa();
  if (f === 'mod') return smkModulo(v);
  if (f === 'sposta') return smkModulo(v, true);
  if (f === 'ric') return smkRicordami(v);
  if (f === 'pzrifai') { $('smkPezzi').innerHTML = `<div class="hint row" style="gap:8px"><span class="spin"></span>${esc(tk('pz.lav'))}</div>`; const r = await A.sm_pezzi(v.id, true); if (r && r.ok) SMS.comp = r.compiti; return smkPezzi(smkVoce()); }
  if (f === 'manda' || f === 'genitori') {
    const testo = [v.materia, v.tipo !== 'compito' ? tk('tag.' + v.tipo) : '', v.cosa, v.per ? smData(v.per) : ''].filter(Boolean).join(' · ');
    try { await navigator.clipboard.writeText(testo); } catch (e) { const ta = document.createElement('textarea'); ta.value = testo; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove(); }
    return toast(tk('manda.ok'));
  }
  if (f === 'stampa') {
    const pz = (v.pezzi || []).map((p, i) => `<li>${esc(p.t)} — ${p.m} min</li>`).join('');
    return smStampa(`<p><b>${esc(v.materia || '')}</b> · ${esc(v.per ? smData(v.per) : '')}</p><p style="font-size:20px">${esc(v.cosa)}</p>${v.frase ? `<p>«${esc(v.frase)}»</p>` : ''}${pz ? `<ol>${pz}</ol>` : ''}`, tk('h'));
  }
  if (f === 'togli') {
    const copia = {...v}, r = await A.sm_compito(v.id, null, true); SMS.comp = r.compiti; smCompDisegna();
    smAnnulla(tk('tolto'), async () => {
      let r2 = await A.sm_compito_nuovo(copia);
      const n = (r2.compiti || []).find(x => x.cosa === copia.cosa && x.per === copia.per);
      if (n && copia.fatto) r2 = await A.sm_compito(n.id, true, false);
      SMS.comp = r2.compiti; if (n) SMK.sel = n.id; smCompDisegna();
    });
  }
}

/* ------------------------------------------------------------------ pezzi e guida col tempo */
async function smkPezzi(v) {
  if (!v) return;
  if (!v.pezzi) { const r = await A.sm_pezzi(v.id, false); if (r && r.ok) { SMS.comp = r.compiti; v = smkVoce(); } }
  const box = $('smkPezzi'); if (!box || !v || !v.pezzi) return;
  const P = v.pezzi, tot = P.reduce((s, p) => s + (+p.m || 0), 0), primo = P.findIndex(p => !p.f);
  box.innerHTML = `<h3 class="smx-h3">${esc(tk('pz.h'))}<small class="dato" style="font-weight:400;color:var(--sm-ard)">${esc(tk('pz.tot', {m: tot}))}</small></h3>
    <div class="smx-lista">${P.map((p, i) => `<div class="smk-pz${p.f ? ' fatto' : ''}${p.pausa ? ' pausa' : ''}${SMK.gi === i ? ' corr' : ''}">
      <button class="smk-nck${p.f ? ' si' : ''}" data-pz="${i}" aria-label="${esc(tk('pz.di', {i: i + 1, n: P.length}))}">${p.f ? ckSvg : i + 1}</button>
      <span class="smk-pzt">${esc(p.t)}</span><span class="smx-val">${p.m} min</span>
      <button class="btn b-ghost b-sm" data-via="${i}">▶ ${esc(tk(SMK.gi === i ? 'pz.corso' : 'pz.inizia'))}</button></div>`).join('')}</div>
    ${primo >= 0 ? `<div style="margin-top:12px"><button class="btn b-main b-sm" id="smkPrimo">▶ ${esc(tk('pz.primo', {n: primo + 1}))}</button></div>` : ''}`;
  box.querySelectorAll('[data-pz]').forEach(b => b.onclick = async () => { const i = +b.dataset.pz, r = await A.sm_pezzo(v.id, i, !P[i].f); SMS.comp = r.compiti; smkStopGuida(); smkPezziFiniti(); });
  box.querySelectorAll('[data-via]').forEach(b => b.onclick = () => smkGuida(+b.dataset.via));
  if ($('smkPrimo')) $('smkPrimo').onclick = () => smkGuida(primo);
}
function smkStopGuida() { clearInterval(SMK.gt); SMK.gt = null; SMK.gi = -1; const g = $('smkGuida'); if (g) { g.classList.remove('on'); g.innerHTML = ''; } }
function smkGuida(i) {
  const v = smkVoce(); if (!v || !v.pezzi || !v.pezzi[i]) return;
  smkStopGuida(); SMK.gi = i; SMK.sec = (+v.pezzi[i].m || 10) * 60;
  smkPezzi(v);
  const dis = () => {
    const g = $('smkGuida'); if (!g) return smkStopGuida();
    g.classList.add('on');
    g.innerHTML = `<div class="smk-gtesta">${esc(tk('pz.di', {i: i + 1, n: v.pezzi.length}))}</div><div class="smk-gtit">${esc(v.pezzi[i].t)}</div>
      <div class="smk-gtempo">${String(Math.floor(SMK.sec / 60)).padStart(2, '0')}:${String(SMK.sec % 60).padStart(2, '0')}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn b-main b-sm" id="smkGok">${ckSvg} ${esc(tk('pz.fatto'))}</button><button class="btn b-ghost b-sm" id="smkGno">${esc(tk('pz.ferma'))}</button></div>`;
    $('smkGok').onclick = async () => { const r = await A.sm_pezzo(v.id, i, true); SMS.comp = r.compiti; smkStopGuida(); const w = smkVoce(), n = w.pezzi.findIndex(p => !p.f); if (n >= 0) smkGuida(n); else smkPezziFiniti(); };
    $('smkGno').onclick = () => { smkStopGuida(); smkPezzi(smkVoce()); };
  };
  dis(); parlaSm(tk('pz.di', {i: i + 1, n: v.pezzi.length}) + '. ' + v.pezzi[i].t);
  SMK.gt = setInterval(() => { SMK.sec = Math.max(0, SMK.sec - 1); if (!$('smkGuida')) return smkStopGuida(); const e = $('smkGuida').querySelector('.smk-gtempo'); if (e) e.textContent = `${String(Math.floor(SMK.sec / 60)).padStart(2, '0')}:${String(SMK.sec % 60).padStart(2, '0')}`; }, 1000);
}
async function smkPezziFiniti() {
  const v = smkVoce(); smkPezzi(v);
  if (v && v.pezzi && v.pezzi.every(p => p.f) && !v.fatto) {
    const ok = await dialogo({titolo: tk('pz.h'), testo: tk('pz.finito'), bottoni: [{t: esc(tk('annulla')), v: false}, {t: esc(tk('fatto')), cls: 'b-main', v: true}]});
    if (ok) smkFatto(v.id);
  }
}
