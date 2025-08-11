/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

import { EmailDrizzleRepository, EmailDomain } from '@/lib/api/email/email-drizzle-repository';
import { ValidationError } from '@/lib/react-util';

// Mock drizzle-db
jest.mock('@/lib/drizzle-db', () => {
  const { mockDeep } = require('jest-mock-extended');
  
  const makeMockDb = () => mockDeep();
  
  return {
    drizDb: jest.fn(() => makeMockDb()),
    drizDbWithInit: jest.fn(() => Promise.resolve(makeMockDb())),
    schema: {},
  };
});

// Mock drizzle schema
jest.mock('@/drizzle/schema', () => {
  const { Table } = require('drizzle-orm');
  const { PgTable } = require('drizzle-orm/pg-core');

  const mockEmailIdColumn = {
    name: 'email_id',
    primary: true,
  };

  const mockEmails = {
    [Table.Symbol.Columns]: {
      emailId: mockEmailIdColumn,
    },
    [Table.Symbol.Name]: 'emails',
    [Table.Symbol.Schema]: undefined,
    [Table.Symbol.ExtraConfigColumns]: {},
    [PgTable.Symbol.InlineForeignKeys]: {},
    [PgTable.Symbol.EnableRLS]: false,
    [PgTable.Symbol.ExtraConfigBuilder]: undefined,
    emailId: mockEmailIdColumn,
    globalMessageId: { name: 'global_message_id' },
  };

  return {
    emails: mockEmails,
  };
});

