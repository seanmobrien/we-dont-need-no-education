import { query } from '@/lib/neondb';
import {
  AdditionalStageOptions,
  ImportStageManagerFactory,
  StageProcessorContext,
} from '../types';
import { TransactionalStateManagerBase } from './transactional-statemanager';
import { ImportStage } from '@/data-models/api/import/email-message';
import { LoggedError } from '@compliance-theater/logger';

class CompletedStateManager extends TransactionalStateManagerBase {
  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
  }
  async run(context: StageProcessorContext): Promise<StageProcessorContext> {
    const { target } = context;
    if (typeof target !== 'object') {
      LoggedError.isTurtlesAllTheWayDownBaby(
        new Error('Invalid target stage'),
        { log: true, source: 'DefaultImportManager::completed' },
      );
    } else {
      await query(
        (sql) => sql`DELETE FROM import_staged WHERE id = ${target.id}`,
      );
    }
    return context;
  }
}

const managerFactory: ImportStageManagerFactory = (
  stage,
  additionalOptions: AdditionalStageOptions,
) => new CompletedStateManager(stage, additionalOptions);

export default managerFactory;
