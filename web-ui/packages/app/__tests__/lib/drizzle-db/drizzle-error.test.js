import { isDrizzleError, errorFromCode } from '@compliance-theater/database';
import { LoggedError } from '@compliance-theater/logger';
describe('isDrizzleError and errorFromCode', () => {
    test('isDrizzleError returns true for plain object with name DrizzleError', () => {
        const o = { name: 'DrizzleError', code: '23505' };
        expect(isDrizzleError(o)).toBe(true);
    });
    test('isDrizzleError returns true for Error instance with name set', () => {
        const e = new Error('boom');
        e.name = 'DrizzleError';
        expect(isDrizzleError(e)).toBe(true);
    });
    test('isDrizzleError returns false for other shapes', () => {
        expect(isDrizzleError(undefined)).toBe(false);
        expect(isDrizzleError(null)).toBe(false);
        expect(isDrizzleError('string')).toBe(false);
        expect(isDrizzleError({ name: 'OtherError' })).toBe(false);
    });
    test('errorFromCode resolves code from DrizzleError object', () => {
        const o = { name: 'DrizzleError', code: '23505' };
        expect(errorFromCode(o)).toBe('unique_violation');
    });
    test('errorFromCode resolves when passed string code', () => {
        expect(errorFromCode('22P02')).toBe('invalid_text_representation');
    });
    test('LoggedError-wrapped DrizzleError is recognized by isDrizzleError', () => {
        const pgErr = new Error('pg error');
        pgErr.name = 'DrizzleError';
        pgErr.code = '23505';
        const wrapped = LoggedError.isTurtlesAllTheWayDownBaby(pgErr);
        expect(isDrizzleError(wrapped)).toBe(true);
    });
});
//# sourceMappingURL=drizzle-error.test.js.map