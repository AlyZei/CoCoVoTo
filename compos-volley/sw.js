/* Compos Volley — service worker (fonctionnement hors ligne).
   Après chaque mise à jour des fichiers sur le site, changez VERSION (v1 → v2…)
   pour que les téléphones téléchargent la nouvelle version. */
const VERSION = 'compos-volley-v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './fonts/barlow-condensed-latin-600-normal.woff2',
  './fonts/barlow-condensed-latin-700-normal.woff2',
  './fonts/figtree-latin-400-normal.woff2',
  './fonts/figtree-latin-500-normal.woff2',
  './fonts/figtree-latin-600-normal.woff2',
  './fonts/figtree-latin-700-normal.woff2',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('compos-volley-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Réseau d'abord (pour avoir la dernière version), le cache si le réseau
   est absent ou met plus de 3 secondes à répondre (gymnase sans réseau). */
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const fromCache = () => cache.match(req, {ignoreSearch: true})
      .then(r => r || (req.mode === 'navigate' ? cache.match('./index.html') : undefined));
    const network = fetch(req).then(res => {
      if(res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    });
    const timeout = new Promise(resolve => setTimeout(resolve, 3000, 'timeout'));
    try{
      const first = await Promise.race([network, timeout]);
      if(first !== 'timeout') return first;
      const cached = await fromCache();
      return cached || await network;
    }catch(err){
      const cached = await fromCache();
      return cached || Response.error();
    }
  })());
});
