# Energy Monitor Cloud

## 🌐 ダッシュボード
[https://mosa-github.github.io/data_test_server_page/](https://mosa-github.github.io/data_test_server_page/)

## 📂 データ構造 (docs/data/)
Webからアクセス可能なデータはすべて `docs/data/` 配下に格納されています。

- **最新ステータス:** `docs/data/latest.json`
- **履歴データ:** `docs/data/archive/[施設ID]/[年]/[年]-[月].csv`

### 1. latest.json
Webダッシュボード等でのリアルタイム表示に適した形式です。
```json
[
  {
    "time": "2026-03-28 12:09:00",
    "id": "HOSP-0001",
    "room": "Room_301_Bed_A",
    "status": "NORMAL",
    "power_w": 34.5
  },
  ...
]
```

## 🛠 開発者向け情報
データの更新には `update_data.py` を使用します。このスクリプトは `docs/` 外に配置されているため、GitHub Pagesからは直接参照されません。

## 🌐 データエンドポイント
- **Current Status (JSON):** [https://mosa-github.github.io/data_test_server_page/data/latest.json](https://mosa-github.github.io/data_test_server_page/data/latest.json)
  ※全監視対象の最新1件ずつのデータが格納されます。
- **Historical Logs (CSV):**
  `https://mosa-github.github.io/data_test_server_page/data/archive/YYYY/YYYY-MM.csv`
  ※月ごとの時系列データが蓄積されます。


## 📂 ディレクトリ構造
```text
.
├── data/
│   └── latest.json      # 最新の消費電力データ（エンドポイント）
├── docs/                # 将来的なデータ可視化ダッシュボード（HTML/JS）
└── README.md
```

## 📊 データの運用仕様 (`test_data.csv`)
本リポジトリは、監視モジュールから送られるデータを時系列で蓄積するロギングサーバーとして機能します。

### データ蓄積のイメージ
新しいデータが送信されるたびに、`test_data.csv` の末尾に新しい行が追加されます。

| time | id | room | ... | power[W] |
| :--- | :--- | :--- | :--- | :--- |
| 2026-03-28 12:06:00 | HOSP-0001 | Room_301_A | ... | 46.7 |
| 2026-03-28 12:09:00 | HOSP-0001 | Room_301_A | ... | 34.5 |
| (new data) | ... | ... | ... | ... |

## 🛠 更新プロセス（履歴の追加）
GitHub Pages 自体には「追記（Append）」の機能がないため、以下のいずれかの方法で履歴を更新します。

1. **GitHub API (Python等による集約処理)**
   - 既存の CSV を一度読み込み、新しい行を結合してから、再度 API でファイルを上書き（PUT）します。
2. **GitHub Actions による自動統合**
   - 外部ソースから定期的にデータを取得し、重複を除いてコミットします。

## 📂 ストレージ構成（施設別）
監視データは施設・年ごとにアーカイブされます：
`/data/archive/[施設ID]/[年]/[年]-[月].csv`

例：
- `/data/archive/HOSPITAL_A/2026/2026-04.csv`
- `/data/archive/HOSPITAL_B/2026/2026-04.csv`