import {
  ImportSourceMessage,
  ImportStage,
  ImportStageValues,
} from '@/data-models/api/import/email-message';
import {
  TransactionalImportStageManager,
  StageProcessorContext,
  AdditionalStageOptions,
} from '../types';
import { query, queryExt } from '@compliance-theater/database/driver';
import { CustomAppInsightsEvent, log } from '@compliance-theater/logger';
import { NextRequest } from 'next/server';
import { NextApiRequest } from 'next';

/**
 * The `TransactionalStateManagerBase` class provides a base implementation for managing
 * the state of import transactions. It implements the `TransactionalImportStageManager` interface
 * and provides methods to begin, commit, and rollback transactions, as well as to execute
 * stage processors.
 *
 */
export class TransactionalStateManagerBase
  implements TransactionalImportStageManager
{
  static readonly NullId = 'null-id' as const;
  static readonly calculateNextStage = (stage: ImportStage) => {
    if (stage === 'completed') {
      return 'completed';
    }
    const thisStageIndex = ImportStageValues.indexOf(stage);
    if (thisStageIndex === -1) {
      throw new Error(`Invalid stage: ${stage}`);
    }
    return ImportStageValues[thisStageIndex + 1];
  };
  #transactionId: string | null;
  readonly #stage: ImportStage;
  readonly #nextStage: ImportStage;
  #activeTransaction: ImportSourceMessage | undefined;
  #request: NextRequest | NextApiRequest;
  #skipStageBump = false;
  protected importEvent: CustomAppInsightsEvent | undefined;

  constructor(stage: ImportStage, { req }: AdditionalStageOptions) {
    this.#stage = stage;

    this.#nextStage =
      stage === 'completed'
        ? stage
        : ImportStageValues[ImportStageValues.indexOf(stage) + 1];

    this.#transactionId = TransactionalStateManagerBase.NullId;
    this.#request = req;
  }
  get request(): NextRequest | NextApiRequest {
    return this.#request;
  }
  get requireRequest(): NextRequest | NextApiRequest {
    if (!this.#request) {
      throw new Error('Request is required');
    }
    return this.#request;
  }
  /**
   * Gets the transaction ID of the currently active transaction.
   * If there is no active transaction, returns a null identifier.
   *
   * @returns {string} The transaction ID or a null identifier.
   */
  protected get txId(): string {
    return this.#transactionId ?? TransactionalStateManagerBase.NullId;
  }
  /**
   * Gets the current import stage.
   *
   * @returns {ImportStage} The current stage of the import process.
   */
  get stage(): ImportStage {
    return this.#stage;
  }

  /**
   * Gets the next stage of the import process.
   *
   * @returns {ImportStage} The next stage of the import process.
   */
  get nexStage(): ImportStage {
    return this.#nextStage;
  }

  /**
   * Begins a new import transaction.
   *
   * @template TStage - The type of the import stage.
   * @param {StageProcessorContext} options - The context for the stage processor, containing the target and next stage.
   * @returns {Promise<StageProcessorContext>} - A promise that resolves to the stage processor context.
   * @throws {Error} - Throws an error if a transaction is already in progress.
   */
  public begin(options: StageProcessorContext): Promise<StageProcessorContext> {
    if (this.#activeTransaction) {
      throw new Error('Transaction already in progress');
    }
    if (options.target && typeof options.target === 'object') {
      this.setTransaction(options.target);
    }

    return Promise.resolve(options);
  }

  /**
   * Sets the current transaction with the provided target.
   *
   * @param target - The transaction target to set. Must be an object with an `id` property.
   * @param skipStageBump - A flag indicating whether to skip the stage bump when tx commits.
   * @throws {Error} If a transaction is already in progress.
   * @throws {Error} If the target is not a valid object.
   *
   * @remarks
   * This method initializes a new transaction by setting the `#transactionId` and `#activeTransaction`
   * properties. It also logs an audit message indicating that the import transaction has started.
   */
  protected setTransaction(
    target: ImportSourceMessage,
    skipStageBump?: boolean
  ): boolean {
    if (this.#activeTransaction) {
      throw new Error('Transaction already in progress');
    }
    if (
      !target ||
      typeof target !== 'object' ||
      !target.raw ||
      !target.raw.id
    ) {
      return false;
    }
    this.#transactionId = target.id ?? TransactionalStateManagerBase.NullId;
    this.#activeTransaction = JSON.parse(JSON.stringify(target));
    if (skipStageBump === true) {
      this.#skipStageBump = true;
    }
    log((l) =>
      l.info({
        message: '[AUDIT]: Import Transaction Started.',
        stage: this.stage,
        txId: this.txId,
      })
    );
    return true;
  }
  /**
   * Commits the current stage of the import process.
   *
   * @template TStage - The type of the import stage.
   * @param {StageProcessorContext} ctx - The context of the current stage processor.
   * @returns {Promise<StageProcessorContext>} - A promise that resolves to the updated stage processor context.
   * @throws {Error} - Throws an error if there is no active transaction or if the staging message update fails.
   */
  public async commit(
    ctx: StageProcessorContext
  ): Promise<StageProcessorContext> {
    if (this.importEvent) {
      this.importEvent[Symbol.dispose]?.();
      log((l) => l.info(this.importEvent!)).then(
        () => (this.importEvent = undefined)
      );
    }
    if (!this.#skipStageBump) {
      const work = ctx;
      work.currentStage = ctx.nextStage as ImportStage;
      if (work.target) {
        work.target.stage = work.currentStage;
      }
      if (ctx.currentStage !== 'completed') {
        work.nextStage = TransactionalStateManagerBase.calculateNextStage(
          ctx.nextStage
        );
      }
    }
    if (!this.#activeTransaction) {
      return ctx;
    }
    const id = this.txId;
    if (id === TransactionalStateManagerBase.NullId) {
      if (ctx.currentStage !== 'new') {
        log((l) => l.error(new Error('Transaction ID is null')));
      }
    } else if (!this.#skipStageBump) {
      if (ctx.currentStage === 'completed') {
        const result = await query(
          (sql) =>
            sql`DELETE FROM staging_message WHERE id = ${id} RETURNING id`
        );
        if (!result.length) {
          throw new Error('Failed to delete staging message');
        }
      } else {
        const result = await queryExt(
          (sql) =>
            sql`UPDATE staging_message SET stage = ${ctx.currentStage} WHERE id = ${id}`
        );
        if (!result.rowCount) {
          throw new Error('Failed to update staging message');
        }
      }
      log((l) =>
        l.info({
          message: '[AUDIT]: Import Transaction Committed.',
          stage: this.#stage,
          txId: this.#activeTransaction?.id,
        })
      );
    }
    this.#resetTransaction();
    return ctx;
  }

  #resetTransaction(): void {
    this.#activeTransaction = undefined;
    this.#transactionId = TransactionalStateManagerBase.NullId;
    this.#skipStageBump = false;
  }

  /**
   * Rolls back the current transaction.
   *
   * If the transaction ID is null, logs an error message.
   * Otherwise, updates the stage of the message in the staging_message table
   * to the current stage and logs a warning message indicating that the
   * import transaction has been rolled back.
   *
   * After rolling back, sets the active transaction to null.
   *
   * @returns {Promise<void>} A promise that resolves when the rollback is complete.
   */
  public async rollback(): Promise<void> {
    if (this.importEvent) {
      this.importEvent[Symbol.dispose]?.();
      log((l) => l.info(this.importEvent!)).then(
        () => (this.importEvent = undefined)
      );
    }
    const id = this.txId;
    if (!id || id === TransactionalStateManagerBase.NullId) {
      log((l) => l.verbose({ message: 'No active transaction to roll back' }));
      this.#resetTransaction();
      return;
    }
    const result = await query(
      (sql) =>
        sql`UPDATE staging_message SET stage = ${
          this.#stage
        } WHERE id = ${id} RETURNING id`
    );

    if (!result.length) {
      throw new Error('Rollback failed: no rows updated');
    }

    log((l) =>
      l.warn({
        message: '[AUDIT]: Import Transaction Rolled Back.',
        stage: this.#stage,
        txId: this.txId,
      })
    );
    this.#resetTransaction();
  }
  /**
   * Executes the stage processor with the given context.
   *
   * @template TStage - The type of the import stage.
   * @param {StageProcessorContext} ctx - The context for the stage processor.
   * @returns {Promise<StageProcessorContext>} A promise that resolves to the stage processor context.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  public run(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ctx: StageProcessorContext
  ): Promise<StageProcessorContext> {
    throw new Error('Method not implemented.');
  }
}
