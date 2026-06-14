(() => {
'use strict';
const LABEL={upper:'\u4e0a\u80a2',lower:'\u4e0b\u80a2',trunk:'\u80cc\u90e8\u30fb\u80f8\u90e8\u30fb\u8179\u90e8',pelvis:'\u9aa8\u76e4\u90e8\u30fb\u982d\u9838\u90e8\u30fb\u4e2d\u67a2\u795e\u7d4c\u7cfb'};
const state={map:{},files:{},loaded:{}};
async function importFiles(files,progress=()=>{}){if(!window.JSZip)throw Error('JSZip unavailable');for(const file of files){progress(file.name);const zip=await JSZip.loadAsync(await file.arrayBuffer()),source=AnatomyGoodNotes.sourceFor(file.name,zip);if(!source)throw Error('unknown source');const map=await AnatomyGoodNotes.build(zip,source,(i,n)=>progress(`${LABEL[source]} ${i}/${n}`));Object.assign(state.map,map);state.files[source]=zip;state.loaded[source]=file.name}return Object.keys(state.loaded).length}
function source(id){if(id<=121)return'upper';if(id<=241)return'lower';if(id<=384)return'trunk';return'pelvis'}
async function dataFor(id){const zip=state.files[source(id)],keys=state.map[id]||[],out=[];if(!zip)return out;for(const key of keys){const entry=zip.file('attachments/'+key);if(entry)out.push(await entry.async('base64'))}return out}
window.AnatomyFigureSession={LABEL,state,importFiles,dataFor};
})();
