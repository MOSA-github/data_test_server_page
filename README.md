# Energy Monitor Cloud

本体は従来どおりGitHub Pagesだけで動作します。DB・認証が必要な場合だけ、独立した任意拡張
[`extensions/data_server`](extensions/data_server/README.md) を使用します。

## 🌐 ダッシュボード
[https://mosa-github.github.io/data_test_server_page/](https://mosa-github.github.io/data_test_server_page/)

### 画面

- `index.html`: 病院の検索・状態／地域絞り込み
- `hospital.html?id=<施設ID>`: 病院概要、水位、消費電力、発電機、カメラ
- `admin.html`: 病院・施設ID・水位／電力／発電機／カメラIDの登録・編集

GitHub Pages版の管理変更はブラウザ内へ保存されます。管理画面からJSONを書き出し、
レビュー後に`docs/data/hospitals.json`へ反映してください。サーバ側の共有保存とログインが必要な運用では、
任意拡張の`extensions/data_server`を使用します。

## 📂 データ構造 (`docs/data/`)

Webから参照するデータはすべて`docs/data/`配下に置きます。

| ファイル | 用途 |
|---|---|
| `hospitals.json` | 病院情報と、水位・電力・発電機・カメラの設備IDを管理するマスター |
| `latest.json` | 既存収集システムが出力する電力センサの最新値 |
| `sensors.sample.json` | 岡山大学病院・井原市立井原市民病院のSVGMap用dummyデータ |
| `archive/[施設ID]/[年]/[年]-[月].csv` | 施設別・月別の電力履歴 |

### 1. 病院マスター (`hospitals.json`)

トップレベルは病院オブジェクトの配列です。すべての病院は`devices`を持ち、登録設備がない場合は空配列
`[]`にします。画面には常に水位・電力・発電機・カメラの全項目が表示され、値がない項目は
「データなし」と表示されます。

```json
[
  {
    "id": "HOSP-0001",
    "name": "HOSP-0001 病院",
    "prefecture": "岡山県",
    "city": "岡山市",
    "address": "岡山市北区...",
    "latitude": 34.651347,
    "longitude": 133.920646,
    "status": "normal",
    "devices": [
      {
        "id": "water_hosp0001_01",
        "name": "屋上貯水槽",
        "type": "water",
        "status": "normal",
        "value": 62,
        "unit": "%"
      },
      {
        "id": "f0:9e:9e:9c:e0:3a",
        "name": "Room_301_Bed_B",
        "type": "power"
      },
      {
        "id": "generator_hosp0001_01",
        "name": "非常用発電機",
        "type": "generator",
        "status": "warning",
        "value": 28,
        "unit": "%"
      },
      {
        "id": "camera_hosp0001_01",
        "name": "救急入口",
        "type": "camera",
        "status": "normal",
        "image_url": "/assets/images/camera_er_entrance.png"
      }
    ]
  }
]
```

#### 病院フィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | string | 必須 | 施設ID。`latest.json`と履歴ディレクトリの施設IDに一致させる |
| `name` | string | 必須 | 画面に表示する病院名 |
| `prefecture` | string | 任意 | 都道府県。病院一覧の地域絞り込みにも使用 |
| `city` | string | 任意 | 市区町村 |
| `address` | string | 任意 | 住所 |
| `latitude` | number/null | 任意 | 病院の代表緯度。-90以上90以下 |
| `longitude` | number/null | 任意 | 病院の代表経度。-180以上180以下 |
| `status` | enum | 必須 | `normal` / `warning` / `offline` / `error` |
| `devices` | array | 必須 | 病院に所属する設備。未登録の場合は`[]` |

#### 設備フィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | string | 必須 | センサまたはカメラの一意ID |
| `name` | string | 必須 | 表示名、部屋名、設置場所 |
| `type` | enum | 必須 | `water` / `power` / `generator` / `camera` |
| `status` | enum | 任意 | `normal` / `offline` / `warning` / `error` |
| `value` | number/string/null | 任意 | 現在値。数値`0`は有効な値として扱う |
| `unit` | string | 任意 | 値の単位。既定値は種別ごとに異なる |
| `image_url` | string | カメラのみ任意 | 同一originの相対URLまたは許可済みHTTPS URL |
| `updated_at` | ISO 8601 string | 任意 | センサ側の最終更新日時。timezoneを含める |

#### センサ種別と単位

| `type` | 表示 | 既定単位 | 主な値 |
|---|---|---|---|
| `water` | 貯水・水位 | `%` | 貯水率、水位率 |
| `power` | 消費電力 | `W` | 瞬時電力。既存最新値は`latest.json`から取得 |
| `generator` | 発電機 | `%` | 燃料残量など、データ提供側で意味を明示する |
| `camera` | カメラ | なし | 映像URLと接続状態 |

`value`や対象設備が存在しない場合、値を推測して補完せず「データなし」と表示します。`0`は欠損ではありません。
また、`W`と`Wh`、`kW`と`kWh`を混同しないでください。

### 2. 電力最新値 (`latest.json`)

既存収集システムとの互換形式です。トップレベルはセンサ最新値の配列です。

```json
[
  {
    "time": "2026-04-28 18:21:00",
    "id": "HOSP-0001",
    "room": "Room_301_Bed_B",
    "mac_addr": "f0:9e:9e:9c:e0:3a",
    "status": "NORMAL",
    "power_w": 3.8,
    "ble_rssi": -60,
    "node_rssi": -75
  }
]
```

| フィールド | 型 | 説明 |
|---|---|---|
| `time` | string | 最新値の時刻。既存形式は`YYYY-MM-DD HH:mm:ss` |
| `id` | string | 施設ID。`hospitals.json[].id`と対応 |
| `room` | string | 設置場所・表示名 |
| `mac_addr` | string | 電力センサID。`devices[].id`と対応 |
| `status` | string | `NORMAL` / `OFFLINE` / `0W_ALERT` / `UNKNOWN` |
| `power_w` | number | 瞬時電力（W）。`0`も有効値 |
| `ble_rssi` | number | BLE受信強度（dBm） |
| `node_rssi` | number | ノード受信強度（dBm） |

### 3. SVGMap dummyデータ (`sensors.sample.json`)

SVGMapへの配置確認用として、岡山大学病院と井原市立井原市民病院に4種別ずつ、合計8件のdummyセンサを
用意しています。このファイルはテスト専用であり、実測値として集計・公開しないでください。

| 病院 | 施設ID | latitude | longitude |
|---|---|---:|---:|
| 岡山大学病院 | `HOSP-0001` | `34.651347` | `133.920646` |
| 井原市立井原市民病院 | `HOSPITAL_B` | `34.60337` | `133.458794` |

各センサはSVGMap契約に従い、`id`, `name`, `type`, `status`, `value`, `unit`, `lat`, `lng`,
`updated_at`, `facility`, `tags`を持ちます。dummy判別用に`is_dummy: true`と`tags: ["dummy", ...]`
を付けています。

```json
{
  "id": "dummy_okadai_water_001",
  "name": "岡山大学病院 貯水槽",
  "type": "water",
  "status": "normal",
  "value": 62,
  "unit": "%",
  "lat": 34.651347,
  "lng": 133.920646,
  "updated_at": "2026-07-27T09:00:00+09:00",
  "facility": {
    "id": "HOSP-0001",
    "name": "岡山大学病院",
    "type": "hospital"
  },
  "tags": ["dummy", "water"],
  "is_dummy": true
}
```

病院マスターでは`latitude` / `longitude`、SVGMapセンサでは`lat` / `lng`を使用します。
dummyを追加する場合は対象病院の代表座標をセンサへ明示的にコピーしてください。

### 4. 電力履歴CSV

保存先は`docs/data/archive/[施設ID]/[年]/[年]-[月].csv`です。

```csv
time,id,room,mac_addr,status,power[W],ble_rssi,node_rssi
2026-04-28 18:21:00,HOSP-0001,Room_301_Bed_B,f0:9e:9e:9c:e0:3a,NORMAL,3.8,-60,-75
```

同じ施設ID・センサIDを病院マスター、最新値、履歴で一貫して使用してください。

### 5. IDの関連付け

```text
hospitals.json[].id
  ├── latest.json[].id
  └── archive/[施設ID]/

hospitals.json[].devices[].id
  └── latest.json[].mac_addr（電力センサ）
```

- 病院IDは全ファイルで同じ文字列を使用します。
- 設備IDは病院内だけでなくデータソース全体で一意にしてください。
- IDを変更する場合は、マスター、最新値、履歴生成側を同時に更新します。
- 管理画面は病院IDの重複を検査します。設備IDを含め、GitHubへ反映する前にもJSONをレビューしてください。

### 6. 管理画面と保存

GitHub Pagesはサーバ側書込みを行えないため、`admin.html`の変更はブラウザの
`localStorage`（key: `mosademy_hospitals_v2`）へ保存されます。

1. 管理者画面で病院と設備IDを登録・編集する。
2. 「JSONを書き出す」で`hospitals.json`をダウンロードする。
3. JSONのID、種別、状態、値、単位をレビューする。
4. `docs/data/hospitals.json`を置換してcommit・pushする。
5. GitHub Pages deploymentの成功と公開画面を確認する。

## 🛠 開発者向け情報
データの更新には `update_data.py` を使用します。このスクリプトは `docs/` 外に配置されているため、GitHub Pagesからは直接参照されません。

## 🌐 データエンドポイント
- **Current Status (JSON):** [https://mosa-github.github.io/data_test_server_page/data/latest.json](https://mosa-github.github.io/data_test_server_page/data/latest.json)
  ※全監視対象の最新1件ずつのデータが格納されます。
- **Historical Logs (CSV):**
  `https://mosa-github.github.io/data_test_server_page/data/archive/[施設ID]/[年]/[年]-[月].csv`
  ※月ごとの時系列データが蓄積されます。


## 📂 ディレクトリ構造
```text
.
├── docs/                         # GitHub Pages公開root
│   ├── index.html                # 病院一覧
│   ├── hospital.html             # 病院詳細
│   ├── admin.html                # 管理画面
│   ├── assets/                   # CSS / JavaScript
│   └── data/
│       ├── hospitals.json        # 病院・設備IDマスター
│       ├── latest.json           # 最新の消費電力
│       ├── sensors.sample.json   # SVGMap用dummyセンサ
│       └── archive/              # 施設別・月別履歴
├── extensions/data_server/       # 任意の認証・DB拡張
├── update_data.py                # 既存収集・GitHub更新処理
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
