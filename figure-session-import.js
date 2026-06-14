(() => {
'use strict';
const LABEL={upper:'\u4e0a\u80a2',lower:'\u4e0b\u80a2',trunk:'\u80cc\u90e8\u30fb\u80f8\u90e8\u30fb\u8179\u90e8',pelvis:'\u9aa8\u76e4\u90e8\u30fb\u982d\u9838\u90e8\u30fb\u4e2d\u67a2\u795e\u7d4c\u7cfb'};
const DB_NAME='anatomy-quiz-figures-v1',DB_VERSION=1,ASSET_STORE='assets',META_STORE='meta';
const state={map:{},loaded:{}};
let dbPromise;
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(ASSET_STORE))db.createObjectStore(ASSET_STORE);
      if(!db.objectStoreNames.contains(META_STORE))db.createObjectStore(META_STORE);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  return dbPromise;
}
async function read(store,key){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const request=db.transaction(store,'readonly').objectStore(store).get(key);
    request.onsuccess=()=>resolve(request.result??null);
    request.onerror=()=>reject(request.error);
  });
}
async function write(store,key,value){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readwrite');
    tx.objectStore(store).put(value,key);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||new Error('storage-aborted'));
  });
}
const decode=bytes=>{try{return new TextDecoder().decode(bytes)}catch{return''}};
function mime(bytes){
  if(bytes[0]===255&&bytes[1]===216)return'image/jpeg';
  if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78)return'image/png';
  if(decode(bytes.slice(0,4))==='GIF8')return'image/gif';
  if(decode(bytes.slice(0,4))==='%PDF')return'application/pdf';
  if(decode(bytes.slice(0,4))==='RIFF')return'image/webp';
  return'application/octet-stream';
}
async function optimise(bytes,type){
  const raw=new Blob([bytes],{type});
  if(!/^image\/(jpeg|png|webp)$/.test(type)||typeof createImageBitmap!=='function')return raw;
  try{
    const bitmap=await createImageBitmap(raw),limit=1400,scale=Math.min(1,limit/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    bitmap.close();
    return await new Promise(resolve=>canvas.toBlob(blob=>resolve(blob||raw),'image/webp',0.8));
  }catch{return raw}
}
async function initialise(){
  try{
    Object.assign(state.map,(await read(META_STORE,'map'))||{});
    Object.assign(state.loaded,(await read(META_STORE,'loaded'))||{});
  }catch(error){console.error('figure storage init failed',error)}
  message();
  document.dispatchEvent(new Event('anatomy-figures-ready'));
}
const ready=initialise();
async function importFiles(files,progress=()=>{}){
  await ready;
  if(!window.JSZip)throw Error('JSZip unavailable');
  for(const file of files){
    progress(file.name);
    const zip=await JSZip.loadAsync(await file.arrayBuffer());
    const source=AnatomyGoodNotes.sourceFor(file.name,zip);
    if(!source)throw Error('unknown source');
    const map=await AnatomyGoodNotes.build(zip,source,(i,n)=>progress(`${LABEL[source]} ${i}/${n}`));
    Object.assign(state.map,map);
    const ids=[...new Set(Object.values(map).flat())];
    let saved=0;
    for(let i=0;i<ids.length;i++){
      const id=ids[i],entry=zip.file('attachments/'+id);
      if(!entry)continue;
      progress(`${LABEL[source]} \u56f3 ${i+1}/${ids.length}`);
      const bytes=await entry.async('uint8array'),type=mime(bytes),blob=await optimise(bytes,type);
      await write(ASSET_STORE,id,{blob,mime:blob.type||type});
      saved++;
    }
    state.loaded[source]={file:file.name,count:saved,date:Date.now()};
    await write(META_STORE,'map',state.map);
    await write(META_STORE,'loaded',state.loaded);
  }
  try{await navigator.storage?.persist?.()}catch{}
  return Object.keys(state.loaded).length;
}
function source(id){if(id<=121)return'upper';if(id<=241)return'lower';if(id<=384)return'trunk';return'pelvis'}
async function dataFor(id){
  await ready;
  const keys=state.map[id]||[],out=[];
  for(const key of keys){const value=await read(ASSET_STORE,key);if(value?.blob)out.push({blob:value.blob,mime:value.mime||value.blob.type||'application/octet-stream'})}
  return out;
}
function message(text=''){
  const el=document.getElementById('figureImportStatus'),names=Object.keys(state.loaded).map(key=>LABEL[key]);
  if(el)el.textContent=text||(names.length?'\u7aef\u672b\u306b\u4fdd\u5b58\u6e08\u307f\uff1a'+names.join('\u3001'):'\u307e\u3060\u56f3\u3092\u4fdd\u5b58\u3057\u3066\u3044\u307e\u305b\u3093\u3002');
}
async function pick(input){
  if(!input.files.length)return;
  input.disabled=true;
  try{
    await importFiles([...input.files],message);
    message();
    document.dispatchEvent(new Event('anatomy-figures-loaded'));
    alert('\u56f3\u3092\u7aef\u672b\u306b\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002\u6b21\u56de\u304b\u3089\u30d5\u30a1\u30a4\u30eb\u9078\u629e\u306f\u4e0d\u8981\u3067\u3059\u3002');
  }catch(error){
    console.error(error);
    const quota=error?.name==='QuotaExceededError'?'\u7a7a\u304d\u5bb9\u91cf\u304c\u4e0d\u8db3\u3057\u3066\u3044\u307e\u3059\u3002':error.message;
    message('\u8aad\u307f\u8fbc\u307f\u30a8\u30e9\u30fc: '+quota);
    alert(quota);
  }finally{input.disabled=false;input.value=''}
}
window.AnatomyFigureSession={LABEL,state,ready,importFiles,dataFor,pick};
})();
