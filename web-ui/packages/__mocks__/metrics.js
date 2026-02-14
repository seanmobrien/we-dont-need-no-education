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
export const appMeters = makeMeasure();
export const hashUserId = jest.fn((userId) => {
    return 'hashed_' + userId.substring(0, 12);
});
//# sourceMappingURL=metrics.js.map