(() => {
'use strict';
const STATE_KEY='ulq-state-v1';
const SESSION_KEY='ulq-active-session-v2';
let scheduled=false;

function readJson(key,fallback){
  try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
  catch{return fallback;}
}

function reloadWithoutStaleSave(){
  const stop=event=>event.stopImmediatePropagation();
  window.addEventListener('pagehide',stop,{capture:true,once:true});
  document.addEventListener('visibilitychange',stop,{capture:true,once:true});
  location.reload();
}

function persistentSkip(){
  const session=readJson(SESSION_KEY,null);
  if(!session||!Array.isArray(session.queueIds)||!session.queueIds.length)return;

  const state=readJson(STATE_KEY,{items:{},answered:0,correct:0,streak:0,last:''});
  const index=Math.max(0,Math.min(Number(session.i)||0,session.queueIds.length-1));
  const qid=session.queueIds[index];
  const savedItem=state.items?.[qid]?{...state.items[qid]}:null;

  session.history=Array.isArray(session.history)?session.history:[];
  session.history.push({
    i:index,qid,item:savedItem,
    answered:Number(state.answered)||0,
    correct:Number(state.correct)||0,
    streak:Number(state.streak)||0,
    last:state.last||'',
    score:Number(session.score)||0,
    stage:session.stage||'question',
    draft:session.draft||'',
    choiceResult:session.choiceResult?JSON.parse(JSON.stringify(session.choiceResult)):null
  });

  if(index+1<session.queueIds.length){
    session.i=index+1;
    session.stage='question';
    session.draft='';
    session.choiceResult=null;
  }else{
    session.i=index;
    session.stage='finished';
  }

  session.updatedAt=Date.now();
  localStorage.setItem(SESSION_KEY,JSON.stringify(session));
  reloadWithoutStaleSave();
}

function persistentUndo(){
  const session=readJson(SESSION_KEY,null);
  if(!session||!Array.isArray(session.history)||!session.history.length)return;
  const previous=session.history.pop();
  const state=readJson(STATE_KEY,{items:{},answered:0,correct:0,streak:0,last:''});
  state.items=state.items||{};

  if(previous.item===null||previous.item===undefined)delete state.items[previous.qid];
  else state.items[previous.qid]={...previous.item};
  state.answered=Number(previous.answered)||0;
  state.correct=Number(previous.correct)||0;
  state.streak=Number(previous.streak)||0;
  state.last=previous.last||'';

  session.score=Number(previous.score)||0;
  session.i=Math.max(0,Number(previous.i)||0);
  session.stage=previous.stage||'question';
  session.draft=previous.draft||'';
  session.choiceResult=previous.choiceResult||null;
  session.updatedAt=Date.now();

  localStorage.setItem(STATE_KEY,JSON.stringify(state));
  localStorage.setItem(SESSION_KEY,JSON.stringify(session));
  reloadWithoutStaleSave();
}

function enhanceNavigation(){
  const head=document.querySelector('.study-head');
  if(!head)return;

  document.getElementById('skipQuestion')?.remove();

  let skip=document.getElementById('skipQuestionTop');
  if(!skip){
    skip=document.createElement('button');
    skip.id='skipQuestionTop';
    skip.type='button';
    skip.className='study-skip-btn';
    skip.textContent='スキップ';
    skip.addEventListener('click',persistentSkip);
    head.prepend(skip);
  }

  const session=readJson(SESSION_KEY,null);
  const hasHistory=Boolean(session&&Array.isArray(session.history)&&session.history.length);
  if(hasHistory&&!document.getElementById('undoQuestion')){
    let undo=document.getElementById('undoQuestionFallback');
    if(!undo){
      undo=document.createElement('button');
      undo.id='undoQuestionFallback';
      undo.type='button';
      undo.className='study-undo-btn';
      undo.textContent='↶ 1問戻る';
      undo.addEventListener('click',persistentUndo);
      head.appendChild(undo);
    }
  }
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;enhanceNavigation();});
}

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
schedule();
})();
