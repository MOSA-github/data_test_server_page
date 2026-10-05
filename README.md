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
