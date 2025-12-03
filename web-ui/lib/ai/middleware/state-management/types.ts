import type {
  LanguageModelV2Middleware,
  LanguageModelV2CallOptions,
  SharedV2ProviderOptions,
} from '@ai-sdk/provider';
import { JSONValue } from 'ai';

export const STATE_PROTOCOL = {
  COLLECT: '__COLLECT_MIDDLEWARE_STATE__',
  RESTORE: '__RESTORE_MIDDLEWARE_STATE__',
  RESULTS: '__MIDDLEWARE_STATE_RESULT__',
  OPTIONS_ROOT: '9bd3f8a1-2c5f-4e5b-9c7a-6f1e2d3c4b5a',
} as const;

export type SerializableState = Record<string, JSONValue>;

export type SerializableMiddleware<
  T extends SerializableState = SerializableState,
> = {
  getMiddlewareId(props: { config: StatefulMiddlewareConfig }): string;

  serializeState(props: {
    params: StateManagementParams;
    config: StatefulMiddlewareConfig;
  }): Promise<T>;

  deserializeState(props: {
    state: T;
    params: StateManagementParams;
    config: StatefulMiddlewareConfig;
  }): Promise<void>;
};

export type SerializableLanguageModelMiddleware<
  TMiddlewareId extends string = string,
  T extends SerializableState = SerializableState,
> = LanguageModelV2Middleware &
  SerializableMiddleware<T> & {
    getMiddlewareId(props: {
      options: StatefulMiddlewareConfig;
    }): TMiddlewareId;
  };

export interface StatefulMiddlewareConfig<
  TMiddlewareId extends string = string,
> {
  middlewareId: TMiddlewareId;
}

export type StateManagementProviderOptions = Record<string, JSONValue> & {
  [STATE_PROTOCOL.RESULTS]?: Array<[string, SerializableState]>;
  [STATE_PROTOCOL.RESTORE]?: boolean;
  [STATE_PROTOCOL.COLLECT]?: boolean;
};

export interface StateManagementParams extends LanguageModelV2CallOptions {
  providerOptions?: SharedV2ProviderOptions & {
    [STATE_PROTOCOL.OPTIONS_ROOT]?: StateManagementProviderOptions;
  };
}

export type MiddlewareMetadata = {
  id: string;
  name: string;
  implementationPath: string;
  description?: string;
  supportsStateSerialization: boolean;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
};

export type BasicMiddlewareState = {
  timestamp: number;
};
