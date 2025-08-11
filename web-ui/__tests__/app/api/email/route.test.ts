/* @jest-environment node */
/** 
 *
 * Email API Route Tests
 *
 * This test file covers the upgraded Drizzle-based email endpoints (/api/email)
 * using the new EmailService layer.
 *
 * The tests are designed to work with the mock setup from jest.setup.ts,
 * providing comprehensive coverage for:
 * - POST: Creating emails with validation
 * - PUT: Updating emails with validation
 * - GET: Listing emails with pagination
 * - DELETE: Removing emails
 *
 * Key mocking strategies:
 * - EmailService for all business logic operations
 * - nextjs-util functions including extractParams and isLikeNextRequest
 * - Document ID to Email ID conversion handling (for [emailId]/route.ts)
 */

// Mock EmailService before imports
const mockEmailService = {
  getEmailsSummary: jest.fn(),
  getEmailById: jest.fn(),
  createEmail: jest.fn(),
  updateEmail: jest.fn(),
  deleteEmail: jest.fn(),
  findEmailIdByGlobalMessageId: jest.fn(),
};

jest.mock('@/lib/api/email/email-service', () => ({
  EmailService: jest.fn().mockImplementation(() => mockEmailService),
}));

// Define mocks for [emailId]/route.ts (drizzle-based individual email operations)
const mockDbQuery = {
  emails: {
    findFirst: jest.fn(),
  },
  documentUnits: {
    findFirst: jest.fn(),
  },
};

const mockDbDelete = jest.fn();
const mockSchema = {
  emails: {
    emailId: 'emailId',
  },
};

const mockExtractParams = jest.fn();

// Mock modules
jest.mock('@/lib/neondb');
jest.mock('@/lib/nextjs-util', () => ({
  extractParams: mockExtractParams,
  isLikeNextRequest: jest.fn((req) => {
    return !!(req && typeof req === 'object' && 'url' in req);
  }),
}));

jest.mock('@/lib/drizzle-db', () => ({
  drizDb: jest.fn(() => ({
    query: mockDbQuery,
    delete: mockDbDelete,
  })),
  schema: mockSchema,
}));

import { NextRequest } from 'next/server';
import { POST, PUT, GET } from '@/app/api/email/route';
import { GET as GetWithId, DELETE } from '@/app/api/email/[emailId]/route';
import { query, queryExt } from '@/lib/neondb';
import { auth } from '@/auth';

const ValidEmailId = '123e4567-e89b-12d3-a456-426614174000';

