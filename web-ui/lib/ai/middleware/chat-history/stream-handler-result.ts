import type { StreamHandlerContext, StreamHandlerResult } from './types';

type MaybeCreateResultContext =
  | boolean
  | (Partial<
    Omit<StreamHandlerContext, 'createResult'> &
    Pick<StreamHandlerContext, 'createResult'>>);

export const ensureCreateResult = (
  context?: MaybeCreateResultContext,
): StreamHandlerContext => {
  const thisContext = typeof context === 'boolean' ? { success: context } : context ?? {};
  const thisCreateResult = ((successOrPatch) => {
    return {
      success: true,
      ...thisContext,
      ...(typeof successOrPatch === 'boolean' ? { success: successOrPatch } : successOrPatch ?? {})
    } as StreamHandlerResult;
  }) as StreamHandlerContext['createResult'];
  return {
    createResult: thisCreateResult,
    ...thisCreateResult(context),
  };
};
