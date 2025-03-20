import {
  searchEmails,
  loadEmail,
  queueEmailImport,
} from '@/lib/api/email/import/google';
import {
  sendApiRequest,
  apiRequestHelperFactory,
} from '@/lib/send-api-request';
import siteMap from '@/lib/site-util/url-builder';

jest.mock('@/lib/send-api-request');
jest.mock('@/lib/site-util/url-builder');

const apiHelper = {
  get: jest
    .fn()
    .mockImplementation((x, y) =>
      sendApiRequest({ method: 'get', ...x, ...y }),
    ),
  post: jest
    .fn()
    .mockImplementation((x, y) =>
      sendApiRequest({ method: 'post', ...x, ...y }),
    ),
  put: jest
    .fn()
    .mockImplementation((x, y) =>
      sendApiRequest({ method: 'put', ...x, ...y }),
    ),
  delete: jest
    .fn()
    .mockImplementation((x, y) =>
      sendApiRequest({ method: 'delete', ...x, ...y }),
    ),
};

const messageUri = 'the-message-url';
const searchUri = 'the-search-url';

let mockApiRequest = sendApiRequest as jest.Mock;

beforeEach(() => {
  (apiRequestHelperFactory as jest.Mock).mockReturnValue(apiHelper);
  (
    siteMap.api.email.import.google.message as unknown as jest.Mock
  ).mockReturnValue(messageUri);
  (
    siteMap.api.email.import.google.search as unknown as jest.Mock
  ).mockReturnValue(searchUri);
  mockApiRequest = sendApiRequest as jest.Mock;
  mockApiRequest.mockClear();
});

describe('googleEmailImport', () => {
  describe('searchEmails', () => {
    it('should search for emails with provided criteria', async () => {
      const mockResponse = { results: [], nextPageToken: undefined };
      mockApiRequest.mockResolvedValue(mockResponse);
      const criteria = {
        from: 'test@example.com',
        to: 'recipient@example.com',
        label: ['inbox'],
        page: 1,
        limit: 100,
      };

      const result = await searchEmails(criteria);

      expect(mockApiRequest).toHaveBeenCalledWith({
        action: 'search',
        method: 'get',
        url: searchUri,
      });
      expect(siteMap.api.email.import.google.search).toHaveBeenCalledWith(
        criteria,
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('loadEmail', () => {
    it('should load email details by email ID', async () => {
      const mockResponse = { id: 'emailId', subject: 'Test Email' };
      mockApiRequest.mockResolvedValue(mockResponse);
      const emailId = 'emailId';

      const result = await loadEmail(emailId);

      expect(mockApiRequest).toHaveBeenCalledWith({
        action: 'load',
        method: 'get',
        url: messageUri,
      });
      expect(siteMap.api.email.import.google.message).toHaveBeenCalledWith(
        emailId,
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('queueEmailImport', () => {
    it('should queue email for import by email ID', async () => {
      const mockResponse = { id: 'emailId', subject: 'Test Email' };
      mockApiRequest.mockResolvedValue(mockResponse);
      const emailId = 'emailId';

      const result = await queueEmailImport(emailId);

      expect(mockApiRequest).toHaveBeenCalledWith({
        action: 'queue',
        input: {},
        method: 'post',
        url: messageUri,
      });
      expect(siteMap.api.email.import.google.message).toHaveBeenCalledWith(
        emailId,
      );
      expect(result).toBe(mockResponse);
    });
  });
});
