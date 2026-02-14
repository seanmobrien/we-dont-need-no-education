import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { createStagingRecord } from '@/lib/api/email/import/google';
import { log } from '@compliance-theater/logger';
class StagedManager extends TransactionalStateManagerBase {
    constructor(stage, options) {
        super(stage, options);
    }
    async run(context) {
        const { target, currentStage } = context;
        let { providerEmailId } = context;
        if (typeof providerEmailId !== 'string' || !providerEmailId) {
            if (!target?.raw.id) {
                throw new Error(`Invalid state for staging - provider email id not found.`);
            }
            providerEmailId = target.raw.id;
            log((l) => l.warn('ProviderEmailId value pulled from raw output; is this a retry?'));
        }
        const req = this.requireRequest;
        const responseMessage = await createStagingRecord(providerEmailId, {
            req,
        }).awaitable;
        if (!responseMessage) {
            throw new Error(`An unexpected failure occurred queuing email ${providerEmailId}.`);
        }
        this.setTransaction(responseMessage);
        log((l) => l.info({
            message: '[AUDIT]: Email import queued successfully.',
            providerEmailId,
            stage: currentStage,
        }));
        return {
            ...context,
            target: responseMessage,
        };
    }
}
const managerFactory = (stage, options) => new StagedManager(stage, options);
export default managerFactory;
//# sourceMappingURL=manager-staged.js.map