import {
  AdditionalStageOptions,
  ImportStageManagerFactory,
  StageProcessorContext,
} from '../types';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { ImportStage } from '@/data-models/api/import/email-message';
import { log } from '@/lib/logger';
import { getImportMessageSource } from '@/app/api/email/import/[provider]/_utilitites';

class NewStateManager extends TransactionalStateManagerBase {
  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
  }

  async run(context: StageProcessorContext) {
    const { providerEmailId: emailId, currentStage } = context;
    if (typeof emailId !== 'string' || !emailId) {
      throw new Error(`Invalid stage for completion: ${currentStage}`);
    }
    const target = await getImportMessageSource({
      provider: 'google',
      emailId,
      refresh: false,
      returnResponse: false,
    });
    if (!target || 'status' in target) {
      return context;
    }
    this.setTransaction(target, true);
    log((l) =>
      l.info({
        message: '[AUDIT]: Email import queued successfully.',
        emailId,
        stage: currentStage,
      })
    );
    return {
      ...context,
      target,
    };
  }
}

const managerFactory: ImportStageManagerFactory = (stage, options) =>
  new NewStateManager(stage, options);
export default managerFactory;
