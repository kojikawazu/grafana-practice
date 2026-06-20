import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { DataType, newDb } from "pg-mem";
import {
  createTask,
  deleteTask,
  listTasks,
  TaskNotFoundError,
  TaskValidationError,
  updateTask,
  type Queryable,
} from "../server/utils/tasks";

/**
 * pg-mem で本物の SQL を実行する実 DB を作る。
 * ビジネスロジック（クエリ・バリデーション）はモックせず、外部 I/O だけを差し替える。
 */
function makeDb(): Queryable {
  const mem = newDb();
  mem.public.registerFunction({
    name: "gen_random_uuid",
    returns: DataType.uuid,
    implementation: () => randomUUID(),
    impure: true,
  });
  mem.public.none(`
    CREATE TABLE tasks (
      id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      title      text        NOT NULL,
      done       boolean     NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const { Pool } = mem.adapters.createPg();
  return new Pool() as unknown as Queryable;
}

const MISSING_ID = "00000000-0000-0000-0000-000000000000";

describe("tasks service", () => {
  let db: Queryable;

  beforeEach(() => {
    db = makeDb();
  });

  // ---- 正常系 ----
  describe("正常系", () => {
    it("createTask: id/createdAt を採番し done=false で返す", async () => {
      const task = await createTask(db, { title: "  買い物  " });
      expect(task.title).toBe("買い物"); // 前後トリムされる
      expect(task.done).toBe(false);
      expect(task.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(new Date(task.createdAt).getTime()).not.toBeNaN();
    });

    it("listTasks: created_at 昇順で返す", async () => {
      const a = await createTask(db, { title: "A" });
      const b = await createTask(db, { title: "B" });
      const c = await createTask(db, { title: "C" });
      // created_at を C < A < B の順に明示設定して並び順を検証
      await db.query("UPDATE tasks SET created_at = $1 WHERE id = $2", [
        "2026-01-01T00:00:00Z",
        c.id,
      ]);
      await db.query("UPDATE tasks SET created_at = $1 WHERE id = $2", [
        "2026-01-02T00:00:00Z",
        a.id,
      ]);
      await db.query("UPDATE tasks SET created_at = $1 WHERE id = $2", [
        "2026-01-03T00:00:00Z",
        b.id,
      ]);

      const list = await listTasks(db);
      expect(list.map((t) => t.title)).toEqual(["C", "A", "B"]);
    });

    it("updateTask: done=true に更新し当該タスクのみ変わる", async () => {
      const t1 = await createTask(db, { title: "t1" });
      const t2 = await createTask(db, { title: "t2" });

      const updated = await updateTask(db, t1.id, { done: true });
      expect(updated.id).toBe(t1.id);
      expect(updated.done).toBe(true);

      const list = await listTasks(db);
      const other = list.find((t) => t.id === t2.id);
      expect(other?.done).toBe(false);
    });

    it("deleteTask: 一覧から消える", async () => {
      const t1 = await createTask(db, { title: "t1" });
      await createTask(db, { title: "t2" });

      await deleteTask(db, t1.id);

      const list = await listTasks(db);
      expect(list).toHaveLength(1);
      expect(list.some((t) => t.id === t1.id)).toBe(false);
    });
  });

  // ---- 準正常系 / 異常系 ----
  describe("準正常系・異常系", () => {
    it("createTask: 空文字 title は拒否", async () => {
      await expect(createTask(db, { title: "" })).rejects.toBeInstanceOf(
        TaskValidationError
      );
    });

    it("createTask: 空白のみ title は拒否", async () => {
      await expect(createTask(db, { title: "   " })).rejects.toBeInstanceOf(
        TaskValidationError
      );
    });

    it("updateTask: 存在しない id は NotFound", async () => {
      await expect(
        updateTask(db, MISSING_ID, { done: true })
      ).rejects.toBeInstanceOf(TaskNotFoundError);
    });

    it("deleteTask: 存在しない id は NotFound", async () => {
      await expect(deleteTask(db, MISSING_ID)).rejects.toBeInstanceOf(
        TaskNotFoundError
      );
    });

    it("updateTask: done が真偽値でないと拒否", async () => {
      const t = await createTask(db, { title: "t" });
      await expect(
        updateTask(db, t.id, { done: "yes" as unknown })
      ).rejects.toBeInstanceOf(TaskValidationError);
    });

    it("updateTask: 更新項目なしは拒否", async () => {
      const t = await createTask(db, { title: "t" });
      await expect(updateTask(db, t.id, {})).rejects.toBeInstanceOf(
        TaskValidationError
      );
    });

    it("updateTask: 不正な id 形式は拒否", async () => {
      await expect(
        updateTask(db, "not-a-uuid", { done: true })
      ).rejects.toBeInstanceOf(TaskValidationError);
    });

    it("listTasks: DB エラーは握り潰さず伝播する", async () => {
      const failing: Queryable = {
        query: () => Promise.reject(new Error("connection refused")),
      };
      await expect(listTasks(failing)).rejects.toThrow("connection refused");
    });
  });
});
