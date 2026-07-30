import { getPool } from "../../utils/db";
import { toHttpError } from "../../utils/http";
import { logger } from "../../utils/logger";
import { deleteTask } from "../../utils/tasks";

/**
 * DELETE /api/tasks/:id — タスクを削除する。
 *
 * 存在しない id は 404 にする（`deleteTask` が rowCount 0 で NotFound を投げる）。
 * 「消えていればよい」と考えて常に 204 を返す設計も有り得るが、
 * 本 API は誤った id を検知できることを優先している。
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  try {
    await deleteTask(getPool(), id);
    // 204 = No Content。本文を持たないことを表すステータスなので、
    // ここで JSON を返すと仕様と矛盾する。
    setResponseStatus(event, 204);
    logger.info({ taskId: id }, "deleted task");
    // undefined を返すと Nitro が {} を書き出す場合があるため、明示的に null を返す。
    return null;
  } catch (e) {
    logger.warn({ err: e, id }, "delete task failed");
    throw toHttpError(e);
  }
});
