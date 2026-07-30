# Observability infrastructure instructions

親ディレクトリの `AGENTS.md` に加え、`infra/**` を変更する前に `docker-compose.yml` と関連するプロビジョニング設定を確認してください。

- Collector、Prometheus、Tempo、Loki、Grafana 間のポート・サービス名・データフローの整合性を保つ。
- 設定またはデータソース・ダッシュボードの変更では、`README.md` と `docs/09-architecture-specification.md` への影響を確認する。
