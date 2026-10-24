// Marché (version serveur, joueur connecté) : annonces publiques de vente à prix fixe, d'échange et de don, tenues par
// la base (supabase/migrations/…_market.sql, PLAN-LOT3.md « Étape 4 »). Les cartes données sont mises de côté à la
// publication (séquestre) et rendues à l'annulation ou à l'expiration (30 jours). Taxe de 10 % sur les ventes, versée
// au pot commun. Seuls les exemplaires gagnés en jouant vont au marché (ni importés ni repris).
// Il prend la place des échanges par code dans l'onglet « Échanges » (renommé « Marché ») ; en mode local ou sans
// connexion, trade.js garde la main et ce fichier ne fait rien. Les appels à la base passent par ecoServeur
// (account.js : marketList, marketPublish, marketDeal…). Pseudos des joueurs : textContent, jamais du HTML.
// Vote du pot commun (PLAN-LOT4.md « Étape 4 », supabase/migrations/…_common_pot_vote.sql) : le bouton « Pot commun »
// ouvre le panneau Vote (jauge vers le palier, propositions de l'équipe, voix gratuite puis voix achetées, résultats
// après la clôture). Vote secret : la base ne donne les totaux qu'à la fin et seulement le bulletin du joueur. Point sur
// l'onglet Marché tant qu'un vote est ouvert et que le joueur n'a pas voté.
(() => {
  'use strict';
  const CFG = window.BROL_CONFIG || {};
  if (CFG.mode !== 'compte') return;
  const API = window.RDL;
  const { CARDS, BY_ID, esc, fmt, toast, SFX } = API;
  const L = () => window.I18N.lang;
  const nm = c => window.I18N.name(c);
  const $ = s => document.querySelector(s);
  const area = () => $('#trade-area');
  const TU = () => window.TRADE_UI;
  const ECO = () => API.ECO();
  // Mêmes valeurs que la base (private.reglages_eco, marche_*) : pour l'affichage seulement, la base fait foi
  const PLANCHER = 1.5, PLAFOND = 10, PLAFOND_MIN = 50, TAXE = 0.10, MAX = 5, OUVERTES = 10;
  const SEEN_KEY = 'brol:v1:marche'; // { uid, vu } : dernière visite de « Mes annonces » (annonces conclues entre-temps) ; effacé à la déconnexion (account.js)

  // ---------- Textes ----------
  const TX = {
    fr: {
      title: 'Marché', intro: 'Achète, échange et donne des cartes avec les autres joueurs.',
      pot: n => `Pot commun : ${n} pièces`, pot_label: 'Pot commun', pot_amount: n => `${n} pièces`,
      pot_next: (p, r) => `Prochain vote à ${p} pièces · encore ${r}`, pot_ready: 'Palier atteint : le prochain vote peut s’ouvrir',
      pot_see: 'Voir le vote',
      pot_hint: 'Alimenté par la taxe de 10 % sur les ventes. Les joueurs votent pour choisir à quoi il sert.',
      pot_open: 'vote en cours',
      // Vote du pot commun
      vote_h: 'Vote du pot commun', back: 'Marché', next_h: 'Prochain vote',
      vote_intro: 'Quand le pot atteint le palier, un vote choisit la prochaine nouveauté du jeu parmi les propositions de l’équipe. Le palier engagé et les voix achetées sont détruits. Le résultat est indicatif.',
      gauge: (n, p) => `${n} / ${p} pièces`, gauge_hint: 'Un vote s’ouvre quand le pot atteint le palier.',
      until: d => `Vote ouvert jusqu’au ${d}`, vote_go: 'Voter (voix gratuite)', pick: 'Choisis une proposition.',
      confirm_free: t => `Voter pour « ${t} » ?\nCoût : 0 pièce (voix gratuite). Ton choix est définitif.`,
      confirm_buy: (t, n) => `Voter pour « ${t} » ?\nCoût : ${n} pièces, détruites.`,
      vote_more: n => `+1 voix (${n} pièces)`, max_votes: 'Tu as toutes tes voix (1 gratuite et 5 achetées).',
      mine: (t, n) => `Tu as voté pour « ${t} » (${n} voix).`, voted: 'Voix enregistrée !', voted_more: 'Voix ajoutée !',
      rules_h: 'Règles du vote',
      rules: ['Pour voter : compte de 7 jours, 30 paquets ouverts sur le serveur (ni ceux d’une partie reprise, ni ceux payés en pièces reprises), niveau 5.',
        'Une voix gratuite, puis jusqu’à 5 voix à acheter : 100, 200, 300, 400 et 500 pièces gagnées en jouant (pas les pièces reprises). Ces pièces sont détruites.',
        'Un seul choix par joueur : tes voix en plus vont au même.', 'Vote secret : les totaux restent cachés jusqu’à la fin.',
        'Gagnant : le plus de voix, puis le plus de votants. Les voix des comptes suspendus (multi-comptes…) sont écartées.'],
      acces: { vote_trop_tot: 'Pour voter, ton compte doit avoir 7 jours.', vote_paquets: 'Pour voter, ouvre d’abord 30 paquets sur le serveur.',
        vote_niveau: 'Pour voter, atteins d’abord le niveau 5.' },
      closed: d => `Vote clos le ${d}. Résultat indicatif.`, res_line: (v, n) => `${v} voix · ${n} votant${n > 1 ? 's' : ''}`,
      winner: 'Choix des joueurs', no_winner: 'Aucune voix : pas de gagnant.',
      delivered: d => `Livrée le ${d}`, not_delivered: 'Pas encore livrée.',
      cancelled: d => `Vote annulé le ${d}. Les voix achetées ont été remboursées. Raison :`,
      reprises: n => `Dont ${n} pièces reprises (ancienne partie et ce qu’elle rapporte : reventes, séries, succès) : elles servent aux paquets, pas au marché.`,
      tab_browse: 'Parcourir', tab_mine: 'Mes annonces', tab_publish: 'Publier',
      search_ph: 'Chercher une carte…', all_types: 'Tous les types', all_cats: 'Toutes les catégories', all_rar: 'Toutes les raretés',
      all_fin: 'Toutes les versions', price_min: 'Prix min.', price_max: 'Prix max.', more_filters: 'Plus de filtres',
      sort_new: 'Les plus récentes', sort_price: 'Prix croissant',
      f_missing: 'Il me manque', f_possible: 'Je peux accepter', f_archived: 'Archivées',
      type: { vente: 'Vente', echange: 'Échange', don: 'Don' },
      against: 'Contre', free: 'Gratuit',
      buy: n => `Acheter · ${n}`, accept: 'Accepter l’échange', take: 'Prendre', own: 'Ton annonce',
      ago_min: n => `il y a ${n} min`, ago_h: n => `il y a ${n} h`, ago_d: n => `il y a ${n} j`,
      archived: 'archivée', expires: n => n > 1 ? `expire dans ${n} j` : 'expire aujourd’hui',
      none: 'Aucune annonce ne correspond.', none_archived: 'Aucune annonce archivée ne correspond.',
      loading: 'Chargement…', fail: 'Le marché ne répond pas. Réessaie plus tard.', more: 'Afficher plus',
      have: n => n > 1 ? `tu l’as (×${n})` : 'tu l’as (dernier exemplaire)', missing: 'il te manque',
      pay_confirm: n => `Payer ${n} pièces pour cette carte ?\nUne transaction conclue est définitive.`,
      swap_confirm: 'Échanger ces cartes ? Une transaction conclue est définitive.',
      need_cards: 'Il te manque des cartes gagnées en jouant pour accepter.',
      done: { vente: 'Carte achetée !', echange: 'Échange conclu !', don: 'Cartes reçues !' },
      open_h: 'En cours', open_none: 'Aucune annonce en cours.', done_h: 'Terminées (30 derniers jours)', done_none: 'Rien pour l’instant.',
      bump: 'Remonter', bumped: 'Déjà remontée aujourd’hui', cancel: 'Annuler',
      cancel_confirm: 'Annuler cette annonce ? Tes cartes reviennent dans ton album.', cancelled: 'Annonce annulée, cartes récupérées.',
      bumped_ok: 'Annonce remontée en tête.',
      sold: (p, n, t) => `Vendue à ${p} pour ${n} pièces (taxe ${t})`, swapped: p => `Échangée avec ${p}`, taken: p => `Prise par ${p}`,
      st: { annulee: 'Annulée', expiree: 'Expirée' }, gone: 'un compte supprimé',
      since: n => n > 1 ? `${n} de tes annonces ont été conclues depuis ta dernière visite.` : 'Une de tes annonces a été conclue depuis ta dernière visite.',
      publish_intro: 'Les cartes données sont mises de côté jusqu’à la fin de l’annonce (30 jours au plus, remonte-la une fois par jour). Seules les cartes gagnées en jouant vont au marché (pas celles tirées avec des pièces reprises). Il faut un compte de 3 jours et 30 paquets ouverts sur le serveur (ni ceux d’une partie reprise, ni ceux payés en pièces reprises ne comptent) ; 10 annonces en cours et 20 par jour au plus. Les pièces reprises d’une ancienne partie ne servent pas au marché.',
      new_vente: 'Vendre une carte', new_echange: 'Proposer un échange', new_don: 'Faire un don',
      hint_vente: 'Une carte, prix fixe entre un plancher et un plafond. Taxe de 10 % pour le pot commun.',
      hint_echange: '1 à 5 cartes contre 1 à 5 cartes demandées.', hint_don: '1 à 5 cartes, au premier qui les prend.',
      create_vente: 'Mettre en vente', create_echange: 'Publier l’échange', create_don: 'Publier le don',
      max_cards: 'Cinq cartes au plus de chaque côté.', want_hint: 'Les cartes que tu veux en échange (gagnées en jouant chez l’autre joueur).',
      want_empty: 'Choisis au moins une carte.',
      price: 'Prix', price_pick: 'Choisis la carte à vendre.', bounds: (a, b) => `entre ${a} et ${b} pièces`,
      net: (n, t) => `Tu recevras ${n} pièces (taxe ${t} pour le pot commun).`, bad_price: 'Prix hors des bornes.',
      published: 'Annonce publiée !', unknown_card: 'Carte inconnue',
    },
    nl: {
      title: 'Markt', intro: 'Koop, ruil en schenk kaarten met de andere spelers.',
      pot: n => `Gemeenschappelijke pot: ${n} munten`, pot_label: 'Gemeenschappelijke pot', pot_amount: n => `${n} munten`,
      pot_next: (p, r) => `Volgende stemming bij ${p} munten · nog ${r}`, pot_ready: 'Drempel bereikt: de volgende stemming kan openen',
      pot_see: 'Naar de stemming',
      pot_hint: 'Gevuld door de taks van 10 % op verkopen. De spelers stemmen waarvoor hij dient.',
      pot_open: 'stemming bezig',
      vote_h: 'Stemming over de gemeenschappelijke pot', back: 'Markt', next_h: 'Volgende stemming',
      vote_intro: 'Als de pot de drempel bereikt, kiest een stemming de volgende nieuwigheid van het spel uit de voorstellen van het team. De ingezette drempel en de gekochte stemmen worden vernietigd. Het resultaat is indicatief.',
      gauge: (n, p) => `${n} / ${p} munten`, gauge_hint: 'Een stemming gaat open als de pot de drempel bereikt.',
      until: d => `Stemming open tot ${d}`, vote_go: 'Stemmen (gratis stem)', pick: 'Kies een voorstel.',
      confirm_free: t => `Stemmen voor „${t}”?\nKost: 0 munten (gratis stem). Je keuze is definitief.`,
      confirm_buy: (t, n) => `Stemmen voor „${t}”?\nKost: ${n} munten, vernietigd.`,
      vote_more: n => `+1 stem (${n} munten)`, max_votes: 'Je hebt al je stemmen (1 gratis en 5 gekocht).',
      mine: (t, n) => `Je stemde voor „${t}” (${n} ${n > 1 ? 'stemmen' : 'stem'}).`, voted: 'Stem geregistreerd!', voted_more: 'Stem toegevoegd!',
      rules_h: 'Regels van de stemming',
      rules: ['Om te stemmen: account van 7 dagen, 30 pakjes geopend op de server (niet die van een overgenomen spel of betaald met overgenomen munten), niveau 5.',
        'Eén gratis stem, daarna tot 5 stemmen te koop: 100, 200, 300, 400 en 500 spelend gewonnen munten (geen overgenomen munten). Die munten worden vernietigd.',
        'Eén keuze per speler: je extra stemmen gaan naar dezelfde.', 'Geheime stemming: de totalen blijven verborgen tot het einde.',
        'Winnaar: de meeste stemmen, daarna de meeste stemmers. Stemmen van geschorste accounts (meerdere accounts…) tellen niet mee.'],
      acces: { vote_trop_tot: 'Om te stemmen moet je account 7 dagen oud zijn.', vote_paquets: 'Om te stemmen open je eerst 30 pakjes op de server.',
        vote_niveau: 'Om te stemmen bereik je eerst niveau 5.' },
      closed: d => `Stemming afgesloten op ${d}. Indicatief resultaat.`, res_line: (v, n) => `${v} ${v === 1 ? 'stem' : 'stemmen'} · ${n} ${n > 1 ? 'stemmers' : 'stemmer'}`,
      winner: 'Keuze van de spelers', no_winner: 'Geen stemmen: geen winnaar.',
      delivered: d => `Geleverd op ${d}`, not_delivered: 'Nog niet geleverd.',
      cancelled: d => `Stemming geannuleerd op ${d}. De gekochte stemmen werden terugbetaald. Reden:`,
      reprises: n => `Waarvan ${n} overgenomen munten (vroeger spel en wat het opbrengt: verkopen, reeksen, prestaties): die zijn voor pakjes, niet voor de markt.`,
      tab_browse: 'Bekijken', tab_mine: 'Mijn zoekertjes', tab_publish: 'Plaatsen',
      search_ph: 'Kaart zoeken…', all_types: 'Alle soorten', all_cats: 'Alle categorieën', all_rar: 'Alle zeldzaamheden',
      all_fin: 'Alle versies', price_min: 'Min. prijs', price_max: 'Max. prijs', more_filters: 'Meer filters',
      sort_new: 'Nieuwste eerst', sort_price: 'Prijs oplopend',
      f_missing: 'Mis ik nog', f_possible: 'Kan ik aanvaarden', f_archived: 'Gearchiveerd',
      type: { vente: 'Verkoop', echange: 'Ruil', don: 'Geschenk' },
      against: 'Tegen', free: 'Gratis',
      buy: n => `Kopen · ${n}`, accept: 'Ruil aanvaarden', take: 'Nemen', own: 'Jouw zoekertje',
      ago_min: n => `${n} min geleden`, ago_h: n => `${n} u geleden`, ago_d: n => `${n} d geleden`,
      archived: 'gearchiveerd', expires: n => n > 1 ? `verloopt over ${n} d` : 'verloopt vandaag',
      none: 'Geen enkel zoekertje gevonden.', none_archived: 'Geen enkel gearchiveerd zoekertje gevonden.',
      loading: 'Laden…', fail: 'De markt antwoordt niet. Probeer later opnieuw.', more: 'Meer tonen',
      have: n => n > 1 ? `je hebt ze (×${n})` : 'je hebt ze (laatste exemplaar)', missing: 'je mist ze',
      pay_confirm: n => `${n} munten betalen voor deze kaart?\nEen afgesloten transactie is definitief.`,
      swap_confirm: 'Deze kaarten ruilen? Een afgesloten transactie is definitief.',
      need_cards: 'Je mist spelend gewonnen kaarten om te aanvaarden.',
      done: { vente: 'Kaart gekocht!', echange: 'Ruil afgesloten!', don: 'Kaarten ontvangen!' },
      open_h: 'Lopend', open_none: 'Geen lopende zoekertjes.', done_h: 'Afgelopen (laatste 30 dagen)', done_none: 'Nog niets.',
      bump: 'Naar boven', bumped: 'Vandaag al naar boven gehaald', cancel: 'Annuleren',
      cancel_confirm: 'Dit zoekertje annuleren? Je kaarten komen terug in je album.', cancelled: 'Zoekertje geannuleerd, kaarten terug.',
      bumped_ok: 'Zoekertje bovenaan gezet.',
      sold: (p, n, t) => `Verkocht aan ${p} voor ${n} munten (taks ${t})`, swapped: p => `Geruild met ${p}`, taken: p => `Genomen door ${p}`,
      st: { annulee: 'Geannuleerd', expiree: 'Verlopen' }, gone: 'een verwijderd account',
      since: n => n > 1 ? `${n} van je zoekertjes werden afgesloten sinds je laatste bezoek.` : 'Een van je zoekertjes werd afgesloten sinds je laatste bezoek.',
      publish_intro: 'Gegeven kaarten worden opzijgezet tot het einde van het zoekertje (hoogstens 30 dagen, haal het eens per dag naar boven). Alleen spelend gewonnen kaarten gaan naar de markt (niet die getrokken met overgenomen munten). Je account moet 3 dagen oud zijn en 30 pakjes op de server geopend hebben (die van een overgenomen spel en die betaald met overgenomen munten tellen niet mee); hoogstens 10 lopende zoekertjes en 20 per dag. Munten overgenomen uit een vroeger spel gelden niet op de markt.',
      new_vente: 'Een kaart verkopen', new_echange: 'Een ruil voorstellen', new_don: 'Een geschenk geven',
      hint_vente: 'Eén kaart, vaste prijs tussen een minimum en een maximum. Taks van 10 % voor de gemeenschappelijke pot.',
      hint_echange: '1 tot 5 kaarten tegen 1 tot 5 gevraagde kaarten.', hint_don: '1 tot 5 kaarten, voor wie ze eerst neemt.',
      create_vente: 'Te koop zetten', create_echange: 'Ruil plaatsen', create_don: 'Geschenk plaatsen',
      max_cards: 'Hoogstens vijf kaarten per kant.', want_hint: 'De kaarten die je in ruil wilt (spelend gewonnen bij de andere speler).',
      want_empty: 'Kies minstens één kaart.',
      price: 'Prijs', price_pick: 'Kies de kaart die je verkoopt.', bounds: (a, b) => `tussen ${a} en ${b} munten`,
      net: (n, t) => `Je krijgt ${n} munten (taks ${t} voor de gemeenschappelijke pot).`, bad_price: 'Prijs buiten de grenzen.',
      published: 'Zoekertje geplaatst!', unknown_card: 'Onbekende kaart',
    },
  };
  const T = (k, ...a) => { const v = TX[L()][k] ?? TX.fr[k]; return typeof v === 'function' ? v(...a) : v; };
  const sub = (k, v) => (TX[L()][k] || TX.fr[k])[v] || v;

  // ---------- Petits outils ----------
  const it = c => ({ id: c.carte, fin: c.version });
  const known = c => BY_ID.has(c.carte);
  // Bornes du prix de vente : comme private.bornes_prix (revente de la rareté × version, × 2 pour une édition limitée)
  const bounds = x => { const base = API.sellValue(BY_ID.get(x.id), x.fin, 1); return [Math.ceil(base * PLANCHER), Math.max(PLAFOND_MIN, Math.floor(base * PLAFOND))]; };
  const taxOf = p => Math.max(1, Math.floor(p * TAXE));
  const ago = d => {
    const m = Math.max(1, Math.round((Date.now() - Date.parse(d)) / 60000));
    return m < 60 ? T('ago_min', m) : m < 48 * 60 ? T('ago_h', Math.round(m / 60)) : T('ago_d', Math.round(m / 1440));
  };
  const daysLeft = d => Math.max(1, Math.ceil((Date.parse(d) - Date.now()) / 86400000));
  const coin = n => `<span class="price"><span class="coin"></span>${fmt(n)}</span>`;
  const items = (list, note) => list.map(c => known(c)
    ? TU().item(it(c), { note: note ? note(c) : '' })
    : `<div class="t-item"><span class="t-thumb"></span><span class="t-text"><b>${esc(T('unknown_card'))}</b></span></div>`).join('');
  const store = {
    get: () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)); } catch (_) { return null; } },
    set: v => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(v)); } catch (_) { /* rien */ } },
  };

  // ---------- État de l'écran ----------
  let tab = 'browse', busy = false, pot = null, reprises = 0, notice = '';
  let vd = null; // vote du pot commun (vote_actuel) : palier, pot, prix, acces, vote, moi
  const FRESH = () => ({ q: '', ids: null, type: '', categorie: '', rarete: '', version: '', prix_min: '', prix_max: '', manque: false, possible: false, archivees: false, tri: 'fraicheur' });
  let filters = FRESH();
  let list = [], page = 0, suite = false, loadSeq = 0, failed = false;

  function render() {
    if (!API.ecoServer()) return;
    $('#trade-title').textContent = T('title');
    $('#trade-intro').textContent = T('intro');
    area().innerHTML = `<p class="mk-notice" id="mk-notice" role="status"${notice ? '' : ' hidden'}></p>
      <div class="mk-top">
        <div class="chips mk-tabs" role="tablist">${['browse', 'mine', 'publish'].map(k =>
          `<button class="chip${tab === k ? ' is-active' : ''}" role="tab" aria-selected="${tab === k}" data-mk-tab="${k}">${T('tab_' + k)}</button>`).join('')}</div>
      </div>
      <button type="button" class="mk-pot${tab === 'vote' ? ' is-active' : ''}" id="mk-pot" title="${esc(T('pot_hint'))}"${pot === null ? ' hidden' : ''}>
        <span class="mk-pot-head"><span class="coin"></span><span class="mk-pot-label"></span><i class="mk-pot-open" hidden></i></span>
        <b class="mk-pot-amount"></b>
        <span class="mk-pot-bar" role="progressbar" aria-valuemin="0"><i></i></span>
        <span class="mk-pot-line"><span class="mk-pot-next"></span><span class="mk-pot-see"></span></span>
      </button>
      <p class="mk-rep muted" id="mk-rep" hidden></p>
      <div id="mk-body"></div>`;
    $('#mk-notice').textContent = notice;
    notice = '';
    drawPot();
    drawReprises();
    if (tab === 'browse') renderBrowse();
    else if (tab === 'mine') renderMine();
    else if (tab === 'vote') renderVote();
    else renderPublish();
  }
  function drawPot() {
    const el = $('#mk-pot');
    if (!el || pot === null) return;
    el.hidden = false;
    // Encadré : montant, barre vers le palier du prochain vote (10 000 tant que vote_actuel n'a pas répondu)
    const palier = Math.max(1, vd?.palier || 10000), n = Math.max(0, pot), ouvert = vd?.vote?.statut === 'ouvert';
    el.setAttribute('aria-label', T('pot', fmt(pot)));
    el.querySelector('.mk-pot-label').textContent = T('pot_label');
    el.querySelector('.mk-pot-amount').textContent = T('pot_amount', fmt(pot));
    const bar = el.querySelector('.mk-pot-bar');
    bar.setAttribute('aria-valuemax', String(palier)); bar.setAttribute('aria-valuenow', String(Math.min(n, palier)));
    bar.firstElementChild.style.width = `${Math.min(100, Math.round(100 * n / palier))}%`;
    bar.classList.toggle('is-full', n >= palier);
    el.querySelector('.mk-pot-next').textContent = ouvert ? '' : n >= palier ? T('pot_ready') : T('pot_next', fmt(palier), fmt(palier - n));
    el.querySelector('.mk-pot-see').textContent = tab === 'vote' ? '' : `${T('pot_see')} →`;
    const open = el.querySelector('.mk-pot-open');
    open.hidden = !ouvert;
    open.textContent = open.hidden ? '' : T('pot_open');
  }
  // Pièces reprises d'une ancienne partie (lot 2, import GitHub) : la base les refuse au marché
  function drawReprises() {
    const el = $('#mk-rep');
    if (!el) return;
    el.hidden = !(reprises > 0);
    el.textContent = reprises > 0 ? T('reprises', fmt(reprises)) : '';
  }

  // ---------- Parcourir ----------
  const CATS = [...new Set(CARDS.map(c => c.cat))];
  const opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  function renderBrowse() {
    const F = filters;
    $('#mk-body').innerHTML = `<form class="mk-filters" id="mk-filters" autocomplete="off" role="search">
        <div class="mk-frow">
          <input type="search" id="mk-q" placeholder="${esc(T('search_ph'))}" value="${esc(F.q)}" aria-label="${esc(T('search_ph'))}">
          <select id="mk-type" aria-label="${esc(T('all_types'))}">${opt('', T('all_types'), F.type)}${['vente', 'echange', 'don'].map(k => opt(k, sub('type', k), F.type)).join('')}</select>
          <select id="mk-tri" aria-label="${esc(T('sort_new'))}">${opt('fraicheur', T('sort_new'), F.tri)}${opt('prix', T('sort_price'), F.tri)}</select>
        </div>
        <details class="mk-more-f"${F.categorie || F.rarete || F.version || F.prix_min || F.prix_max ? ' open' : ''}><summary>${T('more_filters')}</summary>
          <div class="mk-frow">
            <select id="mk-cat" aria-label="${esc(T('all_cats'))}">${opt('', T('all_cats'), F.categorie)}${CATS.map(k => opt(k, API.catLabel(k), F.categorie)).join('')}</select>
            <select id="mk-rar" aria-label="${esc(T('all_rar'))}">${opt('', T('all_rar'), F.rarete)}${API.RARITIES.map(r => opt(r.id, API.rarityLabel(r.id), F.rarete)).join('')}</select>
            <select id="mk-ver" aria-label="${esc(T('all_fin'))}">${opt('', T('all_fin'), F.version)}${API.FINISHES.map(f => opt(f.id, API.finishLabel(f.id), F.version)).join('')}</select>
            <input type="number" id="mk-min" min="0" step="1" inputmode="numeric" placeholder="${esc(T('price_min'))}" aria-label="${esc(T('price_min'))}" value="${esc(F.prix_min)}">
            <input type="number" id="mk-max" min="0" step="1" inputmode="numeric" placeholder="${esc(T('price_max'))}" aria-label="${esc(T('price_max'))}" value="${esc(F.prix_max)}">
          </div>
        </details>
        <div class="mk-frow mk-checks">
          ${[['manque', 'f_missing'], ['possible', 'f_possible'], ['archivees', 'f_archived']].map(([k, l]) =>
            `<label class="check"><input type="checkbox" id="mk-${k}"${F[k] ? ' checked' : ''}><span></span><em>${T(l)}</em></label>`).join('')}
        </div>
      </form>
      <div id="mk-list" class="mk-list" aria-live="polite"></div>
      <p class="mk-more-wrap"><button class="btn btn-line" id="mk-more" hidden>${T('more')}</button></p>`;
    const form = $('#mk-filters');
    let timer = null;
    const read = () => {
      const v = id => form.querySelector(id).value;
      const q = v('#mk-q');
      if (q !== F.q) F.ids = null; // texte changé : la recherche d'une carte précise (fiche) est oubliée
      Object.assign(F, { q, type: v('#mk-type'), tri: v('#mk-tri'), categorie: v('#mk-cat'), rarete: v('#mk-rar'), version: v('#mk-ver'),
        prix_min: v('#mk-min'), prix_max: v('#mk-max'), manque: $('#mk-manque').checked, possible: $('#mk-possible').checked, archivees: $('#mk-archivees').checked });
      load(true);
    };
    form.addEventListener('input', e => { if (e.target.matches('input[type=search], input[type=number]')) { clearTimeout(timer); timer = setTimeout(read, 350); } });
    form.addEventListener('change', e => { if (!e.target.matches('input[type=search], input[type=number]')) read(); });
    form.addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); read(); });
    $('#mk-more').addEventListener('click', () => { SFX.tick(); page++; load(false); });
    load(true);
  }
  // Filtres envoyés à la base : le texte devient la liste des cartes qui le contiennent (FR ou NL)
  function query() {
    const F = filters, f = { tri: F.tri };
    const q = API.norm(F.q.trim());
    if (F.ids) f.ids = F.ids;
    else if (q.length >= 2) f.ids = CARDS.filter(c => [c.name, c.nl?.name].some(s => s && API.norm(s).includes(q))).slice(0, 500).map(c => c.id);
    for (const k of ['type', 'categorie', 'rarete', 'version']) if (F[k]) f[k] = F[k];
    for (const k of ['prix_min', 'prix_max']) if (F[k] !== '' && Number.isFinite(+F[k])) f[k] = Math.max(0, Math.floor(+F[k]));
    for (const k of ['manque', 'possible', 'archivees']) if (F[k]) f[k] = true;
    return f;
  }
  async function load(reset) {
    if (reset) { page = 0; list = []; }
    const seq = ++loadSeq, box = $('#mk-list');
    if (reset && box) box.innerHTML = `<p class="t-empty">${T('loading')}</p>`;
    let r = null;
    try { r = await ECO().marketList(query(), page); failed = false; } catch (_) { failed = true; }
    if (seq !== loadSeq || tab !== 'browse') return;
    if (r) {
      list = list.concat(r.annonces || []); suite = !!r.suite && page < 49;
      if (typeof r.pot === 'number') pot = r.pot;
      if (typeof r.reprises === 'number') reprises = r.reprises;
    }
    drawPot();
    drawReprises();
    drawList();
  }
  function drawList() {
    const box = $('#mk-list');
    if (!box) return;
    $('#mk-more').hidden = !suite || failed;
    if (failed && !list.length) { box.innerHTML = `<p class="t-empty">${T('fail')}</p>`; return; }
    if (!list.length) { box.innerHTML = `<p class="t-empty">${T(filters.archivees ? 'none_archived' : 'none')}</p>`; return; }
    box.innerHTML = list.map((a, i) => adHTML(a, i)).join('');
    box.querySelectorAll('.mk-ad').forEach(el => { el.querySelector('.mk-seller').textContent = list[+el.dataset.i].vendeur || '?'; });
  }
  function adHTML(a, i) {
    const label = a.moi ? T('own') : a.type === 'vente' ? T('buy', fmt(a.prix)) : a.type === 'echange' ? T('accept') : T('take');
    const mine = c => { const n = TU().count(it(c)); return n ? T('have', n) : T('missing'); };
    return `<article class="mk-ad mk-${a.type}" data-i="${i}">
      <div class="mk-cards">${items(a.donne)}</div>
      <div class="mk-side">
        <p class="mk-kind"><span class="mk-type">${esc(sub('type', a.type))}</span><b class="mk-seller"></b><span class="mk-age">${esc(ago(a.remonte_le))}</span>${a.archivee ? `<span class="mk-chip">${T('archived')}</span>` : ''}</p>
        ${a.type === 'vente' ? `<p class="mk-price">${coin(a.prix)}</p>` : a.type === 'don' ? `<p class="mk-price mk-free">${T('free')}</p>`
          : `<div class="mk-want"><small>${T('against')}</small>${items(a.demande, mine)}</div>`}
        <button class="btn ${a.moi ? 'btn-line' : 'btn-gold'} mk-go" data-go="${i}"${a.moi ? ' disabled' : ''}>${esc(label)}</button>
      </div>
    </article>`;
  }

  // Conclure : achat (confirmation du prix), échange (cartes gagnées en jouant, dernier exemplaire confirmé) ou don
  async function deal(a, btn) {
    if (busy || a.moi) return;
    if (a.type === 'vente' && !confirm(T('pay_confirm', fmt(a.prix)))) return;
    if (a.type === 'echange') {
      const give = a.demande.filter(known).map(it);
      if (give.length < a.demande.length || give.some(x => TU().count(x) < 1)) { SFX.error(); return toast(T('need_cards')); }
      if (!TU().lastCopyOk(give) || !confirm(T('swap_confirm'))) return;
    }
    busy = true; btn.disabled = true; btn.classList.add('is-wait');
    try {
      await ECO().marketDeal(a.id);
      if (SFX.fanfare) SFX.fanfare(false); else SFX.achievement?.();
      toast(sub('done', a.type));
      API.renderWallet();
      API.checkAchievements();
      busy = false;
      load(true);
    } catch (e) {
      SFX.error();
      busy = false;
      if (/annonce_(prise|expiree|inconnue)|limite_|pieces_reprises/.test(String(e?.message))) load(true);
      else { btn.disabled = false; btn.classList.remove('is-wait'); }
    }
  }

  // ---------- Mes annonces ----------
  async function renderMine() {
    const body = $('#mk-body');
    body.innerHTML = `<p class="t-empty">${T('loading')}</p>`;
    let r = null;
    try { r = await ECO().marketMine(); } catch (_) { /* erreur déjà affichée */ }
    if (tab !== 'mine' || !$('#mk-body')) return;
    if (!r) { body.innerHTML = `<p class="t-empty">${T('fail')}</p>`; return; }
    seen(r);
    const open = r.ouvertes || [], done = r.terminees || [];
    body.innerHTML = `<section class="mk-mine"><h2 class="mk-h">${T('open_h')} <small>${open.length}/${OUVERTES}</small></h2>
      ${open.length ? open.map((a, i) => `<article class="mk-ad mk-${a.type}" data-open="${i}">
        <div class="mk-cards">${items(a.donne)}</div>
        <div class="mk-side">
          <p class="mk-kind"><span class="mk-type">${esc(sub('type', a.type))}</span><span class="mk-age">${esc(ago(a.cree_le))}</span>
            <span class="mk-chip${a.archivee ? ' is-arch' : ''}">${esc(a.archivee ? T('archived') : T('expires', daysLeft(a.expire_le)))}</span></p>
          ${a.type === 'vente' ? `<p class="mk-price">${coin(a.prix)}</p>` : a.type === 'echange' ? `<div class="mk-want"><small>${T('against')}</small>${items(a.demande)}</div>` : `<p class="mk-price mk-free">${T('free')}</p>`}
          <div class="mk-btns"><button class="btn btn-line mk-bump" data-bump="${i}"${a.remontee ? ` disabled title="${esc(T('bumped'))}"` : ''}>${T(a.remontee ? 'bumped' : 'bump')}</button>
            <button class="btn btn-line mk-cancel" data-cancel="${i}">${T('cancel')}</button></div>
        </div></article>`).join('') : `<p class="t-empty">${T('open_none')}</p>`}
      <h2 class="mk-h">${T('done_h')}</h2>
      ${done.length ? `<ul class="mk-done">${done.map((a, i) => `<li data-done="${i}" class="mk-st-${esc(a.statut)}"><span class="mk-done-cards">${a.donne.map(c => known(c) ? esc(nm(BY_ID.get(c.carte))) + (c.version !== 'normal' ? ` (${esc(API.finishLabel(c.version))})` : '') : esc(T('unknown_card'))).join(', ')}</span>
        <b class="mk-done-line"></b><small>${esc(new Intl.DateTimeFormat(L() === 'nl' ? 'nl-BE' : 'fr-BE', { dateStyle: 'medium' }).format(new Date(a.fini_le)))}</small></li>`).join('')}</ul>`
        : `<p class="t-empty">${T('done_none')}</p>`}</section>`;
    // Pseudo de l'acheteur : textContent
    body.querySelectorAll('[data-done]').forEach(li => {
      const a = done[+li.dataset.done], who = a.acheteur || T('gone');
      li.querySelector('.mk-done-line').textContent = a.statut !== 'conclue' ? sub('st', a.statut)
        : a.type === 'vente' ? T('sold', who, fmt(a.prix), fmt(a.taxe || 0)) : a.type === 'echange' ? T('swapped', who) : T('taken', who);
    });
    body.querySelectorAll('[data-bump]').forEach(b => b.addEventListener('click', () => act(b, () => ECO().marketBump(open[+b.dataset.bump].id), T('bumped_ok'))));
    body.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => {
      if (!confirm(T('cancel_confirm'))) return;
      act(b, () => ECO().marketCancel(open[+b.dataset.cancel].id), T('cancelled'));
    }));
  }
  async function act(btn, f, ok) {
    if (busy) return;
    busy = true; btn.disabled = true; btn.classList.add('is-wait');
    try { await f(); SFX.tick(); toast(ok); API.renderWallet(); } catch (_) { SFX.error(); }
    busy = false;
    if (tab === 'mine') renderMine();
  }
  // Annonces conclues depuis la dernière visite : un message, une fois
  function seen(r) {
    const uid = API.state.serveur?.uid, last = store.get();
    if (!uid) return;
    const vu = last?.uid === uid ? last.vu : null;
    const n = vu ? (r.terminees || []).filter(a => a.statut === 'conclue' && Date.parse(a.fini_le) > vu).length : 0;
    if (n) { SFX.coin?.(); toast(T('since', n)); ECO().marketSold?.(); }
    store.set({ uid, vu: Date.now() });
  }

  // ---------- Publier ----------
  const ICON = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${window.ACH_ICONS[n]}</svg>`;
  function renderPublish() {
    $('#mk-body').innerHTML = `<p class="muted mk-rules">${T('publish_intro')}</p>
      <div class="t-actions mk-new">${[['vente', 'coin'], ['echange', 'swap'], ['don', 'gift']].map(([k, ic]) =>
        `<button class="game-tile" data-new="${k}"><span class="game-icon">${ICON(ic)}</span><span class="game-text"><b>${T('new_' + k)}</b><span>${T('hint_' + k)}</span></span></button>`).join('')}</div>`;
    $('#mk-body').querySelectorAll('[data-new]').forEach(b => b.addEventListener('click', () => { SFX.tick(); compose(b.dataset.new); }));
  }
  // Écran de composition de trade.js : cartes gagnées en jouant seulement (TRADE_UI.count), limites du marché
  function compose(type, give = []) {
    tab = 'publish';
    API.show('trade');
    TU().compose({
      title: T('new_' + type), back: '← ' + T('title'), maxGive: type === 'vente' ? 1 : MAX, maxWant: type === 'echange' ? MAX : 0, maxText: T('max_cards'),
      wantHint: T('want_hint'), wantEmpty: T('want_empty'), createLabel: T('create_' + type),
      extra: type === 'vente' ? priceHTML : null, bind: type === 'vente' ? bindPrice : null,
      ready: C => type === 'vente' ? C.give.length === 1 && priceOk(C) : C.give.length >= 1 && (type !== 'echange' || C.want.length >= 1),
      create: C => publish(type, C),
    }, give);
  }
  const priceOk = C => { if (C.give.length !== 1) return false; const [a, b] = bounds(C.give[0]); return Number.isInteger(C.prix) && C.prix >= a && C.prix <= b; };
  function priceHTML(C) {
    if (C.give.length !== 1) return `<p class="muted small mk-pick">${T('price_pick')}</p>`;
    const x = C.give[0], key = API.keyOf(x.id, x.fin), [a, b] = bounds(x);
    if (C.prixFor !== key) { C.prixFor = key; C.prix = a; }
    return `<label class="mk-price-field" for="mk-prix"><span>${T('price')}</span>
      <input type="number" id="mk-prix" min="${a}" max="${b}" step="1" inputmode="numeric" value="${C.prix}"></label>
      <small class="mk-bounds">${esc(T('bounds', fmt(a), fmt(b)))}</small>
      <small class="mk-net" id="mk-net">${esc(priceOk(C) ? T('net', fmt(C.prix - taxOf(C.prix)), fmt(taxOf(C.prix))) : T('bad_price'))}</small>`;
  }
  function bindPrice(C, tray) {
    const input = tray.querySelector('#mk-prix');
    if (!input) return;
    input.addEventListener('input', () => {
      C.prix = input.value === '' ? NaN : Math.floor(+input.value);
      const ok = priceOk(C);
      tray.querySelector('#mk-net').textContent = ok ? T('net', fmt(C.prix - taxOf(C.prix)), fmt(taxOf(C.prix))) : T('bad_price');
      tray.querySelector('#t-create').disabled = !ok;
    });
  }
  async function publish(type, C) {
    if (busy) return;
    if (type === 'vente' && !priceOk(C)) return toast(T('bad_price'));
    if (C.give.some(x => TU().count(x) < 1)) { SFX.error(); return toast(T('need_cards')); }
    if (!TU().lastCopyOk(C.give)) return;
    const btn = $('#t-create');
    busy = true; if (btn) { btn.disabled = true; btn.classList.add('is-wait'); }
    try {
      await ECO().marketPublish({ type, donne: C.give.map(x => ({ carte: x.id, version: x.fin })),
        demande: type === 'echange' ? C.want.map(x => ({ carte: x.id, version: x.fin })) : null, prix: type === 'vente' ? C.prix : null });
      SFX.coin(); toast(T('published'));
      API.renderWallet();
      busy = false;
      tab = 'mine';
      if (!store.get()) store.set({ uid: API.state.serveur?.uid, vu: Date.now() });
      API.show('trade');
    } catch (_) {
      SFX.error();
      busy = false;
      if (btn?.isConnected) { btn.disabled = false; btn.classList.remove('is-wait'); }
    }
  }

  // ---------- Vote du pot commun ----------
  const title = o => (L() === 'nl' ? o.titre_nl : o.titre_fr) || o.titre_fr || '';
  const detail = o => (L() === 'nl' ? o.detail_nl : o.detail_fr) || '';
  const when = d => new Intl.DateTimeFormat(L() === 'nl' ? 'nl-BE' : 'fr-BE', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(d));
  const day = d => new Intl.DateTimeFormat(L() === 'nl' ? 'nl-BE' : 'fr-BE', { dateStyle: 'long' }).format(new Date(d));
  // Point sur l'onglet Marché : vote ouvert auquel le joueur n'a pas encore pris part
  function setDot() {
    const b = document.querySelector('.tab[data-view="trade"]');
    if (b) b.classList.toggle('has-dot', !!API.ecoServer() && vd?.vote?.statut === 'ouvert' && !vd.moi);
  }
  async function checkVote() {
    if (!API.ecoServer() || navigator.onLine === false) return;
    try { vd = await ECO().voteCurrent(true); } catch (_) { return; }
    if (typeof vd?.pot === 'number') pot = vd.pot;
    setDot(); drawPot();
  }
  async function renderVote() {
    const body = $('#mk-body');
    body.innerHTML = `<p class="t-empty">${T('loading')}</p>`;
    let r = null;
    try { r = await ECO().voteCurrent(); } catch (_) { /* erreur déjà affichée */ }
    if (tab !== 'vote' || !$('#mk-body')) return;
    if (!r) { body.innerHTML = `<p class="t-empty">${T('fail')}</p>`; return; }
    vd = r;
    if (typeof r.pot === 'number') pot = r.pot;
    setDot(); drawPot(); drawVote();
  }
  const gauge = () => { const p = Math.max(1, vd.palier || 1), n = Math.max(0, pot || 0);
    return `<div class="vt-gauge"><div class="vt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p}" aria-valuenow="${Math.min(n, p)}"><i style="width:${Math.min(100, Math.round(100 * n / p))}%"></i></div>
      <p class="vt-gauge-line"><b>${esc(T('gauge', fmt(n), fmt(p)))}</b> <span class="muted">${esc(T('gauge_hint'))}</span></p></div>`; };
  function drawVote() {
    const body = $('#mk-body'), v = vd.vote, me = vd.moi, prix = vd.prix || [];
    const opts = v?.options || [], mineOpt = me && opts.find(o => o.rang === me.option);
    let main = '';
    if (v?.statut === 'ouvert') {
      const next = me ? prix[me.achetees] : null;
      main = `<p class="vt-when">${esc(T('until', when(v.ferme_le)))}</p>
        ${!me && vd.acces ? `<p class="vt-acces" role="status">${esc(sub('acces', vd.acces))}</p>` : ''}
        <div class="vt-opts" role="radiogroup" aria-label="${esc(T('vote_h'))}">${opts.map(o => `<label class="vt-opt${me?.option === o.rang ? ' is-mine' : ''}">
          <input type="radio" name="vt-opt" value="${o.rang}"${me ? ' disabled' : ''}${me?.option === o.rang ? ' checked' : ''}${!me && vd.acces ? ' disabled' : ''}>
          <span class="vt-opt-text"><b>${esc(title(o))}</b>${detail(o) ? `<small>${esc(detail(o))}</small>` : ''}</span></label>`).join('')}</div>
        ${me ? `<p class="vt-mine" role="status">${esc(T('mine', mineOpt ? title(mineOpt) : '?', me.voix))}</p>
          ${next ? `<p class="vt-actions"><button class="btn btn-gold" id="vt-more">${esc(T('vote_more', fmt(next)))}</button></p>` : `<p class="muted">${T('max_votes')}</p>`}`
        : `<p class="vt-actions"><button class="btn btn-gold" id="vt-go" disabled>${T('vote_go')}</button></p>`}`;
    } else if (v?.statut === 'clos') {
      const total = Math.max(1, ...opts.map(o => o.voix || 0));
      main = `<p class="vt-when">${esc(T('closed', when(v.clos_le)))}</p>
        <div class="vt-results">${opts.map(o => `<div class="vt-res${v.gagnante === o.rang ? ' is-win' : ''}${me?.option === o.rang ? ' is-mine' : ''}">
          <div class="vt-res-head"><b>${esc(title(o))}</b>${v.gagnante === o.rang ? `<span class="mk-chip">${T('winner')}</span>` : ''}<span class="vt-res-n">${esc(T('res_line', o.voix || 0, o.votants || 0))}</span></div>
          <div class="vt-bar"><i style="width:${Math.round(100 * (o.voix || 0) / total)}%"></i></div></div>`).join('')}</div>
        ${v.gagnante == null ? `<p class="muted">${T('no_winner')}</p>` : `<p class="vt-delivered">${esc(v.livre_le ? T('delivered', day(v.livre_le)) : T('not_delivered'))}</p>`}
        ${me ? `<p class="vt-mine">${esc(T('mine', mineOpt ? title(mineOpt) : '?', me.voix))}</p>` : ''}
        <h3 class="mk-h">${T('next_h')}</h3>${gauge()}`;
    } else if (v?.statut === 'annule') {
      main = `<p class="vt-cancel"><span>${esc(T('cancelled', day(v.clos_le)))}</span> <em id="vt-reason"></em></p>${gauge()}`;
    } else main = gauge();
    body.innerHTML = `<section class="vt"><p class="vt-back"><button class="btn btn-line btn-sm" id="vt-back">← ${T('back')}</button></p>
      <h2 class="mk-h">${T('vote_h')}</h2><p class="muted vt-intro">${T('vote_intro')}</p>${main}
      <details class="vt-rules"><summary>${T('rules_h')}</summary><ul>${T('rules').map(x => `<li>${x}</li>`).join('')}</ul></details></section>`;
    // Raison d'une annulation (écrite par un admin) : textContent
    const why = body.querySelector('#vt-reason'); if (why) why.textContent = v.raison || '';
    body.querySelector('.vt-opts')?.addEventListener('change', () => { const b = $('#vt-go'); if (b) b.disabled = !body.querySelector('input[name="vt-opt"]:checked'); });
    body.querySelector('#vt-go')?.addEventListener('click', () => {
      const c = body.querySelector('input[name="vt-opt"]:checked');
      if (!c) return toast(T('pick'));
      const o = opts.find(x => x.rang === +c.value);
      if (o && confirm(T('confirm_free', title(o)))) castVote($('#vt-go'), o.rang, 0, T('voted'));
    });
    body.querySelector('#vt-more')?.addEventListener('click', () => {
      const n = prix[me.achetees];
      if (mineOpt && n && confirm(T('confirm_buy', title(mineOpt), fmt(n)))) castVote($('#vt-more'), me.option, 1, T('voted_more'));
    });
  }
  async function castVote(btn, option, n, ok) {
    if (busy) return;
    busy = true; btn.disabled = true; btn.classList.add('is-wait');
    try {
      await ECO().vote(vd.vote.id, option, n);
      SFX.coin?.(); toast(ok); API.renderWallet();
    } catch (_) { SFX.error(); }
    busy = false;
    if (tab === 'vote') renderVote();
  }

  // ---------- Événements ----------
  document.addEventListener('click', e => {
    if (!API.ecoServer() || !e.target.closest('#trade-area')) return;
    if (e.target.closest('#mk-pot')) { SFX.tick(); tab = 'vote'; render(); return; }
    if (e.target.closest('#vt-back')) { SFX.tick(); tab = 'browse'; render(); return; }
    const t = e.target.closest('[data-mk-tab]');
    if (t) { if (t.dataset.mkTab !== tab) { SFX.tick(); tab = t.dataset.mkTab; render(); } return; }
    const g = e.target.closest('[data-go]');
    if (g) return deal(list[+g.dataset.go], g);
    const card = e.target.closest('.mk-ad .t-item[data-key]');
    if (card) { const [id, fin = 'normal'] = card.dataset.key.split('|'); if (BY_ID.has(id)) API.openDetail(id, API.countOf(id, fin) ? fin : 'normal'); }
  });

  // Vote ouvert (point sur l'onglet) : vérifié après le chargement, puis au retour sur la page
  setTimeout(checkVote, 4000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVote(); });
  // Annonces conclues pendant l'absence : vérifié une fois après le chargement, si le joueur a déjà publié au marché
  setTimeout(async () => {
    if (!API.ecoServer() || !store.get() || navigator.onLine === false) return;
    try { const r = await ECO().marketMine(true); if (r) seen(r); } catch (_) { /* silencieux */ }
  }, 6000);

  window.MARKET_UI = {
    render,
    // Message en tête du Marché (lien d'échange par code ouvert en version serveur, trade.js)
    notice: text => { const el = $('#mk-notice'); if (el) { el.textContent = text; el.hidden = false; } else notice = text; },
    // Fiche d'une carte (app.js) : vendre un exemplaire gagné en jouant, chercher les annonces de cette carte
    canSell: (id, fin) => TU().count({ id, fin }) >= 1,
    sell: x => compose('vente', [x]),
    find: c => { tab = 'browse'; filters = { ...FRESH(), q: nm(c), ids: [c.id] }; API.show('trade'); },
  };
})();
