import { POST, GET } from '@/app/api/auth/keys/route';
import { drizDb } from '@compliance-theater/database/orm';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
import { withJestTestExtensions } from '@/__tests__/shared/jest.test-extensions';
jest.mock('@compliance-theater/database/orm', () => {
    const actualSchema = jest.requireActual('@compliance-theater/database/orm');
    return {
        ...actualSchema,
        drizDb: jest.fn(),
        schema: actualSchema.schema,
    };
});
jest.mock('@compliance-theater/logger');
jest.mock('@/lib/react-util', () => ({
    LoggedError: {
        isTurtlesAllTheWayDownBaby: jest.fn((error) => error),
    },
}));
const mockDrizDb = drizDb;
const mockDbInstance = {
    query: {
        userPublicKeys: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
    },
    insert: jest.fn(),
};
mockDrizDb.mockReturnValue(mockDbInstance);
const consoleSpy = hideConsoleOutput();
describe('/api/auth/keys', () => {
    beforeEach(() => {
    });
    afterEach(() => {
        consoleSpy.dispose();
    });
    describe('POST - Upload public key', () => {
        const validPublicKey = 'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALWGOW2ovUQ2hlsk+LbLFV/q3tNF4vAnCvaBVqqLsVlaZ8ZcWlpr59aj2J0zFGpqLBWtjZl/FgXWWlZHMa+o73sCAwEAAQ==';
        const createMockRequest = (body) => {
            return {
                json: jest.fn().mockResolvedValue(body),
            };
        };
        it('should successfully upload a new public key', async () => {
            withJestTestExtensions().session.user.id = String(123);
            mockDbInstance.query.userPublicKeys.findFirst.mockResolvedValue(null);
            const returningMock = jest.fn().mockResolvedValue([
                {
                    id: 1,
                    effectiveDate: '2024-01-01T00:00:00Z',
                    expirationDate: '2025-01-01T00:00:00Z',
                },
            ]);
            const valuesMock = jest.fn().mockReturnValue({
                returning: returningMock,
            });
            mockDbInstance.insert.mockImplementation(() => ({
                values: valuesMock,
            }));
            const request = createMockRequest({ publicKey: validPublicKey });
            const response = await POST(request);
            expect(response.status).toBe(200);
            const responseData = await response.json();
            expect(responseData).toMatchObject({
                success: true,
                message: 'Public key registered successfully',
                keyId: 1,
            });
        });
        it('should return 401 when not authenticated', async () => {
            withJestTestExtensions().session = null;
            const request = createMockRequest({ publicKey: validPublicKey });
            const response = await POST(request);
            expect(response.status).toBe(401);
            const responseData = await response.json();
            expect(responseData).toEqual({
                success: false,
                error: 'Authentication required',
            });
        });
        it('should return 400 for invalid request format', async () => {
            withJestTestExtensions().session.user.id = String(123);
            const request = createMockRequest({});
            const response = await POST(request);
            expect(response.status).toBe(400);
            const responseData = await response.json();
            expect(responseData).toEqual({
                success: false,
                error: 'Invalid request format',
            });
        });
        it('should return 400 for invalid user ID', async () => {
            withJestTestExtensions().session.user.id = 'invalid-id';
            const request = createMockRequest({ publicKey: validPublicKey });
            const response = await POST(request);
            expect(response.status).toBe(400);
            const responseData = await response.json();
            expect(responseData).toEqual({
                success: false,
                error: 'Invalid user ID',
            });
        });
        it('should return 400 for invalid public key format', async () => {
            withJestTestExtensions().session.user.id = String(123);
            const request = createMockRequest({ publicKey: 'invalid-key' });
            const response = await POST(request);
            expect(response.status).toBe(400);
            const responseData = await response.json();
            expect(responseData).toEqual({
                success: false,
                error: 'Invalid public key format',
            });
        });
        it('should return success when key already exists', async () => {
            withJestTestExtensions().session.user.id = String(123);
            mockDbInstance.query.userPublicKeys.findFirst.mockResolvedValue({
                id: 1,
                publicKey: validPublicKey,
                userId: '123',
            });
            const request = createMockRequest({ publicKey: validPublicKey });
            const response = await POST(request);
            expect(response.status).toBe(200);
            const responseData = await response.json();
            expect(responseData).toMatchObject({
                success: true,
                message: 'Public key already registered',
                keyId: 1,
            });
        });
        it('should handle database errors gracefully', async () => {
            consoleSpy.setup();
            withJestTestExtensions().session.user.id = String(123);
            mockDbInstance.query.userPublicKeys.findFirst.mockRejectedValue(new Error('Database connection failed'));
            const request = createMockRequest({ publicKey: validPublicKey });
            const response = await POST(request);
            expect(response.status).toBe(500);
            const responseData = await response.json();
            expect(responseData).toEqual({
                success: false,
                error: 'Internal server error',
            });
        });
        it('should handle custom expiration date', async () => {
            withJestTestExtensions().session.user.id = String(123);
            mockDbInstance.query.userPublicKeys.findFirst.mockResolvedValue(null);
            const returningMock = jest.fn().mockResolvedValue([
                {
                    id: 1,
                    effectiveDate: '2024-01-01T00:00:00Z',
                    expirationDate: '2024-06-01T00:00:00Z',
                },
            ]);
            const valuesMock = jest.fn().mockReturnValue({
                returning: returningMock,
            });
            mockDbInstance.insert.mockImplementation(() => ({
                values: valuesMock,
            }));
            const customExpirationDate = '2024-06-01T00:00:00Z';
            const request = createMockRequest({
                publicKey: validPublicKey,
                expirationDate: customExpirationDate,
            });
            const response = await POST(request);
            expect(response.status).toBe(200);
            const responseData = await response.json();
            expect(responseData.expirationDate).toBe('2024-06-01T00:00:00Z');
        });
    });
    describe('GET - Retrieve user public keys', () => {
        it('should return user public keys when authenticated', async () => {
            withJestTestExtensions().session.user.id = String(123);
            const mockKeys = [
                {
                    id: 1,
                    publicKey: 'key1',
                    effectiveDate: '2024-01-01T00:00:00Z',
                    expirationDate: '2025-01-01T00:00:00Z',
                    createdAt: '2024-01-01T00:00:00Z',
                },
                {
                    id: 2,
                    publicKey: 'key2',
                    effectiveDate: '2024-02-01T00:00:00Z',
                    expirationDate: null,
                    createdAt: '2024-02-01T00:00:00Z',
                },
            ];
            mockDbInstance.query.userPublicKeys.findMany.mockResolvedValue(mockKeys);
            const response = await GET();
            expect(response.status).toBe(200);
            const responseData = await response.json();
            expect(responseData).toEqual({
                success: true,
                keys: mockKeys,
                count: 2,
            });
        });
        it('should return 401 when not authenticated', async () => {
            withJestTestExtensions().session = null;
            const response = await GET();
            expect(response.status).toBe(401);
            const responseData = await response.json();
            expect(responseData).toEqual({
                success: false,
                error: 'Authentication required',
            });
        });
        it('should return 400 for invalid user ID', async () => {
            withJestTestExtensions().session.user.id = 'invalid-id';
            const response = await GET();
            expect(response.status).toBe(400);
            const responseData = await response.json();
            expect(responseData).toEqual({
                success: false,
                error: 'Invalid user ID',
            });
        });
        it('should return empty array when no keys exist', async () => {
            withJestTestExtensions().session.user.id = String(123);
            mockDbInstance.query.userPublicKeys.findMany.mockResolvedValue([]);
            const response = await GET();
            expect(response.status).toBe(200);
            const responseData = await response.json();
            expect(responseData).toEqual({
                success: true,
                keys: [],
                count: 0,
            });
        });
        it('should handle database errors gracefully', async () => {
            consoleSpy.setup();
            withJestTestExtensions().session.user.id = String(123);
            mockDbInstance.query.userPublicKeys.findMany.mockRejectedValue(new Error('Database connection failed'));
            const response = await GET();
            expect(response.status).toBe(500);
            const responseData = await response.json();
            expect(responseData).toEqual({
                success: false,
                error: 'Internal server error',
            });
        });
    });
});
//# sourceMappingURL=route.test.js.map