import type { DatabaseType } from "@/lib/drizzle-db/drizzle-types";

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
      return undefined as unknown as DatabaseType;
    },
    suppressDeprecation: false,
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
  makeMockDb: () => DatabaseType;
  suppressDeprecation: boolean;
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
