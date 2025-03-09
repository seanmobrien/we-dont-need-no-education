import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import {
  SimpleLogRecordProcessor,
  type LogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { registerOTel, InstrumentationOptionOrName } from '@vercel/otel';
export async function register() {
  let traceExporter: SpanExporter | undefined;
  let logRecordProcessor: LogRecordProcessor | undefined;
  const instrumentations: Array<InstrumentationOptionOrName> = [];

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { AzureMonitorTraceExporter, AzureMonitorLogExporter } = await import(
      '@azure/monitor-opentelemetry-exporter'
    );
    const { PinoInstrumentation } = await import(
      '@opentelemetry/instrumentation-pino'
    );

    const connectionString =
      process.env.AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING;

    instrumentations.push(
      new PinoInstrumentation({
        // disableLogSending: true,
        // Pino instrumentation options.
      })
    );

    traceExporter = new AzureMonitorTraceExporter({
      connectionString,
    });
    // TODO: Switch to a batchrecordprocessor in prod
    logRecordProcessor = new SimpleLogRecordProcessor(
      new AzureMonitorLogExporter({
        connectionString,
      })
    );
  }

  registerOTel({
    serviceName: 'sue-the-schools-webui',
    traceExporter,
    logRecordProcessor,
    instrumentations,
  });

  console.log('Instrumentation Registered');
}
