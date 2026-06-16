import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(p=>/^questions-.*\.js$/.test(p));
const context={window:{},console,TextDecoder,Uint8Array,atob:v=>Buffer.from(v,'base64').toString('binary')};
context.window=context;vm.createContext(context);
for(const file of scripts)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const bank=context.QUESTION_BANK||[];
const source=JSON.parse(fs.readFileSync('heavy2024-authoritative.json','utf8'));

const ranges=[
  [1,81,1,121,'upper'],[82,143,122,241,'lower'],[144,239,242,384,'trunk'],
  [240,275,385,426,'pelvis'],[276,346,427,510,'headneck'],[347,350,511,520,'cns']
];
const synonyms=[
  [/上肢体/g,'上肢帯'],[/鼡径/g,'鼠径'],[/伳/g,'腱'],[/隙間/g,'隙'],[/動静脈/g,'動脈静脈'],
  [/前腕骨間膜/g,'骨間膜'],[/下腿骨間膜/g,'骨間膜'],[/総指伸筋/g,'指伸筋'],[/\(総\)指伸筋/g,'指伸筋'],
  [/大腿筋膜張筋/g,'筋膜張筋'],[/中小殿筋/g,'中殿筋小殿筋'],[/大・小/g,'大小'],[/上・下/g,'上下'],[/内・外/g,'内外']
];
function normalize(value){
  let s=String(value||'').normalize('NFKC').toLowerCase();
  for(const [a,b] of synonyms)s=s.replace(a,b);
  s=s.replace(/答えよ|述べよ|何か|について|それぞれ|及び|および|ここを通る|を構成する|をつくる|をなす|を答える|答える/g,'');
  s=s.replace(/[\s\p{P}\p{S}0-9０-９a-z]/gu,'');
  return s;
}
function grams(s,n=2){const a=[];for(let i=0;i<=s.length-n;i++)a.push(s.slice(i,i+n));return a}
function dice(a,b){if(!a||!b)return 0;const A=grams(a),B=grams(b),m=new Map();for(const x of A)m.set(x,(m.get(x)||0)+1);let hit=0;for(const x of B){const c=m.get(x)||0;if(c){hit++;m.set(x,c-1)}}return 2*hit/(A.length+B.length||1)}
function lev(a,b){const m=a.length,n=b.length,row=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i++){let prev=row[0];row[0]=i;for(let j=1;j<=n;j++){const tmp=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=tmp}}return row[n]}
function score(a,b){const na=normalize(a),nb=normalize(b);if(!na||!nb)return 0;let s=.65*dice(na,nb)+.35*(1-lev(na,nb)/Math.max(na.length,nb.length));if(na.includes(nb)||nb.includes(na))s=Math.max(s,.82*Math.min(na.length,nb.length)/Math.max(na.length,nb.length)+.18);return Math.min(1,s)}
function answerNorm(v){return normalize(String(v).replace(/[：:]/g,'').replace(/／/g,'、'))}
function candidates(row){const r=ranges.find(([a,b])=>row.source_id>=a&&row.source_id<=b);return r?bank.filter(q=>q.id>=r[2]&&q.id<=r[3]):bank}
const report=source.map(row=>{
  const ranked=candidates(row).map(q=>({id:q.id,question:q.question,answer:q.answer,score:+score(row.question,q.question).toFixed(4)})).sort((a,b)=>b.score-a.score).slice(0,3);
  const best=ranked[0]||{};
  return{source_id:row.source_id,source_question:row.question,source_answer:row.answer,best,second:ranked[1]||null,answer_same:best.answer?answerNorm(best.answer)===answerNorm(row.answer):false,margin:best.score&&ranked[1]?+(best.score-ranked[1].score).toFixed(4):0};
});
const likely=report.filter(r=>r.best.score>=.55&&r.margin>=.03).sort((a,b)=>a.best.id-b.best.id);
const mismatches=likely.filter(r=>!r.answer_same);
fs.writeFileSync('heavy2024-match-report.json',JSON.stringify({summary:{source:source.length,bank:bank.length,likely:likely.length,mismatches:mismatches.length},likely,mismatches},null,2));
console.log({source:source.length,bank:bank.length,likely:likely.length,mismatches:mismatches.length});
