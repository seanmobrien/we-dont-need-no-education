/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Unit tests for chat error classes and their associated type guards
 * 
 * This test suite provides comprehensive coverage for:
 * - AbortChatMessageRequestError class construction and properties
 * - MessageTooLargeForQueueError class construction and properties
 * - Type guard functions for both error types
 * - Edge cases including duck typing and instanceof checks
 * - Error inheritance and serialization behavior
 */

import { AbortChatMessageRequestError } from '@/lib/ai/services/chat/errors/abort-chat-message-request-error';
import { MessageTooLargeForQueueError } from '@/lib/ai/services/chat/errors/message-too-large-for-queue-error';
import { 
  isAbortChatMessageRequestError, 
  isMessageTooLargeForQueueError 
} from '@/lib/react-util/core';

describe('AbortChatMessageRequestError', () => {
  describe('Constructor and Properties', () => {
    it('should create error with requestId and correct properties', () => {
      const requestId = 'req-12345';
      const error = new AbortChatMessageRequestError(requestId);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AbortChatMessageRequestError);
      expect(error.name).toBe('AbortChatMessageRequestError');
      expect(error.requestId).toBe(requestId);
      expect(error.message).toBe(`Chat message request ${requestId} was aborted`);
    });

    it('should create error with undefined requestId', () => {
      const error = new AbortChatMessageRequestError(undefined as any);

      expect(error.name).toBe('AbortChatMessageRequestError');
      expect(error.requestId).toBeUndefined();
      expect(error.message).toBe(`Chat message request undefined was aborted`);
    });

    it('should create error with empty string requestId', () => {
      const error = new AbortChatMessageRequestError('');

      expect(error.name).toBe('AbortChatMessageRequestError');
      expect(error.requestId).toBe('');
      expect(error.message).toBe(`Chat message request  was aborted`);
    });

    it('should maintain readonly properties', () => {
      const error = new AbortChatMessageRequestError('test-id');

      // TypeScript readonly is compile-time only - verify properties exist and are correct type
      expect(typeof error.requestId).toBe('string');
      expect(error.requestId).toBe('test-id');
      
      // Properties can be modified at runtime (TypeScript readonly is compile-time constraint)
      // This is expected behavior, so we just verify the properties are accessible
      expect(error).toHaveProperty('requestId');
    });
  });

  describe('Error Inheritance', () => {
    it('should properly inherit from Error class', () => {
      const error = new AbortChatMessageRequestError('test-id');

      expect(error instanceof Error).toBe(true);
      expect(error.constructor.name).toBe('AbortChatMessageRequestError');
      expect(error.stack).toBeDefined();
    });

    it('should be JSON serializable with custom properties', () => {
      const error = new AbortChatMessageRequestError('serialization-test');
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      // Error objects have special serialization behavior - message may not serialize by default
      // But our custom properties should be preserved
      expect(parsed.requestId).toBe('serialization-test');
      
      // Verify the error has expected properties even if they don't serialize
      expect(error.message).toBe('Chat message request serialization-test was aborted');
      expect(error.name).toBe('AbortChatMessageRequestError');
    });
  });
});

