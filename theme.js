// Appliquer le thème avant le rendu pour éviter un flash (fichier à part, et non script dans index.html :
// la politique de sécurité du site, CSP, interdit les scripts écrits dans la page)
try { const t = localStorage.getItem('rdl-theme'); if (t) document.documentElement.dataset.theme = t; } catch (_) {}
// Décor de fête (Halloween) : du 24 octobre au 2 novembre inclus, heure locale, sur la page du jeu seulement (balise
// <script src="theme.js" data-fete> d'index.html : les pages légales n'ont pas l'attribut). window.BROL_NOW (tests)
// simule une autre date, comme dans app.js. Aperçu : ?halloween=1 ou ?halloween=0 (non enregistré). Le joueur peut
// couper le décor pour l'année (localStorage 'rdl-fete' = 'off:halloween:2026', bouton du pied de page) : il revient
// l'année suivante. Ancienne valeur 'off' : vaut pour l'année en cours, réécrite sous la nouvelle forme.
// ?halloween=1 l'affiche quand même.
try {
  const s = document.currentScript;
  if (s && s.hasAttribute('data-fete')) {
    const d = window.BROL_NOW ? new Date(window.BROL_NOW) : new Date();
    const md = (d.getMonth() + 1) * 100 + d.getDate();
    let fenetre = md >= 1024 && md <= 1102;
    let force = null;
    try { force = new URLSearchParams(location.search).get('halloween'); } catch (_) {}
    if (force === '1') fenetre = true; else if (force === '0') fenetre = false;
    const cle = 'off:halloween:' + d.getFullYear();
    let coupe = false;
    try {
      let v = localStorage.getItem('rdl-fete');
      if (v === 'off') { v = cle; localStorage.setItem('rdl-fete', v); }
      coupe = v === cle;
    } catch (_) {}
    const actif = fenetre && (force === '1' || !coupe);
    // Lu par app.js (bouton du pied de page) : la période, pas le décor ; BROL_FETE_COUPE : valeur de la coupure
    window.BROL_FETE_FENETRE = fenetre ? 'halloween' : '';
    window.BROL_FETE_COUPE = cle;
    document.documentElement.classList.toggle('halloween', actif);
  }
} catch (_) {}
