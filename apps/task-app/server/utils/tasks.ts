/**
 * タスク CRUD のビジネスロジック。
 *
 * 外部 I/O（DB）は {@link Queryable} 越しに受け取り、本番は pg.Pool、テストは pg-mem を
 * 同じインターフェースで注入する。バリデーションとクエリ組み立てはここに集約し、
 * HTTP 層（server/api）からは切り離してテスト可能にしている。
 */

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

/** pg.Pool / pg-mem の Pool が満たす最小インターフェース */
export interface Queryable {
  query(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: any[]; rowCount: number | null }>;
}

/** 入力起因のエラー → HTTP 400 にマップする */
export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskValidationError";
  }
}

/** 対象リソース不在 → HTTP 404 にマップする */
export class TaskNotFoundError extends Error {
  constructor(message = "Task not found") {
    super(message);
    this.name = "TaskNotFoundError";
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT_COLUMNS = "id, title, done, created_at";

function mapRow(row: any): Task {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString();
  return {
    id: String(row.id),
    title: row.title,
    done: Boolean(row.done),
    createdAt,
  };
}

function normalizeTitle(title: unknown): string {
  if (typeof title !== "string") {
    throw new TaskValidationError("title must be a string");
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new TaskValidationError("title must not be empty");
  }
  return trimmed;
}

function assertUuid(id: string): void {
  if (!UUID_RE.test(id)) {
    throw new TaskValidationError("invalid id format");
  }
}

export async function listTasks(db: Queryable): Promise<Task[]> {
  const { rows } = await db.query(
    `SELECT ${SELECT_COLUMNS} FROM tasks ORDER BY created_at ASC, id ASC`
  );
  return rows.map(mapRow);
}

export async function createTask(
  db: Queryable,
  input: { title: unknown }
): Promise<Task> {
  const title = normalizeTitle(input.title);
  const { rows } = await db.query(
    `INSERT INTO tasks (title) VALUES ($1) RETURNING ${SELECT_COLUMNS}`,
    [title]
  );
  return mapRow(rows[0]);
}

export async function updateTask(
  db: Queryable,
  id: string,
  patch: { done?: unknown; title?: unknown }
): Promise<Task> {
  assertUuid(id);

  const sets: string[] = [];
  const params: unknown[] = [];

  if (patch.title !== undefined) {
    params.push(normalizeTitle(patch.title));
    sets.push(`title = $${params.length}`);
  }
  if (patch.done !== undefined) {
    if (typeof patch.done !== "boolean") {
      throw new TaskValidationError("done must be a boolean");
    }
    params.push(patch.done);
    sets.push(`done = $${params.length}`);
  }
  if (sets.length === 0) {
    throw new TaskValidationError("no updatable fields provided");
  }

  params.push(id);
  const { rows } = await db.query(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING ${SELECT_COLUMNS}`,
    params
  );
  if (rows.length === 0) {
    throw new TaskNotFoundError();
  }
  return mapRow(rows[0]);
}

export async function deleteTask(db: Queryable, id: string): Promise<void> {
  assertUuid(id);
  const { rowCount } = await db.query("DELETE FROM tasks WHERE id = $1", [id]);
  if (!rowCount) {
    throw new TaskNotFoundError();
  }
}
