(() => {
'use strict';
const R={upper:[1,121],lower:[122,241],trunk:[242,384],pelvis:[385,520]};
const N={upper:121,lower:120,trunk:143,pelvis:135};
function vi(b,p){let v=0,s=0;while(p<b.length){const x=b[p++];v|=(x&127)<<s;if(x<128)return[v>>>0,p];s+=7;if(s>35)throw Error('varint')}throw Error('eof')}
function fs(b){const o=[];let p=0;while(p<b.length){let k;[k,p]=vi(b,p);const f=k>>>3,w=k&7;let v;if(w===0)[v,p]=vi(b,p);else if(w===1){v=b.slice(p,p+8);p+=8}else if(w===2){let n;[n,p]=vi(b,p);v=b.slice(p,p+n);p+=n}else if(w===5){v=b.slice(p,p+4);p+=4}else break;o.push([f,w,v])}return o}
function ds(b){const o=[];let p=0;while(p<b.length){let n,q;try{[n,q]=vi(b,p)}catch{break}if(q+n>b.length)break;o.push(b.slice(q,q+n));p=q+n}return o}
const tx=b=>{try{return new TextDecoder().decode(b)}catch{return''}};
function st(b){for(const[f,w,v]of fs(b))if(f===3&&w===2)return tx(v);return''}
function ni(b,names){let seq=Number.MAX_SAFE_INTEGER,refs=[];for(const r of ds(b))for(const[f,w,v]of fs(r)){if(f===9&&w===0)seq=Math.min(seq,v);if(f===7&&w===2){const id=tx(v);if(names.has(id))refs.push(id)}}return{seq,refs}}
function src(name,z){if(/\u4e0a\u80a2/.test(name))return'upper';if(/\u4e0b\u80a2/.test(name))return'lower';if(/\u80cc\u90e8|\u80f8\u90e8|\u8179\u90e8/.test(name))return'trunk';if(/\u9aa8\u76e4|\u982d\u9838|\u4e2d\u67a2/.test(name))return'pelvis';const n=Object.keys(z.files).filter(x=>/^notes\/[^/]+$/.test(x)).length;return({244:'upper',240:'lower',286:'trunk',272:'pelvis'})[n]||null}
function qi(t,s){const m=t.match(/^\s*(\d{1,3})/);if(!m)return null;const id=+m[1],[a,z]=R[s];if(id<a||id>z||id===429)return null;return/(\u7b54\u3048\u3088|\u306a\u3093\u3068\u3044\u3046\u304b|\u4f55\u3068\u3044\u3046\u304b)/.test(t)?id:null}
async function build(zip,source,progress=()=>{}){const names=new Set(Object.keys(zip.files).filter(x=>/^attachments\/[^/]+$/.test(x)).map(x=>x.slice(12))),pages=[],paths=Object.keys(zip.files).filter(x=>/^notes\/[^/]+$/.test(x));for(let i=0;i<paths.length;i++){progress(i+1,paths.length);const p=paths[i],id=p.slice(6),nb=await zip.file(p).async('uint8array'),sf=zip.file(`search/${id}`),text=sf?st(await sf.async('uint8array')):'';pages.push({...ni(nb,names),text,qid:qi(text,source)})}pages.sort((a,b)=>a.seq-b.seq);const q=pages.filter(x=>x.qid!==null),a=pages.filter(x=>x.qid===null&&x.text.trim());if(q.length!==N[source]||a.length!==N[source])throw Error(`page-map:${q.length}/${a.length}`);if(source==='upper')a.splice(0,4,a[3],a[0],a[1],a[2]);const map={};q.forEach((x,i)=>map[x.qid]=a[i].refs);return map}
window.AnatomyGoodNotes={sourceFor:src,build};
})();
