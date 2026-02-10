'use client';

import { log, isError, LoggedError } from '@compliance-theater/logger';
import {
  useState,
  useCallback,
  Dispatch,
  ChangeEvent,
  forwardRef,
  useImperativeHandle,
  ForwardRefRenderFunction,
  useId,
  useEffect,
} from 'react';

import { EmailMessage } from '@/data-models/api/email-message';
import ContactDropdown from '@/components/contact/contact-dropdown';
import { ContactSummary } from '@/data-models/api/contact';
import { createContactSummary } from '@/data-models/api/factories';
import { normalizeDateAndTime } from '@/data-models/_utilities';
import ContactRecipients from '../contact/contact-recipients';
import EmailSelect from './select';
import { SubmitRefCallbackInstance } from './_types';
import { useEmail, useWriteEmail } from '@/lib/hooks/use-email';
import siteMap from '@/lib/site-util/url-builder';
import { useRouter } from 'next/navigation';

type EmailFormAfterSaveBehavior = 'none' | 'redirect';

/**
 * Props for the EmailForm component.
 *
 * @interface EmailFormProps
 *
 * @property {number} [emailId] - Optional ID of the email.
 * @property {(email: Partial<EmailMessage>) => void} [onSaved] - Optional callback function that is called when the email is saved.
 *                                                                It receives a partial EmailMessage object as an argument.
 */
interface EmailFormProps {
  emailId: string | null;
  // Note this will have to go if we stick with this architecture
  onSaved?: (email: Partial<EmailMessage>) => void;
  afterSaveBehavior?: EmailFormAfterSaveBehavior;
  withButtons: boolean;
}

// Define stable style objects outside component to avoid re-renders
const stableStyles = {
  container: {
    maxWidth: '512px',
    margin: '0 auto',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    boxShadow:
      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  } as const,
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    padding: '0.5rem',
    '&:focus': {
      outline: 'none',
      boxShadow: '0 0 0 3px rgb(59 130 246 / 0.3)',
    },
  } as const,
  label: {
    display: 'block',
    fontWeight: 500,
    marginBottom: '0.25rem',
  } as const,
  button: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.375rem',
    color: 'white',
    transition: 'opacity 0.15s ease-in-out',
    backgroundColor: '#3b82f6',
    border: 'none',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#2563eb',
    },
    '&:disabled': {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed',
    },
  } as const,
  errorText: {
    marginBottom: '0.5rem',
    color: '#ef4444',
  } as const,
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  } as const,
  title: {
    marginBottom: '1rem',
    fontSize: '1.25rem',
    fontWeight: 600,
  } as const,
} as const;

const useElementUpdateDispatchCallback = <
  TElementType extends HTMLElement = HTMLElement,
  TDispatchType = string
>(
  dispatch: Dispatch<TDispatchType>
) =>
  useCallback(
    (e: ChangeEvent<TElementType>) => {
      if ('target' in e && 'value' in e.target) {
        dispatch(e.target.value as TDispatchType);
      }
    },
    [dispatch]
  );

const EmailForm: ForwardRefRenderFunction<
  SubmitRefCallbackInstance,
  EmailFormProps
