// Planche de contrôle du cadrage : toutes les cartes d'une catégorie rendues par le vrai jeu (cardHTML, cadrage
// data/focus.js, PAYSAGE_POS…), en PNG à relire à l'œil avant de livrer un paquet. Signale aussi les photos qui
// ne chargent pas et celles trop petites pour la carte (floues à l'écran).
// Usage : node tools/planche.mjs <catégorie> [dossier de sortie = .] [version = normal]
// Exemple : node tools/planche.mjs paysage /tmp holo   → /tmp/planche-paysage-1.png, -2.png… (18 cartes par planche)
// Cadrage à corriger : MANUAL dans tools/build-focus.py (photos) ou PAYSAGE_POS dans le générateur (Paysages).
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const [cat, out = '.', finish = 'normal'] = process.argv.slice(2);
if (!cat) { console.error('Usage : node tools/planche.mjs <catégorie> [dossier] [version]'); process.exit(1); }
const URL = "http://localhost:5173/", PER = 18;
const server = spawn(process.execPath, [fileURLToPath(new globalThis.URL('serve.mjs', import.meta.url))], { stdio: 'ignore' });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) break; } catch (_) { /* démarrage */ } await new Promise(r => setTimeout(r, 100)); }
const page = await browser.newPage({ viewport: { width: 1500, height: 3200 } });
await page.goto(URL);
await page.waitForFunction(() => window.RDL);
const ids = await page.evaluate(cat => window.RDL.CARDS.filter(c => c.cat === cat).map(c => c.id), cat);
if (!ids.length) { console.error(`Aucune carte dans la catégorie « ${cat} »`); process.exit(1); }
const problems = [];
for (let n = 0; n * PER < ids.length; n++) {
  await page.evaluate(({ ids, finish }) => {
    document.getElementById('planche')?.remove();
    const st = document.getElementById('planche-css') || Object.assign(document.createElement('style'), { id: 'planche-css' });
    st.textContent = `#planche{position:fixed;inset:0;z-index:9999;background:#e9e6df;padding:14px;overflow:auto}
      #planche .grid{grid-template-columns:repeat(6,1fr);gap:14px 12px} #planche .lbl{font:600 11px sans-serif;color:#555;margin-top:4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}`;
    document.head.append(st);
    const R = window.RDL, d = document.createElement('div'); d.id = 'planche';
    d.innerHTML = `<div class="grid">${ids.map(id => { const c = R.BY_ID.get(id);
      return `<div class="cell${c.landscape ? ' is-wide' : ''}">${R.cardHTML(c, { finish })}<div class="lbl">${c.id} · ${c.name}</div></div>`; }).join('')}</div>`;
    document.body.append(d);
    d.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
  }, { ids: ids.slice(n * PER, (n + 1) * PER), finish });
  // Wikimedia limite les rafales : on recharge les images en échec, en les espaçant
  for (let k = 0; k < 12; k++) {
    await page.waitForTimeout(4000);
    const bad = await page.evaluate(() => { const b = [...document.querySelectorAll('#planche img')].filter(i => i.complete && !i.naturalWidth);
      b.forEach((i, j) => setTimeout(() => { i.src = i.src.split('#')[0] + '#' + Math.random(); }, j * 400)); return b.length; });
    if (!bad) break;
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  problems.push(...await page.evaluate(() => [...document.querySelectorAll('#planche .cell')].flatMap(cell => {
    const img = cell.querySelector('.card img'), id = cell.querySelector('.card')?.dataset.id;
    if (!img) return [];
    if (!img.naturalWidth) return [`${id} : photo non chargée`];
    const w = img.getBoundingClientRect().width * 2; // écran haute définition
    return img.naturalWidth < w * 0.75 ? [`${id} : photo petite (${img.naturalWidth} px pour ${Math.round(w)} px affichés)`] : [];
  })));
  const file = `${out}/planche-${cat}-${n + 1}.png`;
  await page.locator('#planche .grid').screenshot({ path: file });
  console.log(file);
}
console.log(problems.length ? 'À vérifier :\n  ' + problems.join('\n  ') : 'Toutes les photos sont chargées et assez grandes.');
await browser.close(); server.kill();
