// Génère data/cards.js depuis Wikidata et Wikipédia.
// Usage : node tools/build-cards.mjs           (réutilise le cache des requêtes, rapide)
//         node tools/build-cards.mjs --fresh   (tout re-télécharger, pour avoir les données à jour)
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

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
  rouge:     ['Q645787', 'Q2532509', 'Q1811565', 'Q939354'],
  bleu:      ['Q533384', 'Q2711996', 'Q2215286', 'Q2636334', 'Q1160192', 'Q106241931', 'Q2133093', 'Q2445771'],
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
  Q645787: 'PS', Q939354: 'Vooruit', Q533384: 'MR', Q28982: 'N-VA',
  Q750673: 'CD&V', Q113903993: 'cdH', Q840814: 'Les Engagés', Q655611: 'Ecolo', Q513521: 'Groen',
  Q925616: 'PTB-PVDA', Q682990: 'Vlaams Belang', Q597900: 'Vlaams Blok', Q1470087: 'DéFI',
  Q1725837: 'Volksunie', Q2711996: 'PRL', Q3366715: 'PSC', Q2532509: 'PSB', Q1811565: 'POB',
  Q1160192: 'Open VLD', Q792293: 'Parti catholique', Q2636334: 'Parti libéral', Q2215286: 'PLP',
  Q19760801: 'Agalev', Q106241931: 'VLD', Q1084016: 'CSP', Q113184801: 'PSC',
};
const PARTY_BY_SHORT = Object.fromEntries(Object.entries(SHORT).reverse().map(([q, s]) => [s, q]));

const cards = [];

// ---------- Mémoire : militaires et Résistance ----------
// [titre Wikipédia FR, conflit, rôle (stat, traduit dans i18n.js), sous-titre FR, sous-titre NL, options]
// Options : year (année affichée pour un lieu ou un fait ; les personnes ont leur naissance), mythique,
// name et nlName (quand le libellé Wikidata est trop long ou mal traduit), img (photo imposée, à la place de P18),
// artwork (affiche ou dessin, affiché en entier).
// Pas de carte sans image libre : réseau Comète, Dame Blanche, Marthe McKenna, Armée secrète. La bataille de la Lys
// (1940) n'a qu'une carte d'état-major comme image, Jean-Baptiste Piron qu'une vitrine de musée (la brigade Piron a sa carte).
// Bataille de l'Yser : P18 est une carte, remplacée par le monument au roi Albert Iᵉʳ de Nieuport (écluses de l'inondation).
const WARS = { 14: ['Première Guerre mondiale', '1914–1918'], 40: ['Seconde Guerre mondiale', '1940–1945'], 19: ['Armée belge', 'XIXᵉ siècle'], 0: ['Armée belge', 'Depuis 1830'] };
const MILITAIRES = [
  ['Gérard Leman', 14, 'Général', 'Défenseur des forts de Liège en 1914', 'Verdediger van de forten van Luik in 1914'],
  ['Alphonse Jacques de Dixmude', 14, 'Général', 'Héros de la défense de Dixmude (1914)', 'Held van de verdediging van Diksmuide (1914)', { name: 'Jacques de Dixmude', nlName: 'Jacques van Diksmuide' }],
  ['Émile Dossin de Saint-Georges', 14, 'Général', 'Commandant de division sur l’Yser', 'Divisiecommandant aan de IJzer', { name: 'Émile Dossin', nlName: 'Émile Dossin' }],
  ['Léon Trésignies', 14, 'Caporal', 'Mort en héros au Pont-Brûlé (1914)', 'Als held gesneuveld aan de Verbrande Brug (1914)'],
  ['Gabrielle Petit (résistante)', 14, 'Résistante', 'Espionne fusillée en 1916, à 23 ans', 'Spionne, in 1916 gefusilleerd op 23-jarige leeftijd', { mythique: true }],
  ['Philippe Baucq', 14, 'Résistant', 'Architecte du réseau d’évasion d’Edith Cavell', 'Architect van het ontsnappingsnetwerk van Edith Cavell', { name: 'Philippe Baucq', nlName: 'Philippe Baucq' }],
  ['Walthère Dewé', 14, 'Résistant', 'Chef des réseaux Dame Blanche puis Clarence', 'Leider van de netwerken Witte Dame en Clarence'],
  ['Adolphe Max', 14, 'Bourgmestre', 'Bourgmestre de Bruxelles, déporté pour avoir tenu tête à l’occupant', 'Burgemeester van Brussel, gedeporteerd omdat hij de bezetter trotseerde'],
  ['Désiré-Joseph Mercier', 14, 'Cardinal', 'Voix de la résistance morale (« Patriotisme et endurance »)', 'Stem van het morele verzet (“Vaderlandsliefde en volharding”)', { name: 'Cardinal Mercier', nlName: 'Kardinaal Mercier' }],
  ['Henri-Alexis Brialmont', 19, 'Général', 'Bâtisseur des forts d’Anvers, de Liège et de Namur', 'Bouwer van de forten van Antwerpen, Luik en Namen', { name: 'Henri Alexis Brialmont', nlName: 'Henri Alexis Brialmont' }],
  ['Bataille de Liège', 14, 'Bataille', 'Août 1914 : les forts retardent l’armée allemande', 'Augustus 1914: de forten houden het Duitse leger op', { year: 1914 }],
  ['Siège d\'Anvers (1914)', 14, 'Bataille', 'Le réduit national tient jusqu’au 10 octobre 1914', 'Het Nationaal Reduit houdt stand tot 10 oktober 1914', { year: 1914 }],
  ['Bataille des casques d\'argent', 14, 'Bataille', 'Halen, 12 août 1914 : la cavalerie belge tient bon', 'Halen, 12 augustus 1914: de Belgische cavalerie houdt stand', { year: 1914 }],
  ['Fort de Loncin', 14, 'Fort', 'Détruit le 15 août 1914, il garde sa garnison', 'Op 15 augustus 1914 vernield, graf van zijn garnizoen', { year: 1914 }],
  ['Bataille de l\'Yser', 14, 'Bataille', 'L’inondation de la plaine arrête l’armée allemande', 'De onderwaterzetting van de vlakte stopt het Duitse leger', { year: 1914, img: '0 Monument du Roi Albert 1er - Nieuport (1).jpg' }],
  ['Boyau de la Mort', 14, 'Tranchée', 'La tranchée belge la plus exposée du front', 'De meest blootgestelde Belgische loopgraaf aan het front', { year: 1915 }],
  ['Tombe du Soldat inconnu (Belgique)', 14, 'Mémorial', 'Au pied de la colonne du Congrès depuis 1922', 'Aan de voet van de Congreskolom sinds 1922', { year: 1922, name: 'Tombe du Soldat inconnu' }],
  ['Edith Cavell', 14, 'Infirmière', 'Infirmière britannique fusillée à Bruxelles pour avoir aidé des soldats à fuir', 'Britse verpleegster, in Brussel gefusilleerd omdat ze soldaten hielp vluchten'],
  ['Fort de Flémalle', 14, 'Fort', 'Fort de la ceinture de Liège, rive gauche de la Meuse', 'Fort van de Luikse gordel, op de linkeroever van de Maas', { year: 1914 }],
  ['Fort de Barchon', 14, 'Fort', 'Premier fort attaqué en août 1914', 'Eerste fort dat in augustus 1914 werd aangevallen', { year: 1914 }],
  ['Fort de Fléron', 14, 'Fort', 'Fort de la ceinture de Liège, à l’est de la ville', 'Fort van de Luikse gordel, ten oosten van de stad', { year: 1914 }],
  ['Fort de Boncelles', 14, 'Fort', 'Fort du sud de Liège, tombé le 15 août 1914', 'Fort ten zuiden van Luik, gevallen op 15 augustus 1914', { year: 1914 }],
  ['Fort de Lantin', 14, 'Fort', 'Le fort le mieux conservé de la ceinture de Liège', 'Het best bewaarde fort van de Luikse gordel', { year: 1914 }],
  ['Viol de la Belgique', 14, 'Crimes de guerre', 'Louvain, Dinant, Tamines : villes incendiées et civils fusillés en 1914', 'Leuven, Dinant, Tamines: steden in brand en burgers gefusilleerd in 1914', { year: 1914, nlName: 'Verkrachting van België', artwork: true }],
  ['Bataille de la Lys (1918)', 14, 'Bataille', 'L’offensive allemande du printemps 1918 en Flandre', 'Het Duitse lenteoffensief van 1918 in Vlaanderen', { year: 1918, name: 'Bataille de la Lys', nlName: 'Slag aan de Leie' }],
  ['Cimetière militaire britannique de Tyne Cot', 14, 'Cimetière', 'Le plus grand cimetière militaire du Commonwealth au monde', 'De grootste militaire begraafplaats van het Gemenebest ter wereld', { year: 1917, name: 'Tyne Cot', nlName: 'Tyne Cot' }],
  ['Ploegsteert Memorial to the Missing', 14, 'Mémorial', 'Plus de 11 000 disparus britanniques, gardés par deux lions', 'Meer dan 11.000 Britse vermisten, bewaakt door twee leeuwen', { year: 1931, name: 'Mémorial de Ploegsteert', nlName: 'Ploegsteert Memorial' }],
  ['In Flanders Fields Museum', 14, 'Musée', 'Le musée de la Grande Guerre, dans la halle aux draps d’Ypres', 'Het museum van de Groote Oorlog, in de Lakenhalle van Ieper', { year: 1998 }],
  ['Andrée De Jongh', 40, 'Résistante', 'Fondatrice du réseau Comète, qui a sauvé des centaines d’aviateurs alliés', 'Oprichtster van de Comètelijn, die honderden geallieerde piloten redde', { mythique: true }],
  ['Albert Guérisse', 40, 'Résistant', '« Pat O’Leary », chef d’une filière d’évasion', '“Pat O’Leary”, leider van een ontsnappingslijn'],
  ['Youra Livchitz', 40, 'Résistant', 'Arrête le 20ᵉ convoi vers Auschwitz (1943)', 'Houdt het 20ste konvooi naar Auschwitz tegen (1943)'],
  ['Marguerite Bervoets', 40, 'Résistante', 'Poétesse et résistante, exécutée en 1944', 'Dichteres en verzetsstrijdster, in 1944 terechtgesteld'],
  ['Jean Greindl', 40, 'Résistant', '« Nemo », chef du réseau Comète à Bruxelles', '“Nemo”, leider van de Comètelijn in Brussel'],
  ['Jean de Selys Longchamps', 40, 'Pilote', 'Mitraille le siège de la Gestapo, avenue Louise (1943)', 'Beschiet het Gestapo-hoofdkwartier aan de Louizalaan (1943)'],
  ['Fort d\'Eben-Emael', 40, 'Fort', 'Pris par planeurs le 10 mai 1940', 'Op 10 mei 1940 met zweefvliegtuigen ingenomen', { year: 1940 }],
  ['Ligne KW', 40, 'Ligne de défense', 'La ligne Koningshooikt–Wavre, mai 1940', 'De lijn Koningshooikt–Waver, mei 1940', { year: 1940 }],
  ['Fort de Breendonk', 40, 'Camp', 'Camp nazi, aujourd’hui mémorial national', 'Nazikamp, nu nationaal gedenkteken', { year: 1940 }],
  ['Camp de rassemblement de Malines', 40, 'Camp', 'Plus de 25 000 Juifs et Tsiganes déportés de Belgique', 'Meer dan 25.000 Joden en Roma uit België gedeporteerd', { year: 1942, name: 'Caserne Dossin', nlName: 'Kazerne Dossin' }],
  ['Front de l\'indépendance', 40, 'Réseau', 'Le plus grand mouvement de résistance belge', 'De grootste Belgische verzetsbeweging', { year: 1941, name: 'Front de l’Indépendance', nlName: 'Onafhankelijkheidsfront' }],
  ['Faux Soir', 40, 'Journal', 'Le faux numéro du Soir qui ridiculise l’occupant', 'Het valse nummer van Le Soir dat de bezetter belachelijk maakt', { year: 1943 }],
  ['Brigade Piron', 40, 'Unité', 'Les Belges de la libération, de la Normandie à Bruxelles', 'De Belgen van de bevrijding, van Normandië tot Brussel', { year: 1944, name: 'Brigade Piron', nlName: 'Brigade Piron' }],
  ['Robert Maistriau', 40, 'Résistant', 'L’un des trois jeunes qui arrêtent le 20ᵉ convoi (1943)', 'Een van de drie jongeren die het 20ste konvooi tegenhouden (1943)'],
  ['Jean Franklemon', 40, 'Résistant', 'Musicien, compagnon de Livchitz contre le 20ᵉ convoi', 'Muzikant, makker van Livchitz tegen het 20ste konvooi'],
  ['Jean Burgers', 40, 'Résistant', 'Fondateur du Groupe G, spécialiste des sabotages', 'Oprichter van Groep G, specialist in sabotage'],
  ['Groupe G', 40, 'Réseau', 'Le réseau de sabotage des ingénieurs de l’ULB', 'Het sabotagenetwerk van de ingenieurs van de ULB', { year: 1942, nlName: 'Groep G' }],
  ['Arnaud Fraiteur', 40, 'Résistant', 'Abat un collaborateur à 18 ans, pendu en 1943', 'Schakelt op 18-jarige leeftijd een collaborateur uit, opgehangen in 1943'],
  ['Bataille de Hannut', 40, 'Bataille', 'Mai 1940 : l’une des premières grandes batailles de chars', 'Mei 1940: een van de eerste grote tankslagen', { year: 1940, nlName: 'Slag bij Hannuit' }],
  ['Fort de Battice', 40, 'Fort', 'Fort du plateau de Herve, il résiste jusqu’au 22 mai 1940', 'Fort op het plateau van Herve, houdt stand tot 22 mei 1940', { year: 1940 }],
  ['Fort d\'Aubin-Neufchâteau', 40, 'Fort', 'Fort qui tient onze jours en mai 1940', 'Fort dat in mei 1940 elf dagen standhoudt', { year: 1940 }],
  ['Ligne Devèze', 40, 'Ligne de défense', 'Abris de mitrailleuses le long de la frontière est', 'Mitrailleursbunkers langs de oostgrens', { year: 1940 }],
  ['Fort de Huy', 40, 'Prison', 'Citadelle devenue prison de l’occupant allemand', 'Citadel die gevangenis van de Duitse bezetter werd', { year: 1940, nlName: 'Fort van Hoei' }],
  ['Bataille de l\'Escaut', 40, 'Bataille', 'Automne 1944 : la bataille pour libérer le port d’Anvers', 'Herfst 1944: de slag om de haven van Antwerpen te bevrijden', { year: 1944, nlName: 'Slag om de Schelde' }],
  ['Bastogne War Museum', 40, 'Musée', 'Le musée de la bataille des Ardennes, au pied du Mardasson', 'Het museum van de Slag om de Ardennen, aan de voet van de Mardasson', { year: 2014 }],
  ['Musée royal de l\'Armée et d\'Histoire militaire', 0, 'Musée', 'Au Cinquantenaire, de l’armée belge de 1830 à nos jours', 'In het Jubelpark, het Belgische leger van 1830 tot vandaag', { year: 1910, name: 'Musée royal de l’Armée', nlName: 'Legermuseum' }],
  ['Bataille des Ardennes', 40, 'Bataille', 'L’ultime offensive allemande, hiver 1944', 'Het laatste Duitse offensief, winter 1944', { year: 1944 }],
  ['Mémorial du Mardasson', 40, 'Mémorial', 'Bastogne honore les soldats américains', 'Bastenaken eert de Amerikaanse soldaten', { year: 1950, nlName: 'Mardasson-gedenkteken' }],
];
// Rareté par quotas dans une catégorie, du plus connu au moins connu (raretés imposées à la main : hors quotas)
const QUOTAS = [['legendaire', 0.04], ['epique', 0.09], ['rare', 0.18], ['peu-commune', 0.27]];
function rarityByQuota(list, score) {
  const forced = list.filter(c => c.forceRarity);
  for (const c of forced) { c.rarity = c.forceRarity; delete c.forceRarity; }
  const rest = list.filter(c => !forced.includes(c)).sort((a, b) => score(b) - score(a));
  let i = 0;
  for (const [rarity, q] of QUOTAS) {
    const k = Math.max(0, Math.round(list.length * q) - forced.filter(c => c.rarity === rarity).length);
    for (const end = Math.min(rest.length, i + k); i < end; i++) rest[i].rarity = rarity;
  }
  for (; i < rest.length; i++) rest[i].rarity = 'commune';
}
// Titres → QID par Wikidata seul (mode --ajout : l'API Wikipédia n'est pas nécessaire). Titres exacts, sans redirection.
async function resolveTitlesSparql(entries) {
  const rows = await sparql(`SELECT ?t ?x WHERE { VALUES ?t { ${entries.map(e => JSON.stringify(e.title) + '@fr').join(' ')} }
  ?a schema:name ?t; schema:isPartOf <https://fr.wikipedia.org/>; schema:about ?x. }`);
  const byTitle = new Map(rows.map(r => [r.t, qid(r.x)]));
  const out = new Map();
  for (const e of entries) { const q = isQ(e.title) ? e.title : byTitle.get(e.title); if (q) out.set(q, e); else console.warn('Introuvable sur Wikipédia :', e.title); }
  return out;
}
async function buildMilitaires(resolve) {
  const mq = await resolve(MILITAIRES.map(([title, war, role, sub, subNl, opt = {}]) => ({ title, war, role, sub, subNl, ...opt })));
  const rows = await sparql(`
  SELECT ?x ?xLabel ?img ?birth ?death ?human ?links WHERE {
    VALUES ?x { ${[...mq.keys()].map(q => 'wd:' + q).join(' ')} }
    ?x wikibase:sitelinks ?links. OPTIONAL { ?x wdt:P18 ?img } OPTIONAL { ?x wdt:P569 ?birth } OPTIONAL { ?x wdt:P570 ?death }
    OPTIONAL { ?x wdt:P31 wd:Q5. BIND(true AS ?human) }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
  }`);
  const out = [];
  for (const r of rows) {
    const id = qid(r.x);
    if (out.some(c => c.id === id) || cards.some(c => c.id === id)) continue;
    const e = mq.get(id);
    const img = e.img || file(r.img);
    if (!img) { console.warn('Pas d\'image libre, ignoré :', r.xLabel); continue; }
    const [conflict, years] = WARS[e.war];
    const b = year(r.birth), d = year(r.death), when = r.human ? b : e.year;
    out.push({
      id, cat: 'militaire', name: e.name || cap(r.xLabel.replace(/ \(.+\)$/, '')), img, rarity: 'commune', family: 'militaire',
      emblem: /\.svg$/i.test(img) || undefined, artwork: e.artwork || undefined, forceRarity: e.mythique ? 'mythique' : undefined,
      subtitle: e.sub, nl: { subtitle: e.subNl, ...(e.nlName && { name: e.nlName }) }, meta: conflict + (when ? ` · ${when}${r.human && d ? '–' + d : ''}` : ''),
      stats: [r.human ? ['Naissance', b ?? '—'] : ['Année', e.year ?? '—'], ['Conflit', years], ['Rôle', e.role]],
      links: +r.links,
    });
  }
  console.log(`Mémoire : ${out.length} / ${MILITAIRES.length}`);
  return out;
}
// Éditions limitées du paquet du 11 novembre (voir EDITIONS, plus bas)
const EDITIONS_ARMISTICE = [
  ['Armistice du 11 novembre 1918', 'armistice', 'mythique', 'Armistice de 1918', 'Wapenstilstand van 1918',
    'Le 11 novembre 1918 à 11 heures, les armes se taisent sur le front de l’Ouest.', 'Op 11 november 1918 om 11 uur zwijgen de wapens aan het westelijk front.'],
  ['Coquelicot', 'armistice', 'legendaire', 'Coquelicot du souvenir', 'Klaproos van de herinnering',
    'La fleur des champs de bataille des Flandres, symbole du souvenir des soldats tombés.', 'De bloem van de Vlaamse slagvelden, symbool van de herdenking van de gesneuvelden.'],
  ['Tour de l\'Yser', 'armistice', 'epique', 'Tour de l’Yser', 'IJzertoren',
    'Monument de Dixmude portant la devise « Plus jamais de guerre ».', 'Monument in Diksmuide met de wapenspreuk “Nooit meer oorlog”.'],
];

