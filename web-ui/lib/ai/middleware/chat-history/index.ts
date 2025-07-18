import type { LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';
import {
  messageStatuses,
  turnStatuses,
} from '@/drizzle/schema';
import { log } from '@/lib/logger';
import { generateChatId } from '@/lib/ai/core';
import { db } from '@/lib/drizzle-db';
import { LoggedError } from '@/lib/react-util';
import type { ChatHistoryContext, StreamHandlerContext, FlushContext } from './types';
import { importIncomingMessage } from './import-incoming-message';
import { ProcessingQueue } from './processing-queue';
import { handleFlush } from './flush-handlers';
export type { ChatHistoryContext } from './types';



export function createChatHistoryMiddleware(
  context: ChatHistoryContext,
): LanguageModelV1Middleware {  
  const chatId =
    typeof context.chatId === 'string'
      ? (context.chatId ?? generateChatId().id)
      : context.chatId
        ? generateChatId(Number(context.chatId)).id
        : generateChatId().id;
  let turnId: number | undefined;
  let currentMessageOrder = 0;
  let generatedText = '';
  const startTime: number = Date.now();
  
  // Create processing queue to maintain FIFO order
  const processingQueue = new ProcessingQueue();

  return {
    wrapStream: async ({ doStream, params }) => {      
      try {        
        // Create or get chat
        const  {
          chatId,
          turnId,
          messageId,
        } = await db.transaction(async (tx) => importIncomingMessage({
          tx,
          context,
          params,
        }));

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
            try {
              // Create flush context for utility function
              const flushContext: FlushContext = {
                chatId: chatId!,
                turnId,
                messageId,
                generatedText,
                startTime,
              };

              // Handle flush using extracted utility function
              const result = await handleFlush(flushContext);

              if (!result.success && result.error) {
                throw result.error;
              }
            } catch (error) {
              log((l) =>
                l.error('Error in chat history flush', {
                  error,
                  turnId,
                  chatId,
                }),
              );

              // The flush handler already attempts to mark turn as error
              // If that fails, this is our last resort logging
            }
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
          message: 'Error initializing chat history middleware',
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

    transformParams: async ({ params }) => {
      // We can add any parameter transformations here if needed
      return params;
    },
  };
}

// Utility function to initialize the lookup tables with default values
export async function initializeChatHistoryTables() {
  try {
    // Insert message statuses if they don't exist
    await db
      .insert(messageStatuses)
      .values([
        { id: 1, code: 'streaming', description: 'Message is being generated' },
        { id: 2, code: 'complete', description: 'Message is fully completed' },
      ])
      .onConflictDoNothing();
 } catch (error) {
     LoggedError.isTurtlesAllTheWayDownBaby(error, {
       log: true,
       source: 'ChatHistoryMiddleware',
       message: 'Failed to initialize chat message status table',
       critical: true,
     });    
  }
  try {
    // Insert turn statuses if they don't exist
    await db
      .insert(turnStatuses)
      .values([
        {
          id: 1,
          code: 'waiting',
          description: 'Waiting for model or tool response',
        },
        { id: 2, code: 'complete', description: 'Turn is complete' },
        { id: 3, code: 'error', description: 'Turn completed with error' },
      ])
      .onConflictDoNothing();

    log((l) => l.info('Chat history lookup tables initialized'));
  } catch (error) {
     LoggedError.isTurtlesAllTheWayDownBaby(error, {
       log: true,
       source: 'ChatHistoryMiddleware',
       message: 'Failed to initialize chat turn status table',
       critical: true,
     });    
  }
}
