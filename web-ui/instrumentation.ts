import { logs } from '@opentelemetry/api-logs';
import {
  MetricReader,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import {
  type LogRecordProcessor,
  LoggerProvider,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { registerOTel, InstrumentationOptionOrName } from '@vercel/otel';
import { KnownSeverityLevel } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';
import { env } from '@/lib/site-util/env';
import { Meter, metrics } from '@opentelemetry/api';

export const SERVICE_NAME = 'sue-the-schools-webui';
export const SERVICE_VERSION = '1.0.0';
export const SCHEMA_URL = 'https://sue-the-schools-webui.notaurl/schema';

export async function register() {
  try {
    let traceExporter: SpanExporter | undefined;
    let logRecordProcessor: LogRecordProcessor | undefined;
    let metricReader: MetricReader | undefined;
    const instrumentations: Array<InstrumentationOptionOrName> = [];

    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const {
        AzureMonitorTraceExporter,
        AzureMonitorLogExporter,
        AzureMonitorMetricExporter,
      } = await import('@azure/monitor-opentelemetry-exporter');
      const { PinoInstrumentation } = await import(
        '@opentelemetry/instrumentation-pino'
      );

      const connectionString = env(
        'AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING',
      );

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
      logRecordProcessor = new BatchLogRecordProcessor(
        new AzureMonitorLogExporter({
          connectionString,
        }),
        {
          maxQueueSize: 1000,
          maxExportBatchSize: 1000,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: 30000,
        },
      );
      metricReader = new PeriodicExportingMetricReader({
        exporter: new AzureMonitorMetricExporter({
          connectionString,
        }),
      });
    }

    registerOTel({
      serviceName: SERVICE_NAME,
      attributes: {
        'service.version': SERVICE_VERSION,
        'service.schema_url': SCHEMA_URL,
      },
      traceExporter,
      logRecordProcessor,
      instrumentations,
      metricReader,
    });

    if (logRecordProcessor) {
      const loggerProvider = new LoggerProvider();
      loggerProvider.addLogRecordProcessor(logRecordProcessor);
      logs.setGlobalLoggerProvider(loggerProvider);
    }
    if (typeof window === 'undefined') {
      console.log(
        `Instrumentation Registered for server stack ${process.env.NEXT_RUNTIME}`,
      );
    } else {
      console.log(
        `Instrumentation Registered for client stack ${process.env.NEXT_RUNTIME}`,
      );
    }
  } catch (e) {
    LoggedError.isTurtlesAllTheWayDownBaby(e, { log: true });
    console.warn(
      'Instrumentation failed to register for stack ${process.env.NEXT_RUNTIME}`',
      e,
    );
  }
}

export const appMeters: Meter = metrics.getMeter(
  'Application: Web UI',
  SERVICE_VERSION,
  { schemaUrl: SCHEMA_URL },
);
