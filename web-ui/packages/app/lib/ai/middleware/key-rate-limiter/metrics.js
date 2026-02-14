import { globalRequiredSingleton } from '@compliance-theater/typescript';
import { metrics } from '@opentelemetry/api';
const meter = metrics.getMeter('key-rate-limiter', '1.0.0');
const messagesProcessedCounter = meter.createCounter('rate_limit_messages_processed_total', {
    description: 'Total number of rate-limited messages processed',
});
const errorsCounter = meter.createCounter('rate_limit_errors_total', {
    description: 'Total number of errors during rate limit processing',
});
const processingDurationHistogram = meter.createHistogram('rate_limit_processing_duration_ms', {
    description: 'Time taken to process rate-limited messages',
    unit: 'ms',
});
const queueSizeGauge = meter.createUpDownCounter('rate_limit_queue_size', {
    description: 'Current number of messages in the rate limit queue',
});
export class RateLimitMetricsCollector {
    static getInstance() {
        return globalRequiredSingleton(Symbol.for('@noeducation/key-rate-limiter:RateLimitMetricsCollector'), () => new RateLimitMetricsCollector());
    }
    recordMessageProcessed(modelClassification, generation) {
        messagesProcessedCounter.add(1, {
            model_classification: modelClassification,
            generation: generation.toString(),
        });
    }
    recordError(errorType, modelClassification) {
        errorsCounter.add(1, {
            error_type: errorType,
            model_classification: modelClassification || 'unknown',
        });
    }
    recordProcessingDuration(durationMs, modelClassification) {
        processingDurationHistogram.record(durationMs, {
            model_classification: modelClassification,
        });
    }
    updateQueueSize(size, modelClassification, generation) {
        queueSizeGauge.add(size, {
            model_classification: modelClassification,
            generation: generation.toString(),
        });
    }
    getMetricsSummary() {
        return {
            opentelemetry_rate_limit_metrics: {
                counters: {
                    rate_limit_messages_processed_total: 'tracked',
                    rate_limit_errors_total: 'tracked',
                },
                histograms: {
                    rate_limit_processing_duration_ms: 'tracked',
                },
                gauges: {
                    rate_limit_queue_size: 'tracked',
                },
            },
            collection_info: {
                last_updated: new Date().toISOString(),
            },
        };
    }
}
export const rateLimitMetrics = RateLimitMetricsCollector.getInstance();
//# sourceMappingURL=metrics.js.map