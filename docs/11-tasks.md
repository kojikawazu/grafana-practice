# タスク・進捗

開発タスク・マイルストーン・進捗を管理する。フェーズ構成は [`../.claude/rules/quality-gate.md`](../.claude/rules/quality-gate.md)（設計→レビュー→実装）に従う。

## 目次

- [マイルストーン](#マイルストーン)
- [タスク一覧](#タスク一覧)
- [完了済み（実績）](#完了済み実績)
- [将来課題・ブロッカー](#将来課題ブロッカー)

## マイルストーン

| マイルストーン | 目標 | 時期 |
|------|------|------|
| A. 設計（docs 記入） | 01〜11 の仕様を確定し、セルフレビュー → ユーザーレビュー | 現フェーズ |
| B. 実装 | モノレポ土台 / task-app / OTel 計装 / infra 設定 / compose / テスト | A 確定後 |
| C. 検証 | E2E（3 本柱の相互リンク・ダッシュボード・受け入れ条件）確認 | B 完了後 |

## タスク一覧

| タスク | 状態 | 優先度 |
|--------|------|--------|
| docs/01〜11 記入 + セルフレビュー | 完了 | 高 |
| モノレポ土台（pnpm-workspace / 設定ファイル / git ブランチ） | 完了 | 高 |
| task-app（Nuxt3 + Nitro + pg + UI） | 完了 | 高 |
| OTel 計装（instrumentation.mjs：3 シグナル / ログは OTel Logs API） | 完了 | 高 |
| infra 設定（collector / prometheus / tempo / loki / grafana） | 完了 | 高 |
| docker-compose.yml（全サービス + healthcheck） | 完了 | 高 |
| テスト（Vitest + pg-mem） | 完了 | 中 |
| README / docs 同期 | 完了 | 中 |
| E2E 検証（3 本柱 + 相互リンク） | 完了 | 高 |

## 完了済み（実績）

- `project-init` による初期化（CLAUDE.md / .claude/rules/ / docs テンプレ）。
- 監視モノレポ構築プランの確定（2 ゲート構成）。
- フェーズ B 実装完了。`docker compose up` で 9 サービス起動、`pnpm test` グリーン（12 ケース）。
- E2E 検証: Tempo にトレース（pg DB スパン含む）/ Prometheus に spanmetrics RED / Loki にログ（trace_id 相関）を確認。ログの trace_id が Tempo のトレースに解決することも確認。

## 将来課題・ブロッカー

- example task-app の本命 Web アプリへの差し替え（[`09` 将来構成](./09-architecture-specification.md#将来構成web-アプリ差し替え)）。
- アラート通知連携・本番運用（高可用・永続化・認証）は現状スコープ外。
- CI（`pnpm test` の自動実行）導入は将来検討。
