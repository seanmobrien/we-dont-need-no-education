/**
 * @jest-environment node
 */

jest.mock('/lib/neondb');
jest.mock('/lib/logger');
jest.mock('/data-models/api');

import { NextRequest } from 'next/server';
import { POST, GET } from '/app/api/contact/route';
import { query, queryExt } from '/lib/neondb';
import { globalContactCache } from '/data-models/api';

describe('Contact API Routes', () => {
  afterEach(() => {
    (globalContactCache as jest.Mock).mockClear();
  });
  beforeEach(() => {
    (query as jest.Mock).mockImplementation(() => Promise.resolve([]));
    (queryExt as jest.Mock).mockImplementation(() =>
      Promise.resolve({ rowCount: 0, rows: [] }),
    );
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

  describe('GET /contact', () => {
    it('should return list contacts', async () => {
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

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual([
        {
          contactId: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phoneNumber: '1234567890',
          jobDescription: 'Developer',
          isDistrictStaff: true,
        },
      ]);
    });
  });
});
