# API 仕様書

エンドポイント・リクエスト/レスポンス形式・認証・エラーハンドリングを定義する。データモデルは [`05-data-specification.md`](./05-data-specification.md)、認証/認可方針は [`06-security-specification.md`](./06-security-specification.md) を参照。

## 目次

- [前提](#前提)
- [エンドポイント一覧](#エンドポイント一覧)
- [リクエスト/レスポンス形式](#リクエストレスポンス形式)
- [認証・エラーハンドリング](#認証エラーハンドリング)

## 前提

- 方式: REST / JSON。Nuxt 3 の Nitro サーバー（`server/api/`）で実装。
- ベース URL: `http://localhost:3000`（コンテナ内は `http://task-app:3000`）。
- 共通ヘッダー: `Content-Type: application/json`。認証ヘッダーは無し（example）。
- 全リクエスト/レスポンスは OpenTelemetry の HTTP スパンとして自動計装される。

## エンドポイント一覧

| メソッド | パス | 用途 | 認証 |
|---------|------|------|------|
| GET | `/api/tasks` | タスク一覧取得（created_at 昇順） | 不要 |
| POST | `/api/tasks` | タスク作成 | 不要 |
| PATCH | `/api/tasks/:id` | タスク更新（完了切替・タイトル変更） | 不要 |
| DELETE | `/api/tasks/:id` | タスク削除 | 不要 |

## リクエスト/レスポンス形式

タスクオブジェクト（レスポンス共通形）:

```json
{
  "id": "a1b2c3d4-....",
  "title": "買い物に行く",
  "done": false,
  "createdAt": "2026-06-20T12:34:56.000Z"
}
```

### GET /api/tasks
- レスポンス `200`: タスク配列 `[ {task}, ... ]`（空なら `[]`）。

### POST /api/tasks
- リクエスト: `{ "title": "string" }`
- レスポンス `201`: 作成された `{task}`。
- `400`: title が空 / 空白のみ / 型不正。

### PATCH /api/tasks/:id
- リクエスト（部分更新）: `{ "done"?: boolean, "title"?: string }`
- レスポンス `200`: 更新後の `{task}`。
- `400`: payload 不正（型不一致・更新項目なし・title 空）。
- `404`: 指定 id が存在しない。

### DELETE /api/tasks/:id
- レスポンス `204`: 本文なし。
- `404`: 指定 id が存在しない。

## 認証・エラーハンドリング

- 認証は無し（[`06-security-specification.md`](./06-security-specification.md) 参照。本番化時に追加）。
- エラーレスポンスは Nitro 標準のエラー形（`statusCode` / `statusMessage` を含む JSON）。

| ステータス | 契約 |
|-----------|------|
| 200 / 201 / 204 | 正常（取得・更新 / 作成 / 削除） |
| 400 | バリデーションエラー（title 空・型不正・更新項目なし・id 形式不正） |
| 404 | リソース未存在（指定 id のタスクなし） |
| 500 | サーバー/DB エラー（接続不可等）。トレース/ログにエラー記録 |
