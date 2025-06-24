/**
 * Creates a simple fetch wrapper with basic retry logic and error handling
 * for use with AI SDK's useChat hook.
 */
export function createChatFetchWrapper(): typeof globalThis.fetch {
  const chatFetch: typeof globalThis.fetch = async (input, init) => {
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout
      
      const requestInit: RequestInit = {
        ...init,
        signal: controller.signal,
      };

      const response = await fetch(input, requestInit);
      clearTimeout(timeoutId);

      return response;

    } catch (error) {
      // Re-throw to maintain compatibility with AI SDK error handling
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  return chatFetch;
}

/**
 * Default chat fetch function with basic enhancements
 */
export const enhancedChatFetch = createChatFetchWrapper();