# 実装計画と進捗

1. **調査（完了）**: 構成、既存データ、起動方法、依存、資料の有無を確認。
2. **独立基盤（完了）**: SQLite migration、ユーザーsession、CSRF、RBAC、監査ログ。
3. **アプリ認証（基盤完了）**: Ed25519、body hash、timestamp、nonce、scope、失効状態。
4. **互換性（完了）**: 静的公開JSONを維持し、公開・認証済み互換APIを分離。
5. **UI（基盤完了）**: 日本語login/dashboard/admin。資料から算出不能なkWhは非表示。
6. **SVGMap現在値（完了）**: version 2 migration、validator、upsert、import、署名API。
7. **電力履歴（保留）**: 計測間隔・積算値・重複条件の仕様受領後に履歴・検索・集計APIを追加。
7. **検証（完了）**: migration再実行、legacy dry-run、単体テスト、HTTP疎通。
