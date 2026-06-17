import fs from 'node:fs';

const path='app.js';
let src=fs.readFileSync(path,'utf8');

const headOld='<div class="study-head"><div class="progress-track">';
const headNew='<div class="study-head"><button class="study-skip-btn" id="skipQuestionTop" type="button">スキップ</button><div class="progress-track">';
if(!src.includes(headOld))throw new Error('study head target not found');
src=src.replace(headOld,headNew);

const bindOld="const undo=document.getElementById('undoQuestion');if(undo)undo.onclick=undoLast;";
const bindNew="const skip=document.getElementById('skipQuestionTop');if(skip)skip.onclick=skipCurrent;const undo=document.getElementById('undoQuestion');if(undo)undo.onclick=undoLast;";
if(!src.includes(bindOld))throw new Error('undo binding target not found');
src=src.replace(bindOld,bindNew);

const inlineSkip='<button class="grade-btn grade-skip" id="skipQuestion"><b>スキップ</b><small>記録しない</small></button>';
if(!src.includes(inlineSkip))throw new Error('inline skip target not found');
src=src.replace(inlineSkip,'');

const inlineBind="document.getElementById('skipQuestion').onclick=skipCurrent;";
if(!src.includes(inlineBind))throw new Error('inline skip binding target not found');
src=src.replace(inlineBind,'');

fs.writeFileSync(path,src);
console.log('Native skip and undo wiring restored.');
