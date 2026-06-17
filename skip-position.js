(() => {
'use strict';
let scheduled=false;

function moveSkipButton(){
  const head=document.querySelector('.study-head');
  const skip=document.getElementById('skipQuestion');
  if(!head||!skip||skip.parentElement===head)return;

  skip.className='study-skip-btn';
  skip.type='button';
  skip.textContent='スキップ';
  head.prepend(skip);
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    moveSkipButton();
  });
}

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
schedule();
})();
