// Génère data/cards.js depuis Wikidata et Wikipédia.
// Usage : node tools/build-cards.mjs           (réutilise le cache des requêtes, rapide)
//         node tools/build-cards.mjs --fresh   (tout re-télécharger, pour avoir les données à jour)
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';

const UA = { 'User-Agent': 'brol-cards/0.3 (projet perso)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Cache disque des réponses (clé = URL)
const CACHE_FILE = new URL('.cache.json', import.meta.url);
const FRESH = process.argv.includes('--fresh');
const cache = !FRESH && existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
let cacheDirty = 0;
function saveCache() { writeFileSync(CACHE_FILE, JSON.stringify(cache)); cacheDirty = 0; }
async function getJSON(url, { delay = 0, label = 'HTTP' } = {}) {
  if (cache[url]) return cache[url];
  for (let attempt = 0; ; attempt++) {
    if (delay) await sleep(delay);
    const r = await fetch(url, { headers: UA });
    if (r.ok) {
      const j = await r.json();
      cache[url] = j;
      if (++cacheDirty >= 25) saveCache();
      return j;
    }
    if (r.status !== 429 || attempt >= 5) throw new Error(label + ' ' + r.status + ' ' + (await r.text()).slice(0, 300));
    await sleep(2000 * 2 ** attempt);
  }
}
async function sparql(query) {
  const j = await getJSON('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query), { label: 'SPARQL' });
  return j.results.bindings.map(b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
}
async function wikiApi(lang, params) {
  const url = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  return getJSON(url, { delay: 400, label: 'Wikipedia' }); // délai : rester poli avec l'API
}
const qid = uri => uri && uri.split('/').pop();
const file = uri => uri && decodeURIComponent(uri.split('/Special:FilePath/').pop());
const year = d => d ? parseInt(d.slice(0, 4), 10) : null;
const isQ = s => /^Q\d+$/.test(s || '');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const span = (st, en) => {
  const a = year(st), b = year(en);
  if (!a && !b) return '';
  if (a && !b) return `depuis ${a}`;
  return a === b || !a ? `${b}` : `${a}–${b}`;
};

// Familles politiques → couleur (définie dans style.css)
const PARTIES = {
  rouge:     ['Q645787', 'Q2532509', 'Q1811565', 'Q939354', 'Q1160192'],
  bleu:      ['Q533384', 'Q2711996', 'Q2215286', 'Q2636334', 'Q1143062', 'Q106241931', 'Q2133093', 'Q2445771'],
  jaune:     ['Q28982', 'Q1725837'],
  orange:    ['Q750673', 'Q3366715', 'Q113903993', 'Q792293', 'Q1084016', 'Q113184801'],
  turquoise: ['Q840814'],
  vert:      ['Q655611', 'Q513521', 'Q19760801'],
  pourpre:   ['Q925616'],
  noir:      ['Q682990', 'Q597900'],
  magenta:   ['Q1470087'],
};
const partyFamily = q => Object.keys(PARTIES).find(k => PARTIES[k].includes(q)) || 'gris';
const SHORT = {
  Q645787: 'PS', Q939354: 'Vooruit', Q533384: 'MR', Q1143062: 'Open VLD', Q28982: 'N-VA',
  Q750673: 'CD&V', Q113903993: 'cdH', Q840814: 'Les Engagés', Q655611: 'Ecolo', Q513521: 'Groen',
  Q925616: 'PTB-PVDA', Q682990: 'Vlaams Belang', Q597900: 'Vlaams Blok', Q1470087: 'DéFI',
  Q1725837: 'Volksunie', Q2711996: 'PRL', Q3366715: 'PSC', Q2532509: 'PSB', Q1811565: 'POB',
  Q1160192: 'sp.a', Q792293: 'Parti catholique', Q2636334: 'Parti libéral', Q2215286: 'PLP',
  Q19760801: 'Agalev', Q106241931: 'VLD', Q1084016: 'CSP', Q113184801: 'PSC',
};
const PARTY_BY_SHORT = Object.fromEntries(Object.entries(SHORT).reverse().map(([q, s]) => [s, q]));

const cards = [];

// ---------- Gouvernements fédéraux et législatures (pour dater les mandats) ----------
const cabinets = (await sparql(`
SELECT ?c ?cLabel ?st ?en WHERE {
  ?c wdt:P31 wd:Q19601543. OPTIONAL { ?c wdt:P571 ?st } OPTIONAL { ?c wdt:P576 ?en }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
}`)).filter(c => c.st && !isQ(c.cLabel))
  .map(c => ({ id: qid(c.c), name: c.cLabel.replace(/^[Gg]ouvernement[ -](d[eu] |des )?/, ''), st: c.st, en: c.en }))
  .sort((a, b) => a.st.localeCompare(b.st));
const CAB = new Map(cabinets.map(c => [c.id, c]));
// Le gouvernement en place au début d'un mandat (tolérance de quelques jours avant l'installation)
function cabinetAt(st) {
  if (!st) return null;
  const t = new Date(st).getTime() + 7 * 864e5;
  let best = null;
  for (const c of cabinets) if (new Date(c.st).getTime() <= t) best = c;
  return best && (!best.en || new Date(best.en).getTime() > new Date(st).getTime() - 864e5) ? best : null;
}

const legislatures = (await sparql(`
SELECT DISTINCT ?t ?tLabel ?st ?en ?st2 ?en2 WHERE {
  ?s ps:P39 wd:Q15705021; pq:P2937 ?t.
  OPTIONAL { ?t wdt:P580 ?st } OPTIONAL { ?t wdt:P582 ?en } OPTIONAL { ?t wdt:P571 ?st2 } OPTIONAL { ?t wdt:P576 ?en2 }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
}`)).map(t => ({ id: qid(t.t), n: +(t.tLabel.match(/(\d+)/) || [])[1] || null, st: t.st || t.st2, en: t.en || t.en2 }))
  .filter(t => t.n).sort((a, b) => a.n - b.n);
const LEG = new Map(legislatures.map(l => [l.id, l]));
function legislatureAt(st) {
  if (!st) return null;
  const t = new Date(st).getTime();
  return legislatures.filter(l => l.st && new Date(l.st).getTime() <= t + 30 * 864e5).pop() || null;
}
const legLabel = l => `${l.n}ᵉ législature${l.st ? ` (${span(l.st, l.en)})` : ''}`;
function legRange(nums) {
  if (!nums.length) return '';
  if (nums.length === 1) return `${nums[0]}ᵉ législature`;
  const consecutive = nums.every((n, i) => !i || n === nums[i - 1] + 1);
  return consecutive ? `Législatures ${nums[0]} à ${nums.at(-1)}` : `Législatures ${nums.join(', ')}`;
}

// ---------- Personnalités ----------
const PM = 'Q213107', MP = 'Q15705021';
const REGIONAL = {
  Q2746377: 'Ministre-président flamand',
  Q3100220: 'Ministre-président wallon',
  Q435627: 'Ministre-président bruxellois',
};

const people = await sparql(`
SELECT ?p ?pLabel ?img ?birth ?death ?party ?pos ?posLabel ?st ?en ?cab ?term WHERE {
  {
    ?p p:P39 ?s. ?s ps:P39 ?pos.
    VALUES ?pos { wd:${PM} wd:Q2746377 wd:Q3100220 wd:Q435627 }
  } UNION {
    ?p p:P39 ?s. ?s ps:P39 ?pos. ?pos wdt:P279* wd:Q83307; wdt:P1001 wd:Q31.
  } UNION {
    ?p p:P39 ?s. ?s ps:P39 ?pos. VALUES ?pos { wd:${MP} }
    ?p wdt:P569 ?b0. FILTER(YEAR(?b0) >= 1940)
  }
  ?p wdt:P31 wd:Q5.
  OPTIONAL { ?s pq:P580 ?st } OPTIONAL { ?s pq:P582 ?en }
  OPTIONAL { ?s pq:P5054 ?cab } OPTIONAL { ?s pq:P2937 ?term }
  OPTIONAL { ?p wdt:P18 ?img } OPTIONAL { ?p wdt:P569 ?birth } OPTIONAL { ?p wdt:P570 ?death }
  OPTIONAL { ?p wdt:P102 ?party }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,nl,mul,en". }
}`);

const byPerson = new Map();
function person(id, name) {
  let o = byPerson.get(id);
  if (!o) byPerson.set(id, o = {
    id, name, img: null, birth: null, death: null, parties: new Set(),
    pm: new Map(), regional: new Map(), ministries: new Map(), mp: new Map(), current: null,
  });
  return o;
}
for (const r of people) {
  const o = person(qid(r.p), r.pLabel);
  o.img ||= file(r.img); o.birth ||= year(r.birth); o.death ||= year(r.death);
  if (r.party) o.parties.add(qid(r.party));
  const pos = qid(r.pos);
  const key = pos + '|' + (r.st || '') + '|' + (r.en || '');
  const cab = (r.cab && CAB.get(qid(r.cab))) || cabinetAt(r.st);
  if (pos === PM) o.pm.set(key, { st: r.st, en: r.en, cab });
  else if (REGIONAL[pos]) o.regional.set(key, { label: REGIONAL[pos], pos, st: r.st, en: r.en });
  else if (pos === MP) o.mp.set(key, { st: r.st, en: r.en, leg: (r.term && LEG.get(qid(r.term))) || legislatureAt(r.st) });
  else if (!isQ(r.posLabel)) o.ministries.set(key, {
    label: cap(r.posLabel.replace(/^liste des ministres belges du /, 'ministre du ')), pos, st: r.st, en: r.en, cab,
  });
}

// Parti le plus récent d'abord : affiliations (P102) triées par date, l'affiliation en cours en tête.
// Sans dates, l'ordre de Wikidata est gardé. Le parti affiché est le premier qui a un nom court connu (SHORT).
{
  const ids = [...byPerson.keys()];
  const aff = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const rows = await sparql(`
SELECT ?p ?party ?st ?en WHERE {
  VALUES ?p { ${ids.slice(i, i + 200).map(q => 'wd:' + q).join(' ')} }
  ?p p:P102 ?s. ?s ps:P102 ?party; wikibase:rank ?rank. FILTER(?rank != wikibase:DeprecatedRank)
  OPTIONAL { ?s pq:P580 ?st } OPTIONAL { ?s pq:P582 ?en }
}`);
    for (const r of rows) {
      const list = aff.get(qid(r.p)) || [];
      list.push({ q: qid(r.party), st: year(r.st) || 0, en: r.en ? year(r.en) : Infinity });
      aff.set(qid(r.p), list);
    }
  }
  for (const [id, list] of aff) {
    list.sort((a, b) => b.en - a.en || b.st - a.st);
    byPerson.get(id).parties = new Set(list.map(x => x.q));
  }
}

// Gouvernement actuel : composition lue sur Wikipédia (Wikidata est incomplet pour les mandats récents)
const CURRENT_GOV = 'Gouvernement_De_Wever';
const wt = (await wikiApi('fr', { action: 'parse', page: CURRENT_GOV, prop: 'wikitext' })).parse.wikitext;
const table = wt.slice(wt.search(/==\s*Composition/i)).split(/\n\|\}/)[0];
const clean = s => s.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '').replace(/<br\s*\/?>/gi, ' · ').replace(/\s+/g, ' ').trim();
const members = [];
for (const row of table.split(/\n\|-\n/).slice(1)) {
  const role = (row.match(/^\|bgcolor=[^|]*\|(.*)$/m) || [])[1];
  const links = [...row.matchAll(/^\|\s*\[\[(?!Fichier:)([^|\]]+)(?:\|([^\]]+))?\]\]\s*$/gm)];
  if (!role || links.length < 2) continue;
  members.push({
    title: links[0][1], role: clean(role), party: (links[1][2] || links[1][1]).trim(),
    img: (row.match(/\[\[Fichier:([^|\]]+)/) || [])[1] || null,
  });
}
const pp = await wikiApi('fr', { action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', redirects: '1', titles: members.map(m => m.title).join('|') });
const titleMap = new Map([...(pp.query.redirects || []), ...(pp.query.normalized || [])].map(r => [r.from, r.to]));
const qidByTitle = new Map(pp.query.pages.map(p => [p.title, p.pageprops?.wikibase_item]));
for (const m of members) m.q = qidByTitle.get(titleMap.get(m.title) || m.title);
const curInfo = await sparql(`
SELECT ?p ?pLabel ?birth ?img WHERE {
  VALUES ?p { ${members.filter(m => m.q).map(m => 'wd:' + m.q).join(' ')} }
  OPTIONAL { ?p wdt:P569 ?birth } OPTIONAL { ?p wdt:P18 ?img }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,nl,mul,en". }
}`);
const curCab = cabinets.at(-1);
for (const m of members) {
  if (!m.q) continue;
  const info = curInfo.find(r => qid(r.p) === m.q) || {};
  const o = person(m.q, info.pLabel || m.title.replace(/ \(.*\)$/, ''));
  o.birth ||= year(info.birth);
  o.img = m.img || o.img || file(info.img); // photo du tableau : en général la plus récente
  const pq = PARTY_BY_SHORT[m.party];
  if (pq) o.parties = new Set([pq, ...o.parties]);
  o.current = { role: m.role, vpm: /Vice-Premier ministre/.test(m.role), pm: /^Premier ministre/.test(m.role), cab: curCab };
}

// Photos manquantes : image principale de l'article Wikipédia (FR, sinon NL), licence libre uniquement
const noImg = [...byPerson.values()].filter(o => !o.img && !isQ(o.name));
const sitelinks = new Map();
for (let i = 0; i < noImg.length; i += 200) {
  const rows = await sparql(`
  SELECT ?p ?fr ?nl WHERE {
    VALUES ?p { ${noImg.slice(i, i + 200).map(o => 'wd:' + o.id).join(' ')} }
    OPTIONAL { ?fa schema:about ?p; schema:isPartOf <https://fr.wikipedia.org/>; schema:name ?fr }
    OPTIONAL { ?na schema:about ?p; schema:isPartOf <https://nl.wikipedia.org/>; schema:name ?nl }
  }`);
  for (const r of rows) sitelinks.set(qid(r.p), { fr: r.fr, nl: r.nl });
}
let found = 0;
for (const lang of ['fr', 'nl']) {
  const todo = noImg.filter(o => !o.img && sitelinks.get(o.id)?.[lang]);
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const res = await wikiApi(lang, { action: 'query', prop: 'pageimages', piprop: 'name', pilicense: 'free', redirects: '1', titles: batch.map(o => sitelinks.get(o.id)[lang]).join('|') });
    const alias = new Map([...(res.query.redirects || []), ...(res.query.normalized || [])].map(r => [r.from, r.to]));
    const imgByTitle = new Map(res.query.pages.filter(p => p.pageimage).map(p => [p.title, p.pageimage]));
    for (const o of batch) {
      const t = sitelinks.get(o.id)[lang];
      const f = imgByTitle.get(alias.get(t) || t);
      if (f) { o.img = f.replace(/_/g, ' '); found++; }
    }
  }
}
console.log(`Photos récupérées via Wikipédia : ${found} / ${noImg.length}`);

const RANK = ['commune', 'peu-commune', 'rare', 'epique', 'legendaire', 'mythique'];
const maxR = (a, b) => RANK.indexOf(a) >= RANK.indexOf(b) ? a : b;
const byDate = (a, b) => (a.st || '').localeCompare(b.st || '');

for (const o of byPerson.values()) {
  if (isQ(o.name) || !o.img) continue; // uniquement les personnes avec une photo libre
  const pmTerms = [...o.pm.values()].sort(byDate);
  const pmYears = pmTerms.reduce((a, t) => a + Math.max((year(t.en) ?? 2026) - (year(t.st) ?? 2026), 0), 0);
  const ministries = [...o.ministries.values()].sort(byDate);
  const regional = [...o.regional.values()].sort(byDate);
  const mpTerms = [...o.mp.values()].sort(byDate);
  const legNums = [...new Set(mpTerms.map(t => t.leg?.n).filter(Boolean))].sort((a, b) => a - b);
  const govs = [...new Map([...pmTerms, ...ministries].filter(t => t.cab).sort(byDate).map(t => [t.cab.id, t.cab])).values()];
  if (o.current && !govs.some(g => g.id === o.current.cab.id)) govs.push(o.current.cab);

  let rarity, role, rolePos;
  if (pmTerms.length) { rarity = pmYears >= 6 ? 'mythique' : 'legendaire'; role = 'Premier ministre'; rolePos = PM; }
  else if (regional.length) { rarity = 'epique'; role = regional[0].label; rolePos = regional[0].pos; }
  else if (ministries.length) { rarity = 'rare'; role = ministries.at(-1).label; rolePos = ministries.at(-1).pos; }
  else if (mpTerms.length && o.img) { rarity = (legNums.length || mpTerms.length) >= 3 ? 'peu-commune' : 'commune'; role = 'Député fédéral'; rolePos = MP; }
  else if (!o.current) continue;
  if (o.current) {
    rarity = maxR(rarity || 'rare', o.current.vpm ? 'epique' : 'rare');
    role = o.current.pm ? 'Premier ministre' : o.current.role.replace(/^Vice-Premier ministre · /, '');
    rolePos = o.current.pm ? PM : o.current.vpm ? 'VPM' : 'MIN';
  }

  // Ligne de contexte : gouvernement ou législature
  let meta;
  if (o.current) meta = `En fonction · ${o.current.cab.name}`;
  else if (govs.length) meta = 'Gouv. ' + govs.slice(-2).map(g => g.name).join(', ') + (govs.length > 2 ? ` +${govs.length - 2}` : '');
  else if (regional.length) meta = span(regional[0].st, regional.at(-1).en);
  else if (legNums.length) {
    const last = legislatures.find(l => l.n === legNums.at(-1));
    meta = legNums.length === 1 ? legLabel(last) : legRange(legNums);
  } else meta = mpTerms.length ? span(mpTerms[0].st, mpTerms.at(-1).en) : '';

  const roles = [
    ...(o.current ? [`${o.current.role} — ${o.current.cab.name} (en fonction)`] : []),
    ...pmTerms.map(t => `Premier ministre${t.cab ? ` — Gouv. ${t.cab.name}` : ''}${span(t.st, t.en) ? ` (${span(t.st, t.en)})` : ''}`),
    ...regional.map(t => `${t.label}${span(t.st, t.en) ? ` (${span(t.st, t.en)})` : ''}`),
    ...ministries.map(t => `${t.label}${t.cab ? ` — Gouv. ${t.cab.name}` : ''}${span(t.st, t.en) ? ` (${span(t.st, t.en)})` : ''}`),
    ...(legNums.length
      ? legNums.map(n => 'Député fédéral — ' + legLabel(legislatures.find(l => l.n === n)))
      : mpTerms.length ? [`Député fédéral${span(mpTerms[0].st, mpTerms.at(-1).en) ? ` (${span(mpTerms[0].st, mpTerms.at(-1).en)})` : ''}`] : []),
  ];
  // Version structurée du parcours, pour l'afficher dans les deux langues
  const rolesData = [
    ...(o.current ? [{ pos: o.current.vpm ? 'VPM' : o.current.pm ? PM : 'MIN', fr: o.current.role, cab: o.current.cab.name, live: true }] : []),
    ...pmTerms.map(t => ({ pos: PM, fr: 'Premier ministre', cab: t.cab?.name, span: span(t.st, t.en) })),
    ...regional.map(t => ({ pos: t.pos, fr: t.label, span: span(t.st, t.en) })),
    ...ministries.map(t => ({ pos: t.pos, fr: t.label, cab: t.cab?.name, span: span(t.st, t.en) })),
    ...(legNums.length
      ? legNums.map(n => { const l = legislatures.find(x => x.n === n); return { pos: MP, fr: 'Député fédéral', leg: n, span: l.st ? span(l.st, l.en) : '' }; })
      : mpTerms.length ? [{ pos: MP, fr: 'Député fédéral', span: span(mpTerms[0].st, mpTerms.at(-1).en) }] : []),
  ];
  const partyQ = [...o.parties].find(q => SHORT[q]) || [...o.parties][0];
  const party = partyQ ? (SHORT[partyQ] || null) : null;
  const isMinister = pmTerms.length || ministries.length || o.current;
  cards.push({
    id: o.id, cat: 'politique', name: o.name, rarity, img: o.img || null,
    subtitle: cap(role), posId: rolePos, meta, current: !!o.current, party, family: partyFamily(partyQ), rolesData,
    stats: [
      ['Naissance', o.birth ?? '—'],
      o.death ? ['Décès', o.death] : ['Parti', party || '—'],
      pmTerms.length ? ['Années au 16', pmYears]
        : isMinister ? ['Gouvernements', govs.length || '—']
        : regional.length ? ['Mandats', regional.length]
        : ['Législatures', legNums.length || mpTerms.length],
    ],
    roles,
  });
}

// ---------- Monarchie ----------
const KINGS = ['Q12971', 'Q12967', 'Q55008046', 'Q12973', 'Q12976', 'Q3911', 'Q155004'];
const kings = await sparql(`
SELECT ?p ?pLabel ?img ?birth ?death ?st ?en WHERE {
  VALUES ?p { ${KINGS.map(q => 'wd:' + q).join(' ')} }
  ?p p:P39 ?s. ?s ps:P39 wd:Q13592862. OPTIONAL { ?s pq:P580 ?st } OPTIONAL { ?s pq:P582 ?en }
  OPTIONAL { ?p wdt:P18 ?img } OPTIONAL { ?p wdt:P569 ?birth } OPTIONAL { ?p wdt:P570 ?death }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
}`);
const kingSeen = new Set();
for (const k of kings.sort((a, b) => a.st.localeCompare(b.st))) {
  const id = qid(k.p);
  if (kingSeen.has(id) || !k.img) continue;
  kingSeen.add(id);
  const reign = (year(k.en) ?? 2026) - year(k.st);
  cards.push({
    id, cat: 'monarchie', name: k.pLabel.replace(/ de Belgique$/, ''), img: file(k.img),
    rarity: reign >= 40 ? 'mythique' : 'legendaire', family: 'royal',
    subtitle: 'Roi des Belges', meta: k.en ? `Règne ${year(k.st)}–${year(k.en)}` : `Règne depuis ${year(k.st)}`,
    current: !k.en, live: 'Sur le trône',
    stats: [['Naissance', year(k.birth) ?? '—'], k.death ? ['Décès', year(k.death)] : ['Statut', 'Règne'], ['Années de règne', reign]],
    roles: [`Roi des Belges (${span(k.st, k.en)})`],
  });
}

// ---------- Listes choisies à la main : titres Wikipédia → éléments Wikidata ----------
// Chaque entrée : 'Titre' (Wikipédia FR) ou 'nl:Titel' (Wikipédia NL).
// Titre introuvable : on cherche l'article le plus proche avec la recherche Wikipédia et on l'indique
// dans le journal (« Titre corrigé ») pour vérification. Si le résultat est faux, écrire le bon titre dans la liste.
async function searchTitle(lang, title) {
  const res = await wikiApi(lang, { action: 'query', list: 'search', srsearch: title.replace(/[()]/g, ' '), srnamespace: '0', srlimit: '1' });
  const hit = res.query?.search?.[0]?.title;
  if (!hit) return null;
  const pp = await wikiApi(lang, { action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', redirects: '1', titles: hit });
  const q = pp.query.pages[0]?.pageprops?.wikibase_item;
  if (q) console.warn(`Titre corrigé par recherche : « ${title} » → « ${hit} » (à vérifier)`);
  return q ? { q, title: hit } : null;
}
async function resolveTitles(entries) {
  const out = new Map(); // qid → entrée
  const missing = [];
  for (const lang of ['fr', 'nl']) {
    const todo = entries.filter(e => (e.title.startsWith('nl:') ? 'nl' : 'fr') === lang);
    for (let i = 0; i < todo.length; i += 50) {
      const batch = todo.slice(i, i + 50);
      const titles = batch.map(e => e.title.replace(/^nl:/, ''));
      const res = await wikiApi(lang, { action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', redirects: '1', titles: titles.join('|') });
      const alias = new Map([...(res.query.redirects || []), ...(res.query.normalized || [])].map(r => [r.from, r.to]));
      const byTitle = new Map(res.query.pages.map(p => [p.title, p.pageprops?.wikibase_item]));
      batch.forEach((e, k) => {
        const t = titles[k];
        const q = byTitle.get(alias.get(t) || t) || byTitle.get(alias.get(alias.get(t)) || '');
        if (q) out.set(q, e); else missing.push([lang, t, e]);
      });
    }
  }
  for (const [lang, t, e] of missing) {
    const hit = await searchTitle(lang, t);
    if (hit && !out.has(hit.q)) out.set(hit.q, { ...e, title: (lang === 'nl' ? 'nl:' : '') + hit.title });
    else if (!hit) console.warn('Introuvable sur Wikipédia :', e.title);
  }
  return out;
}
// Image libre : P18 sur Wikidata, sinon image principale (libre) de l'article Wikipédia FR
async function freePageImage(title, lang = 'fr') {
  const res = await wikiApi(lang, { action: 'query', prop: 'pageimages', piprop: 'name', pilicense: 'free', redirects: '1', titles: title });
  const f = res.query.pages[0]?.pageimage;
  return f ? f.replace(/_/g, ' ') : null;
}

// ---------- Culture & sport : personnalités populaires ----------
// Titres Wikipédia FR. La rareté dépend du nombre de Wikipédias qui ont un article sur la personne.
const FAMOUS = {
  bd: ['Hergé', 'André Franquin', 'Peyo', 'Morris (dessinateur)', 'Edgar P. Jacobs', 'Willy Vandersteen', 'Philippe Geluck', 'François Schuiten', 'Jean Roba', 'Marc Sleen'],
  musique: ['Jacques Brel', 'Stromae', 'Angèle (chanteuse)', 'Salvatore Adamo', 'Toots Thielemans', 'Django Reinhardt', 'Lara Fabian', 'Arno (chanteur)', 'Plastic Bertrand', 'Lost Frequencies', 'Selah Sue', 'Annie Cordy'],
  cinema: ['Jean-Claude Van Damme', 'Audrey Hepburn', 'Benoît Poelvoorde', 'Cécile de France', 'Matthias Schoenaerts', 'Jérémie Renier', 'Virginie Efira', 'Chantal Akerman', 'Jaco Van Dormael', 'François Damiens'],
  medias: ['Alex Vizorek', 'Charline Vanhoenacker', 'Bart Peeters', 'Gert Verhulst'],
  arts: ['René Magritte', 'Victor Horta', 'Amélie Nothomb', 'Georges Simenon'],
};
const DOMAIN_SHORT = { bd: 'BD', musique: 'Musique', cinema: 'Cinéma', medias: 'Médias', arts: 'Arts' };
const DOMAIN = { bd: 'Bande dessinée', musique: 'Musique', cinema: 'Cinéma', medias: 'Médias', arts: 'Arts' };
const famousQ = new Map([...(await resolveTitles(Object.entries(FAMOUS).flatMap(([dom, titles]) => titles.map(title => ({ title, dom })))))].map(([q, e]) => [q, e.dom]));
const famous = await sparql(`
SELECT ?p ?pLabel ?desc ?img ?birth ?death ?links WHERE {
  VALUES ?p { ${[...famousQ.keys()].map(q => 'wd:' + q).join(' ')} }
  ?p wdt:P31 wd:Q5; wikibase:sitelinks ?links.
  OPTIONAL { ?p wdt:P18 ?img } OPTIONAL { ?p wdt:P569 ?birth } OPTIONAL { ?p wdt:P570 ?death }
  OPTIONAL { ?p schema:description ?desc. FILTER(LANG(?desc) = "fr") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
}`);
const famousSeen = new Set();
let famousCount = 0;
for (const f of famous) {
  const id = qid(f.p);
  if (famousSeen.has(id)) continue;
  famousSeen.add(id);
  if (!f.img) { console.warn('Pas de photo libre, ignoré :', f.pLabel); continue; }
  const dom = famousQ.get(id);
  const links = +f.links;
  const rarity = links >= 90 ? 'legendaire' : links >= 55 ? 'epique' : links >= 30 ? 'rare' : links >= 15 ? 'peu-commune' : 'commune';
  const b = year(f.birth), d = year(f.death);
  cards.push({
    id, cat: 'culture', name: f.pLabel, img: file(f.img), rarity, family: dom,
    subtitle: f.desc ? cap(f.desc) : DOMAIN[dom], meta: DOMAIN[dom] + (b ? ` · ${b}${d ? '–' + d : ''}` : ''),
    stats: [['Naissance', b ?? '—'], d ? ['Décès', d] : ['Domaine', DOMAIN_SHORT[dom]], ['Wikipédias', links]],
  });
  famousCount++;
}
console.log(`Personnalités culture & sport : ${famousCount}`);

// ---------- Enseignement supérieur ----------
const SCHOOLS = [
  ...['Université catholique de Louvain (depuis 1968)', 'Katholieke Universiteit Leuven', 'Université libre de Bruxelles', 'Vrije Universiteit Brussel',
    'Université de Liège', 'Université de Gand', 'Université d\'Anvers', 'Université de Mons', 'Université de Namur',
    'Université Saint-Louis - Bruxelles', 'nl:Universiteit Hasselt', 'École royale militaire (Belgique)', 'Collège d\'Europe']
    .map(title => ({ title, kind: 'Université' })),
  ...['Haute école de la province de Liège', 'Haute École Léonard de Vinci', 'Haute École Bruxelles-Brabant',
    'Haute École Louvain en Hainaut', 'Haute École Galilée', 'Haute École de Namur-Liège-Luxembourg', 'Haute École Francisco Ferrer',
    'nl:Hogeschool Gent', 'nl:Arteveldehogeschool', 'nl:Karel de Grote Hogeschool', 'nl:Thomas More (hogeschool)',
    'nl:Erasmushogeschool Brussel', 'nl:Howest', 'nl:UC Leuven-Limburg', 'nl:Hogeschool PXL', 'nl:Odisee']
    .map(title => ({ title, kind: 'Haute école' })),
  ...['La Cambre (école)', 'Conservatoire royal de Bruxelles', 'Institut national supérieur des arts du spectacle',
    'Académie royale des beaux-arts de Bruxelles', 'Académie royale des beaux-arts d\'Anvers']
    .map(title => ({ title, kind: 'École d\'art' })),
];
const schoolQ = await resolveTitles(SCHOOLS);
const schools = await sparql(`
SELECT ?s ?sLabel ?img ?logo ?founded ?students ?cityLabel ?links WHERE {
  VALUES ?s { ${[...schoolQ.keys()].map(q => 'wd:' + q).join(' ')} }
  ?s wikibase:sitelinks ?links.
  OPTIONAL { ?s wdt:P18 ?img } OPTIONAL { ?s wdt:P154 ?logo } OPTIONAL { ?s wdt:P571 ?founded }
  OPTIONAL { ?s wdt:P2196 ?students } OPTIONAL { ?s wdt:P131 ?city }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,nl,mul,en". }
}`);
const schoolMap = new Map();
for (const r of schools) {
  const id = qid(r.s);
  const o = schoolMap.get(id) || { id, name: r.sLabel, img: file(r.img), logo: file(r.logo), founded: null, students: 0, city: null, links: +r.links };
  if (r.founded) o.founded = Math.min(o.founded ?? 9999, year(r.founded));
  o.students = Math.max(o.students, +r.students || 0);
  if (r.cityLabel && !isQ(r.cityLabel)) o.city ||= r.cityLabel;
  schoolMap.set(id, o);
}
const seenSchoolNames = new Set();
for (const o of schoolMap.values()) {
  const st = schoolQ.get(o.id).title;
  const img = o.img || o.logo || await freePageImage(st.replace(/^nl:/, ''), st.startsWith('nl:') ? 'nl' : 'fr');
  if (!img || seenSchoolNames.has(o.name)) { if (!img) console.warn('Pas d\'image libre, ignoré :', o.name); continue; }
  seenSchoolNames.add(o.name);
  const kind = schoolQ.get(o.id).kind;
  const s = o.students;
  const rarity = s >= 40000 ? 'legendaire' : s >= 20000 ? 'epique' : s >= 10000 ? 'rare' : s >= 4000 ? 'peu-commune'
    : !s && o.links >= 30 ? 'rare' : 'commune';
  cards.push({
    id: o.id, cat: 'enseignement', name: o.name, img, badge: o.img && o.logo ? o.logo : null, rarity,
    family: kind === 'Université' ? 'univ' : kind === 'Haute école' ? 'hautecole' : 'artschool',
    subtitle: kind, meta: [o.city, o.founded ? `fondée en ${o.founded}` : null].filter(Boolean).join(' · '),
    stats: [['Fondation', o.founded ?? '—'], ['Étudiants', s ? s.toLocaleString('fr-BE') : '—'], ['Ville', o.city || '—']],
  });
}

// ---------- Gastronomie ----------
const DISHES = [
  ['Frite', 'Snack', 'Belgique'], ['Moules-frites', 'Plat', 'Belgique'], ['Carbonade flamande', 'Plat', 'Flandre'],
  ['Waterzooi', 'Plat', 'Flandre'], ['Gaufre de Bruxelles', 'Sucré', 'Bruxelles'], ['Gaufre de Liège', 'Sucré', 'Wallonie'],
  ['Boulets à la liégeoise', 'Plat', 'Wallonie'], ['Chicons au gratin', 'Plat', 'Belgique', 'Chicons au gratin'], ['Stoemp', 'Plat', 'Bruxelles'],
  ['Spéculoos', 'Sucré', 'Belgique'], ['Cuberdon', 'Sucré', 'Flandre'], ['Praline (chocolat)', 'Sucré', 'Bruxelles'],
  ['Filet américain', 'Plat', 'Belgique', 'Filet américain'], ['Croquettes aux crevettes', 'Plat', 'Flandre'], ['Mitraillette (cuisine)', 'Snack', 'Bruxelles'],
  ['Sirop de Liège', 'Sucré', 'Wallonie'], ['Tarte au riz', 'Sucré', 'Wallonie'], ['Couque de Dinant', 'Sucré', 'Wallonie'],
  ['Escavèche', 'Plat', 'Wallonie'], ['Anguilles au vert', 'Plat', 'Flandre'], ['Cramique', 'Sucré', 'Belgique'],
  ['Salade liégeoise', 'Plat', 'Wallonie'], ['Lapin aux pruneaux', 'Plat', 'Belgique'], ['Fricadelle', 'Snack', 'Belgique'],
  ['Vol-au-vent', 'Plat', 'Belgique'], ['Sauce andalouse', 'Snack', 'Belgique'],
].map(([title, kind, region, name]) => ({ title, kind, region, name })); // name : nom affiché imposé (sinon libellé Wikidata)
const dishQ = await resolveTitles(DISHES);
const dishes = await sparql(`
SELECT ?d ?dLabel ?img ?links WHERE {
  VALUES ?d { ${[...dishQ.keys()].map(q => 'wd:' + q).join(' ')} }
  ?d wikibase:sitelinks ?links. OPTIONAL { ?d wdt:P18 ?img }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
}`);
const dishSeen = new Set();
for (const r of dishes) {
  const id = qid(r.d);
  if (dishSeen.has(id)) continue;
  dishSeen.add(id);
  const e = dishQ.get(id);
  const img = file(r.img) || await freePageImage(e.title);
  if (!img) { console.warn('Pas d\'image libre, ignoré :', r.dLabel); continue; }
  const links = +r.links;
  const rarity = links >= 40 ? 'legendaire' : links >= 20 ? 'epique' : links >= 10 ? 'rare' : links >= 5 ? 'peu-commune' : 'commune';
  cards.push({
    id, cat: 'gastronomie', name: e.name || cap(r.dLabel), img, rarity,
    family: { Flandre: 'flandre', Wallonie: 'wallonie', Bruxelles: 'bruxelles' }[e.region] || 'gastro',
    subtitle: e.kind === 'Sucré' ? 'Douceur' : e.kind === 'Snack' ? 'Snack' : 'Plat',
    meta: `Spécialité · ${e.region}`,
    stats: [['Type', e.kind], ['Région', e.region], ['Wikipédias', links]],
  });
}
console.log(`Enseignement : ${cards.filter(c => c.cat === 'enseignement').length} · Gastronomie : ${cards.filter(c => c.cat === 'gastronomie').length}`);

// ---------- Sport ----------
const SPORTS = {
  Football: ['Eden Hazard', 'Kevin De Bruyne', 'Romelu Lukaku', 'Thibaut Courtois', 'Vincent Kompany', 'Jan Ceulemans', 'Enzo Scifo',
    'Paul Van Himst', 'Jean-Marie Pfaff', 'Marc Wilmots', 'Axel Witsel', 'Dries Mertens', 'Toby Alderweireld', 'Jan Vertonghen',
    'Youri Tielemans', 'Jérémy Doku', 'Leandro Trossard', 'Michel Preud\'homme', 'Franky Vercauteren', 'Tessa Wullaert'],
  Cyclisme: ['Eddy Merckx', 'Remco Evenepoel', 'Wout van Aert', 'Tom Boonen', 'Philippe Gilbert', 'Rik Van Looy', 'Greg Van Avermaet',
    'Johan Museeuw', 'Lucien Van Impe', 'Sven Nys', 'Jasper Philipsen', 'Lotte Kopecky'],
  Tennis: ['Kim Clijsters', 'Justine Henin', 'David Goffin', 'Elise Mertens', 'Xavier Malisse', 'Kirsten Flipkens'],
  Athlétisme: ['Nafissatou Thiam', 'Kim Gevaert', 'Tia Hellebaut', 'Gaston Roelants', 'Ivo Van Damme', 'Bashir Abdi', 'Kevin Borlée', 'Jonathan Borlée'],
  'Sports mécaniques': ['Jacky Ickx', 'Thierry Boutsen', 'Stoffel Vandoorne', 'Stefan Everts', 'Joël Robert', 'Roger De Coster'],
  Autres: ['Frederik Deburghgraeve', 'Robert Van de Walle', 'Ingrid Berghmans', 'Ulla Werbrouck', 'Matthias Casse', 'Emma Meesseman',
    'Ann Wauters', 'Luca Brecel', 'Dimitri Van den Bergh'],
};
const discOf = d => { const m = (d || '').toLowerCase().match(/fléchettes|judo|judoka|snooker|basket|natation|nageu|gymnast|hockey|motocross/); return m ? ({ judoka: 'Judo', nageu: 'Natation', gymnast: 'Gymnastique', motocross: 'Motocross', fléchettes: 'Fléchettes' }[m[0]] || m[0][0].toUpperCase() + m[0].slice(1)) : 'Sport'; };
const sportQ = await resolveTitles(Object.entries(SPORTS).flatMap(([sport, titles]) => titles.map(title => ({ title, sport }))));
const sportRows = await sparql(`
SELECT ?p ?pLabel ?desc ?img ?birth ?death ?links WHERE {
  VALUES ?p { ${[...sportQ.keys()].map(q => 'wd:' + q).join(' ')} }
  ?p wdt:P31 wd:Q5; wikibase:sitelinks ?links.
  OPTIONAL { ?p wdt:P18 ?img } OPTIONAL { ?p wdt:P569 ?birth } OPTIONAL { ?p wdt:P570 ?death }
  OPTIONAL { ?p schema:description ?desc. FILTER(LANG(?desc) = "fr") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
}`);
const sportSeen = new Set();
for (const f of sportRows) {
  const id = qid(f.p);
  if (sportSeen.has(id)) continue;
  sportSeen.add(id);
  if (!f.img) { console.warn('Pas de photo libre, ignoré :', f.pLabel); continue; }
  const sport = sportQ.get(id).sport;
  const links = +f.links;
  const rarity = links >= 70 ? 'legendaire' : links >= 40 ? 'epique' : links >= 22 ? 'rare' : links >= 12 ? 'peu-commune' : 'commune';
  const b = year(f.birth), d = year(f.death);
  cards.push({
    id, cat: 'sport', name: f.pLabel, img: file(f.img), rarity, family: 'sport',
    subtitle: f.desc ? cap(f.desc) : sport, meta: (sport === 'Autres' ? discOf(f.desc) : sport) + (b ? ` · ${b}` : ''),
    stats: [['Naissance', b ?? '—'], d ? ['Décès', d] : ['Discipline', sport === 'Sports mécaniques' ? 'Moteur' : sport === 'Autres' ? discOf(f.desc) : sport], ['Wikipédias', links]],
  });
}
console.log(`Sport : ${cards.filter(c => c.cat === 'sport').length}`);

// ---------- Sciences : savants, inventeurs, explorateurs ----------
const SCIENCES = {
  'Physique & astronomie': ['Georges Lemaître', 'François Englert', 'Ilya Prigogine', 'Adolphe Quetelet', 'Simon Stevin', 'Jean-Baptiste Van Helmont'],
  'Médecine & biologie': ['André Vésale', 'Christian de Duve', 'Albert Claude', 'Jules Bordet', 'Corneille Heymans', 'Paul Janssen', 'Peter Piot',
    'Marc Van Montagu', 'Rembert Dodoens', 'Édouard Van Beneden'],
  Inventions: ['Adolphe Sax', 'Zénobe Gramme', 'Leo Baekeland', 'Étienne Lenoir', 'Jean-Pierre Minckelers', 'Jean-Joseph Merlin', 'Robert Cailliau',
    'Charles Van Depoele', 'Lieven Gevaert', 'Ernest Solvay'],
  Mathématiques: ['Gérard Mercator', 'Pierre Deligne', 'Ingrid Daubechies', 'Jean Bourgain', 'Grégoire de Saint-Vincent'],
  'Espace & exploration': ['Frank De Winne', 'Dirk Frimout', 'Adrien de Gerlache', 'Paul Otlet'],
};
const sciQ = await resolveTitles(Object.entries(SCIENCES).flatMap(([field, titles]) => titles.map(title => ({ title, field }))));
const sciRows = await sparql(`
SELECT ?p ?pLabel ?desc ?img ?birth ?death ?links WHERE {
  VALUES ?p { ${[...sciQ.keys()].map(q => 'wd:' + q).join(' ')} }
  ?p wdt:P31 wd:Q5; wikibase:sitelinks ?links.
  OPTIONAL { ?p wdt:P18 ?img } OPTIONAL { ?p wdt:P569 ?birth } OPTIONAL { ?p wdt:P570 ?death }
  OPTIONAL { ?p schema:description ?desc. FILTER(LANG(?desc) = "fr") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
}`);
const sciSeen = new Set();
for (const f of sciRows) {
  const id = qid(f.p);
  if (sciSeen.has(id) || cards.some(c => c.id === id)) continue;
  sciSeen.add(id);
  if (!f.img) { console.warn('Pas de photo libre, ignoré :', f.pLabel); continue; }
  const field = sciQ.get(id).field;
  const links = +f.links;
  const b = year(f.birth), d = year(f.death);
  cards.push({
    id, cat: 'science', name: f.pLabel, img: file(f.img), rarity: 'commune', family: 'science',
    subtitle: f.desc ? cap(f.desc) : field, meta: field + (b ? ` · ${b}${d ? '–' + d : ''}` : ''),
    stats: [['Naissance', b ?? '—'], d ? ['Décès', d] : ['Domaine', field.split(' & ')[0]], ['Wikipédias', links]],
  });
}
console.log(`Sciences : ${cards.filter(c => c.cat === 'science').length}`);

// ---------- Œuvres d'art (domaine public ou liberté de panorama) ----------
const ARTWORKS = [
  'Retable de l\'Agneau mystique', 'Les Époux Arnolfini', 'La Vierge du chancelier Rolin', 'Chasseurs dans la neige (Brueghel)',
  'La Tour de Babel (Brueghel)', 'Paysage avec la chute d\'Icare', 'Les Proverbes flamands', 'Le Triomphe de la Mort',
  'Le Repas de noce', 'L\'Érection de la Croix', 'La Descente de croix (Rubens, Anvers)', 'La Descente de croix (Rogier van der Weyden)',
  'Châsse de sainte Ursule', 'L\'Entrée du Christ à Bruxelles', 'Des caresses',
  'Manneken-Pis', 'Atomium', 'Hôtel Tassel', 'Palais Stoclet', 'Le Combat de Carnaval et Carême', 'La Parabole des aveugles',
].map(title => ({ title }));
const artQ = await resolveTitles(ARTWORKS);
const artRows = await sparql(`
SELECT ?a ?aLabel ?img ?inc ?creatorLabel ?placeLabel ?links WHERE {
  VALUES ?a { ${[...artQ.keys()].map(q => 'wd:' + q).join(' ')} }
  ?a wikibase:sitelinks ?links. OPTIONAL { ?a wdt:P18 ?img } OPTIONAL { ?a wdt:P571 ?inc }
  OPTIONAL { ?a wdt:P170 ?creator } OPTIONAL { ?a wdt:P84 ?creator }
  OPTIONAL { ?a wdt:P276 ?place } OPTIONAL { ?a wdt:P131 ?place }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
}`);
const artMap = new Map();
for (const r of artRows) {
  const id = qid(r.a);
  const o = artMap.get(id) || { id, name: r.aLabel, img: file(r.img), inc: year(r.inc), creator: null, place: null, links: +r.links };
  if (r.creatorLabel && !isQ(r.creatorLabel)) o.creator ||= r.creatorLabel;
  if (r.placeLabel && !isQ(r.placeLabel)) o.place ||= r.placeLabel;
  artMap.set(id, o);
}
for (const o of artMap.values()) {
  const img = o.img || await freePageImage(artQ.get(o.id).title);
  if (!img) { console.warn('Pas d\'image libre, ignoré :', o.name); continue; }
  const l = o.links;
  const rarity = l >= 60 ? 'legendaire' : l >= 35 ? 'epique' : l >= 20 ? 'rare' : l >= 10 ? 'peu-commune' : 'commune';
  const creator = o.creator ? o.creator.replace(/ l'Ancien$/, ' l’Ancien') : null;
  cards.push({
    id: o.id, cat: 'art', name: cap(o.name), img, rarity, family: 'art', artwork: true,
    subtitle: creator || 'Œuvre', meta: [o.inc, o.place].filter(Boolean).join(' · '),
    stats: [['Année', o.inc ?? '—'], ['Artiste', creator ? creator.split(' ').slice(-1)[0] : '—'], ['Wikipédias', l]],
  });
}
console.log(`Œuvres d'art : ${cards.filter(c => c.cat === 'art').length}`);

// ---------- Catégories choisies à la main : bières, monuments, châteaux, folklore, groupes, festivals ----------
// Chaque entrée : [titre Wikipédia FR, étiquette, région]. La rareté dépend du nombre de Wikipédias.
async function curated(cat, entries, { family, thresholds: [L, E, Ra, P], kindLabel, stats }) {
  const list = entries.map(([title, kind, region, extra]) => ({ title, kind, region, extra }));
  const qmap = await resolveTitles(list);
  const rows = await sparql(`
  SELECT ?x ?xLabel ?desc ?img ?inc ?placeLabel ?genreLabel ?links ?unesco WHERE {
    VALUES ?x { ${[...qmap.keys()].map(q => 'wd:' + q).join(' ')} }
    ?x wikibase:sitelinks ?links.
    OPTIONAL { ?x wdt:P18 ?img } OPTIONAL { ?x wdt:P571 ?inc }
    OPTIONAL { ?x wdt:P131 ?place } OPTIONAL { ?x wdt:P136 ?genre }
    OPTIONAL { ?x wdt:P1435 wd:Q9259. BIND(true AS ?unesco) }
    OPTIONAL { ?x schema:description ?desc. FILTER(LANG(?desc) = "fr") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,nl,mul,en". }
  }`);
  const byId = new Map();
  for (const r of rows) {
    const id = qid(r.x);
    const o = byId.get(id) || { id, name: r.xLabel, desc: r.desc, img: file(r.img), inc: year(r.inc), place: null, genre: null, links: +r.links, unesco: !!r.unesco };
    if (r.placeLabel && !isQ(r.placeLabel)) o.place ||= r.placeLabel;
    if (r.genreLabel && !isQ(r.genreLabel)) o.genre ||= r.genreLabel;
    byId.set(id, o);
  }
  let n = 0;
  for (const o of byId.values()) {
    if (cards.some(c => c.id === o.id)) continue; // déjà présent dans une autre catégorie
    const e = qmap.get(o.id);
    const img = o.img || await freePageImage(e.title);
    if (!img) { console.warn('Pas d\'image libre, ignoré :', o.name); continue; }
    const l = o.links;
    let rarity = l >= L ? 'legendaire' : l >= E ? 'epique' : l >= Ra ? 'rare' : l >= P ? 'peu-commune' : 'commune';
    if (e.extra === 'mythique') rarity = 'mythique';
    const forceRarity = e.extra === 'mythique' ? 'mythique' : undefined;
    cards.push({
      id: o.id, cat, name: cap(o.name.replace(/ \((bière|groupe|festival)\)$/, '')), img, rarity,
      family: typeof family === 'function' ? family(e) : family,
      subtitle: e.kind || kindLabel, meta: [e.region || o.place, o.inc].filter(Boolean).join(' · '),
      unesco: o.unesco || e.extra === 'unesco' || undefined, forceRarity,
      stats: stats(o, e),
    });
    n++;
  }
  console.log(`${cat} : ${n}`);
}
const regionFamily = e => ({ Flandre: 'flandre', Wallonie: 'wallonie', Bruxelles: 'bruxelles' }[e.region]);

await curated('biere', [
  ['Orval (bière)', 'Trappiste', 'Wallonie'], ['Chimay (bière)', 'Trappiste', 'Wallonie'], ['Westmalle (bière)', 'Trappiste', 'Flandre'],
  ['Rochefort (bière)', 'Trappiste', 'Wallonie'], ['Westvleteren (bière)', 'Trappiste', 'Flandre', 'mythique'], ['Achel (bière)', 'Trappiste', 'Flandre'],
  ['Duvel', 'Blonde forte', 'Flandre'], ['Leffe', 'Abbaye', 'Wallonie'], ['Hoegaarden (bière)', 'Blanche', 'Flandre'],
  ['Stella Artois', 'Pils', 'Flandre'], ['Jupiler', 'Pils', 'Wallonie'], ['Pauwel Kwak', 'Ambrée', 'Flandre'],
  ['Delirium Tremens (bière)', 'Blonde forte', 'Flandre'], ['La Chouffe', 'Blonde', 'Wallonie'], ['Kriek', 'Lambic', 'Bruxelles'],
  ['Gueuze', 'Lambic', 'Bruxelles'], ['Lambic', 'Lambic', 'Bruxelles'], ['Tripel Karmeliet', 'Triple', 'Flandre'],
  ['Brasserie Cantillon', 'Brasserie', 'Bruxelles'], ['Rodenbach (bière)', 'Rouge des Flandres', 'Flandre'], ['Brugse Zot', 'Blonde', 'Flandre'],
  ['Grimbergen (bière)', 'Abbaye', 'Flandre'], ['Affligem (bière)', 'Abbaye', 'Flandre'], ['Saison Dupont', 'Saison', 'Wallonie'],
], { family: 'biere', thresholds: [25, 15, 9, 5], kindLabel: 'Bière',
  stats: (o, e) => [['Type', e.kind], ['Région', e.region], ['Wikipédias', o.links]] });

await curated('monument', [
  ['Grand-Place de Bruxelles', 'Place', 'Bruxelles'], ['Palais royal de Bruxelles', 'Palais', 'Bruxelles'], ['Palais de justice de Bruxelles', 'Palais', 'Bruxelles'],
  ['Basilique du Sacré-Cœur de Koekelberg', 'Basilique', 'Bruxelles'], ['Cathédrale Notre-Dame d\'Anvers', 'Cathédrale', 'Flandre'], ['Beffroi de Bruges', 'Beffroi', 'Flandre'],
  ['Cathédrale Saint-Bavon de Gand', 'Cathédrale', 'Flandre'], ['Cathédrale Saints-Michel-et-Gudule de Bruxelles', 'Cathédrale', 'Bruxelles'], ['Galeries royales Saint-Hubert', 'Galerie', 'Bruxelles'],
  ['Arcade du Cinquantenaire', 'Arc', 'Bruxelles'], ['Gare d\'Anvers-Central', 'Gare', 'Flandre'], ['Beffroi de Mons', 'Beffroi', 'Wallonie'],
  ['Citadelle de Namur', 'Citadelle', 'Wallonie'], ['Ascenseur funiculaire de Strépy-Thieu', 'Ouvrage d\'art', 'Wallonie'], ['Plan incliné de Ronquières', 'Ouvrage d\'art', 'Wallonie'],
  ['Collégiale Notre-Dame de Dinant', 'Collégiale', 'Wallonie'], ['Porte de Hal', 'Porte', 'Bruxelles'], ['Porte de Menin', 'Mémorial', 'Flandre'],
  ['Halle aux draps d\'Ypres', 'Halle', 'Flandre'], ['Abbaye de Villers', 'Abbaye', 'Wallonie'], ['Gare de Liège-Guillemins', 'Gare', 'Wallonie'],
  ['Mont des Arts', 'Jardin', 'Bruxelles'], ['Serres royales de Laeken', 'Serres', 'Bruxelles'], ['Hôtel de ville de Louvain', 'Hôtel de ville', 'Flandre'],
  ['Hôtel de ville de Bruxelles', 'Hôtel de ville', 'Bruxelles'], ['Béguinage de Bruges', 'Béguinage', 'Flandre'],
], { family: regionFamily, thresholds: [40, 22, 12, 6], kindLabel: 'Monument',
  stats: (o, e) => [['Type', e.kind], ['Année', o.inc ?? '—'], ['Wikipédias', o.links]] });

await curated('chateau', [
  ['Château des Comtes de Gand', 'Château fort', 'Flandre'], ['Château de Bouillon', 'Château fort', 'Wallonie'], ['Château de Belœil', 'Château', 'Wallonie'],
  ['Château de Gaasbeek', 'Château', 'Flandre'], ['Château royal de Laeken', 'Résidence royale', 'Bruxelles'], ['Château de Vêves', 'Château fort', 'Wallonie'],
  ['Château de Walzin', 'Château', 'Wallonie'], ['Château de Modave', 'Château', 'Wallonie'], ['Château de Reinhardstein', 'Château fort', 'Wallonie'],
  ['Château de Beersel', 'Château fort', 'Flandre'], ['Château de Bouchout', 'Château', 'Flandre'], ['Château de Horst', 'Château', 'Flandre'],
  ['Château de Freÿr', 'Château', 'Wallonie'], ['Château de Jehay', 'Château', 'Wallonie'], ['Château de Spontin', 'Château fort', 'Wallonie'],
  ['Château d\'Ooidonk', 'Château', 'Flandre'], ['Château de La Roche-en-Ardenne', 'Ruines', 'Wallonie'], ['Château de Franchimont', 'Ruines', 'Wallonie'],
  ['Château de Chimay', 'Château', 'Wallonie'], ['Steen (Anvers)', 'Château fort', 'Flandre'], ['Château de Corroy-le-Château', 'Château fort', 'Wallonie'],
], { family: regionFamily, thresholds: [25, 14, 8, 5], kindLabel: 'Château',
  stats: (o, e) => [['Type', e.kind], ['Année', o.inc ?? '—'], ['Wikipédias', o.links]] });

await curated('folklore', [
  ['Carnaval de Binche', 'Carnaval', 'Wallonie', 'unesco'], ['Gille (folklore)', 'Personnage', 'Wallonie'], ['Ducasse de Mons', 'Ducasse', 'Wallonie', 'unesco'],
  ['Ommegang de Bruxelles', 'Cortège', 'Bruxelles', 'unesco'], ['Ducasse d\'Ath', 'Ducasse', 'Wallonie', 'unesco'], ['Procession du Saint-Sang', 'Procession', 'Flandre', 'unesco'],
  ['Meyboom', 'Fête', 'Bruxelles', 'unesco'], ['Kattenstoet', 'Cortège', 'Flandre'], ['Marches de l\'Entre-Sambre-et-Meuse', 'Marche', 'Wallonie', 'unesco'],
  ['Carnaval d\'Alost', 'Carnaval', 'Flandre'], ['Cwarmê', 'Carnaval', 'Wallonie', 'unesco'], ['Laetare de Stavelot', 'Carnaval', 'Wallonie'],
  ['Tchantchès', 'Personnage', 'Wallonie'], ['Saint-Nicolas en Belgique', 'Fête', 'Belgique'], ['Géant processionnel', 'Tradition', 'Belgique', 'unesco'],
  ['Pêche à la crevette à cheval', 'Tradition', 'Flandre', 'unesco'], ['Fêtes de Wallonie', 'Fête', 'Wallonie'], ['Tour Sainte-Gertrude', 'Procession', 'Wallonie'],
], { family: 'folklore', thresholds: [20, 10, 6, 3], kindLabel: 'Folklore',
  stats: (o, e) => [['Type', e.kind], ['Région', e.region], ['UNESCO', e.extra === 'unesco' ? 'Oui' : '—']] });

await curated('groupe', [
  ['dEUS', 'Rock', 'Flandre'], ['Hooverphonic', 'Trip hop', 'Flandre'], ['Front 242', 'EBM', 'Bruxelles'], ['K\'s Choice', 'Rock', 'Flandre'],
  ['Girls in Hawaii', 'Indie', 'Wallonie'], ['Technotronic', 'Dance', 'Bruxelles'], ['Vaya Con Dios (groupe)', 'Pop', 'Bruxelles'], ['Soulwax', 'Électro', 'Flandre'],
  ['Ghinzu', 'Rock', 'Bruxelles'], ['Clouseau (groupe)', 'Pop', 'Flandre'], ['Milk Inc.', 'Dance', 'Flandre'], ['Triggerfinger', 'Rock', 'Flandre'],
  ['Oscar and the Wolf', 'Pop', 'Flandre'], ['Balthazar (groupe)', 'Indie', 'Flandre'], ['Puggy', 'Pop rock', 'Bruxelles'], ['Telex (groupe)', 'Synthpop', 'Bruxelles'],
  ['Dimitri Vegas et Like Mike', 'EDM', 'Flandre'], ['Arsenal (groupe)', 'Électro', 'Flandre'], ['Mud Flow', 'Rock', 'Bruxelles'], ['Les Snuls', 'Humour', 'Bruxelles'],
], { family: 'groupe', thresholds: [35, 20, 12, 6], kindLabel: 'Groupe',
  stats: (o, e) => [['Genre', e.kind], ['Formation', o.inc ?? '—'], ['Wikipédias', o.links]] });

await curated('festival', [
  ['Tomorrowland (festival)', 'Électro', 'Flandre'], ['Rock Werchter', 'Rock', 'Flandre'], ['Dour Festival', 'Alternatif', 'Wallonie'],
  ['Francofolies de Spa', 'Chanson', 'Wallonie'], ['Pukkelpop', 'Rock', 'Flandre'], ['Graspop Metal Meeting', 'Metal', 'Flandre'],
  ['Les Ardentes', 'Hip-hop', 'Wallonie'], ['Couleur Café', 'Musiques du monde', 'Bruxelles'], ['Fêtes de Gand', 'Fête populaire', 'Flandre'],
  ['Esperanzah!', 'Musiques du monde', 'Wallonie'], ['Lokerse Feesten', 'Rock', 'Flandre'], ['Brussels International Fantastic Film Festival', 'Cinéma', 'Bruxelles'],
  ['Ronquières Festival', 'Pop', 'Wallonie'], ['Festival international du film francophone de Namur', 'Cinéma', 'Wallonie'], ['Brussels Jazz Marathon', 'Jazz', 'Bruxelles'],
], { family: 'festival', thresholds: [25, 14, 8, 4], kindLabel: 'Festival',
  stats: (o, e) => [['Genre', e.kind], ['Création', o.inc ?? '—'], ['Wikipédias', o.links]] });

// ---------- Communes ----------
const PROVINCE_FIX = { Q83407: 'Hainaut' }; // Mons
const communes = await sparql(`
SELECT ?c ?cLabel ?img ?coa ?pop ?area ?provLabel WHERE {
  ?c wdt:P31 wd:Q493522. FILTER NOT EXISTS { ?c wdt:P576 ?d }
  OPTIONAL { ?c wdt:P18 ?img } OPTIONAL { ?c wdt:P94 ?coa }
  OPTIONAL { ?c wdt:P1082 ?pop } OPTIONAL { ?c wdt:P2046 ?area }
  OPTIONAL { ?c wdt:P131+ ?prov. ?prov wdt:P31 wd:Q83116. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,nl,de,mul,en". }
}`);
const provName = s => s.replace(/^[Pp]rovince d(e |')/, '').replace(/^./, c => c.toUpperCase());
const comm = new Map();
for (const r of communes) {
  const id = qid(r.c);
  const o = comm.get(id) || { id, name: r.cLabel, img: file(r.img), coa: file(r.coa), pop: 0, area: null, prov: null };
  o.pop = Math.max(o.pop, +r.pop || 0); // plusieurs valeurs historiques : on garde la plus grande
  if (r.area) o.area = Math.round(+r.area * 10) / 10;
  if (r.provLabel) o.prov = provName(r.provLabel);
  else if (!o.prov && PROVINCE_FIX[id]) o.prov = PROVINCE_FIX[id]; // province absente sur Wikidata
  comm.set(id, o);
}
for (const o of comm.values()) {
  const p = o.pop;
  const rarity = p >= 150000 ? 'legendaire' : p >= 60000 ? 'epique' : p >= 25000 ? 'rare' : p >= 12000 ? 'peu-commune' : 'commune';
  cards.push({
    id: o.id, cat: 'commune', name: o.name, rarity, img: o.img || o.coa || null, badge: o.coa || null,
    subtitle: o.prov ? (/^[AEIOUÉ]/.test(o.prov) ? `Province d’${o.prov}` : `Province de ${o.prov}`) : 'Bruxelles-Capitale',
    stats: [
      ['Habitants', p ? p.toLocaleString('fr-BE') : '—'],
      ['Superficie', o.area ? o.area.toLocaleString('fr-BE') + ' km²' : '—'],
      ['Densité', p && o.area ? Math.round(p / o.area).toLocaleString('fr-BE') + '/km²' : '—'],
    ],
  });
}

// ---------- Provinces & régions ----------
const terr = await sparql(`
SELECT ?t ?tLabel ?type ?img ?coa ?flag ?pop ?area ?capLabel WHERE {
  { ?t wdt:P31 wd:Q83116. FILTER NOT EXISTS { ?t wdt:P576 ?d } BIND("province" AS ?type) }
  UNION { VALUES ?t { wd:Q9337 wd:Q231 wd:Q240 } BIND("region" AS ?type) }
  OPTIONAL { ?t wdt:P18 ?img } OPTIONAL { ?t wdt:P94 ?coa } OPTIONAL { ?t wdt:P41 ?flag }
  OPTIONAL { ?t wdt:P1082 ?pop } OPTIONAL { ?t wdt:P2046 ?area } OPTIONAL { ?t wdt:P36 ?cap }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
}`);
const tm = new Map();
for (const r of terr) {
  const o = tm.get(r.t) || {
    id: qid(r.t), name: r.tLabel, type: r.type, img: file(r.img), badge: file(r.coa) || file(r.flag),
    pop: 0, area: null, cap: isQ(r.capLabel) ? null : r.capLabel,
  };
  o.pop = Math.max(o.pop, +r.pop || 0);
  if (r.area) o.area = Math.round(+r.area);
  tm.set(r.t, o);
}
for (const o of tm.values()) {
  const name = o.id === 'Q231' ? 'Région wallonne' : provName(o.name);
  cards.push({
    id: o.id, cat: o.type, name, rarity: o.type === 'region' ? 'legendaire' : 'epique',
    img: o.img || o.badge || null, badge: o.badge || null,
    subtitle: o.type === 'region' ? 'Région' : 'Province',
    stats: [
      ['Habitants', o.pop ? o.pop.toLocaleString('fr-BE') : '—'],
      ['Superficie', o.area ? o.area.toLocaleString('fr-BE') + ' km²' : '—'],
      ['Chef-lieu', o.cap || '—'],
    ],
  });
}

// ---------- Événements (écrits à la main) ----------
const EVENTS = [
  ['ev-541', '541 jours', '2010 – 2011',
    'Record de durée de formation d’un gouvernement : 541 jours entre les élections de juin 2010 et l’installation du gouvernement Di Rupo.',
    [['Jours', 541], ['Élections', 2010], ['Gouvernement', 2011]]],
  ['ev-fusion77', 'Fusion des communes', '1977',
    'En une seule réforme, la Belgique passe de 2 359 à 596 communes.',
    [['Avant', '2 359'], ['Après', 596], ['Année', 1977]]],
  ['ev-fusion25', 'Fusions de 2025', '2025',
    'Une nouvelle vague de fusions en Flandre ramène le pays à 565 communes.',
    [['Communes', 565], ['Année', 2025], ['Région', 'Flandre']]],
  ['ev-federal', 'État fédéral', '1993',
    'Les accords de la Saint-Michel font de la Belgique un État fédéral, inscrit dans la Constitution.',
    [['Année', 1993], ['Régions', 3], ['Communautés', 3]]],
  ['ev-vote', 'Vote des femmes', '1948',
    'Les femmes obtiennent le droit de vote aux élections législatives, exercé pour la première fois en 1949.',
    [['Loi', 1948], ['1er scrutin', 1949], ['Niveau', 'National']]],
  ['ev-question', 'Question royale', '1950',
    'Consultation populaire sur le retour de Léopold III, suivie de son abdication en faveur de Baudouin.',
    [['Consultation', 1950], ['Abdication', 1951], ['Successeur', 'Baudouin']]],
];
for (const [id, name, subtitle, text, stats] of EVENTS)
  cards.push({ id, cat: 'evenement', name, rarity: 'mythique', img: null, subtitle, text, stats });

// ---------- Photos alternatives (pour la version « Plein cadre ») ----------
// On prend une autre photo libre dans la catégorie Commons de la personne, si elle existe.
const ALT_CATS = new Set(['culture', 'sport', 'science', 'monarchie']);
const altTargets = cards.filter(c => c.img && (ALT_CATS.has(c.cat) || (c.cat === 'politique' && (c.current || ['epique', 'legendaire', 'mythique'].includes(c.rarity)))));
const commonsCats = new Map();
for (let i = 0; i < altTargets.length; i += 200) {
  const rows = await sparql(`SELECT ?p ?cat WHERE { VALUES ?p { ${altTargets.slice(i, i + 200).map(c => 'wd:' + c.id).join(' ')} } ?p wdt:P373 ?cat. }`);
  for (const r of rows) commonsCats.set(qid(r.p), r.cat);
}
async function commonsApi(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  return getJSON(url, { delay: 300, label: 'Commons' });
}
const BAD_FILE = /signature|autograph|grave|graf|tomb|plaque|logo|coat|wapen|blason|map|carte|stamp|timbre|postzegel|poster|affiche|statue|standbeeld|monument|cover|pochette|\.svg$|\.tif/i;
let altFound = 0;
for (const c of altTargets) {
  const cat = commonsCats.get(c.id);
  if (!cat) continue;
  const res = await commonsApi({ action: 'query', list: 'categorymembers', cmtitle: 'Category:' + cat, cmtype: 'file', cmlimit: '60' });
  const surname = c.name.split(' ').filter(w => w.length > 2).pop()?.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const files = (res.query?.categorymembers || []).map(m => m.title.replace(/^File:/, ''))
    .filter(f => /\.jpe?g$/i.test(f) && !BAD_FILE.test(f) && f !== c.img);
  const pick = files.find(f => surname && f.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(surname));
  if (pick) { c.alt = pick; altFound++; }
}
console.log(`Photos alternatives : ${altFound} / ${altTargets.length}`);

// ---------- Nettoyage avant le calcul des raretés ----------
// Pas d'image libre → pas de carte (sauf les événements, qui n'en ont jamais).
// Une même entité dans deux catégories (ex. Ulla Werbrouck, judokate et députée) : une seule carte,
// celle hors Politique, car l'identifiant sert de clé dans les sauvegardes.
{
  const keep = new Map();
  for (const c of cards) {
    if (!c.img && c.cat !== 'evenement') { console.warn("Pas d'image libre, ignoré :", c.name, `(${c.cat})`); continue; }
    const prev = keep.get(c.id);
    if (prev) {
      const drop = prev.cat === 'politique' ? prev : c;
      console.warn('Doublon, carte gardée en', drop === prev ? c.cat : prev.cat, ':', c.name);
      if (drop === prev) keep.set(c.id, c);
      continue;
    }
    keep.set(c.id, c);
  }
  cards.splice(0, cards.length, ...cards.filter(c => keep.get(c.id) === c));
}

// ---------- Rareté relative, catégorie par catégorie ----------
// Les cartes de chaque catégorie sont classées par notoriété puis réparties selon les mêmes proportions.
// Ainsi chaque paquet contient toutes les raretés (mythiques compris) et les taux affichés sont justes.
const QUOTAS = [['mythique', 0.015], ['legendaire', 0.04], ['epique', 0.09], ['rare', 0.18], ['peu-commune', 0.27]];
const FIXED_CATS = new Set(['monarchie', 'region', 'province', 'evenement']); // trop petites : rareté fixée à la main
const linkIds = cards.filter(c => isQ(c.id)).map(c => c.id);
const LINKS = new Map();
for (let i = 0; i < linkIds.length; i += 300) {
  const rows = await sparql(`SELECT ?x ?links WHERE { VALUES ?x { ${linkIds.slice(i, i + 300).map(q => 'wd:' + q).join(' ')} } ?x wikibase:sitelinks ?links. }`);
  for (const r of rows) LINKS.set(qid(r.x), +r.links);
}
const num = v => +String(v).replace(/[^\d]/g, '') || 0;
function score(c) {
  const links = LINKS.get(c.id) || 0;
  if (c.cat === 'commune') return num(c.stats[0][1]);
  if (c.cat === 'politique') {
    let b = links;
    if (c.posId === PM) b += 80;
    if (c.current) b += 40;
    if (c.posId === 'VPM') b += 20;
    if (REGIONAL[c.posId]) b += 30;
    b += (c.rolesData || []).filter(r => r.cab).length * 4 + (c.rolesData || []).filter(r => r.pos === MP).length * 2;
    return b;
  }
  return links;
}
const byCat = {};
for (const c of cards) (byCat[c.cat] ||= []).push(c);
for (const [cat, list] of Object.entries(byCat)) {
  if (FIXED_CATS.has(cat)) continue;
  // Raretés imposées à la main (ex. Westvleteren) : déduites des quotas
  const forced = list.filter(c => c.forceRarity);
  for (const c of forced) { c.rarity = c.forceRarity; delete c.forceRarity; }
  list.splice(0, list.length, ...list.filter(c => !forced.includes(c)));
  list.sort((a, b) => score(b) - score(a));
  const n = list.length + forced.length;
  let i = 0;
  for (const [rarity, q] of QUOTAS) {
    let k = Math.round(n * q);
    if (rarity === 'mythique' && n >= 8) k = Math.max(1, k);
    k = Math.max(0, k - forced.filter(c => c.rarity === rarity).length);
    for (const end = Math.min(list.length, i + k); i < end; i++) list[i].rarity = rarity;
  }
  for (; i < list.length; i++) list[i].rarity = 'commune';
}
{
  const table = {};
  for (const c of cards) { table[c.cat] ||= {}; table[c.cat][c.rarity] = (table[c.cat][c.rarity] || 0) + 1; }
  console.log('Raretés par catégorie :', JSON.stringify(table));
}

// ---------- Coordonnées (pour le jeu Tour de Belgique) ----------
for (let i = 0; i < linkIds.length; i += 300) {
  const rows = await sparql(`SELECT ?x ?coord WHERE { VALUES ?x { ${linkIds.slice(i, i + 300).map(q => 'wd:' + q).join(' ')} } ?x wdt:P625 ?coord. }`);
  for (const r of rows) {
    const m = r.coord.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    if (!m) continue;
    const lon = +m[1], lat = +m[2];
    const c = cards.find(x => x.id === qid(r.x));
    if (c && !c.coord && lat > 49.4 && lat < 51.6 && lon > 2.5 && lon < 6.5) c.coord = [+lat.toFixed(4), +lon.toFixed(4)];
  }
}
console.log(`Coordonnées : ${cards.filter(c => c.coord).length}`);

// ---------- Néerlandais ----------
const nlIds = new Set(cards.filter(c => isQ(c.id)).map(c => c.id));
for (const c of cards) for (const r of c.rolesData || []) if (isQ(r.pos)) nlIds.add(r.pos);
const NL = new Map();
const nlList = [...nlIds];
for (let i = 0; i < nlList.length; i += 300) {
  const rows = await sparql(`
  SELECT ?x ?l ?d WHERE {
    VALUES ?x { ${nlList.slice(i, i + 300).map(q => 'wd:' + q).join(' ')} }
    OPTIONAL { ?x rdfs:label ?l. FILTER(LANG(?l) = "nl") }
    OPTIONAL { ?x schema:description ?d. FILTER(LANG(?d) = "nl") }
  }`);
  for (const r of rows) NL.set(qid(r.x), { l: r.l, d: r.d });
}
const POS_NL = {};
for (const q of nlIds) if (NL.get(q)?.l && cards.every(c => c.id !== q)) POS_NL[q] = NL.get(q).l;
for (const c of cards) {
  const n = NL.get(c.id);
  if (!n) continue;
  const nl = {};
  if (n.l && n.l !== c.name) nl.name = cap(n.l.replace(/ van België$/, '').replace(/ \((bier|band|festival|gemeente)\)$/, ''));
  if (n.d && ['culture', 'sport', 'science'].includes(c.cat)) nl.subtitle = cap(n.d);
  if (Object.keys(nl).length) c.nl = nl;
}
console.log(`Néerlandais : ${cards.filter(c => c.nl?.name).length} noms traduits, ${Object.keys(POS_NL).length} fonctions`);

saveCache();
mkdirSync('data', { recursive: true });
writeFileSync('data/cards.js',
  '// Généré par tools/build-cards.mjs. Données : Wikidata (CC0). Images : Wikimedia Commons.\n' +
  'window.CARDS = ' + JSON.stringify(cards) + ';\n' +
  'window.POS_NL = ' + JSON.stringify(POS_NL) + ';\n');

const count = {};
for (const c of cards) count[c.cat + ' / ' + c.rarity] = (count[c.cat + ' / ' + c.rarity] || 0) + 1;
console.log(cards.length, 'cartes');
console.table(count);
