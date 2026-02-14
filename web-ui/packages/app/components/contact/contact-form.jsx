import React, { useState, useEffect, useCallback } from 'react';
import { createContact, isContact, isContactSummary } from '@/data-models/api';
import { log, LoggedError } from '@compliance-theater/logger';
import { fetch } from '@/lib/nextjs-util/fetch';
const ContactForm = ({ contact, onSave, onCancel, }) => {
    const [formData, setFormData] = useState(createContact());
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
        const fetchContact = async (contactId) => {
            setLoading(true);
            try {
                const response = await fetch(`/api/contacts/${contactId}`, {
                    signal,
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch contact');
                }
                const contactData = await response.json();
                setFormData(contactData);
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    msg: 'Error fetching contact',
                });
            }
            finally {
                setLoading(false);
            }
            return () => controller.abort();
        };
        if (isContact(contact)) {
            setFormData(contact);
        }
        else if (isContactSummary(contact)) {
            fetchContact(contact.contactId);
        }
        else if (typeof contact === 'number' && contact > 0) {
            fetchContact(contact);
        }
    }, [contact]);
    const handleInputChange = useCallback((event) => {
        const { name, value } = event.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
    }, [setFormData]);
    const onSaveClicked = useCallback(async (event) => {
        event.preventDefault();
        try {
            const controller = new AbortController();
            const signal = controller.signal;
            let uri;
            let method;
            if (formData.contactId > 0) {
                uri = `/api/contacts/${formData.contactId}`;
                method = 'PUT';
            }
            else {
                uri = '/api/contacts';
                method = 'POST';
            }
            const response = await fetch(uri, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contactId: formData.contactId > 0 ? formData.contactId : undefined,
                    name: formData.name,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    jobDescription: formData.jobDescription,
                    isDistrictStaff: formData.isDistrictStaff,
                }),
                signal,
            });
            if (!response.ok) {
                throw new Error('Failed to save contact');
            }
            const savedContact = await response.json();
            onSave(savedContact);
        }
        catch (error) {
            log((l) => l.error('Error saving contact:', error));
        }
    }, [formData, onSave]);
    if (loading) {
        return <div>Loading...</div>;
    }
    return (<div>
      <div>
        <label>
          Name:
          <input type="text" name="name" value={formData.name} onChange={handleInputChange}/>
        </label>
      </div>
      <div>
        <label>
          Email:
          <input type="email" name="email" value={formData.email} onChange={handleInputChange}/>
        </label>
      </div>
      <div>
        <label>
          Phone Number:
          <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange}/>
        </label>
      </div>
      <div>
        <label>
          Job Description:
          <input type="text" name="jobDescription" value={formData.jobDescription} onChange={handleInputChange}/>
        </label>
      </div>
      <div>
        <label>
          Is District Staff:
          <input type="checkbox" name="isDistrictStaff" checked={formData.isDistrictStaff} onChange={(e) => setFormData((prevData) => ({
            ...prevData,
            isDistrictStaff: e.target.checked,
        }))}/>
        </label>
      </div>
      <div>
        <button type="button" onClick={onSaveClicked}>
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>);
};
export default ContactForm;
//# sourceMappingURL=contact-form.jsx.map