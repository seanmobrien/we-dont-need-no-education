import {
  AdditionalStageOptions,
  ImportStageManagerFactory,
  StageProcessorContext,
} from '../types';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { ImportStage } from '/data-models/api/import/email-message';
import { createStagingRecord } from '/lib/api/email/import/google';
import { log } from '/lib/logger';

class StagedManager extends TransactionalStateManagerBase {
  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
  }

  async run(context: StageProcessorContext) {
    const { target, currentStage } = context;
    let { providerEmailId } = context;

    if (typeof providerEmailId !== 'string' || !providerEmailId) {
      if (!target?.raw.id) {
        throw new Error(
          `Invalid state for staging - provider email id not found.`,
        );
      }
      providerEmailId = target.raw.id;
      log((l) =>
        l.warn(
          'ProviderEmailId value pulled from raw output; is this a retry?',
        ),
      );
    }
    const req = this.requireRequest;
    const responseMessage = await createStagingRecord(providerEmailId, {
      req,
    }).awaitable;
    if (!responseMessage) {
      throw new Error(
        `An unexpected failure occurred queuing email ${providerEmailId}.`,
      );
    }
    this.setTransaction(responseMessage);
    log((l) =>
      l.info({
        message: '[AUDIT]: Email import queued successfully.',
        providerEmailId,
        stage: currentStage,
      }),
    );
    return {
      ...context,
      target: responseMessage,
    };
  }
}

/**
 * Factory function to create an ImportStageManager supporting the staged stage.
 *
 * @param stage - The import stage to manage.
 * @param options - The options to configure the ImportStageManager.
 * @returns An ImportStageManager instance.
 */
const managerFactory: ImportStageManagerFactory = (
  stage: ImportStage,
  options: AdditionalStageOptions,
) => new StagedManager(stage, options);

export default managerFactory;
