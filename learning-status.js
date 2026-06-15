(() => {
'use strict';
const KEY='ulq-state-v1',RETURN_KEY='anatomy-list-return-v1';
const Q=window.QUESTION_BANK||[];
const taxonomy=window.AnatomyTaxonomy;
const groups=taxonomy?.build(Q)||[];
let scheduled=false;
function state(){try{return JSON.parse(localStorage.getItem(KEY)||'{"items":{},"answered":0,"correct":0,"streak":0,"last":""}')}catch{return{items:{},answered:0,correct:0,streak:0,last:''}}}
function saveState(value){localStorage.setItem(KEY,JSON.stringify(value))}
function metrics(list){
  const items=state().items||{},now=Date.now();
  let mastered=0,learning=0,unseen=0,due=0,weak=0,ok=0,ng=0;
  list.forEach(q=>{
    const s=items[q.id];
    if(!s||!s.seen)unseen++;
    else if((s.level||0)>=4)mastered++;
    else learning++;
    if(s?.seen&&Number(s.due||0)<=now)due++;
    if((s?.ng||0)>0&&(s?.level||0)<4)weak++;
    ok+=Number(s?.ok||0);ng+=Number(s?.ng||0);
  });
  const total=list.length||1,attempts=ok+ng;
  return{total:list.length,mastered,learning,unseen,due,weak,accuracy:attempts?Math.round(ok/attempts*100):null,masteredPct:mastered/total*100,learningPct:learning/total*100,unseenPct:unseen/total*100};
}
function bar(m){return`<div class="learning-bar" aria-label="定着${m.mastered}問、学習中${m.learning}問、未学習${m.unseen}問"><i class="is-mastered" style="width:${m.masteredPct}%"></i><i class="is-learning" style="width:${m.learningPct}%"></i><i class="is-unseen" style="width:${m.unseenPct}%"></i></div>`}
function counts(m,compact=false){return`<div class="learning-counts ${compact?'compact':''}"><span class="mastered"><b>${m.mastered}</b>定着</span><span class="learning"><b>${m.learning}</b>学習中</span><span class="unseen"><b>${m.unseen}</b>未学習</span></div>`}
function signals(m){return`<div class="learning-signals"><span class="due ${m.due?'active':''}">復習期限 <b>${m.due}</b></span><span class="weak ${m.weak?'active':''}">弱点 <b>${m.weak}</b></span><span>正答率 <b>${m.accuracy===null?'—':m.accuracy+'%'}</b></span></div>`}
function majorById(id){return groups.find(g=>g.id===id)}
function majorByName(name){return groups.find(g=>g.name===name)}
function enhanceMajorCards(){
  document.querySelectorAll('.major-card[data-major]').forEach(card=>{
    const group=majorById(card.dataset.major);if(!group)return;
    const m=metrics(group.questions),signature=JSON.stringify(m);
    if(card.dataset.learningSignature===signature)return;
    card.dataset.learningSignature=signature;
    card.querySelector('small')?.remove();card.querySelector('.mini-progress')?.remove();card.querySelector('.major-learning-status')?.remove();
    const box=document.createElement('div');box.className='major-learning-status';box.innerHTML=bar(m)+counts(m)+signals(m);
    card.querySelector('.major-card-foot')?.before(box);
  });
}
function enhanceTopicOverview(){
  const hero=document.querySelector('.topic-hero');if(!hero)return;
  const name=hero.querySelector('h1')?.textContent.trim(),group=majorByName(name);if(!group)return;
  const m=metrics(group.questions),signature=JSON.stringify(m);
  let panel=document.querySelector('.topic-learning-overview');
  if(panel?.dataset.learningSignature===signature)return;
  if(!panel){panel=document.createElement('section');panel.className='topic-learning-overview';hero.after(panel)}
  panel.dataset.learningSignature=signature;
  panel.innerHTML=`<div class="learning-overview-head"><div><strong>現在の学習状況</strong><small>${m.total}問中 ${m.total-m.unseen}問を学習済み</small></div><b>${m.accuracy===null?'—':m.accuracy+'%'}</b></div>${bar(m)}<div class="learning-overview-grid"><div><b>${m.mastered}</b><span>定着</span></div><div><b>${m.learning}</b><span>学習中</span></div><div><b>${m.unseen}</b><span>未学習</span></div><div class="${m.due?'alert':''}"><b>${m.due}</b><span>復習期限</span></div><div class="${m.weak?'alert':''}"><b>${m.weak}</b><span>弱点</span></div></div>`;
}
function enhanceSubcategoryCards(){
  const hero=document.querySelector('.topic-hero'),group=majorByName(hero?.querySelector('h1')?.textContent.trim());if(!group)return;
  document.querySelectorAll('.subcategory-card[data-sub]').forEach(card=>{
    const sub=group.subs.find(s=>s.name===card.dataset.sub);if(!sub)return;
    const m=metrics(sub.questions),signature=JSON.stringify(m);
    if(card.dataset.learningSignature===signature)return;
    card.dataset.learningSignature=signature;card.classList.add('has-learning-status');
    const body=card.firstElementChild;if(!body)return;
    body.querySelector('small')?.remove();body.querySelector('.subcategory-learning-status')?.remove();
    const box=document.createElement('div');box.className='subcategory-learning-status';box.innerHTML=bar(m)+counts(m,true)+signals(m);
    body.appendChild(box);
    const old=card.querySelector(':scope > .sub-progress');if(old)old.hidden=true;
  });
}
function setupRange(){
  const major=document.getElementById('major'),sub=document.getElementById('sub'),summary=document.getElementById('selectionSummary');if(!major||!sub||!summary)return;
  const list=Q.filter(q=>{const m=taxonomy.meta(q);return(major.value==='all'||m.majorId===major.value)&&(sub.value==='all'||m.sub===sub.value)}),m=metrics(list),signature=`${major.value}|${sub.value}|${JSON.stringify(m)}`;
  if(summary.dataset.learningSignature===signature)return;
  summary.dataset.learningSignature=signature;summary.classList.add('selection-learning-summary');
  summary.innerHTML=`<div><strong>選択範囲：${m.total}問</strong><span>定着 ${m.mastered} ・ 学習中 ${m.learning} ・ 未学習 ${m.unseen}</span></div><div><b>復習 ${m.due}</b><span>正答率 ${m.accuracy===null?'—':m.accuracy+'%'}</span></div>`;
}
function itemStatus(s){if(!s||!s.seen)return'unseen';return Number(s.level||0)>=4?'mastered':'learning'}
function statusLabel(status){return status==='mastered'?'定着':status==='learning'?'学習中':'未学習'}
function dueLabel(s){
  if(!s?.seen)return'未設定';
  const due=Number(s.due||0),diff=due-Date.now();
  if(diff<=0)return'復習期限';
  const days=Math.ceil(diff/86400000);
  if(days<=1)return'明日まで';
  return`${days}日後`;
}
function rowStats(id){
  const s=state().items?.[id],ok=Number(s?.ok||0),ng=Number(s?.ng||0),attempts=ok+ng;
  return{status:itemStatus(s),ok,ng,accuracy:attempts?Math.round(ok/attempts*100):null,due:dueLabel(s),isDue:Boolean(s?.seen&&Number(s.due||0)<=Date.now())};
}
function rememberList(){
  const active=document.querySelector('.filter-row .chip.active');
  sessionStorage.setItem(RETURN_KEY,JSON.stringify({major:document.getElementById('listMajor')?.value||'all',sub:document.getElementById('listSub')?.value||'all',status:active?.dataset.status||'all',search:document.getElementById('search')?.value||'',scroll:scrollY}));
}
function reloadList(){rememberList();location.reload()}
function changeStatus(id,value){
  const data=state();data.items=data.items||{};
  if(value==='unseen'){
    if(!confirm('この問題を未学習に戻します。問題単位の正解・不正解履歴も削除されます。'))return false;
    delete data.items[id];
  }else{
    const current=data.items[id]||{level:0,due:0,seen:0,ok:0,ng:0};
    current.seen=Math.max(1,Number(current.seen||0));
    if(value==='learning'){
      current.level=Math.max(1,Math.min(3,Number(current.level||1)));
      current.due=Date.now();
    }else{
      current.level=4;
      current.due=Date.now()+16*86400000;
    }
    data.items[id]=current;
  }
  saveState(data);reloadList();return true;
}
function makeDue(id){
  const data=state();data.items=data.items||{};
  const current=data.items[id]||{level:1,due:0,seen:1,ok:0,ng:0};
  current.seen=Math.max(1,Number(current.seen||0));
  current.level=Math.max(1,Math.min(3,Number(current.level||1)));
  current.due=Date.now();data.items[id]=current;saveState(data);reloadList();
}
function enhanceQuestionRows(){
  document.querySelectorAll('button.question-row[data-id]').forEach(row=>{
    const id=Number(row.dataset.id),openHandler=row.onclick,s=rowStats(id);
    const wrapper=document.createElement('article');wrapper.className='question-row question-row-managed';wrapper.dataset.id=String(id);
    const open=document.createElement('button');open.type='button';open.className='question-row-open';open.innerHTML=row.innerHTML;open.onclick=openHandler;
    const panel=document.createElement('div');panel.className='question-learning-panel';
    panel.innerHTML=`<div class="question-status-line"><span class="question-status ${s.status}">${statusLabel(s.status)}</span><span class="${s.isDue?'due-now':''}">${s.due}</span><span>正答率 <b>${s.accuracy===null?'—':s.accuracy+'%'}</b></span><span>正解 ${s.ok} / 不正解 ${s.ng}</span></div><div class="question-status-actions"><label><span>状態</span><select class="question-status-select"><option value="unseen" ${s.status==='unseen'?'selected':''}>未学習</option><option value="learning" ${s.status==='learning'?'selected':''}>学習中</option><option value="mastered" ${s.status==='mastered'?'selected':''}>定着</option></select></label><button type="button" class="question-due-btn">今すぐ復習</button></div>`;
    panel.querySelector('.question-status-select').onchange=event=>{if(!changeStatus(id,event.target.value))event.target.value=s.status};
    panel.querySelector('.question-due-btn').onclick=()=>makeDue(id);
    wrapper.append(open,panel);row.replaceWith(wrapper);
  });
}
function restoreList(){
  const raw=sessionStorage.getItem(RETURN_KEY);if(!raw)return;sessionStorage.removeItem(RETURN_KEY);
  let saved;try{saved=JSON.parse(raw)}catch{return}
  setTimeout(()=>{
    document.querySelector('.nav-item[data-view="list"]')?.click();
    setTimeout(()=>{
      const major=document.getElementById('listMajor'),sub=document.getElementById('listSub'),search=document.getElementById('search');
      if(major){major.value=saved.major||'all';major.dispatchEvent(new Event('change'))}
      setTimeout(()=>{
        if(sub){sub.value=[...sub.options].some(o=>o.value===saved.sub)?saved.sub:'all';sub.dispatchEvent(new Event('change'))}
        if(search){search.value=saved.search||'';search.dispatchEvent(new Event('input'))}
        document.querySelector(`.filter-row .chip[data-status="${saved.status||'all'}"]`)?.click();
        setTimeout(()=>scrollTo(0,Number(saved.scroll||0)),80);
      },40);
    },60);
  },20);
}
function enhance(){scheduled=false;enhanceMajorCards();enhanceTopicOverview();enhanceSubcategoryCards();setupRange();enhanceQuestionRows()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
addEventListener('storage',schedule);schedule();restoreList();
})();
