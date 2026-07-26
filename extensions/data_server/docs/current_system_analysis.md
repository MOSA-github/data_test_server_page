# 現状分析

- GitHub Pages (`docs/index.html`) と静的JSON/CSVで構成され、書込API、DB、認証、テストはありませんでした。
- `update_data.py` はPySerial/PyGithub前提で、収集関数が省略された未完成コードです。トークン欄は
  プレースホルダーで実秘密はありませんが、環境変数化が必要です。
- 実画面は `docs/data/latest.json` を10秒ごとに取得します。READMEの履歴URL例は実際の施設別パスと不一致です。
- CSVの確定済み既存列は `time,id,room,mac_addr,status,power[W],ble_rssi,node_rssi`。空行を含むファイルがあります。
- 指定されたSVGMap、Publicレイヤ、設定生成フロー、compose、nginx、package、既存テストは存在しません。
- 正式消費電力資料がないため、新しい計測スキーマの推測は禁止されています。

追加実装は既存静的公開物を変更せず、`extensions/data_server/`へ隔離した任意コンポーネントです。
将来は同ディレクトリを独立repositoryまたはGit submoduleへ置換できます。
