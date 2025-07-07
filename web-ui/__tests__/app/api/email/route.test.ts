/**
 * @jest-environment node
 *
 * Email API Route Tests
 *
 * This test file covers both the traditional neondb-based endpoints (/api/email)
 * and the new Drizzle ORM-based endpoints (/api/email/[emailId]).
 *
 * The tests are designed to work with the mock setup from jest.setup.ts,
 * providing comprehensive coverage for:
 * - POST: Creating emails with validation
 * - PUT: Updating emails with validation
 * - GET: Listing emails (neondb) and retrieving individual emails (drizzle)
 * - DELETE: Removing emails (drizzle)
 *
 * Key mocking strategies:
 * - neondb query/queryExt functions for traditional endpoints
 * - Drizzle db.query and db.delete chains for new endpoints
 * - nextjs-util functions including extractParams and isLikeNextRequest
 * - Document ID to Email ID conversion handling
 */

// Define mocks before they are used
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
  db: {
    query: mockDbQuery,
    delete: mockDbDelete,
  },
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
    // Reset neondb mocks (for main route.ts)
    (query as jest.Mock).mockImplementation(() => Promise.resolve([]));
    (queryExt as jest.Mock).mockImplementation(() =>
      Promise.resolve({ rowCount: 0, rows: [] }),
    );

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

    // Reset auth mock
    (auth as jest.Mock).mockReset();
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
          recipients: [{ contactId: 1, email: 'test.com', name: 'Test Name' }],
        }),
      } as unknown as NextRequest;

      const mockResult = [
        {
          emailId: ValidEmailId,
          senderId: 1,
          subject: 'Test Subject',
          body: 'Test Body',
          sentOn: '2023-01-01T00:00:00Z',
          threadId: 1,
          recipients: [{ contactId: 1, email: 'test.com', name: 'Test Name' }],
          // req,
        },
      ];
      (query as jest.Mock).mockResolvedValue(mockResult);

      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        message: 'Email created successfully',
        email: {
          ...mockResult[0],
        },
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

      const mockResult = [
        {
          emailId: ValidEmailId,
          senderId: 1,
          subject: 'Test Subject',
          body: 'Test Body',
          sentOn: '2023-01-01T00:00:00Z',
          threadId: 1,
        },
      ];
      (query as jest.Mock).mockResolvedValue(mockResult);

      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: 'Missing required fields',
      });
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
        rowCount: 1,
        rows: [
          { emailId: ValidEmailId, subject: 'Updated Subject', threadId: 2 },
        ],
      };
      (queryExt as jest.Mock).mockResolvedValue(mockResult);

      const res = await PUT(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        message: 'Email updated successfully',
        email: {
          emailId: ValidEmailId,
          subject: 'Updated Subject',
          threadId: 2,
        },
      });
    });

    it('should return 404 status if email is not found', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          emailId: ValidEmailId,
          subject: 'Updated Subject',
        }),
      } as unknown as NextRequest;

      const mockResult = { rowCount: 0, rows: [] };
      (queryExt as jest.Mock).mockResolvedValue(mockResult);

      const res = await PUT(req);

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        error: 'Email not found or not updated',
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

      const mockResult = [
        {
          emailId: ValidEmailId,
          subject: 'Test Subject',
          sentOn: '2023-01-01T00:00:00Z',
          sender_id: 1,
          sender_name: 'Sender Name',
          sender_email: 'sender@example.com',
        },
      ];

      // Mock the first query call (main data) and second query call (count)
      (query as jest.Mock)
        .mockResolvedValueOnce(mockResult) // first call for emails
        .mockResolvedValueOnce([{ records: 1 }]); // second call for count

      const res = await GET(req);

      expect(res.status).toBe(200);
      const responseData = await res.json();
      expect(responseData.results).toEqual(mockResult);
      expect(responseData.pageStats).toEqual({
        page: 1,
        num: 10,
        total: 1,
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
  describe('Auth Session API', () => {
    describe('GET /api/auth/session', () => {
      beforeEach(() => {
        // Reset all mocks before each test
        // jest.clearAllMocks();
        (auth as jest.Mock).mockReset();
      });

      it('should return authenticated status and session data if session exists', async () => {
        const mockSession = { user: { id: 1, name: 'Test User' } };
        (auth as jest.Mock).mockResolvedValue(mockSession);

        // Import the route function fresh
        const { GET } = await import('@/app/api/auth/session/route');
        const { NextResponse } = await import('next/server');

        const res = await GET();
        expect(res instanceof NextResponse).toBe(true);
        expect(res.status).toBe(200);
        const json = await res.json();

        expect(json).toEqual({
          status: 'authenticated',
          data: mockSession,
        });
      });

      it('should return unauthenticated status and null data if no session', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        // Import the route function fresh
        const { GET } = await import('@/app/api/auth/session/route');
        const { NextResponse } = await import('next/server');

        const res = await GET();
        expect(res instanceof NextResponse).toBe(true);
        expect(res.status).toBe(200);
        const json = await res.json();

        expect(json).toEqual({
          status: 'unauthenticated',
          data: null,
        });
      });
    });
  });
});
