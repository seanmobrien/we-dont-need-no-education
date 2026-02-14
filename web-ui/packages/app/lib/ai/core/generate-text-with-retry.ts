import { isRateRetryError } from '@compliance-theater/react/errors/rate-retry-error';
import { generateText, type ToolSet } from 'ai';
import { rateLimitQueueManager } from '../middleware/key-rate-limiter/queue-manager';
import { FirstParameter } from '@compliance-theater/typescript';
import { LoggedError } from '@compliance-theater/logger';

export const generateTextWithRetry = async <
  TOOLS extends ToolSet = ToolSet,
  OUTPUT = never,
  OUTPUT_PARTIAL = never,
>({
  maxRetries = 5,
  retryTimeout,
  ...props
}: FirstParameter<typeof generateText<TOOLS, OUTPUT, OUTPUT_PARTIAL>> & {
  maxRetries?: number;
  retryTimeout?: number;
}): ReturnType<typeof generateText<TOOLS, OUTPUT>> => {
  let tries = 0;
  let retryId: string | undefined = undefined;
  while (tries < maxRetries) {
    try {
      if (retryId) {
        const response = await rateLimitQueueManager.getResponse(retryId);
        if (response?.response) {
          return response.response as ReturnType<
            typeof generateText<TOOLS, OUTPUT, OUTPUT_PARTIAL>
          >;
        } else {
          tries++;
          if (tries >= maxRetries) {
            throw new Error('Maximum number of retries exceeded');
          }
          await new Promise((resolve) => setTimeout(resolve, retryTimeout));
        }
      } else {
        const llmRet = await generateText<TOOLS, OUTPUT, OUTPUT_PARTIAL>(props);
        return llmRet;
      }
    } catch (error) {
      const normalError = LoggedError.isLoggedError(error)
        ? error.error
        : error;
      tries++;
      if (tries >= maxRetries || !isRateRetryError(normalError)) {
        throw error;
      }
      retryId = normalError.retryId;
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.max(20 * 1000, normalError.retryAfter.valueOf() - Date.now()),
        ),
      );
    }
  }
  throw new Error(`Max retries exceeded processing request`);
};
