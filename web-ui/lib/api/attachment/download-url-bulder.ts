import { EmailAttachment } from '@/data-models';
import { EmailAttachmentType } from '@/lib/drizzle-db';
import { env } from '@/lib/site-util/env';
import {
  AccountSASPermissions,
  AccountSASResourceTypes,
  AccountSASServices,
  generateAccountSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { URL } from 'url';

interface AttachmentDownloadUrlBuilderOverloads {
  (attachment: EmailAttachment): URL;
  (attachment: EmailAttachmentType): URL;
}

let _sasKey: string | undefined = undefined;
const getSasKey = (): string => {
  if (_sasKey === undefined) {
    const sasOptions = {
      services: AccountSASServices.parse('b').toString(), // blobs, tables, queues, files
      resourceTypes: AccountSASResourceTypes.parse('sco').toString(), // service, container, object
      permissions: AccountSASPermissions.parse('r'), // permissions
      protocol: SASProtocol.Https,
      startsOn: new Date(),
      expiresOn: new Date(new Date().valueOf() + 3 * 60 * 60 * 1000), // 3 hours
    };

    const sasToken = generateAccountSASQueryParameters(
      sasOptions,
      new StorageSharedKeyCredential(
        env('AZURE_STORAGE_ACCOUNT_NAME'),
        env('AZURE_STORAGE_ACCOUNT_KEY'),
      ),
    ).toString();
    _sasKey = sasToken[0] === '?' ? sasToken : `?${sasToken}`;
  }
  return _sasKey;
};

/**
 * Builds a download URL for an email attachment.
 *
 * This function supports multiple input types:
//  * - If given a number, it treats it as an attachment ID, fetches the corresponding `EmailAttachment` from the database,
 *   and recursively builds the download URL.
 * - If given an `EmailAttachment` object (with a `filePath` property), it generates a download URL using the file path and a SAS key.
 *
 * @param input - The attachment identifier, which can be either:
 *   - A number representing the attachment ID,
 *   - An `EmailAttachment` object,
 *   - Or an `EmailAttachmentType`.
 * @returns A `Promise<URL>` representing the download URL for the attachment.
 * @throws If the attachment is not found, the file path is missing, or the input type is invalid.
 */
export const buildAttachmentDownloadUrl: AttachmentDownloadUrlBuilderOverloads =
  (input: EmailAttachment | EmailAttachmentType) => {
    if (!!input && 'filePath' in input) {
      const filePath = input.filePath;
      if (!filePath) {
        throw new Error('Attachment file path is missing');
      }
      const key = getSasKey();
      return new URL(`${input.filePath}${key}`);
    }
    throw new Error('Invalid input type. Expected EmailAttachment object.');
  };
