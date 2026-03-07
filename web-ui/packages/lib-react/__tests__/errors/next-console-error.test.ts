import { isConsoleError } from '../../src/errors/next-console-error';

const nextDigestSymbol = Symbol.for('next.console.error.digest');

describe('next-console-error', () => {
    it('returns true when digest symbol matches NEXT_CONSOLE_ERROR', () => {
        const error = {
            [nextDigestSymbol]: 'NEXT_CONSOLE_ERROR',
        };
        expect(isConsoleError(error)).toBe(true);
    });

    it('returns false for non-objects or incorrect digest', () => {
        expect(isConsoleError(null)).toBe(false);
        expect(isConsoleError('x')).toBe(false);
        expect(isConsoleError({ [nextDigestSymbol]: 'OTHER' })).toBe(false);
        expect(isConsoleError({})).toBe(false);
    });
});
