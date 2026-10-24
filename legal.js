// Pages légales (/privacy, /cgu) : version française, néerlandaise ou anglaise (pour les vérificateurs de Google et les
// visiteurs étrangers ; le jeu, lui, n'existe qu'en FR et NL). Langue : celle choisie dans le jeu (localStorage
// rdl-lang), sinon celle du navigateur. Les boutons FR / NL retiennent le choix pour le jeu ; EN ne change rien au jeu.
(() => {
  'use strict';
  const LANGS = ['fr', 'nl', 'en'];
  let stored = null;
  try { stored = localStorage.getItem('rdl-lang'); } catch (_) { /* stockage indisponible */ }
  const nav = (navigator.language || '').toLowerCase().slice(0, 2);
  let lang = stored === 'fr' || stored === 'nl' ? stored : LANGS.includes(nav) ? nav : 'en';
  function show(l) {
    lang = l;
    document.documentElement.lang = l;
    for (const a of document.querySelectorAll('article[lang]')) a.hidden = a.lang !== l;
    for (const b of document.querySelectorAll('.legal-langs button')) b.setAttribute('aria-pressed', String(b.dataset.lang === l));
    document.title = document.querySelector(`article[lang="${l}"] h1`).textContent + ' · Brol';
  }
  document.querySelector('.legal-langs').addEventListener('click', e => {
    const l = e.target.closest('button')?.dataset.lang;
    if (!l) return;
    show(l);
    if (l !== 'en') { try { localStorage.setItem('rdl-lang', l); } catch (_) { /* rien */ } }
  });
  show(lang);
})();
