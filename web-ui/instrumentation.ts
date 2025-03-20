import { logs } from '@opentelemetry/api-logs';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import {
  SimpleLogRecordProcessor,
  type LogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { registerOTel, InstrumentationOptionOrName } from '@vercel/otel';
import { KnownSeverityLevel } from './lib/logger';
import { LoggedError } from './lib/react-util';

export async function register() {
  try {
    let traceExporter: SpanExporter | undefined;
    let logRecordProcessor: LogRecordProcessor | undefined;
    const instrumentations: Array<InstrumentationOptionOrName> = [];

    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const { AzureMonitorTraceExporter, AzureMonitorLogExporter } =
        await import('@azure/monitor-opentelemetry-exporter');
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
            switch (String(record.level ?? '').toLocaleLowerCase()) {
              case 'verbose':
              case 'silly':
              case 'debug':
                record.severity = KnownSeverityLevel.Warning;
                break;
              case 'info':
                record.severity = KnownSeverityLevel.Warning;
                break;
              case 'warn':
                record.severity = KnownSeverityLevel.Warning;
                break;
              default:
                record.severity = KnownSeverityLevel.Warning; // record.level;
                break;
            }
            record.severityNumber = record.severityNumber ?? 100;
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
      const loggerProvider = new LoggerProvider();
      loggerProvider.addLogRecordProcessor(logRecordProcessor);
      logs.setGlobalLoggerProvider(loggerProvider);
    }
    console.log(
      `Instrumentation Registered for stack ${process.env.NEXT_RUNTIME}`,
    );
  } catch (e) {
    LoggedError.isTurtlesAllTheWayDownBaby(e, { log: true });
    console.warn(
      'Instrumentation failed to register for stack ${process.env.NEXT_RUNTIME}`',
      e,
    );
  }
}
