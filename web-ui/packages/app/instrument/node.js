import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { LoggerProvider, BatchLogRecordProcessor, } from '@opentelemetry/sdk-logs';
import { logs } from '@opentelemetry/api-logs';
import { AzureMonitorTraceExporter, AzureMonitorMetricExporter, AzureMonitorLogExporter, } from '@azure/monitor-opentelemetry-exporter';
import { ChunkingTraceExporter } from './chunking/chunking-trace-exporter';
import { ChunkingLogExporter } from './chunking/chunking-log-exporter';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { config } from './common';
import AfterManager from '@compliance-theater/after';
import UrlFilteredSpanExporter from './url-filter/url-filter-trace-exporter';
import UrlFilteredLogExporter from './url-filter/url-filtered-log-exporter';
var KnownSeverityLevel;
(function (KnownSeverityLevel) {
    KnownSeverityLevel["Verbose"] = "Verbose";
    KnownSeverityLevel["Information"] = "Information";
    KnownSeverityLevel["Warning"] = "Warning";
    KnownSeverityLevel["Error"] = "Error";
    KnownSeverityLevel["Critical"] = "Critical";
})(KnownSeverityLevel || (KnownSeverityLevel = {}));
const NODE_SDK_KEY = Symbol.for('@noeducation/instrumentation:nodeSdk');
const REGISTERED_KEY = Symbol.for('@noeducation/instrumentation/nodeSdk:registered');
const getNodeSdk = () => {
    const g = globalThis;
    return g[NODE_SDK_KEY];
};
const setNodeSdk = (value) => {
    const g = globalThis;
    g[NODE_SDK_KEY] = value;
};
const getRegistered = () => {
    const g = globalThis;
    return g[REGISTERED_KEY] ?? false;
};
const setRegistered = (value) => {
    const g = globalThis;
    g[REGISTERED_KEY] = value;
};
const cleanup = async () => {
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
        console.warn('OTel SDK already initialized, skipping...NOTE: This really should not happen...');
        return;
    }
    const connStr = process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING
        ?? process.env.AZURE_MONITOR_CONNECTION_STRING;
    console.info(`[otel] Azure Monitor Connection String: [${connStr}]`);
    if (process.env.NODE_ENV === 'development' &&
        (!connStr ||
            connStr === 'test' ||
            connStr.includes('InstrumentationKey=test'))) {
        console.log('[otel] Skipping Azure Monitor in development mode');
        return;
    }
    const urlFilter = {
        rules: ['/api/auth/login', '/api/auth/session', '/api/health'],
    };
    const traceExporter = new UrlFilteredSpanExporter(new ChunkingTraceExporter(new AzureMonitorTraceExporter({
        connectionString: connStr,
    }), { maxChunkChars: 8000, keepOriginalKey: false }), urlFilter);
    const metricExporter = new AzureMonitorMetricExporter({
        connectionString: connStr,
    });
    const logExporter = new UrlFilteredLogExporter(new ChunkingLogExporter(new AzureMonitorLogExporter({ connectionString: connStr }), { maxChunkChars: 8000, keepOriginalKey: false }), urlFilter);
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
            new UndiciInstrumentation({}),
            new PinoInstrumentation({
                disableLogSending: false,
                logHook: (span, record) => {
                    record.trace_id = span.spanContext().traceId;
                    record.span_id = span.spanContext().spanId;
                    if (record.attribs) {
                        Object.entries(record.attribs).forEach(([key, value]) => {
                            if (value) {
                                span.setAttribute(key, String(value));
                            }
                        });
                    }
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
                            record.severityNumber = 17;
                            break;
                        case KnownSeverityLevel.Warning:
                            record.severityNumber = 13;
                            break;
                        case KnownSeverityLevel.Information:
                            record.severityNumber = 9;
                            break;
                        case KnownSeverityLevel.Verbose:
                            record.severityNumber = 5;
                            break;
                        default:
                            record.severityNumber ||= 2;
                            break;
                    }
                },
            }),
        ],
    });
    const loggerProvider = new LoggerProvider();
    loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 10000,
        exportTimeoutMillis: 60000,
    }));
    logs.setGlobalLoggerProvider(loggerProvider);
    try {
        sdk.start();
        console.log('✅ OTel SDK started on NodeJS Server');
        setNodeSdk(sdk);
        AfterManager.processExit(cleanup);
    }
    catch (error) {
        console.error('❌ OTel SDK failed to start:', error);
        setRegistered(false);
    }
    return Promise.resolve(void 0);
};
export default instrumentServer;
//# sourceMappingURL=node.js.map