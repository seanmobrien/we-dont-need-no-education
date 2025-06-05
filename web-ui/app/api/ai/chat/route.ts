import { streamText } from 'ai';
import { aiModelFactory, ChatRequestMessage } from '@/lib/ai';
import { isAiLanguageModelType } from '@/lib/ai/guards';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { env } from '@/lib/site-util/env';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { db } from '@/lib/neondb/drizzle-db';
import { chatHistory } from '@/drizzle/schema';
import { newUuid } from '@/lib/typescript';
import { LoggedError } from '@/lib/react-util';

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
    'X-Chat-History-Id': chatHistoryId,
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
  const { messages, model: modelFromRequest } =
    (await req.json()) as ChatRequestMessage;
  const model = isAiLanguageModelType(modelFromRequest)
    ? modelFromRequest
    : 'hifi';
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
    const result = streamText({
      model: aiModelFactory(model),
      messages,
      maxSteps: 100,
      onError: (error) => {
        log((l) =>
          l.error({
            source: 'route:ai:chat onError',
            message: 'Error during chat processing',
            error,
            userId: session?.user?.id,
            model,
          }),
        );
      },
      onFinish: async ({ request: { body: requestBody }, ...evt }) => {
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
                requestBody,
                response,
                userId: session?.user?.id,
                model,
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
          });
        }
      },
      tools: await mcpClient.tools(),
    });

    return result.toDataStreamResponse();
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'route:ai:chat',
      severity: 'error',
    });
    return NextResponse.error();
  }
}
