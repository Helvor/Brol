// Appliquer le thème avant le rendu pour éviter un flash (fichier à part, et non script dans index.html :
// la politique de sécurité du site, CSP, interdit les scripts écrits dans la page)
try { const t = localStorage.getItem('rdl-theme'); if (t) document.documentElement.dataset.theme = t; } catch (_) {}
