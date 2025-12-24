import type {
  LanguageModelV2,
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';

import { LoggedError } from '@/lib/react-util/errors/logged-error';
import type { ChatHistoryContext } from './types';
import { enqueueStream, ProcessingQueue } from './processing-queue';
import { JSONValue, simulateReadableStream, wrapLanguageModel } from 'ai';
import { MiddlewareStateManager } from '../state-management';
import { log } from '@/lib/logger';
import { ToolMap } from '../../services/model-stats/tool-map';
import { createToolOptimizingMiddleware } from '../tool-optimizing-middleware';
export type { ChatHistoryContext } from './types';
export {
  instrumentFlushOperation,
  instrumentStreamChunk,
  instrumentMiddlewareInit,
  recordQueueOperation,
  createChatHistoryError,
} from './instrumentation';
export {
  createAgentHistoryContext,
  createUserChatHistoryContext,
} from './create-chat-history-context';
export { chatIdFromParams } from './message-persistence';

const createOriginalChatHistoryMiddleware = (
  context: ChatHistoryContext,
): LanguageModelV2Middleware => {
  // Create processing queue to maintain FIFO order
  const processingQueue = new ProcessingQueue();

  return {
    wrapStream: async ({ doStream, params }) => {
      try {
        const { stream, ...rest } = await doStream();
        const streamContext = await enqueueStream({
          stream,
          params,
          context,
          processingQueue,
        });
        return {
          stream: streamContext.stream,
          ...rest,
        };
      } catch (error) {
        // Log then suppress error
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'ChatHistoryMiddleware',
          message: 'Error in streaming chat history middleware',
          critical: true,
          data: {
            chatId: context.chatId,
            turnId: context.turnId,
            context,
          },
        });
        // If middleware setup fails, still continue with the original stream
        return doStream();
      } finally {
        log((l) => l.verbose('=== ChatHistoryMiddleware.wrapStream - END ==='));
      }
    },

    wrapGenerate: async ({ doGenerate, params }) => {
      const result = await doGenerate();
      try {
        const stream: ReadableStream<LanguageModelV2StreamPart> =
          simulateReadableStream<LanguageModelV2StreamPart>({
            chunks: result.content as LanguageModelV2StreamPart[],
            chunkDelayInMs: 0,
            initialDelayInMs: 0,
          });
        const streamContext = await enqueueStream({
          stream,
          params,
          context,
          processingQueue,
        });
        streamContext.result.catch((error) => {
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'ChatHistoryMiddleware',
            message: 'Error in streaming chat history middleware',
            critical: true,
            data: {
              chatId: context.chatId,
              turnId: context.turnId,
              context,
            },
          });
        });
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'ChatHistoryMiddleware',
          message: 'Error in streaming chat history middleware',
          critical: true,
          data: {
            chatId: context.chatId,
            turnId: context.turnId,
            context,
          },
        });
      }
      return result;
    },

    transformParams: async ({ params }) => {
      // Pass tools to ToolMap for scanning/registration
      log((l) => l.verbose('ChatHistoryMiddleware.transformParams', { params }));
      const { tools = [] } = params;
      try {
        await ToolMap.getInstance().then((x) => x.scanForTools(tools));
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'ChatHistoryMiddleware',
          message: 'Error in transforming parameters',
          critical: true,
          data: {
            chatId: context.chatId,
            turnId: context.turnId,
            context,
          },
        });
        throw error;
      }
      return {
        ...params,
        tools,
      };
    },
  };
};

interface ChatHistoryState {
  currentMessageOrder: number;
  generatedText: string;
  startTime: number;
  contextData: {
    chatId?: string;
    turnId?: string;
    messageId?: string;
  };
}

export const createChatHistoryMiddleware = (
  context: ChatHistoryContext,
): LanguageModelV2Middleware => {
  // State that can be serialized/restored
  let sharedState: ChatHistoryState = {
    currentMessageOrder: 0,
    generatedText: '',
    startTime: Date.now(),
    contextData: {},
  };

  const originalMiddleware = createOriginalChatHistoryMiddleware(context);

  return MiddlewareStateManager.Instance.statefulMiddlewareWrapper<
    ChatHistoryState & Record<string, JSONValue>
  >({
    middlewareId: 'chat-history',
    middleware: originalMiddleware,
    serialize: (): Promise<ChatHistoryState & Record<string, JSONValue>> =>
      Promise.resolve({
        ...sharedState,
      }),
    deserialize: ({
      state,
    }: {
      state: ChatHistoryState & Record<string, JSONValue>;
    }) => {
      if (state) {
        sharedState = {
          ...sharedState,
          ...state,
          // Convert elapsed time back to absolute start time
          startTime: Date.now() - (state.startTime || 0),
        };

        log((l) =>
          l.debug('Chat history state restored', {
            messageOrder: sharedState.currentMessageOrder,
            textLength: sharedState.generatedText.length,
            elapsedTime: Date.now() - sharedState.startTime,
            contextData: sharedState.contextData,
          }),
        );
      }
      return Promise.resolve();
    },
  }) as LanguageModelV2Middleware;
};

export const createChatHistoryMiddlewareEx =
  createOriginalChatHistoryMiddleware;

export const wrapChatHistoryMiddleware = ({
  model,
  chatHistoryContext,
}: {
  model: LanguageModelV2;
  chatHistoryContext: ChatHistoryContext;
}) => {
  if (!chatHistoryContext) {
    throw new TypeError('chatHistoryContext is required');
  }
  if (!model) {
    throw new TypeError('model is required');
  }
  return wrapLanguageModel({
    model,
    middleware: [
      createToolOptimizingMiddleware({
        userId: chatHistoryContext.userId,
        chatHistoryId: chatHistoryContext.requestId,
        enableMessageOptimization: true,
        optimizationThreshold: 5,
        enableToolScanning: true,
      }),
      createChatHistoryMiddleware(chatHistoryContext),
    ],
  });
};
