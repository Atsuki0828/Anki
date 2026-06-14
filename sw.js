const CACHE='upper-limb-quiz-v1';
const ASSETS=['./','./index.html','./styles.css','./shell.js','./app.js','./manifest.webmanifest','./questions-1.js','./questions-2a.js','./questions-2b.js','./questions-3a.js','./questions-3b.js','./questions-4a.js','./questions-4b.js','./questions-4c.js','./questions-5a.js','./questions-5b.js','./questions-5c.js','./questions-5d.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;})));});
