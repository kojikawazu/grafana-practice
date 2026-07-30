import { getPool } from "../../utils/db";
import { logger } from "../../utils/logger";
import { listTasks } from "../../utils/tasks";

/**
 * GET /api/tasks — タスク一覧を返す。
 *
 * ルートは**ファイル名から決まる**（Nitro の規約）:
 *   `server/api/tasks/index.get.ts` → `GET /api/tasks`
 * `.get` サフィックスがメソッドを表すため、ハンドラ内でメソッド分岐を書かない。
 *
 * ハンドラは薄く保つ。DB ハンドルを取ってロジックへ渡すだけで、
 * クエリ組み立てや検証は `server/utils/tasks.ts` が持つ（`.claude/rules/api.md`）。
 *
 * 返した配列は Nitro が自動で JSON 化し、200 を付けて返す。
 * このハンドラの実行時間そのものが、自動計装により HTTP スパンとして記録される。
 */
export default defineEventHandler(async () => {
  // getPool() をハンドラ側で呼び、ロジックには Queryable として渡す。
  // この 1 段の分離により、テストでは pg-mem を注入できる。
  const tasks = await listTasks(getPool());
  // logger は OTel Logs API 経由。アクティブな HTTP スパンから trace_id が
  // 自動で付くため、Loki のこの行から Tempo のトレースへ飛べる。
  logger.info({ count: tasks.length }, "listed tasks");
  return tasks;
});
