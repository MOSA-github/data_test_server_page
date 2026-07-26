# MOSAdemy Data Server（任意拡張）

GitHub Pages本体から分離した、必要な環境だけで使うバックエンドです。このディレクトリ単位で別repositoryへ
切り出し、将来Git submoduleへ置き換えられます。通常のGitHub Pages運用には不要です。

## 構成

```text
data_server/
├── server/   # HTTP API・SQLite・認証
├── web/      # login/dashboard/admin
├── scripts/  # import・鍵生成
├── tests/
└── docs/
```

追加ライブラリはEd25519用の`cryptography`だけです。

## 起動

このディレクトリへ移動して実行します。

```powershell
$env:MOSA_COOKIE_SECURE='0'
$env:MOSA_BOOTSTRAP_PASSWORD='<12文字以上の一時パスワード>'
python -m server.app migrate
python -m server.app bootstrap-admin --username admin
Remove-Item Env:MOSA_BOOTSTRAP_PASSWORD
python -m server.app serve
```

本番ではHTTPS reverse proxyを使用し、`MOSA_COOKIE_SECURE=1`にします。ホスト側の公開データ位置は
`MOSA_PUBLIC_DATA_PATH`で変更できます。既定値はrepository本体の`docs/data`です。

## SVGMapデータ

```powershell
python scripts/import_svgmap_sensors.py C:\path\to\sensors.json --dry-run
python scripts/import_svgmap_sensors.py C:\path\to\sensors.json
```

正式契約は `docs/power_consumption_format_mapping.md`、APIは`docs/api.md`、署名は
`docs/application_request_signing.md`を参照してください。

## テスト

```powershell
python -m unittest discover -s tests -v
python scripts/migrate_legacy_data.py --dry-run
```
