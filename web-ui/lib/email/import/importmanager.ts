import {
  GmailEmailImportSource,
  ImportResponse,
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
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { isError } from '@/lib/react-util/_utility-methods';
import { NextRequest } from 'next/server';
import { TransactionalStateManagerBase } from './default/transactional-statemanager';
import {
  context,
  SpanKind,
  SpanStatusCode,
  trace,
  Tracer,
} from '@opentelemetry/api';

// import { appMeters } from '@/instrumentation';

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
  readonly #tracer: Tracer;
  /**
   * Creates an instance of `DefaultImportManager`.
   *
   * @constructor
   * @param {string} provider - The provider used to create the manager map.
   */
  constructor(provider: string) {
    this.#provider = provider;
    this.#map = managerMapFactory(this.#provider);
    this.#tracer = trace.getTracer('sue-the-schools-webui');
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
    { req }: { req: NextRequest },
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
              }),
          );
        // If we didn't throw and we're processing the 'new' stage then whatever we got back is what we want
        if (stage === 'new') {
          return context.target;
        }
        if (!context.target) {
          throw new Error(
            `No import target found in current context in stage ${stage}`,
          );
        }
        return context.target;
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'DefaultImportManager',
          data: { stage, providerEmailId },
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
  async importEmail(
    emailId: string,
    { req }: { req: NextRequest },
  ): Promise<ImportResponse> {
    const activeContext = context.active();

    return this.#tracer.startActiveSpan(
      'Import Email',
      {
        root: false,
        kind: SpanKind.INTERNAL,
        startTime: performance.now(),
      },
      activeContext,
      async (emailImportSpan): Promise<ImportResponse> => {
        emailImportSpan
          .setAttribute('emailId', emailId)
          .setAttribute('provider', this.#provider)
          .setAttribute('timestamp', new Date().toISOString());
        try {
          let currentUserId = 0;
          let result: ImportSourceMessage = {
            providerId: emailId ?? TransactionalStateManagerBase.NullId,
            stage: 'new',
            raw: null as unknown as GmailEmailImportSource,
            userId: undefined as unknown as number,
          };
          let tries = 0;
          let lastStage: ImportStage | null = null;
          await context.with(
            trace.setSpan(activeContext, emailImportSpan),
            async () => {
              while (result.stage !== 'completed') {
                await this.#tracer.startActiveSpan(
                  result.stage === 'staged'
                    ? 'Staging email for import'
                    : `Import Stage: ${result.stage}`,
                  {
                    root: false,
                    kind: SpanKind.INTERNAL,
                    startTime: performance.now(),
                  },
                  activeContext,
                  async (stageSpan): Promise<void> => {
                    if (currentUserId) {
                      stageSpan.setAttribute('userId', currentUserId);
                    }
                    try {
                      if (lastStage === result.stage) {
                        tries++;
                        if (tries > 3) {
                          const stageError = new Error(
                            `Import stage did not progress after 3 attempts: ${result.stage}`,
                          );
                          stageSpan.recordException(
                            stageError,
                            performance.now(),
                          );
                          /*
                          appMeters
                            .createCounter('Email Import Stage Failed')
                            .add(1);
                          */
                          stageSpan
                            .addEvent(
                              'Import stage failed',
                              { stage: result.stage },
                              performance.now(),
                            )
                            .setStatus({
                              code: SpanStatusCode.ERROR,
                              message: `Import stage ${result.stage} failed`,
                            });
                          throw stageError;
                        }
                        stageSpan.addEvent(
                          'Import stage did not progress, retrying.',
                          { tries: tries, stage: result.stage },
                          performance.now(),
                        );
                      } else {
                        lastStage = result.stage;
                        tries = 0;
                      }
                      result = await this.runImportStage(result, { req });

                      if (result.userId !== currentUserId) {
                        log((l) =>
                          l.info({
                            message: 'User ID changed',
                            stage:
                              typeof result === 'string' ? 'new' : result.stage,
                          }),
                        );
                        stageSpan.setAttribute('userId', currentUserId);
                        emailImportSpan.setAttribute('userId', currentUserId);
                        currentUserId = result.userId;
                      }
                      log((l) =>
                        l.info({
                          message: 'Import stage completed',
                          stage:
                            typeof result === 'string' ? 'new' : result.stage,
                        }),
                      );
                    } finally {
                      stageSpan.end();
                    }
                  },
                );
              }
            },
          );

          // appMeters.createCounter('Email Import Operation Successful').add(1);
          emailImportSpan
            .addEvent('Import completed', {}, performance.now())
            .setStatus({
              code: SpanStatusCode.OK,
              message: 'Import completed successfully',
            });
          return {
            success: true,
            message: 'Import successful',
            data: result,
          };
        } catch (error) {
          const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            source: 'DefaultImportManager',
            log: true,
          });
          emailImportSpan.recordException(le, Date.now());
          // appMeters.createCounter('EmailImportOperationFailed').add(1);
          emailImportSpan
            .addEvent('Import failed', {}, performance.now())
            .setStatus({
              code: SpanStatusCode.ERROR,
              message: 'Import failed',
            });
          return {
            success: false,
            message: (isError(error) ? error.message : null) ?? 'Import failed',
            error: le,
          };
        } finally {
          emailImportSpan.end();
        }
      },
    );
  }
}
