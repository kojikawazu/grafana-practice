/**
 * OpenTelemetry ブートストラップ。
 *
 * アプリ本体より前にロードする必要があるため、`node --import ./instrumentation.mjs ...`
 * で起動する（自動計装が http / pg などのモジュールを確実に patch できるようにするため）。
 *
 * 3 シグナルを OTLP/gRPC で中央 Collector へ送出する:
 *   - traces  : HTTP / pg 自動計装
 *   - metrics : Node ランタイムメトリクス + 自動計装
 *   - logs    : Logs SDK 経由で送出（アプリは OTel Logs API で emit。trace_id は自動付与）
 *
 * 送出先は OTEL_EXPORTER_OTLP_ENDPOINT（既定 http://otel-collector:4317）。
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";

// service.name は OTEL_SERVICE_NAME 環境変数から自動検出される（NodeSDK の既定リソース検出）。
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 15000,
  }),
  logRecordProcessors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
  instrumentations: [
    getNodeAutoInstrumentations({
      // ノイズの多い fs 計装は無効化（http / pg は有効のまま）
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
    new RuntimeNodeInstrumentation(),
  ],
});

sdk.start();

const shutdown = () => {
  sdk
    .shutdown()
    .catch((err) => console.error("OTel shutdown error", err))
    .finally(() => process.exit(0));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
