import { isSqlNeonAdapter, unwrapAdapter } from '@compliance-theater/database/driver';
import { parsePaginationOptions } from '../utility';
export const buildPagination = ({ sql: sqlFromProps, source, defaultPageSize = 25, maxPageSize = 100, }) => {
    const sql = isSqlNeonAdapter(sqlFromProps)
        ? unwrapAdapter(sqlFromProps)
        : sqlFromProps;
    const ops = parsePaginationOptions(source, defaultPageSize, maxPageSize);
    const { offset, limit } = 'offset' in ops ? ops : { offset: 0, limit: defaultPageSize };
    return sql `LIMIT ${limit} OFFSET ${offset}`;
};
//# sourceMappingURL=buildPagination.js.map