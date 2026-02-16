/**
 * AI Types Package
 *
 * Central exports for AI-related type definitions.
 */

export type {
  ValueOf,
  AnnotatedErrorMessageBase,
  AnnotatedErrorPart,
  AnnotatedErrorMessage,
  AnnotatedRetryMessage,
  AnnotatedMessage,
} from "./core/types";

export {
  isAnnotatedMessageBase,
  isAnnotatedErrorMessage,
  isAnnotatedRetryMessage,
  isAiLanguageModelType,
  isAiModelType,
  isAiProviderType,
} from "./core/guards";

export type {
  RetryErrorInfo,
  ChatMessage,
  ChatTurn,
  ChatDetails,
} from "./chat";
export {
  isChatMessage,
  isChatTurn,
  isChatDetails,
  getRetryErrorInfoKind,
} from "./chat";
