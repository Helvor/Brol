// Génère data/images.js : pour chaque image des cartes, de quoi construire l'adresse directe de la miniature
// sur upload.wikimedia.org (le cache de Wikimedia, rapide et gardé par le navigateur).
// Sans ça, l'app passe par Special:FilePath : deux redirections jamais mises en cache, à chaque affichage.
// Usage : node tools/build-images.mjs (lancé aussi à la fin de tools/build-cards.mjs)
// Format : { "Fichier.jpg": "a1:1200" } → dossier a/a1, largeur d'origine 1200 px ;
//          { "Fichier.tif": "~lossy-page1-{w}px-Fichier.tif.jpg:a1:3000" } → nom de miniature particulier.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const CACHE_FILE = new URL('.cache-images.json', import.meta.url);
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
const UA = { 'User-Agent': 'BrolCards/1.0 (https://github.com/Helvor/Brol; images)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

globalThis.window = {};
(0, eval)(readFileSync(new URL('../data/cards.js', import.meta.url), 'utf8'));
const files = [...new Set(window.CARDS.flatMap(c => [c.img, c.alt, c.badge]).filter(Boolean))];

const todo = files.filter(f => !cache[f]);
for (let i = 0; i < todo.length; i += 50) {
  const batch = todo.slice(i, i + 50);
  const q = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', prop: 'imageinfo', iiprop: 'size|url', iiurlwidth: '500', titles: batch.map(f => 'File:' + f).join('|') });
  let j;
  for (let attempt = 0; ; attempt++) {
    const r = await fetch('https://commons.wikimedia.org/w/api.php?' + q, { headers: UA });
    if (r.ok) { j = await r.json(); break; }
    if (attempt >= 5) throw new Error('Commons ' + r.status);
    await sleep(3000 * 2 ** attempt);
  }
  const back = new Map((j.query?.normalized || []).map(x => [x.to, x.from]));
  for (const p of j.query?.pages || []) {
    const ii = p.imageinfo?.[0];
    const f = (back.get(p.title) || p.title).replace(/^File:/, '');
    if (ii) cache[f] = { w: ii.width, url: ii.url, thumb: ii.thumburl, tw: ii.thumbwidth };
  }
  writeFileSync(CACHE_FILE, JSON.stringify(cache));
  console.log(`Images : ${Math.min(i + 50, todo.length)} / ${todo.length}`);
  await sleep(500);
}

const out = {};
let special = 0, missing = 0;
for (const f of files) {
  const info = cache[f];
  if (!info) { missing++; continue; }
  const name = f.replace(/ /g, '_');
  const md5 = createHash('md5').update(name).digest('hex');
  const dir = md5.slice(0, 2);
  const svg = /\.svg$/i.test(f);
  // Miniature à 500 px telle que Commons la donne ; image plus petite que 500 px : on ne voit que l'original
  const m = (info.thumb || '').split('?')[0].match(/\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/[^/]+\/(.+)$/);
  if (!m) { out[f] = `${dir}:${svg ? 0 : info.w}`; continue; } // pas de miniature : l'original
  const thumbName = decodeURIComponent(m[1]).replace(/^500px-/, '{w}px-').replace(/-500px-/, '-{w}px-');
  const expected = `{w}px-${name}${svg ? '.png' : ''}`;
  if (thumbName === expected) out[f] = `${dir}:${svg ? 0 : info.w}`;
  else { out[f] = `~${thumbName}:${dir}:${svg ? 0 : info.w}`; special++; }
}
writeFileSync(new URL('../data/images.js', import.meta.url),
  '// Généré par tools/build-images.mjs : adresses directes des images de Wikimedia Commons (dossier, largeur d’origine).\n' +
  'window.IMAGES = ' + JSON.stringify(out) + ';\n');
console.log(`data/images.js : ${Object.keys(out).length} images (${special} au nom de miniature particulier, ${missing} introuvables)`);
