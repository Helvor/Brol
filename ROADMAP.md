# Roadmap

Ce qui est prévu pour Brol, dans l'ordre envisagé. Chaque étape reste un site statique jusqu'à la phase 5.

## Phase 1 — Données fiables

- [x] **Parti le plus récent** : dernier parti connu d'après les dates Wikidata (P102). La table des partis du générateur confondait Open Vld (Q1160192, aujourd'hui « Anders ») avec le sp.a : Maggie De Block, De Croo, Verhofstadt… apparaissaient en « sp.a » et en rouge. Corrigé (Open VLD, bleu).
- [x] **Titres Wikipédia introuvables** : titres corrigés dans le générateur (Jan Pieter Minckelers, Kwak, Brugse Zot et Lokerse Feesten via Wikipédia NL, Saint-Nicolas (fête), Gentse Feesten, Brussels Jazz Weekend…). Ronquières Festival n'a pas d'image libre et reste sans carte.
- [x] **Économie revue** : revente des doublons ramenée à environ 60 % du prix d'un paquet, puis valeurs revues pour que les cartes rares valent cher (mythique 340 pièces, légendaire 75, éditions limitées ×2) et les communes presque rien (1 pièce) (avant : 3,7 fois le prix, d'où des milliers de pièces en quelques minutes), récompenses des succès divisées par trois (sauf secrets). Mesuré avec `tools/simulate.mjs`, qui fait jouer deux joueurs types pendant une ou deux heures avec le vrai code du jeu.
- [x] **Paquet Prestige** (600 pièces) : toutes les cartes, 5ᵉ carte légendaire ou mieux garantie (≈ 12 % de mythiques). Pièces uniquement.
- [x] **Lot de 10 paquets** : 10 % moins cher, payé en pièces, une rangée par paquet à l'ouverture.
- [x] **Statistiques de tirage** : `tools/check-odds.mjs` ouvre 100 000 paquets de chaque type et compare les taux obtenus aux taux affichés (raretés, versions spéciales, exclusives, garantie anti-malchance). Il a révélé un écart dans les petits paquets (Tour des Flandres) : une rareté épuisée dans le paquet se reportait sur la voisine ; on accepte maintenant un doublon, et tous les taux sont justes.
- [x] **Tests automatiques** : test navigateur (Playwright) lancé par GitHub Actions à chaque push. Il ouvre un paquet, l'album, la fiche détail et les 5 mini-jeux, passe en NL et en mobile, et échoue à la moindre erreur JavaScript.

- [x] **Rareté revue** : mythique réservée à ~25 icônes choisies à la main (`MYTHIQUES` dans le générateur) ; notoriété mesurée par les visites Wikipédia FR + NL sur 12 mois (au lieu du nombre de langues) ; politique classée par carrière (années de Premier ministre, gouvernements, postes) ; événements de épique à mythique, provinces rares ou épiques selon la population. Taux réels affichés paquet par paquet.
- [x] **Raretés durcies** (octobre 2026) : 52 / 27 / 14,5 / 5 / 1,3 / 0,2 % au lieu de 50 / 26 / 15,5 / 6 / 2,2 / 0,3 ;
  revente des épiques, légendaires et mythiques relevée (25, 110, 450) pour garder la revente d'un paquet au même
  niveau (vérifié avec `tools/simulate.mjs` et `tools/check-odds.mjs`). Nouvelle catégorie mise en avant : à rareté
  égale, ses cartes sortent 3 fois plus souvent jusqu'à une date (`FEATURED` dans app.js, Mémoire jusqu'au 31 janvier
  2027), affiché dans le tableau des chances.
