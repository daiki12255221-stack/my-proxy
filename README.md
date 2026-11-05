# Web Proxy MVP

Vercel + Node.js で動かす、URL入力型プロキシの初期版です。

## 構成

- `public/`: 入力画面
- `api/proxy/`: 取得・書き換え・安全性チェック
- `config/`: サイズ上限やタイムアウトなどの設定

## ローカル確認

```bash
npm install
npm run dev
```

## Vercelへのデプロイ

1. このフォルダの中身をGitHubリポジトリのルートに配置
2. VercelでそのリポジトリをImport
3. Framework Presetは `Other`
4. Install Commandは `npm install`
5. Build Commandは空欄のまま
6. Deploy

## 現在の制限

- ログイン・Cookieを必要とするサイトには未対応
- JavaScriptが実行時に生成するURLは十分に書き換えられない
- WebSocket、Service Worker、動画ストリーミングは未対応
- 1レスポンス5MB、タイムアウト9秒、リダイレクト5回まで
- 本番公開前に、利用者ごとのレート制限・濫用対策・監視を追加すること

## セキュリティ上の注意

このコードは開発用の初期実装です。外部公開前に、実際のVercel環境でDNS/IP検証、リダイレクト、IPv4/IPv6、レスポンス制限を含むセキュリティテストを行ってください。プロキシを不特定多数に公開する場合は、認証・レート制限・利用規約・ abuse対応も必要です。
