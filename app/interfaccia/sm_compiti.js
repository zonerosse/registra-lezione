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
    ctrl: 'Controlla il risultato', 'ctrl.s': 'Fotografa il tuo svolgimento: ti dico se è giusto e dove guardare', 'ctrl.foto': 'Fotografa lo svolgimento', 'ctrl.scegli': 'Scegli le foto',
    'ctrl.n': '{n} foto pronte', 'ctrl.testo': 'Il testo dell\'esercizio (se non si vede nella foto)', 'ctrl.vai': 'Controlla', 'ctrl.lav': 'Guardo il tuo svolgimento…',
    'ctrl.giusto': 'Giusto!', 'ctrl.giusto.s': 'Risultato e passaggi sono corretti.', 'ctrl.quasi': 'Quasi giusto', 'ctrl.quasi.s': 'C\'è un errore piccolo: guarda il passaggio segnato.',
    'ctrl.rivedere': 'Da rivedere', 'ctrl.rivedere.s': 'Il metodo non torna: rileggi i passaggi segnati.', 'ctrl.tuo': 'Il tuo risultato: {r}', 'ctrl.passi': 'I tuoi passaggi',
    'ctrl.sol': 'Mostrami come si fa', 'ctrl.sol.h': 'Come si fa', 'ctrl.rifai': 'Controlla di nuovo', 'ctrl.ultimo': 'Ultimo controllo: {q}',
    scal: 'Scaletta', 'scal.s': 'I punti in ordine prima di scrivere', 'scal.cosa': 'Cosa devi scrivere', 'scal.idee': 'Le tue idee, come vengono (puoi anche dettarle)',
    'scal.vai': 'Fammi la scaletta', 'scal.lav': 'Metto in ordine i punti…', 'scal.dom': 'Per scriverlo rispondi a:', 'scal.tue': 'Le tue idee qui', 'scal.su': 'Sposta su', 'scal.giu': 'Sposta giù',
    'scal.detta': 'Scrivi parlando', 'scal.stampa': 'Stampa', 'scal.rifai': 'Rifalla', 'scal.copia': 'Copiata: incollala dove scrivi',
    tim: 'Timer concentrazione', 'tim.s': '{m} minuti di lavoro, poi {p} di pausa', 'tim.lav': 'Lavoro', 'tim.pausa': 'Pausa', 'tim.via': 'Inizia', 'tim.ferma': 'Ferma', 'tim.sosta': 'Metti in pausa', 'tim.riprendi': 'Riprendi',
    'tim.giri': 'Giri fatti oggi: {n}', 'tim.min': 'Minuti di lavoro', 'tim.adesso': 'Adesso: {p}', 'tim.fine.lav': 'Bravo! Ora {p} minuti di pausa: alzati, bevi, muoviti.',
    'tim.fine.pausa': 'Pausa finita: si riparte.', 'tim.chip': 'Timer {t}', torna: 'Torna',
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
    ctrl: 'Check the result', 'ctrl.s': 'Take a photo of your working: I tell you if it is right and where to look', 'ctrl.foto': 'Photo of your working', 'ctrl.scegli': 'Choose photos',
    'ctrl.n': '{n} photos ready', 'ctrl.testo': 'The exercise text (if it is not in the photo)', 'ctrl.vai': 'Check', 'ctrl.lav': 'Looking at your working…',
    'ctrl.giusto': 'Correct!', 'ctrl.giusto.s': 'Result and steps are right.', 'ctrl.quasi': 'Almost right', 'ctrl.quasi.s': 'There is a small mistake: look at the marked step.',
    'ctrl.rivedere': 'Check again', 'ctrl.rivedere.s': 'The method does not work: reread the marked steps.', 'ctrl.tuo': 'Your result: {r}', 'ctrl.passi': 'Your steps',
    'ctrl.sol': 'Show me how', 'ctrl.sol.h': 'How to do it', 'ctrl.rifai': 'Check again', 'ctrl.ultimo': 'Last check: {q}',
    scal: 'Outline', 'scal.s': 'The points in order before you write', 'scal.cosa': 'What you have to write', 'scal.idee': 'Your ideas, as they come (you can also dictate them)',
    'scal.vai': 'Make my outline', 'scal.lav': 'Putting the points in order…', 'scal.dom': 'To write it, answer:', 'scal.tue': 'Your ideas here', 'scal.su': 'Move up', 'scal.giu': 'Move down',
    'scal.detta': 'Write by speaking', 'scal.stampa': 'Print', 'scal.rifai': 'Redo it', 'scal.copia': 'Copied: paste it where you write',
    tim: 'Focus timer', 'tim.s': '{m} minutes of work, then {p} of break', 'tim.lav': 'Work', 'tim.pausa': 'Break', 'tim.via': 'Start', 'tim.ferma': 'Stop', 'tim.sosta': 'Pause', 'tim.riprendi': 'Resume',
    'tim.giri': 'Rounds done today: {n}', 'tim.min': 'Minutes of work', 'tim.adesso': 'Now: {p}', 'tim.fine.lav': 'Well done! Now {p} minutes of break: stand up, drink, move.',
    'tim.fine.pausa': 'Break over: back to work.', 'tim.chip': 'Timer {t}', torna: 'Back',
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
  const el = $('smkCorpo'), l = smkLezione(v), lm = v.tipo !== 'compito' ? smkPortaLez(v) : smkLezMateria(v), lu = l || lm[0] || null, m = smkMat(v, smMateria(v.materia));
  const nota = !l && lu ? `<div class="hint" style="margin:-4px 0 10px">${esc(tk('nolez', {m: v.materia || ''}))}</div>` : !lu ? `<div class="hint" style="margin-bottom:10px">${esc(tk('nolez0'))}</div>` : '';
  const gest = smkG(tk('g.gest'), [v.tipo !== 'compito' && smkF('porta', 'g-lista', tk('porta'), tk('porta.s')), smkF('mod', 'i-edit', tk('mod'), tk('mod.s')), smkF('sposta', 'g-cal', tk('sposta'), tk('sposta.s')),
    !(v.tipo !== 'compito') && smkF('stampa', 'g-stampa', tk('stampa'), tk('stampa.s')), smkF(v.tipo !== 'compito' ? 'genitori' : 'manda', 'g-manda', tk(v.tipo !== 'compito' ? 'genitori' : 'manda'), tk(v.tipo !== 'compito' ? 'genitori.s' : 'manda.s')),
    smkF('togli', 'g-cestino', tk('togli'), tk('togli.s'))]);
  const lez = lu ? [smkF('l:appunti_dsa', 'g-note', t('sd.ap'), t('sd.ap.s')), smkF('l:ascolta', 'g-voce', t('tl.asc'), t('sd.asc.s')), smkF('l:podcast', 'g-cuffie', t('sd.pc'), t('sd.pc.s')),
    smkF('l:karaoke', 'g-kar', t('tl.kk'), t('sd.kk.s')), smkF('l:mappa', 'i-map', t('sd.mappa'), t('sd.mappa.s')), lu.capitoli && smkF('l:capitoli', 'g-cap', t('tl.cap'), t('tl.cap.s'))] : [];
  let h = '';
  if (k === 'compito') h = smkProf(v, l) + gest;
  else if (k === 'capire') h = nota + `<div class="smk-col2"><div>${smkG(tk('g.lez'), lez)}</div><div>${smkG(tk('g.chiedi'), lu ? [smkF('l:chiedi', 'i-chat', t('tl.chiedi'), t('tl.chiedi.s')),
      smkF('l:infografica', 'g-img', t('tl.ig'), t('tl.ig.s')), lu.n_foto ? smkF('l:foto', 'g-foto', t('tl.fo'), '') : ''] : [])}
      ${m ? smkG(tk('g.libro'), [smkF('m:libro', 'g-libro', tk('porta.libro', {m: m.m}), tk('porta.libro.s')), smkF('m:glos', 'g-libro', t('tl.gl'), t('tl.dsa.gl.s'))]) : ''}</div></div>`;
  else if (k === 'farlo') h = `<div class="smk-col2"><div>${smkG(tk('g.mate'), [smkF('s:pb', 'g-foto', ts('mate.pb'), ts('sd.mate.s'), 'ind'), smkF('ctrl', 'g-test', tk('ctrl'), v.controllo ? tk('ctrl.ultimo', {q: tk('ctrl.' + v.controllo.esito)}) : tk('ctrl.s'), 'ind'), smkF('s:calc', 'g-calc', ts('mate.calc'), '', 'ind'),
      smkF('s:tab', 'g-calc', ts('mate.tab'), '', 'ind'), smkF('s:form', 'g-note', ts('mate.form'), '', 'ind')])}</div>
      <div>${smkG(tk('g.scrivi'), [smkF('scal', 'g-lista', tk('scal'), tk('scal.s')), smkF('dp', 'i-mic', t('sd.detta'), t('sd.detta.s')), smkF('smcorr', 'g-penna', ts('corr.h'), ts('sd.corr.s'))])}
      ${smkG(tk('g.studia'), lu ? [smkF('l:mappa', 'i-map', t('sd.mappa'), t('sd.mappa.s')), smkF('l:ripassa', 'i-cards', t('tl.flash'), t('tl.flash.s'))] : [])}</div></div>`;
  else if (k === 'org') h = `<div class="smk-guida" id="smkGuida"></div><div id="smkPezzi"><div class="hint row" style="gap:8px"><span class="spin"></span>${esc(tk('pz.lav'))}</div></div>`
      + smkG(tk('g.tempo'), [smkF('timer', 'g-orologio', tk('tim'), tk('tim.s', {m: smkTimMin(), p: smkTimPausa()})), smkF('ric', 'g-cal', tk('ric'), v.ricorda ? tk('ric.on', {q: smkDataBreve(v.ricorda.slice(0, 10)) + ' ' + v.ricorda.slice(11, 16)}) : tk('ric.s')),
        smkF('pzrifai', 'g-ripeti', tk('pz.rifai'), tk('pz.rifai.s')), m && smkF('m:tutor', 'g-tutor', tk('tutor'), tk('tutor.s'))]);
  else if (k === 'verifica') h = smkProf(v, l) + `<h3 class="smx-h3">${esc(tk('porta.h'))}</h3><div class="smx-lista">${lm.slice(0, 6).map(x => `<button class="smx-f" data-lez="${esc(x.cartella)}"><span class="smx-fi">${smIco('g-lezioni')}</span><span class="smx-ft"><b>${esc(x.nome)}</b><small class="dato">${esc([x.quando, x.durata].filter(Boolean).join(' · '))}</small></span><span class="smx-chev">›</span></button>`).join('')}
      ${v.porta && v.porta.pagine ? smkF('m:libro', 'g-libro', tk('porta.pagine', {p: v.porta.pagine}), m ? tk('porta.libro', {m: m.m}) : '') : m ? smkF('m:libro', 'g-libro', tk('porta.libro', {m: m.m}), tk('porta.libro.s')) : ''}
      ${v.porta && v.porta.altro ? `<div class="smx-f smk-altro"><span class="smx-fi">${smIco('g-note')}</span><span class="smx-ft"><b>${esc(v.porta.altro)}</b></span></div>` : ''}</div>${lm.length ? '' : `<div class="hint" style="margin-top:8px">${esc(tk('nolez0'))}</div>`}` + gest;
  else if (k === 'piano') h = smkPianoHtml(v) + smkG(tk('g.tempo'), [smkF('pfai', 'g-ripeti', v.piano ? tk('piano.rifai') : tk('piano.fai'), v.piano ? tk('piano.rifai.s') : tk('piano.fai.s'), v.piano ? '' : 'ind'),
      smkF('ogni', 'g-orologio', tk('ogni'), v.ogni ? tk('ogni.on', {o: v.ogni}) : tk('ogni.s')), smkF('timer', 'g-orologio', tk('tim'), tk('tim.s', {m: smkTimMin(), p: smkTimPausa()})),
      m && smkF('m:tutor', 'g-tutor', tk('tutor'), tk('tutor.s')), m && smkF('m:piano', 'g-cal', tk('piano.materia'), tk('piano.apri.s'))]);
  else if (k === 'vrip') h = m ? `<div class="smk-col2"><div>${smkG(tk('g.asc'), [smkF('m:ascm', 'g-voce', t('tl.asc'), ''), smkF('m:mappe', 'i-map', t('st.mappe.t', {m: m.m}), ''), smkF('m:libro', 'g-libro', tk('porta.libro', {m: m.m}), '')])}</div>
      <div>${smkG(tk('g.mem'), [smkF('m:fcorso', 'i-cards', t('tl.flash'), t('tl.flash.s')), smkF('rg', 'i-cards', t('sd.rg'), t('sd.rg.s')), smkF('m:glos', 'g-libro', t('tl.gl'), t('tl.dsa.gl.s')), smkF('m:prob', 'g-stella', t('tl.prob'), t('tl.prob.s'))])}</div></div>`
      : `<div class="hint">${esc(t('sd.no.mat'))}</div>`;
  else if (k === 'prova') h = m ? `<div class="smk-col2"><div>${smkG(tk('g.come'), [smkF('m:test', 'g-test', t('tl.dsa.test'), t('sd.test.s')), smkF('m:orale', 'i-mic', t('tl.orale'), t('sd.orale.s')), smkF('m:scritto', 'g-penna', t('tl.dsa.scr'), t('sd.scr.s')), smkF('sbag', 'g-stella', tk('sbag'), tk('sbag.s'))])}</div>
      <div>${smkG(tk('g.porta'), [smkF('m:mverif', 'g-stampa', t('tl.mv'), t('sd.mv.s')), smkF('strumenti', 'g-lista', t('sd.str'), t('sd.str.s'))])}
      ${smkG(tk('g.dopo'), [smkF('voto', 'g-stella', tk('voto'), v.voto ? tk('voto.on', {v: v.voto}) : tk('voto.s')), smkF('corr', 'g-foto', tk('corr'), v.correzione ? tk('corr.err', {n: (v.correzione.errori || []).length}) : tk('corr.s'))])}</div></div>`
      : `<div class="hint">${esc(t('sd.no.mat'))}</div>` + smkG(tk('g.come'), [smkF('sbag', 'g-stella', tk('sbag'), tk('sbag.s'))]) + smkG(tk('g.dopo'), [smkF('voto', 'g-stella', tk('voto'), v.voto ? tk('voto.on', {v: v.voto}) : tk('voto.s')), smkF('corr', 'g-foto', tk('corr'), tk('corr.s'))]);
  el.innerHTML = h;
  // azioni
  el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    if (b.dataset.p === 'senti') return mostraMomento(l.cartella, v.sec || 0, null, l.nome);
    if (b.dataset.p === 'kar') return apriKaraoke(l);
    if (b.dataset.p === 'lez') return apriLezione(l);
  });
  el.querySelectorAll('[data-lez]').forEach(b => b.onclick = () => { const x = (LZ ? LZ.lezioni : []).find(y => y.cartella === b.dataset.lez); if (x) apriLezione(x); });
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => smkAzione(v, b.dataset.f, lu, m));
  el.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => smkPianoAzione(v, b.dataset.pk, false, lu, m));
  el.querySelectorAll('[data-pa]').forEach(b => b.onclick = () => smkPianoAzione(v, b.dataset.pa, true, lu, m));
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
  if (f === 'ctrl') return smkControlla(v);
  if (f === 'scal') return smkScaletta(v);
  if (f === 'timer') return smkTimer(v);
  if (f === 'strumenti') return strumentiDsa();
  if (f === 'porta') return smkPorta(v);
  if (f === 'pfai') return smkPianoForm(v);
  if (f === 'ogni') return smkOgni(v);
  if (f === 'sbag') return smkSbagliate(v, m);
  if (f === 'corr') return smkCorreggi(v);
  if (f === 'voto') return smkVoto(v, v.voto || (v.correzione && v.correzione.voto));
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


