/**
 * Main entry point for logging functionality
 * @module @compliance-theater/logger
 */

import type {
  ILogger,
  EventSeverity,
  SimpleLogger,
  LogEventOverloads,
  ICustomAppInsightsEvent,
} from './types';
import type { KnownSeverityLevel } from './constants';
import type { CustomAppInsightsEvent } from './event';
import type { errorLogFactory } from './utilities';
import type { logger, log, logEvent } from './core';
import type { simpleScopedLogger } from './simple-scoped-logger';
import type {
  LoggedError,
  dumpError,
  ProgressEventError,
  LoggedErrorOptions,
  ErrorLogFactory,
  TurtleRecursionParams,
  ErrorReportArgs,
  ErrorContext,
  IContextEnricher,
  SafeProgressEvent,
  isError,
  isAbortError,
  isProgressEvent,
  isXmlHttpRequest,
  getStackTrace,
} from './errors';
declare module '@compliance-theater/logger' {
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
    LoggedError,
    dumpError,
    ProgressEventError,
    LoggedErrorOptions,
    ErrorLogFactory,
    TurtleRecursionParams,
    ErrorReportArgs,
    ErrorContext,
    IContextEnricher,
    SafeProgressEvent,
    isError,
    isAbortError,
    isProgressEvent,
    isXmlHttpRequest,
    getStackTrace,
  };
}
