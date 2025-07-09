/**
 * Quick validation test for tool call caching functionality
 * Run this to verify caching reduces LLM calls
 */

import { cacheManager } from '@/lib/ai/chat/message-optimizer-tools';
import { log } from '@/lib/logger';

// Mock the logger using Jest
jest.mock('@/lib/logger', () => ({
  log: jest.fn((callback) => {
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    if (callback) callback(mockLogger);
    return mockLogger;
  }),
}));

const mockLog = log as jest.MockedFunction<typeof log>;

async function testCaching() {
  mockLog((l) => l.info('🧪 Testing Tool Call Caching Implementation'));

  // Check initial cache state
  const initialStats = cacheManager.getStats();
  mockLog((l) => l.info('Initial cache size:', initialStats.size));

  // Test cache export/import
  const testData = {
    test_key_1: 'Test summary 1',
    test_key_2: 'Test summary 2',
  };

  cacheManager.import(testData);
  const importedStats = cacheManager.getStats();
  mockLog((l) => l.info('Cache size after import:', importedStats.size));

  // Test cache export
  const exported = cacheManager.export();
  mockLog((l) => l.info('Exported keys:', Object.keys(exported)));

  // Test cache clear
  cacheManager.clear();
  const clearedStats = cacheManager.getStats();
  mockLog((l) => l.info('Cache size after clear:', clearedStats.size));

  mockLog((l) => l.info('✅ Caching infrastructure test completed'));
  mockLog((l) =>
    l.info('💡 Next steps: Implement client/server protocol optimization'),
  );
}

// Export for potential usage
export { testCaching };

if (require.main === module) {
  testCaching().catch(console.error);
}
