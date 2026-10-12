// Équilibrage de Formation de gouvernement : joue des parties avec le vrai code du jeu, dans un navigateur sans
// affichage, et mesure le taux de victoire et la durée des gouvernements formés.
// Usage : node tools/sim-formation.mjs [parties=300]
// Deux joueurs :
//   - « débutant » : aucune carte politique (uniquement les cartes invitées) ;
//   - « collectionneur » : toutes les cartes politiques.
// Les deux jouent raisonnablement : jamais le PTB ni DéFI (qui ferment la porte à d'autres partis) ni le Vlaams
// Belang (cordon), et d'abord la carte qui rapproche le plus un grand parti de son seuil ; nouvelle main quand
// aucune carte n'est utile.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RUNS = +process.argv[2] || 300;
const URL = 'http://localhost:5173/';
const server = spawn(process.execPath, [fileURLToPath(new globalThis.URL('serve.mjs', import.meta.url))], { stdio: 'ignore' });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) break; } catch (_) { /* démarrage */ } await new Promise(r => setTimeout(r, 100)); }

async function simulate(label, ownAll) {
  const page = await browser.newPage();
  await page.route(url => !url.href.startsWith(URL), r => r.abort());
  await page.goto(URL);
  const out = await page.evaluate(({ RUNS, ownAll }) => {
    localStorage.clear();
    const R = window.RDL;
    R.state.owned = {};
    if (ownAll) for (const c of R.CARDS) if (c.cat === 'politique' || c.cat === 'monarchie') R.state.owned[c.id] = 1;
    const AVOID = /^(PTB-PVDA|DéFI|Vlaams Belang)$/;
    const res = { win: 0, lose: 0, days: [], reshuffles: 0 };
    for (let g = 0; g < RUNS; g++) {
      document.querySelector('.tab[data-view=games]').click();
      document.querySelector('.game-tile[data-game=formation]').click();
      for (let k = 0; k < 500 && !document.querySelector('.game-result'); k++) {
        // État des partis lu sur l'écran : « 3/7 pts » pour un parti encore ouvert
        const parties = Object.fromEntries([...document.querySelectorAll('.party-tile')].map(el => {
          const m = el.querySelector('small').textContent.match(/(\d+)\/(\d+)/);
          return [el.querySelector('.pt-head b').textContent, { open: el.classList.contains('is-open') && !el.classList.contains('is-cordon'),
            seats: +el.querySelector('.pt-head span').textContent, left: m ? +m[2] - +m[1] : 0 }];
        }));
        let best = null, bestScore = 0;
        for (const b of document.querySelectorAll('.hand .mini')) {
          const party = b.querySelector('.mini-party').textContent, p = parties[party], inf = +b.querySelector('.mini-foot').textContent.match(/\+(\d+)/)[1];
          if (!p?.open || AVOID.test(party)) continue;
          const score = p.seats * Math.min(inf, p.left) / Math.max(1, p.left);
          if (score > bestScore) { best = b; bestScore = score; }
        }
        if (best) best.click(); else { res.reshuffles++; document.querySelector('#f-reshuffle').click(); }
      }
      const r = document.querySelector('.game-result');
      if (r?.classList.contains('win')) { res.win++; res.days.push(+r.textContent.match(/(\d+)/)[1]); } else res.lose++;
    }
    const d = res.days.sort((a, b) => a - b);
    return { victoires: `${Math.round(res.win / RUNS * 100)} %`, joursMedian: d[Math.floor(d.length / 2)] ?? '—',
      sous541: `${Math.round(d.filter(x => x < 541).length / RUNS * 100)} %`, sous150: `${Math.round(d.filter(x => x < 150).length / RUNS * 100)} %`,
      nouvellesMainsParPartie: +(res.reshuffles / RUNS).toFixed(1) };
  }, { RUNS, ownAll });
  console.log(label.padEnd(15), JSON.stringify(out));
  await page.close();
}

try {
  await simulate('débutant', false);
  await simulate('collectionneur', true);
} finally {
  await browser.close();
  server.kill();
}
