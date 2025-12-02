/**
 * @fileoverview Server-side utilities for Next.js applications
 *
 * This module provides essential utilities for Next.js server-side operations including:
 * - Route handler wrapping with error handling and OpenTelemetry tracing
 * - Build-time execution control and fallbacks
 * - OpenTelemetry span creation and instrumentation utilities
 * - Request processing and context extraction helpers
 *
 * The utilities are designed to work seamlessly with Next.js App Router and provide
 * comprehensive observability, error handling, and build-time safety features.
 *
 * @example
 * ```typescript
 * import { wrapRouteRequest, createInstrumentedSpan } from '@/lib/nextjs-util/server/utils';
 *
 * // Wrap a route handler with tracing and error handling
 * export const GET = wrapRouteRequest(async (req) => {
 *   const instrumented = await createInstrumentedSpan({
 *     spanName: 'process-data',
 *     attributes: { 'operation': 'data-processing' }
 *   });
 *
 *   return await instrumented.executeWithContext(async (span) => {
 *     span.setAttribute('records_processed', 100);
 *     return Response.json({ success: true });
 *   });
 * });
 * ```
 */
import type { Span } from '@opentelemetry/api';
import type { NextRequest } from 'next/server';

declare module '@/lib/nextjs-util/server/utils' {

  /**
   * Sentinel used to explicitly enable a wrapped route/handler during the production build phase.
   *
   * When passed to {@link wrapRouteRequest} via the `buildFallback` option, this symbol disables the
   * default "build guard" that would otherwise short‑circuit handler execution during
   * Next.js build phases (e.g., `phase-production-build`).
   *
   * Use sparingly and only for handlers that are guaranteed to be deterministic and safe to run
   * at build time (no external side effects, network calls, or dependency on unavailable services).
   *
   * @remarks
   * Default behavior without this symbol is to return a lightweight JSON payload indicating the
   * service is disabled while building. Passing this symbol opts the handler into executing instead.
   *
   * @example
   * ```ts
   * export const GET = wrapRouteRequest(async () => {
   *   return Response.json({ ok: true });
   * }, { buildFallback: EnableOnBuild });
   * ```
   *
   * @public
   */
  export const EnableOnBuild: unique symbol;

  /**
   * Default fallback object returned by grid services while the solution is undergoing a production build.
   * Mirrors an empty data grid structure in order to avoid triggering any client-side errors.
   *
   * @public
   */
  export const buildFallbackGrid: { rows: []; rowCount: 0 };

  /**
   * Wraps a route handler function with error handling, logging, and OpenTelemetry tracing for Next.js API/app routes.
   *
   * This utility returns an async function that provides comprehensive error handling and observability:
   * - Automatically creates OpenTelemetry spans for request tracing
   * - Logs request details when logging is enabled
   * - Handles build-time fallbacks to prevent execution during production builds
   * - Catches and logs errors, returning structured errorResponseFactory objects
   * - Supports custom error callbacks for additional error processing
   *
   * The wrapper preserves the original handler's type signature and supports both Fetch API `Request`
   * and Next.js `NextRequest` types. Route parameters are automatically extracted and included in traces.
   *
   * @template A - Array of arguments passed to the handler function
   * @template R - Response type returned by the handler function
   * @param fn - The route handler function to wrap (can be sync or async)
   * @param options - Configuration options for the wrapper
   * @param options.log - Whether to log request details (default: true in non-production, false in production)
   * @param options.buildFallback - Fallback response during build time, or EnableOnBuild to allow execution
   * @param options.errorCallback - Optional callback invoked when errors occur, receives the error object
   * @returns An async function that returns the handler result or an errorResponseFactory on error
   *
   * @example
   * ```typescript
   * // Basic usage with automatic error handling
   * export const GET = wrapRouteRequest(async (req: NextRequest) => {
   *   const data = await fetchData();
   *   return Response.json({ data });
   * });
   *
   * // With custom error callback
   * export const POST = wrapRouteRequest(
   *   async (req: NextRequest) => {
   *     return Response.json({ success: true });
   *   },
   *   {
   *     errorCallback: (error) => {
   *       console.error('Custom error handling:', error);
   *     }
   *   }
   * );
   *
   * // Allow execution during build time
   * export const GET = wrapRouteRequest(
   *   async () => Response.json({ buildTimeData: true }),
   *   { buildFallback: EnableOnBuild }
   * );
   * ```
   *
   * @public
   */
  export function wrapRouteRequest<A extends unknown[], R extends Response>(
    fn: (...args: A) => Promise<R>,
    options?: {
      log?: boolean;
      buildFallback?: object | typeof EnableOnBuild;
      errorCallback?: (error: unknown) => void | Promise<void>;
    },
  ): (...args: A) => Promise<Response>;

