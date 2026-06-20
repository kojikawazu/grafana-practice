# Grafana Practice

Grafana + Prometheus + OpenTelemetry による監視（オブザーバビリティ）基盤の学習・検証用モノレポ。
メトリクス・トレース・ログの 3 本柱を OpenTelemetry で収集し、Grafana で相互にたどれる状態を作る。
監視対象の example として **Nuxt 3 タスク管理アプリ（PostgreSQL）** を同梱する（将来は別の Web アプリへ差し替え可能）。

## 概要

```
ブラウザ → Nuxt3 task-app ─(pg)→ PostgreSQL
                │
                └─(OTLP gRPC:4317)→ OpenTelemetry Collector ─┬─ traces  → Tempo
                                     (spanmetrics/servicegraph)├─ metrics → Prometheus（scrape :8889）
                                                              └─ logs    → Loki
                                                                              ↑
        Grafana（Prometheus / Tempo / Loki を相互リンク付きでプロビジョニング）
        Prometheus ← cAdvisor（コンテナ）/ node-exporter（ホスト）
```

- アプリは「OTLP を Collector に送る」だけ。バックエンドはアプリに依存しないため再利用できる。
- 設計・仕様の詳細は [`docs/`](./docs/README.md)、開発ルールは [`CLAUDE.md`](./CLAUDE.md) / [`.claude/rules/`](./.claude/rules/) を参照。

## セットアップ

前提: Docker / Docker Compose / pnpm / Node.js 22 以上。

```bash
cp .env.example .env          # 環境変数を用意
pnpm install                  # 依存をインストール（ワークスペース）
docker compose up -d --build  # 全サービス起動（初回はイメージ取得で数分）
```

### サービス URL

| サービス | URL | 備考 |
|---|---|---|
| task-app（監視対象） | http://localhost:3000 | タスク追加/完了切替/削除 |
| Grafana | http://localhost:3001 | 既定 admin / admin |
| Prometheus | http://localhost:9090 | `/targets` で scrape 状態 |
| Tempo | http://localhost:3200 | トレース |
| Loki | http://localhost:3100 | ログ |

## 使い方（3 本柱を体験する）

1. http://localhost:3000 でタスクを数件 追加・完了切替・削除してトラフィックを生成する。
2. http://localhost:3001 （Grafana）で:
   - **Explore → Tempo**: 直近トレースを開くと、HTTP スパン配下に PostgreSQL の `pg` スパンが連なる。
   - トレースから **Logs（Loki, trace_id 相関）** / **Metrics（Prometheus）** へジャンプできる。
   - **Explore → Loki**: `{service_name="task-app"}` でログ。各ログの `trace_id` から Tempo へ。
   - **Dashboards**: `task-app RED (spanmetrics)` / `Containers & Host`。

```bash
pnpm test            # task CRUD のテスト（Vitest + pg-mem）
docker compose logs -f task-app   # アプリのログ
docker compose down  # 停止（データは保持）
docker compose down -v # 停止 + データ破棄
```

## モノレポ構成

```
apps/task-app/   Nuxt3 + Nitro + pg（監視対象 example）。OTel 計装は instrumentation.mjs
infra/           監視スタック設定（otel-collector / prometheus / tempo / loki / grafana）
docker-compose.yml  全サービス定義
docs/            仕様・設計ドキュメント（01〜11 + 索引）
```

## 将来の Web アプリ差し替え

監視スタック（`infra/` と compose のバックエンド群）は不変のまま、新アプリ側で OTel SDK を導入し
`OTEL_EXPORTER_OTLP_ENDPOINT` を Collector に向け、`OTEL_SERVICE_NAME` を設定するだけで統合できる。
詳細は [`docs/09-architecture-specification.md`](./docs/09-architecture-specification.md#将来構成web-アプリ差し替え)。
