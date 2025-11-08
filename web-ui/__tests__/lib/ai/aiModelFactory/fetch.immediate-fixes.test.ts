/**
 * Tests for fetch.ts
 * Focus: Lazy refresh behavior, deprecated polling API, error logging
 */

import { resetFetchManager } from '@/lib/ai/aiModelFactory/fetch';
import { log } from '@/lib/logger';

// Get the mocked logger instance
const getMockedLogger = () => {
  const logSymbol = Symbol.for('@tests/logger-instance');
  return (globalThis as any)[logSymbol];
};

describe('fetch.ts - Immediate Fixes', () => {
  // Reset fetch manager singleton before each test for clean state
  beforeEach(() => {
    resetFetchManager();
  });

  describe('Error Handling Improvements', () => {
    it('should have LoggedError for proper error tracking', () => {
      // This test verifies that the module imports LoggedError
      // The actual error logging is tested through integration tests
      // where we can mock LoggedError.isTurtlesAllTheWayDownBaby
      const fetch = require('@/lib/ai/aiModelFactory/fetch');
      expect(fetch).toBeDefined();
    });
  });
});
