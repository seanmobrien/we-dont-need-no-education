import type { DbDatabaseType } from '@/lib/drizzle-db/schema';
export declare const QueryBuilderMethodValues: readonly ["from", "select", "where", "orderBy", "limit", "offset", "execute", "innerJoin", "fullJoin", "groupBy", "as", "leftJoin"];
export declare const InsertBuilderMethodValues: readonly ["values", "onConflictDoUpdate"];
export type InsertBuilderMethodType = (typeof InsertBuilderMethodValues)[number];
export type QueryBuilderMethodType = (typeof QueryBuilderMethodValues)[number];
export type MockDbQueryRecord = {
    rows: Record<string, unknown>[];
    state: unknown;
};
export type MockDbQueryContext = {
    db: IMockQueryBuilder;
    context: {
        current: jest.MockContext<any, any, any>;
        last: jest.MockContext<any, any, any> | undefined;
    };
    call: {
        current: jest.MockContext<any, any, any>;
        last: jest.MockContext<any, any, any> | undefined;
    };
    count: number;
    isFrom: (table: unknown) => boolean;
    from: unknown;
    query: object | undefined;
    result: Record<string, unknown>[];
    state: unknown;
};
export type MockDbQueryResult = {
    rows: Record<string, unknown>[];
    count: number;
    state?: unknown;
};
export type MockDbQueryCallbackResult = MockDbQueryResult | Record<string, unknown>[] | undefined | null | boolean;
export type MockDbQueryCallback = (context: MockDbQueryContext) => Promise<MockDbQueryCallbackResult>;
export type IMockQueryBuilder = {
    [K in QueryBuilderMethodType]: jest.Mock;
} & {
    insert(...args: any[]): IMockInsertBuilder;
    __setRecords: <T extends Record<string, unknown> = Record<string, unknown>>(v: T[] | MockDbQueryCallback, rows?: T[] | null, state?: unknown) => void;
    __getRecords: <T>() => T[];
    __resetMocks: () => void;
};
export type IMockInsertBuilder = {
    [K in InsertBuilderMethodType]: jest.Mock<IMockInsertBuilder>;
} & {
    __setRecords: <T extends Record<string, unknown> = Record<string, unknown>>(v: T[] | MockDbQueryCallback, rows?: T[] | null, state?: unknown) => void;
    __getRecords: <T>() => T[];
    __resetMocks: () => void;
};
export type DatabaseMockType = DbDatabaseType & {
    __queryBuilder: IMockQueryBuilder;
};
//# sourceMappingURL=jest.mock-drizzle.d.ts.map