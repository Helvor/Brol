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
    await page.$eval('.buy10', el => el.click()); // le bouton peut se trouver sous la barre fixe du bas sur mobile
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
      const R = window.RDL, prestige = R.PACKS.find(p => p.id === 'prestige');
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
  await step('mini-jeu Qui suis-je', () => game('qui', async () => {
    await click('#q-more'); await click('.qui-choice:not(:disabled)');
    await page.waitForSelector('.qui-clue');
  }));
  await step('mini-jeu Le Parti', () => game('parti', async () => {
    await click('.parti-choice');
    await page.waitForSelector('.parti-choice.is-ok');
  }));

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

// Carte du jour, fusion, paquets d'événement (date simulée) et export/import de la sauvegarde
async function features() {
  console.log('fonctions');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true, serviceWorkers: 'block' }); // requêtes simulées visibles
  await ctx.addInitScript(() => { window.BROL_NOW = '2026-12-01T12:00:00'; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(url => !url.href.startsWith(URL), r => r.abort());
  const step = async (label, fn) => {
    try { await fn(); check(!errors.length, 'erreur JavaScript : ' + errors.join(' | ')); console.log(`  ✓ ${label}`); }
    catch (e) {
      mkdirSync(OUT, { recursive: true });
      await page.screenshot({ path: OUT + 'fonctions.png' }).catch(() => {});
      throw new Error(`[fonctions] ${label} : ${e.message.split('\n')[0]}`);
    }
  };
  try {
    await page.goto(URL);
    await step('carte du jour, une seule fois par jour', async () => {
      await page.click('#daily-open');
      await page.waitForSelector('#daily[open] .daily-slot');
      await page.click('.daily-slot');
      await page.click('#daily-close');
      check(await page.locator('#daily-open').count() === 0, 'la carte du jour est encore disponible');
      check(await page.evaluate(() => window.RDL.claimDaily()) === null, 'deuxième carte du jour le même jour');
      const r = await page.evaluate(() => { const s = window.RDL.state; s.daily = { last: '2026-11-30', streak: 6 }; return window.RDL.claimDaily(); });
      check(r.streak === 7 && ['legendaire', 'mythique'].includes(r.card.rarity), 'pas de légendaire au 7ᵉ jour');
    });
    await step('paquet d’événement en vente à sa date', async () => {
      check(await page.locator('.pack-card[data-pack="saint-nicolas"] .event-ribbon').count() === 1, 'paquet Saint-Nicolas absent le 1ᵉʳ décembre');
      const r = await page.evaluate(() => { const R = window.RDL; R.state.coins = 1000; const sn = R.activeEvents()[0]; const free = R.state.free; const res = R.buyPacks(sn, 1); return { cats: res.packs[0].revealed.map(d => d.card.pack || d.card.cat), free: R.state.free === free }; });
      check(r.cats.every(c => ['gastronomie', 'biere', 'folklore', 'saint-nicolas'].includes(c)), 'cartes hors thème dans le paquet Saint-Nicolas');
      check(r.free, 'le paquet d’événement a utilisé un paquet gratuit');
    });
    await step('éditions limitées et versions d’événement', async () => {
      const r = await page.evaluate(() => {
        const R = window.RDL, sn = R.packById('saint-nicolas'), be = R.packById('belgique');
        const tally = (p, n) => { const o = { ed: {}, fin: {} }; for (let i = 0; i < n; i++) for (const d of R.drawPack(p)) {
          if (d.card.cat === 'edition') o.ed[d.card.pack] = (o.ed[d.card.pack] || 0) + 1;
          o.fin[d.finish] = (o.fin[d.finish] || 0) + 1; } return o; };
        return { sn: tally(sn, 3000), be: tally(be, 3000), excl: R.exclOf('saint-nicolas').map(c => c.id) };
      });
      check(Object.keys(r.sn.ed).join() === 'saint-nicolas' && r.sn.ed['saint-nicolas'] > 200, 'éditions limitées du paquet Saint-Nicolas : ' + JSON.stringify(r.sn.ed));
      check(r.sn.fin.rouge > 100 && !['noir', 'confetti', 'pave', 'iris', 'lion', 'tricolore', 'coq'].some(f => r.sn.fin[f]), 'versions du paquet Saint-Nicolas : ' + JSON.stringify(r.sn.fin));
      check(!Object.keys(r.be.ed).length, 'édition limitée dans un paquet ordinaire');
      check(['holo', 'plein', 'or'].every(f => r.be.fin[f]) && Object.keys(r.be.fin).length === 4, 'versions d’un paquet ordinaire : ' + JSON.stringify(r.be.fin));
      // Affichage : une édition limitée en version Rouge, dans l'album et sa fiche
      await page.evaluate(id => { window.RDL.state.owned[id + '|rouge'] = 1; window.RDL.save(); }, r.excl[0]);
      await page.click('.tab[data-view="binder"]');
      await page.click('#cat-chips [data-cat="edition"]');
      await page.waitForSelector(`#grid .card.cat-edition.fin-rouge[data-id="${r.excl[0]}"]`);
      check(await page.locator('#grid .empty-slot .ed-where').count() > 0, 'cases vides des éditions sans leur paquet');
      await page.click(`#grid .card[data-id="${r.excl[0]}"]`);
      await page.waitForSelector('#detail[open] .card.fin-rouge');
      await page.click('#detail-close');
      await page.click('.tab[data-view="shop"]');
      check(await page.locator('.pack-card[data-pack="saint-nicolas"] .ex-thumb').count() === 3, 'cartes exclusives absentes de la boutique');
    });
    await step('fiche d’un savant : connu pour', async () => {
      const id = await page.evaluate(() => { const c = window.RDL.CARDS.find(c => c.name === 'Adolphe Sax'); window.RDL.state.owned[c.id] = 1; window.RDL.save(); return c.id; });
      await page.evaluate(id => window.RDL.openDetail(id), id);
      await page.waitForSelector('#detail[open] ul.known li');
      check(/saxophone/i.test(await page.textContent('#detail ul.known')), 'Adolphe Sax sans le saxophone');
      await page.click('#detail-close');
    });
    await step('missions du jour et bonus d’album', async () => {
      const r = await page.evaluate(() => {
        const R = window.RDL, m = R.missionsToday(), out = { n: m.ids.length, kinds: new Set(m.ids.map(id => R.MISSION[id].kind)).size };
        const id = m.ids[0], x = R.MISSION[id];
        out.early = R.claimMission(id);
        R.mission(x.kind, x.target, x.kind === 'games' ? 'a' : null);
        if (x.kind === 'games') for (let i = 1; i < x.target; i++) R.mission('games', 1, 'g' + i);
        const before = R.state.coins; out.gain = R.claimMission(id); out.coins = R.state.coins - before; out.twice = R.claimMission(id);
        out.reward = x.reward;
        // Bonus de revente : ×1 avant 80 % de l'album, ×1,5 après
        out.multBefore = R.resaleMult();
        for (const c of R.CARDS.slice(0, Math.ceil(R.CARDS.length * 0.8))) R.state.owned[c.id] ||= 1;
        out.multAfter = R.resaleMult();
        const myth = R.CARDS.find(c => c.rarity === 'mythique' && c.cat !== 'edition');
        out.myth = R.sellValue(myth, 'normal');
        return out;
      });
      check(r.n === 3 && r.kinds === 3, 'trois missions différentes attendues : ' + JSON.stringify(r));
      check(r.early === 0, 'mission réclamée avant d’être faite');
      check(r.gain === r.reward && r.coins === r.reward && r.twice === 0, 'récompense de mission : ' + JSON.stringify(r));
      check(r.multBefore === 1 && r.multAfter === 1.5 && r.myth === 510, 'bonus d’album : ' + JSON.stringify(r));
    });
    await step('paquet Nouveautés : cartes absentes, 10 par jour', async () => {
      const r = await page.evaluate(() => {
        const R = window.RDL, p = R.PACKS.find(x => x.id === 'nouveautes');
        R.state.coins = 10000;
        const owned = new Set(R.CARDS.filter(c => R.totalOf(c.id)).map(c => c.id));
        let allNew = true, ok = 0;
        for (let i = 0; i < 10; i++) {
          const res = R.buyPacks(p, 1);
          if (!res) break;
          ok++;
          for (const d of res.packs[0].revealed) { if (owned.has(d.card.id) || !d.isNew) allNew = false; owned.add(d.card.id); }
        }
        return { ok, allNew, eleventh: !!R.buyPacks(p, 1) };
      });
      check(r.ok === 10 && r.allNew && !r.eleventh, 'paquet Nouveautés : ' + JSON.stringify(r));
      // Cas limite : il ne manque que 5 cartes (toutes mythiques) → le paquet donne exactement ces 5, sans doublon
      const last = await page.evaluate(() => {
        const R = window.RDL, p = R.PACKS.find(x => x.id === 'nouveautes');
        const pool = R.CARDS.filter(c => c.cat !== 'edition');
        const missing = pool.filter(c => c.rarity === 'mythique').slice(0, 5).map(c => c.id);
        for (const c of pool) if (!missing.includes(c.id)) R.state.owned[c.id] ||= 1;
        for (const id of missing) for (const k of Object.keys(R.state.owned)) if (k === id || k.startsWith(id + '|')) delete R.state.owned[k];
        R.state.perDay = null; R.state.coins = 10000;
        const res = R.buyPacks(p, 1);
        const got = res ? res.packs[0].revealed.map(d => d.card.id).sort() : [];
        return { same: JSON.stringify(got) === JSON.stringify(missing.slice().sort()), again: !!R.buyPacks(p, 1) };
      });
      check(last.same && !last.again, 'paquet Nouveautés, 5 cartes manquantes : ' + JSON.stringify(last));
    });
    await step('défi de la semaine et ticket Prestige', async () => {
      const r = await page.evaluate(() => {
        const R = window.RDL, w = R.weeklyNow(), x = R.WEEKLY.find(y => y.id === w.id);
        w.prog = 0; w.claimed = false; R.state.tickets = {}; // les étapes précédentes ont pu avancer le défi
        const early = R.claimWeekly();
        w.prog = x.target;
        const coins0 = R.state.coins, got = R.claimWeekly(), coins1 = R.state.coins, again = R.claimWeekly();
        const prestige = R.PACKS.find(p => p.id === 'prestige');
        const res = R.buyPacks(prestige, 1);
        return { early, got, gain: coins1 - coins0, again, ticket: res?.usedTicket, paid: R.state.coins - coins1, left: R.state.tickets.prestige };
      });
      check(!r.early && r.got && r.gain === 400 && !r.again && r.ticket && r.left === 0, 'défi de la semaine : ' + JSON.stringify(r));
      check(r.paid >= 0, 'le ticket Prestige a coûté des pièces : ' + JSON.stringify(r));
    });
    await step('image de partage d’une carte', async () => {
      // Commons simulé : l'API donne l'adresse de l'image, l'image est autorisée en CORS (comme le vrai site)
      const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const cors = { 'access-control-allow-origin': '*' };
      const API_RE = /commons\.wikimedia\.org\/w\/api\.php/, IMG = 'https://upload.wikimedia.org/test.png';
      await page.route(API_RE, r => r.fulfill({ status: 200, contentType: 'application/json', headers: cors,
        body: JSON.stringify({ query: { pages: { 1: { imageinfo: [{ thumburl: 'https://upload.wikimedia.org/test.png' }] } } } }) }));
      await page.route(IMG, r => r.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: PNG }));
      const r = await page.evaluate(async () => {
        const c = window.RDL.CARDS.find(x => x.rarity === 'mythique' && x.img);
        const cv = await window.SHARE.render(c, 'holo');
        return { w: cv.width, h: cv.height, photo: cv.dataset.photo, png: cv.toDataURL('image/png').length };
      });
      await page.unroute(API_RE); await page.unroute(IMG);
      check(r.w === 1080 && r.h === 1350 && r.png > 20000 && r.photo === '1', 'image de partage : ' + JSON.stringify(r));
    });
    await step('signaler un bug (issue GitHub pré-remplie)', async () => {
      await page.click('#bug');
      await page.waitForSelector('#bug-dlg[open]');
      await page.$eval('#bug-actions a', a => a.click()); // texte vide : refusé, message dans la fenêtre
      check(await page.isVisible('#bug-msg') && await page.$eval('#bug-dlg', d => d.open), 'signalement vide accepté');
      const r = await page.evaluate(() => window.RDL.bugReport('Le paquet ne s’ouvre pas', true));
      check(r.web.startsWith('https://github.com/Helvor/Brol/issues/new?') && r.body.includes('Le paquet ne s’ouvre pas') && r.body.includes('Version') && !r.body.includes('owned'), 'lien de signalement : ' + r.web.slice(0, 120));
      check(r.mail.startsWith('mailto:brol-support@elveli.net?subject=') && decodeURIComponent(r.mail).includes('Le paquet ne s’ouvre pas') && r.mail.length < 2200, 'e-mail de signalement : ' + r.mail.slice(0, 120));
      check(await page.isVisible('#bug-mail'), 'bouton e-mail absent');
      await page.click('#bug-close');
    });
    await step('fusion des doublons', async () => {
      const ids = await page.evaluate(() => { const C = window.RDL.CARDS.filter(c => c.rarity === 'rare'); window.RDL.state.owned[C[0].id] = 4; window.RDL.state.owned[C[1].id] = 3; window.RDL.save(); return [C[0].id, C[1].id]; });
      await page.click('.tab[data-view="binder"]');
      await page.click('#fuse-btn');
      await page.click('[data-fuse="rare"]');
      await page.waitForSelector('.fuse-result');
      const r = await page.evaluate(ids => [window.RDL.countOf(ids[0], 'normal'), window.RDL.countOf(ids[1], 'normal'), window.RDL.state.stats.fused], ids);
      check(r[0] === 1 && r[1] === 1 && r[2] === 1, 'fusion incorrecte : ' + r);
      await page.click('#fuse-close');
    });
    await step('export puis import de la sauvegarde', async () => {
      await page.evaluate(() => { window.RDL.state.coins = 4321; window.RDL.save(); });
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
      const file = await dl.path();
      await page.evaluate(() => { window.RDL.state.coins = 1; window.RDL.save(); });
      await page.setInputFiles('#import-file', file);
      await page.waitForFunction(() => window.RDL?.state.coins === 4321, null, { timeout: 5000 });
    });
  } finally { await ctx.close(); }
}

try {
  await waitForServer();
  await run('ordinateur', { viewport: { width: 1366, height: 860 } });
  await run('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await trade();
  await features();
  console.log('✓ site : tout fonctionne');
} catch (e) {
  failed = true;
  console.error('✗ ' + e.message + '\n  (capture d’écran dans test-results/)');
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
