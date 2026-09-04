// STASH Service Worker — offline-first app shell for the local-first PWA.
//
// Update policy (v2): on FIRST install the worker takes control immediately
// (skipWaiting) so offline works right away. On SUBSEQUENT deploys the new
// worker deliberately goes to `waiting` instead — the page's update prompt
// (see hooks/use-sw-update.ts + the "Update available / Refresh now" banner)
// asks the user, and only a SKIP_WAITING message upgrades the session. Old
// users are never silently swapped mid-scroll; new users still get the
// benefit of a byte-diff `sw.js` on any deploy (the browser re-fetches the
// script on every navigation, and Cloudflare Pages serves /sw.js with
// no-cache via _headers).

const CACHE_NAME = 'stash-pwa-v2';
const PRECACHE_ASSETS = [
  '/',
  '/app',
  '/manifest.json',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png',
  '/apple-touch-icon-180x180.png',
  '/screenshot-desktop.png',
  '/screenshot-mobile.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        // Precache of optional screenshots/assets can fail on a cold install;
        // still let the worker activate so the app shell is available offline.
        console.warn('[SW] Precache failed:', err);
      }
      // An *update* (an older active worker exists) must WAIT for the in-app
      // "Refresh now" prompt. A first install claims immediately.
      const isUpdate = !!(await self.registration.active);
      if (!isUpdate) await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle same-origin requests. External links are opened in the browser.
  if (url.origin !== self.location.origin) return;

  // The Android update manifest (and anything else marked no-store by the
  // updater) must always hit the network — a stale cached copy would make
  // "Check for updates" forever report the previous release.
  if (url.pathname === '/version.json') return;

  // Navigation requests: network-first with a cached app-shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            void caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const appFallback = await caches.match('/app');
          if (appFallback) return appFallback;
          const rootFallback = await caches.match('/');
          if (rootFallback) return rootFallback;
          return new Response('Offline - STASH', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            void caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
