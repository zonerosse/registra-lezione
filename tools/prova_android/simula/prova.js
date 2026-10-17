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
    await p.waitForSelector('#pvOk', {timeout: 10000}); await foto('00-prima-di-iniziare');
    passo('«Prima di iniziare»: «Inizia» spento senza spunta, dice «telefono»', await p.isDisabled('#pvOk') && (await p.innerText('.velo')).includes('telefono'));
    await p.check('#pvCk'); await p.click('#pvOk'); await p.waitForTimeout(500);
    passo('«Prima di iniziare»: spunta salvata', (await p.evaluate(() => A.riepilogo())).privacy_ok === true);
    passo('aspetto da telefono', await p.evaluate(() => document.documentElement.classList.contains('android') && getComputedStyle(document.querySelector('.side .brand')).display === 'none'));
    passo('chiave di Claude (protetta dal telefono)', (await p.evaluate(() => A.prova_chiave('sk-ant-prova'))).ok);
    await p.evaluate(() => A.imposta('appunti_attivi', true)); await rileggiPagina();
    await p.click('#nav [data-p="fare"]'); await p.waitForTimeout(800); await foto('00b-fare-vuota');
    passo('«Da fare» vuota: spiega cos\'è e porta a registrare una riunione', await p.isVisible('.cfvuoto') && await p.isVisible('#cfRiu'));
    await p.click('#nav [data-p="reg"]'); await p.waitForTimeout(500);
    await p.click('#doveBox [data-m="aula"]'); await foto('01-pronto');
    // «Durante»
    await p.fill('#nome', 'Analisi 1 – Derivate'); await p.click('#quandoBox [data-q="durante"]'); await p.click('#btnRec');
    await p.waitForTimeout(6000); await foto('02-registro');
    let s = await st();
    passo('registra', s.registro && s.secondi > 2, `secondi ${s.secondi}`);
    await p.waitForTimeout(6000);
    await p.click('#btnFine'); await p.click('.dlg .b-end');
    s = await aspetta(x => x.finale === 'ok' && !x.occupato, 120); await foto('03-fine');
    const logf = require('child_process').execSync(`cat "${dati}"/Documents/*/registra_lezione.log 2>/dev/null || true`).toString();
    passo('«Pronta subito»: trascrive a pezzi mentre registra', /in corso: trascritta fino a/.test(logf), (logf.match(/parte \d+ in corso: trascritta fino a [\d.]+ s/g) || []).slice(0, 3).join('; '));
    passo('«Durante»: lezione pronta', s.finale === 'ok' && s.parti.every(x => x.stato === 'ok'), JSON.stringify(s.parti.map(x => x.stato)));
    // «Dopo» + online (vivavoce)
    await p.click('#fNuova'); await p.waitForTimeout(800);
    await p.evaluate(() => A.imposta('appunti_attivi', false)); await rileggiPagina();      // niente appunti: si creano dopo da «Le mie lezioni»
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
    await p.evaluate(() => A.imposta('appunti_attivi', true)); await rileggiPagina();
    // «Crea appunti» sul telefono: si resta in Le mie lezioni, con la barra sulla scheda
    await aspetta(x => !x.occupato, 60);
    await p.click('#nav [data-p="arch"]'); await p.waitForTimeout(1500);
    const bcrea = await p.$('.lez [data-a="crea"]');
    passo('«Crea appunti» c\'è', bcrea);
    if (bcrea) {
      await bcrea.click(); await p.waitForTimeout(400);
      await p.waitForSelector('#lista .bar.cor', {timeout: 5000}).catch(() => {}); await foto('06b-crea-appunti');
      passo('«Crea appunti»: resta in Le mie lezioni con la barra', await p.evaluate(() => pagina === 'arch' && !!document.querySelector('#lista .bar.cor')),
            await p.evaluate(() => pagina));
      await p.waitForFunction(() => !APLAV, null, {timeout: 90000}).catch(() => {}); await p.waitForTimeout(1500);
      const fis = (await p.evaluate(() => A.lezioni())).lezioni.find(l => l.nome.startsWith('Fisica'));
      passo('«Crea appunti»: finito, c\'è «Apri appunti»', await p.evaluate(() => pagina === 'arch') && fis && fis.n_appunti > 0 &&
            await p.$('.lez [data-a="appunti"]'), fis && fis.n_appunti);
      await foto('06c-appunti-creati');
    }
    // «Importa una trascrizione» (un PDF di testo)
    await p.click('#nav [data-p="reg"]'); await p.waitForTimeout(1200);
    if (await p.$('#fNuova') && await p.isVisible('#fNuova')) { await p.click('#fNuova'); await p.waitForTimeout(1000); }
    passo('riquadro «Hai già la trascrizione?»', await p.isVisible('#btnImportaTesto'));
    await p.click('#btnImportaTesto'); await p.waitForSelector('#v-itesto:not(.hidden)', {timeout: 10000}).catch(() => {}); await foto('06d-importa-testo');
    passo('importa testo: pagina con file e parole', await p.isVisible('#itVai') && /parole/.test(await p.textContent('#itInfo')), await p.textContent('#itInfo'));
    await p.fill('#itNome', 'Fisiologia – muscolo'); await p.click('#itFmt [data-f="cornell"]'); await p.click('#itVai');
    await p.waitForTimeout(800);
    passo('importa testo: resta in Le mie lezioni con la barra', await p.evaluate(() => pagina === 'arch'));
    await p.waitForFunction(() => !APLAV, null, {timeout: 90000}).catch(() => {}); await p.waitForTimeout(1500); await foto('06e-testo-appunti');
    const fis2 = (await p.evaluate(() => A.lezioni())).lezioni.find(l => l.nome.startsWith('Fisiologia'));
    passo('importa testo: appunti fatti', fis2 && fis2.n_appunti > 0, fis2 && JSON.stringify({n: fis2.n_appunti, s: fis2.stato}));
    if (fis2) await p.evaluate(c => A.elimina(c, false), fis2.cartella);
    // «Importa un audio» (sul telefono)
    await p.click('#nav [data-p="reg"]'); await p.waitForTimeout(1200);
    if (await p.$('#fNuova') && await p.isVisible('#fNuova')) { await p.click('#fNuova'); await p.waitForTimeout(1000); }
    passo('riquadro «Hai già un audio?»', await p.isVisible('#btnImporta'), await p.textContent('#btnImporta b'));
    await p.click('#btnImporta'); await p.waitForSelector('#v-importa:not(.hidden)', {timeout: 15000}).catch(() => {}); await foto('06f-importa-audio');
    passo('importa audio: pagina con durata', await p.isVisible('#ivVai') && /min|s/.test(await p.textContent('#ivInfo')), await p.textContent('#ivInfo'));
    await p.fill('#ivNome', 'Chimica – audio'); await p.click('#ivVai');
    s = await aspetta(x => x.finale === 'ok' && !x.occupato, 180); await foto('06g-audio-trascritto');
    const chi = (await p.evaluate(() => A.lezioni())).lezioni.find(l => l.nome.startsWith('Chimica'));
    passo('importa audio: trascritto con gli appunti', chi && chi.stato === 'pronta' && chi.trascritta && chi.n_appunti > 0,
          chi && JSON.stringify({s: chi.stato, t: chi.trascritta, n: chi.n_appunti, d: chi.durata}));
    if (chi) await p.evaluate(c => A.elimina(c, false), chi.cartella);
    await p.click('#nav [data-p="reg"]'); await p.waitForTimeout(800);
    if (await p.$('#fNuova') && await p.isVisible('#fNuova')) { await p.click('#fNuova'); await p.waitForTimeout(800); }
    // appunti, lezioni
    const lz = await p.evaluate(() => A.lezioni());
    passo('Le mie lezioni', lz.lezioni.length === 2 && lz.lezioni.every(l => l.stato === 'pronta'), lz.lezioni.map(l => l.nome + ':' + l.stato).join(', '));
    // ---- le funzioni del PC sul telefono
    const leggi = f => fs.existsSync(`${dati}/${f}`) ? fs.readFileSync(`${dati}/${f}`, 'utf8') : '';
    await aspetta(x => !x.occupato, 60);
    await p.click('#nav [data-p="reg"]'); await p.waitForTimeout(1500);
    if (await p.$('#fNuova') && await p.isVisible('#fNuova')) { await p.click('#fNuova'); await p.waitForTimeout(1200); }
    // nomi unici: vuoto e già usato spengono REGISTRA, la proposta lo riaccende
    await p.fill('#nome', ''); await p.waitForTimeout(700);
    passo('nome vuoto: REGISTRA spento', await p.isDisabled('#btnRec') && /nome/.test(await p.textContent('#nomeMsg')), await p.textContent('#nomeMsg'));
    await p.fill('#nome', 'analisi 1 – derivate '); await p.waitForTimeout(700); await foto('09a-nome-usato');
    const chipN = await p.$('#nomeMsg .chip');
    passo('nome già usato: REGISTRA spento e nomi proposti', await p.isDisabled('#btnRec') && chipN, await p.textContent('#nomeMsg'));
    if (chipN) { await chipN.click(); await p.waitForTimeout(700); }
    passo('nome proposto: REGISTRA acceso', !(await p.isDisabled('#btnRec')), await p.inputValue('#nome'));
    await p.click('#tipoBox [data-k="riunione"]'); await p.waitForTimeout(400);
    passo('riunione: modelli di riunione', await p.isVisible('#modBox'));
    await p.click('#doveBox [data-m="aula"]');
    await p.fill('#nome', 'Riunione commerciale – listino 2027');
    for (const n of ['Marco Rossi', 'Giulia Bianchi']) { await p.fill('#partIn', n); await p.press('#partIn', 'Enter'); }
    await p.click('#quandoBox [data-q="durante"]'); await p.click('#btnRec');
    await p.waitForSelector('#noteCard', {state: 'visible', timeout: 30000}).catch(() => {}); await p.waitForTimeout(1500); await foto('09b-riunione');
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
    // schede pulite: sulla lezione solo «Apri appunti», «Ripassa» e «⋯ Altro»; il resto nel menu
    const card = await p.$('.lez:has-text("Riunione commerciale")');
    passo('scheda: niente Chiedi/Condividi/Trascrizione a vista, c\'è «⋯ Altro»', card && !(await card.$('[data-a="condividi"]')) && !(await card.$('[data-a="tras"]')) && await card.$('[data-a="menu"]') && await card.$('[data-a="appunti"]'));
    await foto('10b-schede');
    const bc = {click: async () => { const c = await p.$('.lez:has-text("Riunione commerciale")'); await (await c.$('[data-a="menu"]')).click(); await p.waitForSelector('.menu [data-a="condividi"]', {timeout: 5000}); await p.click('.menu [data-a="condividi"]'); }};
    passo('menu «⋯ Altro»: Chiedi, Condividi, Trascrizione', await (async () => { const c = await p.$('.lez:has-text("Riunione commerciale")'); await (await c.$('[data-a="menu"]')).click(); await p.waitForSelector('.menu', {timeout: 5000}); await foto('10c-menu'); const ok = await p.$('.menu [data-a="chiedi"]') && await p.$('.menu [data-a="condividi"]') && await p.$('.menu [data-a="tras"]'); await p.mouse.click(5, 5); await p.waitForTimeout(300); return ok; })());
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
    if (be) { await be.click(); await p.waitForSelector('.esq', {timeout: 30000}).catch(() => {}); await foto('16-esame'); passo('preparazione all\'esame: le domande del corso', await p.$('.esq')); }
    // chapters e spezzone
    await p.click('#nav [data-p="arch"]'); await p.waitForTimeout(1200);
    // calendario: avviso all'ora dell'impegno, anche con l'app chiusa
    const ora = new Date(Date.now() + 40 * 60000), hh = x => String(x).padStart(2, '0');
    const fra = new Date(ora.getTime() + 60 * 60000);
    await p.evaluate(r => A.cal_orario(r), [{giorno: (ora.getDay() + 6) % 7, dalle: `${hh(ora.getHours())}:${hh(ora.getMinutes())}`, alle: `${hh(fra.getHours())}:${hh(fra.getMinutes())}`, nome: 'Fisica 1', dove: 'aula'}]);
    let sv = '';
    for (let i = 0; i < 75 && !sv.includes('Fisica 1'); i++) { await p.waitForTimeout(1000); sv = leggi('sveglie.txt'); }
    passo('calendario: sveglia per la notifica', sv.includes('Fisica 1'), sv.slice(-200));
    await p.click('#nav [data-p="imp"]'); await p.waitForTimeout(800); await foto('16b-impostazioni-essenziali');
    passo('impostazioni: essenziali in vista, avanzate chiuse', await p.isVisible('#dvCard') && await p.isVisible('#imAvz') && !(await p.isVisible('#cgCard')));
    await p.click('#imAvz'); await p.waitForTimeout(400);
    passo('impostazioni: collegamenti, chi parla, niente «registra da solo»', await p.isVisible('#cgCard') && await p.isVisible('#swVoci') && !(await p.isVisible('#segCal [data-v="solo"]')));
    await p.evaluate(() => document.getElementById('calCard').scrollIntoView()); await foto('17-calendario-imp');
    // «Dove trascrivo: sul server» (RunPod finto)
    await p.evaluate(() => document.getElementById('dvCard').scrollIntoView()); await foto('17b-dove-telefono');
    passo('«Dove trascrivo»: sul telefono si vedono velocità e limiti, niente server', await p.isVisible('#dvBox [data-d="server"]') && await p.isVisible('#dvPc') && await p.isVisible('#segQuando') && !(await p.isVisible('.dvcosa')) && !(await p.isVisible('#srvCod')));
    await p.click('#dvBox [data-d="server"]'); await p.waitForTimeout(300);
    passo('«Sul server»: spiegazione e limiti, sparisce il riquadro del telefono', await p.isVisible('.dvcosa') && !(await p.isVisible('#dvPc')));
    await p.fill('#srvCod', 'prova123'); await p.fill('#srvKey', 'rpa_prova_telefono_1'); await p.click('#srvVai');
    await p.waitForFunction(() => /✓|⚠/.test(document.getElementById('srvEsito').textContent), null, {timeout: 40000}).catch(() => {});
    await p.evaluate(() => document.getElementById('dvCard').scrollIntoView()); await foto('18-server');
    passo('«Sul server»: collegato dal telefono', (await p.textContent('#srvEsito')).includes('✓'), await p.textContent('#srvEsito'));
    // inviti: chi ha le chiavi prepara l'invito; un telefono «nuovo» lo incolla e ha tutto pronto
    await p.click('#nav [data-p="imp"]'); await p.waitForTimeout(600);
    passo('inviti: riquadro per chi ha le chiavi', await p.isVisible('#invCard') && !(await p.isVisible('#hoCard')));
    await p.fill('#invPer', 'Sara'); await p.click('#invVai'); await p.waitForSelector('#invRis:not(.hidden)', {timeout: 5000}).catch(() => {});
    await p.evaluate(() => document.getElementById('invCard').scrollIntoView()); await foto('18c-invito');
    const msgInv = await p.inputValue('#invMsg');
    passo('inviti: messaggio pronto senza chiavi in chiaro', /VMIA-INVITO-1:/.test(msgInv) && !msgInv.includes('sk-ant') && !msgInv.includes('rpa_'), msgInv.slice(0, 90));
    await p.evaluate(async () => { await A.togli_chiave(); await A.server_scollega(); await rileggi(); });
    await p.waitForTimeout(400);
    passo('inviti: senza chiavi compare «Ho un invito»', await p.isVisible('#hoCard') && !(await p.isVisible('#invCard')));
    await p.fill('#hoTxt', msgInv); await p.click('#hoVai'); await p.waitForTimeout(1200);
    await p.evaluate(() => document.getElementById('hoCard').scrollIntoView()); await foto('18d-ho-invito');
    const rr = await p.evaluate(() => A.riepilogo());
    passo('inviti: attivato (Claude e server), e non può invitare altri', rr.chiave && rr.server_endpoint === 'prova123' && rr.da_invito && !rr.puo_invitare && !(await p.isVisible('#invCard')),
          await p.textContent('#hoEsito'));
    await p.evaluate(() => document.getElementById('dvCard').scrollIntoView()); await p.waitForTimeout(300);
    if (!(await p.isVisible('#srvVia'))) { await p.evaluate(() => { document.getElementById('dvAltre').open = true; }); await p.waitForTimeout(200); }
    await p.click('#srvVia'); await p.waitForSelector('.velo .b-rec', {timeout: 5000}).catch(() => {}); await foto('18b-scollega');
    passo('«Scollega» chiede conferma', !!(await p.$('.velo .b-rec')));
    if (await p.$('.velo .b-rec')) await p.click('.velo .b-rec'); else await p.evaluate(() => A.server_scollega());
    await p.waitForTimeout(600);
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
