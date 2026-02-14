import { query } from '@compliance-theater/database/driver';
import { TransactionalStateManagerBase } from './transactional-statemanager';
import { LoggedError } from '@compliance-theater/logger';
class CompletedStateManager extends TransactionalStateManagerBase {
    constructor(stage, options) {
        super(stage, options);
    }
    async run(context) {
        const { target } = context;
        if (typeof target !== 'object') {
            LoggedError.isTurtlesAllTheWayDownBaby(new Error('Invalid target stage'), { log: true, source: 'DefaultImportManager::completed' });
        }
        else {
            await query((sql) => sql `DELETE FROM import_staged WHERE id = ${target.id}`);
        }
        return context;
    }
}
const managerFactory = (stage, additionalOptions) => new CompletedStateManager(stage, additionalOptions);
export default managerFactory;
//# sourceMappingURL=manager-completed.js.map