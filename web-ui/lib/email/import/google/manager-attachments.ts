import { ImportStage } from '@/data-models/api/import/email-message';
import { AdditionalStageOptions, StageProcessorContext } from '../types';
import { errorLogFactory, log } from '@/lib/logger';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';

class AttachmentStateManager extends TransactionalStateManagerBase {
  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
  }

  async run(context: StageProcessorContext): Promise<StageProcessorContext> {
    const { target } = context;
    if (typeof target !== 'object') {
      log((l) =>
        l.error(
          errorLogFactory({
            error: new Error('Invalid target stage'),
            source: 'DefaultImportManager::attachment',
            context,
          })
        )
      );
    }
    return context;
  }
}

const attachmentStateManagerFactory = (
  stage: ImportStage,
  options: AdditionalStageOptions
): TransactionalStateManagerBase => new AttachmentStateManager(stage, options);

export default attachmentStateManagerFactory;
