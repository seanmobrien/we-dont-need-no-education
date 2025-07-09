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
// import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import prexit from 'prexit';
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
    process.env.NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING;

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
      new UndiciInstrumentation(),
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
  } catch (error) {
    console.error('❌ OTel SDK failed to start:', error);
    registered = false;
  }

  prexit(() => {
    try {
      sdk.shutdown();
      console.log('✅ OTel SDK shutdown cleanly');
      nodeSdk = undefined;
      registered = false;
    } catch (error) {
      console.error('❌ OTel SDK failed to shutdown:', error);
    }
  });
}
