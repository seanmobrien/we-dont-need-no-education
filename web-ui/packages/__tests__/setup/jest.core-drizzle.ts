import { isPromise } from '@compliance-theater/typescript/guards';
import { withJestTestExtensions } from '../jest.test-extensions';

const makeRecursiveMock = jest
  .fn()
  .mockImplementation(() => jest.fn(() => jest.fn(makeRecursiveMock)));

jest.mock('drizzle-orm/postgres-js', () => {
  const actualModule = jest.requireActual('drizzle-orm/postgres-js');  
  return {
    ...actualModule,
    drizzle: jest.fn(() => withJestTestExtensions().makeMockDb()),
    sql: jest.fn(() => jest.fn().mockImplementation(() => makeRecursiveMock())),
    transaction: jest.fn(async (callback: Function = ((x: unknown) => x)) => {
      const mockDb = withJestTestExtensions().makeMockDb();
      const txRawRet = callback(mockDb);
      const txRet = isPromise(txRawRet) ? await txRawRet : txRawRet;
      return txRet;
    }),
  };
});
jest.mock('drizzle-orm', () => {
  const actualModule = jest.requireActual('drizzle-orm');
  return {
    ...actualModule,
    sql: jest.fn(() => jest.fn().mockImplementation(() => makeRecursiveMock())),
  };
});

jest.mock('@compliance-theater/database/driver/connection', () => {
  const pgDb = jest.fn(() => makeRecursiveMock());
  return {
    pgDbWithInit: jest.fn(() => Promise.resolve(makeRecursiveMock())),
    pgDb,
    sql: jest.fn(() => pgDb()),
  };
});

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { pgDb } from '@compliance-theater/database/driver/connection';
