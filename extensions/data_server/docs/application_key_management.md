# アプリケーション鍵管理

`scripts/generate_application_keypair.py` をクライアント側で実行します。秘密鍵をサーバやブラウザへ渡しません。
管理者はapplication IDを作成し、key ID、公開鍵、fingerprint、scopeを登録します。交換時は新旧key IDを
並行登録し、切替確認後に旧鍵へ `revoked_at` を設定します。インシデント時は即時失効してください。
