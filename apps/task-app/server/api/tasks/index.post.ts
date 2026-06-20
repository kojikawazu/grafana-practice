import { getPool } from "../../utils/db";
import { toHttpError } from "../../utils/http";
import { logger } from "../../utils/logger";
import { createTask } from "../../utils/tasks";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  try {
    const task = await createTask(getPool(), { title: body?.title });
    setResponseStatus(event, 201);
    logger.info({ taskId: task.id }, "created task");
    return task;
  } catch (e) {
    logger.warn({ err: e }, "create task failed");
    throw toHttpError(e);
  }
});
