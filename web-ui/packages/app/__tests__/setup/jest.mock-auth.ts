// Mock next-auth and our auth wrapper to use the test extensions session

jest.mock('@auth/core/jwt', () => {
  // const originalModule = jest.requireActual('@auth/core/jwt');

  return {
    __esModule: true,
    // ...originalModule.map((key: string) => jest.fn(originalModule[key])),
    getToken: jest.fn(),
    decode: jest.fn(() => ({
      name: 'John Doe',
      email: 'john.doe@example.com',
    })),
    encode: jest.fn(() => 'encoded.token'),
  };
});

jest.mock('next-auth', () => jest.fn);
jest.mock('next-auth/jwt', () => {
  return {
    __esModule: true,
    getToken: jest.fn(),
  };
});
jest.mock('@/auth', () => {
  const originalModule = jest.requireActual('@/auth');
  const withJestTestExtensions =
    require('@/__tests__/shared/jest.test-extensions').withJestTestExtensions;
  return {
    __esModule: true,
    ...originalModule,
    auth: jest.fn(() => withJestTestExtensions().session),
    handlers: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  };
});

// import modules to pin the mocks above
import { getToken } from '@auth/core/jwt';
import NextAuth from 'next-auth';
import { auth } from '@/auth';
