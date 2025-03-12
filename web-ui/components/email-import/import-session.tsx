'use-client';
import { useCallback, useMemo, useState } from 'react';
import globalStyles from '@/lib/components/global-styles';
import { MessageImportStatus } from '@/data-models/api/import/email-message';
import { isMessageImportWithChildrenStatus } from '@/data-models';

type ImportRecordProps = {
  importStatus: Partial<MessageImportStatus> &
    Required<Pick<MessageImportStatus, 'providerId'>>;
  canImport: boolean;
};
type ImportRecordJobState =
  | 'pending'
  | 'loading-message'
  | 'waiting-for-slot'
  | 'waiting-for-import'
  | 'done';

const ImportRecord: React.FC<ImportRecordProps> = ({
  importStatus: importStatusFromProps,
}) => {
  const { providerId } = importStatusFromProps;
  const [importStatus, setImportStatus] = useState<
    Partial<MessageImportStatus> &
      Required<Pick<MessageImportStatus, 'providerId'>>
  >(importStatusFromProps as MessageImportStatus);
  const [importRequest, setImportRequest] = useState<
    Promise<Response> | undefined
  >();

  const sessionLabel = useMemo(() => {
    const { status = 'pending' } = importStatus;
    if (!importStatus) {
      return 'Loading...';
    }

    if (isMessageImportWithChildrenStatus(importStatus)) {
      // TODO: We'll have more details here
      return `${importStatus.status} plus I have children!`;
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  }, [importStatus]);

  const currentJobState = useMemo((): ImportRecordJobState => {
    const { status = 'pending' } = importStatus;
    switch (status) {
      case 'pending':
        // Are we a full-fledged status object?
        if (isMessageImportWithChildrenStatus(importStatus)) {
          return importRequest ? 'waiting-for-import' : 'waiting-for-slot';
        }
        return importRequest ? 'loading-message' : 'pending';
      case 'in-progress':
        return 'waiting-for-import';
      default:
        return 'done';
    }
  }, [importStatus, importRequest]);

  return (
    <div>
      <div>
        <span>
          <b>Provider ID:</b> {providerId}
        </span>
        <span>
          <b>Status:</b> {sessionLabel}
        </span>
        <span>
          <b>State:</b>
          {currentJobState}
        </span>
      </div>
    </div>
  );
};

const ImportSession: React.FC<{ concurrentSessions?: number }> = ({
  concurrentSessions = 1,
}) => {
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [knownEmails, setKnownEmails] = useState<string[]>([]);
  const [matchingRecords, setMatchingRecords] = useState<
    Array<string> | undefined
  >();
  const [downloadTokens, setDownloadTokens] = useState<Array<string>>(
    (() => {
      const initialTokens = [];
      for (let i = 0; i < concurrentSessions; i++) {
        initialTokens.push('');
      }
      return initialTokens;
    })()
  );

  const importActionClick = useCallback(() => {
    if (isImporting) {
      // TODO: Actually cancel the import.
      setIsImporting(false);
      return;
    }
    if (query) {
      setIsImporting(true);

      setTimeout(() => {
        setIsImporting(false);
      }, 2000);
    }
  }, [query, isImporting, setLastQuery, matchingRecords, setKnownEmails]);

  const importActionButtonText = isImporting
    ? 'Cancel'
    : query === lastQuery
    ? 'Import'
    : 'Load';

  return (
    <div className={globalStyles.container.base}>
      <div>
        <label className={globalStyles.form.input.label}>
          Import from email address:
          <input
            className={globalStyles.form.input.text}
            type="text"
            disabled={isImporting}
            readOnly={isImporting}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emails..."
          />
        </label>
        <button
          className={globalStyles.form.button.primary}
          onClick={importActionClick}
          disabled={isImporting}
        >
          {importActionButtonText}
        </button>
      </div>
      <div>
        {knownEmails.map((providerId) => (
          <ImportRecord
            key={providerId}
            importStatus={{ providerId }}
            canImport={downloadTokens.indexOf(providerId) !== -1}
          />
        ))}
      </div>
    </div>
  );
};

export default ImportSession;
