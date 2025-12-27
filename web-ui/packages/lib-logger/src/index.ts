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
