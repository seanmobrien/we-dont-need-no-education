import { shouldSuppressError } from '../../../src/errors/monitoring/utility';
import type { ErrorLike } from '../../../src/errors/error-like';
import type { ErrorSuppressionRule } from '../../../src/errors/monitoring/types';

function makeErrorLike(message: string, source?: string): ErrorLike {
  return { message, name: 'Error', source };
}

describe('shouldSuppressError', () => {
  describe('no match', () => {
    it('returns { suppress: false } when no rule matches', () => {
      const result = shouldSuppressError({
        error: makeErrorLike('completely normal error message'),
      });
      expect(result).toEqual({ suppress: false });
    });
  });

  describe('default suppression rules', () => {
    it('matches extension-errors rule for chrome-extension errors', () => {
      const result = shouldSuppressError({
        error: makeErrorLike('chrome-extension://abc/content.js failed to load'),
      });
      expect(result.suppress).toBe(true);
    });

    it('completely suppresses extension errors', () => {
      const result = shouldSuppressError({
        error: makeErrorLike('moz-extension://xyz/bg.js error'),
      });
      expect(result.completely).toBe(true);
    });

    it('matches ai-content-blob-error rule', () => {
      const result = shouldSuppressError({
        error: makeErrorLike('AI (Internal): 5 messages'),
      });
      expect(result.suppress).toBe(true);
      expect(result.completely).toBe(true);
    });

    it('matches ai-content-track-metric-undefined rule', () => {
      const result = shouldSuppressError({
        error: makeErrorLike("undefined (reading 'trackMetric')"),
      });
      expect(result.suppress).toBe(true);
      expect(result.completely).toBe(true);
    });

    it('matches script-load-errors rule when source contains chunk', () => {
      const result = shouldSuppressError({
        error: makeErrorLike('Loading chunk 42 failed', 'https://example.com/static/js/chunk.js'),
      });
      expect(result.suppress).toBe(true);
      expect(result.completely).toBe(false);
    });

    it('does NOT match script-load-errors when source does not match', () => {
      const result = shouldSuppressError({
        error: makeErrorLike('Loading chunk 42 failed', 'https://example.com/main.js'),
      });
      expect(result.suppress).toBe(false);
    });
  });

  describe('normalizeErrorMessage (via shouldSuppressError)', () => {
    it('strips leading "Uncaught " prefix before matching', () => {
      const result = shouldSuppressError({
        error: makeErrorLike('Uncaught chrome-extension://abc failed'),
      });
      expect(result.suppress).toBe(true);
    });

    it('strips multiple "Uncaught " prefixes', () => {
      const result = shouldSuppressError({
        error: makeErrorLike('Uncaught Uncaught extension error'),
      });
      expect(result.suppress).toBe(true);
    });
  });

  describe('custom suppression rules', () => {
    it('matches a custom string pattern rule', () => {
      const customRules: ErrorSuppressionRule[] = [
        {
          id: 'custom-rule',
          pattern: 'my-custom-error',
          suppressCompletely: false,
        },
      ];
      const result = shouldSuppressError({
        error: makeErrorLike('this is my-custom-error happening'),
        suppressionRules: customRules,
      });
      expect(result.suppress).toBe(true);
      expect(result.completely).toBe(false);
    });

    it('matches a custom regex pattern rule', () => {
      const customRules: ErrorSuppressionRule[] = [
        {
          id: 'regex-rule',
          pattern: /network\s+timeout/i,
          suppressCompletely: true,
        },
      ];
      const result = shouldSuppressError({
        error: makeErrorLike('A Network Timeout occurred'),
        suppressionRules: customRules,
      });
      expect(result.suppress).toBe(true);
      expect(result.completely).toBe(true);
    });

    it('does not match when pattern does not apply', () => {
      const customRules: ErrorSuppressionRule[] = [
        {
          id: 'no-match-rule',
          pattern: 'very-specific-string',
          suppressCompletely: true,
        },
      ];
      const result = shouldSuppressError({
        error: makeErrorLike('unrelated error message'),
        suppressionRules: customRules,
      });
      expect(result.suppress).toBe(false);
    });

    it('matches with source constraint when source matches', () => {
      const customRules: ErrorSuppressionRule[] = [
        {
          id: 'source-rule',
          pattern: 'timeout',
          source: /vendor/i,
          suppressCompletely: true,
        },
      ];
      const result = shouldSuppressError({
        error: makeErrorLike('timeout error', 'https://cdn.example.com/vendor.js'),
        suppressionRules: customRules,
      });
      expect(result.suppress).toBe(true);
    });

    it('does not match when source constraint fails', () => {
      const customRules: ErrorSuppressionRule[] = [
        {
          id: 'source-rule',
          pattern: 'timeout',
          source: /vendor/i,
          suppressCompletely: true,
        },
      ];
      const result = shouldSuppressError({
        error: makeErrorLike('timeout error', 'https://myapp.com/app.js'),
        suppressionRules: customRules,
      });
      expect(result.suppress).toBe(false);
    });

    it('matches source as string pattern', () => {
      const customRules: ErrorSuppressionRule[] = [
        {
          id: 'string-source-rule',
          pattern: 'fail',
          source: 'third-party',
          suppressCompletely: false,
        },
      ];
      const result = shouldSuppressError({
        error: makeErrorLike('fail to load', 'https://example.com/third-party/lib.js'),
        suppressionRules: customRules,
      });
      expect(result.suppress).toBe(true);
    });

    it('returns the matched rule in result', () => {
      const customRule: ErrorSuppressionRule = {
        id: 'my-rule',
        pattern: 'special-error',
        suppressCompletely: false,
      };
      const result = shouldSuppressError({
        error: makeErrorLike('special-error happened'),
        suppressionRules: [customRule],
      });
      expect(result.rule).toBe(customRule);
    });

    it('does not match source when source is empty string', () => {
      const customRules: ErrorSuppressionRule[] = [
        {
          id: 'source-required-rule',
          pattern: 'timeout',
          source: 'vendor',
          suppressCompletely: true,
        },
      ];
      const result = shouldSuppressError({
        error: makeErrorLike('timeout error'),  // no source
        suppressionRules: customRules,
      });
      expect(result.suppress).toBe(false);
    });
  });

  describe('suppressCompletely propagation', () => {
    it('propagates suppressCompletely: true', () => {
      const result = shouldSuppressError({
        error: makeErrorLike('extension error for testing'),
        suppressionRules: [
          { id: 'r1', pattern: 'extension', suppressCompletely: true },
        ],
      });
      expect(result.completely).toBe(true);
    });

    it('propagates suppressCompletely: false', () => {
      const result = shouldSuppressError({
        error: makeErrorLike('some error'),
        suppressionRules: [
          { id: 'r1', pattern: 'some error', suppressCompletely: false },
        ],
      });
      expect(result.completely).toBe(false);
    });
  });
});
