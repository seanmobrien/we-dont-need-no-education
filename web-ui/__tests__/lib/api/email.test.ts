import {
  getEmailList,
  getEmail,
  createEmailRecord,
  updateEmailRecord,
  deleteEmailRecord,
  getEmailStats,
  getEmailSearchResults,
} from 'lib/api/email';
import { apiRequestHelperFactory } from 'lib/api/_utils';
import siteMap from 'lib/site-util/url-builder';
import { ContactSummary } from '@/data-models';

jest.mock('lib/api/_utils');
jest.mock('lib/site-util/url-builder');

const apiHelper = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

(apiRequestHelperFactory as jest.Mock).mockReturnValue(apiHelper);

const makeMockSender = (ops: Partial<ContactSummary> = {}) => ({
  contactId: 1,
  name: 'Test Sender',
  email: 'test@email.com',
  ...ops,
});

describe('Email API', () => {
  const builder = siteMap.api.email;

  beforeEach(() => {
    jest.clearAllMocks();
    (apiRequestHelperFactory as jest.Mock).mockReturnValue(apiHelper);
  });

  describe('getEmailList', () => {
    it('should fetch a list of email messages', async () => {
      const mockResponse = [{ emailId: 1, subject: 'Test Email' }];
      apiHelper.get.mockResolvedValue(mockResponse);

      const result = await getEmailList({ page: 1, num: 10 });

      expect(apiHelper.get).toHaveBeenCalledWith({
        url: builder.page(),
        action: 'list',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getEmail', () => {
    it('should fetch a specific email message by its ID', async () => {
      const mockResponse = [
        {
          emailId: 1,
          subject: 'Test Email',
          sender: makeMockSender(),
          sentOn: new Date().toISOString(),
          recipients: [makeMockSender({ contactId: 2 })],
        },
      ];
      apiHelper.get.mockResolvedValue(mockResponse);

      const result = await getEmail(1);

      expect(apiHelper.get).toHaveBeenCalledWith({
        url: builder.page('', 1),
        action: 'load',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createEmailRecord', () => {
    it('should create a new email record', async () => {
      const mockEmail = {
        subject: 'New Email',
        body: 'Email Body',
        sender: makeMockSender(),
        sentOn: new Date().toISOString(),
        recipients: [makeMockSender({ contactId: 2 })],
      };
      const mockResponse = { emailId: 1, ...mockEmail };
      apiHelper.post.mockResolvedValue(mockResponse);

      const result = await createEmailRecord(mockEmail);

      expect(apiHelper.post).toHaveBeenCalledWith({
        url: builder.page(),
        action: 'create',
        input: mockEmail,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateEmailRecord', () => {
    it('should update an existing email record', async () => {
      const mockEmail = {
        emailId: 1,
        subject: 'Updated Email',
        body: 'Updated Body',
        sender: makeMockSender(),
        sentOn: new Date().toISOString(),
        recipients: [makeMockSender({ contactId: 2 })],
      };
      const mockResponse = { ...mockEmail };
      apiHelper.put.mockResolvedValue(mockResponse);

      const result = await updateEmailRecord(mockEmail);

      expect(apiHelper.put).toHaveBeenCalledWith({
        url: builder.page(),
        action: 'update',
        input: mockEmail,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteEmailRecord', () => {
    it('should delete an email record by its ID', async () => {
      const mockResponse = { emailId: 1, subject: 'Deleted Email' };
      apiHelper.delete.mockResolvedValue(mockResponse);

      const result = await deleteEmailRecord(1);

      expect(apiHelper.delete).toHaveBeenCalledWith({
        url: builder.page('1'),
        action: 'delete',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getEmailStats', () => {
    it('should fetch email statistics', async () => {
      const mockResponse = { totalEmails: 100, unreadEmails: 10 };
      apiHelper.get.mockResolvedValue(mockResponse);

      const result = await getEmailStats();

      expect(apiHelper.get).toHaveBeenCalledWith({
        url: builder.stats(),
        action: 'stats',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getEmailSearchResults', () => {
    it('should fetch email search results based on search parameters', async () => {
      const mockParams = { query: 'test' };
      const mockResponse = {
        results: [{ emailId: 1, subject: 'Test Email' }],
        total: 1,
      };
      apiHelper.get.mockResolvedValue(mockResponse);

      const result = await getEmailSearchResults(mockParams);

      expect(apiHelper.get).toHaveBeenCalledWith({
        url: builder.search(mockParams),
        action: 'search',
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
