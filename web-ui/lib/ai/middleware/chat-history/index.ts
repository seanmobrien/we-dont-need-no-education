import type { LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';

import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import type { ChatHistoryContext, StreamHandlerContext } from './types';
import { ProcessingQueue } from './processing-queue';
import { 
  safeInitializeMessagePersistence, 
  safeCompleteMessagePersistence 
} from './message-persistence';
import { ChatMessagesType } from '@/lib/drizzle-db';
export type { ChatHistoryContext } from './types';
export { 
  instrumentFlushOperation,
  instrumentStreamChunk,
  instrumentMiddlewareInit,
  recordQueueOperation,
  createChatHistoryError
} from './instrumentation';

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
 * @returns A middleware object implementing `LanguageModelV1Middleware` for chat history management.
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
export const createChatHistoryMiddleware = (
  context: ChatHistoryContext,
): LanguageModelV1Middleware => {
  let currentMessageOrder = 0;
  let generatedText = '';
  const startTime: number = Date.now();
  
  // Create processing queue to maintain FIFO order
  const processingQueue = new ProcessingQueue();

  if (context.chatId?.indexOf('undefined') !== -1) {
    debugger;
  }

  return {
    wrapStream: async ({ doStream, params }) => {      
      // Initialize message persistence
      const persistenceInit = await safeInitializeMessagePersistence(context, params);
      if (!persistenceInit) {
        // If persistence initialization fails, continue with original stream
        return doStream();
      }

      const { chatId, turnId } = persistenceInit;
      let { messageId } = persistenceInit;
      const toolCalls: Map<string, ChatMessagesType> = new Map();
      try {
        const { stream, ...rest } = await doStream();        
        
        const transformStream = new TransformStream<
          LanguageModelV1StreamPart,
          LanguageModelV1StreamPart
        >({
          async transform(chunk, controller) {
            // Enqueue chunk immediately for maximum transparency
            // If this fails, let the error propagate - don't try again
            controller.enqueue(chunk);            
            // Process chunk through queue to maintain FIFO order
            const handlerContext: StreamHandlerContext = {
              chatId: chatId!,
              turnId: turnId!,
              toolCalls: toolCalls,
              messageId,
              currentMessageOrder,
              generatedText,
            };

            // Queue processing maintains order and updates local state
            processingQueue.enqueue(chunk, handlerContext)
              .then(() => {
                // Context is updated by the queue processor
                // Get the latest state for subsequent chunks
                currentMessageOrder = handlerContext.currentMessageOrder;
                generatedText = handlerContext.generatedText;
                messageId = handlerContext.messageId;
              })
              .catch((error: Error) => {
                log((l) =>
                  l.error('Queued chunk processing failed', {
                    error,
                    turnId,
                    chatId,
                    chunkType: chunk.type,
                    queueLength: processingQueue.getQueueLength(),
                  }),
                );
              });
          },

          async flush() {
            // Complete message persistence using shared utility
            await safeCompleteMessagePersistence({
              chatId,
              turnId,
              messageId,
              generatedText,
              startTime,
            });
          },
        });

        return {
          stream: stream.pipeThrough(transformStream),
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
            chatId,
            turnId,
            context,
          }
        });
        // If middleware setup fails, still continue with the original stream
        return doStream();
      }
    },

    wrapGenerate: async ({ doGenerate, params }) => {
      // Initialize message persistence
      const persistenceInit = await safeInitializeMessagePersistence(context, params);
      if (!persistenceInit) {
        // If persistence initialization fails, continue with original generation
        return doGenerate();
      }

      const { chatId, turnId, messageId } = persistenceInit;

      try {
        // Execute the text generation
        const result = await doGenerate();

        // Extract the generated text from the result
        const finalText = result.text || '';

        // Complete message persistence using shared utility
        await safeCompleteMessagePersistence({
          chatId,
          turnId,
          messageId,
          generatedText: finalText,
          startTime,
        });

        return result;
      } catch (error) {
        // Log then suppress error - don't break the generation
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'ChatHistoryMiddleware',
          message: 'Error in text generation chat history middleware',
          critical: true,
          data: {
            chatId,
            turnId,
            context,
          }
        });
        // If middleware setup fails, still continue with the original generation
        return doGenerate();
      }
    },

    transformParams: async ({ params }) => {
      // We can add any parameter transformations here if needed
      return params;
    },
  };
}