/* ------------------------------------------------------------------ pannello dentro la scheda (Controlla, Scaletta, Timer) */
function smkPannello(v, titolo, html) {
  const el = $('smkCorpo'); if (!el) return null;
  el.innerHTML = `<div class="smk-pan"><button class="smk-pan-torna" data-torna="1">‹ ${esc(tk('torna'))}</button><h3 class="smx-h3 smk-pan-h">${esc(titolo)}</h3><div class="smk-pan-c">${html}</div></div>`;
  el.querySelector('[data-torna]').onclick = () => smkScheda();
  return el.querySelector('.smk-pan-c');
}
const smkParla = testo => { const p = SMS.voce; SMS.voce = true; parlaSm(testo); SMS.voce = p; };

/* Controlla il risultato */
const SMKC = {foto: [], sol: false};
function smkControlla(v, nuovo) {
  const c = v.controllo;
  if (c && !nuovo) {
    const es = c.esito || 'rivedere';
    const box = smkPannello(v, tk('ctrl'), `
      <div class="smk-esito ${es}"><span class="smk-esito-i">${smIco(es === 'giusto' ? 'g-ok' : 'g-avviso')}</span>
        <div><b>${esc(tk('ctrl.' + es))}</b><span>${esc(tk('ctrl.' + es + '.s'))}</span>${c.risultato ? `<span class="smk-esito-r">${esc(tk('ctrl.tuo', {r: c.risultato}))}</span>` : ''}</div>
        <button class="btn b-ghost b-sm" data-c="senti">${smIco('g-voce')} ${esc(ts('ascolta'))}</button></div>
      ${c.passi && c.passi.length ? `<h3 class="smx-h3">${esc(tk('ctrl.passi'))}</h3><ol class="smk-passi">${c.passi.map(p => `<li class="${p.ok ? 'ok' : 'no'}"><span class="smk-pi">${p.ok ? '✓' : '!'}</span><div><div class="smk-pt">${esc(p.testo)}</div>${!p.ok && p.nota ? `<div class="smk-pn">${esc(p.nota)}</div>` : ''}</div></li>`).join('')}</ol>` : ''}
      ${c.consiglio ? `<div class="smk-cons">${esc(c.consiglio)}</div>` : ''}
      ${SMKC.sol && c.soluzione && c.soluzione.length ? `<h3 class="smx-h3">${esc(tk('ctrl.sol.h'))}</h3><ol class="smk-sol">${c.soluzione.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
      <div class="row mt" style="gap:8px;flex-wrap:wrap">${es !== 'giusto' && c.soluzione && c.soluzione.length && !SMKC.sol ? `<button class="btn b-ghost b-sm" data-c="sol">${esc(tk('ctrl.sol'))}</button>` : ''}
        <span class="sp"></span><button class="btn b-main b-sm" data-c="rifai">${smIco('g-foto')} ${esc(tk('ctrl.rifai'))}</button></div>`);
    if (!box) return;
    const parla = () => smkParla([tk('ctrl.' + es), tk('ctrl.' + es + '.s'), ...(c.passi || []).filter(p => !p.ok).map(p => p.nota), c.consiglio].filter(Boolean).join('. '));
    box.querySelector('[data-c="senti"]').onclick = parla;
    if (box.querySelector('[data-c="sol"]')) box.querySelector('[data-c="sol"]').onclick = () => { SMKC.sol = true; smkControlla(v); smkParla((c.soluzione || []).join('. ')); };
    box.querySelector('[data-c="rifai"]').onclick = () => { SMKC.foto = []; SMKC.sol = false; smkControlla(v, true); };
    smInfoGiro(box);
    return;
  }
  const box = smkPannello(v, tk('ctrl'), `<div class="card"><div class="smk-cfoto">
      <button class="btn b-main" data-c="scatta">${smIco('g-foto')} ${esc(tk('ctrl.foto'))}</button>
      <button class="btn b-ghost" data-c="scegli">${esc(tk('ctrl.scegli'))}</button><b class="smk-cn" id="smkCn">${SMKC.foto.length ? esc(tk('ctrl.n', {n: SMKC.foto.length})) : ''}</b></div>
      <label class="smk-campo" style="margin-top:12px"><span>${esc(tk('ctrl.testo'))}</span><textarea class="in" id="smkCt" rows="2">${esc(v.cosa || '')}</textarea></label>
      <div class="row mt"><span class="sp"></span><button class="btn b-main" id="smkCvai"${SMKC.foto.length ? '' : ' disabled'}>${esc(tk('ctrl.vai'))}</button></div></div>`);
  if (!box) return;
  const prendi = async scatta => {
    const s = scatta ? await A.scatta_foglio() : await A.scegli_immagini();
    if (s && s.ok && s.percorsi && s.percorsi.length) { SMKC.foto = [...SMKC.foto, ...s.percorsi].slice(0, 4); $('smkCn').textContent = tk('ctrl.n', {n: SMKC.foto.length}); $('smkCvai').disabled = false; }
  };
  box.querySelector('[data-c="scatta"]').onclick = () => prendi(true);
  box.querySelector('[data-c="scegli"]').onclick = () => prendi(false);
  $('smkCvai').onclick = async () => {
    const b = $('smkCvai'); b.disabled = true; b.innerHTML = `<span class="spin"></span> ${esc(tk('ctrl.lav'))}`;
    const r = await A.sm_controlla(v.id, SMKC.foto, $('smkCt').value);
    if (!r || !r.ok) { b.disabled = false; b.textContent = tk('ctrl.vai'); return toast((r && r.msg) || ''); }
    SMS.comp = r.compiti; SMKC.foto = []; SMKC.sol = false;
    const nv = smkVoce() || v; smkControlla(nv);
    const c = r.controllo; smkParla([tk('ctrl.' + c.esito), tk('ctrl.' + c.esito + '.s')].join('. '));
  };
}

/* Scaletta */
function smkScaletta(v, nuova) {
  const sc = v.scaletta;
  if (sc && !nuova) {
    const box = smkPannello(v, tk('scal') + (sc.tipo ? ' · ' + sc.tipo : ''), `
      <ol class="smk-scal">${sc.punti.map((p, i) => `<li><span class="smk-sn">${i + 1}</span><div class="smk-sb"><b>${esc(p.titolo)}</b>
          <div class="smk-sd"><span>${esc(tk('scal.dom'))}</span> ${esc(p.domanda)}</div>
          ${p.parole && p.parole.length ? `<div class="smk-sp">${p.parole.map(x => `<span class="smx-chip pet">${esc(x)}</span>`).join('')}</div>` : ''}
          ${p.sue && p.sue.length ? `<div class="smk-ss"><span>${esc(tk('scal.tue'))}</span>${p.sue.map(x => `<div>• ${esc(x)}</div>`).join('')}</div>` : ''}</div>
        <div class="smk-sm"><button class="smk-mv" data-su="${i}" aria-label="${esc(tk('scal.su'))}"${i ? '' : ' disabled'}>↑</button><button class="smk-mv" data-giu="${i}" aria-label="${esc(tk('scal.giu'))}"${i < sc.punti.length - 1 ? '' : ' disabled'}>↓</button></div></li>`).join('')}</ol>
      ${sc.consiglio ? `<div class="smk-cons">${esc(sc.consiglio)}</div>` : ''}
      <div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn b-ghost b-sm" data-s="senti">${smIco('g-voce')} ${esc(ts('ascolta'))}</button>
        <button class="btn b-ghost b-sm" data-s="stampa">${smIco('g-stampa')} ${esc(tk('scal.stampa'))}</button>
        <button class="btn b-ghost b-sm" data-s="rifai">${smIco('g-ripeti')} ${esc(tk('scal.rifai'))}</button><span class="sp"></span>
        <button class="btn b-main b-sm" data-s="detta">${smIco('i-mic')} ${esc(tk('scal.detta'))}</button></div>`);
    if (!box) return;
    const testo = () => sc.punti.map((p, i) => `${i + 1}. ${p.titolo} — ${p.domanda}`).join('\n');
    const sposta = async (i, d) => { const o = sc.punti.map((_, k) => k); [o[i], o[i + d]] = [o[i + d], o[i]]; const r = await A.sm_scaletta_ordine(v.id, o); SMS.comp = r.compiti; smkScaletta(smkVoce() || v); };
    box.querySelectorAll('[data-su]').forEach(b => b.onclick = () => sposta(+b.dataset.su, -1));
    box.querySelectorAll('[data-giu]').forEach(b => b.onclick = () => sposta(+b.dataset.giu, 1));
    box.querySelector('[data-s="senti"]').onclick = () => smkParla(sc.punti.map((p, i) => `${i + 1}. ${p.titolo}. ${p.domanda}`).join(' '));
    box.querySelector('[data-s="stampa"]').onclick = () => smStampa(`<p><b>${esc(v.materia || '')}</b></p><p style="font-size:20px">${esc(v.cosa)}</p><ol>${sc.punti.map(p => `<li style="margin-bottom:14px"><b>${esc(p.titolo)}</b><br>${esc(p.domanda)}<br><br>____________________________________________</li>`).join('')}</ol>`, tk('scal'));
    box.querySelector('[data-s="rifai"]').onclick = () => smkScaletta(v, true);
    box.querySelector('[data-s="detta"]').onclick = async () => {
      try { await navigator.clipboard.writeText(testo()); toast(tk('scal.copia')); } catch (e) {}
      vai('dp');
    };
    smInfoGiro(box);
    return;
  }
  const box = smkPannello(v, tk('scal'), `<div class="card">
      <label class="smk-campo"><span>${esc(tk('scal.cosa'))}</span><textarea class="in" id="smkSc" rows="2">${esc(v.cosa || '')}</textarea></label>
      <label class="smk-campo" style="margin-top:12px"><span>${esc(tk('scal.idee'))}</span><textarea class="in" id="smkSi" rows="4">${esc((sc && sc.idee) || '')}</textarea></label>
      <div class="row mt"><span class="sp"></span><button class="btn b-main" id="smkSvai">${esc(tk('scal.vai'))}</button></div></div>`);
  if (!box) return;
  $('smkSvai').onclick = async () => {
    const b = $('smkSvai'); b.disabled = true; b.innerHTML = `<span class="spin"></span> ${esc(tk('scal.lav'))}`;
    const r = await A.sm_scaletta(v.id, $('smkSc').value, $('smkSi').value);
    if (!r || !r.ok) { b.disabled = false; b.textContent = tk('scal.vai'); return toast((r && r.msg) || ''); }
    SMS.comp = r.compiti; smkScaletta(smkVoce() || v);
  };
}

/* Timer concentrazione: continua anche se cambi pagina; alla fine lo dice a voce */
const SMKT = {fase: 'lav', resta: 0, giro: null, voce: null, giri: 0, giorno: ''};
function smkTimMin() { return Math.max(5, Math.min(45, +(R && R.sm_timer) || 15)); }
function smkTimPausa() { return Math.max(5, Math.round(smkTimMin() / 3)); }
function smkTimTesto(sec) { return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; }
function smkTimer(v) {
  if (v) SMKT.voce = v.id;
  const oggi = new Date().toISOString().slice(0, 10); if (SMKT.giorno !== oggi) { SMKT.giorno = oggi; SMKT.giri = 0; }
  const vv = SMKT.voce && SMS.comp ? SMS.comp.find(x => x.id === SMKT.voce) : v;
  const pz = vv && vv.pezzi ? vv.pezzi.find(p => !p.f) : null;
  const tot = (SMKT.fase === 'lav' ? smkTimMin() : smkTimPausa()) * 60, resta = SMKT.giro || SMKT.resta ? SMKT.resta : tot;
  const box = smkPannello(vv || v, tk('tim'), `<div class="card smk-tim ${SMKT.fase}">
      <div class="smk-tim-f">${esc(tk(SMKT.fase === 'lav' ? 'tim.lav' : 'tim.pausa'))}</div>
      <div class="smk-anello" style="--p:${(1 - resta / tot) * 100}"><span id="smkTt">${smkTimTesto(resta)}</span></div>
      ${pz && SMKT.fase === 'lav' ? `<div class="smk-tim-p">${esc(tk('tim.adesso', {p: pz.t}))}</div>` : ''}
      <div class="row" style="gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px">
        ${SMKT.giro ? `<button class="btn b-ghost" data-t="sosta">${esc(tk('tim.sosta'))}</button>` : `<button class="btn b-main" data-t="via">▶ ${esc(SMKT.resta ? tk('tim.riprendi') : tk('tim.via'))}</button>`}
        ${SMKT.giro || SMKT.resta ? `<button class="btn b-ghost" data-t="ferma">${esc(tk('tim.ferma'))}</button>` : ''}</div>
      <div class="smk-tim-g">${esc(tk('tim.giri', {n: SMKT.giri}))}</div>
      ${!SMKT.giro && !SMKT.resta ? `<div class="smk-tim-min"><span>${esc(tk('tim.min'))}</span><div class="smx-seg">${[10, 15, 20, 25].map(m => `<button data-m="${m}" class="${m === smkTimMin() ? 'on' : ''}">${m}</button>`).join('')}</div></div>` : ''}</div>`);
  if (!box) return;
  box.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => { await A.imposta('sm_timer', +b.dataset.m); R.sm_timer = +b.dataset.m; smkTimer(); });
  const via = box.querySelector('[data-t="via"]'); if (via) via.onclick = () => { if (!SMKT.resta) SMKT.resta = tot; smkTimVai(); smkTimer(); };
  const so = box.querySelector('[data-t="sosta"]'); if (so) so.onclick = () => { clearInterval(SMKT.giro); SMKT.giro = null; smkTimChip(); smkTimer(); };
  const fe = box.querySelector('[data-t="ferma"]'); if (fe) fe.onclick = () => { clearInterval(SMKT.giro); SMKT.giro = null; SMKT.resta = 0; SMKT.fase = 'lav'; smkTimChip(); smkTimer(); };
}
function smkTimVai() {
  clearInterval(SMKT.giro);
  SMKT.giro = setInterval(() => {
    SMKT.resta = Math.max(0, SMKT.resta - 1);
    const t = $('smkTt'); if (t) { t.textContent = smkTimTesto(SMKT.resta); const tot = (SMKT.fase === 'lav' ? smkTimMin() : smkTimPausa()) * 60; const a = t.parentElement; if (a) a.style.setProperty('--p', (1 - SMKT.resta / tot) * 100); }
    smkTimChip();
    if (SMKT.resta > 0) return;
    if (SMKT.fase === 'lav') { SMKT.giri += 1; SMKT.fase = 'pausa'; SMKT.resta = smkTimPausa() * 60; const m = tk('tim.fine.lav', {p: smkTimPausa()}); toast(m); smkParla(m); }
    else { SMKT.fase = 'lav'; SMKT.resta = 0; clearInterval(SMKT.giro); SMKT.giro = null; const m = tk('tim.fine.pausa'); toast(m); smkParla(m); }
    smkTimChip();
    if ($('smkTt')) smkTimer();
  }, 1000);
  smkTimChip();
}
// in alto, in ogni pagina, finche' il timer va: tocchi e torni al compito
function smkTimChip() {
  let c = document.getElementById('smkTimChip');
  const tt = $('smkTt');
  if (!SMKT.giro || (tt && tt.offsetParent !== null)) { if (c) c.remove(); return; }      // sulla pagina del timer non serve
  if (!c) {
    c = document.createElement('button'); c.id = 'smkTimChip'; c.className = 'smk-timchip';
    c.onclick = () => { if (SMKT.voce) SMK.sel = SMKT.voce; vai('smcomp'); setTimeout(() => smkTimer(), 400); };
    document.body.appendChild(c);
  }
  c.className = 'smk-timchip ' + SMKT.fase;
  c.textContent = tk('tim.chip', {t: smkTimTesto(SMKT.resta)});
}

/* ------------------------------------------------------------------ Verifica: cosa porta, il piano, ogni giorno, le domande che sbagli, correggi gli errori */
Object.assign(SMK_T.it, {
  porta: 'Cambia cosa porta', 'porta.s': 'Aggiungi o togli lezioni e pagine', 'porta.scegli': 'Le lezioni che porta', 'porta.pag': 'Pagine del libro', 'porta.pag.ph': 'es. 112–128',
  'porta.altro': 'Altro da studiare', 'porta.altro.ph': 'es. le fotocopie del 10 ottobre', 'porta.tutte': 'Nessuna spuntata = tutte le lezioni di {m}', 'porta.pagine': 'Libro, pagine {p}', 'porta.ok': 'Salvato: il ripasso usa solo queste',
  'piano.rifai': 'Rifai il piano', 'piano.rifai.s': 'Se hai più o meno tempo', 'piano.fai': 'Fammi il piano', 'piano.fai.s': 'Giorno per giorno fino alla verifica, con i minuti che hai',
  'piano.min': 'Quanto tempo hai al giorno', 'piano.gg': 'In che giorni studi', 'piano.min.n': '{n} min', 'piano.fino': 'Fino alla verifica · {m} minuti in tutto · tocca una riga per iniziare',
  'piano.oggi': 'Oggi', 'piano.domani': 'Domani', 'piano.piu': 'Non ci sta tutto nei tuoi minuti: alcuni giorni servono {n} minuti in più.', 'piano.rid': 'C\'è poco tempo: ho tenuto le cose che servono di più.',
  'piano.vuoto': 'Ancora nessun piano per questa verifica.', 'piano.ok': 'Fatto', 'piano.lavori': 'Preparo il piano…', 'piano.materia': 'Il piano di tutta la materia',
  ogni: 'Ricordamelo ogni giorno', 'ogni.s': 'All\'ora che scegli, fino alla verifica', 'ogni.on': 'Ogni giorno alle {o}', 'ogni.ora': 'A che ora', 'ogni.togli': 'Non ricordarmelo più', 'ogni.si': 'Te lo ricordo ogni giorno alle {o}', 'ogni.no': 'Promemoria tolto',
  sbag: 'Le domande che sbagli', 'sbag.s': 'Solo quelle, finché non le sai', 'sbag.cr': 'Crocette sbagliate', 'sbag.cr.s': '{n} domande dei test che hai sbagliato l\'ultima volta', 'sbag.cr0': 'Nessuna crocetta sbagliata: fai prima un test.',
  'sbag.rifai': 'Rifalle adesso', 'sbag.err': 'Errori della verifica corretta', 'sbag.err0': 'Qui arrivano gli errori quando fotografi una verifica corretta («Correggi gli errori»).', 'sbag.so': 'Ora la so', 'sbag.ancora': 'Ancora da ripassare',
  'sbag.mostra': 'Mostra la risposta', 'sbag.tua': 'Tu avevi scritto', 'sbag.giusta': 'La risposta giusta', 'sbag.perche': 'Perché', 'sbag.tutto': 'Bravo: le hai ripassate tutte.',
  'g.dopo': 'Dopo la verifica', voto: 'Segna il voto', 'voto.s': 'Lo vedi in Studia', 'voto.on': 'Voto: {v}', 'voto.ok': 'Voto segnato',
  corr: 'Correggi gli errori', 'corr.s': 'Fotografa la verifica corretta: ti spiego ogni errore', 'corr.foto': 'Fotografa la verifica', 'corr.n': '{n} foto pronte', 'corr.vai': 'Spiegami gli errori', 'corr.lav': 'Leggo la verifica corretta…',
  'corr.voto': 'Il voto del prof: {v}', 'corr.bene': 'Cosa hai fatto bene', 'corr.err': 'Gli errori, uno per uno ({n})', 'corr.err0': 'Nessun errore segnato dal prof.', 'corr.rifai': 'Fotografa di nuovo', 'corr.segna': 'Segna il voto {v}',
  'corr.ripassa': 'Ripassa questi errori',
});
Object.assign(SMK_T.en, {
  porta: 'Change what it covers', 'porta.s': 'Add or remove lessons and pages', 'porta.scegli': 'The lessons it covers', 'porta.pag': 'Book pages', 'porta.pag.ph': 'e.g. 112–128',
  'porta.altro': 'Something else to study', 'porta.altro.ph': 'e.g. the handouts of 10 October', 'porta.tutte': 'None ticked = all {m} lessons', 'porta.pagine': 'Book, pages {p}', 'porta.ok': 'Saved: the review uses only these',
  'piano.rifai': 'Redo the plan', 'piano.rifai.s': 'If you have more or less time', 'piano.fai': 'Make my plan', 'piano.fai.s': 'Day by day until the test, with the minutes you have',
  'piano.min': 'How much time you have each day', 'piano.gg': 'Which days you study', 'piano.min.n': '{n} min', 'piano.fino': 'Until the test · {m} minutes in all · tap a row to start',
  'piano.oggi': 'Today', 'piano.domani': 'Tomorrow', 'piano.piu': 'Not everything fits your minutes: some days need {n} more minutes.', 'piano.rid': 'There is little time: I kept the things that matter most.',
  'piano.vuoto': 'No plan for this test yet.', 'piano.ok': 'Done', 'piano.lavori': 'Making the plan…', 'piano.materia': 'The plan for the whole subject',
  ogni: 'Remind me every day', 'ogni.s': 'At the time you choose, until the test', 'ogni.on': 'Every day at {o}', 'ogni.ora': 'At what time', 'ogni.togli': 'Stop reminding me', 'ogni.si': 'I\'ll remind you every day at {o}', 'ogni.no': 'Reminder removed',
  sbag: 'The questions you get wrong', 'sbag.s': 'Only those, until you know them', 'sbag.cr': 'Wrong multiple-choice answers', 'sbag.cr.s': '{n} test questions you got wrong last time', 'sbag.cr0': 'No wrong answers: take a test first.',
  'sbag.rifai': 'Redo them now', 'sbag.err': 'Mistakes from the marked test', 'sbag.err0': 'Mistakes arrive here when you photograph a marked test («Fix the mistakes»).', 'sbag.so': 'Now I know it', 'sbag.ancora': 'Still to review',
  'sbag.mostra': 'Show the answer', 'sbag.tua': 'You wrote', 'sbag.giusta': 'The right answer', 'sbag.perche': 'Why', 'sbag.tutto': 'Well done: you reviewed them all.',
  'g.dopo': 'After the test', voto: 'Write down the mark', 'voto.s': 'You see it in Study', 'voto.on': 'Mark: {v}', 'voto.ok': 'Mark saved',
  corr: 'Fix the mistakes', 'corr.s': 'Photograph the marked test: I explain each mistake', 'corr.foto': 'Photograph the test', 'corr.n': '{n} photos ready', 'corr.vai': 'Explain the mistakes', 'corr.lav': 'Reading the marked test…',
  'corr.voto': 'The teacher\'s mark: {v}', 'corr.bene': 'What you did well', 'corr.err': 'The mistakes, one by one ({n})', 'corr.err0': 'No mistakes marked by the teacher.', 'corr.rifai': 'Photograph again', 'corr.segna': 'Write down the mark {v}',
  'corr.ripassa': 'Review these mistakes',
});
// la materia con solo le lezioni scelte in «Cambia cosa porta»
function smkMat(v, m) {
  const sc = v && v.porta && v.porta.lez && v.porta.lez.length ? v.porta.lez : null;
  if (!m || !sc) return m;
  const lez = (m.lez || []).filter(l => sc.includes(l.cartella));
  return lez.length ? {...m, lez, cartelle: lez.map(l => l.cartella)} : m;
}
function smkPortaLez(v) {
  const lm = smkLezMateria(v), sc = v.porta && v.porta.lez && v.porta.lez.length ? v.porta.lez : null;
  const sel = sc ? lm.filter(l => sc.includes(l.cartella)) : lm.slice(0, 6);
  return sel.length ? sel : lm.slice(0, 6);
}
function smkPorta(v) {
  const lm = smkLezMateria(v), sc = (v.porta && v.porta.lez) || [];
  const corpo = `<div class="smk-campo"><span>${esc(tk('porta.scegli'))}</span></div><div class="smk-spunte">${lm.map(l => `<label class="smk-sp"><input type="checkbox" value="${esc(l.cartella)}"${sc.includes(l.cartella) ? ' checked' : ''}><span><b>${esc(l.nome)}</b><small class="dato">${esc([l.quando, l.durata].filter(Boolean).join(' · '))}</small></span></label>`).join('') || `<div class="hint">${esc(tk('nolez0'))}</div>`}</div>
    <div class="hint" style="margin:4px 0 10px">${esc(tk('porta.tutte', {m: v.materia || ''}))}</div>
    <label class="smk-campo"><span>${esc(tk('porta.pag'))}</span><input class="in" name="pag" maxlength="120" placeholder="${esc(tk('porta.pag.ph'))}" value="${esc((v.porta && v.porta.pagine) || '')}"></label>
    <label class="smk-campo"><span>${esc(tk('porta.altro'))}</span><input class="in" name="altro" maxlength="300" placeholder="${esc(tk('porta.altro.ph'))}" value="${esc((v.porta && v.porta.altro) || '')}"></label>`;
  smkFinestra(tk('porta'), corpo, async d => {
    const lez = [...d.querySelectorAll('.smk-sp input:checked')].map(x => x.value);
    const r = await A.sm_porta(v.id, lez, d.querySelector('[name="pag"]').value, d.querySelector('[name="altro"]').value);
    if (!r || !r.ok) return false;
    SMS.comp = r.compiti; smCompDisegna(); toast(tk('porta.ok'));
  });
}
// il piano giorno per giorno
const SMKP = {min: 30, gg: [0, 1, 2, 3, 4, 5]};
function smkPianoHtml(v) {
  const p = v.piano;
  if (!p || !p.lista || !p.lista.length) return `<div class="smk-vuoto-p"><div class="hint">${esc(tk('piano.vuoto'))}</div></div>`;
  const tot = p.lista.reduce((a, d) => a + (d.min || 0), 0);
  const giorno = g => { const n = smGiorni(g); return n === 0 ? tk('piano.oggi') : n === 1 ? tk('piano.domani') : `${smkGiorno(g)} ${smkDataBreve(g)}`; };
  return `<h3 class="smx-h3">${esc(tk('t.piano'))}<small class="dato" style="font-weight:400;color:var(--sm-ard)">${esc(tk('piano.fino', {m: tot}))}</small></h3>
    ${p.ridotto ? `<div class="hint" style="margin:-4px 0 8px">${esc(tk('piano.rid'))}</div>` : p.di_piu ? `<div class="hint" style="margin:-4px 0 8px">${esc(tk('piano.piu', {n: p.di_piu}))}</div>` : ''}
    <div class="smk-piano">${p.lista.map(d => { const passato = smGiorni(d.g) < 0, fatti = d.cose.every(c => c.ok);
      return `<div class="smk-pg${smGiorni(d.g) === 0 ? ' oggi' : ''}${passato ? ' passato' : ''}${fatti ? ' fatto' : ''}"><div class="smk-pgt"><b>${esc(giorno(d.g))}</b><span class="dato">${d.min} min</span></div>
        <div class="smk-pgc">${d.cose.map((c, i) => `<div class="smk-pc${c.ok ? ' ok' : ''}"><button class="smk-pck" data-pk="${esc(d.g)}|${i}" aria-label="${esc(tk('piano.ok'))}">${c.ok ? ckSvg : ''}</button>
          <button class="smk-pca" data-pa="${esc(d.g)}|${i}"><span>${esc(c.t)}</span><span class="dato">${c.m} min</span><span class="smx-chev">›</span></button></div>`).join('')}</div></div>`; }).join('')}</div>`;
}
function smkPianoForm(v) {
  if (v.piano) { SMKP.min = v.piano.minuti || 30; SMKP.gg = v.piano.giorni || SMKP.gg; }
  const nomi = LINGUA === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const corpo = `<div class="smk-campo"><span>${esc(tk('piano.min'))}</span></div><div class="seg smk-seg" id="smkPm">${[15, 20, 30, 45, 60].map(n => `<span data-v="${n}" class="${n === SMKP.min ? 'on' : ''}">${esc(tk('piano.min.n', {n}))}</span>`).join('')}</div>
    <div class="smk-campo" style="margin-top:12px"><span>${esc(tk('piano.gg'))}</span></div><div class="smk-gg" id="smkPg">${nomi.map((n, i) => `<button class="${SMKP.gg.includes(i) ? 'on' : ''}" data-g="${i}">${n}</button>`).join('')}</div>`;
  const fin = smkFinestra(v.piano ? tk('piano.rifai') : tk('piano.fai'), corpo, async () => {
    const lez = smkPortaLez(v).map(l => ({c: l.cartella, nome: l.nome}));
    const r = await A.sm_piano(v.id, SMKP.min, SMKP.gg, lez);
    if (!r || !r.ok) { toast((r && r.msg) || ''); return false; }
    SMS.comp = r.compiti; SMK.tab = 1; smCompDisegna();
  });
  fin.querySelectorAll('#smkPm span').forEach(x => x.onclick = () => { fin.querySelectorAll('#smkPm span').forEach(y => y.classList.toggle('on', y === x)); SMKP.min = +x.dataset.v; });
  fin.querySelectorAll('#smkPg button').forEach(x => x.onclick = () => { const g = +x.dataset.g; SMKP.gg = SMKP.gg.includes(g) ? SMKP.gg.filter(y => y !== g) : [...SMKP.gg, g]; if (!SMKP.gg.length) SMKP.gg = [g]; x.classList.toggle('on', SMKP.gg.includes(g)); });
}
async function smkPianoAzione(v, k, apri, lu, m) {
  const [g, i] = k.split('|'), d = ((v.piano || {}).lista || []).find(x => x.g === g), c = d && d.cose[+i];
  if (!c) return;
  if (!apri) { const r = await A.sm_piano_spunta(v.id, g, +i, !c.ok); SMS.comp = r.compiti; return smkScheda(); }
  if (c.f === 'sbag') return smkSbagliate(v, m);
  if (c.f.startsWith('l:')) { const l = (LZ ? LZ.lezioni : []).find(x => x.cartella === c.c) || lu; return l && tileLezione(l, c.f.slice(2)); }
  return smkAzione(v, c.f, lu, m);
}
function smkOgni(v) {
  const fin = smkFinestra(tk('ogni'), `<label class="smk-campo"><span>${esc(tk('ogni.ora'))}</span><input class="in" type="time" name="o" value="${esc(v.ogni || '17:00')}"></label>
    ${v.ogni ? `<button class="lnk" data-via="1" style="margin-top:6px">${esc(tk('ogni.togli'))}</button>` : ''}`, async el => {
    const o = el.querySelector('[name="o"]').value; if (!o) return false;
    const r = await A.sm_ogni(v.id, o); SMS.comp = r.compiti; smCompDisegna(); toast(tk('ogni.si', {o}));
  });
  const via = fin.querySelector('[data-via]');
  if (via) via.onclick = async () => { const r = await A.sm_ogni(v.id, ''); SMS.comp = r.compiti; fin.remove(); smCompDisegna(); toast(tk('ogni.no')); };
}
// le domande che sbagli: crocette sbagliate (si rifanno gratis) + errori della verifica corretta
const SMKS = {aperte: {}};
async function smkSbagliate(v, m) {
  const box = smkPannello(v, tk('sbag'), `<div class="hint row" style="gap:8px"><span class="spin"></span></div>`); if (!box) return;
  const r = await A.sm_sbagliate(v.materia || '');
  const n = (r && r.crocette) || 0, err = (r && r.errori) || [];
  box.innerHTML = `<h3 class="smx-h3">${esc(tk('sbag.cr'))}</h3><div class="smx-lista">${n ? smkF('sb:test', 'g-test', tk('sbag.rifai'), tk('sbag.cr.s', {n}), '', String(n)) : `<div class="hint">${esc(tk('sbag.cr0'))}</div>`}</div>
    <h3 class="smx-h3">${esc(tk('sbag.err'))}${err.length ? `<small class="dato" style="font-weight:400;color:var(--sm-ard)">${esc(tk('sbag.ancora'))}: ${err.length}</small>` : ''}</h3>
    ${err.length ? `<div class="smk-errs">${err.map((e, j) => smkErrHtml(e, `${e.vid}|${e.i}`)).join('')}</div>` : `<div class="hint">${esc(tk('sbag.err0'))}</div>`}`;
  const bt = box.querySelector('[data-f="sb:test"]');
  if (bt) bt.onclick = async () => { const mm = smkMat(v, m); if (!mm) return toast(t('sd.no.mat')); await apriEsame({m: mm.m, cartelle: mm.cartelle}); if (ES.d) nuovoTest('tutte'); };
  smkErrEventi(box, () => smkSbagliate(smkVoce() || v, m));
  smInfoGiro(box);
}
function smkErrHtml(e, k) {
  const ap = SMKS.aperte[k];
  return `<div class="smk-err${e.ok ? ' ok' : ''}"><div class="smk-err-d">${esc(e.domanda)}</div>
    ${ap ? `${e.tua ? `<div class="smk-err-r"><span>${esc(tk('sbag.tua'))}</span>${esc(e.tua)}</div>` : ''}<div class="smk-err-r giusta"><span>${esc(tk('sbag.giusta'))}</span>${esc(e.giusta)}</div>
      ${e.perche ? `<div class="smk-err-r"><span>${esc(tk('sbag.perche'))}</span>${esc(e.perche)}</div>` : ''}` : ''}
    <div class="smk-err-b">${ap ? `<button class="btn b-ghost b-sm" data-es="${esc(k)}">${smIco('g-voce')} ${esc(ts('ascolta'))}</button>` : `<button class="btn b-ghost b-sm" data-em="${esc(k)}">${esc(tk('sbag.mostra'))}</button>`}
      <span class="sp"></span><button class="btn ${e.ok ? 'b-ghost' : 'b-main'} b-sm" data-eo="${esc(k)}">${e.ok ? esc(tk('sbag.ancora')) : `${ckSvg} ${esc(tk('sbag.so'))}`}</button></div></div>`;
}
function smkErrEventi(box, ridisegna) {
  const trova = k => { const [vid, i] = k.split('|'), v = SMS.comp.find(x => x.id === vid); return [v, +i, v && v.correzione && v.correzione.errori[+i]]; };
  box.querySelectorAll('[data-em]').forEach(b => b.onclick = () => { SMKS.aperte[b.dataset.em] = true; ridisegna(); });
  box.querySelectorAll('[data-es]').forEach(b => b.onclick = () => { const e = trova(b.dataset.es)[2]; if (e) smkParla([e.domanda, tk('sbag.giusta') + ': ' + e.giusta, e.perche].filter(Boolean).join('. ')); });
  box.querySelectorAll('[data-eo]').forEach(b => b.onclick = async () => { const [v, i, e] = trova(b.dataset.eo); if (!e) return; const r = await A.sm_errore_ok(v.id, i, !e.ok); SMS.comp = r.compiti; ridisegna(); });
}
// correggi gli errori: la verifica corretta dal prof
const SMKV = {foto: []};
function smkVotoNum(s) {
  s = String(s || '').trim().replace(',', '.'); const m = s.match(/(\d+(?:\.\d+)?)/); if (!m) return '';
  let n = +m[1]; if (/½|\bmezzo\b/.test(s)) n += 0.5; else if (/[+]\s*$/.test(s)) n += 0.25; else if (/[-–]\s*$/.test(s)) n -= 0.25;
  const d = s.match(/^(\d+)\s*\/\s*(\d+)$/); if (d) n = (+d[1] + +d[2]) / 2;
  return n >= 0 && n <= 10 ? String(n) : '';
}
function smkVoto(v, vt) {
  const oggi = new Date().toISOString().slice(0, 10);
  smkFinestra(tk('voto'), `<div class="smk-due"><label class="smk-campo"><span>${esc(tk('voto'))}</span><input class="in" name="voto" type="number" min="0" max="10" step="0.25" value="${esc(smkVotoNum(vt) || '')}"></label>
      <label class="smk-campo"><span>${esc(tk('ric.giorno'))}</span><input class="in" name="data" type="date" value="${esc(v.per && v.per <= oggi ? v.per : oggi)}"></label></div>`, async d => {
    const voto = d.querySelector('[name="voto"]').value; if (voto === '') return false;
    const r = await A.sm_voto_nuovo({materia: v.materia || '', voto, data: d.querySelector('[name="data"]').value, tipo: v.tipo === 'interrogazione' ? 'orale' : 'scritto', nota: v.cosa});
    if (!r || !r.ok) return false;
    await A.sm_compito_modifica(v.id, {voto});
    const c = await A.sm_compiti(); SMS.comp = (c && c.compiti) || SMS.comp; smCompDisegna(); toast(tk('voto.ok'));
  });
}
function smkCorreggi(v, nuovo) {
  const c = v.correzione;
  if (c && !nuovo) {
    const errs = c.errori || [];
    const box = smkPannello(v, tk('corr'), `
      ${c.voto ? `<div class="smk-esito quasi"><span class="smk-esito-i">${smIco('g-stella')}</span><div><b>${esc(tk('corr.voto', {v: c.voto}))}</b>${c.bene ? `<span>${esc(c.bene)}</span>` : ''}</div>
        ${v.voto ? '' : `<button class="btn b-main b-sm" data-c="voto">${esc(tk('corr.segna', {v: c.voto}))}</button>`}</div>`
        : c.bene ? `<div class="smk-cons"><b>${esc(tk('corr.bene'))}</b> ${esc(c.bene)}</div>` : ''}
      <h3 class="smx-h3">${esc(errs.length ? tk('corr.err', {n: errs.length}) : tk('corr.err0'))}</h3>
      <div class="smk-errs">${errs.map((e, i) => smkErrHtml(e, `${v.id}|${i}`)).join('')}</div>
      ${c.consiglio ? `<div class="smk-cons">${esc(c.consiglio)}</div>` : ''}
      <div class="row mt" style="gap:8px;flex-wrap:wrap"><span class="sp"></span><button class="btn b-ghost b-sm" data-c="rifai">${smIco('g-foto')} ${esc(tk('corr.rifai'))}</button></div>`);
    if (!box) return;
    if (box.querySelector('[data-c="voto"]')) box.querySelector('[data-c="voto"]').onclick = () => smkVoto(v, c.voto);
    box.querySelector('[data-c="rifai"]').onclick = () => { SMKV.foto = []; smkCorreggi(v, true); };
    smkErrEventi(box, () => smkCorreggi(smkVoce() || v));
    smInfoGiro(box); return;
  }
  const box = smkPannello(v, tk('corr'), `<div class="card"><div class="hint" style="margin-bottom:10px">${esc(tk('corr.s'))}</div><div class="smk-cfoto">
      <button class="btn b-main" data-c="scatta">${smIco('g-foto')} ${esc(tk('corr.foto'))}</button>
      <button class="btn b-ghost" data-c="scegli">${esc(tk('ctrl.scegli'))}</button><b class="smk-cn" id="smkVn">${SMKV.foto.length ? esc(tk('corr.n', {n: SMKV.foto.length})) : ''}</b></div>
      <div class="row mt"><span class="sp"></span><button class="btn b-main" id="smkVvai"${SMKV.foto.length ? '' : ' disabled'}>${esc(tk('corr.vai'))}</button></div></div>`);
  if (!box) return;
  const prendi = async scatta => {
    const s = scatta ? await A.scatta_foglio() : await A.scegli_immagini();
    if (s && s.ok && s.percorsi && s.percorsi.length) { SMKV.foto = [...SMKV.foto, ...s.percorsi].slice(0, 6); $('smkVn').textContent = tk('corr.n', {n: SMKV.foto.length}); $('smkVvai').disabled = false; }
  };
  box.querySelector('[data-c="scatta"]').onclick = () => prendi(true);
  box.querySelector('[data-c="scegli"]').onclick = () => prendi(false);
  $('smkVvai').onclick = async () => {
    const b = $('smkVvai'); b.disabled = true; b.innerHTML = `<span class="spin"></span> ${esc(tk('corr.lav'))}`;
    const r = await A.sm_correggi_verifica(v.id, SMKV.foto);
    if (!r || !r.ok) { b.disabled = false; b.textContent = tk('corr.vai'); return toast((r && r.msg) || ''); }
    SMS.comp = r.compiti; SMKV.foto = []; smkCorreggi(smkVoce() || v);
  };
}
