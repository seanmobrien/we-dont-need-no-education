export const dynamic = 'force-dynamic';
import { createDataStreamResponse, wrapLanguageModel, streamText } from 'ai';
import {
  aiModelFactory,
  ChatRequestMessage,
  isAiLanguageModelType,
  getRetryErrorInfo,
  optimizeMessagesWithToolSummarization,
  toolProviderSetFactory
} from '@/lib/ai';
import {
  createChatHistoryMiddleware,
} from '@/lib/ai/middleware/chat-history';
import { env } from '@/lib/site-util/env';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';
import { generateChatId } from '@/lib/ai/core';
import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
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

export const POST = wrapRouteRequest(
async (req: NextRequest) => {
  const session = await auth();
  if (
    !session ||
    !session.user ||
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return new Response('Unauthorized', { status: 401 });
  }
  const {
    messages,
    id,
    data: {
      model: modelFromRequest,
      threadId,
      writeEnabled = false,
      memoryDisabled,
    } = {},
  } = ((await req.json()) as ChatRequestMessage) ?? {};
  const model = isAiLanguageModelType(modelFromRequest)
    ? modelFromRequest
    : env('NEXT_PUBLIC_DEFAULT_AI_MODEL');

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid messages format', { status: 400 });
  }

  const chatHistoryId = id ?? `${threadId}:${generateChatId().id}`;
  // Apply advanced tool message optimization with AI-powered summarization
  const optimizedMessages = await optimizeMessagesWithToolSummarization(
    messages,
    model,
    session?.user?.id,
    chatHistoryId,
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
      ...(memoryDisabled !== true && env('MEM0_DISABLED')
        ? []
        : [
            {
              allowWrite: true,
              headers: {
                'cache-control': 'no-cache, no-transform',
                'content-encoding': 'none',
              },
              url: `${env('MEM0_API_HOST')}/mcp/openmemory/sse/${env('MEM0_USERNAME')}/`,
            },
          ]),
    ]);

    // Create chat history context
    const chatHistoryContext = createUserChatHistoryContext({
      userId: session?.user?.id || 'anonymous',
      requestId: chatHistoryId,
      chatId: threadId,
      model,
    });

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
              userId: session?.user?.id || 'anonymous',
              requestId: chatHistoryId,
              chatId: threadId || 'no-thread',
            },
          },
          providerOptions: {
            openai: {
              store: true,
              user: session.user ? `user-${session.user.id}` : `user-anon`,
            },
          },
          maxSteps: 100,
          onError: async (error) => {
            log((l) => l.error('on error streamText callback'));
            const mcpCloseTask = toolProviders.dispose();
            chatHistoryContext.error = error;
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
              chatHistoryContext.dispose();
              await mcpCloseTask;
            }
          },
          onFinish: async (
            {
              /*request: { body: requestBody }, ...evt */
            },
          ) => {
            try {
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
              chatHistoryContext.error = error;
            } finally {
              chatHistoryContext.dispose();
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
            {
              cause: { reason: 'RateLimit', retryAfter },
            },
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
        chatHistoryContext.error = error;
        chatHistoryContext.dispose();
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
}, { buildFallback: { "role": "assistant", content: "I'm currently disabled for solution rebuild." }});
