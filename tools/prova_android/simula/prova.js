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
  const rileggiPagina = async () => { await p.evaluate(() => rileggi()); await p.waitForTimeout(500); };
  const aspetta = async (cond, sec) => { for (let i = 0; i < sec; i++) { const s = await st(); if (cond(s)) return s; await p.waitForTimeout(1000); } return st(); };
  try {
    await p.goto(`http://127.0.0.1:${porta}/index.html?android=1`);
    await p.waitForSelector('#splash', {state: 'detached', timeout: 60000});
    passo('la pagina si apre', true);
    await p.click('.dlg [data-l="it"]');
    passo('aspetto da telefono', await p.evaluate(() => document.documentElement.classList.contains('android') && getComputedStyle(document.querySelector('.side .brand')).display === 'none'));
    passo('chiave di Claude (protetta dal telefono)', (await p.evaluate(() => A.prova_chiave('sk-ant-prova'))).ok);
    await p.evaluate(() => A.imposta('appunti_attivi', true)); await rileggiPagina();
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
    // ---- le funzioni del PC sul telefono
    const leggi = f => fs.existsSync(`${dati}/${f}`) ? fs.readFileSync(`${dati}/${f}`, 'utf8') : '';
    await p.click('#nav [data-p="reg"]'); await p.waitForTimeout(800);
    if (await p.$('#fNuova') && await p.isVisible('#fNuova')) { await p.click('#fNuova'); await p.waitForTimeout(800); }
    await p.click('#tipoBox [data-k="riunione"]'); await p.waitForTimeout(400);
    passo('riunione: modelli di riunione', await p.isVisible('#modBox'));
    await p.click('#doveBox [data-m="aula"]');
    await p.fill('#nome', 'Riunione commerciale – listino 2027');
    for (const n of ['Marco Rossi', 'Giulia Bianchi']) { await p.fill('#partIn', n); await p.press('#partIn', 'Enter'); }
    await p.click('#quandoBox [data-q="durante"]'); await p.click('#btnRec'); await p.waitForTimeout(3000);
    passo('durante: «Le tue note» e «Chiedi adesso»', await p.isVisible('#noteCard') && await p.isVisible('#ddCard'));
    await p.fill('#notaIn', 'Chiedere lo sconto per 3 anni'); await p.press('#notaIn', 'Enter'); await p.waitForTimeout(500);
    await p.click('#noteCard [data-nota="importante"]'); await p.waitForTimeout(1500);
    passo('le note si salvano col minuto', (await p.evaluate(() => A.note())).length === 2);
    await aspetta(x => x.parti.some(y => y.stato === 'ok'), 60);
    await p.fill('#ddIn', 'Cosa ha detto sui prezzi?'); await p.click('#ddVai');
    await p.waitForFunction(() => document.querySelectorAll('#ddChat .bolla').length > 1 && !document.querySelector('#ddChat .spin'), null, {timeout: 30000}).catch(() => {});
    await foto('10-durante-note'); 
    passo('«Chiedi adesso» risponde', /confronto/.test(await p.textContent('#ddChat')), (await p.textContent('#ddChat')).slice(0, 120));
    await p.click('#btnFine'); await p.click('.dlg .b-end');
    s = await aspetta(x => x.finale === 'ok' && !x.occupato, 120);
    passo('riunione pronta', s.finale === 'ok');
    let lz2 = await p.evaluate(() => A.lezioni());
    const riu = lz2.lezioni.find(l => l.nome.startsWith('Riunione'));
    passo('verbale fatto', riu && riu.n_appunti > 0, riu && riu.stato);
    // chi parla
    const vc = await p.evaluate(c => A.voci(c), riu.cartella);
    passo('chi parla: voci riconosciute sul telefono', vc && (vc.voci || []).length >= 1, JSON.stringify((vc.voci || []).map(v => v.nome)));
    // condividi
    await p.click('#nav [data-p="arch"]'); await p.waitForTimeout(1500);
    const bc = await p.$('.lez [data-a="condividi"]');
    passo('bottone Condividi', bc);
    await bc.click(); await p.waitForSelector('.velo .tile'); await foto('11-condividi');
    passo('condividi: «WhatsApp e altre app», niente Google Docs', await p.$('.velo .tile[data-k="manda"]') && !(await p.$('.velo .tile[data-k="gdocs"]')));
    await p.click('.velo .tile[data-k="email"]'); await p.waitForSelector('.velo .dest .in');
    await p.fill('.velo .dest .in >> nth=0', 'm.rossi@esempio.it'); await foto('12-email');
    await p.click('.velo .bt .b-main'); await p.waitForTimeout(2500);
    const em = leggi('email.txt');
    passo('email: Gmail con indirizzo e PDF allegato', em.includes('m.rossi@esempio.it') && em.includes('.pdf'), em.slice(0, 200));
    await bc.click(); await p.waitForSelector('.velo .tile');
    await p.click('.velo .tile[data-k="cal"]'); await p.waitForSelector('.velo .calt'); await foto('13-calendario');
    await p.click('.velo .bt .b-main'); await p.waitForTimeout(3000);
    passo('nel calendario del telefono', leggi('eventi.txt').split('\n').filter(Boolean).length >= 2, leggi('eventi.txt').slice(0, 200));
    await bc.click(); await p.waitForSelector('.velo .tile');
    await p.click('.velo .tile[data-k="manda"]'); await p.waitForTimeout(2000);
    // cerca nelle parole dette
    await p.fill('#cerca', 'limite'); await p.dispatchEvent('#cerca', 'input');
    await p.waitForSelector('#paroleRis .pris', {timeout: 10000}).catch(() => {}); await foto('14-cerca-parole');
    passo('cerca nelle parole dette', await p.$('#paroleRis .pris'));
    await p.fill('#cerca', ''); await p.dispatchEvent('#cerca', 'input');
    // statistiche
    const stt = await p.evaluate(c => A.statistiche(c), riu.cartella);
    passo('statistiche', stt && stt.durata > 0, stt && stt.durata_t);
    // spezzone (solo audio) e email con lo spezzone
    const sp = await p.evaluate(c => A.spezzone(c, 2, 9, true), riu.cartella);
    passo('spezzone audio', sp.ok && fs.existsSync(sp.file) && sp.file.endsWith('.m4a'), sp.msg || sp.nome);
    if (sp.ok) { await p.evaluate(f => A.spezzone_email(f), sp.file); await p.waitForTimeout(800); passo('spezzone per email', leggi('email.txt').includes('.m4a')); }
    // da fare
    passo('scheda «Da fare» in basso', await p.isVisible('#nav [data-p="fare"]'));
    await p.click('#nav [data-p="fare"]'); await p.waitForTimeout(1200); await foto('15-da-fare');
    const nFare = (await p.$$('#cfLista .fare[data-id]')).length;
    passo('da fare: le cose del verbale', nFare >= 2, nFare);
    await p.click('#cfLista .fare[data-id] input >> nth=0'); await p.waitForTimeout(1000);
    passo('da fare: spunta', (await p.evaluate(() => A.cose_da_fare())).aperte === nFare - 1);
    // preparazione all'esame
    await p.click('#nav [data-p="arch"]'); await p.waitForTimeout(1200);
    const be = await p.$('#bandaEsame');
    passo('bottone «Preparati all\'esame»', be);
    if (be) { await be.click(); await p.waitForSelector('#esBox .card', {timeout: 30000}).catch(() => {}); await foto('16-esame'); passo('preparazione all\'esame', await p.$('#esBox .card')); }
    // chapters e spezzone
    await p.click('#nav [data-p="arch"]'); await p.waitForTimeout(1200);
    // calendario: avviso all'ora dell'impegno, anche con l'app chiusa
    const ora = new Date(Date.now() + 40 * 60000), hh = x => String(x).padStart(2, '0');
    const fra = new Date(ora.getTime() + 60 * 60000);
    await p.evaluate(r => A.cal_orario(r), [{giorno: (ora.getDay() + 6) % 7, dalle: `${hh(ora.getHours())}:${hh(ora.getMinutes())}`, alle: `${hh(fra.getHours())}:${hh(fra.getMinutes())}`, nome: 'Fisica 1', dove: 'aula'}]);
    let sv = '';
    for (let i = 0; i < 75 && !sv.includes('Fisica 1'); i++) { await p.waitForTimeout(1000); sv = leggi('sveglie.txt'); }
    passo('calendario: sveglia per la notifica', sv.includes('Fisica 1'), sv.slice(-200));
    await p.click('#nav [data-p="imp"]'); await p.waitForTimeout(800);
    passo('impostazioni: collegamenti, chi parla, niente «registra da solo»', await p.isVisible('#cgCard') && await p.isVisible('#swVoci') && !(await p.isVisible('#segCal [data-v="solo"]')));
    await p.evaluate(() => document.getElementById('calCard').scrollIntoView()); await foto('17-calendario-imp');
    // impostazioni e «Aggiorna l'app» → «Scarica»
    await p.click('#nav [data-p="imp"]'); await p.waitForTimeout(600); await foto('07-impostazioni');
    passo('impostazioni del telefono', await p.isVisible('#segQuando') && !(await p.isVisible('#swMini')));
    await p.click('#andAgg');
    await p.waitForSelector('#aggOk', {timeout: 20000}); await foto('08-aggiorna');
    await p.click('#aggOk'); await p.waitForTimeout(1500);
    const link = fs.existsSync(`${dati}/link_aperti.txt`) ? fs.readFileSync(`${dati}/link_aperti.txt`, 'utf8') : '';
    passo('«Scarica» apre l\'app nuova nel browser', link.includes('RegistraLezione.apk'), link.trim());
    // aggiornamento leggero: scarica i file nuovi e riapre l'app
    fs.writeFileSync(`${dati}/agg_tipo.txt`, 'zip');
    await p.evaluate(() => A.chiudi_agg()); await p.evaluate(() => A.cerca_aggiornamenti());
    await p.waitForFunction(() => { const b = document.querySelector('#aggOk'); return b && b.textContent.length > 0; }, null, {timeout: 20000});
    await p.waitForTimeout(1500); await foto('08b-aggiorna-leggero');
    await p.click('#aggOk');
    for (let i = 0; i < 30 && !fs.existsSync(`${dati}/riavviato.txt`); i++) await p.waitForTimeout(1000);
    passo('aggiornamento leggero: scaricato e app riaperta', fs.existsSync(`${dati}/../rl_agg/interfaccia/index.html`) && fs.existsSync(`${dati}/riavviato.txt`));
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
