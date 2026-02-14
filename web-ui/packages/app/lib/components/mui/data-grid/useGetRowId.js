const GridRowGetterDictionary = new Map();
export const useGetRowId = (field) => {
    let ret = GridRowGetterDictionary.get(field);
    if (!ret) {
        ret = (row) => {
            const rowId = row?.[field];
            if (!rowId) {
                throw new Error(`Row is missing required field: ${field}`);
            }
            return rowId;
        };
        GridRowGetterDictionary.set(field, ret);
    }
    return ret;
};
//# sourceMappingURL=useGetRowId.js.map