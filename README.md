# MOSAdemy Monitor / data_test_server_page — Fuel integrated edition

病院・設備・最新値を一元管理する GitHub Pages 用ダッシュボードです。

## 今回の変更

- 上部メニューから **「カメラ解析」** を削除しました。
- 病院編集の設備種別に **「燃料残量」** を追加しました。
- 燃料設備では `設備ID / 表示名 / 容量 / 単位 / 警告% / 危険%` だけを登録します。
- カメラURL、針校正、台形補正、認識しきい値はこのリポジトリでは管理しません。
- `facility_id + device_id` で `fuel_level_monitoring_system` の公開結果を自動対応させます。
- 病院カードに `燃料：3,178.3 L（70.6%）` のように表示します。
- 5分ごとの Action が公開燃料結果を `docs/data/fuel_latest.json` に同期します。

## 役割分担

### data_test_server_page

- 病院登録
- 設備登録
- 燃料容量・しきい値
- 水位・電力・発電機・燃料・カメラの一元表示

### fuel_level_monitoring_system

- カメラ画像取得
- ①最小目盛 / ②中心 / ③最大目盛
- 台形補正
- 針自動認識
- L / % への換算

両者は `施設ID + 設備ID` だけで接続します。

例：

```text
facility_id = HOSP-0001
device_id   = fuel-1
```

## 燃料データURL

`docs/data/integrations.json` の `fuel_monitor_url` を実際の公開URLに合わせます。

```json
{
  "fuel_monitor_url": "https://mosa-github.github.io/fuel_level_monitoring_system/data/latest.json"
}
```

カメラアクセストークンはここには保存しません。

## GitHub Pages

Pages source を `main / docs` に設定してください。

## テスト

```bash
node --test tests/core.test.mjs
```
