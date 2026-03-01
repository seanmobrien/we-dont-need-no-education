import {
    isAiLanguageModelType,
    isAiModelType,
    isAiProviderType,
    isAnnotatedErrorMessage,
    isAnnotatedMessageBase,
    isAnnotatedRetryMessage,
} from '../../../src/lib/ai/core/guards';

describe('lib/ai/core/guards', () => {
    it('identifies annotated message base variants', () => {
        expect(isAnnotatedMessageBase({ type: 'data-error-retry' })).toBe(true);
        expect(isAnnotatedMessageBase({ type: 'data-error-notify-retry' })).toBe(true);
        expect(isAnnotatedMessageBase({ type: 'other' })).toBe(false);
        expect(isAnnotatedMessageBase(null)).toBe(false);
        expect(isAnnotatedMessageBase('nope')).toBe(false);
    });

    it('identifies annotated error message subtype', () => {
        expect(isAnnotatedErrorMessage({ type: 'data-error-retry' })).toBe(true);
        expect(isAnnotatedErrorMessage({ type: 'data-error-notify-retry' })).toBe(false);
        expect(isAnnotatedErrorMessage({ type: 'other' })).toBe(false);
    });

    it('validates annotated retry message shape and ISO retryAt', () => {
        const valid = {
            type: 'data-error-notify-retry',
            data: {
                model: 'hifi',
                retryAt: '2026-02-28T12:00:00.000Z',
            },
        };
        expect(isAnnotatedRetryMessage(valid)).toBe(true);

        expect(
            isAnnotatedRetryMessage({
                ...valid,
                data: { ...valid.data, model: 'invalid-model' },
            })
        ).toBe(false);

        expect(
            isAnnotatedRetryMessage({
                ...valid,
                data: { ...valid.data, retryAt: 'not-iso' },
            })
        ).toBe(false);

        expect(
            isAnnotatedRetryMessage({
                ...valid,
                type: 'data-error-retry',
            })
        ).toBe(false);
    });

    it('validates model and provider predicates for representative values', () => {
        expect(isAiModelType('azure:hifi')).toBe(true);
        expect(isAiModelType('google:embedding')).toBe(true);
        expect(isAiModelType('totally-unknown')).toBe(false);

        expect(isAiLanguageModelType('hifi')).toBe(true);
        expect(isAiLanguageModelType('embedding')).toBe(false);
        expect(isAiLanguageModelType('google-embedding')).toBe(false);

        expect(isAiProviderType('azure')).toBe(true);
        expect(isAiProviderType('openai')).toBe(true);
        expect(isAiProviderType('invalid')).toBe(false);
    });
});