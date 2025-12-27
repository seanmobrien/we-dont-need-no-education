export type DbError = Error & {
    code: number;
    detail: string;
    severity: number | string;
    internalQuery?: string;
    where?: string;
    schema?: string;
    table?: string;
    column?: string;
    schema_name?: string;
    column_name?: string;
    table_name?: string;
    query?: string;
    internal_query?: string;
    cause?: unknown;
};
export declare const getDbError: (error: unknown) => DbError | undefined;
export declare const errorLogFactory: (props: {
    error: unknown;
    source: string;
    message?: string;
    include?: object;
    severity?: string;
} & Record<string, unknown>) => Record<string, unknown>;
//# sourceMappingURL=utilities.d.ts.map