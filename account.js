// Comptes des joueurs : seulement sur la version serveur (config.js en mode « compte », avec l'adresse Supabase).
// Sur la page GitHub (mode « local »), ce fichier ne fait rien.
// Connexion sans mot de passe : un code à 6 chiffres reçu par mail (Supabase Auth), puis choix du pseudo. Le pseudo
// est vérifié par la base (fonction choisir_pseudo, supabase/migrations/) : format, mots interdits, unicité, délai.
// Économie sur le serveur (lot 3, PLAN-LOT3.md) : connecté, le joueur joue sur le serveur ; pièces et cartes sont
// écrites par la base et la partie du navigateur n'en est qu'une copie (ecoServeur, fourni à app.js). Une partie de la
// page GitHub, ou celle jouée dans ce navigateur avant la connexion, peut être reprise une fois par compte (un admin
// peut reprendre plusieurs fois, pour tester ; voir PLAN-COMPTES.md et PLAN-LOT4.md).
// Signalement d'une carte erronée depuis sa fiche (fonction signaler_carte) : vu et traité par les modérateurs (admin.js).
// Marché et vote du pot commun (market.js) : leurs appels à la base passent par ecoServeur (marketList, marketPublish,
// marketDeal…, voteCurrent, vote).
(() => {
  'use strict';
  const CFG = window.BROL_CONFIG || {};
  if (CFG.mode !== 'compte' || !CFG.supabaseUrl || !CFG.supabaseKey) return;
  const API = window.RDL;
  const { esc, toast, SFX } = API;
  const L = () => window.I18N.lang;
  const $ = s => document.querySelector(s);

  // ---------- Textes ----------
  const TX = {
    fr: {
      btn: 'Mon compte', login_h: 'Se connecter', google: 'Continuer avec Google', or: 'ou',
      terms: 'J’ai au moins 13 ans et j’accepte les <a href="cgu" target="_blank">conditions d’utilisation</a> et la <a href="privacy" target="_blank">politique de confidentialité</a>.',
      terms_h: 'Avant de jouer en ligne', terms_new_h: 'Conditions mises à jour',
      terms_intro: 'Pour utiliser ton compte, accepte les conditions d’utilisation et la politique de confidentialité.',
      terms_go: 'Continuer',
      login_intro: 'Pas de mot de passe : on t’envoie un code par mail. Ton compte garde ta partie et ton pseudo.',
      email: 'Adresse e-mail', send: 'Recevoir un code', sending: 'Envoi…',
      code_h: 'Code reçu', code_intro: e => `On a envoyé un code à ${e}. Il est valable 10 minutes (regarde aussi dans les indésirables).`,
      code: 'Code à 6 chiffres', verify: 'Valider', verifying: 'Vérification…',
      resend: 'Renvoyer un code', resend_in: n => `Renvoyer un code (${n} s)`, other_email: 'Changer d’adresse',
      pseudo_h: 'Choisis ton pseudo', pseudo_intro: 'C’est le nom que les autres joueurs verront. Ton adresse e-mail reste privée.',
      pseudo: 'Pseudo', pseudo_rules: '3 à 20 caractères : lettres sans accents, chiffres, et _ . - (pas au début, ni à la fin, ni deux à la suite).',
      pseudo_save: 'Valider ce pseudo', pseudo_change: 'Changer de pseudo', pseudo_change_note: 'Un changement tous les 30 jours au plus.',
      account_h: 'Mon compte', signed_as: 'Connecté avec', logout: 'Se déconnecter', logged_out: 'Tu es déconnecté.',
      hello: p => `Bienvenue, ${p} !`,
      delete: 'Supprimer mon compte', delete_h: 'Supprimer mon compte',
      delete_intro: 'Ton compte, ton pseudo et tout ce qui est enregistré sur le serveur seront effacés, sans retour possible. Ta partie dans ce navigateur reste là.',
      delete_type: p => `Tape ton pseudo (${p}) pour confirmer`, delete_go: 'Supprimer définitivement', deleted: 'Ton compte a été supprimé.',
      cancel: 'Annuler', close: 'Fermer',
      err: {
        email: 'Adresse e-mail invalide.', code: 'Le code fait 6 chiffres.', otp: 'Code incorrect ou expiré.',
        rate: 'Trop de tentatives. Réessaie dans quelques minutes.', net: 'Connexion impossible. Vérifie ton réseau et réessaie.',
        pseudo_format: 'Ce pseudo ne respecte pas les règles ci-dessous.', pseudo_interdit: 'Ce pseudo n’est pas autorisé.',
        pseudo_pris: 'Ce pseudo est déjà pris.', pseudo_trop_tot: 'Tu as déjà changé de pseudo il y a moins de 30 jours.',
        confirm: 'Le pseudo tapé ne correspond pas.', other: 'Une erreur est survenue. Réessaie.',
        dup: 'Cette adresse (ou une variante, comme avec des points ou un « + » chez Gmail) a déjà un compte. Connecte-toi avec l’adresse d’origine.',
        disposable: 'Les adresses jetables ne sont pas acceptées. Utilise ton adresse habituelle.',
        captcha: 'La vérification anti-robots n’est pas terminée. Attends une seconde et réessaie.',
        terms: 'Coche la case pour continuer.',
        import_deja_fait: 'Tu as déjà repris une partie sur ce compte.',
        import_deja_utilise: 'Cette partie a déjà été reprise sur un autre compte.',
        import_invraisemblable: 'Cette partie ne semble pas valide (plus de cartes que de paquets ouverts). Si c’est une erreur, écris à contact@elveli.net.',
        import_invalide: 'Ce fichier n’est pas une partie Brol valide.', compte_suspendu: 'Ce compte est suspendu.',
        deja_signale: 'Tu as déjà signalé cette carte : un modérateur va la regarder.',
        trop_de_signalements: 'Tu as atteint la limite de 10 signalements par 24 heures. Réessaie plus tard.',
        carte_invalide: 'Cette carte ne peut pas être signalée.', motif_invalide: 'Choisis ce qui ne va pas.',
        commentaire_trop_long: 'Le commentaire fait 300 caractères au plus.',
        commentaire_requis: 'Pour « Autre », explique le problème en quelques mots.',
        profil_incomplet: 'Choisis d’abord ton pseudo et accepte les conditions dans « Mon compte ».',
        // Économie sur le serveur (supabase/migrations/…_economy.sql)
        non_connecte: 'Connecte-toi pour jouer en ligne.', economie_fermee: 'Le jeu en ligne est en pause. Réessaie plus tard.',
        economie_serveur: 'Le jeu a été mis à jour : recharge la page.', trop_rapide: 'Doucement ! Attends quelques secondes et réessaie.',
        pieces_insuffisantes: 'Pas assez de pièces', plus_de_gratuit: 'Plus de paquet gratuit pour l’instant.',
        pas_de_ticket: 'Plus de ticket pour ce paquet.', limite_du_jour: 'Limite du jour atteinte pour ce paquet. Reviens demain.',
        album_complet: 'Album complet : plus aucune carte à découvrir !', deja_pris: 'Déjà reçu.', pot_vide: 'Le pot est encore vide.', pas_pret: 'Pas encore atteint.',
        niveau_pas_atteint: 'Niveau pas encore atteint.', deja_reclame: 'Récompense de ce niveau déjà récupérée.',
        rien_a_vendre: 'Rien à vendre.', pas_assez_de_doublons: 'Pas assez de doublons (les cartes importées ou reprises ne se fusionnent pas).',
        plafond_minijeux: 'Plafond quotidien des mini-jeux atteint.', plafond_importees: 'Plafond de revente des cartes reprises atteint (50 000 pièces) : la carte reste dans ton album.',
        paquet_inconnu: 'Ce paquet n’existe plus : recharge la page.', paquet_indisponible: 'Ce paquet n’est pas en vente aujourd’hui.',
        requete_invalide: 'Action refusée par le serveur : recharge la page.', version_conflit: 'Partie changée sur un autre appareil : réessaie.',
        net_eco: 'Pas de réseau : réessaie dans un instant.',
        // Marché (supabase/migrations/…_market.sql)
        marche_ferme: 'Le marché est fermé pour l’instant. Réessaie plus tard.',
        marche_trop_tot: 'Le marché s’ouvre quand ton compte a 3 jours et 30 paquets ouverts sur le serveur (ni ceux d’une partie reprise, ni ceux payés en pièces reprises ne comptent).',
        annonce_inconnue: 'Cette annonce n’existe plus.', annonce_prise: 'Trop tard : cette annonce n’est plus disponible.',
        annonce_expiree: 'Cette annonce a expiré.', prix_hors_bornes: 'Prix hors des bornes permises pour cette carte.',
        cartes_manquantes: 'Il te manque des cartes (gagnées en jouant) pour cela.',
        carte_non_echangeable: 'Les cartes importées ou reprises (dont celles tirées avec des pièces reprises) ne vont pas au marché : seulement celles gagnées en jouant.',
        trop_d_annonces: 'Trop d’annonces : 10 ouvertes et 20 par jour au plus.',
        limite_transactions: 'Limite atteinte : 10 transactions par jour.', limite_paire: 'Limite atteinte : 3 transactions par semaine avec le même joueur.',
        limite_dons: 'Limite atteinte : 3 dons pris par jour.', deja_remontee: 'Annonce déjà remontée aujourd’hui.',
        pas_soi_meme: 'C’est ta propre annonce.',
        pieces_reprises: 'Les pièces reprises (ancienne partie et ce qu’elle rapporte : reventes, séries, succès) ne servent pas au marché ni aux voix du vote (seulement aux paquets et au reste du jeu).',
        // Vote du pot commun (supabase/migrations/…_common_pot_vote.sql)
        vote_ferme: 'Ce vote est terminé.', vote_trop_tot: 'Pour voter, ton compte doit avoir 7 jours.',
        vote_paquets: 'Pour voter, ouvre d’abord 30 paquets sur le serveur (ni ceux d’une partie reprise, ni ceux payés en pièces reprises ne comptent).',
        vote_niveau: 'Pour voter, atteins d’abord le niveau 5.', option_inconnue: 'Ce choix n’existe pas : recharge la page.',
        autre_option: 'Tu as déjà voté pour un autre choix : tes voix en plus vont au même.', trop_de_voix: 'Tu as déjà toutes tes voix (1 gratuite et 5 achetées).',
        // Mini-jeux vérifiés par le serveur (supabase/migrations/…_minigames_verified.sql)
        partie_inconnue: 'Partie introuvable sur le serveur : relance le jeu.', partie_finie: 'Cette partie est déjà terminée (ou a expiré).',
        reponses_invalides: 'Réponses refusées par le serveur : recharge la page.', trop_rapide_jeu: 'Partie jouée trop vite : pas de pièces cette fois.',
        mise_a_jour: 'Le jeu a été mis à jour : recharge la page.',
        // Classements (supabase/migrations/…_rankings.sql)
        classement_inconnu: 'Ce classement n’existe pas : recharge la page.',
        profil_introuvable: 'Ce profil n’est pas visible.',
        // Bêta fermée (supabase/migrations/…_beta_access.sql)
        beta_fermee: 'Brol est en bêta fermée : entre ton code d’accès dans « Mon compte ».',
        code_invalide: 'Ce code n’est pas valable.', beta_trop: 'Trop d’essais. Réessaie dans une heure.',
      },
      sync: { ok: 'Ta partie est gardée sur le serveur.', pending: 'Connexion au serveur…',
        offline: 'Hors ligne : achats, carte du jour, fusions et pièces des mini-jeux reviennent avec le réseau.', error: 'Serveur indisponible pour l’instant : réessaie plus tard.',
        suspended: 'Compte suspendu : ta partie est figée.' },
      eco_first_h: 'Ta partie est maintenant gardée sur le serveur',
      eco_first: 'Pièces et cartes sont désormais tenues par le serveur : tu retrouves ta partie sur tous tes appareils. Ouvrir un paquet demande le réseau ; hors ligne, les mini-jeux se jouent sans pièces.',
      eco_ok: 'C’est parti',
      game_gain: n => `+${n} pièces`,
      meta: (n, c, p) => `${n} cartes · ${c} pièces · ${p} paquets ouverts`,
      logged_out_saved: 'Tu es déconnecté. Ta partie t’attend sur le serveur.',
      import_btn: 'Reprendre ma partie GitHub',
      import_confirm: (n, c) => `Reprendre ta partie de la page GitHub ?\n\n${n} cartes rejoignent ta collection (5 exemplaires au plus par carte, importés : grisés, non échangeables, revente plafonnée) et ${c} pièces ton porte-monnaie (10 000 au plus). Une seule reprise par compte, et chaque partie ne peut être reprise qu’une fois.`,
      import_login: 'Connecte-toi d’abord : la partie de la page GitHub est reprise sur ton compte.',
      import_done: (n, c) => `Partie reprise : ${n} cartes et ${c} pièces. Badge Pionnier débloqué !`,
      import_trop: 'Limite de 20 imports par jour atteinte : réessaie demain.',
      pionnier: 'Pionnier', pionnier_title: 'A repris sa partie de la page GitHub',
      admin_btn: 'Administration', suspended: r => `Ton compte est suspendu : ${r}. Écris à contact@elveli.net pour en parler.`,
      report_h: 'Qu’est-ce qui ne va pas ?',
      motif: { photo_absente: 'Photo absente', photo_fausse: 'Mauvaise photo', photo_cadrage: 'Photo mal cadrée',
        info_fausse: 'Information fausse', autre: 'Autre' },
      report_comment: 'Commentaire (facultatif, obligatoire pour « Autre »)', report_count: n => `${n} / 300`,
      report_note: 'Visible par les modérateurs, n’y mets aucune info personnelle.',
      report_send: 'Envoyer', report_sending: 'Envoi…', report_thanks: 'Merci ! Un modérateur va regarder cette carte.',
      report_pending: 'Signalement en cours', report_login: 'Connecte-toi pour signaler une erreur sur une carte.',
      reports_line: (n, m) => `Signalements de cartes : ${n} confirmé${n > 1 ? 's' : ''}, ${m} en attente`,
      rank_show: 'Apparaître dans les classements et montrer mon profil aux autres joueurs',
      beta_h: 'Brol est en bêta fermée', beta_intro: 'Entre ton code d’accès pour jouer avec ton compte.',
      beta_code: 'Code d’accès', beta_go: 'Valider le code', beta_ok: 'Code accepté : bienvenue dans la bêta !',
    },
    nl: {
      btn: 'Mijn account', login_h: 'Aanmelden', google: 'Doorgaan met Google', or: 'of',
      terms: 'Ik ben minstens 13 jaar en aanvaard de <a href="cgu" target="_blank">gebruiksvoorwaarden</a> en het <a href="privacy" target="_blank">privacybeleid</a>.',
      terms_h: 'Voor je online speelt', terms_new_h: 'Voorwaarden bijgewerkt',
      terms_intro: 'Om je account te gebruiken, aanvaard je de gebruiksvoorwaarden en het privacybeleid.',
      terms_go: 'Verdergaan',
      login_intro: 'Geen wachtwoord: we sturen je een code per e-mail. Je account bewaart je spel en je schuilnaam.',
      email: 'E-mailadres', send: 'Code ontvangen', sending: 'Verzenden…',
      code_h: 'Ontvangen code', code_intro: e => `We hebben een code gestuurd naar ${e}. Hij is 10 minuten geldig (kijk ook bij ongewenste mail).`,
      code: 'Code van 6 cijfers', verify: 'Bevestigen', verifying: 'Controleren…',
      resend: 'Nieuwe code sturen', resend_in: n => `Nieuwe code sturen (${n} s)`, other_email: 'Ander adres',
      pseudo_h: 'Kies je schuilnaam', pseudo_intro: 'Dit is de naam die andere spelers zien. Je e-mailadres blijft privé.',
      pseudo: 'Schuilnaam', pseudo_rules: '3 tot 20 tekens: letters zonder accenten, cijfers en _ . - (niet vooraan, niet achteraan, niet twee na elkaar).',
      pseudo_save: 'Deze schuilnaam kiezen', pseudo_change: 'Schuilnaam wijzigen', pseudo_change_note: 'Hoogstens één wijziging per 30 dagen.',
      account_h: 'Mijn account', signed_as: 'Aangemeld met', logout: 'Afmelden', logged_out: 'Je bent afgemeld.',
      hello: p => `Welkom, ${p}!`,
      delete: 'Mijn account verwijderen', delete_h: 'Mijn account verwijderen',
      delete_intro: 'Je account, je schuilnaam en alles wat op de server staat, worden definitief gewist. Je spel in deze browser blijft bestaan.',
      delete_type: p => `Typ je schuilnaam (${p}) om te bevestigen`, delete_go: 'Definitief verwijderen', deleted: 'Je account is verwijderd.',
      cancel: 'Annuleren', close: 'Sluiten',
      err: {
        email: 'Ongeldig e-mailadres.', code: 'De code heeft 6 cijfers.', otp: 'Verkeerde of verlopen code.',
        rate: 'Te veel pogingen. Probeer het over enkele minuten opnieuw.', net: 'Geen verbinding. Controleer je netwerk en probeer opnieuw.',
        pseudo_format: 'Deze schuilnaam volgt de regels hieronder niet.', pseudo_interdit: 'Deze schuilnaam is niet toegestaan.',
        pseudo_pris: 'Deze schuilnaam is al bezet.', pseudo_trop_tot: 'Je hebt je schuilnaam minder dan 30 dagen geleden al gewijzigd.',
        confirm: 'De getypte schuilnaam klopt niet.', other: 'Er ging iets mis. Probeer opnieuw.',
        dup: 'Dit adres (of een variant, met punten of een „+” bij Gmail) heeft al een account. Meld je aan met het oorspronkelijke adres.',
        disposable: 'Wegwerpadressen worden niet aanvaard. Gebruik je gewone adres.',
        captcha: 'De controle tegen robots is nog niet klaar. Wacht even en probeer opnieuw.',
        terms: 'Vink het vakje aan om verder te gaan.',
        import_deja_fait: 'Je hebt al een spel overgenomen op dit account.',
        import_deja_utilise: 'Dit spel is al overgenomen op een ander account.',
        import_invraisemblable: 'Dit spel lijkt niet geldig (meer kaarten dan geopende pakjes). Is dat een vergissing, schrijf dan naar contact@elveli.net.',
        import_invalide: 'Dit bestand is geen geldig Brol-spel.', compte_suspendu: 'Dit account is geschorst.',
        deja_signale: 'Je hebt deze kaart al gemeld: een moderator bekijkt ze.',
        trop_de_signalements: 'Je hebt de limiet van 10 meldingen per 24 uur bereikt. Probeer later opnieuw.',
        carte_invalide: 'Deze kaart kan niet gemeld worden.', motif_invalide: 'Kies wat er niet klopt.',
        commentaire_trop_long: 'De opmerking telt hoogstens 300 tekens.',
        commentaire_requis: 'Leg bij „Andere” het probleem in een paar woorden uit.',
        profil_incomplet: 'Kies eerst je schuilnaam en aanvaard de voorwaarden in „Mijn account”.',
        non_connecte: 'Meld je aan om online te spelen.', economie_fermee: 'Het online spel is gepauzeerd. Probeer later opnieuw.',
        economie_serveur: 'Het spel is bijgewerkt: herlaad de pagina.', trop_rapide: 'Rustig aan! Wacht enkele seconden en probeer opnieuw.',
        pieces_insuffisantes: 'Niet genoeg munten', plus_de_gratuit: 'Even geen gratis pakje meer.',
        pas_de_ticket: 'Geen ticket meer voor dit pakje.', limite_du_jour: 'Daglimiet bereikt voor dit pakje. Kom morgen terug.',
        album_complet: 'Album compleet: geen kaarten meer te ontdekken!', deja_pris: 'Al ontvangen.', pot_vide: 'De pot is nog leeg.', pas_pret: 'Nog niet bereikt.',
        niveau_pas_atteint: 'Niveau nog niet bereikt.', deja_reclame: 'Beloning van dit niveau al opgehaald.',
        rien_a_vendre: 'Niets te verkopen.', pas_assez_de_doublons: 'Niet genoeg dubbels (overgenomen kaarten worden niet gefuseerd).',
        plafond_minijeux: 'Daglimiet van de minispellen bereikt.', plafond_importees: 'Verkooplimiet voor overgenomen kaarten bereikt (50 000 munten): de kaart blijft in je album.',
        paquet_inconnu: 'Dit pakje bestaat niet meer: herlaad de pagina.', paquet_indisponible: 'Dit pakje is vandaag niet te koop.',
        requete_invalide: 'Actie geweigerd door de server: herlaad de pagina.', version_conflit: 'Spel gewijzigd op een ander toestel: probeer opnieuw.',
        net_eco: 'Geen netwerk: probeer zo meteen opnieuw.',
        marche_ferme: 'De markt is nu gesloten. Probeer later opnieuw.',
        marche_trop_tot: 'De markt gaat open als je account 3 dagen oud is en je 30 pakjes op de server geopend hebt (die van een overgenomen spel en die betaald met overgenomen munten tellen niet mee).',
        annonce_inconnue: 'Dit zoekertje bestaat niet meer.', annonce_prise: 'Te laat: dit zoekertje is niet meer beschikbaar.',
        annonce_expiree: 'Dit zoekertje is verlopen.', prix_hors_bornes: 'Prijs buiten de toegestane grenzen voor deze kaart.',
        cartes_manquantes: 'Je mist kaarten (spelend gewonnen) om dat te doen.',
        carte_non_echangeable: 'Overgenomen kaarten (ook die getrokken met overgenomen munten) gaan niet naar de markt: alleen spelend gewonnen kaarten.',
        trop_d_annonces: 'Te veel zoekertjes: hoogstens 10 open en 20 per dag.',
        limite_transactions: 'Limiet bereikt: 10 transacties per dag.', limite_paire: 'Limiet bereikt: 3 transacties per week met dezelfde speler.',
        limite_dons: 'Limiet bereikt: 3 geschenken per dag.', deja_remontee: 'Zoekertje vandaag al naar boven gehaald.',
        pas_soi_meme: 'Dit is je eigen zoekertje.',
        pieces_reprises: 'Overgenomen munten (vroeger spel en wat het opbrengt: verkopen, reeksen, prestaties) gelden niet op de markt en niet voor stemmen (alleen voor pakjes en de rest van het spel).',
        vote_ferme: 'Deze stemming is afgelopen.', vote_trop_tot: 'Om te stemmen moet je account 7 dagen oud zijn.',
        vote_paquets: 'Om te stemmen open je eerst 30 pakjes op de server (die van een overgenomen spel en die betaald met overgenomen munten tellen niet mee).',
        vote_niveau: 'Om te stemmen bereik je eerst niveau 5.', option_inconnue: 'Deze keuze bestaat niet: herlaad de pagina.',
        autre_option: 'Je stemde al voor een andere keuze: je extra stemmen gaan naar dezelfde.', trop_de_voix: 'Je hebt al al je stemmen (1 gratis en 5 gekocht).',
        partie_inconnue: 'Spel niet gevonden op de server: start het opnieuw.', partie_finie: 'Dit spel is al afgelopen (of verlopen).',
        reponses_invalides: 'Antwoorden geweigerd door de server: herlaad de pagina.', trop_rapide_jeu: 'Te snel gespeeld: deze keer geen munten.',
        mise_a_jour: 'Het spel is bijgewerkt: herlaad de pagina.',
        classement_inconnu: 'Dit klassement bestaat niet: herlaad de pagina.',
        profil_introuvable: 'Dit profiel is niet zichtbaar.',
        beta_fermee: 'Brol is in gesloten bèta: geef je toegangscode in bij „Mijn account”.',
        code_invalide: 'Deze code is niet geldig.', beta_trop: 'Te veel pogingen. Probeer over een uur opnieuw.',
      },
      sync: { ok: 'Je spel wordt op de server bewaard.', pending: 'Verbinden met de server…',
        offline: 'Offline: aankopen, dagkaart, fusies en munten van de minispellen komen terug met het netwerk.', error: 'Server nu niet beschikbaar: probeer later opnieuw.',
        suspended: 'Account geschorst: je spel staat stil.' },
      eco_first_h: 'Je spel wordt nu op de server bewaard',
      eco_first: 'Munten en kaarten worden voortaan door de server bijgehouden: je vindt je spel terug op al je toestellen. Een pakje openen vraagt netwerk; offline speel je de minispellen zonder munten.',
      eco_ok: 'Aan de slag',
      game_gain: n => `+${n} munten`,
      meta: (n, c, p) => `${n} kaarten · ${c} munten · ${p} pakjes geopend`,
      logged_out_saved: 'Je bent afgemeld. Je spel wacht op de server op je.',
      import_btn: 'Mijn GitHub-spel overnemen',
      import_confirm: (n, c) => `Je spel van de GitHub-pagina overnemen?\n\n${n} kaarten komen bij je verzameling (hoogstens 5 exemplaren per kaart, overgenomen: grijs, niet te ruilen, beperkte verkoop) en ${c} munten in je portemonnee (hoogstens 10 000). Eén overname per account, en elk spel kan maar één keer overgenomen worden.`,
      import_login: 'Meld je eerst aan: het spel van de GitHub-pagina wordt op je account overgenomen.',
      import_done: (n, c) => `Spel overgenomen: ${n} kaarten en ${c} munten. Badge Pionier vrijgespeeld!`,
      import_trop: 'Limiet van 20 imports per dag bereikt: probeer morgen opnieuw.',
      pionnier: 'Pionier', pionnier_title: 'Nam zijn spel over van de GitHub-pagina',
      admin_btn: 'Beheer', suspended: r => `Je account is geschorst: ${r}. Schrijf naar contact@elveli.net om erover te praten.`,
      report_h: 'Wat klopt er niet?',
      motif: { photo_absente: 'Foto ontbreekt', photo_fausse: 'Verkeerde foto', photo_cadrage: 'Foto slecht ingekaderd',
        info_fausse: 'Foute informatie', autre: 'Andere' },
      report_comment: 'Opmerking (niet verplicht, wel bij „Andere”)', report_count: n => `${n} / 300`,
      report_note: 'Zichtbaar voor de moderatoren, zet er geen persoonlijke gegevens in.',
      report_send: 'Versturen', report_sending: 'Verzenden…', report_thanks: 'Bedankt! Een moderator bekijkt deze kaart.',
      report_pending: 'Melding in behandeling', report_login: 'Meld je aan om een fout op een kaart te melden.',
      reports_line: (n, m) => `Kaartmeldingen: ${n} bevestigd, ${m} in behandeling`,
      rank_show: 'In de klassementen verschijnen en mijn profiel aan de andere spelers tonen',
      beta_h: 'Brol is in gesloten bèta', beta_intro: 'Geef je toegangscode in om met je account te spelen.',
      beta_code: 'Toegangscode', beta_go: 'Code bevestigen', beta_ok: 'Code aanvaard: welkom in de bèta!',
    },
  };
  const T = (k, ...a) => { const v = TX[L()][k] ?? TX.fr[k]; return typeof v === 'function' ? v(...a) : v; };
  const ST = k => TX[L()].sync[k] || TX.fr.sync[k];
  const E = k => TX[L()].err[k] || TX.fr.err[k];
  // Version des conditions (/cgu) et de la politique de confidentialité (/privacy) : à changer (date du jour) quand
  // l'une des deux change sur le fond ; chaque joueur devra alors les accepter à nouveau (fonction accepter_cgu)
  const LEGAL_VERSION = '2026-10-23';
  // Case cochée avant la connexion : retenue le temps de l'aller-retour vers Google (sessionStorage)
  const TERMS_KEY = 'brol-cgu-ok';
  const termsPreChecked = () => { try { return sessionStorage.getItem(TERMS_KEY) === LEGAL_VERSION; } catch (_) { return false; } };
  const rememberTerms = () => { try { sessionStorage.setItem(TERMS_KEY, LEGAL_VERSION); } catch (_) { /* rien */ } };
  // Même règle que la base (contrainte pseudo_format) : un premier tri dans le navigateur, la base a le dernier mot
  const PSEUDO_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{1,18}[A-Za-z0-9]$/;
  const pseudoOk = p => PSEUDO_RE.test(p) && !/[_.-]{2}/.test(p);
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';

  // ---------- Supabase ----------
  let sb = null, sbLoading = null;
  const loadScript = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  async function client() {
    if (sb) return sb;
    if (!window.supabase) await (sbLoading ||= loadScript('vendor/supabase.js'));
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
      // pkce + detectSessionInUrl : au retour de Google, le jeu échange le code reçu dans l'adresse contre une session
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    });
    return sb;
  }
  // Message d'erreur affichable (jamais le détail technique, qui reste dans la console)
  function errText(e) {
    console.warn('[compte]', e);
    const m = String(e?.message || e?.code || '');
    for (const k of ['pseudo_format', 'pseudo_interdit', 'pseudo_pris', 'pseudo_trop_tot', 'import_deja_fait', 'import_deja_utilise',
      'import_invraisemblable', 'import_invalide', 'compte_suspendu', 'deja_signale', 'trop_de_signalements', 'carte_invalide',
      'motif_invalide', 'commentaire_trop_long', 'commentaire_requis', 'profil_incomplet', 'non_connecte', 'economie_fermee',
      'economie_serveur', 'trop_rapide_jeu', 'trop_rapide', 'pieces_insuffisantes', 'plus_de_gratuit', 'pas_de_ticket', 'limite_du_jour', 'album_complet',
      'deja_pris', 'pot_vide', 'pas_pret', 'rien_a_vendre', 'pas_assez_de_doublons', 'plafond_minijeux', 'plafond_importees', 'paquet_inconnu',
      'paquet_indisponible', 'requete_invalide', 'version_conflit', 'marche_ferme', 'marche_trop_tot', 'annonce_inconnue', 'annonce_prise',
      'annonce_expiree', 'prix_hors_bornes', 'cartes_manquantes', 'carte_non_echangeable', 'trop_d_annonces', 'limite_transactions',
      'limite_paire', 'limite_dons', 'deja_remontee', 'pas_soi_meme', 'pieces_reprises', 'partie_inconnue', 'partie_finie',
      'reponses_invalides', 'mise_a_jour', 'niveau_pas_atteint', 'deja_reclame', 'vote_ferme', 'vote_trop_tot', 'vote_paquets', 'vote_niveau',
      'option_inconnue', 'autre_option', 'trop_de_voix', 'classement_inconnu', 'profil_introuvable', 'beta_fermee', 'code_invalide']) if (m.includes(k)) return E(k);
    // Refus du hook d'inscription (supabase/migrations/…_signup_guard.sql)
    if (m.includes('email_doublon')) return E('dup');
    if (m.includes('email_jetable')) return E('disposable');
    if (/captcha/i.test(m)) return E('captcha');
    if (e?.status === 429 || /rate limit|too many/i.test(m)) return E('rate');
    if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(m) || e?.code === 'otp_expired') return E('otp');
    if (e instanceof TypeError || /fetch|network/i.test(m)) return E('net');
    return E('other');
  }

  // ---------- Anti-robots (Cloudflare Turnstile) et Google ----------
  // Turnstile : seulement si une clé de site est configurée (variable TURNSTILE_SITE_KEY au déploiement). Le jeton,
  // à usage unique, accompagne chaque demande de code ; Supabase le vérifie avec la clé secrète.
  // Google : bouton affiché seulement si le fournisseur est activé dans Supabase (lu dans /auth/v1/settings).
  let captcha = null, tsWidget = null, tsLoading = null, google = false;
  async function renderCaptcha() {
    if (!CFG.turnstileKey) return;
    const box = dlg.querySelector('.acct-captcha');
    if (tsWidget !== null) { try { window.turnstile.remove(tsWidget); } catch (_) { /* déjà retiré */ } tsWidget = null; }
    captcha = null;
    if (!box) return;
    try {
      if (!window.turnstile) await (tsLoading ||= loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'));
      tsWidget = window.turnstile.render(box, {
        sitekey: CFG.turnstileKey, language: L(), appearance: 'interaction-only',
        callback: t => { captcha = t; }, 'expired-callback': () => { captcha = null; }, 'error-callback': () => { captcha = null; },
      });
    } catch (err) { console.warn('[compte]', err); }
  }
  async function loadSettings() {
    try {
      const r = await fetch(CFG.supabaseUrl + '/auth/v1/settings', { headers: { apikey: CFG.supabaseKey } });
      google = !!(await r.json())?.external?.google;
    } catch (_) { google = false; }
  }
  const GOOGLE_G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.7 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.2 5.6c4.2-3.9 7.1-9.6 7.1-17.1z"/><path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.7 2.3-8.7 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';

  // ---------- État ----------
  let session = null, profil = null;
  // Bêta fermée : la base a refusé le compte (beta_fermee) tant qu'aucun code d'accès n'a été validé
  let beta = false;
  let step = 'email', email = '', draft = '', resendAt = 0, resendTimer = null, busy = false, msg = '', deleting = false;
  async function loadProfil() {
    profil = null;
    if (!session) return;
    const { data, error } = await sb.from('profils').select('pseudo, pseudo_change_le, role, cgu_version, pionnier_le, import_rouvert_le, suspendu_le, suspension_raison, classements_caches, beta_le').maybeSingle();
    if (error) throw error;
    profil = data || { pseudo: null };
    loadReports(); // sans attendre : seulement le bouton des fiches et le succès Œil de lynx en dépendent
  }
  const pseudo = () => profil?.pseudo || '';
  const termsOk = () => profil?.cgu_version === LEGAL_VERSION;
  // Après la connexion : si la case a été cochée juste avant, l'acceptation est enregistrée sans redemander
  async function acceptTermsIfChecked() {
    if (!session || termsOk() || !termsPreChecked()) return;
    const { error } = await sb.rpc('accepter_cgu', { v: LEGAL_VERSION });
    if (error) throw error;
    profil = { ...profil, cgu_version: LEGAL_VERSION };
  }
  let termsChecked = false; // case cochée dans cette fenêtre (gardée quand l'écran se redessine)
  const termsBox = () => `<label class="acct-check"><input type="checkbox" id="acct-terms"${termsChecked || termsPreChecked() ? ' checked' : ''}><span>${T('terms')}</span></label>`;

  // ---------- Bouton et fenêtre ----------
  const btn = document.createElement('button');
  btn.id = 'account-btn';
  btn.className = 'icon-btn account-btn';
  btn.innerHTML = ICON + '<span class="acct-name"></span>';
  $('#lang-btn').before(btn);
  const dlg = document.createElement('dialog');
  dlg.id = 'account-dlg';
  dlg.className = 'side-dlg acct-dlg';
  document.body.appendChild(dlg);

  function renderBtn() {
    btn.setAttribute('aria-label', T('btn'));
    btn.title = T('btn');
    btn.querySelector('.acct-name').textContent = pseudo();
    btn.classList.toggle('is-in', !!session);
    // Bouton du pied de page : ici, une partie importée s'ajoute au compte (une fois) au lieu de remplacer la partie
    const imp = $('#import');
    if (imp) { imp.removeAttribute('data-i18n'); imp.textContent = T('import_btn'); }
    maybeSync();
  }
  const field = (id, label, attrs) => `<label class="acct-field" for="${id}"><span>${label}</span><input id="${id}" ${attrs}></label>`;
  const msgHTML = () => `<p class="acct-msg" id="acct-msg" role="alert" aria-live="assertive"${msg ? '' : ' hidden'}>${esc(msg)}</p>`;
  function render() {
    renderBtn();
    let body;
    if (!session && step === 'email') {
      body = `<h2>${T('login_h')}</h2><p class="acct-intro">${T('login_intro')}</p>
        ${google ? `${termsBox()}<button class="btn btn-line acct-google" id="acct-google" type="button">${GOOGLE_G}${T('google')}</button><p class="acct-or"><span>${T('or')}</span></p>` : ''}
        <form id="acct-form" novalidate>${field('acct-email', T('email'), `type="email" name="email" autocomplete="email" inputmode="email" required value="${esc(email)}"`)}
        ${google ? '' : termsBox()}
        <div class="acct-captcha"></div>
        ${msgHTML()}<button class="btn btn-gold" type="submit"${busy ? ' disabled' : ''}>${busy ? T('sending') : T('send')}</button></form>`;
    } else if (!session) {
      const wait = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      body = `<h2>${T('code_h')}</h2><p class="acct-intro">${esc(T('code_intro', email))}</p>
        <form id="acct-form" novalidate>${field('acct-code', T('code'), `type="text" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required value="${esc(draft)}"`)}
        ${msgHTML()}<button class="btn btn-gold" type="submit"${busy ? ' disabled' : ''}>${busy ? T('verifying') : T('verify')}</button></form>
        <div class="acct-captcha"></div>
        <div class="acct-links"><button class="btn-link" id="acct-resend"${wait ? ' disabled' : ''}>${wait ? T('resend_in', wait) : T('resend')}</button>
        <button class="btn-link" id="acct-other">${T('other_email')}</button></div>`;
    } else if (deleting) {
      body = `<h2>${T('delete_h')}</h2><p class="acct-intro">${T('delete_intro')}</p>
        <form id="acct-form" novalidate>${field('acct-confirm', esc(T('delete_type', pseudo() || '—')), 'type="text" autocomplete="off" required')}
        ${msgHTML()}<div class="acct-actions"><button class="btn btn-danger" type="submit"${busy ? ' disabled' : ''}>${T('delete_go')}</button>
        <button class="btn btn-line" type="button" id="acct-cancel">${T('cancel')}</button></div></form>`;
    } else if (!termsOk()) {
      body = `<h2>${T(profil?.cgu_version ? 'terms_new_h' : 'terms_h')}</h2><p class="acct-intro">${T('terms_intro')}</p>
        <form id="acct-form" novalidate>${termsBox()}
        ${msgHTML()}<div class="acct-actions"><button class="btn btn-gold" type="submit"${busy ? ' disabled' : ''}>${T('terms_go')}</button>
        <button class="btn btn-line" type="button" id="acct-logout">${T('logout')}</button></div></form>`;
    } else if (!pseudo() || step === 'pseudo') {
      body = `<h2>${T(pseudo() ? 'pseudo_change' : 'pseudo_h')}</h2><p class="acct-intro">${T('pseudo_intro')}</p>
        <form id="acct-form" novalidate>${field('acct-pseudo', T('pseudo'), `type="text" autocomplete="nickname" maxlength="20" spellcheck="false" autocapitalize="off" aria-describedby="acct-rules" required value="${esc(draft || pseudo())}"`)}
        <p class="acct-rules" id="acct-rules">${T('pseudo_rules')}${pseudo() ? ' ' + T('pseudo_change_note') : ''}</p>
        ${msgHTML()}<div class="acct-actions"><button class="btn btn-gold" type="submit"${busy ? ' disabled' : ''}>${T('pseudo_save')}</button>
        ${pseudo() ? `<button class="btn btn-line" type="button" id="acct-cancel">${T('cancel')}</button>` : ''}</div></form>`;
    } else if (beta) {
      // Bêta fermée : code d'accès (la base vérifie tout, même message pour tout code refusé)
      body = `<h2>${T('beta_h')}</h2><p class="acct-intro">${T('beta_intro')}</p>
        <form id="acct-form" novalidate>${field('acct-beta', T('beta_code'), `type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="60" required value="${esc(draft)}"`)}
        ${msgHTML()}<div class="acct-actions"><button class="btn btn-gold" type="submit"${busy ? ' disabled' : ''}>${busy ? T('verifying') : T('beta_go')}</button>
        <button class="btn btn-line" type="button" id="acct-logout">${T('logout')}</button></div></form>
        <p class="acct-danger"><button class="btn-link" id="acct-delete">${T('delete')}</button></p>`;
    } else {
      body = `<h2>${T('account_h')}</h2>
        <p class="acct-who"><b class="acct-pseudo"></b><span>${T('signed_as')} <span class="acct-email"></span></span></p>
        ${profil?.pionnier_le ? `<p class="acct-badge" title="${T('pionnier_title')}">${T('pionnier')}</p>` : ''}
        ${profil?.suspendu_le ? '<p class="acct-msg acct-suspended"></p>' : ''}
        <p class="acct-reports" id="acct-reports" hidden></p>
        ${staff() ? `<p><button class="btn btn-line" id="acct-admin">${T('admin_btn')}</button></p>` : ''}
        <div class="acct-save"><p class="acct-sync" id="acct-sync" role="status">${ST(ecoState === 'off' ? 'pending' : ecoState)}</p>
        ${profil?.pionnier_le && profil?.role !== 'admin' && !profil?.import_rouvert_le ? '' : `<button class="btn btn-line" id="acct-import">${T('import_btn')}</button>`}</div>
        ${profil?.suspendu_le ? '' : `<label class="acct-check acct-rank"><input type="checkbox" id="acct-rank"${profil?.classements_caches ? '' : ' checked'}${busy ? ' disabled' : ''}><span>${T('rank_show')}</span></label>`}
        ${msgHTML()}<div class="acct-actions"><button class="btn btn-line" id="acct-pseudo-change">${T('pseudo_change')}</button>
        <button class="btn btn-line" id="acct-logout">${T('logout')}</button></div>
        <p class="acct-danger"><button class="btn-link" id="acct-delete">${T('delete')}</button></p>`;
    }
    dlg.innerHTML = `<button class="close" id="acct-close" aria-label="${T('close')}">×</button>${body}`;
    // Pseudo et adresse : textContent, jamais interprétés comme du HTML
    const w = dlg.querySelector('.acct-pseudo'); if (w) w.textContent = pseudo();
    const m = dlg.querySelector('.acct-email'); if (m) m.textContent = session?.user?.email || '';
    const su = dlg.querySelector('.acct-suspended'); if (su) su.textContent = T('suspended', profil.suspension_raison || '—');
    drawReports();
    renderCaptcha();
  }
  // Modérateur ou admin (affichage seulement : chaque action d'administration est vérifiée par la base, admin.js)
  const staff = () => !!session && !profil?.suspendu_le && ['modo', 'admin'].includes(profil?.role);
  const focusFirst = () => dlg.querySelector('input, .acct-actions .btn, #acct-close')?.focus();
  function setMsg(text) { msg = text; render(); focusFirst(); }
  // Changement d'écran : on oublie ce qui avait été tapé dans l'écran précédent
  const go = st => { step = st; draft = ''; msg = ''; };

  async function open() {
    SFX.tick();
    msg = ''; draft = ''; deleting = false;
    if (session && pseudo()) step = 'account';
    render();
    dlg.showModal();
    focusFirst();
  }
  btn.addEventListener('click', open);
  $('#lang-btn').addEventListener('click', () => setTimeout(() => { renderBtn(); if (dlg.open) render(); }));

  function tickResend() {
    clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      if (Date.now() >= resendAt) clearInterval(resendTimer);
      const b = dlg.querySelector('#acct-resend');
      if (!b) return;
      const wait = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      b.disabled = wait > 0; b.textContent = wait ? T('resend_in', wait) : T('resend');
    }, 1000);
  }
  // captchaToken : lu AVANT tout nouvel affichage (render() remplace le widget, et le jeton avec lui)
  async function sendCode(captchaToken) {
    if (CFG.turnstileKey && !captchaToken) throw new Error('captcha');
    const { error } = await (await client()).auth.signInWithOtp({ email, options: { shouldCreateUser: true, captchaToken: captchaToken || undefined } });
    if (error) throw error;
    resendAt = Date.now() + 60000;
    tickResend();
  }

  dlg.addEventListener('click', async e => {
    if (e.target === dlg || e.target.closest('#acct-close')) return dlg.close();
    if (busy) return;
    const id = e.target.closest('button')?.id;
    try {
      if (id === 'acct-other') { go('email'); render(); focusFirst(); }
      else if (id === 'acct-resend') { const token = captcha; busy = true; await sendCode(token); busy = false; setMsg(''); }
      else if (id === 'acct-google') {
        if (!dlg.querySelector('#acct-terms')?.checked) return setMsg(E('terms'));
        rememberTerms();
        busy = true;
        // Départ vers Google ; retour sur cette page, où supabase-js lit la session (ou l'erreur) dans l'adresse
        const { error } = await (await client()).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
        if (error) throw error;
      }
      else if (id === 'acct-cancel') { go('account'); deleting = false; render(); focusFirst(); }
      else if (id === 'acct-pseudo-change') { go('pseudo'); render(); focusFirst(); }
      else if (id === 'acct-delete') { go('account'); deleting = true; render(); focusFirst(); }
      else if (id === 'acct-import') { dlg.close(); $('#import-file').click(); }
      else if (id === 'acct-admin') { dlg.close(); API.show('admin'); }
      else if (id === 'acct-logout') {
        busy = true;
        // Partie sur le serveur : derniers envois (records), puis la copie quitte cet appareil
        const linked = !!API.state.serveur;
        if (linked) await pushExtras();
        loggingOut = true;
        await (await client()).auth.signOut();
        busy = false; dlg.close(); endEco();
        if (linked) { noteAfterReload(T('logged_out_saved')); API.adopt(null); } else { loggingOut = false; toast(T('logged_out')); }
      }
    } catch (err) { busy = false; setMsg(errText(err)); }
  });

  dlg.addEventListener('change', async e => {
    if (e.target.id === 'acct-terms') termsChecked = e.target.checked;
    // Case des classements (lot 5) : la base garde le choix (regler_classements, 10 changements par jour)
    if (e.target.id === 'acct-rank') {
      const box = e.target, cacher = !box.checked;
      if (busy) { box.checked = !cacher; return; }
      busy = true; box.disabled = true;
      try {
        const r = await call('regler_classements', { cacher });
        profil = { ...profil, classements_caches: !!r?.cache };
        busy = false; msg = ''; render();
      } catch (err) { busy = false; setMsg(isNet(err) ? E('net_eco') : errText(err)); }
    }
  });

  dlg.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    try {
      if (!session && step === 'email') {
        email = dlg.querySelector('#acct-email').value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMsg(E('email'));
        if (!dlg.querySelector('#acct-terms')?.checked) return setMsg(E('terms'));
        rememberTerms();
        const token = captcha;
        busy = true; render();
        await sendCode(token);
        busy = false; go('code'); render(); focusFirst();
      } else if (!session) {
        const token = draft = dlg.querySelector('#acct-code').value.replace(/\s/g, '');
        if (!/^\d{6}$/.test(token)) return setMsg(E('code'));
        busy = true; render();
        const { data, error } = await (await client()).auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw error;
        session = data.session;
        await loadProfil();
        await acceptTermsIfChecked();
        busy = false; go(pseudo() ? 'account' : 'pseudo');
        renderBtn();
        if (pseudo() && termsOk()) { dlg.close(); toast(T('hello', pseudo())); } else { render(); focusFirst(); }
      } else if (!termsOk() && !deleting) {
        if (!dlg.querySelector('#acct-terms')?.checked) return setMsg(E('terms'));
        busy = true; render();
        const { error } = await sb.rpc('accepter_cgu', { v: LEGAL_VERSION });
        if (error) throw error;
        profil = { ...profil, cgu_version: LEGAL_VERSION };
        busy = false; go(pseudo() ? 'account' : 'pseudo');
        renderBtn(); // et démarrage de la partie sur le serveur
        if (pseudo()) { dlg.close(); toast(T('hello', pseudo())); } else { render(); focusFirst(); }
      } else if (deleting) {
        if (dlg.querySelector('#acct-confirm').value.trim() !== pseudo()) return setMsg(E('confirm'));
        busy = true; render();
        const { error } = await sb.rpc('supprimer_mon_compte');
        if (error) throw error;
        // Compte effacé avec sa partie du serveur : la copie de ce navigateur redevient une partie locale
        endEco(); API.forgetServer();
        loggingOut = true;
        await sb.auth.signOut({ scope: 'local' });
        loggingOut = false;
        busy = false; deleting = false; dlg.close(); toast(T('deleted'));
      } else if (beta && step !== 'pseudo') {
        const code = draft = dlg.querySelector('#acct-beta').value.trim();
        if (!code) return setMsg(E('code_invalide'));
        busy = true; render();
        const { data, error } = await sb.rpc('utiliser_code_beta', { code });
        if (error) { busy = false; return setMsg(/trop_rapide/.test(error.message || '') ? E('beta_trop') : errText(error)); }
        busy = false;
        if (!data?.ok) return setMsg(E('code_invalide'));
        // Accès donné : la partie sur le serveur démarre
        beta = false; profil = { ...profil, beta_le: new Date().toISOString() };
        go('account'); dlg.close();
        SFX.achievement?.(); toast(T('beta_ok'));
        ecoUid = null; loadReports();
        renderBtn();
      } else {
        const p = draft = dlg.querySelector('#acct-pseudo').value.trim();
        if (!pseudoOk(p)) return setMsg(E('pseudo_format'));
        busy = true; render();
        const { data, error } = await sb.rpc('choisir_pseudo', { p });
        if (error) throw error;
        const first = !pseudo();
        profil = { ...profil, pseudo: data };
        busy = false; go('account');
        SFX.achievement?.();
        renderBtn();
        if (first) { dlg.close(); toast(T('hello', data)); } else render();
      }
    } catch (err) { busy = false; setMsg(errText(err)); }
  });


  // ---------- Économie sur le serveur ----------
  // Connecté (pseudo choisi, conditions acceptées), le joueur joue sur le serveur : pièces, cartes, paquets gratuits,
  // missions, défis, séries, succès sont écrits par la base (supabase/migrations/…_economy.sql). La partie du
  // navigateur n'en est qu'une copie (app.js applyServer, marquée state.serveur), qui s'affiche tout de suite, même
  // hors ligne. La première fois, le serveur commence une partie neuve (passer_economie_serveur), puis la copie suit le
  // serveur : elle remplace la partie jouée dans ce navigateur avant la connexion, sans question. Une partie se reprend
  // seulement à la main (fichier exporté, bouton « Reprendre ma partie GitHub » : importer_partie_github).
  // Chaque action porte un numéro de requête (crypto.randomUUID) gardé jusqu'à la réponse : un nouvel essai après une
  // coupure réseau reprend le même numéro, et la base ne refait jamais une action déjà faite.
  // Hors ligne : ni achat, ni carte du jour, ni fusion (app.js) ; mini-jeux sans pièces (games.js).
  // Records des mini-jeux, dernière visite des succès, rappels et réglages : enregistrer_extras (2 s après un changement).
  const NOTE_KEY = 'brol-note';
  // Clés du lot 2 (sauvegarde en ligne, partie mise de côté) et file des gains des mini-jeux hors ligne (lot 4, étape 2) :
  // plus utilisées, effacées à la connexion
  const OLD_KEYS = ['brol:sync', 'brol:v1:ecartee', 'brol:v1:file'];
  const MARKET_KEY = 'brol:v1:marche'; // market.js : dernière visite de « Mes annonces », avec l'identifiant du compte
  let ecoUid = null, ecoState = 'off', starting = null, loggingOut = false;
  // Empreinte d'une valeur : JSON aux clés triées (l'ordre des clés change entre le navigateur et la base)
  const canon = v => Array.isArray(v) ? `[${v.map(canon).join(',')}]`
    : v && typeof v === 'object' ? `{${Object.keys(v).filter(k => v[k] !== undefined && typeof v[k] !== 'function').sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',')}}` : JSON.stringify(v ?? null);
  const hashOf = st => { const str = canon(st); let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + '.' + str.length; };
  const store = {
    get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
    set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* rien */ } },
  };
  const summary = st => ({
    cards: new Set(Object.keys(st?.owned || {}).filter(k => st.owned[k] > 0).map(k => k.split('|')[0]).filter(id => API.BY_ID.has(id))).size,
    coins: Math.floor(st?.coins || 0), packs: st?.stats?.packs || 0,
  });
  // Message à montrer après le rechargement de la page (déconnexion)
  const noteAfterReload = text => { try { sessionStorage.setItem(NOTE_KEY, text); } catch (_) { /* rien */ } };
  function setEcoState(st) {
    ecoState = st;
    const el = dlg.querySelector('#acct-sync'); if (el) el.textContent = ST(st === 'off' ? 'pending' : st);
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const errCode = e => String(e?.message || e?.code || '');
  // Coupure réseau (fetch impossible : supabase-js répond avec le statut 0), pas un refus de la base
  const isNet = e => e instanceof TypeError || e?.status === 0 || /failed to fetch|fetcherror|networkerror|load failed/i.test(errCode(e));
  const ecoErr = e => isNet(e) ? E('net_eco') : errText(e);
  async function call(fn, args) {
    await ready;
    if (!session) throw new Error('non_connecte');
    // Conditions mises à jour pas encore acceptées : rien ne part avant
    if (profil && (!profil.pseudo || !termsOk())) { if (!dlg.open) open(); throw new Error('profil_incomplet'); }
    // Bêta fermée sans code : rien ne part, l'écran du code s'ouvre
    if (beta) { if (!dlg.open) open(); throw new Error('beta_fermee'); }
    const { data, error, status } = await sb.rpc(fn, args);
    if (error) {
      // Bêta refermée pendant la partie : l'écran du code au prochain affichage de « Mon compte »
      if (/beta_fermee/.test(error.message || '')) beta = true;
      throw Object.assign(new Error(error.message || error.code || 'erreur'), { code: error.code, status });
    }
    return data;
  }
  // Action sur l'économie : même numéro de requête pour les nouveaux essais (deux automatiques après une coupure,
  // puis au prochain clic sur la même action), jusqu'à une réponse de la base
  const pendingReq = new Map();
  async function action(fn, args = {}) {
    const key = fn + JSON.stringify(args);
    const requete = pendingReq.get(key) || crypto.randomUUID();
    pendingReq.set(key, requete);
    for (let i = 0; ; i++) {
      try {
        const r = await call(fn, { requete, ...args });
        pendingReq.delete(key);
        return r;
      } catch (e) {
        if (!isNet(e)) { pendingReq.delete(key); throw e; }
        if (i >= 2) throw e;
        await sleep(600 * (i + 1));
      }
    }
  }
  // Erreur affichée au joueur (app.js joue le son d'erreur) ; refus de la base : la copie n'était sans doute plus à
  // jour (autre appareil, nouveau jour), elle est relue
  const shown = p => p.catch(e => { toast(ecoErr(e)); if (!isNet(e)) refreshSoon(300); throw e; });

  // Réponse d'une action : appliquée à la copie seulement si elle est plus récente qu'elle (une relecture complète
  // arrivée avant l'a déjà comptée), puis relecture complète un peu plus tard (missions, défis, statistiques)
  function patch(res, f) {
    const st = API.state, mark = st.serveur;
    if (mark && typeof res?.version === 'number' && res.version > (mark.version || 0)) {
      f?.(st);
      if (typeof res.coins === 'number') st.coins = res.coins;
      mark.version = res.version;
      // XP comptée par la base (journal de l'action) : niveau gagné, notification « Niveau 13 ! » (app.js setXp), après
      // ce que le jeu fait de la réponse (succès débloqués montrés d'abord)
      if (typeof res.xp === 'number') { const xp = res.xp; setTimeout(() => { if (API.state.serveur === mark) API.setXp(xp); }, 0); }
    }
    API.save();
    refreshSoon();
  }
  let refreshTimer = null;
  const refreshSoon = (ms = 1200) => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => refresh().catch(e => console.warn('[compte] relecture', e)), ms); };
  async function refresh() {
    clearTimeout(refreshTimer);
    const eco = await readEco();
    if (eco?.amorce) await takeEco(eco, false);
    return eco;
  }
  // Relecture différentielle (supabase/migrations/…_inventory_sync.sql) : la copie garde le jeton de sa dernière
  // relecture (state.serveur.jeton) ; avec lui, la base ne renvoie que les cartes changées depuis (d'où qu'elles
  // viennent : autre appareil, marché, admin), le reste de la partie restant complet. Au moindre doute, elle renvoie
  // tout. Le jeton ne vient que d'une relecture (patch n'y touche pas), et seulement pour la copie de ce compte.
  const jetonOf = () => { const s = API.state.serveur; return s && s.uid === session?.user.id && typeof s.jeton === 'string' ? s.jeton : null; };
  async function readEco() {
    const jeton = jetonOf();
    if (!jeton) return call('mon_economie');
    try { return await call('mon_economie', { depuis: jeton }); } catch (e) {
      if (e?.code !== 'PGRST202') throw e;
      return call('mon_economie'); // base pas encore mise à jour : fonction sans argument
    }
  }
  // Différentiel appliqué à une copie de l'inventaire de la partie : valeurs absolues (0 : clé enlevée), clés retirées,
  // puis contrôle des 4 totaux de la base. Rend une partie complète (app.js ne voit jamais de différentiel) ; IGNORER si
  // une autre relecture, arrivée entre-temps, a déjà changé le jeton de la copie (sûr : tout ce qui a été écrit après
  // revient avec le nouveau jeton) ; null (relecture complète) si les totaux diffèrent ou si la réponse est illisible.
  const IGNORER = {};
  function mergeInv(eco) {
    const st = API.state, inv = eco.inv, jeton = jetonOf();
    if (inv.depuis && jeton && inv.depuis !== jeton) return IGNORER;
    if (!inv.depuis || inv.depuis !== jeton || !inv.cartes || typeof inv.cartes !== 'object' || !Array.isArray(inv.retraits)) return null;
    const owned = { ...st.owned }, imported = { ...st.imported }, reprises = { ...st.reprises }, origin = { ...st.origin };
    const put = (o, k, v) => { if (v > 0) o[k] = v; else delete o[k]; };
    for (const k of inv.retraits) { delete owned[k]; delete imported[k]; delete reprises[k]; delete origin[k]; }
    for (const [k, v] of Object.entries(inv.cartes)) {
      const [n, imp, rep, ori] = Array.isArray(v) ? v : [];
      put(owned, k, n); put(imported, k, imp); put(reprises, k, rep);
      if (n > 0 && ori != null) origin[k] = ori; else delete origin[k];
    }
    const vals = o => Object.values(o).filter(v => typeof v === 'number' && v > 0), sum = o => vals(o).reduce((a, v) => a + v, 0);
    const t = inv.totaux || {};
    if (vals(owned).length !== t.lignes || sum(owned) !== t.nombre || sum(imported) !== t.importees || sum(reprises) !== t.reprises) return null;
    const { inv: _, ...rest } = eco;
    return { ...rest, owned, imported, reprises, origin };
  }
  // Partie du serveur dans la copie. Records des mini-jeux d'un autre appareil : pris seulement quand cet appareil n'a
  // rien à envoyer (sinon ses records partent et remplacent ceux du serveur)
  async function takeEco(eco, force) {
    if (eco.inv?.mode === 'diff') {
      // Plus vieux que la copie (une action plus récente l'a déjà mise à jour) : ignoré, comme une relecture complète
      if (!force && (eco.version || 0) < (API.state.serveur?.version || 0)) return;
      const full = mergeInv(eco);
      if (full === IGNORER) return;
      if (full) eco = full;
      else {
        // Refusé : relecture complète tout de suite, une seule fois
        console.warn('[compte] relecture différentielle refusée : relecture complète');
        eco = await call('mon_economie');
        if (!eco?.amorce || eco.inv?.mode === 'diff') return;
      }
    }
    const extras = force || ((eco.extrasVersion || 0) > (API.state.serveur?.extrasVersion || 0) && extrasHash() === extrasSent);
    if (!API.applyServer(eco, { uid: session.user.id, extras, force })) return;
    if (extras) {
      extrasSent = extrasHash();
      // Réglages d'un autre appareil : seulement ceux que ce navigateur n'a pas encore (pris au prochain chargement)
      for (const [k, v] of Object.entries(eco.prefs || {})) { try { if (/^rdl-(theme|lang|sound)$/.test(k) && localStorage.getItem(k) === null) localStorage.setItem(k, String(v)); } catch (_) { /* rien */ } }
    }
    applyLynx();
  }
  const cardOf = c => ({ card: API.BY_ID.get(c.id), finish: c.finish, got: c.got, isNew: !!c.isNew });
  const addCopy = (st, c, src) => { const k = API.keyOf(c.id, c.finish); st.owned[k] = (st.owned[k] || 0) + 1; (st.origin ||= {})[k] ||= src; };
  // Exemplaire retiré : ceux gagnés en jouant d'abord, puis les repris du lot 2, les importés en dernier (comme la base)
  function removeCopy(st, k) {
    const n = (st.owned[k] || 0) - 1, imp = st.imported?.[k] || 0, rep = st.reprises?.[k] || 0;
    if (n > 0) st.owned[k] = n; else delete st.owned[k];
    if (rep && n < imp + rep) { if (rep > 1) st.reprises[k] = rep - 1; else delete st.reprises[k]; }
    else if (imp > n) { if (n > 0) st.imported[k] = n; else delete st.imported[k]; }
  }

  // Économie du serveur, aux mêmes réponses que celle du navigateur (app.js, ecoLocal)
  const ECO_SRV = {
    buy(pack, n) {
      const block = API.buyBlock(pack, n);
      if (block) { toast(window.I18N.t(block)); return Promise.reject(new Error(block)); }
      const st = API.state;
      const paiement = n === 1 && st.tickets?.[pack.id] > 0 ? 'ticket' : n === 1 && st.free > 0 && !pack.special ? 'gratuit' : 'pieces';
      return shown(action('ouvrir_paquet', { paquet: pack.id, nombre: n, paiement })).then(r => {
        const packs = (r.packs || []).map(p => ({ ...p, revealed: (p.revealed || []).filter(d => API.BY_ID.has(d.id)).map(cardOf) }));
        patch(r, s => {
          for (const p of r.packs || []) for (const d of p.revealed || []) if (API.BY_ID.has(d.id)) addCopy(s, d, pack.id);
          s.free = r.free; s.freeAt = r.freeAt; s.pity = r.pity; s.tickets = r.tickets || {};
          s.stats.packs = (s.stats.packs || 0) + n; s.packs = s.stats.packs;
        });
        return { packs, usedFree: !!r.usedFree, usedTicket: !!r.usedTicket, cost: r.cost || 0 };
      });
    },
    // Revente des doublons : la base choisit les exemplaires (importés et repris d'abord, dans le plafond) ; la copie
    // est relue en entier
    sellDups: () => shown(action('revendre')).then(async r => { patch(r); await refresh().catch(() => {}); return r; }),
    sellOne: (c, finish) => shown(action('revendre', { carte: c.id, version: finish })).then(r => {
      patch(r, s => removeCopy(s, API.keyOf(c.id, finish)));
      return r.gain;
    }),
    async fuse(rarity, cat, max) { return fuseMany(max, () => action('fusionner', { rarete: rarity, categorie: cat || null })); },
    async fuseHolo(id, max) { return fuseMany(max, () => action('fusionner_holo', { carte: id })); },
    claimSeries: id => shown(action('reclamer_serie', { serie: id })).then(r => { patch(r, s => { (s.claimed ||= {})[id] = true; }); return r.gain; }),
    claimDaily: () => shown(action('carte_du_jour')).then(r => {
      patch(r, s => { if (API.BY_ID.has(r.card.id)) addCopy(s, r.card, 'daily'); s.daily = { last: API.today(), streak: r.streak }; });
      return API.BY_ID.has(r.card.id) ? { ...cardOf(r.card), streak: r.streak } : null;
    }),
    // Pot de pièces : la base calcule ce qu'il contient et le vide (début du remplissage suivant : potAt)
    claimPot: () => shown(action('recolter_pot')).then(r => { patch(r, s => { s.pot = { at: r.potAt }; }); return r.gain; }),
    claimMission: id => shown(action('reclamer_mission', { mission: id })).then(r => { patch(r, s => { if (s.missions) (s.missions.claimed ||= {})[id] = true; }); return r.gain; }),
    claimWeekly: i => shown(action('reclamer_defi', { palier: i })).then(r => {
      patch(r, s => { if (s.weekly?.tiers?.[i]) s.weekly.tiers[i].claimed = true; s.tickets = r.tickets || s.tickets; });
      return true;
    }),
    // Succès : la base vérifie et donne les pièces ; refusés (pas encore atteints pour elle, déjà payés) : sans message
    claimAch: ids => action('reclamer_succes', { ids }).then(r => { patch(r, s => { s.ach = r.ach || s.ach; }); return r; },
      e => { if (/pas_pret|deja_pris|requete_invalide/.test(errCode(e))) return { granted: [] }; throw e; }),
    // Mini-jeux (games.js) : partie distribuée par la base, réponses envoyées à la fin ; la base calcule score, pièces,
    // missions et défis. Coupure réseau au départ : rejet marqué net (partie sans pièces, sans message) ; autre refus :
    // message.
    gameStart: (jeu, mode = null) => call('commencer_minijeu', { jeu, mode }).catch(e => {
      if (!isNet(e)) toast(ecoErr(e));
      throw Object.assign(e, { net: isNet(e) });
    }),
    gameFinish: (partie, reponses) => shown(action('finir_minijeu', { partie, reponses })).then(r => { patch(r); gameGain(r); return r; }),
    belgleGuess: carte => shown(action('belgle_proposer', { carte })).then(r => { patch(r); gameGain(r); return r; }),
    // Récompense d'un niveau atteint (tickets), comptée par la base
    claimLevel: level => shown(action('reclamer_niveau', { niveau: level })).then(r => {
      patch(r, s => { s.tickets = r.tickets || s.tickets; if (Array.isArray(r.niveauxReclames)) s.levelsClaimed = r.niveauxReclames; });
      return { level: r.reclame, tickets: r.gagnes || {} };
    }),
    // Classements de collection (supabase/migrations/…_rankings.sql) : portee general | semaine | categorie
    ranking: (portee, categorie = null, depuis = 0) => shown(call('classement_collection', { portee, categorie, depuis })),
    // Meilleurs scores de la semaine aux mini-jeux (supabase/migrations/…_minigame_rankings.sql) : semaine courante |
    // precedente
    minigameRanking: (jeu, semaine = 'courante', depuis = 0) => shown(call('classement_minijeu', { jeu, semaine, depuis })),
    // Profil d'un joueur (supabase/migrations/…_player_profile.sql) : pseudo null = soi ; profil pas visible : la base
    // répond {introuvable: true} (pas d'exception, pour que l'essai compte dans la limite), traduit en
    // profil_introuvable ; message traduit dans e.text (affiché dans la fenêtre du profil, pas en notification)
    profile: (pseudo = null) => call('profil_joueur', { pseudo }).then(r => {
      if (!r || r.introuvable) throw new Error('profil_introuvable');
      return r;
    }).catch(e => { throw Object.assign(e, { text: ecoErr(e) }); }),
    // Belgle du jour, anonyme : {jour, joueurs, trouves, repartition[6]}, null sous 10 joueurs ; sans message en cas
    // d'échec (la fin du Belgle s'affiche sans)
    belgleToday: () => call('belgle_du_jour').catch(e => { console.warn('[compte]', e?.message || e); return null; }),
    // Marché (market.js, supabase/migrations/…_market.sql) : cartes {carte, version} ; la base fait foi, la copie est
    // corrigée tout de suite (cartes mises de côté, reçues, données) puis relue en entier
    marketList: (filtres, page = 0) => shown(call('marche', { filtres, page })),
    marketView: id => shown(call('voir_annonce', { id })),
    marketPublish: ({ type, donne, demande = null, prix = null }) => shown(action('publier_annonce', { type, donne, demande, prix })).then(r => {
      patch(r, s => { for (const c of donne) removeCopy(s, API.keyOf(c.carte, c.version)); });
      return r;
    }),
    marketDeal: id => shown(action('conclure_annonce', { id })).then(r => {
      patch(r, s => {
        for (const c of r.recues || []) if (API.BY_ID.has(c.carte)) addCopy(s, { id: c.carte, finish: c.version }, 'marche');
        for (const c of r.donnees || []) removeCopy(s, API.keyOf(c.carte, c.version));
        s.stats.trades = (s.stats.trades || 0) + 1;
      });
      return r;
    }),
    marketCancel: id => shown(action('annuler_annonce', { id })).then(async r => { patch(r); await refresh().catch(() => {}); return r; }),
    marketBump: id => shown(action('remonter_annonce', { id })).then(r => { patch(r); return r; }),
    marketMine: silent => (silent ? call('mes_annonces') : shown(call('mes_annonces'))).then(r => { if (r?.expirees > 0) refreshSoon(300); return r; }),
    // Vente conclue depuis la dernière visite (market.js) : le solde a changé sur le serveur
    marketSold: () => refreshSoon(300),
    // Vote du pot commun (market.js, supabase/migrations/…_common_pot_vote.sql) : vote ouvert ou dernier clos, bulletin du
    // joueur ; voix gratuite (voix_en_plus 0) puis voix achetées, payées en pièces gagnées en jouant et détruites
    voteCurrent: silent => (silent ? call('vote_actuel') : shown(call('vote_actuel'))),
    vote: (vote, option, n) => shown(action('voter', { vote, option, voix_en_plus: n })).then(r => { patch(r); return r; }),
  };
  // Fusions à la suite (bouton « Max ») : arrêt à la première que la base refuse ; copie relue à la fin
  async function fuseMany(max, one) {
    const out = [];
    for (let i = 0; i < Math.max(1, max || 1); i++) {
      let r;
      try { r = await one(); }
      catch (e) {
        if (!out.length) { toast(ecoErr(e)); throw e; }
        if (!/pas_assez_de_doublons/.test(errCode(e))) toast(ecoErr(e));
        break;
      }
      patch(r);
      if (API.BY_ID.has(r.card?.id)) out.push(cardOf(r.card));
    }
    await refresh().catch(() => {});
    return out;
  }

  // Pièces d'un mini-jeu données par la base (ou refus : partie trop rapide, plafond du jour)
  function gameGain(r) {
    if (r?.refus) { SFX.error?.(); toast(E(r.refus)); }
    else if (r?.gain > 0) { SFX.coin?.(); toast(T('game_gain', API.fmt(r.gain))); }
    else if (r?.plafond) toast(E('plafond_minijeux'));
  }
  window.addEventListener('online', () => {
    // Démarrage sans réseau : profil relu au retour, puis passage sur le serveur
    if (session && !profil) { loadProfil().then(renderBtn, e => console.warn('[compte]', e)); return; }
    if (!session || !API.state.serveur) return;
    if (ecoState === 'offline' || ecoState === 'error') { ecoUid = null; maybeSync(); }
  });
  window.addEventListener('offline', () => { if (API.state.serveur && ecoState === 'ok') setEcoState('offline'); });
  // Retour sur le jeu (onglet, appli) : la copie est relue (autre appareil, nouveau jour)
  document.addEventListener('visibilitychange', () => {
    if (!API.ecoServer() || !session) return;
    if (document.hidden) { if (extrasTimer) pushExtras(); }
    else if (ecoState === 'ok') refreshSoon(300);
  });

  // ---------- Records des mini-jeux et réglages (enregistrer_extras) ----------
  let extrasSent = null, extrasTimer = null;
  const prefs = () => { const p = {}; for (const k of ['rdl-theme', 'rdl-lang', 'rdl-sound']) { try { const v = localStorage.getItem(k); if (v !== null) p[k] = v; } catch (_) { /* rien */ } } return p; };
  const extrasOf = () => { const s = API.state; return { games: s.games || {}, achSeen: s.achSeen || 0, notified: s.notified || {}, prefs: prefs() }; };
  const extrasHash = () => hashOf(extrasOf());
  API.onSave(() => {
    if (!API.ecoServer() || !session || extrasSent === null || extrasHash() === extrasSent) return;
    clearTimeout(extrasTimer);
    extrasTimer = setTimeout(pushExtras, 2000);
  });
  async function pushExtras(again = true) {
    clearTimeout(extrasTimer); extrasTimer = null;
    const mark = API.state.serveur;
    if (!API.ecoServer() || !session || !mark || extrasSent === null) return;
    const ex = extrasOf(), h = hashOf(ex);
    if (h === extrasSent) return;
    try {
      const r = await call('enregistrer_extras', { extras: ex, version_lue: mark.extrasVersion || 0 });
      mark.extrasVersion = r.extrasVersion; extrasSent = h;
      API.save();
    } catch (e) {
      const m = errCode(e);
      // Records changés sur un autre appareil : ceux de cet appareil les remplacent
      if (m.includes('version_conflit') && again) {
        const eco = await readEco().catch(() => null); // seul extrasVersion sert (différentiel possible)
        if (typeof eco?.extrasVersion === 'number') { mark.extrasVersion = eco.extrasVersion; return pushExtras(false); }
      } else if (m.includes('trop_rapide')) extrasTimer = setTimeout(pushExtras, 5000);
      else if (m.includes('economie_serveur')) toast(E('economie_serveur'));
      else if (!isNet(e)) console.warn('[compte] records', e);
    }
  }

  // ---------- Passage sur le serveur et démarrage ----------
  // Ouverture de session (pseudo choisi, conditions acceptées) : une fois par compte
  function maybeSync() {
    if (!session || !pseudo() || !termsOk() || ecoUid === session.user.id) return;
    ecoUid = session.user.id;
    starting = startEco().catch(err => {
      console.warn('[compte] économie', err);
      const m = errCode(err);
      if (m.includes('compte_suspendu')) setEcoState('suspended');
      else if (m.includes('beta_fermee')) {
        // Bêta fermée : écran du code ; sans copie du serveur, le jeu reste celui du navigateur
        beta = true; setEcoState('error');
        if (!API.state.serveur) API.setEco(null);
        if (dlg.open) render(); else open();
      }
      else if (m.includes('economie_fermee')) { setEcoState('error'); if (!API.state.serveur) API.setEco(null); }
      else setEcoState(isNet(err) ? 'offline' : 'error');
    });
  }
  async function startEco() {
    const uid = session.user.id, st = API.state;
    // Copie de la partie d'un autre compte (déconnexion sans réseau) : effacée avant tout
    if (st.serveur && st.serveur.uid !== uid) { API.adopt(null); return; }
    if (st.serveur) API.setEco(ECO_SRV);
    setEcoState(navigator.onLine === false ? 'offline' : 'pending');
    // Copie de ce compte déjà là : démarrage en différentiel aussi (jeton gardé dans la sauvegarde)
    let eco = await readEco(), first = null;
    if (!eco.amorce) {
      const r = await action('passer_economie_serveur');
      if (!r?.deja) first = r;
      eco = await call('mon_economie');
    }
    // Vieilles clés du lot 2 effacées : le serveur fait foi
    for (const k of OLD_KEYS) store.set(k, null);
    if (!API.ecoServer()) API.setEco(ECO_SRV);
    await takeEco(eco, true);
    setEcoState('ok');
    if (first) showFirst();
  }
  // Première fois sur le serveur : message
  const ecoDlg = document.createElement('dialog');
  ecoDlg.id = 'eco-dlg';
  ecoDlg.className = 'side-dlg acct-dlg sync-dlg';
  document.body.appendChild(ecoDlg);
  function showFirst() {
    ecoDlg.innerHTML = `<h2>${T('eco_first_h')}</h2><p class="acct-intro">${T('eco_first')}</p>
      <div class="acct-actions"><button class="btn btn-gold" id="eco-ok">${T('eco_ok')}</button></div>`;
    if (!ecoDlg.open) ecoDlg.showModal();
    ecoDlg.querySelector('#eco-ok').focus();
  }
  ecoDlg.addEventListener('click', e => { if (e.target === ecoDlg || e.target.closest('#eco-ok')) ecoDlg.close(); });
  // Fin de session : plus rien n'est envoyé (la copie, elle, est effacée ou rendue au navigateur par l'appelant)
  function endEco() {
    clearTimeout(refreshTimer); clearTimeout(extrasTimer); extrasTimer = null; extrasSent = null;
    store.set(MARKET_KEY, null);
    for (const k of OLD_KEYS) store.set(k, null);
    ecoUid = null; starting = null; setEcoState('off');
  }
  // Copie du serveur déjà là : le jeu la sert tout de suite (hors ligne aussi), le serveur la met à jour ensuite
  if (API.state.serveur) API.setEco(ECO_SRV);

  // Reprise d'une partie de la page GitHub (fichier du bouton « Exporter ma partie ») : le serveur vérifie la partie,
  // l'enregistre (une fois par compte, un fichier une fois) et ajoute lui-même ses cartes (importées : grisées, non
  // échangeables, revente plafonnée) et ses pièces ; la copie est ensuite relue. Rien n'est ajouté par le navigateur.
  async function importGithub(data) {
    await ready; // fichier choisi juste après le chargement : session pas encore relue
    if (!session || !pseudo() || !termsOk()) { toast(T('import_login')); return open(); }
    await starting; // passage sur le serveur d'abord : la copie suit ensuite la partie du serveur
    if (!API.state.serveur) { SFX.error?.(); return toast(ecoState === 'offline' ? E('net_eco') : E('other')); }
    const sv = data.save, coins = Math.max(0, Math.min(Math.floor(sv.coins), 10000));
    if (!confirm(T('import_confirm', API.fmt(summary(sv).cards), API.fmt(coins)))) return;
    try {
      const res = await call('importer_partie_github', { fichier: data });
      profil = { ...profil, pionnier_le: new Date().toISOString(), import_rouvert_le: null };
      await refresh();
      SFX.achievement?.();
      toast(T('import_done', API.fmt(res.cartes), API.fmt(res.pieces)));
      // trop_rapide : seulement un admin (imports répétés, 20 par jour) ; un joueur n'importe qu'une fois
    } catch (err) { SFX.error?.(); toast(/trop_rapide/.test(err?.message || '') ? T('import_trop') : ecoErr(err)); }
  }
  API.setImportHandler(importGithub);

  // ---------- Signaler une carte erronée ----------
  // Bouton « Cette carte a une erreur » de la fiche (app.js, carte possédée) : formulaire dans la fiche, envoyé à
  // signaler_carte. La base vérifie tout (carte, motif, commentaire, 10 signalements par 24 h, un seul en cours par
  // carte) ; ce formulaire ne fait que guider. mes_signalements donne les cartes déjà signalées (bouton désactivé) et
  // le nombre de signalements confirmés par un modérateur (succès Œil de lynx).
  const MOTIFS = ['photo_absente', 'photo_fausse', 'photo_cadrage', 'info_fausse', 'autre'];
  const motifLabel = k => TX[L()].motif[k] || TX.fr.motif[k] || k;
  let reports = null; // { confirmes, en_cours: Set des cartes }
  async function loadReports() {
    reports = null;
    if (!session) return;
    try {
      const { data, error } = await sb.rpc('mes_signalements');
      if (error) throw error;
      reports = { confirmes: Math.max(0, Math.floor(+data?.confirmes || 0)), en_cours: new Set(Array.isArray(data?.en_cours) ? data.en_cours : []) };
      drawReports();
      applyLynx();
    } catch (err) { console.warn('[compte] signalements', err); }
  }
  function drawReports() {
    const el = dlg.querySelector('#acct-reports');
    if (!el) return;
    el.hidden = !reports;
    if (reports) el.textContent = T('reports_line', reports.confirmes, reports.en_cours.size);
  }
  // Le compteur du succès suit le serveur, sans jamais baisser (un signalement purgé après 12 mois ne retire rien).
  // Seulement sur la copie de la partie du serveur (la base vérifie elle-même les signalements avant de payer le succès)
  function applyLynx() {
    if (!reports || !API.state.serveur) return;
    const st = API.state.stats;
    if ((st.lynx || 0) >= reports.confirmes) return;
    st.lynx = reports.confirmes;
    API.save();
    API.checkAchievements();
  }
  const markPending = id => {
    reports ||= { confirmes: 0, en_cours: new Set() };
    reports.en_cours.add(id);
    drawReports();
  };
  const setPending = btn => { btn.hidden = false; btn.disabled = true; btn.textContent = T('report_pending'); };
  function reportCard(c, btn) {
    if (reports?.en_cours.has(c.id)) return setPending(btn);
    btn.addEventListener('click', () => { SFX.tick(); openReport(c, btn); });
  }
  function openReport(c, btn) {
    const box = document.createElement('div');
    box.className = 'report-box';
    btn.closest('.report-wrap').after(box);
    btn.hidden = true;
    // Pas connecté (ou pseudo, conditions pas encore faits) : la fiche se ferme et « Mon compte » s'ouvre
    if (!session || !pseudo() || !termsOk()) {
      box.innerHTML = `<p class="report-note">${T('report_login')}</p><button class="btn btn-line" type="button" id="report-login">${T('btn')}</button>`;
      box.querySelector('#report-login').addEventListener('click', () => { btn.closest('dialog')?.close(); open(); });
      return;
    }
    box.innerHTML = `<form class="report-form" id="report-form" novalidate>
      <fieldset class="report-motifs"><legend>${T('report_h')}</legend>
        ${MOTIFS.map(m => `<label class="acct-check"><input type="radio" name="motif" value="${m}"><span>${esc(motifLabel(m))}</span></label>`).join('')}</fieldset>
      <label class="acct-field" for="report-text"><span>${T('report_comment')}</span>
        <textarea id="report-text" name="commentaire" maxlength="300" rows="3" aria-describedby="report-count report-note"></textarea></label>
      <p class="report-count" id="report-count">${T('report_count', 0)}</p>
      <p class="report-note" id="report-note">${T('report_note')}</p>
      <p class="acct-msg" role="alert" hidden></p>
      <div class="acct-actions"><button class="btn btn-gold" type="submit">${T('report_send')}</button>
        <button class="btn btn-line" type="button" id="report-cancel">${T('cancel')}</button></div></form>`;
    const form = box.querySelector('form'), text = form.querySelector('textarea'), send = form.querySelector('[type="submit"]');
    const say = m => { const el = form.querySelector('.acct-msg'); el.textContent = m; el.hidden = !m; if (m) SFX.error?.(); };
    form.querySelector('input[name="motif"]').focus();
    text.addEventListener('input', () => { form.querySelector('#report-count').textContent = T('report_count', text.value.length); say(''); });
    form.addEventListener('change', () => say(''));
    form.querySelector('#report-cancel').addEventListener('click', () => { box.remove(); btn.hidden = false; btn.focus(); });
    let sending = false;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending) return;
      const motif = form.querySelector('input[name="motif"]:checked')?.value;
      const commentaire = text.value.trim();
      if (!motif) return say(E('motif_invalide'));
      if (motif === 'autre' && !commentaire) { text.focus(); return say(E('commentaire_requis')); }
      sending = true; send.disabled = true; send.textContent = T('report_sending');
      try {
        const { error } = await sb.rpc('signaler_carte', { carte: c.id, motif, commentaire: commentaire || null });
        if (error) throw error;
        markPending(c.id);
        box.innerHTML = `<p class="report-done" role="status">${T('report_thanks')}</p>`;
        setPending(btn);
        SFX.coin?.();
      } catch (err) {
        if (String(err?.message || '').includes('deja_signale')) markPending(c.id);
        say(errText(err));
        sending = false; send.disabled = false; send.textContent = T('report_send');
      }
    });
  }
  API.setReportHandler(reportCard);

  // ---------- Démarrage : session déjà ouverte dans ce navigateur ? ----------
  let readyDone;
  const ready = new Promise(r => { readyDone = r; });
  renderBtn();
  try { const note = sessionStorage.getItem(NOTE_KEY); if (note) { sessionStorage.removeItem(NOTE_KEY); setTimeout(() => toast(note), 300); } } catch (_) { /* rien */ }
  (async () => {
    try {
      // Retour de Google avec une erreur (inscription refusée par le hook, accès refusé…) : on l'affiche
      const params = new URLSearchParams(location.search + '&' + location.hash.slice(1));
      const oauthError = params.get('error_description') || params.get('error');
      await loadSettings();
      const c = await client();
      c.auth.onAuthStateChange((event, s) => {
        session = s;
        if (event === 'SIGNED_OUT') {
          profil = null; reports = null; beta = false; go('email'); email = '';
          // Session fermée ailleurs (expirée, autre onglet) : la copie de la partie du serveur quitte l'appareil
          if (!loggingOut && API.state.serveur) { endEco(); noteAfterReload(T('logged_out_saved')); API.adopt(null); }
          else { clearTimeout(refreshTimer); ecoUid = null; }
        }
        renderBtn();
      });
      const { data } = await c.auth.getSession();
      session = data.session;
      // Copie d'une partie du serveur sans session (déconnecté ailleurs, session expirée) : elle quitte l'appareil
      if (!session && API.state.serveur && navigator.onLine !== false) { endEco(); API.adopt(null); return; }
      if (session) { await loadProfil(); await acceptTermsIfChecked(); }
      renderBtn();
      // Adresse nettoyée (code ou erreur de Google) : un rechargement ne doit pas les réutiliser
      if (params.has('code') || oauthError) history.replaceState(null, '', location.pathname);
      if (oauthError && !session) { await open(); setMsg(errText({ message: oauthError })); return; }
      // Connecté sans pseudo (fenêtre fermée avant de le choisir) : on le redemande
      // Connecté sans pseudo, ou conditions pas encore acceptées dans leur version actuelle : on le redemande
      if (session && (!pseudo() || !termsOk())) open();
    } catch (err) { console.warn('[compte]', err); }
    finally { readyDone(); }
  })();
  // Pour admin.js : session, profil et appels aux fonctions de la base (droits vérifiés par la base)
  window.BROL_ACCOUNT = { get session() { return session; }, get profil() { return profil; }, rpc: (fn, args) => sb.rpc(fn, args), ready, motifLabel };
})();
