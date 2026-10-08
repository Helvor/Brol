// Compte les biens protégés par commune dans les registres officiels des trois Régions → tools/sources/patrimoine.csv
// (pas de Wikimedia : Onroerend Erfgoed, Géoportail de Wallonie, urban.brussels ; à relancer une fois par an)
// Usage : node tools/patrimoine.mjs (demande tools/sources/communes.csv, voir tools/statbel.py)
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = new URL('sources/', import.meta.url);
const communes = readFileSync(new URL('communes.csv', SRC), 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const byName = new Map();
for (const [ins, fr, nl] of communes) { byName.set(norm(fr), ins); byName.set(norm(nl), ins); }
// Anciennes communes fusionnées le 1er janvier 2025 (encore citées dans les registres) → nouvelle commune
const FUSIONS = {
  Borsbeek: 'Antwerpen', Beveren: 'Beveren-Kruibeke-Zwijndrecht', Kruibeke: 'Beveren-Kruibeke-Zwijndrecht', Zwijndrecht: 'Beveren-Kruibeke-Zwijndrecht',
  Galmaarden: 'Pajottegem', Gooik: 'Pajottegem', Herne: 'Pajottegem', Meulebeke: 'Tielt', Ruiselede: 'Wingene',
  Nazareth: 'Nazareth-De Pinte', 'De Pinte': 'Nazareth-De Pinte', Wachtebeke: 'Lochristi', Melle: 'Merelbeke-Melle', Merelbeke: 'Merelbeke-Melle',
  Moerbeke: 'Lokeren', Kortessem: 'Hasselt', Tessenderlo: 'Tessenderlo-Ham', Ham: 'Tessenderlo-Ham', Bilzen: 'Bilzen-Hoeselt', Hoeselt: 'Bilzen-Hoeselt',
  Borgloon: 'Tongeren-Borgloon', Tongeren: 'Tongeren-Borgloon', Bertogne: 'Bastogne',
};
for (const [old, now] of Object.entries(FUSIONS)) byName.set(norm(old), byName.get(norm(now)));
const OLD_INS = { 82003: '82039', 82005: '82039' }; // Bastogne, Bertogne → Bastogne (2025)
const count = new Map(communes.map(([ins]) => [ins, 0]));
const unknown = new Map();
const add = (ins, name) => { if (count.has(ins)) count.set(ins, count.get(ins) + 1); else unknown.set(name, (unknown.get(name) || 0) + 1); };
const getJSON = async url => { const r = await fetch(url); if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); };

// Flandre : monuments protégés ; la commune est entre parenthèses à la fin de « locatie » (parfois plusieurs)
const vl = await getJSON('https://geo.onroerenderfgoed.be/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=vioe_geoportaal:bes_monument&propertyName=aanduid_id,locatie&outputFormat=application/json');
for (const f of vl.features) {
  const m = (f.properties.locatie || '').match(/\(([^()]+)\)\s*$/);
  const names = m ? m[1].split(/,\s*/) : [];
  const ins = [...new Set(names.map(n => byName.get(norm(n))).filter(Boolean))];
  if (!ins.length) add(null, f.properties.locatie);
  for (const k of ins) add(k);
}
console.log('Flandre :', vl.features.length);

// Wallonie : monuments, sites, ensembles architecturaux et sites archéologiques classés ; code INS au début de CODECARTO
const WAL = 'https://geoservices.wallonie.be/arcgis/rest/services/AMENAGEMENT_TERRITOIRE/BC_PAT/MapServer/';
for (const layer of [0, 1, 2, 3]) {
  let n = 0;
  for (let offset = 0; ; offset += 1000) {
    const j = await getJSON(`${WAL}${layer}/query?where=1%3D1&outFields=CODECARTO,CODESERVICE&returnGeometry=false&resultOffset=${offset}&resultRecordCount=1000&orderByFields=OBJECTID&f=json`);
    for (const f of j.features) {
      // Codes INS d'avant 2019 (arrondissements du Hainaut) : la commune est aussi au début de CODESERVICE (« NOM/n° »)
      const c = (f.attributes.CODECARTO || '').slice(0, 5), name = (f.attributes.CODESERVICE || '').split('/')[0];
      add(count.has(OLD_INS[c] || c) ? OLD_INS[c] || c : byName.get(norm(name)), 'WAL ' + c + ' ' + name); n++;
    }
    if (j.features.length < 1000) break;
  }
  console.log('Wallonie, couche', layer, ':', n);
}

// Bruxelles : biens classés ou sauvegardés (sans les arbres remarquables)
const bx = await getJSON('https://gis.urban.brussels/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=URBAN_DCH_IBH:Classified_or_protected_built_heritage&propertyName=MS,GEMEENTE_FR&outputFormat=application/json');
let nbx = 0;
for (const f of bx.features) {
  if (/arbre/i.test(f.properties.MS || '')) continue;
  const g = f.properties.GEMEENTE_FR || '';
  add(byName.get(norm(g)) || byName.get(norm(g.replace(/^BRUXELLES.*/, 'Bruxelles'))), g); nbx++;
}
console.log('Bruxelles :', nbx);

if (unknown.size) console.warn('Sans commune reconnue :', [...unknown].sort((a, b) => b[1] - a[1]).slice(0, 25));
writeFileSync(new URL('patrimoine.csv', SRC), 'ins,biens_proteges\n' + [...count].map(r => r.join(',')).join('\n') + '\n');
console.log('tools/sources/patrimoine.csv :', count.size, 'communes,', [...count.values()].reduce((a, b) => a + b, 0), 'biens');
