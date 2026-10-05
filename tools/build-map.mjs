// Génère data/provinces.js : contours simplifiés des 10 provinces et de la Région de Bruxelles-Capitale,
// pour la carte du Tour de Belgique. Source : OpenStreetMap (ODbL), via polygons.openstreetmap.fr.
// Usage : node tools/build-map.mjs
import { writeFileSync } from 'node:fs';

// Identifiant de relation OpenStreetMap (propriété P402 sur Wikidata)
const AREAS = [
  ['Flandre-Occidentale', 'West-Vlaanderen', 416271], ['Flandre-Orientale', 'Oost-Vlaanderen', 53135],
  ['Anvers', 'Antwerpen', 53114], ['Limbourg', 'Limburg', 53142], ['Brabant flamand', 'Vlaams-Brabant', 58004],
  ['Bruxelles', 'Brussel', 54094], ['Brabant wallon', 'Waals-Brabant', 78748], ['Hainaut', 'Henegouwen', 157559],
  ['Namur', 'Namen', 1311816], ['Liège', 'Luik', 1407192], ['Luxembourg', 'Luxemburg', 1412581],
];
const TOLERANCE = 0.006; // degrés, simplification Douglas-Peucker (≈ 500 m)

function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [x1, y1] = pts[a], [x2, y2] = pts[b];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1e-12;
    let best = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / len;
      if (d > best) { best = d; idx = i; }
    }
    if (best > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const out = [];
for (const [fr, nl, id] of AREAS) {
  const url = `https://polygons.openstreetmap.fr/get_geojson.py?id=${id}&params=0.004000-0.001000-0.001000`;
  const r = await fetch(url, { headers: { 'User-Agent': 'brol-cards/0.3 (projet perso)' } });
  if (!r.ok) throw new Error(`${fr} : HTTP ${r.status}`);
  const g = await r.json();
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates
    : g.geometries.flatMap(x => x.type === 'Polygon' ? [x.coordinates] : x.coordinates);
  // Anneaux extérieurs seulement, en [lat, lon], arrondis à 3 décimales ; les îlots minuscules sont ignorés
  // Contour fermé (premier point = dernier) : on le simplifie en deux moitiés ouvertes
  const ring = pts => { const open = pts.slice(0, -1), m = open.length >> 1; return [...simplify(open.slice(0, m + 1), TOLERANCE).slice(0, -1), ...simplify([...open.slice(m), open[0]], TOLERANCE)]; };
  const rings = polys.map(p => ring(p[0].map(([lon, lat]) => [+lat.toFixed(3), +lon.toFixed(3)]))).filter(r => r.length >= 6);
  out.push({ fr, nl, rings });
  console.log(`${fr} : ${rings.length} contour(s), ${rings.reduce((a, r) => a + r.length, 0)} points`);
  await new Promise(res => setTimeout(res, 800));
}
writeFileSync('data/provinces.js',
  '// Contours simplifiés des provinces et de Bruxelles. © les contributeurs d’OpenStreetMap (ODbL). Généré par tools/build-map.mjs.\n' +
  'window.BE_PROVINCES = ' + JSON.stringify(out) + ';\n');
console.log('data/provinces.js écrit');
