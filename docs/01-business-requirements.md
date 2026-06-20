# 要求仕様書

プロジェクトの背景・目標・スコープ・制約を定義する。機能の詳細要件は [`02-requirements-specification.md`](./02-requirements-specification.md) を参照。

## 目次

- [背景・目的](#背景目的)
- [ステークホルダー](#ステークホルダー)
- [スコープ](#スコープ)
- [制約・前提](#制約前提)
- [主要な決定事項](#主要な決定事項)

## 背景・目的

Grafana + Prometheus + OpenTelemetry を組み合わせた**監視（オブザーバビリティ）基盤**を、手元の Docker 環境で一気通貫に体験・学習することが目的。

- メトリクス・トレース・ログの「3 本柱」を OpenTelemetry で収集し、Grafana で相互にたどれる状態を作る。
- 監視対象（observed app）は example として **Nuxt 3 タスク管理アプリ** を同梱するが、**将来は別の Web アプリへ差し替える**前提。
- そのため監視スタックと監視対象アプリを**疎結合**にし、アプリは「OTLP でテレメトリを吐くだけ」、バックエンド（収集・保存・可視化）は不変で再利用できる構成を目指す。

## ステークホルダー

| 役割 | 説明 |
|------|------|
| 開発者（本人） | 監視基盤の構築・学習・将来アプリへの流用を行う主体 |
| 将来の被監視アプリ | example の task-app を差し替える本命の Web アプリ（OTLP 送出側） |
| 運用（将来） | 本番運用時にアラート・認証・永続化を担う想定（現状スコープ外） |

## スコープ

- 監視スタックを Docker Compose で起動できるモノレポ（pnpm workspaces）。
- OpenTelemetry Collector を中央ハブとした収集経路（アプリ → OTLP → Collector → 各バックエンド）。
- メトリクス（Prometheus）・トレース（Tempo）・ログ（Loki）の 3 バックエンド + Grafana 可視化。
- トレース ↔ ログ ↔ メトリクスの相互リンク（trace_id 相関 / exemplar / サービスグラフ）。
- 監視対象 example：Nuxt 3 タスク管理アプリ（PostgreSQL）と、その OTel 計装。
- コンテナ/ホストメトリクス（cAdvisor / node-exporter）。

### スコープ外（将来拡張）

- 本番運用（高可用・スケール・長期保存・外形監視）。
- アラート通知連携（Alertmanager / Slack / PagerDuty など）。
- 認証・マルチテナント・TLS 化などのセキュリティ強化（ローカルデモ前提）。
- example アプリ自体の機能拡張（あくまで監視確認用の最小 CRUD）。

## 制約・前提

- 実行環境はローカルの Docker / Docker Compose。OS は macOS（darwin）を想定。
- モノレポ管理は pnpm workspaces。Node.js ランタイムは 22 系を想定。
- 技術スタックの詳細は [`09-architecture-specification.md`](./09-architecture-specification.md) を参照。
- データは検証用途のため永続化は named volume に留め、`down -v` で破棄可能とする。

## 主要な決定事項

| 決定 | 内容 | 理由 |
|------|------|------|
| 監視スコープ | 3 本柱フル（メトリクス + トレース + ログ） | OpenTelemetry の旨味（相互リンク）を最大限体験するため |
| 収集経路 | 中央 OpenTelemetry Collector 経由 | 被監視アプリを差し替えてもバックエンド構成を不変にできる |
| モノレポ | pnpm workspaces（`apps/` + `infra/`） | Nuxt 3 と相性が良く軽量。Docker ビルドとも好相性 |
| example データ層 | PostgreSQL | DB スパンが出て分散トレースのデモ価値が高い |
