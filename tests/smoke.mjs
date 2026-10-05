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

  await step('lot de 10 paquets', async () => {
    await page.click('#stage-close', { force: true }).catch(() => {});
    await page.evaluate(() => { window.RDL.state.coins = 2000; window.RDL.save(); });
    await view('shop');
    const before = await page.evaluate(() => ({ packs: window.RDL.state.stats.packs, price: window.RDL.bulkPrice(window.RDL.PACKS[0]) }));
    check(before.price < 10 * (await page.evaluate(() => window.RDL.PACKS[0].price)), 'le lot de 10 n’est pas moins cher');
    await click('.buy10');
    await page.waitForSelector('#stage:not([hidden])');
    await click('#stage-pack');
    await page.waitForSelector('#reveal.is-bulk .slot');
    check(await page.locator('#reveal .slot').count() === 50, 'le lot ne contient pas 50 cartes');
    await click('#flip-all');
    await page.waitForSelector('#to-album:not([hidden])', { timeout: 30000 });
    check(await page.locator('#reveal .slot.is-flipped').count() === 50, 'toutes les cartes du lot ne sont pas retournées');
    check(await page.evaluate(() => window.RDL.state.stats.packs) === before.packs + 10, 'lot non compté comme 10 paquets');
  });

  await step('paquet Prestige (légendaire ou mieux garantie)', async () => {
    const r = await page.evaluate(() => {
      const R = window.RDL, prestige = R.PACKS.find(p => p.special);
      R.state.coins = prestige.price * 30; R.state.free = 3;
      let ok = true;
      for (let i = 0; i < 30; i++) {
        const res = R.buyPacks(prestige, 1);
        ok = ok && res && res.packs[0].revealed.some(d => R.rarityRank(d.card.rarity) >= R.rarityRank('legendaire'));
      }
      return { ok, free: R.state.free };
    });
    check(r.ok, 'un paquet Prestige sans légendaire ou mieux');
    check(r.free === 3, 'le paquet Prestige a utilisé un paquet gratuit');
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

  await step('onglet Échanges', async () => {
    await view('trade');
    check(await page.locator('#t-new').count() === 1, 'onglet Échanges vide');
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

// Échange complet entre deux joueurs (deux navigateurs séparés, donc deux sauvegardes)
async function trade() {
  console.log('échange');
  const player = async (name, owned) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(`${name} : ${e.message}`));
    page.on('dialog', d => d.accept());
    await page.route(url => !url.href.startsWith(URL), r => r.abort());
    await page.goto(URL);
    await page.evaluate(o => { Object.assign(window.RDL.state.owned, o); window.RDL.save(); }, owned);
    await page.reload();
    return { page, errors, count: (id, fin = 'normal') => page.evaluate(([id, fin]) => window.RDL.countOf(id, fin), [id, fin]) };
  };
  const step = async (label, fn) => { await fn(); console.log(`  ✓ ${label}`); };
  const ids = await (async () => {
    const page = await browser.newPage(); await page.goto(URL);
    const r = await page.evaluate(() => { const C = window.RDL.CARDS; return [C.find(c => c.rarity === 'commune').id, C.find(c => c.rarity === 'mythique').id, C.find(c => c.cat === 'biere').id]; });
    await page.close(); return r;
  })();
  const [give, giveHolo, want] = ids;
  const A = await player('A', { [give]: 3, [giveHolo + '|holo']: 2, [want]: 1 });
  const B = await player('B', { [want]: 2 });
  let offer, reply;
  try {
    await step('A propose un échange', async () => {
      await A.page.click('.tab[data-view="trade"]');
      await A.page.click('#t-new');
      await A.page.click(`.t-pick[data-id="${give}"][data-fin="normal"]`);
      await A.page.click(`.t-pick[data-id="${giveHolo}"][data-fin="holo"]`);
      await A.page.evaluate(() => { const c = document.querySelector('#t-missing'); c.checked = false; c.dispatchEvent(new Event('change')); });
      await A.page.fill('#t-search', await A.page.evaluate(id => window.RDL.BY_ID.get(id).name, want));
      await A.page.click(`.t-finbtn[data-id="${want}"][data-fin="normal"]`);
      await A.page.click('#t-create');
      await A.page.waitForSelector('#t-qr svg');
      offer = await A.page.inputValue('#trade-link');
      check(await A.count(give) === 2 && await A.count(giveHolo, 'holo') === 1, 'cartes non mises de côté');
    });
    await step('B accepte', async () => {
      await B.page.goto(offer);
      await B.page.click('#t-accept');
      await B.page.waitForSelector('#t-qr svg');
      reply = await B.page.inputValue('#trade-link');
      check(await B.count(want) === 1 && await B.count(give) === 1 && await B.count(giveHolo, 'holo') === 1, 'cartes de B incorrectes');
    });
    await step('A termine l’échange, une seule fois', async () => {
      await A.page.goto(reply);
      await A.page.waitForSelector('.game-result.win');
      check(await A.count(want) === 2, 'A n’a pas reçu la carte');
      await A.page.goto(URL); await A.page.goto(reply); await A.page.waitForSelector('.game-result');
      check(await A.count(want) === 2, 'la réponse a servi deux fois');
      await B.page.goto(URL); await B.page.goto(offer); await B.page.waitForSelector('#t-qr svg');
      check(await B.count(want) === 1, 'l’offre a servi deux fois');
    });
    await step('annulation et doublons manquants', async () => {
      await A.page.goto(URL);
      await A.page.click('.tab[data-view="trade"]');
      await A.page.click('#t-new');
      await A.page.click(`.t-pick[data-id="${give}"][data-fin="normal"]`);
      await A.page.evaluate(() => { const c = document.querySelector('#t-missing'); c.checked = false; c.dispatchEvent(new Event('change')); });
      await A.page.fill('#t-search', await A.page.evaluate(id => window.RDL.BY_ID.get(id).name, giveHolo));
      await A.page.click(`.t-finbtn[data-id="${giveHolo}"][data-fin="or"]`);
      await A.page.click('#t-create');
      await A.page.waitForSelector('#trade-link');
      const second = await A.page.inputValue('#trade-link');
      await B.page.goto(URL); await B.page.goto(second); await B.page.waitForSelector('#t-accept');
      check(await B.page.isDisabled('#t-accept'), 'acceptation possible sans le doublon demandé');
      await A.page.click('#t-done');
      await A.page.click('.t-cancel');
      check(await A.count(give) === 2 && await A.page.locator('.t-offer').count() === 0, 'annulation incorrecte');
    });
    const errors = [...A.errors, ...B.errors];
    check(!errors.length, 'erreur JavaScript : ' + errors.join(' | '));
  } catch (e) {
    mkdirSync(OUT, { recursive: true });
    await A.page.screenshot({ path: OUT + 'echange-A.png' }).catch(() => {});
    await B.page.screenshot({ path: OUT + 'echange-B.png' }).catch(() => {});
    throw new Error(`[échange] ${e.message.split('\n')[0]}`);
  }
}

try {
  await waitForServer();
  await run('ordinateur', { viewport: { width: 1366, height: 860 } });
  await run('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await trade();
  console.log('✓ site : tout fonctionne');
} catch (e) {
  failed = true;
  console.error('✗ ' + e.message + '\n  (capture d’écran dans test-results/)');
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
