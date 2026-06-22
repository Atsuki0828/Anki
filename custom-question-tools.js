(() => {
'use strict';

const CUSTOM_KEY='ulq-custom-decks-v1';
const ACTIVE_KEY='ulq-active-deck-v1';
const STATE_KEY='ulq-state-v1';
const SESSION_KEY='ulq-active-session-v2';
const XLSX_URL='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
let enhanced=false;

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const now=()=>Date.now();
const uid=(prefix='q_')=>prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
function loadStore(){try{const store=JSON.parse(localStorage.getItem(CUSTOM_KEY)||'{"schemaVersion":1,"decks":[]}');store.decks=Array.isArray(store.decks)?store.decks:[];return store}catch{return{schemaVersion:1,decks:[]}}}
function saveStore(store){store.schemaVersion=1;localStorage.setItem(CUSTOM_KEY,JSON.stringify(store))}
function getActiveDeck(store=loadStore()){const id=localStorage.getItem(ACTIVE_KEY);if(!id||id==='anatomy')return null;return store.decks.find(deck=>deck.id===id)||null}
function saveDeck(deck){const store=loadStore();const i=store.decks.findIndex(d=>d.id===deck.id);if(i<0)return false;store.decks[i]=deck;saveStore(store);return true}
function clearQuestionState(questionId){try{const st=JSON.parse(localStorage.getItem(STATE_KEY)||'{"items":{}}');if(st.items)delete st.items[questionId];localStorage.setItem(STATE_KEY,JSON.stringify(st))}catch{}}
function clearSessionIfNeeded(questionId){try{const session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');if(session?.queueIds?.some(id=>String(id)===String(questionId)))localStorage.removeItem(SESSION_KEY)}catch{}}
function refreshSoon(){setTimeout(()=>location.reload(),300)}

function ensureEditDialog(){
  let dialog=document.getElementById('customQuestionEditDialog');
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.id='customQuestionEditDialog';
  dialog.className='sheet';
  dialog.innerHTML=`<form method="dialog"><div class="sheet-head"><h2>問題を編集</h2><button class="icon-btn">×</button></div><div class="field"><label>問題文</label><textarea id="editQuestionText" class="answer-input" rows="4"></textarea></div><div class="field"><label>答え</label><textarea id="editAnswerText" class="answer-input" rows="4"></textarea></div><div class="form-grid two"><div class="field"><label>小分類</label><input id="editCategoryText" class="searchbox"></div><div class="field"><label>目安項目数</label><input id="editExpectedText" class="searchbox" type="number" min="1" value="1"></div></div><div class="hero-actions" style="margin-top:14px"><button type="button" class="primary-btn" id="saveEditedQuestion">保存</button><button type="button" class="secondary-btn" id="cancelEditedQuestion">キャンセル</button></div></form>`;
  document.body.appendChild(dialog);
  document.getElementById('cancelEditedQuestion').onclick=()=>dialog.close();
  return dialog;
}

function openEdit(questionId){
  const store=loadStore(),deck=getActiveDeck(store);if(!deck)return;
  const q=deck.questions.find(x=>String(x.id)===String(questionId));if(!q)return;
  const dialog=ensureEditDialog();
  document.getElementById('editQuestionText').value=q.question||'';
  document.getElementById('editAnswerText').value=q.answer||'';
  document.getElementById('editCategoryText').value=q.category||deck.name||'自作';
  document.getElementById('editExpectedText').value=Math.max(1,Number(q.expected)||1);
  document.getElementById('saveEditedQuestion').onclick=()=>{
    const question=document.getElementById('editQuestionText').value.trim();
    const answer=document.getElementById('editAnswerText').value.trim();
    if(!question||!answer){alert('問題文と答えを入力してください');return}
    q.question=question;q.answer=answer;q.category=document.getElementById('editCategoryText').value.trim()||deck.name||'自作';q.expected=Math.max(1,Number(document.getElementById('editExpectedText').value)||1);q.updatedAt=now();deck.updatedAt=now();
    saveDeck(deck);dialog.close();refreshSoon();
  };
  dialog.showModal();
}

function addEditButtons(){
  const deck=getActiveDeck();if(!deck)return;
  document.querySelectorAll('[data-delete-q]').forEach(deleteButton=>{
    const id=deleteButton.dataset.deleteQ;
    const row=deleteButton.closest('.question-row');
    if(!row||row.querySelector(`[data-edit-q="${CSS.escape(id)}"]`))return;
    const edit=document.createElement('button');
    edit.type='button';edit.className='text-btn';edit.textContent='編集';edit.dataset.editQ=id;edit.onclick=()=>openEdit(id);
    deleteButton.before(edit);
  });
}

function parseDelimited(text,delimiter){
  const rows=[];let row=[],cell='',quote=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i],next=text[i+1];
    if(ch==='"'){
      if(quote&&next==='"'){cell+='"';i++}else quote=!quote;
    }else if(ch===delimiter&&!quote){row.push(cell);cell='';}
    else if((ch==='\n'||ch==='\r')&&!quote){if(ch==='\r'&&next==='\n')i++;row.push(cell);if(row.some(x=>String(x).trim()!==''))rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  row.push(cell);if(row.some(x=>String(x).trim()!==''))rows.push(row);return rows;
}
function chooseDelimiter(text,fileName){if(/\.tsv$/i.test(fileName))return '\t';const first=text.split(/\r?\n/).slice(0,5).join('\n');const tabs=(first.match(/\t/g)||[]).length,commas=(first.match(/,/g)||[]).length;return tabs>commas?'\t':','}
async function readTextSmart(file){const buffer=await file.arrayBuffer();const utf=new TextDecoder('utf-8').decode(buffer);const bad=(utf.match(/�/g)||[]).length;if(bad>2){try{return new TextDecoder('shift_jis').decode(buffer)}catch{return utf}}return utf}
function normHeader(value){return String(value||'').trim().toLowerCase().replace(/[\s_\-]/g,'')}
function findColumn(headers,names){return headers.findIndex(h=>names.includes(normHeader(h)))}
function rowsToQuestions(rows,deck){
  const clean=rows.filter(r=>Array.isArray(r)&&r.some(c=>String(c??'').trim()));
  if(!clean.length)return[];
  const headers=clean[0];
  const qNames=['問題','問題文','question','front','表','問い'];
  const aNames=['答え','回答','解答','answer','back','裏'];
  const cNames=['小分類','分類','category','tag','tags','科目'];
  const eNames=['目安項目数','項目数','expected','count'];
  const nNames=['メモ','備考','note'];
  let qi=findColumn(headers,qNames),ai=findColumn(headers,aNames),ci=findColumn(headers,cNames),ei=findColumn(headers,eNames),ni=findColumn(headers,nNames);
  const hasHeader=qi>=0&&ai>=0;
  if(!hasHeader){qi=0;ai=1;ci=2;ei=3;ni=4}
  const start=hasHeader?1:0;
  const imported=[];
  for(let i=start;i<clean.length;i++){
    const row=clean[i];
    const question=String(row[qi]??'').trim(),answer=String(row[ai]??'').trim();
    if(!question||!answer)continue;
    const t=now()+i;
    imported.push({id:uid('q_'),question,answer,category:String(row[ci]??deck.name??'自作').trim()||deck.name||'自作',expected:Math.max(1,Number(row[ei])||1),note:String(row[ni]??'').trim(),custom:true,deckId:deck.id,createdAt:t,updatedAt:t});
  }
  return imported;
}
function loadScript(src){return new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>s.src===src);if(existing){if(window.XLSX)resolve();else existing.addEventListener('load',resolve,{once:true});return}const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Excel読み込みライブラリの取得に失敗しました'));document.head.appendChild(script)})}
async function readFileRows(file){
  if(/\.(xlsx|xls)$/i.test(file.name)){
    if(!window.XLSX)await loadScript(XLSX_URL);
    const workbook=window.XLSX.read(await file.arrayBuffer(),{type:'array'});
    const sheet=workbook.Sheets[workbook.SheetNames[0]];
    return window.XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
  }
  const text=await readTextSmart(file);
  return parseDelimited(text,chooseDelimiter(text,file.name));
}
async function importFile(file){
  const store=loadStore(),deck=getActiveDeck(store),status=document.getElementById('customImportStatus');
  if(!deck||!file)return;
  try{
    if(status)status.textContent='読み込み中…';
    const rows=await readFileRows(file);
    const items=rowsToQuestions(rows,deck);
    if(!items.length){if(status)status.textContent='追加できる行がありません。問題列と答え列を確認してください。';return}
    deck.questions.push(...items);deck.updatedAt=now();saveDeck(deck);
    if(status)status.textContent=`${items.length}問を追加しました。画面を更新します。`;
    refreshSoon();
  }catch(error){console.error(error);if(status)status.textContent=error.message||String(error)}
}
function addImportPanel(){
  const deck=getActiveDeck();if(!deck||document.getElementById('customImportPanel'))return;
  const addBtn=document.getElementById('addQuestion');if(!addBtn)return;
  const section=document.createElement('section');section.className='panel';section.id='customImportPanel';
  section.innerHTML=`<h2>CSV / Excelから追加</h2><p>1行目に <code>問題</code>・<code>答え</code>・<code>小分類</code>・<code>目安項目数</code> を入れると自動判定します。見出しなしの場合は、1列目=問題、2列目=答え、3列目=小分類として読み込みます。</p><label class="figure-import-button">CSV / Excelを選択<input id="customImportFile" type="file" accept=".csv,.tsv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"></label><button type="button" class="secondary-btn" id="customImportRun" style="width:100%;margin-top:12px">選択したファイルを読み込む</button><div id="customImportStatus" class="figure-import-status">未選択</div>`;
  addBtn.closest('section')?.after(section);
  document.getElementById('customImportFile').onchange=e=>{const file=e.target.files?.[0];document.getElementById('customImportStatus').textContent=file?`${file.name} を選択中`:'未選択'};
  document.getElementById('customImportRun').onclick=()=>importFile(document.getElementById('customImportFile').files?.[0]);
}
function enhance(){
  const active=localStorage.getItem(ACTIVE_KEY);
  if(!active||active==='anatomy')return;
  if(!document.getElementById('editDeckName')||!document.getElementById('addQuestion'))return;
  addImportPanel();addEditButtons();enhanced=true;
}
const observer=new MutationObserver(()=>{enhanced=false;enhance()});
observer.observe(document.getElementById('main')||document.body,{childList:true,subtree:true});
addEventListener('DOMContentLoaded',enhance);
setTimeout(enhance,300);
})();
