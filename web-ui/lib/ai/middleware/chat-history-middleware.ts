import type { LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';
import { db } from '@/lib/drizzle-db/connection';
import { 
  chats, 
  chatTurns, 
  chatMessages, 
  tokenUsage,
  messageStatuses,
  turnStatuses 
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { log } from '@/lib/logger';

export interface ChatHistoryContext {
  userId: string;
  chatId?: string;
  sessionId?: string;
  model?: string;
  temperature?: number;
  topP?: number;
}

export function createChatHistoryMiddleware(context: ChatHistoryContext): LanguageModelV1Middleware {
  let chatId: string | null = null;
  let turnId: string | null = null;
  let currentMessageOrder = 0;
  let generatedText = '';
  let startTime: number = Date.now();

  return {
    wrapStream: async ({ doStream, params }) => {
      try {
        // Create or get chat
        if (context.chatId) {
          chatId = context.chatId;
        } else {
          const [newChat] = await db.insert(chats).values({
            userId: context.userId,
            title: null, // Will be set later based on first message
            metadata: {
              model: context.model,
              temperature: context.temperature,
              topP: context.topP,
            },
          }).returning();
          chatId = newChat.id;
        }

        // Create new turn
        const [newTurn] = await db.insert(chatTurns).values({
          chatId,
          statusId: 1, // waiting status
          modelName: context.model,
          temperature: context.temperature,
          topP: context.topP,
          metadata: {
            sessionId: context.sessionId,
          },
        }).returning();
        turnId = newTurn.id;

        // Save user messages from the request
        for (let i = 0; i < params.prompt.length; i++) {
          const message = params.prompt[i];
          await db.insert(chatMessages).values({
            chatId,
            turnId,
            role: message.role as any,
            content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
            messageOrder: currentMessageOrder++,
            statusId: 2, // complete status for user messages
          });
        }

        const { stream, ...rest } = await doStream();

        // Create assistant message placeholder
        let assistantMessageId: string | null = null;
        const [assistantMessage] = await db.insert(chatMessages).values({
          chatId,
          turnId,
          role: 'assistant',
          content: '',
          messageOrder: currentMessageOrder++,
          statusId: 1, // streaming status
        }).returning();
        assistantMessageId = assistantMessage.id;

        const transformStream = new TransformStream<
          LanguageModelV1StreamPart,
          LanguageModelV1StreamPart
        >({
          async transform(chunk, controller) {
            try {
              if (chunk.type === 'text-delta') {
                generatedText += chunk.textDelta;
                
                // Update the assistant message with accumulated text
                if (assistantMessageId) {
                  await db.update(chatMessages)
                    .set({ 
                      content: generatedText,
                      statusId: 1 // still streaming
                    })
                    .where(eq(chatMessages.id, assistantMessageId));
                }
              } else if (chunk.type === 'tool-call') {
                // Save tool call message
                await db.insert(chatMessages).values({
                  chatId: chatId!,
                  turnId: turnId!,
                  role: 'tool',
                  toolName: chunk.toolName,
                  functionCall: chunk.args,
                  messageOrder: currentMessageOrder++,
                  statusId: 2, // complete status for tool calls
                });
              } else if (chunk.type === 'finish') {
                // Save token usage if available
                if (chunk.usage && turnId) {
                  await db.insert(tokenUsage).values({
                    turnId,
                    promptTokens: chunk.usage.promptTokens,
                    completionTokens: chunk.usage.completionTokens,
                    totalTokens: chunk.usage.promptTokens + chunk.usage.completionTokens,
                  });
                }
              }

              controller.enqueue(chunk);
            } catch (error) {
              log((l) => l.error('Error in chat history transform', { error, turnId, chatId }));
              controller.enqueue(chunk);
            }
          },

          async flush() {
            try {
              const endTime = Date.now();
              const latencyMs = endTime - startTime;

              // Mark assistant message as complete
              if (assistantMessageId) {
                await db.update(chatMessages)
                  .set({ 
                    content: generatedText,
                    statusId: 2 // complete status
                  })
                  .where(eq(chatMessages.id, assistantMessageId));
              }

              // Complete the turn
              if (turnId) {
                await db.update(chatTurns)
                  .set({
                    statusId: 2, // complete status
                    completedAt: new Date(),
                    latencyMs,
                  })
                  .where(eq(chatTurns.id, turnId));
              }

              // Set chat title if this is the first turn and we have content
              if (generatedText && chatId) {
                const existingTitle = await db.query.chats.findFirst({
                  where: eq(chats.id, chatId),
                  columns: { title: true }
                });
                
                if (!existingTitle?.title) {
                  // Use first few words as title
                  const title = generatedText.split(' ').slice(0, 6).join(' ');
                  await db.update(chats)
                    .set({ title: title.substring(0, 100) })
                    .where(eq(chats.id, chatId));
                }
              }

              log((l) => l.info('Chat turn completed', {
                chatId,
                turnId,
                latencyMs,
                generatedTextLength: generatedText.length
              }));
            } catch (error) {
              log((l) => l.error('Error in chat history flush', { error, turnId, chatId }));
              
              // Mark turn as error
              if (turnId) {
                try {
                  await db.update(chatTurns)
                    .set({
                      statusId: 3, // error status
                      completedAt: new Date(),
                      errors: [error instanceof Error ? error.message : String(error)]
                    })
                    .where(eq(chatTurns.id, turnId));
                } catch (updateError) {
                  log((l) => l.error('Failed to update turn error status', { updateError, turnId }));
                }
              }
            }
          },
        });

        return {
          stream: stream.pipeThrough(transformStream),
          ...rest,
        };
      } catch (error) {
        log((l) => l.error('Error initializing chat history middleware', { error, context }));
        
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
    await db.insert(messageStatuses).values([
      { id: 1, code: 'streaming', description: 'Message is being generated' },
      { id: 2, code: 'complete', description: 'Message is fully completed' }
    ]).onConflictDoNothing();

    // Insert turn statuses if they don't exist
    await db.insert(turnStatuses).values([
      { id: 1, code: 'waiting', description: 'Waiting for model or tool response' },
      { id: 2, code: 'complete', description: 'Turn is complete' },
      { id: 3, code: 'error', description: 'Turn completed with error' }
    ]).onConflictDoNothing();

    log((l) => l.info('Chat history lookup tables initialized'));
  } catch (error) {
    log((l) => l.error('Failed to initialize chat history tables', { error }));
  }
}