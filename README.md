# Energy Monitor Cloud (GitHub Pages Edition)

消費電力監視モジュールのデータを管理・公開するためのバックエンドリポジトリです。

## 🛠 仕組み
1. **Data Source:** ESP32やRaspberry Piなどの監視モジュール
2. **Storage:** 本リポジトリの `/data` ディレクトリ
3. **Delivery:** GitHub Pages (https://[ユーザー名].github.io/[リポジトリ名]/data/latest.json)

## 📊 エンドポイント
- **最新データ (JSON):** `data/latest.json`
- **履歴データ:** `data/history/YYYY-MM-DD.csv` (予定)

## ⚙️ 更新方法
現在、以下の方法でデータを更新することを想定しています：
- [ ] GitHub API を利用したファイルの直接更新
- [ ] GitHub Actions による定期バッチ処理