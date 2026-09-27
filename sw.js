// Service worker: guarda la app y todas las lecciones para usarlas sin conexión.
// VERSION la actualiza tools/generar-precache.mjs cuando cambia algún archivo.
const VERSION = '424b2e1d4c99';
const CACHE = `aprendo2-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const resp = await fetch('precache.json', { cache: 'no-store' });
    const lista = await resp.json();
    // de a poco para no saturar conexiones lentas
    for (let i = 0; i < lista.archivos.length; i += 20) {
      await cache.addAll(lista.archivos.slice(i, i + 20).map((a) => new Request(a, { cache: 'reload' })));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => n.startsWith('aprendo2-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // La app es una sola página: se sirve la guardada si la red tarda más de 3 s o falla,
    // y solo se guarda una respuesta correcta de la página principal.
    const esShell = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const guardada = esShell ? await cache.match('index.html') : null;
      const deRed = fetch(req).then((red) => {
        if (red && red.ok && esShell) cache.put('index.html', red.clone());
        return red;
      }).catch(() => null);
      if (!guardada) return (await deRed) || (await cache.match('index.html')) || Response.error();
      event.waitUntil(deRed);
      const espera = new Promise((r) => setTimeout(() => r(null), 3000));
      const red = await Promise.race([deRed, espera]);
      return red && red.ok ? red : guardada;
    })());
    return;
  }

  // Resto: primero lo guardado (rápido y sin conexión) y se actualiza en segundo plano.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(req, { ignoreSearch: true });
    const deRed = fetch(req).then((r) => {
      if (r && r.ok) cache.put(req, r.clone());
      return r;
    }).catch(() => null);
    if (guardado) {
      event.waitUntil(deRed);
      return guardado;
    }
    return (await deRed) || Response.error();
  })());
});
