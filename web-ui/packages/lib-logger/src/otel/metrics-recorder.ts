import { trace, metrics  } from '@opentelemetry/api';
//import type { Tracer } from '@opentelemetry/trace/tracer';
import type {
  Histogram,
  Attributes,
  Counter,
  Tracer,
  Meter
} from '@opentelemetry/api';


const METRICS_STATE_SYMBOL = Symbol.for('no-education/standard-metrics-support');

type GlobalWithMetricsState = typeof globalThis & {
  [METRICS_STATE_SYMBOL]?: {
    meter: Meter;
    errorCounter: Counter;
    operationDurationHistogram: Histogram<Attributes>;
    tracer: Tracer;
  };
};
type WithMetricsState = Required<Pick<GlobalWithMetricsState, typeof METRICS_STATE_SYMBOL>>[typeof METRICS_STATE_SYMBOL];

const getMetricsState = (): WithMetricsState => {
  const globalWithMetrics = globalThis as GlobalWithMetricsState;
  if (!globalWithMetrics[METRICS_STATE_SYMBOL]) {
    const meter = metrics.getMeter('no_education_default', '1.0.0');
    globalWithMetrics[METRICS_STATE_SYMBOL] = {
      meter,
      errorCounter: meter.createCounter('no_education_errors_total', {
        description: 'Total number of errors in no-education operations',
      }),
      operationDurationHistogram: meter.createHistogram('no_education_operation_duration_ms', {
        description: 'Duration of no-education operations in milliseconds',
      }),
      tracer: trace.getTracer('no_education_tracer', '1.0.0'),
    };
  }
  return globalWithMetrics[METRICS_STATE_SYMBOL];
}
export const resetMetricsState = () => {
  const globalWithMetrics = globalThis as GlobalWithMetricsState;
  delete globalWithMetrics[METRICS_STATE_SYMBOL];
};

// Error Metrics
export const errorCounter = () => getMetricsState().errorCounter;
export const operationDurationHistogram = () => getMetricsState().operationDurationHistogram;
export const tracer = () => getMetricsState().tracer;

export class MetricsRecorder {
  static recordError({
    operation,
    errorType, 
    prefix = 'no-education'
}:{
    operation: string,
    errorType: string,
    prefix?: string
}) {
    errorCounter().add(1, {
      [`${prefix}.operation`]: operation,
      [`${prefix}.error_type`]: errorType,
    });
  }

  static recordOperationDuration({
    duration,
    operation,
    status,
    prefix = 'no-education'
  } : {
    duration: number;
    operation: string; 
    status: string;
    prefix?: string;
}) {
    operationDurationHistogram().record(duration, {
      [`${prefix}.operation`]: operation,
      [`${prefix}.status`]: status,
    });
  }
}