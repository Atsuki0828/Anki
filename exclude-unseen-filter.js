(() => {
'use strict';

const STATE_KEY='ulq-state-v1';
const SETTINGS_KEY='ulq-settings-v1';
const SESSION_KEY='ulq-active-session-v2';
const CUSTOM_KEY='ulq-custom-decks-v1';
const ACTIVE_KEY='ulq-active-deck-v1';
const INCLUDE_UNSEEN_KEY='ulq-include-unseen-v1';
const SEQUENTIAL_KEY='anatomy-sequential-order-v1';

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
function state(){return readJson(STATE_KEY,{items:{}})}
function selectedQuestions(){
  const deck=activeDeck();
  const major=document.getElementById('major')?.value||'all';
  const sub=document.getElementById('sub')?.value||'all';
  return (deck.questions||[]).filter(q=>{
    const m=getMeta(deck,q);
    return (major==='all'||m.majorId===major)&&(sub==='all'||m.sub===sub);
  });
}
function includeUnseen(){return document.getElementById('includeUnseenCheck')?.checked!==false}
function poolValue(){
  const value=document.getElementById('pool')?.value||'smart';
  return value==='seen'||value==='unseen'?'smart':value;
}
function filteredByPool(){
  const s=state(),now=Date.now(),pool=poolValue();
  let list=selectedQuestions();
  if(pool==='due')list=list.filter(q=>(s.items?.[q.id]?.seen||0)>0&&(s.items?.[q.id]?.due||0)<=now);
  if(pool==='weak')list=list.filter(q=>(s.items?.[q.id]?.ng||0)>0&&(s.items?.[q.id]?.level||0)<4);
  if(!includeUnseen())list=list.filter(q=>(s.items?.[q.id]?.seen||0)>0);
  return list;
}
function countLimit(){
  const value=document.getElementById('count')?.value||'10';
  if(value==='all')return Infinity;
  const number=Number(value);
  return Number.isFinite(number)&&number>0?number:10;
}
function shouldUseSequential(){
  const checkbox=document.getElementById('sequentialOrder');
  return checkbox?checkbox.checked:localStorage.getItem(SEQUENTIAL_KEY)==='1';
}
function sortAndLimit(list){
  const cfg=readJson(SETTINGS_KEY,{order:'smart'});
  const s=state();
  const current=Date.now();
  const sequential=shouldUseSequential();
  const score=q=>{
    const item=s.items?.[q.id]||{level:0,due:0,ng:0,seen:0};
    return (!item.seen&&includeUnseen()?1000:0)+(item.due<=current?500:0)+(item.ng||0)*20-(item.level||0)*35+Math.random()*10;
  };
  if(sequential||cfg.order==='number')list.sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
  else if(cfg.order==='random')list.sort(()=>Math.random()-.5);
  else list.sort((a,b)=>score(b)-score(a));
  const limit=countLimit();
  return Number.isFinite(limit)?list.slice(0,limit):list;
}
function updateSummary(){
  const summary=document.getElementById('selectionSummary');
  if(!summary)return;
  const count=filteredByPool().length;
  const text=`選択範囲：${count}問${includeUnseen()?'':'（未学習を除外）'}`;
  if(summary.textContent!==text)summary.textContent=text;
}
function startWithCurrentConditions(event){
  const begin=document.getElementById('begin');
  if(!begin||event.currentTarget!==begin)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const deck=activeDeck();
  const queue=sortAndLimit(filteredByPool());
  if(!queue.length){alert(includeUnseen()?'条件に合う問題がありません':'条件に合う学習済み問題がありません');return;}
  const countValue=document.getElementById('count')?.value||'10';
  const sequential=shouldUseSequential();
  localStorage.setItem(SEQUENTIAL_KEY,sequential?'1':'0');
  sessionStorage.setItem('anatomy-sequential-session-v1',sequential?'1':'0');
  const session={
    deckId:deck.id||localStorage.getItem(ACTIVE_KEY)||'anatomy',
    queueIds:queue.map(q=>q.id),
    i:0,
    mode:document.getElementById('mode')?.value||'recall',
    score:0,
    options:{
      major:document.getElementById('major')?.value||'all',
      sub:document.getElementById('sub')?.value||'all',
      pool:poolValue(),
      includeUnseen:includeUnseen(),
      count:countValue,
      mode:document.getElementById('mode')?.value||'recall',
      sequential
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
function removeUnseenOptions(pool){
  [...pool.options].forEach(option=>{
    if(option.value==='unseen'||option.value==='seen')option.remove();
  });
  if(pool.value==='unseen'||pool.value==='seen')pool.value='smart';
}
function addCheckbox(pool){
  if(document.getElementById('includeUnseenField'))return;
  const field=document.createElement('label');
  field.className='setting-row';
  field.id='includeUnseenField';
  field.innerHTML='<span>未学習を含める</span><input id="includeUnseenCheck" type="checkbox">';
  const poolField=pool.closest('.field')||pool.parentElement;
  poolField?.after(field);
  const checkbox=document.getElementById('includeUnseenCheck');
  checkbox.checked=localStorage.getItem(INCLUDE_UNSEEN_KEY)!=='0';
  checkbox.addEventListener('change',()=>{
    localStorage.setItem(INCLUDE_UNSEEN_KEY,checkbox.checked?'1':'0');
    updateSummary();
  });
}
function enhance(){
  const pool=document.getElementById('pool');
  if(!pool)return;
  removeUnseenOptions(pool);
  addCheckbox(pool);
  const begin=document.getElementById('begin');
  if(!begin)return;
  if(!pool.dataset.unseenCheckboxReady){
    pool.dataset.unseenCheckboxReady='1';
    pool.addEventListener('change',updateSummary);
    document.getElementById('major')?.addEventListener('change',()=>setTimeout(updateSummary));
    document.getElementById('sub')?.addEventListener('change',()=>setTimeout(updateSummary));
    document.getElementById('count')?.addEventListener('change',updateSummary);
  }
  if(!begin.dataset.countFixReady){
    begin.addEventListener('click',startWithCurrentConditions,true);
    begin.dataset.countFixReady='1';
  }
  updateSummary();
}

new MutationObserver(enhance).observe(document.getElementById('main')||document.body,{childList:true,subtree:true});
enhance();
})();
