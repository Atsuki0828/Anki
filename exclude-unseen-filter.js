(() => {
'use strict';
const STATE_KEY='ulq-state-v1';
const SETTINGS_KEY='ulq-settings-v1';
const SESSION_KEY='ulq-active-session-v2';
const CUSTOM_KEY='ulq-custom-decks-v1';
const ACTIVE_KEY='ulq-active-deck-v1';

function readJson(key,fallback){
  try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
  catch{return fallback;}
}
function activeDeck(){
  const id=localStorage.getItem(ACTIVE_KEY)||'anatomy';
  if(id==='anatomy')return {id,kind:'builtin',questions:window.QUESTION_BANK||[]};
  const custom=readJson(CUSTOM_KEY,{decks:[]});
  const deck=(custom.decks||[]).find(d=>d.id===id);
  return deck?{...deck,kind:'custom'}:{id:'anatomy',kind:'builtin',questions:window.QUESTION_BANK||[]};
}
function getMeta(deck,q){
  if(deck.kind==='custom')return {majorId:'custom',sub:q.category||'自作'};
  return window.AnatomyTaxonomy?.meta?.(q)||{majorId:'all',sub:'all'};
}
function selectedQuestions(){
  const deck=activeDeck();
  const major=document.getElementById('major')?.value||'all';
  const sub=document.getElementById('sub')?.value||'all';
  return (deck.questions||[]).filter(q=>{
    const m=getMeta(deck,q);
    return (major==='all'||m.majorId===major)&&(sub==='all'||m.sub===sub);
  });
}
function seenQuestions(){
  const state=readJson(STATE_KEY,{items:{}});
  return selectedQuestions().filter(q=>(state.items?.[q.id]?.seen||0)>0);
}
function sortAndLimit(list){
  const cfg=readJson(SETTINGS_KEY,{order:'smart'});
  const state=readJson(STATE_KEY,{items:{}});
  const now=Date.now();
  const score=q=>{
    const s=state.items?.[q.id]||{level:0,due:0,ng:0};
    return (s.due<=now?500:0)+(s.ng||0)*20-(s.level||0)*35+Math.random()*10;
  };
  if(cfg.order==='number')list.sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
  else if(cfg.order==='random')list.sort(()=>Math.random()-.5);
  else list.sort((a,b)=>score(b)-score(a));
  const count=document.getElementById('count')?.value||'10';
  return list.slice(0,count==='all'?list.length:Number(count)||10);
}
function updateSummary(){
  const pool=document.getElementById('pool');
  const summary=document.getElementById('selectionSummary');
  if(!pool||!summary||pool.value!=='seen')return;
  summary.textContent=`選択範囲：${seenQuestions().length}問（未学習を除外）`;
}
function startSeenOnly(event){
  const pool=document.getElementById('pool');
  if(!pool||pool.value!=='seen')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const deck=activeDeck();
  const queue=sortAndLimit(seenQuestions());
  if(!queue.length){alert('未学習を除く条件に合う問題がありません');return;}
  const session={
    deckId:deck.id||localStorage.getItem(ACTIVE_KEY)||'anatomy',
    queueIds:queue.map(q=>q.id),
    i:0,
    mode:document.getElementById('mode')?.value||'recall',
    score:0,
    options:{
      major:document.getElementById('major')?.value||'all',
      sub:document.getElementById('sub')?.value||'all',
      pool:'seen',
      count:document.getElementById('count')?.value||'10',
      mode:document.getElementById('mode')?.value||'recall'
    },
    history:[],
    stage:'question',
    draft:'',
    choiceResult:null,
    updatedAt:Date.now()
  };
  localStorage.setItem(SESSION_KEY,JSON.stringify(session));
  location.reload();
}
function enhance(){
  const pool=document.getElementById('pool');
  if(!pool||pool.dataset.excludeUnseenReady)return;
  pool.dataset.excludeUnseenReady='1';
  if(![...pool.options].some(o=>o.value==='seen')){
    const option=document.createElement('option');
    option.value='seen';
    option.textContent='未学習を除く';
    const all=[...pool.options].find(o=>o.value==='all');
    pool.insertBefore(option,all||null);
  }
  pool.addEventListener('change',updateSummary);
  document.getElementById('major')?.addEventListener('change',()=>setTimeout(updateSummary));
  document.getElementById('sub')?.addEventListener('change',()=>setTimeout(updateSummary));
  document.getElementById('count')?.addEventListener('change',updateSummary);
  document.getElementById('begin')?.addEventListener('click',startSeenOnly,true);
  updateSummary();
}
new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
enhance();
})();
