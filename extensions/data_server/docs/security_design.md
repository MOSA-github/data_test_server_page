# セキュリティ設計

- password: PBKDF2-HMAC-SHA256、ランダムsalt、600,000回。12文字未満を拒否。
- session: 256-bitランダム値、DBにはSHA-256だけ保存。HttpOnly/Secure/SameSite=Lax、8時間。
- CSRF: 状態変更時にsession結合tokenをheaderで検証。ログイン成功時にsessionを再生成。
- brute force: 10回失敗したアカウントを拒否（運用で解除）。監査ログに成功/失敗を記録。
- application: Ed25519、body hash、timestamp、nonce、scope、鍵失効。
- HTTP: CSP、nosniff、frame拒否、Referrer-Policy。最大本文1 MiB。
- DB: parameterized query。詳細stack traceをHTTPへ返さない。
- 秘密: source/URL/browser storageへ保存しない。TLSはreverse proxyで終端。

残課題は分散rate limit、trusted proxy IP処理、監査ログの改ざん耐性、PostgreSQL対応、完全な管理CRUDです。
