import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/selectForGrid';
jest.mock('@/lib/components/mui/data-grid/queryHelpers/utility', () => {
    const orig = jest.requireActual('/lib/components/mui/data-grid/queryHelpers/utility');
    return {
        ...orig,
        parsePaginationStats: jest.fn(),
    };
});
jest.mock('@/lib/components/mui/data-grid/queryHelpers', () => ({
    buildDrizzlePagination: jest.fn(),
    buildDrizzleOrderBy: jest.fn(),
    buildDrizzleQueryFilter: jest.fn(),
}));
jest.mock('/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleFilter', () => ({
    buildDrizzleQueryFilter: jest.fn(),
}));
jest.mock('/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleOrderBy', () => ({
    buildDrizzleOrderBy: jest.fn(),
}));
jest.mock('/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzlePagination', () => ({
    buildDrizzlePagination: jest.fn(),
}));
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
import { buildDrizzleOrderBy, buildDrizzlePagination, buildDrizzleQueryFilter, } from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleQueryFilter as buildDrizzleFilter } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleFilter';
import { buildDrizzleOrderBy as buildDrizzleOrder } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleOrderBy';
import { buildDrizzlePagination as buildDrizzlePage } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzlePagination';
import * as selectForGridModule from '@/lib/components/mui/data-grid/queryHelpers/drizzle/selectForGrid';
const mockCountQueryFactory = jest.fn();
const mockParsePaginationStats = parsePaginationStats;
const mockBuildDrizzleQueryFilter = buildDrizzleQueryFilter;
const mockBuildDrizzleOrderBy = buildDrizzleOrderBy;
const mockBuildDrizzlePagination = buildDrizzlePagination;
const mockBuildDrizzleFilter = buildDrizzleFilter;
const mockBuildDrizzleOrder = buildDrizzleOrder;
const mockBuildDrizzlePage = buildDrizzlePage;
describe('selectForGrid', () => {
    let mockQuery;
    let mockReq;
    let mockGetColumn;
    let mockRecordMapper;
    beforeEach(() => {
        mockReq = {
            url: 'https://example.com/api/data?page=1&pageSize=10&filter=test',
        };
        mockQuery = jest.fn();
        mockGetColumn = jest.fn().mockImplementation((name) => {
            return name === 'property_id' ? { name: 'property_id' } : undefined;
        });
        mockRecordMapper = jest
            .fn()
            .mockImplementation((record) => ({
            ...record,
            mapped: true,
        }));
        mockParsePaginationStats.mockReturnValue({
            page: 1,
            num: 10,
            offset: 0,
            total: 0,
        });
        mockBuildDrizzleQueryFilter.mockImplementation((params) => params.query);
        mockBuildDrizzleOrderBy.mockImplementation((params) => params.query);
        mockBuildDrizzlePagination.mockImplementation(() => {
            return [];
        });
        mockBuildDrizzleFilter.mockImplementation((params) => params.query);
        mockBuildDrizzleOrder.mockImplementation((params) => params.query);
        mockBuildDrizzlePage.mockImplementation(() => {
            return [];
        });
        mockCountQueryFactory.mockReturnValue({
            select: () => Promise.resolve([]),
            count: Promise.resolve(0),
        });
        jest
            .spyOn(selectForGridModule, 'countQueryFactory')
            .mockImplementation(mockCountQueryFactory);
    });
    describe('Basic functionality', () => {
        it('should apply record mapper when provided', async () => {
            const mockResults = [
                { id: 1, name: 'Test 1' },
                { id: 2, name: 'Test 2' },
            ];
            mockCountQueryFactory.mockReturnValue({
                select: mockResults,
                count: Promise.resolve(50),
            });
            mockBuildDrizzlePagination.mockImplementation(() => mockResults);
            mockBuildDrizzlePage.mockImplementation(() => mockResults);
            const result = await selectForGrid({
                req: mockReq,
                query: mockQuery,
                getColumn: mockGetColumn,
                recordMapper: mockRecordMapper,
            });
            expect(mockRecordMapper).toHaveBeenCalledTimes(2);
            expect(result.results).toEqual([
                { id: 1, name: 'Test 1', mapped: true },
                { id: 2, name: 'Test 2', mapped: true },
            ]);
        });
        it('should work without record mapper', async () => {
            const mockResults = [
                { id: 1, name: 'Test 1' },
                { id: 2, name: 'Test 2' },
            ];
            mockCountQueryFactory.mockReturnValue({
                select: mockResults,
                count: Promise.resolve(25),
            });
            mockBuildDrizzlePagination.mockImplementation(() => mockResults);
            mockBuildDrizzlePage.mockImplementation(() => mockResults);
            const result = await selectForGrid({
                req: mockReq,
                query: mockQuery,
                getColumn: mockGetColumn,
            });
            expect(result.results).toEqual(mockResults);
            expect(mockRecordMapper).not.toHaveBeenCalled();
        });
    });
    describe('Pagination handling', () => {
        it('should parse pagination stats from request URL', async () => {
            const mockResults = [];
            mockCountQueryFactory.mockReturnValue({
                select: mockResults,
                count: Promise.resolve(0),
            });
            mockBuildDrizzlePagination.mockImplementation(() => mockResults);
            mockBuildDrizzlePage.mockImplementation(() => mockResults);
            await selectForGrid({
                req: mockReq,
                query: mockQuery,
                getColumn: mockGetColumn,
            });
            expect(mockParsePaginationStats).toHaveBeenCalledWith(new URL(mockReq.url));
        });
    });
    describe('Count handling', () => {
        it('should handle empty count result', async () => {
            const mockResults = [];
            mockCountQueryFactory.mockReturnValue({
                select: mockResults,
                count: Promise.resolve(0),
            });
            mockBuildDrizzlePagination.mockImplementation(() => mockResults);
            mockBuildDrizzlePage.mockImplementation(() => mockResults);
            const result = await selectForGrid({
                req: mockReq,
                query: mockQuery,
                getColumn: mockGetColumn,
            });
            expect(result.pageStats.total).toBe(0);
        });
        it('should handle non-array count result', async () => {
            const mockResults = [];
            mockCountQueryFactory.mockReturnValue({
                select: mockResults,
                count: Promise.resolve(75),
            });
            mockBuildDrizzlePagination.mockImplementation(() => mockResults);
            mockBuildDrizzlePage.mockImplementation(() => mockResults);
            const result = await selectForGrid({
                req: mockReq,
                query: mockQuery,
                getColumn: mockGetColumn,
            });
            expect(result.pageStats.total).toBe(75);
        });
    });
    describe('Error handling', () => {
        it('should handle query execution errors', async () => {
            const error = new Error('Database connection failed');
            mockCountQueryFactory.mockReturnValue({
                select: [],
                count: Promise.resolve(0),
            });
            mockBuildDrizzlePagination.mockImplementation(() => (() => Promise.reject(error)));
            mockBuildDrizzlePage.mockImplementation(() => (() => Promise.reject(error)));
            await expect(selectForGrid({
                req: mockReq,
                query: mockQuery,
                getColumn: mockGetColumn,
            })).rejects.toThrow('Database connection failed');
        });
        it('should handle record mapper errors', async () => {
            const mockResults = [{ id: 1, name: 'Test' }];
            const error = new Error('Mapping failed');
            mockCountQueryFactory.mockReturnValue({
                select: mockResults,
                count: Promise.resolve(1),
            });
            mockBuildDrizzlePagination.mockImplementation(() => mockResults);
            mockBuildDrizzlePage.mockImplementation(() => mockResults);
            mockRecordMapper.mockImplementation(() => {
                throw error;
            });
            await expect(selectForGrid({
                req: mockReq,
                query: mockQuery,
                getColumn: mockGetColumn,
                recordMapper: mockRecordMapper,
            })).rejects.toThrow('Mapping failed');
        });
    });
    describe('Integration scenarios', () => {
        it('should work with realistic CallToActionDetails scenario', async () => {
            const mockResults = [
                {
                    propertyId: '123e4567-e89b-12d3-a456-426614174000',
                    propertyValue: 'Test call to action',
                    severity: 3,
                    inferred: false,
                    complianceRating: 4.5,
                },
            ];
            mockCountQueryFactory.mockReturnValue({
                select: mockResults,
                count: Promise.resolve(1),
            });
            mockBuildDrizzlePagination.mockImplementation(() => mockResults);
            mockBuildDrizzlePage.mockImplementation(() => mockResults);
            const ctaRecordMapper = (record) => ({
                propertyId: record.propertyId,
                value: record.propertyValue,
                severity: record.severity,
                inferred: record.inferred,
                compliance_rating: record.complianceRating,
            });
            const result = await selectForGrid({
                req: mockReq,
                query: mockQuery,
                getColumn: mockGetColumn,
                recordMapper: ctaRecordMapper,
            });
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                propertyId: '123e4567-e89b-12d3-a456-426614174000',
                value: 'Test call to action',
                severity: 3,
                inferred: false,
                compliance_rating: 4.5,
            });
        });
    });
    describe('Type safety', () => {
        it('should preserve generic type information', async () => {
            const mockResults = [{ id: 1, name: 'Test', other: 'value' }];
            mockCountQueryFactory.mockReturnValue({
                select: mockResults,
                count: Promise.resolve(1),
            });
            mockBuildDrizzlePagination.mockImplementation(() => mockResults);
            mockBuildDrizzlePage.mockImplementation(() => mockResults);
            const customMapper = (record) => ({
                id: record.id,
                name: record.name,
                custom: true,
            });
            const result = await selectForGrid({
                req: mockReq,
                query: mockQuery,
                getColumn: mockGetColumn,
                recordMapper: customMapper,
            });
            expect(result.results[0].id).toBe(1);
            expect(result.results[0].name).toBe('Test');
            expect(result.results[0].custom).toBe(true);
        });
    });
});
//# sourceMappingURL=selectForGrid.test.js.map