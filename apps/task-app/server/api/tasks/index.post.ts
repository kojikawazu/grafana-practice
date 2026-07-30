import { getPool } from "../../utils/db";
import { toHttpError } from "../../utils/http";
import { logger } from "../../utils/logger";
import { createTask } from "../../utils/tasks";

/**
 * POST /api/tasks — タスクを作成する。
 *
 * `index.post.ts` という命名で `POST /api/tasks` に割り当てられる（GET とは別ファイル）。
 *
 * このハンドラの責務は 4 つだけ: 入力の取り出し・ロジック呼び出し・
 * ステータス設定・エラーのマップ。**検証はここに書かない**（ロジック層が持つ）。
 */
export default defineEventHandler(async (event) => {
  // readBody は body を any 相当で返す。信頼できない入力なので、
  // ここでは形を仮定せず `body?.title` で取り出し、検証は createTask に任せる。
  const body = await readBody(event);
  try {
    const task = await createTask(getPool(), { title: body?.title });
    // 既定は 200。作成を表す 201 は明示的に設定する必要がある。
    setResponseStatus(event, 201);
    logger.info({ taskId: task.id }, "created task");
    return task;
  } catch (e) {
    // ログに残してから再送出する。握り潰すとスパンが正常終了扱いになり、
    // spanmetrics が生成する RED のエラー率にも計上されなくなる。
    logger.warn({ err: e }, "create task failed");
    // ドメインエラー → HTTP ステータスの対応付けは 1 箇所（toHttpError）に集約。
    // ハンドラごとに createError を書くと、対応表が散らばって食い違う。
    throw toHttpError(e);
  }
});
