import { chatMessages, chatTurns, tokenUsage } from '@compliance-theater/database/schema';
import { eq, and } from 'drizzle-orm';
import { drizDb, schema, } from '@compliance-theater/database/orm';
import { log, LoggedError } from '@compliance-theater/logger';
import { getNextSequence } from './utility';
import { ensureCreateResult } from './stream-handler-result';
import { reserveMessageIds, upsertToolMessage, } from './import-incoming-message';
import { StreamProcessor } from './stream-processor';
const flushMessageParts = async ({ context, }) => {
    const { messageId, chatId, turnId, generatedJSON, currentMessageOrder } = context;
    if (!generatedJSON || !generatedJSON.length) {
        return;
    }
    await drizDb().transaction(async (tx) => {
        try {
            let thisMessageId;
            if (!messageId) {
                const [tempMessageId] = await reserveMessageIds(tx, chatId, Number(turnId), 1);
                thisMessageId = tempMessageId;
                context.messageId = thisMessageId;
            }
            else {
                thisMessageId = messageId;
            }
            await tx
                .insert(schema.chatMessages)
                .values({
                chatId: chatId,
                turnId: Number(turnId),
                messageId: thisMessageId,
                role: 'assistant',
                content: JSON.stringify(generatedJSON),
                messageOrder: currentMessageOrder,
                statusId: 2,
            })
                .returning()
                .execute();
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                data: {
                    chatId,
                    turnId,
                    messageId,
                    generatedJSON,
                },
            });
        }
    });
    context.messageId = undefined;
    context.currentMessageOrder++;
    context.generatedJSON = [];
};
const completePendingMessage = async ({ tx, messageId, chatId, turnId, }) => {
    if (!messageId) {
        throw new Error('No messageId provided to completePendingMessage');
    }
    await tx
        .update(chatMessages)
        .set({
        statusId: 2,
    })
        .where(and(eq(chatMessages.chatId, chatId), eq(chatMessages.turnId, turnId), eq(chatMessages.messageId, messageId)));
    return true;
};
const findPendingToolCall = async ({ chunk: { toolCallId, toolName }, toolCalls, chatId, tx, }) => {
    let pendingCall = toolCalls.get(toolCallId) ??
        (await tx
            .select()
            .from(chatMessages)
            .where(and(eq(chatMessages.chatId, chatId), eq(chatMessages.providerId, toolCallId)))
            .limit(1)
            .execute()
            .then((x) => x.at(0)));
    if (!pendingCall) {
        const maybeMatch = toolCalls.get('[missing]');
        if (maybeMatch && maybeMatch.toolName === toolName) {
            pendingCall = maybeMatch;
            pendingCall.providerId = toolCallId;
            toolCalls.set(pendingCall.providerId, pendingCall);
            toolCalls.delete('[missing]');
        }
    }
    return pendingCall;
};
const setTurnError = async ({ tx, chatId, turnId, chunk, }) => {
    try {
        const turn = await tx
            .select({
            errors: chatTurns.errors,
            statusId: chatTurns.statusId,
        })
            .from(chatTurns)
            .where(and(eq(chatTurns.chatId, chatId), eq(chatTurns.turnId, turnId)))
            .limit(1)
            .execute()
            .then((x) => x.at(0));
        if (!turn) {
            log((l) => l.warn('Turn not found when saving tool result', { chatId, turnId }));
            return;
        }
        await tx
            .update(chatTurns)
            .set({
            errors: [
                ...(turn.errors ? Array.from(turn.errors) : []),
                JSON.stringify(chunk.output),
            ],
            statusId: 3,
        })
            .where(and(eq(chatTurns.chatId, chatId), eq(chatTurns.turnId, turnId)));
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            data: {
                chatId,
                turnId,
                toolName: chunk.toolName,
                providerId: chunk.toolCallId,
            },
            message: 'Error setting turn error from tool result',
        });
    }
};
export class ChatHistoryStreamProcessor extends StreamProcessor {
    async processToolCall(chunk, context) {
        ensureCreateResult(context);
        try {
            const { chatId, turnId, generatedText, currentMessageOrder, toolCalls } = context;
            await drizDb().transaction(async (tx) => {
                await flushMessageParts({ context });
                let parsedInput = undefined;
                const rawInput = (chunk.input ?? '').toString();
                const trimmed = rawInput.trim();
                if (trimmed.length > 0) {
                    try {
                        parsedInput = JSON.parse(rawInput);
                    }
                    catch {
                        parsedInput = undefined;
                    }
                }
                const toolRow = {
                    role: 'tool',
                    statusId: 1,
                    content: generatedText,
                    toolName: chunk.toolName,
                    functionCall: parsedInput ?? null,
                    providerId: chunk.toolCallId,
                    metadata: null,
                    toolResult: null,
                };
                let upsertedMessageId = null;
                try {
                    upsertedMessageId = await upsertToolMessage(tx, chatId, Number(turnId), toolRow);
                }
                catch (error) {
                    log((l) => l.debug(`Tool message upsert failed, falling back to creation: ${error}`));
                    upsertedMessageId = null;
                }
                let toolCall = null;
                let actualMessageId;
                if (upsertedMessageId !== null) {
                    actualMessageId = upsertedMessageId;
                    try {
                        const existingMessages = await tx
                            .select()
                            .from(chatMessages)
                            .where(and(eq(chatMessages.chatId, chatId), eq(chatMessages.messageId, actualMessageId)))
                            .limit(1)
                            .execute();
                        toolCall = existingMessages[0] || null;
                    }
                    catch (error) {
                        log((l) => l.debug(`Failed to fetch updated tool message, creating mock: ${error}`));
                        toolCall = {
                            chatMessageId: 1,
                            messageId: actualMessageId,
                            providerId: chunk.toolCallId,
                            toolName: chunk.toolName,
                            role: 'tool',
                            content: generatedText,
                            functionCall: parsedInput ?? null,
                        };
                    }
                }
                else {
                    const nextMessageId = await getNextSequence({
                        tx,
                        tableName: 'chat_messages',
                        chatId,
                        turnId: Number(turnId),
                        count: 1,
                    }).then((ids) => ids[0]);
                    actualMessageId = nextMessageId;
                    toolCall = (await tx
                        .insert(chatMessages)
                        .values({
                        chatId,
                        turnId: Number(turnId),
                        role: 'tool',
                        content: generatedText,
                        messageId: nextMessageId,
                        providerId: chunk.toolCallId,
                        toolName: chunk.toolName,
                        functionCall: parsedInput ?? null,
                        messageOrder: currentMessageOrder,
                        statusId: 1,
                        metadata: { modifiedTurnId: Number(turnId) },
                    })
                        .returning()
                        .execute()).at(0);
                }
                if (toolCall) {
                    if (!toolCall.providerId) {
                        log((l) => l.warn('Tool call was not assigned a provider id, result resolution may fail.', toolCall));
                    }
                    toolCalls.set(toolCall.providerId ?? '[missing]', toolCall);
                    log((l) => l.debug(`Tool message handled for providerId ${chunk.toolCallId}: ${upsertedMessageId !== null ? 'updated' : 'created'} messageId ${actualMessageId}`));
                }
                else {
                    log((l) => l.error('Failed to create or update tool call message', {
                        log: true,
                        data: {
                            chatId,
                            turnId,
                            toolName: chunk.toolName,
                            args: chunk.input,
                            generatedText,
                            wasUpsert: upsertedMessageId !== null,
                        },
                    }));
                }
            });
            return context.createResult({
                currentMessageId: undefined,
                currentMessageOrder: currentMessageOrder + 1,
                generatedText: '',
            });
        }
        catch (error) {
            log((l) => l.error('Error handling tool-call chunk', {
                error,
                turnId: context.turnId,
                chatId: context.chatId,
                toolName: chunk.toolName,
                args: chunk.input,
            }));
            return context.createResult(false);
        }
    }
    async processToolResult(chunk, context) {
        ensureCreateResult(context);
        try {
            const { chatId, turnId, generatedText, messageId, toolCalls } = context;
            flushMessageParts({ context });
            await drizDb().transaction(async (tx) => {
                await completePendingMessage({
                    tx,
                    messageId,
                    chatId,
                    turnId: Number(turnId),
                });
                let pendingCall = await findPendingToolCall({
                    chatId,
                    toolCalls,
                    chunk,
                    tx,
                });
                if (!pendingCall && chunk.toolCallId) {
                    const toolRow = {
                        role: 'tool',
                        statusId: 2,
                        content: generatedText,
                        toolName: chunk.toolName,
                        functionCall: null,
                        providerId: chunk.toolCallId,
                        metadata: null,
                        toolResult: chunk.output !== undefined ? JSON.stringify(chunk.output) : null,
                    };
                    const upsertedMessageId = await upsertToolMessage(tx, chatId, Number(turnId), toolRow);
                    if (upsertedMessageId !== null) {
                        try {
                            const existingMessages = await tx
                                .select()
                                .from(chatMessages)
                                .where(and(eq(chatMessages.chatId, chatId), eq(chatMessages.messageId, upsertedMessageId)))
                                .limit(1)
                                .execute();
                            pendingCall = existingMessages[0] || null;
                            log((l) => l.debug(`Tool result upserted for providerId ${chunk.toolCallId}, messageId: ${upsertedMessageId}`));
                        }
                        catch (error) {
                            log((l) => l.debug(`Failed to fetch upserted tool message: ${error}`));
                        }
                    }
                }
                if (pendingCall) {
                    const metadata = pendingCall.metadata
                        ? { ...pendingCall.metadata }
                        : {};
                    let statusId = 2;
                    if (chunk.output.type === 'error-json' ||
                        chunk.output.type === 'error-text') {
                        statusId = 3;
                        metadata.toolErrorResult = chunk.output;
                        await setTurnError({ tx, chatId, turnId: Number(turnId), chunk });
                    }
                    if (chunk.providerOptions) {
                        metadata.toolResultProviderMeta = chunk.providerOptions;
                    }
                    metadata.modifiedTurnId = Number(turnId);
                    await tx
                        .update(chatMessages)
                        .set({
                        statusId,
                        toolResult: chunk.output !== undefined
                            ? JSON.stringify(chunk.output)
                            : null,
                        metadata: metadata,
                        content: `${pendingCall.content ?? ''}\n${generatedText}`,
                    })
                        .where(and(eq(chatMessages.chatId, chatId), eq(chatMessages.turnId, Number(turnId)), eq(chatMessages.messageId, pendingCall.messageId)));
                }
                else {
                    log((l) => l.warn('No pending tool call found for chunk and upsert failed', {
                        chatId,
                        turnId,
                        toolName: chunk.toolName,
                        providerId: chunk.toolCallId,
                    }));
                }
            });
            return context.createResult({
                currentMessageId: undefined,
                generatedText: '',
            });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                data: {
                    chatId: context.chatId,
                    turnId: context.turnId,
                    toolName: chunk.toolName,
                    providerId: chunk.toolCallId,
                },
                message: 'Error handling tool-result chunk',
            });
            return context.createResult(false);
        }
    }
    async processFinish(chunk, context) {
        ensureCreateResult(context);
        try {
            if (chunk.usage &&
                context.turnId &&
                ((chunk.usage.inputTokens ?? 0) > 0 ||
                    (chunk.usage.outputTokens ?? 0) > 0 ||
                    context.messageId !== undefined)) {
                await drizDb().transaction(async (tx) => {
                    if (context.messageId) {
                        await tx
                            .update(chatMessages)
                            .set({
                            statusId: 2,
                        })
                            .where(and(eq(chatMessages.chatId, context.chatId), eq(chatMessages.turnId, Number(context.turnId)), eq(chatMessages.messageId, context.messageId)));
                    }
                    await tx.insert(tokenUsage).values({
                        chatId: context.chatId,
                        turnId: Number(context.turnId),
                        promptTokens: chunk.usage.inputTokens,
                        completionTokens: chunk.usage.outputTokens,
                        totalTokens: chunk.usage.totalTokens,
                    });
                });
            }
            return context.createResult({ currentMessageId: undefined });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                data: {
                    chatId: context.chatId,
                    turnId: context.turnId,
                    usage: chunk.usage,
                },
                source: 'chat-middleware::stream-handler:handleFinish',
            });
            log((l) => l.error('Error handling finish chunk', {
                error,
                turnId: context.turnId,
                chatId: context.chatId,
                usage: chunk.usage,
            }));
            return context.createResult(false);
        }
    }
    async processError(chunk, context) {
        context.generatedText =
            context.generatedText + JSON.stringify(chunk);
        context.generatedJSON.push(chunk);
        const result = context.createResult({
            success: true,
            generatedText: context.generatedText,
        });
        result.chatId = context.chatId;
        result.turnId = context.turnId;
        result.messageId = context.messageId;
        return result;
    }
    async processMetadata(chunk, context) {
        context.generatedJSON.push(chunk);
        return context.createResult(true);
    }
    async processOther(chunk, context) {
        context.generatedText =
            context.generatedText + JSON.stringify(chunk);
        return context.createResult({ generatedText: context.generatedText });
    }
}
export const processStreamChunk = async (chunk, context) => {
    const processor = new ChatHistoryStreamProcessor();
    return processor.process(chunk, context);
};
export const handleToolCall = async (chunk, context) => {
    return new ChatHistoryStreamProcessor()['processToolCall'](chunk, context);
};
export const handleToolResult = async (chunk, context) => {
    return new ChatHistoryStreamProcessor()['processToolResult'](chunk, context);
};
export const handleFinish = async (chunk, context) => {
    return new ChatHistoryStreamProcessor()['processFinish'](chunk, context);
};
//# sourceMappingURL=stream-handlers.js.map