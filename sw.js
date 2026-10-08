// Service worker : le jeu fonctionne hors ligne une fois ouvert, et les images déjà vues restent en cache.
// __VERSION__ est remplacé au déploiement par le commit : chaque version a son propre cache.
const VERSION = '__VERSION__';
const SHELL = `brol-${VERSION}`;
// Nouveau nom à chaque changement de règle de cache : l'ancien cache (avec d'éventuelles erreurs gardées) est vidé
const IMAGES = 'brol-images-2';
const MAX_IMAGES = 600;

self.addEventListener('install', e => {
  // Page d'accueil et tous ses scripts et styles (avec leur numéro de version) mis en cache dès l'installation,
  // pour que le jeu marche hors ligne dès la première visite
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    const page = await fetch('./', { cache: 'no-cache' });
    const html = await page.clone().text();
    await c.put('./', page);
    const files = [...html.matchAll(/(?:src|href)="([^":]+\.(?:js|css|webmanifest|png|svg)(?:\?v=[^"]*)?)"/g)].map(m => m[1]);
    await c.addAll([...new Set([...files, 'logo.svg', 'icons/icon-192.png'])]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('brol-') && k !== SHELL && k !== IMAGES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trimImages() {
  const c = await caches.open(IMAGES);
  const keys = await c.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_IMAGES))) await c.delete(k);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Images de Wikimedia Commons : le cache d'abord (elles ne changent pas), puis le réseau
  if (['commons.wikimedia.org', 'upload.wikimedia.org', 'thumb.wikimedia.org'].includes(url.hostname) && req.destination === 'image') {
    e.respondWith(caches.open(IMAGES).then(async c => {
      const hit = await c.match(req);
      // Une image gardée en mode « opaque » (affichage simple) ne peut pas servir à une requête CORS
      // (image de partage dessinée dans un canvas) : on retourne alors au réseau
      if (hit && !(req.mode === 'cors' && hit.type === 'opaque')) return hit;
      // Requête CORS (Wikimedia l'autorise) : la réponse est lisible, on ne garde que les vraies images. Une
      // réponse « opaque » cachait les erreurs (429 quand Wikimedia limite) : gardées, les images restaient cassées.
      let res;
      try { res = await fetch(req.url, { mode: 'cors', credentials: 'omit' }); } catch (_) { return fetch(req); }
      if (res.ok) { c.put(req, res.clone()); trimImages(); }
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Fichiers versionnés (?v=…) : le cache d'abord. Page et autres fichiers : le réseau d'abord, le cache hors ligne.
  const versioned = url.searchParams.has('v');
  e.respondWith(caches.open(SHELL).then(async c => {
    if (versioned) {
      const hit = await c.match(req);
      if (hit) return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: !versioned }) || (req.mode === 'navigate' && await c.match('./'));
      if (hit) return hit;
      throw err;
    }
  }));
});

// Rappel quotidien (appli installée sur Chrome / Android, voir « Rappels » dans app.js)
self.addEventListener('periodicsync', e => {
  if (e.tag !== 'brol-daily') return;
  e.waitUntil(self.registration.showNotification('Brol', {
    body: 'Ta carte du jour et tes missions t’attendent.', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'brol-daily',
  }));
});
// Clic sur une notification : revenir au jeu (onglet déjà ouvert, sinon nouvelle fenêtre)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => new URL(c.url).origin === location.origin);
    return open ? open.focus() : self.clients.openWindow('./');
  }));
});
