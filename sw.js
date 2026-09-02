/* रसुवा बाढी · सूचना · SW_VER 2026-09-02-1345 */
const SCOPE = self.registration.scope;
const LATEST = new URL('latest.json', SCOPE).href;
const ICON = new URL('icon-192.png', SCOPE).href;
const SEEN_CACHE = 'rasuwa-seen-v2';
const MUTE_CACHE = 'rasuwa-mute-v1';
const SW_VER = '2026-09-02-1345';

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((c) => (c.navigate ? c.navigate(c.url) : Promise.resolve())));
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const dest = e.request.destination;
  const p = url.pathname;
  const live = e.request.mode === 'navigate' || dest === 'document' || dest === 'script' || dest === 'manifest' ||
    /\.(html|js|json|webmanifest)$/.test(p) || p.endsWith('/');
  if (!live) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).then(function (res) {
      var h = new Headers(res.headers);
      h.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    }).catch(function () { return fetch(e.request); })
  );
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
