import { schema } from "@/lib/drizzle-db";
import { DbTransactionType } from "@/lib/drizzle-db";
import { ChatHistoryContext } from "./types";
import { eq } from "drizzle-orm";
import { log } from "@/lib/logger";
import { getNextSequence } from "./utility";
import { generateChatId } from "@/lib/ai/core";
import { LanguageModelV1CallOptions } from "ai";

export const importIncomingMessage = async ({
  tx, 
  context,
  params: { prompt }
}: { 
  tx: DbTransactionType; 
  context: ChatHistoryContext 
  params: LanguageModelV1CallOptions;
}) => {
  const chatId =
    typeof context.chatId === 'string'
      ? (context.chatId ?? generateChatId().id)
      : generateChatId(context.chatId ?? 1).id;
  let currentMessageOrder = 0;

  // Upsert chat: if chatId exists, ensure it exists in DB or insert if new
  const existingChat =
    (
      await tx
        .select({ id: schema.chats.id })
        .from(schema.chats)
        .where(eq(schema.chats.id, chatId))
        .limit(1)
        .execute()
    ).length > 0;
  if (existingChat) {
    log((l) =>
      l.debug(`Record ${chatId} already exists; no insert necessary.`),
    );
  } else {
    await tx.insert(schema.chats).values({
      id: String(chatId),
      userId: Number(context.userId),
      title: null, // Will be set later based on first message
      createdAt: new Date().toISOString(),
      metadata: {
        model: context.model,
        temperature: context.temperature,
        topP: context.topP,
        threadId: context.chatId,
        firstRequestId: context.requestId,
      },
    });
  }

  // Generate a new turn id
  const thisTurnId = await getNextSequence({
    tableName: 'chat_turns',
    chatId: chatId,
    tx,
  }).then((ids) => ids[0]);
  if (!thisTurnId) {
    throw new Error(
      'Unexpected failure retrieving next turn sequence for chat id ' + chatId,
    );
  }
  log((l) =>
    l.debug(`Reserved chat turn id: ${thisTurnId} for chat: ${chatId}`),
  );
  await tx.insert(schema.chatTurns).values({
    chatId: String(chatId),
    turnId: Number(thisTurnId),
    providerId: context.requestId,
    statusId: 1, // waiting status
    modelName: context.model,
    createdAt: new Date().toISOString(),
    temperature: context.temperature,
    topP: context.topP,
    latencyMs: 0,
    warnings: [],
    errors: [],
    metadata: {
      requestId: context.requestId,
    },
  });
  log((l) =>
    l.debug(
      `Successfully initialized storage for chat  [${chatId}] turn [${thisTurnId}]; importing messages for this request.`,
    ),
  );
  const messageIds = await getNextSequence({
    tableName: 'chat_messages',
    chatId: chatId,
    turnId: thisTurnId,
    count: prompt.length + 1,
    tx,
  });
  if (!messageIds || messageIds.length !== prompt.length + 1) {
    throw new Error(
      `Failed to reserve enough message ids for chat ${chatId} turn ${thisTurnId}. Expected ${
        prompt.length + 1
      }, got ${messageIds?.length ?? 0}`,
    );
  } 
  await tx.insert(schema.chatMessages).values(
    prompt.map((p, i) => {
      let providerId: string | null = null;
      // IMPORTANT: This logic does not scale to support parallel tool calling correctly.            
      if (p.role === 'tool') {
        if (Array.isArray(p.content) && p.content.length > 0) {
          providerId = p.content[0].toolCallId;
        }
      } else if (p.role === 'assistant') {
        const toolCall = p.content.find(x => x.type === 'tool-call');
        if (toolCall) {
          providerId = toolCall.toolCallId;
        }
      }
      return {
        chatId: chatId,
        turnId: thisTurnId,
        messageId: messageIds[i],        
        providerId,
        role: p.role as 'user' | 'assistant' | 'tool' | 'system',
        content:
          typeof p.content === 'string'
            ? p.content
            : JSON.stringify(p.content),
        messageOrder: currentMessageOrder++,
        statusId: 2, // complete status for user messages
      };
    }),
  ).execute();
  const assistantMessageId = messageIds[messageIds.length - 1];
  const pending = await (tx.insert(schema.chatMessages).values({
      chatId: chatId,
      turnId: thisTurnId,
      messageId: assistantMessageId,
      role: 'assistant',
      content: '',
      messageOrder: currentMessageOrder++,
      statusId: 1, // streaming status
    })
    .returning()
    .execute());
  return {
    chatId,
    turnId: thisTurnId,
    messageId: assistantMessageId,
    pendingMessage: pending[0],
    nextMessageOrder: currentMessageOrder,
  };
};
