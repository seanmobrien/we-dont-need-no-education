import { AccessDeniedError } from '../../src/errors/access-denied-error';

jest.mock('@compliance-theater/types/get-stack-trace', () => ({
    getStackTrace: jest.fn(() => 'mock-stack-trace'),
}));

describe('AccessDeniedError', () => {
    it('uses default message and stack trace helper', () => {
        const error = new AccessDeniedError();
        expect(error.name).toBe('AccessDeniedError');
        expect(error.message).toBe('Access denied');
        expect(error.stack).toBe('mock-stack-trace');
    });

    it('uses custom message when provided', () => {
        const error = new AccessDeniedError('blocked');
        expect(error.message).toBe('blocked');
    });

    it('type guard recognizes only AccessDeniedError instances', () => {
        expect(AccessDeniedError.isAccessDeniedError(new AccessDeniedError())).toBe(
            true,
        );
        expect(AccessDeniedError.isAccessDeniedError(new Error('x'))).toBe(false);
        expect(AccessDeniedError.isAccessDeniedError('x')).toBe(false);
    });
});
