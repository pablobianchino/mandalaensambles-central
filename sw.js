/* ================================================================
   MANDALA ENSAMBLES – Service Worker de MDL Core
   Estrategia: Network First (prioriza siempre contenido fresco)
   Cambiar CACHE_NAME en cada versión (igual que APP_VERSION en app.js)
   ================================================================ */

const CACHE_NAME = 'mdl-central-v1.5';

const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './acceso.js',
    './permisos.js',
    './usuarios.js',
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

/* ---- Fetch: Network First (intenta red, fallback a cache) ---- */
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    // v1.1: solo archivos propios; Firebase (sesión y base de datos) va siempre directo a la red
    if (new URL(event.request.url).origin !== self.location.origin) return;
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return networkResponse;
            })
            .catch(() => caches.match(event.request))
    );
});
