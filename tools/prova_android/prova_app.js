// Prova dell'app Android vera sul telefono simulato: si collega alla pagina dentro l'app (WebView) e la usa come una persona.
const { _android } = require('playwright');
const O = process.argv[2] + '/';
const esito = {passi: [], errori: []};
const fs = require('fs');
const passo = (n, ok, d = '') => {
  esito.passi.push({n, ok, d, ora: new Date().toISOString().slice(11, 19)});
  console.log((ok ? 'ok  - ' : 'NO  - ') + n + (d ? ' (' + d + ')' : ''));
  fs.writeFileSync(O + 'esito_app.json', JSON.stringify(esito, null, 1));     // salvato subito: se il telefono si blocca resta quello fatto
};
(async () => {
  let b;
  try {
    let dev;
    for (let i = 0; i < 30 && !dev; i++) { [dev] = await _android.devices(); if (!dev) await new Promise(r => setTimeout(r, 2000)); }
    if (!dev) throw new Error('nessun telefono visto da Playwright');
    const wv = await dev.webView({pkg: 'it.puntowebferrara.registralezione'}, {timeout: 120000});
    const p = await wv.page();
    p.on('pageerror', x => esito.errori.push(x.message));
    const foto = async n => { await p.waitForTimeout(700); await p.screenshot({path: O + n + '.png'}); };
    await p.waitForSelector('#splash', {state: 'detached', timeout: 180000});
    passo('la pagina si apre', true, await p.evaluate(() => location.href));
    if (await p.$('.dlg [data-l="it"]')) await p.click('.dlg [data-l="it"]');
    await p.click('#doveBox [data-m="aula"]');
    await foto('01-pronto');
    passo('telefono riconosciuto', await p.evaluate(() => document.documentElement.classList.contains('android')));
    // registrazione vera dal microfono (simulato), 40 secondi, "Durante"
    await p.fill('#nome', 'Prova – Microfono');
    await p.click('#quandoBox [data-q="durante"]');
    await p.click('#btnRec');
    await p.waitForTimeout(8000); await foto('02-registro');
    const s1 = await p.evaluate(() => A.stato());
    passo('registra', s1.registro && s1.secondi > 3, `secondi ${s1.secondi}, batteria ${s1.batteria}`);
    await p.waitForTimeout(30000);
    await p.click('#btnFine'); await p.click('.dlg .b-end');
    await p.waitForTimeout(3000); await foto('03-fine-lavoro');
    for (let i = 0; i < 300; i++) { const s = await p.evaluate(() => A.stato()); if (i % 10 === 0) console.log('  … ' + JSON.stringify({finale: s.finale, modello: s.modello, parti: s.parti})); if (s.finale === 'ok') break; await p.waitForTimeout(3000); }
    await foto('04-fine');
    const s2 = await p.evaluate(() => A.stato());
    passo('lezione dal microfono pronta', s2.finale === 'ok', JSON.stringify(s2.parti));
    // seconda lezione con "Dopo": registra e basta, poi «Trascrivi ora» in Le mie lezioni
    await p.click('#fNuova'); await p.waitForTimeout(1500);
    await p.fill('#nome', 'Prova – Dopo');
    await p.click('#quandoBox [data-q="dopo"]');
    await p.click('#btnRec'); await p.waitForTimeout(25000);
    await p.click('#btnFine'); await p.click('.dlg .b-end'); await p.waitForTimeout(4000); await foto('05-fine-dopo');
    const s3 = await p.evaluate(() => A.stato());
    passo('«Dopo»: salvata senza trascrivere', s3.finale === 'ok' && (s3.parti || []).every(x => x.stato === 'dopo'), JSON.stringify(s3.parti));
    await p.click('#nav [data-p="arch"]'); await p.waitForTimeout(2500); await foto('06-lezioni');
    const btn = await p.$('.lez [data-a="completa"]');
    passo('c\'è «Trascrivi ora»', !!btn);
    if (btn) {
      await btn.click(); await p.waitForTimeout(4000); await foto('07-trascrivo');
      const t0 = Date.now();
      for (let i = 0; i < 400; i++) { const s = await p.evaluate(() => A.stato()); if (i % 10 === 0) console.log('  … ' + JSON.stringify({finale: s.finale, parti: s.parti, carica: s.aspetta_carica})); if (s.finale === 'ok' && !s.occupato) break; await p.waitForTimeout(3000); }
      const s4 = await p.evaluate(() => A.stato());
      passo('«Trascrivi ora» finito', s4.finale === 'ok', `${Math.round((Date.now() - t0) / 1000)} s`);
    }
    await p.click('#nav [data-p="arch"]'); await p.waitForTimeout(2500); await foto('08-lezioni');
    const lz = await p.evaluate(() => A.lezioni());
    passo('elenco lezioni', lz.lezioni.length >= 2, lz.lezioni.map(l => l.nome + ':' + l.stato).join(', '));
    await p.click('#nav [data-p="imp"]'); await foto('09-impostazioni');
    await p.click('#nav [data-p="guida"]'); await foto('10-guida');
  } catch (e) { passo('errore nella prova', false, String(e).slice(0, 500)); }
  require('fs').writeFileSync(O + 'esito_app.json', JSON.stringify(esito, null, 1));
  process.exit(0);
})();
