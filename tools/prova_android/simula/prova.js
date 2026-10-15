// Prova dell'app Android SENZA emulatore: la parte Python vera (con il telefono finto) e le pagine vere,
// usate come una persona su uno schermo da telefono. Scrive esito.json e le foto. Esce con 1 se qualcosa non va.
const { chromium } = require('playwright');
const fs = require('fs');
const [porta, O, dati] = process.argv.slice(2);
const esito = {passi: [], errori: []};
const passo = (n, ok, d = '') => { esito.passi.push({n, ok: !!ok, d: String(d).slice(0, 600)}); console.log((ok ? 'ok  - ' : 'NO  - ') + n + (d ? ' (' + String(d).slice(0, 200) + ')' : '')); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: 393, height: 830}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
  p.on('pageerror', x => esito.errori.push(x.message));
  const foto = async n => { await p.waitForTimeout(500); await p.screenshot({path: `${O}/${n}.png`}); };
  const st = () => p.evaluate(() => A.stato());
  const aspetta = async (cond, sec) => { for (let i = 0; i < sec; i++) { const s = await st(); if (cond(s)) return s; await p.waitForTimeout(1000); } return st(); };
  try {
    await p.goto(`http://127.0.0.1:${porta}/index.html?android=1`);
    await p.waitForSelector('#splash', {state: 'detached', timeout: 60000});
    passo('la pagina si apre', true);
    await p.click('.dlg [data-l="it"]');
    passo('aspetto da telefono', await p.evaluate(() => document.documentElement.classList.contains('android') && getComputedStyle(document.querySelector('.side .brand')).display === 'none'));
    await p.click('#doveBox [data-m="aula"]'); await foto('01-pronto');
    // «Durante»
    await p.fill('#nome', 'Analisi 1 – Derivate'); await p.click('#quandoBox [data-q="durante"]'); await p.click('#btnRec');
    await p.waitForTimeout(6000); await foto('02-registro');
    let s = await st();
    passo('registra', s.registro && s.secondi > 2, `secondi ${s.secondi}`);
    await p.waitForTimeout(6000);
    await p.click('#btnFine'); await p.click('.dlg .b-end');
    s = await aspetta(x => x.finale === 'ok' && !x.occupato, 120); await foto('03-fine');
    passo('«Durante»: lezione pronta', s.finale === 'ok' && s.parti.every(x => x.stato === 'ok'), JSON.stringify(s.parti.map(x => x.stato)));
    // «Dopo» + online (vivavoce)
    await p.click('#fNuova'); await p.waitForTimeout(800);
    await p.click('#doveBox [data-m="online"]'); await p.fill('#nome', 'Fisica 1 – Cinematica'); await p.click('#quandoBox [data-q="dopo"]');
    await p.click('#btnRec'); await p.waitForTimeout(600);
    passo('online: avviso «Metti il vivavoce»', await p.$('.dlg .b-rec')); await p.click('.dlg .b-rec');
    await p.waitForTimeout(6000); await p.click('#btnFine'); await p.click('.dlg .b-end');
    s = await aspetta(x => x.finale === 'ok' && !x.occupato, 60); await foto('04-fine-dopo');
    passo('«Dopo»: salvata senza trascrivere', s.parti.every(x => x.stato === 'dopo'), JSON.stringify(s.parti.map(x => x.stato)));
    await p.click('#nav [data-p="arch"]'); await p.waitForTimeout(1500); await foto('05-lezioni');
    const btn = await p.$('.lez [data-a="completa"]');
    passo('«Trascrivi ora» c\'è', btn);
    if (btn) { await btn.click(); s = await aspetta(x => x.finale === 'ok' && !x.occupato, 120); await foto('06-trascritta'); passo('«Trascrivi ora» finito', s.finale === 'ok' && s.parti.every(x => x.stato === 'ok')); }
    // appunti, lezioni
    const lz = await p.evaluate(() => A.lezioni());
    passo('Le mie lezioni', lz.lezioni.length === 2 && lz.lezioni.every(l => l.stato === 'pronta'), lz.lezioni.map(l => l.nome + ':' + l.stato).join(', '));
    // impostazioni e «Aggiorna l'app» → «Scarica»
    await p.click('#nav [data-p="imp"]'); await p.waitForTimeout(600); await foto('07-impostazioni');
    passo('impostazioni del telefono', await p.isVisible('#segQuando') && !(await p.isVisible('#swMini')));
    await p.click('#andAgg');
    await p.waitForSelector('#aggOk', {timeout: 20000}); await foto('08-aggiorna');
    await p.click('#aggOk'); await p.waitForTimeout(1500);
    const link = fs.existsSync(`${dati}/link_aperti.txt`) ? fs.readFileSync(`${dati}/link_aperti.txt`, 'utf8') : '';
    passo('«Scarica» apre l\'app nuova nel browser', link.includes('RegistraLezione.apk'), link.trim());
    await p.click('#nav [data-p="guida"]'); await p.waitForTimeout(600); await foto('09-guida');
    passo('guida del telefono', (await p.textContent('#gCap')).includes('Prima di iniziare'));
    // tasto Indietro del telefono
    passo('tasto Indietro', await p.evaluate(() => indietro() === true && pagina === 'reg'));
  } catch (e) { passo('errore nella prova', false, e); }
  if (esito.errori.length) passo('nessun errore nella pagina', false, esito.errori.join(' | '));
  fs.writeFileSync(`${O}/esito.json`, JSON.stringify(esito, null, 1));
  await b.close();
  process.exit(esito.passi.every(x => x.ok) ? 0 : 1);
})();
