import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), {
    name: 'offline-shell',
    apply: 'build',
    generateBundle(_options, bundle) {
      const staticFiles = ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
        ...readdirSync('public/botc').sort().map(name => 'botc/' + name)];
      const files = ['index.html', ...staticFiles, ...Object.keys(bundle)];
      const hash = createHash('sha256').update(Object.keys(bundle).join(':')).update(readFileSync('index.html'));
      for (const file of staticFiles) hash.update(file).update(readFileSync('public/' + file));
      const version = hash.digest('hex').slice(0, 16);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const cachePrefix = 'liars-circle:' + self.registration.scope + ':';
const cacheName = cachePrefix + ${JSON.stringify(version)};
const files = ${JSON.stringify(files)};
self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    if (event.request.mode === 'navigate') {
      try { return await fetch(event.request); } catch { return cache.match('index.html'); }
    }
    return (await cache.match(event.request)) || fetch(event.request);
  }));
});` });
    },
  }],
});
