# Task application instructions

親ディレクトリの `AGENTS.md` に加え、`apps/task-app/**` を変更する前に、Nuxt 3 / Nitro / PostgreSQL を使うタスクアプリの既存実装とテストを確認してください。

- API またはタスクの振る舞いを変更する場合は、`docs/03-functional-specification.md` と `docs/07-api-specification.md` への影響を確認する。
- データモデルまたは初期化 SQL を変更する場合は、`docs/05-data-specification.md` への影響を確認する。
- OpenTelemetry の計装・環境変数・サービス名を変更する場合は、`README.md` と `docs/09-architecture-specification.md` への影響を確認する。

`server/**` の変更には、さらに `apps/task-app/server/AGENTS.md` を適用します。
