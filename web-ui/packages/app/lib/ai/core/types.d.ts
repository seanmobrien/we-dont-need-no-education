import type { AiModelType } from './unions';
export type { AiModelType, AiLanguageModelType, AiProviderType, } from './unions';
export type ValueOf<ObjectType, ValueType extends keyof ObjectType = keyof ObjectType> = ObjectType[ValueType];
type DataUIPart<DATA_TYPES extends {
    [x: string]: unknown;
}> = ValueOf<{
    [NAME in keyof DATA_TYPES & string]: {
        type: `data-${NAME}`;
        id?: string;
        data: DATA_TYPES[NAME];
    };
}>;
type AnnotatedErrorMessageType = {
    'error-retry': {
        retryAfter: number;
        reason: string;
    };
    'error-notify-retry': {
        retryAt: string;
        model: AiModelType;
    };
};
export type AnnotatedErrorMessageBase = DataUIPart<AnnotatedErrorMessageType>;
export type AnnotatedErrorPart<TError extends keyof AnnotatedErrorMessageType> = DataUIPart<Pick<AnnotatedErrorMessageType, TError>>;
export type AnnotatedErrorMessage = AnnotatedErrorPart<'error-retry'>;
export type AnnotatedRetryMessage = AnnotatedErrorPart<'error-notify-retry'>;
export type AnnotatedMessage = AnnotatedErrorMessage | AnnotatedRetryMessage | AnnotatedErrorMessageBase;
//# sourceMappingURL=types.d.ts.map