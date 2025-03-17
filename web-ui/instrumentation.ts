import { logs } from '@opentelemetry/api-logs';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import {
  SimpleLogRecordProcessor,
  type LogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { registerOTel, InstrumentationOptionOrName } from '@vercel/otel';
import { Resource } from '@opentelemetry/resources';

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
        disableLogSending: false,
        // Include trace context in log records and map custom log levels
        logHook: (span, record) => {
          record['trace_id'] = span.spanContext().traceId;
          record['span_id'] = span.spanContext().spanId;
          // Map custom log levels to standard log levels
          switch (record.level) {
            case 'verbose':
              record.severity = 'DEBUG';
              break;
            case 'silly':
              record.severity = 'TRACE';
              break;
          }
          // Ensure the message property is included
          if (record.message) {
            record['message'] = record.message;
          } else {
            record['message'] = 'No message provided';
          }
        },
      }),
    );

    traceExporter = new AzureMonitorTraceExporter({
      connectionString,
    });
    // TODO: Switch to a batchrecordprocessor in prod
    logRecordProcessor = new SimpleLogRecordProcessor(
      new AzureMonitorLogExporter({
        connectionString,
      }),
    );
  }

  registerOTel({
    serviceName: 'sue-the-schools-webui',
    traceExporter,
    logRecordProcessor,
    instrumentations,
  });

  if (logRecordProcessor) {
    const loggerProvider = new LoggerProvider({
      resource: new Resource({
        'service.name': 'sue-the-schools-webui',
      }),
    });
    loggerProvider.addLogRecordProcessor(logRecordProcessor);
    logs.setGlobalLoggerProvider(loggerProvider);
  }
  console.log(
    `Instrumentation Registered for stack ${process.env.NEXT_RUNTIME}`,
  );
}
