/* रसुवा बाढी · सूचना · SW_VER 2026-09-07-0145 */
const SCOPE = self.registration.scope;
const LATEST = new URL('latest.json', SCOPE).href;
const ICON = new URL('icon-192.png', SCOPE).href;
const SEEN_CACHE = 'rasuwa-seen-v2';
const MUTE_CACHE = 'rasuwa-mute-v1';
const STATIC_CACHE = 'rasuwa-static-2026-09-07-0145';
const SW_VER = '2026-09-07-0145';
const PAGE_VER = '2026-09-07-0145';

const STATIC_EXT = /\.(?:css|woff2|png|jpg|jpeg|webp|svg|ico|webmanifest)$/i;
const STATIC_PATH = /\/(?:fonts\.css|bulletin\.css|fonts\/|img\/pay\/)/i;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    try {
      const c = await caches.open(STATIC_CACHE);
      await c.addAll([
        new URL('fonts.css?v=' + PAGE_VER, SCOPE).href,
        new URL('bulletin.css?v=' + PAGE_VER, SCOPE).href,
        new URL('fonts/mukta-500-deva.woff2', SCOPE).href,
        new URL('fonts/mukta-500-latn.woff2', SCOPE).href,
        new URL('fonts/mukta-700-deva.woff2', SCOPE).href,
        new URL('fonts/mukta-700-latn.woff2', SCOPE).href,
        new URL('fonts/mukta-800-deva.woff2', SCOPE).href,
        new URL('fonts/mukta-800-latn.woff2', SCOPE).href,
        new URL('icon-192.png', SCOPE).href
      ]);
    } catch (err) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k.startsWith('rasuwa-static-') && k !== STATIC_CACHE) return caches.delete(k);
    }));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((c) => (c.navigate ? c.navigate(c.url) : Promise.resolve())));
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Live board: never cache latest.json / HTML / JS / JSON with stale data
  const dest = e.request.destination;
  const p = url.pathname;
  const isLatest = /\/latest\.json$/i.test(p);
  const live = e.request.mode === 'navigate' || dest === 'document' || dest === 'script' || dest === 'manifest' ||
    isLatest || /\.(html|js|json|webmanifest)$/i.test(p) || p.endsWith('/');

  if (live) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(function (res) {
        var h = new Headers(res.headers);
        h.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
      }).catch(function () { return fetch(e.request); })
    );
    return;
  }

  // Static CSS/fonts/pay chips: cache-first with PAGE_VER awareness via cache name
  if (dest === 'style' || dest === 'font' || dest === 'image' || STATIC_EXT.test(p) || STATIC_PATH.test(p)) {
    e.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(e.request);
      if (hit) return hit;
      try {
        const res = await fetch(e.request);
        if (res && res.ok) {
          try { await cache.put(e.request, res.clone()); } catch (err) {}
        }
        return res;
      } catch (err) {
        return hit || Response.error();
      }
    })());
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
