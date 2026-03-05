import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
    ...baseConfig,
    displayName: 'Libraries: fetch',
    testEnvironment: 'node',
    rootDir: '.',
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^@compliance-theater/logger/singleton-provider$': '<rootDir>/../lib-logger/src/singleton-provider.ts',
        '^@compliance-theater/logger/core$': '<rootDir>/../lib-logger/src/core.ts',
        '^@compliance-theater/logger$': '<rootDir>/../lib-logger/src/index.ts',
        '^@compliance-theater/logger/(.*)$': '<rootDir>/../lib-logger/src/$1',
        '^@compliance-theater/database/schema$': '<rootDir>/../lib-database/src/drizzle/schema.ts',
        '^@compliance-theater/after(.*)$': '<rootDir>/../lib-after/src$1',
        '^@compliance-theater/typescript(.*)$': '<rootDir>/../lib-typescript/src$1',
        '^@compliance-theater/types/react$': '<rootDir>/../../node_modules/react/index.js',
        '^@compliance-theater/types/react-dom$': '<rootDir>/../../node_modules/react-dom/index.js',
        '^@compliance-theater/types$': '<rootDir>/../lib-types/src/index.ts',
        '^@compliance-theater/types(/.*)$': '<rootDir>/../lib-types/src$1',
        '^@compliance-theater/env(.*)$': '<rootDir>/../lib-env/src$1',
        '^@compliance-theater/database(.*)$': '<rootDir>/../lib-database/src$1',
        '^@compliance-theater/feature-flags(.*)$': '<rootDir>/../lib-feature-flags/src$1',
        '^@compliance-theater/nextjs(.*)$': '<rootDir>/../lib-nextjs/src$1',
        '^@compliance-theater/react(.*)$': '<rootDir>/../lib-react/src$1',
        '^@compliance-theater/redis(.*)$': '<rootDir>/../lib-redis/src$1',
        '^@compliance-theater/send-api-request(.*)$': '<rootDir>/../lib-send-api-request/src$1',
        '^@compliance-theater/themes(.*)$': '<rootDir>/../lib-themes/src$1',
        '^@compliance-theater/fetch/(.*)$': '<rootDir>/src/$1',
        '^@compliance-theater/fetch$': '<rootDir>/src',
    },
};

export default config;
