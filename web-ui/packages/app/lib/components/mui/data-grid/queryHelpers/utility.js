import { isLikeNextRequest } from '@/lib/nextjs-util/guards';
import { isGridSortModel, isString, isURL } from './postgres/guards';
import { isGridFilterModel } from '../guards';
import { normalizeNullableNumeric } from '@/data-models/_utilities';
export const parseFilterOptions = (req, additional) => {
    const appendAdditional = (x) => {
        const addKeys = Object.keys(additional ?? {});
        return x.items.length === 0
            ? addKeys.length > 0
                ? {
                    ...x,
                    items: addKeys.map((key) => ({ field: key, ...additional[key] })),
                }
                : undefined
            : addKeys.length > 0
                ? {
                    ...x,
                    items: [
                        ...(x.items || []),
                        ...addKeys.map((key) => ({ field: key, ...additional[key] })),
                    ],
                }
                : x;
    };
    if (isGridFilterModel(req)) {
        return appendAdditional(req);
    }
    if (req instanceof URL) {
        req = req.searchParams;
    }
    else if (req instanceof URLSearchParams) {
    }
    else {
        return undefined;
    }
    const filterParam = req.get('filter');
    if (!filterParam)
        return appendAdditional({ items: [] });
    const check = JSON.parse(filterParam);
    if (isGridFilterModel(check)) {
        check.items = check.items.filter((x) => x.field && x.operator && x.value);
        return appendAdditional(check);
    }
    return appendAdditional({ items: [] });
};
export const columnMapFactory = (columnMap) => {
    if (typeof columnMap === 'function') {
        return columnMap;
    }
    return (sourceColumnName) => columnMap[sourceColumnName] || sourceColumnName;
};
export const parseSortOptions = (source) => {
    if (source === null) {
        return [];
    }
    if (source === undefined) {
        return undefined;
    }
    if (isGridSortModel(source)) {
        return source;
    }
    if (isString(source)) {
        if (source.trim() === '') {
            return undefined;
        }
        try {
            const parsed = JSON.parse(source);
            if (isGridSortModel(parsed)) {
                return parsed;
            }
        }
        catch {
            const extracted = source.split(',').reduce((acc, item) => {
                if (!item.trim())
                    return acc;
                const colonIndex = item.indexOf(':');
                if (colonIndex === -1) {
                    acc.push({
                        field: item.trim(),
                        sort: 'asc',
                    });
                }
                else {
                    const field = item.substring(0, colonIndex);
                    const direction = item.substring(colonIndex + 1).trim();
                    acc.push({
                        field: field,
                        sort: (direction.toLowerCase() === 'desc' ? 'desc' : 'asc'),
                    });
                }
                return acc;
            }, []);
            if (extracted.length > 0) {
                return extracted;
            }
        }
        return undefined;
    }
    if (source instanceof URLSearchParams) {
        const sortParam = source.get('sort');
        return sortParam ? parseSortOptions(sortParam) : undefined;
    }
    if (isURL(source)) {
        return parseSortOptions(source.searchParams);
    }
    if (source && isLikeNextRequest(source) && source.url) {
        const url = new URL(source.url);
        return parseSortOptions(url.searchParams);
    }
    return undefined;
};
export const parsePaginationOptions = (source, defaultPageSize = 25, maxPageSize = 100) => {
    let page = 0;
    let pageSize = defaultPageSize;
    if (!source) {
        return { offset: 0, limit: pageSize };
    }
    let searchParams;
    if (source && isString(source)) {
        try {
            const url = new URL(source);
            searchParams = url.searchParams;
        }
        catch {
        }
    }
    else if (source && isURL(source)) {
        searchParams = source.searchParams;
    }
    else if (source && isLikeNextRequest(source) && source.url) {
        const url = new URL(source.url);
        searchParams = url.searchParams;
    }
    else if (source instanceof URLSearchParams) {
        searchParams = source;
    }
    if (searchParams) {
        const pageParam = searchParams.get('page');
        const pageSizeParam = searchParams.get('pageSize');
        if (pageParam) {
            const parsedPage = parseInt(pageParam, 10);
            if (!isNaN(parsedPage) && parsedPage >= 0) {
                page = parsedPage;
            }
        }
        if (pageSizeParam) {
            const parsedPageSize = parseInt(pageSizeParam, 10);
            if (!isNaN(parsedPageSize) && parsedPageSize > 0) {
                pageSize = Math.min(parsedPageSize, maxPageSize);
            }
        }
        else {
            const numParam = searchParams.get('num');
            if (numParam !== null) {
                const numValue = parseInt(numParam, 10);
                return {
                    num: isNaN(numValue) || numValue < 1
                        ? 100
                        : Math.min(numValue, maxPageSize),
                    page: (pageParam ?? '').trim(),
                };
            }
        }
    }
    const offset = page * pageSize;
    return { offset, limit: pageSize };
};
export const parsePaginationStats = (req) => {
    let page;
    let num;
    let filter;
    let sort;
    if (isLikeNextRequest(req)) {
        req = new URL(req.url);
    }
    if (!!req && ('searchParams' in req || 'get' in req)) {
        if ('searchParams' in req) {
            req = req.searchParams;
        }
        page = req.get('page');
        num = req.get('num');
        filter = parseFilterOptions(req);
        sort = parseSortOptions(req);
    }
    else {
        if (!req) {
            page = undefined;
            num = undefined;
            filter = undefined;
            sort = undefined;
        }
        else {
            page = req.page;
            num = req.num;
            filter = req.filter;
            sort = req.sort;
        }
    }
    page = normalizeNullableNumeric(Number(page), 1) ?? 1;
    num = normalizeNullableNumeric(Number(num), 10) ?? 10;
    return {
        filter,
        sort,
        page,
        num,
        total: 0,
        offset: (page - 1) * num,
    };
};
//# sourceMappingURL=utility.js.map