'use strict';
/* Scripta Manent — Famiglia: «La settimana per i genitori» (il riepilogo del venerdì: lezioni, compiti, verifiche con
   il piano, voti; da copiare su WhatsApp o stampare, con il promemoria del venerdì) e «Detrazione del 19%» (l'elenco
   delle spese per gli strumenti DSA e dei documenti da portare al CAF, codice 44 del 730). */

const SMF_T = {
  it: {
    'set.h': 'La settimana per i genitori', 'set.p': 'Cosa ha studiato, i compiti, le verifiche in arrivo e i voti: da mandare il venerdì.',
    'set.dal': 'Dal {a} al {b}', 'set.lez': 'Lezioni registrate', 'set.fatti': 'Compiti fatti', 'set.dafare': 'Ancora da fare', 'set.ritardo': 'in ritardo',
    'set.ver': 'Verifiche e interrogazioni in arrivo', 'set.piano': 'piano: {f} di {n} fatti', 'set.nopiano': 'senza piano', 'set.voti': 'Voti della settimana', 'set.niente': 'Niente',
    'set.copia': 'Copia per WhatsApp', 'set.copiato': 'Copiato: incollalo su WhatsApp', 'set.stampa': 'Stampa', 'set.ven': 'Ricordamelo ogni venerdì alle 17',
    'set.ven.t': 'È venerdì: prepara la settimana per i genitori', 'set.apri': 'Apri', 'set.prima': 'Settimana prima', 'set.questa': 'Questa settimana',
    'det.h': 'Detrazione del 19%', 'det.p': 'Le spese per gli strumenti DSA e i documenti da portare al CAF.',
    'det.cos': 'Cos\'è', 'det.cos.s': 'Chi ha la diagnosi DSA può detrarre il 19% di quello che spende per strumenti compensativi e sussidi tecnici e informatici (programmi come Scripta Manent, sintesi vocale, computer, calcolatrice, registratore…), fino alla fine delle superiori. Nel 730 va nei righi da E8 a E10 con il codice 44.',
    'det.nota': 'È un promemoria, non una consulenza fiscale: per il tuo caso chiedi al CAF.', 'det.anno': 'Anno delle spese', 'det.730': 'Si portano nel 730 del {a}',
    'det.spese': 'Le spese', 'det.spese0': 'Ancora nessuna spesa per quest\'anno.', 'det.tot': 'Totale {t}', 'det.rec': 'si recuperano circa {r} (19%)',
    'det.agg': 'Aggiungi spesa', 'det.foto': 'Dalla foto della fattura', 'det.lav': 'Leggo la fattura…', 'det.letta': 'Ho letto la fattura: controlla i dati e salva.',
    'det.cosa': 'Cosa hai comprato', 'det.cosa.ph': 'es. Licenza Scripta Manent, computer portatile', 'det.neg': 'Dove (negozio o sito)', 'det.imp': 'Importo (€)', 'det.data': 'Data',
    'det.pag': 'Come hai pagato', 'det.cf': 'Sulla fattura o sullo scontrino c\'è il codice fiscale dello studente (o del genitore che paga)',
    'pag.carta': 'Carta', 'pag.bancomat': 'Bancomat', 'pag.bonifico': 'Bonifico', 'pag.app': 'App (PayPal, Satispay…)', 'pag.contanti': 'Contanti',
    'det.w.cont': 'In contanti: il CAF potrebbe non accettarla. Meglio pagare con carta, bancomat o bonifico.', 'det.w.cf': 'Manca il codice fiscale: chiedi la fattura o lo scontrino «parlante» con il codice fiscale.',
    'det.doc': 'Documenti da portare', 'det.doc.s': 'Spunta quelli che hai già messo da parte',
    'doc.diagnosi': 'La diagnosi DSA', 'doc.diagnosi.s': 'Del Servizio sanitario o di una struttura accreditata',
    'doc.collegamento': 'Il collegamento con il disturbo', 'doc.collegamento.s': 'Che quegli strumenti servono per il suo DSA: spesso è già scritto nella diagnosi, altrimenti un certificato del medico',
    'doc.fatture': 'Fatture o scontrini «parlanti»', 'doc.fatture.s': 'Con il codice fiscale e cosa si è comprato',
    'doc.pagamenti': 'La prova del pagamento', 'doc.pagamenti.s': 'Estratto conto, ricevuta del bonifico o della carta',
    'doc.online': 'Per gli acquisti online', 'doc.online.s': 'La conferma dell\'ordine e la pagina del prodotto',
    'det.cafh': 'Prepara il foglio per il CAF', 'det.caf.t': 'Spese per strumenti DSA — anno {a}', 'det.caf.chi': 'Studente', 'det.caf.cod': 'Codice 44 · righi E8–E10 del modello 730',
    'det.caf.firma': 'Documenti allegati (spuntati):', 'det.tolta': 'Spesa tolta', 'det.mod': 'Modifica', 'det.togli': 'Togli', salva: 'Salva', annulla: 'Annulla', 'det.fotoa': 'foto allegata',
  },
  en: {
    'set.h': 'The week for parents', 'set.p': 'What was studied, homework, upcoming tests and marks: to send on Friday.',
    'set.dal': 'From {a} to {b}', 'set.lez': 'Recorded lessons', 'set.fatti': 'Homework done', 'set.dafare': 'Still to do', 'set.ritardo': 'late',
    'set.ver': 'Upcoming tests', 'set.piano': 'plan: {f} of {n} done', 'set.nopiano': 'no plan', 'set.voti': 'Marks this week', 'set.niente': 'Nothing',
    'set.copia': 'Copy for WhatsApp', 'set.copiato': 'Copied: paste it on WhatsApp', 'set.stampa': 'Print', 'set.ven': 'Remind me every Friday at 5 pm',
    'set.ven.t': 'It\'s Friday: prepare the week for parents', 'set.apri': 'Open', 'set.prima': 'Week before', 'set.questa': 'This week',
    'det.h': '19% tax deduction', 'det.p': 'Expenses for DSA tools and the documents to bring to the tax office.',
    'det.cos': 'What it is', 'det.cos.s': 'With a DSA diagnosis you can deduct 19% of what you spend on compensatory tools and technical aids (programs like Scripta Manent, text-to-speech, computer, calculator, recorder…), until the end of upper secondary school. In the 730 form: lines E8 to E10, code 44.',
    'det.nota': 'This is a reminder, not tax advice: ask your tax office (CAF).', 'det.anno': 'Year of the expenses', 'det.730': 'They go in the {a} tax return',
    'det.spese': 'Expenses', 'det.spese0': 'No expenses for this year yet.', 'det.tot': 'Total {t}', 'det.rec': 'about {r} back (19%)',
    'det.agg': 'Add expense', 'det.foto': 'From a photo of the invoice', 'det.lav': 'Reading the invoice…', 'det.letta': 'I read the invoice: check the details and save.',
    'det.cosa': 'What you bought', 'det.cosa.ph': 'e.g. Scripta Manent licence, laptop', 'det.neg': 'Where (shop or website)', 'det.imp': 'Amount (€)', 'det.data': 'Date',
    'det.pag': 'How you paid', 'det.cf': 'The invoice or receipt shows the student\'s tax code (or the paying parent\'s)',
    'pag.carta': 'Card', 'pag.bancomat': 'Debit card', 'pag.bonifico': 'Bank transfer', 'pag.app': 'App (PayPal, Satispay…)', 'pag.contanti': 'Cash',
    'det.w.cont': 'Paid in cash: the tax office may not accept it. Better pay by card or bank transfer.', 'det.w.cf': 'No tax code: ask for an invoice or a receipt with the tax code.',
    'det.doc': 'Documents to bring', 'det.doc.s': 'Tick the ones you have already put aside',
    'doc.diagnosi': 'The DSA diagnosis', 'doc.diagnosi.s': 'From the health service or an accredited centre',
    'doc.collegamento': 'The link with the disorder', 'doc.collegamento.s': 'That those tools are needed for the DSA: often already in the diagnosis, otherwise a doctor\'s certificate',
    'doc.fatture': 'Invoices or receipts with tax code', 'doc.fatture.s': 'With the tax code and what was bought',
    'doc.pagamenti': 'Proof of payment', 'doc.pagamenti.s': 'Bank statement, transfer or card receipt',
    'doc.online': 'For online purchases', 'doc.online.s': 'The order confirmation and the product page',
    'det.cafh': 'Prepare the sheet for the tax office', 'det.caf.t': 'Expenses for DSA tools — year {a}', 'det.caf.chi': 'Student', 'det.caf.cod': 'Code 44 · lines E8–E10 of form 730',
    'det.caf.firma': 'Documents attached (ticked):', 'det.tolta': 'Expense removed', 'det.mod': 'Edit', 'det.togli': 'Remove', salva: 'Save', annulla: 'Cancel', 'det.fotoa': 'photo attached',
  },
};
function tf(k, p) {
  let s = (SMF_T[LINGUA] && SMF_T[LINGUA][k]) ?? SMF_T.it[k] ?? k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  if (!(typeof SCRIPTA !== 'undefined' && SCRIPTA) || VMAPP) s = s.split('Scripta Manent').join('Verba Manent IA');   // nello Spazio DSA di Verba Manent
  return s;
}
const SMF = {sett: 0, det: null, anno: new Date().getFullYear()};
const smfEuro = n => (LINGUA === 'en' ? '€' : '') + (+n || 0).toLocaleString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + (LINGUA === 'en' ? '' : ' €');
const smfIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const smfLs = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

