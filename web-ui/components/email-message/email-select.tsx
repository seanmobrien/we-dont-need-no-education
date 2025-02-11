import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import { EmailMessageSummary } from '@/data-models';
import classnames, { margin } from '@/tailwindcss.classnames';

const EmailSelect: React.FC<{
  id?: string;
  selectedEmail?: number | EmailMessageSummary | null;
  onEmailSelect: (emailId: number | null) => void;
}> = ({ selectedEmail, onEmailSelect, id: ariaTargetId }) => {
  const [query, setQuery] = useState('');
  const [emails, setEmails] = useState<EmailMessageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [inEditMode, setInEditMode] = useState(false);
  const [selectedEmailDetails, setSelectedEmailDetails] =
    useState<EmailMessageSummary | null>(null);

  useEffect(() => {
    if (query.length < 3) {
      setEmails([]);
      return;
    }

    const fetchEmails = debounce(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/email/search?query=${query}&num=20`);
        if (!response.ok) {
          throw new Error('Failed to fetch emails');
        }
        const data = await response.json();
        if (!Array.isArray(data.results)) {
          throw new Error('Invalid response data');
        }
        setEmails(data.results);
      } catch (error) {
        console.error('Error fetching emails:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    fetchEmails();
    return () => fetchEmails.cancel();
  }, [query]);

  useEffect(() => {
    if (typeof selectedEmail === 'number') {
      const fetchEmailDetails = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/email/${selectedEmail}`);
          if (!response.ok) {
            throw new Error('Failed to fetch email details');
          }
          const data = await response.json();
          setSelectedEmailDetails(data);
        } catch (error) {
          console.error('Error fetching email details:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchEmailDetails();
    } else {
      setSelectedEmailDetails(selectedEmail || null);
    }
  }, [selectedEmail]);

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedEmailId = parseInt(event.target.value, 10);
    if (!isNaN(selectedEmailId)) {
      onEmailSelect(selectedEmailId);
      setInEditMode(false);
    }
  };
  const showSearchBox = inEditMode || selectedEmail == null;
  return (
    <div>
      {showSearchBox ? (
        <input
          id={ariaTargetId}
          type="text"
          list="email-options"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSelect={handleSelect}
          placeholder="Search emails..."
        />
      ) : (
        !inEditMode && (
          <>
            <a
              id={ariaTargetId}
              href="#"
              onClick={() => setInEditMode(true)}
              className={classnames(margin('mr-2'))}
            >
              Edit
            </a>
            <a
              href="#"
              onClick={() => onEmailSelect(null)}
              className={classnames(margin('ml-2'))}
            >
              Clear
            </a>
          </>
        )
      )}
      <datalist id="email-options">
        {emails.map((email) => (
          <option key={email.emailId} value={email.emailId}>
            {email.sender.name}: {email.subject},{' '}
            {new Date(email.sentOn).toLocaleString()}
          </option>
        ))}
      </datalist>
      {loading && <p>Loading...</p>}
      {selectedEmailDetails && (
        <div>
          <h3>{selectedEmailDetails.subject}</h3>
          <p>
            From: {selectedEmailDetails.sender.name} (
            {selectedEmailDetails.sender.email})
          </p>
          <p>
            Sent on: {new Date(selectedEmailDetails.sentOn).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailSelect;
