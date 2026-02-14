import { isLikeNextRequest } from '@/lib/nextjs-util/guards';
import { log } from '@compliance-theater/logger';
import { asc, desc } from 'drizzle-orm';
import { isGridSortModel } from '../../guards';
import { columnMapFactory, parseSortOptions } from '../utility';
export const buildDrizzleOrderBy = ({ query, source, defaultSort, columnMap = {}, getColumn, }) => {
    const columnMapper = columnMapFactory(columnMap);
    const applySortModel = (sortModel) => {
        if (sortModel.length === 0) {
            return query;
        }
        const orderByExpressions = [];
        for (const sortItem of sortModel) {
            const mappedColumnName = columnMapper(sortItem.field);
            const column = getColumn(mappedColumnName);
            if (column) {
                const orderExpression = sortItem.sort === 'desc' ? desc(column) : asc(column);
                orderByExpressions.push(orderExpression);
            }
            else {
                log((l) => l.warn(`buildDrizzleOrderBy: Unknown column '${mappedColumnName}' (mapped from '${sortItem.field}')`));
            }
        }
        if (orderByExpressions.length === 0) {
            return query;
        }
        return Array.isArray(query)
            ? query
            : query.orderBy(...orderByExpressions);
    };
    const applyDefaultSort = (sort) => {
        if (typeof sort === 'string') {
            const mappedColumnName = columnMapper(sort);
            const column = getColumn(mappedColumnName);
            if (column) {
                return Array.isArray(query)
                    ? query
                    : query.orderBy(asc(column));
            }
            else {
                log((l) => l.warn(`buildDrizzleOrderBy: Unknown default sort column '${mappedColumnName}' (mapped from '${sort}')`));
                return query;
            }
        }
        else if (Array.isArray(sort)) {
            return applySortModel(sort);
        }
        else {
            return Array.isArray(query)
                ? query
                : query.orderBy(asc(sort));
        }
    };
    const sortBy = isGridSortModel(source)
        ? source
        : parseSortOptions(typeof source === 'string'
            ? (() => {
                try {
                    return new URL(source);
                }
                catch {
                    return undefined;
                }
            })()
            : isLikeNextRequest(source)
                ? new URL(source.url)
                : source);
    if (!sortBy) {
        return defaultSort ? applyDefaultSort(defaultSort) : query;
    }
    return applySortModel(sortBy);
};
export const createColumnGetter = (columns) => {
    return (columnName) => columns[columnName];
};
export const createTableColumnGetter = (table, customMappings = {}) => {
    return (columnName) => {
        if (customMappings[columnName]) {
            return customMappings[columnName];
        }
        if (!columnName.includes('-') &&
            table[columnName] &&
            typeof table[columnName] === 'object') {
            return table[columnName];
        }
        if (!columnName.includes('-')) {
            const camelCase = columnName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            if (table[camelCase] && typeof table[camelCase] === 'object') {
                return table[camelCase];
            }
            const snakeCase = columnName.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (table[snakeCase] && typeof table[snakeCase] === 'object') {
                return table[snakeCase];
            }
        }
        return undefined;
    };
};
//# sourceMappingURL=buildDrizzleOrderBy.js.map