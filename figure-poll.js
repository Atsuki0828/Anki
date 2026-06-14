(() => {
let busy=false;
setInterval(async()=>{
  const input=document.getElementById('goodnotesImportInput');
  const status=document.getElementById('figureImportStatus');
  if(!input||busy||!input.files||input.files.length===0)return;
  busy=true;
  try{
    await AnatomyFigureSession.importFiles(Array.from(input.files),text=>{if(status)status.textContent=text});
    if(status)status.textContent='図の読み込みが完了しました。';
    document.dispatchEvent(new Event('anatomy-figures-loaded'));
  }catch(error){
    console.error(error);
    if(status)status.textContent='読み込みエラー: '+error.message;
  }finally{
    input.value='';
    busy=false;
  }
},700);
})();
