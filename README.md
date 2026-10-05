# Brol

Jeu local d'ouverture de paquets de cartes sur la Belgique : politique, monarchie, culture, sport, art, gastronomie, enseignement, communes, provinces, régions et événements. Seules les entrées avec une image libre (Wikimedia Commons) ont une carte.

## Lancer

```
node tools/serve.mjs
```

Puis ouvrir http://localhost:5173. La collection est sauvegardée dans le navigateur (localStorage).

## Fonctionnalités

- Interface et cartes en français et en néerlandais (bouton FR/NL). Les noms néerlandais viennent de Wikidata ; les textes de l'interface sont dans `i18n.js`.
- Raretés relatives : dans chaque catégorie, les cartes sont classées par notoriété puis réparties selon les mêmes proportions, si bien que chaque paquet contient des mythiques et que les taux affichés sont justes pour tous les paquets.
- Paquet spécial Prestige (600 pièces, 5ᵉ carte légendaire ou mieux) et lot de 10 paquets à −10 % sur les autres.
- Garantie anti-malchance : une légendaire ou mieux au plus tard tous les 40 paquets (`PITY` dans `app.js`).
- Séries thématiques et 65 succès (`achievements.js`), dont des succès secrets.
- Onglet Jeux (`games.js`) : Formation de gouvernement, Belgle (carte du jour), Chronologie, Tour de Belgique, Plus ou moins. Gains plafonnés à 1 500 pièces par jour.
- Onglet Échanges (`trade.js`) : échange de doublons entre amis par QR code ou par lien, sans serveur. QR codes générés et lus dans le navigateur (`vendor/` : qrcode-generator, MIT ; jsQR, Apache-2.0).
- Fusion des doublons (bouton Fusionner dans l'album), carte du jour avec série, paquets d'événement limités dans le temps (`EVENT_PACKS` dans `app.js`) et export/import de la partie (bas de page).
- Sons synthétisés par le navigateur (`sfx.js`), sans fichier audio. Bouton pour couper le son.

## Régénérer les cartes

```
node tools/build-cards.mjs           # utilise le cache des requêtes (quelques secondes)
node tools/build-cards.mjs --fresh   # tout re-télécharger (environ 20 minutes)
```

Le script interroge Wikidata (et Wikipédia pour la composition du gouvernement actuel et les photos manquantes), puis réécrit `data/cards.js`. Le gouvernement en fonction est lu sur la page « Gouvernement De Wever » de Wikipédia FR : changer `CURRENT_GOV` dans le script après un remaniement ou un nouveau gouvernement. Les règles de rareté sont dans ce script :

- Personnalités : mythique = Premier ministre 6 ans ou plus, légendaire = Premier ministre, épique = ministre-président régional, rare = ministre fédéral, peu commune / commune = député fédéral avec photo (3 législatures ou plus / sinon). Membres du gouvernement actuel : au moins rare, épique pour les vice-Premiers.
- Rois : légendaire, mythique pour un règne de 40 ans ou plus.
- Culture & sport (liste `FAMOUS` dans le script, titres Wikipédia FR) : rareté selon le nombre de Wikipédias qui ont un article (légendaire ≥ 90, épique ≥ 55, rare ≥ 30, peu commune ≥ 15).
- Communes, selon la population : légendaire ≥ 150 000, épique ≥ 60 000, rare ≥ 25 000, peu commune ≥ 12 000, sinon commune.
- Provinces : épique. Régions : légendaire. Événements (écrits à la main) : mythique.

Versions spéciales (Holo, Plein cadre, Dorée) : tirées pour chaque carte, indépendamment de la rareté ; la version Plein cadre utilise une autre photo libre de la catégorie Commons quand il y en a une. Listes choisies à la main dans le script : `FAMOUS` (culture), `SPORTS`, `ARTWORKS`, `SCHOOLS`, `DISHES`.

Taux de tirage, versions spéciales, prix des paquets, bonus, paquets gratuits et valeurs de revente : en haut de `app.js`.
Après un changement, `node tools/simulate.mjs [minutes] [parties]` mesure l'effet sur l'économie (pièces gagnées au fil du temps par un joueur normal et par un joueur qui achète pour revendre).

Carte du Tour de Belgique : contour simplifié © contributeurs OpenStreetMap (`data/belgium.js`).

Images : Wikimedia Commons, chargées en ligne. Le lien « Crédit de l'image » de chaque carte mène à l'auteur et à la licence.