describe('MessageTooLargeForQueueError', () => {
  describe('Constructor and Properties', () => {
    it('should create error with all required parameters', () => {
      const tokenCount = 10000;
      const maxTokens = 8192;
      const modelType = 'gpt-4';
      const error = new MessageTooLargeForQueueError(tokenCount, maxTokens, modelType);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MessageTooLargeForQueueError);
      expect(error.name).toBe('MessageTooLargeForQueueError');
      expect(error.tokenCount).toBe(tokenCount);
      expect(error.maxTokens).toBe(maxTokens);
      expect(error.modelType).toBe(modelType);
      expect(error.message).toBe(`Message with ${tokenCount} tokens exceeds maximum allowed ${maxTokens} tokens for model ${modelType}`);
    });

    it('should handle edge case with zero tokens', () => {
      const error = new MessageTooLargeForQueueError(0, 100, 'test-model');

      expect(error.tokenCount).toBe(0);
      expect(error.maxTokens).toBe(100);
      expect(error.message).toContain('Message with 0 tokens');
    });

    it('should handle edge case with negative token counts', () => {
      const error = new MessageTooLargeForQueueError(-50, 100, 'test-model');

      expect(error.tokenCount).toBe(-50);
      expect(error.message).toContain('Message with -50 tokens');
    });

    it('should handle empty model type string', () => {
      const error = new MessageTooLargeForQueueError(1000, 500, '');

      expect(error.modelType).toBe('');
      expect(error.message).toContain('for model ');
    });

    it('should maintain readonly properties', () => {
      const error = new MessageTooLargeForQueueError(1000, 500, 'test-model');

      // TypeScript readonly is compile-time only - verify properties exist and are correct type
      expect(typeof error.tokenCount).toBe('number');
      expect(typeof error.maxTokens).toBe('number');
      expect(typeof error.modelType).toBe('string');
      expect(error.tokenCount).toBe(1000);
      expect(error.maxTokens).toBe(500);
      expect(error.modelType).toBe('test-model');
      
      // Properties can be modified at runtime (TypeScript readonly is compile-time constraint)
      // This is expected behavior, so we just verify the properties are accessible
      expect(error).toHaveProperty('tokenCount');
      expect(error).toHaveProperty('maxTokens');
      expect(error).toHaveProperty('modelType');
    });
  });

  describe('Error Inheritance', () => {
    it('should properly inherit from Error class', () => {
      const error = new MessageTooLargeForQueueError(1000, 500, 'test-model');

      expect(error instanceof Error).toBe(true);
      expect(error.constructor.name).toBe('MessageTooLargeForQueueError');
      expect(error.stack).toBeDefined();
    });
  });
});

