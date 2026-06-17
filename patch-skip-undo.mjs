import fs from 'node:fs';

let app=fs.readFileSync('app.js','utf8');
const headOld='<div class="study-head"><div class="progress-track">';
const headNew='<div class="study-head"><button class="study-skip-btn" id="skipQuestionTop" type="button">スキップ</button><div class="progress-track">';
if(!app.includes(headOld))throw new Error('study head target not found');
app=app.replace(headOld,headNew);

const bindOld="const undo=document.getElementById('undoQuestion');if(undo)undo.onclick=undoLast;";
const bindNew="const skip=document.getElementById('skipQuestionTop');if(skip)skip.onclick=skipCurrent;const undo=document.getElementById('undoQuestion');if(undo)undo.onclick=undoLast;";
if(!app.includes(bindOld))throw new Error('undo binding target not found');
app=app.replace(bindOld,bindNew);

const inlineSkip='<button class="grade-btn grade-skip" id="skipQuestion"><b>スキップ</b><small>記録しない</small></button>';
if(!app.includes(inlineSkip))throw new Error('inline skip target not found');
app=app.replace(inlineSkip,'');

const inlineBind="document.getElementById('skipQuestion').onclick=skipCurrent;";
if(!app.includes(inlineBind))throw new Error('inline skip binding target not found');
app=app.replace(inlineBind,'');
fs.writeFileSync('app.js',app);

let index=fs.readFileSync('index.html','utf8');
index=index.replace('<script src="skip-position.js"></script>\n','');
fs.writeFileSync('index.html',index);

let sw=fs.readFileSync('sw.js','utf8');
sw=sw.replace(/const CACHE='[^']+';/,"const CACHE='anatomy-quiz-native-skip-undo-v18';");
sw=sw.replace("'./skip-position.js',",'');
fs.writeFileSync('sw.js',sw);

console.log('Native skip and undo wiring restored; legacy skip module removed.');
