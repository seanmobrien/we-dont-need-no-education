import { LoggedError, log } from '@compliance-theater/logger';
export const streamingMessageResponse = async ({ result, context, }) => {
    const { chatHistoryId, threadId, model, getIsRateLimitError, getRetryAfter } = context;
    try {
        const uiChunkIterable = result.toUIMessageStream({});
        async function* mergedChunks() {
            try {
                for await (const chunk of uiChunkIterable) {
                    yield chunk;
                }
            }
            finally {
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
                    };
                }
            }
        }
        const innerStream = new ReadableStream({
            async start(controller) {
                try {
                    const encoder = new TextEncoder();
                    const it = mergedChunks();
                    let chunk = await it.next();
                    while (!chunk.done) {
                        const payload = JSON.stringify(chunk.value);
                        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                        chunk = await it.next();
                    }
                    log((l) => l.verbose('Chat: Stream closing normally', { chatHistoryId }));
                    controller.close();
                }
                catch (err) {
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
            },
        });
        return new Response(innerStream, {
            headers: {
                'Content-Type': 'text/event-stream;charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
            },
        });
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'streamingMessageResponse',
            msg: 'Failed to stream message response',
        });
    }
};
//# sourceMappingURL=streamed-result.js.map