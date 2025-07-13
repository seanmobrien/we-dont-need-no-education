import type { LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';
import {
  chats,
  chatTurns,
  chatMessages,
  tokenUsage,
  messageStatuses,
  turnStatuses,
} from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { log } from '@/lib/logger';
import { generateChatId } from '../core';
import { db } from '@/lib/drizzle-db';

export interface ChatHistoryContext {
  userId: string;
  chatId?: string;
  sessionId?: string;
  model?: string;
  temperature?: number;
  topP?: number;
}

const getNextSequence = async ({
  chatId,
  tableName,
  count = 1,
  ...props
}:
  | {
      chatId: string;
      tableName: 'chat_turns';
      count?: number;
    }
  | {
      chatId: string;
      tableName: 'chat_messages';
      turnId: number;
      count?: number;
    }) => {
  const turnId = 'turnId' in props ? props.turnId : 0;
  const scopedIds = await db.execute(
    `SELECT * FROM allocate_scoped_ids('${tableName}', '${chatId}', ${turnId}, ${count})`,
  );
  console.log('scopedIds returns', scopedIds);
  return [...scopedIds.map((x) => x.scoped_id as number)];
};

export function createChatHistoryMiddleware(
  context: ChatHistoryContext,
): LanguageModelV1Middleware {
  console.log('create chat history');
  const chatId =
    typeof context.chatId === 'string'
      ? (context.chatId ?? generateChatId().id)
      : generateChatId(context.chatId ?? 1).id;
  let turnId: number | undefined;
  let currentMessageOrder = 0;
  let generatedText = '';
  const startTime: number = Date.now();

  return {
    wrapStream: async ({ doStream, params }) => {      
      try {        
        // Create or get chat
        // Upsert chat: if chatId exists, ensure it exists in DB or insert if new
        const existingChat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
        });
        log((l) => l.debug('Checking for existing Chat', existingChat));
        if (!existingChat) {
          await db.insert(chats).values({
            id: chatId!,
            userId: Number(context.userId),
            title: null, // Will be set later based on first message
            createdAt: new Date().toISOString(),
            metadata: {
              model: context.model,
              temperature: context.temperature,
              topP: context.topP,
              sessionId: context.sessionId,
            },
          });
          log(l => l.debug('Created new chat:', chatId));
        }
        // Reserve a chat turn sequence id
        if (!turnId) {
          turnId = await getNextSequence({
            tableName: 'chat_turns',
            chatId: chatId,
          }).then((ids) => ids[0]);
        }
        if (!turnId) {
          throw new Error('Unexpected failure retrieving next turn sequence for chat id ' + chatId);
        }
        const thisTurnId = turnId;
        // Then use it to create a new chat turn record
        log((l) =>
          l.debug(
            `Initializing storage for chat [${chatId}] turn [${turnId}].`,
          ),
        );
        await db.insert(chatTurns).values({
          turnId: thisTurnId,
          chatId: chatId,
          statusId: 1, // waiting status
          modelName: context.model,
          createdAt: new Date().toISOString(),
          temperature: context.temperature,
          topP: context.topP,
          latencyMs: 0,
          warnings: [],
          errors: [],
          metadata: {
            sessionId: context.sessionId,
          },
        });
        log((l) =>
          l.debug(
            `Successfully initialized storage for chat  [${chatId}] turn [${thisTurnId}].`,
          ),
        );
        // Read messages from previous turns
        const previousMessages = await db.query.chatMessages.findMany({
          where: eq(chatMessages.chatId, chatId),
          orderBy: (chatMessages, { asc }) => [asc(chatMessages.turnId), asc(chatMessages.messageOrder)],
          with: {
            turn: true,
          },
        });        

        // Save input in this request
        console.log('Saving user messages for turn', thisTurnId);
        const messageIds = await getNextSequence({
          tableName: 'chat_messages',
          chatId: chatId,
          turnId: thisTurnId,
          count: params.prompt.length + 1,
        });

        await db.insert(chatMessages).values(
          params.prompt.map((prompt, i) => {
            let providerId: string | null = null;
            // IMPORTANT: This logic does not scale to support parallel tool calling correctly.            
            if (prompt.role === 'tool') {
              if (Array.isArray(prompt.content) && prompt.content.length > 0) {
                providerId = prompt.content[0].toolCallId;
              }
            } else if (prompt.role === 'assistant') {
              const toolCall = prompt.content.find(x => x.type === 'tool-call');
              if (toolCall) {
                providerId = toolCall.toolCallId;
              }
            }
            return {
              chatId: chatId,
              turnId: thisTurnId,
              messageId: messageIds[i],        
              providerId,
              role: prompt.role as 'user' | 'assistant' | 'tool' | 'system',
              content:
                typeof prompt.content === 'string'
                  ? prompt.content
                  : JSON.stringify(prompt.content),
              messageOrder: currentMessageOrder++,
              statusId: 2, // complete status for user messages
            };
          }),
        );


        const { stream, ...rest } = await doStream();
        // Create assistant message placeholder
        const assistantMessageId = messageIds[messageIds.length - 1];
        await db.insert(chatMessages).values({
          chatId: chatId,
          turnId: thisTurnId,
          messageId: assistantMessageId,
          role: 'assistant',
          content: '',
          messageOrder: currentMessageOrder++,
          statusId: 1, // streaming status
        });

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
                  await db
                    .update(chatMessages)
                    .set({
                      content: generatedText,
                      statusId: 1, // still streaming
                    })
                    .where(eq(chatMessages.messageId, assistantMessageId));
                }
              } else if (chunk.type === 'tool-call') {
                // Save tool call message
                await db.insert(chatMessages).values({
                  chatId: chatId!,
                  turnId: turnId!,
                  role: 'tool',
                  messageId: await getNextSequence({
                    tableName: 'chat_messages',
                    chatId: chatId!,
                    turnId: turnId!,
                    count: 1,
                  }).then((ids) => ids[0]),
                  toolName: chunk.toolName,
                  functionCall: chunk.args,
                  messageOrder: currentMessageOrder++,
                  statusId: 2, // complete status for tool calls
                });
              } else if (chunk.type === 'finish') {
                // Save token usage if available
                if (chunk.usage && turnId) {
                  await db.insert(tokenUsage).values({
                    chatId: chatId!,
                    turnId,
                    promptTokens: chunk.usage.promptTokens,
                    completionTokens: chunk.usage.completionTokens,
                    totalTokens:
                      chunk.usage.promptTokens + chunk.usage.completionTokens,
                  });
                }
              }

              controller.enqueue(chunk);
            } catch (error) {
              log((l) =>
                l.error('Error in chat history transform', {
                  error,
                  turnId,
                  chatId,
                }),
              );
              controller.enqueue(chunk);
            }
          },

          async flush() {
            try {
              const endTime = Date.now();
              const latencyMs = endTime - startTime;

              // Mark assistant message as complete
              if (assistantMessageId) {
                await db
                  .update(chatMessages)
                  .set({
                    content: generatedText,
                    statusId: 2, // complete status
                  })
                  .where(
                    and(
                      eq(chatMessages.chatId, chatId!),
                      eq(chatMessages.turnId, turnId!),
                      eq(chatMessages.messageId, assistantMessageId),
                    ),
                  );
              }

              // Complete the turn
              if (turnId) {
                await db
                  .update(chatTurns)
                  .set({
                    statusId: 2, // complete status
                    completedAt: new Date().toISOString(),
                    latencyMs,
                  })
                  .where(
                    and(
                      eq(chatTurns.chatId, chatId!),
                      eq(chatTurns.turnId, turnId),
                    ),
                  );
              }

              // Set chat title if this is the first turn and we have content
              if (generatedText && chatId) {
                const existingTitle = await db.query.chats.findFirst({
                  where: eq(chats.id, chatId),
                  columns: { title: true },
                });

                if (!existingTitle?.title) {
                  // Use first few words as title
                  const title = generatedText.split(' ').slice(0, 6).join(' ');
                  await db
                    .update(chats)
                    .set({ title: title.substring(0, 100) })
                    .where(eq(chats.id, chatId));
                }
              }

              log((l) =>
                l.info('Chat turn completed', {
                  chatId,
                  turnId,
                  latencyMs,
                  generatedTextLength: generatedText.length,
                }),
              );
            } catch (error) {
              log((l) =>
                l.error('Error in chat history flush', {
                  error,
                  turnId,
                  chatId,
                }),
              );

              // Mark turn as error
              if (turnId) {
                try {
                  await db
                    .update(chatTurns)
                    .set({
                      statusId: 3, // error status
                      completedAt: new Date().toISOString(),
                      errors: [
                        error instanceof Error ? error.message : String(error),
                      ],
                    })
                    .where(
                      and(
                        eq(chatTurns.chatId, chatId!),
                        eq(chatTurns.turnId, turnId),
                      ),
                    );
                } catch (updateError) {
                  log((l) =>
                    l.error('Failed to update turn error status', {
                      updateError,
                      turnId,
                    }),
                  );
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
        log((l) =>
          l.error('Error initializing chat history middleware', {
            error,
            context,
          }),
        );

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
    log((l) => l.error('Failed to initialize chat history tables', { error }));
  }
}
