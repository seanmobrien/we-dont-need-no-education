import type { LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';
import { db } from '@/lib/drizzle-db/connection';
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
import { sql } from '@/lib/neondb';

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
}: {
  chatId: string;
  tableName: string;
  count?: number;
}) => {
  const scopedIds = await db.execute(
    `SELECT * FROM allocate_scoped_ids(${sql`${tableName}`}, ${chatId}, ${count})`,
  );
  return [...scopedIds.map((x) => x.scoped_id as number)];
};

export function createChatHistoryMiddleware(
  context: ChatHistoryContext,
): LanguageModelV1Middleware {
  let chatId: string | null = null;
  let currentMessageOrder = 0;
  let generatedText = '';
  const startTime: number = Date.now();

  return {
    wrapStream: async ({ doStream, params }) => {
      try {
        // Create or get chat
        // Upsert chat: if chatId exists, ensure it exists in DB or insert if new
        chatId =
          typeof context.chatId === 'string'
            ? (context.chatId ?? generateChatId().id)
            : generateChatId(context.chatId ?? 1).id;
        const existingChat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
        });

        if (!existingChat) {
          await db.insert(chats).values({
            id: chatId!,
            userId: context.userId,
            title: null, // Will be set later based on first message
            createdAt: new Date(),
            metadata: {
              model: context.model,
              temperature: context.temperature,
              topP: context.topP,
              sessionId: context.sessionId,
            },
          });
        }
        const [turnId] = await getNextSequence({
          tableName: 'chat_turns',
          chatId: chatId!,
        });
        // Create new turn
        await db.insert(chatTurns).values([
          {
            turnId: String(turnId),
            chatId,
            statusId: 1, // waiting status
            modelName: context.model,
            createdAt: new Date(),
            temperature: context.temperature,
            topP: context.topP,
            latencyMs: 0,
            warnings: [],
            errors: [],
            metadata: {
              sessionId: context.sessionId,
            },
          },
        ]);
        // Save user messages from the request

        const messageIds = await getNextSequence({
          tableName: 'chat_messages',
          chatId: chatId!,
          count: params.prompt.length + 1,
        });

        await db.insert(chatMessages).values(
          params.prompt.map((prompt, i) => {
            return {
              chatId: chatId!,
              turnId: String(turnId),
              messageId: String(messageIds[i]),
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
          turnId: turnId,
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
                      eq(chatMessages.turnId, String(turnId)),
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
                    completedAt: new Date(),
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
                      completedAt: new Date(),
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
