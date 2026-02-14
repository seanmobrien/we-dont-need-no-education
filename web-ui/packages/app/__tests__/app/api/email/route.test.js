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
jest.mock('@/lib/auth/resources/case-file', () => {
    const origModule = jest.requireActual('@/lib/auth/resources/case-file');
    return {
        ...origModule,
        checkCaseFileAuthorization: jest
            .fn()
            .mockResolvedValue({ authorized: true }),
        CaseFileScope: {
            READ: 'case-file:read',
            WRITE: 'case-file:write',
            ADMIN: 'case-file:admin',
        },
        getUserIdFromUnitId: jest.fn(() => Promise.resolve(123)),
        getAccessibleUserIds: jest.fn(() => Promise.resolve([123])),
    };
});
const mockExtractParams = jest.fn();
jest.mock('@/lib/nextjs-util/server/utils', () => {
    const orig = jest.requireActual('@/lib/nextjs-util/server/utils');
    return {
        ...orig,
        extractParams: mockExtractParams,
    };
});
jest.mock('@/lib/components/mui/data-grid/queryHelpers');
import { POST, PUT, GET } from '@/app/api/email/route';
import { GET as GetWithId, DELETE } from '@/app/api/email/[emailId]/route';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { withJestTestExtensions } from '@/__tests__/shared/jest.test-extensions';
import { getAccessibleUserIds } from '@/lib/auth/resources/case-file';
const ValidEmailId = '123e4567-e89b-12d3-a456-426614174000';
let mockDb = withJestTestExtensions().makeMockDb();
let mockDbQuery = mockDb?.query;
let mockDbDelete = mockDb?.delete;
describe('Email API', () => {
    beforeEach(() => {
        Object.values(mockEmailService).forEach((mock) => mock.mockReset());
        mockDb = withJestTestExtensions().makeMockDb();
        mockDbQuery = mockDb.query;
        mockDbDelete = mockDb.delete;
        mockExtractParams.mockReset();
        mockExtractParams.mockImplementation(async (req) => {
            const params = await req.params;
            return params;
        });
        getAccessibleUserIds.mockImplementation(() => [123]);
    });
    describe('POST /api/email', () => {
        it('should create a new email and return 201 status', async () => {
            const req = {
                json: jest.fn().mockResolvedValue({
                    senderId: 1,
                    subject: 'Test Subject',
                    body: 'Test Body',
                    sentOn: '2023-01-01T00:00:00.000Z',
                    threadId: 1,
                    userId: 1,
                    recipients: [
                        {
                            recipientId: 1,
                            recipientEmail: 'test@test.com',
                            recipientName: 'Test Name',
                        },
                    ],
                }),
            };
            const mockResult = {
                emailId: ValidEmailId,
                sender: { contactId: 1, name: 'Test Sender', email: 'sender@test.com' },
                subject: 'Test Subject',
                body: 'Test Body',
                sentOn: '2023-01-01T00:00:00.000Z',
                threadId: 1,
                parentEmailId: null,
                importedFromId: null,
                globalMessageId: null,
                recipients: [
                    { contactId: 1, email: 'test@test.com', name: 'Test Name' },
                ],
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
                sentOn: new Date('2023-01-01T00:00:00.000Z'),
                threadId: 1,
                parentEmailId: null,
                recipients: [
                    {
                        recipientId: 1,
                        recipientEmail: 'test@test.com',
                        recipientName: 'Test Name',
                    },
                ],
                sender: undefined,
            });
        });
        it('should return 400 when no recipients', async () => {
            const req = {
                json: jest.fn().mockResolvedValue({
                    senderId: 1,
                    subject: 'Test Subject',
                    body: 'Test Body',
                    sentOn: '2023-01-01T00:00:00.000Z',
                    threadId: 1,
                }),
            };
            const res = await POST(req);
            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({
                details: {
                    fieldErrors: {
                        recipients: ['Required'],
                    },
                    formErrors: [],
                },
                error: 'Validation failed',
            });
            expect(mockEmailService.createEmail).not.toHaveBeenCalled();
        });
        it('should return 400 status if required fields are missing', async () => {
            const req = {
                json: jest.fn().mockResolvedValue({
                    sender_id: 1,
                    subject: 'Test Subject',
                }),
            };
            const res = await POST(req);
            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({
                details: {
                    fieldErrors: {
                        body: ['Required'],
                        recipients: ['Required'],
                    },
                    formErrors: [],
                },
                error: 'Validation failed',
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
            };
            const mockResult = {
                emailId: ValidEmailId,
                sender: { contactId: 1, name: 'Test Sender', email: 'sender@test.com' },
                subject: 'Updated Subject',
                body: 'Test Body',
                sentOn: '2023-01-01T00:00:00.000Z',
                threadId: 2,
                parentEmailId: null,
                importedFromId: null,
                globalMessageId: null,
                recipients: [
                    { contactId: 1, email: 'test@test.com', name: 'Test Name' },
                ],
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
                parentEmailId: null,
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
            };
            const error = new Error("Case file not found for this document unit");
            mockEmailService.updateEmail.mockRejectedValue(error);
            const res = await PUT(req);
            expect(res.status).toBe(500);
            expect(await res.json()).toEqual({
                error: 'Internal Server Error',
            });
        });
        it('should return 400 status if emailId is missing', async () => {
            const req = {
                json: jest.fn().mockResolvedValue({
                    subject: 'Updated Subject',
                }),
            };
            const res = await PUT(req);
            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({
                details: {
                    fieldErrors: {
                        emailId: ['Required'],
                    },
                    formErrors: [],
                },
                error: 'Validation failed',
            });
        });
    });
    describe('GET /api/email/id', () => {
        beforeEach(() => {
            mockDbQuery.documentUnits.findFirst.mockResolvedValue(null);
        });
        it('should return email details if emailId is provided', async () => {
            const req = {
                url: `http://localhost/api/email/${ValidEmailId}`,
            };
            const mockEmailRecord = {
                emailId: ValidEmailId,
                subject: 'Test Subject',
                emailContents: 'Test Body',
                sentTimestamp: '2023-01-01T00:00:00.000Z',
                threadId: 1,
                parentId: null,
                sender: {
                    contactId: 1,
                    email: 'sender@example.com',
                    name: 'Sender Name',
                },
                emailRecipients: [],
            };
            mockDbQuery.emails.findFirst.mockImplementation(() => Promise.resolve(mockEmailRecord));
            const res = await GetWithId(req, {
                params: Promise.resolve({ emailId: ValidEmailId }),
            });
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({
                emailId: ValidEmailId,
                subject: 'Test Subject',
                body: 'Test Body',
                sentOn: '2023-01-01T00:00:00.000Z',
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
            };
            mockDbQuery.emails.findFirst.mockImplementation(() => Promise.resolve(null));
            const res = await GetWithId(req, {
                params: Promise.resolve({ emailId: ValidEmailId }),
            });
            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({
                error: "Email not found",
            });
        });
        it('should handle document ID to email ID conversion', async () => {
            const documentId = 12345;
            const req = {
                url: `http://localhost/api/email/${documentId}`,
            };
            mockDbQuery.documentUnits.findFirst.mockResolvedValue({
                unitId: documentId,
                emailId: ValidEmailId,
            });
            const mockEmailRecord = {
                emailId: ValidEmailId,
                subject: 'Test Subject',
                emailContents: 'Test Body',
                sentTimestamp: '2023-01-01T00:00:00.000Z',
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
                sentOn: '2023-01-01T00:00:00.000Z',
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
            };
            const mockResult = {
                results: [
                    {
                        emailId: ValidEmailId,
                        sender: {
                            contactId: 1,
                            name: 'Sender Name',
                            email: 'sender@example.com',
                        },
                        subject: 'Test Subject',
                        sentOn: '2023-01-01T00:00:00.000Z',
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
            selectForGrid.mockReturnValue(mockResult);
            mockEmailService.getEmailsSummary.mockResolvedValue(mockResult);
            const res = await GET(req);
            expect(res.status).toBe(200);
            const responseData = await res.json();
            expect(responseData).toEqual(mockResult);
        });
        it('should return 400 status if emailId is invalid', async () => {
            const req = {
                url: 'http://localhost/api/email?emailId=invalid',
            };
            const res = await GetWithId(req, {
                params: Promise.resolve({ emailId: 'invalid' }),
            });
            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({
                error: 'Email ID is required',
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
            const res = await DELETE({}, {
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
            const res = await DELETE({}, {
                params: Promise.resolve({ emailId: ValidEmailId }),
            });
            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({
                error: "Email not found",
            });
        });
        it('should return 400 status if emailId is missing', async () => {
            const res = await DELETE({}, {
                params: Promise.resolve({ emailId: '' }),
            });
            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({
                error: 'Email ID is required',
            });
        });
    });
});
//# sourceMappingURL=route.test.js.map