# SVGMap消費電力センサ・フォーマット対応

参照元は `MOSAdemy_SVGMap/README.md`、詳細仕様、JSON Schemaです。トップレベルは常に配列です。

| 資料上の項目 | 例 | 型 | 単位 | 必須 | 意味 | DB/API上の項目 | バリデーション | 備考 |
|---|---|---|---|---|---|---|---|---|
| `id` | `sensor_001` | string | - | 必須 | データソース内で一意なセンサID | `sensors.id` | 非空・配列内一意 | upsertキー |
| `name` | `岡山拠点 受電電力` | string | - | 任意 | 表示名 | `sensors.name` | string | |
| `type` | `power` | enum | - | 必須 | センサ種別 | `sensors.type` | water/power/generator/camera | 電力はpower |
| `status` | `normal` | enum | - | 必須 | 現在状態 | `sensors.status` | normal/offline/warning/error | 深刻度順固定 |
| `value` | `12.5` | number/string/null | unit依存 | 任意 | 現在表示値 | `sensors.value_json` | 有限数/string/null | 0も有効 |
| `unit` | `kW` | string | 値そのもの | 任意 | valueの単位 | `sensors.unit` | string | power省略時W |
| `lat` | `34.6618` | number | degree | 必須 | 緯度 | `sensors.lat` | 有限、-90～90 | Decimal文字列保存 |
| `lng` | `133.9344` | number | degree | 必須 | 経度 | `sensors.lng` | 有限、-180～180 | Decimal文字列保存 |
| `updated_at` | `2026-07-22T10:30:00+09:00` | ISO 8601 | - | 必須 | センサ更新日時 | `sensors.updated_at` | timezone必須 | received_atと分離 |
| `facility` | `{id,name,type}` | object | - | 任意 | 施設表示情報 | `sensors.facility_json` | object | 追加プロパティ可 |
| `tags` | `["power","main"]` | string[] | - | 任意 | タグ | `sensors.tags_json` | 全要素string | |
| `cameras` | `[...]` | object[] | - | cameraで任意 | 施設内カメラ | `sensors.cameras_json` | 詳細仕様の必須列 | ID施設内一意 |

raw payloadと受信時刻を別途保存します。同じ`id`は現在値を更新します。これは履歴重複条件ではありません。
kWとkWhは変換せず、指定された`unit`をそのまま保存・返却します。

未確定: 計測間隔、履歴の外部record ID、数値桁数、積算電力量、推計/計測区分、累積リセット、履歴schema version。
