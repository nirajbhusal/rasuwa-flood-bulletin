/* रसुवा बाढी · सूचना + अफलाइन क्यास */
const SCOPE = self.registration.scope;
const LATEST = new URL('latest.json', SCOPE).href;
const ICON = new URL('icon-192.png', SCOPE).href;
const SEEN_CACHE = 'rasuwa-seen-v2';
const MUTE_CACHE = 'rasuwa-mute-v1';

const SHELL_CACHE = 'rasuwa-shell-v1';
const DATA_CACHE = 'rasuwa-data-v1';
const SHELL_URLS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']
  .map((p) => new URL(p, SCOPE).href);
const DATA_FILES = ['latest.json', 'family.json', 'dhm-rivers.json', 'dhm-betrawati.json'];
const DATA_URLS = DATA_FILES.map((f) => new URL(f, SCOPE).href);

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(Promise.all([
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).catch(() => {}),
    // Seed a first offline snapshot so a page's very first data fetch (which
    // fires before this worker can claim the page) still has a fallback.
    caches.open(DATA_CACHE).then((c) => Promise.all(
      DATA_URLS.map((u) => fetch(u, { cache: 'no-store' })
        .then((res) => { if (res.ok) c.put(u, res); })
        .catch(() => {}))
    ))
  ]));
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

// Cache-bust query strings (?t=...) must resolve to the same key as the
// install-time snapshot above, so strip the query before matching/storing.
function dataUrlFor(url) {
  const bare = url.origin + url.pathname;
  return DATA_URLS.indexOf(bare) !== -1 ? bare : null;
}

// Network-first: always try the live copy so numbers stay current while
// online; only fall back to the last cached response when the fetch fails.
async function networkFirst(req, cacheName, cacheKey) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(cacheKey, res.clone());
    }
    return res;
  } catch (err) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave CDN/tile requests alone

  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL_CACHE, new URL('index.html', SCOPE).href));
    return;
  }
  const dataUrl = dataUrlFor(url);
  if (dataUrl) {
    e.respondWith(networkFirst(req, DATA_CACHE, dataUrl));
    return;
  }
  if (SHELL_URLS.indexOf(url.href) !== -1) {
    e.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
  }
});

async function getSeen() {
  try {
    const c = await caches.open(SEEN_CACHE);
    const r = await c.match('id');
    return r ? await r.text() : '';
  } catch (err) { return ''; }
}
async function setSeen(id) {
  const c = await caches.open(SEEN_CACHE);
  await c.put('id', new Response(id, { headers: { 'content-type': 'text/plain' } }));
}
async function isMuted() {
  try {
    const c = await caches.open(MUTE_CACHE);
    const r = await c.match('mute');
    return r ? (await r.text()) === '1' : false;
  } catch (err) { return false; }
}
async function setMuted(v) {
  const c = await caches.open(MUTE_CACHE);
  await c.put('mute', new Response(v ? '1' : '0', { headers: { 'content-type': 'text/plain' } }));
}

async function checkLatest(forceNotify) {
  const res = await fetch(LATEST + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  const seen = await getSeen();
  if (!data.id) return data;
  const muted = await isMuted();
  if (muted && !forceNotify) {
    if (data.id) await setSeen(data.id);
    return data;
  }
  if (seen && seen !== data.id) {
    await self.registration.showNotification(data.title || 'रसुवा बाढी अपडेट', {
      body: data.body || '',
      icon: ICON,
      badge: ICON,
      tag: 'rasuwa-flood',
      renotify: true,
      lang: 'ne',
      data: { url: data.url || './' }
    });
  } else if (forceNotify) {
    await self.registration.showNotification('रसुवा बाढी · सूचना अन भयो', {
      body: 'नयाँ आधिकारिक अपडेट आउँदा यहाँ सूचना आउँछ।',
      icon: ICON,
      tag: 'rasuwa-flood-on',
      lang: 'ne',
      data: { url: './' }
    });
  }
  if (data.id) await setSeen(data.id);
  return data;
}

self.addEventListener('message', (e) => {
  const msg = e.data || {};
  if (msg.type === 'mute') e.waitUntil(setMuted(true));
  if (msg.type === 'unmute') e.waitUntil(setMuted(false));
  if (msg.type === 'check') {
    e.waitUntil(checkLatest(!!msg.welcome));
  }
});

self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'rasuwa-updates') e.waitUntil(checkLatest(false));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', SCOPE).href;
  e.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) {
      if (c.url && 'focus' in c) { c.focus(); c.navigate && c.navigate(url); return; }
    }
    await self.clients.openWindow(url);
  })());
});
