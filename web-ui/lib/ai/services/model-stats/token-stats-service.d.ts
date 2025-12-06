/**
 * @fileoverview TokenStatsService module definition.
 *
 * This module provides the type definitions and documentation for the TokenStatsService.
 * TokenStatsService provides centralized logic for tracking AI token consumption,
 * enforcing quotas, and reporting usage statistics.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import { TokenStatsServiceType } from '../../middleware/tokenStatsTracking/types';

declare module '@/lib/ai/services/model-stats/token-stats-service' {
  /**
   * Get the singleton instance of TokenStatsService as TokenStatsServiceType.
   * @returns {TokenStatsServiceType} The singleton instance.
   */
  export const getInstance: () => TokenStatsServiceType;

  /**
   * Reset the singleton instance of TokenStatsService.
   * @returns {void}
   */
  export const reset: () => void;
}
