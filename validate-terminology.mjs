import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(match=>match[1]);
const dataScripts=scripts.filter(path=>/^questions-.*\.js$/.test(path)||(/^terminology-.*\.js$/.test(path)&&path!=='terminology-ui.js'));

const context={
  console,
  TextDecoder,
  Uint8Array,
  atob:value=>Buffer.from(value,'base64').toString('binary')
};
context.window=context;
vm.createContext(context);

for(const path of dataScripts){
  if(!fs.existsSync(path))throw new Error(`Missing script referenced by index.html: ${path}`);
  vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});
}

const questions=context.QUESTION_BANK||[];
const translations=context.ANATOMY_TRANSLATIONS||{};
const ids=questions.map(question=>question.id);
const uniqueIds=new Set(ids);
const missing=questions.filter(question=>!translations[question.id]?.en?.length||!translations[question.id]?.la?.length).map(question=>question.id);
const unbalanced=questions.filter(question=>translations[question.id]?.en?.length!==translations[question.id]?.la?.length).map(question=>question.id);
const empty=questions.filter(question=>[...(translations[question.id]?.en||[]),...(translations[question.id]?.la||[])].some(term=>!String(term).trim())).map(question=>question.id);

if(questions.length!==519)throw new Error(`Expected 519 questions, found ${questions.length}`);
if(uniqueIds.size!==questions.length)throw new Error('Duplicate question IDs detected');
if(missing.length)throw new Error(`Missing translations: ${missing.join(', ')}`);
if(unbalanced.length)throw new Error(`English/Latin item count mismatch: ${unbalanced.join(', ')}`);
if(empty.length)throw new Error(`Empty terminology item: ${empty.join(', ')}`);

console.log(`Terminology validation passed: ${questions.length}/${questions.length} questions, ${Object.keys(translations).length} translation records.`);
