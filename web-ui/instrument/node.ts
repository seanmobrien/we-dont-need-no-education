// instrumentation.node.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { logs } from '@opentelemetry/api-logs';

import {
  AzureMonitorTraceExporter,
  AzureMonitorMetricExporter,
  AzureMonitorLogExporter,
} from '@azure/monitor-opentelemetry-exporter';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import AfterManager from '@/lib/site-util/after';
import { config } from './common';
enum KnownSeverityLevel {
  Verbose = 'Verbose',
  Information = 'Information',
  Warning = 'Warning',
  Error = 'Error',
  Critical = 'Critical',
}
let nodeSdk: NodeSDK | undefined;
let registered = false;
async function cleanup() {
  if (nodeSdk) {
    await nodeSdk.shutdown().catch((error) => {
      console.error('Error during OTel SDK shutdown:', error);
    });
    nodeSdk = undefined;
  }
} 
export default function instrumentServer() {
  if (registered) {
    console.warn('OTel SDK already registered, skipping.');
    return;
  }
  registered = true;
  if (nodeSdk) {
    console.warn(
      'OTel SDK already initialized, skipping...NOTE: This really should not happen...',
    );
    return;
  }

  const connStr =
    process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING;

  // Skip instrumentation in development if no valid connection string
  if (process.env.NODE_ENV === 'development' && (!connStr || connStr === 'test' || connStr.includes('InstrumentationKey=test'))) {
    console.log('[otel] Skipping Azure Monitor in development mode');
    return;
  }

  const traceExporter = new AzureMonitorTraceExporter({
    connectionString: connStr,
  });
  const metricExporter = new AzureMonitorMetricExporter({
    connectionString: connStr,
  });
  const logExporter = new AzureMonitorLogExporter({
    connectionString: connStr,
  });

  const sdk = new NodeSDK({
    serviceName: config.serviceName,
    resource: new Resource({
      ...config.attributes,
    }),
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
    }),
    instrumentations: [
      //new FetchInstrumentation(config.instrumentationConfig.fetch),
      new UndiciInstrumentation({
        ignoreRequestHook: (request) => {
          // Ignore requests to auth session endpoint, too spammy
          if (request.path.includes('/api/auth/session')) {
            return true;
          }
          return false;
        },
      }),
      new PinoInstrumentation({
        disableLogSending: false,
        logHook: (span, record) => {
          record.trace_id = span.spanContext().traceId;
          record.span_id = span.spanContext().spanId;
          const lvl = String(record.level).toLowerCase();
          record.severity =
            lvl === 'error'
              ? KnownSeverityLevel.Error
              : lvl === 'warn'
                ? KnownSeverityLevel.Warning
                : lvl === 'info'
                  ? KnownSeverityLevel.Information
                  : KnownSeverityLevel.Verbose;
          record.severityNumber ||= 100;
        },
      }),
    ],
  });

  // Logger provider for OTel logs
  const loggerProvider = new LoggerProvider();
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(logExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 10000,
      exportTimeoutMillis: 60000,
    }),
  );
  logs.setGlobalLoggerProvider(loggerProvider);

  // Start SDK
  try {
    sdk.start();
    console.log('✅ OTel SDK started on NodeJS Server');
    nodeSdk = sdk;
    AfterManager.processExit(cleanup);
  } catch (error) {
    console.error('❌ OTel SDK failed to start:', error);
    registered = false;
  }
}
