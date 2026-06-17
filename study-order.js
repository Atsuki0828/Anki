(() => {
'use strict';
const PREF_KEY='anatomy-sequential-order-v1';
const ACTIVE_KEY='anatomy-sequential-session-v1';
let scheduled=false;

function preferred(){return localStorage.getItem(PREF_KEY)==='1'}
function setPreferred(value){localStorage.setItem(PREF_KEY,value?'1':'0')}

function temporarilyUseNumberOrder(){
  const select=document.getElementById('orderSetting');
  if(!select)return;
  const previous=select.value;
  if(previous==='number')return;
  select.value='number';
  select.dispatchEvent(new Event('change',{bubbles:true}));
  setTimeout(()=>{
    select.value=previous;
    select.dispatchEvent(new Event('change',{bubbles:true}));
  },0);
}

function installConditionCheckbox(){
  const grid=document.querySelector('main .panel .form-grid');
  const begin=document.getElementById('begin');
  if(!grid||!begin)return;

  let field=document.getElementById('sequentialOrderField');
  if(!field){
    field=document.createElement('div');
    field.id='sequentialOrderField';
    field.className='field field-wide sequence-order-field';
    field.innerHTML=`<label class="sequence-order-toggle" for="sequentialOrder"><input id="sequentialOrder" type="checkbox"><span><strong>問題番号順で出題する</strong><small>チェックすると、選択範囲をQ番号の小さい順に進めます。</small></span></label>`;
    grid.appendChild(field);
  }

  const checkbox=document.getElementById('sequentialOrder');
  if(!checkbox)return;
  if(!checkbox.dataset.ready){
    checkbox.checked=preferred();
    checkbox.addEventListener('change',()=>setPreferred(checkbox.checked));
    checkbox.dataset.ready='1';
  }

  if(!begin.dataset.sequenceReady){
    begin.addEventListener('click',()=>{
      const enabled=Boolean(document.getElementById('sequentialOrder')?.checked);
      setPreferred(enabled);
      sessionStorage.setItem(ACTIVE_KEY,enabled?'1':'0');
      if(enabled)temporarilyUseNumberOrder();
    },true);
    begin.dataset.sequenceReady='1';
  }
}

function installRepeatHandler(){
  const again=document.getElementById('again');
  if(!again||again.dataset.sequenceReady)return;
  again.addEventListener('click',()=>{
    if(sessionStorage.getItem(ACTIVE_KEY)==='1')temporarilyUseNumberOrder();
  },true);
  again.dataset.sequenceReady='1';
}

function clearFinishedModeOutsideSession(){
  const onHome=Boolean(document.querySelector('.hero'))&&!document.getElementById('again');
  const onTopic=Boolean(document.querySelector('.topic-hero'));
  if(onHome||onTopic)sessionStorage.removeItem(ACTIVE_KEY);
}

function enhance(){
  scheduled=false;
  installConditionCheckbox();
  installRepeatHandler();
  clearFinishedModeOutsideSession();
}
function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(enhance);
}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
schedule();
})();
