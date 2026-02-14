import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { log } from '@compliance-theater/logger';
import { getImportMessageSource, isKnownGmailError, } from '@/app/api/email/import/[provider]/_utilitites';
class NewStateManager extends TransactionalStateManagerBase {
    constructor(stage, options) {
        super(stage, options);
    }
    async run(context) {
        const { providerEmailId: emailId, currentStage } = context;
        if (typeof emailId !== 'string' || !emailId) {
            throw new Error(`Invalid stage for completion: ${currentStage}`);
        }
        let target = null;
        try {
            target = await getImportMessageSource({
                req: this.request,
                provider: 'google',
                emailId,
                refresh: false,
            });
        }
        catch (error) {
            if (!isKnownGmailError(error) ||
                (error.cause !== 'email-not-found' &&
                    error.cause !== 'source-not-found')) {
                throw error;
            }
        }
        if (!target) {
            return context;
        }
        this.setTransaction(target, true);
        log((l) => l.info({
            message: '[AUDIT]: Email import queued successfully.',
            emailId,
            stage: currentStage,
        }));
        return {
            ...context,
            target,
        };
    }
}
const managerFactory = (stage, options) => new NewStateManager(stage, options);
export default managerFactory;
//# sourceMappingURL=manager-new.js.map