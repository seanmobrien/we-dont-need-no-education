const ignorePatterns = [
  '/[^/]+\\.worktrees/',
  'node_modules/(?!(@compliance-theater)/)',
  '/\\.next/',
  '/\\.turbo/',
  '/dist/',
];

/** @type {import('jest').Config} */
const config = {
  displayName: 'Monorepo Root',
  projects: [
    './web-ui/packages/*/jest.config.mjs',
    './web-ui/submodules/*/packages/**/jest.config.cjs',
  ],
  transformIgnorePatterns: ['node_modules/(?!(@compliance-theater)/)'],
  modulePathIgnorePatterns: ignorePatterns,
  watchPathIgnorePatterns: ignorePatterns,
};

export default config;
