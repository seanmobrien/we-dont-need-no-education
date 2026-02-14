import { isLikeNextRequest } from '@/lib/nextjs-util/guards';
import { and, or, eq, ne, ilike, isNull, isNotNull, inArray, notInArray, gt, lt, gte, lte, between, notBetween, sql, } from 'drizzle-orm';
import { isGridFilterModel } from '../../guards';
import { columnMapFactory, parseFilterOptions } from '../utility';
import { isTruthy } from '@/lib/react-util/utility-methods';
import { schema } from '@compliance-theater/database/orm';
import { log } from '@compliance-theater/logger';
export const appendFilter = ({ query, append, }) => {
    if (typeof append === 'undefined' || !append.queryChunks?.length) {
        return query;
    }
    const anyQuery = query;
    if (!anyQuery._?.config?.where?.queryChunks?.length) {
        return anyQuery.where(append);
    }
    const left = anyQuery._.config.where;
    const right = append;
    if (left && right) {
        const combinedQuery = and(left, right);
        if (combinedQuery) {
            return anyQuery.where(combinedQuery);
        }
    }
    return query;
};
export const buildDrizzleAttachmentOrEmailFilter = ({ attachments, email_id, email_id_column, document_id_column, emailToDocumentIdFn, }) => {
    if (!email_id) {
        return undefined;
    }
    let includeAttachments = true;
    if (typeof attachments === 'boolean') {
        includeAttachments = attachments;
    }
    else if (typeof attachments === 'object' && attachments !== null) {
        let searchParams;
        if (attachments instanceof URL) {
            searchParams = attachments.searchParams;
        }
        else if (attachments instanceof URLSearchParams) {
            searchParams = attachments;
        }
        else if (isLikeNextRequest(attachments)) {
            searchParams = new URL(attachments.url).searchParams;
        }
        else {
            const asObj = attachments;
            if (asObj && asObj.url && typeof asObj.url === 'string') {
                try {
                    searchParams = new URL(asObj.url).searchParams;
                }
                catch {
                    throw new Error('Invalid attachments parameter', {
                        cause: attachments,
                    });
                }
            }
            else {
                throw new Error('Invalid attachments parameter', {
                    cause: attachments,
                });
            }
        }
        if (!searchParams.has('attachments')) {
            includeAttachments = true;
        }
        else {
            includeAttachments = isTruthy(searchParams.get('attachments'));
        }
    }
    if (!email_id_column) {
        email_id_column = schema.documentUnits.emailId;
    }
    if (includeAttachments) {
        if ('table' in email_id_column) {
            return eq(email_id_column, email_id);
        }
        else {
            return eq(email_id_column, sql `${email_id}`);
        }
    }
    if (emailToDocumentIdFn) {
        if ('table' in document_id_column) {
            return eq(document_id_column, emailToDocumentIdFn(email_id));
        }
        else {
            return eq(document_id_column, emailToDocumentIdFn(email_id));
        }
    }
    else {
        if ('table' in document_id_column) {
            return eq(document_id_column, sql `email_to_document_id(${email_id})`);
        }
        else {
            return eq(document_id_column, sql `email_to_document_id(${email_id})`);
        }
    }
};
export const buildDrizzleItemFilter = ({ item, getColumn, columnMap = {}, }) => {
    const columnMapper = columnMapFactory(columnMap);
    const mappedField = columnMapper(item.field);
    const column = getColumn(mappedField);
    if (!column) {
        log((l) => l.warn(`buildDrizzleItemFilter: Unknown column '${mappedField}' (mapped from '${item.field}')`));
        return undefined;
    }
    switch (item.operator) {
        case 'equals':
            return 'table' in column
                ? eq(column, item.value)
                : eq(sql `${column}`, item.value);
        case 'notEquals':
            return 'table' in column
                ? ne(column, item.value)
                : ne(sql `${column}`, item.value);
        case 'contains':
            return ilike(column, `%${item.value}%`);
        case 'notContains':
            return sql `${column} NOT ILIKE ${`%${item.value}%`}`;
        case 'startsWith':
            return ilike(column, `${item.value}%`);
        case 'endsWith':
            return ilike(column, `%${item.value}`);
        case 'isEmpty':
            return or(isNull(column), 'table' in column ? eq(column, '') : eq(sql `${column}`, ''));
        case 'isNotEmpty':
            return and(isNotNull(column), 'table' in column ? ne(column, '') : ne(sql `${column}`, ''));
        case 'isAnyOf':
            return 'table' in column
                ? inArray(column, item.value)
                : inArray(sql `${column}`, item.value);
        case 'isNoneOf':
            return 'table' in column
                ? notInArray(column, item.value)
                : notInArray(sql `${column}`, item.value);
        case 'isGreaterThan':
            return 'table' in column
                ? gt(column, item.value)
                : gt(sql `${column}`, item.value);
        case 'isLessThan':
            return 'table' in column
                ? lt(column, item.value)
                : lt(sql `${column}`, item.value);
        case 'isGreaterThanOrEqual':
            return 'table' in column
                ? gte(column, item.value)
                : gte(sql `${column}`, item.value);
        case 'isLessThanOrEqual':
            return 'table' in column
                ? lte(column, item.value)
                : lte(sql `${column}`, item.value);
        case 'isBetween':
            return 'table' in column
                ? between(column, item.value[0], item.value[1])
                : between(sql `${column}`, item.value[0], item.value[1]);
        case 'isNotBetween':
            return 'table' in column
                ? notBetween(column, item.value[0], item.value[1])
                : notBetween(sql `${column}`, item.value[0], item.value[1]);
        case 'isNull':
            return isNull(column);
        case 'isNotNull':
            return isNotNull(column);
        case 'in':
            return sql `${item.value} = ANY(${column})`;
        default:
            throw new Error(`Unsupported operator: ${item.operator}`, {
                cause: item,
            });
    }
};
export const buildDrizzleQueryFilter = ({ query, source, getColumn, defaultFilter, columnMap = {}, additional, }) => {
    const parseFilterFromSource = (src) => {
        if (isGridFilterModel(src)) {
            return src;
        }
        if (typeof src === 'string') {
            try {
                const url = new URL(src);
                return parseFilterOptions(url.searchParams, additional);
            }
            catch {
                return undefined;
            }
        }
        if (src instanceof URL) {
            return parseFilterOptions(src.searchParams, additional);
        }
        if (isLikeNextRequest(src)) {
            try {
                const url = new URL(src.url);
                return parseFilterOptions(url.searchParams, additional);
            }
            catch {
                return undefined;
            }
        }
        return undefined;
    };
    let filterModel = parseFilterFromSource(source);
    if (!filterModel && defaultFilter) {
        filterModel = parseFilterFromSource(defaultFilter);
    }
    if (!filterModel || !filterModel.items || filterModel.items.length === 0) {
        return query;
    }
    const conditions = [];
    for (const item of filterModel.items) {
        const condition = buildDrizzleItemFilter({ item, getColumn, columnMap });
        if (condition) {
            conditions.push(condition);
        }
    }
    if (conditions.length === 0) {
        return query;
    }
    const logicOperator = filterModel.logicOperator || 'and';
    const combinedCondition = logicOperator === 'or' ? or(...conditions) : and(...conditions);
    return appendFilter({
        query,
        append: combinedCondition,
    });
};
//# sourceMappingURL=buildDrizzleFilter.js.map