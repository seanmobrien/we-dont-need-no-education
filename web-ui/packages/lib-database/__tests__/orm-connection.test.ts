import { drizDb, drizDbWithInit } from '../src/orm/connection';

// Mock the driver connection
jest.mock('../src/driver/connection', () => ({
  pgDbWithInit: jest.fn().mockResolvedValue({
    query: jest.fn(),
    select: jest.fn(),
  }),
}));

describe('ORM Connection', () => {
  describe('drizDb', () => {
    it('should return a database instance', () => {
      const db = drizDb();
      expect(db).toBeDefined();
      expect(typeof db).toBe('object');
    });

    it('should return the same instance on multiple calls (singleton)', () => {
      const db1 = drizDb();
      const db2 = drizDb();
      expect(db1).toBe(db2);
    });

    it('should have query methods', () => {
      const db = drizDb();
      expect(db.query).toBeDefined();
      expect(db.select).toBeDefined();
    });
  });

  describe('drizDbWithInit', () => {
    it('should return a promise that resolves to a database instance', async () => {
      const db = await drizDbWithInit();
      expect(db).toBeDefined();
      expect(typeof db).toBe('object');
    });

    it('should have query methods', async () => {
      const db = await drizDbWithInit();
      expect(db.query).toBeDefined();
      expect(db.select).toBeDefined();
    });

    it('should return the same instance on multiple awaited calls', async () => {
      const db1 = await drizDbWithInit();
      const db2 = await drizDbWithInit();
      expect(db1).toBe(db2);
    });
  });
});
