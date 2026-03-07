/**
 * @fileoverview Root ambient type declarations for @compliance-theater/types.
 *
 * @module @compliance-theater/types
 *
 * Central hub for all TypeScript type definitions and runtime validators used throughout
 * the AI and chat subsystems. This is the primary entry point for consumers, aggregating
 * and re-exporting types, guards, and constants from specialized submodules.
 *
 * **Package Features**:
 * - **AI Core Types**: Model identifiers, provider routing, error/retry message types
 * - **Chat Session Management**: Complete domain model for conversation history
 * - **Runtime Validators**: Type guards for safe runtime validation of untyped data
 * - **Discriminated Unions**: Type-safe error handling with automatic narrowing
 * - **Constants**: Exhaustive arrays for model and provider identifiers
 *
 * @remarks
 * ## Module Organization
 *
 * The package is organized into two primary domains: AI core and chat.
 *
 * ```
 * @compliance-theater/types                    [Main entry point]
 * ├── @compliance-theater/types/ai             [AI types aggregate]
 * │   ├── @compliance-theater/types/lib/ai/core    [Model/provider types & guards]
 * │   │   ├── types.d.ts                       [Type definitions]
 * │   │   ├── unions.d.ts                      [Model & provider enums]
 * │   │   ├── guards.d.ts                      [Type validation functions]
 * │   │   └── index.d.ts                       [Module exports]
 * │   └── @compliance-theater/types/lib/ai/chat    [Chat structures & validators]
 * │       ├── types.d.ts                       [Chat type definitions]
 * │       ├── guards.d.ts                      [Chat validation functions]
 * │       └── index.d.ts                       [Module exports]
 * └── [Root index.d.ts - this file]            [Aggregates all exports]
 * ```
 *
 * ## Import Strategies
 *
 * ### Default: Import Everything
 * For most use cases, import from the main package - TypeScript will only include
 * what you actually use:
 * ```typescript
 * import type { ChatDetails, AiLanguageModelType } from '@compliance-theater/types';
 * import { isChatDetails, isAiLanguageModelType } from '@compliance-theater/types';
 * ```
 *
 * ### Domain-Specific: Import from Submodules
 * For specialized use cases (e.g., only working with AI models or only with chat),
 * import directly from the relevant submodule to avoid importing unneeded code:
 * ```typescript
 * // Only AI model types
 * import type { AiModelType } from '@compliance-theater/types/lib/ai/core';
 * import { AiModelTypeValues } from '@compliance-theater/types/lib/ai/core';
 *
 * // Only chat types
 * import type { ChatMessage, ChatTurn } from '@compliance-theater/types/lib/ai/chat';
 * import { isChatMessage, isChatTurn } from '@compliance-theater/types/lib/ai/chat';
 * ```
 *
 * ### Fine-Grained: Import from Specialized Modules
 * For maximum control, import directly from individual files:
 * ```typescript
 * import type { AiModelType } from '@compliance-theater/types/lib/ai/core/types';
 * import { AiModelTypeValues } from '@compliance-theater/types/lib/ai/core/unions';
 * import { isAiModelType } from '@compliance-theater/types/lib/ai/core/guards';
 * ```
 *
 * ## Common Patterns
 *
 * ### Pattern 1: Validate and Narrow Chat Session
 * ```typescript
 * import type { ChatDetails } from '@compliance-theater/types';
 * import { isChatDetails } from '@compliance-theater/types';
 *
 * async function restoreChat(sessionJson: string): Promise<ChatDetails> {
 *   const parsed = JSON.parse(sessionJson);
 *   if (!isChatDetails(parsed)) {
 *     throw new Error('Invalid chat session data');
 *   }
 *   return parsed; // typed as ChatDetails
 * }
 * ```
 *
 * ### Pattern 2: Exhaustive Model Configuration
 * ```typescript
 * import { AiModelTypeValues } from '@compliance-theater/types/lib/ai/core';
 *
 * // TypeScript ensures all models have configuration
 * const modelConfig = Object.fromEntries(
 *   AiModelTypeValues.map(model => [
 *     model,
 *     { timeout: 30000, maxTokens: 4096 }
 *   ])
 * );
 * ```
 *
 * ### Pattern 3: Error Classification for Retry Logic
 * ```typescript
 * import { getRetryErrorInfoKind } from '@compliance-theater/types/lib/ai/chat';
 *
 * async function callWithRetry(operation: () => Promise<any>) {
 *   const result = await operation();
 *   switch (getRetryErrorInfoKind(result)) {
 *     case 'none':
 *       return result;
 *     case 'retryable':
 *       await sleep(result.retryAfter);
 *       return callWithRetry(operation);
 *     case 'nonRetryable':
 *       throw result.error;
 *     case 'generic':
 *       console.warn('Ambiguous error:', result);
 *       return result;
 *   }
 * }
 * ```
 *
 * ### Pattern 4: Type-Safe Model Selection
 * ```typescript
 * import type { AiLanguageModelType } from '@compliance-theater/types/lib/ai/core';
 * import { isAiLanguageModelType } from '@compliance-theater/types/lib/ai/core';
 *
 * async function generateText(modelId: unknown, prompt: string): Promise<string> {
 *   if (!isAiLanguageModelType(modelId)) {
 *     throw new Error(`Model ${modelId} is not suitable for text generation`);
 *   }
 *   // modelId is now typed as AiLanguageModelType
 *   return await aiSdk.generateText({ model: modelId, prompt });
 * }
 * ```
 *
 * ## Type System Overview
 *
 * ### AI Core Types
 *
 * **Model Identification**:
 * - `AiModelType` - All models (language + embedding): 16 variants
 * - `AiLanguageModelType` - Language models only (excludes embeddings)
 * - Named constants: `AiModelTypeValue_HiFi`, `AiModelTypeValue_LoFi`, etc.
 * - Runtime array: `AiModelTypeValues` for exhaustive iteration
 *
 * **Provider Identification**:
 * - `AiProviderType` - `'azure'` | `'google'` | `'openai'`
 * - Runtime array: `AiProviderTypeValues`
 *
 * **Error/Retry Messages** (discriminated unions):
 * - `AnnotatedErrorMessage` - Immediate retry with seconds delay
 * - `AnnotatedRetryMessage` - Scheduled retry at ISO 8601 time
 * - Guards: `isAnnotatedErrorMessage()`, `isAnnotatedRetryMessage()`
 *
 * ### Chat Types
 *
 * **Structures**:
 * - `ChatMessage` - Atomic message (user, assistant, system, tool)
 * - `ChatTurn` - Logical interaction unit with ordered messages
 * - `ChatDetails` - Complete session with metadata and turns
 * - Guards: `isChatMessage()`, `isChatTurn()`, `isChatDetails()`
 *
 * **Error Handling**:
 * - `RetryErrorInfo` - Discriminated union for operation outcomes
 * - Helper: `getRetryErrorInfoKind()` - Classify into 4 categories
 *
 * ## Design Principles
 *
 * 1. **Single Source of Truth**: Type definitions are centralized; consumers import
 *    from agreed paths to ensure consistency across the codebase.
 *
 * 2. **Explicit Field Types**: No `any` types. All fields have narrow, specific types
 *    to catch errors at compile time.
 *
 * 3. **Diagnostic Fidelity**: Raw values from providers and persistence are preserved
 *    to enable retrospective debugging and audit trails.
 *
 * 4. **Forward Compatibility**: New optional fields can be added without breaking
 *    existing consumers using these types.
 *
 * 5. **Null for Serialization**: Use `null` instead of `undefined` for JSON
 *    round-trips and database symmetry. Arrays default to `null` (unknown) vs
 *    empty array (known empty).
 *
 * 6. **Runtime Validation**: Type guards validate dynamic data at module boundaries,
 *    enabling safe integration with untyped sources (JSON, APIs, legacy code).
 *
 * 7. **Exhaustive Type Checking**: Constant arrays and discriminated unions enable
 *    TypeScript's exhaustiveness checking, catching missing cases in switches/maps.
 *
 * ## Performance Considerations
 *
 * - **Type Guards on Load**: Call expensive guards (like `isChatDetails`) once on
 *   data load, then cache the result rather than repeatedly validating.
 *
 * - **Shallow vs Deep Validation**: Prefer shallow guards for hot paths; use deep
 *   guards (like `isChatTurn` with recursive message validation) only when needed.
 *
 * - **Tree-Shaking**: Import only what you need. TypeScript's module resolution and
 *   bundler tree-shaking will eliminate unused type definitions and guards.
 *
 * ## Testing Integration
 *
 * Type guards are ideal for test data validation:
 * ```typescript
 * import { isChatDetails } from '@compliance-theater/types';
 *
 * describe('ChatService', () => {
 *   it('loads and validates chat sessions', async () => {
 *     const session = await chatService.load(sessionId);
 *     expect(isChatDetails(session)).toBe(true);
 *     // session is also typed as ChatDetails for assertions
 *   });
 * });
 * ```
 *
 * ## Migration Guide (Coming from Inline Types)
 *
 * If migrating from inline type definitions scattered across the codebase:
 *
 * 1. **Import from Package**: Replace local imports with `@compliance-theater/types`
 * 2. **Use Guards at Boundaries**: Add guards where untyped data enters (API responses, etc.)
 * 3. **Remove Duplicate Validation**: Existing manual validation can be replaced with guards
 * 4. **Leverage Exhaustiveness**: Use type guards to find and handle edge cases
 *
 * ## TypeScript Version Requirements
 *
 * - **Minimum**: TypeScript 5.0+ (for advanced type features like const type parameters)
 * - **Recommended**: Latest stable (5.3+)
 *
 * ## See Also
 *
 * - [AI Core Types Module](./ai/core/index.d.ts)
 * - [Chat Types Module](./ai/chat/index.d.ts)
 * - [Repository Source](https://github.com/seanmobrien/we-dont-need-no-education/tree/main/packages/lib-types)
 *
 * @example
 * ```typescript
 * import type {
 *   // AI Core
 *   AiModelType,
 *   AiLanguageModelType,
 *   AiProviderType,
 *   AnnotatedRetryMessage,
 *   // Chat
 *   ChatDetails,
 *   ChatTurn,
 *   ChatMessage,
 *   RetryErrorInfo,
 * } from '@compliance-theater/types';
 * import {
 *   // AI Core Guards
 *   isAiLanguageModelType,
 *   isAnnotatedRetryMessage,
 *   AiModelTypeValues,
 *   // Chat Guards
 *   isChatDetails,
 *   isChatTurn,
 *   getRetryErrorInfoKind,
 * } from '@compliance-theater/types';
 *
 * // Complete type-safe workflow
 * async function initializeChat(sessionJson: string, modelId: unknown) {
 *   // Validate session
 *   const session = JSON.parse(sessionJson);
 *   if (!isChatDetails(session)) {
 *     throw new Error('Invalid session');
 *   }
 *   // session is typed as ChatDetails
 *
 *   // Validate model
 *   if (!isAiLanguageModelType(modelId)) {
 *     throw new Error('Model not suitable for text generation');
 *   }
 *   // modelId is typed as AiLanguageModelType
 *
 *   // Initialize and render
 *   const model = await initializeModel(modelId);
 *   renderChatSession(session);
 * }
 * ```
 */

