import { logs } from '@opentelemetry/api-logs';
import {
  MetricReader,
  PeriodicExportingMetricReader,
  PushMetricExporter,
} from '@opentelemetry/sdk-metrics';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import {
  BatchLogRecordProcessor,
  LogRecordExporter,
  type LogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';

enum KnownSeverityLevel {
  /** Verbose */
  Verbose = 'Verbose',
  /** Information */
  Information = 'Information',
  /** Warning */
  Warning = 'Warning',
  /** Error */
  Error = 'Error',
  /** Critical */
  Critical = 'Critical',
}

const SERVICE_NAME = 'WebUi';
const SERVICE_NAMESPACE = 'ObApps.ComplianceTheatre';
const SERVICE_VERSION = '1.0.0';
const SCHEMA_URL = 'https://opentelemetry.io/schemas/1.30.0';
const SERVICE_ID =
  'WebUi-' +
  process.env.NEXT_RUNTIME +
  '-' +
  process.env.NEXT_PHASE +
  '-' +
  Math.random().toString(36).substring(2, 15);

// Flag to prevent multiple registrations during hot reloads
let instrumentationRegistered = false;

export async function register() {
  if (instrumentationRegistered) {
    console.log('Instrumentation already registered, skip?');
    //return;
  }
  instrumentationRegistered = true;

  // Skip instrumentation during build process
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Skipping instrumentation during build phase');
    return;
  }

  try {
    let traceExporter: SpanExporter | undefined;
    let logRecordProcessor: LogRecordProcessor | undefined;
    let metricReader: MetricReader | undefined;
    const instrumentations: Array<unknown> = ['auto'];

    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const {
        AzureMonitorTraceExporter,
        AzureMonitorLogExporter,
        AzureMonitorMetricExporter,
      } = await import('@azure/monitor-opentelemetry-exporter');

      const connectionString =
        process.env.AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING;

      metricReader = new PeriodicExportingMetricReader({
        exporter: new AzureMonitorMetricExporter({
          connectionString,
        }) as unknown as PushMetricExporter,
      });
      traceExporter = new AzureMonitorTraceExporter({
        connectionString,
      }) as unknown as SpanExporter;
      logRecordProcessor = new BatchLogRecordProcessor(
        new AzureMonitorLogExporter({
          connectionString,
        }) as unknown as LogRecordExporter,
        {
          maxQueueSize: 2048,
          maxExportBatchSize: 512,
          scheduledDelayMillis: 10000,
          exportTimeoutMillis: 60000,
        },
      );

      const { PinoInstrumentation } = await import(
        '@opentelemetry/instrumentation-pino'
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
    }

    const { registerOTel } = await import('@vercel/otel');
    registerOTel({
      serviceName: SERVICE_NAME,
      attributes: {
        'service.namespace': SERVICE_NAMESPACE,
        'service.name': SERVICE_NAME,
        'service.version': SERVICE_VERSION,
        'service.schema_url': SCHEMA_URL,
        'service.id': SERVICE_ID,
      },
      logRecordProcessor,
      traceExporter: traceExporter ?? 'auto',
      instrumentations: instrumentations.length ? instrumentations : undefined,
      metricReader,
    });

    if (logRecordProcessor) {
      const loggerProvider = new LoggerProvider();
      loggerProvider.addLogRecordProcessor(logRecordProcessor);
      logs.setGlobalLoggerProvider(loggerProvider);
    }
    if (typeof window === 'undefined') {
      console.log(
        'Instrumentation Registered for server stack [' +
          process.env.NEXT_RUNTIME +
          ']',
      );
    } else {
      console.log(
        `Instrumentation Registered for client stack ${process.env.NEXT_RUNTIME}`,
      );
    }
  } catch (e) {
    // instrumentationRegistered = false;
    const { LoggedError } = await import('@/lib/react-util');
    LoggedError.isTurtlesAllTheWayDownBaby(e, { log: true });
    console.warn(
      'Instrumentation failed to register for stack ${process.env.NEXT_RUNTIME}`',
      e,
    );
  }
}
