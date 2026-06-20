# その他仕様書

用語集・コーディング規約・参照資料をまとめる。標準仕様書（01〜09）に収まらない補足を置く。

## 目次

- [用語集](#用語集)
- [コーディング規約・命名](#コーディング規約命名)
- [参照資料・ライブラリ](#参照資料ライブラリ)
- [その他注記](#その他注記)

## 用語集

| 用語 | 説明 |
|------|------|
| オブザーバビリティ（可観測性） | システム内部状態を外部出力（テレメトリ）から推測できる度合い |
| 3 本柱 | メトリクス / トレース / ログ。オブザーバビリティの主要データ種別 |
| OpenTelemetry（OTel） | テレメトリの生成・収集・送出を標準化する CNCF プロジェクト |
| OTLP | OpenTelemetry Protocol。テレメトリ送出の標準ワイヤ形式（gRPC :4317 / HTTP :4318） |
| Collector | テレメトリを受信・加工・各バックエンドへ振り分けるパイプライン（中央ハブ） |
| 自動計装（auto-instrumentation） | コードを書かずにライブラリ（http/pg 等）を計装する仕組み |
| スパン / トレース | 1 処理の単位がスパン、関連スパンの木構造がトレース |
| RED メトリクス | Rate（リクエスト率）/ Errors（エラー率）/ Duration（レイテンシ） |
| spanmetrics connector | スパンから RED メトリクスを生成する Collector コンポーネント |
| servicegraph connector | スパンの呼び出し関係からサービスグラフを生成するコンポーネント |
| exemplar | メトリクスのデータ点に紐づくトレース参照。メトリクス→トレース遷移に使う |
| trace_id 相関 | ログ/メトリクスに trace_id を載せ、トレースと相互リンクすること |
| Prometheus / Tempo / Loki | それぞれメトリクス / トレース / ログのバックエンド |
| cAdvisor / node-exporter | コンテナ指標 / ホスト指標を Prometheus 形式で公開するエクスポーター |

## コーディング規約・命名

- 言語: TypeScript（アプリ）。設定は YAML（infra）。
- API パス: ケバブ/複数形リソース（`/api/tasks`）。DB カラムは snake_case、API レスポンスは camelCase。
- サービス名（`service.name`）はテレメトリ全体の識別子。example は `task-app`。
- 詳細なディレクトリ規約は [`09-architecture-specification.md`](./09-architecture-specification.md) を参照。

## 参照資料・ライブラリ

| ライブラリ / 資料 | 用途 |
|-----------|------|
| `@opentelemetry/sdk-node` | Node 用 OTel SDK（traces/metrics/logs の起動） |
| `@opentelemetry/auto-instrumentations-node` | http/pg 等の自動計装 |
| `@opentelemetry/api-logs` | アプリからの OTel ログ emit（trace_id は自動付与） |
| `pg` | PostgreSQL ドライバ |
| `pg-mem` | インメモリ PostgreSQL（テスト用） |
| OpenTelemetry / Grafana / Prometheus 公式ドキュメント | 設定・計装の一次情報 |

## その他注記

- 監視スタックの設定値（flush 間隔・保持期間等）はローカル既定のまま。本番化時に [`04`](./04-non-functional-specification.md) / [`06`](./06-security-specification.md) の留意点に従って調整する。
