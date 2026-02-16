import { describe, it, expect } from '@jest/globals';
import {
  AiModelTypeValues,
  AiModelTypeValue_LoFi,
  AiModelTypeValue_HiFi,
  isAiModelType,
  isAiLanguageModelType,
  isAiProviderType,
  generateChatId,
  splitIds,
} from '@compliance-theater/types/ai/core';

describe('AI Core Types', () => {
  describe('Type Values', () => {
    it('should export AiModelTypeValues array', () => {
      expect(Array.isArray(AiModelTypeValues)).toBe(true);
      expect(AiModelTypeValues.length).toBeGreaterThan(0);
    });

    it('should export model type constants', () => {
      expect(AiModelTypeValue_LoFi).toBe('lofi');
      expect(AiModelTypeValue_HiFi).toBe('hifi');
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify valid AI model types', () => {
      expect(isAiModelType('lofi')).toBe(true);
      expect(isAiModelType('hifi')).toBe(true);
      expect(isAiModelType('invalid')).toBe(false);
      expect(isAiModelType(undefined)).toBe(false);
      expect(isAiModelType(null)).toBe(false);
    });

    it('should correctly identify language model types', () => {
      expect(isAiLanguageModelType('lofi')).toBe(true);
      expect(isAiLanguageModelType('hifi')).toBe(true);
      expect(isAiLanguageModelType('embedding')).toBe(false);
      expect(isAiLanguageModelType('google-embedding')).toBe(false);
    });

    it('should correctly identify AI provider types', () => {
      expect(isAiProviderType('azure')).toBe(true);
      expect(isAiProviderType('google')).toBe(true);
      expect(isAiProviderType('openai')).toBe(true);
      expect(isAiProviderType('invalid')).toBe(false);
    });
  });

  describe('Chat ID Utilities', () => {
    it('should generate chat IDs', () => {
      const { id, seed } = generateChatId();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(8);
      expect(typeof seed).toBe('number');
    });

    it('should generate deterministic IDs from seeds', () => {
      const { id: id1 } = generateChatId(12345);
      const { id: id2 } = generateChatId(12345);
      expect(id1).toBe(id2);
    });

    it('should split compound IDs', () => {
      const [primary, secondary] = splitIds('chat123:msg456');
      expect(primary).toBe('chat123');
      expect(secondary).toBe('msg456');
    });

    it('should handle IDs without delimiter', () => {
      const [primary, secondary] = splitIds('chat123');
      expect(primary).toBe('chat123');
      expect(secondary).toBeUndefined();
    });
  });
});
