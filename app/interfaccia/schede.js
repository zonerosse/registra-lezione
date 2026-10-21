/* Impaginazione «a schede» (scelta B del 21/10/2026). Per ora solo in Scripta Manent; Verba Manent la avrà
   quando gli si toglieranno le parti DSA.
   - Registra in una schermata sola: «Che cosa» e «Dove» affiancati, Materia e Nome sulla stessa riga, il tasto
     REGISTRA subito sotto, Materiali del prof e Importa in un riquadro chiuso «Altro».
   - «I miei strumenti», pagina della lezione e Studia: un gruppo alla volta, con le schede in alto.
   Lavora sulla pagina già disegnata (stessi elementi, stessi stili): non cambia cosa fa ogni tasto. */
'use strict';
(function () {
  const q = (s, r) => (r || document).querySelector(s);
  const attiva = () => document.documentElement.classList.contains('scripta');
  const SCELTA = {};          // scheda scelta per pagina, così tornando si ritrova

  function registra() {
    const pg = q('#v-pronto');
    if (!pg || pg.dataset.sk) return;
    const tipo = q('#tipoBox', pg), dove = q('#doveBox', pg), nome = q('#nome', pg), mat = q('#materia', pg);
    if (!tipo || !dove || !nome || !mat) return;
    pg.dataset.sk = 1;
    const ct = tipo.closest('.card'), cd = dove.closest('.card');
    const riga = document.createElement('div'); riga.className = 'sk-due';
    ct.parentNode.insertBefore(riga, ct); riga.append(ct, cd);
    const box = document.createElement('div'); box.className = 'sk-mn';
    const c1 = document.createElement('div'), c2 = document.createElement('div');
    c1.innerHTML = `<div class="lbl">${esc(t('mt.h'))}</div>`; c2.innerHTML = `<div class="lbl">${esc(t('pr.nome'))}</div>`;
    c1.append(mat); const rec = q('#recenti', pg); if (rec) c1.append(rec);
    c2.append(nome); const msg = q('#nomeMsg', pg); if (msg) c2.append(msg);
    box.append(c1, c2);
    const mb = q('#matBox', pg); mb.parentNode.insertBefore(box, mb); mb.classList.add('sk-via');
    const nl = q('#nomeLbl', pg); if (nl) nl.classList.add('sk-via');
    const tasto = q('.recwrap', pg); nome.closest('.card').after(tasto);
    const det = document.createElement('details'); det.className = 'cap sk-altro';
    det.innerHTML = `<summary><span class="ico i-teal"><svg><use href="#g-piu"/></svg></span><span>${esc(LINGUA === 'en' ? 'More: lecturer\'s materials, import a video or a transcript' : 'Altro: materiali del prof, importa un video o una trascrizione')}</span><span class="fr">›</span></summary><div class="sk-in"></div>`;
    tasto.after(det);
    ['#mpCard', '#btnImporta', '#btnImportaTesto'].forEach(s => { const e = q(s, pg); if (e) q('.sk-in', det).append(e); });
  }

  // gruppi -> schede. pezzi: gli elementi da mostrare uno alla volta; nome(e): il titolo della scheda
  function schede(chiave, contenitore, pezzi, nome) {
    if (!contenitore || pezzi.length < 2 || pezzi[0].dataset.sk) return;
    pezzi.forEach(g => { g.dataset.sk = 1; });
    const bar = document.createElement('div'); bar.className = 'seg sk-tabs';
    pezzi[0].parentNode.insertBefore(bar, pezzi[0]);
    const n = Math.min(SCELTA[chiave] || 0, pezzi.length - 1);
    const mostra = i => {
      SCELTA[chiave] = i;
      pezzi.forEach((g, k) => g.classList.toggle('sk-via', k !== i));
      [...bar.children].forEach((s, k) => s.classList.toggle('on', k === i));
    };
    pezzi.forEach((g, i) => { const s = document.createElement('span'); s.textContent = nome(g); s.onclick = () => mostra(i); bar.append(s); });
    mostra(n);
  }
  const testoLbl = g => ((g.querySelector('.lbl') || {}).textContent || '').replace(/^[⭐\s·]+/, '').trim();

  function giro() {
    if (!attiva()) return;
    registra();
    // «I miei strumenti»: i momenti (In aula, Dopo la lezione, A casa, Per la verifica…)
    const sd = q('#sdBox');
    if (sd) schede('sd', sd, [...sd.querySelectorAll(':scope > .sdmom')], g => {
      const h = g.querySelector('h3'); if (!h) return '';
      const c = h.cloneNode(true); c.querySelectorAll('.n, small').forEach(x => x.remove()); return c.textContent.trim();
    });
    // pagina della lezione: «Per te» e poi Leggi, Capisci, Ripassa, Condividi
    const lz = q('#lzBox');
    if (lz) schede('lz', lz, [...lz.querySelectorAll('.grp')].filter(g => g.querySelector('.tile')), testoLbl);
    // Studia
    const st = q('#stBox2');
    if (st) schede('st', st, [...st.querySelectorAll('.grp')].filter(g => g.querySelector('.tile')), testoLbl);
  }
  // le pagine si ridisegnano spesso: guardo quando cambiano
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(() => { clearTimeout(giro.t); giro.t = setTimeout(giro, 40); }).observe(document.body, {childList: true, subtree: true});
  });
})();
