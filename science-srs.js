(() => {
'use strict';

const STATE_KEY='ulq-state-v1';
const SESSION_KEY='ulq-active-session-v2';
const REMINDER_ENABLED_KEY='srs-reminder-enabled-v1';
const REMINDER_TIME_KEY='srs-reminder-time-v1';
const REMINDER_LAST_KEY='srs-reminder-last-v1';
const ALGORITHM_VERSION='science-srs-2026-06-24';
let reminderTimer=null;
let pendingReview=null;

const dayMs=86400000;
const minuteMs=60000;
const intervals={
  good:[0,1,3,7,14,30,60,120,240,365],
  easy:[0,2,3,7,14,30,60,120,240,365]
};

function readJson(key,fallback){
  try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
  catch{return fallback;}
}
function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value));}
function now(){return Date.now();}
function today(){return new Date().toISOString().slice(0,10);}
function currentQuestionId(){
  const session=readJson(SESSION_KEY,null);
  if(!session||!Array.isArray(session.queueIds))return null;
  const index=Math.max(0,Math.min(Number(session.i)||0,session.queueIds.length-1));
  return session.queueIds[index]||null;
}
function intervalFor(grade,stateItem){
  const level=Math.max(0,Number(stateItem?.level)||0);
  if(grade==='again')return 10*minuteMs;
  if(grade==='hard')return dayMs;
  if(grade==='good')return (intervals.good[Math.min(level,intervals.good.length-1)]||365)*dayMs;
  if(grade==='easy')return (intervals.easy[Math.min(level,intervals.easy.length-1)]||365)*dayMs;
  return null;
}
function applyScientificDue(questionId,grade){
  if(!questionId||!grade)return;
  const state=readJson(STATE_KEY,{items:{}});
  const item=state.items?.[questionId];
  if(!item)return;
  const delta=intervalFor(grade,item);
  if(!delta)return;
  item.due=now()+delta;
  item.srsAlgorithm=ALGORITHM_VERSION;
  item.lastGrade=grade;
  item.lastReviewedAt=now();
  state.items[questionId]=item;
  writeJson(STATE_KEY,state);
  updateReminderSummary();
}
function captureGrade(event){
  const button=event.target.closest?.('[data-g]');
  if(!button)return;
  pendingReview={questionId:currentQuestionId(),grade:button.dataset.g};
  setTimeout(()=>applyScientificDue(pendingReview?.questionId,pendingReview?.grade),80);
}
function captureChoice(event){
  const button=event.target.closest?.('.choice-btn');
  if(!button)return;
  const questionId=currentQuestionId();
  setTimeout(()=>{
    const grade=button.classList.contains('correct')?'good':'again';
    applyScientificDue(questionId,grade);
  },120);
}
function dueCount(){
  const state=readJson(STATE_KEY,{items:{}});
  const t=now();
  return Object.values(state.items||{}).filter(item=>(item.seen||0)>0&&(item.due||0)<=t).length;
}
function nextReminderDelay(time){
  const [h,m]=String(time||'21:00').split(':').map(Number);
  const d=new Date();
  d.setHours(Number.isFinite(h)?h:21,Number.isFinite(m)?m:0,0,0);
  if(d.getTime()<=now())d.setDate(d.getDate()+1);
  return d.getTime()-now();
}
async function showReviewNotification(manual=false){
  const count=dueCount();
  if(!manual&&count===0)return;
  if(!('Notification' in window)){setNotifyStatus('このブラウザでは通知に対応していません。');return;}
  if(Notification.permission!=='granted'){setNotifyStatus('通知が許可されていません。');return;}
  const title=count?`復習 ${count}問があります`:'復習通知テスト';
  const body=count?'今日の復習期限が来ています。数分だけ思い出し練習をしてください。':'通知は有効です。復習期限が来たら知らせます。';
  try{
    const registration=await navigator.serviceWorker?.ready;
    if(registration?.showNotification)await registration.showNotification(title,{body,tag:'srs-due-review',renotify:true});
    else new Notification(title,{body});
    localStorage.setItem(REMINDER_LAST_KEY,today());
  }catch{
    try{new Notification(title,{body});localStorage.setItem(REMINDER_LAST_KEY,today());}catch{}
  }
}
function setNotifyStatus(message){
  const el=document.getElementById('reviewNotifyStatus');
  if(el)el.textContent=message;
}
async function requestNotifications(){
  if(!('Notification' in window)){setNotifyStatus('このブラウザでは通知に対応していません。');return;}
  const result=await Notification.requestPermission();
  if(result==='granted'){
    localStorage.setItem(REMINDER_ENABLED_KEY,'1');
    setNotifyStatus('通知を許可しました。テスト通知を送ります。');
    scheduleReminder();
    showReviewNotification(true);
  }else{
    localStorage.setItem(REMINDER_ENABLED_KEY,'0');
    setNotifyStatus('通知が許可されませんでした。iPhoneの設定から許可してください。');
  }
  syncReminderUi();
}
function scheduleReminder(){
  clearTimeout(reminderTimer);
  if(localStorage.getItem(REMINDER_ENABLED_KEY)!=='1')return;
  const time=localStorage.getItem(REMINDER_TIME_KEY)||'21:00';
  reminderTimer=setTimeout(async()=>{
    if(localStorage.getItem(REMINDER_LAST_KEY)!==today())await showReviewNotification(false);
    scheduleReminder();
  },Math.min(nextReminderDelay(time),2147483647));
}
function updateReminderSummary(){
  const el=document.getElementById('reviewDueCount');
  if(el)el.textContent=`現在の復習期限：${dueCount()}問`;
}
function syncReminderUi(){
  const enabled=document.getElementById('reviewNotifyEnabled');
  const time=document.getElementById('reviewNotifyTime');
  if(enabled)enabled.checked=localStorage.getItem(REMINDER_ENABLED_KEY)==='1';
  if(time)time.value=localStorage.getItem(REMINDER_TIME_KEY)||'21:00';
  const permission=('Notification' in window)?Notification.permission:'unsupported';
  setNotifyStatus(permission==='granted'?'通知許可済み':permission==='denied'?'通知がブロックされています':'通知は未許可です');
  updateReminderSummary();
}
function addReminderUi(){
  const form=document.querySelector('#settingsDialog form');
  if(!form||document.getElementById('reviewReminderPanel'))return;
  const panel=document.createElement('section');
  panel.id='reviewReminderPanel';
  panel.className='cloud-sync-panel';
  panel.innerHTML=`<div class="cloud-sync-head"><div><h3>復習通知</h3><p id="reviewDueCount">現在の復習期限：0問</p></div><span data-state="idle">SRS</span></div><p>科学的間隔反復に基づいて、復習期限が来た問題を知らせます。PWAを完全に終了している間の定時通知は端末・ブラウザの制限を受けます。</p><label class="setting-row"><span>通知を使う</span><input id="reviewNotifyEnabled" type="checkbox"></label><label class="setting-row"><span>通知時刻</span><input id="reviewNotifyTime" type="time" value="21:00"></label><div class="cloud-sync-actions"><button type="button" class="secondary-btn" id="reviewNotifyPermitBtn">通知を許可 / テスト</button></div><div id="reviewNotifyStatus" class="figure-import-status">通知状態を確認中…</div>`;
  const reset=document.getElementById('resetBtn');
  form.insertBefore(panel,reset||form.lastElementChild);
  document.getElementById('reviewNotifyPermitBtn')?.addEventListener('click',requestNotifications);
  document.getElementById('reviewNotifyEnabled')?.addEventListener('change',event=>{
    localStorage.setItem(REMINDER_ENABLED_KEY,event.target.checked?'1':'0');
    scheduleReminder();
    syncReminderUi();
  });
  document.getElementById('reviewNotifyTime')?.addEventListener('change',event=>{
    localStorage.setItem(REMINDER_TIME_KEY,event.target.value||'21:00');
    scheduleReminder();
  });
  syncReminderUi();
}
function init(){
  document.addEventListener('click',captureGrade,true);
  document.addEventListener('click',captureChoice,true);
  addReminderUi();
  scheduleReminder();
  setInterval(updateReminderSummary,60000);
}
new MutationObserver(addReminderUi).observe(document.body,{childList:true,subtree:true});
init();
})();
