(() => {
  'use strict';
  // Dernières erreurs JavaScript, jointes (si on le veut) à un signalement de bug
  const RECENT_ERRORS = [];
  const keepError = msg => { RECENT_ERRORS.push(`${new Date().toISOString().slice(11, 19)} ${String(msg).slice(0, 200)}`); if (RECENT_ERRORS.length > 5) RECENT_ERRORS.shift(); };
  window.addEventListener('error', e => keepError(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
  window.addEventListener('unhandledrejection', e => keepError(e.reason?.message || e.reason));
  const { t, tv } = window.I18N;
  const L = () => window.I18N.lang;

  // ---------- Réglages ----------
  const RARITIES = [
    // sell : valeur de revente d'un doublon. Les cartes rares valent cher, les communes presque rien, si bien qu'un
    // paquet revendu en entier rapporte toujours environ 60 % de son prix (vérifié avec tools/simulate.mjs) :
    // acheter pour revendre ne paie pas.
    // Taux durcis en octobre 2026 (avant : 50 / 26 / 15,5 / 6 / 2,2 / 0,3) : une légendaire ou mieux tous les 7 à 8
    // paquets au lieu de 5, une mythique tous les 55 paquets au lieu de 40. Les cartes rares se revendent plus cher
    // en échange, pour que la revente d'un paquet reste au même niveau.
    { id: 'commune',     label: { fr: 'Commune',     nl: 'Gewoon' },        weight: 52,   sell: 1 },
    { id: 'peu-commune', label: { fr: 'Peu commune', nl: 'Ongewoon' },      weight: 27,   sell: 2 },
    { id: 'rare',        label: { fr: 'Rare',        nl: 'Zeldzaam' },      weight: 14.5, sell: 5 },
    { id: 'epique',      label: { fr: 'Épique',      nl: 'Episch' },        weight: 5,    sell: 25 },
    { id: 'legendaire',  label: { fr: 'Légendaire',  nl: 'Legendarisch' },  weight: 1.3,  sell: 110 },
    { id: 'mythique',    label: { fr: 'Mythique',    nl: 'Mythisch' },      weight: 0.2,  sell: 450 },
  ];
  const R = Object.fromEntries(RARITIES.map((r, i) => [r.id, { ...r, rank: i }]));
  const rl = id => R[id].label[L()];

  // Versions spéciales : indépendantes de la rareté
  const FINISHES = [
    { id: 'normal', label: { fr: 'Standard',    nl: 'Standaard' },   chance: 0,     mult: 1 },
    { id: 'holo',   label: { fr: 'Holo',        nl: 'Holo' },        chance: 0.08,  mult: 2 },
    { id: 'plein',  label: { fr: 'Plein cadre', nl: 'Volle kader' }, chance: 0.035, mult: 3 },
    { id: 'or',     label: { fr: 'Dorée',       nl: 'Goud' },        chance: 0.012, mult: 5 },
    // Versions d'événement : uniquement dans leur paquet spécial, sur n'importe quelle carte du paquet.
    // packChance : probabilité par carte (≈ 7 % des paquets d'événement, ≈ 14 % des paquets Prestige).
    { id: 'noir',      label: { fr: 'Noir et or', nl: 'Zwart en goud' }, chance: 0, mult: 6, pack: 'prestige',       packChance: 0.03,  color: '#f6d478' },
    { id: 'rouge',     label: { fr: 'Rouge',      nl: 'Rood' },          chance: 0, mult: 5, pack: 'saint-nicolas',  packChance: 0.015, color: '#ff4a5c' },
    { id: 'confetti',  label: { fr: 'Confettis',  nl: 'Confetti' },      chance: 0, mult: 5, pack: 'carnaval',       packChance: 0.015, color: '#f0a3ff' },
    { id: 'pave',      label: { fr: 'Pavé',       nl: 'Kassei' },        chance: 0, mult: 5, pack: 'ronde',          packChance: 0.015, color: '#f6d43a' },
    { id: 'iris',      label: { fr: 'Iris',       nl: 'Iris' },          chance: 0, mult: 5, pack: 'iris',           packChance: 0.015, color: '#4f8dff' },
    { id: 'lion',      label: { fr: 'Lion',       nl: 'Leeuw' },         chance: 0, mult: 5, pack: 'onze-juillet',   packChance: 0.015, color: '#f2c400' },
    { id: 'tricolore', label: { fr: 'Tricolore',  nl: 'Driekleur' },     chance: 0, mult: 5, pack: 'fete-nationale', packChance: 0.015, color: '#e1001e' },
    { id: 'coq',       label: { fr: 'Coq',        nl: 'Haan' },          chance: 0, mult: 5, pack: 'wallonie',       packChance: 0.015, color: '#f2c400' },
    { id: 'coquelicot', label: { fr: 'Coquelicot', nl: 'Klaproos' },     chance: 0, mult: 5, pack: 'armistice',      packChance: 0.015, color: '#e0302a' },
  ];
  const F = Object.fromEntries(FINISHES.map((f, i) => [f.id, { ...f, rank: i }]));
  const fl = id => F[id].label[L()];
  const BASE_FINISHES = FINISHES.filter(f => !f.pack);
  const packFinish = packId => FINISHES.find(f => f.pack === packId);
  const finTier = id => F[id].pack ? 4 : F[id].rank; // une version d'événement compte comme la plus rare

  const CATS = [
    { id: 'politique',    fr: 'Politique',     nl: 'Politiek' },
    { id: 'bourgmestre',  fr: 'Bourgmestres',  nl: 'Burgemeesters' },
    { id: 'monarchie',    fr: 'Monarchie',     nl: 'Monarchie' },
    { id: 'culture',      fr: 'Culture',       nl: 'Cultuur' },
    { id: 'groupe',       fr: 'Groupes',       nl: 'Groepen' },
    { id: 'festival',     fr: 'Festivals',     nl: 'Festivals' },
    { id: 'sport',        fr: 'Sport',         nl: 'Sport' },
    { id: 'science',      fr: 'Sciences',      nl: 'Wetenschap' },
    { id: 'militaire',    fr: 'Mémoire',       nl: 'Herinnering' },
    { id: 'animal',       fr: 'Faune',         nl: 'Fauna' },
    { id: 'art',          fr: 'Art',           nl: 'Kunst' },
    { id: 'monument',     fr: 'Monuments',     nl: 'Monumenten' },
    { id: 'chateau',      fr: 'Châteaux',      nl: 'Kastelen' },
    { id: 'folklore',     fr: 'Folklore',      nl: 'Folklore' },
    { id: 'gastronomie',  fr: 'Gastronomie',   nl: 'Gastronomie' },
    { id: 'biere',        fr: 'Bières',        nl: 'Bieren' },
    { id: 'enseignement', fr: 'Enseignement',  nl: 'Onderwijs' },
    { id: 'commune',      fr: 'Communes',      nl: 'Gemeenten' },
    { id: 'province',     fr: 'Provinces',     nl: 'Provincies' },
    { id: 'region',       fr: 'Régions',       nl: 'Gewesten' },
    { id: 'evenement',    fr: 'Événements',    nl: 'Gebeurtenissen' },
    { id: 'edition',      fr: 'Éditions limitées', nl: 'Beperkte edities' },
  ];
  const CAT_RANK = Object.fromEntries(CATS.map((c, i) => [c.id, i]));
  const cl = id => CATS.find(c => c.id === id)[L()];

  const PACKS = [
    { id: 'belgique', title: { fr: 'Belgique', nl: 'België' }, kicker: { fr: 'Édition nationale', nl: 'Nationale editie' }, big: 'BE', price: 60,
      desc: { fr: 'Toutes les cartes du jeu.', nl: 'Alle kaarten van het spel.' },
      body: ['#121317', '#2b2c33'], metal: ['#fff0b5', '#e2b33c', '#8f6610'], cats: null },
    { id: 'seize', title: { fr: 'Rue de la Loi', nl: 'Wetstraat' }, kicker: { fr: 'Édition politique', nl: 'Politieke editie' }, big: '16', price: 80,
      desc: { fr: 'Politique, bourgmestres, monarchie et événements.', nl: 'Politiek, burgemeesters, monarchie en gebeurtenissen.' },
      body: ['#111a33', '#2c3c6c'], metal: ['#ffffff', '#c3c7d0', '#6d727d'], cats: ['politique', 'bourgmestre', 'monarchie', 'evenement'] },
    { id: 'icones', title: { fr: 'Icônes', nl: 'Iconen' }, kicker: { fr: 'Édition culture', nl: 'Cultuureditie' }, big: '★', price: 80,
      desc: { fr: 'BD, musique, cinéma, groupes, festivals et art.', nl: 'Strips, muziek, film, groepen, festivals en kunst.' },
      body: ['#2a0d16', '#5e1f30'], metal: ['#ffe1d6', '#e7a58f', '#8a4a3a'], cats: ['culture', 'groupe', 'festival', 'art'] },
    { id: 'sport', title: { fr: 'Sport', nl: 'Sport' }, kicker: { fr: 'Édition sportive', nl: 'Sporteditie' }, big: 'MVP', price: 80,
      desc: { fr: 'Football, cyclisme, tennis, athlétisme et plus.', nl: 'Voetbal, wielrennen, tennis, atletiek en meer.' },
      body: ['#0a2418', '#17573b'], metal: ['#eafff3', '#86d9aa', '#2d7650'], cats: ['sport'] },
    { id: 'sciences', title: { fr: 'Sciences', nl: 'Wetenschap' }, kicker: { fr: 'Édition savante', nl: 'Wetenschapseditie' }, big: 'LAB', price: 80,
      desc: { fr: 'Savants, inventeurs et explorateurs.', nl: 'Wetenschappers, uitvinders en ontdekkingsreizigers.' },
      body: ['#081c26', '#1b4a5e'], metal: ['#e3fbff', '#74d4e8', '#2a7286'], cats: ['science'] },
    { id: 'memoire', title: { fr: 'Mémoire', nl: 'Herinnering' }, kicker: { fr: 'Édition 14-18 · 40-45', nl: 'Editie 14-18 · 40-45' }, big: '14·40', price: 80,
      desc: { fr: 'Généraux, résistants, batailles et lieux de mémoire.', nl: 'Generaals, verzetsstrijders, veldslagen en gedenkplaatsen.' },
      body: ['#161a10', '#3d4428'], metal: ['#f3f0d8', '#c9b97a', '#6e6235'], cats: ['militaire'] },
    { id: 'faune', title: { fr: 'Faune belge', nl: 'Belgische fauna' }, kicker: { fr: 'Édition nature', nl: 'Natuureditie' }, big: 'ZOO', price: 80,
      desc: { fr: 'Races belges et animaux sauvages, des Ardennes à la côte.', nl: 'Belgische rassen en wilde dieren, van de Ardennen tot de kust.' },
      body: ['#0d1f12', '#2f5a2c'], metal: ['#effbe3', '#9fd36f', '#4b7a2a'], cats: ['animal'] },
    { id: 'patrimoine', title: { fr: 'Patrimoine', nl: 'Erfgoed' }, kicker: { fr: 'Édition patrimoine', nl: 'Erfgoededitie' }, big: '1830', price: 80,
      desc: { fr: 'Monuments, châteaux et folklore.', nl: 'Monumenten, kastelen en folklore.' },
      body: ['#191c22', '#3e4756'], metal: ['#eef3ff', '#a9b8d6', '#566584'], cats: ['monument', 'chateau', 'folklore'] },
    { id: 'terroir', title: { fr: 'Terroir', nl: 'Streek' }, kicker: { fr: 'Édition gourmande', nl: 'Smaakeditie' }, big: '33', price: 80,
      desc: { fr: 'Bières, plats et douceurs.', nl: 'Bieren, gerechten en zoetigheden.' },
      body: ['#2a1606', '#6b3a12'], metal: ['#fff0c8', '#f0b545', '#94600f'], cats: ['gastronomie', 'biere'] },
    { id: 'territoires', title: { fr: 'Territoires', nl: 'Grondgebied' }, kicker: { fr: 'Édition géographique', nl: 'Geografische editie' }, big: '565', price: 80,
      desc: { fr: 'Communes, provinces, régions et enseignement.', nl: 'Gemeenten, provincies, gewesten en onderwijs.' },
      body: ['#10261a', '#2c4a5a'], metal: ['#ffd9b8', '#d08a52', '#7c4320'], cats: ['commune', 'province', 'region', 'enseignement'] },
    // Nouveautés : uniquement des cartes absentes de l'album (version standard). 10 par jour au plus, à l'unité.
    { id: 'nouveautes', title: { fr: 'Nouveautés', nl: 'Nieuwigheden' }, kicker: { fr: 'Édition collection', nl: 'Verzameleditie' }, big: '+5', price: 150, was: 300, // promo (prix normal : was)
      desc: { fr: 'Cinq cartes qui manquent à ton album, garanti.', nl: 'Vijf kaarten die nog in je album ontbreken, gegarandeerd.' },
      body: ['#0b1c24', '#16424f'], metal: ['#e6fdff', '#7fd8e0', '#2f7c86'], cats: null, missing: true, perDay: 10, special: true },
    // Paquet spécial : 5ᵉ carte légendaire ou mieux (≈ 12 % de mythiques). Pièces uniquement, jamais gratuit ; lot de 10 possible.
    { id: 'prestige', title: { fr: 'Prestige', nl: 'Prestige' }, kicker: { fr: 'Édition prestige', nl: 'Prestige-editie' }, big: 'L+', price: 400, was: 600, bulk: 5, // promo (prix normal : was)
      desc: { fr: 'Toutes les cartes. 5ᵉ carte légendaire ou mieux, garantie.', nl: 'Alle kaarten. 5de kaart gegarandeerd legendarisch of beter.' },
      body: ['#050506', '#2a2210'], metal: ['#fff6cf', '#f0c24a', '#8a6410'], cats: null, last: 'legendaire', special: true },
  ];
  const pl = (p, k) => p[k][L()];

  // ---------- Dates (heure locale) ----------
  // window.BROL_NOW permet aux tests de simuler une autre date.
  const now = () => window.BROL_NOW ? new Date(window.BROL_NOW) : new Date();
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const easter = y => { // calendrier grégorien (algorithme de Meeus)
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  };
  const nthSunday = (y, month, n) => { const d = new Date(y, month, 1); return addDays(d, (7 - d.getDay()) % 7 + 7 * (n - 1)); };
  const span = (end, days) => [ymd(addDays(end, -days)), ymd(end)];

  // ---------- Paquets d'événement : en vente seulement pendant leur période ----------
  // when(année) → [début, fin] inclus. Pièces uniquement, ni gratuit ni lot de 10.
  const EVENT_PACKS = [
    { id: 'carnaval', when: y => span(addDays(easter(y), -47), 10), title: { fr: 'Carnaval', nl: 'Carnaval' }, kicker: { fr: 'Édition Mardi gras', nl: 'Vastenavondeditie' }, big: 'MG',
      desc: { fr: 'Folklore, festivals et groupes. 5ᵉ carte épique ou mieux.', nl: 'Folklore, festivals en groepen. 5de kaart episch of beter.' },
      body: ['#2b0a3d', '#6b1e7a'], metal: ['#fff0ff', '#f0a3ff', '#8a3fa0'], cats: ['folklore', 'festival', 'groupe'], last: 'epique' },
    { id: 'ronde', when: y => span(nthSunday(y, 3, 1), 7), title: { fr: 'Tour des Flandres', nl: 'Ronde van Vlaanderen' }, kicker: { fr: 'Édition cycliste', nl: 'Wielereditie' }, big: 'RVV',
      desc: { fr: 'Les géants du vélo. 5ᵉ carte épique ou mieux.', nl: 'De wielerreuzen. 5de kaart episch of beter.' },
      body: ['#1a1a1a', '#3a3a3a'], metal: ['#fffbe0', '#f6d43a', '#8a7410'], filter: c => c.cat === 'sport' && /^Cyclisme/.test(c.meta || ''), last: 'epique' },
    { id: 'iris', when: y => [`${y}-05-01`, `${y}-05-08`], title: { fr: 'Fête de l’Iris', nl: 'Irisfeest' }, kicker: { fr: 'Région bruxelloise', nl: 'Brussels Gewest' }, big: 'BXL',
      desc: { fr: 'Bruxelles à l’honneur. 5ᵉ carte épique ou mieux.', nl: 'Brussel in de kijker. 5de kaart episch of beter.' },
      body: ['#0c2350', '#1d4f9e'], metal: ['#eef4ff', '#f2c400', '#6b5a10'], filter: c => c.family === 'bruxelles', last: 'epique' },
    { id: 'onze-juillet', when: y => [`${y}-07-04`, `${y}-07-11`], title: { fr: '11 juillet', nl: '11 juli' }, kicker: { fr: 'Communauté flamande', nl: 'Vlaamse Gemeenschap' }, big: '11/7',
      desc: { fr: 'La Flandre à l’honneur. 5ᵉ carte épique ou mieux.', nl: 'Vlaanderen in de kijker. 5de kaart episch of beter.' },
      body: ['#1a1a12', '#3b3510'], metal: ['#fffbe0', '#f2c400', '#7a6400'], filter: c => c.family === 'flandre', last: 'epique' },
    { id: 'fete-nationale', when: y => [`${y}-07-14`, `${y}-07-21`], title: { fr: 'Fête nationale', nl: 'Nationale feestdag' }, kicker: { fr: 'Édition du 21 juillet', nl: 'Editie van 21 juli' }, big: '21/7',
      desc: { fr: 'Politique, monarchie, régions et grandes dates. 5ᵉ carte épique ou mieux.', nl: 'Politiek, monarchie, gewesten en grote data. 5de kaart episch of beter.' },
      body: ['#111111', '#7a0f1f'], metal: ['#fff5c2', '#f2c400', '#a3101f'], cats: ['politique', 'monarchie', 'evenement', 'region', 'province'], last: 'epique' },
    { id: 'wallonie', when: y => span(nthSunday(y, 8, 3), 7), title: { fr: 'Fêtes de Wallonie', nl: 'Feesten van Wallonië' }, kicker: { fr: 'Édition wallonne', nl: 'Waalse editie' }, big: 'WAL',
      desc: { fr: 'La Wallonie à l’honneur. 5ᵉ carte épique ou mieux.', nl: 'Wallonië in de kijker. 5de kaart episch of beter.' },
      body: ['#3a0710', '#8a1022'], metal: ['#fff6cf', '#f2c400', '#8a6410'], filter: c => c.family === 'wallonie', last: 'epique' },
    { id: 'armistice', when: y => [`${y}-11-04`, `${y}-11-11`], title: { fr: '11 novembre', nl: '11 november' }, kicker: { fr: 'Édition de l’Armistice', nl: 'Wapenstilstandeditie' }, big: '11/11',
      desc: { fr: 'Militaires, résistants et lieux de mémoire. 5ᵉ carte épique ou mieux.', nl: 'Militairen, verzetsstrijders en gedenkplaatsen. 5de kaart episch of beter.' },
      body: ['#14140f', '#3a3a2c'], metal: ['#fff3ec', '#e0302a', '#7a1410'], cats: ['militaire'], last: 'epique' },
    { id: 'saint-nicolas', when: y => [`${y}-11-28`, `${y}-12-06`], title: { fr: 'Saint-Nicolas', nl: 'Sinterklaas' }, kicker: { fr: 'Édition du 6 décembre', nl: 'Editie van 6 december' }, big: '6/12',
      desc: { fr: 'Gastronomie, bières et folklore. Versions spéciales deux fois plus fréquentes.', nl: 'Gastronomie, bieren en folklore. Speciale versies twee keer vaker.' },
      body: ['#4a0710', '#a3162a'], metal: ['#fff4d6', '#f2c14e', '#9a6a12'], cats: ['gastronomie', 'biere', 'folklore'], finishBoost: 2 },
  ].map(p => ({ ...p, price: 100, special: true, event: true }));
  const poolOf = p => (window.CARDS || []).filter(c => c.cat !== 'edition' && (p.filter ? p.filter(c) : !p.cats || p.cats.includes(c.cat)));
  const eventWindow = (p, d = now()) => p.when(d.getFullYear());
  const activeEvents = () => { const d = ymd(now()); return EVENT_PACKS.filter(p => { const [a, b] = eventWindow(p); return a <= d && d <= b; }); };
  function nextEvent() {
    const d = now(), today = ymd(d);
    return EVENT_PACKS.flatMap(p => [0, 1].map(k => ({ p, start: p.when(d.getFullYear() + k)[0] })))
      .filter(x => x.start > today).sort((a, b) => a.start.localeCompare(b.start))[0];
  }
  const fmtDay = s => new Date(s + 'T12:00').toLocaleDateString(L() === 'nl' ? 'nl-BE' : 'fr-BE', { day: 'numeric', month: 'long' });


  const PACK_SIZE = 5;
  const START_COINS = 1000;
  const NEW_CARD_BONUS = 5;
  // Ce qu'apporte une carte tirée, avant de l'ajouter : une nouvelle carte (absente de l'album, toutes versions
  // confondues), une nouvelle version d'une carte qu'on a déjà (Holo, Or…), ou un doublon de la même version.
  const gotKind = (id, finish) => !totalOf(id) ? 'card' : !countOf(id, finish) ? 'version' : 'dup';
  // Étiquette : « Nouvelle », « Nouvelle version », « Doublon · Or » (court dans la grille du lot de 10)
  const gotLabel = (got, finish, short = false) => {
    const fin = finish !== 'normal' ? ` · ${fl(finish)}` : '';
    if (got === 'version') return short ? t('newVerShort') : t('newVer');
    if (short) return got === 'card' ? t('new') : '';
    return (got === 'card' ? t('new') : t('dup')) + fin;
  };
  const FREE_EVERY_MS = 2 * 60 * 1000;
  const FREE_MAX = 5;
  const PITY = 40; // une légendaire ou mieux au plus tard tous les 40 paquets
  const BULK = 10, BULK_DISCOUNT = 0.9; // lot de 10 paquets : 10 % moins cher, payé en pièces
  const bulkOf = p => p.bulk || BULK; // Prestige : lot de 5 (25 cartes rares à l'écran au lieu de 50)
  const bulkPrice = p => Math.round(p.price * bulkOf(p) * BULK_DISCOUNT);

  // Les paquets sans assez de cartes (ex. Sciences avant la régénération des données) sont masqués
  const hasCards = p => p.missing || poolOf(p).length >= PACK_SIZE;
  PACKS.splice(0, PACKS.length, ...PACKS.filter(hasCards));
  // Paquets en vente aujourd'hui : événements en cours d'abord
  const shopPacks = () => [...activeEvents().filter(hasCards), ...PACKS];
  const PAGE = 120;
  const STORE_KEY = 'rue-de-la-loi:v1';

  // ---------- Données ----------
  const FLANDRE = ['Anvers', 'Limbourg', 'Flandre-Orientale', 'Flandre-Occidentale', 'Brabant flamand'];
  const REGION_FAMILY = { Q9337: 'flandre', Q231: 'wallonie', Q240: 'bruxelles' };
  const PACK_RANK = Object.fromEntries([...PACKS, ...EVENT_PACKS].map((p, i) => [p.id, i])); // éditions limitées : groupées par paquet
  const CARDS = (window.CARDS || []).filter(c => CAT_RANK[c.cat] !== undefined).sort((a, b) =>
    CAT_RANK[a.cat] - CAT_RANK[b.cat] || (PACK_RANK[a.pack] ?? 0) - (PACK_RANK[b.pack] ?? 0) || R[b.rarity].rank - R[a.rarity].rank || a.name.localeCompare(b.name, 'fr'));
  CARDS.forEach((c, i) => {
    c.no = i + 1;
    if (c.cat === 'commune') {
      const prov = (c.subtitle.match(/^Province d(?:e |’)(.+)$/) || [])[1];
      c.family = !prov ? 'bruxelles' : FLANDRE.includes(prov) ? 'flandre' : 'wallonie';
    } else if (c.cat === 'province') c.family = FLANDRE.includes(c.name) ? 'flandre' : 'wallonie';
    else if (c.cat === 'region') c.family = REGION_FAMILY[c.id];
  });
  const BY_ID = new Map(CARDS.map(c => [c.id, c]));
  const nm = c => window.I18N.name(c);

  // ---------- Éditions limitées ----------
  // Cartes exclusives aux paquets spéciaux (cat 'edition', champ pack). Dans leur paquet, la première carte est
  // remplacée par l'une d'elles une fois sur huit (une fois sur quatre en Prestige) : épique 60 %, légendaire 30 %, mythique 10 %.
  const ALL_PACKS = [...PACKS, ...EVENT_PACKS];
  const packById = id => ALL_PACKS.find(p => p.id === id);
  const EXCL = new Map();
  for (const c of CARDS) if (c.cat === 'edition') { if (!EXCL.has(c.pack)) EXCL.set(c.pack, []); EXCL.get(c.pack).push(c); }
  const exclOf = id => EXCL.get(id) || [];
  const EXCL_CHANCE = { prestige: 0.25 }, EXCL_DEFAULT = 0.125;
  const EXCL_WEIGHT = { epique: 60, legendaire: 30, mythique: 10 };
  const exclChance = p => exclOf(p.id).length ? (EXCL_CHANCE[p.id] ?? EXCL_DEFAULT) : 0;
  function pickExclusive(p) {
    const list = exclOf(p.id);
    let roll = Math.random() * list.reduce((a, c) => a + (EXCL_WEIGHT[c.rarity] || 1), 0);
    for (const c of list) { if ((roll -= EXCL_WEIGHT[c.rarity] || 1) < 0) return c; }
    return list[list.length - 1];
  }
  // Statistiques d'une édition limitée : son numéro dans l'édition et sa période de vente (son paquet est sur le sceau)
  const dm = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  function statsOf(c) {
    if (c.cat !== 'edition') return c.stats;
    const p = packById(c.pack), list = exclOf(c.pack), no = [t('edStatNo'), `${list.indexOf(c) + 1}/${list.length}`];
    if (!p?.event) return [no, [t('edStatPack'), p ? pl(p, 'title') : c.pack], [t('edStatPrice'), p ? p.price : '—']];
    const [a, b] = eventWindow(p);
    return [no, [t('edFrom'), dm(a)], [t('edTo'), dm(b)]];
  }
  // Versions possibles pour une carte : les quatre de base, plus celles des paquets spéciaux qui peuvent la donner
  let finPools = null;
  function finishesFor(c) {
    finPools ||= new Map(FINISHES.filter(f => f.pack).map(f => {
      const p = packById(f.pack);
      return [f.id, new Set(p ? [...poolOf(p), ...exclOf(p.id)].map(x => x.id) : [])];
    }));
    return FINISHES.filter(f => !f.pack || finPools.get(f.id).has(c.id));
  }

  // ---------- Séries thématiques ----------
  const SERIES = [
    { id: 'gov', title: { fr: 'Gouvernement De Wever', nl: 'Regering-De Wever' }, desc: { fr: 'Le gouvernement fédéral en fonction.', nl: 'De huidige federale regering.' }, reward: 600,
      match: c => c.cat === 'politique' && c.current },
    { id: 'diables', title: { fr: 'Diables Rouges', nl: 'Rode Duivels' }, desc: { fr: 'Les footballeurs de l’équipe nationale.', nl: 'De voetballers van het nationale team.' }, reward: 600,
      match: c => c.cat === 'sport' && /^Football/.test(c.meta || '') && c.name !== 'Tessa Wullaert' },
    { id: 'rois', title: { fr: 'Rois des Belges', nl: 'Koningen der Belgen' }, desc: { fr: 'De Léopold Ier à Philippe.', nl: 'Van Leopold I tot Filip.' }, reward: 1000, match: c => c.cat === 'monarchie' },
    { id: 'pm', title: { fr: 'Premiers ministres', nl: 'Eerste ministers' }, desc: { fr: 'Les chefs de gouvernement depuis 1831.', nl: 'De regeringsleiders sinds 1831.' }, reward: 2500,
      match: c => c.cat === 'politique' && c.posId === 'Q213107' },
    { id: 'trappistes', title: { fr: 'Trappistes', nl: 'Trappisten' }, desc: { fr: 'Les bières des abbayes trappistes.', nl: 'De bieren van de trappistenabdijen.' }, reward: 500,
      match: c => c.cat === 'biere' && c.subtitle === 'Trappiste' },
    { id: 'bd', title: { fr: 'Les grands de la BD', nl: 'Grote stripmakers' }, desc: { fr: 'Les auteurs qui ont fait la BD belge.', nl: 'De makers van de Belgische strip.' }, reward: 500,
      match: c => c.cat === 'culture' && /^Bande dessinée/.test(c.meta || '') },
    { id: 'primitifs', title: { fr: 'Primitifs flamands et Bruegel', nl: 'Vlaamse Primitieven en Bruegel' }, desc: { fr: 'Van Eyck, Van der Weyden, Memling, Bruegel.', nl: 'Van Eyck, Van der Weyden, Memling, Bruegel.' }, reward: 500,
      match: c => c.cat === 'art' && /Eyck|Weyden|Memling|Brueghel|Bruegel/.test(c.subtitle || '') },
    { id: 'velo', title: { fr: 'Les géants du vélo', nl: 'Wielerreuzen' }, desc: { fr: 'De Van Looy à Evenepoel.', nl: 'Van Van Looy tot Evenepoel.' }, reward: 500,
      match: c => c.cat === 'sport' && /^Cyclisme/.test(c.meta || '') },
    { id: 'tennis', title: { fr: 'Tennis belge', nl: 'Belgisch tennis' }, desc: { fr: 'Clijsters, Henin et les autres.', nl: 'Clijsters, Henin en de anderen.' }, reward: 300,
      match: c => c.cat === 'sport' && /^Tennis/.test(c.meta || '') },
    { id: 'unesco', title: { fr: 'Patrimoine UNESCO', nl: 'UNESCO-erfgoed' }, desc: { fr: 'Sites et traditions inscrits à l’UNESCO.', nl: 'Sites en tradities op de UNESCO-lijst.' }, reward: 800, match: c => c.unesco },
    { id: 'bxl', title: { fr: 'Les 19 communes de Bruxelles', nl: 'De 19 Brusselse gemeenten' }, desc: { fr: 'Toute la Région bruxelloise.', nl: 'Het hele Brusselse Gewest.' }, reward: 800,
      match: c => c.cat === 'commune' && c.family === 'bruxelles' },
    { id: 'villes', title: { fr: 'Grandes villes', nl: 'Grote steden' }, desc: { fr: 'Les communes les plus peuplées.', nl: 'De grootste gemeenten.' }, reward: 800,
      match: c => c.cat === 'commune' && ['legendaire', 'mythique'].includes(c.rarity) },
    { id: 'provinces', title: { fr: 'Provinces et régions', nl: 'Provincies en gewesten' }, desc: { fr: 'Les dix provinces et les trois régions.', nl: 'De tien provincies en de drie gewesten.' }, reward: 700,
      match: c => c.cat === 'province' || c.cat === 'region' },
    { id: 'univ', title: { fr: 'Universités', nl: 'Universiteiten' }, desc: { fr: 'Les universités belges.', nl: 'De Belgische universiteiten.' }, reward: 500,
      match: c => c.cat === 'enseignement' && c.subtitle === 'Université' },
    { id: 'maieurs', title: { fr: 'Maïeurs des grandes villes', nl: 'Burgemeesters van grote steden' }, desc: { fr: 'Les bourgmestres des plus grandes communes.', nl: 'De burgemeesters van de grootste gemeenten.' }, reward: 600,
      match: c => c.cat === 'bourgmestre' && ['legendaire', 'mythique'].includes((window.CARDS || []).find(x => x.id === c.mayorOf)?.rarity) },
    { id: 'festivals', title: { fr: 'Été des festivals', nl: 'Festivalzomer' }, desc: { fr: 'De Tomorrowland aux Francofolies.', nl: 'Van Tomorrowland tot de Francofolies.' }, reward: 400, match: c => c.cat === 'festival' },
    { id: 'grande-guerre', title: { fr: 'La Grande Guerre', nl: 'De Groote Oorlog' }, desc: { fr: 'De Liège à l’Yser, 1914–1918.', nl: 'Van Luik tot de IJzer, 1914–1918.' }, reward: 600,
      match: c => c.cat === 'militaire' && /^Première Guerre/.test(c.meta || '') },
    { id: 'chiens', title: { fr: 'Chiens belges', nl: 'Belgische honden' }, desc: { fr: 'Les quatre bergers belges et leurs cousins.', nl: 'De vier Belgische herders en hun neven.' }, reward: 500,
      match: c => c.cat === 'animal' && c.stats?.[0]?.[1] === 'Chien' },
    { id: 'ardennes', title: { fr: 'Faune sauvage', nl: 'Wilde dieren' }, desc: { fr: 'Des forêts ardennaises à la mer du Nord.', nl: 'Van de Ardense bossen tot de Noordzee.' }, reward: 500,
      match: c => c.cat === 'animal' && /^Faune sauvage/.test(c.meta || '') },
    { id: 'resistance', title: { fr: 'Résistance', nl: 'Verzet' }, desc: { fr: 'Les résistants des deux guerres.', nl: 'De verzetsstrijders van beide oorlogen.' }, reward: 500,
      match: c => c.cat === 'militaire' && /^Résistant/.test(c.stats?.[2]?.[1] || '') },
    ...ALL_PACKS.filter(p => p.special).map(p => ({ id: 'ed-' + p.id, edition: p.id,
      title: { fr: `Édition ${p.title.fr}`, nl: `Editie ${p.title.nl}` },
      desc: { fr: `Les cartes exclusives du paquet ${p.title.fr}.`, nl: `De exclusieve kaarten van het pakje ${p.title.nl}.` },
      reward: p.id === 'prestige' ? 1500 : 600, match: c => c.pack === p.id })),
  ].map(s => ({ ...s, members: CARDS.filter(s.match).map(c => c.id) })).filter(s => s.members.length >= 3);
  const SERIES_OF = new Map();
  for (const s of SERIES) for (const id of s.members) { if (!SERIES_OF.has(id)) SERIES_OF.set(id, []); SERIES_OF.get(id).push(s); }
  const sl = (s, k) => s[k][L()];

  // ---------- Sauvegarde ----------
  // owned : clé « id » pour la version standard, « id|holo » etc. pour les versions spéciales
  const freshStats = () => ({ packs: 0, cards: 0, free: 0, rarity: {}, finish: {}, packsBy: {}, sold: 0, earned: 0, perfect: 0, doubleLeg: 0, night: 0, pityHits: 0, goldMyth: 0, trades: 0, tradeGift: 0, tradeMyth: 0, tradeFull: 0, fused: 0, fuseHolo: 0, dailyMax: 0, excl: 0, missions: 0, weekly: 0 });
  const fresh = () => ({ coins: START_COINS, owned: {}, packs: 0, free: 1, freeAt: Date.now(), claimed: {}, pity: 0, stats: freshStats(), ach: {}, trade: { pending: {}, done: {} }, daily: { last: null, streak: 0 } });
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  // Plusieurs onglets : quand un autre onglet sauvegarde, celui-ci (en retrait) est périmé. Il ne sauvegarde plus
  // (sinon il effacerait la progression de l'autre) et se recharge dès qu'on revient dessus.
  let stale = false;
  let state = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && typeof s.coins === 'number') {
        // Champs abîmés (fichier importé, vieille version) : on repart d'un objet vide plutôt que de planter
        for (const k of ['owned', 'claimed', 'ach', 'trade', 'daily', 'stats', 'games', 'tickets']) if (k in s && !isObj(s[k])) delete s[k];
        s.owned ||= {};
        if (s.free === undefined) { s.free = FREE_MAX; s.freeAt = Date.now(); s.coins = Math.max(s.coins, START_COINS); }
        s.claimed ||= {}; s.ach ||= {}; s.pity ||= 0;
        s.trade ||= {}; s.trade.pending ||= {}; s.trade.done ||= {};
        s.daily ||= { last: null, streak: 0 };
        if (s.achSeen === undefined) s.achSeen = Date.now(); // parties d'avant : rien n'est « nouveau »
        s.stats = { ...freshStats(), ...(s.stats || {}) };
        if (!s.stats.packs && s.packs) s.stats.packs = s.packs;
        return s;
      }
    } catch (_) { /* stockage indisponible */ }
    // Sauvegarde illisible : on la met de côté avant qu'une nouvelle partie ne l'écrase
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) localStorage.setItem(STORE_KEY + ':illisible', raw); } catch (_) { /* rien */ }
    return fresh();
  }
  function save() { if (stale) return; try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* rien */ } }
  function tickFree() {
    const now = Date.now();
    while (state.free < FREE_MAX && now - state.freeAt >= FREE_EVERY_MS) { state.free++; state.freeAt += FREE_EVERY_MS; }
    if (state.free >= FREE_MAX) state.freeAt = now;
  }
  const keyOf = (id, fin) => fin === 'normal' ? id : `${id}|${fin}`;
  const countOf = (id, fin) => state.owned[keyOf(id, fin)] || 0;
  const totalOf = id => FINISHES.reduce((a, f) => a + countOf(id, f.id), 0);
  const finishesOwned = id => FINISHES.filter(f => countOf(id, f.id) > 0).map(f => f.id);
  const bestFinish = id => finishesOwned(id).pop() || 'normal';
  // Revente ×1,5 dès 80 % de l'album : c'est là que les nouvelles cartes et les succès se font rares
  const LATE_AT = 0.8, LATE_MULT = 1.5;
  const albumShare = () => { const ids = new Set(); for (const [k, n] of Object.entries(state.owned)) if (n > 0) ids.add(k.split('|')[0]); return [...ids].filter(id => BY_ID.has(id)).length / CARDS.length; };
  const resaleMult = () => albumShare() >= LATE_AT ? LATE_MULT : 1;
  const sellValue = (c, fin, mult = resaleMult()) => Math.round(R[c.rarity].sell * F[fin].mult * (c.cat === 'edition' ? 2 : 1) * mult); // éditions limitées : valeur doublée

  // ---------- Utilitaires ----------
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Adresse directe de l'image (data/images.js) : miniature sur thumb.wikimedia.org à une largeur standard
  // (Wikimedia refuse les autres), ou l'original s'il est plus petit. Special:FilePath en dernier recours :
  // deux redirections jamais mises en cache, c'est ce qui rendait les images lentes.
  const THUMB_W = [60, 120, 250, 330, 500, 960, 1280, 1920];
  const imgUrl = (f, w = 500) => {
    const info = window.IMAGES?.[f];
    if (!info) return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(f) + '?width=' + w;
    const i = info.lastIndexOf(':'), j = info.lastIndexOf(':', i - 1);
    const orig = +info.slice(i + 1), dir = info.slice(j + 1, i), tpl = info[0] === '~' ? info.slice(1, j) : null;
    const name = f.replace(/ /g, '_'), path = `${dir[0]}/${dir}/${encodeURIComponent(name)}`;
    let bw = THUMB_W.find(x => x >= w) || THUMB_W.at(-1);
    // Original plus petit que demandé : la miniature standard juste en dessous (Wikimedia limite durement
    // les liens directs vers les originaux) ; l'original seulement pour les toutes petites images
    if (orig && bw >= orig) {
      bw = [...THUMB_W].reverse().find(x => x < orig);
      if (!bw) return `https://upload.wikimedia.org/wikipedia/commons/${path}`;
    }
    const thumb = (tpl || `{w}px-${name}${/\.svg$/i.test(f) ? '.png' : ''}`).replace('{w}', bw);
    return `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${encodeURIComponent(thumb)}`;
  };
  // Cadrage sur le visage (data/focus.js, généré par tools/build-focus.py) : « x% y% » pour object-position
  const focusOf = f => { const v = window.FOCUS?.[f]?.split(' '); return v ? `${v[0]}% ${v[1]}%` : ''; };
  // Sur la carte : position, plus un léger zoom ancré en bas quand la photo n'est pas assez haute pour remonter le visage
  const focusStyle = f => { const v = window.FOCUS?.[f]?.split(' '); if (!v) return '';
    return ` style="object-position:${v[0]}% ${v[1]}%${v[2] ? `;transform:scale(${v[2]});transform-origin:${v[3]}% 100%` : ''}"`; };
  const fileUrl = f => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(f.replace(/ /g, '_'));
  const initials = n => n.split(/[\s-]+/).filter(w => /^[A-ZÀ-Ý]/.test(w)).slice(0, 2).map(w => w[0]).join('');
  const fmt = n => n.toLocaleString(L() === 'nl' ? 'nl-BE' : 'fr-BE');
  const isEmblem = c => c.emblem || (['commune', 'province', 'region', 'enseignement'].includes(c.cat) && c.img && (c.img === c.badge || /\.svg$|\.png$/i.test(c.img)));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const photoOf = (c, fin) => (fin === 'plein' && c.alt) || c.img;
  const SFX = window.SFX;

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2400);
  }

  // ---------- Visuels SVG ----------
  let uid = 0;
  const SILHOUETTE = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="34" r="19"/><path d="M10 100c0-27 17-41 40-41s40 14 40 41z"/></svg>';

  function sealSVG({ ring, center, color, size = 200, centerSize = 64, px = null }) {
    const id = 'seal' + (++uid);
    const r = size / 2;
    return `<svg viewBox="0 0 ${size} ${size}"${px ? ` width="${px}" height="${px}"` : ''} aria-hidden="true">
      <defs><path id="${id}" d="M ${r} ${r} m -${r * .78} 0 a ${r * .78} ${r * .78} 0 1 1 ${r * 1.56} 0 a ${r * .78} ${r * .78} 0 1 1 -${r * 1.56} 0"/></defs>
      <circle cx="${r}" cy="${r}" r="${r * .96}" fill="none" stroke="${color}" stroke-width="2"/>
      <circle cx="${r}" cy="${r}" r="${r * .64}" fill="none" stroke="${color}" stroke-width="1" opacity=".7"/>
      <text font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="${size * .085}" letter-spacing="${size * .018}" fill="${color}">
        <textPath href="#${id}" textLength="${Math.PI * r * 1.56 - 4}">${esc(ring)}</textPath></text>
      <text x="${r}" y="${r}" text-anchor="middle" dominant-baseline="central" font-family="Barlow Condensed, sans-serif" font-weight="800"
        font-size="${centerSize}" fill="${color}">${esc(center)}</text>
    </svg>`;
  }

  // Motifs des paquets spéciaux, dessinés dans le corps du paquet (300 × 430), derrière le sceau
  const star = (x, y, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2, q = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + (x + q * Math.cos(a)).toFixed(1) + ' ' + (y + q * Math.sin(a)).toFixed(1); } return d + 'Z'; };
  const scatter = (n, seed, f) => { let v = seed; const rnd = () => (v = (v * 9301 + 49297) % 233280) / 233280; return Array.from({ length: n }, (_, i) => f(rnd() * 300, 30 + rnd() * 370, rnd(), i)).join(''); };
  const rays = (n, c1, c2, op) => Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * i / n, b = 2 * Math.PI * (i + .5) / n, R0 = 420;
    return `<path d="M150 202L${(150 + R0 * Math.cos(a)).toFixed(0)} ${(202 + R0 * Math.sin(a)).toFixed(0)}L${(150 + R0 * Math.cos(b)).toFixed(0)} ${(202 + R0 * Math.sin(b)).toFixed(0)}Z" fill="${i % 2 ? c2 : c1}" opacity="${op}"/>`; }).join('');
  const PACK_ART = {
    prestige: (k, p) => `${Array.from({ length: 34 }, (_, i) => `<circle cx="150" cy="202" r="${14 + i * 8}" fill="none" stroke="${p.metal[1]}" stroke-width=".6" opacity=".16"/>`).join('')}
      ${rays(36, p.metal[1], 'transparent', .07)}
      <rect x="10" y="70" width="280" height="330" fill="none" stroke="${p.metal[1]}" stroke-width="1.4" opacity=".7"/>
      <rect x="15" y="75" width="270" height="320" fill="none" stroke="${p.metal[1]}" stroke-width=".6" opacity=".55"/>
      ${[120, 150, 180].map(x => `<path d="${star(x, 96, 7)}" fill="${p.metal[1]}"/>`).join('')}`,
    'saint-nicolas': (k, p) => `${scatter(26, 7, (x, y, r) => `<path d="${star(x, y, 3 + r * 5)}" fill="${p.metal[0]}" opacity="${(.25 + r * .45).toFixed(2)}"/>`)}
      <g opacity=".22" fill="${p.metal[1]}"><path d="M150 70c-34 22-52 60-52 100v118h104V170c0-40-18-78-52-100z"/><path d="M150 70c-14 30-16 70-6 110" stroke="${p.body[0]}" stroke-width="4" fill="none"/>
      <rect x="143" y="130" width="14" height="70" fill="${p.body[0]}"/><rect x="125" y="150" width="50" height="14" fill="${p.body[0]}"/></g>`,
    carnaval: (k, p) => `<defs><pattern id="hq${k}" width="40" height="60" patternUnits="userSpaceOnUse"><path d="M20 0L40 30L20 60L0 30Z" fill="${p.metal[1]}" opacity=".16"/><path d="M0 0L20 0L0 30ZM40 0L20 0L40 30ZM0 60L20 60L0 30ZM40 60L20 60L40 30Z" fill="#ffd23f" opacity=".1"/></pattern></defs>
      <rect x="0" y="18" width="300" height="394" fill="url(#hq${k})"/>
      ${scatter(40, 3, (x, y, r, i) => i % 3 ? `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="6" height="3" fill="${['#ffd23f', '#5fe0ff', '#ff5fa8'][i % 3]}" transform="rotate(${(r * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})" opacity=".8"/>` : `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.2" fill="#fff" opacity=".7"/>`)}`,
    ronde: (k, p) => `<defs><pattern id="cb${k}" width="36" height="24" patternUnits="userSpaceOnUse"><rect x="2" y="2" width="32" height="9" rx="4" fill="#fff" opacity=".08"/><rect x="-16" y="14" width="32" height="9" rx="4" fill="#fff" opacity=".08"/><rect x="20" y="14" width="32" height="9" rx="4" fill="#fff" opacity=".08"/></pattern></defs>
      <rect x="0" y="18" width="300" height="394" fill="url(#cb${k})"/>
      <path d="M0 300L300 250L300 270L0 320Z" fill="${p.metal[1]}" opacity=".85"/><path d="M0 320L300 270L300 276L0 326Z" fill="#111" opacity=".9"/>`,
    iris: (k, p) => `<g transform="translate(150 215) scale(1.25)" fill="#f2c400" opacity=".28">
      <path d="M0-95C22-70 22-35 0-10C-22-35-22-70 0-95Z"/><path d="M-6-8C-50-30-90-10-95 30C-60 40-25 25-6-8Z"/><path d="M6-8C50-30 90-10 95 30C60 40 25 25 6-8Z"/>
      <path d="M-4 0C-30 30-30 70-10 95L10 95C30 70 30 30 4 0Z" opacity=".7"/><rect x="-40" y="-14" width="80" height="12" rx="6"/></g>`,
    'onze-juillet': (k, p) => `<defs><pattern id="lz${k}" width="30" height="40" patternUnits="userSpaceOnUse"><path d="M15 0L30 20L15 40L0 20Z" fill="#f2c400" opacity=".14"/></pattern></defs>
      <rect x="0" y="18" width="300" height="394" fill="url(#lz${k})"/>
      <path d="M-20 360L320 120L320 160L-20 400Z" fill="#f2c400" opacity=".2"/>`,
    'fete-nationale': (k, p) => `<rect x="0" y="18" width="100" height="394" fill="#000" opacity=".55"/><rect x="100" y="18" width="100" height="394" fill="#f2c400" opacity=".35"/><rect x="200" y="18" width="100" height="394" fill="#e1001e" opacity=".45"/>
      <path d="M130 96L135 80L143 90L150 76L157 90L165 80L170 96Z" fill="${p.metal[0]}" opacity=".9"/><rect x="130" y="96" width="40" height="5" fill="${p.metal[0]}" opacity=".9"/>`,
    wallonie: (k, p) => rays(28, '#f2c400', '#c8102e', .22),
    nouveautes: (k, p) => `${Array.from({ length: 24 }, (_, i) => { const x = 22 + (i % 6) * 44, y = 74 + Math.floor(i / 6) * 76, filled = [1, 4, 8, 15, 17, 22].includes(i);
      return `<rect x="${x}" y="${y}" width="36" height="52" rx="3" fill="${filled ? p.metal[1] : 'none'}" stroke="${p.metal[1]}" stroke-width="1.2" stroke-dasharray="${filled ? 'none' : '3 3'}" opacity="${filled ? .3 : .35}"/>`; }).join('')}`,
    sciences: (k, p) => `<defs><pattern id="gp${k}" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="${p.metal[1]}" stroke-width=".4" opacity=".25"/></pattern></defs>
      <rect x="0" y="18" width="300" height="394" fill="url(#gp${k})"/>
      <g fill="none" stroke="${p.metal[1]}" stroke-width="1.6" opacity=".35">${[0, 60, 120].map(a => `<ellipse cx="150" cy="202" rx="128" ry="44" transform="rotate(${a} 150 202)"/>`).join('')}</g>
      ${[[278, 202], [86, 91], [86, 313]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${p.metal[0]}" opacity=".8"/>`).join('')}`,
    // Empreintes de pattes qui traversent le paquet
    faune: (k, p) => Array.from({ length: 9 }, (_, i) => { const x = 40 + i * 28 + (i % 2) * 18, y = 360 - i * 36, a = -35;
      return `<g transform="translate(${x} ${y}) rotate(${a})" fill="${p.metal[1]}" opacity=".22"><ellipse cx="0" cy="6" rx="9" ry="8"/>${[[-10, -6], [-4, -11], [4, -11], [10, -6]].map(([dx, dy]) => `<ellipse cx="${dx}" cy="${dy}" rx="3.4" ry="4.4"/>`).join('')}</g>`; }).join(''),
    // Rangées de croix d'un cimetière militaire, en perspective
    memoire: (k, p) => [0, 1, 2, 3, 4, 5].map(row => { const s = .55 + row * .17, y = 150 + row * row * 6 + row * 18, n = 9 - row;
      return Array.from({ length: n }, (_, i) => { const x = 150 + (i - (n - 1) / 2) * 34 * s;
        return `<path d="M${(x - 1.6 * s).toFixed(1)} ${y}h${(3.2 * s).toFixed(1)}v${(-6 * s).toFixed(1)}h${(5 * s).toFixed(1)}v${(-3.2 * s).toFixed(1)}h${(-5 * s).toFixed(1)}v${(-6 * s).toFixed(1)}h${(-3.2 * s).toFixed(1)}v${(6 * s).toFixed(1)}h${(-5 * s).toFixed(1)}v${(3.2 * s).toFixed(1)}h${(5 * s).toFixed(1)}Z" fill="${p.metal[0]}" opacity="${(.12 + row * .05).toFixed(2)}"/>`; }).join(''); }).join(''),
    // Coquelicots
    armistice: (k, p) => {
      const poppy = (x, y, r, o) => `<g transform="translate(${x} ${y})" opacity="${o}">${[0, 90, 180, 270].map(a => `<ellipse cx="0" cy="${-r * .55}" rx="${r * .62}" ry="${r * .6}" fill="${p.metal[1]}" transform="rotate(${a + 45})"/>`).join('')}<circle r="${r * .26}" fill="#111"/></g>`;
      // Petits coquelicots dans le haut et sur les bords, jamais sur le sceau ni sur le titre
      return poppy(150, 205, 70, .22) + scatter(30, 7, (x, y, r, i) => y > 290 || Math.hypot(x - 150, y - 205) < 100 ? ''
        : poppy(x.toFixed(0), y.toFixed(0), 8 + (i % 3) * 4, .45));
    },
  };

  function packSVG(p) {
    const k = ++uid;
    const zig = (y0, dir) => {
      let d = `M0 ${y0}`;
      for (let x = 0; x < 300; x += 10) d += ` L${x + 5} ${y0 - dir * 14} L${x + 10} ${y0}`;
      return d + ` L300 ${y0 + dir * 4} L0 ${y0 + dir * 4} Z`;
    };
    const title = pl(p, 'title').toUpperCase();
    return `<svg viewBox="0 0 300 430" aria-hidden="true">
      <defs>
        <linearGradient id="b${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.body[1]}"/><stop offset=".55" stop-color="${p.body[0]}"/><stop offset="1" stop-color="${p.body[1]}"/></linearGradient>
        <linearGradient id="m${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.metal[2]}"/><stop offset=".3" stop-color="${p.metal[0]}"/><stop offset=".55" stop-color="${p.metal[1]}"/><stop offset=".8" stop-color="${p.metal[0]}"/><stop offset="1" stop-color="${p.metal[2]}"/></linearGradient>
        <pattern id="l${k}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="8" stroke="#fff" stroke-width="1" opacity=".05"/></pattern>
        <pattern id="r${k}" width="4" height="10" patternUnits="userSpaceOnUse"><rect width="2" height="10" fill="#000" opacity=".18"/></pattern>
      </defs>
      <rect x="0" y="18" width="300" height="394" fill="url(#b${k})"/>
      <rect x="0" y="18" width="300" height="394" fill="url(#l${k})"/>
      ${PACK_ART[p.id] ? `<clipPath id="c${k}"><rect x="0" y="18" width="300" height="394"/></clipPath><g clip-path="url(#c${k})">${PACK_ART[p.id](k, p)}</g>` : ''}
      <path d="${zig(18, 1)}" fill="url(#m${k})"/><path d="${zig(18, 1)}" fill="url(#r${k})"/>
      <path d="${zig(412, -1)}" fill="url(#m${k})"/><path d="${zig(412, -1)}" fill="url(#r${k})"/>
      <line x1="10" y1="62" x2="290" y2="62" stroke="${p.metal[1]}" stroke-width="1" stroke-dasharray="5 5" opacity=".6"/>
      <text x="150" y="50" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="10" letter-spacing="3" fill="${p.metal[1]}" opacity=".75">${t('openHere')}</text>
      <g transform="translate(18 76)"><rect width="8" height="22" fill="#111"/><rect x="8" width="8" height="22" fill="#f2c400"/><rect x="16" width="8" height="22" fill="#c8102e"/></g>
      <text x="282" y="92" text-anchor="end" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="11" fill="${p.metal[1]}" opacity=".8">${t('cards5')}</text>
      <g transform="translate(60 112)">${sealSVG({ ring: t('seal'), center: p.big, color: p.metal[1], size: 180, px: 180, centerSize: p.big.length > 2 ? 52 : 66 })}</g>
      <text x="150" y="334" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="13" letter-spacing="4" fill="${p.metal[1]}">${esc(pl(p, 'kicker').toUpperCase())}</text>
      <text x="150" y="374" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="${title.length > 13 ? 34 : title.length > 9 ? 38 : 44}" letter-spacing="1" fill="url(#m${k})"${title.length > 9 ? ' textLength="268" lengthAdjust="spacingAndGlyphs"' : ''}>${esc(title)}</text>
    </svg>`;
  }
  const packVisual = p => `<div class="pack-visual${p.special ? ' is-foil' : ''}" tabindex="0" role="button" aria-label="${esc(pl(p, 'title'))}, ${p.price}">${packSVG(p)}<div class="sheen"></div>${p.special ? '<div class="foil"></div>' : ''}</div>`;
  // Logo de Brol en version or au centre du dos des cartes : mêmes trois cartes que logo.svg,
  // les deux du fond en simple filet, celle de devant en or avec le B en creux
  const BACK_MARK = `<svg class="back-logo" viewBox="-1.3 -0.5 63 63" aria-hidden="true"><defs><linearGradient id="bk-gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#e2b33c"/><stop offset="1" stop-color="#9c7112"/></linearGradient></defs>
    <g stroke-linejoin="round"><rect x="13" y="9" width="30" height="42" rx="4.5" fill="#0c1020" stroke="#e2b33c" stroke-width="1.6" opacity=".55" transform="rotate(-18 28 50)"/>
    <rect x="17" y="8" width="30" height="42" rx="4.5" fill="#0c1020" stroke="#e2b33c" stroke-width="1.6" opacity=".8" transform="rotate(-4 32 50)"/>
    <rect x="21" y="10" width="30" height="42" rx="4.5" fill="url(#bk-gold)" stroke="#fff1b8" stroke-width="1" transform="rotate(12 36 52)"/>
    <path transform="rotate(12 36 52)" d="M30.5 19.5v23M30.5 19.5h6.5a5.6 5.6 0 0 1 0 11.2h-6.5M30.5 30.7h7.4a6 6 0 0 1 0 12h-7.4" fill="none" stroke="#0c1020" stroke-width="4.6" stroke-linecap="square"/></g></svg>`;
  const cardBack = () => `<div class="card-back">${sealSVG({ ring: t('backSeal'), center: '', color: '#e2b33c', size: 200, centerSize: 52 })}${BACK_MARK}<div class="back-foot">${t('back')}</div></div>`;

  // ---------- Rendu d'une carte ----------
  function cardHTML(c, { count = 0, finish = 'normal', variants = null } = {}) {
    let media;
    const photo = photoOf(c, finish);
    if (c.cat === 'evenement') {
      media = `<div class="event-big">${esc(String(c.stats[0][1]).replace(/\s/g, ' '))}</div>`;
    } else if (photo) {
      const fallback = `this.outerHTML='<div class=&quot;portrait&quot;>${SILHOUETTE.replace(/"/g, '&quot;')}<span>${esc(initials(c.name))}</span></div>'`;
      media = `<img src="${imgUrl(photo)}" alt="" loading="lazy" decoding="async"${focusStyle(photo)} onerror="${fallback}">`;
    } else {
      media = `<div class="portrait">${SILHOUETTE}<span>${esc(initials(c.name))}</span></div>`;
    }
    const fam = c.family || 'gris';
    const ed = c.cat === 'edition' && packById(c.pack);
    const style = ed ? `--band: ${ed.body[1]}; --band-ink: ${ed.metal[0]}; --ed-frame: linear-gradient(135deg, ${ed.metal[2]}, ${ed.metal[0]} 22%, ${ed.metal[1]} 45%, ${ed.metal[0]} 65%, ${ed.metal[2]})` : `--band: var(--p-${fam})`;
    // Logo d'école : souvent foncé sur fond transparent, il va sur un fond clair (les blasons restent sur fond sombre)
    const photoClass = isEmblem(c) ? ' is-emblem' + (c.cat === 'enseignement' ? ' is-logo' : '') : c.artwork ? ' is-artwork' : '';
    const finTag = finish !== 'normal' ? `<span class="fin-tag">${fl(finish)}</span>` : '';
    const liveText = c.live ? (L() === 'nl' ? 'Op de troon' : c.live) : (L() === 'nl' ? 'In functie' : 'En fonction');
    const live = ed ? `<span class="ed-seal" style="color:${ed.metal[1]}">${esc(ed.big)}</span>`
      : c.current ? `<span class="live">${esc(liveText)}</span>` : c.unesco ? '<span class="live unesco">UNESCO</span>' : '';
    const dots = variants && variants.length > 1
      ? `<span class="var-dots" title="${t('versionsOwned')}">${variants.filter(v => v !== 'normal').map(v => `<i class="d-${v}"></i>`).join('')}</span>` : '';
    return `
      <article class="card r-${c.rarity} cat-${c.cat} fam-${fam} fin-${finish}${F[finish].pack ? ' fin-ev' : ''}" data-id="${esc(c.id)}" data-fin="${finish}" style="${style}">
        ${count > 1 ? `<span class="count-badge">×${count}</span>` : ''}
        <div class="card-in">
          <div class="card-photo${photoClass}">${media}</div>
          <div class="card-top"><span class="gem"></span><span class="no">${String(c.no).padStart(4, '0')}</span>${finTag}${live}</div>
          <div class="card-band">
            ${c.party ? `<span class="party">${esc(c.party)}</span>` : ''}
            <h3>${esc(nm(c))}</h3>
            <p class="sub">${esc(window.I18N.subtitle(c))}</p>
            ${c.meta ? `<p class="meta">${esc(window.I18N.meta(c))}</p>` : ''}
          </div>
          <dl class="card-stats">${statsOf(c).map(([k, v]) => `<div><dt>${esc(window.I18N.statKey(k))}</dt><dd>${esc(tv(v))}</dd></div>`).join('')}</dl>
          ${dots}
        </div>
      </article>`;
  }

  document.addEventListener('pointermove', e => {
    const card = e.target.closest?.('.card.r-epique, .card.r-legendaire, .card.r-mythique, .card.fin-holo, .card.fin-plein, .card.fin-or, .card.fin-ev');
    if (!card) return;
    const b = card.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
    card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
  });

  // ---------- Tirage ----------
  // Rareté d'abord (mêmes taux pour tous les paquets), puis une carte au hasard parmi celles du paquet.
  // Chaque catégorie contient toutes les raretés (réparties par notoriété), donc les taux affichés sont justes.
  // Nouvelle catégorie : à rareté égale, ses cartes sortent trois fois plus souvent jusqu'à la date indiquée, pour
  // qu'elles ne se noient pas parmi les 1 500 cartes du paquet Belgique. Les taux par rareté ne changent pas.
  const FEATURED = { militaire: '2027-01-31', animal: '2027-02-28' }, FEATURED_WEIGHT = 3;
  const featuredCats = () => { const d = ymd(now()); return new Set(Object.keys(FEATURED).filter(cat => d <= FEATURED[cat])); };
  function pickCard(list) {
    const feat = featuredCats(), w = c => feat.has(c.cat) ? FEATURED_WEIGHT : 1;
    if (!list.some(c => feat.has(c.cat))) return list[Math.floor(Math.random() * list.length)];
    let roll = Math.random() * list.reduce((a, c) => a + w(c), 0);
    for (const c of list) { if ((roll -= w(c)) < 0) return c; }
    return list[list.length - 1];
  }
  function pickRarity(minRank = 0) {
    const pool = RARITIES.filter((_, i) => i >= minRank);
    let roll = Math.random() * pool.reduce((a, r) => a + r.weight, 0);
    for (const r of pool) { if ((roll -= r.weight) < 0) return r.id; }
    return pool[pool.length - 1].id;
  }
  function pickFinish(boost = 1, packId = null) {
    const ev = packId && packFinish(packId);
    if (ev && Math.random() < ev.packChance) return ev.id;
    let roll = Math.random();
    for (const f of BASE_FINISHES.slice(1).reverse()) { if ((roll -= f.chance * boost) < 0) return f.id; }
    return 'normal';
  }
  function drawPack(pack, forceLegend) {
    const pool = poolOf(pack).filter(c => BY_ID.has(c.id) && (!pack.missing || !totalOf(c.id)));
    // Nouveautés, moins de 5 cartes manquantes : elles sont toutes dans le paquet, le reste est tiré au hasard
    // (sans ça, la dernière carte d'un album ne s'obtenait plus qu'au hasard des autres paquets)
    if (pack.missing && pool.length < PACK_SIZE) {
      const out = pool.map(card => ({ card, finish: pickFinish(pack.finishBoost, pack.id) }));
      const rest = poolOf(pack).filter(c => BY_ID.has(c.id) && !pool.includes(c));
      while (out.length < PACK_SIZE) {
        const r = pickRarity(0), free = rest.filter(c => !out.some(o => o.card === c));
        const list = free.filter(c => c.rarity === r).length ? free.filter(c => c.rarity === r) : free;
        out.push({ card: pickCard(list), finish: pickFinish(pack.finishBoost, pack.id) });
      }
      return out.sort((a, b) => R[a.card.rarity].rank - R[b.card.rarity].rank || finTier(a.finish) - finTier(b.finish));
    }
    const out = [];
    const taken = new Set();
    for (let i = 0; i < PACK_SIZE; i++) {
      const last = i === PACK_SIZE - 1;
      const rank = R[pickRarity(last ? (forceLegend ? R.legendaire.rank : R[pack.last || 'rare'].rank) : 0)].rank;
      let list = [];
      // Si la rareté tirée n'existe pas dans ce paquet, on prend la plus proche (vers le bas d'abord).
      // Si elle existe mais que toutes ses cartes sont déjà sorties dans ce paquet (petits paquets, ex. Tour des
      // Flandres), on accepte un doublon plutôt que de changer de rareté : les taux affichés restent exacts.
      // Sauf pour le paquet Nouveautés, qui promet cinq cartes différentes absentes de l'album.
      for (let d = 0; d < RARITIES.length && !list.length; d++) {
        for (const r of [rank - d, rank + d]) {
          if (r < 0 || r >= RARITIES.length || list.length) continue;
          const same = pool.filter(c => c.rarity === RARITIES[r].id);
          list = same.filter(c => !taken.has(c.id));
          if (!list.length && !pack.missing) list = same; // jamais de doublon dans le paquet Nouveautés
        }
      }
      const card = pickCard(list);
      taken.add(card.id);
      out.push({ card, finish: pickFinish(pack.finishBoost, pack.id) });
    }
    // Édition limitée : remplace la première carte (jamais la 5ᵉ, qui porte la garantie du paquet)
    if (Math.random() < exclChance(pack)) out[0] = { card: pickExclusive(pack), finish: pickFinish(pack.finishBoost, pack.id) };
    // Ordre de révélation : de la moins rare à la plus rare, les éditions limitées en dernier
    const isEd = d => d.card.cat === 'edition' ? 1 : 0;
    return out.sort((a, b) => isEd(a) - isEd(b) || R[a.card.rarity].rank - R[b.card.rarity].rank || finTier(a.finish) - finTier(b.finish));
  }

  // Taux réels par carte pour un paquet : une rareté absente du paquet se reporte sur la plus proche
  // (vers le bas d'abord), exactement comme dans drawPack.
  const pctOdds = x => x > 0 ? (x * 100).toFixed(1).replace('.', ',') + ' %' : '—';
  function packOdds(pack) {
    const have = new Set(poolOf(pack).map(c => c.rarity));
    const mapTo = r => { for (let d = 0; d < RARITIES.length; d++) for (const x of [r - d, r + d]) if (x >= 0 && x < RARITIES.length && have.has(RARITIES[x].id)) return x; return r; };
    const slot = minRank => {
      const out = RARITIES.map(() => 0), pool = RARITIES.filter((_, i) => i >= minRank), tot = pool.reduce((a, r) => a + r.weight, 0);
      pool.forEach(r => { out[mapTo(R[r.id].rank)] += r.weight / tot; });
      return out;
    };
    const a = slot(0), b = slot(R[pack.last || 'rare'].rank);
    return RARITIES.map((r, i) => ({ id: r.id, p: a[i], last: b[i] }));
  }

  // ---------- Boutique ----------
  function renderShop() {
    tickFree();
    const ev = nextEvent();
    $('#event-line').innerHTML = activeEvents().length ? '' : ev ? t('nextEvent', esc(pl(ev.p, 'title')), fmtDay(ev.start)) : '';
    $('#packs').innerHTML = shopPacks().map(p => {
      const tickets = state.tickets?.[p.id] || 0;
      const locked = (state.coins < p.price && !tickets && (!state.free || p.special)) || !leftToday(p) || (p.missing && !missingCount());
      return `
      <div class="pack-card${locked ? ' is-locked' : ''}${p.special ? ' is-special' : ''}${p.event ? ' is-event' : ''}" data-pack="${p.id}">
        ${tickets ? `<span class="ticket-ribbon">${t('ticketBadge', tickets)}</span>` : ''}
        ${p.event ? `<span class="event-ribbon">${t('eventUntil', fmtDay(eventWindow(p)[1]))}</span>` : ''}
        ${p.was ? `<span class="event-ribbon promo-ribbon">${t('promo', Math.round((1 - p.price / p.was) * 100))}</span>` : ''}
        ${packVisual(p)}
        <div class="pack-info">
          <div><h2>${esc(pl(p, 'title'))}</h2><p>${esc(pl(p, 'desc'))}</p></div>
          <span class="price">${p.was ? `<s class="was">${p.was}</s>` : ''}<span class="coin"></span>${p.price}</span>
        </div>
        ${packExtras(p)}
        <button class="linkish odds-btn">${t('packOdds')}</button>
        <table class="pack-odds" hidden><thead><tr><th></th><th>${t('oddsCards')}</th><th>${t('oddsLast')}</th></tr></thead><tbody>${packOdds(p).filter(o => o.p + o.last > 0).map(o =>
          `<tr><td><span class="gem" style="background:var(--r-${o.id})"></span>${rl(o.id)}</td><td>${pctOdds(o.p)}</td><td>${pctOdds(o.last)}</td></tr>`).join('')}${packOddsExtra(p)}</tbody></table>
        ${p.perDay ? `<span class="pack-note">${!missingCount() ? t('albumFull') : !leftToday(p) ? t('perDay') : (missingCount() < PACK_SIZE ? t('lastMissing', missingCount()) + ' · ' : '') + t('perDayLeft', leftToday(p), p.perDay)}</span>`
          : p.event ? `<span class="pack-note">${t('eventNote')}</span>` : `<button class="btn btn-line buy10"${state.coins < bulkPrice(p) ? ' disabled' : ''}>${t('bulk', bulkOf(p))} <span class="price"><span class="coin"></span>${fmt(bulkPrice(p))}</span><small>${t('bulkOff', Math.round((1 - BULK_DISCOUNT) * 100))}</small></button>`}
      </div>`;
    }).join('');
    renderFree();
    renderDaily();
    renderMissions();
    renderWeekly();
    renderShowcase();
  }
  // Vitrine (ordinateur uniquement, masquée sur téléphone) : les cinq plus belles cartes en éventail,
  // la meilleure au centre, et l'avancement de l'album
  function renderShowcase() {
    const box = $('#showcase');
    if (!box) return;
    const owned = CARDS.filter(c => totalOf(c.id));
    const score = c => R[c.rarity].rank * 10 + finTier(bestFinish(c.id)) * 3 + (c.cat === 'edition' ? 6 : 0);
    const best = owned.sort((a, b) => score(b) - score(a)).slice(0, 5);
    const order = [3, 1, 0, 2, 4].filter(i => i < best.length).map(i => best[i]); // la meilleure au milieu
    const n = order.length || 3;
    const pct = owned.length / CARDS.length;
    const fan = order.length
      ? order.map((c, i) => `<div class="sc-card" style="--i:${i};--n:${n};--z:${10 - Math.abs(i - (n - 1) / 2) * 2}">${cardHTML(c, { finish: bestFinish(c.id) }).replace('<article ', `<article tabindex="0" role="button" aria-label="${esc(nm(c))}" `)}</div>`).join('')
      : [0, 1, 2].map(i => `<div class="sc-card is-back" style="--i:${i};--n:3;--z:${10 - Math.abs(i - 1) * 2}"><div class="cell sc-backcell">${cardBack()}</div></div>`).join('');
    box.innerHTML = `
      <div class="sc-head"><h3>${t('scTitle')}</h3><span>${t('scCount', fmt(owned.length), fmt(CARDS.length), Math.floor(pct * 100))}</span></div>
      <div class="sc-bar"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
      <div class="sc-fan">${fan}</div>
      ${order.length ? '' : `<p class="sc-empty">${t('scEmpty')}</p>`}`;
  }
  $('#showcase')?.addEventListener('keydown', e => {
    const card = e.target.closest('.sc-card .card');
    if (card && pressKey(e)) { e.preventDefault(); openDetail(card.dataset.id, card.dataset.fin); }
  });
  $('#showcase')?.addEventListener('click', e => {
    const card = e.target.closest('.sc-card .card');
    if (card) { SFX.tick(); openDetail(card.dataset.id, card.dataset.fin); }
  });

  // Paquets spéciaux : leurs cartes exclusives (floutées tant qu'on ne les a pas) et leur version d'événement
  function packExtras(p) {
    const list = exclOf(p.id), fin = packFinish(p.id);
    if (!list.length && !fin) return '';
    const thumbs = list.map(c => {
      const got = totalOf(c.id) > 0;
      return `<span class="ex-thumb r-${c.rarity}${got ? '' : ' is-locked'}" title="${got ? esc(nm(c)) : esc(rl(c.rarity))}" style="background-image:url('${imgUrl(c.img, 160)}')">${got ? '' : '<b>?</b>'}</span>`;
    }).join('');
    return `<div class="pack-extras">
      ${list.length ? `<div class="ex-row"><div class="ex-thumbs">${thumbs}</div><span>${t('exclLine', list.length, list.filter(c => totalOf(c.id)).length)}</span></div>` : ''}
      ${fin ? `<div class="ex-row"><span class="fin-dot d-${fin.id}"></span><span>${t('evFinLine', fl(fin.id))}</span></div>` : ''}
    </div>`;
  }
  function packOddsExtra(p) {
    const fin = packFinish(p.id), ch = exclChance(p);
    return BASE_FINISHES.slice(1).map((f, i) => `<tr class="odds-x${i ? '' : ' first'}"><td><span class="fin-dot d-${f.id}"></span>${fl(f.id)}</td><td colspan="2">${pctOdds(f.chance * (p.finishBoost || 1))} ${t('perCard')}</td></tr>`).join('') + (ch ? `<tr class="odds-x"><td>${t('oddsExcl')}</td><td colspan="2">${pctOdds(ch)} ${t('perPack')}</td></tr>` : '') +
      (fin ? `<tr class="odds-x"><td><span class="fin-dot d-${fin.id}"></span>${fl(fin.id)}</td><td colspan="2">${pctOdds(fin.packChance)} ${t('perCard')}</td></tr>` : '') +
      // Nouvelle catégorie mise en avant, quand elle partage le paquet avec d'autres
      [...featuredCats()].filter(cat => { const cats = new Set(poolOf(p).map(c => c.cat)); return cats.has(cat) && cats.size > 1; })
        .map(cat => `<tr class="odds-x"><td>${cl(cat)}</td><td colspan="2">${t('oddsFeatured', FEATURED_WEIGHT, fmtDay(FEATURED[cat]))}</td></tr>`).join('');
  }

  function renderFree() {
    tickFree();
    const left = state.freeAt + FREE_EVERY_MS - Date.now();
    const pips = Array.from({ length: FREE_MAX }, (_, i) => `<span class="pip${i < state.free ? ' on' : ''}"></span>`).join('');
    const timer = state.free >= FREE_MAX ? t('freeFull') : t('freeIn', `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`);
    const pityLeft = PITY - state.pity;
    $('#free-box').dataset.title = t('freeTitle'); // titre affiché sur ordinateur seulement
    $('#free-box').innerHTML = `
      <div class="free-line"><span class="pips">${pips}</span><span class="label">${t('free', state.free)} · ${timer}</span></div>
      <div class="pity-line"><span class="pity-bar"><span style="width:${(state.pity / PITY * 100).toFixed(1)}%"></span></span><span class="label">${t('pity', pityLeft)}</span></div>`;
  }
  setInterval(() => { if ($('#view-shop').classList.contains('is-active')) renderFree(); }, 1000);


  $('#packs').addEventListener('keydown', e => {
    if (e.target.classList?.contains('pack-visual') && pressKey(e)) { e.preventDefault(); e.target.click(); }
  });
  $('#packs').addEventListener('click', e => {
    const ob = e.target.closest('.odds-btn');
    if (ob) { const ul = ob.nextElementSibling; ul.hidden = !ul.hidden; return; }
    const el = e.target.closest('.pack-visual, .buy10');
    if (!el || el.disabled) return;
    const pack = shopPacks().find(x => x.id === el.closest('[data-pack]').dataset.pack);
    openPack(pack, el.classList.contains('buy10') ? bulkOf(pack) : 1);
  });

  // ---------- Ouverture ----------
  const stage = $('#stage');
  let current = null;

  // Achat et tirage, sans interface : utilisé par l'ouverture, le lot ×10 et la simulation (tools/simulate.mjs).
  // Un paquet seul utilise d'abord un paquet gratuit ; le lot ×10 se paie toujours en pièces.
  // Paquets limités par jour (Nouveautés) : compteur remis à zéro chaque jour
  const boughtToday = p => state.perDay?.day === ymd(now()) ? (state.perDay.n[p.id] || 0) : 0;
  const leftToday = p => p.perDay ? Math.max(0, p.perDay - boughtToday(p)) : Infinity;
  const missingCount = () => CARDS.filter(c => c.cat !== 'edition' && !totalOf(c.id)).length;
  let buyError = null;
  function buyPacks(pack, n = 1) {
    tickFree();
    buyError = null;
    if (pack.perDay && leftToday(pack) < n) { buyError = 'perDay'; return null; }
    if (pack.missing && !missingCount()) { buyError = 'albumFull'; return null; }
    let usedFree = false, usedTicket = false;
    const cost = n === 1 ? pack.price : bulkPrice(pack);
    if (n === 1 && state.tickets?.[pack.id] > 0) { state.tickets[pack.id]--; usedTicket = true; }
    else if (n === 1 && state.free > 0 && !pack.special) { state.free--; usedFree = true; if (state.free === FREE_MAX - 1) state.freeAt = Date.now(); }
    else if (state.coins >= cost) state.coins -= cost;
    else return null;
    const packs = Array.from({ length: n }, () => rollPack(pack, usedFree));
    if (pack.perDay) {
      if (state.perDay?.day !== ymd(now())) state.perDay = { day: ymd(now()), n: {} };
      state.perDay.n[pack.id] = (state.perDay.n[pack.id] || 0) + n;
    }
    save();
    return { packs, usedFree, usedTicket, cost: usedFree || usedTicket ? 0 : cost };
  }
  function rollPack(pack, usedFree) {
    const forceLegend = state.pity >= PITY - 1;
    const drawn = drawPack(pack, forceLegend);
    let newCount = 0, newVer = 0;
    const revealed = drawn.map(d => {
      const got = gotKind(d.card.id, d.finish), key = keyOf(d.card.id, d.finish);
      state.owned[key] = (state.owned[key] || 0) + 1;
      if (got === 'card') newCount++; else if (got === 'version') newVer++;
      return { ...d, got, isNew: got === 'card' };
    });
    const bonus = (newCount + newVer) * NEW_CARD_BONUS; // une nouvelle version rapporte le bonus aussi
    state.coins += bonus;
    state.packs++;
    mission('packs'); mission('new', newCount);
    mission('epic', revealed.filter(d => R[d.card.rarity].rank >= R.epique.rank).length);
    mission('legend', revealed.filter(d => R[d.card.rarity].rank >= R.legendaire.rank).length);
    mission('special', revealed.filter(d => d.finish !== 'normal').length);

    // Statistiques pour les succès
    const st = state.stats;
    st.packs++; st.cards += PACK_SIZE; if (usedFree) st.free++;
    st.packsBy[pack.id] = (st.packsBy[pack.id] || 0) + 1;
    for (const d of revealed) {
      st.rarity[d.card.rarity] = (st.rarity[d.card.rarity] || 0) + 1;
      if (d.finish !== 'normal') st.finish[d.finish] = (st.finish[d.finish] || 0) + 1;
      if (d.finish === 'or' && d.card.rarity === 'mythique') st.goldMyth = 1;
      if (d.card.cat === 'edition') st.excl = (st.excl || 0) + 1;
    }
    if (newCount === PACK_SIZE) st.perfect = 1;
    const legends = revealed.filter(d => R[d.card.rarity].rank >= R.legendaire.rank).length;
    if (legends >= 2) st.doubleLeg = 1;
    if (new Date().getHours() < 5) st.night = 1;
    // Garantie anti-malchance : le compteur repart à zéro dès qu'une légendaire ou mieux sort
    const pityTriggered = forceLegend && legends > 0;
    if (pityTriggered) st.pityHits++;
    state.pity = legends ? 0 : state.pity + 1;
    return { revealed, newCount, newVer, bonus, pityTriggered };
  }

  function openPack(pack, n = 1) {
    const res = buyPacks(pack, n);
    if (!res) { SFX.error(); return toast(t(buyError || 'noCoins')); }
    const revealed = res.packs.flatMap(p => p.revealed);
    for (const d of revealed.slice(0, 15)) { const p = photoOf(d.card, d.finish); if (p) new Image().src = imgUrl(p); }
    const sum = k => res.packs.reduce((a, p) => a + p[k], 0);
    renderWallet();
    current = { pack, n, revealed, newCount: sum('newCount'), newVer: sum('newVer'), bonus: sum('bonus'), usedFree: res.usedFree, usedTicket: res.usedTicket, cost: res.cost, pityTriggered: res.packs.some(p => p.pityTriggered) };
    // Solde affiché pendant l'ouverture : paquet payé, bonus des nouvelles cartes ajouté à la fin
    stageShown = state.coins - current.bonus; stageAnim = 0;
    $('#stage-coins').textContent = fmt(stageShown);
    $('#stage-gain').textContent = ''; $('#stage-gain').classList.remove('is-on');
    const { usedFree } = current;

    const score = d => R[d.card.rarity].rank + finTier(d.finish) * 1.5 + (d.card.cat === 'edition' ? 4 : 0);
    const best = revealed.reduce((a, b) => score(b) > score(a) ? b : a);
    const hot = F[best.finish].pack ? F[best.finish].color : best.card.cat === 'edition' ? packById(best.card.pack).metal[1] : best.finish === 'or' ? '#f6d478' : R[best.card.rarity].rank >= R.epique.rank ? `var(--r-${best.card.rarity})` : best.finish !== 'normal' ? '#9fe8ff' : '#ffffff';

    stage.hidden = false;
    stage.classList.remove('is-hot');
    stage.classList.toggle('is-bulk', n > 1);
    stage.style.setProperty('--hot', hot);
    document.body.style.overflow = 'hidden';
    $('#reveal').innerHTML = '';
    $('#stage-summary').textContent = current.usedTicket ? t('ticketUsed') : usedFree ? t('freePack') : t('paid', fmt(current.cost));
    ['#flip-all', '#again', '#to-album', '#stage-close'].forEach(s => { $(s).hidden = true; });
    $('#stage-hint').hidden = false;
    $('#stage-hint').textContent = t('hint');
    SFX.open();

    const sp = $('#stage-pack');
    sp.hidden = false;
    sp.className = 'stage-pack' + (n > 1 ? ' is-bulk' : '');
    sp.style.setProperty('--cut', (62 / 430 * 100) + '%');
    sp.innerHTML = `<div class="tilt"><div class="half top">${packSVG(pack)}</div><div class="half bottom">${packSVG(pack)}</div><div class="seam"></div></div>${n > 1 ? `<span class="bulk-badge">×${n}</span>` : ''}`;
  }

  $('#stage-pack').addEventListener('pointermove', e => {
    const tilt = e.currentTarget.querySelector('.tilt');
    if (!tilt || e.currentTarget.classList.contains('is-charging') || e.pointerType === 'touch') return;
    const b = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
    tilt.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 14}deg)`;
  });
  $('#stage-pack').addEventListener('pointerleave', e => {
    const tilt = e.currentTarget.querySelector('.tilt');
    if (tilt) tilt.style.transform = '';
  });

  $('#stage-pack').addEventListener('click', async e => {
    const sp = e.currentTarget;
    if (sp.classList.contains('is-charging') || sp.classList.contains('is-torn')) return;
    $('#stage-hint').hidden = true;
    sp.querySelector('.tilt').style.transform = '';
    sp.classList.add('is-charging');
    SFX.charge(0.9);
    if (navigator.vibrate) navigator.vibrate([20, 60, 20, 60, 40]);
    await sleep(900);
    flash();
    SFX.tear();
    sp.classList.remove('is-charging');
    sp.classList.add('is-torn');
    await sleep(650);
    sp.hidden = true;
    deal();
  });

  function flash() {
    const f = $('.stage-flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }

  function deal() {
    flipRun++; autoFlipping = false;
    const bulk = current.n > 1;
    $('#reveal').classList.toggle('is-bulk', bulk);
    $('#reveal').innerHTML = current.revealed.map(({ card, finish, got }, i) => {
      const rank = R[card.rarity].rank;
      const special = finish !== 'normal';
      const ed = card.cat === 'edition', ev = F[finish].pack;
      const tag = (ed ? t('edTag') + ' · ' : '') + gotLabel(got, finish, bulk);
      const hit = ev ? F[finish].color : ed ? packById(card.pack).metal[1] : finish === 'or' ? '#f6d478' : special && rank < R.epique.rank ? '#9fe8ff' : `var(--r-${card.rarity})`;
      return `
      <div class="slot${rank >= R.epique.rank || special || ed ? ' tease' : ''}${rank >= R.legendaire.rank || finTier(finish) >= F.plein.rank || ed ? ' big-hit' : ''}${ed ? ' is-ed' : ''}"
           style="--hit: ${hit}; --dx: calc(${2 - i % PACK_SIZE} * (var(--w) + 22px)); --dr: ${(i % PACK_SIZE - 2) * 6}deg; animation-delay: ${bulk ? Math.floor(i / PACK_SIZE) * 70 + (i % PACK_SIZE) * 25 : i * 90}ms" data-i="${i}">
        ${tag ? `<span class="tag${got === 'card' ? '' : got === 'version' ? ' ver' : ' dup'}${special && got !== 'version' ? ' special' : ''}${ev ? ' ev' : ''}${ed ? ' ed' : ''}"${ev || ed ? ` style="--tagc:${hit}"` : ''}>${tag}</span>` : ''}
        <div class="inner">
          <div class="face back">${cardBack()}</div>
          <div class="face front">${bulk ? '' : cardHTML(card, { finish })}</div>
        </div>
      </div>`;
    }).join('');
    current.revealed.slice(0, PACK_SIZE).forEach((_, i) => SFX.deal(i));
    const reveal = $('#reveal');
    reveal.scrollLeft = 0;
    requestAnimationFrame(() => { reveal.scrollLeft = 0; });
    setTimeout(() => { reveal.scrollLeft = 0; }, 900);
    $('#flip-all').hidden = false;
    if (current.pityTriggered) setTimeout(() => toast(t('pityHit')), 400);
  }

  $('#reveal').addEventListener('click', e => {
    const slot = e.target.closest('.slot');
    if (!slot) return;
    if (!slot.classList.contains('is-flipped')) flip(slot);
    else { const r = current.revealed[slot.dataset.i]; openDetail(r.card.id, r.finish); }
  });

  function flip(slot, auto = false) {
    if (slot.classList.contains('is-flipped')) return;
    const r = current.revealed[slot.dataset.i];
    // Lot de 10 : la face n'est créée qu'au retournement (50 cartes d'un coup faisaient ramer le téléphone)
    const front = slot.querySelector('.front');
    if (!front.firstElementChild) front.innerHTML = cardHTML(r.card, { finish: r.finish });
    slot.classList.add('is-flipped');
    SFX.flip();
    setTimeout(() => { SFX.reveal(R[r.card.rarity].rank); if (r.finish !== 'normal') SFX.shimmer(); }, 250);
    if (slot.classList.contains('big-hit')) {
      // Couleur lue sur la carte elle-même (pas de getComputedStyle, qui force un recalcul de toute la page) ;
      // dans un lot, les rayons ne changent de couleur qu'une fois (les repeindre coûte cher)
      if (current.n === 1 || !stage.classList.contains('is-hot')) {
        stage.style.setProperty('--hot', slot.style.getPropertyValue('--hit').trim());
        stage.classList.add('is-hot');
      }
      setTimeout(flash, 300);
      if (navigator.vibrate) navigator.vibrate(80);
    }
    const reveal = $('#reveal');
    const next = $('#reveal .slot:not(.is-flipped)');
    if (next && !auto && current.n === 1 && reveal.scrollWidth > reveal.clientWidth + 4) {
      setTimeout(() => reveal.scrollTo({ left: next.offsetLeft - (reveal.clientWidth - next.offsetWidth) / 2, behavior: 'smooth' }), 700);
    }
    if (!next) setTimeout(finishReveal, 700);
  }
  // « Tout retourner » : une carte à la fois, avec le temps de lire le nom.
  // Sur téléphone (carrousel), on fait défiler jusqu'à la carte avant de la retourner.
  let autoFlipping = false, flipRun = 0;
  $('#flip-all').addEventListener('click', async () => {
    if (autoFlipping) return;
    autoFlipping = true;
    const run = ++flipRun;
    $('#flip-all').hidden = true;
    const reveal = $('#reveal');
    if (current.n > 1) {
      const slots = $$('#reveal .slot');
      for (let r = 0; r < slots.length; r += PACK_SIZE) {
        if (stage.hidden || run !== flipRun) break;
        const row = slots.slice(r, r + PACK_SIZE).filter(s => !s.classList.contains('is-flipped'));
        if (!row.length) continue;
        row[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        for (const s of row) { flip(s, true); await sleep(70); }
        await sleep(380 + (row.some(s => s.classList.contains('big-hit')) ? 600 : 0));
      }
      autoFlipping = false;
      return;
    }
    const carousel = () => reveal.scrollWidth > reveal.clientWidth + 4;
    for (const s of $$('#reveal .slot:not(.is-flipped)')) {
      if (stage.hidden || run !== flipRun) break;
      if (carousel()) {
        reveal.scrollTo({ left: s.offsetLeft - (reveal.clientWidth - s.offsetWidth) / 2, behavior: 'smooth' });
        await sleep(250);
      }
      flip(s, true);
      await sleep((carousel() ? 800 : 550) + (s.classList.contains('big-hit') ? 500 : 0));
    }
    autoFlipping = false;
  });

  function finishReveal() {
    const { pack, n, newCount, newVer, bonus, revealed } = current;
    const dups = revealed.length - newCount - newVer;
    const specials = revealed.filter(r => r.finish !== 'normal').length;
    $('#stage-summary').innerHTML = t('summary', newCount, dups, specials, bonus, newVer);
    if (bonus) SFX.coin();
    current.finished = true;
    stageCoinsSync();
    $('#flip-all').hidden = true;
    tickFree();
    const again = $('#again');
    again.hidden = false;
    if (n > 1) { again.textContent = t('again10', n, fmt(bulkPrice(pack))); again.disabled = state.coins < bulkPrice(pack); }
    else { const free = (state.free && !pack.special) || state.tickets?.[pack.id] > 0; again.textContent = t('again', free ? null : pack.price); again.disabled = (!free && state.coins < pack.price) || !leftToday(pack) || (pack.missing && !missingCount()); }
    $('#to-album').hidden = false;
    $('#stage-close').hidden = false;
    checkAchievements();
  }
  // Compteur de pièces de l'ouverture : suit le solde (bonus des nouvelles cartes, succès débloqués)
  // en montant jusqu'à la nouvelle valeur, avec « +gain »
  let stageShown = 0, stageAnim = 0;
  function stageCoinsSync() {
    const from = stageShown, gain = state.coins - from;
    if (!gain) return;
    stageShown = state.coins;
    const el = $('#stage-coins'), t0 = performance.now(), dur = 600, run = ++stageAnim;
    const g = $('#stage-gain');
    if (gain > 0) { g.textContent = `+${fmt(gain)}`; g.classList.remove('is-on'); void g.offsetWidth; g.classList.add('is-on'); }
    const step = now => { if (run !== stageAnim) return; const k = Math.min(1, (now - t0) / dur); el.textContent = fmt(Math.round(from + gain * k)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function closeStage() {
    stage.hidden = true;
    document.body.style.overflow = '';
    current = null;
    renderShop();
  }
  $('#again').addEventListener('click', () => openPack(current.pack, current.n));
  $('#stage-close').addEventListener('click', () => { SFX.tick(); closeStage(); });
  $('#to-album').addEventListener('click', () => { closeStage(); show('binder'); });

  document.addEventListener('keydown', e => {
    if (stage.hidden || $('#detail').open) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const sp = $('#stage-pack');
      if (!sp.hidden) sp.click();
      else {
        const next = $('#reveal .slot:not(.is-flipped)');
        if (next) flip(next);
      }
    } else if (e.key === 'Escape' && !$('#stage-close').hidden) closeStage();
  });

  // ---------- Album ----------
  const filters = { cat: 'all', rarity: 'all', owned: false, special: false, q: '', series: null };
  let shown = PAGE;

  function renderBinder() {
    const counts = { all: [0, 0], live: [0, 0] };
    for (const c of CARDS) {
      const o = totalOf(c.id) ? 1 : 0;
      (counts[c.cat] ||= [0, 0])[1]++; counts[c.cat][0] += o;
      counts.all[1]++; counts.all[0] += o;
      if (c.current && c.cat === 'politique') { counts.live[1]++; counts.live[0] += o; }
    }
    const chips = [{ id: 'all', label: t('all') }, ...CATS.filter(c => counts[c.id]).map(c => ({ id: c.id, label: c[L()] })), { id: 'live', label: t('liveGov') }];
    $('#cat-chips').innerHTML = chips.map(c =>
      `<button class="chip${filters.cat === c.id ? ' is-active' : ''}${c.id === 'live' ? ' live' : ''}" data-cat="${c.id}">${c.label}<small>${counts[c.id][0]}/${counts[c.id][1]}</small></button>`).join('');

    let dupes = 0, specials = 0;
    for (const [key, n] of Object.entries(state.owned)) { dupes += Math.max(0, n - 1); if (key.includes('|') && n) specials++; }
    $('#binder-summary').textContent = t('binderSummary', counts.all[0], fmt(counts.all[1]), specials, state.packs, dupes) + ' · ' +
      (counts.all[0] / counts.all[1] >= LATE_AT ? t('lateOn', String(LATE_MULT).replace('.', ',')) : t('lateOff', Math.round(LATE_AT * 100), String(LATE_MULT).replace('.', ',')));
    $('#sell-all').disabled = dupes === 0;

    const q = filters.q.trim().toLowerCase();
    const list = CARDS.filter(c =>
      (!filters.series || filters.series.members.includes(c.id)) &&
      (filters.cat === 'all' || (filters.cat === 'live' ? c.current && c.cat === 'politique' : c.cat === filters.cat)) &&
      (filters.rarity === 'all' || c.rarity === filters.rarity) &&
      (!filters.owned || totalOf(c.id)) &&
      (!filters.special || finishesOwned(c.id).some(f => f !== 'normal')) &&
      (!q || [c.name, c.nl?.name, c.subtitle, c.party, c.meta].some(s => (s || '').toLowerCase().includes(q))));

    if (filters.series) list.sort((a, b) => !totalOf(a.id) - !totalOf(b.id)); // série : cartes obtenues d'abord
    $('#series-banner').hidden = !filters.series;
    if (filters.series) $('#series-banner').innerHTML = `<span>${t('seriesBanner')} : <b>${esc(sl(filters.series, 'title'))}</b></span><button class="linkish" id="clear-series">${t('clearFilter')}</button>`;
    const grid = $('#grid');
    if (!list.length) { grid.innerHTML = `<p class="empty">${filters.owned || filters.special ? t('emptyOwned') : t('emptyAll')}</p>`; return; }
    grid.innerHTML = list.slice(0, shown).map(c => {
      const n = totalOf(c.id);
      if (n) return `<div class="cell">${cardHTML(c, { count: n, finish: bestFinish(c.id), variants: finishesOwned(c.id) }).replace('<article ', `<article tabindex="0" role="button" aria-label="${esc(nm(c))}, ${esc(rl(c.rarity))}" `)}</div>`;
      const where = c.cat === 'edition' && packById(c.pack) ? `<span class="ed-where">${t('edWhere', esc(pl(packById(c.pack), 'title')))}</span>` : '';
      return `<div class="cell"><div class="empty-slot"><span class="gem" style="background:var(--r-${c.rarity})"></span><span class="no">${String(c.no).padStart(4, '0')}</span><span class="name">${esc(nm(c))}</span>${where}</div></div>`;
    }).join('') + (list.length > shown ? `<button class="btn btn-line grid-more" id="more">${t('more', fmt(list.length - shown))}</button>` : '');
  }
  function renderWallet() {
    $('#coins').textContent = fmt(state.coins);
    if (current?.finished && !$('#stage').hidden) stageCoinsSync(); // fin d'ouverture : succès débloqués
    const n = CARDS.filter(c => totalOf(c.id)).length;
    $('#progress-pill').textContent = `${n}/${fmt(CARDS.length)}`;
    const ready = SERIES.filter(s => !state.claimed[s.id] && s.members.every(id => totalOf(id))).length;
    $('#series-dot').hidden = !ready;
  }

  $('#cat-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    SFX.tick();
    filters.cat = b.dataset.cat; shown = PAGE; renderBinder();
  });
  function fillRaritySelect() {
    $('#f-rarity').innerHTML = `<option value="all">${t('allRarities')}</option>` + RARITIES.map(r => `<option value="${r.id}">${rl(r.id)}</option>`).join('');
    $('#f-rarity').value = filters.rarity;
  }
  $('#f-rarity').addEventListener('change', e => { filters.rarity = e.target.value; shown = PAGE; renderBinder(); });
  $('#f-owned').addEventListener('change', e => { filters.owned = e.target.checked; shown = PAGE; renderBinder(); });
  $('#f-special').addEventListener('change', e => { filters.special = e.target.checked; shown = PAGE; renderBinder(); });
  $('#search').addEventListener('input', e => { filters.q = e.target.value; shown = PAGE; renderBinder(); });
  // Clavier : Entrée ou Espace sur une carte de l'album, de la vitrine ou sur un paquet
  const pressKey = e => (e.key === 'Enter' || e.key === ' ') && !e.repeat;
  $('#grid').addEventListener('keydown', e => {
    const card = e.target.closest('.card');
    if (card && pressKey(e)) { e.preventDefault(); openDetail(card.dataset.id, card.dataset.fin); }
  });
  $('#grid').addEventListener('click', e => {
    if (e.target.id === 'more') { shown += PAGE; renderBinder(); return; }
    const card = e.target.closest('.card');
    if (card) openDetail(card.dataset.id, card.dataset.fin);
  });
  // Doublons revendables : un exemplaire de chaque version est toujours gardé
  function dupValue() {
    let gain = 0, n = 0;
    const mult = resaleMult();
    for (const [key, cnt] of Object.entries(state.owned)) {
      const [id, fin = 'normal'] = key.split('|');
      if (cnt > 1 && BY_ID.has(id)) { gain += (cnt - 1) * sellValue(BY_ID.get(id), fin, mult); n += cnt - 1; }
    }
    return { n, gain };
  }
  function sellDuplicates() {
    const { n, gain } = dupValue();
    for (const [key, cnt] of Object.entries(state.owned)) if (cnt > 1 && BY_ID.has(key.split('|')[0])) state.owned[key] = 1;
    state.coins += gain; state.stats.sold += n; state.stats.earned += gain;
    save();
    mission('sell', n);
    return { n, gain };
  }
  $('#sell-all').addEventListener('click', () => {
    const { n, gain } = dupValue();
    if (!n || !confirm(t('sellConfirm', n, fmt(gain)))) return;
    sellDuplicates();
    renderWallet(); renderBinder();
    SFX.coin(); toast(t('coinsPlus', fmt(gain)));
    checkAchievements();
  });

  // ---------- Séries ----------
  function renderSeries() {
    const done = SERIES.filter(s => state.claimed[s.id]).length;
    $('#series-summary').textContent = t('seriesSummary', done, SERIES.length);
    $('#series-grid').innerHTML = SERIES.map(s => {
      const have = s.members.filter(id => totalOf(id)).length;
      const complete = have === s.members.length;
      const claimed = !!state.claimed[s.id];
      // Les cartes déjà obtenues d'abord : on voit sa progression même dans une grande série
      const thumbs = [...s.members].sort((a, b) => !totalOf(a) - !totalOf(b)).slice(0, 12).map(id => {
        const c = BY_ID.get(id);
        return totalOf(id) && c.img ? `<span class="thumb" style="background-image:url('${imgUrl(c.img, 120)}')"></span>` : '<span class="thumb is-empty"></span>';
      }).join('');
      return `
        <article class="series${complete ? ' is-complete' : ''}${claimed ? ' is-claimed' : ''}" data-series="${s.id}">
          <div class="series-head"><h2>${esc(sl(s, 'title'))}</h2><span class="series-count">${have}/${s.members.length}</span></div>
          <p>${esc(sl(s, 'desc'))}</p>
          <div class="series-thumbs">${thumbs}${s.members.length > 12 ? `<span class="thumb more">+${s.members.length - 12}</span>` : ''}</div>
          <div class="bar"><span style="width:${(have / s.members.length * 100).toFixed(1)}%"></span></div>
          <div class="series-foot">
            <span class="price"><span class="coin"></span>${fmt(s.reward)}</span>
            ${claimed ? `<span class="claimed">${t('claimed')}</span>`
              : complete ? `<button class="btn btn-gold claim">${t('claim')}</button>`
              : `<button class="btn btn-line see">${t('see')}</button>`}
          </div>
        </article>`;
    }).join('');
  }
  function claimSeries(id) {
    const s = SERIES.find(x => x.id === id);
    if (!s || state.claimed[s.id] || !s.members.every(m => totalOf(m))) return 0;
    state.claimed[s.id] = true; state.coins += s.reward; save();
    mission('series');
    return s.reward;
  }
  function openSeriesInAlbum(id) {
    filters.series = SERIES.find(s => s.id === id);
    filters.cat = 'all'; filters.owned = false; $('#f-owned').checked = false; shown = PAGE;
    show('binder');
  }
  $('#series-grid').addEventListener('click', e => {
    const card = e.target.closest('.series');
    if (!card) return;
    const s = SERIES.find(x => x.id === card.dataset.series);
    if (e.target.closest('.claim')) {
      if (!claimSeries(s.id)) return;
      renderWallet(); renderSeries();
      SFX.achievement(); toast(t('seriesDone', fmt(s.reward)));
      checkAchievements();
      return;
    }
    openSeriesInAlbum(s.id);
  });
  $('#series-banner').addEventListener('click', e => {
    if (e.target.id === 'clear-series') { filters.series = null; shown = PAGE; renderBinder(); }
  });

  // ---------- Fusion des doublons ----------
  // 5 doublons standard d'une même rareté → 1 carte au hasard de la rareté au-dessus.
  // 3 doublons standard d'une même carte → sa version Holo. Un exemplaire de chaque carte est toujours gardé.
  const FUSE_COST = 5, HOLO_COST = 3;
  const randomCard = rarity => pickCard(CARDS.filter(c => c.rarity === rarity && c.cat !== 'edition'));
  const fuseStock = rarity => CARDS.filter(c => c.rarity === rarity && countOf(c.id, 'normal') > 1).map(c => ({ c, extra: countOf(c.id, 'normal') - 1 }));
  const fuseAvailable = rarity => fuseStock(rarity).reduce((a, x) => a + x.extra, 0);
  const holoCandidates = () => CARDS.filter(c => countOf(c.id, 'normal') > HOLO_COST);
  const holoMax = id => Math.floor((countOf(id, 'normal') - 1) / HOLO_COST); // un exemplaire standard est toujours gardé
  function addCard(card, finish) {
    const got = gotKind(card.id, finish), key = keyOf(card.id, finish);
    state.owned[key] = (state.owned[key] || 0) + 1;
    return { card, finish, got, isNew: got === 'card' };
  }
  function fuseRarity(rarity) {
    const next = RARITIES[R[rarity].rank + 1];
    if (!next || fuseAvailable(rarity) < FUSE_COST) return null;
    for (let k = 0; k < FUSE_COST; k++) { // on prend d'abord les cartes qu'on a en plus grand nombre
      const top = fuseStock(rarity).sort((a, b) => b.extra - a.extra)[0];
      state.owned[top.c.id]--;
    }
    const res = addCard(randomCard(next.id), 'normal');
    state.stats.fused++;
    save(); mission('fuse');
    return res;
  }
  function fuseHolo(id) {
    const c = BY_ID.get(id);
    if (!c || countOf(id, 'normal') <= HOLO_COST) return null;
    state.owned[id] -= HOLO_COST;
    const res = addCard(c, 'holo');
    state.stats.fused++; state.stats.fuseHolo++;
    state.stats.finish.holo = (state.stats.finish.holo || 0) + 1;
    save(); mission('fuse');
    return res;
  }

  const fuseDlg = $('#fuse');
  const fuseManyLabel = rs => t('fuseMany', rs.length, rs.filter(r => r.got === 'card').length, rs.filter(r => r.got === 'version').length);
  // Résultat d'une ou plusieurs fusions : la carte obtenue, ou le lot (les plus rares d'abord)
  function fuseResultHTML(results) {
    if (!results?.length) return '';
    if (results.length === 1) {
      const r = results[0];
      return `<div class="fuse-result"><div class="cell">${cardHTML(r.card, { finish: r.finish })}</div>
        <div><span class="tag-inline${r.got === 'card' ? '' : r.got === 'version' ? ' ver' : ' dup'}">${gotLabel(r.got, r.finish)}</span><b>${esc(nm(r.card))}</b><small>${rl(r.card.rarity)}${r.finish !== 'normal' ? ' · ' + fl(r.finish) : ''}</small></div></div>`;
    }
    const rank = r => r.got === 'card' ? 2 : r.got === 'version' ? 1 : 0;
    const best = results.slice().sort((a, b) => R[b.card.rarity].rank - R[a.card.rarity].rank || rank(b) - rank(a)).slice(0, 8);
    return `<div class="fuse-result is-many"><b>${fuseManyLabel(results)}</b>
      <div class="fuse-lot">${best.map(r => `<div class="cell${r.got === 'card' ? ' is-new' : r.got === 'version' ? ' is-ver' : ''}">${cardHTML(r.card, { finish: r.finish })}</div>`).join('')}</div>
      ${results.length > best.length ? `<small>${t('fuseMore', results.length - best.length)}</small>` : ''}</div>`;
  }
  function renderFuse(results = null) {
    const rows = RARITIES.slice(0, -1).map((r, i) => {
      const n = fuseAvailable(r.id), next = RARITIES[i + 1];
      return `<div class="fuse-row">
        <span class="fuse-recipe"><b>${FUSE_COST}×</b> <span class="gem" style="background:var(--r-${r.id})"></span>${rl(r.id)} <i>→</i> <b>1×</b> <span class="gem" style="background:var(--r-${next.id})"></span>${rl(next.id)}</span>
        <small>${t('fuseHave', n)}</small>
        <span class="fuse-btns"><button class="btn${n >= FUSE_COST ? ' btn-gold' : ' btn-line'}" data-fuse="${r.id}"${n >= FUSE_COST ? '' : ' disabled'}>${t('fuseGo')}</button>${
          Math.floor(n / FUSE_COST) > 1 ? `<button class="btn btn-line" data-fuse="${r.id}" data-max="1">${t('fuseMax', Math.floor(n / FUSE_COST))}</button>` : ''}</span>
      </div>`;
    }).join('');
    const holos = holoCandidates().sort((a, b) => R[b.rarity].rank - R[a.rarity].rank);
    $('#fuse-body').innerHTML = `
      <h2>${t('fuseTitle')}</h2>
      <p class="muted">${t('fuseIntro', FUSE_COST, HOLO_COST)}</p>
      ${fuseResultHTML(results)}
      <h3>${t('fuseUp')}</h3>
      <div class="fuse-rows">${rows}</div>
      <h3>${t('fuseHoloH', HOLO_COST)}</h3>
      ${holos.length ? `<div class="fuse-holos">${holos.slice(0, 40).map(c => `<div class="fuse-holo">
          <span class="gem" style="background:var(--r-${c.rarity})"></span><span class="fuse-name">${esc(nm(c))}</span><small>×${countOf(c.id, 'normal')}</small>
          <span class="fuse-btns"><button class="btn btn-line" data-holo="${esc(c.id)}">${t('fuseToHolo')}</button>${
            holoMax(c.id) > 1 ? `<button class="btn btn-line" data-holo="${esc(c.id)}" data-max="1">${t('fuseMax', holoMax(c.id))}</button>` : ''}</span></div>`).join('')}</div>`
        : `<p class="muted small">${t('fuseNoHolo', HOLO_COST + 1)}</p>`}`;
  }
  $('#fuse-btn').addEventListener('click', () => { SFX.tick(); renderFuse(); fuseDlg.showModal(); fuseDlg.scrollTop = 0; });
  $('#fuse-close').addEventListener('click', () => fuseDlg.close());
  fuseDlg.addEventListener('click', e => {
    if (e.target === fuseDlg) return fuseDlg.close();
    const b = e.target.closest('[data-fuse], [data-holo]');
    if (!b || b.disabled) return;
    const once = () => b.dataset.fuse ? fuseRarity(b.dataset.fuse) : fuseHolo(b.dataset.holo);
    const results = [];
    for (let left = b.dataset.max ? Infinity : 1, r; left > 0 && (r = once()); left--) results.push(r);
    if (!results.length) return;
    const top = results.reduce((a, r) => R[r.card.rarity].rank > R[a.card.rarity].rank ? r : a);
    SFX.reveal(R[top.card.rarity].rank); if (results.some(r => r.finish !== 'normal')) SFX.shimmer();
    // On reste où on est : la ligne cliquée garde sa place à l'écran, même si le résultat s'affiche plus haut
    const sel = b.dataset.fuse ? `[data-fuse="${b.dataset.fuse}"]` : `[data-holo="${CSS.escape(b.dataset.holo)}"]`;
    const row = b.closest('.fuse-row, .fuse-holo'), before = row.getBoundingClientRect().top, scroll = fuseDlg.scrollTop;
    renderFuse(results);
    const again = fuseDlg.querySelector(sel)?.closest('.fuse-row, .fuse-holo');
    fuseDlg.scrollTop = again ? scroll + again.getBoundingClientRect().top - before : scroll;
    toast(results.length === 1 ? t('fuseGot', nm(top.card), rl(top.card.rarity) + (top.finish !== 'normal' ? ' · ' + fl(top.finish) : ''), top.got)
      : fuseManyLabel(results));
    renderWallet(); if ($('#view-binder').classList.contains('is-active')) renderBinder();
    checkAchievements();
  });
  fuseDlg.addEventListener('close', () => { if ($('#view-binder').classList.contains('is-active')) renderBinder(); });

  // ---------- Carte du jour ----------
  // Une carte offerte par jour. Jours consécutifs : rare ou mieux dès le 3ᵉ jour, épique ou mieux dès le 5ᵉ,
  // légendaire ou mieux tous les 7 jours. Plus quelques pièces.
  const DAILY_COINS = 20;
  const dailyReady = () => state.daily.last !== ymd(now());
  const dailyMin = streak => streak > 0 && streak % 7 === 0 ? 'legendaire' : streak >= 5 ? 'epique' : streak >= 3 ? 'rare' : 'commune';
  function claimDaily() {
    if (!dailyReady()) return null;
    const d = state.daily;
    d.streak = d.last === ymd(addDays(now(), -1)) ? d.streak + 1 : 1;
    d.last = ymd(now());
    const res = addCard(randomCard(pickRarity(R[dailyMin(d.streak)].rank)), pickFinish());
    state.coins += DAILY_COINS;
    state.stats.dailyMax = Math.max(state.stats.dailyMax || 0, d.streak);
    save();
    return { ...res, streak: d.streak };
  }
  function renderDaily() {
    const ready = dailyReady();
    const streak = state.daily.last === ymd(now()) || state.daily.last === ymd(addDays(now(), -1)) ? state.daily.streak : 0;
    $('#daily-box').innerHTML = ready
      ? `<button class="daily-btn" id="daily-open"><span class="daily-gift">${ACH_GIFT}</span><span><b>${t('dailyTitle')}</b><small>${dailyMin(streak + 1) === 'commune' ? t('dailyNextAny', streak + 1) : t('dailyNext', streak + 1, rl(dailyMin(streak + 1)))}</small></span></button>`
      : `<div class="daily-done"><span class="daily-gift">${ACH_GIFT}</span><span><b>${t('dailyDone')}</b><small>${t('dailyStreak', streak)}</small></span></div>`;
    renderShopDot();
  }
  const ACH_GIFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><rect x="4" y="9" width="16" height="11" rx="1"/><path d="M12 9v11M4 13h16M12 9c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1"/></svg>';
  const dailyDlg = $('#daily');
  $('#daily-box').addEventListener('click', e => {
    if (!e.target.closest('#daily-open')) return;
    const res = claimDaily();
    if (!res) return renderDaily();
    SFX.open();
    $('#daily-body').innerHTML = `
      <p class="daily-kicker">${t('dailyDay', res.streak)}</p>
      <div class="slot daily-slot${R[res.card.rarity].rank >= R.epique.rank || res.finish !== 'normal' ? ' tease' : ''}" style="--hit: var(--r-${res.card.rarity})">
        <div class="inner"><div class="face back">${cardBack()}</div><div class="face front">${cardHTML(res.card, { finish: res.finish })}</div></div>
      </div>
      <p class="daily-hint">${t('dailyHint')}</p>
      <p class="daily-after" hidden>${gotLabel(res.got, res.finish)} · +${DAILY_COINS} ${t('coinsWord')} · ${dailyMin(res.streak + 1) === 'commune' ? t('dailyCome') : t('dailyTomorrow', rl(dailyMin(res.streak + 1)))}</p>`;
    dailyDlg.showModal();
    renderWallet(); renderDaily();
    checkAchievements();
  });
  dailyDlg.addEventListener('click', e => {
    const slot = e.target.closest('.daily-slot');
    if (slot && !slot.classList.contains('is-flipped')) {
      slot.classList.add('is-flipped'); SFX.flip();
      const rank = R[slot.querySelector('.card').className.match(/r-([a-z-]+)/)[1]].rank;
      setTimeout(() => SFX.reveal(rank), 250);
      $('#daily-body .daily-hint').hidden = true; $('#daily-body .daily-after').hidden = false;
    } else if (e.target === dailyDlg || e.target.closest('#daily-close')) dailyDlg.close();
  });

  // ---------- Missions du jour ----------
  // Trois missions par jour, tirées au sort à partir de la date (même jour, mêmes missions), de 100 à 300 pièces.
  // Les autres parties du jeu signalent leurs actions avec mission(type, nombre).
  const MISSIONS = [
    { id: 'packs5',  kind: 'packs',   target: 5,  reward: 150, fr: n => `Ouvrir ${n} paquets`, nl: n => `${n} pakjes openen` },
    { id: 'packs15', kind: 'packs',   target: 15, reward: 300, fr: n => `Ouvrir ${n} paquets`, nl: n => `${n} pakjes openen` },
    { id: 'new10',   kind: 'new',     target: 10, reward: 200, fr: n => `Obtenir ${n} nouvelles cartes`, nl: n => `${n} nieuwe kaarten krijgen` },
    { id: 'epic',    kind: 'epic',    target: 1,  reward: 150, fr: () => 'Obtenir une carte épique ou mieux', nl: () => 'Een epische kaart of beter krijgen' },
    { id: 'special', kind: 'special', target: 1,  reward: 200, fr: () => 'Obtenir une version spéciale', nl: () => 'Een speciale versie krijgen' },
    { id: 'sell10',  kind: 'sell',    target: 10, reward: 100, fr: n => `Revendre ${n} doublons`, nl: n => `${n} dubbels verkopen` },
    { id: 'fuse',    kind: 'fuse',    target: 1,  reward: 150, fr: () => 'Faire une fusion', nl: () => 'Een fusie maken' },
    { id: 'games2',  kind: 'games',   target: 2,  reward: 150, fr: n => `Jouer à ${n} mini-jeux différents`, nl: n => `${n} verschillende minispellen spelen` },
    { id: 'belgle',  kind: 'belgle',  target: 1,  reward: 200, fr: () => 'Trouver la carte du Belgle', nl: () => 'De Belgle-kaart raden' },
  ];
  const MISSION = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
  const MISSIONS_PER_DAY = 3;
  const strHash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const ml = m => m[L()](m.target);
  function missionsToday() {
    const day = ymd(now());
    if (state.missions?.day !== day) {
      // Presque tout l'album : plus de mission « nouvelles cartes », devenue trop difficile
      const pool = MISSIONS.filter(m => m.kind !== 'new' || albumShare() < 0.9).sort((a, b) => strHash(day + a.id) - strHash(day + b.id));
      const ids = [];
      for (const m of pool) if (ids.length < MISSIONS_PER_DAY && !ids.some(id => MISSION[id].kind === m.kind)) ids.push(m.id);
      state.missions = { day, ids, prog: {}, games: [], claimed: {} };
    }
    return state.missions;
  }
  const missionReady = (m, id) => !m.claimed[id] && (m.prog[MISSION[id].kind] || 0) >= MISSION[id].target;
  function mission(kind, n = 1, key = null) {
    if (n <= 0) return;
    const m = missionsToday();
    if (kind === 'games') { if (m.games.includes(key)) return; m.games.push(key); }
    m.prog[kind] = (m.prog[kind] || 0) + n;
    weeklyProgress(kind, n);
    save();
    if ($('#view-shop').classList.contains('is-active') && stage.hidden) { renderMissions(); renderWeekly(); }
    else renderShopDot();
  }
  function claimMission(id) {
    const m = missionsToday();
    if (!m.ids.includes(id) || !missionReady(m, id)) return 0;
    m.claimed[id] = true;
    state.coins += MISSION[id].reward; state.stats.missions = (state.stats.missions || 0) + 1;
    mission('mission');
    save();
    return MISSION[id].reward;
  }
  function renderMissions() {
    const m = missionsToday();
    const rows = m.ids.map(id => {
      const x = MISSION[id], have = Math.min(m.prog[x.kind] || 0, x.target), claimed = !!m.claimed[id], ready = missionReady(m, id);
      return `<div class="mission${ready ? ' is-ready' : ''}${claimed ? ' is-claimed' : ''}">
        <span class="m-text">${esc(ml(x))}</span>
        <span class="m-bar"><i style="width:${(have / x.target * 100).toFixed(0)}%"></i></span>
        <span class="m-prog">${have}/${x.target}</span>
        ${claimed ? '<span class="m-done">✓</span>' : ready ? `<button class="btn btn-gold m-claim" data-mission="${id}">+${x.reward}</button>`
          : `<span class="price"><span class="coin"></span>${x.reward}</span>`}
      </div>`;
    }).join('');
    const all = m.ids.every(id => m.claimed[id]);
    $('#missions-box').innerHTML = `<h3>${t('missionsTitle')}${all ? ` <small>${t('missionsAll')}</small>` : ''}</h3>${rows}`;
    renderShopDot();
  }
  // Point sur l'onglet Paquets : carte du jour à prendre ou mission à réclamer
  function renderShopDot() {
    const m = missionsToday();
    $('.tab[data-view="shop"]').classList.toggle('has-dot', dailyReady() || m.ids.some(id => missionReady(m, id)) || weeklyReady());
  }
  $('#missions-box').addEventListener('click', e => {
    const b = e.target.closest('[data-mission]');
    if (!b) return;
    const gain = claimMission(b.dataset.mission);
    if (!gain) return;
    SFX.coin(); toast(t('coinsPlus', fmt(gain)));
    renderWallet(); renderMissions();
    checkAchievements();
  });

  // ---------- Défi de la semaine ----------
  // Un grand objectif par semaine (lundi → dimanche), tiré au sort à partir de la semaine.
  // Récompense : un ticket Prestige (un paquet Prestige offert) et des pièces.
  const WEEKLY = [
    { id: 'packs50',   kind: 'packs',   target: 50, fr: n => `Ouvrir ${n} paquets`, nl: n => `${n} pakjes openen` },
    { id: 'new40',     kind: 'new',     target: 40, fr: n => `Obtenir ${n} nouvelles cartes`, nl: n => `${n} nieuwe kaarten krijgen` },
    { id: 'special6',  kind: 'special', target: 6,  fr: n => `Obtenir ${n} versions spéciales`, nl: n => `${n} speciale versies krijgen` },
    { id: 'legend3',   kind: 'legend',  target: 3,  fr: n => `Obtenir ${n} cartes légendaires ou mieux`, nl: n => `${n} legendarische kaarten of beter krijgen` },
    { id: 'mission12', kind: 'mission', target: 12, fr: n => `Réclamer ${n} missions du jour`, nl: n => `${n} dagopdrachten innen` },
    { id: 'belgle4',   kind: 'belgle',  target: 4,  fr: n => `Trouver le Belgle ${n} jours`, nl: n => `De Belgle ${n} dagen raden` },
    { id: 'fuse5',     kind: 'fuse',    target: 5,  fr: n => `Faire ${n} fusions`, nl: n => `${n} fusies maken` },
    { id: 'series1',   kind: 'series',  target: 1,  fr: () => 'Compléter une série', nl: () => 'Een reeks vervolledigen' },
  ];
  const WEEKLY_COINS = 400;
  const weekKey = (d = now()) => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return `${x.getUTCFullYear()}-W${Math.ceil(((x - y0) / 864e5 + 1) / 7)}`; };
  const daysLeftInWeek = () => 7 - ((now().getDay() + 6) % 7);
  function weeklyNow() {
    const wk = weekKey();
    if (state.weekly?.week !== wk) {
      const pool = WEEKLY.filter(w => w.kind !== 'new' || albumShare() < 0.85).filter(w => w.kind !== 'series' || SERIES.some(x => !state.claimed[x.id]));
      const pickW = pool.slice().sort((a, b) => strHash(wk + a.id) - strHash(wk + b.id))[0];
      state.weekly = { week: wk, id: pickW.id, prog: 0, claimed: false };
    }
    return state.weekly;
  }
  function weeklyProgress(kind, n) {
    const w = weeklyNow();
    if (WEEKLY.find(x => x.id === w.id)?.kind === kind && !w.claimed) w.prog += n;
  }
  const weeklyReady = () => { const w = weeklyNow(); return !w.claimed && w.prog >= WEEKLY.find(x => x.id === w.id).target; };
  function claimWeekly() {
    if (!weeklyReady()) return false;
    const w = weeklyNow();
    w.claimed = true;
    state.tickets ||= {}; state.tickets.prestige = (state.tickets.prestige || 0) + 1;
    state.coins += WEEKLY_COINS; state.stats.weekly = (state.stats.weekly || 0) + 1;
    save();
    return true;
  }
  function renderWeekly() {
    const box = $('#weekly-box');
    if (!box) return;
    const w = weeklyNow(), x = WEEKLY.find(y => y.id === w.id), have = Math.min(w.prog, x.target);
    box.innerHTML = `
      <div class="wk-text"><small>${t('weeklyTitle')} · ${w.claimed ? t('weeklyDone') : t('weeklyLeft', daysLeftInWeek())}</small><b>${esc(x[L()](x.target))}</b></div>
      <div class="wk-prog"><span class="wk-bar"><i style="width:${(have / x.target * 100).toFixed(0)}%"></i></span><span class="wk-num">${have}/${x.target}</span></div>
      ${w.claimed ? '<span class="wk-done">✓</span>' : weeklyReady() ? `<button class="btn btn-gold" id="weekly-claim">${t('weeklyClaim')}</button>`
        : `<span class="wk-reward">${t('weeklyReward', fmt(WEEKLY_COINS))}</span>`}`;
    box.classList.toggle('is-ready', weeklyReady());
  }
  $('#weekly-box')?.addEventListener('click', e => {
    if (!e.target.closest('#weekly-claim') || !claimWeekly()) return;
    SFX.achievement(); toast(t('weeklyGot', fmt(WEEKLY_COINS)));
    renderWallet(); renderShop(); checkAchievements();
  });

  // ---------- Export / import de la sauvegarde ----------
  $('#export').addEventListener('click', () => {
    const prefs = {};
    for (const k of ['rdl-theme', 'rdl-lang', 'rdl-sound']) { try { const v = localStorage.getItem(k); if (v !== null) prefs[k] = v; } catch (_) { /* rien */ } }
    const blob = new Blob([JSON.stringify({ app: 'brol', version: 1, exportedAt: new Date().toISOString(), save: state, prefs }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `brol-partie-${ymd(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t('exported'));
  });
  $('#import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); } catch (_) { data = null; }
    const sv = data?.app === 'brol' ? data.save : null;
    if (!sv || typeof sv.coins !== 'number' || !isObj(sv.owned)) { SFX.error(); return toast(t('importBad')); }
    const n = new Set(Object.keys(sv.owned).filter(k => sv.owned[k] > 0).map(k => k.split('|')[0]).filter(id => BY_ID.has(id))).size;
    if (!confirm(t('importConfirm', n, fmt(sv.coins)))) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(sv));
      for (const [k, v] of Object.entries(data.prefs || {})) if (/^rdl-(theme|lang|sound)$/.test(k)) localStorage.setItem(k, String(v));
    } catch (_) { return toast(t('importBad')); }
    location.reload();
  });

  // ---------- Signaler un bug ----------
  // Une issue GitHub pré-remplie. Sur Android, un lien « intent » ouvre l'app GitHub (le navigateur sinon) ;
  // sur iPhone, iOS ouvre les liens github.com dans l'app quand elle est installée.
  const REPO = 'Helvor/Brol', SUPPORT_MAIL = 'brol-support@elveli.net';
  const bugDlg = $('#bug-dlg');
  const platform = () => /Android/i.test(navigator.userAgent) ? 'android'
    : /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) ? 'ios' : 'desktop';
  function bugReport(text, tech) {
    const lines = ['### ' + (L() === 'nl' ? 'Wat ging er mis?' : 'Ce qui s’est passé'), '', text.trim()];
    if (tech) {
      const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      lines.push('', '### ' + (L() === 'nl' ? 'Technische info' : 'Infos techniques'),
        `- Version : ${$('#version')?.textContent.trim() || 'dev'}`,
        `- Appareil : ${navigator.userAgent}`,
        `- Écran : ${innerWidth}×${innerHeight} (×${devicePixelRatio})${standalone ? ', appli installée' : ''}`,
        `- Langue : ${L()} · thème : ${document.documentElement.dataset.theme || 'auto'}`,
        `- Vue : ${$('.view.is-active')?.id?.replace('view-', '') || '?'}`,
        `- Erreurs récentes : ${RECENT_ERRORS.length ? '\n  - ' + RECENT_ERRORS.join('\n  - ') : 'aucune'}`);
    }
    const body = lines.join('\n').slice(0, 6000); // garder l'adresse raisonnable
    const title = 'Bug : ' + (text.trim().split('\n')[0].slice(0, 70) || 'sans titre');
    const web = `https://github.com/${REPO}/issues/new?` + new URLSearchParams({ title, body });
    const app = platform() === 'android'
      ? `intent://github.com/${REPO}/issues/new?${new URLSearchParams({ title, body })}#Intent;scheme=https;package=com.github.android;S.browser_fallback_url=${encodeURIComponent(web)};end`
      : web;
    // E-mail (sans compte GitHub) : texte brut, court — certaines messageries coupent les liens mailto trop longs
    const mailBody = (tech ? body : text.trim()).replace(/^### /gm, '').slice(0, 1500);
    const mail = `mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent('[Brol] ' + title)}&body=${encodeURIComponent(mailBody.replace(/\n/g, '\r\n'))}`;
    return { title, body, web, app, mail };
  }
  function renderBugActions() {
    const p = platform(), base = `https://github.com/${REPO}/issues/new`;
    // iPhone : même onglet, sinon iOS n'ouvre pas l'app GitHub
    $('#bug-actions').innerHTML = p !== 'desktop'
      ? `<a class="btn btn-gold" id="bug-app" href="${base}"${p === 'ios' ? '' : ' target="_blank" rel="noopener"'}>${t('bugApp')}</a><a class="linkish" id="bug-web" href="${base}" target="_blank" rel="noopener">${t('bugWebAlt')}</a>`
      : `<a class="btn btn-gold" id="bug-web" href="${base}" target="_blank" rel="noopener">${t('bugWeb')}</a>`;
    $('#bug-actions').insertAdjacentHTML('afterbegin', `<p class="bug-req">${t('bugReq')}</p>`);
    $('#bug-actions').insertAdjacentHTML('beforeend', `<p class="bug-req bug-or">${t('bugOr')}</p><a class="btn btn-line" id="bug-mail" href="mailto:${SUPPORT_MAIL}">${t('bugMail')}</a>`);
  }
  $('#bug').addEventListener('click', () => { SFX.tick(); renderBugActions(); $('#bug-msg').hidden = true; bugDlg.showModal(); $('#bug-text').focus(); });
  $('#bug-text').addEventListener('input', () => { $('#bug-msg').hidden = true; });
  $('#bug-close').addEventListener('click', () => bugDlg.close());
  $('#bug-actions').addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    const text = $('#bug-text').value;
    if (!text.trim()) { e.preventDefault(); SFX.error(); $('#bug-msg').textContent = t('bugEmpty'); $('#bug-msg').hidden = false; $('#bug-text').focus(); return; }
    $('#bug-msg').hidden = true;
    const r = bugReport(text, $('#bug-tech').checked);
    a.href = a.id === 'bug-app' ? r.app : a.id === 'bug-mail' ? r.mail : r.web; // posé au dernier moment : le clic suit ce lien
    if (a.id !== 'bug-mail') navigator.clipboard?.writeText(`${r.title}\n\n${r.body}`).then(() => toast(t('bugCopied'))).catch(() => {});
    setTimeout(() => bugDlg.close(), 300);
  });

  // ---------- Succès ----------
  // Le contexte lit toujours le state courant (il est remplacé lors d'une réinitialisation)
  const achievements = window.buildAchievements({ CARDS, get state() { return state; }, totalOf, countOf, SERIES, PACKS, EVENT_FINISHES: FINISHES.filter(f => f.pack).map(f => f.id) });
  const achQueue = [];
  let achShowing = false;
  function checkAchievements() {
    const unlocked = [];
    for (const a of achievements.list) {
      if (state.ach[a.id]) continue;
      if (a.value() >= a.target) { state.ach[a.id] = Date.now(); state.coins += a.reward; unlocked.push(a); }
    }
    if (!unlocked.length) return;
    save(); renderWallet(); renderAchDot();
    achQueue.push(...unlocked);
    if (!achShowing) showNextAch();
    if ($('#view-ach').classList.contains('is-active')) { renderAch(); markAchSeen(); }
  }
  function markAchSeen() { state.achSeen = Date.now(); save(); renderAchDot(); }
  function showNextAch() {
    const a = achQueue.shift();
    const el = $('#ach-toast');
    if (!a) { achShowing = false; el.classList.remove('is-on'); return; }
    achShowing = true;
    el.innerHTML = `<span class="medal">${achIcon(a.icon)}</span><span class="ach-toast-text"><small>${t('achUnlocked')}</small><b>${esc(a.title[L()])}</b><span>${esc(a.desc[L()])}</span></span><em>+${fmt(a.reward)}</em>`;
    el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on');
    SFX.achievement();
    setTimeout(showNextAch, 3200);
  }
  const achIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${window.ACH_ICONS[name] || window.ACH_ICONS.star}</svg>`;
  // Succès débloqués depuis la dernière visite de l'onglet (state.achSeen) : point sur l'onglet et étiquette « nouveau »
  const isUnseen = a => state.ach[a.id] > (state.achSeen || 0);
  function renderAchDot() { $('.tab[data-view="ach"]').classList.toggle('has-dot', achievements.list.some(isUnseen)); }
  function ago(ts) {
    if (!(ts > 1e12)) return '';
    const rtf = new Intl.RelativeTimeFormat(L() === 'nl' ? 'nl-BE' : 'fr-BE', { numeric: 'auto' });
    const s = Math.round((ts - Date.now()) / 1000);
    for (const [u, n] of [['day', 86400], ['hour', 3600], ['minute', 60]]) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
    return rtf.format(0, 'minute');
  }
  function renderAch() {
    const all = achievements.list;
    const unlocked = all.filter(a => state.ach[a.id]);
    const recent = [...unlocked].sort((a, b) => state.ach[b.id] - state.ach[a.id]).slice(0, 6);
    const coins = unlocked.reduce((s, a) => s + a.reward, 0);
    $('#ach-summary').textContent = t('achSummary', unlocked.length, all.length, fmt(coins));
    $('#ach-bar').style.width = (unlocked.length / all.length * 100).toFixed(1) + '%';
    const recentHTML = recent.length ? `<section class="ach-group ach-recent"><h2>${t('achRecent')}</h2><div class="ach-grid">${recent.map(a => `
      <div class="ach is-got${isUnseen(a) ? ' is-new' : ''}">
        <span class="medal">${achIcon(a.icon)}</span>
        <div class="ach-body"><b>${esc(a.title[L()])}${isUnseen(a) ? `<i class="ach-new">${t('achNew')}</i>` : ''}</b><p>${esc(a.desc[L()])}</p><small class="ach-prog">${esc(ago(state.ach[a.id]))}</small></div>
        <span class="price"><span class="coin"></span>${fmt(a.reward)}</span>
      </div>`).join('')}</div></section>` : '';
    $('#ach-list').innerHTML = recentHTML + Object.keys(achievements.GROUPS).map(g => {
      const items = all.filter(a => a.group === g);
      const done = items.filter(a => state.ach[a.id]).length;
      return `<section class="ach-group"><h2>${achievements.GROUPS[g][L()]} <small>${done}/${items.length}</small></h2><div class="ach-grid">${items.map(a => {
        const got = !!state.ach[a.id];
        const hidden = a.secret && !got;
        const v = Math.min(a.value(), a.target);
        return `<div class="ach${got ? ' is-got' : ''}${hidden ? ' is-secret' : ''}${got && isUnseen(a) ? ' is-new' : ''}">
          <span class="medal">${hidden ? '<b>?</b>' : achIcon(a.icon)}</span>
          <div class="ach-body">
            <b>${hidden ? t('secret') : esc(a.title[L()])}</b>
            <p>${hidden ? t('secretDesc') : esc(a.desc[L()])}</p>
            ${!got && !hidden && a.target > 1 ? `<div class="bar"><span style="width:${(v / a.target * 100).toFixed(1)}%"></span></div><small class="ach-prog">${fmt(v)} / ${fmt(a.target)}</small>` : ''}
          </div>
          <span class="price"><span class="coin"></span>${fmt(a.reward)}</span>
        </div>`;
      }).join('')}</div></section>`;
    }).join('');
  }

  // ---------- Détail ----------
  const dlg = $('#detail');
  function openDetail(id, finish = 'normal') {
    const c = BY_ID.get(id);
    const owned = finishesOwned(id);
    if (!owned.includes(finish) && owned.length) finish = owned.at(-1);
    const cnt = countOf(id, finish);
    $('#detail-card').innerHTML = cardHTML(c, { finish });
    const photo = photoOf(c, finish);
    const links = [];
    if (/^Q\d+$/.test(c.id)) links.push(`<a href="https://www.wikidata.org/wiki/${c.id}" target="_blank" rel="noopener">${t('wikidata')}</a>`);
    if (photo) links.push(`<a href="${fileUrl(photo)}" target="_blank" rel="noopener">${t('imgCredit')}</a>`);
    if (c.badge && c.badge !== photo) links.push(`<a href="${fileUrl(c.badge)}" target="_blank" rel="noopener">${t('coaCredit')}</a>`);
    const versions = owned.length > 1
      ? `<div class="versions">${owned.map(f => `<button class="ver${f === finish ? ' is-active' : ''}" data-fin="${f}"><span class="fin-dot d-${f}"></span>${fl(f)}<small>×${countOf(id, f)}</small></button>`).join('')}</div>` : '';
    const roles = window.I18N.roles(c);
    const text = window.I18N.text(c);
    const known = window.I18N.known(c);
    $('#detail-body').innerHTML = `
      <div class="kicker" style="color:var(--rt-${c.rarity})"><span class="gem" style="background:var(--r-${c.rarity})"></span>${rl(c.rarity)}${finish !== 'normal' ? ` · <span class="fin-word d-${finish}">${fl(finish)}</span>` : ''} · <span style="color:var(--ink-2)">${cl(c.cat)}</span></div>
      <h2>${esc(nm(c))}</h2>
      <p class="sub">${esc(window.I18N.subtitle(c))}${c.meta ? `<br>${esc(window.I18N.meta(c))}` : ''}</p>
      ${versions}
      ${text ? `<p class="text">${esc(text)}</p>` : ''}
      <dl>
        ${c.party && !c.stats.some(([k]) => k === 'Parti') ? `<dt>${t('party')}</dt><dd>${esc(c.party)}</dd>` : ''}
        ${statsOf(c).map(([k, v]) => `<dt>${esc(window.I18N.statKey(k))}</dt><dd>${esc(tv(v))}</dd>`).join('')}
        <dt>${t('copies')}</dt><dd>${cnt}${finish !== 'normal' ? ` (${fl(finish)})` : ''}</dd>
        <dt>${t('value')}</dt><dd>${t('coins', sellValue(c, finish))}${resaleMult() > 1 ? ` <small class="late">${t('lateBonus', String(LATE_MULT).replace('.', ','))}</small>` : ''}</dd>
      </dl>
      ${SERIES_OF.has(id) ? `<h4>${t('seriesH')}</h4><p class="series-list">${SERIES_OF.get(id).map(s => `<button class="chip-s" data-series="${s.id}">${esc(sl(s, 'title'))}</button>`).join('')}</p>` : ''}
      ${known.length ? `<h4>${t('knownFor')}</h4><ul class="known">${known.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${roles.length ? `<h4>${t('career')}</h4><ul>${roles.slice(0, 10).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="links">${links.join('')}</div>
      ${cnt ? `<button class="btn btn-line" id="share-card">${t('share')}</button>` : ''}
      ${cnt > 1 ? `<button class="btn" id="sell-one">${t('sellOne', sellValue(c, finish))}</button>` : ''}`;
    $$('#detail-body .chip-s').forEach(b => b.addEventListener('click', () => { dlg.close(); openSeriesInAlbum(b.dataset.series); }));
    $$('#detail-body .ver').forEach(b => b.addEventListener('click', () => { SFX.tick(); openDetail(id, b.dataset.fin); }));
    const shareBtn = $('#share-card');
    if (shareBtn) shareBtn.onclick = async () => {
      shareBtn.disabled = true; shareBtn.textContent = t('sharing');
      try { const r = await window.SHARE.share(c, finish); if (r === 'downloaded') toast(t('shareSaved')); }
      catch (_) { toast(t('shareFail')); }
      shareBtn.disabled = false; shareBtn.textContent = t('share');
    };
    const sell = $('#sell-one');
    if (sell) sell.onclick = () => {
      const v = sellValue(c, finish);
      state.owned[keyOf(id, finish)]--; state.coins += v; state.stats.sold++; state.stats.earned += v;
      save(); renderWallet(); mission('sell');
      SFX.coin(); toast(t('coinsPlus', v));
      openDetail(id, finish);
      if ($('#view-binder').classList.contains('is-active')) renderBinder();
      checkAchievements();
    };
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }
  $('#detail-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  // ---------- Thème, son, langue ----------
  const THEMES = ['auto', 'light', 'dark'];
  const ICON = {
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 5M22 9l-5 5"/></svg>',
  };
  const THEME_KEY = { auto: 'themeAuto', light: 'themeLight', dark: 'themeDark' };
  let theme = 'auto';
  try { theme = localStorage.getItem('rdl-theme') || 'auto'; } catch (_) {}
  function applyTheme() {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    $('#theme-btn').innerHTML = ICON[theme];
    $('#theme-btn').title = t(THEME_KEY[theme]);
  }
  $('#theme-btn').addEventListener('click', () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { theme === 'auto' ? localStorage.removeItem('rdl-theme') : localStorage.setItem('rdl-theme', theme); } catch (_) {}
    applyTheme(); SFX.tick(); toast(t(THEME_KEY[theme]));
  });
  function applySound() {
    $('#sound-btn').innerHTML = SFX.on ? ICON.soundOn : ICON.soundOff;
    $('#sound-btn').title = SFX.on ? t('soundOn') : t('soundOff');
  }
  $('#sound-btn').addEventListener('click', () => { SFX.toggle(); applySound(); toast(SFX.on ? t('soundOn') : t('soundOff')); });

  // Textes statiques de la page (attributs data-i18n)
  function applyStatic() {
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    $('#lang-btn').textContent = L() === 'nl' ? 'FR' : 'NL';
    $('#lang-btn').title = L() === 'nl' ? 'Français' : 'Nederlands';
    document.title = 'Brol';
    $('.brand-name').textContent = 'Brol';
    fillRaritySelect();
    applyTheme(); applySound();
    if ($('#notif')) renderNotifBtn();
  }
  $('#lang-btn').addEventListener('click', () => {
    window.I18N.set(L() === 'nl' ? 'fr' : 'nl');
    SFX.tick();
    applyStatic();
    renderWallet();
    show($('.view.is-active').id.replace('view-', ''));
  });

  // ---------- Navigation ----------
  function show(view) {
    $$('.tab').forEach(x => x.classList.toggle('is-active', x.dataset.view === view));
    $$('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + view));
    if (view === 'binder') renderBinder();
    if (view === 'shop') renderShop();
    if (view === 'series') renderSeries();
    if (view === 'ach') { renderAch(); markAchSeen(); }
    if (view === 'games') window.GAMES_UI?.renderMenu();
    if (view === 'trade') window.TRADE_UI?.render();
    window.scrollTo(0, 0);
  }
  $$('[data-view]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); SFX.tick(); show(el.dataset.view); }));

  $('#reset').addEventListener('click', () => {
    if (!confirm(t('resetConfirm'))) return;
    state = fresh();
    save(); renderWallet(); show('shop');
  });

  // Interface partagée avec les mini-jeux (games.js)
  window.RDL = {
    CARDS, BY_ID, get state() { return state; }, save, renderWallet, checkAchievements, totalOf,
    esc, imgUrl, focusOf, fmt, toast, bugReport, SFX, catLabel: cl, rarityLabel: rl,
    // pour les échanges (trade.js)
    cardHTML, countOf, keyOf, FINISHES, finishesFor, finishLabel: fl, rarityRank: id => R[id].rank, show, openDetail,
    // pour la simulation de l'économie (tools/simulate.mjs) et les tests
    PACKS, SERIES, RARITIES, BULK, bulkOf, bulkPrice, buyPacks, sellDuplicates, dupValue, claimSeries,
    EVENT_PACKS, activeEvents, fuseRarity, fuseHolo, fuseAvailable, claimDaily, dailyReady, drawPack, exclOf, packById,
    mission, missionsToday, claimMission, MISSION, resaleMult, sellValue, weeklyNow, claimWeekly, WEEKLY, statsOf,
    packOdds, exclChance, packFinish, PACK_SIZE, PITY, RARITIES_W: RARITIES,
  };

  // ---------- Version installable (PWA) ----------
  // Service worker : hors ligne et cache des images. Bouton « Installer l'appli » quand le navigateur le propose
  // (Chrome, Edge, Android) ; sur iPhone et iPad, il explique la marche à suivre dans Safari.
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('#install').hidden = false; });
  window.addEventListener('appinstalled', () => { installPrompt = null; $('#install').hidden = true; toast(t('installed')); });
  if (isIOS && !standalone()) $('#install').hidden = false;
  $('#install').addEventListener('click', async () => {
    if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice.catch(() => {}); installPrompt = null; $('#install').hidden = true; }
    else if (isIOS) alert(t('installIOS'));
  });

  // ---------- Rappels (notifications, sur demande) ----------
  // Sans serveur, pas de notification quand le jeu est complètement fermé, sauf le rappel quotidien de l'appli
  // installée sur Chrome / Android (synchronisation périodique, voir sw.js). Quand le jeu est ouvert en arrière-plan :
  // paquets gratuits au complet, carte du jour disponible. Une seule notification de chaque sorte.
  const NOTIF_KEY = 'rdl-notif';
  const notifOn = () => { try { return localStorage.getItem(NOTIF_KEY) === '1' && Notification.permission === 'granted'; } catch (_) { return false; } };
  function renderNotifBtn() {
    const b = $('#notif');
    if (!('Notification' in window) || Notification.permission === 'denied') { b.hidden = true; return; }
    b.hidden = false; b.textContent = notifOn() ? t('notifOn') : t('notifOff');
  }
  async function notify(kind, title, body) {
    if (!notifOn() || !document.hidden) return;
    const day = ymd(now()), sent = state.notified ||= {};
    if (sent[kind] === day + (kind === 'free' ? state.freeAt : '')) return; // déjà prévenu pour ce cas
    sent[kind] = day + (kind === 'free' ? state.freeAt : ''); save();
    const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'brol-' + kind };
    try { const reg = await navigator.serviceWorker?.getRegistration(); if (reg) reg.showNotification(title, opts); else new Notification(title, opts); } catch (_) { /* rien */ }
  }
  setInterval(() => {
    if (stale || !notifOn() || !document.hidden) return;
    tickFree();
    if (state.free >= FREE_MAX) notify('free', t('notifFreeTitle'), t('notifFreeBody', FREE_MAX));
    if (dailyReady()) notify('daily', t('notifDailyTitle'), t('notifDailyBody'));
  }, 30000);
  $('#notif').addEventListener('click', async () => {
    if (notifOn()) { try { localStorage.removeItem(NOTIF_KEY); } catch (_) {} renderNotifBtn(); toast(t('notifOff')); return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { renderNotifBtn(); return toast(t('notifDenied')); }
    try { localStorage.setItem(NOTIF_KEY, '1'); } catch (_) {}
    // Rappel quotidien de l'appli installée (Chrome / Android uniquement)
    try { const reg = await navigator.serviceWorker?.ready; await reg?.periodicSync?.register('brol-daily', { minInterval: 20 * 3600 * 1000 }); } catch (_) { /* non pris en charge */ }
    renderNotifBtn(); toast(t('notifOnToast'));
  });

  window.addEventListener('storage', e => { if (e.key === STORE_KEY && !document.hasFocus()) stale = true; });
  const wakeUp = () => { if (stale && !document.hidden) location.reload(); };
  window.addEventListener('focus', wakeUp);
  document.addEventListener('visibilitychange', wakeUp);

  applyStatic();
  renderWallet();
  renderShop();
  checkAchievements();
  renderAchDot();
})();
