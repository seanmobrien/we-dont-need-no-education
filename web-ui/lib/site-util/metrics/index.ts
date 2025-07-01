import { createHash } from 'crypto';
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

import { Meter, metrics } from '@opentelemetry/api';

export const SERVICE_NAME = 'WebUi';
export const SERVICE_NAMESPACE = 'ObApps.ComplianceTheatre';
export const SERVICE_VERSION = '1.0.0';
export const SCHEMA_URL = 'https://opentelemetry.io/schemas/1.30.0';

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
export const appMeters: Meter = metrics.getMeter(
  SERVICE_NAME,
  SERVICE_VERSION,
  { schemaUrl: SCHEMA_URL },
);

/**
 * Generate a privacy-safe hash for user ID (for telemetry)
 */
export const hashUserId = (userId: string): string => {
  return createHash('sha256').update(userId).digest('hex').substring(0, 12);
};
