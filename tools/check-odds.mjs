// Vérifie que les taux affichés sont justes, avec le vrai code du jeu, dans un navigateur sans affichage.
// Usage : node tools/check-odds.mjs [paquets par type = 100000]
// Pour chaque paquet : raretés (cartes 1 à 4 et 5ᵉ carte), versions spéciales, cartes exclusives, versions
// d'événement. Un écart est signalé s'il dépasse 4 écarts-types (le hasard seul ne l'explique plus).
// Vérifie aussi la garantie anti-malchance : jamais plus de PITY paquets sans légendaire ou mieux.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const N = +process.argv[2] || 100000;
const URL = 'http://localhost:5173/';
const server = spawn(process.execPath, [fileURLToPath(new globalThis.URL('serve.mjs', import.meta.url))], { stdio: 'ignore' });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) break; } catch (_) { /* démarrage */ } await new Promise(r => setTimeout(r, 100)); }
const page = await browser.newPage();
await page.route(url => !url.href.startsWith(URL), r => r.abort());
await page.goto(URL);

const res = await page.evaluate(N => {
  localStorage.clear();
  const R = window.RDL, out = [];
  const packs = [...R.PACKS, ...R.EVENT_PACKS];
  const se = (p, n) => Math.sqrt(p * (1 - p) / n);
  for (const pack of packs) {
    const exp = R.packOdds(pack), fin = {};
    let excl = 0, cards = 0;
    for (let i = 0; i < N; i++) {
      // Versions et cartes exclusives : la position dans le paquet n'importe pas
      for (const d of R.drawPack(pack, false)) {
        fin[d.finish] = (fin[d.finish] || 0) + 1; cards++;
        if (d.card.cat === 'edition') excl++;
      }
    }
    const rows = [];
    // Versions de base (indépendantes de la position)
    for (const f of R.FINISHES.filter(f => f.chance)) {
      const e = f.chance * (pack.finishBoost || 1) * (1 - (R.packFinish(pack.id)?.packChance || 0));
      const o = (fin[f.id] || 0) / cards;
      rows.push({ what: f.id, exp: e, obs: o, z: (o - e) / se(e, cards) });
    }
    const ev = R.packFinish(pack.id);
    if (ev) { const o = (fin[ev.id] || 0) / cards; rows.push({ what: ev.id, exp: ev.packChance, obs: o, z: (o - ev.packChance) / se(ev.packChance, cards) }); }
    const ch = R.exclChance(pack);
    if (ch) { const o = excl / N; rows.push({ what: 'exclusive / paquet', exp: ch, obs: o, z: (o - ch) / se(ch, N) }); }
    out.push({ pack: pack.id, rows, exp });
  }
  return out;
}, N);
// Raretés : comptées par position avec un tirage non trié (copie de drawPack sans le tri final)
const rar = await page.evaluate(N => {
  const R = window.RDL, out = {};
  for (const pack of [...R.PACKS, ...R.EVENT_PACKS]) {
    const cnt = { first: {}, last: {} };
    const orig = Array.prototype.sort;
    // Le tri final de drawPack est neutralisé pendant la mesure, pour garder l'ordre de tirage
    Array.prototype.sort = function () { return this; };
    try {
      for (let i = 0; i < N; i++) {
        const d = R.drawPack(pack, false);
        d.forEach((x, k) => { if (x.card.cat === 'edition') return; const slot = k === R.PACK_SIZE - 1 ? 'last' : 'first'; cnt[slot][x.card.rarity] = (cnt[slot][x.card.rarity] || 0) + 1; });
      }
    } finally { Array.prototype.sort = orig; }
    out[pack.id] = cnt;
  }
  return out;
}, N);
// Garantie anti-malchance avec buyPacks (compteur réel)
const pity = await page.evaluate(() => {
  const R = window.RDL, p = R.PACKS.find(x => x.id === 'belgique');
  R.state.coins = 1e9; R.state.free = 0; R.state.pity = 0;
  let gap = 0, maxGap = 0;
  for (let i = 0; i < 20000; i++) {
    const r = R.buyPacks(p, 1);
    const leg = r.packs[0].revealed.some(d => ['legendaire', 'mythique'].includes(d.card.rarity));
    gap = leg ? 0 : gap + 1; maxGap = Math.max(maxGap, gap);
  }
  return { maxGap, limit: R.PITY };
});
await browser.close(); server.kill();

let bad = 0;
const pct = x => (x * 100).toFixed(2).padStart(6) + ' %';
for (const p of res) {
  console.log(`\n${p.pack}`);
  const cnt = rar[p.pack];
  const tot = s => Object.values(cnt[s]).reduce((a, b) => a + b, 0);
  for (const e of p.exp) for (const [slot, key] of [['first', 'p'], ['last', 'last']]) {
    const n = tot(slot), o = (cnt[slot][e.id] || 0) / n, x = e[key];
    if (!x && !o) continue;
    const z = (o - x) / Math.sqrt(Math.max(x * (1 - x), 1e-9) / n);
    const flag = Math.abs(z) > 4 ? '  ⚠ ÉCART' : '';
    if (flag) bad++;
    console.log(`  ${(e.id + (slot === 'last' ? ' (5ᵉ)' : ' (1–4)')).padEnd(22)} affiché ${pct(x)}  mesuré ${pct(o)}${flag}`);
  }
  for (const r of p.rows) {
    const flag = Math.abs(r.z) > 4 ? '  ⚠ ÉCART' : '';
    if (flag) bad++;
    console.log(`  ${r.what.padEnd(22)} affiché ${pct(r.exp)}  mesuré ${pct(r.obs)}${flag}`);
  }
}
console.log(`\nGarantie : au plus ${pity.maxGap} paquets d'affilée sans légendaire (limite ${pity.limit})`);
if (pity.maxGap >= pity.limit) bad++;
console.log(bad ? `\n✗ ${bad} écart(s)` : `\n✓ tous les taux affichés sont justes (${N.toLocaleString('fr-BE')} paquets par type)`);
process.exit(bad ? 1 : 0);
