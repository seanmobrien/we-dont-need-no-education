 
 
// It's not worth the effort to fix the mocks

// @ts-check

// Mock the dependencies
jest.mock('@/lib/drizzle-db', () => {
  const { mockDeep } = require('jest-mock-extended');

  // Create a mock database instance that supports all drizzle operations
  const makeMockDb = () => mockDeep();

  return {
    drizDb: jest.fn((fn) => {
      const mockDbInstance = makeMockDb();
      if (fn) {
        const result = fn(mockDbInstance);
        return Promise.resolve(result);
      }
      return mockDbInstance;
    }),
    drizDbWithInit: jest.fn(() => Promise.resolve(makeMockDb())),
    schema: {},
  };
});

jest.mock('@/drizzle/schema', () => {
  const { Table } = require('drizzle-orm');
  const { PgTable } = require('drizzle-orm/pg-core');

  // Create a more complete mock that supports getTableConfig
  const mockAttachmentIdColumn = {
    name: 'attachment_id',
    primary: true,
  };

  const mockEmailAttachments = {
    [Table.Symbol.Columns]: {
      attachmentId: mockAttachmentIdColumn,
    },
    [Table.Symbol.Name]: 'email_attachments',
    [Table.Symbol.Schema]: undefined,
    [Table.Symbol.ExtraConfigColumns]: {},
    [PgTable.Symbol.InlineForeignKeys]: {},
    [PgTable.Symbol.EnableRLS]: false,
    [PgTable.Symbol.ExtraConfigBuilder]: undefined,
    attachmentId: mockAttachmentIdColumn,
  };

  return {
    emailAttachments: mockEmailAttachments,
  };
});

jest.mock('@compliance-theater/logger', () => ({
  log: jest.fn(),
}));

jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
  ValidationError: class MockValidationError extends Error {
    constructor(options: { field: string; source: string }) {
      super(`Validation error: ${options.field} (source: ${options.source})`);
      this.name = 'ValidationError';
    }
  },
}));

import { EmailAttachmentDrizzleRepository } from '@/lib/api/attachment/drizzle-repository';
import { EmailAttachment } from '@/data-models/api/attachment';

