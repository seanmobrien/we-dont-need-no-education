import { match, P } from 'ts-pattern';
import { AiModelTypeValues, AiProviderTypeValues, } from './unions';
export const isAnnotatedMessageBase = (message) => {
    return (typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        (message.type === 'data-error-notify-retry' ||
            message.type === 'data-error-retry'));
};
export const isAnnotatedErrorMessage = (message) => {
    if (!isAnnotatedMessageBase(message)) {
        return false;
    }
    return message.type === 'data-error-retry';
};
export const isAnnotatedRetryMessage = (message) => match(message)
    .with({
    type: 'data-error-notify-retry',
    data: {
        model: P.union(...AiModelTypeValues),
        retryAt: P.string.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/),
    },
}, () => true)
    .otherwise(() => false);
export const isAiModelType = (value) => typeof value === 'string' && AiModelTypeValues.includes(value);
export const isAiLanguageModelType = (value) => isAiModelType(value) && value !== 'embedding' && value !== 'google-embedding';
export const isAiProviderType = (value) => {
    return (typeof value === 'string' &&
        AiProviderTypeValues.includes(value));
};
//# sourceMappingURL=guards.js.map