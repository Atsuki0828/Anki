document.getElementById('app').outerHTML = `
<div id="app" class="app-shell">
  <header class="topbar">
    <button class="icon-btn" id="homeBtn" aria-label="ホーム">⌂</button>
    <div class="brand"><div class="brand-mark">AN</div><div><strong>解剖学クイズ</strong><span>全519問・日英羅対訳</span></div></div>
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
      <p>各GoodNotesファイルは初回に一度だけ読み込んでください。対応図を圧縮してこの端末に保存し、次回以降は自動表示します。</p>
      <label class="figure-import-button">GoodNotesファイルを選択<input id="goodnotesImportInput" type="file" accept=".goodnotes,.zip,application/zip" multiple></label>
      <div id="figureImportStatus" class="figure-import-status">保存済みの図を確認中…</div>
    </section>
    <button type="button" class="danger-btn" id="resetBtn">学習履歴をすべて消去</button>
    <p class="fineprint">日本語回答はアップロード資料に準拠し、その下に英語名・ラテン語名を表示します。資料との表現差や誤記が疑われる項目は「要確認」と表示します。</p>
  </form>
</dialog>`;
