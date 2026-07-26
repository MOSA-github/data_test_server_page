# API

全JSONエラーは `{"error":{"code","message","request_id"}}` 形式です。

- `GET /health`
- `GET /api/v1/public/sensors/current`（既存公開JSON）
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`（session + `X-CSRF-Token`）
- `GET /api/v1/me`
- `GET /api/v1/sensors/current`（session または `sensors:read` 署名、SVGMap配列）
- `POST /api/v1/sensors/current`（`sensors:write` 署名、全件schema検証後upsert）
- `GET /api/v1/admin/overview`（admin以上）
- `GET /api/v1/admin/audit-logs`（admin以上、最大100件）

POSTはトップレベル配列を受け付け、成功時 `{"accepted":件数}`、検証失敗時422を返します。
履歴意味論に依存するpower-readings、期間集計、CSV exportはブロック中です。
