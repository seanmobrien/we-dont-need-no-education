import { isSqlNeonAdapter, unwrapAdapter, } from '@compliance-theater/database/driver';
import { isLikeNextRequest } from '@/lib/nextjs-util/guards';
import { columnMapFactory } from '../utility';
import { isGridFilterModel } from './guards';
import { isTruthy } from '@/lib/react-util/utility-methods';
export const buildAttachmentOrEmailFilter = ({ attachments, email_id, email_id_column = 'email_id', email_id_table = '', document_id_column = 'unit_id', document_id_table = '', sql: sqlFromProps, append = false, }) => {
    const sql = isSqlNeonAdapter(sqlFromProps)
        ? unwrapAdapter(sqlFromProps)
        : sqlFromProps;
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
            throw new Error('Invalid attachments parameter', { cause: attachments });
        }
        includeAttachments =
            searchParams.has('attachments') &&
                isTruthy(searchParams.get('attachments'));
    }
    const conjunction = append === true ? sql `AND` : sql `WHERE`;
    if (includeAttachments) {
        return email_id_table === ''
            ? sql `${conjunction} ${sql(email_id_column)} = ${email_id}`
            : sql `${conjunction} ${sql(email_id_table)}.${sql(email_id_column)} = ${email_id}`;
    }
    if (!document_id_table) {
        return sql `${conjunction} email_to_document_id(${email_id}) = ${sql(document_id_column)} `;
    }
    return sql `${conjunction} email_to_document_id(${email_id}) = ${sql(document_id_table)}.${sql(document_id_column)} `;
};
export const buildItemFilter = ({ item, columnMap = {}, }) => {
    const mapColumn = columnMapFactory(columnMap);
    const column = mapColumn(item.field);
    switch (item.operator) {
        case 'contains':
            return `${column} ILIKE '%${item.value}%'`;
        case 'equals':
            return `${column} = '${item.value}'`;
        case 'startsWith':
            return `${column} ILIKE '${item.value}%'`;
        case 'endsWith':
            return `${column} ILIKE '%${item.value}'`;
        case 'isEmpty':
            return `${column} IS NULL OR ${column} = ''`;
        case 'isNotEmpty':
            return `${column} IS NOT NULL AND ${column} != ''`;
        case 'isAnyOf':
            if (Array.isArray(item.value)) {
                const values = item.value.map((v) => `'${v}'`).join(', ');
                return `${column} IN (${values})`;
            }
            return `${column} = '${item.value}'`;
        default:
            return `${column} = '${item.value}'`;
    }
};
export const buildQueryFilter = ({ sql: sqlFromProps, source, defaultFilter, columnMap = {}, additional = {}, append = false, }) => {
    const sql = isSqlNeonAdapter(sqlFromProps)
        ? unwrapAdapter(sqlFromProps)
        : sqlFromProps;
    let filterModel = null;
    if (!source && defaultFilter) {
        source = defaultFilter;
    }
    if (!source) {
        return sql ``;
    }
    if (typeof source === 'string') {
        try {
            const parsed = JSON.parse(source);
            if (isGridFilterModel(parsed)) {
                filterModel = parsed;
            }
        }
        catch {
            return sql ``;
        }
    }
    else if (source instanceof URL) {
        const filterParam = source.searchParams.get('filter');
        if (filterParam && filterParam.trim()) {
            try {
                const parsed = JSON.parse(filterParam);
                if (isGridFilterModel(parsed)) {
                    filterModel = parsed;
                }
            }
            catch {
                return sql ``;
            }
        }
    }
    else if (source && isLikeNextRequest(source) && source.url) {
        const url = new URL(source.url);
        const filterParam = url.searchParams.get('filter');
        if (filterParam && filterParam.trim()) {
            try {
                const parsed = JSON.parse(filterParam);
                if (isGridFilterModel(parsed)) {
                    filterModel = parsed;
                }
            }
            catch {
                return sql ``;
            }
        }
    }
    else if (isGridFilterModel(source)) {
        filterModel = source;
    }
    if (!filterModel || !filterModel.items || filterModel.items.length === 0) {
        return sql ``;
    }
    const conditions = [];
    for (const item of filterModel.items) {
        const condition = buildItemFilter({ item, columnMap });
        if (condition) {
            conditions.push(condition);
        }
    }
    for (const [field, itemProps] of Object.entries(additional)) {
        const item = { field, ...itemProps };
        const condition = buildItemFilter({ item, columnMap });
        if (condition) {
            conditions.push(condition);
        }
    }
    if (conditions.length === 0) {
        return sql ``;
    }
    const filterWithLinkOperator = filterModel;
    const linkOperator = (filterWithLinkOperator.linkOperator ?? 'and').toLocaleLowerCase();
    const operator = linkOperator === 'or' ? ' OR ' : ' AND ';
    return sql(`${append ? 'AND ' : 'WHERE '} (${conditions.join(operator)})`);
};
//# sourceMappingURL=buildQueryFilter.js.map