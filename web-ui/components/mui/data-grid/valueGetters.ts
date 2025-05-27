/**
 * Converts an unknown value to a `Date` object if possible.
 *
 * - If the input is a number, it is treated as a timestamp (milliseconds since epoch).
 * - If the input is not a number, it is converted to a string and passed to the `Date` constructor.
 * - If the input is falsy (e.g., `null`, `undefined`, `0`, `''`), returns `null`.
 *
 * @param v - The value to convert to a `Date`.
 * @returns The corresponding `Date` object, or `null` if the input is falsy.
 */
export const valueGetterDate = (v: unknown) =>
  v ? (typeof v === 'number' ? new Date(v) : new Date(String(v))) : null;

export const valueGetterPercentageFactory = ({
  base = 100,
  precision = 1,
  includePercent = true,
}: {
  base?: number;
  precision?: number;
  includePercent?: boolean;
}) => {
  return (v: unknown) => {
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
export const valueFormatterPercentageIntegerBaseTen =
  valueGetterPercentageFactory({
    base: 10,
    precision: 0,
    includePercent: true,
  });
export const valueFormatterPercentageInteger = valueGetterPercentageFactory({
  base: 1,
  precision: 0,
  includePercent: true,
});
