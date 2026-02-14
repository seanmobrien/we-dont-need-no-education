const mockDb = {
  query: {},
  select: jest.fn(),
};

jest.mock('drizzle-orm/postgres-js', () => ({
  drizzle: jest.fn(() => mockDb),
}));

jest.mock('@compliance-theater/database/driver/connection', () => ({
  pgDbWithInit: jest.fn().mockResolvedValue({}),
}));

jest.mock('../src/orm/schema', () => ({
  __esModule: true,
  default: {},
  schema: {},
}));

describe('ORM Connection', () => {
  beforeEach(() => {
    (globalThis as Record<symbol, unknown>)[
      Symbol.for('@noeducation/drizzle-db-instance')
    ] = undefined;
    (globalThis as Record<symbol, unknown>)[
      Symbol.for('@noeducation/drizzle-db-promise')
    ] = undefined;
    (globalThis as Record<symbol, unknown>)[
      Symbol.for('@noeducation/pg-driver-factory')
    ] = undefined;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('drizDbWithInit should resolve a database instance', async () => {
    const { drizDbWithInit } = await import('../src/orm/connection');
    const db = await drizDbWithInit();

    expect(db).toBeDefined();
    expect(db).toBe(mockDb);
  });

  it('drizDb should return initialized singleton instance', async () => {
    const { drizDb, drizDbWithInit } = await import('../src/orm/connection');

    const initialized = await drizDbWithInit();
    const db1 = drizDb();
    const db2 = drizDb();

    expect(db1).toBe(initialized);
    expect(db2).toBe(db1);
  });
});
