import type { LanguageModelV2CallOptions, SharedV2ProviderOptions } from '@ai-sdk/provider';
import { JSONValue } from 'ai';
import { drizDb } from '@/lib/drizzle-db';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import type {
  ChatHistoryContext,
  FlushContext,
  MessageCompletionContext,
  MessagePersistenceInit,
} from './types';
import { importIncomingMessage } from './import-incoming-message';
import { handleFlush } from './flush-handlers';
import {
  instrumentMiddlewareInit,
  createChatHistoryError,
} from './instrumentation';
import { generateChatId } from '../../core';

export const initializeMessagePersistence = async (
  context: ChatHistoryContext,
  params: LanguageModelV2CallOptions,
): Promise<MessagePersistenceInit> => {
  try {
    const ret = await drizDb().transaction(async (tx) =>
      importIncomingMessage({
        tx,
        context,
        params,
      }),
    );
    return {
      ...ret,
    };
  } catch (error) {
    // Create enhanced error for better observability
    const enhancedError = createChatHistoryError(
      'Error initializing message persistence',
      {
        chatId: context.chatId || 'unknown',
        turnId: undefined,
        messageId: undefined,
      },
      error instanceof Error ? error : new Error(String(error)),
    );

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

export const completeMessagePersistence = async (
  completionContext: MessageCompletionContext,
) => {
  try {
    // Create flush context for the completion
    const flushContext: FlushContext = {
      chatId: completionContext.chatId,
      turnId: completionContext.turnId,
      messageId: completionContext.messageId,
      generatedText: completionContext.generatedText,
      startTime: completionContext.startTime,
    };
    // Handle completion using the existing flush logic
    const flushResult = await handleFlush(flushContext);

    if (!flushResult.success && flushResult.error) {
      log((l) =>
        l.error('Error completing message persistence', {
          error: flushResult.error,
          turnId: completionContext.turnId,
          chatId: completionContext.chatId,
        }),
      );
    } else {
      log((l) =>
        l.debug('Message persistence completed successfully', {
          chatId: completionContext.chatId,
          turnId: completionContext.turnId,
          messageId: completionContext.messageId,
          textLength: completionContext.generatedText.length,

          processingTimeMs: flushResult.processingTimeMs,
        }),
      );
    }

    return flushResult;
  } catch (error) {
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

export const safeInitializeMessagePersistence = async (
  context: ChatHistoryContext,
  params: LanguageModelV2CallOptions,
): Promise<MessagePersistenceInit | null> => {
  try {
    context.chatId ??= generateChatId().id;
    params.providerOptions ??= {};
    params.providerOptions.backoffice ??= {} as Record<string, JSONValue>;
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
  } catch {
    // Error already logged in initializeMessagePersistence and instrumentation
    return null;
  }
};

export const chatIdFromParams = (params: { providerOptions?: SharedV2ProviderOptions | undefined }) => {
  if (!params.providerOptions?.backoffice) {
    return undefined;
  }
  const {
    chatId = undefined,
    turnId = undefined,
    messageId = undefined,
  } = params.providerOptions.backoffice ?? {};
  return chatId
    ? {
      ...{
        chatId,
        turnId,
        messageId,
      }
    }
    : undefined;
}

export const safeCompleteMessagePersistence = async (
  completionContext: MessageCompletionContext,
) => {
  try {
    return await completeMessagePersistence(completionContext);
  } catch {
    // Error already logged in completeMessagePersistence
    // Return a failure result instead of throwing
    return {
      success: false,
      processingTimeMs: Date.now() - completionContext.startTime,
      textLength: completionContext.generatedText.length,
      error: new Error('Message persistence completion failed'),
    };
  }
};
