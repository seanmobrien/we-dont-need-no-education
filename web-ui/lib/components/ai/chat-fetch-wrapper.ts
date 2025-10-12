import { notCryptoSafeKeyHash } from '@/lib/ai/core/chat-ids';
import {
  QueryClient,
  useQueryClient,
  experimental_streamedQuery as streamedQuery,
} from '@tanstack/react-query';
import { log } from '@/lib/logger';
import { useCallback } from 'react';
import { env } from '@/lib/site-util/env';
import { fetch } from '@/lib/nextjs-util/fetch';

/**
 * Creates a simple fetch wrapper with basic retry logic and error handling
 * for use with AI SDK's useChat hook.
 */
export const useChatFetchWrapper = (): {
  chatFetch: typeof globalThis.fetch;
  queryClient: QueryClient;
} => {
  const queryClient = useQueryClient();
  if (!queryClient) {
    throw new Error(
      'QueryClient is not available. Ensure you are using this in a QueryClientProvider context.',
    );
  }

  const computeKey = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<[URL, string]> => {
    const hashBody = async <TBody>(body: TBody): Promise<[string, TBody]> => {
      if (typeof body === 'string') {
        return [notCryptoSafeKeyHash(body), body];
      }
      if (body instanceof URLSearchParams) {
        return [notCryptoSafeKeyHash(body.toString()), body];
      }
      if (body instanceof Blob) {
        // Reading a Blob as text/arrayBuffer is possible, but would consume it.
        // To avoid breaking the request, clone the Blob if needed, or use a placeholder.
        // If you must hash the contents, you could read it here, but then you'd need to replace it in `init.body`.
        // Example (not recommended for large blobs):
        const blobText = await body.text();
        const requestHash = notCryptoSafeKeyHash(blobText);
        // Replace the body with a string so we can re-use it
        return [requestHash, blobText as TBody];
        /*
        return [
          requestHash,
          new Blob([blobText], { type: body.type }) as TBody,
        ];
        */
      }
      log((l) => l.warn('Unsupported body type for hashing:', body));
      return ['', body];
    };

    // Safely extract the body for hashing without consuming or altering the original request
    let requestHash: string = '';
    if (init && init.body) {
      const [hash, body] = await hashBody(init.body);
      init.body = body; // Restore the body to avoid passing a consumed stream.
      requestHash = hash;
    }
    if (requestHash == '' && input instanceof Request) {
      const [hash] = await hashBody(input.body);
      requestHash = hash;
    }
    if (requestHash === '') {
      throw new Error('No body to hash for request key');
    }
    // TODO: Would be nice to pull the last message - or part of it - for display purposes
    const url = new URL(
      input instanceof Request ? input.url : input.toString(),
      new URL(env('NEXT_PUBLIC_HOSTNAME')),
    );
    return [url, requestHash];
  };

  /**
   * Fetches a chat stream from the server.
   * @param {Object} params - Parameters for the fetch.
   * @param {URL | Request} params.req - The request URL or Request object.
   * @param {RequestInit} [params.init] - Optional request initialization options.
   * @returns {AsyncGenerator<string>} An async generator yielding chunks of the chat stream.
   */

  async function* fetchChatStream({
    req,
    init,
  }: {
    req: URL | RequestInfo;
    init?: RequestInit;
  }) {
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
      if (done) break;
      yield value;
      if (init?.signal?.aborted) {
        await reader.cancel();
        return;
      }
    }
  }

  const chatFetch = useCallback(
    async (input: URL | RequestInfo, init?: RequestInit) => {
      const stream = queryClient.fetchQuery({
        queryKey: await computeKey(input, init),
        queryFn: streamedQuery({
          streamFn: ({ signal }: { signal?: AbortSignal }) => {
            if (!init) {
              init = {};
            }
            // Merge the provided signal and any signal in init into a single AbortController
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

      // Convert to ReadableStream and then to Response
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of await stream) {
              controller.enqueue(chunk);
            }
            controller.close();
          } catch (error) {
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
    },
    [queryClient],
  );
  return {
    chatFetch,
    queryClient,
  };
};

/**
 * Default chat fetch function with basic enhancements
 */
// export const enhancedChatFetch = useChatFetchWrapper();
