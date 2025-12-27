/** @type {import('jest').Config} */
const config = {
  displayName: "lib: typescript",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@compliance-theater/logger/core$": "<rootDir>/../lib-logger/src/core",
    "^@compliance-theater/logger(.*)$": "<rootDir>/../lib-logger/src$1",
    "^@compliance-theater/typescript(.*)$": "<rootDir>/src$1",
    "^@/(.*)$": "<rootDir>/../app/$1",
  },
  transform: {
    "^.+.ts$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  clearMocks: true,
  resetMocks: false,
  setupFilesAfterEnv: [
    "<rootDir>/../app/__tests__/setup/jest.mock-log.ts",
    "<rootDir>/../app/__tests__/setup/jest.env-vars.ts",
  ],
};

export default config;
