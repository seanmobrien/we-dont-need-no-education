export const dynamic = 'force-dynamic';
import {
  streamText,
  convertToModelMessages,
  UIMessage,
  stepCountIs,
  hasToolCall,
} from 'ai';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';
// import type { ChatRequestMessage } from '@/lib/ai/types';
import { isAiLanguageModelType } from '@/lib/ai/core/guards';
import { getRetryErrorInfo } from '@/lib/ai/chat/error-helpers';
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
import { toolProviderSetFactory } from '@/lib/ai/mcp/toolProviderFactory';
import { wrapChatHistoryMiddleware } from '@/lib/ai/middleware/chat-history';
import { env } from '@/lib/site-util/env';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { generateChatId } from '@/lib/ai/core';
import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
import { ToolProviderSet } from '@/lib/ai/mcp/types';
// import { RateRetryError } from '@/lib/react-util/errors/rate-retry-error';
// Allow streaming responses up to 180 seconds
export const maxDuration = 1440;
let toolProviders: ToolProviderSet | undefined = undefined;

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
const toolProviderFactory = ({
  req,
  chatHistoryId,
  memoryDisabled = false,
  writeEnabled = false,
}: {
  req: NextRequest;
  chatHistoryId: string;
  writeEnabled?: boolean;
  memoryDisabled?: boolean;
}) =>
  toolProviderSetFactory([
    {
      allowWrite: writeEnabled,
      url: new URL('/api/ai/tools/sse', env('NEXT_PUBLIC_HOSTNAME')).toString(),
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
    } = (await req.json()) ?? {};
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
      toolProviders ??= await toolProviderFactory({
        req,
        chatHistoryId,
        memoryDisabled,
        writeEnabled,
      });
      // Create chat history context
      const chatHistoryContext = createUserChatHistoryContext({
        userId: session?.user?.id || 'anonymous',
        requestId: chatHistoryId,
        chatId: threadId,
        model,
      });

      // Wrap the base model with chat history middleware
      const baseModel = aiModelFactory(model);
      const modelWithHistory = wrapChatHistoryMiddleware({
        model: baseModel,
        chatHistoryContext,
      });

      let isRateLimitError = false;
      let retryAfter = 0;
      toolProviders ??= await toolProviderFactory({
        req,
        chatHistoryId,
        memoryDisabled,
        writeEnabled,
      });
      // In v5: create a UI message stream response and merge the generated stream.
      // We'll create a merged ReadableStream that forwards the SDK stream and allows
      // injecting an annotated retry data chunk when a rate limit is detected.
      const result = streamText({
        model: modelWithHistory,
        messages: convertToModelMessages(optimizedMessages),
        _internal: {
          generateId: () => `${threadId ?? 'not-set'}:${generateChatId().id}`,
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
        stopWhen: [stepCountIs(20), hasToolCall('askConfirmation')],
        onError: async (error) => {
          log((l) => l.error('on error streamText callback'));
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
          }
        },
        onFinish: async (evt) => {
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
                  event: evt,
                },
              }),
            );
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
        tools: (toolProviders ??= await toolProviderFactory({
          req,
          chatHistoryId,
          memoryDisabled,
          writeEnabled,
        })).get_tools(),
      });

      // Create a merged UI message chunk stream so we can inject a structured
      // `data-error-notify-retry` chunk when a rate limit is detected. We use the
      // SDK's `toUIMessageStream()` AsyncIterable then forward each chunk as an
      // SSE data event, and append our retry data chunk if needed.
      const uiChunkIterable = result.toUIMessageStream<UIMessage>({
        // preserve defaults; originalMessages aren't required here because we
        // will forward all chunks and emit an explicit data part when needed.
      });

      async function* mergedChunks() {
        try {
          for await (const chunk of uiChunkIterable) {
            yield chunk as unknown as Record<string, unknown>;
          }
        } finally {
          // After the SDK stream completes, if we detected a rate limit during
          // streaming, emit a structured data chunk that the client UI can
          // recognize and handle.
          if (isRateLimitError) {
            const retryAt = new Date(Date.now() + retryAfter * 1000);
            yield {
              type: 'data-error-notify-retry',
              id: `${threadId ?? 'not-set'}:retry`,
              data: {
                model: model,
                retryAt: retryAt.toISOString(),
              },
              transient: false,
            } as Record<string, unknown>;
          }
        }
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of mergedChunks()) {
              const payload = JSON.stringify(chunk);
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
            controller.close();
          } catch (err) {
            controller.error(err as Error);
          }
        },
        cancel() {
          // noop
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream;charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
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
  },
  {
    buildFallback: {
      role: 'assistant',
      content: "I'm currently disabled for solution rebuild.",
    },
  },
);
