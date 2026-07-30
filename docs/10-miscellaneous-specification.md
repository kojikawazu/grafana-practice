# その他仕様書

用語集・コーディング規約・参照資料をまとめる。標準仕様書（01〜09）に収まらない補足を置く。

## 目次

- [用語集](#用語集)
- [コーディング規約・命名](#コーディング規約命名)
- [参照資料・ライブラリ](#参照資料ライブラリ)
- [その他注記](#その他注記)

## 用語集

学習中に用語を見つけたら、まずここで「一般的に何か」と「このリポジトリのどこに実物があるか」を確認する。
このスタックは配線の大半が YAML にあるため、リンク先はアプリのコードだけでなく `infra/` の設定ファイルにも及ぶ。

### オブザーバビリティの基礎

| 用語 | 意味 | このプロジェクトでの例 |
|------|------|------------------------|
| オブザーバビリティ（可観測性） | システムの内部状態を、外部へ出力されたテレメトリだけから推測できる度合い。「監視（既知の異常を見張る）」より広く、未知の障害を後から追跡できることを狙う。 | 監視スタック全体（[`docker-compose.yml`](../docker-compose.yml)）。反映までの遅延など運用上の前提は [`04-non-functional-specification.md`](./04-non-functional-specification.md)。 |
| 3 本柱 | メトリクス / トレース / ログ。それぞれ「量の傾向」「1 リクエストの経路」「個別事象の詳細」を担い、相関させて初めて原因まで辿れる。 | Collector の 3 パイプライン（[`infra/otel-collector/config.yaml`](../infra/otel-collector/config.yaml) の `service.pipelines`）。 |
| テレメトリ | アプリ・基盤が外部へ出す観測用データの総称。 | アプリからは [`instrumentation.mjs`](../apps/task-app/instrumentation.mjs) が 3 シグナルすべてを送出する。 |
| シグナル | テレメトリの種別（traces / metrics / logs）。OTel はシグナルごとに SDK と exporter を分けている。 | `OTLPTraceExporter` / `OTLPMetricExporter` / `OTLPLogExporter`（[`instrumentation.mjs`](../apps/task-app/instrumentation.mjs)）。 |
| リソース属性（Resource Attributes） | テレメトリの発生元を示す属性群（`service.name`、`deployment.environment` 等）。シグナルを横断して同じ値が付くため、相関の軸になる。 | `OTEL_SERVICE_NAME=task-app`（[`docker-compose.yml`](../docker-compose.yml)）と、Collector の `resource` processor が付与する `deployment.environment: local`。 |

### OpenTelemetry（計装側）

| 用語 | 意味 | このプロジェクトでの例 |
|------|------|------------------------|
| OpenTelemetry（OTel） | テレメトリの生成・収集・送出を標準化する CNCF プロジェクト。ベンダー中立なので、送り先（Tempo → 他 SaaS 等）をアプリ改修なしで差し替えられる。 | `@opentelemetry/sdk-node` を使う [`instrumentation.mjs`](../apps/task-app/instrumentation.mjs)。 |
| OTLP | OpenTelemetry Protocol。テレメトリ送出の標準ワイヤ形式。gRPC は :4317、HTTP は :4318 が慣例ポート。 | アプリ → Collector は OTLP/gRPC（`OTEL_EXPORTER_OTLP_ENDPOINT`）、Collector の受信口は [`config.yaml`](../infra/otel-collector/config.yaml) の `receivers.otlp`。 |
| 自動計装（auto-instrumentation） | アプリのコードを書き換えず、ライブラリ（http / pg 等）を実行時に patch してスパンを生成する仕組み。 | `getNodeAutoInstrumentations()`。ノイズの多い `instrumentation-fs` だけ無効化している（[`instrumentation.mjs`](../apps/task-app/instrumentation.mjs)）。 |
| ブートストラップ順序 | 自動計装は「対象モジュールが require される前」に読み込まれる必要がある。後から読むと patch が効かず、スパンが出ない。 | `node --import ./instrumentation.mjs` で本体より先にロードする（[`Dockerfile`](../apps/task-app/Dockerfile)）。 |
| スパン / トレース | スパンは 1 処理の単位（開始・終了・属性・ステータスを持つ）。因果関係で連なったスパンの木がトレース。 | HTTP ハンドラと pg クエリが親子スパンになり、Tempo で 1 トレースとして見える。 |
| trace_id / span_id | トレースとスパンの識別子。ログ・メトリクスへ持ち出すことで、3 本柱の相関キーになる。 | ログ出力時のアクティブスパンから自動付与される（[`server/utils/logger.ts`](../apps/task-app/server/utils/logger.ts)）。 |
| Logs API による emit | ログを OTel の LogRecord として直接送出する方式。ログライブラリを patch する方式が使えない環境での代替。 | Nitro/rollup のバンドルにより `instrumentation-pino` が効かないため、[`logger.ts`](../apps/task-app/server/utils/logger.ts) は `@opentelemetry/api-logs` で直接 emit する。 |
| ランタイムメトリクス | GC・イベントループ遅延・ヒープ等、Node ランタイム自体の指標。アプリのコードに起因しない性能劣化の切り分けに使う。 | `RuntimeNodeInstrumentation`（[`instrumentation.mjs`](../apps/task-app/instrumentation.mjs)）。 |
| バッチ送出 / flush 間隔 | テレメトリをまとめて送る仕組みと、その周期。値が大きいほど負荷は下がるが、画面に出るまでの遅延が伸びる。 | メトリクスは `exportIntervalMillis: 15000`、トレース／ログは Batch プロセッサ経由。 |

### Collector（収集・加工）

| 用語 | 意味 | このプロジェクトでの例 |
|------|------|------------------------|
| Collector | テレメトリを受信・加工し、各バックエンドへ振り分ける中央ハブ。アプリから送り先の知識を切り離せるのが最大の利点。 | `otel/opentelemetry-collector-contrib`（[`docker-compose.yml`](../docker-compose.yml)）+ [`infra/otel-collector/config.yaml`](../infra/otel-collector/config.yaml)。 |
| receiver / processor / exporter | Collector の 3 要素。受け取る / 加工する / 送り出す。`service.pipelines` で組み合わせて初めて有効になる（定義しただけでは動かない）。 | `receivers.otlp` → `processors.[resource, batch]` → `exporters.otlp/tempo` 等。 |
| connector | あるパイプラインの出力を、別のパイプラインの入力として受け直すコンポーネント。シグナルをまたぐ変換（traces → metrics）に使う。 | `spanmetrics` と `servicegraph` は traces の exporter であり、同時に metrics の receiver でもある。 |
| spanmetrics connector | スパンから RED メトリクスを生成する connector。アプリ側でカウンタを実装しなくても、トレースさえあれば RED が揃う。 | `traces_span_metrics_calls_total` / `..._duration_milliseconds_bucket` を生成（[`config.yaml`](../infra/otel-collector/config.yaml)）。 |
| servicegraph connector | スパンの呼び出し関係からサービス間の依存グラフとレイテンシを生成する connector。 | Grafana の Service Map / Node Graph の裏側（[`datasources.yaml`](../infra/grafana/provisioning/datasources/datasources.yaml) の `serviceMap`）。 |
| dimensions | 生成メトリクスに付与するラベル。増やすほど分析軸が増えるが、カーディナリティ（時系列数）が掛け算で膨らむ。 | `http.method` / `http.route` / `http.status_code` の 3 つに絞っている。 |
| pull / push | メトリクス収集の方式。Prometheus は pull（scrape）、OTLP は push。Collector は push で受けて pull 用エンドポイントを公開し、両者を橋渡しする。 | `exporters.prometheus` が :8889 を公開し、Prometheus がそこを scrape する。 |

### バックエンド（保存・可視化）

| 用語 | 意味 | このプロジェクトでの例 |
|------|------|------------------------|
| Prometheus | 時系列メトリクスの収集・保存・クエリを担う。scrape（pull）でターゲットから定期取得する。 | [`infra/prometheus/prometheus.yml`](../infra/prometheus/prometheus.yml)。 |
| scrape_configs / job | Prometheus が「どこを・どの単位で」取りに行くかの定義。job 名がラベル `job` として全メトリクスに付く。 | `otel-collector`（アプリ + spanmetrics）、`otel-collector-internal`（Collector 自身）、`cadvisor`、`node-exporter`。 |
| Tempo | 分散トレースのバックエンド。トレースの保存と trace_id 検索を担う。RED 生成は Collector 側へ委譲している。 | [`infra/tempo/tempo.yaml`](../infra/tempo/tempo.yaml)（保持期間 1 時間）。 |
| Loki | ログのバックエンド。ログ全文ではなくラベルで索引するため、ラベル設計がコストと検索性を決める。 | [`infra/loki/loki-config.yaml`](../infra/loki/loki-config.yaml)（OTLP 取込・保持 24 時間）。 |
| structured metadata | Loki でラベルにもログ本文にも含めない付随情報を保持する仕組み。OTLP 取込では有効化が必須。 | `limits_config.allow_structured_metadata: true`。 |
| Grafana | 各バックエンドを横断して可視化するダッシュボード。データソースとダッシュボードは provisioning でコード管理する。 | [`infra/grafana/provisioning/`](../infra/grafana/provisioning/)。 |
| provisioning | Grafana の設定を UI 手作業ではなくファイルで宣言し、起動時に反映させる仕組み。環境の再現性を担保する。 | [`datasources.yaml`](../infra/grafana/provisioning/datasources/datasources.yaml) と [`dashboards.yaml`](../infra/grafana/provisioning/dashboards/dashboards.yaml)。 |
| cAdvisor / node-exporter | コンテナ指標 / ホスト指標を Prometheus 形式で公開するエクスポーター。アプリの外側（CPU・メモリ）を見る。 | `containers.json` ダッシュボードの `container_cpu_usage_seconds_total` / `node_cpu_seconds_total`。 |

### 相関とクエリ

| 用語 | 意味 | このプロジェクトでの例 |
|------|------|------------------------|
| RED メトリクス | Rate（リクエスト率）/ Errors（エラー率）/ Duration（レイテンシ）。リクエスト駆動サービスを見る際の標準 3 指標。 | ダッシュボード [`app-red.json`](../infra/grafana/provisioning/dashboards/app-red.json)。 |
| exemplar | メトリクスのデータ点に紐づけられた個別トレースへの参照。「レイテンシが跳ねた点」から実際の遅いトレースへ 1 クリックで飛べる。 | Prometheus データソースの `exemplarTraceIdDestinations`（`trace_id` → Tempo）。 |
| trace_id 相関 | ログ・メトリクスに trace_id を載せ、トレースと相互リンクできる状態にすること。3 本柱を「別々の画面」から「1 つの調査導線」に変える。 | メトリクス→トレースは exemplar、トレース→ログは `tracesToLogsV2`、ログ→トレースは Loki の `derivedFields`。 |
| derivedFields | Loki のログ行から正規表現等で値を抽出し、他データソースへのリンクに変換する機能。 | `trace_id` ラベルを Tempo へのリンクにする（[`datasources.yaml`](../infra/grafana/provisioning/datasources/datasources.yaml)）。 |
| PromQL | Prometheus のクエリ言語。カウンタは生値ではなく `rate()` で「秒あたりの増加」に変換して使うのが基本。 | `sum(rate(traces_span_metrics_calls_total[5m])) by (service_name, span_name)`。 |
| ヒストグラム / bucket / `histogram_quantile` | レイテンシを区間（bucket）ごとの累積カウンタで持ち、そこから分位点を推定する仕組み。平均値では見えない裾（p95 等）を扱える。 | `histogram_quantile(0.95, sum(rate(..._duration_milliseconds_bucket[5m])) by (le, span_name))`。 |
| カーディナリティ | ラベル値の組み合わせが生む時系列の数。ID など値域の広いものをラベルにすると爆発し、バックエンドを圧迫する。 | spanmetrics の `dimensions` を 3 つに限定している理由（[`infra/otel-collector/config.yaml`](../infra/otel-collector/config.yaml)）。 |

### アプリ・テスト

| 用語 | 意味 | このプロジェクトでの例 |
|------|------|------------------------|
| Nitro | Nuxt のサーバーエンジン。`server/api/` のファイルパスから API ルートを生成する。 | [`server/api/tasks/index.get.ts`](../apps/task-app/server/api/tasks/index.get.ts) が `GET /api/tasks` になる。 |
| 依存性注入（DI） | 外部 I/O を引数で受け取り、実装を差し替え可能にする設計。テストで DB を置き換えるための土台。 | `Queryable` インターフェース越しに DB を渡す [`server/utils/tasks.ts`](../apps/task-app/server/utils/tasks.ts)。 |
| UT（Unit Test） | ネットワークや実 DB を使わず、単一の機能単位を検証するテスト。本プロジェクトのモック対象は外部 I/O のみで、ビジネスロジックはモックしない。 | [`tests/tasks.test.ts`](../apps/task-app/tests/tasks.test.ts)（`pnpm test`）。 |
| pg-mem | インメモリの PostgreSQL 互換実装。実 DB を起動せずに SQL を含めた振る舞いを検証できる。 | 上記テストで `pg.Pool` の代わりに注入する。 |
| 正常系 / 準正常系 / 異常系 | 期待通りの入力 / 想定内の異常入力 / 想定外のエラー。テストは 正常系 1 : （準正常系＋異常系）2 以上を目安に配分する。 | `describe("正常系")` と `describe("準正常系・異常系")`（[`08-test-specification.md`](./08-test-specification.md)）。 |

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
