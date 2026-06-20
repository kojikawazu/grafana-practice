import { getPool } from "../../utils/db";
import { toHttpError } from "../../utils/http";
import { logger } from "../../utils/logger";
import { updateTask } from "../../utils/tasks";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const body = await readBody(event);
  try {
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
