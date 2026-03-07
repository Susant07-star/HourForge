const CACHE_NAME = 'hourforge-v11';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './favicon.ico',
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
    // Ignore non-GET requests (like Supabase POST/PATCH)
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);

    // Ignore external APIs (Supabase, Sentry, PostHog, Google)
    if (
        url.hostname.includes('supabase.co') || 
        url.hostname.includes('sentry.io') || 
        url.hostname.includes('posthog.com') ||
        url.hostname.includes('google.com') ||
        url.hostname.includes('googleapis.com')
    ) {
        return;
    }

    // Network-first for HTML/JS files (so updates are always fresh), cache-first for assets
    if (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/') {
        // Network first — try fresh, fall back to cache
        e.respondWith(
            fetch(e.request).then((response) => {
                // Must clone response to put it in cache because body can only be read once
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                return response;
            }).catch(() => caches.match(e.request).then(cachedRes => cachedRes || new Response("Network error", {status: 503})))
        );
    } else {
        // Cache first for images/icons/manifest
        e.respondWith(
            caches.match(e.request).then((response) => {
                return response || fetch(e.request);
            })
        );
    }
});
