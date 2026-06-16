import fs from 'node:fs';
const report=JSON.parse(fs.readFileSync('heavy2024-match-report.json','utf8'));
const lines=report.mismatches.map((r,index)=>[
  index+1,
  `S${r.source_id}`,
  `Q${r.best.id}`,
  `score=${r.best.score}`,
  `margin=${r.margin}`,
  `資料問:${r.source_question}`,
  `アプリ問:${r.best.question}`,
  `資料答:${r.source_answer}`,
  `アプリ答:${r.best.answer}`
].join('\t'));
fs.writeFileSync('heavy2024-mismatches.tsv',lines.join('\n')+'\n');
console.log(`Wrote ${lines.length} mismatch candidates.`);
