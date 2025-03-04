'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  classnames,
  spacing,
  borders,
  typography,
  backgrounds,
  margin,
  boxShadow,
  display,
  position,
} from 'tailwindcss-classnames';
import type { EmailMessageStats } from '@/data-models/api';
import { getEmailStats } from '@/lib/api/email';
import Link from 'next/link';
import {
  ICancellablePromiseExt,
  isOperationCancelledError,
} from '@/lib/typescript';
import siteMap from '@/lib/site-util/url-builder';
import EmailListServer from './_list-server';
// Shared class for text color used multiple times
const marginBottom2 = margin('mb-2');

// Define reusable class names using `classnames`
const containerClass = classnames(
  margin('mx-auto'),
  spacing('p-6'),
  borders('rounded-lg'),
  boxShadow('shadow-md')
);

const EmailList = ({ perPage = 10 }: { perPage?: number }) => {
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageStats, setPageStats] = useState<
    EmailMessageStats & { pages: number }
  >({
    total: 0,
    pages: 0,
    lastUpdated: new Date(0),
  });
  const fetchPageStats = useCallback(() => {
    setLoading(true);
    return getEmailStats()
      .then((data) => {
        if (data.total !== pageStats.total) {
          const pages = Math.ceil(data.total / perPage);
          if (pageNumber > pages) {
            setPageNumber(pages);
          }
          setPageStats({
            pages,
            ...data,
          });
        }
        setError('');
        return true;
      })
      .catch((error) => {
        if (!isOperationCancelledError(error)) {
          setError('Error fetching emails.');
        }
        return false;
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    pageStats.total,
    perPage,
    pageNumber,
    setError,
    setPageStats,
    setLoading,
  ]);

  useEffect(() => {
    const thisPageStats = pageStats;
    let cancelled = false;
    let timeoutId = 0;
    let currentRequest: ICancellablePromiseExt<boolean> | null = null;
    const refresh = async () => {
      if (currentRequest) {
        return;
      }
      currentRequest = fetchPageStats();
      const success = await currentRequest;
      if (success) {
        setError('');
      }
      currentRequest = null;
      if (!cancelled) {
        timeoutId = window.setTimeout(refresh, 60000);
      }
    };
    if (thisPageStats.total === 0) {
      refresh();
    } else {
      timeoutId = window.setTimeout(refresh, 1000);
    }
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      timeoutId = 0;
      if (currentRequest) {
        currentRequest.cancel();
        currentRequest = null;
      }
    };
  }, [pageStats, fetchPageStats]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPageNumber(Math.max(1, Math.min(newPage, pageStats.pages)));
    },
    [pageStats.pages, setPageNumber]
  );

  const handleMenuClick = useCallback(() => {
    setShowMenu(!showMenu);
  }, [showMenu]);

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
        <p
          className={classnames(typography('text-red-500'), marginBottom2)}
          data-testid="email-list-error"
        >
          {error}
        </p>
      )}
      <EmailListServer
        pageNumber={pageNumber}
        perPage={perPage}
        loading={loading}
        setLoading={setLoading}
        setError={setError}
      />
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
              href={siteMap.email.edit()}
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
          onClick={() => handlePageChange(pageNumber - 1)}
          disabled={pageNumber === 1}
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
          onClick={() => handlePageChange(pageNumber + 1)}
          disabled={pageNumber >= pageStats.pages}
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
    </div>
  );
};

export default EmailList;
