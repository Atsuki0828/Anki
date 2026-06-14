(() => {
'use strict';
const activeUrls=new Set();
function qid(){const badge=[...document.querySelectorAll('.q-meta .badge')].find(el=>/^Q\d+$/.test(el.textContent.trim()));return badge?Number(badge.textContent.trim().slice(1)):null}
function clearUrls(target){const urls=target?._figureUrls||[];urls.forEach(url=>{URL.revokeObjectURL(url);activeUrls.delete(url)});if(target)target._figureUrls=[]}
function zoom(src){let dialog=document.getElementById('figureLightbox');if(!dialog){dialog=document.createElement('dialog');dialog.id='figureLightbox';dialog.className='figure-lightbox';dialog.innerHTML='<button type="button">×</button><img alt="拡大図">';document.body.appendChild(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=event=>{if(event.target===dialog)dialog.close()}}dialog.querySelector('img').src=src;dialog.showModal()}
async function draw(id,target){
  if(target.dataset.done)return;
  target.dataset.done='1';
  const session=window.AnatomyFigureSession;
  await session?.ready;
  const source=id<=121?'upper':id<=241?'lower':id<=384?'trunk':'pelvis';
  if(!session?.state.loaded[source]){target.innerHTML='<div class="figure-empty">初回のみ、設定からこの分野のGoodNotes資料を読み込んでください。</div>';return}
  const data=await session.dataFor(id);
  if(!data.length){target.innerHTML='<div class="figure-empty">元資料にこの問題専用の独立した図はありません。</div>';return}
  clearUrls(target);
  target._figureUrls=[];
  const cards=data.map((value,index)=>{
    const url=URL.createObjectURL(value.blob);
    target._figureUrls.push(url);
    activeUrls.add(url);
    return value.mime==='application/pdf'?'<a class="figure-pdf" href="'+url+'" target="_blank" rel="noopener">PDF '+(index+1)+'</a>':'<button class="figure-button" type="button"><img src="'+url+'" alt="Q'+id+'の解剖図"></button>';
  });
  target.innerHTML='<div class="figure-label">元資料の対応図</div><div class="figure-grid">'+cards.join('')+'</div>';
  target.querySelectorAll('.figure-button').forEach(button=>button.onclick=()=>zoom(button.querySelector('img').src));
}
function render(force=false){
  const answer=document.querySelector('.answer-box'),id=qid();
  if(!answer||!id)return;
  let target=answer.querySelector('.source-figure');
  if(!target){target=document.createElement('div');target.className='source-figure';answer.appendChild(target)}
  if(force){clearUrls(target);delete target.dataset.done;target.innerHTML=''}
  draw(id,target).catch(error=>{console.error(error);target.innerHTML='<div class="figure-empty">図の表示に失敗しました。</div>'});
}
new MutationObserver(()=>render()).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('anatomy-figures-loaded',()=>render(true));
document.addEventListener('anatomy-figures-ready',()=>render(true));
addEventListener('pagehide',()=>{activeUrls.forEach(URL.revokeObjectURL);activeUrls.clear()});
render();
})();
