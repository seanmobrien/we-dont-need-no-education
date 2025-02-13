// jest.setup.ts
import '@testing-library/jest-dom';
import 'jest';

const DefaultEnvVariables = {
  NEXT_PUBLIC_HOSTNAME: `http://test-run.localhost`,
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: `silly`,
  LOG_LEVEL_SERVER: `silly`,
  DATABASE_URL: `http://pooldatabase_server.localhost`,
  DATABASE_URL_UNPOOLED: `http://nopool_database_server.localhost`,
};

const resetEnvVariables = () => {
  process.env = {
    ...process.env,
    ...DefaultEnvVariables,
  };
};

beforeEach(() => {
  resetEnvVariables();
});

afterEach(() => {
  jest.clearAllMocks();
});
