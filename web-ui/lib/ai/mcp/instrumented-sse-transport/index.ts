export { InstrumentedSseTransport, type TransportPlugin } from './instrumented-transport-refactored';

// Metrics and monitoring
export { 
  MetricsRecorder,
  OTEL_MODE,
  DEBUG_MODE,
  tracer,
  meter
} from './metrics/otel-metrics';

// Counter management
export { CounterManager, type ActiveCounters } from './metrics/counter-manager';

// Session management
export { SessionManager, type SpanState } from './session/session-manager';

// Tracing utilities
export { TraceContextManager } from './tracing/trace-context';

// Safety utilities
export { 
  SafetyUtils, 
  CONNECTION_TIMEOUT_MS, 
  SEND_TIMEOUT_MS,
  type OperationMetrics 
} from './utils/safety-utils';

// Message processing
export { MessageProcessor } from './message/message-processor';

// Re-export original for backward compatibility
export { InstrumentedSseTransport as OriginalInstrumentedSseTransport } from './traceable-transport-client';

