// Définition des succès. Chaque succès : valeur actuelle / objectif, récompense en pièces, textes FR et NL.
(() => {
  'use strict';

  const GROUPS = {
    open:    { fr: 'Ouverture',  nl: 'Openen' },
    collect: { fr: 'Collection', nl: 'Verzameling' },
    rarity:  { fr: 'Raretés',    nl: 'Zeldzaamheid' },
    finish:  { fr: 'Versions spéciales', nl: 'Speciale versies' },
    series:  { fr: 'Séries',     nl: 'Reeksen' },
    eco:     { fr: 'Économie',   nl: 'Economie' },
    games:   { fr: 'Jeux',       nl: 'Spellen' },
    trade:   { fr: 'Échanges',   nl: 'Ruilen' },
    secret:  { fr: 'Secrets',    nl: 'Geheimen' },
  };

  const REWARD_SCALE = 1 / 3;

  window.buildAchievements = ctx => {
    const { CARDS, state, totalOf, countOf, SERIES, PACKS } = ctx;
    const st = () => state.stats;
    const owned = () => CARDS.filter(c => totalOf(c.id));
    const ownedIn = pred => CARDS.filter(c => pred(c) && totalOf(c.id)).length;
    const list = [];
    const add = a => list.push(a);
    const tiers = (id, group, icon, values, names, value, desc, rewards) =>
      values.forEach((n, i) => add({ id: `${id}-${n}`, group, icon, target: n, value, reward: rewards[i],
        title: names[i], desc: { fr: desc.fr(n), nl: desc.nl(n) } }));

    // ----- Ouverture -----
    tiers('packs', 'open', 'pack', [1, 10, 50, 100, 250, 500, 1000],
      [{ fr: 'Premier paquet', nl: 'Eerste pakje' }, { fr: 'Habitué', nl: 'Vaste klant' }, { fr: 'Collectionneur', nl: 'Verzamelaar' },
        { fr: 'Accro', nl: 'Verslaafd' }, { fr: 'Grossiste', nl: 'Groothandelaar' }, { fr: 'Mécène', nl: 'Mecenas' },
        { fr: 'Légende du Brol', nl: 'Brollegende' }],
      () => st().packs, { fr: n => `Ouvrir ${n} paquet${n > 1 ? 's' : ''}.`, nl: n => `${n} pakje${n > 1 ? 's' : ''} openen.` },
      [50, 100, 250, 500, 1000, 2000, 5000]);
    add({ id: 'all-packs', group: 'open', icon: 'pack', target: PACKS.length, reward: 300,
      value: () => PACKS.filter(p => st().packsBy[p.id]).length,
      title: { fr: 'Tour des rayons', nl: 'Alle rekken rond' }, desc: { fr: 'Ouvrir au moins un paquet de chaque sorte.', nl: 'Minstens één pakje van elke soort openen.' } });
    tiers('free', 'open', 'gift', [10, 50, 200],
      [{ fr: 'Radin', nl: 'Gierig' }, { fr: 'Chasseur de gratuit', nl: 'Gratisjager' }, { fr: 'Roi du gratuit', nl: 'Koning van gratis' }],
      () => st().free, { fr: n => `Ouvrir ${n} paquets gratuits.`, nl: n => `${n} gratis pakjes openen.` }, [100, 300, 1000]);
    add({ id: 'perfect', group: 'open', icon: 'star', target: 1, reward: 200, value: () => st().perfect,
      title: { fr: 'Paquet parfait', nl: 'Perfect pakje' }, desc: { fr: 'Obtenir 5 nouvelles cartes dans un même paquet.', nl: '5 nieuwe kaarten in één pakje krijgen.' } });
    add({ id: 'double', group: 'open', icon: 'star', target: 1, reward: 500, value: () => st().doubleLeg,
      title: { fr: 'Coup double', nl: 'Dubbel prijs' }, desc: { fr: 'Deux cartes légendaires ou mieux dans le même paquet.', nl: 'Twee legendarische of betere kaarten in hetzelfde pakje.' } });

    // ----- Collection -----
    tiers('unique', 'collect', 'album', [10, 50, 100, 250, 500, 1000],
      [{ fr: 'Premiers pas', nl: 'Eerste stappen' }, { fr: 'Album entamé', nl: 'Album begonnen' }, { fr: 'Centurion', nl: 'Centurion' },
        { fr: 'Bibliothécaire', nl: 'Bibliothecaris' }, { fr: 'Encyclopédiste', nl: 'Encyclopedist' }, { fr: 'Archiviste du Royaume', nl: 'Rijksarchivaris' }],
      () => owned().length, { fr: n => `Posséder ${n} cartes différentes.`, nl: n => `${n} verschillende kaarten bezitten.` },
      [50, 150, 300, 600, 1500, 3000]);
    add({ id: 'unique-all', group: 'collect', icon: 'crown', target: CARDS.length, reward: 20000, value: () => owned().length,
      title: { fr: 'Belgique complète', nl: 'België compleet' }, desc: { fr: 'Posséder toutes les cartes du jeu.', nl: 'Alle kaarten van het spel bezitten.' } });
    const cats = [...new Set(CARDS.map(c => c.cat))];
    add({ id: 'every-cat', group: 'collect', icon: 'grid', target: cats.length, reward: 400,
      value: () => cats.filter(cat => ownedIn(c => c.cat === cat)).length,
      title: { fr: 'Touche-à-tout', nl: 'Duizendpoot' }, desc: { fr: 'Au moins une carte dans chaque catégorie.', nl: 'Minstens één kaart in elke categorie.' } });
    const provOf = c => c.cat === 'commune' ? ((c.subtitle.match(/^Province d(?:e |’)(.+)$/) || [])[1] || 'Bruxelles') : null;
    const provs = [...new Set(CARDS.map(provOf).filter(Boolean))];
    add({ id: 'tour', group: 'collect', icon: 'map', target: provs.length, reward: 500,
      value: () => provs.filter(p => ownedIn(c => provOf(c) === p)).length,
      title: { fr: 'Tour de Belgique', nl: 'Ronde van België' }, desc: { fr: 'Une commune dans chaque province, plus une à Bruxelles.', nl: 'Een gemeente in elke provincie, plus één in Brussel.' } });
    tiers('flandre', 'collect', 'map', [50, 150], [{ fr: 'Vlaanderen', nl: 'Vlaanderen' }, { fr: 'Lion des Flandres', nl: 'Vlaamse Leeuw' }],
      () => ownedIn(c => c.cat === 'commune' && c.family === 'flandre'), { fr: n => `Posséder ${n} communes flamandes.`, nl: n => `${n} Vlaamse gemeenten bezitten.` }, [300, 1000]);
    tiers('wallonie', 'collect', 'map', [50, 150], [{ fr: 'Wallonie', nl: 'Wallonië' }, { fr: 'Coq wallon', nl: 'Waalse haan' }],
      () => ownedIn(c => c.cat === 'commune' && c.family === 'wallonie'), { fr: n => `Posséder ${n} communes wallonnes.`, nl: n => `${n} Waalse gemeenten bezitten.` }, [300, 1000]);
    add({ id: 'all-communes', group: 'collect', icon: 'crown', target: CARDS.filter(c => c.cat === 'commune').length, reward: 10000,
      value: () => ownedIn(c => c.cat === 'commune'),
      title: { fr: 'Bourgmestre de Belgique', nl: 'Burgemeester van België' }, desc: { fr: 'Posséder toutes les communes.', nl: 'Alle gemeenten bezitten.' } });
    add({ id: 'historian', group: 'collect', icon: 'book', target: CARDS.filter(c => c.cat === 'evenement').length, reward: 2000,
      value: () => ownedIn(c => c.cat === 'evenement'),
      title: { fr: 'Historien', nl: 'Historicus' }, desc: { fr: 'Posséder toutes les cartes événement.', nl: 'Alle gebeurteniskaarten bezitten.' } });
    add({ id: 'gourmet', group: 'collect', icon: 'cup', target: CARDS.filter(c => c.cat === 'gastronomie' || c.cat === 'biere').length, reward: 1500,
      value: () => ownedIn(c => c.cat === 'gastronomie' || c.cat === 'biere'),
      title: { fr: 'Fin gourmet', nl: 'Fijnproever' }, desc: { fr: 'Posséder tous les plats et toutes les bières.', nl: 'Alle gerechten en bieren bezitten.' } });

    // ----- Raretés -----
    const byR = r => () => st().rarity[r] || 0;
    tiers('epic', 'rarity', 'gem', [10, 50, 200], [{ fr: 'Épique', nl: 'Episch' }, { fr: 'Épopée', nl: 'Epos' }, { fr: 'Saga', nl: 'Saga' }],
      byR('epique'), { fr: n => `Obtenir ${n} cartes épiques.`, nl: n => `${n} epische kaarten krijgen.` }, [100, 400, 1500]);
    tiers('leg', 'rarity', 'gem', [1, 10, 50], [{ fr: 'Légendaire', nl: 'Legendarisch' }, { fr: 'Panthéon', nl: 'Pantheon' }, { fr: 'Olympe', nl: 'Olympus' }],
      byR('legendaire'), { fr: n => `Obtenir ${n} carte${n > 1 ? 's' : ''} légendaire${n > 1 ? 's' : ''}.`, nl: n => `${n} legendarische kaart${n > 1 ? 'en' : ''} krijgen.` }, [200, 800, 3000]);
    tiers('myth', 'rarity', 'gem', [1, 5, 15], [{ fr: 'Mythique', nl: 'Mythisch' }, { fr: 'Mythologie', nl: 'Mythologie' }, { fr: 'Immortel', nl: 'Onsterfelijk' }],
      byR('mythique'), { fr: n => `Obtenir ${n} carte${n > 1 ? 's' : ''} mythique${n > 1 ? 's' : ''}.`, nl: n => `${n} mythische kaart${n > 1 ? 'en' : ''} krijgen.` }, [500, 2000, 6000]);

    // ----- Versions spéciales -----
    const byF = f => () => st().finish[f] || 0;
    tiers('holo', 'finish', 'holo', [1, 10, 50], [{ fr: 'Ça brille', nl: 'Het glinstert' }, { fr: 'Arc-en-ciel', nl: 'Regenboog' }, { fr: 'Prisme', nl: 'Prisma' }],
      byF('holo'), { fr: n => `Obtenir ${n} carte${n > 1 ? 's' : ''} Holo.`, nl: n => `${n} Holo-kaart${n > 1 ? 'en' : ''} krijgen.` }, [100, 500, 2000]);
    tiers('plein', 'finish', 'frame', [1, 10, 30], [{ fr: 'Grand format', nl: 'Groot formaat' }, { fr: 'Galerie', nl: 'Galerij' }, { fr: 'Exposition', nl: 'Tentoonstelling' }],
      byF('plein'), { fr: n => `Obtenir ${n} carte${n > 1 ? 's' : ''} Plein cadre.`, nl: n => `${n} Volle-kader-kaart${n > 1 ? 'en' : ''} krijgen.` }, [150, 800, 2500]);
    tiers('or', 'finish', 'crown', [1, 5, 15], [{ fr: 'Or massif', nl: 'Massief goud' }, { fr: 'Trésor', nl: 'Schat' }, { fr: 'Fort Knox', nl: 'Fort Knox' }],
      byF('or'), { fr: n => `Obtenir ${n} carte${n > 1 ? 's' : ''} Dorée${n > 1 ? 's' : ''}.`, nl: n => `${n} gouden kaart${n > 1 ? 'en' : ''} krijgen.` }, [300, 1500, 5000]);
    add({ id: 'all-versions', group: 'finish', icon: 'holo', target: 1, reward: 3000,
      value: () => CARDS.some(c => ['normal', 'holo', 'plein', 'or'].every(f => countOf(c.id, f))) ? 1 : 0,
      title: { fr: 'Collection complète', nl: 'Volledige set' }, desc: { fr: 'Posséder une même carte dans ses quatre versions.', nl: 'Eenzelfde kaart in alle vier versies bezitten.' } });

    // ----- Séries -----
    tiers('series', 'series', 'medal', [1, 5], [{ fr: 'Première série', nl: 'Eerste reeks' }, { fr: 'Sériephile', nl: 'Reeksliefhebber' }],
      () => Object.keys(state.claimed).length, { fr: n => `Compléter ${n} série${n > 1 ? 's' : ''}.`, nl: n => `${n} reeks${n > 1 ? 'en' : ''} voltooien.` }, [200, 1000]);
    add({ id: 'series-all', group: 'series', icon: 'crown', target: SERIES.length, reward: 5000, value: () => Object.keys(state.claimed).length,
      title: { fr: 'Maître des séries', nl: 'Meester van de reeksen' }, desc: { fr: 'Compléter toutes les séries.', nl: 'Alle reeksen voltooien.' } });

    // ----- Économie -----
    tiers('sold', 'eco', 'coin', [10, 100, 500], [{ fr: 'Brocanteur', nl: 'Rommelmarkt' }, { fr: 'Marchand', nl: 'Handelaar' }, { fr: 'Négociant', nl: 'Groothandel' }],
      () => st().sold, { fr: n => `Vendre ${n} doublons.`, nl: n => `${n} dubbels verkopen.` }, [50, 300, 1000]);
    tiers('earned', 'eco', 'coin', [1000, 10000], [{ fr: 'Bas de laine', nl: 'Spaarpot' }, { fr: 'Banquier', nl: 'Bankier' }],
      () => st().earned, { fr: n => `Gagner ${n.toLocaleString('fr-BE')} pièces en revendant.`, nl: n => `${n.toLocaleString('nl-BE')} munten verdienen met verkopen.` }, [200, 1500]);
    add({ id: 'rich', group: 'eco', icon: 'coin', target: 5000, reward: 500, value: () => state.coins,
      title: { fr: 'Rentier', nl: 'Rentenier' }, desc: { fr: 'Avoir 5 000 pièces en poche.', nl: '5.000 munten op zak hebben.' } });

    // ----- Jeux -----
    const gm = () => state.games || {};
    const gv = (game, key) => () => (gm()[game] || {})[key] || 0;
    add({ id: 'g-all', group: 'games', icon: 'grid', target: 5, reward: 300, value: () => Object.keys(gm().played || {}).length,
      title: { fr: 'Ludothèque', nl: 'Spelotheek' }, desc: { fr: 'Jouer aux cinq jeux.', nl: 'Alle vijf de spellen spelen.' } });
    add({ id: 'g-formateur', group: 'games', icon: 'crown', target: 1, reward: 300, value: gv('formation', 'won'),
      title: { fr: 'Formateur', nl: 'Formateur' }, desc: { fr: 'Former un gouvernement.', nl: 'Een regering vormen.' } });
    add({ id: 'g-541', group: 'games', icon: 'clock', target: 1, reward: 500, value: () => { const b = gv('formation', 'best')(); return b && b < 541 ? 1 : 0; },
      title: { fr: 'Mieux qu’en 2011', nl: 'Beter dan in 2011' }, desc: { fr: 'Former un gouvernement en moins de 541 jours.', nl: 'Een regering vormen in minder dan 541 dagen.' } });
    add({ id: 'g-eclair', group: 'games', icon: 'star', target: 1, reward: 1500, value: () => { const b = gv('formation', 'best')(); return b && b < 150 ? 1 : 0; },
      title: { fr: 'Accord éclair', nl: 'Bliksemakkoord' }, desc: { fr: 'Former un gouvernement en moins de 150 jours.', nl: 'Een regering vormen in minder dan 150 dagen.' } });
    add({ id: 'g-both', group: 'games', icon: 'map', target: 1, reward: 600, value: gv('formation', 'both'),
      title: { fr: 'Des deux côtés', nl: 'Aan beide kanten' }, desc: { fr: 'Gouvernement majoritaire dans les deux groupes linguistiques.', nl: 'Regering met een meerderheid in beide taalgroepen.' } });
    add({ id: 'g-formateur10', group: 'games', icon: 'crown', target: 10, reward: 1500, value: gv('formation', 'won'),
      title: { fr: 'Faiseur de rois', nl: 'Koningmaker' }, desc: { fr: 'Former 10 gouvernements.', nl: '10 regeringen vormen.' } });
    add({ id: 'g-belgle', group: 'games', icon: 'star', target: 1, reward: 150, value: gv('belgle', 'won'),
      title: { fr: 'Belgle', nl: 'Belgle' }, desc: { fr: 'Trouver la carte du jour.', nl: 'De kaart van de dag vinden.' } });
    add({ id: 'g-belgle1', group: 'games', icon: 'star', target: 1, reward: 800, value: gv('belgle', 'first'),
      title: { fr: 'Du premier coup', nl: 'In één keer' }, desc: { fr: 'Trouver la carte du jour au premier essai.', nl: 'De kaart van de dag bij de eerste poging vinden.' } });
    add({ id: 'g-belgle7', group: 'games', icon: 'clock', target: 7, reward: 1000, value: gv('belgle', 'maxStreak'),
      title: { fr: 'Une semaine de Belgle', nl: 'Een week Belgle' }, desc: { fr: 'Trouver la carte du jour 7 jours de suite.', nl: '7 dagen op rij de kaart van de dag vinden.' } });
    tiers('g-chrono', 'games', 'clock', [10, 25], [{ fr: 'Chronologue', nl: 'Chronoloog' }, { fr: 'Maître du temps', nl: 'Meester van de tijd' }],
      gv('chrono', 'best'), { fr: n => `Placer ${n} cartes d’affilée dans Chronologie.`, nl: n => `${n} kaarten op rij juist plaatsen in Tijdlijn.` }, [300, 1200]);
    tiers('g-tour', 'games', 'map', [7000, 9000], [{ fr: 'Géographe', nl: 'Geograaf' }, { fr: 'GPS humain', nl: 'Menselijke gps' }],
      gv('tour', 'best'), { fr: n => `Marquer ${n.toLocaleString('fr-BE')} points au Tour de Belgique.`, nl: n => `${n.toLocaleString('nl-BE')} punten scoren in de Ronde van België.` }, [400, 1500]);
    add({ id: 'g-bull', group: 'games', icon: 'map', target: 1, reward: 300, value: gv('tour', 'bull'),
      title: { fr: 'En plein dans le mille', nl: 'Recht in de roos' }, desc: { fr: 'Placer un lieu à moins de 5 km.', nl: 'Een plaats op minder dan 5 km aanduiden.' } });
    tiers('g-pom', 'games', 'gem', [10, 25], [{ fr: 'Bon instinct', nl: 'Goed instinct' }, { fr: 'Encyclopédie vivante', nl: 'Wandelende encyclopedie' }],
      gv('pom', 'best'), { fr: n => `Enchaîner ${n} bonnes réponses à Plus ou moins.`, nl: n => `${n} juiste antwoorden op rij in Meer of minder.` }, [300, 1200]);

    // ----- Échanges -----
    tiers('trades', 'trade', 'swap', [1, 10, 50],
      [{ fr: 'Poignée de main', nl: 'Handdruk' }, { fr: 'Marchand', nl: 'Handelaar' }, { fr: 'Roi du marché aux puces', nl: 'Koning van de vlooienmarkt' }],
      () => st().trades, { fr: n => `Réaliser ${n} échange${n > 1 ? 's' : ''}.`, nl: n => `${n} ruil${n > 1 ? 'en' : ''} afronden.` }, [100, 400, 1500]);
    add({ id: 'trade-gift', group: 'trade', icon: 'gift', target: 1, reward: 150, value: () => st().tradeGift,
      title: { fr: 'Saint-Nicolas', nl: 'Sinterklaas' }, desc: { fr: 'Offrir des cartes sans rien demander en retour.', nl: 'Kaarten weggeven zonder iets terug te vragen.' } });
    add({ id: 'trade-full', group: 'trade', icon: 'swap', target: 1, reward: 300, value: () => st().tradeFull,
      title: { fr: 'Grand marchandage', nl: 'Groot ruilfestijn' }, desc: { fr: 'Réaliser un échange de cinq cartes contre cinq.', nl: 'Een ruil van vijf kaarten tegen vijf afronden.' } });
    add({ id: 'trade-myth', group: 'trade', icon: 'crown', target: 1, reward: 500, value: () => st().tradeMyth,
      title: { fr: 'Transfert du siècle', nl: 'Transfer van de eeuw' }, desc: { fr: 'Échanger une carte mythique.', nl: 'Een mythische kaart ruilen.' } });

    // ----- Secrets -----
    const has = name => CARDS.some(c => c.name === name && totalOf(c.id));
    add({ id: 'escaveche', group: 'secret', secret: true, icon: 'cup', target: 5, reward: 541,
      value: () => { const c = CARDS.find(x => x.name === 'Escavèche'); return c ? ['normal', 'holo', 'plein', 'or'].reduce((a, f) => a + countOf(c.id, f), 0) : 0; },
      title: { fr: 'Fan d’escavèche', nl: 'Escavèche-fan' }, desc: { fr: 'Posséder 5 exemplaires de l’Escavèche. On a vu.', nl: '5 exemplaren van de Escavèche bezitten. We zagen het.' } });
    add({ id: '541', group: 'secret', secret: true, icon: 'clock', target: 1, reward: 541, value: () => has('541 jours') ? 1 : 0,
      title: { fr: 'Patience belge', nl: 'Belgisch geduld' }, desc: { fr: 'Obtenir la carte « 541 jours ».', nl: 'De kaart « 541 dagen » krijgen.' } });
    add({ id: 'westvleteren', group: 'secret', secret: true, icon: 'cup', target: 1, reward: 1000, value: () => has('Westvleteren') ? 1 : 0,
      title: { fr: 'La plus rare', nl: 'De zeldzaamste' }, desc: { fr: 'Trouver une Westvleteren.', nl: 'Een Westvleteren vinden.' } });
    add({ id: 'night', group: 'secret', secret: true, icon: 'moon', target: 1, reward: 200, value: () => st().night,
      title: { fr: 'Oiseau de nuit', nl: 'Nachtuil' }, desc: { fr: 'Ouvrir un paquet entre minuit et 5 h.', nl: 'Een pakje openen tussen middernacht en 5 uur.' } });
    add({ id: 'pity', group: 'secret', secret: true, icon: 'clover', target: 1, reward: 300, value: () => st().pityHits,
      title: { fr: 'La chance tourne', nl: 'Het tij keert' }, desc: { fr: 'Déclencher la garantie anti-malchance.', nl: 'De pechgarantie activeren.' } });
    add({ id: 'gold-myth', group: 'secret', secret: true, icon: 'crown', target: 1, reward: 5000, value: () => st().goldMyth,
      title: { fr: 'Graal', nl: 'Graal' }, desc: { fr: 'Obtenir une carte mythique en version Dorée.', nl: 'Een mythische kaart in gouden versie krijgen.' } });
    add({ id: 'compromis', group: 'secret', secret: true, icon: 'map', target: 3, reward: 300,
      value: () => CARDS.filter(c => c.cat === 'region' && totalOf(c.id)).length,
      title: { fr: 'Compromis à la belge', nl: 'Belgisch compromis' }, desc: { fr: 'Posséder les trois régions.', nl: 'De drie gewesten bezitten.' } });
    add({ id: 'manneken', group: 'secret', secret: true, icon: 'star', target: 1, reward: 300, value: () => has('Manneken-Pis') ? 1 : 0,
      title: { fr: 'Le plus vieux bourgeois', nl: 'De oudste burger' }, desc: { fr: 'Obtenir le Manneken-Pis.', nl: 'Manneken Pis krijgen.' } });

    // Récompenses divisées par trois (économie revue avec tools/simulate.mjs), sauf les succès secrets
    for (const a of list) if (!a.secret) a.reward = Math.max(10, Math.round(a.reward * REWARD_SCALE / 10) * 10);
    return { list, GROUPS };
  };

  // Icônes de médaille (SVG en ligne)
  window.ACH_ICONS = {
    pack: '<path d="M7 3h10l1 3v15H6V6z"/><path d="M6 8h12"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M12 9v11M4 13h16M12 9c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1"/>',
    star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.6 6.6 19.4l1.3-6L3.4 9.3l6-.7z"/>',
    album: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    grid: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
    map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    book: '<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z"/>',
    cup: '<path d="M6 4h10v9a5 5 0 0 1-10 0z"/><path d="M16 7h2a2 2 0 0 1 0 4h-2M8 21h6"/>',
    gem: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l3 18 3-18"/>',
    holo: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16"/>',
    frame: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 16l5-5 4 4 3-3 4 4"/>',
    medal: '<circle cx="12" cy="14" r="6"/><path d="M8 3l4 5 4-5"/>',
    coin: '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5a3 3 0 1 0 0 5M8 11h5M8 13h5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    swap: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
    clover: '<circle cx="9" cy="9" r="3.5"/><circle cx="15" cy="9" r="3.5"/><circle cx="9" cy="15" r="3.5"/><circle cx="15" cy="15" r="3.5"/><path d="M12 12l5 9"/>',
  };
})();
