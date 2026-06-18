(() => {
'use strict';
const KEYS=['ulq-state-v1','ulq-settings-v1','ulq-active-session-v2'];
const LAST_SYNC='ulq-cloud-last-sync-v1';
let auth,db,user,timer,lastFingerprint='';
const el=id=>document.getElementById(id);
const status=el('cloudSyncStatus');
const login=el('cloudLoginBtn');
const logout=el('cloudLogoutBtn');
const syncNow=el('cloudSyncNowBtn');
const userBox=el('cloudSyncUser');

function message(text,state='idle'){if(status){status.textContent=text;status.dataset.state=state}}
function read(key,fallback=null){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function payload(){return{schemaVersion:1,state:read(KEYS[0],{items:{},answered:0,correct:0,streak:0,last:''}),settings:read(KEYS[1],{}),session:read(KEYS[2],null),updatedAtClient:Date.now()}}
function fingerprint(){return KEYS.map(key=>localStorage.getItem(key)||'').join('|')}
function configured(c){return Boolean(c?.apiKey&&c?.authDomain&&c?.projectId&&c?.appId)}
function ref(){return db.collection('users').doc(user.uid).collection('quiz').doc('progress')}
function weight(item){return Number(item?.seen||0)+Number(item?.ok||0)+Number(item?.ng||0)}
function mergeItem(a,b){if(!a)return b;if(!b)return a;const aw=weight(a),bw=weight(b);if(aw!==bw)return aw>bw?a:b;return Number(a.due||0)>=Number(b.due||0)?a:b}
function mergeState(a={},b={}){const items={};const ai=a.items||{},bi=b.items||{};new Set([...Object.keys(ai),...Object.keys(bi)]).forEach(id=>items[id]=mergeItem(ai[id],bi[id]));const last=(a.last||'')>(b.last||'')?a.last:b.last;return{items,answered:Math.max(Number(a.answered||0),Number(b.answered||0)),correct:Math.max(Number(a.correct||0),Number(b.correct||0)),streak:last===a.last?Number(a.streak||0):Number(b.streak||0),last}}
function merge(local,remote){if(!remote)return local;const session=Number(local.session?.updatedAt||0)>=Number(remote.session?.updatedAt||0)?local.session:remote.session;return{schemaVersion:1,state:mergeState(local.state,remote.state),settings:local.settings||remote.settings||{},session:session||null,updatedAtClient:Date.now()}}
function apply(data){let changed=false;for(const[key,value]of [[KEYS[0],data.state],[KEYS[1],data.settings],[KEYS[2],data.session]]){const next=value==null?null:JSON.stringify(value);if(localStorage.getItem(key)!==next){changed=true;if(next===null)localStorage.removeItem(key);else localStorage.setItem(key,next)}}lastFingerprint=fingerprint();return changed}
async function upload(data=payload()){if(!user)return;const now=Date.now();data.updatedAtClient=now;await ref().set({...data,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});localStorage.setItem(LAST_SYNC,String(now));lastFingerprint=fingerprint();message('同期済み','ok')}
async function synchronize(reload=true){if(!user)return;message('同期中…','working');try{const snap=await ref().get();const merged=merge(payload(),snap.exists?snap.data():null);const changed=apply(merged);await upload(merged);if(changed&&reload)location.reload()}catch(error){console.error(error);message(error?.code==='permission-denied'?'Firestoreルールを確認':'同期に失敗','error')}}
function render(u){user=u||null;if(login)login.hidden=Boolean(u);if(logout)logout.hidden=!u;if(syncNow)syncNow.hidden=!u;if(userBox)userBox.textContent=u?`${u.displayName||'Googleユーザー'} (${u.email||''})`:'未ログイン・端末保存のみ'}
async function signIn(){const provider=new firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});message('Googleログインを開いています…','working');try{await auth.signInWithPopup(provider)}catch(error){console.error(error);message('ログインに失敗','error')}}
async function signOut(){await auth.signOut();render(null);message('端末保存のみ','idle')}
function watch(){clearInterval(timer);lastFingerprint=fingerprint();timer=setInterval(()=>{const next=fingerprint();if(next!==lastFingerprint){lastFingerprint=next;if(user){message('変更を同期中…','working');clearTimeout(watch.pending);watch.pending=setTimeout(()=>upload().catch(()=>message('自動同期に失敗','error')),1200)}}},1500)}
function init(){const config=window.ANATOMY_FIREBASE_CONFIG;if(!configured(config)){render(null);message('Firebase設定未完了','setup');if(login)login.disabled=true;return}if(!window.firebase){message('Firebase SDK読込失敗','error');return}if(!firebase.apps.length)firebase.initializeApp(config);auth=firebase.auth();db=firebase.firestore();login?.addEventListener('click',signIn);logout?.addEventListener('click',signOut);syncNow?.addEventListener('click',()=>synchronize(true));auth.onAuthStateChanged(async u=>{render(u);if(u)await synchronize(true);else message('端末保存のみ','idle')});watch()}
init();
})();
