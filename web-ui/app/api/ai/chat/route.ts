import { createDataStreamResponse, streamText } from 'ai';
import { aiModelFactory, ChatRequestMessage } from '@/lib/ai';
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { experimental_createMCPClient as createMCPClient } from 'ai';
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
  const chatHistoryId = newUuid();
  const mcpClient = await createMCPClient({
    transport: {
      type: 'sse',
      url: new URL('/api/ai/tools/sse', env('NEXT_PUBLIC_HOSTNAME')).toString(),
      // Forward current user's session cookie for any calls made by the MCP client
      headers: getMcpClientHeaders({ req, chatHistoryId }),
    },
  });

  try {
    const allTools = await mcpClient.tools();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tools: any = {};
    if (!writeEnabled) {
      tools = Object.entries(allTools).reduce(
        (acc, [toolName, tool]) => {
          if ((tool.description?.indexOf('Write access') ?? -1) == -1) {
            acc[toolName] = tool;
          }
          return acc;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as Record<string, any>,
      );
    } else {
      tools = allTools;
    }

    let isRateLimitError = false;
    let retryAfter = 0;

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: aiModelFactory(model),
          messages,
          experimental_generateMessageId: () => {
            return `${threadId ?? 'not-set'}:${generateChatId().id}`;
          },
          providerOptions: {
            openai: {
              store: true,
              user: session.user ? `user-${session.user.id}` : `user-anon`,
            } satisfies OpenAIResponsesProviderOptions,
          },
          maxSteps: 100,
          onError: async (error) => {
            log((l) => l.error('on error streamText callback'));
            const mcpCloseTask = mcpClient.close();
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
              await mcpClient.close();
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
          tools,
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
