import React, { useEffect, useState } from 'react';
import ContactForm from './contact-form';
import { Contact, ContactSummary } from '@/data-models/api/contact';
import { createContactSummary } from '@/data-models/api';
import { log } from '@/lib/logger';
import classnames, {
  TArg as TTailwindArg,
  width,
} from 'tailwindcss-classnames';

interface ContactDropdownProps {
  displayValue?: 'name' | 'email' | 'both';
  contact: number | ContactSummary;
  setValue: (value: ContactSummary) => void;
  filter?: (contact: ContactSummary) => boolean;
  className?: TTailwindArg;
}

const emptyContact = createContactSummary();

const ContactDropdown = ({
  displayValue = 'name',
  className = null,
  contact,
  setValue,
  filter = () => true,
}: ContactDropdownProps) => {
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);

  const getContact = (contactId: number) =>
    contacts.find((c) => c.contactId === contactId) ?? emptyContact;

  const contactId =
    typeof contact === 'number' ? contact : (contact ?? emptyContact).contactId;

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetch('/api/contact', { signal })
      .then((response) => response.json())
      .then((data) => setContacts(data))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error fetching contacts:', error);
        }
      });

    return () => controller.abort();
  }, []);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    switch (event.target.value) {
      case 'select-contact':
        setValue(emptyContact);
        break;
      case 'add-contact':
        setShowContactForm(true);
        break;
      default:
        const newValue = getContact(Number(event.target.value));
        if (!newValue || newValue.contactId < 1) {
          log((l) => l.error('Contact not found:', event.target.value));
        }
        setValue(newValue);
        break;
    }
  };

  const handleContactSaved = (newContact: Contact) => {
    setContacts([...contacts, newContact]);
    setValue(newContact);
    setShowContactForm(false);
  };

  const renderContactOption = (contact: ContactSummary) => {
    switch (displayValue) {
      case 'name':
        return contact.name;
      case 'email':
        return contact.email;
      case 'both':
        return `${contact.name} (${contact.email})`;
      default:
        return contact.name;
    }
  };

  return (
    <div className={classnames(className)}>
      <select
        title="Select contact"
        value={contactId}
        onChange={handleSelectChange}
        className={classnames(width('w-full'))}
      >
        <option value="-1">Select...</option>
        {contacts.filter(filter).map((contact) => (
          <option key={contact.contactId} value={contact.contactId}>
            {renderContactOption(contact)}
          </option>
        ))}
        <option value="add-contact">Add contact</option>
      </select>
      {showContactForm && (
        <ContactForm
          onSave={handleContactSaved}
          onCancel={() => setShowContactForm(false)}
        />
      )}
    </div>
  );
};

export default ContactDropdown;
