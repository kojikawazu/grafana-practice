import { getPool } from "../../utils/db";
import { logger } from "../../utils/logger";
import { listTasks } from "../../utils/tasks";

export default defineEventHandler(async () => {
  const tasks = await listTasks(getPool());
  logger.info({ count: tasks.length }, "listed tasks");
  return tasks;
});
