import { notCryptoSafeKeyHash } from '@/lib/ai/core/chat-ids';
import { useQueryClient, experimental_streamedQuery as streamedQuery, } from '@tanstack/react-query';
import { log } from '@compliance-theater/logger';
import { useCallback } from 'react';
import { env } from '@compliance-theater/env';
import { fetch } from '@/lib/nextjs-util/fetch';
export const useChatFetchWrapper = () => {
    const queryClient = useQueryClient();
    if (!queryClient) {
        throw new Error('QueryClient is not available. Ensure you are using this in a QueryClientProvider context.');
    }
    const computeKey = async (input, init) => {
        const hashBody = async (body) => {
            if (typeof body === 'string') {
                return [notCryptoSafeKeyHash(body), body];
            }
            if (body instanceof URLSearchParams) {
                return [notCryptoSafeKeyHash(body.toString()), body];
            }
            if (body instanceof Blob) {
                const blobText = await body.text();
                const requestHash = notCryptoSafeKeyHash(blobText);
                return [requestHash, blobText];
            }
            log((l) => l.warn('Unsupported body type for hashing:', body));
            return ['', body];
        };
        let requestHash = '';
        if (init && init.body) {
            const [hash, body] = await hashBody(init.body);
            init.body = body;
            requestHash = hash;
        }
        if (requestHash == '' && input instanceof Request) {
            const [hash] = await hashBody(input.body);
            requestHash = hash;
        }
        if (requestHash === '') {
            throw new Error('No body to hash for request key');
        }
        const url = new URL(input instanceof Request ? input.url : input.toString(), new URL(env('NEXT_PUBLIC_HOSTNAME')));
        return [url, requestHash];
    };
    async function* fetchChatStream({ req, init, }) {
        const response = await fetch(req, init);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`, {
                cause: response,
            });
        }
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No readable stream');
        }
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            yield value;
            if (init?.signal?.aborted) {
                await reader.cancel();
                return;
            }
        }
    }
    const chatFetch = useCallback(async (input, init) => {
        const stream = queryClient.fetchQuery({
            queryKey: await computeKey(input, init),
            queryFn: streamedQuery({
                streamFn: ({ signal }) => {
                    if (!init) {
                        init = {};
                    }
                    let mergedSignal = signal ?? init.signal;
                    if (init.signal && init.signal !== mergedSignal) {
                        const controller = new AbortController();
                        const abort = () => controller.abort();
                        if (signal) {
                            signal.addEventListener('abort', abort);
                        }
                        if (init.signal) {
                            init.signal.addEventListener('abort', abort);
                        }
                        mergedSignal = init.signal;
                        init.signal = controller.signal;
                    }
                    return fetchChatStream({ req: input, init });
                },
            }),
        });
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of await stream) {
                        controller.enqueue(chunk);
                    }
                    controller.close();
                }
                catch (error) {
                    controller.error(error);
                }
            },
        });
        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/plain',
                'Transfer-Encoding': 'chunked',
            },
        });
    }, [queryClient]);
    return {
        chatFetch,
        queryClient,
    };
};
//# sourceMappingURL=chat-fetch-wrapper.js.map