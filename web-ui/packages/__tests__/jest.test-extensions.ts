import type { DatabaseMockType } from "./jest.mock-drizzle";

type SymbolKey = string | symbol;
const testMessages: string[] = [];

const addTestMessage = (message: string) => {
  if (!testMessages.includes(message)) {
    testMessages.push(message);
  }
};

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
      return undefined as unknown as DatabaseMockType;
    },
    suppressDeprecation: false,
    singletonStore: new Map<SymbolKey, unknown>(),
    addTestMessage,
    addMockWarning: (module: string) => {
      addTestMessage(`WARNING: Module ${module} is not available for mocking at this time.`)
    }
  };
};

type JestTestExtensions = {
  session: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      subject: string;
      image?: string;
    };
    expires: string;
  } | null;
  makeMockDb: () => DatabaseMockType;
  suppressDeprecation: boolean;
  singletonStore: Map<SymbolKey, unknown>;
  addMockWarning: (message: string) => void;
  addTestMessage: (message: string) => void;
};

const TEST_EXTENSIONS = Symbol.for('@noeducation/jest/extensions');

type GlobalWithJestExtensions = {
  [TEST_EXTENSIONS]?: JestTestExtensions;
};

export const withJestTestExtensions = (): JestTestExtensions => {
  const withExtensions = globalThis as GlobalWithJestExtensions;
  if (!withExtensions[TEST_EXTENSIONS]) {
    withExtensions[TEST_EXTENSIONS] = testExtensionFactory();
  }
  return withExtensions[TEST_EXTENSIONS];
};

// Ensure valid state before each test
beforeEach(() => {
  withJestTestExtensions();
});
// Clear out state after each test
afterEach(() => {
  const withExtensions = globalThis as GlobalWithJestExtensions;
  delete withExtensions[TEST_EXTENSIONS];
});
/* No dependency mock warnings outputed for now
afterAll(() => {
if (testMessages.length > 0) {
  console.log(`Test Messages:\n\t${testMessages.join('\n\t')}`);
}
testMessages.length = 0; // Clear messages after logging
});
*/

