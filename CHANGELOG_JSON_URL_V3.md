# JSON URL direct binding v3

- 燃料残量設備はカメラ表示URLと同じ感覚で「計器専用JSON URL」を登録する方式に変更。
- 施設ID / 設備ID / 読み取りIDによる暗黙マッチングを廃止。
- `{readings:[...]}` の一覧JSONは誤接続防止のため燃料設備ソースとして拒否。
- `fuel_level_monitoring_system/data/devices/<設定ID>.json` の直接JSONを使用。
- 容量・単位・解析条件は病院側で二重設定しない。
- 設備IDは病院管理内の識別用で、編集可能。解析側IDと一致させる必要なし。
- 設備削除・病院削除は従来通り可能。