describe('EmailAttachmentDrizzleRepository', () => {
  let repository: EmailAttachmentDrizzleRepository;
  let mockDb: Record<string, unknown>;

  beforeEach(() => {
    // jest.clearAllMocks();

    // Mock database
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    repository = new EmailAttachmentDrizzleRepository();
    (repository as any).db = mockDb;
  });

  describe('validation', () => {
    it('should validate required fields for create operation', () => {
      const invalidModel = {
        fileName: '',
        filePath: 'path/to/file',
        emailId: 'email-123',
        mimeType: 'application/pdf',
        size: 1024,
      };

      expect(() => {
        (repository as any).validate('create', invalidModel);
      }).toThrow(
        `Field 'fileName, filePath, or emailId' Source: EmailAttachmentDrizzleRepository`,
      );
    });

    it('should validate mimeType and size for create operation', () => {
      const invalidModel = {
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        emailId: 'email-123',
        mimeType: '',
        size: 'invalid',
      };

      expect(() => {
        (repository as any).validate('create', invalidModel);
      }).toThrow(
        `Field 'mimeType or size' Source: EmailAttachmentDrizzleRepository`,
      );
    });

    it('should validate attachmentId for update operation', () => {
      const invalidModel = {
        name: 'Updated Name',
      };

      expect(() => {
        (repository as any).validate('update', invalidModel);
      }).toThrow(
        `Field 'attachmentId' Source: EmailAttachmentDrizzleRepository`,
      );
    });

    it('should validate id field for get operation', () => {
      const invalidParams = {};

      expect(() => {
        (repository as any).validate('get', invalidParams);
      }).toThrow(
        `Field 'attachmentId' Source: EmailAttachmentDrizzleRepository`,
      );
    });

    it('should validate id field for delete operation', () => {
      const invalidParams = {};

      expect(() => {
        (repository as any).validate('delete', invalidParams);
      }).toThrow(
        `Field 'attachmentId' Source: EmailAttachmentDrizzleRepository`,
      );
    });

    it('should pass validation for valid create model', () => {
      const validModel = {
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        emailId: 'email-123',
        mimeType: 'application/pdf',
        size: 1024,
        extractedText: 'Some text',
        policyId: 1,
        summary: 'A summary',
      };

      expect(() => {
        (repository as any).validate('create', validModel);
      }).not.toThrow();
    });
  });

  describe('prepareInsertData', () => {
    it('should prepare data correctly for insertion', () => {
      const model: Omit<EmailAttachment, 'attachmentId'> = {
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        extractedText: 'Some extracted text',
        extractedTextTsv: null, // This should be ignored
        policyId: 123,
        summary: 'A summary',
        emailId: 'email-456',
        mimeType: 'application/pdf',
        size: 2048,
      };

      const result = (repository as any).prepareInsertData(model);

      expect(result).toEqual({
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        extractedText: 'Some extracted text',
        policyId: 123,
        summary: 'A summary',
        emailId: 'email-456',
        mimeType: 'application/pdf',
        size: 2048,
      });
    });

    it('should handle null values correctly', () => {
      const model: Omit<EmailAttachment, 'attachmentId'> = {
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        extractedText: null,
        extractedTextTsv: null,
        policyId: null,
        summary: null,
        emailId: 'email-456',
        mimeType: 'application/pdf',
        size: 2048,
      };

      const result = (repository as any).prepareInsertData(model);

      expect(result).toEqual({
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        extractedText: null,
        policyId: null,
        summary: null,
        emailId: 'email-456',
        mimeType: 'application/pdf',
        size: 2048,
      });
    });
  });

  describe('prepareUpdateData', () => {
    it('should prepare update data with only provided fields', () => {
      const model: Partial<EmailAttachment> = {
        fileName: 'updated.pdf',
        summary: 'Updated summary',
        size: 3072,
      };

      const result = (repository as any).prepareUpdateData(model);

      expect(result).toEqual({
        fileName: 'updated.pdf',
        summary: 'Updated summary',
        size: 3072,
      });
    });

    it('should handle undefined values by excluding them', () => {
      const model: Partial<EmailAttachment> = {
        fileName: 'updated.pdf',
        extractedText: undefined,
        policyId: undefined,
      };

      const result = (repository as any).prepareUpdateData(model);

      expect(result).toEqual({
        fileName: 'updated.pdf',
      });
    });

    it('should include null values when explicitly set', () => {
      const model: Partial<EmailAttachment> = {
        extractedText: null,
        policyId: null,
        summary: null,
      };

      const result = (repository as any).prepareUpdateData(model);

      expect(result).toEqual({
        extractedText: null,
        policyId: null,
        summary: null,
      });
    });

    it('should not include attachmentId in update data', () => {
      const model: Partial<EmailAttachment> = {
        attachmentId: 123,
        fileName: 'updated.pdf',
      };

      const result = (repository as any).prepareUpdateData(model);

      expect(result).toEqual({
        fileName: 'updated.pdf',
      });
      expect(result).not.toHaveProperty('attachmentId');
    });

    it('should not include emailId in update data', () => {
      const model: Partial<EmailAttachment> = {
        emailId: 'email-123',
        fileName: 'updated.pdf',
      };

      const result = (repository as any).prepareUpdateData(model);

      expect(result).toEqual({
        fileName: 'updated.pdf',
      });
      expect(result).not.toHaveProperty('emailId');
    });
  });

  describe('record mapping', () => {
    it('should map database record to EmailAttachment correctly', () => {
      const mockRecord = {
        attachmentId: 123,
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        extractedText: 'Some text',
        policyId: 456,
        summary: 'A summary',
        emailId: 'email-789',
        mimeType: 'application/pdf',
        size: 2048,
      };

      const config = (repository as any).config;
      const result = config.recordMapper(mockRecord);

      expect(result).toEqual({
        attachmentId: 123,
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        extractedText: 'Some text',
        extractedTextTsv: null, // Should be null as not supported
        policyId: 456,
        summary: 'A summary',
        emailId: 'email-789',
        mimeType: 'application/pdf',
        size: 2048,
      });
    });

    it('should map database record to summary correctly', () => {
      const mockRecord = {
        attachmentId: 123,
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        extractedText: 'Some text',
        policyId: 456,
        summary: 'A summary',
        emailId: 'email-789',
        mimeType: 'application/pdf',
        size: 2048,
      };

      const config = (repository as any).config;
      const result = config.summaryMapper(mockRecord);

      expect(result).toEqual({
        attachmentId: 123,
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        policyId: 456,
        emailId: 'email-789',
        mimeType: 'application/pdf',
        size: 2048,
      });
    });

    it('should handle null values in record mapping', () => {
      const mockRecord = {
        attachmentId: 123,
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        extractedText: null,
        policyId: null,
        summary: null,
        emailId: 'email-789',
        mimeType: 'application/pdf',
        size: 2048,
      };

      const config = (repository as any).config;
      const result = config.recordMapper(mockRecord);

      expect(result).toEqual({
        attachmentId: 123,
        fileName: 'test.pdf',
        filePath: 'path/to/file',
        extractedText: null,
        extractedTextTsv: null,
        policyId: null,
        summary: null,
        emailId: 'email-789',
        mimeType: 'application/pdf',
        size: 2048,
      });
    });
  });

  describe('integration with base repository', () => {
    it('should use correct table configuration', () => {
      const config = (repository as any).config;
      const idField = (repository as any).idField;
      const tableName = (repository as any).tableName;

      expect(tableName).toBe('email_attachments');
      expect(idField).toBe('attachmentId');
      expect(config.table).toBeDefined();
      expect(config.idColumn).toBeUndefined(); // Should be undefined since it's auto-detected
      expect(config.recordMapper).toBeInstanceOf(Function);
      expect(config.summaryMapper).toBeInstanceOf(Function);
    });
  });
});
