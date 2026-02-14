import { env } from '@compliance-theater/env';
import { AccountSASPermissions, AccountSASResourceTypes, AccountSASServices, generateAccountSASQueryParameters, SASProtocol, StorageSharedKeyCredential, } from '@azure/storage-blob';
import { URL } from 'url';
let _sasKey = undefined;
const getSasKey = () => {
    if (_sasKey === undefined) {
        const sasOptions = {
            services: AccountSASServices.parse('b').toString(),
            resourceTypes: AccountSASResourceTypes.parse('sco').toString(),
            permissions: AccountSASPermissions.parse('r'),
            protocol: SASProtocol.Https,
            startsOn: new Date(),
            expiresOn: new Date(new Date().valueOf() + 3 * 60 * 60 * 1000),
        };
        const sasToken = generateAccountSASQueryParameters(sasOptions, new StorageSharedKeyCredential(env('AZURE_STORAGE_ACCOUNT_NAME'), env('AZURE_STORAGE_ACCOUNT_KEY'))).toString();
        _sasKey = sasToken[0] === '?' ? sasToken : `?${sasToken}`;
    }
    return _sasKey;
};
export const buildAttachmentDownloadUrl = (input) => {
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
//# sourceMappingURL=download-url-builder.js.map