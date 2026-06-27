const CACHE='anatomy-quiz-medical-audit-v22';
const CORE=['./','./index.html','./styles.css','./image-styles.css','./learning-status.css','./terminology.css','./study-order.css','./study-navigation.css','./cloud-sync.css','./shell.js','./questions-corrections-medical-audit-2-01.js','./questions-corrections-medical-audit-2-02.js','./questions-corrections-medical-audit-2-03.js','./questions-corrections-medical-audit-2-04.js','./questions-corrections-medical-audit-2-05.js','./questions-corrections-medical-audit-2-06.js','./questions-corrections-medical-audit-2-07.js','./questions-corrections-medical-audit-2-08a.js','./questions-corrections-medical-audit-2-08b.js','./questions-corrections-medical-audit-2-09a.js','./questions-corrections-medical-audit-2-09b.js','./questions-corrections-medical-audit-2-09c.js','./questions-corrections-medical-audit-2-09d.js','./questions-corrections-medical-audit-2-09e.js','./questions-corrections-medical-audit-2-09f.js','./questions-corrections-medical-audit-2-09g.js','./questions-corrections-medical-audit-2-10.js','./questions-corrections-medical-audit-2-10a.js','./questions-corrections-medical-audit-2-10b.js','./questions-corrections-medical-audit-2-11a.js','./questions-corrections-medical-audit-2-11b.js','./questions-corrections-medical-audit-2-11d.js','./questions-corrections-medical-audit-2-11e.js','./terminology-corrections-medical-audit-2-lower-a.js','./terminology-corrections-medical-audit-2-lower-b.js','./terminology-corrections-medical-audit-2-lower-c.js','./terminology-corrections-medical-audit-2-upper-a.js','./manifest.webmanifest','./app.js','./exclude-unseen-filter.js','./custom-question-tools.js','./settings-force-reload.js','./science-srs.js','./skip-position.js','./study-order.js','./learning-status.js','./terminology-ui.js','./figure-render.js'];

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
