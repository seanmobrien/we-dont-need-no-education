const { defaults: tsjPreset } = require("ts-jest/presets");

const ignorePatterns = [
  "/[^/]+\\.worktrees/",
  "/\\.next/",
  "/\\.turbo/",
  "/dist/",
];
/** @type {import('jest').Config} */
const config = {
  ...tsjPreset,
  displayName: "Monorepo Root",
  projects: [
    "./packages/*/jest.config.mjs",
    "./submodules/*/packages/**/jest.config.cjs"
    /*
    // * * /packages/ * * /jest.config.mjs",

    "<rootDir>/packages/lib-types/jest.config.mjs",
    "<rootDir>/packages/lib-logger/jest.config.mjs",
    "<rootDir>/packages/lib-typescript/jest.config.mjs",
    "<rootDir>/packages/lib-env/jest.config.mjs",
    "<rootDir>/packages/lib-after/jest.config.mjs",
    "<rootDir>/packages/lib-themes/jest.config.mjs",
    "<rootDir>/packages/lib-after/jest.config.mjs",
    "<rootDir>/packages/lib-auth/jest.config.mjs",
    "<rootDir>/packages/lib-database/jest.config.mjs",
    "<rootDir>/packages/lib-feature-flags/jest.config.mjs",
    "<rootDir>/packages/lib-fetch/jest.config.mjs",
    "<rootDir>/packages/lib-nextjs/jest.config.mjs",
    "<rootDir>/packages/lib-react/jest.config.mjs",
    "<rootDir>/packages/lib-redis/jest.config.mjs",
    "<rootDir>/packages/lib-send-api-request/jest.config.mjs",
    "<rootDir>/packages/app/jest.config.mjs",
    "<rootDir>/submodules/sce/jest.config.cjs"
    */
  ],
  // Keep Jest from indexing mirrored worktree snapshots (and other generated dirs)
  modulePathIgnorePatterns: ignorePatterns,
  watchPathIgnorePatterns: ignorePatterns
};

export default config;
