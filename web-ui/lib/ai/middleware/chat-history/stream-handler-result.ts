import type { StreamHandlerContext, StreamHandlerResult } from './types';

type MaybeCreateResultContext =
  | boolean
  | (Omit<StreamHandlerContext, 'createResult'> &
      Pick<Partial<StreamHandlerContext>, 'createResult'>);

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
