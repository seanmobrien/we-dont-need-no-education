import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { log } from '@compliance-theater/logger';
import { mapContacts } from './utilities';
import { ContactRepository } from '@/lib/api/contacts/database';
class ContactStageManager extends TransactionalStateManagerBase {
    constructor(stage, options) {
        super(stage, options);
    }
    async run(options) {
        const { target, currentStage } = options;
        if (typeof target !== 'object') {
            throw new Error(`Expected source message: ${currentStage}`);
        }
        const contacts = mapContacts(target.raw?.payload?.headers);
        if (!contacts || contacts.length === 0) {
            throw new Error(`No valid contacts found in the message: ${currentStage}`);
        }
        const contactRepository = new ContactRepository();
        const retrievedContacts = (await contactRepository.list({ page: 1, num: 1000, total: 1000 })).results;
        const newContacts = contacts.filter((c) => !retrievedContacts.some((rc) => rc.email === c.email));
        if (newContacts.length === 0) {
            log((l) => l.info(`No new contacts found in message: ${currentStage}`));
            return Promise.resolve(options);
        }
        else {
            newContacts.forEach(async (c) => {
                await contactRepository.create({
                    name: c.fullName,
                    email: c.email,
                });
            });
            log((l) => l.info(`Found and created ${newContacts.length} new contacts`));
        }
        return Promise.resolve(options);
    }
}
const managerFactory = (stage, addOps) => new ContactStageManager(stage, addOps);
export default managerFactory;
//# sourceMappingURL=manager-contacts.js.map