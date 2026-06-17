import fs from'node:fs';import vm from'node:vm';
const html=fs.readFileSync('index.html','utf8');
const files=[...html.matchAll(/<script src="([^"]+\.js)"/g)].map(m=>m[1]).filter(f=>!f.startsWith('https://')&&(/^(questions-|terminology-)/.test(f)));
const c={window:{},console,TextDecoder,Uint8Array,atob:v=>Buffer.from(v,'base64').toString('binary')};c.window=c;vm.createContext(c);
for(const f of files){if(!fs.existsSync(f))throw Error('missing '+f);new vm.Script(fs.readFileSync(f,'utf8'),{filename:f});vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});}
const bank=c.QUESTION_BANK||[],tr=c.ANATOMY_TRANSLATIONS||{},ids=bank.map(q=>Number(q.id));
const expected=Array.from({length:520},(_,i)=>i+1).filter(id=>id!==429);
const duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
const missingIds=expected.filter(id=>!ids.includes(id)),unexpectedIds=ids.filter(id=>!expected.includes(id));
const malformed=bank.filter(q=>!String(q.question||'').trim()||!String(q.answer||'').trim()||!Number.isFinite(Number(q.expected))||Number(q.expected)<1).map(q=>q.id);
const missingTranslations=bank.filter(q=>!tr[q.id]?.en?.length||!tr[q.id]?.la?.length).map(q=>q.id);
const unbalancedTranslations=bank.filter(q=>tr[q.id]?.en?.length!==tr[q.id]?.la?.length).map(q=>q.id);
const report={generatedAt:new Date().toISOString(),questions:bank.length,uniqueIds:new Set(ids).size,duplicates,missingIds,unexpectedIds,malformed,translated:bank.length-missingTranslations.length,missingTranslations,unbalancedTranslations,passed:bank.length===519&&!duplicates.length&&!missingIds.length&&!unexpectedIds.length&&!malformed.length&&!missingTranslations.length&&!unbalancedTranslations.length};
fs.writeFileSync('medical-audit-validation-v2.json',JSON.stringify(report,null,2)+'\n');console.log(report);