/* ------------------------------------------------------------------ La settimana per i genitori */
function smfSettimana() {
  // da lunedi' a domenica della settimana scelta (0 = questa, 1 = quella prima)
  const o = new Date(); o.setHours(12, 0, 0, 0); const lun = new Date(o); lun.setDate(o.getDate() - ((o.getDay() + 6) % 7) - 7 * SMF.sett);
  const dom = new Date(lun); dom.setDate(lun.getDate() + 6);
  return [lun, dom];
}
async function smSett() {
  const box = smTitolo('smsett', tf('set.h'), tf('set.p')); if (!box) return;
  box.innerHTML = `<div class="hint row" style="gap:8px"><span class="spin"></span></div>`;
  const [r, lz, vs] = await Promise.all([A.sm_compiti(), A.lezioni(), A.sm_voti()]);
  const [da, a] = smfSettimana(), d0 = smfIso(da), d1 = smfIso(a), oggi = smfIso(new Date());
  const fmt = d => d.toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {day: 'numeric', month: 'long'});
  SMS.oggi = (r && r.oggi) || oggi;
  const comp = (r && r.compiti) || [];
  const lezioni = ((lz && lz.lezioni) || []).filter(l => {
    const m = String(l.quando || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); if (!m) return false;
    const d = `${m[3]}-${m[2]}-${m[1]}`; return d >= d0 && d <= d1;
  });
  const fatti = comp.filter(v => v.fatto && v.tipo === 'compito' && (!v.per || (v.per >= d0 && v.per <= d1)));
  const dafare = comp.filter(v => !v.fatto && v.tipo === 'compito' && (!v.per || v.per <= smfIso(new Date(a.getTime() + 7 * 864e5))));
  const ver = comp.filter(v => !v.fatto && v.tipo !== 'compito' && v.per && v.per >= oggi).slice(0, 8);
  const voti = ((vs && vs.voti) || []).filter(v => v.data >= d0 && v.data <= d1);
  const piano = v => { const L = ((v.piano || {}).lista || []).flatMap(d => d.cose); return L.length ? tf('set.piano', {f: L.filter(c => c.ok).length, n: L.length}) : tf('set.nopiano'); };
  const S = {
    titolo: tf('set.h'), dal: tf('set.dal', {a: fmt(da), b: fmt(a)}),
    gruppi: [
      [tf('set.lez'), lezioni.map(l => `${l.materia ? l.materia + ': ' : ''}${l.nome}${l.quando ? ' (' + String(l.quando).slice(0, 10) + ')' : ''}`)],
      [tf('set.ver'), ver.map(v => `${v.materia ? v.materia + ': ' : ''}${v.cosa} — ${smData(v.per)} (${piano(v)})`)],
      [tf('set.voti'), voti.map(v => `${v.materia}: ${String(v.voto).replace('.', ',')}${v.nota ? ' — ' + v.nota : ''}`)],
      [tf('set.dafare'), dafare.map(v => `${v.materia ? v.materia + ': ' : ''}${v.cosa}${v.per ? ' — ' + smData(v.per) : ''}${v.per && v.per < oggi ? ' (' + tf('set.ritardo') + ')' : ''}`)],
      [tf('set.fatti'), fatti.map(v => `${v.materia ? v.materia + ': ' : ''}${v.cosa}`)],
    ]};
  const ven = smfLs('sm_venerdi') !== '0';
  box.innerHTML = `<div class="smx-tabs smm-tabs"><button class="${SMF.sett === 0 ? 'on' : ''}" data-s="0">${esc(tf('set.questa'))}</button><button class="${SMF.sett === 1 ? 'on' : ''}" data-s="1">${esc(tf('set.prima'))}</button></div>
    <div class="smf-set"><div class="hint" style="margin-bottom:10px">${esc(S.dal)}</div>${S.gruppi.map(([t0, L]) => `<h3 class="smx-h3">${esc(t0)}${L.length ? `<small class="dato" style="font-weight:400;color:var(--sm-ard)">${L.length}</small>` : ''}</h3>
      ${L.length ? `<ul class="smf-ul">${L.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<div class="hint">${esc(tf('set.niente'))}</div>`}`).join('')}</div>
    <div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn b-main b-sm" id="smfCopia">${smIco('g-manda')} ${esc(tf('set.copia'))}</button><button class="btn b-ghost b-sm" id="smfStampa">${smIco('g-stampa')} ${esc(tf('set.stampa'))}</button></div>
    <label class="smg-sw" style="margin-top:14px"><span class="sw${ven ? ' on' : ''}" id="smfVen"></span>${esc(tf('set.ven'))}</label>`;
  box.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { SMF.sett = +b.dataset.s; smSett(); });
  const testo = [`*${S.titolo}*`, S.dal, ...S.gruppi.flatMap(([t0, L]) => ['', `*${t0}*`, ...(L.length ? L.map(x => '• ' + x) : [tf('set.niente')])])].join('\n');
  $('smfCopia').onclick = async () => { try { await navigator.clipboard.writeText(testo); } catch (e) { const ta = document.createElement('textarea'); ta.value = testo; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove(); } toast(tf('set.copiato')); };
  $('smfStampa').onclick = () => smStampa(`<div class="smgen"><p class="hint">${esc(S.dal)}</p>${S.gruppi.map(([t0, L]) => `<h3>${esc(t0)}</h3>${L.length ? `<ul>${L.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="hint">${esc(tf('set.niente'))}</p>`}`).join('')}</div>`, S.titolo);
  $('smfVen').parentElement.onclick = () => { smfLs('sm_venerdi', ven ? '0' : '1'); smSett(); };
  smInfoGiro(box);
}
// il promemoria del venerdi' (dalle 17, una volta)
function smfVenerdi() {
  if (typeof SCRIPTA === 'undefined' || !(SCRIPTA || (typeof VMDSA !== 'undefined' && VMDSA)) || smfLs('sm_venerdi') === '0') return;
  const o = new Date(); if (o.getDay() !== 5 || o.getHours() < 17) return;
  if (smfLs('sm_venerdi_ult') === smfIso(o)) return;
  smfLs('sm_venerdi_ult', smfIso(o));
  const e = document.createElement('div'); e.className = 'toast smann';
  e.innerHTML = `<span>${esc(tf('set.ven.t'))}</span><button>${esc(tf('set.apri'))}</button>`;
  document.body.appendChild(e);
  e.querySelector('button').onclick = () => { e.remove(); vai('smsett'); };
  setTimeout(() => e.remove(), 20000);
}
setTimeout(smfVenerdi, 12000); setInterval(smfVenerdi, 10 * 60000);