- [x] **Paquet « Histoire »** (octobre 2026) : 39 cartes « manuelles » (`HISTOIRE` dans le générateur, catégorie
  `histoire`) plus les 6 événements existants : grèves et manifestations (1893, 1913, 1960, marche flamande de 1962, FN 1966, Louvain 68, Fourons, Marche
  blanche, climat), grandes dates (expositions universelles, Jeux d'Anvers, indépendance du Congo, Expo 58, euro…),
  tournants de société et drames (Bois du Cazier, Heysel, attentats du 22 mars…). Pour les drames, photos de mémoriaux
  ou de lieux uniquement. Séries « Expositions universelles » et « Dans la rue ». Mis en avant jusqu'au 31 mai 2027.
  Écartés faute d'image libre : grève de 1936 (photo sans source sûre), manifestation anti-missiles,
  marche multicolore, pacte scolaire, peine de mort, euthanasie, abdication d'Albert II, Ghislenghien.
- [x] **Communes : rareté par score pondéré** (octobre 2026) : habitants 40 %, notoriété (nombre de Wikipédias) 30 %,
  patrimoine protégé 25 % (classé dans sa Région), revenu par habitant 5 % ; superficie non comptée. Chiffres officiels,
  sans Wikimedia : Statbel (population, revenus ; fichiers téléchargés à la main, le site bloque les robots, réduits par
  `tools/statbel.py`) et registres du patrimoine des trois Régions (`tools/patrimoine.mjs`), dans `tools/sources/`.
  `node tools/build-cards.mjs --communes` recalcule seulement les communes. Stat « Densité » remplacée par
  « Revenu/hab. ». Suite prévue : même principe pour les autres catégories (monuments, châteaux, écoles : ancienneté,
  patrimoine, notoriété…), une catégorie à la fois, avec un tableau avant/après à valider.
- [x] **Chances d'obtention sur chaque carte** (fiche détail, section repliable) : pour chaque paquet qui peut la
  donner, « 1/N » toutes versions confondues puis par version (standard, Holo, Plein cadre, Dorée, version
  d'événement). Calcul `cardOdds` (app.js) fondé sur la même logique que le tirage ; vérifié contre 200 000 tirages.
- [x] **Plus de pièces** (octobre 2026, retour de l'utilisateur : « pas assez de pièces » après le durcissement des
  raretés) : départ 2 000 pièces (au lieu de 1 000), 10 pièces par nouvelle carte (au lieu de 5), carte du jour
  50 pièces (au lieu de 20), missions ×1,5 (150 à 450), réserve de 8 paquets gratuits (au lieu de 5). Prix des
  paquets inchangés. `tools/simulate.mjs` (2 h) : le joueur normal garde ≈ 7 400 pièces après 1 h (contre ≈ 900) et
  ouvre ≈ 600 paquets en 2 h (contre ≈ 500) ; le farmeur finit toujours à zéro.
- [x] **Gagner des pièces plus facilement** : paquet gratuit toutes les 2 minutes (5 en réserve), missions du jour (3 par jour, 100 à 300 pièces), revente ×1,5 à partir de 80 % de l'album, plafond des mini-jeux relevé à 2 500 pièces par jour.

## Phase 2 — Gameplay

- [x] **Fusion de doublons** (bouton Fusionner dans l'album) : 5 doublons standard d'une rareté et d'une même catégorie → une carte de cette catégorie, rareté au-dessus (choix de la catégorie dans la fenêtre ; catégorie sans carte de cette rareté : n'importe quelle carte) ; 3 doublons d'une même carte → sa version Holo. Un exemplaire est toujours gardé. Succès associés.
- [x] **Échanges par QR code ou lien** (onglet Échanges, sans serveur) : doublons uniquement, version précise de chaque carte, cartes mises de côté pendant l'échange, chaque échange ne sert qu'une fois, scanner intégré, succès d'échange. Limite connue : sans serveur, rien n'empêche un joueur de tricher (comme pour les pièces aujourd'hui).
- [x] **Export/import de la sauvegarde** (liens en bas de page) : télécharger sa partie dans un fichier et la réimporter. Ça protège d'un cache effacé et permet de passer d'un appareil ou d'une adresse à l'autre en attendant les comptes. Le format servira aussi à migrer les parties vers le serveur en phase 5.
- [x] **Partager une carte** : générer une image (PNG) d'une carte, avec sa version spéciale, pour la partager par message ou sur les réseaux (Web Share API sur mobile, téléchargement sinon). Garder le crédit de l'image sur le visuel.
- [x] **Mode daltonien et accessibilité** : distinguer les raretés autrement que par la couleur (forme de la gemme, motif), navigation complète au clavier, contrastes vérifiés dans les deux thèmes.
- [ ] **Équilibrage de Formation de gouvernement** après quelques parties (durée, difficulté, gains).

## Phase 3 — Identité et mobile

- [x] **Logo Brol** (trois cartes noir-jaune-rouge, un B sur la rouge ; `logo.svg`) : en-tête, dos des cartes et icône d'onglet. Reste : icônes d'application (PNG) avec la version installable.
- [x] **Version installable (PWA)** : manifeste, icônes (`tools/build-icons.mjs`), service worker (`sw.js`). Le jeu s'ouvre hors ligne ; les images Commons déjà vues restent en cache (600 au plus). Bouton « Installer l'appli » en bas de page.
- [x] **Carte du jour** : une carte et 20 pièces par jour ; série de jours consécutifs (rare ou mieux dès le 3ᵉ jour, épique dès le 5ᵉ, légendaire tous les 7 jours).
- [x] **Calendrier d'événements belges** (Carnaval, Tour des Flandres, Fête de l'Iris, 11 juillet, 21 juillet, Fêtes de Wallonie, Saint-Nicolas ; dates mobiles calculées) : paquets limités dans le temps (Fête nationale le 21 juillet, Carnaval de Binche, Saint-Nicolas, Tour des Flandres, Fêtes de Wallonie, 11 juillet…), avec des chances accrues dans les catégories concernées.
- [x] **Cartes exclusives des paquets spéciaux** : 3 cartes « Édition limitée » par paquet spécial (24 en tout, de l'Ordre de Léopold aux Échasseurs namurois), une série et des succès associés ; une version propre à chaque paquet (Rouge à la Saint-Nicolas, Pavé au Tour des Flandres…), avec un taux bas.

## Phase 4 — Contenu

- [x] **Nouvelle catégorie Sciences** (35 cartes) : scientifiques et inventeurs belges (Lemaître, Sax, Solvay, Vésale, Mercator, Englert, de Duve…), avec photos libres et rareté relative comme les autres catégories. Vendue dans un nouveau paquet « Sciences ».
- [x] **Bourgmestres à jour** : le bourgmestre en fonction vient de l'infobox Wikipédia NL de chaque commune (FR en secours), avec les titulaires empêchés et les faisant fonction (Namur, Anvers, Brasschaat…). Wikidata ne sert plus que pour les mandats terminés ; les anciens bourgmestres gardent leur carte (« Ancien bourgmestre de… »).
- [ ] **Mise à jour automatique des données** : GitHub Action mensuelle qui relance `node tools/build-cards.mjs --fresh` et ouvre une pull request avec les changements (nouveaux ministres, populations, photos). Ajouter un garde-fou : signaler les cartes disparues, pour ne pas casser les collections existantes.

## Phase 6 — Nouveaux paquets (prochaine étape)

Décidé avec l'utilisateur : cinq nouvelles catégories, chacune avec son filtre dans l'album, construites comme les
monuments ou les bières (`curated()` dans `tools/build-cards.mjs` : liste de titres Wikipédia, image libre,
rareté selon la notoriété). Pour chaque thème : proposer la liste des cartes, **la faire valider par l'utilisateur**,
générer, relire les photos à l'œil, puis PR.

Ordre de priorité :
1. [x] **Animaux** (catégorie « Faune », 64 cartes après agrandissement) : les quatre bergers belges (malinois mythique), bouvier des
   Flandres, schipperke, griffon bruxellois, saint-hubert, chevaux (trait belge, ardennais, sang-chaud belge),
   Blanc-Bleu Belge, pigeon voyageur, poules et lapin des races belges, faune sauvage des Ardennes à la côte (loup,
   castor, cerf, chat forestier, cigogne noire, grand-duc, faucon pèlerin, phoque, marsouin, crevette grise, moule).
   Stats : type, poids (ou taille), origine ou habitat. Paquet « Faune belge » (80 pièces), séries « Chiens belges » et
   « Faune sauvage ». Mise en avant ×3 jusqu'au 28 février 2027. Ardennais roux (mouton) écarté : pas d'image libre.
   Photos du malinois, du cerf et de l'anguille remplacées (relues à l'œil).
2. [x] **Militaires et Résistance** (catégorie « Mémoire », 56 cartes après agrandissement) : généraux (Leman, Jacques de Dixmude,
   Brialmont…), résistants des deux guerres (Gabrielle Petit et Andrée De Jongh en mythiques, Dewé, Livchitz,
   Bervoets…), batailles, forts et lieux de mémoire (Yser, Breendonk, Caserne Dossin, Mardasson…). Stats : naissance
   ou année, conflit, rôle. Paquet « Mémoire » (80 pièces), séries « La Grande Guerre » et « Résistance ». Événement
   du **11 novembre** (du 4 au 11) : 3 éditions limitées (Armistice, Coquelicot, Tour de l'Yser) et version
   « Coquelicot ». Sans image libre : réseau Comète, Dame Blanche, Marthe McKenna, Armée secrète ; Jean-Baptiste
   Piron (vitrine de musée seulement) et bataille de la Lys (carte) écartés.
   Générées avec `node tools/build-cards.mjs --ajout=militaire` (Wikidata seul, rareté selon le nombre de
   Wikipédias) : la prochaine régénération complète recalculera leur rareté avec les visites.
   **Agrandissement** (32 → 56 et 33 → 64 cartes, l'utilisateur avait fini Mémoire en 3 minutes) : forts de Liège,
   Edith Cavell, Tyne Cot, Ploegsteert, Hannut, l'Escaut, résistants du 20ᵉ convoi et du Groupe G, musées ;
   renard, blaireau, hérisson, loutre, oiseaux des jardins et de la côte, amphibiens, reptiles, insectes, poissons.
   Séries « Forts de Liège » et « Oiseaux de Belgique ». Paquets médians pour tout finir avec le paquet dédié :
   ≈ 145 (Mémoire), ≈ 70 (Faune). Viser au moins 50–60 cartes pour les prochains paquets thématiques. Sans page FR
   ou sans image : bataillon de Corée, paras de Kigali, siège de Bastogne (carte), Marcel Louette.
3. [x] **En route !** (paquet commun, 55 cartes en trois catégories, chacune avec son filtre) :
   - **Aviation** (20) : Stampe SV-4, Renard R.31, Fairey Fox, F-16, Mirage 5, C-130, A400M, Sabena, Brussels
     Airlines, aéroports (Zaventem, Liège, Charleroi, Haren), aviateurs (Coppens, Thieffry, Offenberg, Olieslagers,
     de Caters, Hélène Dutrieu, Auguste Piccard).
   - **Rail** (25) : Le Belge, Bruxelles–Malines, SNCB, vicinaux, tram de la Côte, tram et métro de Bruxelles,
     jonction Nord-Midi, grandes gares, Thalys, Eurostar, Nagelmackers et l'Orient-Express, Vennbahn, viaduc de
     Moresnet, chemin de fer du Bocq, Train World.
   - **Exploration** (10) : expédition de la Belgica, base Princesse Élisabeth, Belgica (A962), Gaston de Gerlache,
     Alain Hubert, Tazieff, Hennepin, De Smet, Verbiest, Rubrouck.
   Stats : naissance, année ou premier vol ; type ; constructeur, lieu, longueur… Séries « Grandes gares » et
   « Pionniers du ciel ». Mise en avant ×3 jusqu'au 31 mars 2027. Écartés : officiers de l'État indépendant du Congo
   (Lemaire, Storms, Coquilhat…), navire-école Mercator (photo inutilisable), malle Ostende-Douvres (pas d'article).
La phase 6 est terminée : « Mémoire », « Faune belge » et « En route ! ».

4. [x] **Banque nationale** (demande de l'utilisateur) : catégorie « Monnaie et banque » (30 cartes : la BNB en
   mythique, 12 gouverneurs, Lamfalussy, Peter Praet, franc, euro, Union monétaire latine, UEBL, réserve d'or,
   Hôtel des Monnaies, Monnaie royale, bourses de Bruxelles et d'Anvers, Euroclear, Belfius, Bancontact, BCE, BRI,
   FMI) ; le paquet reprend aussi 7 cartes de Politique (`BNB_EXTRA` dans app.js : de Haussy, Theunis, Théophile de
   Lantsheere, Van Zeeland, Frère-Orban, Gutt, Maystadt). Série « Gouverneurs de la Banque nationale ».
   - [x] **Pièces et billets** (22 cartes « manuelles », `MONNAIES` dans le générateur, rareté fixée à la main) :
     13 pièces du domaine public de 1833 à 1930 (graveurs Braemt, Wiener, Michaux, Devreese) et 9 billets en francs
     (1929, 1943, Lambert Lombard, puis la série Ensor, Sax, Magritte, Permeke, Horta, Albert II et Paola). Billets :
     modèle Commons « Belgian franc banknote », la BNB autorise leur reproduction en illustration tant qu'on ne peut
     pas les confondre avec de vrais billets. Le paquet compte maintenant 59 cartes.
   - [ ] **Collègues de l'utilisateur** (avec leur accord écrit) : photos fournies par eux, stockées dans le dépôt
     (exception à la règle « images Commons » ; Commons supprime les photos de personnes non connues), retrait
     possible à tout moment. Le générateur doit accepter ces images locales. Pas de logo officiel de la BNB.
   - Sans image libre : 7 gouverneurs (Hautain, Janssen, Goffin, Frère, Ansiaux, Vandeputte, de Strycker, Godeaux),
     Société Générale, Banque de Belgique, SWIFT, BNP Paribas Fortis, Robert Triffin. Écartés : personnages de BD (aucune image libre ; seule piste, les
fresques BD de Bruxelles) et logos de chocolatiers (protégés).

Photos remplacées (octobre 2026, `PHOTO_FIX` et options `img` du générateur, `--photos` pour appliquer sans tout
régénérer) : Jean-Pol Poncelet, malinois, cerf élaphe, anguille. Sans autre photo sur Commons : Patrick Lansens (le
fichier montre peut-être Sven Gatz) et Frantz Van Dorpe (photo de conseil communal) — décision de l'utilisateur. Promo en cours : Nouveautés 150 au lieu de 300, Prestige 400 au lieu de 600 (`was`
dans `PACKS`).

## Phase 5 — En ligne

- [ ] **Comptes et sauvegarde sur serveur** (Supabase envisagé) : connexion, sauvegarde dans le cloud, reprise d'une partie locale par import.
- [ ] **Marché d'échange entre joueurs** : annonces visibles par tous, échanges à distance sans se croiser ; tirages et inventaires vérifiés côté serveur pour éviter la triche.
