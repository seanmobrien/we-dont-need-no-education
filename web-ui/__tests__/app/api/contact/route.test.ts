/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST, PUT, GET, DELETE } from '../../../../app/api/contact/route';
import { query, queryExt } from '@/lib/neondb';

jest.mock('@/lib/neondb');
jest.mock('@/lib/logger');

describe('Contact API Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /contact', () => {
    it('should create a new contact and return 201', async () => {
      const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          jobDescription: 'Developer',
          phoneNumber: '1234567890',
          isDistrictStaff: true,
        }),
      });

      (query as jest.Mock).mockResolvedValueOnce([
        {
          contactId: 1,
          name: 'John Doe',
          email: 'john@example.com',
          jobDescription: 'Developer',
          phoneNumber: '1234567890',
          isDistrictStaff: true,
        },
      ]);

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toBe('Contact created successfully');
      expect(json.contact).toEqual({
        contactId: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '1234567890',
        jobDescription: 'Developer',
        isDistrictStaff: true,
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Missing required fields');
    });
  });

  describe('PUT /contact', () => {
    it('should update an existing contact and return 200', async () => {
      const req = new NextRequest('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({
          contactId: 1,
          name: 'John Doe',
          email: 'john@example.com',
          jobDescription: 'Developer',
          phoneNumber: '1234567890',
          isDistrictStaff: true,
        }),
      });

      (queryExt as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            contactId: 1,
            name: 'John Doe',
            email: 'john@example.com',
            phoneNumber: '1234567890',
            jobDescription: 'Developer',
            isDistrictStaff: true,
          },
        ],
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe('Contact updated successfully');
      expect(json.contact).toEqual({
        contactId: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '1234567890',
        jobDescription: 'Developer',
        isDistrictStaff: true,
      });
    });

    it('should return 400 if contactId is missing', async () => {
      const req = new NextRequest('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Contact ID is required');
    });
  });

  describe('GET /contact', () => {
    it('should return a contact by ID and return 200', async () => {
      const req = new NextRequest('http://localhost?contact_id=1');

      (query as jest.Mock).mockResolvedValueOnce([
        {
          contactId: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phoneNumber: '1234567890',
          jobDescription: 'Developer',
          isDistrictStaff: true,
        },
      ]);

      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({
        contactId: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '1234567890',
        jobDescription: 'Developer',
        isDistrictStaff: true,
      });
    });

    it('should return 404 if contact is not found', async () => {
      const req = new NextRequest('http://localhost?contact_id=1');

      (query as jest.Mock).mockResolvedValueOnce([]);

      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Contact not found');
    });
  });

  describe('DELETE /contact', () => {
    it('should delete a contact and return 200', async () => {
      const req = new NextRequest('http://localhost', {
        method: 'DELETE',
        body: JSON.stringify({ contactId: 1 }),
      });

      (query as jest.Mock).mockResolvedValueOnce([
        {
          contactId: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phoneNumber: '1234567890',
          jobDescription: 'Developer',
          isDistrictStaff: true,
        },
      ]);

      const res = await DELETE(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe('Contact deleted successfully');
      expect(json.contact).toEqual({
        contactId: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '1234567890',
        jobDescription: 'Developer',
        isDistrictStaff: true,
      });
    });

    it('should return 400 if contactId is missing', async () => {
      const req = new NextRequest('http://localhost', {
        method: 'DELETE',
        body: JSON.stringify({}),
      });

      const res = await DELETE(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Contact ID is required');
    });
  });
});
