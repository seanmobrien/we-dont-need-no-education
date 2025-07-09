import { createDataStreamResponse, streamText } from 'ai';
import { aiModelFactory, ChatRequestMessage } from '@/lib/ai';
import { env } from '@/lib/site-util/env';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { db } from '@/lib/drizzle-db/connection';
import { chatHistory } from '@/drizzle/schema';
import { newUuid } from '@/lib/typescript';
import { LoggedError } from '@/lib/react-util';
import { isAiLanguageModelType } from '@/lib/ai/core';
import { getRetryErrorInfo } from '@/lib/ai/chat';
import { generateChatId } from '@/lib/components/ai';
import { toolProviderSetFactory } from '@/lib/ai/mcp';
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
import {
  createChatHistoryMiddleware,
  type ChatHistoryContext,
} from '@/lib/ai/middleware';
import { wrapLanguageModel } from 'ai';
// Allow streaming responses up to 180 seconds
export const maxDuration = 180;

const getMcpClientHeaders = ({
  req,
  chatHistoryId,
}: {
  req: NextRequest;
  chatHistoryId: string;
}): Record<string, string> => {
  const ret: { [key: string]: string } = {
    'x-chat-history-id': chatHistoryId,
  };
  const sessionCookie = req.cookies?.get('authjs.session-token')?.value ?? '';
  if (sessionCookie.length > 0) {
    ret.Cookie = `authjs.session-token=${sessionCookie}`;
  }
  return ret;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const {
    messages,
    data: { model: modelFromRequest, threadId, writeEnabled = false } = {},
  } = ((await req.json()) as ChatRequestMessage) ?? {};
  const model = isAiLanguageModelType(modelFromRequest)
    ? modelFromRequest
    : env('NEXT_PUBLIC_DEFAULT_AI_MODEL');

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid messages format', { status: 400 });
  }

  // Apply advanced tool message optimization with AI-powered summarization
  const optimizedMessages = await optimizeMessagesWithToolSummarization(
    messages,
    model,
    session?.user?.id,
  );

  // Log optimization results for monitoring
  if (optimizedMessages.length !== messages.length) {
    log((l) =>
      l.info('Enterprise tool optimization applied', {
        originalMessages: messages.length,
        optimizedMessages: optimizedMessages.length,
        reduction: `${Math.round(((messages.length - optimizedMessages.length) / messages.length) * 100)}%`,
        model,
        userId: session?.user?.id,
      }),
    );
  }

  const chatHistoryId = newUuid();

  try {
    const toolProviders = await toolProviderSetFactory([
      {
        allowWrite: writeEnabled,
        url: new URL(
          '/api/ai/tools/sse',
          env('NEXT_PUBLIC_HOSTNAME'),
        ).toString(),
        headers: getMcpClientHeaders({ req, chatHistoryId }),
        traceable: req.headers.get('x-traceable') !== 'false',
      },
      /*
      {
        allowWrite: true,        
        headers: {
          'cache-control': 'no-cache, no-transform',
          'content-encoding': 'none',
        },
        url: `${env('MEM0_API_HOST')}/mcp/openmemory/sse/${env('MEM0_USERNAME')}/`,
      },
      */
    ]);

    // Initialize chat history tables (only needs to be done once)
    // await initializeChatHistoryTables();

    // Create chat history context
    const chatHistoryContext: ChatHistoryContext = {
      userId: session?.user?.id || 'anonymous',
      sessionId: chatHistoryId,
      chatId: threadId,
      model,
      temperature: 0.7, // Default values, could be extracted from request
      topP: 1.0,
    };

    // Wrap the base model with chat history middleware
    const baseModel = aiModelFactory(model);
    const modelWithHistory = wrapLanguageModel({
      model: baseModel,
      middleware: createChatHistoryMiddleware(chatHistoryContext),
    });

    let isRateLimitError = false;
    let retryAfter = 0;

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: modelWithHistory,
          messages: optimizedMessages,
          experimental_generateMessageId: () => {
            return `${threadId ?? 'not-set'}:${generateChatId().id}`;
          },
          experimental_telemetry: {
            isEnabled: true, // Currently a bug in the ai package processing string dates
            functionId: 'chat-request',
            metadata: {
              something: 'custom',
              someOtherThing: 'other-value',
            },
          },
          providerOptions: {
            openai: {
              store: true,
              user: session.user ? `user-${session.user.id}` : `user-anon`,
            } /*  I swear this existed at some point, but it seems to have been removed from the ai package.
            satisfies OpenAIResponsesProviderOptions */,
          },
          maxSteps: 100,
          onError: async (error) => {
            log((l) => l.error('on error streamText callback'));
            const mcpCloseTask = toolProviders.dispose();
            try {
              const rateLimitErrorInfo = getRetryErrorInfo(error);
              if (
                rateLimitErrorInfo &&
                rateLimitErrorInfo.isError === true &&
                rateLimitErrorInfo.isRetry === true
              ) {
                isRateLimitError = true;
                retryAfter = rateLimitErrorInfo.retryAfter ?? 60;
              }
              if (isRateLimitError) {
                const retryAt = new Date(Date.now() + retryAfter * 1000);
                dataStream.writeData({
                  type: 'error',
                  hint: 'notify:retry',
                  message: `Token quota for model ${model} exceeded - Retry after ${retryAfter} seconds.`,
                  data: {
                    chatHistoryId,
                    model,
                    retryAt: retryAt.toISOString(),
                  },
                });
                log((l) =>
                  l.warn('Rate limit exceeded - retry request later', {
                    model,
                    retryAt,
                    chatHistoryId,
                    userId: session?.user?.id ?? -1,
                  }),
                );
                return;
              }
              log((l) =>
                l.error({
                  source: 'route:ai:chat onError',
                  message: 'Error during chat processing',
                  error,
                  userId: session?.user?.id,
                  model,
                }),
              );
            } finally {
              await mcpCloseTask;
            }
          },
          onFinish: async ({ request: { body: requestBody }, ...evt }) => {
            console.warn('onFinish callback called');
            const response = JSON.stringify(evt, (key, value) => {
              if (key === 'request' || key.startsWith('x-')) {
                return undefined;
              }
              if (Array.isArray(value) && value.length === 0) {
                return undefined;
              }
              return value;
            });
            try {
              const task = db.insert(chatHistory).values({
                chatHistoryId,
                userId: Number(session?.user?.id) ?? 0,
                request: requestBody ?? '',
                result: response,
              });
              log((l) =>
                l.verbose({
                  source: 'route:ai:chat onFinish',
                  message: 'Chat response generated',
                  data: {
                    userId: session?.user?.id,
                    chatHistoryId,
                    model,
                    isRateLimitError,
                    retryAfter,
                  },
                }),
              );
              await toolProviders.dispose();
              await task;
            } catch (error) {
              LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'route:ai:chat onFinish',
                severity: 'error',
                data: {
                  userId: session?.user?.id,
                  model,
                  chatHistoryId,
                  isRateLimitError,
                  retryAfter,
                },
              });
            }
          },
          tools: toolProviders.get_tools(),
        });

        result.mergeIntoDataStream(dataStream);
      },
      onError: (error: unknown) => {
        log((l) => l.error('on error custom data stream callback'));
        if (isRateLimitError) {
          error = new Error(
            `Rate limit exceeded. Please try again later. Retry after: ${retryAfter} seconds.`,
          );
        }
        // Log the error for debugging purposes
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'route:ai:chat onError',
          severity: 'error',
          data: {
            userId: session?.user?.id,
            model,
            chatHistoryId,
            isRateLimitError,
            retryAfter,
          },
        });
        toolProviders.dispose();
        // Error messages are masked by default for security reasons.
        // If you want to expose the error message to the client, you can do so here:
        return error instanceof Error ? error.message : String(error);
      },
    });
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'route:ai:chat',
      severity: 'error',
    });
    return NextResponse.error();
  }
}
