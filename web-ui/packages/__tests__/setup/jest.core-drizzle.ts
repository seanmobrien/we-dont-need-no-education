import { isPromise } from '@compliance-theater/typescript/guards';
import { withJestTestExtensions } from '../jest.test-extensions';

const makeRecursiveMock = jest
  .fn()
  .mockImplementation(() => jest.fn(() => jest.fn(makeRecursiveMock)));

const safeActual = (moduleName: string) => {
  try {
    return jest.requireActual(moduleName);
  } catch {
    withJestTestExtensions().addMockWarning(moduleName);
    return {};
  }
};

jest.mock('drizzle-orm/postgres-js', () => {
  const actualModule = safeActual('drizzle-orm/postgres-js');
  return {
    ...actualModule,
    drizzle: jest.fn(() => withJestTestExtensions().makeMockDb()),
    transaction: jest.fn(async (callback: Function = ((x: unknown) => x)) => {
      const mockDb = withJestTestExtensions().makeMockDb();
      const txRawRet = callback(mockDb);
      const txRet = isPromise(txRawRet) ? await txRawRet : txRawRet;
      return txRet;
    }),
  };
}, { virtual: true });

jest.mock('@compliance-theater/database/driver/connection', () => {
  const pgDb = jest.fn(() => makeRecursiveMock());
  return {
    pgDbWithInit: jest.fn(() => Promise.resolve(makeRecursiveMock())),
    pgDb,
    sql: jest.fn(() => pgDb()),
  };
});

import { drizzle } from '@compliance-theater/database/drizzle-orm/postgres-js';
import { pgDb } from '@compliance-theater/database/driver/connection';
