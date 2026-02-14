import { asc, desc } from 'drizzle-orm';
import { buildDrizzleOrderBy, createColumnGetter, createTableColumnGetter, } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleOrderBy';
import { NextRequest } from 'next/server';
import { log } from '@compliance-theater/logger';
const mockLogger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};
jest.mock('@compliance-theater/logger');
jest.mock('drizzle-orm', () => ({
    asc: jest.fn((col) => ({ type: 'asc', column: col })),
    desc: jest.fn((col) => ({ type: 'desc', column: col })),
    sql: jest.fn((template, ...values) => ({ type: 'sql', template, values })),
}));
const createMockColumn = (name) => ({
    name,
    type: 'column',
    tableName: 'test_table',
    dataType: 'text',
});
const createMockSQL = (expression) => ({
    type: 'sql',
    expression,
});
const createMockQuery = () => {
    const query = {
        orderBy: jest.fn(),
        offset: jest.fn(),
        limit: jest.fn(),
        where: jest.fn(),
        prepare: jest.fn(),
        execute: jest.fn(),
        _: {},
        as: jest.fn(),
        _orderByCalls: [],
    };
    query.orderBy.mockImplementation((...columns) => {
        query._orderByCalls.push(columns);
        return query;
    });
    query.offset.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.prepare.mockReturnValue({});
    query.execute.mockResolvedValue([]);
    query.as.mockReturnValue(query);
    return query;
};
const mockColumns = {
    id: createMockColumn('id'),
    name: createMockColumn('name'),
    email: createMockColumn('email'),
    createdAt: createMockColumn('created_at'),
    updatedAt: createMockColumn('updated_at'),
};
const mockSQLExpressions = {
    fullName: createMockSQL("CONCAT(first_name, ' ', last_name)"),
    customSort: createMockSQL('custom_expression'),
};
describe('buildDrizzleOrderBy', () => {
    let mockQuery;
    beforeEach(() => {
        jest.clearAllMocks();
        log.mockImplementation((cb) => cb(mockLogger));
        mockQuery = createMockQuery();
    });
    describe('Basic functionality', () => {
        it('should return original query when no source provided', () => {
            const getColumn = (name) => mockColumns[name];
            const result = buildDrizzleOrderBy({
                query: mockQuery,
                source: undefined,
                getColumn,
            });
            expect(result).toBe(mockQuery);
            expect(mockQuery.orderBy).not.toHaveBeenCalled();
        });
        it('should apply default sort when no source provided but defaultSort specified', () => {
            const getColumn = (name) => mockColumns[name];
            const result = buildDrizzleOrderBy({
                query: mockQuery,
                source: undefined,
                defaultSort: 'name',
                getColumn,
            });
            expect(result).toBe(mockQuery);
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: mockColumns.name,
            });
        });
        it('should handle empty GridSortModel source', () => {
            const getColumn = (name) => mockColumns[name];
            const result = buildDrizzleOrderBy({
                query: mockQuery,
                source: [],
                getColumn,
            });
            expect(result).toBe(mockQuery);
            expect(mockQuery.orderBy).not.toHaveBeenCalled();
        });
    });
    describe('GridSortModel source', () => {
        it('should handle single column ascending sort', () => {
            const getColumn = (name) => mockColumns[name];
            const sortModel = [{ field: 'name', sort: 'asc' }];
            const result = buildDrizzleOrderBy({
                query: mockQuery,
                source: sortModel,
                getColumn,
            });
            expect(result).toBe(mockQuery);
            expect(asc).toHaveBeenCalledWith(mockColumns.name);
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: mockColumns.name,
            });
        });
        it('should handle single column descending sort', () => {
            const getColumn = (name) => mockColumns[name];
            const sortModel = [{ field: 'email', sort: 'desc' }];
            buildDrizzleOrderBy({
                query: mockQuery,
                source: sortModel,
                getColumn,
            });
            expect(desc).toHaveBeenCalledWith(mockColumns.email);
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'desc',
                column: mockColumns.email,
            });
        });
        it('should handle multiple column sorts', () => {
            const getColumn = (name) => mockColumns[name];
            const sortModel = [
                { field: 'name', sort: 'asc' },
                { field: 'email', sort: 'desc' },
                { field: 'createdAt', sort: 'asc' },
            ];
            buildDrizzleOrderBy({
                query: mockQuery,
                source: sortModel,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({ type: 'asc', column: mockColumns.name }, { type: 'desc', column: mockColumns.email }, { type: 'asc', column: mockColumns.createdAt });
        });
        it('should skip unknown columns and log warnings', () => {
            const getColumn = (name) => name === 'name' ? mockColumns.name : undefined;
            const sortModel = [
                { field: 'name', sort: 'asc' },
                { field: 'unknown_column', sort: 'desc' },
                { field: 'another_unknown', sort: 'asc' },
            ];
            buildDrizzleOrderBy({
                query: mockQuery,
                source: sortModel,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: mockColumns.name,
            });
            expect(mockLogger.warn).toHaveBeenCalledWith("buildDrizzleOrderBy: Unknown column 'unknown_column' (mapped from 'unknown_column')");
            expect(mockLogger.warn).toHaveBeenCalledWith("buildDrizzleOrderBy: Unknown column 'another_unknown' (mapped from 'another_unknown')");
        });
        it('should return original query when all columns are unknown', () => {
            const getColumn = () => undefined;
            const sortModel = [
                { field: 'unknown1', sort: 'asc' },
                { field: 'unknown2', sort: 'desc' },
            ];
            const result = buildDrizzleOrderBy({
                query: mockQuery,
                source: sortModel,
                getColumn,
            });
            expect(result).toBe(mockQuery);
            expect(mockQuery.orderBy).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledTimes(2);
        });
    });
    describe('URL and string sources', () => {
        it('should parse sort from URL string', () => {
            const getColumn = (name) => mockColumns[name];
            const urlString = 'https://example.com/api/data?sort=name:asc,email:desc';
            buildDrizzleOrderBy({
                query: mockQuery,
                source: urlString,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({ type: 'asc', column: mockColumns.name }, { type: 'desc', column: mockColumns.email });
        });
        it('should parse sort from URL object', () => {
            const getColumn = (name) => mockColumns[name];
            const url = new URL('https://example.com/api/data?sort=createdAt:desc');
            buildDrizzleOrderBy({
                query: mockQuery,
                source: url,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'desc',
                column: mockColumns.createdAt,
            });
        });
        it('should handle URL with no sort parameter', () => {
            const getColumn = (name) => mockColumns[name];
            const url = new URL('https://example.com/api/data');
            const result = buildDrizzleOrderBy({
                query: mockQuery,
                source: url,
                defaultSort: 'id',
                getColumn,
            });
            expect(result).toBe(mockQuery);
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: mockColumns.id,
            });
        });
        it('should handle URL with empty sort parameter', () => {
            const getColumn = (name) => mockColumns[name];
            const url = new URL('https://example.com/api/data?sort=');
            const result = buildDrizzleOrderBy({
                query: mockQuery,
                source: url,
                defaultSort: 'name',
                getColumn,
            });
            expect(result).toBe(mockQuery);
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: mockColumns.name,
            });
        });
    });
    describe('NextRequest source', () => {
        it('should parse sort from NextRequest', () => {
            const getColumn = (name) => mockColumns[name];
            const request = new NextRequest('https://example.com/api/data?sort=email:desc');
            buildDrizzleOrderBy({
                query: mockQuery,
                source: request,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'desc',
                column: mockColumns.email,
            });
        });
        it('should handle NextRequest with no url', () => {
            const getColumn = (name) => mockColumns[name];
            const request = { url: undefined };
            const result = buildDrizzleOrderBy({
                query: mockQuery,
                source: request,
                defaultSort: 'id',
                getColumn,
            });
            expect(result).toBe(mockQuery);
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: mockColumns.id,
            });
        });
    });
    describe('Column mapping', () => {
        it('should apply column mapping with object map', () => {
            const getColumn = (name) => mockColumns[name];
            const columnMap = {
                display_name: 'name',
                user_email: 'email',
            };
            const sortModel = [
                { field: 'display_name', sort: 'asc' },
                { field: 'user_email', sort: 'desc' },
            ];
            buildDrizzleOrderBy({
                query: mockQuery,
                source: sortModel,
                columnMap,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({ type: 'asc', column: mockColumns.name }, { type: 'desc', column: mockColumns.email });
        });
        it('should apply column mapping with function map', () => {
            const getColumn = (name) => mockColumns[name];
            const columnMap = (field) => {
                const mapping = {
                    frontend_name: 'name',
                    frontend_email: 'email',
                };
                return mapping[field] || field;
            };
            const sortModel = [
                { field: 'frontend_name', sort: 'desc' },
            ];
            buildDrizzleOrderBy({
                query: mockQuery,
                source: sortModel,
                columnMap,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'desc',
                column: mockColumns.name,
            });
        });
        it('should log warning with mapped column names', () => {
            const getColumn = () => undefined;
            const columnMap = { frontend_field: 'backend_field' };
            const sortModel = [
                { field: 'frontend_field', sort: 'asc' },
            ];
            buildDrizzleOrderBy({
                query: mockQuery,
                source: sortModel,
                columnMap,
                getColumn,
            });
            expect(mockLogger.warn).toHaveBeenCalledWith("buildDrizzleOrderBy: Unknown column 'backend_field' (mapped from 'frontend_field')");
        });
    });
    describe('Default sort handling', () => {
        it('should handle string default sort', () => {
            const getColumn = (name) => mockColumns[name];
            buildDrizzleOrderBy({
                query: mockQuery,
                source: undefined,
                defaultSort: 'email',
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: mockColumns.email,
            });
        });
        it('should handle GridSortModel default sort', () => {
            const getColumn = (name) => mockColumns[name];
            const defaultSort = [
                { field: 'name', sort: 'desc' },
                { field: 'email', sort: 'asc' },
            ];
            buildDrizzleOrderBy({
                query: mockQuery,
                source: undefined,
                defaultSort,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({ type: 'desc', column: mockColumns.name }, { type: 'asc', column: mockColumns.email });
        });
        it('should handle SQL expression default sort', () => {
            const getColumn = () => undefined;
            const sqlExpression = mockSQLExpressions.fullName;
            buildDrizzleOrderBy({
                query: mockQuery,
                source: undefined,
                defaultSort: sqlExpression,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: sqlExpression,
            });
        });
        it('should handle PgColumn default sort', () => {
            const getColumn = () => undefined;
            const column = mockColumns.createdAt;
            buildDrizzleOrderBy({
                query: mockQuery,
                source: undefined,
                defaultSort: column,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: column,
            });
        });
        it('should apply column mapping to string default sort', () => {
            const getColumn = (name) => mockColumns[name];
            const columnMap = { display_field: 'name' };
            buildDrizzleOrderBy({
                query: mockQuery,
                source: undefined,
                defaultSort: 'display_field',
                columnMap,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: mockColumns.name,
            });
        });
        it('should log warning for unknown default sort column', () => {
            const getColumn = () => undefined;
            const result = buildDrizzleOrderBy({
                query: mockQuery,
                source: undefined,
                defaultSort: 'unknown_column',
                getColumn,
            });
            expect(result).toBe(mockQuery);
            expect(mockQuery.orderBy).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith("buildDrizzleOrderBy: Unknown default sort column 'unknown_column' (mapped from 'unknown_column')");
        });
    });
    describe('Edge cases and error handling', () => {
        it('should handle malformed sort URL gracefully', () => {
            const getColumn = (name) => mockColumns[name];
            expect(() => {
                buildDrizzleOrderBy({
                    query: mockQuery,
                    source: 'not-a-valid-url',
                    defaultSort: 'name',
                    getColumn,
                });
            }).not.toThrow();
        });
        it('should prioritize source sort over default sort', () => {
            const getColumn = (name) => mockColumns[name];
            const sortModel = [{ field: 'email', sort: 'desc' }];
            buildDrizzleOrderBy({
                query: mockQuery,
                source: sortModel,
                defaultSort: 'name',
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'desc',
                column: mockColumns.email,
            });
            expect(mockQuery.orderBy).not.toHaveBeenCalledWith({
                type: 'asc',
                column: mockColumns.name,
            });
        });
        it('should handle getColumn function that throws errors', () => {
            const getColumn = () => {
                throw new Error('Column getter error');
            };
            expect(() => {
                buildDrizzleOrderBy({
                    query: mockQuery,
                    source: [{ field: 'name', sort: 'asc' }],
                    getColumn,
                });
            }).toThrow('Column getter error');
        });
        it('should handle null/undefined column results', () => {
            const getColumn = (name) => name === 'valid' ? mockColumns.name : null;
            const sortModel = [
                { field: 'valid', sort: 'asc' },
                { field: 'invalid', sort: 'desc' },
            ];
            buildDrizzleOrderBy({
                query: mockQuery,
                source: sortModel,
                getColumn,
            });
            expect(mockQuery.orderBy).toHaveBeenCalledWith({
                type: 'asc',
                column: mockColumns.name,
            });
            expect(mockLogger.warn).toHaveBeenCalledWith("buildDrizzleOrderBy: Unknown column 'invalid' (mapped from 'invalid')");
        });
    });
});
describe('createColumnGetter', () => {
    it('should create a getter that returns correct columns', () => {
        const columns = {
            id: mockColumns.id,
            name: mockColumns.name,
            email: mockColumns.email,
        };
        const getColumn = createColumnGetter(columns);
        expect(getColumn('id')).toBe(mockColumns.id);
        expect(getColumn('name')).toBe(mockColumns.name);
        expect(getColumn('email')).toBe(mockColumns.email);
        expect(getColumn('unknown')).toBeUndefined();
    });
    it('should handle SQL expressions in column map', () => {
        const columns = {
            name: mockColumns.name,
            full_name: mockSQLExpressions.fullName,
        };
        const getColumn = createColumnGetter(columns);
        expect(getColumn('name')).toBe(mockColumns.name);
        expect(getColumn('full_name')).toBe(mockSQLExpressions.fullName);
    });
    it('should return undefined for missing columns', () => {
        const columns = {
            name: mockColumns.name,
        };
        const getColumn = createColumnGetter(columns);
        expect(getColumn('missing')).toBeUndefined();
        expect(getColumn('')).toBeUndefined();
    });
});
describe('createTableColumnGetter', () => {
    const mockTable = {
        id: mockColumns.id,
        name: mockColumns.name,
        email: mockColumns.email,
        createdAt: mockColumns.createdAt,
        created_at: mockColumns.createdAt,
        updatedAt: mockColumns.updatedAt,
        nonColumnProperty: 'not a column',
        anotherNonColumn: 123,
    };
    it('should get columns by exact property name', () => {
        const getColumn = createTableColumnGetter(mockTable);
        expect(getColumn('id')).toBe(mockColumns.id);
        expect(getColumn('name')).toBe(mockColumns.name);
        expect(getColumn('email')).toBe(mockColumns.email);
    });
    it('should handle camelCase to snake_case conversion', () => {
        const getColumn = createTableColumnGetter(mockTable);
        expect(getColumn('created_at')).toBe(mockColumns.createdAt);
        expect(getColumn('createdAt')).toBe(mockColumns.createdAt);
    });
    it('should handle snake_case to camelCase conversion', () => {
        const getColumn = createTableColumnGetter(mockTable);
        expect(getColumn('updated_at')).toBe(mockColumns.updatedAt);
        expect(getColumn('updatedAt')).toBe(mockColumns.updatedAt);
    });
    it('should prioritize custom mappings over automatic conversions', () => {
        const customColumn = createMockColumn('custom');
        const customMappings = {
            name: customColumn,
        };
        const getColumn = createTableColumnGetter(mockTable, customMappings);
        expect(getColumn('name')).toBe(customColumn);
        expect(getColumn('email')).toBe(mockColumns.email);
    });
    it('should handle SQL expressions in custom mappings', () => {
        const customMappings = {
            full_name: mockSQLExpressions.fullName,
        };
        const getColumn = createTableColumnGetter(mockTable, customMappings);
        expect(getColumn('full_name')).toBe(mockSQLExpressions.fullName);
        expect(getColumn('name')).toBe(mockColumns.name);
    });
    it('should return undefined for non-object properties', () => {
        const getColumn = createTableColumnGetter(mockTable);
        expect(getColumn('nonColumnProperty')).toBeUndefined();
        expect(getColumn('anotherNonColumn')).toBeUndefined();
    });
    it('should return undefined for missing properties', () => {
        const getColumn = createTableColumnGetter(mockTable);
        expect(getColumn('missing')).toBeUndefined();
        expect(getColumn('')).toBeUndefined();
        expect(getColumn('unknown_field')).toBeUndefined();
    });
    it('should handle empty custom mappings', () => {
        const getColumn = createTableColumnGetter(mockTable, {});
        expect(getColumn('name')).toBe(mockColumns.name);
        expect(getColumn('email')).toBe(mockColumns.email);
    });
    it('should handle complex field name conversions', () => {
        const complexTable = {
            firstName: createMockColumn('first_name'),
            first_name: createMockColumn('first_name'),
            'user-email': createMockColumn('user_email'),
        };
        const getColumn = createTableColumnGetter(complexTable);
        expect(getColumn('firstName')).toBe(complexTable.firstName);
        expect(getColumn('first_name')).toBe(complexTable.first_name);
        expect(getColumn('user-email')).toBeUndefined();
    });
});
describe('Integration tests', () => {
    it('should work end-to-end with realistic data', () => {
        const mockQuery = createMockQuery();
        const userTable = {
            id: createMockColumn('id'),
            firstName: createMockColumn('first_name'),
            lastName: createMockColumn('last_name'),
            email: createMockColumn('email'),
            createdAt: createMockColumn('created_at'),
            updatedAt: createMockColumn('updated_at'),
        };
        const getColumn = createTableColumnGetter(userTable, {
            full_name: createMockSQL("CONCAT(first_name, ' ', last_name)"),
            display_name: userTable.firstName,
        });
        const columnMap = {
            name: 'firstName',
            created: 'createdAt',
            modified: 'updatedAt',
        };
        const url = 'https://api.example.com/users?sort=name:asc,email:desc,created:asc';
        buildDrizzleOrderBy({
            query: mockQuery,
            source: url,
            columnMap,
            getColumn,
        });
        expect(mockQuery.orderBy).toHaveBeenCalledWith({ type: 'asc', column: userTable.firstName }, { type: 'desc', column: userTable.email }, { type: 'asc', column: userTable.createdAt });
    });
    it('should handle mixed column types (regular columns and SQL expressions)', () => {
        const mockQuery = createMockQuery();
        const getColumn = (name) => {
            switch (name) {
                case 'name':
                    return mockColumns.name;
                case 'email':
                    return mockColumns.email;
                case 'full_name':
                    return mockSQLExpressions.fullName;
                case 'created_at':
                    return mockColumns.createdAt;
                default:
                    return undefined;
            }
        };
        const sortModel = [
            { field: 'full_name', sort: 'asc' },
            { field: 'email', sort: 'desc' },
            { field: 'created_at', sort: 'asc' },
        ];
        buildDrizzleOrderBy({
            query: mockQuery,
            source: sortModel,
            getColumn,
        });
        expect(mockQuery.orderBy).toHaveBeenCalledWith({ type: 'asc', column: mockSQLExpressions.fullName }, { type: 'desc', column: mockColumns.email }, { type: 'asc', column: mockColumns.createdAt });
    });
    it('should maintain query chain fluency', () => {
        const mockQuery = createMockQuery();
        const getColumn = (name) => mockColumns[name];
        const result = buildDrizzleOrderBy({
            query: mockQuery,
            source: [{ field: 'name', sort: 'asc' }],
            getColumn,
        });
        expect(result).toBe(mockQuery);
        result.limit(10).offset(20);
        expect(mockQuery.limit).toHaveBeenCalledWith(10);
        expect(mockQuery.offset).toHaveBeenCalledWith(20);
    });
});
//# sourceMappingURL=buildDrizzleOrderBy.test.js.map