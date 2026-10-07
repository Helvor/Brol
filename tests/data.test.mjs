// Contrôle de data/cards.js, sans navigateur : node tests/data.test.mjs
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../data/cards.js', import.meta.url), 'utf8'), { window });
const cards = window.CARDS;

const CATS = ['politique', 'bourgmestre', 'monarchie', 'culture', 'groupe', 'festival', 'sport', 'science', 'militaire', 'animal', 'art', 'monument', 'chateau', 'folklore',
  'gastronomie', 'biere', 'enseignement', 'commune', 'province', 'region', 'evenement', 'edition'];
const OPTIONAL = ['science']; // catégories ajoutées au générateur, vides tant que data/cards.js n'est pas régénéré
const RARITIES = ['commune', 'peu-commune', 'rare', 'epique', 'legendaire', 'mythique'];

const errors = [];
const fail = (c, msg) => errors.push(`${c?.id ?? '?'} (${c?.name ?? '?'}) : ${msg}`);

if (!Array.isArray(cards)) throw new Error('window.CARDS absent ou invalide');
if (cards.length < 1000) errors.push(`seulement ${cards.length} cartes : génération incomplète ?`);
if (!window.POS_NL || typeof window.POS_NL !== 'object') errors.push('window.POS_NL absent');

const seen = new Set();
for (const c of cards) {
  if (!c.id) fail(c, 'id manquant');
  else if (seen.has(c.id)) fail(c, 'id en double');
  seen.add(c.id);
  if (!CATS.includes(c.cat)) fail(c, `catégorie inconnue « ${c.cat} »`);
  if (!RARITIES.includes(c.rarity)) fail(c, `rareté inconnue « ${c.rarity} »`);
  if (!c.name || !c.name.trim()) fail(c, 'nom vide');
  if (c.cat !== 'evenement' && !c.img) fail(c, 'pas d’image (les entrées sans image libre doivent être exclues)');
  if (!Array.isArray(c.stats) || !c.stats.length) fail(c, 'stats manquantes');
  else if (c.stats.some(s => !Array.isArray(s) || s.length !== 2)) fail(c, 'stat mal formée');
}

// Chaque catégorie doit avoir des cartes, et les grandes catégories toutes les raretés
const NO_MYTHIQUE = ['bourgmestre'];
for (const cat of CATS) {
  const list = cards.filter(c => c.cat === cat);
  if (!list.length) { if (!OPTIONAL.includes(cat)) errors.push(`catégorie « ${cat} » vide`); continue; }
  if (list.length >= 100) {
    // Mythique = icônes choisies à la main (MYTHIQUES dans build-cards) : aucun bourgmestre n'en est une
    const missing = RARITIES.filter(r => !(r === 'mythique' && NO_MYTHIQUE.includes(cat)) && !list.some(c => c.rarity === r));
    if (missing.length) errors.push(`catégorie « ${cat} » sans ${missing.join(', ')}`);
  }
}

// Éditions limitées : 2 ou 3 cartes par paquet spécial, rattachées à un paquet connu
const SPECIAL_PACKS = ['prestige', 'carnaval', 'ronde', 'iris', 'onze-juillet', 'fete-nationale', 'wallonie', 'armistice', 'saint-nicolas'];
for (const c of cards.filter(c => c.cat === 'edition')) if (!SPECIAL_PACKS.includes(c.pack)) fail(c, `paquet inconnu « ${c.pack} »`);
for (const p of SPECIAL_PACKS) {
  const n = cards.filter(c => c.pack === p).length;
  if (n < 2 || n > 3) errors.push(`paquet « ${p} » : ${n} carte(s) exclusive(s), il en faut 2 ou 3`);
}

if (errors.length) {
  console.error(`✗ données : ${errors.length} problème(s)\n  ` + errors.slice(0, 50).join('\n  '));
  process.exit(1);
}
console.log(`✓ données : ${cards.length} cartes, ${new Set(cards.map(c => c.cat)).size} catégories`);