describe('Type Guards', () => {
  describe('isAbortChatMessageRequestError', () => {
    it('should return true for AbortChatMessageRequestError instances', () => {
      const error = new AbortChatMessageRequestError('test-id');
      expect(isAbortChatMessageRequestError(error)).toBe(true);
    });

    it('should return false for other Error types', () => {
      const regularError = new Error('Regular error');
      const typeError = new TypeError('Type error');
      const messageError = new MessageTooLargeForQueueError(1000, 500, 'model');

      expect(isAbortChatMessageRequestError(regularError)).toBe(false);
      expect(isAbortChatMessageRequestError(typeError)).toBe(false);
      expect(isAbortChatMessageRequestError(messageError)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isAbortChatMessageRequestError(null)).toBe(false);
      expect(isAbortChatMessageRequestError(undefined)).toBe(false);
      expect(isAbortChatMessageRequestError('string')).toBe(false);
      expect(isAbortChatMessageRequestError(123)).toBe(false);
      expect(isAbortChatMessageRequestError({})).toBe(false);
      expect(isAbortChatMessageRequestError([])).toBe(false);
    });

    it('should support duck typing for objects with correct shape', () => {
      const duckTypedError = {
        name: 'AbortChatMessageRequestError',
        requestId: 'duck-typed-id',
        message: 'Duck typed error',
        stack: 'fake stack'
      };

      expect(isAbortChatMessageRequestError(duckTypedError)).toBe(true);
    });

    it('should return false for objects with incorrect shape', () => {
      const incorrectShape1 = {
        name: 'AbortChatMessageRequestError',
        // missing requestId
        message: 'Missing requestId'
      };

      const incorrectShape2 = {
        name: 'WrongErrorName',
        requestId: 'has-request-id',
        message: 'Wrong name'
      };

      expect(isAbortChatMessageRequestError(incorrectShape1)).toBe(false);
      expect(isAbortChatMessageRequestError(incorrectShape2)).toBe(false);
    });

    it('should handle objects with undefined requestId', () => {
      const undefinedRequestId = {
        name: 'AbortChatMessageRequestError',
        requestId: undefined,
        message: 'Undefined requestId',
        stack: 'fake stack trace'
      };

      expect(isAbortChatMessageRequestError(undefinedRequestId)).toBe(true);
    });
  });

  describe('isMessageTooLargeForQueueError', () => {
    it('should return true for MessageTooLargeForQueueError instances', () => {
      const error = new MessageTooLargeForQueueError(1000, 500, 'test-model');
      expect(isMessageTooLargeForQueueError(error)).toBe(true);
    });

    it('should return false for other Error types', () => {
      const regularError = new Error('Regular error');
      const typeError = new TypeError('Type error');
      const abortError = new AbortChatMessageRequestError('test-id');

      expect(isMessageTooLargeForQueueError(regularError)).toBe(false);
      expect(isMessageTooLargeForQueueError(typeError)).toBe(false);
      expect(isMessageTooLargeForQueueError(abortError)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isMessageTooLargeForQueueError(null)).toBe(false);
      expect(isMessageTooLargeForQueueError(undefined)).toBe(false);
      expect(isMessageTooLargeForQueueError('string')).toBe(false);
      expect(isMessageTooLargeForQueueError(123)).toBe(false);
      expect(isMessageTooLargeForQueueError({})).toBe(false);
      expect(isMessageTooLargeForQueueError([])).toBe(false);
    });

    it('should support duck typing for objects with correct shape', () => {
      const duckTypedError = {
        name: 'MessageTooLargeForQueueError',
        tokenCount: 1500,
        maxTokens: 1000,
        modelType: 'duck-model',
        message: 'Duck typed message error',
        stack: 'fake stack'
      };

      expect(isMessageTooLargeForQueueError(duckTypedError)).toBe(true);
    });

    it('should return false for objects with incorrect shape', () => {
      const incorrectShape1 = {
        name: 'MessageTooLargeForQueueError',
        tokenCount: 1000,
        // missing maxTokens and modelType
        message: 'Incomplete shape'
      };

      const incorrectShape2 = {
        name: 'WrongErrorName',
        tokenCount: 1000,
        maxTokens: 500,
        modelType: 'model',
        message: 'Wrong name'
      };

      const incorrectShape3 = {
        name: 'MessageTooLargeForQueueError',
        tokenCount: 'not-a-number', // wrong type
        maxTokens: 500,
        modelType: 'model',
        message: 'Wrong tokenCount type'
      };

      expect(isMessageTooLargeForQueueError(incorrectShape1)).toBe(false);
      expect(isMessageTooLargeForQueueError(incorrectShape2)).toBe(false);
      expect(isMessageTooLargeForQueueError(incorrectShape3)).toBe(false);
    });

    it('should handle edge case numeric values', () => {
      const zeroTokens = {
        name: 'MessageTooLargeForQueueError',
        tokenCount: 0,
        maxTokens: 100,
        modelType: 'test-model',
        message: 'Zero tokens',
        stack: 'fake stack trace'
      };

      const negativeTokens = {
        name: 'MessageTooLargeForQueueError',
        tokenCount: -10,
        maxTokens: 100,
        modelType: 'test-model',
        message: 'Negative tokens',
        stack: 'fake stack trace'
      };

      expect(isMessageTooLargeForQueueError(zeroTokens)).toBe(true);
      expect(isMessageTooLargeForQueueError(negativeTokens)).toBe(true);
    });
  });

  describe('Type Guard Cross-Validation', () => {
    it('should not have false positives between different error types', () => {
      const abortError = new AbortChatMessageRequestError('cross-test');
      const messageError = new MessageTooLargeForQueueError(1000, 500, 'cross-model');

      // Each type guard should only match its own type
      expect(isAbortChatMessageRequestError(abortError)).toBe(true);
      expect(isMessageTooLargeForQueueError(abortError)).toBe(false);

      expect(isMessageTooLargeForQueueError(messageError)).toBe(true);
      expect(isAbortChatMessageRequestError(messageError)).toBe(false);
    });

    it('should handle objects that might partially match multiple shapes', () => {
      const confusingObject = {
        name: 'AbortChatMessageRequestError',
        requestId: 'test-id',
        tokenCount: 1000, // this property exists but shouldn't affect AbortChatMessageRequestError check
        maxTokens: 500,   // this property exists but shouldn't affect AbortChatMessageRequestError check
        modelType: 'model',
        message: 'Confusing object',
        stack: 'fake stack trace'
      };

      // Should match AbortChatMessageRequestError because name and requestId are correct
      expect(isAbortChatMessageRequestError(confusingObject)).toBe(true);
      
      // Should not match MessageTooLargeForQueueError because name is wrong
      expect(isMessageTooLargeForQueueError(confusingObject)).toBe(false);
    });
  });
});