/* ------------------------------------------------------------------ Detrazione del 19% */
async function smDet() {
  const box = smTitolo('smdet', tf('det.h'), tf('det.p')); if (!box) return;
  if (!SMF.det) { box.innerHTML = `<div class="hint row" style="gap:8px"><span class="spin"></span></div>`; const r = await A.sm_det(); SMF.det = r || {spese: [], doc: {}}; }
  const D = SMF.det, anni = [...new Set([new Date().getFullYear(), new Date().getFullYear() - 1, ...D.spese.map(s => +s.data.slice(0, 4))])].sort((x, y) => y - x);
  const spese = D.spese.filter(s => +s.data.slice(0, 4) === SMF.anno), tot = spese.reduce((x, s) => x + (+s.importo || 0), 0);
  const DOCS = ['diagnosi', 'collegamento', 'fatture', 'pagamenti', 'online'];
  box.innerHTML = `<div class="smk-cons"><b>${esc(tf('det.cos'))}</b> ${esc(tf('det.cos.s'))}<div class="hint" style="margin-top:6px">${esc(tf('det.nota'))}</div></div>
    <div class="smk-campo" style="margin-top:14px"><span>${esc(tf('det.anno'))}</span></div>${smgSeg('smfA', anni.map(x => [String(x), String(x)]), String(SMF.anno))}
    <div class="hint" style="margin-top:4px">${esc(tf('det.730', {a: SMF.anno + 1}))}</div>
    <h3 class="smx-h3">${esc(tf('det.spese'))}${spese.length ? `<small class="dato" style="font-weight:400;color:var(--sm-ard)">${esc(tf('det.tot', {t: smfEuro(tot)}))} · ${esc(tf('det.rec', {r: smfEuro(tot * 0.19)}))}</small>` : ''}</h3>
    ${spese.length ? `<div class="smg-plist">${spese.map(s => `<div class="smg-pr smf-sp"><div class="smg-prt" data-st="1"><b>${esc(s.cosa)}</b><span>${esc([s.data.split('-').reverse().join('/'), s.negozio, tf('pag.' + s.pag), s.foto && s.foto.length ? tf('det.fotoa') : ''].filter(Boolean).join(' · '))}</span>
        ${s.pag === 'contanti' ? `<span class="smf-w">${esc(tf('det.w.cont'))}</span>` : ''}${!s.cf ? `<span class="smf-w">${esc(tf('det.w.cf'))}</span>` : ''}</div>
        <b class="smf-imp">${esc(smfEuro(s.importo))}</b><button class="smg-pa" data-m="${esc(s.id)}" aria-label="${esc(tf('det.mod'))}" title="${esc(tf('det.mod'))}">${smIco('i-edit')}</button><button class="smg-pa" data-x="${esc(s.id)}" aria-label="${esc(tf('det.togli'))}" title="${esc(tf('det.togli'))}">${smIco('g-cestino')}</button></div>`).join('')}</div>`
      : `<div class="hint">${esc(tf('det.spese0'))}</div>`}
    <div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn b-main b-sm" id="smfAgg">${smIco('g-piu')} ${esc(tf('det.agg'))}</button><button class="btn b-ghost b-sm" id="smfFoto">${smIco('g-foto')} ${esc(tf('det.foto'))}</button></div>
    <h3 class="smx-h3">${esc(tf('det.doc'))}<small class="dato" style="font-weight:400;color:var(--sm-ard)">${esc(tf('det.doc.s'))}</small></h3>
    <div class="smk-spunte smf-doc">${DOCS.map(k => `<label class="smk-sp"><input type="checkbox" data-doc="${k}"${D.doc[k] ? ' checked' : ''}><span><b>${esc(tf('doc.' + k))}</b><small class="dato" data-st="1">${esc(tf('doc.' + k + '.s'))}</small></span></label>`).join('')}</div>
    <div class="row mt"><span class="sp"></span><button class="btn b-main" id="smfCaf"${spese.length ? '' : ' disabled'}>${smIco('g-stampa')} ${esc(tf('det.cafh'))}</button></div>`;
  smgSegOn(box, 'smfA', v => { SMF.anno = +v; smDet(); });
  $('smfAgg').onclick = () => smfSpesa(null);
  $('smfFoto').onclick = async () => {
    const s = await A.scatta_foglio(); if (!s || !s.ok || !s.percorsi || !s.percorsi.length) return;
    const b = $('smfFoto'); b.disabled = true; b.innerHTML = `<span class="spin"></span> ${esc(tf('det.lav'))}`;
    const r = await A.sm_det_foto(s.percorsi);
    b.disabled = false; b.innerHTML = `${smIco('g-foto')} ${esc(tf('det.foto'))}`;
    if (!r || !r.ok) return toast((r && r.msg) || '');
    smfSpesa(null, r.spesa); toast(tf('det.letta'));
  };
  box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => smfSpesa(D.spese.find(s => s.id === b.dataset.m)));
  box.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => {
    const r = await A.sm_det_togli(b.dataset.x); SMF.det = r; smDet();
    if (r.tolta) smAnnulla(tf('det.tolta'), async () => { const r2 = await A.sm_det_spesa(r.tolta); SMF.det = r2; smDet(); });
  });
  box.querySelectorAll('[data-doc]').forEach(i => i.onchange = async () => { const r = await A.sm_det_doc(i.dataset.doc, i.checked); SMF.det = r; });
  $('smfCaf').onclick = () => smfCaf(spese, tot);
  smInfoGiro(box);
}
function smfSpesa(s, letta) {
  const v = s || letta || {}, PAG = ['carta', 'bancomat', 'bonifico', 'app', 'contanti'];
  const pag = v.pag || 'carta';
  const fin = smkFinestra(s ? tf('det.mod') : tf('det.agg'), `
      <label class="smk-campo"><span>${esc(tf('det.cosa'))}</span><input class="in" name="cosa" maxlength="160" placeholder="${esc(tf('det.cosa.ph'))}" value="${esc(v.cosa || '')}"></label>
      <label class="smk-campo"><span>${esc(tf('det.neg'))}</span><input class="in" name="negozio" maxlength="80" value="${esc(v.negozio || '')}"></label>
      <div class="smk-due"><label class="smk-campo"><span>${esc(tf('det.imp'))}</span><input class="in" name="importo" type="number" min="0" step="0.01" value="${esc(v.importo != null ? v.importo : '')}"></label>
        <label class="smk-campo"><span>${esc(tf('det.data'))}</span><input class="in" name="data" type="date" value="${esc(v.data || smfIso(new Date()))}"></label></div>
      <div class="smk-campo"><span>${esc(tf('det.pag'))}</span></div>${smgSeg('smfP', PAG.map(k => [k, tf('pag.' + k)]), pag)}
      <div class="hint smf-w hidden" id="smfPw" style="margin-top:6px">${esc(tf('det.w.cont'))}</div>
      <label class="smk-sp" style="margin-top:12px"><input type="checkbox" name="cf"${v.cf ? ' checked' : ''}><span><b>${esc(tf('det.cf'))}</b></span></label>`, async d => {
    const val = n => d.querySelector(`[name="${n}"]`).value;
    if (!val('cosa').trim()) { d.querySelector('[name="cosa"]').focus(); return false; }
    const r = await A.sm_det_spesa({cosa: val('cosa'), negozio: val('negozio'), importo: val('importo'), data: val('data'), pag: fin.dataset.pag || pag, cf: d.querySelector('[name="cf"]').checked, foto: v.foto || []}, s ? s.id : null);
    if (!r || !r.ok) return false;
    SMF.det = r; SMF.anno = +val('data').slice(0, 4) || SMF.anno; smDet();
  });
  fin.dataset.pag = pag;
  const w = () => fin.querySelector('#smfPw').classList.toggle('hidden', fin.dataset.pag !== 'contanti');
  smgSegOn(fin, 'smfP', x => { fin.dataset.pag = x; w(); }); w();
}
function smfCaf(spese, tot) {
  const D = SMF.det, nome = ((R && R.studente) || {}).nome || '';
  const docs = ['diagnosi', 'collegamento', 'fatture', 'pagamenti', 'online'].filter(k => D.doc[k]);
  const riga = s => `<tr><td>${esc(s.data.split('-').reverse().join('/'))}</td><td>${esc(s.cosa)}</td><td>${esc(s.negozio || '')}</td><td>${esc(tf('pag.' + s.pag))}</td><td style="text-align:right">${esc(smfEuro(s.importo))}</td></tr>`;
  smStampa(`<p><b>${esc(tf('det.caf.chi'))}:</b> ${esc(nome || '______________________')}</p><p>${esc(tf('det.caf.cod'))}</p>
    <table class="smf-tab" style="width:100%;border-collapse:collapse"><thead><tr><th>${esc(tf('det.data'))}</th><th>${esc(tf('det.cosa'))}</th><th>${esc(tf('det.neg'))}</th><th>${esc(tf('det.pag'))}</th><th style="text-align:right">${esc(tf('det.imp'))}</th></tr></thead>
    <tbody>${spese.map(riga).join('')}</tbody><tfoot><tr><td colspan="4"><b>${esc(tf('det.tot', {t: ''}))}</b></td><td style="text-align:right"><b>${esc(smfEuro(tot))}</b></td></tr></tfoot></table>
    <p>${esc(tf('det.rec', {r: smfEuro(tot * 0.19)}))}</p>
    <p><b>${esc(tf('det.caf.firma'))}</b></p><ul>${['diagnosi', 'collegamento', 'fatture', 'pagamenti', 'online'].map(k => `<li>${docs.includes(k) ? '☑' : '☐'} ${esc(tf('doc.' + k))} — ${esc(tf('doc.' + k + '.s'))}</li>`).join('')}</ul>
    <p class="hint">${esc(tf('det.nota'))}</p>
    <style>.smf-tab th,.smf-tab td{border:1px solid #999;padding:6px 8px;font-size:14px;text-align:left}</style>`, tf('det.caf.t', {a: SMF.anno}));
}

/* ------------------------------------------------------------------ le due pagine nel programma */
(function () {
  if (typeof SM_PAGINE === 'undefined') return;
  SM_PAGINE.push('smsett', 'smdet');
  Object.assign(SMT.it, {'sett.h': SMF_T.it['set.h'], 'det.h': SMF_T.it['det.h'], 'sd.det.s': 'L\'elenco delle spese e dei documenti per il CAF'});
  Object.assign(SMT.en, {'sett.h': SMF_T.en['set.h'], 'det.h': SMF_T.en['det.h'], 'sd.det.s': 'The list of expenses and documents for the tax office'});
})();
