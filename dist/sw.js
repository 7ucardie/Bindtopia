// Bindtopia offline support. Keeps the site, the English catalogue, the OCR files and recently viewed
// card details and images on this device, so search, recognition and trade mode work without internet.
// Nothing is sent anywhere: this only stores copies of files the site already loads.
const SITE = 'bindtopia-site-v1',
  OCR = 'bindtopia-ocr-v1',
  CARDS = 'bindtopia-cards-v1',
  IMAGES = 'bindtopia-images-v1';
const LIMITS = { [CARDS]: 1000, [IMAGES]: 500 };
// Files needed to open the site and run trade mode offline; tests/integration/offline.test.mjs keeps this list complete.
const SHELL = [
  './',
  'app.mjs',
  'state.mjs',
  'ui.mjs',
  'dialogs.mjs',
  'catalog.mjs',
  'collection.mjs',
  'detail.mjs',
  'ocr.mjs',
  'scanner.mjs',
  'trade-mode.mjs',
  'card-detail.mjs',
  'fingerprint.mjs',
  'i18n.mjs',
  'markets.mjs',
  'matcher.mjs',
  'ocr-prep.mjs',
  'trade.mjs',
  'theme.js',
  'style.css',
  'themes.css',
  'typography.css',
  'fonts/Roboto-Variable.woff2',
  'assets/bindtopia-cinematic-day-720.webp',
  'assets/bindtopia-cinematic-day-1100.webp',
  'brand/bindtopia-logo-light.svg',
  'brand/bindtopia-logo-dark.svg',
  'icon.svg?v=orb1',
  'manifest.webmanifest',
  'project.json',
  'data/cards-en.json',
  'data/sets-en.json',
  'data/meta.json',
  'data/rates.json',
  'data/languages.json',
  'data/fingerprints-en.json',
  ...['nl', 'en', 'de', 'fr', 'es', 'it', 'pt', 'pl'].map(l => 'locales/' + l + '.json'),
];
const OCR_HOSTS = /^https:\/\/(cdn\.jsdelivr\.net\/npm\/tesseract\.js(-core)?@|tessdata\.projectnaptha\.com\/)/;

self.addEventListener('install', event =>
  event.waitUntil(
    caches
      .open(SITE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', event =>
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k.startsWith('bindtopia-') && ![SITE, OCR, CARDS, IMAGES].includes(k)).map(k => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener('fetch', event => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== 'GET') return;
  const home = request.mode === 'navigate' && /\/(index\.html)?$/.test(url.pathname) ? './' : null;
  if (url.origin === location.origin) event.respondWith(fresh(event, url.pathname.includes('/api/') ? CARDS : SITE, home));
  else if (url.hostname === 'api.tcgdex.net') event.respondWith(fresh(event, CARDS));
  else if (url.hostname === 'assets.tcgdex.net') event.respondWith(kept(event, IMAGES));
  else if (OCR_HOSTS.test(request.url)) event.respondWith(kept(event, OCR));
});

// Network first, so online visitors always get the current site and prices; the saved copy is the fallback
// after a few seconds without an answer or without a connection. A copy served offline is marked with its save date.
async function fresh(event, name, fallback) {
  const request = event.request;
  // The browser's own request, passed on unchanged (its credentials and referrer settings come from the page).
  const network = fetch(request).then(response => {
    if (response.ok) keep(event, store(name, request, response.clone()));
    return response;
  });
  network.catch(() => {});
  const timeout = new Promise(resolve => setTimeout(resolve, 4000));
  try {
    const response = await Promise.race([network, timeout.then(() => saved(request, name, fallback))]);
    if (response) return response;
  } catch {}
  return (await saved(request, name, fallback)) || network;
}

async function saved(request, name, fallback) {
  const cache = await caches.open(name);
  const hit = (await cache.match(request, { ignoreSearch: request.mode === 'navigate' })) || (fallback && (await cache.match(fallback)));
  if (!hit) return null;
  const headers = new Headers(hit.headers);
  headers.set('X-Bindtopia-Offline', hit.headers.get('X-Bindtopia-Saved') || 'unknown');
  return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
}

// Cache first for files that never change at the same address (versioned OCR files, card images).
// Fetched with CORS so the copy is readable and counts at its real size; without CORS it is passed through unsaved.
async function kept(event, name) {
  const request = event.request,
    cache = await caches.open(name);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  try {
    const response = await fetch(request.url, { credentials: 'omit', referrerPolicy: 'no-referrer', mode: 'cors' });
    if (response.ok) keep(event, store(name, request.url, response.clone()));
    return response;
  } catch {
    return fetch(request);
  }
}

// Saving finishes in the background; once the page has its answer the event may already be over.
function keep(event, promise) {
  try {
    event.waitUntil(promise);
  } catch {}
}

async function store(name, request, response) {
  if (response.type === 'opaque') return;
  try {
    const headers = new Headers(response.headers);
    headers.set('X-Bindtopia-Saved', new Date().toISOString());
    const copy = new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers });
    const cache = await caches.open(name);
    await cache.delete(request);
    await cache.put(request, copy);
    const limit = LIMITS[name];
    if (limit) {
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map(k => cache.delete(k)));
    }
  } catch {} // A full disk only means this copy is not kept.
}
