# アプリケーション要求署名

Ed25519を使用し、サーバはraw公開鍵だけをBase64で保存します。クライアントは秘密鍵を保持します。

必須header: `X-App-Id`, `X-Key-Id`, `X-Timestamp`, `X-Nonce`,
`X-Content-SHA256`（raw bodyの小文字hex SHA-256）, `X-Signature`（Base64）。

canonical bytesはUTF-8で以下を改行結合します。

```text
HTTP_METHOD
REQUEST_PATH
CANONICAL_QUERY_STRING
X_TIMESTAMP
X_NONCE
BODY_SHA256
```

timestamp許容差は `MOSA_SIGNATURE_SKEW_SECONDS`（既定300秒）。nonceは許容窓の2倍保持され、再利用を拒否します。
application/keyの有効性、期限、失効、scopeも検証します。ブラウザでは使用せずsession認証を使います。
