import { getPool } from "../../utils/db";
import { toHttpError } from "../../utils/http";
import { logger } from "../../utils/logger";
import { deleteTask } from "../../utils/tasks";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  try {
    await deleteTask(getPool(), id);
    setResponseStatus(event, 204);
    logger.info({ taskId: id }, "deleted task");
    return null;
  } catch (e) {
    logger.warn({ err: e, id }, "delete task failed");
    throw toHttpError(e);
  }
});
