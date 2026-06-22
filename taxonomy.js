(() => {
'use strict';
const GROUPS=[
  {id:'upper',name:'上肢',description:'肩甲帯から手まで',min:1,max:121},
  {id:'lower',name:'下肢',description:'股関節から足部まで',min:122,max:241},
  {id:'trunk',name:'背部・胸部・腹部',description:'脊柱・胸郭・胸腹部臓器',min:242,max:384},
  {id:'pelvis',name:'骨盤部',description:'骨盤・会陰・生殖器',min:385,max:426},
  {id:'headneck',name:'頭頸部',description:'頭部・頸部・感覚器',min:427,max:510},
  {id:'cns',name:'中枢神経系',description:'脳神経・脳血管',min:511,max:520},
  {id:'innervation',name:'支配神経',description:'筋肉ごとの支配神経 一問一答',min:1001,max:1152},
  {id:'custom',name:'自作問題',description:'自分で追加した暗記カード',min:1000000000000,max:9007199254740991}
];
const LOWER=[
  ['関節・靭帯・足弓',122,140],['寛骨筋・殿部',141,156],['大腿・膝窩',157,179],['下腿・筋膜・支帯',180,202],
  ['足部の筋',203,216],['運動作用',217,229],['血管・リンパ',230,236],['神経',237,241]
];
const TRUNK=[
  ['脊柱・背部',242,256],['胸郭・胸壁・横隔膜',257,284],['呼吸器・食道',285,297],['心臓・心膜',298,307],
  ['縦隔・胸部脈管神経',308,324],['腹壁・鼠径部',325,341],['腹部臓器・腹膜',342,367],['後腹膜・腹部脈管神経',368,384]
];
const PELVIS=[
  ['骨盤・直腸',385,398],['男性・女性生殖器',399,408],['骨盤底・会陰・外性器',409,418],['骨盤の血管・神経',419,426]
];
const HEADNECK=[
  ['顎関節・顔面筋・頸筋',427,445],['頸部三角・筋膜',446,458],['頭皮・眼窩',459,471],
  ['眼球・耳・鼻',472,477],['口腔・舌・咽頭',478,486],['喉頭・甲状腺',487,495],['頭頸部の血管・リンパ・神経',496,510]
];
const CNS=[['脳神経',511,511],['脳動脈・脳静脈・静脈洞',512,520]];
function rangeLabel(id,list){const row=list.find(([,a,b])=>id>=a&&id<=b);return row?row[0]:'その他'}
function majorFor(id){return GROUPS.find(g=>id>=g.min&&id<=g.max)||GROUPS[0]}
function meta(q){
  const major=majorFor(q.id);let sub='その他';
  if(major.id==='upper')sub=q.category||'上肢総論';
  else if(major.id==='lower')sub=rangeLabel(q.id,LOWER);
  else if(major.id==='trunk')sub=rangeLabel(q.id,TRUNK);
  else if(major.id==='pelvis')sub=rangeLabel(q.id,PELVIS);
  else if(major.id==='headneck')sub=rangeLabel(q.id,HEADNECK);
  else if(major.id==='cns')sub=rangeLabel(q.id,CNS);
  else if(major.id==='innervation')sub=q.category||'筋の支配神経';
  else if(major.id==='custom')sub=q.category||'自作';
  return{majorId:major.id,major:major.name,sub};
}
function build(questionBank){
  return GROUPS.map(group=>{
    const questions=questionBank.filter(q=>meta(q).majorId===group.id);
    const subs=[...new Set(questions.map(q=>meta(q).sub))].map(name=>({name,questions:questions.filter(q=>meta(q).sub===name)}));
    return{...group,questions,subs};
  });
}
window.AnatomyTaxonomy={GROUPS,meta,build};
})();
