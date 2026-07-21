/* Service worker: speeds up repeat visits and enables offline use.
 *
 * Strategy per request type:
 *   - navigations / HTML  -> network-first  (content stays fresh; cache is the offline fallback)
 *   - same-origin css/js  -> stale-while-revalidate (instant paint, updates fetched in background)
 *   - images (any origin) -> cache-first (poem art is effectively immutable)
 *   - Google Fonts / CDN  -> stale-while-revalidate
 *
 * Bump CACHE_VERSION only when the caching logic here changes — content freshness is
 * handled by the strategies above, not by the version string.
 */
const CACHE_VERSION = 'v2';
const SHELL_CACHE = `zzcfizz-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `zzcfizz-runtime-${CACHE_VERSION}`;

// App shell precached on install so the first repeat visit is instant.
const SHELL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './poems.js',
    './app.js',
    './favicon.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            // addAll is atomic; ignore individual failures so one 404 can't block install.
            .then((cache) => Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
                    .map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

function isImage(request, url) {
    return request.destination === 'image' || /\.(?:jpe?g|png|webp|gif|svg|avif)$/i.test(url.pathname);
}

function staleWhileRevalidate(request) {
    return caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
            const network = fetch(request)
                .then((response) => {
                    if (response && response.status === 200) cache.put(request, response.clone());
                    return response;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
}

function cacheFirst(request) {
    return caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response && response.status === 200) cache.put(request, response.clone());
                return response;
            });
        })
    );
}

function networkFirst(request) {
    return caches.open(SHELL_CACHE).then((cache) =>
        fetch(request)
            .then((response) => {
                if (response && response.status === 200) cache.put(request, response.clone());
                return response;
            })
            .catch(() => cache.match(request).then((c) => c || caches.match('./index.html')))
    );
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;

    // HTML / navigations: always try the network first so edits show up on reload.
    if (request.mode === 'navigate' || (sameOrigin && request.destination === 'document')) {
        event.respondWith(networkFirst(request));
        return;
    }

    if (isImage(request, url)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Same-origin scripts/styles (poems.js, app.js, style.css) + font/CDN assets.
    if (sameOrigin || /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.host)) {
        event.respondWith(staleWhileRevalidate(request));
    }
});
