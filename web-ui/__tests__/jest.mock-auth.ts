 

// Mock next-auth and our auth wrapper to use the test extensions session

jest.mock('next-auth', () => jest.fn);

jest.mock('@/auth', () => {
  const originalModule = jest.requireActual('@/auth');
  const withJestTestExtensions =
     
    require('@/__tests__/jest.test-extensions').withJestTestExtensions;
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
// import { withJestTestExtensions } from './jest.test-extensions';
import NextAuth from 'next-auth';
import { auth } from '@/auth';

//(NextAuth as jest.Mock).mockImplementation(() => jest.fn);

// re-mock before each test to reset to use the current session state
beforeEach(() => {
  /*
  jest.mock('next-auth', () => {
    const originalModule = jest.requireActual('next-auth');
    return {
      //__esModule: true,
      //...originalModule,
      default: jest.fn(() => ({
        handlers: jest.fn(),
        auth: jest.fn(() => withJestTestExtensions().session),
        signIn: jest.fn(),
        signOut: jest.fn(),
      })),
    };
  });
  jest.mock('@/auth', () => {
    const originalModule = jest.requireActual('@/auth');
    return {
      //__esModule: true,
      // ...originalModule,
      auth: jest.fn(() => withJestTestExtensions().session),
    };
  });
  */
});
