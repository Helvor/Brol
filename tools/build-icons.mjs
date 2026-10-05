// Génère les icônes d'application (PNG) à partir de logo.svg : node tools/build-icons.mjs
// - icon-192 / icon-512 : logo sur fond sombre aux coins arrondis
// - icon-maskable-512 : fond plein, logo dans la zone sûre (Android découpe l'icône en cercle ou en goutte)
// - apple-touch-icon (180) : fond plein, iOS arrondit lui-même les coins
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const svg = readFileSync(new URL('../logo.svg', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/, '');
const BG = 'radial-gradient(circle at 50% 35%, #1d2233, #0d0e11 75%)';
const ICONS = [
  ['icons/icon-192.png', 192, { radius: 0.22, logo: 0.78 }],
  ['icons/icon-512.png', 512, { radius: 0.22, logo: 0.78 }],
  ['icons/icon-maskable-512.png', 512, { radius: 0, logo: 0.6 }],
  ['icons/apple-touch-icon.png', 180, { radius: 0, logo: 0.74 }],
];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [file, size, { radius, logo }] of ICONS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:transparent">
    <div style="width:${size}px;height:${size}px;border-radius:${radius * size}px;background:${BG};display:grid;place-items:center">
      <div style="width:${logo * size}px;height:${logo * size}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    </div></body>`);
  await page.screenshot({ path: file, omitBackground: true });
  await page.close();
  console.log(file);
}
await browser.close();
