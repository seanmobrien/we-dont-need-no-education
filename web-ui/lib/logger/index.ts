import type { ILogger, EventSeverity } from './types';

export { KnownSeverityLevel } from './constants';
export * from './event';
export type * from './types';
export type { ILogger, EventSeverity };
export { errorLogFactory } from './_utilities';
export { logger, log, logEvent } from './core';
export { simpleScopedLogger } from './simple-scoped-logger';
