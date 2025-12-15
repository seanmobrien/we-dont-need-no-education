import type { ErrorSuppressionRule } from './types';

/**
 * Default suppression rules for common known issues
 */
export const DEFAULT_SUPPRESSION_RULES: ErrorSuppressionRule[] = [
  {
    id: 'ai-content-blob-error',
    pattern: /AI \(Internal\): \d+ message/i,
    suppressCompletely: true,
    reason: 'Known AI service issue that does not affect functionality',
  },
  {
    id: 'ai-content-track-metric-undefined',
    pattern: /undefined \(reading .trackMetric.\)/i,
    suppressCompletely: true,
    reload: true,
    reason:
      'Known App Insights service issue that occurs during soft-push navigation.  Reloading the page resolves it without loss of state.',
  },
  {
    id: 'script-load-errors',
    pattern: /Loading chunk \d+ failed/i,
    source: /chunk/i,
    suppressCompletely: false,
    reason: 'Chunk loading failures should be logged but not displayed',
  },
  {
    id: 'extension-errors',
    pattern: /extension|chrome-extension|moz-extension/i,
    suppressCompletely: true,
    reason: 'Browser extension errors not related to our application',
  },
];
//AI (Internal)
