import type { Meter } from '@opentelemetry/api';

export const SERVICE_NAME = 'sue-the-schools-webui';
export const SERVICE_VERSION = '1.0.0';
export const SCHEMA_URL = 'https://sue-the-schools-webui.notaurl/schema';

export const register = async () => Promise.resolve('ok');
export const appMeters: Meter = jest.fn(() => ({
  createGauge: jest.fn(),
  createHistogram: jest.fn(),
  createCounter: jest.fn(() => ({ add: jest.fn() })),
  createUpDownCounter: jest.fn(),
  createObservableGauge: jest.fn(),
  createObservableCounter: jest.fn(),
  createObservableUpDownCounter: jest.fn(),
  addBatchObservableCallback: jest.fn(),
  removeBatchObservableCallback: jest.fn(),
}))();
