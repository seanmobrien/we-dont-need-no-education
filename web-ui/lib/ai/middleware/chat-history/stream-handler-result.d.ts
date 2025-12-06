/**
 * @fileoverview Chat history stream handler: result factory helpers.
 *
 * This module augments a given `StreamHandlerContext` with a `createResult`
 * helper when one isn't already provided. The factory method standardizes how
 * `StreamHandlerResult` objects are produced from the context during streaming
 * pipelines, ensuring consistent defaults and override semantics.
 */

import type { StreamHandlerContext } from './types';

declare module '@/lib/ai/middleware/chat-history/stream-handler-result' {
  /**
   * Internal helper shape used while attaching the `createResult` factory.
   * When present, `createResult` produces a `StreamHandlerResult` based on the
   * current context with optional overrides.
   */
  type MaybeCreateResultContext =
    | boolean
    | (Omit<StreamHandlerContext, 'createResult'> &
        Pick<Partial<StreamHandlerContext>, 'createResult'>);

  /**
   * Ensures a context has a `createResult` factory.
   *
   * If `context.createResult` already exists and is a function, the context is
   * returned unchanged. Otherwise, a default implementation is attached which:
   * - Seeds a base result from the provided context fields
   *   (`currentMessageId`, `currentMessageOrder`, `generatedText`, `toolCalls`)
   *   and `success: true`.
   * - Supports a boolean argument to set only `success`.
   * - Supports a partial object argument to shallow-merge explicit overrides on
   *   top of the base (unspecified fields retain base values).
   *
   * @param context - Stream handler context that may or may not include a
   * pre-defined `createResult` factory.
   * @returns {StreamHandlerContext} A context guaranteed to include `createResult`.
   */
  export const ensureCreateResult: (
    context?: MaybeCreateResultContext,
  ) => StreamHandlerContext;
}
