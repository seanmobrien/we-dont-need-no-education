import { buildDrizzlePagination } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzlePagination';
jest.mock('@/lib/components/mui/data-grid/queryHelpers/utility', () => {
    const orig = jest.requireActual('/lib/components/mui/data-grid/queryHelpers/utility');
    return {
        ...orig,
        parsePaginationStats: jest.fn(),
    };
});
jest.mock('@/lib/nextjs-util/utils', () => {
    const nextJsUtils = jest.requireActual('/lib/nextjs-util/utils');
    const deprecate = (fn) => {
        const deprecatedFn = function (...args) {
            return fn.apply(this, args);
        };
        return deprecatedFn;
    };
    return {
        ...nextJsUtils,
        deprecate,
    };
});
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
const mockParsePaginationStats = parsePaginationStats;
describe('buildDrizzlePagination', () => {
    let mockQuery;
    beforeEach(() => {
        mockQuery = {
            limit: jest.fn().mockReturnThis(),
            offset: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
        };
    });
    describe('Basic functionality', () => {
        it('should apply limit and offset from pagination stats', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 3,
                num: 10,
                total: 100,
                offset: 20,
            });
            const req = new URLSearchParams('page=3&pageSize=10');
            const result = buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockParsePaginationStats).toHaveBeenCalledWith(req);
            expect(mockQuery.limit).toHaveBeenCalledWith(10);
            expect(mockQuery.offset).toHaveBeenCalledWith(20);
            expect(result).toBe(mockQuery);
        });
        it('should handle zero offset', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 1,
                num: 25,
                total: 100,
                offset: 0,
            });
            const req = new URLSearchParams('page=1&pageSize=25');
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockQuery.limit).toHaveBeenCalledWith(25);
            expect(mockQuery.offset).toHaveBeenCalledWith(0);
        });
        it('should handle large page sizes', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 6,
                num: 100,
                total: 600,
                offset: 500,
            });
            const req = new URLSearchParams('page=6&pageSize=100');
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockQuery.limit).toHaveBeenCalledWith(100);
            expect(mockQuery.offset).toHaveBeenCalledWith(500);
        });
    });
    describe('URL parameter sources', () => {
        it('should handle URL object', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 3,
                num: 15,
                total: 100,
                offset: 30,
            });
            const req = new URL('https://example.com/api/data?page=3&pageSize=15');
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockParsePaginationStats).toHaveBeenCalledWith(req);
            expect(mockQuery.limit).toHaveBeenCalledWith(15);
            expect(mockQuery.offset).toHaveBeenCalledWith(30);
        });
        it('should handle URLSearchParams object', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 3,
                num: 50,
                total: 200,
                offset: 100,
            });
            const searchParams = new URLSearchParams();
            searchParams.set('page', '3');
            searchParams.set('pageSize', '50');
            buildDrizzlePagination({
                query: mockQuery,
                req: searchParams,
            });
            expect(mockParsePaginationStats).toHaveBeenCalledWith(searchParams);
            expect(mockQuery.limit).toHaveBeenCalledWith(50);
            expect(mockQuery.offset).toHaveBeenCalledWith(100);
        });
        it('should handle PaginatedGridListRequest object', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 3,
                num: 20,
                total: 100,
                offset: 40,
            });
            const req = {
                page: 3,
                num: 20,
                total: 100,
            };
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockParsePaginationStats).toHaveBeenCalledWith(req);
            expect(mockQuery.limit).toHaveBeenCalledWith(20);
            expect(mockQuery.offset).toHaveBeenCalledWith(40);
        });
        it('should handle LikeNextRequest object', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 3,
                num: 30,
                total: 100,
                offset: 60,
            });
            const req = new Request('https://example.com/api/data?page=3&pageSize=30');
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockParsePaginationStats).toHaveBeenCalledWith(req);
            expect(mockQuery.limit).toHaveBeenCalledWith(30);
            expect(mockQuery.offset).toHaveBeenCalledWith(60);
        });
        it('should handle undefined request', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 1,
                num: 10,
                total: 100,
                offset: 0,
            });
            buildDrizzlePagination({
                query: mockQuery,
                req: undefined,
            });
            expect(mockParsePaginationStats).toHaveBeenCalledWith(undefined);
            expect(mockQuery.limit).toHaveBeenCalledWith(10);
            expect(mockQuery.offset).toHaveBeenCalledWith(0);
        });
    });
    describe('Method chaining', () => {
        it('should maintain query chain fluency', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 3,
                num: 25,
                total: 100,
                offset: 50,
            });
            const req = new URLSearchParams('page=3&pageSize=25');
            const result = buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(result).toBe(mockQuery);
            const asQuery = result;
            expect(typeof asQuery.where).toBe('function');
            expect(typeof asQuery.orderBy).toBe('function');
            expect(typeof asQuery.limit).toBe('function');
            expect(typeof asQuery.offset).toBe('function');
        });
        it('should apply pagination in the correct order (limit then offset)', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 4,
                num: 15,
                total: 100,
                offset: 45,
            });
            const req = new URLSearchParams('page=4&pageSize=15');
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockQuery.limit).toHaveBeenCalledWith(15);
            expect(mockQuery.offset).toHaveBeenCalledWith(45);
            expect(mockQuery.limit).toHaveBeenCalledTimes(1);
            expect(mockQuery.offset).toHaveBeenCalledTimes(1);
        });
    });
    describe('Edge cases', () => {
        it('should handle minimum pagination values', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 1,
                num: 1,
                total: 100,
                offset: 0,
            });
            const req = new URLSearchParams('page=1&pageSize=1');
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockQuery.limit).toHaveBeenCalledWith(1);
            expect(mockQuery.offset).toHaveBeenCalledWith(0);
        });
        it('should handle large pagination values', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 11,
                num: 1000,
                total: 20000,
                offset: 10000,
            });
            const req = new URLSearchParams('page=11&pageSize=1000');
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockQuery.limit).toHaveBeenCalledWith(1000);
            expect(mockQuery.offset).toHaveBeenCalledWith(10000);
        });
        it('should handle default pagination when no parameters provided', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 1,
                num: 50,
                total: 100,
                offset: 0,
            });
            const req = new URLSearchParams();
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockQuery.limit).toHaveBeenCalledWith(50);
            expect(mockQuery.offset).toHaveBeenCalledWith(0);
        });
    });
    describe('Integration scenarios', () => {
        it('should work with realistic pagination scenario', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 5,
                num: 25,
                total: 200,
                offset: 100,
            });
            const url = new URL('https://api.example.com/users?page=5&pageSize=25&sort=name');
            const result = buildDrizzlePagination({
                query: mockQuery,
                req: url,
            });
            expect(mockParsePaginationStats).toHaveBeenCalledWith(url);
            expect(mockQuery.limit).toHaveBeenCalledWith(25);
            expect(mockQuery.offset).toHaveBeenCalledWith(100);
            expect(result).toBe(mockQuery);
        });
        it('should work with complex request object', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 3,
                num: 10,
                total: 100,
                offset: 20,
            });
            const req = {
                page: 3,
                num: 10,
                total: 100,
                filter: {
                    items: [{ field: 'name', operator: 'contains', value: 'John' }],
                },
                sort: [{ field: 'createdAt', sort: 'desc' }],
            };
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockParsePaginationStats).toHaveBeenCalledWith(req);
            expect(mockQuery.limit).toHaveBeenCalledWith(10);
            expect(mockQuery.offset).toHaveBeenCalledWith(20);
        });
    });
    describe('Error resilience', () => {
        it('should handle when parsePaginationStats throws an error', () => {
            mockParsePaginationStats.mockImplementation(() => {
                throw new Error('Invalid pagination parameters');
            });
            const req = new URLSearchParams('invalid=params');
            expect(() => {
                buildDrizzlePagination({
                    query: mockQuery,
                    req,
                });
            }).toThrow('Invalid pagination parameters');
        });
        it('should handle when parsePaginationStats returns unexpected values', () => {
            mockParsePaginationStats.mockReturnValue({
                page: 1,
                num: -5,
                total: 0,
                offset: -10,
            });
            const req = new URLSearchParams('page=-1&pageSize=-5');
            buildDrizzlePagination({
                query: mockQuery,
                req,
            });
            expect(mockQuery.limit).toHaveBeenCalledWith(-5);
            expect(mockQuery.offset).toHaveBeenCalledWith(-10);
        });
    });
});
//# sourceMappingURL=buildDrizzlePagination.test.js.map