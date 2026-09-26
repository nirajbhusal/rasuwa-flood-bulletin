/* रसुवा बाढी · सूचना */
const SCOPE = self.registration.scope;
const LATEST = new URL('latest.json', SCOPE).href;
const ICON = new URL('icon-192.png', SCOPE).href;
const SEEN_CACHE = 'rasuwa-seen-v2';
const MUTE_CACHE = 'rasuwa-mute-v1';
const PAGE_VER = 'e26f1e1-20260926T082936Z';
const SW_VER = PAGE_VER;
const STATIC_CACHE = 'rasuwa-static-' + PAGE_VER;
const RUNTIME_CACHE = 'rasuwa-runtime-' + PAGE_VER;

function verUrl(path) {
  return new URL(path + ['?v', PAGE_VER].join('='), SCOPE).href;
}

function isDataPath(pathname) {
  const p = pathname.toLowerCase();
  if (/\.(?:json|geojson)$/i.test(p)) return true;
  if (p.indexOf('/data/') !== -1) return true;
  return false;
}

function isNavigation(request, url) {
  if (request.mode === 'navigate' || request.destination === 'document') return true;
  const p = url.pathname;
  if (p.endsWith('/') || /\.html?$/i.test(p)) return true;
  return false;
}

function isVersionedStatic(request, url) {
  if (!url.searchParams.get('v')) return false;
  if (isDataPath(url.pathname)) return false;
  const dest = request.destination;
  if (dest === 'script' || dest === 'style' || dest === 'font' || dest === 'image') return true;
  return /\.(?:js|mjs|css|woff2?|png|jpe?g|webp|svg|ico)$/i.test(url.pathname);
}

function isImmutableAsset(request, url) {
  const dest = request.destination;
  if (dest === 'font' || dest === 'image') return true;
  return /\.(?:woff2?|png|jpe?g|webp|gif|ico)$/i.test(url.pathname);
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    try {
      const c = await caches.open(STATIC_CACHE);
      await c.addAll([
        verUrl('fonts.css'),
        verUrl('bulletin.min.css'),
        new URL('fonts/mukta-500-deva.woff2', SCOPE).href,
        new URL('fonts/mukta-500-latn.woff2', SCOPE).href,
        new URL('fonts/mukta-700-deva.woff2', SCOPE).href,
        new URL('fonts/mukta-700-latn.woff2', SCOPE).href,
        new URL('fonts/mukta-800-deva.woff2', SCOPE).href,
        new URL('fonts/mukta-800-latn.woff2', SCOPE).href,
        new URL('icon-192.png', SCOPE).href,
        verUrl('gallery-path.js'),
        new URL('img/gallery-path/esa-s2-trishuli-after-2026-08-27.jpg', SCOPE).href,
        new URL('img/gallery-path/esa-s2-trishuli-before-2026-08-12.jpg', SCOPE).href,
        new URL('img/gallery-path/esa-swir-after-landsat9-2026-08-26.jpg', SCOPE).href,
        new URL('img/gallery-path/esa-swir-before-s2-2026-08-24.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-betrawati-trishuli-after-2026-09-21.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-betrawati-trishuli-before-2026-08-12.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-betrawati-trishuli-dayafter-2026-08-27.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-lhende-source-after-2026-09-21.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-lhende-source-before-2025-10-26.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-rasuwagadhi-timure-after-2026-09-21.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-rasuwagadhi-timure-before-2026-08-12.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-rasuwagadhi-timure-dayafter-2026-08-27.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-syaphrubesi-after-2026-09-21.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-syaphrubesi-before-2026-08-12.jpg', SCOPE).href,
        new URL('img/gallery-path/s2-syaphrubesi-dayafter-2026-08-27.jpg', SCOPE).href
      ]);
    } catch (err) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, RUNTIME_CACHE, SEEN_CACHE, MUTE_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (keep.has(k) ? null : caches.delete(k))));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((c) => c.postMessage({ type: 'page-refresh', id: PAGE_VER })));
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request.url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'follow'
    });
    if (request.method === 'GET' && res && res.ok) {
      try {
        await cache.put(new Request(request.url, { method: 'GET' }), res.clone());
      } catch (err) {}
    }
    try {
      const headers = new Headers(res.headers);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      headers.set('Pragma', 'no-cache');
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: headers
      });
    } catch (err) {
      return res;
    }
  } catch (err) {
    try {
      const hit = await cache.match(request, { ignoreSearch: true });
      if (hit) return hit;
    } catch (err2) {}
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (request.method === 'GET' && res && res.ok) {
      try { await cache.put(request, res.clone()); } catch (err) {}
    }
    return res;
  } catch (err) {
    return hit || Response.error();
  }
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;
  const dest = e.request.destination;
  if (dest === 'video' || dest === 'audio' || e.request.headers.has('range')) return;

  if (isNavigation(e.request, url) || isDataPath(url.pathname)) {
    e.respondWith(networkFirst(e.request));
    return;
  }
  if (isVersionedStatic(e.request, url) || (isImmutableAsset(e.request, url) && !isDataPath(url.pathname) && dest !== 'script' && dest !== 'style')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }
  if (/\.(?:css|js|mjs)$/i.test(url.pathname) || dest === 'script' || dest === 'style' || dest === 'manifest') {
    e.respondWith(networkFirst(e.request));
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

async function tellPages(id) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of clients) c.postMessage({ type: 'page-refresh', id: id || SW_VER });
}

async function checkLatest(forceNotify) {
  const res = await fetch(LATEST + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  const seen = await getSeen();
  if (!data.id) return data;
  const muted = await isMuted();
  if (muted && !forceNotify) {
    if (seen && seen !== data.id) await tellPages(data.id);
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
    await tellPages(data.id);
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
  if (msg.type === 'skip-waiting') self.skipWaiting();
  if (msg.type === 'force-refresh') {
    e.waitUntil((async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clients) c.postMessage({ type: 'page-refresh', id: PAGE_VER });
    })());
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
