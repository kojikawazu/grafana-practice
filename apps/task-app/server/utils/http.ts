import { createError } from "h3";
import { TaskNotFoundError, TaskValidationError } from "./tasks";

/**
 * ドメインエラーを HTTP エラーへマップする。
 * - TaskValidationError → 400
 * - TaskNotFoundError   → 404
 * - その他              → 500
 */
export function toHttpError(e: unknown) {
  if (e instanceof TaskValidationError) {
    return createError({ statusCode: 400, statusMessage: e.message });
  }
  if (e instanceof TaskNotFoundError) {
    return createError({ statusCode: 404, statusMessage: e.message });
  }
  return createError({ statusCode: 500, statusMessage: "Internal Server Error" });
}
