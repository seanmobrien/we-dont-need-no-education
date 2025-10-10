/** @jsxImportSource @emotion/react */

import React, { useCallback, useState } from 'react';
import ContactDropdown from './contact-dropdown';
import { ContactSummary } from '@/data-models/api/contact';
import { css } from '@emotion/react';
import fastEqual from 'fast-deep-equal';
import Modal from '../general/modal';

type ContactRecipientsProps = {
  id?: string;
  contacts: ContactSummary[];
  onContactsUpdate: (updatedContacts: ContactSummary[]) => void;
};

const styles = {
  contactItem: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
  `,
};

const ContactRecipients: React.FC<ContactRecipientsProps> = ({
  contacts,
  onContactsUpdate,
  id: ariaTargetId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [contactsFromProps, setContactsFromProps] =
    useState<ContactSummary[]>(contacts);
  const [currentContacts, setCurrentContacts] =
    useState<ContactSummary[]>(contacts);
  const enableEditMode = useCallback(() => setIsEditing(true), [setIsEditing]);
  const disableEditMode = useCallback(
    () => setIsEditing(false),
    [setIsEditing],
  );
  const filterContacts = useCallback(
    (contact: ContactSummary) =>
      currentContacts.findIndex((c) => c.contactId === contact.contactId) ===
      -1,
    [currentContacts],
  );
  const handleAddContact = useCallback(
    (newContact: ContactSummary) =>
      setCurrentContacts([...currentContacts, newContact]),
    [currentContacts],
  );
  const handleRemoveContact = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const contactId = parseInt(event.currentTarget.dataset.target ?? '');
      setCurrentContacts(
        currentContacts.filter((contact) => contact.contactId !== contactId),
      );
    },
    [currentContacts],
  );
  const handleSave = useCallback(() => {
    onContactsUpdate(currentContacts);
    setIsEditing(false);
  }, [currentContacts, onContactsUpdate]);

  // Check to see if our parent component has updated contacts - if so, update our state
  if (!fastEqual(contactsFromProps, contacts)) {
    setContactsFromProps(contacts);
    if (!fastEqual(currentContacts, contacts)) {
      setCurrentContacts(contacts);
    }
  }
  return (
    <div>
      <div>
        {currentContacts
          .map((contact) => `${contact.name} (${contact.email})`)
          .join('; ')}
        <button
          aria-haspopup="dialog"
          className="btn btn-primary"
          onClick={enableEditMode}
          id={ariaTargetId}
        >
          Edit
        </button>
      </div>
      <Modal
        isOpen={isEditing}
        onSave={handleSave}
        onClose={disableEditMode}
        title="Edit Recipients"
      >
        {currentContacts.map((contact) => (
          <div key={contact.contactId} css={styles.contactItem}>
            <span>
              {contact.name} ({contact.email})
            </span>
            <button
              className="btn btn-angry"
              data-target={contact.contactId.toString()}
              onClick={handleRemoveContact}
            >
              Remove
            </button>
          </div>
        ))}
        <ContactDropdown
          contact={-1}
          setValue={handleAddContact}
          filter={filterContacts}
        />
      </Modal>
    </div>
  );
};

export default ContactRecipients;
