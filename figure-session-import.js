(() => {
'use strict';
const LABEL={upper:'\u4e0a\u80a2',lower:'\u4e0b\u80a2',trunk:'\u80cc\u90e8\u30fb\u80f8\u90e8\u30fb\u8179\u90e8',pelvis:'\u9aa8\u76e4\u90e8\u30fb\u982d\u9838\u90e8\u30fb\u4e2d\u67a2\u795e\u7d4c\u7cfb'};
const state={map:{},files:{},loaded:{}};
async function importFiles(files,progress=()=>{}){if(!window.JSZip)throw Error('JSZip unavailable');for(const file of files){progress(file.name);const zip=await JSZip.loadAsync(await file.arrayBuffer()),source=AnatomyGoodNotes.sourceFor(file.name,zip);if(!source)throw Error('unknown source');const map=await AnatomyGoodNotes.build(zip,source,(i,n)=>progress(`${LABEL[source]} ${i}/${n}`));Object.assign(state.map,map);state.files[source]=zip;state.loaded[source]=file.name}return Object.keys(state.loaded).length}
function source(id){if(id<=121)return'upper';if(id<=241)return'lower';if(id<=384)return'trunk';return'pelvis'}
async function dataFor(id){const zip=state.files[source(id)],keys=state.map[id]||[],out=[];if(!zip)return out;for(const key of keys){const entry=zip.file('attachments/'+key);if(entry)out.push(await entry.async('base64'))}return out}
function message(text=''){const el=document.getElementById('figureImportStatus'),names=Object.keys(state.loaded).map(key=>LABEL[key]);if(el)el.textContent=text||(names.length?'\u8aad\u8fbc\u6e08\u307f\uff1a'+names.join('\u3001'):'\u307e\u3060\u56f3\u3092\u8aad\u307f\u8fbc\u3093\u3067\u3044\u307e\u305b\u3093\u3002')}
async function pick(input){if(!input.files.length)return;input.disabled=true;try{await importFiles([...input.files],message);message();alert('\u56f3\u306e\u8aad\u307f\u8fbc\u307f\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002')}catch(error){console.error(error);message('error: '+error.message);alert(error.message)}finally{input.disabled=false;input.value=''}}
window.AnatomyFigureSession={LABEL,state,importFiles,dataFor,pick};
})();
