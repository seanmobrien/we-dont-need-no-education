import { EmailMessageSummary } from '@/data-models/api/email-message';
import { getEmailList } from '@/lib/api/email';
import Link from 'next/link';
import { Dispatch, useState, useEffect } from 'react';
import classnames, {
  backgrounds,
  borders,
  boxShadow,
  display,
  flexBox,
  interactivity,
  spacing,
  transitionProperty,
  typography,
} from 'tailwindcss-classnames';
import siteMap from '@/lib/site-util/url-builder';
import {
  ICancellablePromiseExt,
  isOperationCancelledError,
} from '@/lib/typescript';

const textGray600 = typography('text-gray-600');

const listItemClass = classnames(
  display('flex'),
  flexBox('items-center', 'justify-between'),
  spacing('p-4'),
  borders('border', 'rounded'),
  backgrounds('bg-gray-50', 'hover:bg-gray-100'),
  interactivity('cursor-pointer'),
  transitionProperty('transition'),
  boxShadow('hover:shadow')
);

const senderClass = typography('font-semibold', 'text-gray-800');
const subjectClass = textGray600; // Reused text color class
const timestampClass = classnames(typography('text-sm'), textGray600); // Applied shared text color

const EmailListServer = ({
  pageNumber = 1,
  perPage,
  setError,
  setLoading,
  loading,
}: {
  perPage: number;
  pageNumber: number;
  setError: Dispatch<string>;
  loading: boolean;
  setLoading: Dispatch<boolean>;
}) => {
  const [emails, setEmails] = useState<ReadonlyArray<EmailMessageSummary>>([]);

  useEffect(() => {
    let request: ICancellablePromiseExt<void> | null = getEmailList({
      page: pageNumber,
      num: perPage,
    })
      .then((data) => {
        setEmails(data);
      })
      .catch((e) => {
        if (!isOperationCancelledError(e)) {
          setError('Error fetching emails.');
        }
      })
      .finally(() => {
        setLoading(false);
        request = null;
      });
    return () => {
      request?.cancel();
    };
  }, [setEmails, pageNumber, perPage, setError, setLoading]);

  return loading ? (
    <p className={textGray600}>Loading emails...</p>
  ) : (
    <div>
      {!emails?.length && (
        <p className={textGray600} data-testid="email-list-none-found">
          No emails found.
        </p>
      )}
      {emails?.map((email) => (
        <div key={email.emailId} className={listItemClass}>
          <div>
            <p className={senderClass}>
              <Link
                href={siteMap.email.edit(email.emailId)}
                data-testid={`email-list-sender-${email.emailId}`}
              >
                {email.sender?.name}
              </Link>
            </p>
            <p className={subjectClass}>
              <Link
                href={siteMap.email.edit(email.emailId)}
                data-testid={`email-list-subject-${email.emailId}`}
              >
                {email.subject}
              </Link>
            </p>
          </div>
          <p
            className={timestampClass}
            data-testid={`email-list-timestamp-${email.emailId}`}
          >
            {new Date(email.sentOn).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default EmailListServer;
