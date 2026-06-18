(() => {
'use strict';

const STATE_KEY='ulq-state-v1';
const SETTINGS_KEY='ulq-settings-v1';
const SESSION_KEY='ulq-active-session-v2';
const META_KEY='ulq-cloud-meta-v1';
const CONFIG_KEY='ulq-firebase-config-v1';
const SYNC_KEYS=new Set([STATE_KEY,SETTINGS_KEY,SESSION_KEY]);
const DEFAULT_STATE={items:{},answered:0,correct:0,streak:0,last:''};
const DEFAULT_SETTINGS={order:'smart',showInput:true,largeText:false};
const nativeSet=Storage.prototype.setItem;
const nativeRemove=Storage.prototype.removeItem;
let suspended=false,auth=null,db=null,user=null,syncTimer=null,syncing=false,syncAgain=false;

const el=id=>document.getElementById(id);
const status=el('cloudSyncStatus');
const login=el('cloudLoginBtn');
const logout=el('cloudLogoutBtn');
const syncNow=el('cloudSyncNowBtn');
const userBox=el('cloudSyncUser');
const setup=el('cloudSetupDetails');
const configInput=el('cloudConfigInput');
const saveConfigBtn=el('cloudSaveConfigBtn');
const clearConfigBtn=el('cloudClearConfigBtn');

function parse(value,fallback=null){try{return value?JSON.parse(value):fallback}catch{return fallback}}
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value))}
function message(text,state='idle'){if(status){status.textContent=text;status.dataset.state=state}}
function defaultMeta(){return{schemaVersion:2,itemUpdatedAt:{},stateUpdatedAt:0,settingsUpdatedAt:0,sessionUpdatedAt:0,updatedAt:0,lastSuccessfulSyncAt:0}}
function loadMeta(){const value=parse(localStorage.getItem(META_KEY),{})||{};return{...defaultMeta(),...value,itemUpdatedAt:value.itemUpdatedAt&&typeof value.itemUpdatedAt==='object'?value.itemUpdatedAt:{}}}
function saveMeta(meta){nativeSet.call(localStorage,META_KEY,JSON.stringify(meta))}

function markMutation(key,oldValue,newValue){
  const now=Date.now(),meta=loadMeta();meta.updatedAt=now;
  if(key===STATE_KEY){
    const before=parse(oldValue,DEFAULT_STATE)||DEFAULT_STATE,after=parse(newValue,DEFAULT_STATE)||DEFAULT_STATE;
    const oldItems=before.items||{},newItems=after.items||{};
    new Set([...Object.keys(oldItems),...Object.keys(newItems)]).forEach(id=>{
      if(JSON.stringify(oldItems[id]??null)!==JSON.stringify(newItems[id]??null))meta.itemUpdatedAt[id]=now;
    });
    meta.stateUpdatedAt=now;
  }else if(key===SETTINGS_KEY)meta.settingsUpdatedAt=now;
  else if(key===SESSION_KEY)meta.sessionUpdatedAt=now;
  saveMeta(meta);scheduleSync();
}

Storage.prototype.setItem=function(key,value){
  const oldValue=this===localStorage?this.getItem(key):null;
  const result=nativeSet.call(this,key,value);
  if(this===localStorage&&!suspended&&SYNC_KEYS.has(key)&&oldValue!==String(value))markMutation(key,oldValue,String(value));
  return result;
};
Storage.prototype.removeItem=function(key){
  const oldValue=this===localStorage?this.getItem(key):null;
  const result=nativeRemove.call(this,key);
  if(this===localStorage&&!suspended&&SYNC_KEYS.has(key)&&oldValue!==null)markMutation(key,oldValue,null);
  return result;
};

function validConfig(value){return Boolean(value&&typeof value==='object'&&value.apiKey&&value.authDomain&&value.projectId&&value.appId)}
function getConfig(){const embedded=window.ANATOMY_FIREBASE_CONFIG;if(validConfig(embedded))return embedded;const stored=parse(localStorage.getItem(CONFIG_KEY),null);return validConfig(stored)?stored:null}
function parseConfigText(text){
  if(/private_key|client_email|service_account/i.test(text))throw new Error('サービスアカウント秘密鍵は入力しないでください。');
  let value=text.trim().replace(/^\s*(?:const|let|var)\s+firebaseConfig\s*=\s*/i,'').replace(/;\s*$/,'');
  value=value.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g,'$1"$2"$3').replace(/'/g,'"');
  const config=JSON.parse(value);if(!validConfig(config))throw new Error('apiKey、authDomain、projectId、appIdが必要です。');return config;
}

