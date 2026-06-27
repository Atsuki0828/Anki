(() => {
'use strict';

const button=()=>document.getElementById('forceReloadBtn');
const text=()=>document.getElementById('forceReloadStatus');
function setStatus(message){const el=text();if(el)el.textContent=message;}
async function clearAppCaches(){
  if(!('caches' in window))return 0;
  const keys=await caches.keys();
  await Promise.all(keys.map(key=>caches.delete(key)));
  return keys.length;
}
async function updateServiceWorker(){
  if(!navigator.serviceWorker?.getRegistrations)return;
  const registrations=await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(registration=>registration.update().catch(()=>null)));
}
function reloadFresh(){
  const url=new URL(location.href);
  url.searchParams.set('reload',String(Date.now()));
  location.replace(url.toString());
}
async function forceReload(){
  const btn=button();
  if(btn)btn.disabled=true;
  setStatus('キャッシュを削除して再読み込みします…');
  try{
    const count=await clearAppCaches();
    await updateServiceWorker();
    setStatus(`${count}件のキャッシュを削除しました。再読み込みします。`);
    setTimeout(reloadFresh,200);
  }catch(error){
    console.error(error);
    setStatus('強制リロードに失敗しました。通常の再読み込みを試します。');
    setTimeout(()=>location.reload(),300);
  }
}
function init(){
  const btn=button();
  if(!btn||btn.dataset.ready)return;
  btn.dataset.ready='1';
  btn.addEventListener('click',forceReload);
}
new MutationObserver(init).observe(document.body,{childList:true,subtree:true});
init();
})();
