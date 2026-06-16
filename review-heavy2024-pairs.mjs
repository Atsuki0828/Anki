import fs from 'node:fs';
const report=JSON.parse(fs.readFileSync('heavy2024-match-report.json','utf8'));
const rows=report.likely.map(r=>[
  `S${r.source_id}`,
  `Q${r.best.id}`,
  `score=${r.best.score}`,
  r.answer_same?'SAME':'DIFF',
  `資料問:${r.source_question}`,
  `アプリ問:${r.best.question}`,
  `資料答:${r.source_answer}`,
  `アプリ答:${r.best.answer}`
].join('\t'));
fs.writeFileSync('heavy2024-reviewed-pairs.tsv',rows.join('\n')+'\n');
