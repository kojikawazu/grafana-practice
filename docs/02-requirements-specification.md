# 要件仕様書

機能要件の一覧と受け入れ条件を定義する。背景・目的は [`01-business-requirements.md`](./01-business-requirements.md)、画面仕様は [`03-functional-specification.md`](./03-functional-specification.md) を参照。

## 目次

- [機能要件](#機能要件)
- [データ項目](#データ項目)
- [受け入れ条件](#受け入れ条件)

## 機能要件

監視基盤（F-2〜F-4）と、その検証手段となる example アプリ（F-1）に分かれる。

### F-1: タスク管理（example アプリ）

監視対象として最小限の CRUD を提供する。

- タスクの一覧表示・追加・完了状態の切り替え・削除ができる。
- データは PostgreSQL に永続化する。
- API 契約は [`07-api-specification.md`](./07-api-specification.md)、スキーマは [`05-data-specification.md`](./05-data-specification.md) を参照。

### F-2: テレメトリ送出（OpenTelemetry 計装）

- アプリは **トレース・メトリクス・ログの 3 シグナル**を OTLP で送出する。
- HTTP リクエストと PostgreSQL クエリは自動計装でスパン化する。
- ログには `trace_id` を注入し、トレースと相関できるようにする。
- 送出先は環境変数で切り替え可能（被監視アプリ差し替えを見据える）。

### F-3: テレメトリ収集・ルーティング（Collector）

- OpenTelemetry Collector が OTLP（gRPC/HTTP）を受信する。
- トレースを Tempo、メトリクスを Prometheus（scrape 経由）、ログを Loki へ振り分ける。
- スパンから RED メトリクス／サービスグラフを生成する（spanmetrics / servicegraph connector）。

### F-4: 可視化・相互リンク（Grafana）

- Prometheus / Tempo / Loki をデータソースとしてプロビジョニング済みで起動する。
- トレース → ログ → メトリクスを相互にたどれる（trace_id 相関・exemplar・サービスグラフ）。
- アプリの RED ダッシュボードとコンテナ/ホストメトリクスダッシュボードを同梱する。

## データ項目

主要な入出力データ項目。詳細なスキーマは [`05-data-specification.md`](./05-data-specification.md) を参照。

| 項目 | 必須 | 制約 |
|------|------|------|
| title（タスク名） | ○ | 1 文字以上・空白のみ不可・前後トリム |
| done（完了フラグ） | － | 真偽値。未指定時は false |
| id | （生成） | UUID。サーバー採番 |
| createdAt | （生成） | 作成日時。サーバー採番 |

## 受け入れ条件

「何が満たされれば完成か」を検証可能な形で定義する。バリデーション詳細は [`06-security-specification.md`](./06-security-specification.md)、テストは [`08-test-specification.md`](./08-test-specification.md) を参照。

- [ ] `docker compose up` で全サービスが起動し、アプリ（:3000）と Grafana（:3001）にアクセスできる。
- [ ] アプリでタスクを追加・完了切替・削除でき、内容が PostgreSQL に永続化される。
- [ ] 空タイトルの作成は 400 で拒否され、存在しない id への操作は 404 を返す。
- [ ] Grafana の Tempo で、1 リクエストの HTTP スパン配下に PostgreSQL の DB スパンが連なって見える。
- [ ] トレースから対応するログ（Loki / trace_id 相関）とメトリクス（Prometheus）へ遷移できる。
- [ ] `app-red` / `containers` ダッシュボードが描画され、Prometheus の各 target が UP。
- [ ] `pnpm test` がグリーン（正常系 1 : 異常系 2 以上の比率）。
