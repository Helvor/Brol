# Brol — notes pour Claude

Jeu de cartes à collectionner sur la Belgique (politique, bourgmestres, culture, sport, communes…), site statique
publié sur GitHub Pages : https://helvor.github.io/Brol/. Tout est en français (code commenté en français, réponses
en français) ; l'interface existe en FR et NL.

## Structure
- `index.html`, `style.css`, `app.js` (jeu, paquets, album, missions…), `games.js` (mini-jeux), `trade.js` (échanges
  par code), `achievements.js`, `i18n.js` (textes FR/NL), `share.js` (image de partage), `sfx.js`, `sw.js` (PWA).
- `data/cards.js` est **généré** par `tools/build-cards.mjs` (Wikidata, Wikipédia, Commons ; cache `tools/.cache.json`).
  Ne pas l'éditer à la main : modifier le générateur et relancer `node tools/build-cards.mjs`. Pour ajouter une
  catégorie sans tout régénérer (Wikipédia et Commons limitent souvent les requêtes, le cache n'est pas versionné) :
  `node tools/build-cards.mjs --ajout=animal` (ou `militaire`, `aviation`, `rail`, `exploration` ; Wikidata seul ;
  nouvelle catégorie : l'ajouter à `AJOUTS` dans le générateur).
- `data/images.js` (adresses directes des images, `tools/build-images.mjs`, lancé par build-cards) et `data/focus.js`
  (cadrage sur le visage, `python3 tools/build-focus.py [--hors-ligne]`, demande opencv-python-headless).
- Sauvegarde du joueur : localStorage `rue-de-la-loi:v1` (`state.owned` : clé `id` ou `id|finish`).

## Règles de travail
- Images : uniquement libres (Wikimedia Commons ou Wikidata P18). Jamais de photo d'un site d'actualité, de parti ou
  de commune. Relire à l'œil toute photo trouvée automatiquement (mauvaise personne, signature, foule, carte…).
- Ne jamais retirer une carte existante sans l'accord de l'utilisateur (elle disparaîtrait des albums et échanges).
- `npm test` (données + Playwright) doit être vert avant chaque commit ; vérifier visuellement les changements d'UI
  (captures mobile et ordinateur).
- Branche de travail → PR vers `main` ; l'utilisateur merge, GitHub Actions teste puis déploie.
- Wikimedia limite fortement les requêtes : espacer les appels, garder les caches.

## En cours / suite
Phase 6 (nouveaux paquets) terminée. Restent dans `ROADMAP.md` : photos à remplacer (malinois, cerf, anguille,
bourgmestres douteux), équilibrage de Formation de gouvernement, mise à jour automatique des données, phase 5
(comptes en ligne). Viser 50 cartes au moins par paquet thématique ; listes à faire valider avant de générer. Nouvelle catégorie : l'ajouter à `FEATURED`
(app.js) pour qu'elle ne se noie pas dans le paquet Belgique.
