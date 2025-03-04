'use client';

import { errorLogFactory, log } from '@/lib/logger';
import { isError } from '@/lib/react-util';
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
import { getEmail, writeEmailRecord } from '@/lib/api/email';
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
  borderRadius('rounded-lg'),
  boxShadow('shadow-md')
);

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
              : data.sentOn.toISOString()
          );
          setThreadId(data.threadId ?? null);
          setParentEmailId(data.parentEmailId ?? null);
          return data;
        })
        .catch((error) => {
          if (cancelled || AbortablePromise.isOperationCancelledError(error)) {
            return;
          }
          log((l) =>
            l.error(errorLogFactory({ error, source: 'email-form: load' }))
          );
          setMessage(
            String(
              isError(error) ? error.message : 'Error fetching email details.'
            )
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
          console.log('in new email save', result);
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
        log((l) =>
          l.error(
            errorLogFactory({
              error,
              source: 'email-form: submit',
              details: 'Network error detected',
            })
          )
        );
        setMessage(
          String(
            isError(error ? error.message : null) ??
              'Network error. Please try again.'
          )
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
      <div className={spacing('space-y-4')}>
        <div>
          <label
            id={generateCombinedId('senderIdLabel')}
            htmlFor={generateCombinedId('senderId')}
            className={labelClass}
          >
            Sent By
          </label>
          <ContactDropdown contact={sender} setValue={setSender} />
        </div>
        <div>
          <label
            id={generateCombinedId('recipientsIdLabel')}
            htmlFor={generateCombinedId('recipientsId')}
            className={labelClass}
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
            className={labelClass}
          >
            Subject
          </label>
          <input
            id={generateCombinedId('subject')}
            type="text"
            value={subject ?? ''}
            onChange={setSubjectCallback}
            className={inputClass}
            aria-labelledby={generateCombinedId('subjectLabel')}
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
            value={normalizeDateAndTime(sentTimestamp)}
            onChange={setSentTimestampCallback}
            className={inputClass}
            aria-labelledby={generateCombinedId('sentTimestampLabel')}
            required
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
            className={labelClass}
          >
            Thread ID (updated by parent email)
          </label>
          <input
            id={generateCombinedId('threadId')}
            type="number"
            readOnly={true}
            disabled={true}
            value={threadId ?? ''}
            className={inputClass}
            aria-labelledby={generateCombinedId('threadIdLabel')}
            aria-readonly="true"
            aria-disabled="true"
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
            onChange={setEmailContentsCallback}
            className={inputClass}
            aria-labelledby={generateCombinedId('emailContentsLabel')}
            required
          />
        </div>
        {withButtons ? (
          <button
            type="button"
            className={primaryButton}
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
