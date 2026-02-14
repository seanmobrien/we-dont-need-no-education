import { AnnotatedErrorMessage, AnnotatedRetryMessage, AnnotatedErrorMessageBase } from './types';
import { AiModelType, AiLanguageModelType, AiProviderType } from './unions';
export declare const isAnnotatedMessageBase: (message: unknown) => message is AnnotatedErrorMessageBase;
export declare const isAnnotatedErrorMessage: (message: unknown) => message is AnnotatedErrorMessage;
export declare const isAnnotatedRetryMessage: (message: unknown) => message is AnnotatedRetryMessage;
export declare const isAiModelType: (value: unknown) => value is AiModelType;
export declare const isAiLanguageModelType: (value: unknown) => value is AiLanguageModelType;
export declare const isAiProviderType: (value: unknown) => value is AiProviderType;
//# sourceMappingURL=guards.d.ts.map