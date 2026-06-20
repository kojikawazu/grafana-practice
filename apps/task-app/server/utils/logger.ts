import { logs, SeverityNumber } from "@opentelemetry/api-logs";

/**
 * OpenTelemetry Logs API を直接使う構造化ロガー。
 *
 * Nitro/rollup がアプリをバンドルするため、`instrumentation-pino` の
 * モジュール patch 方式は効かない。代わりに Logs API で直接 LogRecord を emit する。
 * emit 時のアクティブコンテキスト（HTTP スパン）から trace_id / span_id が
 * 自動付与されるため、Logs SDK 経由で Collector → Loki に送られ、トレースと相関できる。
 *
 * あわせて stdout にも JSON を出力し、`docker compose logs` でも読めるようにする。
 */
const otelLogger = logs.getLogger("task-app");

type Attrs = Record<string, unknown>;

/** OTel の属性値はプリミティブのみ。オブジェクト/エラーは文字列化する。 */
function sanitize(attrs?: Attrs): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!attrs) return out;
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (v instanceof Error) {
      out[k] = `${v.name}: ${v.message}`;
    } else {
      out[k] = JSON.stringify(v);
    }
  }
  return out;
}

function emit(
  severityText: "INFO" | "WARN" | "ERROR",
  severityNumber: SeverityNumber,
  attrsOrMessage: Attrs | string,
  maybeMessage?: string
): void {
  const [attrs, body] =
    typeof attrsOrMessage === "string"
      ? [undefined, attrsOrMessage]
      : [attrsOrMessage, maybeMessage ?? ""];
  const attributes = sanitize(attrs);

  otelLogger.emit({ severityText, severityNumber, body, attributes });
  // stdout ミラー
  console.log(JSON.stringify({ level: severityText, msg: body, ...attributes }));
}

export const logger = {
  info(attrsOrMessage: Attrs | string, message?: string) {
    emit("INFO", SeverityNumber.INFO, attrsOrMessage, message);
  },
  warn(attrsOrMessage: Attrs | string, message?: string) {
    emit("WARN", SeverityNumber.WARN, attrsOrMessage, message);
  },
  error(attrsOrMessage: Attrs | string, message?: string) {
    emit("ERROR", SeverityNumber.ERROR, attrsOrMessage, message);
  },
};
