document.getElementById('app').outerHTML = `
<div id="app" class="app-shell">
  <header class="topbar">
    <button class="icon-btn" id="homeBtn" aria-label="ホーム">⌂</button>
    <div class="brand"><div class="brand-mark">AN</div><div><strong>反復暗記アプリ</strong><span>解剖学クイズ・自作問題</span></div></div>
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
    <section class="cloud-sync-panel">
      <div class="cloud-sync-head"><div><h3>Googleアカウント同期</h3><p id="cloudSyncUser">未ログイン・端末保存のみ</p></div><span id="cloudSyncStatus" data-state="idle">端末保存のみ</span></div>
      <p>ログインすると、学習状況・設定・進行中のクイズを端末間で同期します。元資料の図は端末内保存のままです。</p>
      <div class="cloud-sync-actions">
        <button type="button" class="google-login-btn" id="cloudLoginBtn">Googleでログイン</button>
        <button type="button" class="secondary-btn" id="cloudSyncNowBtn" hidden>今すぐ同期</button>
        <button type="button" class="text-btn" id="cloudLogoutBtn" hidden>ログアウト</button>
      </div>
      <details class="cloud-setup" id="cloudSetupDetails">
        <summary>Firebase接続設定</summary>
        <p>FirebaseコンソールのWebアプリ設定に表示される <code>firebaseConfig</code> だけを貼り付けます。サービスアカウント秘密鍵は貼り付けないでください。</p>
        <textarea id="cloudConfigInput" rows="8" spellcheck="false" placeholder="const firebaseConfig = { apiKey: '...', authDomain: '...', projectId: '...', appId: '...' };"></textarea>
        <div class="cloud-setup-actions">
          <button type="button" class="secondary-btn" id="cloudSaveConfigBtn">接続設定を保存</button>
          <button type="button" class="text-btn" id="cloudClearConfigBtn">端末設定を削除</button>
        </div>
      </details>
    </section>
    <label class="setting-row"><span>問題順</span><select id="orderSetting"><option value="smart">弱点優先</option><option value="random">ランダム</option><option value="number">番号順</option></select></label>
    <label class="setting-row"><span>入力欄を表示</span><input id="inputSetting" type="checkbox" checked></label>
    <label class="setting-row"><span>問題文を大きく</span><input id="largeTextSetting" type="checkbox"></label>
    <section class="figure-import">
      <h3>元資料の図</h3>
      <p>各GoodNotesファイルは初回に一度だけ読み込んでください。対応図を圧縮してこの端末に保存し、次回以降は自動表示します。</p>
      <label class="figure-import-button">GoodNotesファイルを選択<input id="goodnotesImportInput" type="file" accept=".goodnotes,.zip,application/zip" multiple></label>
      <div id="figureImportStatus" class="figure-import-status">保存済みの図を確認中…</div>
    </section>
    <button type="button" class="secondary-btn" id="forceReloadBtn" style="width:100%;margin:10px 0 0">強制リロード</button>
    <div id="forceReloadStatus" class="figure-import-status">キャッシュだけを削除して再読み込みします。学習履歴・自作問題は消えません。</div>
    <button type="button" class="danger-btn" id="resetBtn">学習履歴をすべて消去</button>
    <p class="fineprint">日本語回答はアップロード資料に準拠し、その下に英語名・ラテン語名を表示します。資料との表現差や誤記が疑われる項目は「要確認」と表示します。</p>
    <p class="fineprint">Ver. 2026.06.24-3</p>
  </form>
</dialog>`;