describe('EmailDrizzleRepository', () => {
  let repository: EmailDrizzleRepository;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockDb: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create repository instance
    repository = new EmailDrizzleRepository();
    
    // Get the mock database instance
    const { drizDb } = require('@/lib/drizzle-db');
    mockDb = drizDb();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(repository).toBeInstanceOf(EmailDrizzleRepository);
      // Check that it extends BaseDrizzleRepository correctly
      expect(repository.list).toBeDefined();
      expect(repository.get).toBeDefined();
      expect(repository.create).toBeDefined();
      expect(repository.update).toBeDefined();
      expect(repository.delete).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should validate create operation with required fields', () => {
      const validEmail: Omit<EmailDomain, 'emailId'> = {
        senderId: 1,
        subject: 'Test Subject',
        emailContents: 'Test content',
        sentTimestamp: new Date(),
      };

      // Should not throw for valid data
      expect(() => {
        (repository as any).validate('create', validEmail);
      }).not.toThrow();
    });

    it('should throw ValidationError for create operation missing required fields', () => {
      const invalidEmail = {
        senderId: 1,
        // Missing subject and emailContents
      };

      expect(() => {
        (repository as any).validate('create', invalidEmail);
      }).toThrow(ValidationError);
      
      expect(() => {
        (repository as any).validate('create', invalidEmail);
      }).toThrow('senderId||subject||emailContents');
    });

    it('should validate update operation with emailId', () => {
      const validUpdate: Partial<EmailDomain> = {
        emailId: 'test-uuid',
        subject: 'Updated Subject',
      };

      expect(() => {
        (repository as any).validate('update', validUpdate);
      }).not.toThrow();
    });

    it('should throw ValidationError for update operation missing emailId', () => {
      const invalidUpdate = {
        subject: 'Updated Subject',
        // Missing emailId
      };

      expect(() => {
        (repository as any).validate('update', invalidUpdate);
      }).toThrow(ValidationError);
      
      expect(() => {
        (repository as any).validate('update', invalidUpdate);
      }).toThrow('emailId');
    });

    it('should throw ValidationError for update operation with only emailId', () => {
      const invalidUpdate = {
        emailId: 'test-uuid',
        // No other fields to update
      };

      expect(() => {
        (repository as any).validate('update', invalidUpdate);
      }).toThrow(ValidationError);
      
      expect(() => {
        (repository as any).validate('update', invalidUpdate);
      }).toThrow('At least one field is required for update');
    });
  });

  describe('prepareInsertData', () => {
    it('should map domain object to database columns', () => {
      const emailDomain: Omit<EmailDomain, 'emailId'> = {
        senderId: 123,
        subject: 'Test Subject',
        emailContents: 'Test content',
        sentTimestamp: '2023-01-01T00:00:00Z',
        threadId: 456,
        parentId: 'parent-uuid',
        importedFromId: 'import-123',
        globalMessageId: 'global-message-123',
      };

      const result = (repository as any).prepareInsertData(emailDomain);

      expect(result).toEqual({
        sender_id: 123,
        subject: 'Test Subject',
        email_contents: 'Test content',
        sent_timestamp: '2023-01-01T00:00:00Z',
        thread_id: 456,
        parent_id: 'parent-uuid',
        imported_from_id: 'import-123',
        global_message_id: 'global-message-123',
      });
    });

    it('should handle optional fields with null values', () => {
      const emailDomain: Omit<EmailDomain, 'emailId'> = {
        senderId: 123,
        subject: 'Test Subject',
        emailContents: 'Test content',
        sentTimestamp: '2023-01-01T00:00:00Z',
      };

      const result = (repository as any).prepareInsertData(emailDomain);

      expect(result).toEqual({
        sender_id: 123,
        subject: 'Test Subject',
        email_contents: 'Test content',
        sent_timestamp: '2023-01-01T00:00:00Z',
        thread_id: null,
        parent_id: null,
        imported_from_id: null,
        global_message_id: null,
      });
    });

    it('should provide default sentTimestamp if not provided', () => {
      const emailDomain: any = {
        senderId: 123,
        subject: 'Test Subject',
        emailContents: 'Test content',
      };

      const result = (repository as any).prepareInsertData(emailDomain);

      expect(result.sent_timestamp).toBeInstanceOf(Date);
      expect(result.sender_id).toBe(123);
      expect(result.subject).toBe('Test Subject');
    });
  });

  describe('prepareUpdateData', () => {
    it('should map partial domain object to database columns', () => {
      const emailUpdate: Partial<EmailDomain> = {
        emailId: 'test-uuid',
        subject: 'Updated Subject',
        threadId: 789,
        globalMessageId: 'updated-global-123',
      };

      const result = (repository as any).prepareUpdateData(emailUpdate);

      expect(result).toEqual({
        subject: 'Updated Subject',
        thread_id: 789,
        global_message_id: 'updated-global-123',
      });
      
      // emailId should not be included in update data
      expect(result.email_id).toBeUndefined();
    });

    it('should only include defined fields in update data', () => {
      const emailUpdate: Partial<EmailDomain> = {
        emailId: 'test-uuid',
        subject: 'Updated Subject',
        // Other fields undefined
      };

      const result = (repository as any).prepareUpdateData(emailUpdate);

      expect(result).toEqual({
        subject: 'Updated Subject',
      });
    });

    it('should handle null values correctly', () => {
      const emailUpdate: Partial<EmailDomain> = {
        emailId: 'test-uuid',
        threadId: null,
        parentId: null,
      };

      const result = (repository as any).prepareUpdateData(emailUpdate);

      expect(result).toEqual({
        thread_id: null,
        parent_id: null,
      });
    });
  });

  describe('findByGlobalMessageId', () => {
    it('should find email by global message ID', async () => {
      const mockEmailRecord = {
        emailId: 'test-uuid',
        senderId: 123,
        subject: 'Test Subject',
        emailContents: 'Test content',
        sentTimestamp: '2023-01-01T00:00:00Z',
        globalMessageId: 'global-123',
      };

      // Mock the database query chain
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockEmailRecord]),
          }),
        }),
      });

      // Set up the mock
      (repository as any)['db'] = {
        select: mockSelect,
      } as any;

      const result = await repository.findByGlobalMessageId('global-123');

      expect(result).toEqual({
        emailId: 'test-uuid',
        senderId: 123,
        subject: 'Test Subject',
        emailContents: 'Test content',
        sentTimestamp: '2023-01-01T00:00:00Z',
        globalMessageId: 'global-123',
        threadId: undefined,
        parentId: undefined,
        importedFromId: undefined,
      });

      expect(mockSelect).toHaveBeenCalled();
    });

    it('should return null when global message ID not found', async () => {
      // Mock empty result
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // Empty array
          }),
        }),
      });

      (repository as any)['db'] = {
        select: mockSelect,
      } as any;

      const result = await repository.findByGlobalMessageId('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors in findByGlobalMessageId', async () => {
      const mockError = new Error('Database connection failed');
      
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(mockError),
          }),
        }),
      });

      (repository as any)['db'] = {
        select: mockSelect,
      } as any;

      // Spy on logDatabaseError
      const logSpy = jest.spyOn(repository as any, 'logDatabaseError').mockImplementation();

      await expect(repository.findByGlobalMessageId('global-123')).rejects.toThrow('Database connection failed');
      
      expect(logSpy).toHaveBeenCalledWith('findByGlobalMessageId', mockError);
    });
  });

  describe('recordMapper', () => {
    it('should correctly map database record to domain object', () => {
      const dbRecord = {
        emailId: 'test-uuid',
        senderId: 123,
        subject: 'Test Subject',
        emailContents: 'Test content',
        sentTimestamp: '2023-01-01T00:00:00Z',
        threadId: 456,
        parentId: 'parent-uuid',
        importedFromId: 'import-123',
        globalMessageId: 'global-123',
      };

      const config = (repository as any).config;
      const result = config.recordMapper(dbRecord);

      expect(result).toEqual({
        emailId: 'test-uuid',
        senderId: 123,
        subject: 'Test Subject',
        emailContents: 'Test content',
        sentTimestamp: '2023-01-01T00:00:00Z',
        threadId: 456,
        parentId: 'parent-uuid',
        importedFromId: 'import-123',
        globalMessageId: 'global-123',
      });
    });
  });

  describe('summaryMapper', () => {
    it('should correctly map database record to summary object (excluding emailContents)', () => {
      const dbRecord = {
        emailId: 'test-uuid',
        senderId: 123,
        subject: 'Test Subject',
        emailContents: 'This should not appear in summary',
        sentTimestamp: '2023-01-01T00:00:00Z',
        threadId: 456,
        parentId: 'parent-uuid',
        importedFromId: 'import-123',
        globalMessageId: 'global-123',
      };

      const config = (repository as any).config;
      const result = config.summaryMapper(dbRecord);

      expect(result).toEqual({
        emailId: 'test-uuid',
        senderId: 123,
        subject: 'Test Subject',
        sentTimestamp: '2023-01-01T00:00:00Z',
        threadId: 456,
        parentId: 'parent-uuid',
        importedFromId: 'import-123',
        globalMessageId: 'global-123',
      });
      
      // emailContents should be excluded from summary  
      expect(result.emailContents).toBeUndefined();
    });
  });
});