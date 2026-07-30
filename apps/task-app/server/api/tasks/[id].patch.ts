import { getPool } from "../../utils/db";
import { toHttpError } from "../../utils/http";
import { logger } from "../../utils/logger";
import { updateTask } from "../../utils/tasks";

/**
 * PATCH /api/tasks/:id — タスクを部分更新する。
 *
 * ファイル名の `[id]` が**動的セグメント**を表し、`:id` として一致する。
 * 値は `getRouterParam(event, "id")` で取り出す（変数名はブラケット内と揃える）。
 *
 * PATCH は「送られたフィールドだけを更新する」メソッド。PUT（全体置換）と違い、
 * 未指定のフィールドは変更しない — その分岐は `updateTask` 側にある。
 */
export default defineEventHandler(async (event) => {
  // 型上は string | undefined。?? "" で空文字に寄せ、UUID 形式の検証は
  // ロジック層（assertUuid）に一任する — 不正 id は 400 になる。
  const id = getRouterParam(event, "id") ?? "";
  const body = await readBody(event);
  try {
    // done / title を「未指定なら undefined」のまま渡すのが要点。
    // updateTask は undefined のキーを SET 句に含めないため、
    // ここで既定値を埋めてしまうと意図しない上書きが起きる。
    const task = await updateTask(getPool(), id, {
      done: body?.done,
      title: body?.title,
    });
    logger.info({ taskId: task.id, done: task.done }, "updated task");
    return task;
  } catch (e) {
    logger.warn({ err: e, id }, "update task failed");
    throw toHttpError(e);
  }
});
