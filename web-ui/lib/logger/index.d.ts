/**
 * Main entry point for logging functionality
 * @module @/lib/logger
 */

import type {
  ILogger,
  EventSeverity,
  SimpleLogger,
  LogEventOverloads,
} from './types';
import type { KnownSeverityLevel } from './constants';
import type { ICustomAppInsightsEvent, CustomAppInsightsEvent } from './event';
import type { errorLogFactory } from './utilities';
import type { logger, log, logEvent } from './core';
import type { simpleScopedLogger } from './simple-scoped-logger';
declare module '@/lib/logger' {
  export {
    KnownSeverityLevel,
    ILogger,
    EventSeverity,
    SimpleLogger,
    LogEventOverloads,
    ICustomAppInsightsEvent,
    CustomAppInsightsEvent,
    errorLogFactory,
    logger,
    log,
    logEvent,
    simpleScopedLogger,
  };
}
