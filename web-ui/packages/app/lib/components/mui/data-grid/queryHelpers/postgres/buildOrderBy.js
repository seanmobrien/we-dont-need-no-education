import { isSqlNeonAdapter, unwrapAdapter } from '@compliance-theater/database/driver';
import { isGridSortModel } from './guards';
import { columnMapFactory, parseSortOptions } from '../utility';
export const buildOrderBy = ({ sql: sqlFromProps, source, defaultSort, columnMap = {}, }) => {
    const sql = isSqlNeonAdapter(sqlFromProps)
        ? unwrapAdapter(sqlFromProps)
        : sqlFromProps;
    const mapColumn = columnMapFactory(columnMap);
    let sortModel = [];
    if (source) {
        sortModel = parseSortOptions(source);
    }
    if (!sortModel?.length && defaultSort) {
        if (typeof defaultSort === 'string') {
            sortModel = [{ field: defaultSort, sort: 'asc' }];
        }
        else if (isGridSortModel(defaultSort)) {
            sortModel = defaultSort;
        }
    }
    if (!sortModel?.length) {
        return sql ``;
    }
    const orderClauses = sortModel.map((item) => {
        const column = mapColumn(item.field);
        const direction = item.sort === 'desc' ? 'DESC' : 'ASC';
        return sql `${column} ${direction}`;
    });
    return sql `ORDER BY ${orderClauses.join(', ')}`;
};
//# sourceMappingURL=buildOrderBy.js.map