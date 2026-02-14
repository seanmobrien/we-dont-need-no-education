export const isGridSortModel = (check) => {
    if (!Array.isArray(check))
        return false;
    if (check.length === 0)
        return false;
    return check.every((item) => typeof item === 'object' && item !== null && 'field' in item);
};
export const isGridFilterModel = (check) => {
    if (check == undefined ||
        check == null ||
        typeof check !== 'object' ||
        Array.isArray(check))
        return false;
    if ('items' in check) {
        return (Array.isArray(check.items) &&
            check.items.every((item) => typeof item === 'object' &&
                item !== null &&
                'field' in item &&
                'operator' in item));
    }
    return false;
};
export const isGetGridRowsResponse = (response) => typeof response === 'object' &&
    response !== null &&
    'rows' in response &&
    Array.isArray(response.rows) &&
    response.rows.every((row) => typeof row === 'object' && row !== null);
export const isCancelledGridRowsResponse = (response) => {
    if (typeof response === 'object' && response !== null) {
        return 'cancelled' in response && response.cancelled === true;
    }
    return false;
};
//# sourceMappingURL=guards.js.map