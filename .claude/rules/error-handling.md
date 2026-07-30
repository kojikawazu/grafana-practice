---
description: エラーハンドリング方針（バリデーション・ドメイン制約・例外処理）
globs: 
---

# エラーハンドリング

- **バリデーション必須**: ユーザー入力・外部入力は必ずバリデーションする。
- **ドメイン層の制約**: ドメインモデル・値オブジェクトで防げる不正値は、コンストラクタ/ファクトリで弾く。
- **ハンドラー層の検証**: ドメイン層で防げないリクエスト形式・型チェックは、ハンドラー/コントローラー層で検証する。
- **HTTP ステータスコード**: 適切なステータスコードで返す（400/401/403/404/500）。
- **統一エラーレスポンス**: エラーレスポンスの JSON 構造を統一する。
- **ログ**: エラー時はスタックトレースを含むログを出力する。センシティブ情報はログに含めない。

## 本プロジェクトでの実装

- ドメイン起因のエラーは型付き例外で表現し、HTTP 層でステータスへマップする（`TaskValidationError` → 400、`TaskNotFoundError` → 404）。実装は [`server/utils/tasks.ts`](../../apps/task-app/server/utils/tasks.ts) と [`server/utils/http.ts`](../../apps/task-app/server/utils/http.ts)。
- ログは OpenTelemetry Logs API 経由で出力する（[`server/utils/logger.ts`](../../apps/task-app/server/utils/logger.ts)）。`console.log` を直接使わない — trace_id が付かず、トレースと相関できなくなる。
- **エラーは握り潰さない**。想定外の例外（DB 接続断など）は 500 として伝播させ、テレメトリに残す。
