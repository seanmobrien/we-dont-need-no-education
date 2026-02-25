/**
 * Type definitions for email import system
 * @module @/lib/email/import/types
 */

import type { NextRequest } from 'next/server';
import type {
  ImportStage,
  ImportSourceMessage,
} from '../../../data-models/api/import/email-message';

declare module '@/lib/email/import/types' {
  /**
   * Context passed to stage processors containing import state and metadata.
   */
  export type StageProcessorContext = {
    providerEmailId: string;
    target: ImportSourceMessage;
    currentStage: ImportStage;
    nextStage: ImportStage;
    accountId: number;
  };

  /**
   * Base interface for import stage managers.
   */
  export type ImportStageManager = {
    begin: (context: StageProcessorContext) => Promise<StageProcessorContext>;
    run: (context: StageProcessorContext) => Promise<StageProcessorContext>;
    commit: (context: StageProcessorContext) => Promise<StageProcessorContext>;
    rollback: () => Promise<void>;
  };

  /**
   * Factory function type for creating stage managers.
   */
  export type ImportStageManagerFactory = (
    stage: ImportStage,
    options: { req: NextRequest },
  ) => ImportStageManager;

  /**
   * Map of import stages to their corresponding manager factories.
   */
  export type ImportManagerMap = Record<ImportStage, ImportStageManagerFactory>;
}
