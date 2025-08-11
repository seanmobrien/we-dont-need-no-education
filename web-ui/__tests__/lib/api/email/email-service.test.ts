/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

import { EmailService, CreateEmailRequest, UpdateEmailRequest } from '@/lib/api/email/email-service';
import { EmailDrizzleRepository, EmailDomain } from '@/lib/api/email/email-drizzle-repository';
import { EmailMessage, EmailMessageSummary } from '@/data-models/api/email-message';
import { ContactSummary } from '@/data-models/api/contact';
import { query } from '@/lib/neondb';

// Mock the EmailDrizzleRepository
const mockRepository = {
  list: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByGlobalMessageId: jest.fn(),
};

jest.mock('@/lib/api/email/email-drizzle-repository', () => ({
  EmailDrizzleRepository: jest.fn().mockImplementation(() => mockRepository),
}));

// Mock neondb for query operations
jest.mock('@/lib/neondb', () => ({
  query: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
}));

describe('EmailService', () => {
  let service: EmailService;
  const mockQuery = query as jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockRepository).forEach(mock => mock.mockReset());
    mockQuery.mockReset();
    
    // Create service instance
    service = new EmailService();
  });

  describe('getEmailsSummary', () => {
    it('should retrieve paginated email summaries with contact information', async () => {
      const mockEmailDomains = [
        {
          emailId: 'email-1',
          senderId: 1,
          subject: 'Test Subject 1',
          sentTimestamp: '2023-01-01T00:00:00Z',
          threadId: null,
          parentId: null,
          importedFromId: null,
          globalMessageId: null,
        },
        {
          emailId: 'email-2',
          senderId: 2,
          subject: 'Test Subject 2',
          sentTimestamp: '2023-01-02T00:00:00Z',
          threadId: 1,
          parentId: 'email-1',
          importedFromId: 'import-123',
          globalMessageId: 'global-456',
        },
      ];

      const mockRepositoryResult = {
        results: mockEmailDomains,
        pageStats: { page: 1, num: 10, total: 2 },
      };

      mockRepository.list.mockResolvedValue(mockRepositoryResult);

      // Mock contact queries
      mockQuery
        .mockResolvedValueOnce([{ contact_id: 1, name: 'Sender One', email: 'sender1@test.com' }]) // First sender
        .mockResolvedValueOnce([{ recipient_id: 1, recipient_name: 'Recipient One', recipient_email: 'rec1@test.com' }]) // First recipients
        .mockResolvedValueOnce([{ count_attachments: 2, count_kpi: 1, count_notes: 0, count_cta: 1, count_responsive_actions: 0 }]) // First counts
        .mockResolvedValueOnce([{ contact_id: 2, name: 'Sender Two', email: 'sender2@test.com' }]) // Second sender
        .mockResolvedValueOnce([]) // Second recipients (empty)
        .mockResolvedValueOnce([{ count_attachments: 0, count_kpi: 0, count_notes: 1, count_cta: 0, count_responsive_actions: 2 }]); // Second counts

      const result = await service.getEmailsSummary({ page: 1, num: 10 });

      expect(result).toEqual({
        results: [
          {
            emailId: 'email-1',
            sender: { contactId: 1, name: 'Sender One', email: 'sender1@test.com' },
            subject: 'Test Subject 1',
            sentOn: '2023-01-01T00:00:00Z',
            threadId: null,
            parentEmailId: null,
            importedFromId: null,
            globalMessageId: null,
            recipients: [{ contactId: 1, name: 'Recipient One', email: 'rec1@test.com' }],
            count_attachments: 2,
            count_kpi: 1,
            count_notes: 0,
            count_cta: 1,
            count_responsive_actions: 0,
          },
          {
            emailId: 'email-2',
            sender: { contactId: 2, name: 'Sender Two', email: 'sender2@test.com' },
            subject: 'Test Subject 2',
            sentOn: '2023-01-02T00:00:00Z',
            threadId: 1,
            parentEmailId: 'email-1',
            importedFromId: 'import-123',
            globalMessageId: 'global-456',
            recipients: [],
            count_attachments: 0,
            count_kpi: 0,
            count_notes: 1,
            count_cta: 0,
            count_responsive_actions: 2,
          },
        ],
        pageStats: { page: 1, num: 10, total: 2 },
      });

      expect(mockRepository.list).toHaveBeenCalledWith({ page: 1, num: 10 });
      expect(mockQuery).toHaveBeenCalledTimes(6); // 2 emails × 3 queries each (sender, recipients, counts)
    });

    it('should handle emails with missing sender information', async () => {
      const mockEmailDomains = [
        {
          emailId: 'email-1',
          senderId: 999, // Non-existent sender
          subject: 'Test Subject',
          sentTimestamp: '2023-01-01T00:00:00Z',
          threadId: null,
          parentId: null,
          importedFromId: null,
          globalMessageId: null,
        },
      ];

      mockRepository.list.mockResolvedValue({
        results: mockEmailDomains,
        pageStats: { page: 1, num: 10, total: 1 },
      });

      // Mock empty sender result, empty recipients, empty counts
      mockQuery
        .mockResolvedValueOnce([]) // No sender found
        .mockResolvedValueOnce([]) // No recipients
        .mockResolvedValueOnce([{}]); // Empty counts

      const result = await service.getEmailsSummary();

      expect(result.results[0].sender).toEqual({
        contactId: 999,
        name: 'Unknown',
        email: 'unknown@example.com',
      });
    });

    it('should skip emails with incomplete data', async () => {
      const mockEmailDomains = [
        { emailId: '', senderId: 1 }, // Missing emailId
        { emailId: 'email-1' }, // Missing senderId
        {
          emailId: 'email-2',
          senderId: 2,
          subject: 'Valid Email',
          sentTimestamp: '2023-01-01T00:00:00Z',
        },
      ];

      mockRepository.list.mockResolvedValue({
        results: mockEmailDomains,
        pageStats: { page: 1, num: 10, total: 3 },
      });

      // Mock queries for only the valid email
      mockQuery
        .mockResolvedValueOnce([{ contact_id: 2, name: 'Valid Sender', email: 'valid@test.com' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{}]);

      const result = await service.getEmailsSummary();

      expect(result.results).toHaveLength(1);
      expect(result.results[0].emailId).toBe('email-2');
    });
  });

  describe('getEmailById', () => {
    it('should retrieve a single email with full details', async () => {
      const mockEmailDomain: EmailDomain = {
        emailId: 'email-1',
        senderId: 1,
        subject: 'Test Subject',
        emailContents: 'Test Body',
        sentTimestamp: '2023-01-01T00:00:00Z',
        threadId: 2,
        parentId: 'parent-email',
        importedFromId: 'import-123',
        globalMessageId: 'global-456',
      };

      mockRepository.get.mockResolvedValue(mockEmailDomain);

      // Mock contact and recipients queries
      mockQuery
        .mockResolvedValueOnce([{ contact_id: 1, name: 'Test Sender', email: 'sender@test.com' }])
        .mockResolvedValueOnce([
          { recipient_id: 2, recipient_name: 'Recipient One', recipient_email: 'rec1@test.com' },
          { recipient_id: 3, recipient_name: 'Recipient Two', recipient_email: 'rec2@test.com' },
        ]);

      const result = await service.getEmailById('email-1');

      expect(result).toEqual({
        emailId: 'email-1',
        sender: { contactId: 1, name: 'Test Sender', email: 'sender@test.com' },
        subject: 'Test Subject',
        body: 'Test Body',
        sentOn: '2023-01-01T00:00:00Z',
        threadId: 2,
        parentEmailId: 'parent-email',
        importedFromId: 'import-123',
        globalMessageId: 'global-456',
        recipients: [
          { contactId: 2, name: 'Recipient One', email: 'rec1@test.com' },
          { contactId: 3, name: 'Recipient Two', email: 'rec2@test.com' },
        ],
      });

      expect(mockRepository.get).toHaveBeenCalledWith('email-1');
    });

    it('should return null when email is not found', async () => {
      mockRepository.get.mockResolvedValue(null);

      const result = await service.getEmailById('non-existent');

      expect(result).toBeNull();
      expect(mockRepository.get).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('createEmail', () => {
    it('should create a new email with recipients and document unit', async () => {
      const createRequest: CreateEmailRequest = {
        senderId: 1,
        subject: 'New Email',
        body: 'Email body',
        sentOn: '2023-01-01T00:00:00Z',
        recipients: [
          { recipientId: 2, recipientName: 'Recipient One', recipientEmail: 'rec1@test.com' },
        ],
      };

      const mockCreatedEmail: EmailDomain = {
        emailId: 'new-email-id',
        senderId: 1,
        subject: 'New Email',
        emailContents: 'Email body',
        sentTimestamp: '2023-01-01T00:00:00Z',
        threadId: null,
        parentId: null,
        importedFromId: null,
        globalMessageId: null,
      };

      mockRepository.create.mockResolvedValue(mockCreatedEmail);

      // Mock queries for inserting recipients, creating document unit, and getting full email
      mockQuery
        .mockResolvedValueOnce([]) // Insert recipients
        .mockResolvedValueOnce([]) // Create document unit
        .mockResolvedValueOnce([{ contact_id: 1, name: 'Test Sender', email: 'sender@test.com' }]) // Get sender for full email
        .mockResolvedValueOnce([{ recipient_id: 2, recipient_name: 'Recipient One', recipient_email: 'rec1@test.com' }]); // Get recipients for full email

      // Mock getEmailById to return the full email
      const expectedFullEmail: EmailMessage = {
        emailId: 'new-email-id',
        sender: { contactId: 1, name: 'Test Sender', email: 'sender@test.com' },
        subject: 'New Email',
        body: 'Email body',
        sentOn: '2023-01-01T00:00:00Z',
        threadId: null,
        parentEmailId: null,
        importedFromId: null,
        globalMessageId: null,
        recipients: [{ contactId: 2, name: 'Recipient One', email: 'rec1@test.com' }],
      };
      jest.spyOn(service, 'getEmailById').mockResolvedValue(expectedFullEmail);

      const result = await service.createEmail(createRequest);

      expect(result).toEqual(expectedFullEmail);

      expect(mockRepository.create).toHaveBeenCalledWith({
        senderId: 1,
        subject: 'New Email',
        emailContents: 'Email body',
        sentTimestamp: '2023-01-01T00:00:00Z',
        threadId: null,
        parentId: null,
      });
    });

    it('should use sender object when senderId is not provided', async () => {
      const createRequest: CreateEmailRequest = {
        subject: 'New Email',
        body: 'Email body',
        recipients: [{ recipientId: 2 }],
        sender: { contactId: 99 },
      } as CreateEmailRequest;

      const mockCreatedEmail: EmailDomain = {
        emailId: 'new-email-id',
        senderId: 99,
        subject: 'New Email',
        emailContents: 'Email body',
        sentTimestamp: expect.any(Date),
      } as EmailDomain;

      mockRepository.create.mockResolvedValue(mockCreatedEmail);
      mockQuery.mockResolvedValue([]); // Mock all queries

      // Mock getEmailById to return a result
      jest.spyOn(service, 'getEmailById').mockResolvedValue({} as EmailMessage);

      await service.createEmail(createRequest);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ senderId: 99 })
      );
    });

    it('should throw error when no sender is provided', async () => {
      const createRequest: CreateEmailRequest = {
        subject: 'New Email',
        body: 'Email body',
        recipients: [{ recipientId: 2 }],
      } as CreateEmailRequest;

      await expect(service.createEmail(createRequest)).rejects.toThrow('Sender ID is required');
    });
  });

  describe('updateEmail', () => {
    it('should update an existing email', async () => {
      const updateRequest: UpdateEmailRequest = {
        emailId: 'email-1',
        subject: 'Updated Subject',
        body: 'Updated Body',
      };

      const mockUpdatedEmail: EmailDomain = {
        emailId: 'email-1',
        senderId: 1,
        subject: 'Updated Subject',
        emailContents: 'Updated Body',
        sentTimestamp: '2023-01-01T00:00:00Z',
      } as EmailDomain;

      mockRepository.update.mockResolvedValue(mockUpdatedEmail);

      // Mock getEmailById to return updated email
      jest.spyOn(service, 'getEmailById').mockResolvedValue({
        emailId: 'email-1',
        subject: 'Updated Subject',
        body: 'Updated Body',
      } as EmailMessage);

      const result = await service.updateEmail(updateRequest);

      expect(result.subject).toBe('Updated Subject');
      expect(result.body).toBe('Updated Body');
      
      expect(mockRepository.update).toHaveBeenCalledWith({
        emailId: 'email-1',
        subject: 'Updated Subject',
        emailContents: 'Updated Body',
      });
    });

    it('should update recipients when provided', async () => {
      const updateRequest: UpdateEmailRequest = {
        emailId: 'email-1',
        subject: 'Updated Subject',
        recipients: [{ recipientId: 5, recipientName: 'New Recipient', recipientEmail: 'new@test.com' }],
      };

      mockRepository.update.mockResolvedValue({} as EmailDomain);
      mockQuery.mockResolvedValue([]); // Mock recipient operations
      jest.spyOn(service, 'getEmailById').mockResolvedValue({} as EmailMessage);

      await service.updateEmail(updateRequest);

      // Check that recipients were processed (insertRecipients was called)
      expect(mockQuery).toHaveBeenCalledWith(expect.any(Function)); // DELETE existing recipients
      expect(mockQuery).toHaveBeenCalledWith(expect.any(Function)); // INSERT new recipients
    });
  });

  describe('deleteEmail', () => {
    it('should delete an email and return true if successful', async () => {
      mockRepository.delete.mockResolvedValue(true);

      const result = await service.deleteEmail('email-1');

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('email-1');
    });

    it('should return false if email was not found for deletion', async () => {
      mockRepository.delete.mockResolvedValue(false);

      const result = await service.deleteEmail('non-existent');

      expect(result).toBe(false);
      expect(mockRepository.delete).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('findEmailIdByGlobalMessageId', () => {
    it('should find email ID by global message ID', async () => {
      const mockEmail: EmailDomain = {
        emailId: 'found-email-id',
        senderId: 1,
        subject: 'Test',
        emailContents: 'Test',
        sentTimestamp: '2023-01-01T00:00:00Z',
        globalMessageId: 'global-123',
      } as EmailDomain;

      mockRepository.findByGlobalMessageId.mockResolvedValue(mockEmail);

      const result = await service.findEmailIdByGlobalMessageId('global-123');

      expect(result).toBe('found-email-id');
      expect(mockRepository.findByGlobalMessageId).toHaveBeenCalledWith('global-123');
    });

    it('should return null when global message ID is not found', async () => {
      mockRepository.findByGlobalMessageId.mockResolvedValue(null);

      const result = await service.findEmailIdByGlobalMessageId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle repository errors in getEmailsSummary', async () => {
      const error = new Error('Repository error');
      mockRepository.list.mockRejectedValue(error);

      await expect(service.getEmailsSummary()).rejects.toThrow('Repository error');
    });

    it('should handle query errors in getEmailById', async () => {
      mockRepository.get.mockResolvedValue({} as EmailDomain);
      const error = new Error('Query error');
      mockQuery.mockRejectedValue(error);

      await expect(service.getEmailById('email-1')).rejects.toThrow('Query error');
    });

    it('should handle errors in createEmail', async () => {
      const error = new Error('Create error');
      mockRepository.create.mockRejectedValue(error);

      const createRequest: CreateEmailRequest = {
        senderId: 1,
        subject: 'Test',
        body: 'Test',
        recipients: [],
      };

      await expect(service.createEmail(createRequest)).rejects.toThrow('Create error');
    });
  });
});