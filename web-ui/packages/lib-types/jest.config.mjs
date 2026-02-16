/** @type {import('jest').Config} */
const config = {
  displayName: "Libraries: types",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/../app/$1",
    "^@compliance-theater/types/(.*)$": "<rootDir>/src/$1",
    "^@compliance-theater/logger$": "<rootDir>/../lib-logger/src/index.ts",
    "^@compliance-theater/react/(.*)$": "<rootDir>/../lib-react/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: "node",
        },
      },
    ],
  },
};

export default config;
