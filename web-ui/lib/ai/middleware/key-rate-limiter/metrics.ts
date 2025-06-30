import { metrics } from '@opentelemetry/api';
import type { RateLimitMetrics } from './types';

const meter = metrics.getMeter('key-rate-limiter', '1.0.0');

// Counters
const messagesProcessedCounter = meter.createCounter('rate_limit_messages_processed_total', {
  description: 'Total number of rate-limited messages processed',
});

const errorsCounter = meter.createCounter('rate_limit_errors_total', {
  description: 'Total number of errors during rate limit processing',
});

// Histograms
const processingDurationHistogram = meter.createHistogram('rate_limit_processing_duration_ms', {
  description: 'Time taken to process rate-limited messages',
  unit: 'ms',
});

// Up-down counters (gauges)
const queueSizeGauge = meter.createUpDownCounter('rate_limit_queue_size', {
  description: 'Current number of messages in the rate limit queue',
});

export class RateLimitMetricsCollector {
  private static instance: RateLimitMetricsCollector;
  
  static getInstance(): RateLimitMetricsCollector {
    if (!RateLimitMetricsCollector.instance) {
      RateLimitMetricsCollector.instance = new RateLimitMetricsCollector();
    }
    return RateLimitMetricsCollector.instance;
  }

  recordMessageProcessed(modelClassification: string, generation: 1 | 2): void {
    messagesProcessedCounter.add(1, {
      model_classification: modelClassification,
      generation: generation.toString(),
    });
  }

  recordError(errorType: string, modelClassification?: string): void {
    errorsCounter.add(1, {
      error_type: errorType,
      model_classification: modelClassification || 'unknown',
    });
  }

  recordProcessingDuration(durationMs: number, modelClassification: string): void {
    processingDurationHistogram.record(durationMs, {
      model_classification: modelClassification,
    });
  }

  updateQueueSize(size: number, modelClassification: string, generation: 1 | 2): void {
    queueSizeGauge.add(size, {
      model_classification: modelClassification,
      generation: generation.toString(),
    });
  }

  // Helper method to get metrics summary for debugging
  getMetricsSummary(): Record<string, unknown> {
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