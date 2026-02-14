export const valueGetterDate = (v) => {
    if (v) {
        if (typeof v === 'number' && !isNaN(v)) {
            return new Date(v);
        }
        if (typeof v === 'string' && v.trim() !== '') {
            const check = new Date(v);
            if (isNaN(check.getTime())) {
                return new Date(Number(v));
            }
            return check;
        }
        if (v instanceof Date) {
            return v;
        }
        if (typeof v === 'object' && v !== null) {
            return new Date(String(v));
        }
    }
    return null;
};
export const valueGetterPercentageFactory = ({ base = 100, precision = 1, includePercent = true, }) => {
    return (v) => {
        if (v === null || v === undefined) {
            return null;
        }
        if (typeof v === 'string') {
            const parsedValue = parseFloat(v);
            if (!isNaN(parsedValue)) {
                v = parsedValue;
            }
        }
        if (typeof v === 'number') {
            return includePercent
                ? `${(v * base).toFixed(precision)}%`
                : (v * base).toFixed(precision);
        }
        return null;
    };
};
export const valueFormatterPercentageDecimal = valueGetterPercentageFactory({
    base: 100,
    precision: 1,
});
export const valueFormatterPercentageIntegerBaseTen = valueGetterPercentageFactory({
    base: 10,
    precision: 0,
    includePercent: true,
});
export const valueFormatterPercentageInteger = valueGetterPercentageFactory({
    base: 1,
    precision: 0,
    includePercent: true,
});
//# sourceMappingURL=valueGetters.js.map