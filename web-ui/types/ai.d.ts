/**
 * @fileoverview TypeScript declarations for AI SDK integration
 *
 * This module provides TypeScript type declarations for the Vercel AI SDK,
 * enabling type-safe usage of AI models and utilities throughout the application.
 * The module declaration allows importing from '@ai' and provides ambient type support.
 *
 * @example
 * ```typescript
 * import { generateText } from '@ai';
 *
 * // Type-safe AI text generation
 * const result = await generateText({
 *   model: aiModel,
 *   prompt: 'Hello, world!'
 * });
 * ```
 */

import '@ai';

declare module '@ai' {}
