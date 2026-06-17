(() => {
'use strict';
const STATE_KEY='ulq-state-v1';
const SESSION_KEY='ulq-active-session-v2';
let scheduled=false;

function readJson(key,fallback){
  try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
  catch{return fallback;}
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
    i:index,
    qid,
    item:savedItem,
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
  location.reload();
}

function enhanceSkip(){
  const head=document.querySelector('.study-head');
  if(!head)return;

  const oldSkip=document.getElementById('skipQuestion');
  if(oldSkip)oldSkip.remove();

  let skip=document.getElementById('skipQuestionTop');
  if(!skip){
    skip=document.createElement('button');
    skip.id='skipQuestionTop';
    skip.type='button';
    skip.className='study-skip-btn';
    skip.textContent='スキップ';
    skip.onclick=persistentSkip;
    head.prepend(skip);
  }
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    enhanceSkip();
  });
}

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
schedule();
})();