// ---------- Faune : races belges et animaux sauvages ----------
// [titre Wikipédia FR, type (stat), sous-titre FR, sous-titre NL, poids ou taille [clé, valeur], origine ou habitat
//  [clé, valeur], options] — options : name et nlName (le libellé Wikidata d'une espèce est souvent son nom latin), mythique,
//  artwork (dessin affiché en entier), img (photo imposée).
// À remplacer quand Commons répondra (relu à l'œil) : Malinois (exposition canine, logos de sponsor discrets), cerf
// élaphe (une biche).
// Poids et tailles : ordres de grandeur d'un adulte, d'après les articles Wikipédia.
const ANIMAUX = [
  ['Malinois (chien)', 'Chien', 'Berger belge de Malines, chien de police et d’élite', 'Belgische herder uit Mechelen, politie- en elitehond', ['Poids', '25–30 kg'], ['Origine', 'Malines'], { name: 'Malinois', nlName: 'Mechelse herder', mythique: true }],
  ['Berger belge Groenendael', 'Chien', 'Le berger belge à poil long et noir', 'De langharige zwarte Belgische herder', ['Poids', '25–30 kg'], ['Origine', 'Groenendael'], { name: 'Groenendael', nlName: 'Groenendaeler' }],
  ['Berger belge Tervueren', 'Chien', 'Le berger belge à poil long et fauve', 'De langharige bruine Belgische herder', ['Poids', '25–30 kg'], ['Origine', 'Tervuren'], { name: 'Tervueren', nlName: 'Tervuerense herder' }],
  ['Berger belge Laekenois', 'Chien', 'Le plus rare des bergers belges, à poil rêche', 'De zeldzaamste Belgische herder, met ruwe vacht', ['Poids', '25–30 kg'], ['Origine', 'Laeken'], { name: 'Laekenois', nlName: 'Laekense herder' }],
  ['Bouvier des Flandres', 'Chien', 'Chien de ferme et de bouvier, barbu et costaud', 'Boerderij- en veedrijvershond, bebaard en stevig', ['Poids', '35–40 kg'], ['Origine', 'Flandre'], { nlName: 'Vlaamse koehond' }],
  ['Schipperke', 'Chien', 'Le petit chien noir des bateliers', 'Het zwarte hondje van de binnenschippers', ['Poids', '3–9 kg'], ['Origine', 'Flandre']],
  ['Griffon bruxellois', 'Chien', 'Petit chien à moustaches des cochers bruxellois', 'Klein snorrenhondje van de Brusselse koetsiers', ['Poids', '3,5–6 kg'], ['Origine', 'Bruxelles'], { nlName: 'Brussels griffon' }],
  ['Chien de Saint-Hubert', 'Chien', 'Le limier des moines de Saint-Hubert, au flair légendaire', 'De speurhond van de monniken van Saint-Hubert', ['Poids', '40–50 kg'], ['Origine', 'Ardennes'], { nlName: 'Sint-Hubertushond' }],
  ['Trait belge', 'Cheval', 'Le cheval de trait brabançon, colosse des champs', 'Het Brabantse trekpaard, kolos van de velden', ['Poids', '0,8–1 t'], ['Origine', 'Brabant'], { nlName: 'Belgisch trekpaard' }],
  ['Ardennais (cheval)', 'Cheval', 'Cheval de trait trapu et rustique des Ardennes', 'Gedrongen, gehard trekpaard uit de Ardennen', ['Poids', '0,7–1 t'], ['Origine', 'Ardennes'], { name: 'Cheval ardennais', nlName: 'Ardenner' }],
  ['BWP (cheval)', 'Cheval', 'Le sang-chaud belge, champion de saut d’obstacles', 'Het Belgisch warmbloedpaard, kampioen springen', ['Poids', '550–650 kg'], ['Origine', 'Belgique'], { name: 'Sang-chaud belge', nlName: 'Belgisch Warmbloedpaard' }],
  ['Blanc bleu belge', 'Bovin', 'Race bovine à la musculature hors norme', 'Runderras met uitzonderlijke bespiering', ['Poids', '0,7–1,2 t'], ['Origine', 'Wallonie'], { name: 'Blanc-Bleu Belge', nlName: 'Belgisch witblauw' }],
  ['Ardennais Roux', 'Mouton', 'Mouton rustique à tête rousse des Ardennes', 'Gehard schaap met rosse kop uit de Ardennen', ['Poids', '60–80 kg'], ['Origine', 'Ardennes'], { name: 'Ardennais roux', nlName: 'Ardense voskop' }],
  ['Pigeon voyageur', 'Pigeon', 'La colombophilie, sport populaire né en Belgique', 'De duivensport, volkssport ontstaan in België', ['Poids', '≈ 500 g'], ['Origine', 'Belgique'], { nlName: 'Postduif', artwork: true }],
  ['Poule de Malines', 'Volaille', 'Le « coucou de Malines », grosse poule à chair', 'De Mechelse koekoek, grote vleeskip', ['Poids', '3–5 kg'], ['Origine', 'Malines'], { name: 'Coucou de Malines', nlName: 'Mechelse koekoek' }],
  ['Braekel', 'Volaille', 'Poule pondeuse de Nederbrakel', 'Legkip uit Nederbrakel', ['Poids', '2–2,8 kg'], ['Origine', 'Flandre-Orientale'], { nlName: 'Brakel' }],
  ['Barbu d\'Uccle', 'Volaille', 'Poule naine barbue et bottée', 'Bebaarde dwergkip met bevederde poten', ['Poids', '600–800 g'], ['Origine', 'Uccle'], { nlName: 'Ukkelse baardkriel' }],
  ['Barbu d\'Anvers', 'Volaille', 'Poule naine barbue, sans plumes aux pattes', 'Bebaarde dwergkip zonder bevederde poten', ['Poids', '600–800 g'], ['Origine', 'Anvers'], { nlName: 'Antwerpse baardkriel' }],
  ['Combattant de Bruges', 'Volaille', 'Coq de combat massif des Flandres', 'Massieve vechthaan uit Vlaanderen', ['Poids', '3–5 kg'], ['Origine', 'Bruges'], { nlName: 'Brugse vechter' }],
  ['Géant des Flandres', 'Lapin', 'Le plus grand lapin domestique du monde', 'Het grootste tamme konijn ter wereld', ['Poids', '6–10 kg'], ['Origine', 'Flandre'], { nlName: 'Vlaamse reus' }],
  ['Sanglier', 'Mammifère', 'Le seigneur des forêts ardennaises', 'De heer van de Ardense bossen', ['Poids', '50–150 kg'], ['Habitat', 'Forêts'], { nlName: 'Everzwijn' }],
  ['Cerf élaphe', 'Mammifère', 'Le roi des Ardennes, star du brame en automne', 'De koning van de Ardennen, ster van de bronst in de herfst', ['Poids', '100–250 kg'], ['Habitat', 'Ardennes'], { nlName: 'Edelhert' }],
  ['Chevreuil d\'Europe', 'Mammifère', 'Le plus petit cervidé de nos forêts', 'Het kleinste hert van onze bossen', ['Poids', '20–30 kg'], ['Habitat', 'Forêts et champs'], { name: 'Chevreuil', nlName: 'Ree' }],
  ['Castor fiber', 'Mammifère', 'Revenu dans nos rivières après un siècle d’absence', 'Teruggekeerd in onze rivieren na een eeuw afwezigheid', ['Poids', '20–30 kg'], ['Habitat', 'Rivières'], { name: 'Castor d’Europe', nlName: 'Bever' }],
  ['Canis lupus', 'Mammifère', 'De retour en Flandre et en Wallonie depuis 2018', 'Sinds 2018 terug in Vlaanderen en Wallonië', ['Poids', '30–50 kg'], ['Habitat', 'Limbourg, Ardenne'], { name: 'Loup gris', nlName: 'Wolf' }],
  ['Felis silvestris', 'Mammifère', 'Félin sauvage discret des forêts du sud', 'Schuwe wilde kat van de zuidelijke bossen', ['Poids', '3–7 kg'], ['Habitat', 'Ardennes'], { name: 'Chat forestier', nlName: 'Wilde kat' }],
  ['Cigogne noire', 'Oiseau', 'Cigogne farouche des vallées forestières', 'Schuwe ooievaar van de beboste valleien', ['Poids', '2,5–3 kg'], ['Habitat', 'Forêts humides'], { nlName: 'Zwarte ooievaar' }],
  ['Hibou grand-duc', 'Oiseau', 'Le plus grand rapace nocturne d’Europe', 'De grootste nachtroofvogel van Europa', ['Poids', '2–3,5 kg'], ['Habitat', 'Carrières, falaises'], { name: 'Grand-duc d’Europe', nlName: 'Oehoe' }],
  ['Martin-pêcheur d\'Europe', 'Oiseau', 'Flèche bleue des rivières', 'Blauwe pijl van de rivieren', ['Poids', '≈ 40 g'], ['Habitat', 'Rivières'], { name: 'Martin-pêcheur', nlName: 'IJsvogel' }],
  ['Faucon pèlerin', 'Oiseau', 'Il niche sur la cathédrale de Bruxelles', 'Hij broedt op de kathedraal van Brussel', ['Poids', '≈ 1 kg'], ['Habitat', 'Villes, falaises'], { nlName: 'Slechtvalk' }],
  ['Phoca vitulina', 'Mammifère', 'Le phoque de nos plages, de plus en plus visible', 'De zeehond van onze stranden, steeds vaker te zien', ['Poids', '50–150 kg'], ['Habitat', 'Côte'], { name: 'Phoque veau-marin', nlName: 'Gewone zeehond' }],
  ['Marsouin commun', 'Mammifère', 'Le petit cétacé de la mer du Nord', 'De kleine walvisachtige van de Noordzee', ['Poids', '50–70 kg'], ['Habitat', 'Mer du Nord'], { nlName: 'Bruinvis' }],
  ['Crevette grise', 'Crustacé', 'La crevette des croquettes et des pêcheurs à cheval', 'De garnaal van de kroketten en de paardenvissers', ['Taille', '5–9 cm'], ['Habitat', 'Mer du Nord'], { nlName: 'Grijze garnaal' }],
  ['Moule commune', 'Mollusque', 'La moule des moules-frites', 'De mossel van mosselen-friet', ['Taille', '5–10 cm'], ['Habitat', 'Côte'], { name: 'Moule', nlName: 'Mossel' }],
  ['Renard roux', 'Mammifère', 'Rusé et partout, jusque dans les villes', 'Sluw en overal, tot in de steden', ['Poids', '5–8 kg'], ['Habitat', 'Partout'], { name: 'Renard', nlName: 'Vos' }],
  ['Blaireau européen', 'Mammifère', 'Il creuse des terriers sur plusieurs générations', 'Graaft burchten die generaties meegaan', ['Poids', '10–15 kg'], ['Habitat', 'Bois'], { name: 'Blaireau', nlName: 'Das' }],
  ['Erinaceus europaeus', 'Mammifère', 'L’ami épineux des jardins, il hiberne tout l’hiver', 'De stekelige vriend van de tuin, houdt een winterslaap', ['Poids', '≈ 1 kg'], ['Habitat', 'Jardins'], { name: 'Hérisson', nlName: 'Egel' }],
  ['Écureuil roux', 'Mammifère', 'Acrobate des forêts et des parcs, roi des noisettes', 'Acrobaat van bossen en parken, koning van de hazelnoten', ['Poids', '250–350 g'], ['Habitat', 'Forêts, parcs'], { name: 'Écureuil', nlName: 'Eekhoorn' }],
  ['Lièvre d\'Europe', 'Mammifère', 'Coureur des champs, jusqu’à 70 km/h', 'Renner van de velden, tot 70 km/u', ['Poids', '3–5 kg'], ['Habitat', 'Champs'], { name: 'Lièvre', nlName: 'Haas' }],
  ['Oryctolagus cuniculus', 'Mammifère', 'Le lapin sauvage des dunes et des talus', 'Het wilde konijn van duinen en bermen', ['Poids', '1,2–2 kg'], ['Habitat', 'Dunes, champs'], { name: 'Lapin de garenne', nlName: 'Wild konijn' }],
  ['Lutra lutra', 'Mammifère', 'Disparue puis revenue dans quelques rivières', 'Verdwenen en teruggekeerd in enkele rivieren', ['Poids', '6–10 kg'], ['Habitat', 'Rivières'], { name: 'Loutre', nlName: 'Otter' }],
  ['Pipistrellus pipistrellus', 'Mammifère', 'La plus commune de nos chauves-souris', 'De meest voorkomende vleermuis bij ons', ['Poids', '≈ 5 g'], ['Habitat', 'Greniers'], { name: 'Pipistrelle', nlName: 'Gewone dwergvleermuis' }],
  ['Effraie des clochers', 'Oiseau', 'La dame blanche des églises et des granges', 'De witte dame van kerken en schuren', ['Poids', '≈ 300 g'], ['Habitat', 'Clochers'], { name: 'Effraie', nlName: 'Kerkuil' }],
  ['Chouette hulotte', 'Oiseau', 'Son « hou-hou » résonne dans les bois la nuit', 'Haar “hoe-hoe” weerklinkt ’s nachts in de bossen', ['Poids', '≈ 500 g'], ['Habitat', 'Forêts, parcs'], { nlName: 'Bosuil' }],
  ['Cygne tuberculé', 'Oiseau', 'Le grand cygne blanc des étangs et des canaux', 'De grote witte zwaan van vijvers en kanalen', ['Poids', '9–13 kg'], ['Habitat', 'Étangs'], { name: 'Cygne', nlName: 'Knobbelzwaan' }],
  ['Héron cendré', 'Oiseau', 'Pêcheur immobile au bord de l’eau', 'Roerloze visser aan de waterkant', ['Poids', '1–2 kg'], ['Habitat', 'Zones humides'], { nlName: 'Blauwe reiger' }],
  ['Cigogne blanche', 'Oiseau', 'De retour dans nos prairies, sur ses grands nids', 'Terug in onze weiden, op haar grote nesten', ['Poids', '3–4 kg'], ['Habitat', 'Prairies humides'], { nlName: 'Ooievaar' }],
  ['Buse variable', 'Oiseau', 'Le rapace qu’on voit sur les piquets le long des routes', 'De roofvogel op de palen langs de wegen', ['Poids', '0,5–1 kg'], ['Habitat', 'Campagne'], { name: 'Buse', nlName: 'Buizerd' }],
  ['Pic épeiche', 'Oiseau', 'Il tambourine sur les troncs au printemps', 'Roffelt in de lente op boomstammen', ['Poids', '70–100 g'], ['Habitat', 'Forêts'], { nlName: 'Grote bonte specht' }],
  ['Mésange charbonnière', 'Oiseau', 'La plus commune des mésanges des jardins', 'De meest voorkomende mees in de tuin', ['Poids', '15–20 g'], ['Habitat', 'Jardins'], { nlName: 'Koolmees' }],
  ['Rouge-gorge familier', 'Oiseau', 'Le compagnon du jardinier, qui chante même l’hiver', 'De makker van de tuinier, zingt zelfs in de winter', ['Poids', '≈ 18 g'], ['Habitat', 'Jardins'], { name: 'Rouge-gorge', nlName: 'Roodborst' }],
  ['Perruche à collier', 'Oiseau', 'Venue d’Asie, elle a colonisé les parcs bruxellois', 'Uit Azië, veroverde ze de Brusselse parken', ['Poids', '≈ 120 g'], ['Habitat', 'Parcs bruxellois'], { nlName: 'Halsbandparkiet' }],
  ['Goéland argenté', 'Oiseau', 'Le grand goéland des plages et des ports', 'De grote meeuw van stranden en havens', ['Poids', '≈ 1 kg'], ['Habitat', 'Côte'], { nlName: 'Zilvermeeuw' }],
  ['Huîtrier pie', 'Oiseau', 'Noir et blanc, bec orange, il fouille la plage', 'Zwart-wit met oranje bek, zoekt voedsel op het strand', ['Poids', '≈ 500 g'], ['Habitat', 'Plages'], { nlName: 'Scholekster' }],
  ['Salamandra salamandra', 'Amphibien', 'Noire et jaune, elle sort les nuits de pluie', 'Zwart en geel, komt naar buiten in regennachten', ['Taille', '15–20 cm'], ['Habitat', 'Forêts humides'], { name: 'Salamandre tachetée', nlName: 'Vuursalamander' }],
  ['Grenouille rousse', 'Amphibien', 'La première grenouille à pondre, dès février', 'De eerste kikker die eitjes legt, al in februari', ['Taille', '6–9 cm'], ['Habitat', 'Mares'], { nlName: 'Bruine kikker' }],
  ['Natrix helvetica', 'Reptile', 'Serpent inoffensif qui nage très bien', 'Onschadelijke slang die uitstekend zwemt', ['Taille', '0,7–1,2 m'], ['Habitat', 'Zones humides'], { name: 'Couleuvre helvétique', nlName: 'Ringslang' }],
  ['Vipère péliade', 'Reptile', 'Le seul serpent venimeux de Belgique', 'De enige giftige slang van België', ['Taille', '50–70 cm'], ['Habitat', 'Landes, Fagnes'], { nlName: 'Adder' }],
  ['Paon-du-jour', 'Insecte', 'Papillon aux quatre « yeux » sur les ailes', 'Vlinder met vier “ogen” op de vleugels', ['Envergure', '5–6 cm'], ['Habitat', 'Jardins'], { nlName: 'Dagpauwoog' }],
  ['Lucanus cervus', 'Insecte', 'Le plus grand coléoptère d’Europe, aux mandibules de cerf', 'De grootste kever van Europa, met geweivormige kaken', ['Taille', '3–8 cm'], ['Habitat', 'Vieux chênes'], { name: 'Lucane cerf-volant', nlName: 'Vliegend hert' }],
  ['Apis mellifera', 'Insecte', 'L’abeille des ruches, du miel et des fleurs', 'De bij van de korven, de honing en de bloemen', ['Taille', '≈ 1,5 cm'], ['Habitat', 'Ruches'], { name: 'Abeille domestique', nlName: 'Honingbij' }],
  ['Anguilla anguilla', 'Poisson', 'Née dans la mer des Sargasses, elle remonte nos rivières', 'Geboren in de Sargassozee, zwemt ze onze rivieren op', ['Taille', '0,5–1 m'], ['Habitat', 'Rivières'], { name: 'Anguille', nlName: 'Paling' }],
  ['Clupea harengus', 'Poisson', 'Le poisson des maatjes et des harengs saurs', 'De vis van de maatjes en de bokking', ['Taille', '25–35 cm'], ['Habitat', 'Mer du Nord'], { name: 'Hareng', nlName: 'Haring' }],
  ['Sole commune', 'Poisson', 'La sole ostendaise, reine des criées', 'De Oostendse tong, koningin van de vismijn', ['Taille', '30–40 cm'], ['Habitat', 'Mer du Nord'], { name: 'Sole', nlName: 'Tong' }],
  ['Salmo trutta', 'Poisson', 'La truite des ruisseaux ardennais', 'De forel van de Ardense beken', ['Taille', '25–50 cm'], ['Habitat', 'Ruisseaux'], { name: 'Truite fario', nlName: 'Beekforel', artwork: true }],
];
async function buildAnimaux(resolve) {
  const aq = await resolve(ANIMAUX.map(([title, kind, sub, subNl, size, place, opt = {}]) => ({ title, kind, sub, subNl, size, place, ...opt })));
  const rows = await sparql(`SELECT ?x ?xLabel ?img ?links WHERE { VALUES ?x { ${[...aq.keys()].map(q => 'wd:' + q).join(' ')} }
    ?x wikibase:sitelinks ?links. OPTIONAL { ?x wdt:P18 ?img } SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". } }`);
  const out = [];
  for (const r of rows) {
    const id = qid(r.x);
    if (out.some(c => c.id === id) || cards.some(c => c.id === id)) continue;
    const e = aq.get(id), img = e.img || file(r.img);
    if (!img) { console.warn('Pas d\'image libre, ignoré :', r.xLabel); continue; }
    const wild = e.place[0] === 'Habitat';
    out.push({
      id, cat: 'animal', name: e.name || cap(r.xLabel.replace(/ \(.+\)$/, '')), img, rarity: 'commune', family: 'animal',
      forceRarity: e.mythique ? 'mythique' : undefined, artwork: e.artwork || undefined,
      subtitle: e.sub, nl: { subtitle: e.subNl, ...(e.nlName && { name: e.nlName }) },
      meta: `${wild ? 'Faune sauvage' : 'Race belge'} · ${e.kind}`,
      stats: [['Type', e.kind], e.size, e.place], links: +r.links,
    });
  }
  console.log(`Faune : ${out.length} / ${ANIMAUX.length}`);
  return out;
}