  /**
   * Creates an OpenTelemetry span with automatic parent context association and error handling.
   *
   * This utility function provides a comprehensive wrapper for OpenTelemetry span creation and management.
   * It automatically:
   * - Associates the span with the active parent context for proper trace hierarchy
   * - Sets span attributes and status codes
   * - Records exceptions and error details on failures
   * - Provides a context-aware execution wrapper for callback functions
   * - Falls back to no-op behavior when OpenTelemetry is unavailable
   *
   * The returned object includes all necessary span utilities and a context-aware execution method
   * that ensures proper span lifecycle management and error propagation.
   *
   * @param options - Configuration options for span creation
   * @param options.spanName - The name for the span (used in tracing dashboards)
   * @param options.attributes - Optional key-value pairs to set as span attributes
   * @param options.tracerName - Name of the tracer to use (default: 'app-instrumentation')
   * @param options.autoLog - Whether to automatically log errors (default: true)
   * @returns Promise resolving to an object containing span utilities and execution context
   *
   * @returns
   * ```typescript
   * {
   *   parentContext: OtelContext;        // The parent context used for span creation
   *   contextWithSpan: OtelContext;      // Context with the span set as active
   *   span: Span;                        // The created OpenTelemetry span
   *   executeWithContext: Function;      // Method to execute callbacks within span context
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Basic span creation and execution
   * const instrumented = await createInstrumentedSpan({
   *   spanName: 'database.query',
   *   attributes: { 'db.table': 'users', 'db.operation': 'select' }
   * });
   *
   * const result = await instrumented.executeWithContext(async (span) => {
   *   span.setAttribute('db.rows_returned', 42);
   *   return await database.query('SELECT * FROM users');
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Custom tracer and error handling
   * const instrumented = await createInstrumentedSpan({
   *   spanName: 'external-api-call',
   *   tracerName: 'api-client',
   *   attributes: { 'api.endpoint': '/users', 'api.method': 'GET' }
   * });
   *
   * try {
   *   const data = await instrumented.executeWithContext(async (span) => {
   *     const response = await fetch('https://api.example.com/users');
   *     span.setAttribute('http.status_code', response.status);
   *     return response.json();
   *   });
   *   console.log('API response:', data);
   * } catch (error) {
   *   // Error is automatically recorded on the span
   *   console.error('API call failed:', error);
   * }
   * ```
   *
   * @public
   */
  export function createInstrumentedSpan({
    spanName,
    attributes,
    tracerName,
    autoLog,
  }: {
    tracerName?: string;
    spanName: string;
    attributes?: Record<string, string | number | boolean>;
    autoLog?: boolean;
  }): Promise<{
    parentContext: unknown;
    contextWithSpan: unknown;
    span: Span;
    executeWithContext: <TResult>(
      fn: (span: Span) => Promise<TResult>,
    ) => Promise<TResult>;
  }>;

  /**
   * Captures a client event with telemetry data and OpenTelemetry tracing.
   *
   * This function provides server-side event capture functionality that integrates with
   * the application's telemetry system and OpenTelemetry tracing. It creates a span
   * for the event and records relevant metadata for observability and analytics.
   *
   * The function is designed to work with client instances that have telemetry tracking
   * enabled, capturing method calls, performance metrics, and error conditions.
   *
   * @param eventName - The name of the event being captured (e.g., 'add', 'search', 'delete')
   * @param instance - The client instance that triggered the event (must have telemetryId, host, and constructor.name)
   * @param additionalData - Optional additional data to include with the event
   * @param additionalData.keys - Array of keys or payload information for the event
   * @param additionalData.success - Whether the operation was successful
   * @param additionalData.args_count - Number of arguments passed to the method
   * @param additionalData.error - Error information if the operation failed
   * @param additionalData - Any other custom properties to include
   *
   * @example
   * ```typescript
   * // Capture a successful API call
   * await reportEvent('search', memoryClient, {
   *   success: true,
   *   args_count: 2,
   *   keys: ['query', 'options']
   * });
   *
   * // Capture a failed operation
   * await reportEvent('add', memoryClient, {
   *   success: false,
   *   error: 'API rate limit exceeded',
   *   args_count: 1
   * });
   * ```
   *
   * @public
   */
  export function reportEvent({
    eventName,
    tracerName,
    additionalData,
  }: {
    eventName: string;
    tracerName?: string;
    additionalData?: Record<string, unknown>;
  }): Promise<void>;
}

declare module '@/lib/nextjs-util/server/unauthorized-service-response' {
  /**
   * Returns an unauthorized service response with the specified properties.
   *
   * @param props - The properties to include in the response
   * @param props.req - The request object
   * @param props.scopes - The scopes to include in the response
   * @returns The unauthorized service response
   *
   * @example
   * ```typescript
   * // Basic usage
   * const response = unauthorizedServiceResponse({
   *   req,
   *   scopes: ['read', 'write']
   * });
   * ```
   */
  export const unauthorizedServiceResponse: (props?: {
    req?: NextRequest;
    scopes?: Array<string>;
  }) => Response;
}
