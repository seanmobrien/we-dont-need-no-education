import { drizDb } from '@compliance-theater/database/orm';
import { log, LoggedError } from '@compliance-theater/logger';
import { importIncomingMessage } from './import-incoming-message';
import { handleFlush } from './flush-handlers';
import { instrumentMiddlewareInit, createChatHistoryError, } from './instrumentation';
import { generateChatId } from '../../core';
export const initializeMessagePersistence = async (context, params) => {
    try {
        const ret = await drizDb().transaction(async (tx) => importIncomingMessage({
            tx,
            context,
            params,
        }));
        return {
            ...ret,
        };
    }
    catch (error) {
        const enhancedError = createChatHistoryError('Error initializing message persistence', {
            chatId: context.chatId || 'unknown',
            turnId: undefined,
            messageId: undefined,
        }, error instanceof Error ? error : new Error(String(error)));
        LoggedError.isTurtlesAllTheWayDownBaby(enhancedError, {
            log: true,
            source: 'MessagePersistence',
            message: 'Error initializing message persistence',
            critical: true,
            data: {
                context,
                userId: context.userId,
                chatId: context.chatId,
            },
        });
        throw enhancedError;
    }
};
export const completeMessagePersistence = async (completionContext) => {
    try {
        const flushContext = {
            chatId: completionContext.chatId,
            turnId: completionContext.turnId,
            messageId: completionContext.messageId,
            generatedText: completionContext.generatedText,
            startTime: completionContext.startTime,
        };
        const flushResult = await handleFlush(flushContext);
        if (!flushResult.success && flushResult.error) {
            log((l) => l.error('Error completing message persistence', {
                error: flushResult.error,
                turnId: completionContext.turnId,
                chatId: completionContext.chatId,
            }));
        }
        else {
            log((l) => l.debug('Message persistence completed successfully', {
                chatId: completionContext.chatId,
                turnId: completionContext.turnId,
                messageId: completionContext.messageId,
                textLength: completionContext.generatedText.length,
                processingTimeMs: flushResult.processingTimeMs,
            }));
        }
        return flushResult;
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'MessagePersistence',
            message: 'Error completing message persistence',
            critical: true,
            data: {
                chatId: completionContext.chatId,
                turnId: completionContext.turnId,
                messageId: completionContext.messageId,
            },
        });
        throw error;
    }
};
export const safeInitializeMessagePersistence = async (context, params) => {
    try {
        context.chatId ??= generateChatId().id;
        params.providerOptions ??= {};
        params.providerOptions.backoffice ??= {};
        const backoffice = params.providerOptions.backoffice;
        backoffice.chatId = context.chatId;
        return await instrumentMiddlewareInit(context, async () => {
            const ret = await initializeMessagePersistence(context, params);
            if (ret.turnId) {
                backoffice.turnId = ret.turnId;
            }
            if (ret.messageId) {
                backoffice.messageId = ret.messageId;
            }
            return ret;
        });
    }
    catch {
        return null;
    }
};
export const chatIdFromParams = (params) => {
    if (!params.providerOptions?.backoffice) {
        return undefined;
    }
    const { chatId = undefined, turnId = undefined, messageId = undefined, } = params.providerOptions.backoffice ?? {};
    return chatId
        ? {
            ...{
                chatId,
                turnId,
                messageId,
            },
        }
        : undefined;
};
export const safeCompleteMessagePersistence = async (completionContext) => {
    try {
        return await completeMessagePersistence(completionContext);
    }
    catch {
        return {
            success: false,
            processingTimeMs: Date.now() - completionContext.startTime,
            textLength: completionContext.generatedText.length,
            error: new Error('Message persistence completion failed'),
        };
    }
};
//# sourceMappingURL=message-persistence.js.map