// ---------- En route ! : aviation, rail, exploration ----------
// [titre Wikipédia FR (ou QID), type (stat), sous-titre FR, sous-titre NL, 3ᵉ stat [clé, valeur], options]
// Options : name, nlName, year (sinon : premier vol P606, création P571 ou début P580 sur Wikidata), mythique, img, artwork.
// Écartés : les officiers de l'État indépendant du Congo (Lemaire, Storms, Coquilhat…), pas des « héros » de cartes ;
// le navire-école Mercator (Q47524354) : sa seule image libre le montre minuscule au loin.
const AVIATION = [
  ['Stampe et Vertongen SV-4', 'Avion', 'Biplan d’école anversois, star des meetings aériens', 'Antwerps lesvliegtuig, ster van de vliegshows', ['Constructeur', 'Stampe'], { name: 'Stampe SV-4' }],
  ['Renard R.31', 'Avion', 'Avion de reconnaissance conçu à Evere', 'Verkenningsvliegtuig ontworpen in Evere', ['Constructeur', 'Renard']],
  ['Fairey Fox', 'Avion', 'Biplan construit à Gosselies, en première ligne en mai 1940', 'Tweedekker gebouwd in Gosselies, in de frontlinie in mei 1940', ['Constructeur', 'Fairey']],
  ['General Dynamics F-16 Fighting Falcon', 'Avion', 'Le chasseur de la Force aérienne depuis 1979', 'De jachtbommenwerper van de Luchtmacht sinds 1979', ['Constructeur', 'General Dynamics'], { name: 'F-16', nlName: 'F-16' }],
  ['Dassault Mirage 5', 'Avion', 'Chasseur assemblé à Gosselies par la SABCA', 'Jachtvliegtuig geassembleerd in Gosselies door SABCA', ['Constructeur', 'Dassault'], { name: 'Mirage 5', nlName: 'Mirage 5' }],
  ['Lockheed C-130 Hercules', 'Avion', 'Le cargo de Melsbroek pendant plus de cinquante ans', 'Het transportvliegtuig van Melsbroek, meer dan vijftig jaar lang', ['Constructeur', 'Lockheed'], { name: 'C-130 Hercules', nlName: 'C-130 Hercules' }],
  ['Airbus A400M Atlas', 'Avion', 'Le successeur du C-130, avec des pièces belges', 'De opvolger van de C-130, met Belgische onderdelen', ['Constructeur', 'Airbus'], { name: 'Airbus A400M', nlName: 'Airbus A400M' }],
  ['Sabena', 'Compagnie', 'Compagnie aérienne nationale de 1923 à 2001', 'Nationale luchtvaartmaatschappij van 1923 tot 2001', ['Siège', 'Bruxelles']],
  ['Brussels Airlines', 'Compagnie', 'L’héritière de la Sabena', 'De erfgenaam van Sabena', ['Siège', 'Bruxelles']],
  ['Aéroport de Bruxelles-National', 'Aéroport', 'Le premier aéroport du pays', 'De grootste luchthaven van het land', ['Lieu', 'Zaventem'], { name: 'Brussels Airport', nlName: 'Brussels Airport' }],
  ['Aéroport de Liège', 'Aéroport', 'Plaque tournante du fret aérien', 'Draaischijf van de luchtvracht', ['Lieu', 'Bierset'], { nlName: 'Luchthaven Luik' }],
  ['Aéroport de Charleroi-Bruxelles-Sud', 'Aéroport', 'L’aéroport des compagnies à bas prix', 'De luchthaven van de lagekostenmaatschappijen', ['Lieu', 'Gosselies'], { name: 'Aéroport de Charleroi', nlName: 'Luchthaven Charleroi' }],
  ['Aérodrome de Haren', 'Aéroport', 'Le premier aéroport de Bruxelles, d’où partait la Sabena', 'De eerste luchthaven van Brussel, thuisbasis van Sabena', ['Lieu', 'Haren'], { nlName: 'Vliegveld van Haren' }],
  ['Willy Coppens', 'Aviateur', 'As des as belge de 14-18, chasseur de ballons', 'Belgische topaas van 14-18, ballonjager', ['Victoires', 37]],
  ['Edmond Thieffry', 'Aviateur', 'Premier vol Bruxelles–Léopoldville (1925)', 'Eerste vlucht Brussel–Leopoldstad (1925)', ['Rôle', 'Pionnier']],
  ['Jean Offenberg', 'Aviateur', 'Pilote belge de la bataille d’Angleterre', 'Belgische piloot in de Slag om Engeland', ['Rôle', 'Pilote de chasse']],
  ['Jan Olieslagers', 'Aviateur', 'Le « démon anversois », recordman du monde', 'De “Antwerpse duivel”, wereldrecordhouder', ['Rôle', 'Pionnier']],
  ['Pierre de Caters', 'Aviateur', 'Premier Belge breveté pilote (1909)', 'Eerste Belg met een vliegbrevet (1909)', ['Rôle', 'Pionnier']],
  ['Hélène Dutrieu', 'Aviatrice', 'Première femme pilote de Belgique (1910)', 'Eerste vrouwelijke piloot van België (1910)', ['Rôle', 'Pionnière']],
  ['Auguste Piccard', 'Aéronaute', 'Premier homme dans la stratosphère (1931), professeur à l’ULB', 'Eerste mens in de stratosfeer (1931), professor aan de ULB', ['Rôle', 'Ballon FNRS']],
];
const RAIL = [
  ['Le Belge (locomotive)', 'Locomotive', 'Première locomotive construite en Belgique (1835)', 'Eerste locomotief gebouwd in België (1835)', ['Constructeur', 'Cockerill'], { year: 1835, name: 'Le Belge', nlName: 'Le Belge' }],
  ['Ligne 25 (Infrabel)', 'Ligne', 'Bruxelles–Malines, première ligne de voyageurs du continent', 'Brussel–Mechelen, eerste reizigerslijn van het continent', ['Longueur', '20 km'], { year: 1835, name: 'Bruxelles–Malines', nlName: 'Brussel–Mechelen' }],
  ['Société nationale des chemins de fer belges', 'Compagnie', 'La compagnie des chemins de fer belges', 'De Belgische spoorwegmaatschappij', ['Siège', 'Bruxelles'], { year: 1926, name: 'SNCB', nlName: 'NMBS' }],
  ['Société nationale des chemins de fer vicinaux', 'Compagnie', 'Les « vicinaux », le plus grand réseau de trams ruraux au monde', 'De “buurtspoorwegen”, het grootste landelijke tramnet ter wereld', ['Siège', 'Bruxelles'], { year: 1885, name: 'Vicinal (SNCV)', nlName: 'Buurtspoorwegen (NMVB)' }],
  ['Tramway de la côte belge', 'Tram', 'De La Panne à Knokke, la plus longue ligne de tram du monde', 'Van De Panne tot Knokke, de langste tramlijn ter wereld', ['Longueur', '67 km'], { name: 'Tram de la Côte', nlName: 'Kusttram' }],
  ['Tramway de Bruxelles', 'Tram', 'Le réseau de trams de la capitale', 'Het tramnet van de hoofdstad', ['Exploitant', 'STIB'], { nlName: 'Brusselse tram' }],
  ['Métro de Bruxelles', 'Métro', 'Le métro de Bruxelles, ouvert en 1976', 'De Brusselse metro, geopend in 1976', ['Exploitant', 'STIB'], { year: 1976, nlName: 'Brusselse metro' }],
  ['Ligne 0 Bruxelles-Midi - Bruxelles-Nord', 'Ligne', 'La jonction Nord-Midi, tunnel sous le centre de Bruxelles', 'De Noord-Zuidverbinding, tunnel onder het centrum van Brussel', ['Longueur', '3,8 km'], { year: 1952, name: 'Jonction Nord-Midi', nlName: 'Noord-Zuidverbinding' }],
  ['Gare de Bruxelles-Midi', 'Gare', 'La gare des TGV, porte de Paris, Londres et Amsterdam', 'Het station van de hogesnelheidstreinen', ['Ville', 'Bruxelles'], { name: 'Gare du Midi', nlName: 'Station Brussel-Zuid' }],
  ['Gare de Bruxelles-Central', 'Gare', 'La gare de Horta, au cœur de la ville', 'Het station van Horta, in het hart van de stad', ['Ville', 'Bruxelles'], { name: 'Gare Centrale', nlName: 'Station Brussel-Centraal' }],
  ['Gare de Bruxelles-Nord', 'Gare', 'La gare du quartier des tours', 'Het station van de Noordwijk', ['Ville', 'Bruxelles'], { name: 'Gare du Nord', nlName: 'Station Brussel-Noord' }],
  ['Gare de Gand-Saint-Pierre', 'Gare', 'La grande gare de Gand, de 1913', 'Het grote station van Gent, uit 1913', ['Ville', 'Gand'], { name: 'Gand-Saint-Pierre', nlName: 'Station Gent-Sint-Pieters' }],
  ['Gare de Bruges', 'Gare', 'La porte d’entrée des touristes à Bruges', 'De toegangspoort voor toeristen in Brugge', ['Ville', 'Bruges'], { name: 'Gare de Bruges', nlName: 'Station Brugge' }],
  ['Gare de Namur', 'Gare', 'La gare de la capitale wallonne', 'Het station van de Waalse hoofdstad', ['Ville', 'Namur'], { name: 'Gare de Namur', nlName: 'Station Namen' }],
  ['Gare de Mons', 'Gare', 'La passerelle-gare de Calatrava', 'Het brugstation van Calatrava', ['Ville', 'Mons'], { name: 'Gare de Mons', nlName: 'Station Bergen' }],
  ['Gare de Louvain', 'Gare', 'La gare des étudiants', 'Het station van de studenten', ['Ville', 'Louvain'], { name: 'Gare de Louvain', nlName: 'Station Leuven' }],
  ['Gare d\'Ostende', 'Gare', 'La gare au bord de l’eau, d’où partait la malle vers Douvres', 'Het station aan het water, vertrekpunt van de mailboot naar Dover', ['Ville', 'Ostende'], { name: 'Gare d’Ostende', nlName: 'Station Oostende' }],
  ['Thalys', 'TGV', 'Le TGV rouge Paris–Bruxelles–Amsterdam–Cologne', 'De rode hogesnelheidstrein Parijs–Brussel–Amsterdam–Keulen', ['Vitesse', '300 km/h'], { year: 1996 }],
  ['Eurostar', 'TGV', 'Bruxelles–Londres sous la Manche', 'Brussel–Londen onder het Kanaal', ['Vitesse', '300 km/h'], { year: 1994 }],
  ['Georges Nagelmackers', 'Pionnier', 'Liégeois, fondateur des wagons-lits et de l’Orient-Express', 'Luikenaar, oprichter van de slaaprijtuigen en de Orient-Express', ['Rôle', 'Entrepreneur']],
  ['Orient-Express', 'Train', 'Le train de luxe Paris–Constantinople, né d’une idée belge', 'De luxetrein Parijs–Constantinopel, een Belgisch idee', ['Exploitant', 'Wagons-Lits'], { year: 1883, artwork: true }],
  ['Vennbahn', 'Ligne', 'Ligne des Hautes Fagnes devenue piste cyclable', 'Spoorlijn door de Hoge Venen, nu een fietspad', ['Longueur', '125 km'], { year: 1889 }],
  ['Ligne 24 (Infrabel)', 'Viaduc', 'Le viaduc de Moresnet, construit pendant la Grande Guerre', 'Het viaduct van Moresnet, gebouwd tijdens de Groote Oorlog', ['Longueur', '1 107 m'], { year: 1916, name: 'Viaduc de Moresnet', nlName: 'Viaduct van Moresnet' }],
  ['Chemin de fer du Bocq', 'Train touristique', 'Locomotives à vapeur dans la vallée du Bocq', 'Stoomlocomotieven in de vallei van de Bocq', ['Lieu', 'Ciney–Yvoir']],
  ['Train World', 'Musée', 'Le musée du train, dans la gare de Schaerbeek', 'Het treinmuseum, in het station van Schaarbeek', ['Lieu', 'Schaerbeek'], { year: 2015 }],
];
const EXPLORATION = [
  ['Expédition antarctique belge', 'Expédition', 'La Belgica, premier hivernage en Antarctique (1897–1899)', 'De Belgica, eerste overwintering op Antarctica (1897–1899)', ['Navire', 'Belgica'], { year: 1897, name: 'Expédition de la Belgica', nlName: 'Belgica-expeditie' }],
  ['Station Princesse Élisabeth', 'Base polaire', 'La première base polaire « zéro émission »', 'De eerste “zero emissie”-poolbasis', ['Lieu', 'Antarctique'], { year: 2009, nlName: 'Prinses Elisabethbasis' }],
  ['Belgica (A962)', 'Navire', 'Navire océanographique belge de 1984 à 2021', 'Belgisch oceanografisch schip van 1984 tot 2021', ['Port', 'Zeebrugge'], { year: 1984, name: 'Belgica (A962)', nlName: 'Belgica (A962)' }],
  ['Gaston de Gerlache de Gomery', 'Explorateur', 'Chef de l’expédition antarctique de 1957–1958, fils d’Adrien', 'Leider van de Antarctica-expeditie van 1957–1958, zoon van Adrien', ['Rôle', 'Polaire'], { name: 'Gaston de Gerlache', nlName: 'Gaston de Gerlache' }],
  ['Alain Hubert', 'Explorateur', 'Traversée de l’Antarctique à ski (1997–1998)', 'Oversteek van Antarctica op ski (1997–1998)', ['Rôle', 'Polaire']],
  ['Haroun Tazieff', 'Volcanologue', 'Ingénieur formé en Belgique, il filmait les volcans en éruption', 'In België opgeleide ingenieur, filmde uitbarstende vulkanen', ['Rôle', 'Volcans']],
  ['Louis Hennepin', 'Explorateur', 'Récollet d’Ath, il fait connaître les chutes du Niagara', 'Recollect uit Aat, maakt de Niagarawatervallen bekend', ['Rôle', 'Amérique']],
  ['Pierre-Jean De Smet', 'Missionnaire', 'Jésuite de Termonde, ami des peuples de l’Ouest américain', 'Jezuïet uit Dendermonde, vriend van de volkeren van het Amerikaanse Westen', ['Rôle', 'Amérique']],
  ['Ferdinand Verbiest', 'Astronome', 'Jésuite de Pittem, astronome de l’empereur de Chine', 'Jezuïet uit Pittem, astronoom van de keizer van China', ['Rôle', 'Chine']],
  ['Guillaume de Rubrouck', 'Voyageur', 'Franciscain flamand chez le Grand Khan mongol (1253–1255)', 'Vlaamse franciscaan bij de Grote Khan van de Mongolen (1253–1255)', ['Rôle', 'Mongolie'], { nlName: 'Willem van Rubroek' }],
];
async function buildRoute(cat, list) {
  const q = await resolve(list.map(([title, kind, sub, subNl, extra, opt = {}]) => ({ title, kind, sub, subNl, extra, ...opt })));
  const rows = await sparql(`SELECT ?x ?xLabel ?img ?birth ?death ?human ?flight ?inc ?start ?links WHERE { VALUES ?x { ${[...q.keys()].map(x => 'wd:' + x).join(' ')} }
    ?x wikibase:sitelinks ?links. OPTIONAL { ?x wdt:P18 ?img } OPTIONAL { ?x wdt:P569 ?birth } OPTIONAL { ?x wdt:P570 ?death }
    OPTIONAL { ?x wdt:P31 wd:Q5. BIND(true AS ?human) } OPTIONAL { ?x wdt:P606 ?flight } OPTIONAL { ?x wdt:P571 ?inc } OPTIONAL { ?x wdt:P580 ?start }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". } }`);
  const out = [];
  for (const r of rows) {
    const id = qid(r.x);
    if (out.some(c => c.id === id) || cards.some(c => c.id === id)) continue;
    const e = q.get(id), img = e.img || file(r.img);
    if (!img) { console.warn('Pas d\'image libre, ignoré :', r.xLabel); continue; }
    const b = year(r.birth), d = year(r.death), when = e.year ?? year(r.flight) ?? year(r.inc) ?? year(r.start);
    out.push({
      id, cat, name: e.name || cap(r.xLabel.replace(/ \(.+\)$/, '')), img, rarity: 'commune', family: cat,
      emblem: /\.svg$/i.test(img) || undefined, artwork: e.artwork || undefined, forceRarity: e.mythique ? 'mythique' : undefined,
      subtitle: e.sub, nl: { subtitle: e.subNl, ...(e.nlName && { name: e.nlName }) },
      meta: r.human ? [e.kind, b && `${b}${d ? '–' + d : ''}`].filter(Boolean).join(' · ') : [e.kind, when].filter(Boolean).join(' · '),
      stats: [r.human ? ['Naissance', b ?? '—'] : [e.kind === 'Avion' ? 'Premier vol' : 'Année', when ?? '—'], ['Type', e.kind], e.extra],
      links: +r.links,
    });
  }
  console.log(`${cat} : ${out.length} / ${list.length}`);
  return out;
  async function resolve(entries) { return (AJOUT ? resolveTitlesSparql : resolveTitles)(entries); }
}

