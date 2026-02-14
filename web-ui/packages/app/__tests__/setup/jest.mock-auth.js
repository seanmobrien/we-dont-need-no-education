jest.mock('@auth/core/jwt', () => {
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
jest.mock('next-auth', () => jest.fn);
jest.mock('next-auth/jwt', () => {
    return {
        __esModule: true,
        getToken: jest.fn(),
    };
});
jest.mock('@/auth', () => {
    const originalModule = jest.requireActual('@/auth');
    const withJestTestExtensions = require('@/__tests__/shared/jest.test-extensions').withJestTestExtensions;
    return {
        __esModule: true,
        ...originalModule,
        auth: jest.fn(() => withJestTestExtensions().session),
        handlers: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
    };
});
export {};
//# sourceMappingURL=jest.mock-auth.js.map