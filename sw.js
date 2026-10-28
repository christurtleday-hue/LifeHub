const CACHE = 'lifehub-v5';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './privacy.html', './terms.html', './support.html', './delete-account.html', './favicon.ico', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png'];

function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('lifehub-media', 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images');
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
      if (!db.objectStoreNames.contains('inbox')) db.createObjectStore('inbox');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'skipWaiting') self.skipWaiting();
});

function isSharePost(url) {
  if (url.origin !== location.origin) return false;
  const scopePath = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scopePath)) return false;
  const rest = url.pathname.slice(scopePath.length);
  return rest === '' || rest === 'index.html';
}

async function stashShare(file) {
  const db = await openDb();
  const id = 'doc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const meta = { id, name: file.name || 'Shared file', type: file.type || '', size: file.size || 0, added: Date.now() };
  await new Promise((res, rej) => {
    const t = db.transaction(['files', 'inbox'], 'readwrite');
    t.objectStore('files').put(file, id);
    t.objectStore('inbox').put(meta, id);
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}

async function handleShare(req) {
  try {
    const form = await req.formData();
    const files = form.getAll('files').filter(f => f && typeof f.arrayBuffer === 'function');
    for (const f of files) await stashShare(f);
  } catch (err) {}
  const dest = new URL('./#/documents', self.registration.scope);
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(c => { try { c.postMessage({ type: 'lh-shared' }); } catch (e) {} });
  return Response.redirect(dest.href, 303);
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.method === 'POST' && isSharePost(url)) {
    e.respondWith(handleShare(e.request));
    return;
  }
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match('./index.html'))));
});
