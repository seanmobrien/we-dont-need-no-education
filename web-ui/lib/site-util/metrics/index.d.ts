declare module '@/lib/site-util/metrics' {
  import { Meter } from '@opentelemetry/api';

  /**
   * @module metrics
   *
   * Provides a shared OpenTelemetry Meter instance and service metadata constants
   * for consistent metric collection and reporting across the application.
   *
   * @remarks
   * This module exports the service name and version, as well as a pre-configured
   * Meter instance for use with OpenTelemetry metrics APIs.
   */

  /**
   * Service name identifier for the web UI application
   */
  export const SERVICE_NAME: string;

  /**
   * Service namespace for organizational grouping
   */
  export const SERVICE_NAMESPACE: string;

  /**
   * Current version of the service
   */
  export const SERVICE_VERSION: string;

  /**
   * OpenTelemetry schema URL for semantic conventions
   */
  export const SCHEMA_URL: string;

  /**
   * A shared Meter instance for the application, initialized with the service name and version.
   *
   * This Meter is used to create and manage metrics (such as counters, histograms, etc.)
   * throughout the application, enabling consistent metric collection and reporting.
   *
   * @remarks
   * The Meter is obtained from the global `metrics` provider using the current
   * `SERVICE_NAME` and `SERVICE_VERSION` constants.
   * @see {@link https://opentelemetry.io/docs/concepts/metrics/ | OpenTelemetry Metrics}
   */
  export const appMeters: Meter;

  /**
   * Generate a privacy-safe hash for user ID (for telemetry)
   *
   * Creates a SHA-256 hash of the user ID and returns the first 12 characters.
   * This allows for user-specific metrics while maintaining privacy by not
   * exposing the actual user ID in telemetry data.
   *
   * @param userId - The user ID to hash
   * @returns A 12-character hash of the user ID
   *
   * @example
   * ```typescript
   * const hashedId = hashUserId('user-123');
   * // Returns something like: "a3f8d2e1b9c7"
   * ```
   */
  export const hashUserId: (userId: string) => string;
}
