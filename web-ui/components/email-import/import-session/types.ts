import {
  MessageImportStatusWithChildren,
  MessageImportStatus,
} from '/data-models/api/import/email-message';
import { LoggedError } from '/lib/react-util/errors/logged-error';

/**
 * Represents the session data for an email import.
 *
 * @property {string} providerId - The ID of the provider.
 * @property {MessageImportStatusWithChildren} [status] - The status of the message import, including any child statuses.
 * @property {boolean} isActive - Indicates whether the session is active.
 * @property {Promise<Response>} [activeRequest] - The active request associated with the session.
 */
export type SessionData = {
  providerId: string;
  status?: MessageImportStatusWithChildren;
  isActive: boolean;
  activeRequest?: Promise<Response>;
};

/**
 * Represents the state of an import record job.
 *
 * Possible values:
 * - 'pending': The job is pending and has not started yet.
 * - 'loading-message': The job is in the process of loading a message.
 * - 'waiting-for-slot': The job is waiting for an available slot to proceed.
 * - 'waiting-for-import': The job is waiting for the import process to start.
 * - 'done': The job has completed successfully.
 */
export type ImportRecordJobState =
  | 'pending'
  | 'loading-message'
  | 'waiting-for-slot'
  | 'waiting-for-import'
  | 'ready-for-import'
  | 'error'
  | 'done';

/**
 * Properties for the ImportRecordNotify component.
 *
 * @property {string} providerId - The ID of the provider.
 * @property {'check-changed' | 'references-loaded'} action - The action type.
 *
 * If `action` is 'check-changed':
 * @property {boolean} checked - Indicates whether the item is checked.
 *
 * If `action` is 'references-loaded':
 * @property {Array<MessageImportStatus>} references - The list of message import statuses.
 */
export type ImportRecordNotifyProps = {
  providerId: string;
} & (
  | {
      action: 'check-changed';
      checked: boolean;
    }
  | {
      action: 'references-loaded';
      downloaded: boolean;
      references: Array<MessageImportStatus>;
    }
  | {
      action: 'download-complete';
      successful: true;
    }
  | {
      action: 'download-complete';
      successful: false;
      error: LoggedError;
    }
  | {
      action: 'import-error';
      error: LoggedError;
    }
);

/**
 * Properties for an import record.
 *
 * @property {Partial<MessageImportStatus> & Required<Pick<MessageImportStatus, 'providerId'>>} importStatus - The status of the import, which includes all properties of `MessageImportStatus` except for `providerId`, which is required.
 * @property {(props: ImportRecordNotifyProps) => void} notify - Function to notify about the import record.
 * @property {boolean} canImport - Indicates whether the import can be performed.
 */
export type ImportRecordProps = {
  importStatus: Partial<MessageImportStatus> &
    Required<Pick<MessageImportStatus, 'providerId'>>;
  notify: (props: ImportRecordNotifyProps) => void;
  isChecked: boolean;
  canImport: boolean;
};