// ---------- Mode --ajout=<catégorie> : ajoute une catégorie à data/cards.js sans tout régénérer ----------
// Garde toutes les autres cartes telles quelles et ne fait que des requêtes Wikidata (l'API Wikipédia limite fort).
// La rareté se fonde alors sur le nombre de Wikipédias ; une régénération complète la recalcule avec les visites.
// Catégories prises en charge : leur constructeur et, s'il y en a, les éditions limitées de leur paquet d'événement.
const AJOUTS = {
  militaire: { build: buildMilitaires, editions: EDITIONS_ARMISTICE }, animal: { build: buildAnimaux, editions: [] },
  aviation: { build: () => buildRoute('aviation', AVIATION), editions: [] }, rail: { build: () => buildRoute('rail', RAIL), editions: [] },
  exploration: { build: () => buildRoute('exploration', EXPLORATION), editions: [] },
};
const AJOUT = (process.argv.find(a => a.startsWith('--ajout=')) || '').slice(8);
if (AJOUT) {
  const job = AJOUTS[AJOUT];
  if (!job) throw new Error(`--ajout : catégorie inconnue « ${AJOUT} » (possibles : ${Object.keys(AJOUTS).join(', ')})`);
  globalThis.window = {};
  (0, eval)(readFileSync(new URL('../data/cards.js', import.meta.url), 'utf8'));
  const edPacks = new Set(job.editions.map(e => e[1]));
  const keep = window.CARDS.filter(c => c.cat !== AJOUT && !(c.cat === 'edition' && edPacks.has(c.pack)));
  cards.splice(0, cards.length, ...keep);
  const added = await job.build(resolveTitlesSparql);
  rarityByQuota(added, c => c.links);
  for (const c of added) delete c.links;
  const eds = job.editions.length ? await resolveTitlesSparql(job.editions.map(([title, pack, rarity, name, nlName, text, nlText]) => ({ title, pack, rarity, name, nlName, text, nlText }))) : new Map();
  const p18 = !eds.size ? new Map() : new Map((await sparql(`SELECT ?x ?img WHERE { VALUES ?x { ${[...eds.keys()].map(q => 'wd:' + q).join(' ')} } ?x wdt:P18 ?img }`)).map(r => [qid(r.x), file(r.img)]));
  for (const [id, e] of eds) {
    if (!p18.get(id)) { console.warn('Édition limitée sans image, ignorée :', e.name); continue; }
    added.push({ id, cat: 'edition', pack: e.pack, name: e.name, rarity: e.rarity, img: p18.get(id), subtitle: 'Édition limitée', text: e.text,
      nl: { name: e.nlName, subtitle: 'Beperkte editie', text: e.nlText }, stats: [['Édition', e.pack]] });
  }
  // Noms néerlandais
  const nl = await sparql(`SELECT ?x ?l WHERE { VALUES ?x { ${added.filter(c => c.cat !== 'edition').map(c => 'wd:' + c.id).join(' ')} } ?x rdfs:label ?l. FILTER(LANG(?l) = "nl") }`);
  for (const r of nl) { const c = added.find(x => x.id === qid(r.x)); if (c && !c.nl?.name && r.l !== c.name) c.nl = { ...c.nl, name: cap(r.l.replace(/ \(.+\)$/, '')) }; }
  cards.push(...added);
  saveCache();
  writeFileSync('data/cards.js',
    '// Généré par tools/build-cards.mjs. Données : Wikidata (CC0). Images : Wikimedia Commons.\n' +
    'window.CARDS = ' + JSON.stringify(cards) + ';\n' +
    'window.POS_NL = ' + JSON.stringify(window.POS_NL) + ';\n');
  execFileSync(process.execPath, [new URL('./build-images.mjs', import.meta.url).pathname], { stdio: 'inherit' });
  const table = {};
  for (const c of added) table[c.rarity] = (table[c.rarity] || 0) + 1;
  console.log(`Ajout « ${AJOUT} » : ${added.length} cartes`, JSON.stringify(table));
  process.exit(0);
}

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

  // La fonction actuelle (lue sur Wikipédia) ne se répète pas avec la même fonction encore ouverte sur Wikidata
  const notNow = t => !(o.current && !t.en && t.cab?.name === o.current.cab.name);
  const pmPast = pmTerms.filter(notNow), minPast = ministries.filter(notNow);
  const roles = [
    ...(o.current ? [`${o.current.role} — ${o.current.cab.name} (en fonction)`] : []),
    ...pmPast.map(t => `Premier ministre${t.cab ? ` — Gouv. ${t.cab.name}` : ''}${span(t.st, t.en) ? ` (${span(t.st, t.en)})` : ''}`),
    ...regional.map(t => `${t.label}${span(t.st, t.en) ? ` (${span(t.st, t.en)})` : ''}`),
    ...minPast.map(t => `${t.label}${t.cab ? ` — Gouv. ${t.cab.name}` : ''}${span(t.st, t.en) ? ` (${span(t.st, t.en)})` : ''}`),
    ...(legNums.length
      ? legNums.map(n => 'Député fédéral — ' + legLabel(legislatures.find(l => l.n === n)))
      : mpTerms.length ? [`Député fédéral${span(mpTerms[0].st, mpTerms.at(-1).en) ? ` (${span(mpTerms[0].st, mpTerms.at(-1).en)})` : ''}`] : []),
  ];
  // Version structurée du parcours, pour l'afficher dans les deux langues
  const rolesData = [
    ...(o.current ? [{ pos: o.current.vpm ? 'VPM' : o.current.pm ? PM : 'MIN', fr: o.current.role, cab: o.current.cab.name, live: true }] : []),
    ...pmPast.map(t => ({ pos: PM, fr: 'Premier ministre', cab: t.cab?.name, span: span(t.st, t.en) })),
    ...regional.map(t => ({ pos: t.pos, fr: t.label, span: span(t.st, t.en) })),
    ...minPast.map(t => ({ pos: t.pos, fr: t.label, cab: t.cab?.name, span: span(t.st, t.en) })),
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
// Un « titre » de la forme Q123 désigne directement l'élément Wikidata (sujet sans article Wikipédia FR ni NL).
async function resolveTitles(entries) {
  const out = new Map(); // qid → entrée
  const missing = [];
  for (const e of entries) if (isQ(e.title)) out.set(e.title, e);
  entries = entries.filter(e => !isQ(e.title));
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
// Image libre : P18 sur Wikidata, sinon image principale (libre) de l'article Wikipédia (FR, ou NL pour les titres « nl: »)
// Image principale libre d'un article Wikipédia — jamais une carte de localisation ou un plan (ex. « Belgium adm location map.svg »)
const NOT_A_PICTURE = /location[ _]map|locator|adm[ _]location|\bmap\b|carte[ _]de[ _]localisation|ligging|plattegrond/i;
async function freePageImage(title, lang = 'fr') {
  if (title.startsWith('nl:')) [lang, title] = ['nl', title.slice(3)];
  const res = await wikiApi(lang, { action: 'query', prop: 'pageimages', piprop: 'name', pilicense: 'free', redirects: '1', titles: title });
  const f = res.query?.pages?.[0]?.pageimage?.replace(/_/g, ' ');
  return f && !NOT_A_PICTURE.test(f) ? f : null;
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
  // INSAS retiré : aucune image libre de l'école sur Commons (seulement un fusil indien homonyme)
  ...['La Cambre (école)', 'Conservatoire royal de Bruxelles',
    'Académie royale des beaux-arts de Bruxelles', 'Académie royale des beaux-arts d\'Anvers']
    .map(title => ({ title, kind: 'École d\'art' })),
];
// Image choisie à la main quand Wikidata n'en a pas (HEPL : logo libre de 79 px seulement, on prend une photo du site)
const SCHOOL_IMG = { Q3128589: 'Haute Ecole de la Province de Liège - Site Gloesener.jpg' };
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
  const img = SCHOOL_IMG[o.id] || o.img || o.logo || await freePageImage(st.replace(/^nl:/, ''), st.startsWith('nl:') ? 'nl' : 'fr');
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
  Inventions: ['Adolphe Sax', 'Zénobe Gramme', 'Leo Baekeland', 'Étienne Lenoir', 'Jan Pieter Minckelers', 'Jean-Joseph Merlin', 'Robert Cailliau',
    'Charles van de Poele', 'Lieven Gevaert', 'Ernest Solvay'],
  Mathématiques: ['Gérard Mercator', 'Pierre Deligne', 'Ingrid Daubechies', 'Jean Bourgain', 'Grégoire de Saint-Vincent'],
  'Espace & exploration': ['Frank De Winne', 'Dirk Frimout', 'Adrien de Gerlache', 'Paul Otlet'],
};
// Ce qui a rendu chaque savant célèbre (fiche détail) : titre de la liste → [[FR…], [NL…], sous-titre FR, sous-titre NL].
// Le sous-titre est facultatif : il remplace la description Wikidata quand elle est trompeuse ou absente.
const KNOWN = {
  'Georges Lemaître': [['La théorie du Big Bang (« atome primitif », 1931)', 'L’expansion de l’Univers (loi de Hubble-Lemaître, 1927)'],
    ['De oerknaltheorie (“oeratoom”, 1931)', 'De uitdijing van het heelal (wet van Hubble-Lemaître, 1927)']],
  'François Englert': [['Le mécanisme de Brout-Englert-Higgs (1964)', 'Prix Nobel de physique 2013'], ['Het Brout-Englert-Higgsmechanisme (1964)', 'Nobelprijs voor de Natuurkunde 2013']],
  'Ilya Prigogine': [['La thermodynamique hors d’équilibre et les structures dissipatives', 'Prix Nobel de chimie 1977'],
    ['De thermodynamica buiten evenwicht en dissipatieve structuren', 'Nobelprijs voor de Scheikunde 1977']],
  'Adolphe Quetelet': [['L’indice de masse corporelle (IMC)', 'L’« homme moyen », pionnier de la statistique sociale', 'La fondation de l’Observatoire royal de Belgique'],
    ['De body-mass index (BMI)', 'De “gemiddelde mens”, pionier van de sociale statistiek', 'De oprichting van de Koninklijke Sterrenwacht van België']],
  'Simon Stevin': [['La notation décimale (De Thiende, 1585)', 'Le plan incliné et l’équilibre des forces', 'Les mots néerlandais « wiskunde » et « natuurkunde »'],
    ['De decimale notatie (De Thiende, 1585)', 'Het hellend vlak en het krachtenevenwicht', 'De woorden “wiskunde” en “natuurkunde”']],
  'Jean-Baptiste Van Helmont': [['L’invention du mot « gaz »', 'L’expérience du saule, sur la croissance des plantes'], ['Het woord “gas”', 'Het wilgenexperiment, over de groei van planten']],
  'André Vésale': [['De humani corporis fabrica (1543)', 'La fondation de l’anatomie moderne'], ['De humani corporis fabrica (1543)', 'De grondslag van de moderne anatomie']],
  'Christian de Duve': [['La découverte des lysosomes et des peroxysomes', 'Prix Nobel de médecine 1974'], ['De ontdekking van lysosomen en peroxisomen', 'Nobelprijs voor de Geneeskunde 1974']],
  'Albert Claude': [['La microscopie électronique de la cellule et le fractionnement cellulaire', 'Prix Nobel de médecine 1974'],
    ['Elektronenmicroscopie van de cel en celfractionering', 'Nobelprijs voor de Geneeskunde 1974']],
  'Jules Bordet': [['La bactérie de la coqueluche (Bordetella pertussis)', 'Prix Nobel de médecine 1919, pour ses travaux sur l’immunité'],
    ['De kinkhoestbacterie (Bordetella pertussis)', 'Nobelprijs voor de Geneeskunde 1919, voor zijn werk over immuniteit']],
  'Corneille Heymans': [['Le rôle du sinus carotidien dans la régulation de la respiration', 'Prix Nobel de médecine 1938'],
    ['De rol van de sinus caroticus bij de regeling van de ademhaling', 'Nobelprijs voor de Geneeskunde 1938']],
  'Paul Janssen': [['La fondation de Janssen Pharmaceutica', 'Plus de 80 médicaments, dont l’halopéridol et le fentanyl'],
    ['De oprichting van Janssen Pharmaceutica', 'Meer dan 80 geneesmiddelen, waaronder haloperidol en fentanyl']],
  'Peter Piot': [['La codécouverte du virus Ebola (1976)', 'La direction de l’ONUSIDA, dont il a été le premier directeur'],
    ['De mede-ontdekking van het ebolavirus (1976)', 'De leiding van UNAIDS, als eerste directeur']],
  'Marc Van Montagu': [['Les premières plantes génétiquement modifiées (plasmide Ti d’Agrobacterium)', 'Prix mondial de l’alimentation 2013'],
    ['De eerste genetisch gewijzigde planten (Ti-plasmide van Agrobacterium)', 'World Food Prize 2013']],
  'Rembert Dodoens': [['Le Cruydeboeck (1554), grand herbier de la Renaissance'], ['Het Cruydeboeck (1554), groot kruidboek van de renaissance'],
    'Médecin et botaniste flamand', 'Vlaams arts en botanicus'],
  'Édouard Van Beneden': [['La méiose et le rôle des chromosomes dans la fécondation (1883)'], ['De meiose en de rol van chromosomen bij de bevruchting (1883)']],
  'Adolphe Sax': [['Le saxophone (breveté en 1846)', 'Les saxhorns'], ['De saxofoon (gepatenteerd in 1846)', 'De saxhoorns'],
    'Facteur d’instruments, inventeur du saxophone', 'Instrumentenbouwer, uitvinder van de saxofoon'],
  'Zénobe Gramme': [['La dynamo Gramme, première génératrice électrique industrielle'], ['De dynamo van Gramme, eerste industriële elektrische generator']],
  'Leo Baekeland': [['La bakélite (1907), premier plastique synthétique', 'Le papier photographique Velox'], ['Bakeliet (1907), de eerste synthetische kunststof', 'Het Velox-fotopapier'],
    'Chimiste belgo-américain, né à Gand', 'Belgisch-Amerikaans scheikundige, geboren in Gent'],
  'Étienne Lenoir': [['Le premier moteur à combustion interne commercialisé (1860)'], ['De eerste commercieel verkochte verbrandingsmotor (1860)']],
  'Jan Pieter Minckelers': [['Le gaz d’éclairage tiré du charbon (1785)'], ['Lichtgas uit steenkool (1785)'],
    'Chimiste né à Maastricht, professeur à Louvain', 'Scheikundige uit Maastricht, professor in Leuven'],
  'Jean-Joseph Merlin': [['Les patins à roulettes', 'Des automates et des instruments de musique'], ['De rolschaats', 'Automaten en muziekinstrumenten']],
  'Robert Cailliau': [['Le World Wide Web, avec Tim Berners-Lee au CERN (1990)'], ['Het World Wide Web, met Tim Berners-Lee bij CERN (1990)']],
  'Charles van de Poele': [['Le tramway électrique à perche (trolley) aux États-Unis'], ['De elektrische tram met trolleystang in de Verenigde Staten'],
    'Inventeur belgo-américain', 'Belgisch-Amerikaans uitvinder'],
  'Lieven Gevaert': [['La fondation de Gevaert (aujourd’hui Agfa-Gevaert) : papiers et films photographiques'], ['De oprichting van Gevaert (nu Agfa-Gevaert): fotopapier en film'],
    'Industriel de la photographie', 'Fotografie-industrieel'],
  'Ernest Solvay': [['Le procédé Solvay de fabrication de la soude (1861)', 'Les conseils Solvay de physique (1911)'],
    ['Het solvayproces voor de productie van soda (1861)', 'De Solvayconferenties over natuurkunde (1911)']],
  'Gérard Mercator': [['La projection de Mercator (1569)', 'Le mot « atlas » pour un recueil de cartes'], ['De mercatorprojectie (1569)', 'Het woord “atlas” voor een kaartenboek']],
  'Pierre Deligne': [['La démonstration des conjectures de Weil (1974)', 'Médaille Fields 1978, prix Abel 2013'], ['Het bewijs van de vermoedens van Weil (1974)', 'Fieldsmedaille 1978, Abelprijs 2013']],
  'Ingrid Daubechies': [['Les ondelettes de Daubechies, utilisées pour compresser les images (JPEG 2000)'], ['De Daubechies-wavelets, gebruikt om beelden te comprimeren (JPEG 2000)']],
  'Jean Bourgain': [['L’analyse harmonique et les équations aux dérivées partielles', 'Médaille Fields 1994'], ['Harmonische analyse en partiële differentiaalvergelijkingen', 'Fieldsmedaille 1994']],
  'Grégoire de Saint-Vincent': [['La quadrature de l’hyperbole, précurseur du logarithme naturel'], ['De kwadratuur van de hyperbool, voorloper van de natuurlijke logaritme']],
  'Frank De Winne': [['Le premier commandant européen de la Station spatiale internationale (2009)'], ['De eerste Europese commandant van het internationale ruimtestation (2009)']],
  'Dirk Frimout': [['Le premier Belge dans l’espace (navette Atlantis, 1992)'], ['De eerste Belg in de ruimte (spaceshuttle Atlantis, 1992)']],
  'Adrien de Gerlache': [['L’expédition de la Belgica, premier hivernage en Antarctique (1897–1899)'], ['De Belgica-expeditie, eerste overwintering op Antarctica (1897–1899)']],
  'Paul Otlet': [['Le Mundaneum et la Classification décimale universelle', 'Un précurseur d’Internet'], ['Het Mundaneum en de Universele Decimale Classificatie', 'Een voorloper van het internet'],
    'Bibliographe, fondateur du Mundaneum', 'Bibliograaf, oprichter van het Mundaneum'],
};
for (const t of Object.values(SCIENCES).flat()) if (!KNOWN[t]) console.warn('Savant sans « connu pour » :', t);
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
  const { field, title } = sciQ.get(id);
  const [known, knownNl, sub, subNl] = KNOWN[title.replace(/^nl:/, '')] || [];
  const links = +f.links;
  const b = year(f.birth), d = year(f.death);
  cards.push({
    id, cat: 'science', name: f.pLabel, img: file(f.img), rarity: 'commune', family: 'science',
    known, nl: knownNl ? { known: knownNl, ...(subNl && { subtitle: subNl }) } : undefined,
    subtitle: sub || (f.desc ? cap(f.desc) : field), meta: field + (b ? ` · ${b}${d ? '–' + d : ''}` : ''),
    stats: [['Naissance', b ?? '—'], d ? ['Décès', d] : ['Domaine', field.split(' & ')[0]], ['Wikipédias', links]],
  });
}
console.log(`Sciences : ${cards.filter(c => c.cat === 'science').length}`);

