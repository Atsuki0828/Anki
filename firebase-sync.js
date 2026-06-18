import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const STATE_KEY = 'ulq-state-v1';
const SETTINGS_KEY = 'ulq-settings-v1';
const SESSION_KEY = 'ulq-active-session-v2';
const META_KEY = 'ulq-cloud-meta-v1';
const LOCAL_CONFIG_KEY = 'ulq-firebase-config-v1';
const SYNC_KEYS = new Set([STATE_KEY, SETTINGS_KEY, SESSION_KEY]);
const DEFAULT_STATE = { items: {}, answered: 0, correct: 0, streak: 0, last: '' };
const DEFAULT_SETTINGS = { order: 'smart', showInput: true, largeText: false };

const nativeSetItem = Storage.prototype.setItem;
const nativeRemoveItem = Storage.prototype.removeItem;
let suspendStorageObserver = false;
let currentUser = null;
let auth = null;
let db = null;
let syncTimer = null;
let syncRunning = false;
let syncAgain = false;
let ui = {};

function parseJson(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function defaultMeta() {
  return {
    schemaVersion: 1,
    itemUpdatedAt: {},
    stateUpdatedAt: 0,
    settingsUpdatedAt: 0,
    sessionUpdatedAt: 0,
    updatedAt: 0,
  };
}

function loadMeta() {
  const stored = parseJson(localStorage.getItem(META_KEY), {});
  return {
    ...defaultMeta(),
    ...(stored && typeof stored === 'object' ? stored : {}),
    itemUpdatedAt: stored?.itemUpdatedAt && typeof stored.itemUpdatedAt === 'object'
      ? stored.itemUpdatedAt
      : {},
  };
}

function saveMeta(meta) {
  nativeSetItem.call(localStorage, META_KEY, JSON.stringify(meta));
}

function markMutation(key, oldValue, newValue) {
  const now = Date.now();
  const meta = loadMeta();
  meta.updatedAt = now;

  if (key === STATE_KEY) {
    const before = parseJson(oldValue, DEFAULT_STATE) || DEFAULT_STATE;
    const after = parseJson(newValue, DEFAULT_STATE) || DEFAULT_STATE;
    const oldItems = before.items || {};
    const newItems = after.items || {};
    const ids = new Set([...Object.keys(oldItems), ...Object.keys(newItems)]);
    for (const id of ids) {
      if (JSON.stringify(oldItems[id] ?? null) !== JSON.stringify(newItems[id] ?? null)) {
        meta.itemUpdatedAt[id] = now;
      }
    }
    meta.stateUpdatedAt = now;
  } else if (key === SETTINGS_KEY) {
    meta.settingsUpdatedAt = now;
  } else if (key === SESSION_KEY) {
    meta.sessionUpdatedAt = now;
  }

  saveMeta(meta);
  scheduleSync();
}

Storage.prototype.setItem = function patchedSetItem(key, value) {
  const oldValue = this === localStorage ? this.getItem(key) : null;
  const result = nativeSetItem.call(this, key, value);
  if (
    this === localStorage &&
    !suspendStorageObserver &&
    SYNC_KEYS.has(key) &&
    oldValue !== String(value)
  ) {
    markMutation(key, oldValue, String(value));
  }
  return result;
};

Storage.prototype.removeItem = function patchedRemoveItem(key) {
  const oldValue = this === localStorage ? this.getItem(key) : null;
  const result = nativeRemoveItem.call(this, key);
  if (this === localStorage && !suspendStorageObserver && SYNC_KEYS.has(key) && oldValue !== null) {
    markMutation(key, oldValue, null);
  }
  return result;
};

function validConfig(config) {
  return Boolean(
    config &&
    typeof config === 'object' &&
    config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.appId
  );
}

function getConfig() {
  if (validConfig(window.ANATOMY_FIREBASE_CONFIG)) return window.ANATOMY_FIREBASE_CONFIG;
  const stored = parseJson(localStorage.getItem(LOCAL_CONFIG_KEY), null);
  return validConfig(stored) ? stored : null;
}

function parseConfigInput(text) {
  const forbidden = /private_key|client_email|service_account/i;
  if (forbidden.test(text)) {
    throw new Error('サービスアカウント鍵は入力しないでください。WebアプリのfirebaseConfigだけを使用します。');
  }
  let value = text.trim();
  value = value.replace(/^\s*(?:const|let|var)\s+firebaseConfig\s*=\s*/i, '').replace(/;\s*$/, '');
  value = value.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
  value = value.replace(/'/g, '"');
  const parsed = JSON.parse(value);
  if (!validConfig(parsed)) throw new Error('apiKey、authDomain、projectId、appIdが必要です。');
  return parsed;
}

function installUi() {
  const resetButton = document.getElementById('resetBtn');
  if (!resetButton || document.getElementById('cloudSyncSection')) return;

  const section = document.createElement('section');
  section.id = 'cloudSyncSection';
  section.className = 'cloud-sync-section';
  section.innerHTML = `
    <div class="cloud-sync-head">
      <div><h3>Google同期</h3><p>学習進捗・設定・進行中のクイズを端末間で同期します。</p></div>
      <span id="cloudSyncDot" class="cloud-sync-dot" aria-hidden="true"></span>
    </div>
    <div id="cloudAccount" class="cloud-account"></div>
    <div id="cloudStatus" class="cloud-status" role="status">初期化中…</div>
    <div id="cloudActions" class="cloud-actions"></div>
    <details id="firebaseSetupPanel" class="firebase-setup-panel">
      <summary>Firebase接続設定</summary>
      <p>FirebaseコンソールのWebアプリ設定に表示される <code>firebaseConfig</code> だけを貼り付けます。秘密鍵は貼り付けないでください。</p>
      <textarea id="firebaseConfigInput" rows="8" spellcheck="false" placeholder="const firebaseConfig = { apiKey: '...', authDomain: '...', projectId: '...', appId: '...' };"></textarea>
      <button type="button" class="secondary-btn" id="saveFirebaseConfig">接続設定を保存</button>
    </details>`;
  resetButton.before(section);

  const settingsButton = document.getElementById('settingsBtn');
  const cloudButton = document.createElement('button');
  cloudButton.id = 'cloudStatusButton';
  cloudButton.className = 'icon-btn cloud-status-button';
  cloudButton.type = 'button';
  cloudButton.setAttribute('aria-label', 'Google同期');
  cloudButton.textContent = '☁';
  settingsButton.before(cloudButton);
  cloudButton.onclick = () => {
    const dialog = document.getElementById('settingsDialog');
    if (!dialog.open) dialog.showModal();
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  ui = {
    section,
    account: document.getElementById('cloudAccount'),
    status: document.getElementById('cloudStatus'),
    actions: document.getElementById('cloudActions'),
    dot: document.getElementById('cloudSyncDot'),
    topButton: cloudButton,
    setupPanel: document.getElementById('firebaseSetupPanel'),
    configInput: document.getElementById('firebaseConfigInput'),
    saveConfig: document.getElementById('saveFirebaseConfig'),
  };

  const storedConfig = parseJson(localStorage.getItem(LOCAL_CONFIG_KEY), null);
  if (storedConfig) ui.configInput.value = JSON.stringify(storedConfig, null, 2);
  ui.saveConfig.onclick = () => {
    try {
      const config = parseConfigInput(ui.configInput.value);
      nativeSetItem.call(localStorage, LOCAL_CONFIG_KEY, JSON.stringify(config));
      setStatus('接続設定を保存しました。再読み込みします。', 'ok');
      setTimeout(() => location.reload(), 300);
    } catch (error) {
      setStatus(error.message || String(error), 'error');
    }
  };
}

function setStatus(message, type = 'idle') {
  if (!ui.status) return;
  ui.status.textContent = message;
  ui.status.dataset.type = type;
  ui.dot.dataset.type = type;
  ui.topButton.dataset.type = type;
}

function formatTime(timestamp) {
  if (!timestamp) return '未同期';
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(timestamp));
}

function renderSignedOut(configured) {
  ui.account.innerHTML = configured
    ? '<div><strong>未ログイン</strong><small>Googleアカウントでログインすると同期が始まります。</small></div>'
    : '<div><strong>Firebase未設定</strong><small>下の接続設定を完了するとGoogleログインを使用できます。</small></div>';
  ui.actions.innerHTML = configured
    ? '<button type="button" class="google-signin-btn" id="googleSignIn">G&nbsp; Googleでログイン</button>'
    : '';
  ui.setupPanel.open = !configured;
  if (configured) {
    document.getElementById('googleSignIn').onclick = beginGoogleSignIn;
    setStatus('ログインすると、この端末の進捗とクラウドを安全に統合します。', 'idle');
  } else {
    setStatus('Firebaseプロジェクトの接続情報が必要です。', 'warning');
  }
}

function renderSignedIn(user) {
  const photo = user.photoURL
    ? `<img src="${user.photoURL.replace(/"/g, '&quot;')}" alt="">`
    : '<span class="cloud-avatar-fallback">G</span>';
  ui.account.innerHTML = `${photo}<div><strong>${escapeHtml(user.displayName || 'Googleユーザー')}</strong><small>${escapeHtml(user.email || '')}</small></div>`;
  ui.actions.innerHTML = `
    <button type="button" class="primary-btn" id="syncNowButton">今すぐ同期</button>
    <button type="button" class="secondary-btn" id="cloudSignOut">ログアウト</button>`;
  document.getElementById('syncNowButton').onclick = () => runSync({ manual: true });
  document.getElementById('cloudSignOut').onclick = async () => {
    await firebaseSignOut(auth);
    setStatus('ログアウトしました。端末内の進捗は残っています。', 'idle');
  };
  ui.setupPanel.open = false;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function localSnapshot() {
  return normalizeSnapshot({
    schemaVersion: 1,
    state: parseJson(localStorage.getItem(STATE_KEY), clone(DEFAULT_STATE)),
    settings: parseJson(localStorage.getItem(SETTINGS_KEY), clone(DEFAULT_SETTINGS)),
    session: parseJson(localStorage.getItem(SESSION_KEY), null),
    meta: loadMeta(),
  });
}

function normalizeSnapshot(value = {}) {
  const state = value.state && typeof value.state === 'object' ? clone(value.state) : clone(DEFAULT_STATE);
  state.items = state.items && typeof state.items === 'object' ? state.items : {};
  const meta = {
    ...defaultMeta(),
    ...(value.meta && typeof value.meta === 'object' ? clone(value.meta) : {}),
  };
  meta.itemUpdatedAt = meta.itemUpdatedAt && typeof meta.itemUpdatedAt === 'object' ? meta.itemUpdatedAt : {};
  return {
    schemaVersion: 1,
    state,
    settings: value.settings && typeof value.settings === 'object' ? clone(value.settings) : clone(DEFAULT_SETTINGS),
    session: value.session && typeof value.session === 'object' ? clone(value.session) : null,
    meta,
  };
}

function itemRank(item) {
  if (!item) return [-1, -1, -1, -1];
  return [Number(item.seen) || 0, (Number(item.ok) || 0) + (Number(item.ng) || 0), Number(item.level) || 0, Number(item.due) || 0];
}

function preferItem(localItem, remoteItem) {
  const left = itemRank(localItem);
  const right = itemRank(remoteItem);
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? localItem : remoteItem;
  }
  return localItem || remoteItem || null;
}

function mergeSnapshots(localValue, remoteValue) {
  const local = normalizeSnapshot(localValue);
  const remote = normalizeSnapshot(remoteValue);
  const localItems = local.state.items || {};
  const remoteItems = remote.state.items || {};
  const itemIds = new Set([...Object.keys(localItems), ...Object.keys(remoteItems), ...Object.keys(local.meta.itemUpdatedAt), ...Object.keys(remote.meta.itemUpdatedAt)]);
  const items = {};
  const itemUpdatedAt = {};

  for (const id of itemIds) {
    const localTime = Number(local.meta.itemUpdatedAt[id]) || 0;
    const remoteTime = Number(remote.meta.itemUpdatedAt[id]) || 0;
    const hasLocal = Object.prototype.hasOwnProperty.call(localItems, id);
    const hasRemote = Object.prototype.hasOwnProperty.call(remoteItems, id);
    let selected = null;

    if (localTime > remoteTime) selected = hasLocal ? localItems[id] : null;
    else if (remoteTime > localTime) selected = hasRemote ? remoteItems[id] : null;
    else if (hasLocal || hasRemote) selected = preferItem(localItems[id], remoteItems[id]);

    if (selected) items[id] = clone(selected);
    itemUpdatedAt[id] = Math.max(localTime, remoteTime);
  }

  const localStateNewer = Number(local.meta.stateUpdatedAt) >= Number(remote.meta.stateUpdatedAt);
  const stateSource = localStateNewer ? local.state : remote.state;
  const settingsSource = Number(local.meta.settingsUpdatedAt) >= Number(remote.meta.settingsUpdatedAt) ? local.settings : remote.settings;

  const localSessionTime = Math.max(Number(local.meta.sessionUpdatedAt) || 0, Number(local.session?.updatedAt) || 0);
  const remoteSessionTime = Math.max(Number(remote.meta.sessionUpdatedAt) || 0, Number(remote.session?.updatedAt) || 0);
  const session = localSessionTime >= remoteSessionTime ? local.session : remote.session;

  const itemValues = Object.values(items);
  const answered = itemValues.reduce((sum, value) => sum + (Number(value.seen) || 0), 0);
  const correct = itemValues.reduce((sum, value) => sum + (Number(value.ok) || 0), 0);

  return normalizeSnapshot({
    state: {
      items,
      answered,
      correct,
      streak: Number(stateSource.streak) || 0,
      last: String(stateSource.last || ''),
    },
    settings: settingsSource,
    session,
    meta: {
      schemaVersion: 1,
      itemUpdatedAt,
      stateUpdatedAt: Math.max(Number(local.meta.stateUpdatedAt) || 0, Number(remote.meta.stateUpdatedAt) || 0),
      settingsUpdatedAt: Math.max(Number(local.meta.settingsUpdatedAt) || 0, Number(remote.meta.settingsUpdatedAt) || 0),
      sessionUpdatedAt: Math.max(Number(local.meta.sessionUpdatedAt) || 0, Number(remote.meta.sessionUpdatedAt) || 0),
      updatedAt: Math.max(Number(local.meta.updatedAt) || 0, Number(remote.meta.updatedAt) || 0),
    },
  });
}

function comparable(snapshot) {
  return JSON.stringify(normalizeSnapshot(snapshot));
}

function applyLocal(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  suspendStorageObserver = true;
  try {
    nativeSetItem.call(localStorage, STATE_KEY, JSON.stringify(normalized.state));
    nativeSetItem.call(localStorage, SETTINGS_KEY, JSON.stringify(normalized.settings));
    if (normalized.session) nativeSetItem.call(localStorage, SESSION_KEY, JSON.stringify(normalized.session));
    else nativeRemoveItem.call(localStorage, SESSION_KEY);
    saveMeta(normalized.meta);
  } finally {
    suspendStorageObserver = false;
  }
}

async function runSync({ manual = false } = {}) {
  if (!currentUser || !db) return;
  if (syncRunning) {
    syncAgain = true;
    return;
  }
  syncRunning = true;
  setStatus(manual ? '同期しています…' : '変更を同期しています…', 'syncing');

  try {
    const reference = doc(db, 'users', currentUser.uid);
    const local = localSnapshot();
    const remoteDocument = await getDoc(reference);
    const remote = remoteDocument.exists() ? normalizeSnapshot(remoteDocument.data()) : null;
    const merged = remote ? mergeSnapshots(local, remote) : local;
    const localChanged = comparable(local) !== comparable(merged);
    const remoteChanged = !remote || comparable(remote) !== comparable(merged);

    if (remoteChanged) {
      await setDoc(reference, {
        ...merged,
        ownerUid: currentUser.uid,
        serverUpdatedAt: serverTimestamp(),
      });
    }

    if (localChanged) {
      applyLocal(merged);
      setStatus('クラウドの進捗を統合しました。画面を更新します。', 'ok');
      setTimeout(() => location.reload(), 350);
      return;
    }

    const syncedAt = Date.now();
    const meta = loadMeta();
    meta.lastSuccessfulSyncAt = syncedAt;
    saveMeta(meta);
    setStatus(`同期済み：${formatTime(syncedAt)}`, 'ok');
  } catch (error) {
    console.error('Cloud sync failed', error);
    setStatus(friendlyError(error), 'error');
  } finally {
    syncRunning = false;
    if (syncAgain) {
      syncAgain = false;
      setTimeout(() => runSync(), 100);
    }
  }
}

function friendlyError(error) {
  const code = error?.code || '';
  if (code.includes('unauthorized-domain')) return 'このGitHub PagesドメインがFirebase Authenticationで許可されていません。';
  if (code.includes('operation-not-allowed')) return 'Firebase AuthenticationでGoogleログインを有効にしてください。';
  if (code.includes('permission-denied')) return 'Firestoreのセキュリティルールが未設定、またはアクセスが拒否されています。';
  if (code.includes('network-request-failed') || !navigator.onLine) return 'オフラインです。進捗は端末に保存され、オンライン復帰後に同期されます。';
  if (code.includes('popup-closed-by-user')) return 'ログイン画面が閉じられました。';
  return `同期エラー：${error?.message || String(error)}`;
}

function scheduleSync() {
  if (!currentUser) return;
  clearTimeout(syncTimer);
  setStatus('未同期の変更があります…', 'pending');
  syncTimer = setTimeout(() => runSync(), 1400);
}

async function beginGoogleSignIn() {
  if (!auth) return;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  setStatus('Googleログインを開いています…', 'syncing');
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/web-storage-unsupported') {
      await signInWithRedirect(auth, provider);
      return;
    }
    setStatus(friendlyError(error), 'error');
  }
}

async function initializeCloudSync() {
  installUi();
  const config = getConfig();
  if (!config) {
    renderSignedOut(false);
    return;
  }

  try {
    const app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    await setPersistence(auth, browserLocalPersistence);

    onAuthStateChanged(auth, async user => {
      currentUser = user;
      if (!user) {
        renderSignedOut(true);
        return;
      }
      renderSignedIn(user);
      setStatus('ログイン済み。進捗を照合しています…', 'syncing');
      await runSync();
    });

    addEventListener('online', () => currentUser && runSync());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && currentUser) runSync();
    });
  } catch (error) {
    console.error('Firebase initialization failed', error);
    renderSignedOut(true);
    setStatus(`Firebase初期化エラー：${error.message || error}`, 'error');
  }
}

initializeCloudSync();
