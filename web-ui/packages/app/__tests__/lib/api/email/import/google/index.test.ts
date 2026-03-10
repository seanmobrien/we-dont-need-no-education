jest.mock('@compliance-theater/send-api-request');
jest.mock('../../../../../../lib/site-util/url-builder');

if (typeof globalThis.Request === 'undefined') {
  class RequestShim {
    readonly url: string;

    constructor(input?: string | { url?: string }) {
      this.url = typeof input === 'string'
        ? input
        : input?.url ?? 'http://localhost/';
    }
  }

  Object.assign(globalThis, {
    Request: RequestShim,
  });
}

if (typeof globalThis.Response === 'undefined') {
  class ResponseShim { }
  Object.assign(globalThis, { Response: ResponseShim });
}

if (typeof globalThis.Headers === 'undefined') {
  class HeadersShim {
    private readonly map = new Map<string, string>();

    set(name: string, value: string): void {
      this.map.set(name.toLowerCase(), value);
    }

    get(name: string): string | null {
      return this.map.get(name.toLowerCase()) ?? null;
    }
  }
  Object.assign(globalThis, { Headers: HeadersShim });
}

const {
  searchEmails,
  loadEmail,
  queueEmailImport,
} = require('../../../../../../lib/api/email/import/google') as typeof import('../../../../../../lib/api/email/import/google');
const {
  sendApiRequest,
  apiRequestHelperFactory,
} = require('@compliance-theater/send-api-request') as typeof import('@compliance-theater/send-api-request');
const siteMap = require('../../../../../../lib/site-util/url-builder').default as typeof import('../../../../../../lib/site-util/url-builder').default;

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
    siteMap.api.email.import.google.page as unknown as jest.Mock
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
      expect(siteMap.api.email.import.google.page).toHaveBeenCalledWith(
        'message',
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
      expect(siteMap.api.email.import.google.page).toHaveBeenCalledWith(
        'message',
        emailId,
      );
      expect(result).toBe(mockResponse);
    });
  });
});
