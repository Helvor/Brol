// Test du site dans un vrai navigateur (Playwright) : node tests/smoke.mjs
// Démarre le serveur local, joue une partie rapide sur ordinateur puis sur mobile,
// et échoue à la moindre erreur JavaScript.
// Les requêtes externes (images Commons, polices) sont bloquées : le test ne dépend pas du réseau.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/';
const OUT = fileURLToPath(new globalThis.URL('../test-results/', import.meta.url));

const server = spawn(process.execPath, [fileURLToPath(new globalThis.URL('../tools/serve.mjs', import.meta.url))], { stdio: 'ignore' });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failed = false;

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(URL)).ok) return; } catch (_) { /* pas encore prêt */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('le serveur local ne répond pas');
}

function check(cond, msg) { if (!cond) throw new Error(msg); }

async function run(name, options) {
  const page = await browser.newPage(options);
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) jsErrors.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.route(url => !url.href.startsWith(URL), r => r.abort());

  const step = async (label, fn) => {
    try {
      await fn();
      check(!jsErrors.length, 'erreur JavaScript : ' + jsErrors.join(' | '));
      console.log(`  ✓ ${label}`);
    } catch (e) {
      mkdirSync(OUT, { recursive: true });
      await page.screenshot({ path: OUT + `${name}.png` }).catch(() => {});
      const cause = jsErrors.length ? 'erreur JavaScript : ' + jsErrors.join(' | ') : e.message.split('\n')[0];
      throw new Error(`[${name}] ${label} : ${cause}`);
    }
  };
  const click = sel => page.locator(sel).first().click({ force: true }); // le paquet flotte en continu
  const view = async v => { await page.evaluate(v => document.querySelector(`[data-view="${v}"].tab, [data-view="${v}"]`).click(), v); await page.waitForTimeout(200); };

  console.log(name);
  await step('chargement', async () => {
    await page.goto(URL);
    await page.waitForSelector('.pack-card');
    const n = await page.evaluate(() => window.RDL?.CARDS.length);
    check(n > 1000, `seulement ${n} cartes chargées`);
    check(await page.locator('.pack-card').count() >= 7, 'paquets manquants');
  });

  await step('ouverture d’un paquet', async () => {
    const before = await page.evaluate(() => window.RDL.state.stats.packs);
    await click('.pack-visual');
    await page.waitForSelector('#stage:not([hidden])');
    await click('#stage-pack');
    await page.waitForSelector('#reveal .slot');
    check(await page.locator('#reveal .slot').count() === 5, 'le paquet ne contient pas 5 cartes');
    await click('#flip-all');
    await page.waitForSelector('#to-album:not([hidden])', { timeout: 15000 });
    check(await page.locator('#reveal .slot.is-flipped').count() === 5, 'toutes les cartes ne sont pas retournées');
    check(await page.evaluate(() => window.RDL.state.stats.packs) === before + 1, 'paquet non compté');
  });

  await step('album et fiche détail', async () => {
    await click('#to-album');
    await page.waitForSelector('#view-binder.is-active');
    await page.evaluate(() => { const c = document.querySelector('#f-owned'); c.checked = true; c.dispatchEvent(new Event('change')); });
    check(await page.locator('#grid .card').count() >= 1, 'aucune carte possédée dans l’album');
    await click('#grid .card');
    await page.waitForSelector('#detail[open]');
    check((await page.textContent('#detail-body h2')).trim().length > 0, 'fiche détail vide');
    await page.keyboard.press('Escape');
  });

  await step('séries et succès', async () => {
    await view('series');
    check(await page.locator('.series').count() >= 5, 'séries manquantes');
    await view('ach');
    check(await page.locator('.ach').count() >= 50, 'succès manquants');
  });

  const game = async (id, play) => {
    await view('games');
    await click(`.game-tile[data-game="${id}"]`);
    await page.waitForSelector('.game-head');
    await play();
    await page.waitForTimeout(300);
  };
  await step('mini-jeu Formation de gouvernement', () => game('formation', () => click('.hand .mini')));
  await step('mini-jeu Belgle', () => game('belgle', async () => {
    if (await page.locator('#b-input').count()) {
      await page.fill('#b-input', await page.evaluate(() => window.RDL.CARDS[0].name));
      await page.press('#b-input', 'Enter');
    }
  }));
  await step('mini-jeu Chronologie', () => game('chrono', () => click('.gap')));
  await step('mini-jeu Tour de Belgique', () => game('tour', () => click('.tour-map')));
  await step('mini-jeu Plus ou moins', () => game('pom', () => click('#p-more')));

  await step('néerlandais et thème', async () => {
    await view('shop');
    await click('#lang-btn');
    check((await page.textContent('.tab[data-view="shop"]')).trim() === 'Pakjes', 'interface pas traduite en NL');
    await click('#lang-btn');
    await click('#theme-btn');
    check(await page.evaluate(() => document.documentElement.dataset.theme) === 'light', 'thème non appliqué');
  });
  await page.close();
}

try {
  await waitForServer();
  await run('ordinateur', { viewport: { width: 1366, height: 860 } });
  await run('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  console.log('✓ site : tout fonctionne');
} catch (e) {
  failed = true;
  console.error('✗ ' + e.message + '\n  (capture d’écran dans test-results/)');
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
