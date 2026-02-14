import { withJestTestExtensions } from '@/__tests__/shared/jest.test-extensions';
import { LoggedError } from '@compliance-theater/logger';
const validUuid = '12345678-1234-4567-8901-123456789012';
let mockDb = withJestTestExtensions().makeMockDb();
jest.mock('@compliance-theater/logger', () => ({
    ...jest.requireActual('@compliance-theater/logger'),
    LoggedError: {
        isTurtlesAllTheWayDownBaby: jest.fn(),
    },
}));
import { resolveCaseFileId, } from '@/lib/api/document-unit/resolve-case-file-id';
import { resolveCaseFileIdBatch } from '@/lib/ai/tools/utility';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
const mockLoggedError = LoggedError;
describe('resolveCaseFileId', () => {
    beforeEach(async () => {
        mockDb = withJestTestExtensions().makeMockDb();
        mockDb.query.documentUnits.findFirst.mockImplementation(() => {
            return Promise.resolve({
                unitId: 1,
                documentPropertyId: validUuid
            });
        });
    });
    describe('when documentId is a number', () => {
        it('should return the number as-is', async () => {
            const result = await resolveCaseFileId(123);
            expect(result).toBe(123);
            expect(mockDb.query.documentUnits.findFirst).not.toHaveBeenCalled();
        });
        it('should handle zero', async () => {
            const result = await resolveCaseFileId(0);
            expect(result).not.toBeDefined();
        });
        it('should handle negative numbers', async () => {
            const result = await resolveCaseFileId(-1);
            expect(result).not.toBeDefined();
        });
    });
    describe('when documentId is a valid UUID string', () => {
        it('should query database and return unitId when found by emailId', async () => {
            const mockResult = { unitId: 456 };
            mockDb.query.documentUnits.findFirst.mockResolvedValue(mockResult);
            const result = await resolveCaseFileId(validUuid);
            expect(result).toBe(456);
            expect(mockDb.query.documentUnits.findFirst).toHaveBeenCalledWith({
                where: expect.any(Function),
                columns: { unitId: true },
            });
        });
        it('should query database and return unitId when found by documentPropertyId', async () => {
            const mockResult = { unitId: 789 };
            mockDb.query.documentUnits.findFirst.mockResolvedValue(mockResult);
            const result = await resolveCaseFileId(validUuid);
            expect(result).toBe(789);
        });
        it('should return undefined when no record is found', async () => {
            mockDb.query.documentUnits.findFirst.mockResolvedValue(undefined);
            const result = await resolveCaseFileId(validUuid);
            expect(result).toBeUndefined();
        });
        it('should handle database errors gracefully', async () => {
            hideConsoleOutput().setup();
            const dbError = new Error('Database connection failed');
            mockDb.query.documentUnits.findFirst.mockRejectedValue(dbError);
            const result = await resolveCaseFileId(validUuid);
            expect(result).toBeUndefined();
            expect(mockLoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(dbError, {
                log: true,
                source: 'resolveCaseFileId',
                message: 'Error querying for case file ID - validate document ID format',
                include: { documentId: validUuid },
            });
        });
    });
    describe('when documentId is a numeric string', () => {
        it('should parse valid numeric string', async () => {
            const result = await resolveCaseFileId('123');
            expect(result).toBe(123);
            expect(mockDb.query.documentUnits.findFirst).not.toHaveBeenCalled();
        });
        it('should handle string with leading zeros', async () => {
            const result = await resolveCaseFileId('0123');
            expect(result).toBe(123);
        });
        it('should return undefined for invalid numeric string', async () => {
            const result = await resolveCaseFileId('abc123');
            expect(result).toBeUndefined();
        });
        it('should return undefined for empty string', async () => {
            const result = await resolveCaseFileId('');
            expect(result).toBeUndefined();
        });
        it('should return undefined for string with only spaces', async () => {
            const result = await resolveCaseFileId('   ');
            expect(result).toBeUndefined();
        });
    });
    describe('when documentId is invalid', () => {
        it('should return undefined for null', async () => {
            const result = await resolveCaseFileId(null);
            expect(result).toBeUndefined();
        });
        it('should return undefined for undefined', async () => {
            const result = await resolveCaseFileId(undefined);
            expect(result).toBeUndefined();
        });
        it('should return undefined for object', async () => {
            const result = await resolveCaseFileId({});
            expect(result).toBeUndefined();
        });
        it('should return undefined for array', async () => {
            const result = await resolveCaseFileId([]);
            expect(result).toBeUndefined();
        });
    });
    describe('UUID validation edge cases', () => {
        it('should handle invalid UUID format', async () => {
            const invalidUuid = '12345678-1234-5678-9012-123456789012';
            const result = await resolveCaseFileId(invalidUuid);
            expect(result).toBe(12345678);
            expect(mockDb.query.documentUnits.findFirst).not.toHaveBeenCalled();
        });
        it('should handle UUID with wrong length', async () => {
            const shortUuid = '12345678-1234-4567-8901-12345678901';
            const result = await resolveCaseFileId(shortUuid);
            expect(result).toBe(12345678);
        });
        it('should handle UUID with invalid characters', async () => {
            const invalidUuid = '12345678-1234-4567-8901-12345678901G';
            const result = await resolveCaseFileId(invalidUuid);
            expect(result).toBe(12345678);
        });
    });
});
describe('resolveCaseFileIdBatch', () => {
    beforeEach(() => {
        mockLoggedError.isTurtlesAllTheWayDownBaby.mockClear();
        mockDb = withJestTestExtensions().makeMockDb();
    });
    describe('with empty input', () => {
        it('should return empty array for empty input', async () => {
            const result = await resolveCaseFileIdBatch([]);
            expect(result).toEqual([]);
            expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
        });
    });
    describe('with only numeric inputs', () => {
        it('should return all numeric IDs as-is', async () => {
            const requests = [
                { caseFileId: 123 },
                { caseFileId: 456 },
                { caseFileId: 789 },
            ];
            const result = await resolveCaseFileIdBatch(requests);
            expect(result).toEqual([
                { caseFileId: 123 },
                { caseFileId: 456 },
                { caseFileId: 789 },
            ]);
            expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
        });
    });
    describe('with only string numeric inputs', () => {
        it('should parse and return numeric values', async () => {
            const requests = [
                { caseFileId: '123' },
                { caseFileId: '456' },
                { caseFileId: '789' },
            ];
            const result = await resolveCaseFileIdBatch(requests);
            expect(result).toEqual([
                { caseFileId: 123 },
                { caseFileId: 456 },
                { caseFileId: 789 },
            ]);
            expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
        });
    });
    describe('with UUID inputs', () => {
        const uuid1 = '12345678-1234-4567-8901-123456789012';
        const uuid2 = '87654321-4321-4321-8901-210987654321';
        const setupMockRecords = async (source) => {
            const mockRecords = [...source];
            mockDb.query.documentUnits.findMany.mockImplementation(() => Promise.resolve(mockRecords));
            return mockRecords;
        };
        it('should resolve UUIDs from database', async () => {
            const requests = [{ caseFileId: uuid1 }, { caseFileId: uuid2 }];
            setupMockRecords([
                { unitId: 100, documentPropertyId: uuid1, emailId: null },
                { unitId: 200, documentPropertyId: null, emailId: uuid2 },
            ]);
            const result = await resolveCaseFileIdBatch(requests);
            expect(result).toEqual([{ caseFileId: 100 }, { caseFileId: 200 }]);
            expect(mockDb.query.documentUnits.findMany).toHaveBeenCalledWith({
                where: expect.any(Function),
                columns: {
                    unitId: true,
                    documentPropertyId: true,
                    emailId: true,
                },
            });
        });
        it('should handle UUIDs not found in database', async () => {
            const requests = [{ caseFileId: uuid1 }, { caseFileId: uuid2 }];
            setupMockRecords([]);
            const result = await resolveCaseFileIdBatch(requests);
            expect(result).toEqual([]);
        });
        it('should handle partial matches from database', async () => {
            const requests = [{ caseFileId: uuid1 }, { caseFileId: uuid2 }];
            setupMockRecords([
                { unitId: 100, documentPropertyId: uuid1, emailId: null },
            ]);
            const result = await resolveCaseFileIdBatch(requests);
            expect(result).toEqual([{ caseFileId: 100 }]);
        });
    });
    describe('with mixed input types', () => {
        it('should handle combination of numbers, numeric strings, and UUIDs', async () => {
            const uuid = '12345678-1234-4567-8901-123456789012';
            const requests = [
                { caseFileId: 123 },
                { caseFileId: '456' },
                { caseFileId: uuid },
                { caseFileId: 789 },
                { caseFileId: 999 },
            ];
            const mockRecords = [
                { unitId: 999, documentPropertyId: uuid, emailId: null },
            ];
            mockDb.query.documentUnits.findMany.mockResolvedValue(mockRecords);
            const result = await resolveCaseFileIdBatch(requests);
            expect(result).toEqual([
                { caseFileId: 123 },
                { caseFileId: 456 },
                { caseFileId: 789 },
                { caseFileId: 999 },
                { caseFileId: 999 },
            ]);
        });
        it('should filter out invalid inputs', async () => {
            const requests = [
                { caseFileId: 123 },
                { caseFileId: 'invalid' },
                { caseFileId: null },
                { caseFileId: {} },
                { caseFileId: '456' },
            ];
            const result = await resolveCaseFileIdBatch(requests);
            expect(result).toEqual([{ caseFileId: 123 }, { caseFileId: 456 }]);
        });
    });
    describe('database error handling', () => {
        it('should handle database query errors', async () => {
            const uuid = '12345678-1234-4567-8901-123456789012';
            const requests = [{ caseFileId: uuid }];
            mockDb.query.documentUnits.findMany.mockRejectedValue(new Error('Database connection failed'));
            await expect(resolveCaseFileIdBatch(requests)).rejects.toThrow('Database connection failed');
        });
    });
    describe('edge cases', () => {
        it('should handle requests with only invalid UUIDs', async () => {
            const requests = [
                { caseFileId: '12345678-1234-5678-9012-123456789012' },
                { caseFileId: 'not-a-uuid' },
            ];
            const result = await resolveCaseFileIdBatch(requests);
            expect(result).toEqual([]);
            expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
        });
        it('should handle zero and negative numbers', async () => {
            const requests = [
                { caseFileId: 0 },
                { caseFileId: -1 },
                { caseFileId: '-5' },
            ];
            const result = await resolveCaseFileIdBatch(requests);
            expect(result).toEqual([
                { caseFileId: 0 },
                { caseFileId: -1 },
                { caseFileId: -5 },
            ]);
        });
        it('should handle large numbers', async () => {
            const largeNumber = Number.MAX_SAFE_INTEGER;
            const requests = [
                { caseFileId: largeNumber },
                { caseFileId: largeNumber.toString() },
            ];
            const result = await resolveCaseFileIdBatch(requests);
            expect(result).toEqual([
                { caseFileId: largeNumber },
                { caseFileId: largeNumber },
            ]);
        });
    });
});
//# sourceMappingURL=utility.test.js.map