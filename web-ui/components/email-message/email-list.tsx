'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  classnames,
  spacing,
  borders,
  typography,
  backgrounds,
  margin,
  flexBox,
  interactivity,
  transitionProperty,
  boxShadow,
  display,
  position,
} from 'tailwindcss-classnames';
import type {
  EmailMessage,
  EmailMessageSummary,
  PaginationStats,
} from 'data-models/api';
import EmailForm from './email-form';
import Modal from '../general/Modal';
import { SubmitRefCallbackInstance } from './_types';
import { log } from '@/lib/logger';
import Link from 'next/link';
import siteMap from 'lib/site-util/url-builder';

// Shared class for text color used multiple times
const textGray600 = typography('text-gray-600');
const marginBottom2 = margin('mb-2');

// Define reusable class names using `classnames`
const containerClass = classnames(
  margin('mx-auto'),
  spacing('p-6'),
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
  const [emails, setEmails] = useState<EmailMessageSummary[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [pageStats, setPageStats] = useState<PaginationStats>({
    page: 1,
    num: 10,
    total: 0,
  });
  const emailFormRef = useRef<SubmitRefCallbackInstance>(null);

  const fetchPageStats = useCallback(
    (page: number) => {
      setLoading(true);
      fetch(`/api/email?page=${page}&num=${pageStats.num}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Error fetching emails.');
          }
          return res.json();
        })
        .then((data) => {
          setPageStats(data.pageStats);
          setEmails(data.results);
          setLoading(false);
        })
        .catch(() => {
          setError('Error fetching emails.');
          setLoading(false);
        });
    },
    [pageStats.num, setEmails, setPageStats, setLoading, setError]
  );
  const onSelectedEmailSave = useCallback(
    (newValue: Partial<EmailMessage>) => {
      setEmails((currentValue) =>
        currentValue.map((email) =>
          email.emailId === selectedEmailId
            ? {
                ...email,
                ...newValue,
              }
            : email
        )
      );
      setSelectedEmailId(null);
    },
    [setEmails, selectedEmailId]
  );

  const onModalSave = useCallback(async () => {
    if (emailFormRef.current) {
      try {
        emailFormRef.current.saveEmailCallback();
      } catch (error) {
        log((l) => l.error({ error, source: 'email-list' }));
      }
    }
  }, [emailFormRef]);

  useEffect(() => {
    fetchPageStats(1);
  }, [fetchPageStats]);
  const handlePageChange = (newPage: number) => {
    fetchPageStats(newPage);
  };

  const handleMenuClick = () => {
    setShowMenu(!showMenu);
  };

  const handleAddEmail = () => {
    setSelectedEmailId(null);
    setShowBulkForm(false);
    setShowMenu(false);
  };

  return (
    <div className={containerClass}>
      {!showBulkForm && (
        <h2
          className={classnames(
            typography('text-xl', 'font-semibold'),
            margin('mb-4')
          )}
        >
          Email List
        </h2>
      )}
      {error && (
        <p
          className={classnames(typography('text-red-500'), marginBottom2)}
          data-testid="email-list-error"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p className={textGray600}>Loading emails...</p>
      ) : showBulkForm ? (
        <></>
      ) : (
        <div>
          {emails.length === 0 ? (
            <p className={textGray600} data-testid="email-list-none-found">
              No emails found.
            </p>
          ) : (
            emails.map((email) => (
              <div key={email.emailId} className={listItemClass}>
                <div>
                  <p className={senderClass}>
                    <a
                      href="#"
                      data-testid={`email-list-sender-${email.emailId}`}
                      onClick={() => setSelectedEmailId(email.emailId)}
                    >
                      {email.sender?.name}
                    </a>
                  </p>
                  <p className={subjectClass}>
                    <a
                      href="#"
                      data-testid={`email-list-subject-${email.emailId}`}
                      onClick={() => setSelectedEmailId(email.emailId)}
                    >
                      {email.subject}
                    </a>
                  </p>
                </div>
                <p
                  className={timestampClass}
                  data-testid={`email-list-timestamp-${email.emailId}`}
                >
                  {new Date(email.sentOn).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
      <div className={classnames(position('relative'))}>
        <button
          onClick={handleMenuClick}
          className={classnames(
            spacing('p-2'),
            backgrounds('bg-blue-500', 'hover:bg-blue-600'),
            typography('text-white'),
            borders('rounded')
          )}
        >
          Add Email
        </button>
        {showMenu && (
          <div
            className={classnames(
              backgrounds('bg-white'),
              borders('border', 'rounded'),
              boxShadow('shadow-md'),
              spacing('mt-2'),
              position('absolute')
            )}
          >
            <Link
              href={siteMap.email.page(-1)}
              className={classnames(
                spacing('p-2'),
                display('block'),
                backgrounds('hover:bg-gray-100')
              )}
              title="Add Email"
            >
              Add Email
            </Link>
            <Link
              href={siteMap.email.bulkEdit()}
              className={classnames(
                spacing('p-2'),
                display('block'),
                backgrounds('hover:bg-gray-100')
              )}
              title="Bulk Add Email"
            >
              Bulk Add Email
            </Link>
          </div>
        )}
      </div>

      <div className={classnames(display('flex'), margin('mt-4'))}>
        <button
          onClick={() => handlePageChange(pageStats.page - 1)}
          disabled={pageStats.page === 1}
          className={classnames(
            spacing('p-2'),
            backgrounds('bg-blue-500', 'hover:bg-blue-600'),
            typography('text-white'),
            borders('rounded'),
            margin('mr-2')
          )}
        >
          Previous
        </button>
        <button
          onClick={() => handlePageChange(pageStats.page + 1)}
          disabled={pageStats.page * pageStats.num >= pageStats.total}
          className={classnames(
            spacing('p-2'),
            backgrounds('bg-blue-500', 'hover:bg-blue-600'),
            typography('text-white'),
            borders('rounded')
          )}
        >
          Next
        </button>
      </div>
      <Modal
        title="Edit Email"
        closeButtonText="Cancel"
        onClose={() => setSelectedEmailId(null)}
        isOpen={!!selectedEmailId}
        onSave={onModalSave}
      >
        <EmailForm
          ref={emailFormRef}
          emailId={selectedEmailId}
          onSaved={onSelectedEmailSave}
          withButtons={false}
        />
      </Modal>
    </div>
  );
};

export default EmailList;
