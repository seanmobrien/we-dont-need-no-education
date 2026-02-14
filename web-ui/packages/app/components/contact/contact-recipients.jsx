import { useCallback, useState } from 'react';
import ContactDropdown from './contact-dropdown';
import { css } from '@emotion/react';
import fastEqual from 'fast-deep-equal';
import Modal from '../general/modal';
const styles = {
    contactItem: css `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
  `,
};
const ContactRecipients = ({ contacts, onContactsUpdate, id: ariaTargetId, }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [contactsFromProps, setContactsFromProps] = useState(contacts);
    const [currentContacts, setCurrentContacts] = useState(contacts);
    const enableEditMode = useCallback(() => setIsEditing(true), [setIsEditing]);
    const disableEditMode = useCallback(() => setIsEditing(false), [setIsEditing]);
    const filterContacts = useCallback((contact) => currentContacts.findIndex((c) => c.contactId === contact.contactId) ===
        -1, [currentContacts]);
    const handleAddContact = useCallback((newContact) => setCurrentContacts([...currentContacts, newContact]), [currentContacts]);
    const handleRemoveContact = useCallback((event) => {
        const contactId = parseInt(event.currentTarget.dataset.target ?? '');
        setCurrentContacts(currentContacts.filter((contact) => contact.contactId !== contactId));
    }, [currentContacts]);
    const handleSave = useCallback(() => {
        onContactsUpdate(currentContacts);
        setIsEditing(false);
    }, [currentContacts, onContactsUpdate]);
    if (!fastEqual(contactsFromProps, contacts)) {
        setContactsFromProps(contacts);
        if (!fastEqual(currentContacts, contacts)) {
            setCurrentContacts(contacts);
        }
    }
    return (<div>
      <div>
        {currentContacts
            .map((contact) => `${contact.name} (${contact.email})`)
            .join('; ')}
        <button aria-haspopup="dialog" className="btn btn-primary" onClick={enableEditMode} id={ariaTargetId}>
          Edit
        </button>
      </div>
      <Modal isOpen={isEditing} onSave={handleSave} onClose={disableEditMode} title="Edit Recipients">
        {currentContacts.map((contact) => (<div key={contact.contactId} css={styles.contactItem}>
            <span>
              {contact.name} ({contact.email})
            </span>
            <button className="btn btn-angry" data-target={contact.contactId.toString()} onClick={handleRemoveContact}>
              Remove
            </button>
          </div>))}
        <ContactDropdown contact={-1} setValue={handleAddContact} filter={filterContacts}/>
      </Modal>
    </div>);
};
export default ContactRecipients;
//# sourceMappingURL=contact-recipients.jsx.map