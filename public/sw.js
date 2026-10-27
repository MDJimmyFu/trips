/**
 * sw.js — offline cache for the trip site.
 *
 * Strategy per request type:
 *   - Page navigation  → network first; fall back to the cached shell when
 *                        offline OR when Cloudflare Access redirects to login
 *                        (so an expired session never blanks the page).
 *   - trips/*          → network first, cached copy when offline / logged out.
 *   - CDN libs, fonts  → cache first.
 *   - CARTO map tiles  → cache first, capped at TILE_LIMIT entries.
 *   - everything else  → network only (flight APIs, GitHub API).
 *
 * Requests carrying `?sync=` come from the page's explicit sync and bypass
 * this worker untouched: the page validates every file itself and only then
 * writes them into DATA_CACHE in one go.
 * A navigation carrying `?login=` also bypasses, so the browser follows the
 * Access redirect to the login screen.
 */
const VERSION = 'v1';
const SHELL_CACHE = `shell-${VERSION}`;
const DATA_CACHE = 'trip-data';          // shared with index.html — keep the name in sync
const LIB_CACHE = `lib-${VERSION}`;
const TILE_CACHE = 'tiles';
const TILE_LIMIT = 400;

const SHELL_URL = new URL('./', self.registration.scope).href;
const SHELL_ASSETS = [
  './',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
];
const LIB_ASSETS = [
  'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js',
  'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js',
  'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];
const LIB_HOSTS = ['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    // allSettled: one failed asset (e.g. logged out of Access) must not
    // abort installing the worker.
    await Promise.allSettled(SHELL_ASSETS.map(async u => {
      const r = await fetch(u, { redirect: 'manual', cache: 'no-store' });
      if (isGood(r)) await shell.put(u === './' ? SHELL_URL : u, r);
    }));
    const lib = await caches.open(LIB_CACHE);
    await Promise.allSettled(LIB_ASSETS.map(u => lib.add(new Request(u, { mode: 'cors' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, DATA_CACHE, LIB_CACHE, TILE_CACHE];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

/** A response we are willing to store: 200, not a login redirect, not HTML-instead-of-data. */
function isGood(r) {
  return r && r.ok && r.type !== 'opaqueredirect' && !r.redirected;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.searchParams.has('sync')) return;                       // page-driven sync
  if (req.mode === 'navigate') {
    if (url.searchParams.has('login')) return;                    // let Access log in
    event.respondWith(navigate(req));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.includes('/trips/') || url.pathname.includes('/images/')) { event.respondWith(networkFirst(req, DATA_CACHE)); return; }
    event.respondWith(networkFirst(req, SHELL_CACHE));
    return;
  }
  if (LIB_HOSTS.includes(url.hostname)) { event.respondWith(cacheFirst(req, LIB_CACHE)); return; }
  if (url.hostname.endsWith('basemaps.cartocdn.com')) { event.respondWith(tile(req)); return; }
});

async function navigate(req) {
  try {
    const r = await fetch(req);
    if (isGood(r)) {
      (await caches.open(SHELL_CACHE)).put(SHELL_URL, r.clone());
      return r;
    }
  } catch (e) { /* offline */ }
  const cached = await caches.match(SHELL_URL);
  return cached || fetch(req);   // no shell yet: let the browser show the real response (login page)
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const r = await fetch(req.url, { redirect: 'manual', credentials: 'same-origin' });
    if (isGood(r) && !looksLikeLoginPage(req, r)) {
      cache.put(req.url, r.clone());
      return r;
    }
  } catch (e) { /* offline */ }
  const cached = await cache.match(req.url, { ignoreSearch: true });
  return cached || fetch(req);
}

/** Data files (.md / .json) served as HTML mean Access handed us its login page. */
function looksLikeLoginPage(req, r) {
  const p = new URL(req.url).pathname;
  return /\.(md|json)$/.test(p) && (r.headers.get('content-type') || '').includes('text/html');
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const r = await fetch(req);
  if (r.ok || r.type === 'opaque') cache.put(req, r.clone());
  return r;
}

async function tile(req) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const r = await fetch(req);
  if (r.ok || r.type === 'opaque') {
    await cache.put(req, r.clone());
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - TILE_LIMIT; i++) await cache.delete(keys[i]);
  }
  return r;
}
