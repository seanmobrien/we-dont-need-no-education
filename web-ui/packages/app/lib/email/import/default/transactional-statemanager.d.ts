/**
 * Base transactional state manager for email import
 * @module @/lib/email/import/default/transactional-statemanager
 */

import type {
  ImportStage,
  ImportSourceMessage,
} from '../../../../data-models/api/import/email-message';
import type {
  TransactionalImportStageManager,
  StageProcessorContext,
  AdditionalStageOptions,
} from '../types';
import type { NextRequest } from 'next/server';
import type { NextApiRequest } from 'next';

declare module '@/lib/email/import/default/transactional-statemanager' {
  /**
   * Base class for transactional import stage managers.
   * Provides transaction lifecycle management (begin, run, commit, rollback).
   */
  export class TransactionalStateManagerBase
    implements TransactionalImportStageManager
  {
    static readonly NullId: string;

    /**
     * Calculates the next stage in the import process.
     */
    static calculateNextStage(currentStage: ImportStage): ImportStage;

    constructor(stage: ImportStage, options: AdditionalStageOptions);

    get request(): NextRequest | NextApiRequest;
    get requireRequest(): NextRequest | NextApiRequest;

    protected get txId(): string;
    get stage(): ImportStage;
    get nexStage(): ImportStage;

    begin(context: StageProcessorContext): Promise<StageProcessorContext>;
    commit(context: StageProcessorContext): Promise<StageProcessorContext>;
    rollback(): Promise<void>;
    run(context: StageProcessorContext): Promise<StageProcessorContext>;

    protected setTransaction(
      target: ImportSourceMessage,
      skipStageBump?: boolean,
    ): boolean;
  }
}
