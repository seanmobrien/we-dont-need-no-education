import { NextRequest } from 'next/server';
import { POST, PUT, GET } from 'app/api/email/route';
import { query, queryExt } from 'lib/neondb';

jest.mock('lib/neondb');

describe('Email API', () => {
  describe('POST /api/email', () => {
    it('should create a new email and return 201 status', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          sender_id: 1,
          subject: 'Test Subject',
          body: 'Test Body',
          sent_timestamp: '2023-01-01T00:00:00Z',
        }),
      } as unknown as NextRequest;

      const mockResult = [{ email_id: 1, sender_id: 1, subject: 'Test Subject', email_contents: 'Test Body', sent_timestamp: '2023-01-01T00:00:00Z' }];
      (query as jest.Mock).mockResolvedValue(mockResult);

      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        message: 'Email created successfully',
        email: {
          email_id: 1,
          sender_id: 1,
          subject: 'Test Subject',
          body: 'Test Body',
          sent_timestamp: '2023-01-01T00:00:00Z',
        },
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
          email_id: 1,
          subject: 'Updated Subject',
        }),
      } as unknown as NextRequest;

      const mockResult = { rowCount: 1, rows: [{ email_id: 1, subject: 'Updated Subject' }] };
      (queryExt as jest.Mock).mockResolvedValue(mockResult);

      const res = await PUT(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        message: 'Email updated successfully',
        email: { email_id: 1, subject: 'Updated Subject' },
      });
    });

    it('should return 404 status if email is not found', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          email_id: 1,
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

    it('should return 400 status if email_id is missing', async () => {
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

  describe('GET /api/email', () => {
    it('should return email details if email_id is provided', async () => {
      const req = {
        url: 'http://localhost/api/email?email_id=1',
      } as unknown as NextRequest;

      const mockResult = [{
        email_id: 1,
        subject: 'Test Subject',
        body: 'Test Body',
        sent_timestamp: '2023-01-01T00:00:00Z',
        thread_id: 1,
        parent_email_id: null,
        sender_id: 1,
        sender_name: 'Sender Name',
        sender_email: 'sender@example.com',
        recipients: [],
      }];
      (query as jest.Mock).mockResolvedValue(mockResult);

      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockResult[0]);
    });

    it('should return 404 status if email is not found', async () => {
      const req = {
        url: 'http://localhost/api/email?email_id=1',
      } as unknown as NextRequest;

      (query as jest.Mock).mockResolvedValue([]);

      const res = await GET(req);

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        error: 'Email not found',
      });
    });

    it('should return a list of emails if email_id is not provided', async () => {
      const req = {
        url: 'http://localhost/api/email',
      } as unknown as NextRequest;

      const mockResult = [{
        email_id: 1,
        subject: 'Test Subject',
        sent_timestamp: '2023-01-01T00:00:00Z',
        sender_id: 1,
        sender_name: 'Sender Name',
        sender_email: 'sender@example.com',
      }];
      (query as jest.Mock).mockResolvedValue(mockResult);

      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockResult);
    });
  });
});