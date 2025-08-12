'use client';

import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error'
import { isError } from '@/lib/react-util/_utility-methods';
import {
  useState,
  useEffect,
  useCallback,
  Dispatch,
  ChangeEvent,
  forwardRef,
  useImperativeHandle,
  ForwardRefRenderFunction,
  useId,
} from 'react';

import { EmailMessage } from '@/data-models/api/email-message';
import ContactDropdown from '@/components/contact/contact-dropdown';
import {
  ContactSummary,
  createContactSummary,
  normalizeDateAndTime,
} from '@/data-models';
import ContactRecipients from '../contact/contact-recipients';
import EmailSelect from './select';
import { SubmitRefCallbackInstance } from './_types';
import { getEmail, writeEmailRecord } from '@/lib/api/client';
import { AbortablePromise, ICancellablePromiseExt } from '@/lib/typescript';
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
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
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
  TDispatchType = string,
>(
  dispatch: Dispatch<TDispatchType>,
) =>
  useCallback(
    (e: ChangeEvent<TElementType>) => {
      if ('target' in e && 'value' in e.target) {
        dispatch(e.target.value as TDispatchType);
      }
    },
    [dispatch],
  );

const EmailForm: ForwardRefRenderFunction<
  SubmitRefCallbackInstance,
  EmailFormProps
> = (
  { emailId = null, withButtons = true, onSaved, afterSaveBehavior = 'none' },
  ref,
) => {
  const [sender, setSender] = useState<ContactSummary>(createContactSummary());
  const [recipients, setRecipients] = useState<ContactSummary[]>([]);
  const [subject, setSubject] = useState('');
  const [emailContents, setEmailContents] = useState('');
  const [sentTimestamp, setSentTimestamp] = useState('');
  const [threadId, setThreadId] = useState<number | null>(null);
  const [parentEmailId, setParentEmailId] = useState<string | null>(null);
  const [loading, setLoading] = useState<null | 'loading' | 'saving'>(null);
  const [message, setMessage] = useState('');
  const { replace: routerReplace, back: routerBack } = useRouter();
  // Generate unique IDs for form elements
  const uniqueId = useId();

  // Utility function to generate combined IDs
  const generateCombinedId = (childId: string) => `${childId}-${uniqueId}`;

  // Fetch existing email details if editing
  useEffect(() => {
    let cancelled = false;
    let request: ICancellablePromiseExt<EmailMessage | void> | null = null;
    if (emailId) {
      setLoading('loading');
      request = getEmail(emailId)
        .then((data) => {
          setSender(data.sender ?? createContactSummary());
          setSubject(data.subject);
          setEmailContents(data.body);
          setRecipients(data.recipients ?? []);
          setSentTimestamp(
            typeof data.sentOn === 'string'
              ? data.sentOn
              : data.sentOn.toISOString(),
          );
          setThreadId(data.threadId ?? null);
          setParentEmailId(data.parentEmailId ?? null);
          return data;
        })
        .catch((error) => {
          if (cancelled || AbortablePromise.isOperationCancelledError(error)) {
            return;
          }
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'email-form: load',
          });
          setMessage(
            String(
              isError(error) ? error.message : 'Error fetching email details.',
            ),
          );
        })
        .finally(() => {
          request = null;
          if (!cancelled) {
            setLoading(null);
          }
        });
      return () => {
        cancelled = true;
        request?.cancel();
      };
    }
  }, [emailId]);

  const setSubjectCallback = useElementUpdateDispatchCallback(setSubject);
  const setEmailContentsCallback =
    useElementUpdateDispatchCallback<HTMLTextAreaElement>(setEmailContents);
  const setSentTimestampCallback =
    useElementUpdateDispatchCallback(setSentTimestamp);
  const saveEmailCallback = useCallback(() => {
    log((l) => l.debug({ message: 'Saving email...' }));
    setLoading('saving');
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
    const isNewEmail = !emailId;
    return writeEmailRecord(emailData)
      .then((result) => {
        if (isNewEmail) {
          routerReplace(siteMap.email.edit(result.emailId).toString());
        } else {
          switch (afterSaveBehavior) {
            case 'redirect':
              routerBack();
              break;
            case 'none':
            default:
              // NO-OP;
              break;
          }
        }
        setMessage(`Email ${isNewEmail ? 'created' : 'updated'} successfully!`);
        if (onSaved) {
          onSaved({ ...result });
        }
        return result;
      })
      .catch((error) => {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'email-form: submit',
          details: 'Error saving email',
          include: { emailId },
        });
        setMessage(
          String(
            isError(error ? error.message : null) ??
              'Network error. Please try again.',
          ),
        );
        return null;
      })
      .finally(() => {
        // If we just created a new email we're about to redirect so don't clear the loading state
        if (!isNewEmail) {
          setLoading(null);
        }
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
    onSaved,
    routerReplace,
    afterSaveBehavior,
    routerBack,
  ]);

  const handleSubmit = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      await saveEmailCallback().awaitable;
    },
    [saveEmailCallback],
  );

  useImperativeHandle(
    ref,
    () => ({
      saveEmailCallback: () => saveEmailCallback().awaitable,
    }),
    [saveEmailCallback],
  );

  return (
    <div style={stableStyles.container}>
      <h2 style={stableStyles.title}>
        {emailId ? 'Edit Email' : 'Create Email'}
      </h2>
      {message && (
        <p style={stableStyles.errorText}>
          {message}
        </p>
      )}
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
            style={stableStyles.button}
            disabled={!!loading}
            aria-roledescription="Submit Form"
            onClick={handleSubmit}
          >
            {loading === 'saving'
              ? 'Submitting...'
              : loading === 'loading'
                ? 'Loading...'
                : emailId
                  ? 'Update Email'
                  : 'Create Email'}
          </button>
        ) : !!loading ? (
          loading === 'saving' ? (
            'Submitting...'
          ) : loading === 'loading' ? (
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