function configureUi(){
  const stored=parse(localStorage.getItem(CONFIG_KEY),null);if(configInput&&stored)configInput.value=JSON.stringify(stored,null,2);
  saveConfigBtn?.addEventListener('click',()=>{try{const config=parseConfigText(configInput.value);nativeSet.call(localStorage,CONFIG_KEY,JSON.stringify(config));message('接続設定を保存しました。再読み込みします。','ok');setTimeout(()=>location.reload(),250)}catch(error){message(error.message||String(error),'error')}});
  clearConfigBtn?.addEventListener('click',()=>{nativeRemove.call(localStorage,CONFIG_KEY);if(configInput)configInput.value='';message('この端末の接続設定を削除しました。','setup')});
}

function render(current){
  user=current||null;
  if(login)login.hidden=Boolean(user);
  if(logout)logout.hidden=!user;
  if(syncNow)syncNow.hidden=!user;
  if(userBox)userBox.textContent=user?`${user.displayName||'Googleユーザー'} (${user.email||''})`:'未ログイン・端末保存のみ';
  if(setup)setup.open=!getConfig();
}

function normalize(value={}){
  const state=value.state&&typeof value.state==='object'?clone(value.state):clone(DEFAULT_STATE);state.items=state.items&&typeof state.items==='object'?state.items:{};
  const legacy=Number(value.updatedAtClient)||0;
  const rawMeta=value.meta&&typeof value.meta==='object'?clone(value.meta):{};
  const meta={...defaultMeta(),...rawMeta,itemUpdatedAt:rawMeta.itemUpdatedAt&&typeof rawMeta.itemUpdatedAt==='object'?rawMeta.itemUpdatedAt:{}};
  if(!meta.stateUpdatedAt)meta.stateUpdatedAt=legacy;if(!meta.settingsUpdatedAt)meta.settingsUpdatedAt=legacy;if(!meta.sessionUpdatedAt)meta.sessionUpdatedAt=Number(value.session?.updatedAt)||legacy;if(!meta.updatedAt)meta.updatedAt=legacy;
  return{schemaVersion:2,state,settings:value.settings&&typeof value.settings==='object'?clone(value.settings):clone(DEFAULT_SETTINGS),session:value.session&&typeof value.session==='object'?clone(value.session):null,meta};
}
function localSnapshot(){return normalize({state:parse(localStorage.getItem(STATE_KEY),clone(DEFAULT_STATE)),settings:parse(localStorage.getItem(SETTINGS_KEY),clone(DEFAULT_SETTINGS)),session:parse(localStorage.getItem(SESSION_KEY),null),meta:loadMeta()})}
function rank(item){if(!item)return[-1,-1,-1,-1];return[Number(item.seen)||0,(Number(item.ok)||0)+(Number(item.ng)||0),Number(item.level)||0,Number(item.due)||0]}
function prefer(a,b){const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]>y[i]?a:b;return a||b||null}
function merge(localValue,remoteValue){
  const local=normalize(localValue),remote=normalize(remoteValue),li=local.state.items||{},ri=remote.state.items||{},items={},itemUpdatedAt={};
  const ids=new Set([...Object.keys(li),...Object.keys(ri),...Object.keys(local.meta.itemUpdatedAt),...Object.keys(remote.meta.itemUpdatedAt)]);
  ids.forEach(id=>{const lt=Number(local.meta.itemUpdatedAt[id])||0,rt=Number(remote.meta.itemUpdatedAt[id])||0,lh=Object.prototype.hasOwnProperty.call(li,id),rh=Object.prototype.hasOwnProperty.call(ri,id);let selected=null;if(lt>rt)selected=lh?li[id]:null;else if(rt>lt)selected=rh?ri[id]:null;else if(lh||rh)selected=prefer(li[id],ri[id]);if(selected)items[id]=clone(selected);itemUpdatedAt[id]=Math.max(lt,rt)});
  const stateSource=Number(local.meta.stateUpdatedAt)>=Number(remote.meta.stateUpdatedAt)?local.state:remote.state;
  const settings=Number(local.meta.settingsUpdatedAt)>=Number(remote.meta.settingsUpdatedAt)?local.settings:remote.settings;
  const localSessionTime=Math.max(Number(local.meta.sessionUpdatedAt)||0,Number(local.session?.updatedAt)||0),remoteSessionTime=Math.max(Number(remote.meta.sessionUpdatedAt)||0,Number(remote.session?.updatedAt)||0);
  const session=localSessionTime>=remoteSessionTime?local.session:remote.session;
  const values=Object.values(items);
  return normalize({state:{items,answered:values.reduce((n,v)=>n+(Number(v.seen)||0),0),correct:values.reduce((n,v)=>n+(Number(v.ok)||0),0),streak:Number(stateSource.streak)||0,last:String(stateSource.last||'')},settings,session,meta:{schemaVersion:2,itemUpdatedAt,stateUpdatedAt:Math.max(Number(local.meta.stateUpdatedAt)||0,Number(remote.meta.stateUpdatedAt)||0),settingsUpdatedAt:Math.max(Number(local.meta.settingsUpdatedAt)||0,Number(remote.meta.settingsUpdatedAt)||0),sessionUpdatedAt:Math.max(Number(local.meta.sessionUpdatedAt)||0,Number(remote.meta.sessionUpdatedAt)||0),updatedAt:Math.max(Number(local.meta.updatedAt)||0,Number(remote.meta.updatedAt)||0),lastSuccessfulSyncAt:Math.max(Number(local.meta.lastSuccessfulSyncAt)||0,Number(remote.meta.lastSuccessfulSyncAt)||0)}});
}
function comparable(value){return JSON.stringify(normalize(value))}
function applyLocal(value){const data=normalize(value);suspended=true;try{nativeSet.call(localStorage,STATE_KEY,JSON.stringify(data.state));nativeSet.call(localStorage,SETTINGS_KEY,JSON.stringify(data.settings));if(data.session)nativeSet.call(localStorage,SESSION_KEY,JSON.stringify(data.session));else nativeRemove.call(localStorage,SESSION_KEY);saveMeta(data.meta)}finally{suspended=false}}
function ref(){return db.collection('users').doc(user.uid).collection('quiz').doc('progress')}
function reloadSafely(){const stop=event=>event.stopImmediatePropagation();window.addEventListener('pagehide',stop,{capture:true,once:true});document.addEventListener('visibilitychange',stop,{capture:true,once:true});location.reload()}

