'use client';

import { logger } from 'lib/logger';
import { generateUniqueId } from 'lib/react-util';
import { useState, useEffect, useMemo } from 'react';
import classnames, {
  spacing,
  typography,
  backgroundColor,
  width,
  maxWidth,
  margin,
  outlineStyle,
  ringWidth,
  display,
  borderRadius,
  ringColor,
  boxShadow,
  transitionProperty,
  opacity,
  borderWidth,
} from 'tailwindcss-classnames';

interface EmailFormProps {
  emailId?: number; // Pass an email ID to edit an existing email
}

// Define reusable class names using category-based functions
const inputClass = classnames(
  width('w-full'),
  borderWidth('border'),
  borderRadius('rounded'),
  spacing('p-2'),
  outlineStyle('focus:outline-none'),
  ringWidth('focus:ring'),
  ringColor('focus:ring-blue-300')
);
const labelClass = classnames(
  display('block'),
  typography('font-medium'),
  margin('mb-1')
);
const buttonClass = classnames(
  width('w-full'),
  spacing('p-2'),
  borderRadius('rounded'),
  typography('text-white'),
  opacity('hover:opacity-80'),
  transitionProperty('transition')
);
const primaryButton = classnames(
  buttonClass,
  backgroundColor('bg-blue-500', 'hover:bg-blue-600', 'disabled:bg-gray-400')
);
const containerClass = classnames(
  maxWidth('max-w-lg'),
  margin('mx-auto'),
  spacing('p-6'),
  backgroundColor('bg-white'),
  borderRadius('rounded-lg'),
  boxShadow('shadow-md')
);

const EmailForm: React.FC<EmailFormProps> = ({ emailId }) => {
  const [senderId, setSenderId] = useState<number | ''>('');
  const [subject, setSubject] = useState('');
  const [emailContents, setEmailContents] = useState('');
  const [sentTimestamp, setSentTimestamp] = useState('');
  const [threadId, setThreadId] = useState<number | null>(null);
  const [parentEmailId, setParentEmailId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Generate unique IDs for form elements
  const uniqueId = useMemo(generateUniqueId, []);

  // Utility function to generate combined IDs
  const generateCombinedId = (childId: string) => `${childId}-${uniqueId}`;

  // Fetch existing email details if editing
  useEffect(() => {
    if (emailId) {
      setLoading(true);
      fetch(`/api/email?email_id=${emailId}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Error fetching email details.');
          }
          return data;
        })
        .then((data) => {
          setSenderId(data.sender_id);
          setSubject(data.subject);
          setEmailContents(data.body);
          setSentTimestamp(data.sent_timestamp);
          setThreadId(data.thread_id);
          setParentEmailId(data.parent_email_id);
        })
        .catch((error) => {
          logger().error('Unable to fetch email details', error, {
            source: 'email-form',
          });
          if (
            typeof error === 'object' &&
            'message' in error &&
            error.message
          ) {
            setMessage(error.message);
          } else {
            setMessage('Error fetching email details.');
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [emailId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const emailData = {
      sender_id: senderId,
      subject,
      body: emailContents,
      sent_timestamp: sentTimestamp,
      thread_id: threadId,
      parent_email_id: parentEmailId,
    };

    const method = emailId ? 'PUT' : 'POST';
    const apiUrl = '/api/email';

    try {
      const res = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          emailId ? { email_id: emailId, ...emailData } : emailData
        ),
      });

      const result = await res.json();

      if (res.ok) {
        setMessage(
          emailId
            ? 'Email updated successfully!'
            : 'Email created successfully!'
        );
      } else {
        setMessage(result.error || 'Something went wrong.');
        logger().warn('Unable to save email', result, {
          source: 'email-form',
        });
      }
    } catch (error) {
      logger().error('Network error detected', error, { source: 'email-form' });
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={containerClass}>
      <h2
        className={classnames(
          margin('mb-4'),
          typography('text-xl', 'font-semibold')
        )}
      >
        {emailId ? 'Edit Email' : 'Create Email'}
      </h2>
      {message && (
        <p className={classnames(margin('mb-2'), typography('text-red-500'))}>
          {message}
        </p>
      )}
      <form onSubmit={handleSubmit} className={spacing('space-y-4')}>
        <div>
          <label
            id={generateCombinedId('senderIdLabel')}
            htmlFor={generateCombinedId('senderId')}
            className={labelClass}
          >
            Sender ID
          </label>
          <input
            id={generateCombinedId('senderId')}
            type="number"
            value={senderId ?? ''}
            onChange={(e) => setSenderId(Number(e.target.value))}
            className={inputClass}
            aria-labelledby={generateCombinedId('senderIdLabel')}
            required
          />
        </div>
        <div>
          <label
            htmlFor={generateCombinedId('subject')}
            id={generateCombinedId('subjectLabel')}
            className={labelClass}
          >
            Subject
          </label>
          <input
            id={generateCombinedId('subject')}
            type="text"
            value={subject ?? ''}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
            aria-labelledby={generateCombinedId('subjectLabel')}
            required
          />
        </div>
        <div>
          <label
            htmlFor={generateCombinedId('emailContents')}
            id={generateCombinedId('emailContentsLabel')}
            className={labelClass}
          >
            Email Contents
          </label>
          <textarea
            id={generateCombinedId('emailContents')}
            value={emailContents ?? ''}
            onChange={(e) => setEmailContents(e.target.value)}
            className={inputClass}
            aria-labelledby={generateCombinedId('emailContentsLabel')}
            required
          />
        </div>
        <div>
          <label
            id={generateCombinedId('sentTimestampLabel')}
            htmlFor={generateCombinedId('sentTimestamp')}
            className={labelClass}
          >
            Sent Timestamp
          </label>
          <input
            id={generateCombinedId('sentTimestamp')}
            type="datetime-local"
            value={sentTimestamp ?? ''}
            onChange={(e) => setSentTimestamp(e.target.value)}
            className={inputClass}
            aria-labelledby={generateCombinedId('sentTimestampLabel')}
            required
          />
        </div>
        <div>
          <label
            htmlFor={generateCombinedId('threadId')}
            id={generateCombinedId('threadIdLabel')}
            className={labelClass}
          >
            Thread ID (optional)
          </label>
          <input
            id={generateCombinedId('threadId')}
            type="number"
            value={threadId ?? ''}
            onChange={(e) =>
              setThreadId(e.target.value ? Number(e.target.value) : null)
            }
            className={inputClass}
            aria-labelledby={generateCombinedId('threadIdLabel')}
          />
        </div>
        <div>
          <label
            htmlFor={generateCombinedId('parentEmailId')}
            id={generateCombinedId('parentEmailIdLabel')}
            className={labelClass}
          >
            Parent Email ID (optional)
          </label>
          <input
            id={generateCombinedId('parentEmailId')}
            type="number"
            value={parentEmailId ?? ''}
            onChange={(e) =>
              setParentEmailId(e.target.value ? Number(e.target.value) : null)
            }
            className={inputClass}
            aria-labelledby={generateCombinedId('parentEmailIdLabel')}
          />
        </div>
        <button
          type="submit"
          className={primaryButton}
          disabled={loading}
          aria-roledescription="Submit Form"
        >
          {loading
            ? 'Submitting...'
            : emailId
            ? 'Update Email'
            : 'Create Email'}
        </button>
      </form>
    </div>
  );
};

export default EmailForm;
