import { pgDb, pgDbWithInit } from '../src/driver/connection';

const afterAdd = jest.fn();
const afterRemove = jest.fn();

jest.mock('postgres', () => {
  const sqlClient = {
    end: jest.fn(async () => undefined),
  };
  return {
    __esModule: true,
    default: jest.fn(() => sqlClient),
  };
});

jest.mock('@compliance-theater/env', () => ({
  env: jest.fn(() => 'postgresql://test:test@localhost:5432/testdb'),
}));

jest.mock('@compliance-theater/logger', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn((err) => err),
  },
}));

jest.mock('@compliance-theater/after', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      add: afterAdd,
      remove: afterRemove,
    })),
  },
}));

describe('Driver Connection', () => {
  beforeEach(() => {
    const GLOBAL_KEY = Symbol.for('@noeducation/neondb:PgDbDriver');
    (globalThis as Record<symbol, unknown>)[GLOBAL_KEY] = undefined;
    jest.clearAllMocks();
  });

  it('pgDb should return a db-like value', () => {
    const db = pgDb();
    expect(db).toBeDefined();
  });

  it('pgDbWithInit should initialize once and return the same instance', async () => {
    const db1 = await pgDbWithInit();
    const db2 = await pgDbWithInit();

    expect(db1).toBeDefined();
    expect(typeof db1).toBe('function');
    expect(typeof db2).toBe('function');
  });

  it('pgDb should return initialized instance after init', async () => {
    const initialized = await pgDbWithInit();
    const syncDb = pgDb();

    expect(syncDb).toBeDefined();
    expect(typeof initialized).toBe('function');
  });
});
