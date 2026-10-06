// Simulation de l'économie avec le vrai code du jeu, dans un navigateur sans affichage.
// Usage : node tools/simulate.mjs [minutes=60] [parties=5]
// Deux joueurs types :
//   - « normal » : ouvre des paquets Belgique un par un et vend ses doublons de temps en temps ;
//   - « farmeur » : achète toujours le paquet qui rapporte le plus à la revente, par lots de 10 dès qu'il peut,
//     et vend tout après chaque ouverture.
// Les deux récupèrent les succès, les séries complètes et les paquets gratuits. Les mini-jeux ne sont pas comptés.
// Temps estimé par action : 12 s pour un paquet, 35 s pour un lot de 10.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const MINUTES = +process.argv[2] || 60;
const RUNS = +process.argv[3] || 5;
const URL = 'http://localhost:5173/';
const server = spawn(process.execPath, [fileURLToPath(new globalThis.URL('serve.mjs', import.meta.url))], { stdio: 'ignore' });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) break; } catch (_) { /* démarrage */ } await new Promise(r => setTimeout(r, 100)); }

async function simulate(strategy) {
  const page = await browser.newPage();
  await page.route(url => !url.href.startsWith(URL), r => r.abort());
  await page.goto(URL);
  const out = await page.evaluate(({ strategy, MINUTES }) => {
    localStorage.clear();
    const R = window.RDL;
    // Repartir d'une partie neuve sans recharger : on vide la collection en place
    const s = R.state;
    Object.assign(s, JSON.parse(JSON.stringify({ coins: 1000, owned: {}, packs: 0, free: 1, claimed: {}, pity: 0, ach: {}, trade: { pending: {}, done: {} } })));
    s.freeAt = Date.now();
    for (const k of Object.keys(s.stats)) s.stats[k] = typeof s.stats[k] === 'object' ? {} : 0;
    const marks = [5, 10, 20, 30, 60, 120].filter(m => m <= MINUTES);
    const log = [];
    let t = 0, spent = 0, sold = 0;
    const income = { achievements: 0, series: 0 };
    const sizeOf = p => R.CARDS.filter(c => !p.cats || p.cats.includes(c.cat)).length;
    const smallest = [...R.PACKS].sort((a, b) => sizeOf(a) - sizeOf(b));
    const belgique = R.PACKS.find(p => p.id === 'belgique');
    const advance = sec => { t += sec; s.freeAt -= sec * 1000; };
    const collect = () => {
      const before = s.coins;
      R.checkAchievements();
      income.achievements += s.coins - before;
      for (const se of R.SERIES) income.series += R.claimSeries(se.id);
    };
    let packs = 0;
    const mark = () => {
      while (marks.length && t >= marks[0] * 60) {
        const owned = R.CARDS.filter(c => R.totalOf(c.id)).length;
        log.push({ min: marks.shift(), coins: s.coins, packs, owned });
      }
    };
    while (marks.length) {
      mark();
      if (!marks.length) break;
      let pack = belgique, n = 1;
      if (strategy === 'farmeur') {
        pack = smallest[0];
        if (s.free === 0 && s.coins >= R.bulkPrice(pack)) n = R.bulkOf(pack);
      }
      const res = R.buyPacks(pack, n);
      if (!res) { advance(30); collect(); if (strategy === 'normal' || s.free) continue; const v = R.sellDuplicates(); sold += v.gain; continue; }
      spent += res.cost; packs += n;
      advance(n === 1 ? 12 : 35);
      if (strategy === 'farmeur' || packs % 10 === 0) sold += R.sellDuplicates().gain;
      collect();
    }
    return { log, spent, sold, income };
  }, { strategy, MINUTES });
  await page.close();
  return out;
}

const avg = xs => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
for (const strategy of ['normal', 'farmeur']) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await simulate(strategy));
  console.log(`\nJoueur ${strategy} (${RUNS} parties, moyenne)`);
  console.table(runs[0].log.map((row, i) => ({
    minutes: row.min,
    pièces: avg(runs.map(r => r.log[i].coins)),
    paquets: avg(runs.map(r => r.log[i].packs)),
    cartes: avg(runs.map(r => r.log[i].owned)),
  })));
  console.log(`  dépensé ${avg(runs.map(r => r.spent))} · revente ${avg(runs.map(r => r.sold))} · succès ${avg(runs.map(r => r.income.achievements))} · séries ${avg(runs.map(r => r.income.series))}`);
}
await browser.close();
server.kill();
