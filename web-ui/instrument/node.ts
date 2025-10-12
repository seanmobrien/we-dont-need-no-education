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
import { ChunkingTraceExporter } from './chunking/ChunkingTraceExporter';
import { ChunkingLogExporter } from './chunking/ChunkingLogExporter';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { config } from './common';
import AfterManager from '@/lib/site-util/after';

enum KnownSeverityLevel {
  Verbose = 'Verbose',
  Information = 'Information',
  Warning = 'Warning',
  Error = 'Error',
  Critical = 'Critical',
}

// Global symbol keys for singleton registry
const NODE_SDK_KEY = Symbol.for('@noeducation/instrumentation:nodeSdk');
const REGISTERED_KEY = Symbol.for('@noeducation/instrumentation:registered');

// Global registry accessors for NodeSDK singleton
const getNodeSdk = (): NodeSDK | undefined => {
  type GlobalReg = { [k: symbol]: NodeSDK | undefined };
  const g = globalThis as unknown as GlobalReg;
  return g[NODE_SDK_KEY];
};

const setNodeSdk = (value: NodeSDK | undefined): void => {
  type GlobalReg = { [k: symbol]: NodeSDK | undefined };
  const g = globalThis as unknown as GlobalReg;
  g[NODE_SDK_KEY] = value;
};

// Global registry accessors for registered flag singleton
const getRegistered = (): boolean => {
  type GlobalReg = { [k: symbol]: boolean };
  const g = globalThis as unknown as GlobalReg;
  return g[REGISTERED_KEY] ?? false;
};

const setRegistered = (value: boolean): void => {
  type GlobalReg = { [k: symbol]: boolean };
  const g = globalThis as unknown as GlobalReg;
  g[REGISTERED_KEY] = value;
};

const cleanup = async (): Promise<void> => {
  const sdk = getNodeSdk();
  if (sdk) {
    await sdk.shutdown().catch((error) => {
      console.error('Error during OTel SDK shutdown:', error);
    });
    setNodeSdk(undefined);
  }
};
const instrumentServer = () => {
  if (getRegistered()) {
    console.warn('OTel SDK already registered, skipping.');
    return;
  }
  setRegistered(true);
  if (getNodeSdk()) {
    console.warn(
      'OTel SDK already initialized, skipping...NOTE: This really should not happen...',
    );
    return;
  }

  const connStr = process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING;

  // Skip instrumentation in development if no valid connection string
  if (
    process.env.NODE_ENV === 'development' &&
    (!connStr ||
      connStr === 'test' ||
      connStr.includes('InstrumentationKey=test'))
  ) {
    console.log('[otel] Skipping Azure Monitor in development mode');
    return;
  }

  const traceExporter = new ChunkingTraceExporter(
    new AzureMonitorTraceExporter({ connectionString: connStr }),
    { maxChunkChars: 8000, keepOriginalKey: false },
  );
  const metricExporter = new AzureMonitorMetricExporter({
    connectionString: connStr,
  });
  const logExporter = new ChunkingLogExporter(
    new AzureMonitorLogExporter({ connectionString: connStr }),
    { maxChunkChars: 8000, keepOriginalKey: false },
  );

  const sdk = new NodeSDK({
    serviceName: config.serviceName,
    resource: new Resource({
      ...config.attributes,
    }),
    spanLimits: {
      attributeValueLengthLimit: 8000,
      attributeCountLimit: 64,
      eventCountLimit: 256,
    },
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
    }),
    instrumentations: [
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
          if (record.error) {
            record.body =
              record.error.stack ||
              record.error.message ||
              String(record.error);
            delete record.error;
            record.level = 'error';
          }
          const lvl = String(record.level).toLowerCase();
          if (lvl === 'silly' || lvl === '1') {
            return;
          }
          record.severity =
            lvl === 'error'
              ? KnownSeverityLevel.Error
              : lvl === 'warn'
                ? KnownSeverityLevel.Warning
                : lvl === 'info'
                  ? KnownSeverityLevel.Information
                  : KnownSeverityLevel.Verbose;
          switch (record.severity) {
            case KnownSeverityLevel.Error:
            case KnownSeverityLevel.Critical:
              record.severityNumber = 17; // ERROR
              break;
            case KnownSeverityLevel.Warning:
              record.severityNumber = 13; // WARNING
              break;
            case KnownSeverityLevel.Information:
              record.severityNumber = 9; // INFO
              break;
            case KnownSeverityLevel.Verbose:
              record.severityNumber = 5; // DEBUG/VERBOSE
              break;
            default:
              record.severityNumber ||= 2;
              break;
          }
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
    setNodeSdk(sdk);
    AfterManager.processExit(cleanup);
  } catch (error) {
    console.error('❌ OTel SDK failed to start:', error);
    setRegistered(false);
  }
  return Promise.resolve(void 0);
};

export default instrumentServer;
