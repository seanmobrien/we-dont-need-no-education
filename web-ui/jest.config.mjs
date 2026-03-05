// const tanstackReactQueryPath = '../../node_modules/@tanstack/react-query'

const ignorePatterns = [
  "/[^/]+\\.worktrees/",
  'node_modules/(?!(@compliance-theater)/)',
  "/\\.next/",
  "/\\.turbo/",
  "/dist/",
  'web-ui/__tests__/shared',
  'web-ui/__mocks__/shared',
];
/** @type {import('jest').Config} */
const config = {
  displayName: "Monorepo Root",
  projects: [
    "./packages/*/jest.config.mjs",
    "./submodules/*/packages/**/jest.config.cjs"
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(@compliance-theater)/)'
  ],
  // Keep Jest from indexing mirrored worktree snapshots (and other generated dirs)
  modulePathIgnorePatterns: ignorePatterns,
  watchPathIgnorePatterns: ignorePatterns
};

export default config;
