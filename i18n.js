// Traductions FR / NL : interface et données des cartes
(() => {
  'use strict';

  const UI = {
    fr: {
      'tab.shop': 'Paquets', 'tab.binder': 'Album', 'tab.series': 'Séries', 'tab.ach': 'Succès', 'tab.games': 'Jeux', 'tab.trade': 'Échanges',
      'shop.title': 'Paquets', 'binder.title': 'Album', 'series.title': 'Séries', 'ach.title': 'Succès',
      'search': 'Rechercher', 'owned': 'Possédées', 'specials': 'Versions spéciales', 'sellAll': 'Vendre les doublons', 'fuse': 'Fusionner',
      'fuseTitle': 'Fusion', 'fuseIntro': () => 'Transforme tes doublons au lieu de les vendre. Un exemplaire de chaque carte est toujours gardé ; seules les versions standard sont utilisées.',
      'fuseUp': 'Monter en rareté', 'fuseHave': n => `${n} doublon${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`, 'fuseGo': 'Fusionner',
      'fuseHoloH': n => `Version Holo · ${n} doublons d’une même carte`, 'fuseToHolo': '→ Holo', 'fuseNoHolo': n => `Il faut ${n} exemplaires standard d’une même carte.`,
      'nextEvent': (n, d) => `Prochain paquet d’événement : <b>${n}</b>, dès le ${d}`, 'eventUntil': d => `Jusqu’au ${d}`, 'eventNote': 'Édition limitée · pièces uniquement',
      'dailyTitle': 'Carte du jour', 'dailyNext': (n, r) => `Jour ${n} · ${r} ou mieux`, 'dailyDone': 'Carte du jour reçue', 'dailyStreak': n => `Série de ${n} jour${n > 1 ? 's' : ''} · reviens demain`,
      'dailyDay': n => `Carte du jour · jour ${n}`, 'dailyHint': 'Touche la carte pour la retourner', 'dailyTomorrow': r => `demain : ${r} ou mieux`, 'dailyNextAny': n => `Jour ${n} · une carte offerte`, 'dailyCome': 'reviens demain pour continuer ta série', 'coinsWord': 'pièces',
      'bugBtn': 'Signaler un bug', 'bugTitle': 'Signaler un bug', 'bugIntro': 'Explique ce que tu faisais et ce qui ne va pas, puis envoie-le sur GitHub ou par e-mail.',
      'bugPh': 'Ex. : en ouvrant 10 paquets Prestige, la page se fige…', 'bugTech': 'Joindre les infos techniques (version, appareil, dernières erreurs — jamais ta partie)',
      'bugApp': 'Ouvrir dans l’app GitHub', 'bugWeb': 'Ouvrir sur GitHub', 'bugWebAlt': 'ou dans le navigateur', 'bugMail': 'Envoyer par e-mail', 'bugReq': 'Avec un compte GitHub (obligatoire) :', 'bugOr': 'Sans compte GitHub :', 'bugNote': 'GitHub : le texte est aussi copié, colle-le si l’app ne le reprend pas. E-mail : ta messagerie s’ouvre avec le message prêt, vers brol-support@elveli.net.',
      'bugCopied': 'Texte du signalement copié', 'bugEmpty': 'Décris le problème en quelques mots',
      'export': 'Exporter ma partie', 'import': 'Importer une partie', 'exported': 'Partie exportée',
      'importBad': 'Ce fichier n’est pas une sauvegarde Brol.', 'importConfirm': (n, c) => `Remplacer ta partie actuelle par celle du fichier (${n} cartes, ${c} pièces) ?`,
      'allRarities': 'Toutes les raretés', 'all': 'Tout', 'liveGov': 'Gouvernement actuel',
      'hint': 'Clique pour déchirer', 'flipAll': 'Tout retourner', 'toAlbum': 'Voir l’album', 'close': 'Fermer',
      'credits': 'Données : <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a> (CC0) et Wikipédia. Images : <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a>, auteurs et licences sur la page de chaque fichier. Carte : © contributeurs <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>.',
      'reset': 'Réinitialiser la partie', 'resetConfirm': 'Effacer ta collection et recommencer ?',
      'cards5': '5 CARTES', 'openHere': 'OUVRIR ICI', 'seal': 'BROL · CARTES DE COLLECTION · BELGIQUE · ',
      'back': 'Collection', 'backSeal': 'BROL · CARTES · BELGIQUE · ',
      'free': n => `${n} gratuit${n > 1 ? 's' : ''}`, 'freeIn': t => `+1 dans ${t}`, 'freeFull': 'réserve pleine',
      'pity': n => n <= 1 ? 'Légendaire garantie au prochain paquet' : `Légendaire garantie dans ${n} paquets au plus`,
      'noCoins': 'Pas assez de pièces', 'perDay': 'Plus de paquet Nouveautés aujourd’hui, reviens demain', 'perDayLeft': (n, m) => `Encore ${n} sur ${m} aujourd’hui · pièces uniquement`, 'albumFull': 'Il te manque moins de 5 cartes : album presque complet !', 'freePack': 'Paquet gratuit', 'paid': p => `−${p} pièces`,
      'new': 'Nouvelle', 'dup': 'Doublon',
      'summary': (n, d, s, b) => `<b>${n}</b> nouvelle${n > 1 ? 's' : ''} · ${d} doublon${d > 1 ? 's' : ''}${s ? ` · <b>${s}</b> version${s > 1 ? 's' : ''} spéciale${s > 1 ? 's' : ''}` : ''}${b ? ` · <b>+${b}</b> pièces` : ''}`,
      'pityHit': 'Garantie anti-malchance déclenchée !',
      'again': p => p === null ? 'Rouvrir · gratuit' : `Rouvrir · ${p}`,
      'again10': (n, p) => `Rouvrir ×${n} · ${p}`,
      'knownFor': 'Connu pour', 'share': 'Partager l’image', 'sharing': 'Préparation…', 'shareSaved': 'Image enregistrée', 'shareFail': 'Impossible de créer l’image (photo indisponible ?)', 'notifOff': 'Activer les rappels', 'notifOn': 'Rappels activés', 'notifOnToast': 'Rappels activés : on te prévient quand tes paquets gratuits et ta carte du jour t’attendent',
      'notifDenied': 'Notifications refusées par le navigateur', 'notifFreeTitle': 'Paquets gratuits prêts', 'notifFreeBody': n => `Tes ${n} paquets gratuits t’attendent.`,
      'notifDailyTitle': 'Carte du jour', 'notifDailyBody': 'Ta carte du jour est prête.', 'weeklyTitle': 'Défi de la semaine', 'weeklyLeft': n => `encore ${n} jour${n > 1 ? 's' : ''}`, 'weeklyDone': 'réussi, nouveau défi lundi',
      'weeklyClaim': 'Réclamer', 'weeklyReward': c => `Ticket Prestige + ${c}`, 'weeklyGot': c => `Ticket Prestige et ${c} pièces !`,
      'ticketBadge': n => `${n} ticket${n > 1 ? 's' : ''}`, 'ticketUsed': 'Ticket Prestige utilisé', 'install': 'Installer l’appli', 'installed': 'Brol est installé !', 'installIOS': 'Dans Safari, touche le bouton Partager, puis « Sur l’écran d’accueil ».', 'scTitle': 'Ta vitrine', 'freeTitle': 'Paquets gratuits', 'scCount': (o, t, p) => `${o} / ${t} cartes · ${p} %`, 'scEmpty': 'Ouvre un paquet pour remplir ta vitrine.', 'missionsTitle': 'Missions du jour', 'missionsAll': 'toutes faites, à demain !',
      'lateBonus': m => `bonus album ×${m}`, 'lateOn': m => `doublons revendus ×${m} (album à 80 %)`, 'lateOff': (p, m) => `à ${p} % de l’album, doublons revendus ×${m}`, 'edTag': 'Édition limitée', 'edStatPack': 'Paquet', 'edStatNo': 'N°', 'edStatPrice': 'Prix', 'edFrom': 'Du', 'edTo': 'Au',
      'edWhere': p => `Paquet ${p}`, 'exclLine': (n, got) => `${n} cartes exclusives${got ? ` · ${got}/${n}` : ''}`,
      'evFinLine': f => `Version ${f}, introuvable ailleurs`, 'oddsExcl': 'Édition limitée', 'perPack': 'par paquet', 'perCard': 'par carte', 'packOdds': 'Taux de ce paquet', 'oddsCards': 'cartes 1–4', 'oddsLast': '5ᵉ carte', 'bulk': n => `×${n}`, 'bulkOff': n => `−${n} %`,
      'binderSummary': (o, t, s, p, d) => `${o} sur ${t} cartes · ${s} version${s > 1 ? 's' : ''} spéciale${s > 1 ? 's' : ''} · ${p} paquet${p > 1 ? 's' : ''} · ${d} doublon${d > 1 ? 's' : ''}`,
      'emptyOwned': 'Aucune carte ici pour l’instant.', 'emptyAll': 'Aucune carte ne correspond.',
      'more': n => `Afficher plus (${n})`,
      'sellConfirm': (n, g) => `Vendre ${n} doublon${n > 1 ? 's' : ''} pour ${g} pièces ?\nUn exemplaire de chaque version est gardé.`,
      'coinsPlus': g => `+${g} pièces`,
      'seriesSummary': (d, t) => `${d} série${d > 1 ? 's' : ''} complétée${d > 1 ? 's' : ''} sur ${t} · une récompense par série complète`,
      'seriesBanner': 'Série', 'clearFilter': 'Retirer le filtre', 'claim': 'Récupérer', 'claimed': 'Récompense reçue', 'see': 'Voir les cartes',
      'seriesDone': g => `Série complète : +${g} pièces`,
      'wikidata': 'Fiche Wikidata', 'imgCredit': 'Crédit de l’image', 'coaCredit': 'Crédit du blason',
      'copies': 'Exemplaires', 'value': 'Valeur', 'coins': n => `${n} pièces`, 'party': 'Parti',
      'sellOne': v => `Vendre un doublon · +${v}`, 'seriesH': 'Séries', 'career': 'Parcours',
      'achSummary': (u, t, c) => `${u} sur ${t} succès · ${c} pièces gagnées grâce aux succès`,
      'achUnlocked': 'Succès débloqué', 'achRecent': 'Derniers succès', 'achNew': 'Nouveau', 'secret': 'Succès secret', 'secretDesc': 'Continue à jouer pour le découvrir.',
      'themeAuto': 'Thème : automatique', 'themeLight': 'Thème : clair', 'themeDark': 'Thème : sombre',
      'soundOn': 'Son activé', 'soundOff': 'Son coupé', 'versionsOwned': 'Versions possédées',
      'gov': 'Gouv.', 'live': 'en fonction', 'leg': n => `${n}ᵉ législature`,
    },
    nl: {
      'tab.shop': 'Pakjes', 'tab.binder': 'Album', 'tab.series': 'Reeksen', 'tab.ach': 'Prestaties', 'tab.games': 'Spellen', 'tab.trade': 'Ruilen',
      'shop.title': 'Pakjes', 'binder.title': 'Album', 'series.title': 'Reeksen', 'ach.title': 'Prestaties',
      'search': 'Zoeken', 'owned': 'In bezit', 'specials': 'Speciale versies', 'sellAll': 'Dubbels verkopen', 'fuse': 'Samensmelten',
      'fuseTitle': 'Samensmelten', 'fuseIntro': () => 'Maak iets van je dubbele kaarten in plaats van ze te verkopen. Van elke kaart hou je altijd één exemplaar; enkel standaardversies worden gebruikt.',
      'fuseUp': 'Zeldzamer maken', 'fuseHave': n => `${n} dubbele beschikbaar`, 'fuseGo': 'Samensmelten',
      'fuseHoloH': n => `Holoversie · ${n} dubbele van dezelfde kaart`, 'fuseToHolo': '→ Holo', 'fuseNoHolo': n => `Je hebt ${n} standaardexemplaren van dezelfde kaart nodig.`,
      'nextEvent': (n, d) => `Volgend evenementpakje: <b>${n}</b>, vanaf ${d}`, 'eventUntil': d => `Tot ${d}`, 'eventNote': 'Beperkte editie · alleen met munten',
      'dailyTitle': 'Kaart van de dag', 'dailyNext': (n, r) => `Dag ${n} · ${r} of beter`, 'dailyDone': 'Kaart van de dag ontvangen', 'dailyStreak': n => `Reeks van ${n} dag${n > 1 ? 'en' : ''} · kom morgen terug`,
      'dailyDay': n => `Kaart van de dag · dag ${n}`, 'dailyHint': 'Tik op de kaart om ze om te draaien', 'dailyTomorrow': r => `morgen: ${r} of beter`, 'dailyNextAny': n => `Dag ${n} · een gratis kaart`, 'dailyCome': 'kom morgen terug om je reeks voort te zetten', 'coinsWord': 'munten',
      'bugBtn': 'Bug melden', 'bugTitle': 'Bug melden', 'bugIntro': 'Leg uit wat je deed en wat er misloopt, en stuur het via GitHub of per e-mail.',
      'bugPh': 'Bv.: bij het openen van 10 Prestige-pakjes loopt de pagina vast…', 'bugTech': 'Technische info meesturen (versie, toestel, laatste fouten — nooit je spel)',
      'bugApp': 'Openen in de GitHub-app', 'bugWeb': 'Openen op GitHub', 'bugWebAlt': 'of in de browser', 'bugMail': 'Per e-mail versturen', 'bugReq': 'Met een GitHub-account (verplicht):', 'bugOr': 'Zonder GitHub-account:', 'bugNote': 'GitHub: de tekst wordt ook gekopieerd, plak hem als de app hem niet overneemt. E-mail: je mailapp opent met het bericht klaar, naar brol-support@elveli.net.',
      'bugCopied': 'Tekst van de melding gekopieerd', 'bugEmpty': 'Beschrijf het probleem in een paar woorden',
      'export': 'Mijn spel exporteren', 'import': 'Een spel importeren', 'exported': 'Spel geëxporteerd',
      'importBad': 'Dit bestand is geen Brol-spel.', 'importConfirm': (n, c) => `Je huidige spel vervangen door dat uit het bestand (${n} kaarten, ${c} munten)?`,
      'allRarities': 'Alle zeldzaamheden', 'all': 'Alles', 'liveGov': 'Huidige regering',
      'hint': 'Klik om open te scheuren', 'flipAll': 'Alles omdraaien', 'toAlbum': 'Naar het album', 'close': 'Sluiten',
      'credits': 'Gegevens: <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a> (CC0) en Wikipedia. Afbeeldingen: <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a>, auteurs en licenties op de pagina van elk bestand. Kaart: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-bijdragers.',
      'reset': 'Spel resetten', 'resetConfirm': 'Je verzameling wissen en opnieuw beginnen?',
      'cards5': '5 KAARTEN', 'openHere': 'HIER OPENEN', 'seal': 'BROL · VERZAMELKAARTEN · BELGIË · ',
      'back': 'Verzameling', 'backSeal': 'BROL · KAARTEN · BELGIË · ',
      'free': n => `${n} gratis`, 'freeIn': t => `+1 over ${t}`, 'freeFull': 'reserve vol',
      'pity': n => n <= 1 ? 'Legendarische kaart gegarandeerd in het volgende pakje' : `Legendarische kaart gegarandeerd binnen ${n} pakjes`,
      'noCoins': 'Niet genoeg munten', 'perDay': 'Geen Nieuwigheden-pakjes meer vandaag, kom morgen terug', 'perDayLeft': (n, m) => `Nog ${n} van ${m} vandaag · alleen met munten`, 'albumFull': 'Er ontbreken minder dan 5 kaarten: album bijna compleet!', 'freePack': 'Gratis pakje', 'paid': p => `−${p} munten`,
      'new': 'Nieuw', 'dup': 'Dubbel',
      'summary': (n, d, s, b) => `<b>${n}</b> nieuw · ${d} dubbel${d > 1 ? 's' : ''}${s ? ` · <b>${s}</b> speciale versie${s > 1 ? 's' : ''}` : ''}${b ? ` · <b>+${b}</b> munten` : ''}`,
      'pityHit': 'Pechgarantie geactiveerd!',
      'again': p => p === null ? 'Nog een · gratis' : `Nog een · ${p}`,
      'again10': (n, p) => `Nog ×${n} · ${p}`,
      'knownFor': 'Bekend om', 'share': 'Afbeelding delen', 'sharing': 'Bezig…', 'shareSaved': 'Afbeelding opgeslagen', 'shareFail': 'Kon de afbeelding niet maken (foto niet beschikbaar?)', 'notifOff': 'Herinneringen aanzetten', 'notifOn': 'Herinneringen aan', 'notifOnToast': 'Herinneringen aan: we laten het weten als je gratis pakjes en dagkaart klaar zijn',
      'notifDenied': 'Meldingen geweigerd door de browser', 'notifFreeTitle': 'Gratis pakjes klaar', 'notifFreeBody': n => `Je ${n} gratis pakjes wachten op je.`,
      'notifDailyTitle': 'Kaart van de dag', 'notifDailyBody': 'Je kaart van de dag staat klaar.', 'weeklyTitle': 'Weekuitdaging', 'weeklyLeft': n => `nog ${n} dag${n > 1 ? 'en' : ''}`, 'weeklyDone': 'gelukt, nieuwe uitdaging op maandag',
      'weeklyClaim': 'Innen', 'weeklyReward': c => `Prestigeticket + ${c}`, 'weeklyGot': c => `Prestigeticket en ${c} munten!`,
      'ticketBadge': n => `${n} ticket${n > 1 ? 's' : ''}`, 'ticketUsed': 'Prestigeticket gebruikt', 'install': 'App installeren', 'installed': 'Brol is geïnstalleerd!', 'installIOS': 'Tik in Safari op de knop Delen en daarna op “Zet op beginscherm”.', 'scTitle': 'Jouw vitrine', 'freeTitle': 'Gratis pakjes', 'scCount': (o, t, p) => `${o} / ${t} kaarten · ${p} %`, 'scEmpty': 'Open een pakje om je vitrine te vullen.', 'missionsTitle': 'Dagopdrachten', 'missionsAll': 'allemaal gedaan, tot morgen!',
      'lateBonus': m => `albumbonus ×${m}`, 'lateOn': m => `dubbels verkocht ×${m} (album op 80 %)`, 'lateOff': (p, m) => `vanaf ${p} % van het album: dubbels ×${m}`, 'edTag': 'Beperkte editie', 'edStatPack': 'Pakje', 'edStatNo': 'Nr.', 'edStatPrice': 'Prijs', 'edFrom': 'Van', 'edTo': 'Tot',
      'edWhere': p => `Pakje ${p}`, 'exclLine': (n, got) => `${n} exclusieve kaarten${got ? ` · ${got}/${n}` : ''}`,
      'evFinLine': f => `Versie ${f}, nergens anders te vinden`, 'oddsExcl': 'Beperkte editie', 'perPack': 'per pakje', 'perCard': 'per kaart', 'packOdds': 'Kansen van dit pakje', 'oddsCards': 'kaarten 1–4', 'oddsLast': '5de kaart', 'bulk': n => `×${n}`, 'bulkOff': n => `−${n} %`,
      'binderSummary': (o, t, s, p, d) => `${o} van ${t} kaarten · ${s} speciale versie${s > 1 ? 's' : ''} · ${p} pakje${p > 1 ? 's' : ''} · ${d} dubbel${d > 1 ? 's' : ''}`,
      'emptyOwned': 'Hier nog geen kaarten.', 'emptyAll': 'Geen kaarten gevonden.',
      'more': n => `Meer tonen (${n})`,
      'sellConfirm': (n, g) => `${n} dubbel${n > 1 ? 's' : ''} verkopen voor ${g} munten?\nVan elke versie blijft één exemplaar over.`,
      'coinsPlus': g => `+${g} munten`,
      'seriesSummary': (d, t) => `${d} van ${t} reeksen voltooid · een beloning per volledige reeks`,
      'seriesBanner': 'Reeks', 'clearFilter': 'Filter wissen', 'claim': 'Ophalen', 'claimed': 'Beloning ontvangen', 'see': 'Kaarten bekijken',
      'seriesDone': g => `Reeks voltooid: +${g} munten`,
      'wikidata': 'Wikidata-fiche', 'imgCredit': 'Bron van de afbeelding', 'coaCredit': 'Bron van het wapen',
      'copies': 'Exemplaren', 'value': 'Waarde', 'coins': n => `${n} munten`, 'party': 'Partij',
      'sellOne': v => `Dubbel verkopen · +${v}`, 'seriesH': 'Reeksen', 'career': 'Loopbaan',
      'achSummary': (u, t, c) => `${u} van ${t} prestaties · ${c} munten verdiend met prestaties`,
      'achUnlocked': 'Prestatie ontgrendeld', 'achRecent': 'Laatste prestaties', 'achNew': 'Nieuw', 'secret': 'Geheime prestatie', 'secretDesc': 'Blijf spelen om ze te ontdekken.',
      'themeAuto': 'Thema: automatisch', 'themeLight': 'Thema: licht', 'themeDark': 'Thema: donker',
      'soundOn': 'Geluid aan', 'soundOff': 'Geluid uit', 'versionsOwned': 'Versies in bezit',
      'gov': 'Reg.', 'live': 'in functie', 'leg': n => `${n}e zittingsperiode`,
    },
  };

  // Valeurs exactes (sous-titres, stats, morceaux de méta)
  const VAL = {
    'Plat': 'Gerecht', 'Snack': 'Snack', 'Sucré': 'Zoet', 'Douceur': 'Zoetigheid', 'Trappiste': 'Trappist', 'Abbaye': 'Abdijbier',
    'Blanche': 'Witbier', 'Pils': 'Pils', 'Ambrée': 'Amber', 'Blonde': 'Blond', 'Blonde forte': 'Sterk blond', 'Triple': 'Tripel',
    'Lambic': 'Lambiek', 'Brasserie': 'Brouwerij', 'Rouge des Flandres': 'Vlaams rood', 'Saison': 'Saison', 'Bière': 'Bier',
    'Place': 'Plein', 'Palais': 'Paleis', 'Basilique': 'Basiliek', 'Cathédrale': 'Kathedraal', 'Beffroi': 'Belfort', 'Galerie': 'Galerij',
    'Arc': 'Triomfboog', 'Gare': 'Station', 'Citadelle': 'Citadel', 'Ouvrage d\'art': 'Kunstwerk', 'Collégiale': 'Collegiale kerk',
    'Porte': 'Poort', 'Mémorial': 'Gedenkteken', 'Halle': 'Lakenhalle', 'Jardin': 'Tuin', 'Serres': 'Serres', 'Hôtel de ville': 'Stadhuis',
    'Béguinage': 'Begijnhof', 'Abbaye ': 'Abdij', 'Château fort': 'Burcht', 'Château': 'Kasteel', 'Résidence royale': 'Koninklijke residentie',
    'Ruines': 'Ruïne', 'Carnaval': 'Carnaval', 'Personnage': 'Figuur', 'Ducasse': 'Kermis', 'Cortège': 'Stoet', 'Procession': 'Processie',
    'Fête': 'Feest', 'Marche': 'Mars', 'Tradition': 'Traditie', 'Oui': 'Ja', 'Université': 'Universiteit', 'Haute école': 'Hogeschool',
    'École d\'art': 'Kunstschool', 'Province': 'Provincie', 'Région': 'Gewest', 'Roi des Belges': 'Koning der Belgen',
    'Député fédéral': 'Federaal volksvertegenwoordiger', 'Premier ministre': 'Eerste minister', 'Œuvre': 'Kunstwerk', 'Règne': 'Regeert',
    'Statut': 'Status', 'Bruxelles-Capitale': 'Brussels Hoofdstedelijk Gewest', 'National': 'Nationaal', 'Monument': 'Monument',
    'Wallonie': 'Wallonië', 'Flandre': 'Vlaanderen', 'Bruxelles': 'Brussel', 'Belgique': 'België',
    'Bande dessinée': 'Strips', 'BD': 'Strips', 'Musique': 'Muziek', 'Cinéma': 'Film', 'Médias': 'Media', 'Arts & sciences': 'Kunst & wetenschap',
    'Arts': 'Kunst', 'Physique & astronomie': 'Fysica & sterrenkunde', 'Médecine & biologie': 'Geneeskunde & biologie',
    'Inventions': 'Uitvindingen', 'Mathématiques': 'Wiskunde', 'Espace & exploration': 'Ruimte & ontdekking', 'Physique': 'Fysica',
    'Médecine': 'Geneeskunde', 'Espace': 'Ruimte', 'Football': 'Voetbal', 'Cyclisme': 'Wielrennen', 'Tennis': 'Tennis', 'Athlétisme': 'Atletiek', 'Moteur': 'Motorsport',
    'Sports mécaniques': 'Motorsport', 'Basket': 'Basketbal', 'Fléchettes': 'Darts', 'Judo': 'Judo', 'Snooker': 'Snooker', 'Sport': 'Sport',
    'Électro': 'Elektro', 'Humour': 'Humor', 'Alternatif': 'Alternatief', 'Musiques du monde': 'Wereldmuziek', 'Fête populaire': 'Volksfeest',
    'Groupe': 'Groep', 'Festival': 'Festival', 'Folklore': 'Folklore',
    // Provinces et chefs-lieux
    'Anvers': 'Antwerpen', 'Limbourg': 'Limburg', 'Flandre-Orientale': 'Oost-Vlaanderen', 'Flandre-Occidentale': 'West-Vlaanderen',
    'Brabant flamand': 'Vlaams-Brabant', 'Brabant wallon': 'Waals-Brabant', 'Hainaut': 'Henegouwen', 'Liège': 'Luik', 'Luxembourg': 'Luxemburg',
    'Namur': 'Namen', 'Bruges': 'Brugge', 'Gand': 'Gent', 'Louvain': 'Leuven', 'Wavre': 'Waver', 'Arlon': 'Aarlen', 'Mons': 'Bergen',
    'Région flamande': 'Vlaams Gewest', 'Région wallonne': 'Waals Gewest', 'Région de Bruxelles-Capitale': 'Brussels Hoofdstedelijk Gewest',
  };
  const STAT = {
    'Naissance': 'Geboren', 'Décès': 'Overleden', 'Parti': 'Partij', 'Années au 16': 'Jaren in de Wetstraat', 'Gouvernements': 'Regeringen',
    'Mandats': 'Mandaten', 'Législatures': 'Zittingsper.', 'Habitants': 'Inwoners', 'Superficie': 'Oppervlakte', 'Densité': 'Dichtheid',
    'Chef-lieu': 'Hoofdplaats', 'Années de règne': 'Regeringsjaren', 'Domaine': 'Domein', 'Wikipédias': 'Wikipedia’s', 'Discipline': 'Discipline',
    'Fondation': 'Opgericht', 'Étudiants': 'Studenten', 'Ville': 'Stad', 'Type': 'Type', 'Région': 'Gewest', 'Année': 'Jaar',
    'Artiste': 'Kunstenaar', 'Genre': 'Genre', 'Formation': 'Opgericht', 'Création': 'Opgericht', 'UNESCO': 'UNESCO', 'Jours': 'Dagen',
    'Élections': 'Verkiezingen', 'Gouvernement': 'Regering', 'Avant': 'Voor', 'Après': 'Na', 'Communes': 'Gemeenten', 'Régions': 'Gewesten',
    'Communautés': 'Gemeensch.', 'Loi': 'Wet', '1er scrutin': '1e stemming', 'Niveau': 'Niveau', 'Consultation': 'Raadpleging',
    'Abdication': 'Troonsafstand', 'Successeur': 'Opvolger', 'Statut': 'Status',
  };
  const META = [
    [/^En fonction$/, 'In functie'], [/^Sur le trône$/, 'Op de troon'], [/^Gouv\. /, 'Reg. '],
    [/^(\d+)ᵉ législature/, '$1e zittingsperiode'], [/^Législatures (\d+) à (\d+)$/, 'Zittingsperiodes $1 tot $2'],
    [/^Législatures /, 'Zittingsperiodes '], [/^Règne depuis (\d+)$/, 'Regeert sinds $1'], [/^Règne /, 'Regeerperiode '],
    [/^depuis (\d+)/, 'sinds $1'], [/^fondée en (\d+)$/, 'opgericht in $1'], [/^Spécialité$/, 'Specialiteit'],
    [/^Province d(?:e |’)(.+)$/, (m, p) => 'Provincie ' + (VAL[p] || p)],
  ];
  const EVENTS = {
    'ev-541': { name: '541 dagen', text: 'Wereldrecord regeringsvorming: 541 dagen tussen de verkiezingen van juni 2010 en de installatie van de regering-Di Rupo.' },
    'ev-fusion77': { name: 'Fusie van de gemeenten', text: 'In één hervorming gaat België van 2.359 naar 596 gemeenten.' },
    'ev-fusion25': { name: 'Fusies van 2025', text: 'Een nieuwe golf fusies in Vlaanderen brengt het land op 565 gemeenten.' },
    'ev-federal': { name: 'Federale staat', text: 'Met het Sint-Michielsakkoord wordt België een federale staat, verankerd in de Grondwet.' },
    'ev-vote': { name: 'Vrouwenstemrecht', text: 'Vrouwen krijgen stemrecht voor de parlementsverkiezingen en stemmen voor het eerst in 1949.' },
    'ev-question': { name: 'Koningskwestie', text: 'Volksraadpleging over de terugkeer van Leopold III, gevolgd door zijn troonsafstand ten gunste van Boudewijn.' },
  };
  const SPECIAL_POS = { Q213107: 'Eerste minister', Q15705021: 'Federaal volksvertegenwoordiger', VPM: 'Vicepremier', MIN: 'Federaal minister' };

  let lang = 'fr';
  let stored = null;
  try { stored = localStorage.getItem('rdl-lang'); } catch (_) {}
  lang = stored || ((navigator.language || '').toLowerCase().startsWith('nl') ? 'nl' : 'fr');
  if (!UI[lang]) lang = 'fr';

  const capF = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const tv = v => lang === 'nl' && typeof v === 'string' && VAL[v] ? VAL[v] : v;
  const tMetaPart = p => {
    if (lang !== 'nl') return p;
    for (const [re, to] of META) if (re.test(p)) return p.replace(re, to);
    return VAL[p] || p;
  };

  // Bourgmestre : « Burgemeester van » + nom néerlandais de la commune (lu sur sa carte)
  const communeNl = id => { const c = (window.CARDS || []).find(x => x.id === id); return c ? (c.nl?.name || c.name) : ''; };
  const MAYOR_NL = { ff: 'Waarnemend burgemeester', emp: 'Titelvoerend burgemeester', old: 'Voormalig burgemeester' }; // faisant fonction / empêché / ancien
  const mayorNl = (id, kind) => `${MAYOR_NL[kind] || 'Burgemeester'} van ${communeNl(id)}`;

  window.I18N = {
    get lang() { return lang; },
    set(l) { lang = UI[l] ? l : 'fr'; try { localStorage.setItem('rdl-lang', lang); } catch (_) {} document.documentElement.lang = lang; },
    t(key, ...args) { const v = UI[lang][key] ?? UI.fr[key]; return typeof v === 'function' ? v(...args) : v; },
    tv,
    name: c => (lang === 'nl' && (EVENTS[c.id]?.name || c.nl?.name)) || c.name,
    text: c => (lang === 'nl' && (EVENTS[c.id]?.text || c.nl?.text)) || c.text,
    known: c => (lang === 'nl' && c.nl?.known) || c.known || [],
    subtitle(c) {
      if (lang !== 'nl') return c.subtitle || '';
      if (c.cat === 'politique' && c.posId) return capF(SPECIAL_POS[c.posId] || window.POS_NL?.[c.posId]) || c.subtitle;
      if (c.mayorOf) return mayorNl(c.mayorOf, c.mayorKind);
      if (c.nl?.subtitle) return c.nl.subtitle;
      return tMetaPart(c.subtitle || '');
    },
    meta: c => (c.meta || '').split(' · ').map(tMetaPart).join(' · '),
    statKey: k => lang === 'nl' ? (STAT[k] || k) : k,
    roles(c) {
      if (c.rolesData) {
        return c.rolesData.map(r => {
          const label = lang !== 'nl' ? r.fr : r.pos === 'MAYOR' ? mayorNl(r.commune, r.kind) : capF(SPECIAL_POS[r.pos] || window.POS_NL?.[r.pos]) || r.fr;
          const extra = r.leg ? ' — ' + window.I18N.t('leg', r.leg) : r.cab ? ` — ${window.I18N.t('gov')} ${r.cab}` : '';
          const when = r.live ? ` (${window.I18N.t('live')})` : r.span ? ` (${lang === 'nl' ? r.span.replace('depuis', 'sinds') : r.span})` : '';
          return label + extra + when;
        });
      }
      return (c.roles || []).map(r => lang === 'nl' ? r.replace('Roi des Belges', 'Koning der Belgen').replace('depuis', 'sinds') : r);
    },
  };
  document.documentElement.lang = lang;
})();
