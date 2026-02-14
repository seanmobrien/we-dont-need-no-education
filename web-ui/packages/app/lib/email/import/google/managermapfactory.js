import completed from '../default/manager-completed';
import queueNew from './manager-new';
import contacts from './manager-contacts';
import staged from './manager-staged';
import body from './manager-body';
import headers from './manager-header';
import attachments from './manager-attachments';
export const managerMapFactory = (provider) => {
    switch (provider) {
        case 'google':
            return {
                new: queueNew,
                staged,
                headers,
                body,
                attachments,
                contacts,
                completed,
            };
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
};
//# sourceMappingURL=managermapfactory.js.map