import type {
  ValueOf,
  AnnotatedErrorMessageBase,
  AnnotatedErrorPart,
  AnnotatedErrorMessage,
  AnnotatedRetryMessage,
  AnnotatedMessage,
} from "./lib/ai/core/types";

import {
  isAnnotatedMessageBase,
  isAnnotatedErrorMessage,
  isAnnotatedRetryMessage,
  isAiLanguageModelType,
  isAiModelType,
  isAiProviderType,
} from "./lib/ai/core/guards";

import type {
  RetryErrorInfo,
  ChatMessage,
  ChatTurn,
  ChatDetails,
} from "./lib/ai/chat";

import {
  isChatMessage,
  isChatTurn,
  isChatDetails,
  getRetryErrorInfoKind,
} from "./lib/ai/chat";


export type {
  ValueOf,
  AnnotatedErrorMessageBase,
  AnnotatedErrorPart,
  AnnotatedErrorMessage,
  AnnotatedRetryMessage,
  AnnotatedMessage,
  RetryErrorInfo,
  ChatMessage,
  ChatTurn,
  ChatDetails,
};
export {
  isAnnotatedMessageBase,
  isAnnotatedErrorMessage,
  isAnnotatedRetryMessage,
  isAiLanguageModelType,
  isAiModelType,
  isAiProviderType,
  isChatMessage,
  isChatTurn,
  isChatDetails,
  getRetryErrorInfoKind,
};