> = (
  { emailId = null, withButtons = true, onSaved, afterSaveBehavior = 'none' },
  ref
) => {
  const [sender, setSender] = useState<ContactSummary>(createContactSummary());
  const [recipients, setRecipients] = useState<ContactSummary[]>([]);
  const [subject, setSubject] = useState('');
  const [emailContents, setEmailContents] = useState('');
  const [sentTimestamp, setSentTimestamp] = useState('');
  const [threadId, setThreadId] = useState<number | null>(null);
  const [parentEmailId, setParentEmailId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const { replace: routerReplace, back: routerBack } = useRouter();

  // Generate unique IDs for form elements
  const uniqueId = useId();

  // Utility function to generate combined IDs
  const generateCombinedId = (childId: string) => `${childId}-${uniqueId}`;

  // Use React Query to fetch email data
  const {
    data: emailData,
    isLoading: isLoadingEmail,
    error: emailError,
  } = useEmail(emailId);

  // Use React Query mutation for saving email
  const writeEmailMutation = useWriteEmail({
    onSuccess: (result) => {
      const isNewEmail = !emailId;
      if (isNewEmail) {
        routerReplace(siteMap.email.edit(result.emailId));
      } else {
        switch (afterSaveBehavior) {
          case 'redirect':
            routerBack();
            break;
          case 'none':
          default:
            // NO-OP
            break;
        }
      }
      setMessage(`Email ${isNewEmail ? 'created' : 'updated'} successfully!`);
      if (onSaved) {
        onSaved({ ...result });
      }
    },
    onError: (error) => {
      const errorMessage = isError(error)
        ? error.message
        : 'Error saving email.';
      setMessage(errorMessage);
    },
  });

  // Update form state when email data is loaded
  useEffect(() => {
    if (emailData) {
      setSender(emailData.sender ?? createContactSummary());
      setSubject(emailData.subject);
      setEmailContents(emailData.body);
      setRecipients(emailData.recipients ?? []);
      setSentTimestamp(
        typeof emailData.sentOn === 'string'
          ? emailData.sentOn
          : emailData.sentOn.toISOString()
      );
      setThreadId(emailData.threadId ?? null);
      setParentEmailId(emailData.parentEmailId ?? null);
      setMessage(''); // Clear any previous error messages
    }
  }, [emailData]);

  // Handle loading error
  useEffect(() => {
    if (emailError) {
      const errorMessage = isError(emailError)
        ? emailError.message
        : 'Error fetching email details.';
      setMessage(errorMessage);
    }
  }, [emailError]);

  // Determine if form is loading (either fetching or saving)
  const isLoading = isLoadingEmail || writeEmailMutation.isPending;

  const setSubjectCallback = useElementUpdateDispatchCallback(setSubject);
  const setEmailContentsCallback =
    useElementUpdateDispatchCallback<HTMLTextAreaElement>(setEmailContents);
  const setSentTimestampCallback =
    useElementUpdateDispatchCallback(setSentTimestamp);

  const saveEmailCallback = useCallback(() => {
    log((l) => l.debug({ message: 'Saving email...' }));
    setMessage('');

    const emailData = {
      emailId: emailId ? emailId : undefined,
      sender,
      senderId: sender?.contactId,
      recipients,
      subject,
      body: emailContents,
      sentOn: sentTimestamp,
      threadId,
      parentEmailId,
    };

    return writeEmailMutation.mutateAsync(emailData).catch((error) => {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'EmailForm.saveEmailCallback',
      });
      return emailData;
    });
  }, [
    emailId,
    sender,
    recipients,
    subject,
    emailContents,
    sentTimestamp,
    threadId,
    parentEmailId,
    writeEmailMutation,
  ]);

  const handleSubmit = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      await saveEmailCallback();
    },
    [saveEmailCallback]
  );

  useImperativeHandle(
    ref,
    () => ({
      saveEmailCallback,
    }),
    [saveEmailCallback]
  );

  return (
    <div style={stableStyles.container}>
      <h2 style={stableStyles.title}>
        {emailId ? 'Edit Email' : 'Create Email'}
      </h2>
      {message && <p style={stableStyles.errorText}>{message}</p>}
      <div style={stableStyles.formContainer}>
        <div>
          <label
            id={generateCombinedId('senderIdLabel')}
            htmlFor={generateCombinedId('senderId')}
            style={stableStyles.label}
          >
            Sent By
          </label>
          <ContactDropdown contact={sender} setValue={setSender} />
        </div>
        <div>
          <label
            id={generateCombinedId('recipientsIdLabel')}
            htmlFor={generateCombinedId('recipientsId')}
            style={stableStyles.label}
          >
            Recipients
          </label>
          <ContactRecipients
            id={generateCombinedId('recipientsId')}
            contacts={recipients}
            onContactsUpdate={setRecipients}
          />
        </div>
        <div>
          <label
            htmlFor={generateCombinedId('subject')}
            id={generateCombinedId('subjectLabel')}
            style={stableStyles.label}
          >
            Subject
          </label>
          <input
            id={generateCombinedId('subject')}
            type="text"
            value={subject ?? ''}
            onChange={setSubjectCallback}
            style={stableStyles.input}
            aria-labelledby={generateCombinedId('subjectLabel')}
            required
          />
        </div>
        <div>
          <label
            id={generateCombinedId('sentTimestampLabel')}
            htmlFor={generateCombinedId('sentTimestamp')}
            style={stableStyles.label}
          >
            Sent Timestamp
          </label>
          <input
            id={generateCombinedId('sentTimestamp')}
            type="datetime-local"
            value={normalizeDateAndTime(sentTimestamp)}
            onChange={setSentTimestampCallback}
            style={stableStyles.input}
            aria-labelledby={generateCombinedId('sentTimestampLabel')}
            required
          />
        </div>
        <div>
          <label
            htmlFor={generateCombinedId('parentEmailId')}
            id={generateCombinedId('parentEmailIdLabel')}
            style={stableStyles.label}
          >
            Parent Email ID (optional)
          </label>
          <EmailSelect
            id={generateCombinedId('parentEmailId')}
            selectedEmail={parentEmailId}
            onEmailSelect={setParentEmailId}
          />
        </div>
        <div>
          <label
            htmlFor={generateCombinedId('threadId')}
            id={generateCombinedId('threadIdLabel')}
            style={stableStyles.label}
          >
            Thread ID (updated by parent email)
          </label>
          <input
            id={generateCombinedId('threadId')}
            type="number"
            readOnly={true}
            disabled={true}
            value={threadId ?? ''}
            style={stableStyles.input}
            aria-labelledby={generateCombinedId('threadIdLabel')}
            aria-readonly="true"
            aria-disabled="true"
          />
        </div>
        <div>
          <label
            htmlFor={generateCombinedId('emailContents')}
            id={generateCombinedId('emailContentsLabel')}
            style={stableStyles.label}
          >
            Email Contents
          </label>
          <textarea
            id={generateCombinedId('emailContents')}
            value={emailContents ?? ''}
            onChange={setEmailContentsCallback}
            style={stableStyles.input}
            aria-labelledby={generateCombinedId('emailContentsLabel')}
            required
          />
        </div>
        {withButtons ? (
          <button
            type="button"
            data-testid="submit-button"
            style={stableStyles.button}
            disabled={isLoading}
            aria-roledescription="Submit Form"
            onClick={handleSubmit}
          >
            {writeEmailMutation.isPending
              ? 'Submitting...'
              : isLoadingEmail
              ? 'Loading...'
              : emailId
              ? 'Update Email'
              : 'Create Email'}
          </button>
        ) : isLoading ? (
          writeEmailMutation.isPending ? (
            'Submitting...'
          ) : isLoadingEmail ? (
            'Loading...'
          ) : (
            ''
          )
        ) : emailId ? (
          'Update Email'
        ) : (
          'Create Email'
        )}
      </div>
    </div>
  );
};

export default forwardRef(EmailForm);
