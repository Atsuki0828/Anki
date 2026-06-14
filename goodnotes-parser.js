(() => {
'use strict';
const R={upper:[1,121],lower:[122,241],trunk:[242,384],pelvis:[385,520]};
const N={upper:121,lower:120,trunk:143,pelvis:135};
function vi(b,p){let v=0,m=1,n=0;while(p<b.length&&n<10){const x=b[p++];v+=(x&127)*m;if(x<128)return[v,p];m*=128;n++}throw Error('invalid-varint')}
function fs(b){const o=[];let p=0;while(p<b.length){try{let k;[k,p]=vi(b,p);const f=Math.floor(k/8),w=k&7;let v;if(w===0)[v,p]=vi(b,p);else if(w===1){if(p+8>b.length)break;v=b.slice(p,p+8);p+=8}else if(w===2){let n;[n,p]=vi(b,p);if(!Number.isFinite(n)||n<0||p+n>b.length)break;v=b.slice(p,p+n);p+=n}else if(w===5){if(p+4>b.length)break;v=b.slice(p,p+4);p+=4}else break;o.push([f,w,v])}catch{break}}return o}
function ds(b){const o=[];let p=0;while(p<b.length){try{let n,q;[n,q]=vi(b,p);if(!Number.isFinite(n)||n<0||q+n>b.length)break;o.push(b.slice(q,q+n));p=q+n}catch{break}}return o}
const tx=b=>{try{return new TextDecoder().decode(b)}catch{return''}};
function st(b){for(const[f,w,v]of fs(b))if(f===3&&w===2)return tx(v);return''}
function ni(b,names){let seq=Number.MAX_SAFE_INTEGER,refs=[];for(const r of ds(b))for(const[f,w,v]of fs(r)){if(f===9&&w===0&&Number.isFinite(v))seq=Math.min(seq,v);if(f===7&&w===2){const id=tx(v);if(names.has(id))refs.push(id)}}return{seq,refs}}
function src(name,z){if(/上肢/.test(name))return'upper';if(/下肢/.test(name))return'lower';if(/背部|胸部|腹部/.test(name))return'trunk';if(/骨盤|頭頸|中枢/.test(name))return'pelvis';const n=Object.keys(z.files).filter(x=>/^notes\/[^/]+$/.test(x)).length;return({244:'upper',240:'lower',286:'trunk',272:'pelvis'})[n]||null}
function qi(t,s){const m=t.match(/^\s*(\d{1,3})/);if(!m)return null;const id=+m[1],[a,z]=R[s];if(id<a||id>z||id===429)return null;return/(答えよ|なんというか|何というか)/.test(t)?id:null}
async function build(zip,source,progress=()=>{}){const names=new Set(Object.keys(zip.files).filter(x=>/^attachments\/[^/]+$/.test(x)).map(x=>x.slice(12))),pages=[],paths=Object.keys(zip.files).filter(x=>/^notes\/[^/]+$/.test(x));for(let i=0;i<paths.length;i++){progress(i+1,paths.length);const p=paths[i],id=p.slice(6),nb=await zip.file(p).async('uint8array'),sf=zip.file(`search/${id}`),text=sf?st(await sf.async('uint8array')):'';pages.push({...ni(nb,names),text,qid:qi(text,source)})}pages.sort((a,b)=>a.seq-b.seq);const q=pages.filter(x=>x.qid!==null),a=pages.filter(x=>x.qid===null&&x.text.trim());if(q.length!==N[source]||a.length!==N[source])throw Error(`page-map:${q.length}/${a.length}`);if(source==='upper')a.splice(0,4,a[3],a[0],a[1],a[2]);const map={};q.forEach((x,i)=>map[x.qid]=a[i].refs);return map}
window.AnatomyGoodNotes={sourceFor:src,build};
})();
