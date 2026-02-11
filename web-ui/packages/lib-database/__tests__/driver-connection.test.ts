import { PgDbDriver } from '../src/driver/connection';

// Mock environment and logger
jest.mock('@compliance-theater/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
  },
}));

jest.mock('@compliance-theater/logger', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn((err) => err),
  },
}));

jest.mock('@compliance-theater/after', () => ({
  default: {
    getInstance: jest.fn(() => ({
      add: jest.fn(),
    })),
  },
}));

describe('PgDbDriver', () => {
  describe('Instance', () => {
    it('should return a singleton instance', () => {
      const instance1 = PgDbDriver.Instance();
      const instance2 = PgDbDriver.Instance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance across multiple calls', () => {
      const instances = Array.from({ length: 5 }, () => PgDbDriver.Instance());
      const first = instances[0];
      instances.forEach(instance => {
        expect(instance).toBe(first);
      });
    });

    it('should be type-safe with generic parameter', () => {
      interface TestRecord {
        id: number;
        name: string;
      }
      
      const instance = PgDbDriver.Instance<TestRecord>();
      expect(instance).toBeDefined();
    });
  });

  describe('getClient', () => {
    it('should return a client function', () => {
      const driver = PgDbDriver.Instance();
      const client = driver.getClient();
      expect(client).toBeDefined();
      expect(typeof client).toBe('function');
    });

    it('should return the same client on multiple calls', () => {
      const driver = PgDbDriver.Instance();
      const client1 = driver.getClient();
      const client2 = driver.getClient();
      expect(client1).toBe(client2);
    });
  });

  describe('teardown', () => {
    it('should be a static method', () => {
      expect(typeof PgDbDriver.teardown).toBe('function');
    });

    it('should resolve without errors', async () => {
      await expect(PgDbDriver.teardown()).resolves.toBeUndefined();
    });

    it('should handle multiple teardown calls', async () => {
      await expect(PgDbDriver.teardown()).resolves.toBeUndefined();
      await expect(PgDbDriver.teardown()).resolves.toBeUndefined();
    });
  });
});