for (const c of [...await buildMilitaires(resolveTitles), ...await buildAnimaux(resolveTitles),
  ...await buildRoute('aviation', AVIATION), ...await buildRoute('rail', RAIL), ...await buildRoute('exploration', EXPLORATION)]) { delete c.links; cards.push(c); }

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
  ['Stella Artois', 'Pils', 'Flandre'], ['Jupiler', 'Pils', 'Wallonie'], ['Kwak (bière)', 'Ambrée', 'Flandre'],
  ['Delirium Tremens (bière)', 'Blonde forte', 'Flandre'], ['La Chouffe', 'Blonde', 'Wallonie'], ['Kriek', 'Lambic', 'Bruxelles'],
  ['Gueuze', 'Lambic', 'Bruxelles'], ['Lambic', 'Lambic', 'Bruxelles'], ['Tripel Karmeliet', 'Triple', 'Flandre'],
  ['Brasserie Cantillon', 'Brasserie', 'Bruxelles'], ['Rodenbach (bière)', 'Rouge des Flandres', 'Flandre'], ['nl:Brugse Zot', 'Blonde', 'Flandre'],
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
  ['Carnaval de Binche', 'Carnaval', 'Wallonie', 'unesco'], ['Gille', 'Personnage', 'Wallonie'], ['Ducasse de Mons', 'Ducasse', 'Wallonie', 'unesco'],
  ['Ommegang de Bruxelles', 'Cortège', 'Bruxelles', 'unesco'], ['Ducasse d\'Ath', 'Ducasse', 'Wallonie', 'unesco'], ['Procession du Saint-Sang', 'Procession', 'Flandre', 'unesco'],
  ['Meyboom', 'Fête', 'Bruxelles', 'unesco'], ['Kattenstoet', 'Cortège', 'Flandre'], ['Marches de l\'Entre-Sambre-et-Meuse', 'Marche', 'Wallonie', 'unesco'],
  ['Carnaval d\'Alost', 'Carnaval', 'Flandre'], ['Cwarmê', 'Carnaval', 'Wallonie', 'unesco'], ['Laetare de Stavelot', 'Carnaval', 'Wallonie'],
  ['Tchantchès', 'Personnage', 'Wallonie'], ['Saint-Nicolas (fête)', 'Fête', 'Belgique'], ['Géants et dragons processionnels de Belgique et de France', 'Tradition', 'Belgique', 'unesco'],
  ['Pêche aux crevettes à cheval à Oostduinkerke', 'Tradition', 'Flandre', 'unesco'], ['Fêtes de Wallonie', 'Fête', 'Wallonie'], ['Tour Sainte-Gertrude', 'Procession', 'Wallonie'],
], { family: 'folklore', thresholds: [20, 10, 6, 3], kindLabel: 'Folklore',
  stats: (o, e) => [['Type', e.kind], ['Région', e.region], ['UNESCO', e.extra === 'unesco' ? 'Oui' : '—']] });

