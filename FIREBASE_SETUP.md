# Googleログイン・進捗同期の初期設定

このアプリは Firebase Authentication と Cloud Firestore を使って、学習状況・設定・進行中セッションをGoogleアカウント単位で同期します。

## 1. Firebaseプロジェクトを作成

1. Firebaseコンソールで新しいプロジェクトを作成する。
2. 「アプリを追加」から Web アプリを登録する。
3. 表示された `firebaseConfig` のうち、`apiKey`、`authDomain`、`projectId`、`appId` を `firebase-config.js` に貼り付ける。

## 2. Googleログインを有効化

Firebase Console → Authentication → Sign-in method → Google を有効化する。

Authentication → Settings → Authorized domains に、GitHub Pagesで使用しているドメインを追加する。

- `atsuki0828.github.io`

独自ドメインを使う場合は、そのドメインも追加する。

## 3. Firestoreを作成

Firebase Console → Firestore Database → データベースを作成する。

作成後、Rules画面へ `firestore.rules` の内容を貼り付けて公開する。

このルールでは、各ユーザーは自分のUID配下にある進捗データだけを読み書きできます。

## 4. 公開後の確認

1. GitHub Pagesを開く。
2. 設定画面を開く。
3. 「Googleでログイン」を押す。
4. 学習状態を変更する。
5. 別端末で同じGoogleアカウントへログインし、進捗が同期されることを確認する。

## 同期対象

- 問題ごとの学習状態
- 正解・不正解回数
- 復習期限
- 連続学習日数
- 問題順などの設定
- 進行中のクイズセッション

GoodNotesから取り込んだ図は容量が大きいため、クラウド同期せず各端末内に保存します。
