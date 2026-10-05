# MOSAdemy Monitor / data_test_server_page — URL source edition

病院・設備・最新値を一元管理するGitHub Pagesダッシュボードです。

## 燃料残量の登録

病院編集で設備種別を **燃料残量** にし、`fuel_level_monitoring_system` が公開するJSON URLを貼ります。

例：

```text
https://mosa-github.github.io/fuel_level_monitoring_system/data/latest.json
```

容量・単位・カメラURL・針校正値は病院側で二重登録しません。値・単位・%・状態はJSONから読みます。

JSONに読み取りが1件だけなら、解析側と病院側の設備IDを一致させる必要はありません。複数件を含むURLの場合は、`facility_id + device_id` または設備IDで対象を選びます。

## 編集と削除

- 既存病院はそのまま編集可能です。
- 設備行の「削除」で設備を削除できます。
- 「この病院を削除」で病院ごと削除できます。
- 変更後に管理画面上部の「GitHubへ本番反映」を押すと `docs/data/facilities.json` をmainへcommitします。

## URL確認

燃料残量のデータURL欄にある「URL確認」を押すと、その場でJSONを取得し、現在値を確認できます。

## GitHub Pages

Pages source は `main / docs` を使用します。

## テスト

```bash
node --test tests/core.test.mjs
```


## 燃料残量のデータ連携（v3）

燃料設備は `JSON URL` だけで解析結果に接続します。カメラ設備の `camera_url` と同じ考え方です。

例:

```json
{
  "id": "fuel-local-1",
  "name": "非常用発電機 燃料残量",
  "type": "fuel",
  "data_url": "https://mosa-github.github.io/fuel_level_monitoring_system/data/devices/demo-fuel.json"
}
```

病院側の設備IDと解析側のIDは一致不要です。URL先の1計器専用JSONをその設備の値として表示します。`data/latest.json` のような複数計器一覧JSONは誤接続防止のため使用しません。
