import { describe, it, expect } from '@jest/globals';
import {
  AiModelTypeValues,
  AiModelTypeValue_LoFi,
  AiModelTypeValue_HiFi,
  isAiModelType,
  isAiLanguageModelType,
  isAiProviderType,
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
});