async function synchronize({manual=false}={}){
  if(!user||!db)return;if(syncing){syncAgain=true;return}syncing=true;message(manual?'同期しています…':'変更を同期しています…','working');
  try{
    const local=localSnapshot(),snapshot=await ref().get(),remote=snapshot.exists?normalize(snapshot.data()):null,merged=remote?merge(local,remote):local;
    const localChanged=comparable(local)!==comparable(merged),remoteChanged=!remote||comparable(remote)!==comparable(merged);
    if(remoteChanged)await ref().set({...merged,ownerUid:user.uid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    if(localChanged){applyLocal(merged);message('クラウドの進捗を統合しました。画面を更新します。','ok');setTimeout(reloadSafely,300);return}
    const now=Date.now(),meta=loadMeta();meta.lastSuccessfulSyncAt=now;saveMeta(meta);message(`同期済み ${new Date(now).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}`,'ok');
  }catch(error){console.error(error);message(friendlyError(error),'error')}finally{syncing=false;if(syncAgain){syncAgain=false;setTimeout(()=>synchronize(),100)}}
}
function friendlyError(error){const code=String(error?.code||'');if(code.includes('unauthorized-domain'))return'このGitHub PagesドメインがFirebaseで許可されていません';if(code.includes('operation-not-allowed'))return'FirebaseでGoogleログインを有効にしてください';if(code.includes('permission-denied'))return'Firestoreルールを確認してください';if(code.includes('network-request-failed')||!navigator.onLine)return'オフラインです。オンライン復帰後に同期します';if(code.includes('popup-closed-by-user'))return'ログイン画面が閉じられました';return`同期に失敗：${error?.message||error}`}
function scheduleSync(){if(!user)return;clearTimeout(syncTimer);message('未同期の変更あり','working');syncTimer=setTimeout(()=>synchronize(),1400)}
async function signIn(){const provider=new firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});message('Googleログインを開いています…','working');try{await auth.signInWithPopup(provider)}catch(error){if(error?.code==='auth/popup-blocked'||error?.code==='auth/web-storage-unsupported'){await auth.signInWithRedirect(provider);return}message(friendlyError(error),'error')}}
async function signOut(){await auth.signOut();render(null);message('端末保存のみ','idle')}

async function init(){
  configureUi();const config=getConfig();if(!config){render(null);message('Firebase接続設定が必要です','setup');if(login)login.disabled=true;return}
  if(!window.firebase){message('Firebase SDKの読込に失敗しました','error');return}
  try{if(!firebase.apps.length)firebase.initializeApp(config);auth=firebase.auth();db=firebase.firestore();await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);login?.addEventListener('click',signIn);logout?.addEventListener('click',signOut);syncNow?.addEventListener('click',()=>synchronize({manual:true}));auth.onAuthStateChanged(async current=>{render(current);if(current)await synchronize();else message('端末保存のみ','idle')});auth.getRedirectResult().catch(error=>message(friendlyError(error),'error'));window.addEventListener('online',()=>user&&synchronize());window.addEventListener('storage',event=>SYNC_KEYS.has(event.key)&&user&&synchronize());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user)synchronize()})}catch(error){console.error(error);message(`Firebase初期化エラー：${error.message||error}`,'error')}
}
init();
})();
