/* «Inizia qui»: il primo avvio in 3 passi (sul PC), subito dopo «Prima di iniziare».
   1 Google   un accesso solo: Google Drive per PC, telefono e web (gli zip con la password) e l'abbonamento
   2 Claude   abbonato o famiglia: «Claude è già compreso»; altrimenti la chiave, con «Incolla» e i passi per prenderla
   3 Telefono e web   il QR da inquadrare col telefono e la password degli zip per verbamanent.app/studia
   Si riapre da Impostazioni › Inizia qui. Usa solo funzioni che c'erano già (nuvola_*, licenza, prova_chiave, sync_*). */
'use strict';
(function () {
const TQ = {
  it: {
    p1: 'Google', p2: 'Claude', p3: 'Telefono e web',
    g_t: 'Inizia qui: un accesso solo, per tutto', g_s: 'Accedi una volta con Google e Verba Manent fa da sé il resto.',
    g_1t: 'Le stesse lezioni su PC, telefono e web', g_1: 'Passano dal tuo Google Drive, ognuna in uno zip chiuso con una password',
    g_2t: "Se hai l'abbonamento, Claude è già pronto", g_2: 'Niente chiavi da mettere',
    g_3t: 'Verba Manent vede solo i file che crea lui', g_3: "Nel tuo Drive non legge nient'altro",
    g_b: 'Accedi con Google', g_salta: 'Salta: uso Verba Manent solo su questo PC', g_dopo: 'Lo puoi fare dopo da Impostazioni › Inizia qui',
    g_browser: 'Si è aperto il browser: scegli il tuo account Google, lascia la spunta sul permesso di Drive e torna qui.',
    g_ok: 'Collegato: {e}', g_ok_s: 'Google Drive pronto per PC, telefono e web', g_altro: 'Usa un altro account',
    g_gia_t: 'Nel tuo Drive ci sono già lezioni di un altro dispositivo', g_gia_s: "Per aprirle serve la loro password. Si prende dall'altro dispositivo:", g_gia_dove: 'Dove la trovo',
    g_gia_1: 'Sull\'altro dispositivo (PC o telefono) apri <b>Verba Manent IA</b>.', g_gia_1pc: 'Sull\'altro dispositivo (telefono o PC) apri <b>Verba Manent IA</b>.',
    g_gia_2: 'Vai in <b>Impostazioni › Sincronizza</b> e tocca <b>Apri…</b>',
    g_gia_3: 'Accanto a <b>La password degli zip</b> c\'è un QR: tocca qui sotto <b>Inquadra il QR</b> e puntalo.',
    g_gia_3inc: 'Accanto a <b>La password degli zip</b> tocca <b>Copia</b>, poi qui sotto <b>Incolla</b>.',
    g_gia_3pc: 'Accanto a <b>La password degli zip</b> tocca <b>Copia</b> e incollala qui sotto, oppure scrivila.',
    g_qr: 'Inquadra il QR', g_oppure: 'Oppure scrivila o incollala:', g_qr_no: 'Questo non è il QR della password: inquadra quello accanto a «La password degli zip».',
    g_gia_b: 'Usa questa password',
    e_annullato: "L'accesso non è stato completato. Riprova.", e_tempo: "Sono passati 5 minuti senza completare l'accesso. Riprova.",
    e_api: 'Google Drive non risponde per Verba Manent: riprova tra poco.', e_permesso: "Google non ha dato il permesso. Riprova e, nella pagina di Google, lascia la spunta sul permesso di Drive.",
    e_rete: "L'accesso non è andato a buon fine (rete o Google non raggiungibile). Riprova fra poco.",
    avanti: 'Avanti ›', indietro: '‹ Indietro',
    c_t: "Claude: gli appunti fatti dall'intelligenza artificiale",
    c_ab: 'Claude è già compreso nel tuo abbonamento ({p})', c_ab_s: 'Non devi mettere nessuna chiave: appunti, tutor e test funzionano subito',
    c_ok: 'La tua chiave di Claude è già a posto', c_ok_s: 'Appunti, tutor e test funzionano',
    c_s: 'Registrare e trascrivere è gratis. Per gli appunti, il tutor e i test serve una chiave di Claude: la paghi tu ad Anthropic, circa 0,20 $ per ora di lezione.',
    incolla: '📋 Incolla', c_dove: 'Come prendo la chiave? (5 minuti, una volta sola)',
    c_d1: 'Apri {l} e accedi con Google o con la tua email. Se non hai l\'account, si crea lì in un minuto.',
    c_d2: '<b>Solo la prima volta:</b> metti un po\' di credito in {l} (bastano 5 $, circa 25 ore di lezione). Senza credito la chiave non funziona.',
    c_d3: 'Torna su <b>Chiavi API</b> e premi <b>Crea chiave</b>:<br>· <b>Nome:</b> «Verba Manent»<br>· <b>Ambito:</b> scegli quello che ti propone (se resta vuoto, il bottone Crea è grigio)<br>· <b>Scadenza:</b> scegli <b>Mai</b> o la più lunga, così non devi rifarla dopo 30 giorni',
    c_d4: 'Premi <b>Crea</b>: compare la chiave, che inizia con <b>sk-ant-</b>. Premi <b>Copia</b>: si vede <b>una volta sola</b>.',
    c_d5: 'Torna qui: Verba Manent la incolla da solo (o premi <b>📋 Incolla</b>).',
    c_att: "Attenzione: il codice che inizia con «apikey_…» nell'elenco non è la chiave, è solo il suo nome interno. Le chiavi vecchie non si possono ricopiare: se l'hai persa, creane una nuova.",
    l_chiavi: 'console.anthropic.com/settings/keys ↗', l_fatt: 'Fatturazione ↗',
    c_dopo: 'Lo faccio dopo', c_nota: 'Senza chiave registri e trascrivi lo stesso: gli appunti li fai quando la metti.',
    c_provo: 'Controllo la chiave…', c_vuota: 'Incolla la chiave che inizia con sk-ant-.',
    t_t: 'Telefono e web', t_tel: 'Sul telefono', t_tel_s: 'Apri Verba Manent › Impostazioni › Sincronizza › <b>Collegati al PC</b> e inquadra questo QR.',
    t_tel_h: 'Il telefono riceve da solo le lezioni, Google Drive e la password.', t_cod: 'oppure scrivi il codice {c}',
    t_coll: 'Collegati: {n}', t_noqr: 'PC e telefono devono essere sulla stessa rete Wi-Fi. Puoi farlo anche dopo da Impostazioni › Sincronizza.',
    t_web: '<b>Sul web</b> (verbamanent.app/studia): accedi con lo stesso Google e scrivi la password degli zip.',
    copia: 'Copia', copiata: 'Copiata ✓', t_foglio: 'Scrivila anche su un foglio: serve solo per il web o se perdi PC e telefono insieme.',
    t_nogoogle: 'Per il web serve l\'accesso con Google (passo 1): lo puoi fare dopo da Impostazioni › Inizia qui.',
    t_no: 'Non ho il telefono adesso', t_fine: 'Fatto: inizia a registrare',
    imp_t: '🚀 Inizia qui', imp_s: 'Google, Claude, telefono e web in 3 passi.', imp_b: 'Apri…',
    // sul telefono
    p3_tel: 'PC', imp_s_tel: 'Google, Claude e PC in 3 passi.', g_salta_tel: 'Salta: uso Verba Manent solo su questo telefono',
    inv_t: 'Ho un invito', inv_s: "Te l'ha mandato chi ti presta le chiavi (WhatsApp o email): incollalo qui.", inv_b: 'Attiva',
    inv_vuoto: "Incolla il messaggio dell'invito (inizia con VMIA-INVITO-1:).", chiave_t: 'Ho una chiave mia', chiave_s: 'Inizia con sk-ant-: incollala e la controllo.',
    pc_t: 'Le stesse lezioni del PC', pc_s: 'Sul PC apri Verba Manent › Impostazioni › Sincronizza: compare un QR. Tocca qui sotto e inquadralo.',
    pc_b: 'Collegati al PC', pc_h: 'PC e telefono sulla stessa rete Wi-Fi. Puoi farlo anche dopo da Impostazioni › Sincronizza.', pc_no: 'Non ho il PC adesso',
  },
  en: {
    p1: 'Google', p2: 'Claude', p3: 'Phone and web',
    g_t: 'Start here: one sign-in, for everything', g_s: 'Sign in once with Google and Verba Manent does the rest.',
    g_1t: 'The same lectures on PC, phone and web', g_1: 'They go through your Google Drive, each one in a password-locked zip',
    g_2t: 'If you have a subscription, Claude is ready', g_2: 'No keys to set up',
    g_3t: 'Verba Manent only sees the files it creates', g_3: 'It reads nothing else in your Drive',
    g_b: 'Sign in with Google', g_salta: 'Skip: I only use Verba Manent on this PC', g_dopo: 'You can do it later from Settings › Start here',
    g_browser: 'Your browser has opened: choose your Google account, leave the Drive permission ticked and come back here.',
    g_ok: 'Connected: {e}', g_ok_s: 'Google Drive ready for PC, phone and web', g_altro: 'Use another account',
    g_gia_t: 'Your Drive already has lectures from another device', g_gia_s: 'To open them you need their password. You get it from the other device:', g_gia_dove: 'Where do I find it',
    g_gia_1: 'On the other device (PC or phone) open <b>Verba Manent IA</b>.', g_gia_1pc: 'On the other device (phone or PC) open <b>Verba Manent IA</b>.',
    g_gia_2: 'Go to <b>Settings › Sync</b> and tap <b>Open…</b>',
    g_gia_3: 'Next to <b>The zip password</b> there is a QR code: tap <b>Scan the QR code</b> below and point at it.',
    g_gia_3inc: 'Next to <b>The zip password</b> tap <b>Copy</b>, then <b>Paste</b> below.',
    g_gia_3pc: 'Next to <b>The zip password</b> tap <b>Copy</b> and paste it below, or type it.',
    g_qr: 'Scan the QR code', g_oppure: 'Or type or paste it:', g_qr_no: 'This is not the password QR code: scan the one next to «The zip password».',
    g_gia_b: 'Use this password',
    e_annullato: 'The sign-in was not completed. Try again.', e_tempo: '5 minutes passed without completing the sign-in. Try again.',
    e_api: 'Google Drive is not answering for Verba Manent: try again shortly.', e_permesso: 'Google did not give permission. Try again and leave the Drive permission ticked on the Google page.',
    e_rete: 'The sign-in did not work (network or Google unreachable). Try again shortly.',
    avanti: 'Next ›', indietro: '‹ Back',
    c_t: 'Claude: AI-made notes',
    c_ab: 'Claude is already included in your subscription ({p})', c_ab_s: 'No key needed: notes, tutor and tests work right away',
    c_ok: 'Your Claude key is already set', c_ok_s: 'Notes, tutor and tests work',
    c_s: 'Recording and transcribing are free. Notes, tutor and tests need a Claude key: you pay Anthropic, about $0.20 per hour of lecture.',
    incolla: '📋 Paste', c_dove: 'How do I get the key? (5 minutes, once)',
    c_d1: 'Open {l} and sign in with Google or your email. If you have no account, you create one there in a minute.',
    c_d2: '<b>First time only:</b> add some credit under {l} ($5 is enough, about 25 hours of lectures). Without credit the key does not work.',
    c_d3: 'Go back to <b>API keys</b> and press <b>Create Key</b>:<br>· <b>Name:</b> «Verba Manent»<br>· <b>Workspace:</b> choose the one offered (if empty, the Create button stays grey)<br>· <b>Expiry:</b> choose <b>Never</b> or the longest, so you don\'t redo it after 30 days',
    c_d4: 'Press <b>Create</b>: the key appears, starting with <b>sk-ant-</b>. Press <b>Copy</b>: it is shown <b>only once</b>.',
    c_d5: 'Come back here: Verba Manent pastes it by itself (or press <b>📋 Paste</b>).',
    c_att: 'Careful: the code starting with «apikey_…» in the list is not the key, just its internal name. Old keys cannot be copied again: if you lost it, create a new one.',
    l_chiavi: 'console.anthropic.com/settings/keys ↗', l_fatt: 'Billing ↗',
    c_dopo: "I'll do it later", c_nota: 'Without a key you still record and transcribe: you make the notes when you add it.',
    c_provo: 'Checking the key…', c_vuota: 'Paste the key that starts with sk-ant-.',
    t_t: 'Phone and web', t_tel: 'On the phone', t_tel_s: 'Open Verba Manent › Settings › Sync › <b>Connect to the PC</b> and scan this QR.',
    t_tel_h: 'The phone gets the lectures, Google Drive and the password by itself.', t_cod: 'or type the code {c}',
    t_coll: 'Connected: {n}', t_noqr: 'PC and phone must be on the same Wi-Fi. You can also do it later from Settings › Sync.',
    t_web: '<b>On the web</b> (verbamanent.app/studia): sign in with the same Google account and type the zip password.',
    copia: 'Copy', copiata: 'Copied ✓', t_foglio: 'Also write it on paper: it is only needed for the web or if you lose PC and phone together.',
    t_nogoogle: 'The web needs the Google sign-in (step 1): you can do it later from Settings › Start here.',
    t_no: "I don't have the phone now", t_fine: 'Done: start recording',
    imp_t: '🚀 Start here', imp_s: 'Google, Claude, phone and web in 3 steps.', imp_b: 'Open…',
    p3_tel: 'PC', imp_s_tel: 'Google, Claude and PC in 3 steps.', g_salta_tel: 'Skip: I only use Verba Manent on this phone',
    inv_t: 'I have an invitation', inv_s: 'The person lending you the keys sent it (WhatsApp or email): paste it here.', inv_b: 'Activate',
    inv_vuoto: 'Paste the invitation message (it starts with VMIA-INVITO-1:).', chiave_t: 'I have my own key', chiave_s: 'It starts with sk-ant-: paste it and I will check it.',
    pc_t: 'The same lectures as on the PC', pc_s: 'On the PC open Verba Manent › Settings › Sync: a QR appears. Tap below and scan it.',
    pc_b: 'Connect to the PC', pc_h: 'PC and phone on the same Wi-Fi. You can also do it later from Settings › Sync.', pc_no: 'I do not have the PC now',
  },
};
// Scripta Manent: il suo nome al posto di Verba Manent, e niente «web» (verbamanent.app/studia e' solo di Verba Manent)
const TQ_SM = {
  it: {p3: 'Telefono', t_t: 'Telefono', g_1t: 'Le stesse lezioni su PC e telefono', g_ok_s: 'Google Drive pronto per PC e telefono',
    t_web: '<b>Sul web</b> (verbamanent.app/scripta): accedi con lo stesso Google e scrivi la password degli zip.',
    g_gia_2: 'Vai in <b>Impostazioni › PC, telefono e cloud</b> (sul telefono Impostazioni è in <b>Altro</b>) e in <b>Sincronizza</b> tocca <b>Apri…</b>', t_foglio: 'Scrivila anche su un foglio: serve se perdi PC e telefono insieme.',
    t_nogoogle: 'Senza Google, PC e telefono si sincronizzano solo quando sono sullo stesso Wi-Fi: lo puoi fare dopo da Impostazioni › Inizia qui.',
    imp_s: 'Google, Claude e telefono in 3 passi.'},
  en: {p3: 'Phone', t_t: 'Phone', g_1t: 'The same lectures on PC and phone', g_ok_s: 'Google Drive ready for PC and phone',
    t_web: '<b>On the web</b> (verbamanent.app/scripta): sign in with the same Google account and type the zip password.',
    g_gia_2: 'Go to <b>Settings › PC, phone and cloud</b> (on the phone Settings is under <b>More</b>) and in <b>Sync</b> tap <b>Open…</b>', t_foglio: 'Also write it on paper: you need it if you lose PC and phone together.',
    t_nogoogle: 'Without Google, PC and phone sync only when they are on the same Wi-Fi: you can do it later from Settings › Start here.',
    imp_s: 'Google, Claude and phone in 3 steps.'},
};
const tq = (k, p) => {
  const sm = typeof SCRIPTA !== 'undefined' && SCRIPTA;
  let s = (sm && ((TQ_SM[LINGUA] || TQ_SM.it)[k])) || (TQ[LINGUA] || TQ.it)[k] || TQ.it[k] || k;
  if (sm) s = s.split('Verba Manent IA').join('Scripta Manent').split('Verba Manent').join('Scripta Manent');
  for (const [a, b] of Object.entries(p || {})) s = s.split('{' + a + '}').join(b);
  return s;
};
const sq = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const L_CHIAVI = 'https://console.anthropic.com/settings/keys', L_FATT = 'https://console.anthropic.com/settings/billing';
const G_SVG = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

let V = null, fine = null, poll = null, codice = null;
const TEL = typeof ANDROID !== 'undefined' && ANDROID;
const IPH = typeof IPHONE !== 'undefined' && IPHONE;
let SENZA_G = false;      // se l'accesso a Google non c'e' (vecchie app iPhone): si parte da Claude     // sul telefono: «Ho un invito» e il passo 3 «Collegati al PC»
const ferma = () => { if (poll) { clearInterval(poll); poll = null; } };
function chiudi() {
  ferma();
  if (codice) { try { A.sync_annulla_codice(); } catch (e) {} codice = null; }
  if (V) { V.remove(); V = null; }
  try { A.imposta('inizia_fatto', true); } catch (e) {}
  if (typeof rileggi === 'function') rileggi();
  const f = fine; fine = null;
  if (f) f();
}
function passi(n) {
  const ks = SENZA_G ? ['p2', 'p3_tel'] : ['p1', 'p2', TEL ? 'p3_tel' : 'p3'];
  if (SENZA_G) n -= 1;
  return `<div class="iq-passi">${ks.map((k, i) => `<div class="${i + 1 < n ? 'fatto' : i + 1 === n ? 'ora' : ''}"><i></i>${i + 1 < n ? '✓ ' : (i + 1) + ' · '}${sq(tq(k))}</div>`).join('')}</div>`;
}
function mostra(n, html) { V.querySelector('.dlg').innerHTML = passi(n) + html; }
const okBox = (t, s) => `<div class="iq-ok"><span class="s">✓</span><div><b>${sq(t)}</b><span class="hint">${sq(s)}</span></div></div>`;

// ------------------------------------------------------------------ 1 · Google
async function passo1(err) {
  ferma();
  const n = await A.nuvola_stato();
  if (n.provider === 'google' && n.email && !n.manca_chiave && !err) {
    mostra(1, `<h3>${sq(tq('g_t'))}</h3>${okBox(tq('g_ok', {e: n.email}), tq('g_ok_s'))}
      <div class="pv-bt"><a id="iqAltro">${sq(tq('g_altro'))}</a><button class="btn b-main" id="iqAv">${sq(tq('avanti'))}</button></div>`);
    V.querySelector('#iqAv').onclick = passo2;
    V.querySelector('#iqAltro').onclick = () => accedi();
    return;
  }
  if (n.provider === 'google' && n.manca_chiave && !err) {
    const qr = TEL && (IPH || ((typeof R !== 'undefined' && R.app_codice) || 0) >= 13);     // il telefono legge il QR del PC
    mostra(1, `<h3>${sq(tq('g_gia_t'))}</h3><div class="tx">${sq(tq('g_gia_s'))}</div>
      <div class="iq-dove"><b>${sq(tq('g_gia_dove'))}</b><ol><li>${tq(TEL ? 'g_gia_1' : 'g_gia_1pc')}</li><li>${tq('g_gia_2')}</li><li>${tq(!TEL ? 'g_gia_3pc' : qr ? 'g_gia_3' : 'g_gia_3inc')}</li></ol></div>
      ${qr ? `<button class="btn b-main iq-qrb" id="iqPwQr">${sq(tq('g_qr'))}</button><div class="hint" style="margin:8px 0 4px">${sq(tq('g_oppure'))}</div>` : ''}
      <div class="iq-campo"><input class="in" id="iqPw" placeholder="ABCD-EFGH-JKLM-NPQR" autocomplete="off"><button class="btn b-ghost b-sm" id="iqPwInc">${sq(tq('incolla'))}</button></div>
      <div class="dlgerr" id="iqErr"></div>
      <div class="pv-bt"><a id="iqAltro">${sq(tq('g_altro'))}</a><button class="btn b-main" id="iqPwOk">${sq(tq('g_gia_b'))}</button></div>`);
    V.querySelector('#iqPwInc').onclick = async () => { const x = await leggiAppunti(); if (x) V.querySelector('#iqPw').value = x.trim(); };
    const prova = async () => {
      const r = await A.nuvola_chiave(V.querySelector('#iqPw').value);
      if (r.ok) passo1(); else V.querySelector('#iqErr').textContent = r.msg || '';
    };
    if (V.querySelector('#iqPwQr')) V.querySelector('#iqPwQr').onclick = async () => {
      V.querySelector('#iqErr').textContent = '';
      const q = await A.leggi_qr();
      if (!q || !q.ok) { if (q && q.msg) V.querySelector('#iqErr').textContent = q.msg; return; }
      const x = String(q.testo || '').trim(), pw = /^vmpw:/i.test(x) ? x.slice(5) : /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/i.test(x) ? x : '';
      if (!pw) { V.querySelector('#iqErr').textContent = tq('g_qr_no'); return; }
      V.querySelector('#iqPw').value = pw.toUpperCase(); prova();
    };
    V.querySelector('#iqAltro').onclick = () => accedi();
    V.querySelector('#iqPwOk').onclick = prova;
    return;
  }
  mostra(1, `<h3>${sq(tq('g_t'))}</h3><div class="tx">${sq(tq('g_s'))}</div>
    <div class="pv-p">
      <div class="pv-i az"><span class="ic">📱</span><div><b>${sq(tq('g_1t'))}</b><span>${sq(tq('g_1'))}</span></div></div>
      <div class="pv-i az"><span class="ic">✨</span><div><b>${sq(tq('g_2t'))}</b><span>${sq(tq('g_2'))}</span></div></div>
      <div class="pv-i az"><span class="ic">🔒</span><div><b>${sq(tq('g_3t'))}</b><span>${sq(tq('g_3'))}</span></div></div>
    </div>
    <button class="iq-g" id="iqG">${G_SVG}${sq(tq('g_b'))}</button>
    <div class="dlgerr" id="iqErr">${sq(err || '')}</div>
    <div class="pv-bt"><a id="iqSalta">${sq(tq(TEL ? 'g_salta_tel' : 'g_salta'))}</a><span class="hint">${sq(tq('g_dopo'))}</span></div>`);
  V.querySelector('#iqG').onclick = () => accedi();
  V.querySelector('#iqSalta').onclick = passo2;
}
async function accedi() {
  const x = await A.nuvola_accedi('google');
  if (!x.ok) { passo1(x.msg || tq('e_rete')); return; }
  const b = V.querySelector('#iqG');
  if (b) { b.disabled = true; b.innerHTML = `<span class="spin"></span>${sq(tq('g_browser'))}`; b.classList.add('attesa'); }
  else mostra(1, `<h3>${sq(tq('g_t'))}</h3><div class="iq-g attesa"><span class="spin"></span>${sq(tq('g_browser'))}</div>`);
  ferma();
  poll = setInterval(async () => {
    const n = await A.nuvola_stato();
    if (n.accesso === 'in_corso') return;
    ferma();
    if (String(n.accesso).startsWith('errore')) {
      const k = {'errore:annullato': 'e_annullato', 'errore:tempo': 'e_tempo', 'errore:api': 'e_api', 'errore:accesso': 'e_permesso'}[n.accesso] || 'e_rete';
      passo1(tq(k) + (n.dettaglio ? ' (' + n.dettaglio + ')' : ''));
      return;
    }
    try { await A.licenza(true); } catch (e) {}           // con l'accesso nuovo: abbonamento o famiglia?
    passo1();
  }, 1500);
}

// ------------------------------------------------------------------ 2 · Claude
async function leggiAppunti() {
  let x = '';
  try { x = await A.appunti_testo(); } catch (e) {}
  if (!x && navigator.clipboard) try { x = await navigator.clipboard.readText(); } catch (e) {}
  return String(x || '');
}
async function passo2() {
  ferma();
  let lic = {};
  try { lic = await A.licenza(false); } catch (e) {}
  try { R = await A.riepilogo(); } catch (e) {}
  const abb = lic && lic.stato === 'abbonato';
  const bt = `<div class="pv-bt"><a id="iqInd">${sq(tq('indietro'))}</a><button class="btn b-main" id="iqAv">${sq(tq('avanti'))}</button></div>`;
  if (abb || R.chiave) {
    if (abb && !R.appunti_on) { try { await A.imposta('appunti_attivi', true); } catch (e) {} }
    mostra(2, `<h3>${sq(tq('c_t'))}</h3>${abb ? okBox(tq('c_ab', {p: lic.piano || ''}), tq('c_ab_s')) : okBox(tq('c_ok'), tq('c_ok_s'))}${bt}`);
    V.querySelector('#iqAv').onclick = passo3;
    V.querySelector('#iqInd').onclick = () => { if (!SENZA_G) passo1(); };
    return;
  }
  const link = (u, t) => `<a class="iq-link" data-u="${u}">${sq(t)}</a>`;
  const invito = TEL ? `<div class="iq-inv"><b>${sq(tq('inv_t'))}</b><div class="hint">${sq(tq('inv_s'))}</div>
      <div class="iq-campo"><input class="in" id="iqInv" placeholder="VMIA-INVITO-1:…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="btn b-main b-sm" id="iqInvOk">${sq(tq('inv_b'))}</button></div>
      <div class="dlgerr" id="iqInvErr"></div></div>
    <div style="margin-top:12px"><b>${sq(tq('chiave_t'))}</b><div class="hint">${sq(tq('chiave_s'))}</div></div>` : '';
  mostra(2, `<h3>${sq(tq('c_t'))}</h3><div class="tx">${sq(tq('c_s'))}</div>${invito}
    <div class="iq-campo"><input class="in" id="iqK" type="password" placeholder="sk-ant-…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="btn b-ghost b-sm" id="iqInc">${sq(tq('incolla'))}</button></div>
    <div class="dlgerr" id="iqErr"></div>
    <details class="iq-dove" open><summary>${sq(tq('c_dove'))}</summary><ol>
      <li>${tq('c_d1', {l: link(L_CHIAVI, tq('l_chiavi'))})}</li><li>${tq('c_d2', {l: link(L_FATT, tq('l_fatt'))})}</li>
      <li>${tq('c_d3')}</li><li>${tq('c_d4')}</li><li>${tq('c_d5')}</li></ol>
      <div class="hint" style="margin-top:6px">${sq(tq('c_att'))}</div></details>
    <div class="pv-bt"><a id="iqDopo">${sq(tq('c_dopo'))}</a><button class="btn b-main" id="iqAv">${sq(tq('avanti'))}</button></div>
    <div class="hint" style="text-align:center;margin-top:10px">${sq(tq('c_nota'))}</div>`);
  const inp = V.querySelector('#iqK'), err = V.querySelector('#iqErr');
  if (TEL) V.querySelector('#iqInvOk').onclick = async () => {
    const x = V.querySelector('#iqInv').value.trim(), e = V.querySelector('#iqInvErr');
    if (!x) { e.textContent = tq('inv_vuoto'); return; }
    let r = {};
    try { r = await A.invito_attiva(x); } catch (er) { r = {ok: false, msg: String(er)}; }
    if (!r || !r.ok) { e.textContent = (r && (r.msg || r.errore)) || '?'; return; }
    via(); passo3();
  };
  let aperto = false;
  V.querySelectorAll('.iq-link').forEach(a => a.onclick = () => { aperto = true; A.apri(a.dataset.u); });
  const incolla = async () => { const x = (await leggiAppunti()).replace(/\s+/g, ''); if (x.startsWith('sk-ant-')) { inp.value = x; return true; } return false; };
  V.querySelector('#iqInc').onclick = incolla;
  // tornando dalla pagina delle chiavi: se negli appunti c'e' una chiave, la mette da sola
  const fuoco = async () => { if (aperto && !inp.value && V && V.contains(inp)) { if (await incolla()) aperto = false; } };
  window.addEventListener('focus', fuoco);
  const via = () => window.removeEventListener('focus', fuoco);
  V.querySelector('#iqDopo').onclick = () => { via(); passo3(); };
  V.querySelector('#iqAv').onclick = async () => {
    const k = inp.value.trim();
    if (!k) { err.textContent = tq('c_vuota'); return; }
    const b = V.querySelector('#iqAv'); b.disabled = true; err.style.color = 'var(--mut)'; err.textContent = tq('c_provo');
    const r = await A.prova_chiave(k);
    b.disabled = false; err.style.color = '';
    if (!r.ok) { err.textContent = r.msg || ''; return; }
    via(); passo3();
  };
}

// ------------------------------------------------------------------ 3 · Telefono e web
async function passo3() {
  ferma();
  if (TEL) {
    mostra(3, `<h3>${sq(tq('pc_t'))}</h3><div class="tx">${sq(tq('pc_s'))}</div>
      <div style="text-align:center;margin-top:14px"><button class="btn b-main" id="iqPc">${sq(tq('pc_b'))}</button></div>
      <div class="hint" style="margin-top:10px">${sq(tq('pc_h'))}</div>
      <div class="pv-bt"><a id="iqNo">${sq(tq('pc_no'))}</a><button class="btn b-main" id="iqFine">${sq(tq('t_fine'))}</button></div>`);
    V.querySelector('#iqNo').onclick = chiudi;
    V.querySelector('#iqFine').onclick = chiudi;
    V.querySelector('#iqPc').onclick = () => { chiudi(); vai('sy'); SY.modo = 'collega'; SY.fatto = ''; disegnaSY(true); };
    return;
  }
  const n = await A.nuvola_stato();
  let qr = '', cod = '';
  try {
    const c = await A.sync_codice();
    if (c.ok) {
      codice = c.codice; cod = c.codice.slice(0, 3) + ' ' + c.codice.slice(3);
      const q = qrcode(0, 'M'); q.addData(`vmia:${c.codice}@${(c.ip || []).join(',')}`); q.make();
      qr = q.createSvgTag({cellSize: 6, margin: 2, scalable: true});
    }
  } catch (e) {}
  const web = n.provider === 'google' && n.chiave
    ? `<div class="tx" style="margin-top:4px">${tq('t_web')}</div>
       <div class="iq-chiave"><span>🔑</span><code>${sq(n.chiave)}</code><button class="btn b-ghost b-sm" id="iqCopia">${sq(tq('copia'))}</button></div>
       <div class="hint" style="margin-top:6px">${sq(tq('t_foglio'))}</div>`
    : `<div class="hint" style="margin-top:4px">${sq(tq('t_nogoogle'))}</div>`;
  mostra(3, `<h3>${sq(tq('t_t'))}</h3>
    <div class="iq-due">${qr ? `<div class="iq-qr">${qr}</div>` : ''}<div class="tx"><b>${sq(tq('t_tel'))}</b><br>${tq('t_tel_s')}<br><span class="hint">${sq(tq('t_tel_h'))}</span>
      ${cod ? `<div class="hint" style="margin-top:6px">${sq(tq('t_cod', {c: cod}))}</div>` : `<div class="hint" style="margin-top:6px">${sq(tq('t_noqr'))}</div>`}
      <div id="iqColl"></div></div></div>
    ${web}
    <div class="pv-bt"><a id="iqNo">${sq(tq('t_no'))}</a><button class="btn b-main" id="iqFine">${sq(tq('t_fine'))}</button></div>`);
  const cp = V.querySelector('#iqCopia');
  if (cp) cp.onclick = () => {
    const t = n.chiave;
    const fatto = () => { cp.textContent = tq('copiata'); };
    try { navigator.clipboard.writeText(t).then(fatto, () => { copiaVecchio(t); fatto(); }); } catch (e) { copiaVecchio(t); fatto(); }
  };
  V.querySelector('#iqNo').onclick = chiudi;
  V.querySelector('#iqFine').onclick = chiudi;
  if (codice) poll = setInterval(async () => {
    const r = await A.sync_stato();
    if (r.evento && r.evento.tipo === 'abbinato') {
      ferma(); codice = null;
      const c = V && V.querySelector('#iqColl');
      if (c) c.innerHTML = okBox(tq('t_coll', {n: r.evento.nome || ''}), tq('t_tel_h'));
    }
  }, 2000);
}
function copiaVecchio(t) {
  const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select();
  try { document.execCommand('copy'); } catch (e) {}
  x.remove();
}

// ------------------------------------------------------------------ via
window.iniziaQui = function (poi) {
  if (V) return;
  fine = poi || null;
  V = document.createElement('div'); V.className = 'velo'; V.id = 'iqVelo';
  V.innerHTML = '<div class="dlg iq"></div>';
  document.body.appendChild(V);
  (async () => {
    SENZA_G = false;
    if (IPH) { try { const n = await A.nuvola_stato(); SENZA_G = !(n.disponibili && n.disponibili.google); } catch (e) { SENZA_G = true; } }
    if (SENZA_G) passo2(); else passo1();
  })();
};
// Impostazioni › Inizia qui (PC e telefono)
function rigaImpostazioni() {
  const primo = document.querySelector('#v-imp .imsez');
  const c = document.getElementById('iqImp');
  if (c && c.dataset.l === LINGUA) return;
  if (c) c.remove();
  if (!primo) return;
  const d = document.createElement('div'); d.className = 'card'; d.id = 'iqImp'; d.dataset.l = LINGUA; d.style.marginBottom = '14px';
  d.innerHTML = `<div class="set"><div class="t"><b>${sq(tq('imp_t'))}</b><span>${sq(tq(TEL ? 'imp_s_tel' : 'imp_s'))}</span></div><button class="btn b-ghost b-sm" id="iqImpB">${sq(tq('imp_b'))}</button></div>`;
  primo.parentNode.insertBefore(d, primo);
  d.querySelector('#iqImpB').onclick = () => window.iniziaQui();
}
const attendi = setInterval(() => {
  if (typeof R === 'undefined' || !R || !document.querySelector('#v-imp .imsez')) return;
  clearInterval(attendi);
  rigaImpostazioni();
  setInterval(rigaImpostazioni, 2000);         // cambiando lingua, la riga si riscrive
}, 500);
})();
