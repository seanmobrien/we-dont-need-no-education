

import { EmailService, CreateEmailRequest, UpdateEmailRequest } from '@/lib/api/email/email-service';
import { EmailDomain } from '@/lib/api/email/email-drizzle-repository';
import { EmailMessage } from '@/data-models/api/email-message';
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