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
const terminologyQuestions=questions.filter(question=>Number(question.id)<1000);
const translations=context.ANATOMY_TRANSLATIONS||{};
const ids=terminologyQuestions.map(question=>question.id);
const uniqueIds=new Set(ids);
const missing=terminologyQuestions.filter(question=>!translations[question.id]?.en?.length||!translations[question.id]?.la?.length).map(question=>question.id);
const unbalanced=terminologyQuestions.filter(question=>translations[question.id]?.en?.length!==translations[question.id]?.la?.length).map(question=>question.id);
const empty=terminologyQuestions.filter(question=>[...(translations[question.id]?.en||[]),...(translations[question.id]?.la||[])].some(term=>!String(term).trim())).map(question=>question.id);

if(terminologyQuestions.length!==519)throw new Error(`Expected 519 terminology-backed questions, found ${terminologyQuestions.length}`);
if(uniqueIds.size!==terminologyQuestions.length)throw new Error('Duplicate base question IDs detected');
if(missing.length)throw new Error(`Missing translations: ${missing.join(', ')}`);
if(unbalanced.length)throw new Error(`English/Latin item count mismatch: ${unbalanced.join(', ')}`);
if(empty.length)throw new Error(`Empty terminology item: ${empty.join(', ')}`);

console.log(`Terminology validation passed: ${terminologyQuestions.length}/${terminologyQuestions.length} base questions, ${Object.keys(translations).length} translation records, ${questions.length} total questions loaded.`);
