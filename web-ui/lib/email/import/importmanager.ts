import {
  GmailEmailImportSource,
  ImportSourceMessage,
  ImportStage,
  ImportStageValues,
} from '@/data-models/api/import/email-message';
import {
  ImportStageManagerFactory,
  type ImportManagerMap,
  type StageProcessorContext,
} from './types';
import { managerMapFactory } from './google/managermapfactory';
import { errorLogFactory, log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { isError } from '@/lib/react-util';
import { NextRequest } from 'next/server';
import { TransactionalStateManagerBase } from './default/transactional-statemanager';

/**
 * The `DefaultImportManager` class implements the `ImportManager` interface and provides
 * functionality to manage different stages of an import process.
 *
 * @remarks
 * This class defines a static `Stages` property which lists the various stages of the import
 * process. It also provides a `chain` method to combine two objects into one, ensuring that
 * methods from both objects are called in sequence.
 *
 * @example
 * ```typescript
 * const manager = new DefaultImportManager();
 * const combined = manager.chain(leftObject, rightObject);
 * ```
 *
 * @typeParam TLeft - The type of the left object.
 * @typeParam TRight - The type of the right object.
 * @typeParam TRet - The return type which extends `ImportStageManager`.
 */
export class DefaultImportManager {
  static Stages = ImportStageValues;
  readonly #provider: string;
  readonly #map: ImportManagerMap;

  /**
   * Creates an instance of `DefaultImportManager`.
   *
   * @constructor
   * @param {string} provider - The provider used to create the manager map.
   */
  constructor(provider: string) {
    this.#provider = provider;
    this.#map = managerMapFactory(this.#provider);
  }

  /**
   * Runs the import stage for the given email ID.
   *
   * @async
   * @param {string | ImportSourceMessage} emailId - The email ID or import source message.
   * @param {Object} options - The options object.
   * @param {NextRequest} options.req - The request object.
   * @returns {Promise<ImportSourceMessage>} - The import source message.
   */
  async runImportStage(
    target: ImportSourceMessage,
    { req }: { req: NextRequest }
  ): Promise<ImportSourceMessage> {
    const typedRunStage = async (stage: ImportStage) => {
      const providerEmailId = target?.providerId ?? 'No ID';

      const stageContext: StageProcessorContext = {
        providerEmailId,
        target,
        currentStage: stage,
        nextStage: TransactionalStateManagerBase.calculateNextStage(stage),
        accountId: -1,
      };
      const factory = this.#map[stage] as ImportStageManagerFactory;
      const stateManager = factory(stage, { req });

      try {
        // Begin tx -> run tx -> commit/rollback tx
        const context = await stateManager
          .begin(stageContext)
          .then((c) => stateManager.run(c))
          .then((c) => stateManager.commit(c))
          .catch((e) =>
            stateManager
              .rollback()
              .then(() => {
                throw e;
              })
              .catch((e2) => {
                throw new AggregateError('Error during rollback', e, e2);
              })
          );
        // If we didn't throw and we're processing the 'new' stage then whatever we got back is what we want
        if (stage === 'new') {
          return context.target;
        }
        if (!context.target) {
          throw new Error(
            `No import target found in current context in stage ${stage}`
          );
        }
        return context.target;
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'DefaultImportManager',
          critical: true,
        });
      }
    };
    const result = await typedRunStage(target.stage);
    if (!result) {
      throw new Error('Expected a valid ImportSourceMessage to be returned.');
    }
    return result;
  }
  /**
   * Imports the email for the given email ID.
   *
   * @async
   * @param {string | ImportSourceMessage} emailId - The email ID or import source message.
   * @param {Object} options - The options object.
   * @param {NextRequest} options.req - The request object.
   * @returns {Promise<{ success: boolean; message: string; data?: ImportSourceMessage; error?: unknown }>} - The result of the import operation.
   */
  async importEmail(emailId: string, { req }: { req: NextRequest }) {
    try {
      let result: ImportSourceMessage = {
        providerId: emailId ?? TransactionalStateManagerBase.NullId,
        stage: 'new',
        raw: null as unknown as GmailEmailImportSource,
      };
      let tries = 0;
      let lastStage: ImportStage | null = null;
      while (result.stage !== 'completed') {
        if (lastStage === result.stage) {
          tries++;
          if (tries > 3) {
            throw new Error('Import stage did not progress after 3 attempts');
          }
          log((l) =>
            l.warn({
              message: 'Import stage did not progress, retrying.',
              stage: lastStage,
              tries,
            })
          );
        } else {
          lastStage = result.stage;
          tries = 0;
        }
        result = await this.runImportStage(result, { req });
        log((l) =>
          l.info({
            message: 'Import stage completed',
            stage: typeof result === 'string' ? 'new' : result.stage,
          })
        );
      }
      return {
        success: true,
        message: 'Import successful',
        data: result,
      };
    } catch (error) {
      if (!LoggedError.isLoggedError(error)) {
        log((l) =>
          l.error(errorLogFactory({ error, source: 'DefaultImportManager' }))
        );
      }
      return {
        success: false,
        message: (isError(error) ? error.message : null) ?? 'Import failed',
        error: error,
      };
    }
  }
}
