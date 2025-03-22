'use client';

import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import {
  EmailMessage,
  normalizeDateAndTime,
  PaginationStats,
} from '@/data-models';
import {
  setUuid,
  getUuid,
  setRecordDirty,
  isRecordDirty,
  RecordWithDirtyState,
} from '@/lib/typescript';
import {
  classnames,
  spacing,
  borders,
  typography,
  backgrounds,
  margin,
  boxShadow,
  display,
  width,
  fontWeight,
  minWidth,
  verticalAlign,
} from 'tailwindcss-classnames';
import ContactDropdown from '@/components/contact/contact-dropdown';
import { log } from '@/lib/logger';
import React from 'react';
import ContactRecipients from '@/components/contact/contact-recipients';
import EmailSelect from '../select';
import { LoggedError } from '@/lib/react-util';

type BulkUpdateOperationRecord = {
  record: RecordWithDirtyState<EmailMessage>;
  successful?: boolean;
  operation?: Promise<EmailMessage>;
};

type BulkUpdateOperation = {
  updates: Array<BulkUpdateOperationRecord>;
  signal: AbortController;
};

const BulkEmailForm: React.FC = () => {
  const [emails, setEmails] = useState<RecordWithDirtyState<EmailMessage>[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bulkUpdateOperation, setBulkUpdateOperation] =
    useState<BulkUpdateOperation | null>(null);
  const [pageStats, setPageStats] = useState<PaginationStats>({
    page: 1,
    num: 2,
    total: 0,
  });

  const fetchPageStats = useCallback(
    (page: number) => {
      setLoading(true);
      fetch(`/api/email?page=${page}&num=${pageStats.num}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Error fetching emails');
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
    [pageStats.num, setEmails, setPageStats, setLoading, setError],
  );

  useEffect(() => {
    fetchPageStats(1);
  }, [fetchPageStats]);

  const handleAddRow = () => {
    const newEmail = setUuid({
      emailId: '',
      sender: { contactId: -1, email: '', name: '' },
      subject: '',
      body: '',
      sentOn: new Date().toISOString(),
      threadId: null,
      parentEmailId: null,
      recipients: [],
    } as EmailMessage);
    setRecordDirty(newEmail);
    setEmails([...emails, newEmail]);
  };

  const handleSave = () => {
    const dirtyEmails = emails.filter(isRecordDirty);

    if (bulkUpdateOperation || dirtyEmails.length === 0) {
      return;
    }

    const abortController = new AbortController();
    const bulkUpdate: BulkUpdateOperation = {
      updates: dirtyEmails.map((email) => ({
        record: email,
        operation: fetch('/api/email', {
          method: !email.emailId ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(email),
          signal: abortController.signal,
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error('Error saving email');
            }
            return res.json();
          })
          .catch((error) => {
            LoggedError.isTurtlesAllTheWayDownBaby({
              error,
              source: 'bulk-email-form Save',
            });
            return undefined;
          }),
      })),
      signal: abortController,
    };
    setBulkUpdateOperation(bulkUpdate);
    const isSameEmail = (x: EmailMessage, y: EmailMessage): boolean =>
      x.subject === y.subject &&
      x.sentOn === y.sentOn &&
      x.threadId === y.threadId &&
      x.parentEmailId === y.parentEmailId &&
      x.sender?.contactId === y.sender?.contactId &&
      x.body === y.body;
    Promise.all(bulkUpdate.updates.map((update) => update.operation))
      .then((results) => {
        setEmails((prevEmails) =>
          prevEmails.map((email) => {
            const result = results.find(
              (res) =>
                res &&
                (res.emailId === email.emailId ||
                  (!email.emailId && isSameEmail(email, res))),
            );
            if (result) {
              setRecordDirty(result, false);
              return result;
            }
            return email;
          }),
        );
      })
      .catch((err) => {
        log((l) => l.error('Error saving emails:', err));
        setError('Error saving emails.');
      })
      .finally(() => {
        setBulkUpdateOperation(null);
      });
  };

  const handleFieldChange = <TElement extends HTMLElement>(
    event: ChangeEvent<HTMLElement>,
    setValue: (
      target: TElement,
      field: keyof EmailMessage,
      msg: EmailMessage,
    ) => void,
  ) => {
    const target = event.target as TElement;
    const field = target.dataset.field as keyof EmailMessage;
    const rowIndex = target.closest('tr')?.dataset.rowIndex;
    if (rowIndex !== undefined) {
      const index = parseInt(rowIndex, 10);
      setEmails((prevEmails) => {
        const updatedEmails = [...prevEmails];
        const targetEmail = updatedEmails[index];
        if (targetEmail) {
          setRecordDirty(targetEmail);
          setValue(target, field, targetEmail);
        }
        return updatedEmails;
      });
    }
  };

  const handleStringInputChange = (event: ChangeEvent<HTMLElement>) =>
    handleFieldChange<HTMLInputElement>(event, (target, field, msg) => {
      if (field === 'subject' || field === 'body') {
        msg[field] = target.value;
      } else {
        log((l) => l.warn('Invalid field:', field));
      }
    });

  const handleDateInputChange = (event: ChangeEvent<HTMLElement>) =>
    handleFieldChange<HTMLInputElement>(event, (target, field, msg) => {
      if (field === 'sentOn') {
        msg[field] = new Date(target.value);
      } else {
        log((l) => l.warn('Invalid field:', field));
      }
    });

  const handlePageChange = (newPage: number) => {
    fetchPageStats(newPage);
  };

  return (
    <div
      className={classnames(
        margin('mx-auto'),
        spacing('p-6', 'mx-8'),
        width('w-full'),
        borders('rounded-lg'),
        boxShadow('shadow-md'),
      )}
    >
      <h2
        className={classnames(
          typography('text-xl', 'font-semibold'),
          margin('mb-4'),
        )}
      >
        Bulk Add Emails
      </h2>
      {error && (
        <p className={classnames(typography('text-red-500'), margin('mb-2'))}>
          {error}
        </p>
      )}
      {loading ? (
        <p className={classnames(typography('text-gray-600'))}>
          Loading emails...
        </p>
      ) : bulkUpdateOperation ? (
        <p className={classnames(typography('text-gray-600'))}>
          Saving emails...
        </p>
      ) : (
        <div>
          <table className={classnames(display('table'), width('w-full'))}>
            <thead>
              <tr>
                <th className={classnames(borders('border'), spacing('p-2'))}>
                  Sender
                </th>
                <th className={classnames(borders('border'), spacing('p-2'))}>
                  Recipients
                </th>
                <th className={classnames(borders('border'), spacing('p-2'))}>
                  Sent On
                </th>
                <th className={classnames(borders('border'), spacing('p-2'))}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email, index) => (
                <React.Fragment
                  key={email.emailId !== '' ? email.emailId : getUuid(email)}
                >
                  <tr data-row-index={index}>
                    <td
                      className={classnames(
                        borders('border-t', 'border-l'),
                        spacing('p-2'),
                      )}
                    >
                      <ContactDropdown
                        className={classnames(minWidth('min-w-max'))}
                        displayValue="name"
                        contact={email.sender}
                        setValue={(value) =>
                          setEmails((prevEmails) => {
                            const updatedEmails = [...prevEmails];
                            updatedEmails[index].sender = value;
                            return updatedEmails;
                          })
                        }
                      />
                    </td>
                    <td
                      className={classnames(
                        borders('border-t'),
                        spacing('p-2'),
                      )}
                    >
                      <ContactRecipients
                        contacts={email.recipients}
                        onContactsUpdate={(updatedContacts) =>
                          setEmails((prevEmails) => {
                            const updatedEmails = [...prevEmails];
                            updatedEmails[index].recipients = updatedContacts;
                            return updatedEmails;
                          })
                        }
                      />
                    </td>
                    <td
                      className={classnames(
                        borders('border-t'),
                        spacing('p-2'),
                      )}
                    >
                      <input
                        aria-label="Sent On"
                        type="datetime-local"
                        value={normalizeDateAndTime(email.sentOn)}
                        data-field="sentOn"
                        onChange={handleDateInputChange}
                      />
                    </td>
                    <td
                      className={classnames(
                        borders('border-y', 'border-r'),
                        spacing('p-2'),
                      )}
                      rowSpan={4}
                    >
                      <button
                        onClick={() => {
                          const emailToDelete = emails[index];
                          if (emailToDelete.emailId) {
                            fetch(`/api/email/${emailToDelete.emailId}`, {
                              method: 'DELETE',
                            })
                              .then((res) => {
                                if (!res.ok) {
                                  throw new Error('Error deleting email');
                                }
                                setEmails((prevEmails) =>
                                  prevEmails.filter((_, i) => i !== index),
                                );
                              })
                              .catch((error) => {
                                log((l) =>
                                  l.error('Error deleting email:', error),
                                );
                                setError('Error deleting email.');
                              });
                          } else {
                            setEmails((prevEmails) =>
                              prevEmails.filter((_, i) => i !== index),
                            );
                          }
                        }}
                        className={classnames(
                          spacing('p-2'),
                          backgrounds('bg-red-500', 'hover:bg-red-600'),
                          typography('text-white'),
                          borders('rounded'),
                        )}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>

                  <tr data-row-index={index}>
                    <td
                      className={classnames(
                        borders('border-l'),
                        spacing('p-2'),
                        fontWeight('font-semibold'),
                        verticalAlign('align-top'),
                      )}
                    >
                      Parent Email
                    </td>

                    <td colSpan={2} className={classnames(spacing('p-2'))}>
                      <EmailSelect
                        selectedEmail={email.parentEmailId}
                        onEmailSelect={(newParentId: string | null) => {
                          setEmails((prevEmails) => {
                            const updatedEmails = [...prevEmails];
                            updatedEmails[index].parentEmailId = newParentId;
                            return updatedEmails;
                          });
                        }}
                      />
                    </td>
                  </tr>

                  <tr data-row-index={index}>
                    <td
                      className={classnames(
                        borders('border-l'),
                        spacing('p-2'),
                        fontWeight('font-semibold'),
                      )}
                    >
                      Subject
                    </td>

                    <td colSpan={2} className={classnames(spacing('p-2'))}>
                      <input
                        aria-label="Subject"
                        type="text"
                        data-field="subject"
                        value={email.subject}
                        onChange={handleStringInputChange}
                      />
                    </td>
                  </tr>

                  <tr data-row-index={index}>
                    <td
                      className={classnames(
                        borders('border-b', 'border-l'),
                        spacing('p-2'),
                        fontWeight('font-semibold'),
                      )}
                    >
                      Body
                    </td>
                    <td
                      colSpan={2}
                      className={classnames(
                        borders('border-b'),
                        spacing('p-2'),
                      )}
                    >
                      <textarea
                        aria-label="Body"
                        className={classnames(
                          width('w-full'),
                          borders('border'),
                        )}
                        rows={4}
                        data-field="body"
                        value={email.body}
                        onChange={handleStringInputChange}
                      />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div className={classnames(display('flex'), margin('mt-4'))}></div>
          <button
            onClick={() => handlePageChange(pageStats.page - 1)}
            disabled={pageStats.page === 1}
            className={classnames(
              spacing('p-2'),
              backgrounds('bg-blue-500', 'hover:bg-blue-600'),
              typography('text-white'),
              borders('rounded'),
              margin('mr-2'),
            )}
          >
            Previous
          </button>
          <button
            onClick={handleAddRow}
            className={classnames(
              spacing('p-2'),
              backgrounds('bg-blue-500', 'hover:bg-blue-600'),
              typography('text-white'),
              borders('rounded'),
              margin('mt-4'),
            )}
          >
            Add Row
          </button>
          <button
            onClick={handleSave}
            className={classnames(
              spacing('p-2'),
              backgrounds('bg-green-500', 'hover:bg-green-600'),
              typography('text-white'),
              borders('rounded'),
              margin('mt-4', 'ml-2'),
            )}
          >
            Save
          </button>
          <button
            onClick={() => handlePageChange(pageStats.page + 1)}
            disabled={pageStats.page * pageStats.num >= pageStats.total}
            className={classnames(
              spacing('p-2'),
              backgrounds('bg-blue-500', 'hover:bg-blue-600'),
              typography('text-white'),
              borders('rounded'),
            )}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkEmailForm;
