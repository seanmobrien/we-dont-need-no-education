import { valueGetterDate } from '@/components/mui/data-grid/valueGetters';
describe('valueGetterDate', () => {
    it('should return a Date object when given a timestamp number', () => {
        const timestamp = 1609459200000;
        const result = valueGetterDate(timestamp);
        expect(result).toBeInstanceOf(Date);
        expect(result?.getTime()).toBe(timestamp);
    });
    it('should return a Date object when given a date string', () => {
        const dateString = '2021-01-01T00:00:00.000Z';
        const result = valueGetterDate(dateString);
        expect(result).toBeInstanceOf(Date);
        expect(result?.toISOString()).toBe(dateString);
    });
    it('should return a Date object when given a stringified number', () => {
        const timestamp = 1609459200000;
        const result = valueGetterDate(String(timestamp));
        expect(result).toBeInstanceOf(Date);
        expect(result?.getTime()).toBe(timestamp);
    });
    it('should return null for null, undefined, 0, or empty string', () => {
        expect(valueGetterDate(null)).toBeNull();
        expect(valueGetterDate(undefined)).toBeNull();
        expect(valueGetterDate(0)).toBeNull();
        expect(valueGetterDate('')).toBeNull();
    });
    it('should return a Date object for truthy non-number values', () => {
        const obj = { toString: () => '2021-01-01T00:00:00.000Z' };
        const result = valueGetterDate(obj);
        expect(result).toBeInstanceOf(Date);
        expect(result?.toISOString()).toBe('2021-01-01T00:00:00.000Z');
    });
    it('should return an Invalid Date for invalid input', () => {
        const invalidInput = 'not-a-date';
        const result = valueGetterDate(invalidInput);
        expect(result).toBeInstanceOf(Date);
        expect(isNaN(result.getTime())).toBe(true);
    });
});
//# sourceMappingURL=valueGetters.test.js.map