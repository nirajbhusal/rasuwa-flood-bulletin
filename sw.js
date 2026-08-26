/* रसुवा बाढी · सूचना */
const SCOPE = self.registration.scope;
const LATEST = new URL('latest.json', SCOPE).href;
const ICON = new URL('icon-192.png', SCOPE).href;
const SEEN_CACHE = 'rasuwa-seen-v1';

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

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

async function checkLatest(forceNotify) {
  const res = await fetch(LATEST + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  const seen = await getSeen();
  if (!data.id) return data;
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
