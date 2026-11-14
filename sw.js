// Service worker: la app abre aunque no haya señal; los datos siempre se piden en línea. También recibe los avisos de facturas nuevas.
const V = 'af-v8';
const BASE = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // Supabase, CDN y llamadas a la IA van directo a la red
  // Red primero (así siempre ves la versión nueva); si no hay señal, la copia guardada
  e.respondWith(fetch(r, { cache: 'no-store' }).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match('./'))));
});
// Aviso de factura nueva (llega aunque la app esté cerrada; el celular lo suena con su tono de notificación)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Nueva factura electrónica', {
    body: d.body || 'Llegó una factura nueva.', icon: 'icon-192.png', badge: 'icon-192.png',
    tag: d.tag || 'factura', renotify: true, vibrate: [180, 80, 180], data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.postMessage({ nueva: true }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
