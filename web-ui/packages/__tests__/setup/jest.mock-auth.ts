// Mock next-auth and our auth wrapper to use the test extensions session
import { withJestTestExtensions } from '../jest.test-extensions';


jest.mock('@compliance-theater/types/auth-core/jwt', () => {
  return {
    __esModule: true,
    getToken: jest.fn(),
    decode: jest.fn(() => ({
      name: 'John Doe',
      email: 'john.doe@example.com',
    })),
    encode: jest.fn(() => 'encoded.token'),
  };
});

jest.mock('@compliance-theater/types/next-auth/jwt', () => {
  const theActualModule = jest.requireMock('@compliance-theater/types/auth-core/jwt');
  return {
    __esModule: true,
    ...theActualModule,
  };
});


jest.mock('@compliance-theater/auth/auth', () => {
  const authMock = jest.fn(() => withJestTestExtensions().session);
  const getHandlerMock = jest.fn();
  const postHandlerMock = jest.fn();
  const signInMock = jest.fn();
  const signOutMock = jest.fn();

  return {
    __esModule: true,
    get handlers() {
      return { GET: getHandlerMock, POST: postHandlerMock };
    },
    auth: authMock,
    signIn: signInMock,
    signOut: signOutMock,
  };
});



jest.mock('@compliance-theater/auth', () => {
  const activeAuthMock = jest.requireMock('@compliance-theater/auth/auth');
  const origAuthMock = jest.requireActual('@compliance-theater/auth');
  return {
    ...origAuthMock,
    __esModule: true,
    ...activeAuthMock,
  };
});

// import modules to pin the mocks above
import { getToken } from '@compliance-theater/types/auth-core/jwt';
import { getToken as getAnotherToken } from '@compliance-theater/types/next-auth/jwt';
import { auth as moreAuth } from '@compliance-theater/auth/auth';
import { auth } from '@compliance-theater/auth';
