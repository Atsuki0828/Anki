(() => {
'use strict';
const Q=window.QUESTION_BANK||[],T=window.AnatomyTaxonomy;
const main=document.getElementById('main'),nav=[...document.querySelectorAll('.nav-item')],groups=T.build(Q);
const KEY='ulq-state-v1',SKEY='ulq-settings-v1';
let st=JSON.parse(localStorage.getItem(KEY)||'{"items":{},"answered":0,"correct":0,"streak":0,"last":""}');
let cfg=JSON.parse(localStorage.getItem(SKEY)||'{"order":"smart","showInput":true,"largeText":false}');
let sess=null,listFilter={status:'all',major:'all',sub:'all'};
const save=()=>localStorage.setItem(KEY,JSON.stringify(st));
const saveCfg=()=>localStorage.setItem(SKEY,JSON.stringify(cfg));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const item=id=>st.items[id]||(st.items[id]={level:0,due:0,seen:0,ok:0,ng:0});
const meta=q=>T.meta(q);
const day=()=>new Date().toISOString().slice(0,10);
function touchStreak(){const t=day();if(st.last===t)return;const y=new Date();y.setDate(y.getDate()-1);st.streak=st.last===y.toISOString().slice(0,10)?(st.streak||0)+1:1;st.last=t;}
function summary(list=Q){let mastered=0,unseen=0,due=0;const now=Date.now();list.forEach(q=>{const s=st.items[q.id];if(!s||!s.seen)unseen++;else if(s.level>=4)mastered++;if(s&&s.seen&&s.due<=now)due++;});return{mastered,unseen,due,accuracy:st.answered?Math.round(st.correct/st.answered*100):0,total:list.length};}
function stat(list){const m=list.filter(q=>(st.items[q.id]?.level||0)>=4).length,d=list.filter(q=>st.items[q.id]?.seen&&st.items[q.id].due<=Date.now()).length;return{m,d,n:list.length,p:list.length?Math.round(m/list.length*100):0};}
function group(id){return groups.find(g=>g.id===id)}
function go(view,opt={}){nav.forEach(b=>b.classList.toggle('active',b.dataset.view===view||(view==='topic'&&b.dataset.view==='home')));if(view==='home')home();if(view==='topic')topic(opt.major);if(view==='study')setup(opt);if(view==='list')list();if(view==='stats')stats();scrollTo(0,0);}
function home(){
  const s=summary();
  main.innerHTML=`<section class="hero"><div class="hero-kicker">SPACED REPETITION</div><h1>${s.due?`復習が ${s.due} 問<br>あります`:`全${Q.length}問を<br>定着させる`}</h1><p>大分類から入り、小分類を絞って弱点を重点的に復習できます。</p><div class="hero-actions"><button class="primary-btn" id="quick">${s.due?'今日の復習':'10問始める'}</button><button class="secondary-btn" id="custom">条件を選ぶ</button></div></section><div class="section-title"><h2>進捗</h2><span>自動保存</span></div><div class="stat-grid"><div class="stat-card"><b>${s.mastered}</b><span>定着</span></div><div class="stat-card"><b>${s.accuracy}%</b><span>正答率</span></div><div class="stat-card"><b>${st.streak||0}日</b><span>連続学習</span></div></div><div class="section-title"><h2>大分類から選ぶ</h2><span>選択後に小分類を表示</span></div><div class="major-grid">${groups.map(g=>{const x=stat(g.questions);return`<button class="major-card" data-major="${g.id}"><div class="major-card-head"><strong>${esc(g.name)}</strong><span>${x.n}問</span></div><p>${esc(g.description)}</p><small>${x.m}/${x.n} 定着 ・ 復習 ${x.d}問</small><div class="mini-progress"><i style="width:${x.p}%"></i></div><div class="major-card-foot">小分類を見る <b>›</b></div></button>`}).join('')}</div>`;
  document.getElementById('quick').onclick=()=>start({pool:s.due?'due':'smart',count:10,mode:'recall',major:'all',sub:'all'});
  document.getElementById('custom').onclick=()=>go('study');
  document.querySelectorAll('[data-major]').forEach(b=>b.onclick=()=>go('topic',{major:b.dataset.major}));
}
function topic(majorId){
  const g=group(majorId);if(!g){home();return}const x=stat(g.questions);
  main.innerHTML=`<button class="text-back" id="backHome">‹ 大分類へ戻る</button><section class="topic-hero"><div><span>${x.n}問</span><h1>${esc(g.name)}</h1><p>${esc(g.description)}</p></div><div class="topic-score"><b>${x.p}%</b><small>定着</small></div></section><div class="topic-actions"><button class="primary-btn" id="studyMajor">${esc(g.name)}を10問</button><button class="secondary-btn" id="setupMajor">条件を指定</button></div><div class="section-title"><h2>小分類</h2><span>重点復習する分野を選択</span></div><div class="subcategory-list">${g.subs.map(s=>{const a=stat(s.questions);return`<button class="subcategory-card" data-sub="${esc(s.name)}"><div><strong>${esc(s.name)}</strong><small>${a.n}問 ・ 定着 ${a.m}問 ・ 復習 ${a.d}問</small></div><div class="sub-progress"><i style="width:${a.p}%"></i></div><span class="sub-arrow">›</span></button>`}).join('')}</div>`;
  document.getElementById('backHome').onclick=()=>go('home');
  document.getElementById('studyMajor').onclick=()=>start({major:g.id,sub:'all',pool:'smart',count:10,mode:'recall'});
  document.getElementById('setupMajor').onclick=()=>go('study',{major:g.id});
  document.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>go('study',{major:g.id,sub:b.dataset.sub}));
}
function subOptions(majorId,selected='all'){
  if(majorId==='all')return'<option value="all">全小分類</option>';
  const g=group(majorId);return`<option value="all">${esc(g.name)}の全問題</option>${g.subs.map(s=>`<option value="${esc(s.name)}" ${s.name===selected?'selected':''}>${esc(s.name)}（${s.questions.length}問）</option>`).join('')}`;
}
function setup(o={}){
  const selectedMajor=o.major||'all',selectedSub=o.sub||'all';
  main.innerHTML=`<section class="panel"><h2>学習条件</h2><div class="form-grid two"><div class="field"><label>大分類</label><select id="major"><option value="all">全大分類</option>${groups.map(g=>`<option value="${g.id}" ${g.id===selectedMajor?'selected':''}>${esc(g.name)}（${g.questions.length}問）</option>`).join('')}</select></div><div class="field"><label>小分類</label><select id="sub">${subOptions(selectedMajor,selectedSub)}</select></div><div class="field"><label>出題形式</label><select id="mode"><option value="recall">思い出す</option><option value="choice">四択</option></select></div><div class="field"><label>問題数</label><select id="count"><option>10</option><option>20</option><option>30</option><option>50</option><option value="all">全問</option></select></div><div class="field field-wide"><label>対象</label><select id="pool"><option value="smart">弱点・未学習を優先</option><option value="due">復習期限</option><option value="unseen">未学習</option><option value="weak">間違えた問題</option><option value="all">全問題</option></select></div></div><div class="selection-summary" id="selectionSummary"></div><button class="primary-btn" id="begin" style="width:100%;margin-top:14px">開始する</button></section>`;
  const majorEl=document.getElementById('major'),subEl=document.getElementById('sub');
  const refresh=()=>{const a=filtered({major:majorEl.value,sub:subEl.value});document.getElementById('selectionSummary').textContent=`選択範囲：${a.length}問`;};
  majorEl.onchange=()=>{subEl.innerHTML=subOptions(majorEl.value);refresh()};subEl.onchange=refresh;refresh();
  document.getElementById('begin').onclick=()=>start({mode:document.getElementById('mode').value,count:document.getElementById('count').value,major:majorEl.value,sub:subEl.value,pool:document.getElementById('pool').value});
}
function filtered(o){return Q.filter(q=>{const m=meta(q);return(!o.major||o.major==='all'||m.majorId===o.major)&&(!o.sub||o.sub==='all'||m.sub===o.sub)})}
function pick(o){
  const now=Date.now();let a=filtered(o);
  if(o.pool==='due')a=a.filter(q=>item(q.id).seen&&item(q.id).due<=now);
  if(o.pool==='unseen')a=a.filter(q=>!item(q.id).seen);
  if(o.pool==='weak')a=a.filter(q=>item(q.id).ng>0&&item(q.id).level<4);
  const score=q=>{const s=item(q.id);return(!s.seen?1000:0)+(s.due<=now?500:0)+s.ng*20-s.level*35+Math.random()*10};
  if(cfg.order==='number')a.sort((x,y)=>x.id-y.id);else if(cfg.order==='random')a.sort(()=>Math.random()-.5);else a.sort((x,y)=>score(y)-score(x));
  return a.slice(0,o.count==='all'?a.length:+o.count);
}
function start(o){const queue=pick(o);if(!queue.length){alert('条件に合う問題がありません');return}sess={queue,i:0,mode:o.mode||'recall',score:0,options:{...o},history:[]};question();}
function canUndo(){return Boolean(sess?.history?.length)}
function question(){
  sess.history=sess.history||[];
  const q=sess.queue[sess.i],m=meta(q);
  main.innerHTML=`<div class="study-head"><div class="progress-track"><i style="width:${sess.i/sess.queue.length*100}%"></i></div><span>${sess.i+1}/${sess.queue.length}</span>${canUndo()?'<button class="study-undo-btn" id="undoQuestion" type="button">↶ 1問戻る</button>':''}</div><section class="question-card"><div class="q-meta"><span class="badge">Q${q.id}</span><span class="badge major-badge">${esc(m.major)}</span><span class="badge sub-badge">${esc(m.sub)}</span>${q.note?'<span class="badge warn">要確認</span>':''}</div><div class="question-text">${esc(q.question)}</div><div id="work"></div></section>`;
  const undo=document.getElementById('undoQuestion');if(undo)undo.onclick=undoLast;
  sess.mode==='choice'?choices(q):recall(q);
}
function recall(q){
  const workEl=document.getElementById('work');
  workEl.innerHTML=`${cfg.showInput?`<textarea class="answer-input" placeholder="答えを書き出す"></textarea><div class="hint-text">目安：${q.expected}項目</div>`:''}<div id="ans"></div><div class="question-actions" id="actions"><button class="primary-btn" id="show">答えを表示</button></div>`;
  document.getElementById('show').onclick=()=>{
    document.getElementById('ans').innerHTML=answerBox(q);
    document.getElementById('actions').innerHTML=`<div class="grade-grid"><button class="grade-btn grade-skip" id="skipQuestion"><b>スキップ</b><small>記録しない</small></button><button class="grade-btn grade-again" data-g="again"><b>不正解</b><small>すぐ</small></button><button class="grade-btn grade-hard" data-g="hard"><b>曖昧</b><small>明日</small></button><button class="grade-btn grade-good" data-g="good"><b>正解</b><small>数日後</small></button><button class="grade-btn grade-easy" data-g="easy"><b>余裕</b><small>長め</small></button></div>`;
    document.getElementById('skipQuestion').onclick=skipCurrent;
    document.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>grade(q,b.dataset.g));
  };
}
function answerBox(q){return`<div class="answer-box"><div class="answer-label">資料の回答</div><div class="answer-text">${esc(q.answer).replaceAll('／','<br>')}</div>${q.note?`<div class="source-note">${esc(q.note)}</div>`:''}</div>`;}
function choices(q){
  const m=meta(q);let candidates=Q.filter(x=>x.id!==q.id&&meta(x).sub===m.sub&&meta(x).majorId===m.majorId);
  if(candidates.length<3)candidates=Q.filter(x=>x.id!==q.id&&meta(x).majorId===m.majorId);
  if(candidates.length<3)candidates=Q.filter(x=>x.id!==q.id);
  let answers=candidates.sort(()=>Math.random()-.5).slice(0,3).map(x=>x.answer);answers=[q.answer,...answers].sort(()=>Math.random()-.5);
  document.getElementById('work').innerHTML=`<div class="choice-list">${answers.map(x=>`<button class="choice-btn" data-v="${encodeURIComponent(x)}">${esc(x)}</button>`).join('')}</div><div id="ans"></div>`;
  document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{
    const ok=decodeURIComponent(b.dataset.v)===q.answer;
    document.querySelectorAll('[data-v]').forEach(x=>{x.disabled=true;const right=decodeURIComponent(x.dataset.v)===q.answer;x.classList.toggle('correct',right);if(x===b&&!ok)x.classList.add('wrong')});
    pushHistory(q);
    document.getElementById('ans').innerHTML=answerBox(q)+`<div class="question-actions"><button class="primary-btn" id="next">次へ</button></div>`;
    record(q,ok?'good':'again');if(ok)sess.score++;
    document.getElementById('next').onclick=advance;
  });
}
function snapshotItem(id){return st.items[id]?{...st.items[id]}:null}
function pushHistory(q){
  sess.history=sess.history||[];
  sess.history.push({i:sess.i,qid:q.id,item:snapshotItem(q.id),answered:st.answered,correct:st.correct,streak:st.streak,last:st.last,score:sess.score});
}
function grade(q,g){pushHistory(q);record(q,g);if(g==='good'||g==='easy')sess.score++;advance()}
function skipCurrent(){const q=sess.queue[sess.i];pushHistory(q);advance()}
function undoLast(){
  const previous=sess?.history?.pop();if(!previous)return;
  if(previous.item===null)delete st.items[previous.qid];else st.items[previous.qid]={...previous.item};
  st.answered=previous.answered;st.correct=previous.correct;st.streak=previous.streak;st.last=previous.last;
  sess.score=previous.score;sess.i=previous.i;save();question();
}
function record(q,g){const s=item(q.id),now=Date.now();s.seen++;st.answered++;if(g==='again'){s.level=Math.max(0,s.level-1);s.ng++;s.due=now+300000}if(g==='hard'){s.ng++;s.due=now+86400000}if(g==='good'){s.level=Math.min(5,s.level+1);s.ok++;st.correct++;s.due=now+[1,2,4,8,16,30][s.level]*86400000}if(g==='easy'){s.level=Math.min(5,s.level+2);s.ok++;st.correct++;s.due=now+[2,4,8,16,30,60][s.level]*86400000}touchStreak();save()}
function advance(){sess.i++;if(sess.i<sess.queue.length)question();else finish()}
function finish(){
  const opts={...sess.options,count:10};
  main.innerHTML=`<section class="hero"><div class="hero-kicker">SESSION COMPLETE</div><h1>${sess.queue.length}問 完了</h1><p>正解・余裕：${sess.score}問</p><div class="hero-actions">${canUndo()?'<button class="secondary-btn" id="undoFinished">1問戻る</button>':''}<button class="primary-btn" id="again">同じ分野を10問</button><button class="secondary-btn" id="back">ホームへ</button></div></section>`;
  const undo=document.getElementById('undoFinished');if(undo)undo.onclick=undoLast;
  document.getElementById('again').onclick=()=>start(opts);document.getElementById('back').onclick=()=>go('home');
}
function list(){
  main.innerHTML=`<div class="list-toolbar"><input id="search" class="searchbox" placeholder="問題・回答を検索"><div class="list-selects"><select id="listMajor"><option value="all">全大分類</option>${groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select><select id="listSub"><option value="all">全小分類</option></select></div><div class="filter-row"><button class="chip active" data-status="all">すべて</button><button class="chip" data-status="weak">弱点</button><button class="chip" data-status="mastered">定着</button><button class="chip" data-status="unseen">未学習</button></div></div><div id="rows" class="question-list"></div>`;
  const searchEl=document.getElementById('search'),majorEl=document.getElementById('listMajor'),subEl=document.getElementById('listSub'),rowsEl=document.getElementById('rows');
  const updateSubs=()=>{subEl.innerHTML=subOptions(majorEl.value,listFilter.sub);if(![...subEl.options].some(o=>o.value===listFilter.sub))listFilter.sub='all';subEl.value=listFilter.sub};
  const draw=()=>{const text=searchEl.value.toLowerCase();let a=filtered(listFilter).filter(q=>(q.question+' '+q.answer).toLowerCase().includes(text));if(listFilter.status==='weak')a=a.filter(q=>(st.items[q.id]?.ng||0)>0);if(listFilter.status==='mastered')a=a.filter(q=>(st.items[q.id]?.level||0)>=4);if(listFilter.status==='unseen')a=a.filter(q=>!(st.items[q.id]?.seen));rowsEl.innerHTML=a.length?a.map(q=>{const m=meta(q);return`<button class="question-row" data-id="${q.id}"><strong>Q${q.id} ・ ${esc(m.major)}</strong><small>${esc(m.sub)}</small><p>${esc(q.question)}</p></button>`}).join(''):'<div class="empty">該当する問題がありません</div>';document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{sess={queue:[Q.find(q=>q.id==b.dataset.id)],i:0,mode:'recall',score:0,options:{major:'all',sub:'all',pool:'all',count:1},history:[]};question()})};
  majorEl.value=listFilter.major;updateSubs();searchEl.oninput=draw;majorEl.onchange=()=>{listFilter.major=majorEl.value;listFilter.sub='all';updateSubs();draw()};subEl.onchange=()=>{listFilter.sub=subEl.value;draw()};document.querySelectorAll('[data-status]').forEach(b=>{b.classList.toggle('active',b.dataset.status===listFilter.status);b.onclick=()=>{listFilter.status=b.dataset.status;document.querySelectorAll('[data-status]').forEach(x=>x.classList.toggle('active',x===b));draw()}});draw();
}
function stats(){
  const s=summary();main.innerHTML=`<div class="stat-grid"><div class="stat-card"><b>${st.answered||0}</b><span>総回答</span></div><div class="stat-card"><b>${s.accuracy}%</b><span>正答率</span></div><div class="stat-card"><b>${s.mastered}</b><span>定着</span></div></div><div class="section-title"><h2>大分類・小分類別</h2></div><div class="stats-groups">${groups.map(g=>{const x=stat(g.questions);return`<section class="panel stats-group"><div class="stats-group-head"><div><h3>${esc(g.name)}</h3><small>${x.m}/${x.n} 定着</small></div><b>${x.p}%</b></div>${g.subs.map(sub=>{const a=stat(sub.questions);return`<div class="bar-row"><span>${esc(sub.name)}</span><div class="bar"><i style="width:${a.p}%"></i></div><b>${a.p}%</b></div>`}).join('')}</section>`}).join('')}</div>`;
}
nav.forEach(b=>b.onclick=()=>go(b.dataset.view));
document.getElementById('homeBtn').onclick=()=>go('home');document.getElementById('settingsBtn').onclick=()=>document.getElementById('settingsDialog').showModal();
const orderSetting=document.getElementById('orderSetting'),inputSetting=document.getElementById('inputSetting'),largeTextSetting=document.getElementById('largeTextSetting'),resetBtn=document.getElementById('resetBtn');
orderSetting.value=cfg.order;inputSetting.checked=cfg.showInput;largeTextSetting.checked=cfg.largeText;document.body.classList.toggle('large-text',cfg.largeText);
orderSetting.onchange=()=>{cfg.order=orderSetting.value;saveCfg()};inputSetting.onchange=()=>{cfg.showInput=inputSetting.checked;saveCfg()};largeTextSetting.onchange=()=>{cfg.largeText=largeTextSetting.checked;document.body.classList.toggle('large-text',cfg.largeText);saveCfg()};resetBtn.onclick=()=>{if(confirm('学習履歴を消去しますか？')){st={items:{},answered:0,correct:0,streak:0,last:''};save();document.getElementById('settingsDialog').close();home()}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});go('home');
})();
