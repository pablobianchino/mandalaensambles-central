/* ================================================================
   MANDALA ENSAMBLES – Service Worker v1.0
   Estrategia: Cache First (ideal para app 100% estática)
   ================================================================ */

const CACHE_NAME = 'mdl-central-v1';

const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './logo.png',
    './manifest.json'
];

/* ---- Install: pre-cache all assets ---- */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

/* ---- Activate: limpiar caches viejos ---- */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

/* ---- Fetch: cache first, fallback a red ---- */
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});
