# Googleログイン・進捗同期の初期設定

このアプリは Firebase Authentication と Cloud Firestore を使って、学習状況・設定・進行中セッションをGoogleアカウント単位で同期します。GoodNotesから取り込んだ図は容量が大きいため、各端末内に保存します。

## 1. Firebaseプロジェクトを作成

1. Firebase Consoleで新しいプロジェクトを作成します。
2. 「アプリを追加」からWebアプリを登録します。
3. 表示された `firebaseConfig` を控えます。

必要な項目は主に `apiKey`、`authDomain`、`projectId`、`appId` です。Firebase Webアプリの設定値は公開用の識別情報です。サービスアカウントJSON、`private_key`、`client_email` は使用しません。

## 2. Googleログインを有効化

1. Firebase Console → Authentication → Sign-in method を開きます。
2. Googleを有効にします。
3. Authentication → Settings → Authorized domains に `atsuki0828.github.io` を追加します。

独自ドメインで公開する場合は、そのドメインも追加します。

## 3. Cloud Firestoreを作成

1. Firebase Console → Firestore Database → データベースを作成します。
2. Rules画面へ、このリポジトリの `firestore.rules` の内容を貼り付けて公開します。

同期データは `users/{uid}/quiz/progress` に保存されます。ルールでは、ログイン中のユーザーが自分のUID配下だけを読み書きできます。

## 4. アプリへ接続設定を登録

### アプリ内から設定する

1. GitHub Pagesのアプリを開きます。
2. 設定 → Googleアカウント同期 → Firebase接続設定を開きます。
3. Firebase Consoleに表示された `firebaseConfig` を貼り付けます。
4. 「接続設定を保存」を押します。

この方法では設定がその端末だけに保存されます。

### リポジトリへ固定する

`firebase-config.js` の空欄をFirebase Consoleの値で埋めます。複数端末で毎回接続設定を貼り付ける必要がなくなるため、通常はこちらを推奨します。

## 5. 動作確認

1. 設定画面で「Googleでログイン」を押します。
2. 問題を1問評価します。
3. 同期状態が「同期済み」になることを確認します。
4. 別端末で同じGoogleアカウントへログインし、進捗が反映されることを確認します。

## 同期対象

- 問題ごとの学習状態
- 正解・不正解回数
- 復習期限
- 連続学習日数
- 問題順などの設定
- 進行中のクイズセッション

問題ごとの更新時刻を使って統合するため、端末全体を単純に上書きする方式ではありません。オフライン中は端末へ保存し、オンライン復帰後に同期します。
