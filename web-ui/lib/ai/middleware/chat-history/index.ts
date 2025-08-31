import type {
  LanguageModelV2,
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';

import { LoggedError } from '@/lib/react-util/errors/logged-error';
import type { ChatHistoryContext } from './types';
import { enqueueStream, ProcessingQueue } from './processing-queue';
import { simulateReadableStream, wrapLanguageModel } from 'ai';
import { createStatefulMiddleware } from '../state-management';
import { log } from '@/lib/logger';
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
/**
 * Creates a middleware for chat history management that wraps language model streaming and generation operations.
 *
 * This middleware is responsible for:
 * - Initializing message persistence for each chat turn.
 * - Maintaining FIFO order of streamed message chunks using a processing queue.
 * - Persisting generated text and message metadata upon completion of streaming or generation.
 * - Logging and suppressing errors to ensure chat operations continue even if persistence fails.
 *
 * The middleware exposes three hooks:
 * - `wrapStream`: Wraps the streaming operation, enqueues each chunk for ordered processing, and persists the final message.
 * - `wrapGenerate`: Wraps the text generation operation, persists the generated message, and handles errors gracefully.
 * - `transformParams`: Allows for transformation of parameters before processing (currently a passthrough).
 *
 * @param context - The chat history context containing persistence and logging utilities.
 * @returns A middleware object implementing `LanguageModelddleware` for chat history management.
 *
 * @remarks
 * - If message persistence initialization fails, the middleware falls back to the original stream/generation.
 * - Errors during chunk processing or message persistence are logged but do not interrupt the chat flow.
 * - The middleware is designed to be transparent and robust, ensuring chat history is reliably persisted without impacting user experience.
 *
 * @example
 * ```typescript
 * import { createChatHistoryMiddleware } from '@/lib/ai/middleware/chat-history';
 * import { myChatHistoryContext } from './my-context';
 *
 * const chatHistoryMiddleware = createChatHistoryMiddleware(myChatHistoryContext);
 *
 * // Use with your language model pipeline
 * const model = wrapModel(aiModelFactory('hifi'), [ chatHistoryMiddleware ]);
 *
 * ```
 */
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
      // We can add any parameter transformations here if needed
      return params;
    },
  };
};

/**
 * Chat History Middleware State Interface
 */
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

/**
 * Creates a middleware for chat history management with State Management Support.
 * 
 * This middleware supports the state management protocol and can participate
 * in state collection and restoration operations, preserving processing state
 * across operations.
 * 
 * @param context - The chat history context containing persistence and logging utilities.
 * @returns A stateful middleware object that supports state serialization.
 */
export const createChatHistoryMiddleware = (
  context: ChatHistoryContext,
): LanguageModelV2Middleware => {
  // State that can be serialized/restored
  let sharedState: ChatHistoryState = {
    currentMessageOrder: 0,
    generatedText: '',
    startTime: Date.now(),
    contextData: {}
  };

  const originalMiddleware = createOriginalChatHistoryMiddleware(context);

  return createStatefulMiddleware({
    middlewareId: 'chat-history',
    originalMiddleware,
    stateHandlers: {
      serialize: (): ChatHistoryState => ({
        ...sharedState,
        // Update with current values before serializing
        startTime: Date.now() - sharedState.startTime // Convert to elapsed time
      }),
      deserialize: (state: ChatHistoryState) => {
        if (state) {
          sharedState = {
            ...state,
            // Convert elapsed time back to absolute start time
            startTime: Date.now() - (state.startTime || 0)
          };
          
          log(l => l.debug('Chat history state restored', {
            messageOrder: sharedState.currentMessageOrder,
            textLength: sharedState.generatedText.length,
            elapsedTime: Date.now() - sharedState.startTime,
            contextData: sharedState.contextData
          }));
        }
      }
    }
  }) as LanguageModelV2Middleware;
};

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
    middleware: createOriginalChatHistoryMiddleware(chatHistoryContext),
  });
  });
};
