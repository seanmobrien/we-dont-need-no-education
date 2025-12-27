import {
  type streamText,
  type ToolSet,
  type UIMessage,
} from 'ai';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { log } from '@repo/lib-logger';

type StreamTextResult<TOOLS extends ToolSet, NEVER> = ReturnType<typeof streamText<TOOLS, NEVER>>;

export interface StreamedResultContext {
  chatHistoryId: string;
  threadId: string;
  model: string;
  getIsRateLimitError: () => boolean;
  getRetryAfter: () => number;
}

export const streamingMessageResponse = async <
  TOOLS extends ToolSet = ToolSet,
  NEVER = never
>({
  result,
  context,
}: {
  result: StreamTextResult<TOOLS, NEVER>;
  context: StreamedResultContext;
}) => {
  const { chatHistoryId, threadId, model, getIsRateLimitError, getRetryAfter } = context;
  try {

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
        if (getIsRateLimitError()) {
          const retryAt = new Date(Date.now() + getRetryAfter() * 1000);
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

    const innerStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const encoder = new TextEncoder();

          /*
          const it = mergedChunks();
          let chunk = await it.next();
          if (chunk.done) {
            log((l) => l.verbose('Chat: Stream closing normally', { chatHistoryId }));
            controller.close();
            return;
          } else while (!chunk.done) {
            const payload = JSON.stringify(chunk.value);
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            chunk = await it.next();
          }
          log((l) => l.verbose('Chat: Stream closing normally', { chatHistoryId }));
          controller.close();
          */
          const it = mergedChunks();
          let chunk = await it.next();
          while (!chunk.done) {
            const payload = JSON.stringify(chunk.value);
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            chunk = await it.next();
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
              isRateLimitError: getIsRateLimitError(),
              retryAfter: getRetryAfter(),
            },
          }));
        }
      },
      cancel(reason) {
        log((l) => l.warn('Stream cancelled', { reason, chatHistoryId }));
        // noop
      },
    });
    return new Response(innerStream,
      {
        headers: {
          'Content-Type': 'text/event-stream;charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'streamingMessageResponse',
      msg: 'Failed to stream message response',
    });
  }
};
