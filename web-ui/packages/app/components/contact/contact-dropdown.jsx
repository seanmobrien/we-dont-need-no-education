import { useEffect, useState } from 'react';
import ContactForm from './contact-form';
import { createContactSummary } from '@/data-models/api';
import { log, LoggedError } from '@compliance-theater/logger';
import { css } from '@emotion/react';
import { fetch } from '@/lib/nextjs-util/fetch';
const dropdownStyles = {
    select: css `
    width: 100%;
  `,
};
const emptyContact = createContactSummary();
const ContactDropdown = ({ displayValue = 'name', className, contact, setValue, filter = () => true, style, }) => {
    const [contacts, setContacts] = useState([]);
    const [showContactForm, setShowContactForm] = useState(false);
    const getContact = (contactId) => contacts.find((c) => c.contactId === contactId) ?? emptyContact;
    const contactId = typeof contact === 'number' ? contact : (contact ?? emptyContact).contactId;
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
        fetch('/api/contact', { signal })
            .then((response) => response.json())
            .then((data) => setContacts(data))
            .catch((error) => {
            if (error.name !== 'AbortError') {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'chat-panel',
                });
            }
        });
        return () => controller.abort();
    }, []);
    const handleSelectChange = (event) => {
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
    const handleContactSaved = (newContact) => {
        setContacts([...contacts, newContact]);
        setValue(newContact);
        setShowContactForm(false);
    };
    const renderContactOption = (contact) => {
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
    return (<div css={className} style={style}>
      <select title="Select contact" value={contactId} onChange={handleSelectChange} css={dropdownStyles.select}>
        <option value="-1">Select...</option>
        {Array.isArray(contacts)
            ? contacts.filter(filter).map((contact) => (<option key={contact.contactId} value={contact.contactId}>
                {renderContactOption(contact)}
              </option>))
            : null}
        <option value="add-contact">Add contact</option>
      </select>
      {showContactForm && (<ContactForm onSave={handleContactSaved} onCancel={() => setShowContactForm(false)}/>)}
    </div>);
};
export default ContactDropdown;
//# sourceMappingURL=contact-dropdown.jsx.map