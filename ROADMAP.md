# Roadmap

Ce qui est prévu pour Brol, dans l'ordre envisagé. Chaque étape reste un site statique jusqu'à la phase 5.

## Phase 1 — Données fiables

- [x] **Parti le plus récent** : dernier parti connu d'après les dates Wikidata (P102). La table des partis du générateur confondait Open Vld (Q1160192, aujourd'hui « Anders ») avec le sp.a : Maggie De Block, De Croo, Verhofstadt… apparaissaient en « sp.a » et en rouge. Corrigé (Open VLD, bleu).
- [x] **Titres Wikipédia introuvables** : titres corrigés dans le générateur (Jan Pieter Minckelers, Kwak, Brugse Zot et Lokerse Feesten via Wikipédia NL, Saint-Nicolas (fête), Gentse Feesten, Brussels Jazz Weekend…). Ronquières Festival n'a pas d'image libre et reste sans carte.
- [x] **Économie revue** : revente des doublons ramenée à environ 60 % du prix d'un paquet, puis valeurs revues pour que les cartes rares valent cher (mythique 340 pièces, légendaire 75, éditions limitées ×2) et les communes presque rien (1 pièce) (avant : 3,7 fois le prix, d'où des milliers de pièces en quelques minutes), récompenses des succès divisées par trois (sauf secrets). Mesuré avec `tools/simulate.mjs`, qui fait jouer deux joueurs types pendant une ou deux heures avec le vrai code du jeu.
- [x] **Paquet Prestige** (600 pièces) : toutes les cartes, 5ᵉ carte légendaire ou mieux garantie (≈ 12 % de mythiques). Pièces uniquement.
- [x] **Lot de 10 paquets** : 10 % moins cher, payé en pièces, une rangée par paquet à l'ouverture.
- [ ] **Statistiques de tirage** : script `tools/simulate.mjs` qui simule 100 000 paquets de chaque type et compare les taux obtenus aux taux affichés (raretés, versions spéciales, garantie anti-malchance). Il repère aussi les paquets où une rareté manque et où le tirage se reporte sur la rareté voisine.
- [x] **Tests automatiques** : test navigateur (Playwright) lancé par GitHub Actions à chaque push. Il ouvre un paquet, l'album, la fiche détail et les 5 mini-jeux, passe en NL et en mobile, et échoue à la moindre erreur JavaScript.

- [x] **Rareté revue** : mythique réservée à ~25 icônes choisies à la main (`MYTHIQUES` dans le générateur) ; notoriété mesurée par les visites Wikipédia FR + NL sur 12 mois (au lieu du nombre de langues) ; politique classée par carrière (années de Premier ministre, gouvernements, postes) ; événements de épique à mythique, provinces rares ou épiques selon la population. Taux réels affichés paquet par paquet.

## Phase 2 — Gameplay

- [x] **Fusion de doublons** (bouton Fusionner dans l'album) : 5 doublons standard d'une rareté → une carte au hasard de la rareté au-dessus ; 3 doublons d'une même carte → sa version Holo. Un exemplaire est toujours gardé. Succès associés.
- [x] **Échanges par QR code ou lien** (onglet Échanges, sans serveur) : doublons uniquement, version précise de chaque carte, cartes mises de côté pendant l'échange, chaque échange ne sert qu'une fois, scanner intégré, succès d'échange. Limite connue : sans serveur, rien n'empêche un joueur de tricher (comme pour les pièces aujourd'hui).
- [x] **Export/import de la sauvegarde** (liens en bas de page) : télécharger sa partie dans un fichier et la réimporter. Ça protège d'un cache effacé et permet de passer d'un appareil ou d'une adresse à l'autre en attendant les comptes. Le format servira aussi à migrer les parties vers le serveur en phase 5.
- [ ] **Partager une carte** : générer une image (PNG) d'une carte, avec sa version spéciale, pour la partager par message ou sur les réseaux (Web Share API sur mobile, téléchargement sinon). Garder le crédit de l'image sur le visuel.
- [ ] **Mode daltonien et accessibilité** : distinguer les raretés autrement que par la couleur (forme de la gemme, motif), navigation complète au clavier, contrastes vérifiés dans les deux thèmes.
- [ ] **Équilibrage de Formation de gouvernement** après quelques parties (durée, difficulté, gains).

## Phase 3 — Identité et mobile

- [ ] **Logo Brol** pour remplacer la case de bulletin de vote : en-tête, dos des cartes, favicon et icônes d'application.
- [ ] **Version installable (PWA)** : manifeste, icônes, service worker. Le jeu s'ouvre hors ligne ; les images Commons déjà vues restent en cache.
- [x] **Carte du jour** : une carte et 20 pièces par jour ; série de jours consécutifs (rare ou mieux dès le 3ᵉ jour, épique dès le 5ᵉ, légendaire tous les 7 jours).
- [x] **Calendrier d'événements belges** (Carnaval, Tour des Flandres, Fête de l'Iris, 11 juillet, 21 juillet, Fêtes de Wallonie, Saint-Nicolas ; dates mobiles calculées) : paquets limités dans le temps (Fête nationale le 21 juillet, Carnaval de Binche, Saint-Nicolas, Tour des Flandres, Fêtes de Wallonie, 11 juillet…), avec des chances accrues dans les catégories concernées.
- [x] **Cartes exclusives des paquets spéciaux** : 3 cartes « Édition limitée » par paquet spécial (24 en tout, de l'Ordre de Léopold aux Échasseurs namurois), une série et des succès associés ; une version propre à chaque paquet (Rouge à la Saint-Nicolas, Pavé au Tour des Flandres…), avec un taux bas.

## Phase 4 — Contenu

- [x] **Nouvelle catégorie Sciences** (35 cartes) : scientifiques et inventeurs belges (Lemaître, Sax, Solvay, Vésale, Mercator, Englert, de Duve…), avec photos libres et rareté relative comme les autres catégories. Vendue dans un nouveau paquet « Sciences ».
- [ ] **Mise à jour automatique des données** : GitHub Action mensuelle qui relance `node tools/build-cards.mjs --fresh` et ouvre une pull request avec les changements (nouveaux ministres, populations, photos). Ajouter un garde-fou : signaler les cartes disparues, pour ne pas casser les collections existantes.

## Phase 5 — En ligne

- [ ] **Comptes et sauvegarde sur serveur** (Supabase envisagé) : connexion, sauvegarde dans le cloud, reprise d'une partie locale par import.
- [ ] **Marché d'échange entre joueurs** : annonces visibles par tous, échanges à distance sans se croiser ; tirages et inventaires vérifiés côté serveur pour éviter la triche.
