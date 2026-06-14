document.getElementById('app').outerHTML = `
<div id="app" class="app-shell">
  <header class="topbar">
    <button class="icon-btn" id="homeBtn" aria-label="ホーム">⌂</button>
    <div class="brand"><div class="brand-mark">AN</div><div><strong>解剖学クイズ</strong><span>全519問・資料準拠</span></div></div>
    <button class="icon-btn" id="settingsBtn" aria-label="設定">⚙</button>
  </header>
  <main id="main"></main>
  <nav class="bottom-nav" aria-label="メインナビゲーション">
    <button data-view="home" class="nav-item active"><span>⌂</span><small>ホーム</small></button>
    <button data-view="study" class="nav-item"><span>◉</span><small>学習</small></button>
    <button data-view="list" class="nav-item"><span>☷</span><small>問題一覧</small></button>
    <button data-view="stats" class="nav-item"><span>▥</span><small>記録</small></button>
  </nav>
</div>
<dialog id="settingsDialog" class="sheet">
  <form method="dialog">
    <div class="sheet-head"><h2>設定</h2><button class="icon-btn">×</button></div>
    <label class="setting-row"><span>問題順</span><select id="orderSetting"><option value="smart">弱点優先</option><option value="random">ランダム</option><option value="number">番号順</option></select></label>
    <label class="setting-row"><span>入力欄を表示</span><input id="inputSetting" type="checkbox" checked></label>
    <label class="setting-row"><span>問題文を大きく</span><input id="largeTextSetting" type="checkbox"></label>
    <section class="figure-import">
      <h3>元資料の図</h3>
      <p>GoodNotesファイルを読み込むと、答えと一緒に対応図を表示します。ページを閉じた後は再読込が必要です。</p>
      <label class="figure-import-button">GoodNotesファイルを選択<input id="goodnotesImportInput" type="file" accept=".goodnotes,.zip,application/zip" multiple></label>
      <div id="figureImportStatus" class="figure-import-status">まだ図を読み込んでいません。</div>
    </section>
    <button type="button" class="danger-btn" id="resetBtn">学習履歴をすべて消去</button>
    <p class="fineprint">回答はアップロード資料の記載に準拠しています。授業資料との表現差や誤記が疑われる項目は「要確認」と表示します。</p>
  </form>
</dialog>`;