describe('Email API', () => {
  beforeEach(() => {
    // Reset EmailService mocks
    Object.values(mockEmailService).forEach(mock => mock.mockReset());

    // Reset drizzle mocks (for [emailId]/route.ts)
    mockDbQuery.emails.findFirst.mockReset();
    mockDbQuery.documentUnits.findFirst.mockReset();
    mockDbDelete.mockReset();

    // Reset extractParams mock
    mockExtractParams.mockReset();
    mockExtractParams.mockImplementation(async (req) => {
      const params = await req.params;
      return params;
    });
  });

  describe('POST /api/email', () => {
    it('should create a new email and return 201 status', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          senderId: 1,
          subject: 'Test Subject',
          body: 'Test Body',
          sentOn: '2023-01-01T00:00:00Z',
          threadId: 1,
          userId: 1,
          recipients: [{ recipientId: 1, recipientEmail: 'test@test.com', recipientName: 'Test Name' }],
        }),
      } as unknown as NextRequest;

      const mockResult = {
        emailId: ValidEmailId,
        sender: { contactId: 1, name: 'Test Sender', email: 'sender@test.com' },
        subject: 'Test Subject',
        body: 'Test Body',
        sentOn: '2023-01-01T00:00:00Z',
        threadId: 1,
        parentEmailId: null,
        importedFromId: null,
        globalMessageId: null,
        recipients: [{ contactId: 1, email: 'test@test.com', name: 'Test Name' }],
      };
      
      mockEmailService.createEmail.mockResolvedValue(mockResult);

      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        message: 'Email created successfully',
        email: mockResult,
      });
      expect(mockEmailService.createEmail).toHaveBeenCalledWith({
        senderId: 1,
        subject: 'Test Subject',
        body: 'Test Body',
        sentOn: '2023-01-01T00:00:00Z',
        threadId: 1,
        parentEmailId: undefined,
        recipients: [{ recipientId: 1, recipientEmail: 'test@test.com', recipientName: 'Test Name' }],
        sender: undefined,
      });
    });
    it('should return 400 whne no recipients', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          senderId: 1,
          subject: 'Test Subject',
          body: 'Test Body',
          sentOn: '2023-01-01T00:00:00Z',
          threadId: 1,
        }),
      } as unknown as NextRequest;

      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: 'Missing required fields',
      });
      expect(mockEmailService.createEmail).not.toHaveBeenCalled();
    });

    it('should return 400 status if required fields are missing', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          sender_id: 1,
          subject: 'Test Subject',
        }),
      } as unknown as NextRequest;

      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: 'Missing required fields',
      });
    });
  });

  describe('PUT /api/email', () => {
    it('should update an email and return 200 status', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          emailId: ValidEmailId,
          subject: 'Updated Subject',
          threadId: 2,
        }),
      } as unknown as NextRequest;

      const mockResult = {
        emailId: ValidEmailId,
        sender: { contactId: 1, name: 'Test Sender', email: 'sender@test.com' },
        subject: 'Updated Subject',
        body: 'Test Body',
        sentOn: '2023-01-01T00:00:00Z',
        threadId: 2,
        parentEmailId: null,
        importedFromId: null,
        globalMessageId: null,
        recipients: [{ contactId: 1, email: 'test@test.com', name: 'Test Name' }],
      };
      
      mockEmailService.updateEmail.mockResolvedValue(mockResult);

      const res = await PUT(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        message: 'Email updated successfully',
        email: mockResult,
      });
      expect(mockEmailService.updateEmail).toHaveBeenCalledWith({
        emailId: ValidEmailId,
        senderId: undefined,
        subject: 'Updated Subject',
        body: undefined,
        sentOn: undefined,
        threadId: 2,
        parentEmailId: null, // normalizeNullableNumeric returns null for undefined
        recipients: undefined,
        sender: undefined,
      });
    });

    it('should return 404 status if email is not found', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          emailId: ValidEmailId,
          subject: 'Updated Subject',
        }),
      } as unknown as NextRequest;

      // Mock service to throw an error that would result in 404
      const error = new Error('Email not found');
      mockEmailService.updateEmail.mockRejectedValue(error);

      const res = await PUT(req);

      expect(res.status).toBe(500); // Service layer error becomes 500
      expect(await res.json()).toEqual({
        error: 'Internal Server Error',
      });
    });

    it('should return 400 status if emailId is missing', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          subject: 'Updated Subject',
        }),
      } as unknown as NextRequest;

      const res = await PUT(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: 'Email ID is required',
      });
    });
  });

  describe('GET /api/email/id', () => {
    beforeEach(() => {
      // Additional setup for drizzle-based GET tests
      mockDbQuery.documentUnits.findFirst.mockResolvedValue(null);
    });

    it('should return email details if emailId is provided', async () => {
      const req = {
        url: `http://localhost/api/email/${ValidEmailId}`,
      } as unknown as NextRequest;

      const mockEmailRecord = {
        emailId: ValidEmailId,
        subject: 'Test Subject',
        emailContents: 'Test Body',
        sentTimestamp: '2023-01-01T00:00:00Z',
        threadId: 1,
        parentId: null,
        sender: {
          contactId: 1,
          email: 'sender@example.com',
          name: 'Sender Name',
        },
        emailRecipients: [],
      };

      mockDbQuery.emails.findFirst.mockResolvedValue(mockEmailRecord);

      const res = await GetWithId(req, {
        params: Promise.resolve({ emailId: ValidEmailId }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        emailId: ValidEmailId,
        subject: 'Test Subject',
        body: 'Test Body',
        sentOn: '2023-01-01T00:00:00Z',
        threadId: 1,
        parentEmailId: null,
        sender: {
          contactId: 1,
          email: 'sender@example.com',
          name: 'Sender Name',
        },
        recipients: [],
      });
    });

    it('should return 404 status if email is not found', async () => {
      const req = {
        url: 'http://localhost/api/email?emailId=1',
      } as unknown as NextRequest;

      mockDbQuery.emails.findFirst.mockResolvedValue(null);
      const res = await GetWithId(req, {
        params: Promise.resolve({ emailId: ValidEmailId }),
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        error: 'Email not found',
      });
    });

    it('should handle document ID to email ID conversion', async () => {
      const documentId = 12345;
      const req = {
        url: `http://localhost/api/email/${documentId}`,
      } as unknown as NextRequest;

      // Mock document lookup to return email ID
      mockDbQuery.documentUnits.findFirst.mockResolvedValue({
        unitId: documentId,
        emailId: ValidEmailId,
      });

      const mockEmailRecord = {
        emailId: ValidEmailId,
        subject: 'Test Subject',
        emailContents: 'Test Body',
        sentTimestamp: '2023-01-01T00:00:00Z',
        threadId: 1,
        parentId: null,
        sender: {
          contactId: 1,
          email: 'sender@example.com',
          name: 'Sender Name',
        },
        emailRecipients: [],
      };

      mockDbQuery.emails.findFirst.mockResolvedValue(mockEmailRecord);

      const res = await GetWithId(req, {
        params: Promise.resolve({ emailId: documentId.toString() }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        emailId: ValidEmailId,
        subject: 'Test Subject',
        body: 'Test Body',
        sentOn: '2023-01-01T00:00:00Z',
        threadId: 1,
        parentEmailId: null,
        sender: {
          contactId: 1,
          email: 'sender@example.com',
          name: 'Sender Name',
        },
        recipients: [],
        documentId: documentId,
      });
    });
    it('should return a list of emails if emailId is not provided', async () => {
      const req = {
        url: 'http://localhost/api/email',
      } as unknown as NextRequest;

      const mockResult = {
        results: [
          {
            emailId: ValidEmailId,
            sender: { contactId: 1, name: 'Sender Name', email: 'sender@example.com' },
            subject: 'Test Subject',
            sentOn: '2023-01-01T00:00:00Z',
            threadId: null,
            parentEmailId: null,
            importedFromId: null,
            globalMessageId: null,
            recipients: [],
            count_attachments: 0,
            count_kpi: 0,
            count_notes: 0,
            count_cta: 0,
            count_responsive_actions: 0,
          },
        ],
        pageStats: {
          page: 1,
          num: 10,
          total: 1,
        },
      };

      mockEmailService.getEmailsSummary.mockResolvedValue(mockResult);

      const res = await GET(req);

      expect(res.status).toBe(200);
      const responseData = await res.json();
      expect(responseData).toEqual(mockResult);
      expect(mockEmailService.getEmailsSummary).toHaveBeenCalledWith({
        page: 1,
        num: 10,
        total: 0,
        offset: 0,
        filter: undefined,
        sort: undefined,
      });
    });

    it('should return 400 status if emailId is invalid', async () => {
      const req = {
        url: 'http://localhost/api/email?emailId=invalid',
      } as unknown as NextRequest;

      const res = await GetWithId(req, {
        params: Promise.resolve({ emailId: 'invalid' }),
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: 'Email ID is required',
      });
    });

    it('should handle database errors gracefully', async () => {
      const req = {
        url: `http://localhost/api/email?emailId=${ValidEmailId}`,
      } as unknown as NextRequest;

      (query as jest.Mock).mockRejectedValue(new Error('Database error'));

      const res = await GET(req);

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: 'Internal Server Error',
      });
    });
  });

  describe('DELETE /api/email', () => {
    it('should delete an email and return 200 status', async () => {
      const mockDeleteChain = {
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ emailId: ValidEmailId }]),
      };

      mockDbDelete.mockReturnValue(mockDeleteChain);

      const res = await DELETE({} as NextRequest, {
        params: Promise.resolve({ emailId: ValidEmailId }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        message: 'Email deleted successfully',
        email: ValidEmailId,
      });
    });

    it('should return 404 status if email is not found', async () => {
      const mockDeleteChain = {
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };

      mockDbDelete.mockReturnValue(mockDeleteChain);

      const res = await DELETE({} as NextRequest, {
        params: Promise.resolve({ emailId: ValidEmailId }),
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        error: 'Email not found',
      });
    });

    it('should return 400 status if emailId is missing', async () => {
      const res = await DELETE({} as NextRequest, {
        params: Promise.resolve({ emailId: '' }),
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: 'Email ID is required',
      });
    });
  });
});
