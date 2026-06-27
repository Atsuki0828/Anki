const CACHE='anki-app-v20260624-4';
const CORE=['./','./index.html','./styles.css','./image-styles.css','./learning-status.css','./terminology.css','./study-order.css','./study-navigation.css','./cloud-sync.css','./shell.js','./manifest.webmanifest','./app.js','./exclude-unseen-filter.js','./custom-question-tools.js','./settings-force-reload.js','./science-srs.js','./skip-position.js','./study-order.js','./learning-status.js','./terminology-ui.js','./figure-render.js'];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE)
    .then(cache=>Promise.all(CORE.map(url=>cache.add(url).catch(()=>null))))
    .then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>null);
      return response;
    }).catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html')))
  );
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){
      if('focus' in client)return client.focus();
    }
    if(clients.openWindow)return clients.openWindow('./');
  }));
});
