'use client';

import { useState, useEffect } from 'react';
import {
  classnames,
  spacing,
  borders,
  typography,
  backgrounds,
  margin,
  maxWidth,
  flexBox,
  interactivity,
  transitionProperty,
  boxShadow,
  display,
} from 'tailwindcss-classnames';

import EmailForm from './email-form';

// Shared class for text color used multiple times
const textGray600 = typography('text-gray-600');
const marginBottom2 = margin('mb-2');

// Define reusable class names using `classnames`
const containerClass = classnames(
  maxWidth('max-w-3xl'),
  margin('mx-auto'),
  spacing('p-6'),
  backgrounds('bg-white'),
  borders('rounded-lg'),
  boxShadow('shadow-md')
);

const listItemClass = classnames(
  display('flex'),
  flexBox('items-center', 'justify-between'),
  spacing('p-4'),
  marginBottom2,
  borders('border', 'rounded'),
  backgrounds('bg-gray-50', 'hover:bg-gray-100'),
  interactivity('cursor-pointer'),
  transitionProperty('transition'),
  boxShadow('hover:shadow')
);

const senderClass = typography('font-semibold', 'text-gray-800');
const subjectClass = textGray600; // Reused text color class
const timestampClass = classnames(typography('text-sm'), textGray600); // Applied shared text color

const EmailList: React.FC = () => {
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/email')
      .then((res) => res.json())
      .then((data) => {
        setEmails(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Error fetching emails.');
        setLoading(false);
      });
  }, []);

  return (
    <div className={containerClass}>
      <h2
        className={classnames(
          typography('text-xl', 'font-semibold'),
          margin('mb-4')
        )}
      >
        Email List
      </h2>
      {error && (
        <p className={classnames(typography('text-red-500'), marginBottom2)}>
          {error}
        </p>
      )}
      {loading ? (
        <p className={textGray600}>Loading emails...</p>
      ) : (
        <div>
          {emails.length === 0 ? (
            <p className={textGray600}>No emails found.</p>
          ) : (
            emails.map((email) => (
              <div
                key={email.email_id}
                className={listItemClass}
                onClick={() => setSelectedEmailId(email.email_id)}
              >
                <div>
                  <p className={senderClass}>{email.sender_name}</p>
                  <p className={subjectClass}>{email.subject}</p>
                </div>
                <p className={timestampClass}>
                  {new Date(email.sent_timestamp).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
      {selectedEmailId && (
        <div className={margin('mt-6')}>
          <h2
            className={classnames(
              typography('text-lg', 'font-semibold'),
              marginBottom2
            )}
          >
            Edit Email
          </h2>
          <EmailForm emailId={selectedEmailId} />
        </div>
      )}
    </div>
  );
};

export default EmailList;
