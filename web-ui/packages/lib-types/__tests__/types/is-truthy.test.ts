import { isTruthy } from '../../src/types/is-truthy';

describe('isTruthy', () => {
    it('uses default value for nullish inputs', () => {
        expect(isTruthy(undefined)).toBe(false);
        expect(isTruthy(null)).toBe(false);
        expect(isTruthy(undefined, true)).toBe(true);
        expect(isTruthy(null, true)).toBe(true);
    });

    it('accepts supported truthy strings (trimmed and case-insensitive)', () => {
        expect(isTruthy('true')).toBe(true);
        expect(isTruthy(' TRUE ')).toBe(true);
        expect(isTruthy('1')).toBe(true);
        expect(isTruthy('yes')).toBe(true);
        expect(isTruthy('Y')).toBe(true);
    });

    it('returns false for unsupported strings', () => {
        expect(isTruthy('false')).toBe(false);
        expect(isTruthy('0')).toBe(false);
        expect(isTruthy('no')).toBe(false);
        expect(isTruthy('random')).toBe(false);
    });

    it('handles arrays and objects with explicit branches', () => {
        expect(isTruthy([])).toBe(false);
        expect(isTruthy([0])).toBe(true);
        expect(isTruthy({})).toBe(false);
        expect(isTruthy({ key: 'value' })).toBe(true);
    });

    it('falls back to Boolean(value) for non-string primitive values', () => {
        expect(isTruthy(0)).toBe(false);
        expect(isTruthy(2)).toBe(true);
        expect(isTruthy(false)).toBe(false);
        expect(isTruthy(true)).toBe(true);
    });
});