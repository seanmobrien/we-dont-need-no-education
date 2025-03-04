/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST, PUT, GET } from '@/app/api/email/route';
import { GET as GetWithId, DELETE } from '@/app/api/email/[emailId]/route';
import { query, queryExt } from '@/lib/neondb';

jest.mock('@/lib/neondb');

describe('Email API', () => {
  describe('POST /api/email', () => {
    it('should create a new email and return 201 status', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          senderId: 1,
          subject: 'Test Subject',
          body: 'Test Body',
          sentOn: '2023-01-01T00:00:00Z',
          threadId: 1,
          recipients: [{ contactId: 1, email: 'test.com', name: 'Test Name' }],
        }),
      } as unknown as NextRequest;

      const mockResult = [
        {
          emailId: 1,
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
          emailId: 1,
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
          emailId: 1,
          subject: 'Updated Subject',
          threadId: 2,
        }),
      } as unknown as NextRequest;

      const mockResult = {
        rowCount: 1,
        rows: [{ emailId: 1, subject: 'Updated Subject', threadId: 2 }],
      };
      (queryExt as jest.Mock).mockResolvedValue(mockResult);

      const res = await PUT(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        message: 'Email updated successfully',
        email: { emailId: 1, subject: 'Updated Subject', threadId: 2 },
      });
    });

    it('should return 404 status if email is not found', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          emailId: 1,
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
    it('should return email details if emailId is provided', async () => {
      const req = {
        url: 'http://localhost/api/email/1',
      } as unknown as NextRequest;

      const mockResult = [
        {
          emailId: 1,
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
        },
      ];
      (query as jest.Mock).mockResolvedValue(mockResult);

      const res = await GetWithId(req, { params: { emailId: '1' } });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        ...mockResult[0],
        sender: {
          contactId: 1,
          email: 'sender@example.com',
          name: 'Sender Name',
        },
        senderId: undefined,
        senderName: undefined,
        senderEmail: undefined,
      });
    });

    it('should return 404 status if email is not found', async () => {
      const req = {
        url: 'http://localhost/api/email?emailId=1',
      } as unknown as NextRequest;

      (query as jest.Mock).mockResolvedValue([]);

      const res = await GetWithId(req, { params: { emailId: '1' } });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        error: 'Email not found',
      });
    });

    it('should return a list of emails if emailId is not provided', async () => {
      const req = {
        url: 'http://localhost/api/email',
      } as unknown as NextRequest;

      const mockResult = [
        {
          emailId: 1,
          subject: 'Test Subject',
          sentOn: '2023-01-01T00:00:00Z',
          sender_id: 1,
          sender_name: 'Sender Name',
          sender_email: 'sender@example.com',
        },
      ];
      (query as jest.Mock).mockResolvedValue(mockResult);

      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockResult);
    });

    it('should return 400 status if emailId is invalid', async () => {
      const req = {
        url: 'http://localhost/api/email?emailId=invalid',
      } as unknown as NextRequest;

      const res = await GetWithId(req, { params: { emailId: 'invalid' } });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: 'Invalid email ID',
      });
    });

    it('should handle database errors gracefully', async () => {
      const req = {
        url: 'http://localhost/api/email?emailId=1',
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
      const mockResult = [
        {
          emailId: 1,
          subject: 'Test Subject',
          body: 'Test Body',
          sentOn: '2023-01-01T00:00:00Z',
        },
      ];
      (query as jest.Mock).mockResolvedValue(mockResult);

      const res = await DELETE({ params: { emailId: '1' } });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        message: 'Email deleted successfully',
        email: mockResult[0],
      });
    });

    it('should return 404 status if email is not found', async () => {
      (query as jest.Mock).mockResolvedValue([]);

      const res = await DELETE({ params: { emailId: '1' } });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        error: 'Email not found',
      });
    });

    it('should return 400 status if emailId is missing', async () => {
      const res = await DELETE({ params: { emailId: '' } });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: 'Email ID is required',
      });
    });
  });
});
