# データ移行

1. `var/` と `docs/data/` を停止時にバックアップ。
2. `python -m server.app migrate` を実行。
3. legacy CSVは `python scripts/migrate_legacy_data.py --dry-run` で棚卸しする。座標がないため自動変換しない。
4. SVGMap契約済みJSONは `python scripts/import_svgmap_sensors.py <file> --dry-run` で検証する。
5. 結果確認後、`--dry-run`を外して現在値DBへupsertする。

migrationは追加のみで再実行可能です。rollbackは新規DBファイルを停止時バックアップへ戻します。
既存JSON/CSVは変更しません。
