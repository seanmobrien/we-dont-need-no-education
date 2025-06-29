export const SERVICE_NAME = 'WebUi';
export const SERVICE_NAMESPACE = 'ObApps.ComplianceTheatre';
export const SERVICE_VERSION = '1.0.0';
export const SCHEMA_URL = 'https://opentelemetry.io/schemas/1.30.0';

const makeMeasurement = () => ({
  add: jest.fn(),
  record: jest.fn(),
  remove: jest.fn(),
});

const makeMeasure = jest.fn(() => ({
  createGauge: jest.fn(makeMeasurement),
  createHistogram: jest.fn(makeMeasurement),
  createCounter: jest.fn(makeMeasurement),
  createUpDownCounter: jest.fn(makeMeasurement),
  createObservableGauge: jest.fn(makeMeasurement),
  createObservableCounter: jest.fn(makeMeasurement),
  createObservableUpDownCounter: jest.fn(makeMeasurement),
  addBatchObservableCallback: jest.fn(makeMeasurement),
  removeBatchObservableCallback: jest.fn(makeMeasurement),
}));
/**
 * A shared Meter instance for the application, initialized with the service name and version.
 *
 * This Meter is used to create and manage metrics (such as counters, histograms, etc.)
 * throughout the application, enabling consistent metric collection and reporting.
 * @remarks
 * The Meter is obtained from the global `metrics` provider using the current
 * `SERVICE_NAME` and `SERVICE_VERSION` constants.
 * @see {@link https://opentelemetry.io/docs/concepts/metrics/ | OpenTelemetry Metrics}
 */
export const appMeters = makeMeasure();

/**
 * Generate a privacy-safe hash for user ID (for telemetry)
 */
export const hashUserId = jest.fn((userId: string): string => {
  return 'hashed_' + userId.substring(0, 12);
});
