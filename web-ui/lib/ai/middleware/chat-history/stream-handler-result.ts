/**
 * Chat history stream handler: result factory helpers.
 *
 * This module augments a given `StreamHandlerContext` with a `createResult`
 * helper when one isn't already provided. The factory method standardizes how
 * `StreamHandlerResult` objects are produced from the context during streaming
 * pipelines, ensuring consistent defaults and override semantics.
 *
 * Behavior of `createResult`:
 * - With no argument: returns a `StreamHandlerResult` seeded from the context
 *   with `success: true`.
 * - With a boolean: returns the base result with only the `success` field set
 *   to the provided boolean.
 * - With a partial object: shallow-merges the provided fields over a base
 *   result seeded from the context. For known fields, explicit keys in the
 *   patch override the base; unspecified keys retain base values.
 *
 * Known fields merged from the context:
 * - `currentMessageId`
 * - `currentMessageOrder`
 * - `generatedText`
 * - `toolCalls`
 * - `success` (defaults to true)
 */
import type { StreamHandlerContext, StreamHandlerResult } from './types';

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
 * Contract (createResult):
 * - Input: `undefined | boolean | Partial<StreamHandlerResult>`
 * - Output: `StreamHandlerResult`
 * - Override precedence: explicit keys in the patch object win; otherwise the
 *   base value from context is preserved.
 *
 * @param context Stream handler context that may or may not include a
 * pre-defined `createResult` factory.
 * @returns A context guaranteed to include `createResult`.
 */
export const ensureCreateResult = (
  context?: MaybeCreateResultContext,
): StreamHandlerContext => {
  const thisContext = context ?? {};
  const thisCreateResult = ((successOrPatch) => {
    const isSuccessFlag = typeof successOrPatch === 'boolean';
    return {
      success: true,
      ...thisContext,
      ...(isSuccessFlag
        ? {
            success: successOrPatch as boolean,
          }
        : successOrPatch),
    } as StreamHandlerResult;
  }) as StreamHandlerContext['createResult'];
  const ret = {
    createResult: thisCreateResult,
    ...thisCreateResult(context),
  } as StreamHandlerContext;
  return ret;
};
