/**
 * Error Module Barrel Declarations
 *
 * Central typed export surface for the logger error subsystem.
 *
 * This module re-exports the primary error classes, type guards, helper
 * utilities, and supporting type contracts used across the codebase for
 * consistent error normalization, diagnostics, and reporting.
 *
 * Re-export groups:
 * - Logged error primitives (`LoggedError`, `dumpError`)
 * - Browser/network error compatibility (`ProgressEventError`)
 * - Postgres/Drizzle error helpers (`PostgresError`, `isDrizzleError`, `errorFromCode`)
 * - Runtime error guards and stack helpers
 * - Shared error context and reporting type contracts
 *
 * @module @compliance-theater/logger/errors
 */

/**
 * Enhanced application error class with reporting hooks and normalization helpers,
 * plus a utility for serializing unknown errors for logs.
 *
 * @see module:@compliance-theater/logger/errors/logged-error/index
 */
export { LoggedError, dumpError } from './logged-error/index';

/**
 * Error wrapper for ProgressEvent/XHR-style failures in browser-like contexts.
 *
 * @see module:@compliance-theater/logger/errors/progress-event-error
 */
export { ProgressEventError } from './progress-event-error';

/**
 * Postgres/Drizzle-shaped error interface used across logger and database layers.
 *
 * @remarks
 * `IPostgresError` is the broad structural contract for SQLSTATE-bearing
 * errors emitted by Postgres drivers/wrappers.
 *
 * @see module:@compliance-theater/logger/error/types
 */
export type { IPostgresError } from './types';

/**
 * Enriched contextual metadata attached to error reports.
 *
 * @see module:@compliance-theater/logger/error/types
 */
export type { ErrorContext } from './types';

/**
 * Contract for services that can add/transform diagnostic context before an
 * error is emitted or persisted.
 *
 * @see module:@compliance-theater/logger/error/types
 */
export type { IContextEnricher } from './types';

/**
 * Configuration object accepted by `LoggedError` creation/wrapping paths.
 *
 * @see module:@compliance-theater/logger/errors/logged-error/types
 */
export type { LoggedErrorOptions } from './logged-error/types';

/**
 * Factory function contract for producing structured error-log payloads.
 *
 * @see module:@compliance-theater/logger/errors/logged-error/types
 */
export type { ErrorLogFactory } from './logged-error/types';

/**
 * Internal recursion control/options used by `LoggedError` normalization logic.
 *
 * @see module:@compliance-theater/logger/errors/logged-error/types
 */
export type { TurtleRecursionParams } from './logged-error/types';

/**
 * Shape of event payloads emitted to error-report subscribers.
 *
 * @see module:@compliance-theater/logger/errors/logged-error/types
 */
export type { ErrorReportArgs } from './logged-error/types';

/**
 * Runtime guard: checks whether a value is an `Error`-like object.
 *
 * @see module:@compliance-theater/logger/errors/utilities/error-guards
 */
export { isError } from './utilities/error-guards';

/**
 * Runtime guard: checks whether a value represents an abort/cancelation error.
 *
 * @see module:@compliance-theater/logger/errors/utilities/error-guards
 */
export { isAbortError } from './utilities/error-guards';

/**
 * Runtime guard: checks whether a value is a `ProgressEvent` or event-like shape.
 *
 * @see module:@compliance-theater/logger/errors/utilities/error-guards
 */
export { isProgressEvent } from './utilities/error-guards';

/**
 * Runtime guard: checks whether a value is an `XMLHttpRequest` or compatible shape.
 *
 * @see module:@compliance-theater/logger/errors/utilities/error-guards
 */
export { isXmlHttpRequest } from './utilities/error-guards';

/**
 * Normalized stack extraction helper for unknown error values.
 *
 * @see module:@compliance-theater/logger/errors/utilities/error-guards
 */
export { getStackTrace } from './utilities/error-guards';

/**
 * Safe narrowed type used when handling browser progress events in shared code.
 *
 * @see module:@compliance-theater/logger/errors/utilities/error-guards
 */
export type { SafeProgressEvent } from './utilities/error-guards';

/**
 * Postgres/Drizzle error interface and SQLSTATE helpers.
 *
 * @remarks
 * - `PostgresError`: structural contract for Drizzle/Postgres error objects.
 * - `isDrizzleError`: runtime type guard keyed by `name === 'DrizzleError'`.
 * - `errorFromCode`: SQLSTATE-to-description resolver.
 *
 * @see module:@compliance-theater/logger/errors/postgres-error
 */
export { PostgresError, isDrizzleError, errorFromCode } from './postgres-error';
