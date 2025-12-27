import {
  AdditionalStageOptions,
  ImportStageManagerFactory,
  StageProcessorContext,
} from '../types';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import {
  ImportSourceMessage,
  ImportStage,
} from '@/data-models/api/import/email-message';
import { log } from '@compliance-theater/lib-logger';
import {
  getImportMessageSource,
  isKnownGmailError,
} from '@/app/api/email/import/[provider]/_utilitites';

class NewStateManager extends TransactionalStateManagerBase {
  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
  }

  async run(context: StageProcessorContext) {
    const { providerEmailId: emailId, currentStage } = context;
    if (typeof emailId !== 'string' || !emailId) {
      throw new Error(`Invalid stage for completion: ${currentStage}`);
    }
    let target: ImportSourceMessage | null = null;
    try {
      target = await getImportMessageSource({
        req: this.request,
        provider: 'google',
        emailId,
        refresh: false,
      });
    } catch (error) {
      // If this is not an email or source not found erropr, then rethrow
      if (
        !isKnownGmailError(error) ||
        (error.cause !== 'email-not-found' &&
          error.cause !== 'source-not-found')
      ) {
        throw error;
      }
    }
    if (!target) {
      return context;
    }
    this.setTransaction(target, true);
    log((l) =>
      l.info({
        message: '[AUDIT]: Email import queued successfully.',
        emailId,
        stage: currentStage,
      }),
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
