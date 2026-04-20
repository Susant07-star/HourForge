const CACHE_NAME = 'hourforge-v38';
const ASSETS = [
    './',
    './index.html',
    './css/variables.css',
    './css/base.css',
    './css/dashboard.css',
    './css/components.css',
    './css/insights.css',
    './css/tablet.css',
    './css/profile.css',
    './css/modals.css',
    './css/pomodoro.css',
    './css/auth.css',
    './css/layout.css',
    './css/overrides.css',
    './js/config.js',
    './js/utils.js',
    './js/store.js',
    './js/supabase.js',
    './js/ui.js',
    './js/timeTracker.js',
    './js/dashboard.js',
    './js/insights.js',
    './js/pomodoro.js',
    './js/charts.js',
    './silent.wav',
    './manifest.json',
    './favicon.png',
    './logo.png',
    './icon-192.png',
    './icon-512.png',
    './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
    // Force the new service worker to take over immediately
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    // Claim all clients immediately so the new SW serves pages right away
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // CRITICAL: Only intercept same-origin GET requests.
    // Let the browser handle ALL external/CDN requests natively.
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);

    // Only handle requests from our own origin — never touch CDN scripts
    if (url.origin !== self.location.origin) return;

    // Network-first for HTML/JS/CSS (always get fresh code updates)
    if (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/') {
        e.respondWith(
            fetch(e.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                    return response;
                })
                .catch(() => caches.match(e.request).then(res => res || new Response('Offline', { status: 503 })))
        );
    } else {
        // Cache-first for images/icons/manifest
        e.respondWith(
            caches.match(e.request).then((cached) => cached || fetch(e.request))
        );
    }
});

