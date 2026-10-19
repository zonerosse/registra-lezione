/* Prova gratuita e abbonamento (motore: licenza.py). Finché il sito non accende la prova, qui non si vede niente.
   - primo avvio con la prova accesa: «Benvenuto: N giorni di prova gratuita» con «Accedi con Google e inizia»
   - durante la prova: il riquadro «Prova gratuita · N giorni rimasti» nel menu (azzurro; giallo-ambra negli ultimi 3 giorni)
   - ultimi 3 giorni: l'avviso in cima a Registra
   - prova finita: Registra si spegne e compare «La prova gratuita è finita» (le lezioni restano tutte) */
'use strict';
(function () {
const TL = {
  it: {
    tit: 'Prova gratuita', rimasti: 'rimasti', g1: 'giorno', gn: 'giorni', vedi: "Vedi l'abbonamento",
    acc_t: 'Benvenuto: {n} giorni di prova gratuita',
    acc_s: 'Per {n} giorni Verba Manent è completo. Per partire accedi con Google: serve a contare i giorni della prova ed è lo stesso accesso di «Sincronizza».',
    acc_1: 'Registri e trascrivi sul tuo PC, senza limiti di minuti',
    acc_2: 'Appunti, tutor e test con la tua chiave di Claude: il costo è tuo, circa 0,20 $ per ora',
    acc_3: 'Finita la prova, le lezioni restano tue: le leggi, le ascolti e le ripassi quando vuoi',
    acc_b: 'Accedi con Google e inizia', gia: 'Ho già un abbonamento', acc_tile: 'Accedi con Google e inizia',
    browser: 'Si è aperto il browser: accedi con Google e torna qui.', acc_err: "L'accesso non è andato: riprova.",
    av_t: 'La prova gratuita finisce tra {n} {g} ({d})', av_s: "Dopo potrai sempre leggere, ascoltare e ripassare le tue lezioni. Per registrare e fare appunti nuovi servirà l'abbonamento.",
    dopo: 'Più tardi', fin_t: 'La prova gratuita è finita', fin_s: 'Grazie per aver provato Verba Manent. Le tue lezioni sono tue e restano qui.',
    fin_ok_t: 'Continui a poter', fin_ok: "leggere gli appunti, ascoltarli, fare il karaoke, ripassare le flashcard e preparare l'esame con le lezioni che hai già.",
    fin_ab_t: "Con l'abbonamento", fin_ab: 'registri e trascrivi lezioni nuove, fai appunti, tutor e test, con Claude già compreso.',
    fin_acc: 'Ho già un abbonamento: accedi', lezioni: 'Vai alle mie lezioni', finita: 'Prova finita',
    col_t: 'Collegati a internet', col_s: 'Verba Manent deve controllare la tua prova.', riprova: 'Riprova',
  },
  en: {
    tit: 'Free trial', rimasti: 'left', g1: 'day', gn: 'days', vedi: 'See the subscription',
    acc_t: 'Welcome: {n} days of free trial',
    acc_s: 'For {n} days Verba Manent is complete. To start, sign in with Google: it counts the days of the trial and it is the same sign-in as «Sync».',
    acc_1: 'Record and transcribe on your PC, with no minute limits',
    acc_2: 'Notes, tutor and tests with your own Claude key: the cost is yours, about $0.20 per hour',
    acc_3: 'When the trial ends, your lectures stay yours: read, listen and review them whenever you want',
    acc_b: 'Sign in with Google and start', gia: 'I already have a subscription', acc_tile: 'Sign in with Google and start',
    browser: 'Your browser has opened: sign in with Google and come back here.', acc_err: 'The sign-in did not work: try again.',
    av_t: 'The free trial ends in {n} {g} ({d})', av_s: 'Afterwards you can always read, listen to and review your lectures. Recording and new notes will need a subscription.',
    dopo: 'Later', fin_t: 'The free trial has ended', fin_s: 'Thanks for trying Verba Manent. Your lectures are yours and they stay here.',
    fin_ok_t: 'You can still', fin_ok: 'read your notes, listen to them, use the karaoke, review the flashcards and prepare the exam with the lectures you already have.',
    fin_ab_t: 'With the subscription', fin_ab: 'you record and transcribe new lectures, make notes, tutor and tests, with Claude already included.',
    fin_acc: 'I already have a subscription: sign in', lezioni: 'Go to my lectures', finita: 'Trial ended',
    col_t: 'Connect to the internet', col_s: 'Verba Manent needs to check your trial.', riprova: 'Try again',
  },
};
const tl = (k, p) => { let s = (TL[LINGUA] || TL.it)[k] || TL.it[k] || k; for (const [a, b] of Object.entries(p || {})) s = s.replace('{' + a + '}', b); return s; };
const sc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let LIC = null, avvisoVia = false, benvenutoVisto = false, attesa = null;
const giorniTxt = n => n + ' ' + tl(n === 1 ? 'g1' : 'gn');
const giorno = d => { try { return new Date(d).toLocaleDateString(LINGUA === 'en' ? 'en-GB' : 'it-IT', {weekday: 'long', day: 'numeric', month: 'long'}); } catch (e) { return ''; } };

// ------------------------------------------------------------------ il riquadro nel menu (sul telefono: in cima a Registra)
function riquadro() {
  let r = document.getElementById('licTile');
  const st = LIC && LIC.stato;
  if (!['prova', 'accedi', 'scaduta', 'collegati'].includes(st)) { if (r) r.remove(); return; }
  if (!r) {
    r = document.createElement('div'); r.id = 'licTile';
    const foot = document.querySelector('.side .foot');
    if (foot && getComputedStyle(foot).display !== 'none') foot.prepend(r);
    else { const p = document.getElementById('v-pronto'); if (p) p.prepend(r); r.classList.add('lic-in-pagina'); }
  }
  const ambra = st !== 'prova' || (LIC.giorni || 0) <= 3;
  r.className = 'lic-tile' + (ambra ? ' ambra' : '') + (r.classList.contains('lic-in-pagina') ? ' lic-in-pagina' : '');
  const tot = LIC.giorni_prova || 14;
  let corpo = '';
  if (st === 'prova') corpo = `<div class="lic-n">${sc(giorniTxt(LIC.giorni || 0))} <small>${sc(tl('rimasti'))}</small></div><div class="lic-bar"><i style="width:${Math.max(4, Math.min(100, (LIC.giorni || 0) / tot * 100)).toFixed(0)}%"></i></div><button class="btn b-main b-sm" data-lic="abbonati">${sc(tl('vedi'))}</button>`;
  else if (st === 'accedi') corpo = `<div class="lic-n">${sc(giorniTxt(tot))}</div><button class="btn b-main b-sm" data-lic="accedi">${sc(tl('acc_tile'))}</button>`;
  else if (st === 'scaduta') corpo = `<div class="lic-n">${sc(tl('finita'))}</div><button class="btn b-main b-sm" data-lic="abbonati">${sc(tl('vedi'))}</button>`;
  else corpo = `<div class="lic-n" style="font-size:16px">${sc(tl('col_t'))}</div><div class="lic-s">${sc(tl('col_s'))}</div><button class="btn b-main b-sm" data-lic="riprova">${sc(tl('riprova'))}</button>`;
  r.innerHTML = `<div class="lic-k">⏳ ${sc(tl('tit'))}</div>${corpo}`;
  attacca(r);
}

// ------------------------------------------------------------------ avviso negli ultimi 3 giorni, prova finita
function pagina() {
  const p = document.getElementById('v-pronto'); if (!p) return;
  const st = LIC && LIC.stato;
  let av = document.getElementById('licAvviso');
  const vuoleAvviso = st === 'prova' && (LIC.giorni || 0) <= 3 && !avvisoVia;
  if (vuoleAvviso && !av) {
    av = document.createElement('div'); av.id = 'licAvviso'; av.className = 'avviso2'; av.style.marginBottom = '14px';
    p.prepend(av);
  }
  if (av && !vuoleAvviso) av.remove();
  if (vuoleAvviso) {
    av.innerHTML = `<b>${sc(tl('av_t', {n: LIC.giorni, g: tl(LIC.giorni === 1 ? 'g1' : 'gn'), d: giorno(LIC.fine)}))}</b>${sc(tl('av_s'))}
      <div class="row mt" style="gap:8px"><button class="btn b-main b-sm" data-lic="abbonati">${sc(tl('vedi'))}</button><button class="btn b-ghost b-sm" data-lic="dopo">${sc(tl('dopo'))}</button></div>`;
    attacca(av);
  }
  let fin = document.getElementById('licFinita');
  const finita = st === 'scaduta';
  p.classList.toggle('lic-spenta', finita);
  if (finita && !fin) {
    fin = document.createElement('div'); fin.id = 'licFinita'; fin.className = 'card';
    fin.innerHTML = `<div class="lic-ft">${sc(tl('fin_t'))}</div><div class="hint" style="font-size:14px;line-height:1.55">${sc(tl('fin_s'))}</div>
      <div class="lic-due"><div class="avviso2 lic-verde"><b>${sc(tl('fin_ok_t'))}</b>${sc(tl('fin_ok'))}</div><div class="avviso2"><b>${sc(tl('fin_ab_t'))}</b>${sc(tl('fin_ab'))}</div></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn b-main" data-lic="abbonati">${sc(tl('vedi'))}</button><button class="btn b-ghost" data-lic="accedi">${sc(tl('fin_acc'))}</button><button class="btn b-ghost" data-lic="lezioni">${sc(tl('lezioni'))}</button></div>`;
    p.prepend(fin); attacca(fin);
  }
  if (fin && !finita) fin.remove();
}

// ------------------------------------------------------------------ primo avvio: «Accedi con Google e inizia»
function benvenuto() {
  if (benvenutoVisto || !LIC || LIC.stato !== 'accedi' || document.querySelector('.velo')) return;
  benvenutoVisto = true;
  const n = LIC.giorni_prova || 14;
  const v = document.createElement('div'); v.className = 'velo'; v.id = 'licVelo';
  v.innerHTML = `<div class="dlg"><h3>${sc(tl('acc_t', {n}))}</h3><div class="tx">${sc(tl('acc_s', {n}))}</div>
    <div class="passi">✓ ${sc(tl('acc_1'))}<br>✓ ${sc(tl('acc_2'))}<br>✓ ${sc(tl('acc_3'))}</div><div class="hint mt hidden" id="licMsg"></div>
    <div class="bt"><button class="btn b-ghost b-sm" data-lic="accedi">${sc(tl('gia'))}</button><button class="btn b-main b-sm" data-lic="accedi">${sc(tl('acc_b'))}</button></div></div>`;
  document.body.append(v); attacca(v);
}

function attacca(el) {
  el.querySelectorAll('[data-lic]').forEach(b => b.onclick = () => azione(b.dataset.lic));
}
async function azione(a) {
  if (a === 'abbonati') return A.licenza_abbonati();
  if (a === 'lezioni') return vai('arch');
  if (a === 'dopo') { avvisoVia = true; return pagina(); }
  if (a === 'riprova') return carica(true);
  if (a === 'accedi') {
    await A.licenza_accedi();
    const m = document.getElementById('licMsg'); if (m) { m.textContent = tl('browser'); m.classList.remove('hidden'); }
    else if (typeof toast === 'function') toast(tl('browser'));
    clearInterval(attesa);
    attesa = setInterval(async () => {
      const l = await A.licenza();
      if (l.accesso && l.accesso.startsWith('errore')) { clearInterval(attesa); const m2 = document.getElementById('licMsg'); if (m2) m2.textContent = tl('acc_err'); return; }
      if (l.accesso !== 'in_corso' && l.stato !== 'accedi') { clearInterval(attesa); const v = document.getElementById('licVelo'); if (v) v.remove(); aggiorna(l); try { R = await A.riepilogo(); } catch (e) {} }
    }, 2000);
  }
}

function aggiorna(l) { LIC = l || {}; riquadro(); pagina(); benvenuto(); }
async function carica(forza) { try { aggiorna(await A.licenza(!!forza)); } catch (e) {} }

// si parte quando la pagina del programma è pronta; il benvenuto aspetta che lingua e privacy siano chiuse
const via = setInterval(() => {
  if (typeof A === 'undefined' || !A || document.getElementById('splash')) return;
  clearInterval(via);
  carica();
  setInterval(carica, 5 * 60000);
  setInterval(() => { if (!benvenutoVisto) benvenuto(); }, 2000);
}, 700);
})();
