# Grafana Practice

Grafana を使った可視化・モニタリングの学習・検証用プロジェクト

## Rules

明示的な指示がなくても、`.claude/rules/` 内のルールを常に守ってください。

Codex 向けには、同じルールを階層型の [`AGENTS.md`](./AGENTS.md) から参照します。ルールファイルの構成・名称・適用対象を変更する場合は、`CLAUDE.md`、該当する `AGENTS.md`、README の案内を同時に更新してください。

| ファイル | スコープ | 内容 |
|---------|---------|------|
| shortcuts.md | 全体 | 指示ショートカット（PR出して、PR承認しました 等） |
| workflow.md | 全体 | 開発フロー（ブランチ運用・テスト必須） |
| quality-gate.md | 全体 | 品質ゲート（セルフレビュー・設計/実装レビュー） |
| documentation.md | 全体 | ドキュメント更新ルール |
| git.md | 全体 | GitHub Flow・ブランチ命名・push 禁止物 |
| testing.md | 全体 | テスト分類・原則、テストツール（Vitest / pg-mem）・配置 |
| error-handling.md | 全体 | エラーハンドリング方針（検証・ステータス・ログ） |
| duplication.md | 全体 | 重複と共通化の判断基準 |
| dead-code.md | 全体 | デッドコード禁止 |
| security.md | 全体 | セキュリティ方針（インジェクション対策・シークレット・テレメトリ） |
| typescript.md | `apps/task-app/**` | TypeScript 規約（type/interface・型/定数の配置・any 禁止） |
| frontend.md | `apps/task-app/` の `pages` `components` `composables` 等 | Nuxt 3 フロントエンド設計・レイヤ依存 |
| api.md | `apps/task-app/server/**` | Nitro Server API 設計・レスポンス整形・計装 |
