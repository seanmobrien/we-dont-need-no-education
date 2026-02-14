jest.mock('@compliance-theater/database/driver');
jest.mock('@compliance-theater/logger');
jest.mock('@/data-models/api');
import { NextRequest } from 'next/server';
import { PUT, GET, DELETE } from '@/app/api/contact/[contactId]/route';
import { query, queryExt } from '@compliance-theater/database/driver';
describe('Contact API Routes', () => {
    afterEach(() => { });
    beforeEach(() => {
        query.mockImplementation(() => Promise.resolve([]));
        queryExt.mockImplementation(() => Promise.resolve({ rowCount: 0, rows: [] }));
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
            queryExt.mockResolvedValueOnce({
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
            const res = await PUT(req, { params: Promise.resolve({ contactId: 1 }) });
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
            const res = await PUT(req, {
                params: Promise.resolve({ contactId: undefined }),
            });
            const json = await res.json();
            expect(res.status).toBe(400);
            expect(json.error).toBe('Contact ID is required');
        });
    });
    describe('GET /contact', () => {
        it('should return a contact by ID and return 200', async () => {
            const req = new NextRequest('http://localhost?contact_id=1');
            query.mockResolvedValueOnce([
                {
                    contactId: 1,
                    name: 'John Doe',
                    email: 'john@example.com',
                    phoneNumber: '1234567890',
                    jobDescription: 'Developer',
                    isDistrictStaff: true,
                },
            ]);
            const res = await GET(req, { params: Promise.resolve({ contactId: 1 }) });
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
            query.mockResolvedValueOnce([]);
            const res = await GET(req, { params: Promise.resolve({ contactId: 1 }) });
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
            query.mockResolvedValueOnce([
                {
                    contactId: 1,
                    name: 'John Doe',
                    email: 'john@example.com',
                    phoneNumber: '1234567890',
                    jobDescription: 'Developer',
                    isDistrictStaff: true,
                },
            ]);
            const res = await DELETE(req, {
                params: Promise.resolve({ contactId: 1 }),
            });
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
            const res = await DELETE(req, {
                params: Promise.resolve({}),
            });
            const json = await res.json();
            expect(res.status).toBe(400);
            expect(json.error).toBe('Contact ID is required');
        });
        it('should return 400 if contactId is missing', async () => {
            const req = new NextRequest('http://localhost', {
                method: 'DELETE',
                body: JSON.stringify({}),
            });
            query.mockResolvedValueOnce([]);
            const res = await DELETE(req, {
                params: Promise.resolve({ contactId: 1 }),
            });
            const json = await res.json();
            expect(res.status).toBe(404);
            expect(json.error).toBe('Contact not found');
        });
    });
});
//# sourceMappingURL=route.test.js.map