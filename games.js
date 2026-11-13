// Mini-jeux : Formation de gouvernement, Belgle, Chronologie, Tour de Belgique, Plus ou moins, Qui suis-je ?, Le Parti
(() => {
  'use strict';
  const API = window.RDL;
  const { CARDS, esc, imgUrl, fmt, toast, SFX } = API;
  const bgPos = f => API.focusOf?.(f) ? `;background-position:${API.focusOf(f)}` : ''; // cadrage sur le visage
  const L = () => window.I18N.lang;
  const nm = c => window.I18N.name(c);
  const $ = s => document.querySelector(s);
  const area = () => $('#game-area');
  const rand = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[rand(a.length)];

  // ---------- Textes ----------
  const TX = {
    fr: {
      title: 'Jeux', intro: 'Gagne des pièces avec tes cartes. Gains des mini-jeux plafonnés à {cap} pièces par jour.',
      back: '← Jeux', play: 'Jouer', again: 'Rejouer', best: 'Record', today: 'Aujourd’hui', capReached: 'Plafond quotidien atteint',
      earned: n => `+${n} pièces`,
      nocoins: 'Partie sans pièces', nocoinsOff: 'Partie sans pièces (hors ligne)', update: 'Le jeu a été mis à jour : recharge la page.',
      // Formation
      f_name: 'Formation de gouvernement', f_desc: 'Forme une coalition de 76 sièges avec tes cartes politiques. Le record à battre : 541 jours.',
      f_rulesH: 'Règles du jeu', f_rules: 'Joue une carte pour faire avancer la négociation avec son parti. Quand un parti est convaincu, il entre dans la coalition, mais certains partis refusent de gouverner ensemble. Il faut 76 sièges sur 150, avec au moins un parti de chaque groupe linguistique. Au-delà de 600 jours, c’est l’échec.',
      f_days: 'Jours', f_seats: 'Sièges', f_hand: 'Ta main', f_reshuffle: 'Nouvelle main (+10 jours)', f_in: 'Dans la coalition', f_refuse: 'Refuse',
      f_need: n => `${n} pts`, f_guest: 'Invité', f_deck: (o, g) => `Paquet : ${o} cartes de ta collection${g ? ` + ${g} invités` : ''}. Les cartes rares pèsent plus lourd.`,
      f_win: d => `Gouvernement formé en ${d} jours !`, f_lose: 'Affaires courantes : 600 jours sans accord.',
      f_both: 'Majorité dans les deux groupes linguistiques', f_joined: p => `${p} entre dans la coalition`, f_lock: (p, q) => `${p} refuse de gouverner avec ${q}`,
      f_cordon: 'Cordon sanitaire : aucun parti n’accepte de négocier avec le Vlaams Belang. +30 jours.',
      f_fr: 'FR', f_nl: 'NL', f_bi: 'FR/NL',
      ev: {
        crise: 'Crise communautaire. +30 jours.', fuite: p => `Fuite dans la presse : ${p} recule de 2 points.`,
        sondage: p => `Sondage favorable : ${p} avance de 2 points.`, roi: p => `Le Roi reçoit le formateur : ${p} avance de 3 points.`,
        roi0: 'Le Roi reçoit le formateur. Sans carte royale dans ta collection, peu d’effet.',
        conclave: 'Conclave budgétaire interminable. +14 jours.', bhv: 'Le dossier BHV refait surface. +21 jours.',
        vacances: 'Vacances parlementaires. +20 jours.', clarif: 'Mission de clarification : tu pioches 2 cartes.',
      },
      // Qui suis-je ?
      q_name: 'Qui suis-je ?', q_desc: 'Des indices un par un, quatre noms possibles. Plus tu trouves tôt, plus tu marques. 5 manches.',
      q_round: (i, n) => `Manche ${i}/${n}`, q_clue: 'Indice', q_more: 'Indice suivant', q_photo: 'Photo floutée', q_pts: n => `${n} points en jeu`,
      q_ok: n => `Bien joué ! +${n} points`, q_ko: 'Raté, voici un nouvel indice', q_lost: 'Perdu, c’était :', q_next: 'Manche suivante', q_end: 'Voir le score',
      q_total: n => `${n} points sur 500`,
      // Le Parti
      l_name: 'Le Parti', l_desc: 'Un ou une politique, quatre partis : lequel est le bon ? 10 questions.',
      l_round: (i, n) => `Question ${i}/${n}`, l_q: 'De quel parti ?', l_total: n => `${n} bonnes réponses sur 10`,
      // Belgle
      b_name: 'Belgle', b_desc: 'Une carte mystère par jour, la même pour tout le monde. 6 essais, un indice à chaque erreur.',
      b_ph: 'Tape un nom…', b_guess: 'Proposer', b_hints: 'Indices', b_cat: 'Catégorie', b_rar: 'Rareté', b_sub: 'Description', b_era: 'Époque', b_born: 'Naissance', b_created: 'Création', b_decade: d => `années ${d}`,
      b_place: 'Lieu', b_init: 'Initiales', b_win: n => `Trouvé en ${n} essai${n > 1 ? 's' : ''} !`, b_lose: 'Perdu ! C’était…', b_share: 'Copier mon score',
      b_copied: 'Score copié', b_next: 'Nouvelle carte demain', b_streak: n => `Série : ${n} jour${n > 1 ? 's' : ''}`, b_unknown: 'Carte inconnue',
      b_found: (n, f) => n ? `Aujourd’hui, ${f} joueur${n > 1 ? 's l’ont' : ' l’a'} trouvée` : 'Aujourd’hui, personne ne l’a encore trouvée',
      b_dist: 'Nombre d’essais des joueurs qui l’ont trouvée',
      // Chrono
      c_name: 'Chronologie', c_desc: 'Place chaque carte au bon endroit sur la ligne du temps. Une erreur et c’est fini.',
      c_place: 'Où placer cette carte ?', c_here: 'Ici', c_over: n => `Série terminée : ${n} carte${n > 1 ? 's' : ''} bien placée${n > 1 ? 's' : ''}.`,
      c_kind: { 'Naissance': 'Naissance', 'Fondation': 'Fondation', 'Année': 'Création', 'Formation': 'Formation', 'Création': 'Création', 'event': 'Événement' },
      // Tour
      t_name: 'Tour de Belgique', t_desc: 'Clique sur la carte là où se trouve le lieu. 10 manches, 1 000 points par manche au maximum.',
      t_where: 'Où se trouve…', t_next: 'Manche suivante', t_end: 'Voir le résultat', t_round: (i, n) => `Manche ${i}/${n}`,
      t_dist: (d, p) => `${d} km · ${p} points`, t_total: s => `Score final : ${s} / 10 000`,
      // Plus ou moins
      p_name: 'Plus ou moins', p_desc: 'Plus ou moins d’habitants ? Plus grande ? Née avant ou après ? Enchaîne les bonnes réponses.',
      p_pop: 'habitants', p_born: 'naissance',
      p_mode_pop: 'Habitants', p_mode_area: 'Superficie', p_mode_birth: 'Année de naissance',
      p_q_pop: (b, a) => `${b} a-t-elle plus ou moins d’habitants que ${a} ?`, p_q_area: (b, a) => `${b} est-elle plus grande ou plus petite que ${a} ?`,
      p_q_birth: (b, a) => `${b} est né(e) avant ou après ${a} ?`,
      p_more_pop: '▲ Plus', p_less_pop: '▼ Moins', p_more_area: '▲ Plus grande', p_less_area: '▼ Plus petite', p_more_birth: '▲ Après', p_less_birth: '▼ Avant',
      p_over: n => `Perdu ! Série de ${n}.`, p_streak: n => `Série : ${n}`,
    },
    nl: {
      title: 'Spellen', intro: 'Verdien munten met je kaarten. Winst uit minispellen is beperkt tot {cap} munten per dag.',
      back: '← Spellen', play: 'Spelen', again: 'Opnieuw', best: 'Record', today: 'Vandaag', capReached: 'Daglimiet bereikt',
      earned: n => `+${n} munten`,
      nocoins: 'Spel zonder munten', nocoinsOff: 'Spel zonder munten (offline)', update: 'Het spel is bijgewerkt: herlaad de pagina.',
      f_name: 'Regeringsvorming', f_desc: 'Vorm een coalitie van 76 zetels met je politieke kaarten. Het record om te kloppen: 541 dagen.',
      f_rulesH: 'Spelregels', f_rules: 'Speel een kaart om de onderhandeling met haar partij te laten vorderen. Is een partij overtuigd, dan treedt ze toe tot de coalitie, maar sommige partijen weigeren samen te regeren. Je hebt 76 van de 150 zetels nodig, met minstens één partij uit elke taalgroep. Na 600 dagen is het mislukt.',
      f_days: 'Dagen', f_seats: 'Zetels', f_hand: 'Je hand', f_reshuffle: 'Nieuwe hand (+10 dagen)', f_in: 'In de coalitie', f_refuse: 'Weigert',
      f_need: n => `${n} ptn`, f_guest: 'Gast', f_deck: (o, g) => `Stapel: ${o} kaarten uit je verzameling${g ? ` + ${g} gasten` : ''}. Zeldzame kaarten wegen zwaarder.`,
      f_win: d => `Regering gevormd in ${d} dagen!`, f_lose: 'Lopende zaken: 600 dagen zonder akkoord.',
      f_both: 'Meerderheid in beide taalgroepen', f_joined: p => `${p} treedt toe tot de coalitie`, f_lock: (p, q) => `${p} weigert te regeren met ${q}`,
      f_cordon: 'Cordon sanitaire: geen enkele partij wil onderhandelen met Vlaams Belang. +30 dagen.',
      f_fr: 'FR', f_nl: 'NL', f_bi: 'FR/NL',
      ev: {
        crise: 'Communautaire crisis. +30 dagen.', fuite: p => `Lek in de pers: ${p} verliest 2 punten.`,
        sondage: p => `Gunstige peiling: ${p} wint 2 punten.`, roi: p => `De Koning ontvangt de formateur: ${p} wint 3 punten.`,
        roi0: 'De Koning ontvangt de formateur. Zonder koninklijke kaart in je verzameling heeft het weinig effect.',
        conclave: 'Eindeloos begrotingsconclaaf. +14 dagen.', bhv: 'Het dossier BHV duikt weer op. +21 dagen.',
        vacances: 'Parlementair reces. +20 dagen.', clarif: 'Verkennersopdracht: je trekt 2 kaarten.',
      },
      q_name: 'Wie ben ik?', q_desc: 'Hints één voor één, vier mogelijke namen. Hoe sneller je het vindt, hoe meer punten. 5 rondes.',
      q_round: (i, n) => `Ronde ${i}/${n}`, q_clue: 'Hint', q_more: 'Volgende hint', q_photo: 'Wazige foto', q_pts: n => `${n} punten te winnen`,
      q_ok: n => `Goed zo! +${n} punten`, q_ko: 'Fout, hier is een nieuwe hint', q_lost: 'Verloren, het was:', q_next: 'Volgende ronde', q_end: 'Naar de score',
      q_total: n => `${n} punten op 500`,
      l_name: 'De Partij', l_desc: 'Een politicus, vier partijen: welke is de juiste? 10 vragen.',
      l_round: (i, n) => `Vraag ${i}/${n}`, l_q: 'Van welke partij?', l_total: n => `${n} juiste antwoorden op 10`,
      b_name: 'Belgle', b_desc: 'Elke dag een mysteriekaart, voor iedereen dezelfde. 6 pogingen, een hint bij elke fout.',
      b_ph: 'Typ een naam…', b_guess: 'Raden', b_hints: 'Hints', b_cat: 'Categorie', b_rar: 'Zeldzaamheid', b_sub: 'Omschrijving', b_era: 'Periode', b_born: 'Geboren', b_created: 'Opgericht', b_decade: d => `jaren ${d}`,
      b_place: 'Plaats', b_init: 'Initialen', b_win: n => `Gevonden in ${n} poging${n > 1 ? 'en' : ''}!`, b_lose: 'Verloren! Het was…', b_share: 'Score kopiëren',
      b_copied: 'Score gekopieerd', b_next: 'Morgen een nieuwe kaart', b_streak: n => `Reeks: ${n} dag${n > 1 ? 'en' : ''}`, b_unknown: 'Onbekende kaart',
      b_found: (n, f) => n ? `Vandaag ${n > 1 ? `vonden ${f} spelers` : 'vond 1 speler'} de kaart` : 'Vandaag heeft nog niemand de kaart gevonden',
      b_dist: 'Aantal pogingen van de spelers die de kaart vonden',
      c_name: 'Tijdlijn', c_desc: 'Plaats elke kaart op de juiste plek op de tijdlijn. Eén fout en het is voorbij.',
      c_place: 'Waar hoort deze kaart?', c_here: 'Hier', c_over: n => `Reeks voorbij: ${n} kaart${n > 1 ? 'en' : ''} juist geplaatst.`,
      c_kind: { 'Naissance': 'Geboren', 'Fondation': 'Opgericht', 'Année': 'Gemaakt', 'Formation': 'Opgericht', 'Création': 'Opgericht', 'event': 'Gebeurtenis' },
      t_name: 'Ronde van België', t_desc: 'Klik op de kaart waar de plaats ligt. 10 rondes, maximaal 1.000 punten per ronde.',
      t_where: 'Waar ligt…', t_next: 'Volgende ronde', t_end: 'Resultaat bekijken', t_round: (i, n) => `Ronde ${i}/${n}`,
      t_dist: (d, p) => `${d} km · ${p} punten`, t_total: s => `Eindscore: ${s} / 10.000`,
      p_name: 'Meer of minder', p_desc: 'Meer of minder inwoners? Groter of kleiner? Vroeger of later geboren? Hoe lang hou je het vol?',
      p_pop: 'inwoners', p_born: 'geboren',
      p_mode_pop: 'Inwoners', p_mode_area: 'Oppervlakte', p_mode_birth: 'Geboortejaar',
      p_q_pop: (b, a) => `Heeft ${b} meer of minder inwoners dan ${a}?`, p_q_area: (b, a) => `Is ${b} groter of kleiner dan ${a}?`,
      p_q_birth: (b, a) => `Is ${b} vóór of na ${a} geboren?`,
      p_more_pop: '▲ Meer', p_less_pop: '▼ Minder', p_more_area: '▲ Groter', p_less_area: '▼ Kleiner', p_more_birth: '▲ Later', p_less_birth: '▼ Vroeger',
      p_over: n => `Verloren! Reeks van ${n}.`, p_streak: n => `Reeks: ${n}`,
    },
  };
  const T = (k, ...a) => { const v = k.split('.').reduce((o, p) => o?.[p], TX[L()]) ?? k.split('.').reduce((o, p) => o?.[p], TX.fr); return typeof v === 'function' ? v(...a) : v; };

  // ---------- Récompenses (plafonnées par jour) ----------
  const DAILY_CAP = 2500;
  // Jour en heure locale (comme le reste de l'app) : en UTC, le jour changeait à 1 h ou 2 h du matin en Belgique
  const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = () => dayKey(new Date());
  function G() {
    const s = API.state;
    s.games ||= {};
    const g = s.games;
    g.formation ||= { played: 0, won: 0, best: 0, both: 0 };
    g.belgle ||= { won: 0, first: 0, streak: 0, maxStreak: 0, last: null, day: null };
    g.chrono ||= { best: 0 };
    g.tour ||= { best: 0, bull: 0 };
    g.pom ||= { best: 0 };
    g.qui ||= { best: 0, played: 0 };
    g.parti ||= { best: 0, perfect: 0 };
    g.played ||= {};
    g.coins ||= { day: null, amount: 0 };
    return g;
  }
  // Version serveur, joueur connecté : rien ici, la base donne les pièces à la fin de la partie (finish plus bas) ; hors
  // ligne, la partie se joue sans pièces
  function reward(n) {
    if (API.ecoServer?.()) return 0;
    const g = G();
    if (g.coins.day !== todayKey()) g.coins = { day: todayKey(), amount: 0 };
    const give = Math.max(0, Math.min(n, DAILY_CAP - g.coins.amount));
    g.coins.amount += give;
    if (give) { API.state.coins += give; API.gainXp?.(give / API.XP.gamePer, 'game'); SFX.coin(); toast(T('earned', give)); }
    else if (n) toast(T('capReached'));
    API.save(); API.renderWallet();
    return give;
  }
  // Partie jouée (mission « mini-jeux différents », succès Ludothèque) : comptée à la fin d'une partie, ou à la
  // première proposition du Belgle, plus à la simple ouverture du jeu. Version serveur : la base compte elle-même les
  // parties qu'elle a distribuées (missions et défis). XP seulement avec un score (comme la base : une Chronologie ratée
  // à la première carte n'en donne pas)
  function played(id, score = 0) {
    G().played[id] = true; API.save();
    if (API.ecoServer?.()) return;
    API.mission?.('games', 1, id);
    if (id !== 'belgle' && score > 0) gameXp(); // Belgle : carte trouvée (belgleGuess)
  }
  // XP d'une partie finie dans le navigateur (XP.game, plus pièces / XP.gamePer dans reward ; 300 XP par jour au plus,
  // app.js gainXp). Version serveur : la base la compte elle-même
  function gameXp() {
    if (API.ecoServer?.()) return;
    API.gainXp?.(API.XP.game, 'game');
    API.save();
  }
  const done = () => { API.save(); API.checkAchievements(); };

  // ---------- Version serveur : parties distribuées et vérifiées par la base ----------
  // Joueur connecté (version compte) : la base distribue la partie (commencer_minijeu), reçoit les réponses à la fin
  // ou quand le joueur quitte la partie (finir_minijeu ; Belgle : chaque proposition, belgle_proposer) et donne elle-même
  // pièces, missions et défis (supabase/migrations/…_minigames_verified.sql). Le jeu n'annonce plus aucun montant.
  // Hors ligne, ou refus du serveur : partie jouée ici au hasard, sans pièces (bandeau). Page GitHub et version compte
  // sans connexion : rien ne change (Math.random, récompenses dans le navigateur).
  // PLAY : partie affichée { jeu, partie (numéro du serveur), rep (réponses), sent, result (réponse du serveur),
  // belgle (Belgle tenu par le serveur), nocoins (false, 'offline' ou 'error') }
  let PLAY = null;
  const STALE = Symbol('quitté'); // jeu quitté ou relancé pendant la demande au serveur
  const NAME_OF = { formation: 'f_name', belgle: 'b_name', chrono: 'c_name', tour: 't_name', pom: 'p_name', qui: 'q_name', parti: 'l_name' };
  async function deal(jeu, mode = null) {
    leave();
    const me = PLAY = { jeu, partie: null, rep: [], sent: false, result: null, belgle: false, nocoins: false };
    if (!API.ecoServer?.()) return null;
    if (navigator.onLine === false) { me.nocoins = 'offline'; return null; }
    area().innerHTML = header(NAME_OF[jeu]) + '<p class="muted game-wait">…</p>';
    let r = null;
    try { r = await API.ECO().gameStart(jeu, mode); } catch (e) { me.nocoins = e?.net ? 'offline' : 'error'; }
    if (PLAY !== me || active !== jeu) return STALE;
    if (r?.partie) me.partie = r.partie;
    if (r && jeu === 'belgle') me.belgle = true;
    return r;
  }
  // Cartes distribuées par le serveur, retrouvées dans le jeu (map : id → élément) ; une carte inconnue (jeu pas
  // rechargé depuis un nouveau catalogue) : partie sans pièces
  function byIds(ids, map) {
    const out = (ids || []).map(id => map.get(id));
    if (out.length && out.every(Boolean)) return out;
    PLAY.partie = null; PLAY.nocoins = 'error'; toast(T('update'));
    return null;
  }
  const srv = () => PLAY?.partie && !PLAY.sent ? PLAY : null;
  const answer = x => { srv()?.rep.push(x); };
  // Réponses envoyées (fin de partie, ou partie quittée) ; la base répond avec les pièces données (toast d'account.js)
  function finish(reponses = null) {
    const p = srv();
    if (!p) return;
    p.sent = true;
    API.ECO().gameFinish(p.partie, reponses ?? p.rep).then(r => { p.result = r; showGain(p); }, () => {});
  }
  // Partie quittée en cours (retour au menu, autre jeu) : ce qui a été répondu part quand même
  function leave() { const p = srv(); if (p && p.rep.length && p.jeu !== 'formation') finish(); }
  const gainText = r => !r || r.refus ? '' : r.gain > 0 ? T('earned', fmt(r.gain)) : r.plafond ? T('capReached') : '';
  const gainLine = () => `<span class="game-gain" id="game-gain">${PLAY?.jeu === active ? esc(gainText(PLAY.result)) : ''}</span>`;
  function showGain(p) { const el = $('#game-gain'); if (el && p === PLAY && p.jeu === active) el.textContent = gainText(p.result); }

  // ---------- Menu ----------
  let active = null; // jeu affiché (voir isActive plus bas)
  const GAMES = [
    { id: 'formation', icon: 'crown', name: 'f_name', desc: 'f_desc', best: g => g.formation.best ? `${g.formation.best} ${T('f_days').toLowerCase()}` : '—' },
    { id: 'belgle', icon: 'star', name: 'b_name', desc: 'b_desc', best: g => g.belgle.day === todayKey() && g.belgle.done ? (g.belgle.todayWon ? '✓' : '✗') : '—' },
    { id: 'chrono', icon: 'clock', name: 'c_name', desc: 'c_desc', best: g => g.chrono.best || '—' },
    { id: 'tour', icon: 'map', name: 't_name', desc: 't_desc', best: g => g.tour.best ? fmt(g.tour.best) : '—' },
    { id: 'pom', icon: 'gem', name: 'p_name', desc: 'p_desc', best: g => g.pom.best || '—' },
    { id: 'qui', icon: 'medal', name: 'q_name', desc: 'q_desc', best: g => g.qui.best || '—' },
    { id: 'parti', icon: 'swap', name: 'l_name', desc: 'l_desc', best: g => g.parti.best ? `${g.parti.best}/10` : '—' },
  ];
  const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${window.ACH_ICONS[n]}</svg>`;

  function renderMenu() {
    leave();
    active = null;
    const g = G();
    $('#games-title').textContent = T('title');
    $('#games-intro').textContent = T('intro').replace('{cap}', fmt(DAILY_CAP));
    area().innerHTML = `<div class="games-grid">${GAMES.map(x => `
      <button class="game-tile" data-game="${x.id}">
        <span class="game-icon">${icon(x.icon)}</span>
        <span class="game-text"><b>${T(x.name)}</b><span>${T(x.desc)}</span></span>
        <span class="game-best"><small>${x.id === 'belgle' ? T('today') : T('best')}</small>${esc(String(x.best(g)))}</span>
      </button>`).join('')}</div>`;
  }
  function header(nameKey, extra = '') {
    const off = PLAY?.nocoins && PLAY.jeu === active ? `<p class="game-nocoins">${T(PLAY.nocoins === 'offline' ? 'nocoinsOff' : 'nocoins')}</p>` : '';
    return `<div class="game-head"><button class="btn btn-line game-back">${T('back')}</button><h2>${T(nameKey)}</h2><div class="game-extra">${extra}</div></div>${off}`;
  }
  // Jeu affiché : les mises à jour différées (setTimeout) d'un jeu quitté entre-temps ne doivent pas
  // redessiner l'écran par-dessus le jeu suivant
  const isActive = id => active === id && $('#view-games').classList.contains('is-active');
  const toMenu = () => { active = null; renderMenu(); window.scrollTo(0, 0); };
  document.addEventListener('click', e => {
    if (e.target.closest('.game-back')) { SFX.tick(); API.popLayer?.('game'); toMenu(); return; }
    const tile = e.target.closest('.game-tile[data-game]');
    // Partie lancée : le bouton retour du téléphone ramène au menu des jeux, comme « Retour » (app.js, Navigation)
    if (tile) { SFX.open(); active = tile.dataset.game; API.pushLayer?.('game', toMenu); START[tile.dataset.game](); window.scrollTo(0, 0); }
  });

  // =====================================================================
  // 1. Formation de gouvernement
  // =====================================================================
  // Sièges inspirés des élections fédérales de 2024 ; PTB-PVDA compte dans les deux groupes linguistiques.
  const PARTIES = [
    { id: 'nva', name: 'N-VA', seats: 24, group: 'nl', fam: 'jaune' },
    { id: 'vb', name: 'Vlaams Belang', seats: 20, group: 'nl', fam: 'noir', cordon: true },
    { id: 'mr', name: 'MR', seats: 20, group: 'fr', fam: 'bleu' },
    { id: 'ps', name: 'PS', seats: 16, group: 'fr', fam: 'rouge' },
    { id: 'ptb', name: 'PTB-PVDA', seats: 15, group: 'bi', fam: 'pourpre', fr: 8, nl: 7 },
    { id: 'le', name: 'Les Engagés', seats: 14, group: 'fr', fam: 'turquoise' },
    { id: 'vooruit', name: 'Vooruit', seats: 13, group: 'nl', fam: 'rouge' },
    { id: 'cdv', name: 'CD&V', seats: 11, group: 'nl', fam: 'orange' },
    { id: 'vld', name: 'Open VLD', seats: 7, group: 'nl', fam: 'bleu' },
    { id: 'groen', name: 'Groen', seats: 6, group: 'nl', fam: 'vert' },
    { id: 'ecolo', name: 'Ecolo', seats: 3, group: 'fr', fam: 'vert' },
    { id: 'defi', name: 'DéFI', seats: 1, group: 'fr', fam: 'magenta' },
  ];
  const PARTY_OF = {
    'N-VA': 'nva', 'Volksunie': 'nva', 'Vlaams Belang': 'vb', 'Vlaams Blok': 'vb', 'MR': 'mr', 'PRL': 'mr', 'PLP': 'mr', 'Parti libéral': 'mr',
    'PS': 'ps', 'PSB': 'ps', 'POB': 'ps', 'PTB-PVDA': 'ptb', 'Les Engagés': 'le', 'cdH': 'le', 'PSC': 'le', 'CSP': 'le', 'Parti catholique': 'cdv',
    'Vooruit': 'vooruit', 'sp.a': 'vooruit', 'CD&V': 'cdv', 'Open VLD': 'vld', 'VLD': 'vld', 'Ecolo': 'ecolo', 'Groen': 'groen', 'Agalev': 'groen', 'DéFI': 'defi',
  };
  // Partis qui refusent de gouverner ensemble (simplifié)
  const INCOMPATIBLE = [['ptb', 'mr'], ['ptb', 'nva'], ['ptb', 'vld'], ['ptb', 'le'], ['ptb', 'cdv'], ['defi', 'nva']];
  const need = p => Math.ceil(p.seats / 4) + 1;
  const RANK = { commune: 0, 'peu-commune': 1, rare: 2, epique: 3, legendaire: 4, mythique: 5 };
  let F = null;

  // Version serveur : partie ouverte sur le serveur, résultat déclaré à la fin (durée et jours contrôlés par la base)
  async function startFormation() {
    if (await deal('formation') === STALE) return;
    const owned = CARDS.filter(c => c.cat === 'politique' && PARTY_OF[c.party] && API.totalOf(c.id));
    let deck = owned.map(c => ({ c, guest: false }));
    const guests = [];
    if (deck.length < 25) {
      // Invités répartis selon les sièges des partis (au hasard, la plupart venaient de partis vite entrés dans la
      // coalition et la main se remplissait de cartes inutiles)
      const pool = shuffle(CARDS.filter(c => c.cat === 'politique' && PARTY_OF[c.party] && !API.totalOf(c.id)));
      const have = {};
      for (const x of deck) have[PARTY_OF[x.c.party]] = (have[PARTY_OF[x.c.party]] || 0) + 1;
      for (const p of PARTIES.filter(q => !q.cordon)) { // 130 sièges sans le Vlaams Belang
        const n = Math.max(1, Math.round(25 * p.seats / 130)) - (have[p.id] || 0);
        for (const c of pool.filter(c => PARTY_OF[c.party] === p.id).slice(0, Math.max(0, n))) guests.push({ c, guest: true });
      }
      const taken = new Set(guests.map(x => x.c.id));
      for (const c of pool.filter(c => !taken.has(c.id)).slice(0, Math.max(0, 25 - deck.length - guests.length))) guests.push({ c, guest: true });
      deck = deck.concat(guests);
    }
    F = {
      deck: shuffle(deck), hand: [], discard: [], days: 0, log: [], over: false,
      parties: Object.fromEntries(PARTIES.map(p => [p.id, { pts: 0, status: 'open' }])),
      ownedCount: owned.length, guestCount: guests.length, hasKing: CARDS.some(c => c.cat === 'monarchie' && API.totalOf(c.id)),
    };
    for (let i = 0; i < 5; i++) drawF();
    renderFormation();
  }
  // Pioche vide : on remélange les cartes déjà jouées (avant, la main repartait dans la pioche et se vidait)
  function drawF() { if (!F.deck.length) F.deck = shuffle(F.discard.splice(0)); const x = F.deck.pop(); if (x) F.hand.push(x); }
  const influence = x => Math.max(1, RANK[x.c.rarity] + 1 + (x.c.current ? 1 : 0) - (x.guest ? 1 : 0));
  const coalition = () => PARTIES.filter(p => F.parties[p.id].status === 'in');
  const seatsOf = list => list.reduce((s, p) => s + p.seats, 0);
  const groupSeats = (list, g) => list.reduce((s, p) => s + (p.group === g ? p.seats : p.group === 'bi' ? p[g] : 0), 0);

  function playCard(i) {
    if (F.over) return;
    const x = F.hand.splice(i, 1)[0];
    F.discard.push(x);
    const pid = PARTY_OF[x.c.party];
    const p = PARTIES.find(q => q.id === pid);
    const st = F.parties[pid];
    F.days += 4 + rand(7);
    SFX.flip();
    if (p.cordon) {
      F.days += 30; F.log.unshift({ t: T('f_cordon'), bad: true }); SFX.error();
    } else if (st.status === 'open') {
      st.pts += influence(x);
      if (st.pts >= need(p)) joinF(p);
    }
    if (Math.random() < 0.35) eventF();
    drawF();
    checkF();
    renderFormation();
  }
  // Un parti convaincu entre dans la coalition ; ceux qui refusent de gouverner avec lui se retirent
  function joinF(p) {
    F.parties[p.id].status = 'in';
    F.log.unshift({ t: T('f_joined', p.name), good: true });
    SFX.reveal(3);
    for (const [a, b] of INCOMPATIBLE) {
      const other = a === p.id ? b : b === p.id ? a : null;
      if (other && F.parties[other].status === 'open') {
        F.parties[other].status = 'refuse';
        F.log.unshift({ t: T('f_lock', PARTIES.find(q => q.id === other).name, p.name), bad: true });
      }
    }
  }
  function eventF() {
    const open = PARTIES.filter(p => F.parties[p.id].status === 'open' && !p.cordon);
    const progress = open.filter(p => F.parties[p.id].pts > 0);
    const ev = pick(['crise', 'fuite', 'sondage', 'roi', 'conclave', 'bhv', 'vacances', 'clarif']);
    const E = TX[L()].ev;
    let msg, bad = false;
    if (ev === 'crise') { F.days += 30; msg = E.crise; bad = true; }
    else if (ev === 'conclave') { F.days += 14; msg = E.conclave; bad = true; }
    else if (ev === 'bhv') { F.days += 21; msg = E.bhv; bad = true; }
    else if (ev === 'vacances') { F.days += 20; msg = E.vacances; bad = true; }
    else if (ev === 'clarif') { drawF(); drawF(); msg = E.clarif; }
    else if (ev === 'fuite' && progress.length) { const p = pick(progress); F.parties[p.id].pts = Math.max(0, F.parties[p.id].pts - 2); msg = E.fuite(p.name); bad = true; }
    else if (ev === 'sondage' && open.length) { const p = pick(open); F.parties[p.id].pts += 2; msg = E.sondage(p.name); }
    else if (ev === 'roi') {
      const p = (progress.length ? progress : open).sort((a, b) => F.parties[b.id].pts - F.parties[a.id].pts)[0];
      if (F.hasKing && p) { F.parties[p.id].pts += 3; msg = E.roi(p.name); } else msg = E.roi0;
    } else return;
    F.log.unshift({ t: msg, bad, ev: true });
    bad ? SFX.error() : SFX.shimmer();
    // Un parti peut franchir son seuil grâce à un événement : mêmes règles qu'avec une carte (refus compris)
    for (const p of PARTIES) if (F.parties[p.id].status === 'open' && !p.cordon && F.parties[p.id].pts >= need(p)) joinF(p);
  }
  function reshuffle() {
    if (F.over) return;
    F.days += 10;
    F.deck = shuffle(F.deck.concat(F.hand.splice(0)));
    for (let i = 0; i < 5; i++) drawF();
    SFX.deal(0); SFX.deal(1); SFX.deal(2);
    checkF(); renderFormation();
  }
  function checkF() {
    const co = coalition();
    const seats = seatsOf(co);
    const hasFr = co.some(p => p.group !== 'nl'), hasNl = co.some(p => p.group !== 'fr');
    const g = G().formation;
    if (seats >= 76 && hasFr && hasNl) {
      F.over = 'win';
      const both = groupSeats(co, 'fr') > 31 && groupSeats(co, 'nl') > 44;
      F.both = both;
      g.played++; g.won++;
      if (!g.best || F.days < g.best) g.best = F.days;
      g.maxParties = Math.max(g.maxParties || 0, co.length); // succès « Lasagne fédérale »
      if (both) g.both = 1;
      played('formation', F.days); // score de la base : les jours (partie perdue : 0)
      SFX.fanfare(true);
      // Jours bornés comme la base (24 à 600) : une victoire au-delà de 600 jours, ou très rapide, reste payée
      if (srv()) finish({ gagne: true, jours: Math.min(600, Math.max(24, F.days)), deux_groupes: both });
      else setTimeout(() => reward(Math.max(100, 900 - F.days) + (both ? 200 : 0)), 600);
      done();
    } else if (F.days > 600) {
      F.over = 'lose'; g.played++; played('formation'); SFX.error(); done();
      finish({ gagne: false });
    }
  }
  let rulesOpen = null;
  function renderFormation() {
    const co = coalition();
    const seats = seatsOf(co);
    const grp = p => p.group === 'bi' ? T('f_bi') : T('f_' + p.group);
    // Ordre pensé pour le téléphone : la main juste sous la jauge des sièges (avant, il fallait descendre sous les
    // règles et les douze partis à chaque tour), les dernières nouvelles, puis les partis. Règles repliables.
    rulesOpen ??= !matchMedia('(max-width: 760px)').matches; // gardé d'une partie à l'autre
    const parties = `<div class="parties">${PARTIES.map(p => {
        const st = F.parties[p.id];
        const pct = Math.min(100, st.pts / need(p) * 100);
        return `<div class="party-tile is-${st.status}${p.cordon ? ' is-cordon' : ''}" style="--fam: var(--p-${p.fam})">
          <div class="pt-head"><b>${p.name}</b><span>${p.seats}</span></div>
          <small>${grp(p)}${st.status === 'in' ? ` · ${T('f_in')}` : st.status === 'refuse' ? ` · ${T('f_refuse')}` : p.cordon ? ' · cordon' : ` · ${st.pts}/${T('f_need', need(p))}`}</small>
          <div class="bar"><span style="width:${st.status === 'in' ? 100 : pct}%"></span></div>
        </div>`;
      }).join('')}</div>`;
    area().innerHTML = header('f_name', `<span class="gstat"><small>${T('f_days')}</small><b class="${F.days > 541 ? 'bad' : ''}">${F.days}</b></span><span class="gstat"><small>${T('f_seats')}</small><b>${seats}/76</b></span>`) + `
      <details class="game-rules-box"${rulesOpen ? ' open' : ''}><summary>${T('f_rulesH')}</summary><p class="game-rules">${T('f_rules')}</p></details>
      <div class="hemi"><div class="hemi-bar">${co.map(p => `<span style="flex:${p.seats};background:var(--p-${p.fam})" title="${p.name}"></span>`).join('')}<span style="flex:${Math.max(0, 150 - seats)}" class="hemi-rest"></span></div><i class="hemi-mark"></i></div>
      ${F.over ? `<div class="game-result ${F.over}"><b>${F.over === 'win' ? T('f_win', F.days) : T('f_lose')}</b>${F.over === 'win' && F.both ? `<span>${T('f_both')}</span>` : ''}${gainLine()}<button class="btn btn-gold" id="f-again">${T('again')}</button></div>` : `
      <div class="hand-head"><h3>${T('f_hand')}</h3><button class="btn btn-line" id="f-reshuffle">${T('f_reshuffle')}</button></div>
      <div class="hand">${F.hand.map((x, i) => {
        const pid = PARTY_OF[x.c.party]; const p = PARTIES.find(q => q.id === pid); const st = F.parties[pid];
        const useless = st.status !== 'open';
        return `<button class="mini${useless ? ' is-useless' : ''}" data-i="${i}" style="--fam: var(--p-${p.fam})">
          <span class="mini-img" style="background-image:url('${imgUrl(x.c.img, 200)}')${bgPos(x.c.img)}"></span>
          <span class="mini-party">${p.name}</span>
          <b>${esc(nm(x.c))}</b>
          <span class="mini-foot"><span class="gem" style="background:var(--r-${x.c.rarity})"></span>+${influence(x)}${x.guest ? ` · ${T('f_guest')}` : ''}</span>
        </button>`;
      }).join('')}</div>
      <p class="muted small">${T('f_deck', F.ownedCount, F.guestCount)}</p>`}
      <ul class="game-log">${F.log.slice(0, 4).map(l => `<li class="${l.good ? 'good' : l.bad ? 'bad' : ''}">${esc(l.t)}</li>`).join('')}</ul>
      ${parties}`;
    area().querySelector('.game-rules-box').addEventListener('toggle', e => { rulesOpen = e.target.open; });
    area().querySelectorAll('.hand .mini').forEach(b => b.addEventListener('click', () => playCard(+b.dataset.i)));
    $('#f-reshuffle')?.addEventListener('click', reshuffle);
    $('#f-again')?.addEventListener('click', startFormation);
  }

  // =====================================================================
  // 2. Belgle (carte du jour)
  // =====================================================================
  const BELGLE_POOL = CARDS.filter(c => c.img && !['province', 'region', 'evenement', 'edition'].includes(c.cat) &&
    (c.cat === 'commune' ? ['legendaire', 'mythique', 'epique'].includes(c.rarity) : ['rare', 'epique', 'legendaire', 'mythique'].includes(c.rarity)))
    .sort((a, b) => a.id.localeCompare(b.id));
  function dailyCard(day) {
    let h = 2166136261;
    for (const ch of 'belgle-' + day) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return BELGLE_POOL[(h >>> 0) % BELGLE_POOL.length];
  }
  const yearOf = c => {
    if (c.cat === 'evenement') return +(String(c.subtitle).match(/\d{4}/) || [])[0] || null;
    const s = c.stats.find(([k, v]) => ['Naissance', 'Fondation', 'Année', 'Formation', 'Création'].includes(k) && /^\d{3,4}$/.test(String(v)));
    return s ? { year: +s[1], kind: s[0] } : null;
  };
  // Version serveur : jour, propositions et résultat tenus par la base (mêmes sur tous les appareils)
  async function startBelgle() {
    belgleStats = null; // répartition du jour relue à chaque ouverture
    const d = await deal('belgle');
    if (d === STALE) return;
    const g = G().belgle;
    if (d) {
      if (g.day !== d.jour) { g.day = d.jour; g.todayWon = false; }
      g.guesses = (d.essais || []).filter(id => API.BY_ID.has(id)); g.done = !!d.fini; g.todayWon = !!d.trouve;
      API.save();
      return renderBelgle();
    }
    const day = todayKey();
    if (g.day !== day) { g.day = day; g.guesses = []; g.done = false; g.todayWon = false; API.save(); }
    renderBelgle();
  }
  // Noms proposés : une carte qui porte le même nom qu'une autre (Hallerbos le paysage et Hallerbos la balade,
  // Chimay la bière et Chimay la commune) est précisée par sa catégorie, puis par sa description si besoin
  function guessLabels() {
    const count = (list, f) => list.reduce((m, c) => m.set(f(c), (m.get(f(c)) || 0) + 1), new Map());
    const byName = count(CARDS, c => nm(c).toLowerCase());
    const withCat = c => byName.get(nm(c).toLowerCase()) > 1 ? `${nm(c)} (${window.RDL.catLabel(c.cat)})` : nm(c);
    const byCat = count(CARDS, c => withCat(c).toLowerCase());
    return CARDS.map(c => ({ c, label: byCat.get(withCat(c).toLowerCase()) > 1 ? `${withCat(c)} – ${window.I18N.subtitle(c)}` : withCat(c) }));
  }
  // Carte désignée par le texte tapé : nom précis de la liste, ou nom seul. Quand plusieurs cartes portent ce nom,
  // la carte du jour l'emporte si elle en fait partie (avant, la première carte du jeu gagnait toujours : certains
  // jours étaient impossibles à trouver)
  function resolveGuess(text, target) {
    const N = API.norm, q = N(String(text).trim()); // sans accents : « liege » vaut « Liège »
    if (!q) return null;
    const exact = guessLabels().filter(x => N(x.label) === q).map(x => x.c);
    const named = exact.length ? exact : CARDS.filter(c => N(nm(c)) === q || N(c.name) === q);
    return named.find(c => c.id === target?.id) || named[0] || null;
  }
  let belgleBusy = false;
  async function belgleGuess(name) {
    const g = G().belgle;
    if (g.done || belgleBusy) return;
    const target = dailyCard(g.day);
    const card = resolveGuess(name, target);
    if (!card) { SFX.error(); toast(T('b_unknown')); return; }
    if (PLAY?.belgle) {
      // Version serveur : la base garde la proposition, dit si c'est la bonne et donne les pièces
      const me = PLAY;
      belgleBusy = true;
      let r;
      try { r = await API.ECO().belgleGuess(card.id); } catch (_) { return; } finally { belgleBusy = false; }
      me.result = r;
      g.guesses = (r.essais || []).filter(id => API.BY_ID.has(id));
      if (g.guesses.length === 1) played('belgle');
      if (r.trouve) belgleWon(g);
      else if (r.fini) { g.done = true; g.streak = 0; SFX.error(); }
      else SFX.error();
      done();
      if (isActive('belgle') && PLAY === me) renderBelgle();
      return;
    }
    g.guesses.push(card.id);
    played('belgle'); // partie comptée dès la première proposition
    if (card.id === target.id) {
      belgleWon(g);
      API.mission?.('belgle');
      if (g.guesses.length <= 3) API.mission?.('belgle3'); // défi de la semaine « en 3 essais au plus »
      setTimeout(() => reward(200 - 25 * (g.guesses.length - 1)), 500);
      gameXp();
    } else if (g.guesses.length >= 6) {
      g.done = true; g.streak = 0; SFX.error(); // pas trouvée : pas d'XP
    } else SFX.error();
    done();
    renderBelgle();
  }
  // Carte du jour trouvée : statistiques et série (records du joueur)
  function belgleWon(g) {
    g.done = true; g.todayWon = true; g.won++;
    if (g.guesses.length === 1) g.first = 1;
    const [y, m, d] = g.day.split('-').map(Number), yesterday = dayKey(new Date(y, m - 1, d - 1));
    g.streak = g.last === yesterday ? g.streak + 1 : 1;
    g.last = g.day; g.maxStreak = Math.max(g.maxStreak, g.streak);
    SFX.fanfare(false);
  }
  function renderBelgle() {
    const g = G().belgle;
    const c = dailyCard(g.day);
    const wrong = g.guesses.filter(id => id !== c.id).length;
    const blur = g.done ? 0 : [26, 20, 14, 9, 5, 2][Math.min(wrong, 5)];
    // Indice de date : année de naissance pour une personne (« Naissance »), sinon fondation, création… (« Époque »)
    const y = yearOf(c), yr = typeof y === 'number' ? y : y?.year;
    const decade = yr ? T('b_decade', Math.floor(yr / 10) * 10) : null;
    const dateKey = y?.kind === 'Naissance' ? 'b_born' : ['Fondation', 'Création', 'Formation'].includes(y?.kind) ? 'b_created' : 'b_era';
    const pop = c.cat === 'commune' && c.stats.find(([k]) => k === 'Habitants');
    const dateHint = decade ? [T(dateKey), decade] // une date d'abord
      : pop ? [window.I18N.statKey('Habitants'), pop[1]] // commune : le lieu est déjà dans la description
      : [c.coord || /Province|Bruxelles/.test(c.subtitle || '') ? T('b_place') : T('b_era'), window.I18N.meta(c) || '—'];
    const hints = [
      [T('b_cat'), window.RDL.catLabel(c.cat)],
      [T('b_rar'), window.RDL.rarityLabel(c.rarity)],
      [T('b_sub'), window.I18N.subtitle(c)],
      dateHint,
      [T('b_init'), nm(c).split(/[\s-]+/).map(w => w[0]).join('. ') + '.'],
    ];
    const shown = g.done ? hints.length : Math.min(wrong + 1, hints.length);
    const squares = g.guesses.map(id => id === c.id ? '🟩' : '🟥').join('') + '⬜'.repeat(Math.max(0, 6 - g.guesses.length));
    // Série affichée : remise à zéro quand le dernier Belgle trouvé date d'avant-hier ou plus
    const [y0, m0, d0] = g.day.split('-').map(Number), yesterday = dayKey(new Date(y0, m0 - 1, d0 - 1));
    const streak = g.last === g.day || g.last === yesterday ? g.streak : 0;
    const dayLabel = new Date(y0, m0 - 1, d0).toLocaleDateString(L() === 'nl' ? 'nl-BE' : 'fr-BE', { day: 'numeric', month: 'long' });
    area().innerHTML = header('b_name', `<span class="gstat"><small>${T('today')}</small><b>${esc(dayLabel)}</b></span><span class="gstat"><small>🔥</small><b>${streak}</b></span>`) + `
      <div class="belgle">
        <div class="belgle-photo"><img src="${imgUrl(c.img, 500)}" alt="" style="object-position:${API.focusOf?.(c.img) || 'center 20%'}; filter: blur(${blur}px) ${g.done ? '' : 'grayscale(.3)'}"></div>
        <div class="belgle-side">
          <h3>${T('b_hints')}</h3>
          <dl class="belgle-hints">${hints.slice(0, shown).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
          <div class="belgle-squares">${squares}</div>
          <ol class="belgle-guesses">${g.guesses.map(id => `<li class="${id === c.id ? 'good' : 'bad'}">${esc(nm(API.BY_ID.get(id)))}</li>`).join('')}</ol>
          ${g.done ? `<div class="game-result ${g.todayWon ? 'win' : 'lose'}"><b>${g.todayWon ? T('b_win', g.guesses.length) : T('b_lose')}</b><span class="belgle-answer">${esc(nm(c))}</span>${gainLine()}
              <button class="btn btn-gold" id="b-share">${T('b_share')}</button><small>${T('b_next')} · ${T('b_streak', streak)}</small>
              ${PLAY?.belgle ? '<div class="belgle-stats" id="b-stats" hidden></div>' : ''}</div>`
          : `<form class="belgle-form" autocomplete="off"><input id="b-input" list="b-list" placeholder="${T('b_ph')}"><button class="btn">${T('b_guess')}</button></form>
             <datalist id="b-list">${[...new Set(guessLabels().map(x => x.label))].sort((a, b) => a.localeCompare(b)).map(n => `<option value="${esc(n)}">`).join('')}</datalist>`}
        </div>
      </div>`;
    area().querySelector('.belgle-form')?.addEventListener('submit', e => { e.preventDefault(); belgleGuess($('#b-input').value); });
    // Champ prêt à taper sur ordinateur ; sur téléphone, le clavier ne s'ouvre pas tout seul par-dessus la photo
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) $('#b-input')?.focus({ preventScroll: true });
    $('#b-share')?.addEventListener('click', () => {
      const txt = `Belgle ${g.day} · ${g.todayWon ? g.guesses.length : 'X'}/6\n${squares}\n${location.origin}`;
      navigator.clipboard?.writeText(txt).then(() => toast(T('b_copied')), () => toast(txt));
    });
    if (g.done && PLAY?.belgle) showBelgleStats(g, PLAY);
  }
  // Version serveur : répartition anonyme du Belgle du jour (belgle_du_jour : combien l'ont trouvée, en combien
  // d'essais ; rien sous 10 joueurs ni en cas d'échec). Lue une fois par ouverture du jeu, partie finie
  let belgleStats = null; // { day, p : promesse de la réponse }
  async function showBelgleStats(g, me) {
    if (belgleStats?.day !== g.day) belgleStats = { day: g.day, p: Promise.resolve(API.ECO().belgleToday?.()).catch(() => null) };
    const r = await belgleStats.p;
    const box = $('#b-stats');
    if (!box || PLAY !== me || !isActive('belgle') || !r) return;
    const rep = Array.isArray(r.repartition) ? r.repartition.slice(0, 6).map(n => Math.max(0, Math.trunc(+n) || 0)) : [];
    if (rep.length !== 6) return;
    const max = Math.max(1, ...rep), trouves = Math.max(0, Math.trunc(+r.trouves) || 0), mine = g.todayWon ? g.guesses.length : 0;
    box.innerHTML = `<p class="belgle-found">${esc(T('b_found', trouves, fmt(trouves)))}</p>
      <ol class="belgle-dist" aria-label="${esc(T('b_dist'))}">${rep.map((n, i) => `<li${i + 1 === mine ? ' class="is-me"' : ''}><span>${i + 1}</span><span class="belgle-bar" style="width:${Math.round(n / max * 100)}%"><span class="belgle-n">${esc(fmt(n))}</span></span></li>`).join('')}</ol>`;
    box.hidden = false;
  }

  // =====================================================================
  // 3. Chronologie
  // =====================================================================
  const CHRONO_POOL = CARDS.filter(c => c.cat !== 'edition').map(c => {
    const y = yearOf(c);
    if (!y) return null;
    return typeof y === 'number' ? { c, year: y, kind: 'event' } : { c, year: y.year, kind: y.kind };
  }).filter(Boolean).filter(x => x.c.img || x.c.cat === 'evenement').filter(x => x.c.cat !== 'politique' || ['rare', 'epique', 'legendaire', 'mythique'].includes(x.c.rarity));
  const CHRONO_BY_ID = new Map(CHRONO_POOL.map(x => [x.c.id, x]));
  let C = null;
  async function startChrono() {
    const d = await deal('chrono');
    if (d === STALE) return;
    // Version serveur : paquet distribué par la base (la première carte ouvre la ligne)
    const dealt = d && byIds(d.cartes, CHRONO_BY_ID);
    if (dealt) C = { deck: dealt.slice(2).reverse(), line: [dealt[0]], cur: dealt[1], streak: 0, over: false, wrongAt: null };
    else {
      // Varier les catégories et éviter deux fois la même année
      const used = new Set();
      const deck = shuffle(CHRONO_POOL.slice()).filter(x => !used.has(x.year) && used.add(x.year));
      C = { deck, line: [deck.pop()], cur: deck.pop(), streak: 0, over: false, wrongAt: null };
    }
    renderChrono();
  }
  function placeChrono(i) {
    if (C.over) return;
    answer(i); // place choisie sur la ligne (version serveur)
    const before = C.line[i - 1], after = C.line[i];
    const ok = (!before || before.year <= C.cur.year) && (!after || C.cur.year <= after.year);
    if (ok) {
      C.line.splice(i, 0, C.cur); C.streak++; SFX.reveal(Math.min(5, 2 + Math.floor(C.streak / 3)));
      if (C.streak % 5 === 0) reward(30);
      C.cur = C.deck.pop();
      if (!C.cur) endChrono(); // toutes les cartes placées : fin de partie, avec record et récompense
    } else {
      C.wrongAt = C.cur; SFX.error();
      endChrono();
    }
    renderChrono();
  }
  function endChrono() {
    C.over = true;
    const g = G().chrono; if (C.streak > g.best) g.best = C.streak;
    reward(C.streak * 8);
    played('chrono', C.streak);
    finish();
    done();
  }
  const chronoTile = (x, reveal) => `<div class="ctile${x.c.cat === 'evenement' ? ' is-event' : ''}">
      ${x.c.img ? `<span class="ctile-img" style="background-image:url('${imgUrl(x.c.img, 200)}')${bgPos(x.c.img)}"></span>` : `<span class="ctile-img ctile-ev">${esc(String(x.year))}</span>`}
      <b>${esc(nm(x.c))}</b><small>${TX[L()].c_kind[x.kind] || ''}</small>
      ${reveal ? `<span class="ctile-year">${x.year}</span>` : '<span class="ctile-year">?</span>'}</div>`;
  function renderChrono() {
    area().innerHTML = header('c_name', `<span class="gstat"><small>${T('p_streak', '').replace(/\s*:?\s*$/, '')}</small><b>${C.streak}</b></span><span class="gstat"><small>${T('best')}</small><b>${G().chrono.best}</b></span>`) + `
      ${C.over ? `<div class="game-result lose"><b>${T('c_over', C.streak)}</b>${C.wrongAt ? `<span>${esc(nm(C.wrongAt.c))} : ${C.wrongAt.year}</span>` : ''}${gainLine()}<button class="btn btn-gold" id="c-again">${T('again')}</button></div>`
        : `<div class="chrono-current"><p>${T('c_place')}</p>${chronoTile(C.cur, false)}</div>`}
      <div class="timeline">${C.line.map((x, i) => `${C.over ? '' : `<button class="gap" data-i="${i}">${T('c_here')}</button>`}${chronoTile(x, true)}`).join('')}${C.over ? '' : `<button class="gap" data-i="${C.line.length}">${T('c_here')}</button>`}</div>`;
    area().querySelectorAll('.gap').forEach(b => b.addEventListener('click', () => placeChrono(+b.dataset.i)));
    $('#c-again')?.addEventListener('click', startChrono);
  }

  // =====================================================================
  // 4. Tour de Belgique
  // =====================================================================
  const OUTLINE = window.BELGIUM || [];
  const LAT0 = 50.5, KX = Math.cos(LAT0 * Math.PI / 180);
  const lats = OUTLINE.map(p => p[0]), lons = OUTLINE.map(p => p[1]);
  const B = { latMin: Math.min(...lats), latMax: Math.max(...lats), lonMin: Math.min(...lons), lonMax: Math.max(...lons) };
  const SCALE = 1000 / ((B.lonMax - B.lonMin) * KX);
  const proj = ([lat, lon]) => [(lon - B.lonMin) * KX * SCALE, (B.latMax - lat) * SCALE];
  const unproj = (x, y) => [B.latMax - y / SCALE, x / (KX * SCALE) + B.lonMin];
  const W = 1000, H = Math.round((B.latMax - B.latMin) * SCALE);
  const haversine = ([a, b], [c, d]) => {
    const R = 6371, r = Math.PI / 180;
    const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  // Régions et provinces exclues : un seul point pour une grande zone, impossible à « placer » justement
  const TOUR_POOL = CARDS.filter(c => c.coord && !['edition', 'region', 'province'].includes(c.cat) && (c.cat !== 'commune' || c.rarity !== 'commune'));
  // Repères de la carte : provinces (couleur de leur région) et quelques grandes villes.
  // Le nom d'une ville est masqué quand c'est justement elle qu'il faut placer.
  const PROV_REGION = { 'Flandre-Occidentale': 'fl', 'Flandre-Orientale': 'fl', Anvers: 'fl', Limbourg: 'fl', 'Brabant flamand': 'fl', Bruxelles: 'bx' };
  const ringPath = r => 'M' + r.map(p => proj(p).map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
  const TOUR_CITIES = ['Ville de Bruxelles', 'Bruxelles', 'Anvers', 'Gand', 'Liège', 'Charleroi', 'Namur', 'Bruges', 'Hasselt', 'Mons', 'Arlon', 'Louvain']
    .map(n => CARDS.find(c => c.cat === 'commune' && c.name === n && c.coord)).filter((c, i, a) => c && a.indexOf(c) === i);
  function tourBase(hideId) {
    const provs = (window.BE_PROVINCES || []).map(p => {
      return `<path d="${p.rings.map(ringPath).join('')}" class="tour-prov r-${PROV_REGION[p.fr] || 'wa'}"/>`;
    }).join('');
    // Bord extérieur : les provinces redessinées en trait épais, sous leur remplissage
    const edge = (window.BE_PROVINCES || []).map(p => `<path d="${p.rings.map(ringPath).join('')}"/>`).join('');
    const cities = TOUR_CITIES.filter(c => c.id !== hideId).map(c => {
      const [x, y] = proj(c.coord);
      const n = nm(c).replace(/^Ville de |^Stad /, '');
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" class="tour-city"/><text x="${(x + 9).toFixed(1)}" y="${(y + 5).toFixed(1)}" class="tour-city-name">${esc(n)}</text>`;
    }).join('');
    return `<g class="tour-edge">${edge}</g>` + provs + cities;
  }
  let TR = null;
  async function startTour() {
    const d = await deal('tour');
    if (d === STALE) return;
    let rounds = d && byIds(d.cartes, API.BY_ID); // version serveur : les 10 lieux de la base
    if (!rounds) {
      const communes = shuffle(TOUR_POOL.filter(c => c.cat === 'commune')).slice(0, 5);
      const others = shuffle(TOUR_POOL.filter(c => c.cat !== 'commune')).slice(0, 5);
      rounds = shuffle(communes.concat(others));
    }
    TR = { rounds, i: 0, total: 0, guess: null, scores: [] };
    renderTour();
  }
  function tourClick(e) {
    if (TR.guess) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const ll = unproj(p.x, p.y);
    answer(ll.map(v => Math.round(v * 1e5) / 1e5)); // point cliqué (version serveur : la base calcule la distance)
    const c = TR.rounds[TR.i];
    const d = haversine(ll, c.coord);
    const score = Math.round(1000 * Math.exp(-d / 30));
    TR.guess = { ll, d, score };
    TR.total += score; TR.scores.push(score);
    if (d < 5) G().tour.bull = 1;
    score > 700 ? SFX.reveal(4) : score > 300 ? SFX.reveal(2) : SFX.error();
    renderTour();
  }
  function tourNext() {
    TR.i++; TR.guess = null;
    if (TR.i >= TR.rounds.length) {
      const g = G().tour; if (TR.total > g.best) g.best = TR.total;
      if (TR.total > 7000) SFX.fanfare(TR.total > 9000);
      played('tour', TR.total);
      reward(Math.round(TR.total / 25));
      finish();
      done();
    }
    renderTour();
  }
  function renderTour() {
    const ended = TR.i >= TR.rounds.length;
    const c = TR.rounds[Math.min(TR.i, TR.rounds.length - 1)];
    const path = 'M' + OUTLINE.map(p => proj(p).map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
    let marks = '';
    if (TR.guess && !ended) {
      const [gx, gy] = proj(TR.guess.ll), [tx, ty] = proj(c.coord);
      marks = `<line x1="${gx}" y1="${gy}" x2="${tx}" y2="${ty}" class="tour-line"/><circle cx="${gx}" cy="${gy}" r="9" class="tour-guess"/><circle cx="${tx}" cy="${ty}" r="11" class="tour-true"/>`;
    }
    area().innerHTML = header('t_name', `<span class="gstat"><small>${T('t_round', Math.min(TR.i + 1, 10), 10)}</small><b>${fmt(TR.total)}</b></span><span class="gstat"><small>${T('best')}</small><b>${fmt(G().tour.best)}</b></span>`) + `
      ${ended ? `<div class="game-result win"><b>${T('t_total', fmt(TR.total))}</b><span>${TR.scores.map(s => s >= 700 ? '🟩' : s >= 300 ? '🟨' : '🟥').join('')}</span>${gainLine()}<button class="btn btn-gold" id="t-again">${T('again')}</button></div>` : `
      <div class="tour-q">
        ${c.img ? `<span class="tour-img" style="background-image:url('${imgUrl(c.img, 200)}')${bgPos(c.img)}"></span>` : ''}
        <div><small>${T('t_where')}</small><b>${esc(nm(c))}</b><span>${esc(window.RDL.catLabel(c.cat))} · ${esc(window.I18N.subtitle(c))}</span></div>
        ${TR.guess ? `<div class="tour-score"><b>${TR.guess.score}</b><small>${T('t_dist', Math.round(TR.guess.d), TR.guess.score)}</small><button class="btn btn-gold" id="t-next">${TR.i === 9 ? T('t_end') : T('t_next')}</button></div>` : ''}
      </div>`}
      <svg class="tour-map${TR.guess || ended ? '' : ' is-active'}" viewBox="-20 -20 ${W + 40} ${H + 40}">${window.BE_PROVINCES ? '' : `<path d="${path}" class="tour-land"/>`}${tourBase(ended ? null : c.id)}${marks}</svg>`;
    if (!ended && !TR.guess) area().querySelector('.tour-map').addEventListener('click', tourClick);
    $('#t-next')?.addEventListener('click', tourNext);
    $('#t-again')?.addEventListener('click', startTour);
  }

  // =====================================================================
  // 5. Plus ou moins
  // =====================================================================
  // Un critère choisi au départ et gardé toute la série. La carte de droite porte les deux réponses.
  const statOf = (c, k) => (c.stats.find(([key]) => key === k) || [])[1];
  const num = v => typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.')) || 0;
  const famous = c => c.cat !== 'politique' || ['rare', 'epique', 'legendaire', 'mythique'].includes(c.rarity);
  const POM = {
    pop: CARDS.filter(c => c.cat === 'commune' && c.rarity !== 'commune').map(c => ({ c, v: num(statOf(c, 'Habitants')), show: statOf(c, 'Habitants') })),
    area: CARDS.filter(c => c.cat === 'commune' && c.rarity !== 'commune').map(c => ({ c, v: num(statOf(c, 'Superficie')), show: statOf(c, 'Superficie') })),
    birth: CARDS.filter(c => c.img && c.cat !== 'edition' && famous(c) && typeof statOf(c, 'Naissance') === 'number').map(c => ({ c, v: statOf(c, 'Naissance'), show: statOf(c, 'Naissance') })),
  };
  for (const k of Object.keys(POM)) POM[k] = POM[k].filter(x => x.v);
  const POM_MODES = Object.keys(POM).filter(k => POM[k].length > 10);
  const POM_BY_ID = Object.fromEntries(Object.keys(POM).map(k => [k, new Map(POM[k].map(x => [x.c.id, x]))]));
  let P = null;
  function pomPair(mode, keep) {
    const pool = POM[mode];
    let b;
    do { b = pick(pool); } while (keep && (b.c.id === keep.c.id || b.v === keep.v));
    return b;
  }
  async function startPom(mode) {
    const g = G().pom;
    mode = POM_MODES.includes(mode) ? mode : POM_MODES.includes(g.mode) ? g.mode : POM_MODES[0];
    g.mode = mode;
    const d = await deal('pom', mode);
    if (d === STALE) return;
    // Version serveur : suite de cartes distribuée par la base (seq, k : carte de droite)
    const seq = d && byIds(d.cartes, POM_BY_ID[mode]);
    const a = seq ? seq[0] : pick(POM[mode]);
    P = { mode, seq, k: 1, a, b: seq ? seq[1] : pomPair(mode, a), streak: 0, over: false, reveal: false, ok: null };
    renderPom();
  }
  function pomAnswer(more) {
    if (P.over || P.reveal) return;
    answer(more);
    const ok = more ? P.b.v >= P.a.v : P.b.v <= P.a.v;
    P.reveal = true; P.ok = ok;
    renderPom();
    if (ok) {
      P.streak++; SFX.reveal(Math.min(5, 2 + Math.floor(P.streak / 3)));
      if (P.streak % 5 === 0) reward(30);
      if (P.seq && P.k >= P.seq.length - 1) return pomOver(); // toutes les cartes de la partie du serveur passées
      const cur = P;
      setTimeout(() => { if (!isActive('pom') || P !== cur) return; P.a = P.b; P.b = P.seq ? P.seq[++P.k] : pomPair(P.mode, P.a); P.reveal = false; P.ok = null; renderPom(); }, 1200);
    } else { SFX.error(); pomOver(); }
  }
  function pomOver() {
    P.over = true;
    const g = G().pom; if (P.streak > g.best) g.best = P.streak;
    API.mission?.('pom', P.streak); // défi de la semaine : meilleure série de la semaine
    played('pom', P.streak);
    finish();
    const cur = P;
    setTimeout(() => { reward(P.streak * 8); done(); if (isActive('pom') && P === cur) renderPom(); }, 900);
  }
  function renderPom() {
    const m = P.mode;
    const value = x => `${esc(tvP(x.show))}${m === 'pop' ? ` <em>${T('p_pop')}</em>` : m === 'birth' ? ` <em>${T('p_born')}</em>` : ''}`;
    const side = (x, guess) => `<div class="pom-card${guess && P.ok === true ? ' is-ok' : ''}${guess && P.ok === false ? ' is-ko' : ''}">
      <span class="pom-img" style="background-image:url('${imgUrl(x.c.img || '', 400)}')${bgPos(x.c.img || '')}"></span>
      <div class="pom-info"><b>${esc(nm(x.c))}</b><small>${esc(window.I18N.subtitle(x.c))}</small>
      ${!guess || P.reveal || P.over ? `<span class="pom-val">${value(x)}</span>`
        : `<div class="pom-btns"><button class="btn btn-gold" id="p-more">${T('p_more_' + m)}</button><button class="btn btn-line" id="p-less">${T('p_less_' + m)}</button></div>`}
      </div></div>`;
    const modes = POM_MODES.map(k => `<button class="chip${k === m ? ' is-active' : ''}" data-pmode="${k}">${T('p_mode_' + k)}</button>`).join('');
    area().innerHTML = header('p_name', `<span class="gstat"><small>${T('p_streak', '').replace(/\s*:?\s*$/, '')}</small><b>${P.streak}</b></span><span class="gstat"><small>${T('best')}</small><b>${G().pom.best}</b></span>`) + `
      <div class="pom-modes">${modes}</div>
      <p class="pom-q">${esc(T('p_q_' + m, nm(P.b.c), nm(P.a.c)))}</p>
      <div class="pom">
        ${side(P.a, false)}
        <b class="pom-vs">VS</b>
        ${side(P.b, true)}
      </div>
      ${P.over ? `<div class="game-result lose"><b>${T('p_over', P.streak)}</b>${gainLine()}<button class="btn btn-gold" id="p-again">${T('again')}</button></div>` : ''}`;
    $('#p-more')?.addEventListener('click', () => pomAnswer(true));
    $('#p-less')?.addEventListener('click', () => pomAnswer(false));
    $('#p-again')?.addEventListener('click', () => startPom(P.mode));
    area().querySelectorAll('[data-pmode]').forEach(b => b.addEventListener('click', () => { if (b.dataset.pmode !== P.mode || P.over) startPom(b.dataset.pmode); }));
  }
  const tvP = v => typeof v === 'number' ? String(v) : window.I18N.tv(v);
  // Flèches du clavier : ↑ plus, ↓ moins (seulement quand le jeu est affiché)
  document.addEventListener('keydown', e => {
    if (!P || P.over || P.reveal || !document.querySelector('#p-more') || e.target.closest?.('input, textarea')) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); pomAnswer(true); }
    if (e.key === 'ArrowDown') { e.preventDefault(); pomAnswer(false); }
  });


  // =====================================================================
  // 6. Qui suis-je ?
  // =====================================================================
  // Une carte mystère et quatre noms de la même catégorie. Les indices arrivent un par un (statistiques,
  // domaine, description, photo floutée) ; une erreur révèle l'indice suivant et grise le nom choisi.
  const QUI_POINTS = [100, 75, 50, 30, 15];
  const QUI_POOL = BELGLE_POOL.filter(c => c.cat !== 'commune' || ['legendaire', 'mythique'].includes(c.rarity));
  function quiClues(c) {
    const words = c.name.toLowerCase().split(/[\s'’-]+/).filter(w => w.length > 3);
    const leaks = t => words.some(w => String(t).toLowerCase().includes(w)); // un indice ne doit pas contenir le nom
    const clues = [];
    for (const [k, v] of c.stats) if (k !== 'Wikipédias' && v !== '—' && v !== '' && v !== 0 && !leaks(v)) clues.push(`${window.I18N.statKey(k)} : ${window.I18N.tv(v)}`);
    clues.push(window.RDL.catLabel(c.cat));
    const meta = window.I18N.meta(c), sub = window.I18N.subtitle(c);
    if (meta && !leaks(meta)) clues.push(meta);
    if (sub && !leaks(sub)) clues.push(sub);
    // Indices du plus vague au plus précis, quatre au plus, puis la photo floutée
    return [...new Set(clues)].slice(0, 4);
  }
  let Q = null;
  async function startQui() {
    const d = await deal('qui');
    if (d === STALE) return;
    // Version serveur : cartes et noms proposés distribués par la base
    const cards = d && byIds(d.cartes, API.BY_ID);
    const names = cards && (d.choix || []).map(l => (l || []).map(id => API.BY_ID.get(id)));
    const dealt = cards && names.length === cards.length && names.every(l => l.length === 4 && l.every(Boolean));
    if (cards && !dealt) { PLAY.partie = null; PLAY.nocoins = 'error'; toast(T('update')); }
    const rounds = dealt ? cards.map((c, i) => ({ c, clues: quiClues(c), choices: names[i], shown: 1, wrong: [], result: null }))
      : shuffle(QUI_POOL.slice()).slice(0, 5).map(c => {
        const same = QUI_POOL.filter(x => x.cat === c.cat && x.id !== c.id);
        const decoys = shuffle(same.length >= 3 ? same : QUI_POOL.filter(x => x.id !== c.id)).slice(0, 3);
        return { c, clues: quiClues(c), choices: shuffle([c, ...decoys]), shown: 1, wrong: [], result: null };
      });
    Q = { rounds, i: 0, total: 0 };
    renderQui();
  }
  const quiMax = r => r.clues.length + 1; // indices + photo
  function quiPoints(r) { return QUI_POINTS[Math.min(r.shown - 1, QUI_POINTS.length - 1)]; }
  function quiNextClue(r) {
    if (r.shown < quiMax(r)) { r.shown++; return true; }
    r.result = 'lost'; SFX.error(); return false;
  }
  function quiAnswer(id) {
    const r = Q.rounds[Q.i];
    if (r.result || r.wrong.includes(id)) return;
    if (id === r.c.id) {
      r.result = 'ok'; r.points = quiPoints(r); Q.total += r.points; SFX.reveal(r.shown <= 2 ? 5 : 3);
    } else {
      r.wrong.push(id); SFX.error();
      if (r.wrong.length >= 3 || !quiNextClue(r)) r.result = 'lost';
    }
    // Manche finie (version serveur) : indices montrés et noms cliqués, dans l'ordre
    if (r.result) answer({ indices: r.shown, choix: r.result === 'ok' ? [...r.wrong, id] : [...r.wrong] });
    renderQui();
  }
  function quiNext() {
    Q.i++;
    if (Q.i >= Q.rounds.length) {
      const g = G().qui; g.played++; if (Q.total > g.best) g.best = Q.total;
      if (Q.total >= 400) SFX.fanfare(Q.total >= 450);
      played('qui', Q.total);
      reward(Math.round(Q.total / 2));
      finish();
      done();
    }
    renderQui();
  }
  function renderQui() {
    const ended = Q.i >= Q.rounds.length;
    const stats = `<span class="gstat"><small>${T('q_round', Math.min(Q.i + 1, 5), 5)}</small><b>${Q.total}</b></span><span class="gstat"><small>${T('best')}</small><b>${G().qui.best}</b></span>`;
    if (ended) {
      area().innerHTML = header('q_name', stats) + `<div class="game-result win"><b>${T('q_total', Q.total)}</b>
        <span>${Q.rounds.map(r => r.result === 'ok' ? (r.points >= 75 ? '🟩' : '🟨') : '🟥').join('')}</span>${gainLine()}
        <button class="btn btn-gold" id="q-again">${T('again')}</button></div>`;
      $('#q-again').addEventListener('click', startQui);
      return;
    }
    const r = Q.rounds[Q.i], c = r.c, over = !!r.result;
    const photo = r.shown > r.clues.length || over;
    area().innerHTML = header('q_name', stats) + `
      <div class="qui">
        <div class="qui-clues">
          ${r.clues.slice(0, r.shown).map((x, k) => `<div class="qui-clue"><small>${T('q_clue')} ${k + 1}</small>${esc(x)}</div>`).join('')}
          ${photo ? `<div class="qui-photo${over ? '' : ' is-blur'}" style="background-image:url('${imgUrl(c.img, 400)}')${bgPos(c.img)}">${over ? '' : `<small>${T('q_photo')}</small>`}</div>` : ''}
          ${over ? `<div class="qui-res ${r.result}"><div><b>${r.result === 'ok' ? T('q_ok', r.points) : T('q_lost')}</b><span>${esc(nm(c))}</span></div><button class="btn btn-gold" id="q-next">${Q.i === 4 ? T('q_end') : T('q_next')}</button></div>`
            : `<div class="qui-foot"><span>${T('q_pts', quiPoints(r))}</span>${r.shown < quiMax(r) ? `<button class="btn btn-line" id="q-more">${T('q_more')}</button>` : ''}</div>`}
        </div>
        <div class="qui-choices">${r.choices.map(x => {
          const cls = over ? (x.id === c.id ? ' is-ok' : r.wrong.includes(x.id) ? ' is-ko' : ' is-off') : r.wrong.includes(x.id) ? ' is-ko' : '';
          return `<button class="qui-choice${cls}" data-q="${esc(x.id)}"${over || r.wrong.includes(x.id) ? ' disabled' : ''}>${esc(nm(x))}</button>`;
        }).join('')}</div>
      </div>`;
    area().querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => quiAnswer(b.dataset.q)));
    $('#q-more')?.addEventListener('click', () => { quiNextClue(r); SFX.tick(); renderQui(); });
    $('#q-next')?.addEventListener('click', quiNext);
  }

  // =====================================================================
  // 7. Le Parti
  // =====================================================================
  // Politiques des partis actuels (ministres, élus de plusieurs législatures, membres du gouvernement en place),
  // quatre partis proposés dont au moins deux du même groupe linguistique que la bonne réponse.
  const CURRENT_PARTIES = Object.fromEntries(PARTIES.map(p => [p.name, p]));
  const PARTI_POOL = CARDS.filter(c => ['politique', 'bourgmestre'].includes(c.cat) && c.img && CURRENT_PARTIES[c.party] && (c.current || c.rarity !== 'commune'));
  const PARTI_BY_ID = new Map(PARTI_POOL.map(c => [c.id, c]));
  let LP = null;
  async function startParti() {
    const d = await deal('parti');
    if (d === STALE) return;
    // Version serveur : les 10 politiques de la base ; les partis proposés sont tirés ici
    const dealt = d && byIds(d.cartes, PARTI_BY_ID);
    const rounds = (dealt || shuffle(PARTI_POOL.slice()).slice(0, 10)).map(c => {
      const right = CURRENT_PARTIES[c.party];
      const sameGroup = shuffle(PARTIES.filter(p => p !== right && (p.group === right.group || p.group === 'bi' || right.group === 'bi')));
      const others = shuffle(PARTIES.filter(p => p !== right && !sameGroup.includes(p)));
      const wrong = [...sameGroup.slice(0, 2), ...others].slice(0, 3);
      if (wrong.length < 3) wrong.push(...shuffle(PARTIES.filter(p => p !== right && !wrong.includes(p))).slice(0, 3 - wrong.length));
      return { c, right, choices: shuffle([right, ...wrong]), answer: null };
    });
    LP = { rounds, i: 0, score: 0 };
    renderParti();
  }
  function partiAnswer(id) {
    const r = LP.rounds[LP.i];
    if (r.answer) return;
    r.answer = id;
    answer(id);
    if (id === r.right.id) { LP.score++; SFX.reveal(3); } else SFX.error();
    renderParti();
    setTimeout(() => {
      if (!isActive('parti') || LP.rounds[LP.i] !== r) return; // jeu quitté ou relancé entre-temps
      LP.i++;
      if (LP.i >= LP.rounds.length) {
        const g = G().parti; if (LP.score > g.best) g.best = LP.score; if (LP.score === 10) g.perfect = 1;
        if (LP.score >= 8) SFX.fanfare(LP.score === 10);
        played('parti', LP.score);
        reward(LP.score * 15 + (LP.score === 10 ? 100 : 0));
        finish();
        done();
      }
      renderParti();
    }, id === r.right.id ? 900 : 1600);
  }
  function renderParti() {
    const ended = LP.i >= LP.rounds.length;
    const stats = `<span class="gstat"><small>${T('l_round', Math.min(LP.i + 1, 10), 10)}</small><b>${LP.score}</b></span><span class="gstat"><small>${T('best')}</small><b>${G().parti.best}</b></span>`;
    if (ended) {
      area().innerHTML = header('l_name', stats) + `<div class="game-result win"><b>${T('l_total', LP.score)}</b>
        <span>${LP.rounds.map(r => r.answer === r.right.id ? '🟩' : '🟥').join('')}</span>${gainLine()}<button class="btn btn-gold" id="l-again">${T('again')}</button></div>`;
      $('#l-again').addEventListener('click', startParti);
      return;
    }
    const r = LP.rounds[LP.i], c = r.c;
    area().innerHTML = header('l_name', stats) + `
      <div class="parti">
        <div class="parti-card">
          <span class="parti-img" style="background-image:url('${imgUrl(c.img, 400)}')${bgPos(c.img)}"></span>
          <div><b>${esc(nm(c))}</b><small>${esc(window.I18N.subtitle(c))}</small>${c.meta ? `<small>${esc(window.I18N.meta(c))}</small>` : ''}</div>
        </div>
        <p class="parti-q">${T('l_q')}</p>
        <div class="parti-choices">${r.choices.map(p => {
          const cls = r.answer ? (p.id === r.right.id ? ' is-ok' : p.id === r.answer ? ' is-ko' : ' is-off') : '';
          return `<button class="parti-choice${cls}" data-p="${p.id}" style="--fam: var(--p-${p.fam})"${r.answer ? ' disabled' : ''}>${esc(p.name)}</button>`;
        }).join('')}</div>
      </div>`;
    area().querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => partiAnswer(b.dataset.p)));
  }

  // Cartes de chaque mini-jeu pour la base (tools/build-supabase-cards.mjs → private.minijeux_cartes) : la version
  // serveur distribue les parties et recalcule les scores avec ces données (Belgle : ordre de la liste pour la carte
  // du jour ; Chronologie : année ; Tour : lieu ; Plus ou moins : valeur de chaque critère ; Le Parti : parti)
  function catalogue() {
    const rows = [];
    BELGLE_POOL.forEach((c, i) => rows.push({ jeu: 'belgle', carte: c.id, donnees: { rang: i } }));
    for (const x of CHRONO_POOL) rows.push({ jeu: 'chrono', carte: x.c.id, donnees: { annee: x.year } });
    for (const c of TOUR_POOL) rows.push({ jeu: 'tour', carte: c.id, donnees: { lat: c.coord[0], lon: c.coord[1], commune: c.cat === 'commune' } });
    const pom = new Map(), POM_KEY = { pop: 'habitants', area: 'superficie', birth: 'naissance' };
    for (const k of POM_MODES) for (const x of POM[k]) pom.set(x.c.id, { ...pom.get(x.c.id), [POM_KEY[k]]: x.v });
    for (const [carte, donnees] of pom) rows.push({ jeu: 'pom', carte, donnees });
    for (const c of QUI_POOL) rows.push({ jeu: 'qui', carte: c.id, donnees: {} });
    for (const c of PARTI_POOL) rows.push({ jeu: 'parti', carte: c.id, donnees: { parti: CURRENT_PARTIES[c.party].id } });
    const by = (a, b) => a < b ? -1 : a > b ? 1 : 0;
    return rows.sort((a, b) => by(a.jeu, b.jeu) || by(a.carte, b.carte));
  }

  const START = { formation: startFormation, belgle: startBelgle, chrono: startChrono, tour: startTour, pom: startPom, qui: startQui, parti: startParti };
  window.GAMES_UI = { renderMenu, TX, belglePool: BELGLE_POOL, resolveGuess, catalogue }; // belglePool, resolveGuess : pour les tests
})();