await curated('groupe', [
  ['dEUS', 'Rock', 'Flandre'], ['Hooverphonic', 'Trip hop', 'Flandre'], ['Front 242', 'EBM', 'Bruxelles'], ['K\'s Choice', 'Rock', 'Flandre'],
  ['Girls in Hawaii', 'Indie', 'Wallonie'], ['Technotronic', 'Dance', 'Bruxelles'], ['Vaya Con Dios', 'Pop', 'Bruxelles'], ['Soulwax', 'Électro', 'Flandre'],
  ['Ghinzu', 'Rock', 'Bruxelles'], ['Clouseau', 'Pop', 'Flandre'], ['Milk Inc.', 'Dance', 'Flandre'], ['Triggerfinger', 'Rock', 'Flandre'],
  ['Oscar and the Wolf', 'Pop', 'Flandre'], ['Balthazar (groupe)', 'Indie', 'Flandre'], ['Puggy', 'Pop rock', 'Bruxelles'], ['Telex (groupe)', 'Synthpop', 'Bruxelles'],
  ['Dimitri Vegas & Like Mike', 'EDM', 'Flandre'], ['Arsenal (groupe)', 'Électro', 'Flandre'], ['Mud Flow', 'Rock', 'Bruxelles'], ['Les Snuls', 'Humour', 'Bruxelles'],
], { family: 'groupe', thresholds: [35, 20, 12, 6], kindLabel: 'Groupe',
  stats: (o, e) => [['Genre', e.kind], ['Formation', o.inc ?? '—'], ['Wikipédias', o.links]] });

