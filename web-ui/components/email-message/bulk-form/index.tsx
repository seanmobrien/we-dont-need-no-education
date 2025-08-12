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
import ContactDropdown from '@/components/contact/contact-dropdown';
import { log } from '@/lib/logger';
import React from 'react';
import ContactRecipients from '@/components/contact/contact-recipients';
import EmailSelect from '../select';
import { fetch } from '@/lib/nextjs-util/fetch';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

// Define stable style objects outside component to avoid re-renders
const stableStyles = {
  container: {
    margin: '0 auto',
    padding: '1.5rem',
    width: '100%',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    maxWidth: '100%',
  } as const,
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: '1rem',
  } as const,
  errorText: {
    color: '#ef4444',
    marginBottom: '0.5rem',
  } as const,
  loadingText: {
    color: '#6b7280',
  } as const,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  tableCell: {
    border: '1px solid #d1d5db',
    padding: '0.5rem',
  } as const,
  tableCellTop: {
    borderTop: '1px solid #d1d5db',
    borderLeft: '1px solid #d1d5db',
    padding: '0.5rem',
  } as const,
  tableCellTopOnly: {
    borderTop: '1px solid #d1d5db',
    padding: '0.5rem',
  } as const,
  tableCellBottom: {
    borderBottom: '1px solid #d1d5db',
    borderLeft: '1px solid #d1d5db',
    padding: '0.5rem',
  } as const,
  tableCellBottomSpan: {
    borderBottom: '1px solid #d1d5db',
    padding: '0.5rem',
  } as const,
  tableCellFull: {
    borderTop: '1px solid #d1d5db',
    borderRight: '1px solid #d1d5db',
    borderBottom: '1px solid #d1d5db',
    padding: '0.5rem',
  } as const,
  minWidthMax: {
    minWidth: 'max-content',
  } as const,
  fontSemibold: {
    fontWeight: 600,
  } as const,
  alignTop: {
    verticalAlign: 'top',
  } as const,
  textareaFull: {
    width: '100%',
    border: '1px solid #d1d5db',
  } as const,
  buttonContainer: {
    display: 'flex',
    marginTop: '1rem',
  } as const,
  button: {
    padding: '0.5rem',
    color: 'white',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease-in-out',
    marginRight: '0.5rem',
  } as const,
  buttonBlue: {
    backgroundColor: '#3b82f6',
    '&:hover': {
      backgroundColor: '#2563eb',
    },
  } as const,
  buttonGreen: {
    backgroundColor: '#10b981',
    '&:hover': {
      backgroundColor: '#059669',
    },
  } as const,
  buttonRed: {
    backgroundColor: '#ef4444',
    '&:hover': {
      backgroundColor: '#dc2626',
    },
  } as const,
} as const;

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
    <div style={stableStyles.container}>
      <h2 style={stableStyles.title}>
        Bulk Add Emails
      </h2>
      {error && (
        <p style={stableStyles.errorText}>
          {error}
        </p>
      )}
      {loading ? (
        <p style={stableStyles.loadingText}>
          Loading emails...
        </p>
      ) : bulkUpdateOperation ? (
        <p style={stableStyles.loadingText}>
          Saving emails...
        </p>
      ) : (
        <div>
          <table style={stableStyles.table}>
            <thead>
              <tr>
                <th style={stableStyles.tableCell}>
                  Sender
                </th>
                <th style={stableStyles.tableCell}>
                  Recipients
                </th>
                <th style={stableStyles.tableCell}>
                  Sent On
                </th>
                <th style={stableStyles.tableCell}>
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
                    <td style={stableStyles.tableCellTop}>
                      <ContactDropdown
                        style={stableStyles.minWidthMax}
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
                    <td style={stableStyles.tableCellTopOnly}>
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
                    <td style={stableStyles.tableCellTopOnly}>
                      <input
                        aria-label="Sent On"
                        type="datetime-local"
                        value={normalizeDateAndTime(email.sentOn)}
                        data-field="sentOn"
                        onChange={handleDateInputChange}
                      />
                    </td>
                    <td
                      style={stableStyles.tableCellFull}
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
                        style={{
                          ...stableStyles.button,
                          ...stableStyles.buttonRed,
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>

                  <tr data-row-index={index}>
                    <td style={{
                      ...stableStyles.tableCellTop,
                      ...stableStyles.fontSemibold,
                      ...stableStyles.alignTop,
                    }}>
                      Parent Email
                    </td>

                    <td colSpan={2} style={stableStyles.tableCellTopOnly}>
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
                    <td style={{
                      ...stableStyles.tableCellTop,
                      ...stableStyles.fontSemibold,
                    }}>
                      Subject
                    </td>

                    <td colSpan={2} style={stableStyles.tableCellTopOnly}>
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
                    <td style={{
                      ...stableStyles.tableCellBottom,
                      ...stableStyles.fontSemibold,
                    }}>
                      Body
                    </td>
                    <td
                      colSpan={2}
                      style={stableStyles.tableCellBottomSpan}
                    >
                      <textarea
                        aria-label="Body"
                        style={stableStyles.textareaFull}
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
          <div style={stableStyles.buttonContainer}>
            <button
              onClick={() => handlePageChange(pageStats.page - 1)}
              disabled={pageStats.page === 1}
              style={{
                ...stableStyles.button,
                ...stableStyles.buttonBlue,
              }}
            >
              Previous
            </button>
            <button
              onClick={handleAddRow}
              style={{
                ...stableStyles.button,
                ...stableStyles.buttonBlue,
              }}
            >
              Add Row
            </button>
            <button
              onClick={handleSave}
              style={{
                ...stableStyles.button,
                ...stableStyles.buttonGreen,
              }}
            >
              Save
            </button>
            <button
              onClick={() => handlePageChange(pageStats.page + 1)}
              disabled={pageStats.page * pageStats.num >= pageStats.total}
              style={{
                ...stableStyles.button,
                ...stableStyles.buttonBlue,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkEmailForm;
