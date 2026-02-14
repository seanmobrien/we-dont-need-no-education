import { and, eq, isNull } from 'drizzle-orm';
import { drizDb, schema } from '@compliance-theater/database/orm';
import { log, LoggedError } from '@compliance-theater/logger';
import { instrumentFlushOperation } from './instrumentation';
import { insertPendingAssistantMessage, reserveTurnId, } from './import-incoming-message';
import { summarizeMessageRecord } from '@/lib/ai/chat/message-optimizer-tools';
const DEFAULT_FLUSH_CONFIG = {
    autoGenerateTitle: true,
    maxTitleLength: 100,
    titleWordCount: 6,
    flushIntervalMs: 1000,
    timeoutMs: 5000,
    enableMetrics: false,
    batchSize: 10,
    retryAttempts: 3,
    compressionEnabled: false,
};
export async function finalizeAssistantMessage(context) {
    try {
        if (!context.messageId) {
            if (!context.generatedText?.trim()) {
                log((l) => l.warn('No pending message to finalize', {
                    chatId: context.chatId,
                    turnId: context.turnId,
                }));
                return;
            }
            await drizDb().transaction(async (tx) => {
                let thisTurnId = context.turnId;
                if (!thisTurnId) {
                    thisTurnId = await reserveTurnId(tx, context.chatId);
                    context.turnId = thisTurnId;
                }
                await insertPendingAssistantMessage(tx, context.chatId, thisTurnId, 0, 0, context.generatedText);
            });
            return;
        }
        await drizDb()
            .update(schema.chatMessages)
            .set(context.generatedText
            ? {
                content: JSON.stringify([
                    { type: 'text', text: context.generatedText },
                ]),
                statusId: 2,
            }
            : {
                statusId: 2,
            })
            .where(and(eq(schema.chatMessages.chatId, context.chatId), eq(schema.chatMessages.turnId, context.turnId), eq(schema.chatMessages.messageId, context.messageId)));
        log((l) => l.debug('Assistant message finalized', {
            chatId: context.chatId,
            turnId: context.turnId,
            messageId: context.messageId,
            textLength: context.generatedText.length,
        }));
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            message: 'Error finalizing assistant message',
            data: {
                chatId: context.chatId,
                turnId: context.turnId,
                messageId: context.messageId,
            },
        });
    }
}
export async function completeChatTurn(context, latencyMs) {
    if (!context.turnId) {
        log((l) => l.warn('No turn ID provided for completion', {
            chatId: context.chatId,
        }));
        return;
    }
    try {
        await drizDb()
            .update(schema.chatTurns)
            .set({
            statusId: 2,
            completedAt: new Date().toISOString(),
            latencyMs,
        })
            .where(and(eq(schema.chatTurns.chatId, context.chatId), eq(schema.chatTurns.turnId, context.turnId)));
        drizDb()
            .select()
            .from(schema.chatMessages)
            .where(and(eq(schema.chatMessages.chatId, context.chatId), eq(schema.chatMessages.turnId, context.turnId), eq(schema.chatMessages.statusId, 2), isNull(schema.chatMessages.optimizedContent)))
            .execute()
            .then((x) => x.map((m) => summarizeMessageRecord({
            chatId: m.chatId,
            turnId: m.turnId,
            messageId: m.messageId,
            write: true,
        }).catch((error) => {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Error summarizing message record',
                data: {
                    chatId: context.chatId,
                    turnId: context.turnId,
                    messageId: context.messageId,
                },
            });
            return Promise.resolve(m);
        })));
        log((l) => l.debug('Chat turn completed', {
            chatId: context.chatId,
            turnId: context.turnId,
            latencyMs,
        }));
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            message: 'Failed to complete chat turn',
            data: {
                chatId: context.chatId,
                turnId: context.turnId,
            },
        });
    }
}
export async function generateChatTitle(context, config = DEFAULT_FLUSH_CONFIG) {
    if (!config.autoGenerateTitle || !context.generatedText) {
        return;
    }
    try {
        const existingTitle = await drizDb().query.chats.findFirst({
            where: eq(schema.chats.id, context.chatId),
            columns: { title: true },
        });
        if (existingTitle?.title) {
            log((l) => l.debug('Chat already has title, skipping generation', {
                chatId: context.chatId,
                existingTitle: existingTitle.title,
            }));
            return;
        }
        const words = context.generatedText
            .split(' ')
            .slice(0, config.titleWordCount);
        const title = words.join(' ').substring(0, config.maxTitleLength);
        if (title.trim()) {
            await drizDb()
                .update(schema.chats)
                .set({ title })
                .where(eq(schema.chats.id, context.chatId));
            log((l) => l.debug('Generated chat title', {
                chatId: context.chatId,
                title,
                wordCount: words.length,
            }));
        }
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            message: 'Failed to generate chat title',
            data: {
                chatId: context.chatId,
            },
        });
    }
}
export async function markTurnAsError(context, error) {
    if (!context.turnId) {
        log((l) => l.warn('No turn ID provided for error marking', {
            chatId: context.chatId,
            error: error.message,
        }));
        return;
    }
    try {
        await drizDb()
            .update(schema.chatTurns)
            .set({
            statusId: 3,
            completedAt: new Date().toISOString(),
            errors: [error.message],
        })
            .where(and(eq(schema.chatTurns.chatId, context.chatId), eq(schema.chatTurns.turnId, context.turnId)));
        log((l) => l.info('Turn marked as error', {
            chatId: context.chatId,
            turnId: context.turnId,
            error: error.message,
        }));
    }
    catch (updateError) {
        LoggedError.isTurtlesAllTheWayDownBaby(updateError, {
            log: true,
            message: 'Failed to mark turn as error',
            data: {
                originalError: error.message,
                chatId: context.chatId,
                turnId: context.turnId,
            },
        });
    }
}
export async function handleFlush(context, config = DEFAULT_FLUSH_CONFIG) {
    return await instrumentFlushOperation(context, async () => {
        const startFlush = Date.now();
        const processingTimeMs = startFlush - context.startTime;
        try {
            await finalizeAssistantMessage(context);
            await completeChatTurn(context, processingTimeMs);
            await generateChatTitle(context, config);
            log((l) => l.info('Chat turn completed successfully', {
                chatId: context.chatId,
                turnId: context.turnId,
                processingTimeMs,
                generatedTextLength: context.generatedText.length,
                flushDurationMs: Date.now() - startFlush,
            }));
            return {
                success: true,
                processingTimeMs,
                textLength: context.generatedText.length,
            };
        }
        catch (error) {
            const flushError = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Error during flush operation',
                data: {
                    chatId: context.chatId,
                    turnId: context.turnId,
                },
            });
            await markTurnAsError(context, flushError);
            return {
                success: false,
                processingTimeMs,
                textLength: context.generatedText.length,
                error: flushError,
            };
        }
    });
}
export { DEFAULT_FLUSH_CONFIG };
//# sourceMappingURL=flush-handlers.js.map