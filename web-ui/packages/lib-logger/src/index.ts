import type {
  ILogger,
  EventSeverity,
  ICustomAppInsightsEvent,
  SendCustomEventListener,
  SendCustomEventPayload,
} from './types';
export type {
  ILogger,
  EventSeverity,
  ICustomAppInsightsEvent,
  SendCustomEventListener,
  SendCustomEventPayload,
};

export { KnownSeverityLevel } from './constants';
export { CustomAppInsightsEvent } from './event';
export {
  addSendCustomEventListener,
  removeSendCustomEventListener,
} from './log-emitter';
export { errorLogFactory, getStackTrace } from './utilities';
export { logger, log, logEvent } from './core';
export { simpleScopedLogger } from './simple-scoped-logger';
export { safeSerialize } from './safe-serialize';

export { 
  LoggedError,
  dumpError,
} from './errors/logged-error/logged-error-class';

export {
  isError,
  isAbortError,
  isProgressEvent,
  isXmlHttpRequest,
  getStackTrace as getStackTraceFromErrors,

} from './errors/utilities/error-guards';

// Error handling
export {
  ProgressEventError,
} from './errors/progress-event-error';

export type {
  ErrorContext,
  IContextEnricher,
} from './errors/types';

export type {
  LoggedErrorOptions,
  ErrorLogFactory,
  TurtleRecursionParams,
  ErrorReportArgs,
} from './errors/logged-error/types';

export type { SafeProgressEvent } from './errors/utilities/error-guards';