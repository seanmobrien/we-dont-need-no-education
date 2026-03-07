import { ValidationError } from '../../src/errors/validation-error';

describe('ValidationError', () => {
    it('buildMessage composes all provided parts', () => {
        const message = ValidationError.buildMessage({
            field: 'email',
            value: 'bad',
            expected: 'good',
            reason: 'format',
            source: 'validator',
        });

        expect(message).toContain("Field 'email'");
        expect(message).toContain('Value: "bad"');
        expect(message).toContain('Expected: "good"');
        expect(message).toContain('Reason: format');
        expect(message).toContain('Source: validator');
    });

    it('buildMessage falls back when options are empty', () => {
        expect(ValidationError.buildMessage({})).toBe('Validation error');
    });

    it('constructs from options and exposes getters', () => {
        const error = new ValidationError(
            {
                field: 'name',
                value: 'x',
                expected: 'y',
                reason: 'bad',
                source: 'svc',
            },
            {
                field: 'name',
                value: 'x',
                expected: 'y',
                reason: 'bad',
                source: 'svc',
            },
        );

        expect(error.name).toBe('ValidationError');
        expect(error.field).toBe('name');
        expect(error.value).toBe('x');
        expect(error.expected).toBe('y');
        expect(error.reason).toBe('bad');
        expect(error.source).toBe('svc');
        expect(error.message).toContain("Field 'name'");
    });

    it('constructs from explicit string message with default getter values', () => {
        const error = new ValidationError('manual');

        expect(error.message).toBe('manual');
        expect(error.field).toBe('');
        expect(error.reason).toBe('');
    });

    it('type guard detects branded instances only', () => {
        expect(ValidationError.isValidationError(new ValidationError('x'))).toBe(
            true,
        );
        expect(ValidationError.isValidationError(new Error('x'))).toBe(false);
        expect(ValidationError.isValidationError(undefined)).toBe(false);
    });
});
