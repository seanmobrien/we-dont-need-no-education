/* @jest-environment node */

/**
 * Tests for app-startup-accessor
 */

import { hideConsoleOutput } from '../shared/test-utils-server';

// DI container is mocked globally via jest.mock-dependency-injection.ts
// resolveService is available as a mock

describe('app-startup-accessor', () => {
  const mockConsole = hideConsoleOutput();

  beforeEach(() => {
    mockConsole.setup();
  });

  afterEach(() => {
    mockConsole.dispose();
  });

  describe('configureAppStartupAccessor', () => {
    it('is a no-op (accepts any function without error)', async () => {
      const { configureAppStartupAccessor } = await import(
        '../../src/server/app-startup-accessor'
      );
      expect(() =>
        configureAppStartupAccessor(() => Promise.resolve('ready' as any)),
      ).not.toThrow();
    });
  });

  describe('getAppStartupState', () => {
    it('calls resolveService to get IAppStartupManager and invokes getStartupState', async () => {
      const { resolveService } = require('@compliance-theater/types/dependency-injection/container');
      const mockStartupManager = {
        getStartupState: jest.fn().mockResolvedValue('ready'),
      };
      resolveService.mockReturnValueOnce(mockStartupManager);

      const { getAppStartupState } = await import(
        '../../src/server/app-startup-accessor'
      );

      const state = await getAppStartupState();
      expect(state).toBe('ready');
      expect(mockStartupManager.getStartupState).toHaveBeenCalled();
    });
  });
});
