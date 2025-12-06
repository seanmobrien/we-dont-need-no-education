export const dynamic = 'force-dynamic';
import {
  streamText,
  convertToModelMessages,
  UIMessage,
  stepCountIs,
  hasToolCall,
} from 'ai';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import { isAiLanguageModelType } from '@/lib/ai/core/guards';
import { splitIds, generateChatId } from '@/lib/ai/core/chat-ids';
import { getRetryErrorInfo } from '@/lib/ai/chat/error-helpers';
import { getUserToolProviderCache } from '@/lib/ai/mcp/cache';
import { wrapChatHistoryMiddleware } from '@/lib/ai/middleware/chat-history';
import { env } from '@/lib/site-util/env';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { isTruthy } from '@/lib/react-util/utility-methods';
import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
import type { ToolProviderSet } from '@/lib/ai/mcp/types';
import { setupDefaultTools } from '@/lib/ai/mcp/providers';
import { getFeatureFlag } from '@/lib/site-util/feature-flags/server';
import type { User } from '@auth/core/types';
// Allow streaming responses up to 360 seconds
//const maxDuration = 60 * 1000 * 360;

/**
 * Safely disposes of tool providers, suppressing expected AbortErrors during cleanup.
 * @param toolProviders - The tool provider set to dispose
 */
const safeDisposeToolProviders = async (
  toolProviders: ToolProviderSet | undefined,
): Promise<void> => {
  if (!toolProviders) return;
  toolProviders[Symbol.dispose]();
};

const toolProviderFactory = async ({
  req,
  chatHistoryId,
  memoryDisabled = false,
  writeEnabled = false,
  user,
  sessionId,
}: {
  req: NextRequest;
  chatHistoryId: string;
  writeEnabled?: boolean;
  memoryDisabled?: boolean;
  // impersonation?: ImpersonationService;
  user: User;
  sessionId: string;
}) => {
  const flag = await getFeatureFlag('mcp_cache_tools', user?.id);
  if (isTruthy(flag)) {
    const toolProviderCache = await getUserToolProviderCache({
      maxEntriesPerUser: 5, // Allow up to 5 different tool configurations per user
      maxTotalEntries: 200, // Increase total limit for multiple users
      ttl: 45 * 60 * 1000, // 45 minutes (longer than typical chat sessions)
      cleanupInterval: 10 * 60 * 1000, // Cleanup every 10 minutes
    });
    // Use the cache to get or create tool providers
    return toolProviderCache.getOrCreate(
      user.id!,
      sessionId,
      {
        writeEnabled,
        memoryDisabled,
      },
      () =>
        setupDefaultTools({
          writeEnabled,
          user,
          req,
          chatHistoryId,
          memoryEnabled: !memoryDisabled,
        }),
    );
  }
  return setupDefaultTools({
    user,
    writeEnabled,
    req,
    chatHistoryId,
    memoryEnabled: !memoryDisabled,
  });
};

const extractRequestParams = async (req: NextRequest) => {
  // Pull messages and ID from body
  const { messages, id } = (await req.json()) ?? {};
  const modelFromRequest =
    req.headers.get('x-active-model') ?? env('NEXT_PUBLIC_DEFAULT_AI_MODEL');
  const writeEnabled = req.headers.get('x-write-enabled') === 'true';
  const memoryDisabled = req.headers.get('x-memory-disabled') === 'true';
  const activePage = req.headers.get('x-active-page') === 'true';
  // Extract thread portion of id from message id
  const [threadId] = splitIds(id ?? undefined);
  // and return it all in a handly extractable payload
  return {
    activePage,
    messages,
    id,
    threadId,
    modelFromRequest,
    writeEnabled,
    memoryDisabled,
    model: isAiLanguageModelType(modelFromRequest)
      ? modelFromRequest
      : env('NEXT_PUBLIC_DEFAULT_AI_MODEL'),
  };
};

export const POST = (req: NextRequest) => {
  let toolProviders: ToolProviderSet | undefined = undefined;

  return wrapRouteRequest(
    async (req: NextRequest) => {
      const session = await auth();
      if (
        !session ||
        !session.user ||
        process.env.NEXT_PHASE === 'phase-production-build'
      ) {
        return new Response('Unauthorized', { status: 401 });
      }
      if (!session || !session.user) {
        throw new Error('Unauthorized');
      }
      const {
        // activePage,
        messages,
        id,
        threadId,
        writeEnabled,
        memoryDisabled,
        model,
      } = await extractRequestParams(req);
      // Validate args
      if (!Array.isArray(messages) || messages.length === 0) {
        return new Response('Invalid messages format', { status: 400 });
      }
      const chatHistoryId = id ?? `${threadId}:${generateChatId().id}`;

      // Get tools
      try {
        toolProviders ??= await toolProviderFactory({
          req,
          chatHistoryId,
          memoryDisabled,
          writeEnabled,
          user: session?.user,
          sessionId: chatHistoryId,
        });
        // Create chat history context
        const chatHistoryContext = createUserChatHistoryContext({
          userId: session?.user?.id || 'anonymous',
          requestId: chatHistoryId,
          chatId: threadId,
          model,
        });

        // Wrap the base model with chat history middleware
        const baseModel = await aiModelFactory(model);
        const modelWithHistory = wrapChatHistoryMiddleware({
          model: baseModel,
          chatHistoryContext,
        });
        // attach tools
        let isRateLimitError = false;
        let retryAfter = 0;
        toolProviders ??= await toolProviderFactory({
          req,
          chatHistoryId,
          memoryDisabled,
          writeEnabled,
          user: session?.user,
          sessionId: chatHistoryId,
        });
        // In v5: create a UI message stream response and merge the generated stream.
        // We'll create a merged ReadableStream that forwards the SDK stream and allows
        // injecting an annotated retry data chunk when a rate limit is detected.
        const result = streamText({
          model: modelWithHistory,
          messages: convertToModelMessages(messages),
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
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
              log: true,
              source: 'route:ai:chat onError',
              message: 'Error during chat processing',
              critical: true,
              data: {
                userId: session?.user?.id,
                model,
                chatHistoryId,
              },
            });
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
            } finally {
              chatHistoryContext.dispose();
            }
          },
          onFinish: async (/*evt*/) => {
            try {
              log((l) =>
                l.info({
                  source: 'route:ai:chat onFinish',
                  message: 'Chat response generated',
                  data: {
                    userId: session?.user?.id,
                    chatHistoryId,
                    model,
                    isRateLimitError,
                    retryAfter,
                    // event: evt,
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
            user: session?.user,
            sessionId: chatHistoryId,
          })).tools,
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
              log((l) => l.verbose('Chat: Stream closing normally', { chatHistoryId }));
              controller.close();
            } catch (err) {
              controller.error(LoggedError.isTurtlesAllTheWayDownBaby(err, {
                log: true,
                source: 'route:ai:chat mergedChunks',
                severity: 'error',
                data: {
                  chatHistoryId,
                  model,
                  isRateLimitError,
                  retryAfter,
                },
              }));
            }
          },
          cancel(reason) {
            log((l) => l.warn('Stream cancelled', { reason, chatHistoryId }));
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
        await safeDisposeToolProviders(toolProviders);
        return NextResponse.error();
      }
    },
    {
      buildFallback: {
        role: 'assistant',
        content: "I'm currently disabled for solution rebuild.",
      },
      errorCallback: () => safeDisposeToolProviders(toolProviders),
    },
  )(req);
};
