(() => {
'use strict';
const DATA=window.ANATOMY_TRANSLATIONS||{};
const BANK=window.QUESTION_BANK||[];
function esc(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function questionId(){
  const badge=[...document.querySelectorAll('.q-meta .badge')].find(element=>/^Q\d+$/.test(element.textContent.trim()));
  return badge?Number(badge.textContent.trim().slice(1)):null;
}
function languageSection(label,lang,items){
  return `<section class="terminology-language terminology-${lang}"><div class="terminology-heading"><span>${label}</span><small>${lang==='en'?'English':'Latina'}</small></div><ol>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ol></section>`;
}
function audit(){
  const missing=BANK.filter(question=>!DATA[question.id]?.en?.length||!DATA[question.id]?.la?.length).map(question=>question.id);
  const unbalanced=BANK.filter(question=>DATA[question.id]?.en?.length!==DATA[question.id]?.la?.length).map(question=>question.id);
  window.ANATOMY_TRANSLATION_AUDIT={total:BANK.length,translated:BANK.length-missing.length,missing,unbalanced};
  if(missing.length||unbalanced.length)console.error('Anatomical terminology audit failed',window.ANATOMY_TRANSLATION_AUDIT);
  else console.info(`Anatomical terminology audit: ${BANK.length}/${BANK.length} questions complete`);
}
function render(){
  const answer=document.querySelector('.answer-box'),id=questionId();
  if(!answer||!id||answer.querySelector('.terminology-block'))return;
  const entry=DATA[id];
  const block=document.createElement('div');
  block.className='terminology-block';
  if(!entry?.en?.length||!entry?.la?.length){
    block.innerHTML='<div class="terminology-missing">英語名・ラテン語名を確認できませんでした。</div>';
    console.warn('Missing anatomical terminology for question',id);
  }else{
    block.innerHTML=`<div class="terminology-title">解剖学用語</div>${languageSection('英語名','en',entry.en)}${languageSection('ラテン語名','la',entry.la)}`;
  }
  const note=answer.querySelector('.source-note');
  note?answer.insertBefore(block,note):answer.appendChild(block);
}
audit();
new MutationObserver(render).observe(document.documentElement,{childList:true,subtree:true});
render();
})();