await curated('festival', [
  ['Tomorrowland (festival)', 'Électro', 'Flandre'], ['Rock Werchter', 'Rock', 'Flandre'], ['Dour Festival', 'Alternatif', 'Wallonie'],
  ['Francofolies de Spa', 'Chanson', 'Wallonie'], ['Pukkelpop', 'Rock', 'Flandre'], ['Graspop Metal Meeting', 'Metal', 'Flandre'],
  ['Les Ardentes', 'Hip-hop', 'Wallonie'], ['Couleur Café', 'Musiques du monde', 'Bruxelles'], ['Gentse Feesten', 'Fête populaire', 'Flandre'],
  ['Esperanzah!', 'Musiques du monde', 'Wallonie'], ['nl:Lokerse Feesten', 'Rock', 'Flandre'], ['Brussels International Fantastic Film Festival', 'Cinéma', 'Bruxelles'],
  ['nl:Ronquières Festival', 'Pop', 'Wallonie'], ['Festival international du film francophone de Namur', 'Cinéma', 'Wallonie'], ['Brussels Jazz Weekend', 'Jazz', 'Bruxelles'],
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
// Régions : légendaires. Provinces : épiques pour les 4 plus peuplées, rares pour les autres.
const provByPop = [...tm.values()].filter(o => o.type === 'province').sort((a, b) => b.pop - a.pop).map(o => o.id);
for (const o of tm.values()) {
  const name = o.id === 'Q231' ? 'Région wallonne' : provName(o.name);
  cards.push({
    id: o.id, cat: o.type, name, rarity: o.type === 'region' ? 'legendaire' : provByPop.indexOf(o.id) < 4 ? 'epique' : 'rare',
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
// Rareté des événements selon leur importance
const EVENT_RARITY = { 'ev-541': 'mythique', 'ev-federal': 'mythique', 'ev-question': 'legendaire', 'ev-vote': 'legendaire', 'ev-fusion77': 'epique', 'ev-fusion25': 'epique' };
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
  cards.push({ id, cat: 'evenement', name, rarity: EVENT_RARITY[id] || 'legendaire', img: null, subtitle, text, stats });

// ---------- Éditions limitées : cartes exclusives aux paquets spéciaux ----------
// Trois cartes par paquet spécial (une épique, une légendaire, une mythique), qu'on ne trouve nulle part ailleurs.
// Le paquet est l'identifiant utilisé dans app.js (PACKS et EVENT_PACKS). Rareté fixée à la main.
// [titre Wikipédia FR, paquet, rareté, nom FR, nom NL, texte FR, texte NL, options]
// Options : img (image imposée, à la place de P18), artwork (tableau ou affiche, affiché en entier).
const EDITIONS = [
  ...EDITIONS_ARMISTICE,
  ['Ordre de Léopold', 'prestige', 'mythique', 'Ordre de Léopold', 'Leopoldsorde',
    'La plus haute distinction honorifique belge, créée en 1832 par Léopold Ier.', 'De hoogste Belgische onderscheiding, in 1832 ingesteld door Leopold I.'],
  ['Armoiries de la Belgique', 'prestige', 'legendaire', 'Grandes armoiries', 'Groot wapen van België',
    'Le lion belge entouré des bannières des neuf provinces d’origine, sous la devise « L’union fait la force ».', 'De Belgische leeuw tussen de banieren van de negen oorspronkelijke provincies, onder de wapenspreuk “Eendracht maakt macht”.'],
  ['Butte du Lion', 'prestige', 'epique', 'Butte du Lion', 'Leeuw van Waterloo',
    'Colline artificielle de 40 mètres élevée en 1826 sur le champ de bataille de Waterloo.', 'Kunstmatige heuvel van 40 meter, in 1826 opgeworpen op het slagveld van Waterloo.'],
  ['Nicolas de Myre', 'saint-nicolas', 'mythique', 'Saint Nicolas de Myre', 'Sint-Nicolaas van Myra',
    'Évêque de Myre au IVᵉ siècle, patron des enfants, à l’origine de la fête du 6 décembre.', 'Bisschop van Myra in de 4de eeuw, patroonheilige van de kinderen, oorsprong van het feest op 6 december.', { artwork: true }],
  ['Cougnou', 'saint-nicolas', 'legendaire', 'Cougnou', 'Cougnou',
    'Pain brioché en forme d’enfant emmailloté, des fêtes de fin d’année.', 'Briochebrood in de vorm van een ingebakerd kindje, voor de eindejaarsfeesten.'],
  ['Massepain', 'saint-nicolas', 'epique', 'Massepain', 'Marsepein',
    'Pâte d’amande moulée en fruits et en figurines, un classique des souliers de Saint-Nicolas.', 'Amandelspijs in de vorm van fruit en figuurtjes, een klassieker in de schoen van Sinterklaas.', { img: 'Lebensmittel-Marzipan1-Asio.jpg' }],
  ['Bal du Rat mort', 'carnaval', 'mythique', 'Bal du Rat Mort', 'Bal du Rat Mort',
    'Le grand bal masqué d’Ostende, depuis 1898. James Ensor en a dessiné l’affiche.', 'Het grote gemaskerde bal van Oostende, sinds 1898. James Ensor tekende de affiche.', { artwork: true }],
  ['Carnaval des Ours', 'carnaval', 'legendaire', 'Carnaval des Ours', 'Berencarnaval',
    'Le carnaval d’Andenne, la ville de l’ours.', 'Het carnaval van Andenne, de stad van de beer.'],
  ['Chinels', 'carnaval', 'epique', 'Chinels', 'Chinels',
    'Les personnages bossus et bruyants du carnaval de Fosses-la-Ville.', 'De gebochelde, luidruchtige figuren van het carnaval van Fosses-la-Ville.'],
  ['Mur de Grammont', 'ronde', 'mythique', 'Mur de Grammont', 'Muur van Geraardsbergen',
    'Côte pavée couronnée par sa chapelle, monument du cyclisme flamand.', 'Kasseihelling met de kapel op de top, monument van de Vlaamse wielersport.'],
  ['Koppenberg', 'ronde', 'legendaire', 'Koppenberg', 'Koppenberg',
    'Côte pavée si raide que les coureurs doivent parfois mettre pied à terre.', 'Zo steile kasseihelling dat renners soms te voet verder moeten.'],
  ['Vieux Quaremont', 'ronde', 'epique', 'Vieux Quaremont', 'Oude Kwaremont',
    'Longue montée pavée de plus de 2 km, juge du final du Tour des Flandres.', 'Lange kasseiklim van ruim 2 km, scherprechter in de finale van de Ronde.'],
  ['Iris pseudacorus', 'iris', 'mythique', 'Iris des marais', 'Gele lis',
    'L’iris jaune des marais de la Senne, emblème de la Région bruxelloise.', 'De gele lis uit de moerassen van de Zenne, symbool van het Brussels Gewest.', { img: 'Illustration Iris pseudacorus0.jpg', artwork: true }],
  ['Jeanneke-Pis', 'iris', 'legendaire', 'Jeanneke-Pis', 'Jeanneke Pis',
    'La petite sœur de Manneken-Pis, installée en 1987 dans l’impasse de la Fidélité.', 'Het zusje van Manneken Pis, sinds 1987 in de Getrouwheidsgang.'],
  ['Het Zinneke', 'iris', 'epique', 'Zinneke Pis', 'Het Zinneke',
    'Le chien de Tom Frantzen (1998), hommage aux Bruxellois de toutes origines.', 'De hond van Tom Frantzen (1998), eerbetoon aan de Brusselaars van alle origines.'],
  ['Bataille de Courtrai (1302)', 'onze-juillet', 'mythique', 'Bataille des Éperons d’or', 'Guldensporenslag',
    'Le 11 juillet 1302, les milices flamandes battent la chevalerie française à Courtrai.', 'Op 11 juli 1302 verslaan de Vlaamse milities de Franse ridders bij Kortrijk.', { img: 'Bataille de Courtrai (1302) - Français 2813.png', artwork: true }],
  ['Drapeau de Flandre', 'onze-juillet', 'legendaire', 'Lion des Flandres', 'Vlaamse Leeuw',
    'Le lion noir sur fond d’or, drapeau de la Communauté flamande.', 'De zwarte leeuw op een gouden veld, vlag van de Vlaamse Gemeenschap.'],
  ['Jan Breydel', 'onze-juillet', 'epique', 'Breydel et De Coninck', 'Breydel en De Coninck',
    'Les meneurs de la révolte brugeoise de 1302, statufiés sur le Markt de Bruges.', 'De leiders van de Brugse opstand van 1302, in brons op de Brugse Markt.'],
  ['Révolution belge', 'fete-nationale', 'mythique', 'Révolution belge', 'Belgische Revolutie',
    'Les Journées de septembre 1830 à Bruxelles, prélude à l’indépendance.', 'De Septemberdagen van 1830 in Brussel, aanloop naar de onafhankelijkheid.', { artwork: true }],
  ['Drapeau de la Belgique', 'fete-nationale', 'legendaire', 'Drapeau belge', 'Belgische vlag',
    'Noir, jaune, rouge : les couleurs du duché de Brabant, adoptées en 1831.', 'Zwart, geel, rood: de kleuren van het hertogdom Brabant, aangenomen in 1831.'],
  ['Colonne du Congrès', 'fete-nationale', 'epique', 'Colonne du Congrès', 'Congreskolom',
    'Colonne de 47 mètres en hommage au Congrès national, au pied de laquelle repose le Soldat inconnu.', 'Zuil van 47 meter ter ere van het Nationaal Congres, met aan de voet het graf van de Onbekende Soldaat.'],
  ['Échasseurs namurois', 'wallonie', 'mythique', 'Échasseurs namurois', 'Steltlopers van Namen',
    'Joutes sur échasses attestées à Namur depuis 1411, temps fort des Fêtes de Wallonie.', 'Steltgevechten in Namen, al sinds 1411, hoogtepunt van de Feesten van Wallonië.'],
  ['Drapeau de la Wallonie', 'wallonie', 'legendaire', 'Coq hardi', 'Waalse haan',
    'Le coq rouge sur fond jaune, emblème de la Wallonie depuis 1913.', 'De rode haan op een geel veld, embleem van Wallonië sinds 1913.'],
  ['Perron de Liège', 'wallonie', 'epique', 'Perron liégeois', 'Luikse Perron',
    'Colonne surmontée d’une pomme de pin, symbole des libertés liégeoises.', 'Zuil met een dennenappel, symbool van de Luikse vrijheden.'],
];
{
  const eds = await resolveTitles(EDITIONS.map(([title, pack, rarity, name, nlName, text, nlText, opt = {}]) => ({ title, pack, rarity, name, nlName, text, nlText, ...opt })));
  const rows = await sparql(`SELECT ?x ?img WHERE { VALUES ?x { ${[...eds.keys()].map(q => 'wd:' + q).join(' ')} } OPTIONAL { ?x wdt:P18 ?img } }`);
  const p18 = new Map(rows.map(r => [qid(r.x), file(r.img)]));
  let n = 0;
  for (const [id, e] of eds) {
    const img = e.img || p18.get(id) || await freePageImage(e.title);
    if (!img) { console.warn('Édition limitée sans image, ignorée :', e.name); continue; }
    cards.push({
      id, cat: 'edition', pack: e.pack, name: e.name, rarity: e.rarity, img, artwork: e.artwork || undefined,
      emblem: /\.svg$/i.test(img) || undefined, subtitle: 'Édition limitée', text: e.text,
      nl: { name: e.nlName, subtitle: 'Beperkte editie', text: e.nlText },
      stats: [['Édition', e.pack]], // remplacées dans le jeu par l'édition, le numéro et la période de vente
    });
    n++;
  }
  console.log(`Éditions limitées : ${n} / ${EDITIONS.length}`);
}

// ---------- Photos alternatives (pour la version « Plein cadre ») ----------
// Une autre photo libre de la personne sur Wikimedia Commons, si elle existe (voir le choix strict ci-dessous).
const ALT_CATS = new Set(['culture', 'sport', 'science', 'monarchie']);
const altTargets = cards.filter(c => c.img && (ALT_CATS.has(c.cat) || (c.cat === 'politique' && (c.current || ['epique', 'legendaire', 'mythique'].includes(c.rarity)))));
async function commonsApi(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  return getJSON(url, { delay: 300, label: 'Commons' });
}
// Choix strict : le fichier doit être indiqué sur Commons comme représentant cette personne et elle seule
// (« dépeint », P180), ne pas être une signature, une statue, une tombe…, et être assez grand.
// Sans fichier sûr, pas de photo alternative : la version Plein cadre reprend la photo principale.
const BAD_FILE = /signat|unterschrift|handtekening|firma|podpis|autograph|hommage|homenaje|buste|bust|statue|standbeeld|sculpt|beeld|plaque|gedenk|memorial|grave|graf|tomb|cimeti|begraaf|friedhof|cemetery|rue |straat|street|maison|huis|house|school|[eé]cole|stamp|timbre|postzegel|coin|munt|banknote|billet|medal|m[eé]daille|logo|coat|wapen|blason|map|carte|poster|affiche|cover|pochette|book|livre|boek|mural|graffiti|\.svg$|\.tif/i;
// Nature du fichier (P31) refusée : signature, sculpture, statue, buste, tombe, plaque, timbre, pièce, billet
const BAD_KIND = new Set(['Q188675', 'Q860861', 'Q179700', 'Q241045', 'Q173387', 'Q721747', 'Q37930', 'Q41207', 'Q47524', 'Q4006']);
// Fichiers vérifiés à l'œil et refusés malgré tout : personne perdue dans une foule, objet, statue, document…
const ALT_SKIP = new Set([
  "Van links naar rechts Joseph Bech , Dr Drees en Achilk N van Acker, Bestanddeelnr 909-3036.jpg",
  "CamilleHuysmans1966.jpg",
  "Benelux Regeringsconferentie in Congresgebouw, Den Haag links minister Luns en r, Bestanddeelnr 922-3494.jpg",
  "Flickr - europeanpeoplesparty - EPP debates on EU Constitution - Paris 8-9 March 2005 (41).jpg",
  "Pact van Brussel. Paul-Henri Spaak spreekt, Bestanddeelnr 902-6330.jpg",
  "Flickr - europeanpeoplesparty - EPP Political Bureau 9 November 2006 (104).jpg",
  "Belgische Minister President G. Eyskens en minister van Buitenlandse Zaken P. Ha, Bestanddeelnr 922-0717.jpg",
  "Hubert Pierlot Arthur Vanderpoorten Leopold III Paul-Henri Spaak generaal Henri Denis Kasteel van Wijnendale 25 mei 1940.jpg",
  "Calotte UCL 1921.jpg",
  "Bilateral Meeting Belgium (011110505) (51497184405).jpg",
  "Leopold I 26 June 1831.png",
  "Albert de Belgique (1875-1934), prince de Belgique, duc de Saxe, prince de Saxe-Cobourg-Gotha et héritier présomptif de , ND6644.jpg",
  "Llegada de los reyes de Bélgica, Balduino y Fabiola al muelle de San Sebastián (13 de 14) - Fondo Marín-Kutxa Fototeka.jpg",
  "Secretary Kerry Stands With Belgian King Philippe at the Royal Palace in Brussels (26025841495).jpg",
  "Opdracht Uitgeverij Bruna te Utrecht, Georges Simenon bij aankomst Schiphol, Bestanddeelnr 917-7512.jpg",
  "Victor Horta.jpg",
  "Willy Vandersteen with Spike and Suzy in a shopping mall in Hasselt.jpg",
  "Grab Marc Sleen.jpg",
  "Lost Frequencies - Superbloom Festival 2023 - DSC3536.jpg",
  "Wezembeek-Oppem Etterbeek Otlet (1) - 316438 - onroerenderfgoed.jpg",
  "Portret van de cartograaf Gerardus Mercator, RP-P-OB-62.847.jpg",
  "UBH Portr BS Vesalius A 1514 8.jpg",
  "With Prigogine.jpg",
  "Edouard van Beneden in front of the Aquarium et musée de zoologie.jpg",
  "Lieven Gevaert (tugboat, 1995) - IMO 9120140, Leopoldlock, Port of Antwerp, pic8.JPG",
]);
// Personnes sans photo alternative convenable sur Commons (vérifié à l'œil) : Achille van Acker, Gaston Eyskens, Wilfried Martens, Annelies Verlinden, Albert Ier, Baudouin Ier, Georges Simenon, Lost Frequencies, Paul Otlet, Gérard Mercator
const ALT_NONE = new Set(["Q14997", "Q14999", "Q313809", "Q99767918", "Q55008046", "Q12976", "Q128790", "Q18857432", "Q1868", "Q6353"]);
// Une photo de Commons qui représente cette personne et elle seule (P180), assez grande, ni signature ni statue…
async function strictDepict(id, skip = null) {
  const found = await commonsApi({ action: 'query', list: 'search', srnamespace: '6', srlimit: '15', srsearch: `haswbstatement:P180=${id} filetype:bitmap` });
  const hits = (found.query?.search || []).filter(h => !BAD_FILE.test(h.title) && h.title.replace(/^File:/, '') !== skip && !ALT_SKIP.has(h.title.replace(/^File:/, '')));
  if (!hits.length) return null;
  const ents = await commonsApi({ action: 'wbgetentities', ids: hits.map(h => 'M' + h.pageid).join('|'), props: 'claims' });
  const info = await commonsApi({ action: 'query', prop: 'imageinfo', iiprop: 'size|mime', titles: hits.map(h => h.title).join('|') });
  const size = new Map((info.query?.pages || []).map(p => [p.title, p.imageinfo?.[0]]));
  const pick = hits.find(h => {
    const st = ents.entities?.['M' + h.pageid]?.statements || {};
    const depicts = (st.P180 || []).map(x => x.mainsnak?.datavalue?.value?.id);
    const kinds = (st.P31 || []).map(x => x.mainsnak?.datavalue?.value?.id);
    const ii = size.get(h.title);
    return depicts.length === 1 && depicts[0] === id && !kinds.some(k => BAD_KIND.has(k)) &&
      ii && /jpeg|png/.test(ii.mime) && ii.width >= 500 && ii.height >= 500 && ii.width / ii.height < 1.9;
  });
  return pick ? pick.title.replace(/^File:/, '') : null;
}
let altFound = 0;
for (const c of altTargets) {
  if (ALT_NONE.has(c.id)) continue;
  const alt = await strictDepict(c.id, c.img);
  if (alt) { c.alt = alt; altFound++; }
}
console.log(`Photos alternatives : ${altFound} / ${altTargets.length}`);

// Photo d'un bourgmestre sans photo sur Wikidata, dans l'ordre : fichier Commons qui le représente seul (P180),
// image libre de son article Wikipédia, fichier de sa catégorie Commons portant son nom de famille.
// Les photos trouvées ainsi sont listées dans tools/.mayor-photos.txt pour être relues à l'œil
// (refus dans MAYOR_PHOTO_NONE, choix manuel dans MAYOR_PHOTO).
const MAYOR_PHOTO = {};
// Relu à l'œil et refusé : Fernand Van Trimpont (photo d'événement), Vincent De Wolf (photo de foule)
const MAYOR_PHOTO_NONE = new Set(['Q134592361', 'Q3559574']);
async function mayorPhoto(id, who, term) {
  const okFile = f => f && !BAD_FILE.test(f) && !ALT_SKIP.has(f) && /\.(jpe?g|png)$/i.test(f);
  const dep = await strictDepict(id);
  if (dep) return dep;
  if (term.link) {
    const f = await freePageImage(term.link, term.lang);
    if (okFile(f)) return f;
  }
  if (who.cat) {
    const surname = who.name.split(' ').filter(w => w.length > 2 && !/^(de|van|der|den|le|la|du)$/i.test(w)).pop();
    const r = await commonsApi({ action: 'query', list: 'categorymembers', cmtitle: 'Category:' + who.cat, cmtype: 'file', cmlimit: '30' });
    const files = (r.query?.categorymembers || []).map(m => m.title.replace(/^File:/, '')).filter(f => okFile(f) && surname && f.toLowerCase().includes(surname.toLowerCase()));
    if (files.length) {
      const info = await commonsApi({ action: 'query', prop: 'imageinfo', iiprop: 'size', titles: files.map(f => 'File:' + f).join('|') });
      const big = (info.query?.pages || []).filter(p => p.imageinfo?.[0]?.width >= 400 && p.imageinfo[0].height >= 400 && p.imageinfo[0].width / p.imageinfo[0].height < 1.6);
      if (big.length) return big[0].title.replace(/^File:/, '');
    }
  }
  return null;
}

// ---------- Bourgmestres ----------
// Qui est bourgmestre aujourd'hui : l'infobox de la commune sur Wikipédia NL, tenue à jour (élections de 2024,
// titulaire « empêché » devenu ministre et son remplaçant « faisant fonction »…) ; la FR en secours.
// Wikidata (P6) n'est pas à jour : il ne sert plus que pour les mandats terminés (avec une date de fin).
// Photo libre uniquement : celle de Wikidata (P18), sinon un fichier de Commons qui représente la personne seule.
// Une personne qui a déjà une carte (député, ministre…) garde sa carte : le mandat s'ajoute à son parcours.
{
  const de = n => /^[AEIOUYÉÈÊH]/i.test(n) ? `d’${n}` : `de ${n}`;
  const KIND_FR = { ff: 'Bourgmestre faisant fonction', emp: 'Bourgmestre empêché', old: 'Ancien bourgmestre' };
  const KIND_FR_F = { ...KIND_FR, emp: 'Bourgmestre empêchée', old: 'Ancienne bourgmestre' };
  const label = (kind, c, female) => `${(female ? KIND_FR_F : KIND_FR)[kind] || 'Bourgmestre'} ${de(c.name)}`;
  const ids = [...comm.keys()];

  // 1. Articles Wikipédia des communes, puis le paramètre « burgemeester » / « bourgmestre » de leur infobox
  const titles = { nl: new Map(), fr: new Map() };
  for (let i = 0; i < ids.length; i += 200) {
    for (const r of await sparql(`SELECT ?c ?t ?w WHERE { VALUES ?c { ${ids.slice(i, i + 200).map(q => 'wd:' + q).join(' ')} }
  ?a schema:about ?c; schema:isPartOf ?w; schema:name ?t. FILTER(?w IN (<https://nl.wikipedia.org/>, <https://fr.wikipedia.org/>)) }`)) {
      titles[r.w.includes('//nl.') ? 'nl' : 'fr'].set(r.t, qid(r.c));
    }
  }
  // Une ligne d'infobox → personnes, avec leur statut : « [[A]] (titelvoerend) - B (waarnemend) », « [[A]]<br>(waarnemend) »…
  const parseMayors = raw => {
    const out = [];
    const txt = raw.replace(/<\/?(small|span)[^>]*>/gi, '').replace(/\{\{(?:Lien|Link)\|[^}]*?\|?([^|}]+)\}\}/gi, '[[$1]]').replace(/<!--.*?-->/g, '');
    for (const seg of txt.split(/<br\s*\/?>|\s[-–]\s|;/i)) {
      const kind = /titelvoerend|verhinderd|empêch/i.test(seg) ? 'emp' : /waarnemend|faisant fonction|\bf\.?f\.?\b|wnd\.?|a\.i\./i.test(seg) ? 'ff' : null;
      const head = seg.split('(')[0];
      const link = head.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      const name = (link ? (link[2] || link[1]) : head.replace(/\[\[|\]\]|'{2,3}/g, '')).replace(/\s+/g, ' ').trim();
      if (name && /\p{L}{2,}/u.test(name) && !/^\d/.test(name)) out.push({ name, link: link?.[1]?.trim() || null, kind });
      else if (kind && out.length) out.at(-1).kind ||= kind; // « (waarnemend) » sur sa propre ligne
    }
    return out;
  };
  const infobox = { nl: new Map(), fr: new Map() };
  for (const lang of ['nl', 'fr']) {
    const list = [...titles[lang].keys()];
    for (let i = 0; i < list.length; i += 40) {
      const r = await wikiApi(lang, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: list.slice(i, i + 40).join('|'), redirects: '1' });
      const back = new Map([...(r.query?.normalized || []), ...(r.query?.redirects || [])].map(x => [x.to, x.from]));
      for (const pg of r.query?.pages || []) {
        let t = pg.title; while (back.has(t) && !titles[lang].has(t)) t = back.get(t);
        const id = titles[lang].get(t), txt = pg.revisions?.[0]?.slots?.main?.content || '';
        const m = txt.match(lang === 'nl' ? /\|\s*burgemeester\s*=\s*([^\n]*)/i : /\|\s*bourgmestre\s*=\s*([^\n]*)/i);
        if (!id || !m) continue;
        // Infobox FR souvent en retard : une ligne qui annonce un mandat terminé (« (2013-24) ») ne vaut rien
        if (lang === 'fr' && /\(\s*\d{4}\s*[-–]\s*(19|20)?\d{2}\s*\)/.test(m[1])) continue;
        infobox[lang].set(id, parseMayors(m[1]));
      }
    }
  }
  // 2. Bourgmestre en fonction : NL d'abord ; le faisant fonction l'emporte sur le titulaire empêché
  const current = new Map(); // commune → [{ name, link, lang, kind }]
  for (const id of ids) {
    const nl = infobox.nl.get(id) || [], fr = infobox.fr.get(id) || [];
    const people = (nl.length ? nl.map(p => ({ ...p, lang: 'nl' })) : fr.map(p => ({ ...p, lang: 'fr' }))).slice(0, 2);
    if (people.length === 2 && !people.some(p => p.kind)) people.length = 1; // deux noms sans statut : on garde le premier
    // Lien manquant d'un côté : on le cherche dans l'autre infobox (même nom)
    for (const p of people) if (!p.link) { const o = (p.lang === 'nl' ? fr : nl).find(x => x.link && x.name.toLowerCase() === p.name.toLowerCase()); if (o) { p.link = o.link; p.lang = p.lang === 'nl' ? 'fr' : 'nl'; } }
    if (people.length) current.set(id, people);
  }
  // Liens → Wikidata
  const qOfLink = new Map();
  for (const lang of ['nl', 'fr']) {
    const links = [...new Set([...current.values()].flat().filter(p => p.link && p.lang === lang).map(p => p.link))];
    for (let i = 0; i < links.length; i += 50) {
      const r = await wikiApi(lang, { action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', titles: links.slice(i, i + 50).join('|'), redirects: '1' });
      const back = new Map([...(r.query?.normalized || []), ...(r.query?.redirects || [])].map(x => [x.to, x.from]));
      for (const pg of r.query?.pages || []) {
        if (!pg.pageprops?.wikibase_item) continue;
        let t = pg.title; qOfLink.set(lang + ':' + t, pg.pageprops.wikibase_item);
        while (back.has(t)) { t = back.get(t); qOfLink.set(lang + ':' + t, pg.pageprops.wikibase_item); }
      }
    }
  }
  for (const people of current.values()) for (const p of people) p.q = p.link ? qOfLink.get(p.lang + ':' + p.link) || null : null;

  // 3. Mandats terminés (Wikidata P6 avec date de fin) et début des mandats en cours
  const rows = [];
  for (let i = 0; i < ids.length; i += 200) rows.push(...await sparql(`
SELECT ?c ?p ?pLabel ?st ?en WHERE {
  VALUES ?c { ${ids.slice(i, i + 200).map(q => 'wd:' + q).join(' ')} }
  ?c p:P6 ?s. ?s ps:P6 ?p. ?p wdt:P31 wd:Q5. OPTIONAL { ?s pq:P580 ?st } OPTIONAL { ?s pq:P582 ?en }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,nl,mul". }
}`));
  // Nom sans lien dans l'infobox : on le retrouve parmi les bourgmestres de la commune sur Wikidata
  const norm = n => (n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  for (const [cid, people] of current) for (const p of people) if (!p.q) p.q = rows.find(r => qid(r.c) === cid && norm(r.pLabel) === norm(p.name))?.p.split('/').pop() || null;
  // 4. Les personnes : nom, photo, naissance, partis
  const mayors = new Map();
  const add = (id, c, term) => { const o = mayors.get(id) || { id, terms: [] }; o.terms.push({ c, ...term }); mayors.set(id, o); };
  for (const r of rows) {
    const c = comm.get(qid(r.c)), id = qid(r.p);
    if (current.get(c.id)?.some(p => p.q === id)) continue; // toujours en fonction : le mandat actuel suffit
    // Mandat « en cours » sur Wikidata mais plus d'après Wikipédia : ancien bourgmestre, date de fin inconnue
    if (!r.en) { add(id, c, current.has(c.id) ? { kind: 'old', st: r.st } : { st: r.st }); continue; } // commune sans infobox : Wikidata seul
    add(id, c, { st: r.st, en: r.en });
  }
  for (const [cid, people] of current) for (const p of people) if (p.q) {
    // Début du mandat : celui de Wikidata s'il est ouvert, à défaut rien (on ne l'invente pas)
    const st = rows.filter(r => qid(r.c) === cid && qid(r.p) === p.q && !r.en).map(r => r.st).filter(Boolean).sort().at(-1);
    add(p.q, comm.get(cid), { live: true, kind: p.kind, st, link: p.link, lang: p.lang });
  }
  const pids = [...mayors.keys()];
  const info = new Map(), parties = new Map();
  for (let i = 0; i < pids.length; i += 200) {
    const vals = pids.slice(i, i + 200).map(q => 'wd:' + q).join(' ');
    for (const r of await sparql(`SELECT ?p ?pLabel ?img ?birth ?cat ?sex WHERE { VALUES ?p { ${vals} } ?p wdt:P31 wd:Q5.
  OPTIONAL { ?p wdt:P18 ?img } OPTIONAL { ?p wdt:P569 ?birth } OPTIONAL { ?p wdt:P373 ?cat } OPTIONAL { ?p wdt:P21 ?sex }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,nl,mul". } }`)) {
      const o = info.get(qid(r.p)) || { name: r.pLabel, img: file(r.img), birth: year(r.birth), cat: r.cat, female: qid(r.sex) === 'Q6581072' };
      o.img ||= file(r.img); o.cat ||= r.cat; info.set(qid(r.p), o);
    }
    for (const r of await sparql(`SELECT ?p ?party ?st ?en WHERE { VALUES ?p { ${vals} }
  ?p p:P102 ?s. ?s ps:P102 ?party; wikibase:rank ?rank. FILTER(?rank != wikibase:DeprecatedRank) OPTIONAL { ?s pq:P580 ?st } OPTIONAL { ?s pq:P582 ?en } }`))
      (parties.get(qid(r.p)) || parties.set(qid(r.p), []).get(qid(r.p))).push({ q: qid(r.party), st: year(r.st) || 0, en: r.en ? year(r.en) : Infinity });
  }
  // 5. Cartes
  const termSpan = t => t.kind === 'old' ? '' : t.live ? (t.st ? `depuis ${year(t.st)}` : '') : span(t.st, t.en);
  let added = 0, merged = 0, live = 0, depicted = 0;
  const foundPhotos = [];
  for (const o of mayors.values()) {
    const who = info.get(o.id);
    if (!who) continue; // pas un humain sur Wikidata
    const terms = o.terms.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || (b.st || b.en || '').localeCompare(a.st || a.en || ''));
    const rolesData = terms.map(t => ({ pos: 'MAYOR', commune: t.c.id, fr: label(t.kind, t.c, who.female), ...(t.kind ? { kind: t.kind } : {}), ...(t.live && t.kind !== 'emp' ? { live: true } : { span: termSpan(t) }) }));
    const roles = rolesData.map(r => r.fr + (r.live ? ' (en fonction)' : r.span ? ` (${r.span})` : ''));
    const main = terms[0], isLive = main.live && main.kind !== 'emp';
    if (isLive) live++;
    const existing = cards.find(c => c.id === o.id);
    if (existing) { // déjà une carte : le mandat rejoint le parcours
      existing.rolesData = [...(existing.rolesData || []), ...rolesData];
      existing.roles = [...(existing.roles || []), ...roles];
      merged++;
      continue;
    }
    let img = who.img;
    if (!img && isLive && !MAYOR_PHOTO_NONE.has(o.id)) { img = MAYOR_PHOTO[o.id] || await mayorPhoto(o.id, who, main); if (img) { depicted++; foundPhotos.push(`${who.name} (${main.c.name}) : ${img}`); } }
    if (!img || isQ(who.name)) continue;
    const list = (parties.get(o.id) || []).sort((a, b) => b.en - a.en || b.st - a.st);
    const partyQ = list.map(x => x.q).find(q => SHORT[q]) || list[0]?.q;
    const party = partyQ ? (SHORT[partyQ] || null) : null;
    const c = main.c;
    const prov = c.prov ? (/^[AEIOUÉ]/.test(c.prov) ? `Province d’${c.prov}` : `Province de ${c.prov}`) : 'Bruxelles-Capitale';
    cards.push({
      id: o.id, cat: 'bourgmestre', name: who.name, img, rarity: 'commune', mayorOf: c.id, ...(main.kind ? { mayorKind: main.kind } : {}), pop: c.pop,
      ...(isLive ? { current: true } : {}),
      subtitle: label(main.kind, c, who.female), meta: [prov, isLive ? 'En fonction' : termSpan(main)].filter(Boolean).join(' · '),
      party, family: partyFamily(partyQ), rolesData, roles,
      stats: [['Naissance', who.birth ?? '—'], ['Parti', party || '—'], ['Habitants', c.pop ? c.pop.toLocaleString('fr-BE') : '—']],
    });
    added++;
  }
  console.log(`Bourgmestres : ${current.size} communes lues sur Wikipédia, ${live} en fonction ; ${added} cartes (dont ${depicted} photos trouvées hors Wikidata), ${merged} mandats ajoutés à des cartes existantes`);
  writeFileSync(new URL('.mayor-photos.txt', import.meta.url), foundPhotos.join('\n') + '\n'); // à relire à l'œil
}

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
// Mythique : uniquement les icônes de la Belgique, choisies à la main (MYTHIQUES), plus les règles fixes
// (rois de 40 ans de règne, événements majeurs). Le reste de chaque catégorie est classé par notoriété
// et réparti selon les quotas, jusqu'à légendaire. Notoriété :
//   - communes : population ;
//   - politique : carrière (années comme Premier ministre, gouvernements, postes), Wikipédia pour départager ;
//   - autres : visites des articles sur Wikipédia FR + NL sur les 12 derniers mois (notoriété en Belgique),
//     à défaut le nombre de Wikipédias.
const MYTHIQUES = [
  'Jacques Brel', 'Hergé', 'René Magritte', 'Stromae', 'Eddy Merckx', 'Eden Hazard', 'Adolphe Sax', 'Georges Lemaître',
  'Wilfried Martens', 'Paul-Henri Spaak', 'Jean-Luc Dehaene', 'Bart De Wever',
  'Ville de Bruxelles', 'Anvers', 'Bruges', 'Gand', 'Liège',
  'Atomium', 'Manneken-Pis', 'Grand-Place de Bruxelles', 'Retable de l\'Agneau mystique',
  'Frite', 'Westvleteren (bière)', 'Tomorrowland (festival)', 'Carnaval de Binche',
  'Gabrielle Petit (résistante)', 'Andrée De Jongh', 'Malinois (chien)',
];
const FIXED_CATS = new Set(['monarchie', 'region', 'province', 'evenement', 'edition']); // trop petites : rareté fixée à la main
const linkIds = cards.filter(c => isQ(c.id)).map(c => c.id);
const LINKS = new Map();
for (let i = 0; i < linkIds.length; i += 300) {
  const rows = await sparql(`SELECT ?x ?links WHERE { VALUES ?x { ${linkIds.slice(i, i + 300).map(q => 'wd:' + q).join(' ')} } ?x wikibase:sitelinks ?links. }`);
  for (const r of rows) LINKS.set(qid(r.x), +r.links);
}
{
  const mq = await resolveTitles(MYTHIQUES.map(title => ({ title })));
  const byId = new Map(cards.map(c => [c.id, c]));
  for (const [q, e] of mq) {
    const c = byId.get(q);
    if (!c) console.warn('Mythique sans carte (absente du jeu) :', e.title);
    else if (!FIXED_CATS.has(c.cat)) c.forceRarity = 'mythique';
  }
  // Une rareté imposée ailleurs (ex. 'mythique' dans les listes) ne compte que si la carte est dans MYTHIQUES
  for (const c of cards) if (c.forceRarity === 'mythique' && !mq.has(c.id)) delete c.forceRarity;
}

// Visites des 12 derniers mois complets sur Wikipédia FR et NL
const VIEW_CATS = new Set(['culture', 'sport', 'science', 'militaire', 'animal', 'aviation', 'rail', 'exploration', 'art', 'monument', 'chateau', 'folklore', 'gastronomie', 'biere', 'enseignement', 'groupe', 'festival']);
const VIEWS = new Map();
{
  const d = new Date(), endM = new Date(d.getFullYear(), d.getMonth(), 0), startM = new Date(endM.getFullYear() - 1, endM.getMonth() + 1, 1);
  const ym = x => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}`;
  const range = `${ym(startM)}01/${ym(endM)}${String(endM.getDate()).padStart(2, '0')}`;
  const ids = cards.filter(c => VIEW_CATS.has(c.cat) && isQ(c.id)).map(c => c.id);
  const titles = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const rows = await sparql(`SELECT ?x ?fr ?nl WHERE { VALUES ?x { ${ids.slice(i, i + 200).map(q => 'wd:' + q).join(' ')} }
  OPTIONAL { ?a schema:about ?x; schema:isPartOf <https://fr.wikipedia.org/>; schema:name ?fr }
  OPTIONAL { ?b schema:about ?x; schema:isPartOf <https://nl.wikipedia.org/>; schema:name ?nl } }`);
    for (const r of rows) titles.set(qid(r.x), { fr: r.fr, nl: r.nl });
  }
  let done = 0;
  for (const [id, t] of titles) {
    let v = 0;
    for (const lang of ['fr', 'nl']) {
      if (!t[lang]) continue;
      const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/user/${encodeURIComponent(t[lang].replace(/ /g, '_'))}/monthly/${range}`;
      try { v += (await getJSON(url, { delay: 60, label: 'Pageviews' })).items.reduce((a, m) => a + m.views, 0); } catch (_) { /* pas de données */ }
    }
    VIEWS.set(id, v);
    if (++done % 100 === 0) console.log(`Visites Wikipédia : ${done} / ${titles.size}`);
  }
}

const num = v => +String(v).replace(/[^\d]/g, '') || 0;
const spanYears = sp => {
  const m = String(sp || '').match(/(\d{4})(?:\s*–\s*(\d{4}))?/);
  if (!m) return 0;
  const a = +m[1], b = m[2] ? +m[2] : /depuis/.test(sp) ? new Date().getFullYear() : a;
  return Math.max(0.5, b - a);
};
function score(c) {
  const links = LINKS.get(c.id) || 0;
  if (c.cat === 'commune') return num(c.stats[0][1]);
  if (c.cat === 'bourgmestre') return (c.pop || 0) + links; // la taille de la commune d'abord
  if (c.cat === 'politique') {
    const roles = c.rolesData || [];
    const pmYears = roles.filter(r => r.pos === PM).reduce((a, r) => a + spanYears(r.span), 0);
    const regYears = roles.filter(r => REGIONAL[r.pos]).reduce((a, r) => a + spanYears(r.span), 0);
    return (pmYears ? 100 + pmYears * 30 : 0) + (c.current ? 40 : 0) + (c.posId === 'VPM' ? 20 : 0) + regYears * 6
      + new Set(roles.filter(r => r.cab).map(r => r.cab)).size * 5 + roles.filter(r => r.pos === MP).length * 2 + links * 0.1;
  }
  return VIEWS.has(c.id) ? VIEWS.get(c.id) + links : links;
}
const byCat = {};
for (const c of cards) (byCat[c.cat] ||= []).push(c);
for (const [cat, list] of Object.entries(byCat)) {
  if (FIXED_CATS.has(cat)) continue;
  rarityByQuota(list, score);
}
for (const c of cards) delete c.pop;
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
  if (!n || c.cat === 'edition') continue; // noms et textes néerlandais écrits à la main
  const nl = {};
  if (n.l && n.l !== c.name && !c.nl?.name) nl.name = cap(n.l.replace(/ van België$/, '').replace(/ \((bier|band|festival|gemeente)\)$/, ''));
  if (n.d && ['culture', 'sport', 'science'].includes(c.cat) && !c.nl?.subtitle) nl.subtitle = cap(n.d);
  if (Object.keys(nl).length) c.nl = { ...c.nl, ...nl };
}
console.log(`Néerlandais : ${cards.filter(c => c.nl?.name).length} noms traduits, ${Object.keys(POS_NL).length} fonctions`);

saveCache();
mkdirSync('data', { recursive: true });
writeFileSync('data/cards.js',
  '// Généré par tools/build-cards.mjs. Données : Wikidata (CC0). Images : Wikimedia Commons.\n' +
  'window.CARDS = ' + JSON.stringify(cards) + ';\n' +
  'window.POS_NL = ' + JSON.stringify(POS_NL) + ';\n');

// Adresses directes des images (data/images.js), pour un chargement rapide
execFileSync(process.execPath, [new URL('./build-images.mjs', import.meta.url).pathname], { stdio: 'inherit' });

const count = {};
for (const c of cards) count[c.cat + ' / ' + c.rarity] = (count[c.cat + ' / ' + c.rarity] || 0) + 1;
console.log(cards.length, 'cartes');
console.table(count);
