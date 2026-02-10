import {
  AdditionalStageOptions,
  ImportStageManagerFactory,
  StageProcessorContext,
} from '../types';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { ImportStage } from '@/data-models/api/import/email-message';
import { log } from '@compliance-theater/logger';
import { mapContacts } from './utilities';
import { ContactRepository } from '@/lib/api/contacts/database';

class ContactStageManager extends TransactionalStateManagerBase {
  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
  }

  async run(options: StageProcessorContext) {
    const { target, currentStage } = options;
    if (typeof target !== 'object') {
      throw new Error(`Expected source message: ${currentStage}`);
    }
    // Extract all contacts from the message
    const contacts = mapContacts(target.raw?.payload?.headers);
    if (!contacts || contacts.length === 0) {
      throw new Error(
        `No valid contacts found in the message: ${currentStage}`
      );
    }

    const contactRepository = new ContactRepository();
    const retrievedContacts = (
      await contactRepository.list({ page: 1, num: 1000, total: 1000 })
    ).results;
    /*contactRepository.getContactsByEmails(
      contacts.map((c) => c.email)
    );*/
    const newContacts = contacts.filter(
      (c) => !retrievedContacts.some((rc) => rc.email === c.email)
    );
    if (newContacts.length === 0) {
      log((l) => l.info(`No new contacts found in message: ${currentStage}`));
      return Promise.resolve(options);
    } else {
      newContacts.forEach(async (c) => {
        await contactRepository.create({
          name: c.fullName,
          email: c.email,
        });
      });
      log((l) =>
        l.info(`Found and created ${newContacts.length} new contacts`)
      );
    }
    return Promise.resolve(options);
  }
}

const managerFactory: ImportStageManagerFactory = (
  stage: ImportStage,
  addOps: AdditionalStageOptions
) => new ContactStageManager(stage, addOps);

export default managerFactory;
