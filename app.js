(() => {
  'use strict';
  const { t, tv } = window.I18N;
  const L = () => window.I18N.lang;

  // ---------- Réglages ----------
  const RARITIES = [
    { id: 'commune',     label: { fr: 'Commune',     nl: 'Gewoon' },        weight: 50,   sell: 10 },
    { id: 'peu-commune', label: { fr: 'Peu commune', nl: 'Ongewoon' },      weight: 26,   sell: 20 },
    { id: 'rare',        label: { fr: 'Rare',        nl: 'Zeldzaam' },      weight: 15.5, sell: 50 },
    { id: 'epique',      label: { fr: 'Épique',      nl: 'Episch' },        weight: 6,    sell: 120 },
    { id: 'legendaire',  label: { fr: 'Légendaire',  nl: 'Legendarisch' },  weight: 2.2,  sell: 300 },
    { id: 'mythique',    label: { fr: 'Mythique',    nl: 'Mythisch' },      weight: 0.3,  sell: 800 },
  ];
  const R = Object.fromEntries(RARITIES.map((r, i) => [r.id, { ...r, rank: i }]));
  const rl = id => R[id].label[L()];

  // Versions spéciales : indépendantes de la rareté
  const FINISHES = [
    { id: 'normal', label: { fr: 'Standard',    nl: 'Standaard' },   chance: 0,     mult: 1 },
    { id: 'holo',   label: { fr: 'Holo',        nl: 'Holo' },        chance: 0.08,  mult: 2 },
    { id: 'plein',  label: { fr: 'Plein cadre', nl: 'Volle kader' }, chance: 0.035, mult: 3 },
    { id: 'or',     label: { fr: 'Dorée',       nl: 'Goud' },        chance: 0.012, mult: 5 },
  ];
  const F = Object.fromEntries(FINISHES.map((f, i) => [f.id, { ...f, rank: i }]));
  const fl = id => F[id].label[L()];

  const CATS = [
    { id: 'politique',    fr: 'Politique',     nl: 'Politiek' },
    { id: 'monarchie',    fr: 'Monarchie',     nl: 'Monarchie' },
    { id: 'culture',      fr: 'Culture',       nl: 'Cultuur' },
    { id: 'groupe',       fr: 'Groupes',       nl: 'Groepen' },
    { id: 'festival',     fr: 'Festivals',     nl: 'Festivals' },
    { id: 'sport',        fr: 'Sport',         nl: 'Sport' },
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
  ];
  const CAT_RANK = Object.fromEntries(CATS.map((c, i) => [c.id, i]));
  const cl = id => CATS.find(c => c.id === id)[L()];

  const PACKS = [
    { id: 'belgique', title: { fr: 'Belgique', nl: 'België' }, kicker: { fr: 'Édition nationale', nl: 'Nationale editie' }, big: 'BE', price: 60,
      desc: { fr: 'Toutes les cartes du jeu.', nl: 'Alle kaarten van het spel.' },
      body: ['#121317', '#2b2c33'], metal: ['#fff0b5', '#e2b33c', '#8f6610'], cats: null },
    { id: 'seize', title: { fr: 'Rue de la Loi', nl: 'Wetstraat' }, kicker: { fr: 'Édition politique', nl: 'Politieke editie' }, big: '16', price: 80,
      desc: { fr: 'Politique, monarchie et événements.', nl: 'Politiek, monarchie en gebeurtenissen.' },
      body: ['#111a33', '#2c3c6c'], metal: ['#ffffff', '#c3c7d0', '#6d727d'], cats: ['politique', 'monarchie', 'evenement'] },
    { id: 'icones', title: { fr: 'Icônes', nl: 'Iconen' }, kicker: { fr: 'Édition culture', nl: 'Cultuureditie' }, big: '★', price: 80,
      desc: { fr: 'BD, musique, cinéma, groupes, festivals et art.', nl: 'Strips, muziek, film, groepen, festivals en kunst.' },
      body: ['#2a0d16', '#5e1f30'], metal: ['#ffe1d6', '#e7a58f', '#8a4a3a'], cats: ['culture', 'groupe', 'festival', 'art'] },
    { id: 'sport', title: { fr: 'Sport', nl: 'Sport' }, kicker: { fr: 'Édition sportive', nl: 'Sporteditie' }, big: 'MVP', price: 80,
      desc: { fr: 'Football, cyclisme, tennis, athlétisme et plus.', nl: 'Voetbal, wielrennen, tennis, atletiek en meer.' },
      body: ['#0a2418', '#17573b'], metal: ['#eafff3', '#86d9aa', '#2d7650'], cats: ['sport'] },
    { id: 'patrimoine', title: { fr: 'Patrimoine', nl: 'Erfgoed' }, kicker: { fr: 'Édition patrimoine', nl: 'Erfgoededitie' }, big: '1830', price: 80,
      desc: { fr: 'Monuments, châteaux et folklore.', nl: 'Monumenten, kastelen en folklore.' },
      body: ['#191c22', '#3e4756'], metal: ['#eef3ff', '#a9b8d6', '#566584'], cats: ['monument', 'chateau', 'folklore'] },
    { id: 'terroir', title: { fr: 'Terroir', nl: 'Streek' }, kicker: { fr: 'Édition gourmande', nl: 'Smaakeditie' }, big: '33', price: 80,
      desc: { fr: 'Bières, plats et douceurs.', nl: 'Bieren, gerechten en zoetigheden.' },
      body: ['#2a1606', '#6b3a12'], metal: ['#fff0c8', '#f0b545', '#94600f'], cats: ['gastronomie', 'biere'] },
    { id: 'territoires', title: { fr: 'Territoires', nl: 'Grondgebied' }, kicker: { fr: 'Édition géographique', nl: 'Geografische editie' }, big: '565', price: 80,
      desc: { fr: 'Communes, provinces, régions et enseignement.', nl: 'Gemeenten, provincies, gewesten en onderwijs.' },
      body: ['#10261a', '#2c4a5a'], metal: ['#ffd9b8', '#d08a52', '#7c4320'], cats: ['commune', 'province', 'region', 'enseignement'] },
  ];
  const pl = (p, k) => p[k][L()];

  const PACK_SIZE = 5;
  const START_COINS = 1000;
  const NEW_CARD_BONUS = 5;
  const FREE_EVERY_MS = 3 * 60 * 1000;
  const FREE_MAX = 3;
  const PITY = 40; // une légendaire ou mieux au plus tard tous les 40 paquets
  const PAGE = 120;
  const STORE_KEY = 'rue-de-la-loi:v1';

  // ---------- Données ----------
  const FLANDRE = ['Anvers', 'Limbourg', 'Flandre-Orientale', 'Flandre-Occidentale', 'Brabant flamand'];
  const REGION_FAMILY = { Q9337: 'flandre', Q231: 'wallonie', Q240: 'bruxelles' };
  const CARDS = (window.CARDS || []).filter(c => CAT_RANK[c.cat] !== undefined).sort((a, b) =>
    CAT_RANK[a.cat] - CAT_RANK[b.cat] || R[b.rarity].rank - R[a.rarity].rank || a.name.localeCompare(b.name, 'fr'));
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
    { id: 'festivals', title: { fr: 'Été des festivals', nl: 'Festivalzomer' }, desc: { fr: 'De Tomorrowland aux Francofolies.', nl: 'Van Tomorrowland tot de Francofolies.' }, reward: 400, match: c => c.cat === 'festival' },
  ].map(s => ({ ...s, members: CARDS.filter(s.match).map(c => c.id) })).filter(s => s.members.length >= 3);
  const SERIES_OF = new Map();
  for (const s of SERIES) for (const id of s.members) { if (!SERIES_OF.has(id)) SERIES_OF.set(id, []); SERIES_OF.get(id).push(s); }
  const sl = (s, k) => s[k][L()];

  // ---------- Sauvegarde ----------
  // owned : clé « id » pour la version standard, « id|holo » etc. pour les versions spéciales
  const freshStats = () => ({ packs: 0, cards: 0, free: 0, rarity: {}, finish: {}, packsBy: {}, sold: 0, earned: 0, perfect: 0, doubleLeg: 0, night: 0, pityHits: 0, goldMyth: 0, trades: 0, tradeGift: 0, tradeMyth: 0, tradeFull: 0 });
  const fresh = () => ({ coins: START_COINS, owned: {}, packs: 0, free: 1, freeAt: Date.now(), claimed: {}, pity: 0, stats: freshStats(), ach: {}, trade: { pending: {}, done: {} } });
  let state = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && typeof s.coins === 'number') {
        if (s.free === undefined) { s.free = FREE_MAX; s.freeAt = Date.now(); s.coins = Math.max(s.coins, START_COINS); }
        s.claimed ||= {}; s.ach ||= {}; s.pity ||= 0;
        s.trade ||= {}; s.trade.pending ||= {}; s.trade.done ||= {};
        s.stats = { ...freshStats(), ...(s.stats || {}) };
        if (!s.stats.packs && s.packs) s.stats.packs = s.packs;
        return s;
      }
    } catch (_) { /* stockage indisponible */ }
    return fresh();
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* rien */ } }
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
  const sellValue = (c, fin) => R[c.rarity].sell * F[fin].mult;

  // ---------- Utilitaires ----------
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const imgUrl = (f, w = 500) => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(f) + '?width=' + w;
  const fileUrl = f => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(f.replace(/ /g, '_'));
  const initials = n => n.split(/[\s-]+/).filter(w => /^[A-ZÀ-Ý]/.test(w)).slice(0, 2).map(w => w[0]).join('');
  const fmt = n => n.toLocaleString(L() === 'nl' ? 'nl-BE' : 'fr-BE');
  const isEmblem = c => ['commune', 'province', 'region', 'enseignement'].includes(c.cat) && c.img && (c.img === c.badge || /\.svg$|\.png$/i.test(c.img));
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
      <path d="${zig(18, 1)}" fill="url(#m${k})"/><path d="${zig(18, 1)}" fill="url(#r${k})"/>
      <path d="${zig(412, -1)}" fill="url(#m${k})"/><path d="${zig(412, -1)}" fill="url(#r${k})"/>
      <line x1="10" y1="62" x2="290" y2="62" stroke="${p.metal[1]}" stroke-width="1" stroke-dasharray="5 5" opacity=".6"/>
      <text x="150" y="50" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="10" letter-spacing="3" fill="${p.metal[1]}" opacity=".75">${t('openHere')}</text>
      <g transform="translate(18 76)"><rect width="8" height="22" fill="#111"/><rect x="8" width="8" height="22" fill="#f2c400"/><rect x="16" width="8" height="22" fill="#c8102e"/></g>
      <text x="282" y="92" text-anchor="end" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="11" fill="${p.metal[1]}" opacity=".8">${t('cards5')}</text>
      <g transform="translate(60 112)">${sealSVG({ ring: t('seal'), center: p.big, color: p.metal[1], size: 180, px: 180, centerSize: p.big.length > 2 ? 52 : 66 })}</g>
      <text x="150" y="334" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="13" letter-spacing="4" fill="${p.metal[1]}">${esc(pl(p, 'kicker').toUpperCase())}</text>
      <text x="150" y="374" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="${title.length > 10 ? 38 : 44}" letter-spacing="1" fill="url(#m${k})">${esc(title)}</text>
    </svg>`;
  }
  const packVisual = p => `<div class="pack-visual">${packSVG(p)}<div class="sheen"></div></div>`;
  const cardBack = () => `<div class="card-back">${sealSVG({ ring: t('backSeal'), center: 'BROL', color: '#e2b33c', size: 200, centerSize: 52 })}<div class="back-foot">${t('back')}</div></div>`;

  // ---------- Rendu d'une carte ----------
  function cardHTML(c, { count = 0, finish = 'normal', variants = null } = {}) {
    let media;
    const photo = photoOf(c, finish);
    if (c.cat === 'evenement') {
      media = `<div class="event-big">${esc(String(c.stats[0][1]).replace(/\s/g, ' '))}</div>`;
    } else if (photo) {
      const fallback = `this.outerHTML='<div class=&quot;portrait&quot;>${SILHOUETTE.replace(/"/g, '&quot;')}<span>${esc(initials(c.name))}</span></div>'`;
      media = `<img src="${imgUrl(photo)}" alt="" loading="lazy" decoding="async" onerror="${fallback}">`;
    } else {
      media = `<div class="portrait">${SILHOUETTE}<span>${esc(initials(c.name))}</span></div>`;
    }
    const fam = c.family || 'gris';
    const photoClass = isEmblem(c) ? ' is-emblem' : c.artwork ? ' is-artwork' : '';
    const finTag = finish !== 'normal' ? `<span class="fin-tag">${fl(finish)}</span>` : '';
    const liveText = c.live ? (L() === 'nl' ? 'Op de troon' : c.live) : (L() === 'nl' ? 'In functie' : 'En fonction');
    const live = c.current ? `<span class="live">${esc(liveText)}</span>` : c.unesco ? '<span class="live unesco">UNESCO</span>' : '';
    const dots = variants && variants.length > 1
      ? `<span class="var-dots" title="${t('versionsOwned')}">${variants.filter(v => v !== 'normal').map(v => `<i class="d-${v}"></i>`).join('')}</span>` : '';
    return `
      <article class="card r-${c.rarity} cat-${c.cat} fam-${fam} fin-${finish}" data-id="${esc(c.id)}" data-fin="${finish}" style="--band: var(--p-${fam})">
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
          <dl class="card-stats">${c.stats.map(([k, v]) => `<div><dt>${esc(window.I18N.statKey(k))}</dt><dd>${esc(tv(v))}</dd></div>`).join('')}</dl>
          ${dots}
        </div>
      </article>`;
  }

  document.addEventListener('pointermove', e => {
    const card = e.target.closest?.('.card.r-epique, .card.r-legendaire, .card.r-mythique, .card.fin-holo, .card.fin-plein, .card.fin-or');
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
  function pickRarity(minRank = 0) {
    const pool = RARITIES.filter((_, i) => i >= minRank);
    let roll = Math.random() * pool.reduce((a, r) => a + r.weight, 0);
    for (const r of pool) { if ((roll -= r.weight) < 0) return r.id; }
    return pool[pool.length - 1].id;
  }
  function pickFinish() {
    let roll = Math.random();
    for (const f of FINISHES.slice(1).reverse()) { if ((roll -= f.chance) < 0) return f.id; }
    return 'normal';
  }
  function drawPack(pack, forceLegend) {
    const pool = pack.cats ? CARDS.filter(c => pack.cats.includes(c.cat)) : CARDS;
    const out = [];
    const taken = new Set();
    for (let i = 0; i < PACK_SIZE; i++) {
      const last = i === PACK_SIZE - 1;
      const rank = R[pickRarity(last ? (forceLegend ? R.legendaire.rank : R.rare.rank) : 0)].rank;
      let list = [];
      // Si la rareté tirée n'existe pas dans ce paquet, on prend la plus proche (vers le bas d'abord)
      for (let d = 0; d < RARITIES.length && !list.length; d++) {
        for (const r of [rank - d, rank + d]) {
          if (r < 0 || r >= RARITIES.length || list.length) continue;
          list = pool.filter(c => c.rarity === RARITIES[r].id && !taken.has(c.id));
        }
      }
      const card = list[Math.floor(Math.random() * list.length)];
      taken.add(card.id);
      out.push({ card, finish: pickFinish() });
    }
    return out.sort((a, b) => R[a.card.rarity].rank - R[b.card.rarity].rank || F[a.finish].rank - F[b.finish].rank);
  }

  // ---------- Boutique ----------
  function renderShop() {
    tickFree();
    $('#packs').innerHTML = PACKS.map(p => {
      const locked = state.coins < p.price && !state.free;
      return `
      <div class="pack-card${locked ? ' is-locked' : ''}" data-pack="${p.id}">
        ${packVisual(p)}
        <div class="pack-info">
          <div><h2>${esc(pl(p, 'title'))}</h2><p>${esc(pl(p, 'desc'))}</p></div>
          <span class="price"><span class="coin"></span>${p.price}</span>
        </div>
      </div>`;
    }).join('');
    renderFree();
    renderOdds();
  }
  function renderFree() {
    tickFree();
    const left = state.freeAt + FREE_EVERY_MS - Date.now();
    const pips = Array.from({ length: FREE_MAX }, (_, i) => `<span class="pip${i < state.free ? ' on' : ''}"></span>`).join('');
    const timer = state.free >= FREE_MAX ? t('freeFull') : t('freeIn', `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`);
    const pityLeft = PITY - state.pity;
    $('#free-box').innerHTML = `
      <div class="free-line"><span class="pips">${pips}</span><span class="label">${t('free', state.free)} · ${timer}</span></div>
      <div class="pity-line"><span class="pity-bar"><span style="width:${(state.pity / PITY * 100).toFixed(1)}%"></span></span><span class="label">${t('pity', pityLeft)}</span></div>`;
  }
  setInterval(() => { if ($('#view-shop').classList.contains('is-active')) renderFree(); }, 1000);

  function renderOdds() {
    const total = RARITIES.reduce((a, r) => a + r.weight, 0);
    const pct = x => (x * 100).toFixed(1).replace('.', ',') + ' %';
    $('#odds').innerHTML = RARITIES.map(r =>
      `<li><span class="gem" style="background:var(--r-${r.id})"></span>${rl(r.id)} <b>${pct(r.weight / total)}</b></li>`).join('') +
      `<li class="sep"></li>` +
      FINISHES.slice(1).map(f => `<li><span class="fin-dot d-${f.id}"></span>${fl(f.id)} <b>${pct(f.chance)}</b></li>`).join('') +
      `<li class="note">${t('oddsNote', NEW_CARD_BONUS)}</li>`;
  }

  $('#packs').addEventListener('click', e => {
    const el = e.target.closest('.pack-visual');
    if (!el) return;
    openPack(PACKS.find(x => x.id === el.closest('[data-pack]').dataset.pack));
  });

  // ---------- Ouverture ----------
  const stage = $('#stage');
  let current = null;

  function openPack(pack) {
    tickFree();
    let usedFree = false;
    if (state.free > 0) { state.free--; usedFree = true; if (state.free === FREE_MAX - 1) state.freeAt = Date.now(); }
    else if (state.coins >= pack.price) state.coins -= pack.price;
    else { SFX.error(); return toast(t('noCoins')); }

    const forceLegend = state.pity >= PITY - 1;
    const drawn = drawPack(pack, forceLegend);
    for (const d of drawn) { const p = photoOf(d.card, d.finish); if (p) new Image().src = imgUrl(p); }
    let newCount = 0;
    const revealed = drawn.map(d => {
      const key = keyOf(d.card.id, d.finish);
      const before = state.owned[key] || 0;
      state.owned[key] = before + 1;
      if (!before) newCount++;
      return { ...d, isNew: before === 0 };
    });
    const bonus = newCount * NEW_CARD_BONUS;
    state.coins += bonus;
    state.packs++;

    // Statistiques pour les succès
    const st = state.stats;
    st.packs++; st.cards += PACK_SIZE; if (usedFree) st.free++;
    st.packsBy[pack.id] = (st.packsBy[pack.id] || 0) + 1;
    for (const d of revealed) {
      st.rarity[d.card.rarity] = (st.rarity[d.card.rarity] || 0) + 1;
      if (d.finish !== 'normal') st.finish[d.finish] = (st.finish[d.finish] || 0) + 1;
      if (d.finish === 'or' && d.card.rarity === 'mythique') st.goldMyth = 1;
    }
    if (newCount === PACK_SIZE) st.perfect = 1;
    const legends = revealed.filter(d => R[d.card.rarity].rank >= R.legendaire.rank).length;
    if (legends >= 2) st.doubleLeg = 1;
    if (new Date().getHours() < 5) st.night = 1;
    // Garantie anti-malchance : le compteur repart à zéro dès qu'une légendaire ou mieux sort
    const pityTriggered = forceLegend && legends > 0;
    if (pityTriggered) st.pityHits++;
    state.pity = legends ? 0 : state.pity + 1;

    save();
    renderWallet();
    current = { pack, revealed, newCount, bonus, usedFree, pityTriggered };

    const score = d => R[d.card.rarity].rank + F[d.finish].rank * 1.5;
    const best = revealed.reduce((a, b) => score(b) > score(a) ? b : a);
    const hot = best.finish === 'or' ? '#f6d478' : R[best.card.rarity].rank >= R.epique.rank ? `var(--r-${best.card.rarity})` : best.finish !== 'normal' ? '#9fe8ff' : '#ffffff';

    stage.hidden = false;
    stage.classList.remove('is-hot');
    stage.style.setProperty('--hot', hot);
    document.body.style.overflow = 'hidden';
    $('#reveal').innerHTML = '';
    $('#stage-summary').textContent = usedFree ? t('freePack') : t('paid', pack.price);
    ['#flip-all', '#again', '#to-album', '#stage-close'].forEach(s => { $(s).hidden = true; });
    $('#stage-hint').hidden = false;
    $('#stage-hint').textContent = t('hint');
    SFX.open();

    const sp = $('#stage-pack');
    sp.hidden = false;
    sp.className = 'stage-pack';
    sp.style.setProperty('--cut', (62 / 430 * 100) + '%');
    sp.innerHTML = `<div class="tilt"><div class="half top">${packSVG(pack)}</div><div class="half bottom">${packSVG(pack)}</div><div class="seam"></div></div>`;
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
    $('#reveal').innerHTML = current.revealed.map(({ card, finish, isNew }, i) => {
      const rank = R[card.rarity].rank;
      const special = finish !== 'normal';
      const tag = (isNew ? t('new') : t('dup')) + (special ? ` · ${fl(finish)}` : '');
      const hit = finish === 'or' ? '#f6d478' : special && rank < R.epique.rank ? '#9fe8ff' : `var(--r-${card.rarity})`;
      return `
      <div class="slot${rank >= R.epique.rank || special ? ' tease' : ''}${rank >= R.legendaire.rank || F[finish].rank >= F.plein.rank ? ' big-hit' : ''}"
           style="--hit: ${hit}; --dx: calc(${2 - i} * (var(--w) + 22px)); --dr: ${(i - 2) * 6}deg; animation-delay: ${i * 90}ms" data-i="${i}">
        <span class="tag${isNew ? '' : ' dup'}${special ? ' special' : ''}">${tag}</span>
        <div class="inner">
          <div class="face back">${cardBack()}</div>
          <div class="face front">${cardHTML(card, { finish })}</div>
        </div>
      </div>`;
    }).join('');
    current.revealed.forEach((_, i) => SFX.deal(i));
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
    slot.classList.add('is-flipped');
    const r = current.revealed[slot.dataset.i];
    SFX.flip();
    setTimeout(() => { SFX.reveal(R[r.card.rarity].rank); if (r.finish !== 'normal') SFX.shimmer(); }, 250);
    if (slot.classList.contains('big-hit')) {
      stage.style.setProperty('--hot', getComputedStyle(slot).getPropertyValue('--hit'));
      stage.classList.add('is-hot');
      setTimeout(flash, 300);
      if (navigator.vibrate) navigator.vibrate(80);
    }
    const reveal = $('#reveal');
    const next = $('#reveal .slot:not(.is-flipped)');
    if (next && !auto && reveal.scrollWidth > reveal.clientWidth + 4) {
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
    const { pack, newCount, bonus, revealed } = current;
    const dups = PACK_SIZE - newCount;
    const specials = revealed.filter(r => r.finish !== 'normal').length;
    $('#stage-summary').innerHTML = t('summary', newCount, dups, specials, bonus);
    if (bonus) SFX.coin();
    $('#flip-all').hidden = true;
    tickFree();
    const again = $('#again');
    again.hidden = false;
    again.textContent = t('again', state.free ? null : pack.price);
    again.disabled = !state.free && state.coins < pack.price;
    $('#to-album').hidden = false;
    $('#stage-close').hidden = false;
    checkAchievements();
  }
  function closeStage() {
    stage.hidden = true;
    document.body.style.overflow = '';
    current = null;
    renderShop();
  }
  $('#again').addEventListener('click', () => openPack(current.pack));
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
    const chips = [{ id: 'all', label: t('all') }, ...CATS.map(c => ({ id: c.id, label: c[L()] })), { id: 'live', label: t('liveGov') }];
    $('#cat-chips').innerHTML = chips.map(c =>
      `<button class="chip${filters.cat === c.id ? ' is-active' : ''}${c.id === 'live' ? ' live' : ''}" data-cat="${c.id}">${c.label}<small>${counts[c.id][0]}/${counts[c.id][1]}</small></button>`).join('');

    let dupes = 0, specials = 0;
    for (const [key, n] of Object.entries(state.owned)) { dupes += Math.max(0, n - 1); if (key.includes('|') && n) specials++; }
    $('#binder-summary').textContent = t('binderSummary', counts.all[0], fmt(counts.all[1]), specials, state.packs, dupes);
    $('#sell-all').disabled = dupes === 0;

    const q = filters.q.trim().toLowerCase();
    const list = CARDS.filter(c =>
      (!filters.series || filters.series.members.includes(c.id)) &&
      (filters.cat === 'all' || (filters.cat === 'live' ? c.current && c.cat === 'politique' : c.cat === filters.cat)) &&
      (filters.rarity === 'all' || c.rarity === filters.rarity) &&
      (!filters.owned || totalOf(c.id)) &&
      (!filters.special || finishesOwned(c.id).some(f => f !== 'normal')) &&
      (!q || [c.name, c.nl?.name, c.subtitle, c.party, c.meta].some(s => (s || '').toLowerCase().includes(q))));

    $('#series-banner').hidden = !filters.series;
    if (filters.series) $('#series-banner').innerHTML = `<span>${t('seriesBanner')} : <b>${esc(sl(filters.series, 'title'))}</b></span><button class="linkish" id="clear-series">${t('clearFilter')}</button>`;
    const grid = $('#grid');
    if (!list.length) { grid.innerHTML = `<p class="empty">${filters.owned || filters.special ? t('emptyOwned') : t('emptyAll')}</p>`; return; }
    grid.innerHTML = list.slice(0, shown).map(c => {
      const n = totalOf(c.id);
      if (n) return `<div class="cell">${cardHTML(c, { count: n, finish: bestFinish(c.id), variants: finishesOwned(c.id) })}</div>`;
      return `<div class="cell"><div class="empty-slot"><span class="gem" style="background:var(--r-${c.rarity})"></span><span class="no">${String(c.no).padStart(4, '0')}</span><span class="name">${esc(nm(c))}</span></div></div>`;
    }).join('') + (list.length > shown ? `<button class="btn btn-line grid-more" id="more">${t('more', fmt(list.length - shown))}</button>` : '');
  }
  function renderWallet() {
    $('#coins').textContent = fmt(state.coins);
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
  $('#grid').addEventListener('click', e => {
    if (e.target.id === 'more') { shown += PAGE; renderBinder(); return; }
    const card = e.target.closest('.card');
    if (card) openDetail(card.dataset.id, card.dataset.fin);
  });
  $('#sell-all').addEventListener('click', () => {
    let gain = 0, n = 0;
    for (const [key, cnt] of Object.entries(state.owned)) {
      const [id, fin = 'normal'] = key.split('|');
      if (cnt > 1 && BY_ID.has(id)) { gain += (cnt - 1) * sellValue(BY_ID.get(id), fin); n += cnt - 1; }
    }
    if (!n || !confirm(t('sellConfirm', n, fmt(gain)))) return;
    for (const [key, cnt] of Object.entries(state.owned)) if (cnt > 1) state.owned[key] = 1;
    state.coins += gain; state.stats.sold += n; state.stats.earned += gain;
    save(); renderWallet(); renderBinder();
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
      const thumbs = s.members.slice(0, 12).map(id => {
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
      if (state.claimed[s.id] || !s.members.every(id => totalOf(id))) return;
      state.claimed[s.id] = true; state.coins += s.reward; save(); renderWallet(); renderSeries();
      SFX.achievement(); toast(t('seriesDone', fmt(s.reward)));
      checkAchievements();
      return;
    }
    openSeriesInAlbum(s.id);
  });
  $('#series-banner').addEventListener('click', e => {
    if (e.target.id === 'clear-series') { filters.series = null; shown = PAGE; renderBinder(); }
  });

  // ---------- Succès ----------
  // Le contexte lit toujours le state courant (il est remplacé lors d'une réinitialisation)
  const achievements = window.buildAchievements({ CARDS, get state() { return state; }, totalOf, countOf, SERIES, PACKS });
  const achQueue = [];
  let achShowing = false;
  function checkAchievements() {
    const unlocked = [];
    for (const a of achievements.list) {
      if (state.ach[a.id]) continue;
      if (a.value() >= a.target) { state.ach[a.id] = Date.now(); state.coins += a.reward; unlocked.push(a); }
    }
    if (!unlocked.length) return;
    save(); renderWallet();
    achQueue.push(...unlocked);
    if (!achShowing) showNextAch();
    if ($('#view-ach').classList.contains('is-active')) renderAch();
  }
  function showNextAch() {
    const a = achQueue.shift();
    const el = $('#ach-toast');
    if (!a) { achShowing = false; el.classList.remove('is-on'); return; }
    achShowing = true;
    el.innerHTML = `<span class="medal">${achIcon(a.icon)}</span><span class="ach-toast-text"><small>${t('achUnlocked')}</small><b>${esc(a.title[L()])}</b></span><em>+${fmt(a.reward)}</em>`;
    el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on');
    SFX.achievement();
    setTimeout(showNextAch, 3200);
  }
  const achIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${window.ACH_ICONS[name] || window.ACH_ICONS.star}</svg>`;
  function renderAch() {
    const all = achievements.list;
    const unlocked = all.filter(a => state.ach[a.id]);
    const coins = unlocked.reduce((s, a) => s + a.reward, 0);
    $('#ach-summary').textContent = t('achSummary', unlocked.length, all.length, fmt(coins));
    $('#ach-bar').style.width = (unlocked.length / all.length * 100).toFixed(1) + '%';
    $('#ach-list').innerHTML = Object.keys(achievements.GROUPS).map(g => {
      const items = all.filter(a => a.group === g);
      const done = items.filter(a => state.ach[a.id]).length;
      return `<section class="ach-group"><h2>${achievements.GROUPS[g][L()]} <small>${done}/${items.length}</small></h2><div class="ach-grid">${items.map(a => {
        const got = !!state.ach[a.id];
        const hidden = a.secret && !got;
        const v = Math.min(a.value(), a.target);
        return `<div class="ach${got ? ' is-got' : ''}${hidden ? ' is-secret' : ''}">
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
    $('#detail-body').innerHTML = `
      <div class="kicker" style="color:var(--r-${c.rarity})"><span class="gem" style="background:var(--r-${c.rarity})"></span>${rl(c.rarity)}${finish !== 'normal' ? ` · <span class="fin-word d-${finish}">${fl(finish)}</span>` : ''} · <span style="color:var(--ink-2)">${cl(c.cat)}</span></div>
      <h2>${esc(nm(c))}</h2>
      <p class="sub">${esc(window.I18N.subtitle(c))}${c.meta ? `<br>${esc(window.I18N.meta(c))}` : ''}</p>
      ${versions}
      ${text ? `<p class="text">${esc(text)}</p>` : ''}
      <dl>
        ${c.party && !c.stats.some(([k]) => k === 'Parti') ? `<dt>${t('party')}</dt><dd>${esc(c.party)}</dd>` : ''}
        ${c.stats.map(([k, v]) => `<dt>${esc(window.I18N.statKey(k))}</dt><dd>${esc(tv(v))}</dd>`).join('')}
        <dt>${t('copies')}</dt><dd>${cnt}${finish !== 'normal' ? ` (${fl(finish)})` : ''}</dd>
        <dt>${t('value')}</dt><dd>${t('coins', sellValue(c, finish))}</dd>
      </dl>
      ${SERIES_OF.has(id) ? `<h4>${t('seriesH')}</h4><p class="series-list">${SERIES_OF.get(id).map(s => `<button class="chip-s" data-series="${s.id}">${esc(sl(s, 'title'))}</button>`).join('')}</p>` : ''}
      ${roles.length ? `<h4>${t('career')}</h4><ul>${roles.slice(0, 10).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="links">${links.join('')}</div>
      ${cnt > 1 ? `<button class="btn" id="sell-one">${t('sellOne', sellValue(c, finish))}</button>` : ''}`;
    $$('#detail-body .chip-s').forEach(b => b.addEventListener('click', () => { dlg.close(); openSeriesInAlbum(b.dataset.series); }));
    $$('#detail-body .ver').forEach(b => b.addEventListener('click', () => { SFX.tick(); openDetail(id, b.dataset.fin); }));
    const sell = $('#sell-one');
    if (sell) sell.onclick = () => {
      const v = sellValue(c, finish);
      state.owned[keyOf(id, finish)]--; state.coins += v; state.stats.sold++; state.stats.earned += v;
      save(); renderWallet();
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
    if (view === 'ach') renderAch();
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
    esc, imgUrl, fmt, toast, SFX, catLabel: cl, rarityLabel: rl,
    // pour les échanges (trade.js)
    cardHTML, countOf, keyOf, FINISHES, finishLabel: fl, rarityRank: id => R[id].rank, show, openDetail,
  };

  applyStatic();
  renderWallet();
  renderShop();
  checkAchievements();
})();
