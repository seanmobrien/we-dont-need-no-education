export const isGridSortModel = (value) => {
    if (!Array.isArray(value)) {
        return false;
    }
    return value.every(item => typeof item === 'object' &&
        item !== null &&
        'field' in item &&
        typeof item.field === 'string' &&
        'sort' in item &&
        (item.sort === 'asc' || item.sort === 'desc' || item.sort === null || item.sort === undefined));
};
export const isGridFilterModel = (value) => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const obj = value;
    return ('items' in obj &&
        Array.isArray(obj.items) &&
        obj.items.every(item => typeof item === 'object' &&
            item !== null &&
            'field' in item &&
            typeof item.field === 'string'));
};
export const isString = (value) => {
    return typeof value === 'string';
};
export const isURL = (value) => {
    return value instanceof URL;
};
//# sourceMappingURL=guards.js.map