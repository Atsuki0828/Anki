(() => {
'use strict';
const KEY='ulq-state-v1';
const Q=window.QUESTION_BANK||[];
const taxonomy=window.AnatomyTaxonomy;
const groups=taxonomy?.build(Q)||[];
let scheduled=false;
function state(){try{return JSON.parse(localStorage.getItem(KEY)||'{"items":{}}')}catch{return{items:{}}}}
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
  return{
    total:list.length,mastered,learning,unseen,due,weak,
    accuracy:attempts?Math.round(ok/attempts*100):null,
    masteredPct:mastered/total*100,
    learningPct:learning/total*100,
    unseenPct:unseen/total*100
  };
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
function enhance(){scheduled=false;enhanceMajorCards();enhanceTopicOverview();enhanceSubcategoryCards();setupRange()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
addEventListener('storage',schedule);schedule();
})();
