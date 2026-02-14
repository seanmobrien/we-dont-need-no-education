const testExtensionFactory = () => {
    return {
        session: {
            id: 'test-session-id',
            user: {
                id: '123',
                name: 'Test User',
                email: 'test-user@example.com',
                subject: 'test-keycloak-uid',
                image: 'test-image-url',
            },
            expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        },
        makeMockDb: () => {
            return undefined;
        },
        suppressDeprecation: false,
    };
};
const TEST_EXTENSIONS = Symbol.for('@noeducation/jest/extensions');
export const withJestTestExtensions = () => {
    const withExtensions = globalThis;
    if (!withExtensions[TEST_EXTENSIONS]) {
        withExtensions[TEST_EXTENSIONS] = testExtensionFactory();
    }
    return withExtensions[TEST_EXTENSIONS];
};
beforeEach(() => {
    withJestTestExtensions();
});
afterEach(() => {
    const withExtensions = globalThis;
    delete withExtensions[TEST_EXTENSIONS];
});
//# sourceMappingURL=jest.test-extensions.js.map