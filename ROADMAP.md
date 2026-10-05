# Roadmap

Ce qui est prévu pour Brol, dans l'ordre envisagé. Chaque étape reste un site statique jusqu'à la phase 5.

## Phase 1 — Données fiables

- [ ] **Parti le plus récent** : n'afficher que le dernier parti connu (exemple : Maggie De Block apparaît en « sp.a »). Dans `tools/build-cards.mjs`, trier les affiliations Wikidata (P102) par date et prendre la plus récente.
- [ ] **Titres Wikipédia introuvables** : corriger Pauwel Kwak, Brugse Zot, Gille, Saint-Nicolas, Géant processionnel, Pêche à la crevette à cheval, Vaya Con Dios, Clouseau, Dimitri Vegas & Like Mike, Fêtes de Gand, Lokerse Feesten, Ronquières Festival, Brussels Jazz Marathon (voir `tools/build.log`).
- [x] **Économie revue** : revente des doublons ramenée sous la moitié du prix d'un paquet (avant : 3,7 fois le prix, d'où des milliers de pièces en quelques minutes), récompenses des succès divisées par trois (sauf secrets). Mesuré avec `tools/simulate.mjs`, qui fait jouer deux joueurs types pendant une ou deux heures avec le vrai code du jeu.
- [x] **Lot de 10 paquets** : 10 % moins cher, payé en pièces, une rangée par paquet à l'ouverture.
- [ ] **Statistiques de tirage** : script `tools/simulate.mjs` qui simule 100 000 paquets de chaque type et compare les taux obtenus aux taux affichés (raretés, versions spéciales, garantie anti-malchance). Il repère aussi les paquets où une rareté manque et où le tirage se reporte sur la rareté voisine.
- [ ] **Tests automatiques** : test navigateur (Playwright) lancé par GitHub Actions à chaque push. Il ouvre un paquet, l'album, la fiche détail et les 5 mini-jeux, passe en NL et en mobile, et échoue à la moindre erreur JavaScript.

## Phase 2 — Gameplay

- [ ] **Fusion de doublons** : 5 exemplaires d'une rareté → une carte au hasard de la rareté au-dessus (dans la même catégorie) ; 3 exemplaires d'une même carte → sa version Holo. Écran de fusion dans l'album et succès associés.
- [x] **Échanges par QR code ou lien** (onglet Échanges, sans serveur) : doublons uniquement, version précise de chaque carte, cartes mises de côté pendant l'échange, chaque échange ne sert qu'une fois, scanner intégré, succès d'échange. Limite connue : sans serveur, rien n'empêche un joueur de tricher (comme pour les pièces aujourd'hui).
- [ ] **Export/import de la sauvegarde** : télécharger sa partie dans un fichier et la réimporter. Ça protège d'un cache effacé et permet de passer d'un appareil ou d'une adresse à l'autre en attendant les comptes. Le format servira aussi à migrer les parties vers le serveur en phase 5.
- [ ] **Partager une carte** : générer une image (PNG) d'une carte, avec sa version spéciale, pour la partager par message ou sur les réseaux (Web Share API sur mobile, téléchargement sinon). Garder le crédit de l'image sur le visuel.
- [ ] **Mode daltonien et accessibilité** : distinguer les raretés autrement que par la couleur (forme de la gemme, motif), navigation complète au clavier, contrastes vérifiés dans les deux thèmes.
- [ ] **Équilibrage de Formation de gouvernement** après quelques parties (durée, difficulté, gains).

## Phase 3 — Identité et mobile

- [ ] **Logo Brol** pour remplacer la case de bulletin de vote : en-tête, dos des cartes, favicon et icônes d'application.
- [ ] **Version installable (PWA)** : manifeste, icônes, service worker. Le jeu s'ouvre hors ligne ; les images Commons déjà vues restent en cache.
- [ ] **Carte du jour** : une carte offerte chaque jour à la connexion, avec une série de jours consécutifs.
- [ ] **Calendrier d'événements belges** : paquets limités dans le temps (Fête nationale le 21 juillet, Carnaval de Binche, Saint-Nicolas, Tour des Flandres, Fêtes de Wallonie, 11 juillet…), avec des chances accrues dans les catégories concernées.

## Phase 4 — Contenu

- [ ] **Nouvelle catégorie Sciences** : scientifiques et inventeurs belges (Lemaître, Sax, Solvay, Vésale, Mercator, Englert, de Duve…), avec photos libres et rareté relative comme les autres catégories. Vendue dans un nouveau paquet « Sciences ».
- [ ] **Mise à jour automatique des données** : GitHub Action mensuelle qui relance `node tools/build-cards.mjs --fresh` et ouvre une pull request avec les changements (nouveaux ministres, populations, photos). Ajouter un garde-fou : signaler les cartes disparues, pour ne pas casser les collections existantes.

## Phase 5 — En ligne

- [ ] **Comptes et sauvegarde sur serveur** (Supabase envisagé) : connexion, sauvegarde dans le cloud, reprise d'une partie locale par import.
- [ ] **Marché d'échange entre joueurs** : annonces visibles par tous, échanges à distance sans se croiser ; tirages et inventaires vérifiés côté serveur pour éviter la triche.
