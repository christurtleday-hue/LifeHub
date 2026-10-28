const CACHE = 'lifehub-v6';
const SHARE_CACHE = 'lifehub-share';
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
    await Promise.all(ks.filter(k => k !== CACHE && k !== SHARE_CACHE).map(k => caches.delete(k)));
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

function textFromBytes(buf) {
  const u8 = new Uint8Array(buf);
  let ascii = '', utf16 = '';
  for (let i = 0; i < u8.length; i++) ascii += (u8[i] >= 32 && u8[i] < 127) ? String.fromCharCode(u8[i]) : '\n';
  for (let i = 0; i + 1 < u8.length; i += 2) {
    const c = u8[i] | (u8[i + 1] << 8);
    utf16 += (c >= 32 && c < 127) ? String.fromCharCode(c) : '\n';
  }
  return ascii + '\n' + utf16;
}
function isShortcut(file) { return /\.(url|desktop|webloc|lnk)$/i.test(file.name || ''); }

async function handleShare(req) {
  let title = '', text = '', url = '', extra = '';
  const docs = [];
  try {
    const form = await req.formData();
    title = String(form.get('title') || '');
    text = String(form.get('text') || '');
    url = String(form.get('url') || '');
    const files = form.getAll('files').filter(f => f && typeof f.arrayBuffer === 'function' && (f.size || f.name));
    for (const f of files) {
      if (isShortcut(f)) { try { extra += '\n' + (f.name || '') + '\n' + textFromBytes(await f.arrayBuffer()); } catch (e) { extra += '\n' + (f.name || ''); } }
      else docs.push(f);
    }
  } catch (err) {}
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (!docs.length && (url || text || title || extra.trim())) {
    try {
      const cache = await caches.open(SHARE_CACHE);
      await cache.put(new Request(new URL('./share-intent.json', self.registration.scope)), new Response(JSON.stringify({ title, text, url, extra }), { headers: { 'Content-Type': 'application/json' } }));
    } catch (e) {}
    clients.forEach(c => { try { c.postMessage({ type: 'lh-add-app' }); } catch (e) {} });
    return Response.redirect(new URL('./#/addnew', self.registration.scope).href, 303);
  }
  for (const f of docs) await stashShare(f);
  clients.forEach(c => { try { c.postMessage({ type: 'lh-shared' }); } catch (e) {} });
  return Response.redirect(new URL('./#/documents', self.registration.scope).href, 303);
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
