// Include NextAuth/Auth.js module augmentations
import type { } from './types/auth';
import type { } from './types/nextauth';

export { ValidKeyValidationStatusValues } from './components/auth/key-validation-status';
export type { KeyValidationStatus } from './components/auth/key-validation-status';
export type { SessionContextType } from './components/auth/session-context-type';
export { SessionContext, useSession } from './components/auth/session-context';

export type {
  ValueOf,
  AnnotatedErrorMessageBase,
  AnnotatedErrorPart,
  AnnotatedErrorMessage,
  AnnotatedRetryMessage,
  AnnotatedMessage,
} from "./lib/ai/core/types";

export {
  isAnnotatedMessageBase,
  isAnnotatedErrorMessage,
  isAnnotatedRetryMessage,
  isAiLanguageModelType,
  isAiModelType,
  isAiProviderType,
} from "./lib/ai/core/guards";

export type {
  RetryErrorInfo,
  ChatMessage,
  ChatTurn,
  ChatDetails,
} from "./lib/ai/chat";
export {
  isChatMessage,
  isChatTurn,
  isChatDetails,
  getRetryErrorInfoKind,
} from "./lib/ai/chat";
export { getStackTrace } from "./get-stack-trace";
export { deprecate } from "./deprecate";

// Re-export commonly used types from next-auth
export type {
  Session,
  User,
  Account,
  Profile,
  AuthConfig,
} from '@auth/core/types';
export type { JWT } from '@auth/core/jwt';
export type { Adapter } from '@auth/core/adapters';
export type {
  MessagePartPreservationRules,
  MetadataPreservationOptions,
  ContentTransformationOptions,
  PreservationStrategy,
  ToolPreservationRules,
  ContextualPreservationOptions,
  PerformanceOptions,
  MessageStructureOptions,
  MessagePreservationResult,
} from './lib/ai/message-structure-preservation';

export {
  hasMessageStructureOptions,
  createPresetConfiguration,
  isPreservationEnabled,
  DEFAULT_MESSAGE_STRUCTURE_OPTIONS,
  createMessageStructureOptions,
  validateMessageStructureOptions,
  preserveMessageStructure,
} from './lib/ai/message-structure-preservation';

export type { cryptoRandomBytes } from './lib/nextjs/crypto-random-bytes';
export type { LikeNextRequest } from './lib/nextjs/types/like-nextrequest';
export type { LikeNextResponse } from './lib/nextjs/types/like-nextresponse';

export type { IsNotNull } from './types/is-not-null';
export { type EmittingDispose, withEmittingDispose } from './with-emitting-dispose';