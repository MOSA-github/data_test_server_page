# MOSAdemy 公開データ

現行の公開ページは、Private側のDBで公開承認されたセンサデータとカメラ静止画を配信します。水位・消費電力・発電機／燃料残量・カメラが対象です。公開ページの最新版では数値と画像を表示し、未公開の項目は「データなし」と表示します。

承認済みデータは30分ごと（毎時17分・47分）に既存Actionsで自動同期されます。表示中の公開ページは3分ごとに再取得し、失敗時は前回の値・画像を保持します。即時公開ではなく、[GitHubの定期実行](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)には遅延する場合があります。急ぐ場合はPrivate側の「今すぐ同期」を使用してください。追加のサーバー設定は不要です。

| 生成ファイル | 公開URL |
| --- | --- |
| `docs/public-data/catalog.json` | [データセット一覧](https://mosa-github.github.io/data_test_server_page/public-data/catalog.json) |
| `docs/public-data/latest.json` | [センサ最新値](https://mosa-github.github.io/data_test_server_page/public-data/latest.json) |
| `docs/public-data/history.csv` | [計測履歴](https://mosa-github.github.io/data_test_server_page/public-data/history.csv) |
| `docs/public-data/locations.json` | [公開座標](https://mosa-github.github.io/data_test_server_page/public-data/locations.json) |
| `docs/public-data/cameras.json` | [カメラ画像一覧](https://mosa-github.github.io/data_test_server_page/public-data/cameras.json) |

最新値の項目は`sensor_id / facility_id / name / type / value / unit / measured_at / status`。燃料残量は`type: generator`で、単位は各レコードの`unit`を使用します。カメラ一覧は数値の代わりに公開静止画の`image_url`を持ちます。SVGMapは`sensor_id`／`facility_id`で結合します。

反映手順：Private側でデータ取得・保存 → 公開を承認 → 今すぐ同期 → 本リポジトリのDeploy GitHub Pagesが成功。カメラは「画像再配布の許諾を確認済み」も必要です。取得元URL・認証情報は公開しません。

`docs/`は既存Actionsの生成物です。UI原本はPrivate側の`public_site/`で修正し、データをここで手編集しません。

## 旧消費電力プロトタイプの参考資料

以下は旧構成の説明です。現行のURL・データ形式・更新手順は上記および公開ページの「公開データ」「SVGMap」を参照してください。

### Energy Monitor Cloud（旧構成）

MOSAdemyで利用する消費電力データを，GitHub Pages上で参照できる形に整理・公開するための簡易データ配信リポジトリです．

現在は，監視対象ごとの**最新データをJSON**，**時系列履歴をCSV**として保持し，Webダッシュボードや外部アプリケーションからHTTPで参照できる構成を採用しています．

> [!IMPORTANT]
> 本リポジトリは現在，GitHub Pagesを利用した**静的なデータ公開基盤**です．
> GitHub Pages自体には，サーバ側でデータを追記したり，管理者認証を行ったりする機能はありません．
> 管理画面，非公開データ，アプリケーション認証，自作サーバでの運用などは，別途バックエンドを設けて実装する必要があります．
> 未実装の機能を，このREADMEでは現行機能として扱いません．

---

## 1．公開ページ

GitHub Pages：

https://mosa-github.github.io/data_test_server_page/

リポジトリ：

https://github.com/MOSA-github/data_test_server_page

ブラウザから公開ページを開くことで，現在公開されているダッシュボードやデータを確認できます．

---

## 2．このリポジトリの役割

本リポジトリは，現状では主に次の用途を想定しています．

- 消費電力計測値の最新状態をJSONとして公開する
- 消費電力の時系列履歴をCSVとして蓄積する
- GitHub Pages経由でHTTPアクセス可能なデータを提供する
- Webダッシュボードから最新データを参照する
- SVGMap等の外部Webアプリケーションからデータを読み取るための簡易データソースとして利用する
- `update_data.py`等の更新処理から公開データを生成・更新する

GitHub Pagesは静的ホスティングであるため，計測装置からGitHub Pagesへ直接データを書き込む構成ではありません．

データ更新は，Pythonスクリプト，GitHub API，GitHub Actions等を利用してGit上のファイルを更新し，その結果をGitHub Pagesから配信する形になります．

---

## 3．現行構成

現行リポジトリのトップレベルでは，少なくとも次の構成が確認されています．

```text
data_test_server_page/
├── docs/
├── README.md
└── update_data.py
```

現行READMEでは，GitHub Pagesから参照するデータは `docs/data/` 配下に配置する構成として説明されています．

代表的なデータ構造は次のとおりです．

```text
docs/
└── data/
    ├── latest.json
    └── archive/
        └── [施設ID]/
            └── [年]/
                └── [年]-[月].csv
```

### GitHub Pages上での見え方

GitHub Pagesの公開ルートとして `docs/` が使用されている構成では，

```text
docs/data/latest.json
```

はWeb上では，

```text
/data/latest.json
```

として参照します．

現在READMEに記載されている最新データURLは次です．

https://mosa-github.github.io/data_test_server_page/data/latest.json

---

## 4．データ仕様

### 4.1 最新データ `latest.json`

`latest.json` は，Webダッシュボード等から最新状態を取得する用途を想定したJSONファイルです．

現行READMEでは，次の形式が例示されています．

```json
[
  {
    "time": "2026-03-28 12:09:00",
    "id": "HOSP-0001",
    "room": "Room_301_Bed_A",
    "status": "NORMAL",
    "power_w": 34.5
  }
]
```

トップレベルはJSON配列です．

### 4.2 フィールド

| フィールド | 例 | 現行仕様から読み取れる用途 |
|---|---|---|
| `time` | `2026-03-28 12:09:00` | 計測時刻 |
| `id` | `HOSP-0001` | 施設または監視対象を識別するID |
| `room` | `Room_301_Bed_A` | 計測場所・部屋・ベッド等を識別する文字列 |
| `status` | `NORMAL` | 計測対象の状態 |
| `power_w` | `34.5` | 消費電力値．単位はW |

> [!NOTE]
> 現行READMEで確認できる範囲では，`status` が取り得る値の完全な一覧や，`NORMAL` 以外の状態判定条件までは定義されていません．
> 実運用で状態値を増やす場合は，許容値と判定条件を別途仕様として固定してください．

---

## 5．履歴データ

時系列履歴はCSV形式で蓄積する構成です．

現行READMEでは，施設・年・月単位でアーカイブする構成が記載されています．

```text
docs/data/archive/[施設ID]/[年]/[年]-[月].csv
```

例：

```text
docs/data/archive/HOSPITAL_A/2026/2026-04.csv
docs/data/archive/HOSPITAL_B/2026/2026-04.csv
```

GitHub Pagesから参照する場合は，公開ルートに応じて次のようなURLになります．

```text
https://mosa-github.github.io/data_test_server_page/data/archive/[施設ID]/[年]/[年]-[月].csv
```

例：

```text
https://mosa-github.github.io/data_test_server_page/data/archive/HOSPITAL_A/2026/2026-04.csv
```

### 5.1 追記の考え方

現行READMEでは，時系列データは，新しい計測値が到着するたびに既存履歴の末尾へ追加していく運用が想定されています．

イメージ：

```text
time,id,room,...,power[W]
2026-03-28 12:06:00,HOSP-0001,Room_301_A,...,46.7
2026-03-28 12:09:00,HOSP-0001,Room_301_A,...,34.5
```

ただし，現行READMEからはCSVの**完全な正式列定義**までは確認できません．

そのため，新規アプリケーションをCSV履歴へ接続する場合は，実際のCSVファイルのヘッダを確認してから実装してください．

---

## 6．既存README内のパス表記について

現行READMEには，履歴URLについて2種類の表記があります．

### 施設IDを含まない表記

```text
/data/archive/YYYY/YYYY-MM.csv
```

### 施設IDを含む表記

```text
/data/archive/[施設ID]/[年]/[年]-[月].csv
```

一方で，READMEの「ストレージ構成（施設別）」では施設IDごとに履歴を分ける構成が説明されています．

このため，本READMEでは**施設別構成を主な説明対象**としていますが，実際のファイル構成を確認して最終的な正式仕様を固定してください．

また，現行READMEには `docs/data/` と `data/` の記述も混在しています．

GitHub Pagesの公開元が `docs/` である場合，

```text
リポジトリ上：docs/data/latest.json
Web上：       /data/latest.json
```

となるため，リポジトリ内パスと公開URLを区別して記載することを推奨します．

---

# ユーザガイド

## 7．公開ページを見る

ブラウザで次を開きます．

https://mosa-github.github.io/data_test_server_page/

GitHub Pagesとして公開されている画面やデータを確認できます．

---

## 8．最新の消費電力データを確認する

ブラウザで次を開きます．

https://mosa-github.github.io/data_test_server_page/data/latest.json

JSONとして最新データを確認できます．

表示例：

```json
[
  {
    "time": "2026-03-28 12:09:00",
    "id": "HOSP-0001",
    "room": "Room_301_Bed_A",
    "status": "NORMAL",
    "power_w": 34.5
  }
]
```

---

## 9．JavaScriptから読み取る

Webアプリケーションからは `fetch()` で取得できます．

```javascript
async function loadLatestPowerData() {
  const url =
    "https://mosa-github.github.io/data_test_server_page/data/latest.json";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `データ取得に失敗しました: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("想定していないJSON形式です");
  }

  return data;
}

loadLatestPowerData()
  .then((data) => {
    console.log(data);
  })
  .catch((error) => {
    console.error(error);
  });
```

---

## 10．Pythonから読み取る

Python標準ライブラリだけでも取得できます．

```python
import json
from urllib.request import urlopen

URL = (
    "https://mosa-github.github.io/"
    "data_test_server_page/data/latest.json"
)

with urlopen(URL, timeout=10) as response:
    data = json.load(response)

for row in data:
    print(
        row["time"],
        row["id"],
        row["room"],
        row["status"],
        row["power_w"],
    )
```

`requests`を使用する場合：

```python
import requests

url = (
    "https://mosa-github.github.io/"
    "data_test_server_page/data/latest.json"
)

response = requests.get(url, timeout=10)
response.raise_for_status()

data = response.json()

for row in data:
    print(row)
```

---

## 11．curlから確認する

Linux，macOS，WSL等では次のように確認できます．

```bash
curl -fsSL \
  https://mosa-github.github.io/data_test_server_page/data/latest.json
```

整形して確認する場合，`jq` が利用可能であれば，

```bash
curl -fsSL \
  https://mosa-github.github.io/data_test_server_page/data/latest.json \
  | jq .
```

とします．

---

## 12．特定施設だけ抽出する

JavaScript例：

```javascript
const targetId = "HOSP-0001";

const facilityData = data.filter(
  (row) => row.id === targetId
);
```

Python例：

```python
target_id = "HOSP-0001"

facility_data = [
    row
    for row in data
    if row.get("id") == target_id
]
```

---

## 13．特定の部屋・計測位置だけ抽出する

JavaScript：

```javascript
const targetRoom = "Room_301_Bed_A";

const rows = data.filter(
  (row) => row.room === targetRoom
);
```

Python：

```python
target_room = "Room_301_Bed_A"

rows = [
    row
    for row in data
    if row.get("room") == target_room
]
```

---

## 14．消費電力値を利用する

`power_w` は，現行仕様ではW単位の消費電力値として扱われています．

JavaScript：

```javascript
for (const row of data) {
  console.log(
    `${row.id}: ${row.power_w} W`
  );
}
```

> [!CAUTION]
> `power_w` は電力値です．
> これをそのままWhやkWhとして扱ってはいけません．
> 電力量を算出する場合は，計測間隔や積分方法を別途定義する必要があります．

---

# SVGMap等の外部システムから利用する場合

## 15．基本的な利用方法

SVGMap等の外部Webアプリケーションでは，次の流れを基本とします．

```text
GitHub Pages
    ↓
latest.json取得
    ↓
JSON解析
    ↓
施設ID等と地図上の施設を対応付け
    ↓
消費電力・状態・更新時刻を表示
```

現在例示されている `latest.json` には，

- `time`
- `id`
- `room`
- `status`
- `power_w`

はありますが，緯度・経度のフィールドは確認できません．

そのため，SVGMap上へ直接POIを配置するには，別途，

```text
施設ID → 緯度・経度
```

の対応情報が必要です．

例えば内部または公開可能な別データとして，

```json
{
  "HOSP-0001": {
    "lat": 34.0000,
    "lng": 133.0000
  }
}
```

のような施設位置情報を管理し，`id` をキーに結合する方式が考えられます．

ただし，施設位置情報を公開してよいかは別途確認してください．

---

## 16．SVGMap連携時に推奨する役割分担

データ側：

```text
id
time
room
status
power_w
```

地図側：

```text
id
施設表示名
latitude
longitude
アイコン
```

共通キー：

```text
id
```

このように分離しておくと，電力計測データへ毎回座標を重複して保存する必要がありません．

---

## 17．データの更新頻度

現行READMEでは，具体的な更新周期は固定されていません．

そのため，利用アプリケーション側でポーリングする場合は，実際の計測・更新周期を確認して間隔を決めてください．

例：

```javascript
const UPDATE_INTERVAL_MS = 30_000;

setInterval(async () => {
  try {
    const data = await loadLatestPowerData();
    updateDisplay(data);
  } catch (error) {
    console.error(error);
  }
}, UPDATE_INTERVAL_MS);
```

上記30秒は実装例であり，現行リポジトリの正式な更新周期を示すものではありません．

---

# 開発者ガイド

## 18．データ更新スクリプト

現行リポジトリには，ルートに次のスクリプトがあります．

```text
update_data.py
```

現行READMEでは，このスクリプトをデータ更新に利用する構成が説明されています．

また `update_data.py` は `docs/` 外に置かれているため，GitHub Pagesの公開対象には直接含まれない構成です．

実際に更新処理を変更する場合は，まずスクリプト本体を確認し，

- 入力元
- 出力先
- 重複判定
- 最新値更新
- 履歴追記
- 時刻処理
- エラー時の挙動

を確認してください．

---

## 19．GitHub Pagesでは直接追記できない

GitHub Pagesは静的配信サービスです．

したがって，

```text
ブラウザ
   ↓
GitHub Pages
   ↓
CSVへ直接追記
```

という処理はできません．

現行READMEでは，更新方法として主に次の2方式が想定されています．

### 方法1．GitHub API

Python等で，

1. 既存CSVを取得
2. 新しいデータを追加
3. 更新済みファイルを生成
4. GitHub APIを利用してファイルを更新

という処理を行います．

### 方法2．GitHub Actions

GitHub Actionsで，

1. 外部データを取得
2. 既存データと比較
3. 重複を除去
4. JSON・CSVを更新
5. commit

という処理を自動化します．

---

## 20．データ更新時に確認すべきこと

データ更新処理では，最低限次を確認することを推奨します．

- 同じ計測値を重複登録しない
- 時刻形式を統一する
- 施設IDを勝手に変更しない
- `power_w` の単位をWとして維持する
- 不正な数値を登録しない
- 欠測値の扱いを決める
- 月をまたいだ場合に正しいCSVへ記録する
- `latest.json` と履歴CSVの整合性を保つ
- 更新失敗時に既存データを破壊しない

---

## 21．ローカルで公開データを確認する

GitHub Pagesへ反映する前に，ローカルHTTPサーバで確認することを推奨します．

GitHub Pagesの公開元が `docs/` の場合：

```bash
cd docs
python -m http.server 8000
```

ブラウザで，

```text
http://localhost:8000/
```

を開きます．

最新JSON：

```text
http://localhost:8000/data/latest.json
```

> [!NOTE]
> 実際の公開元ディレクトリはGitHub PagesのRepository Settingsで確認してください．

---

## 22．JSONの簡易検証

PythonでJSONとして読み込めるか確認できます．

```bash
python -m json.tool docs/data/latest.json
```

エラーなく整形表示されれば，少なくともJSON構文としては有効です．

---

## 23．CSVの簡易確認

Python標準ライブラリを利用する例：

```python
import csv

path = "docs/data/archive/HOSPITAL_A/2026/2026-04.csv"

with open(path, encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)

    for row in reader:
        print(row)
```

---

# セキュリティ上の注意

## 24．GitHub Pagesに置いたファイルは原則公開情報

GitHub Pagesの公開領域へ配置したファイルは，一般の利用者からアクセス可能であることを前提にしてください．

したがって，次の情報をGitHub Pagesへ置かないでください．

- パスワード
- APIキー
- private key
- 認証token
- `.env`
- DB接続情報
- 非公開施設情報
- 病院の内部登録ファイル
- 個人情報
- 内部ログ
- バックアップ
- データベースファイル

---

## 25．JavaScriptへ秘密情報を書かない

ブラウザへ配信されるJavaScriptは利用者から参照できます．

次のような実装は行わないでください．

```javascript
const ADMIN_PASSWORD = "secret-password";
```

同様に，JavaScript内へAPI秘密鍵やprivate keyを埋め込んではいけません．

---

## 26．管理画面について

GitHub Pagesだけでは，サーバ側でパスワードを検証する管理画面を安全に構築できません．

今後管理者画面を実装する場合は，GitHub Pagesとは別にバックエンドを用意し，

- サーバ側ログイン認証
- パスワードハッシュ
- セッション管理
- 権限制御
- HTTPS
- 操作ログ

を実装してください．

---

# 運用上の位置付け

## 27．現在の構成

```text
計測データ
    ↓
更新処理
    ↓
Gitリポジトリ
    ↓
docs/data/
    ↓
GitHub Pages
    ↓
Webダッシュボード / 外部アプリ
```

この方式は，

- 簡単に公開できる
- HTTPでJSON・CSVを取得できる
- Gitで変更履歴を管理できる

という利点があります．

一方で，

- 高頻度な書き込み
- 大量データ
- 非公開データ
- 管理者認証
- ユーザー管理
- API認証
- データベース検索

には向いていません．

これらが必要になった場合は，別途サーバ型のデータ管理基盤へ拡張してください．

---

# 今後の拡張候補

以下は現行機能ではなく，将来の拡張候補です．

- PrivateリポジトリとPublicリポジトリの分離
- 公開用ファイルだけをGitHub ActionsでPublic側へ同期
- 病院・施設登録ファイルのPrivate化
- 管理者ログイン
- ユーザー権限管理
- アプリケーション単位のAPI認証
- データベースによる履歴管理
- 自作サーバによるFull Applicationの提供
- SVGMap向けの施設位置マスタ
- 電力データのグラフ表示
- 日別・月別の集計
- データ品質チェック
- バックアップ・復元機能

将来機能を実装した場合は，このREADMEの「現行仕様」と「今後の拡張候補」を必ず更新してください．

---

# トラブルシューティング

## `latest.json` が404になる

次を確認してください．

1. GitHub Pagesの公開元が正しいか
2. `docs/data/latest.json` が存在するか
3. GitHub Pagesへのデプロイが完了しているか
4. URLの大文字・小文字が一致しているか

想定URL：

```text
https://mosa-github.github.io/data_test_server_page/data/latest.json
```

---

## JSONが読み込めない

構文を確認します．

```bash
python -m json.tool docs/data/latest.json
```

また，JSON末尾の余分なカンマ等を確認してください．

---

## 最新値が更新されない

次を確認してください．

- `update_data.py` が実行されたか
- 更新対象ファイルが正しいか
- commit / pushされているか
- GitHub Pagesの反映が完了したか
- ブラウザcacheが残っていないか

---

## 履歴CSVが見つからない

施設ID・年・月を確認してください．

```text
/data/archive/[施設ID]/[年]/[年]-[月].csv
```

例：

```text
/data/archive/HOSPITAL_A/2026/2026-04.csv
```

ただし，現行リポジトリ内の実ファイル構成を優先してください．

---

# 仕様変更時のルール

データ形式を変更する場合は，少なくとも次を行ってください．

1. READMEのフィールド仕様を更新する
2. サンプルJSONを更新する
3. 更新スクリプトを更新する
4. Webダッシュボード側を更新する
5. SVGMap等の利用側への影響を確認する
6. 既存データとの後方互換性を確認する
7. 単位変更がある場合は明示する

特に，

```text
power_w
```

を別単位へ変更する場合は，既存利用者がWとして解釈している可能性があるため，単純な名称変更・単位変更を行わないでください．

---

# ライセンス・公開範囲

現行リポジトリの公開ページから確認できる範囲では，本リポジトリ独自のライセンス条件は明確に示されていません．

データを第三者が再利用できる形で提供する場合は，

- ソースコードのライセンス
- 計測データの利用条件
- 病院・施設情報の公開可否
- 二次利用可否
- 出典表記

を別途明確にすることを推奨します．

---

# Repository

https://github.com/MOSA-github/data_test_server_page

# GitHub Pages

https://mosa-github.github.io/data_test_server_page/
