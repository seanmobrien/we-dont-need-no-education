/**
 * Chat History Data Hook Module
 * ==================================
 *
 * Purpose:
 *   Provides a single, typed React Query hook (`useChatHistory`) plus its
 *   underlying fetcher (`fetchChatDetails`) for retrieving an entire chat's
 *   conversational history (turns + messages) from the server API route:
 *     GET /api/ai/chat/history/[chatId]
 *
 * Exports:
 *   - fetchChatDetails(chatId): Low-level async function returning `ChatDetails | null`.
 *   - useChatHistory(chatId): High-level React Query hook with loading/error/empty semantics.
 *
 * State Semantics:
 *   - data === undefined  -> Initial load (isLoading true)
 *   - data === null       -> 404 (chat not found) empty state
 *   - isError === true    -> Network / non-404 HTTP failure (error contains detail)
 *
 * Design Decisions:
 *   - Returns `null` for 404 to distinguish "missing resource" from operational failures.
 *   - Uses `cache: 'no-store'` at fetch layer and delegates dedupe / caching to React Query.
 *   - Chooses a modest staleTime (30s) to reduce flicker without drift risk for user-facing chat titles.
 *   - Disables refetchOnWindowFocus to avoid unexpected bandwidth usage and preserve user scroll position.
 *
 * Error Handling Strategy:
 *   - All thrown errors are logged via `LoggedError.isTurtlesAllTheWayDownBaby` with context metadata.
 *   - Consumers should rely on `isError` + `error.message` for UI messaging; avoid parsing thrown error shapes.
 *
 * Performance Considerations:
 *   - Single network round-trip; JSON parsing only transformation.
 *   - Suitable for SSR hydration if integrated higher in tree (currently designed for client usage).
 *
 * Testing Notes:
 *   - Integration tests can mock global `fetch` and assert state transitions driven by React Query.
 *   - For retry flows, sequence `mockRejectedValueOnce` followed by `mockResolvedValueOnce` before triggering refetch.
 *
 * Accessibility / UX:
 *   - Hook supplies granular state flags letting UI implement progressive disclosure (spinner -> retry -> empty -> content).
 *
 * Security:
 *   - Relies on server route authentication (session check); client hook does not embed auth logic.
 *   - Ensure cookies / headers propagate automatically (Next.js fetch wrapper) for protected routes.
 *
 * Usage Example:
 *   const { data, isLoading, isError, error, refetch } = useChatHistory(chatId);
 *   if (isLoading) return <Loading/>;
 *   if (isError) return <ErrorView message={error.message} onRetry={refetch}/>;
 *   if (!data) return <EmptyChat/>; // 404
 *   return <Chat turns={data.turns}/>;
 *
 * Extension Points:
 *   - Add query options (e.g., refetchInterval) by exposing an overload accepting a partial UseQueryOptions.
 *   - Inject suspense boundaries by enabling `suspense: true` (ensure callers prepared for thrown promises).
 *
 * Maintainability Guidelines:
 *   - Keep business logic (title derivation, etc.) out of the data hook; place in presentation component.
 *   - Avoid adding UI concerns (formatting dates) here; return raw canonical data.
 */
import { type ChatDetails } from '@/lib/ai';
import { LoggedError } from '@/lib/react-util';
import { fetch } from '@/lib/nextjs-util';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

/**
 * Fetch full chat history details for a given chat id.
 *
 * Behavior:
 * - Executes a GET request to `/api/ai/chat/history/{chatId}`.
 * - Returns `null` when a 404 (not found) is received, allowing consumers to distinguish
 *   between an absent chat and an error condition.
 * - Throws for all other non-success HTTP statuses or network faults; React Query (or
 *   direct callers) can then surface error UI / retry affordances.
 *
 * Logging:
 * - All caught errors are passed to `LoggedError.isTurtlesAllTheWayDownBaby` with contextual metadata
 *   before being re-thrown to preserve original stack & semantics.
 *
 * @param chatId Unique identifier of the chat whose history is requested.
 * @returns Parsed `ChatDetails` object or `null` when the chat does not exist.
 * @throws Error on network issues or non-OK, non-404 responses.
 */
async function fetchChatDetails(chatId: string): Promise<ChatDetails | null> {
  try {
    const response = await fetch(`/api/ai/chat/history/${chatId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (response.status === 404) return null;
    if (!response.ok)
      throw new Error(`API request failed with status ${response.status}`);

    return (await response.json()) as ChatDetails;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      context: 'Fetching chat details',
      chatId,
    });
    throw error;
  }
}

/**
 * React Query hook for retrieving a chat's history (turns + messages) with typed
 * loading / error / empty (404) states.
 *
 * Query Key: ['chatDetails', chatId]
 * Cache Strategy:
 *   - `staleTime: 30_000` (30s) prevents jittery refetches after initial load.
 *   - `refetchOnWindowFocus: false` to avoid unexpected network traffic on tab focus.
 *
 * State Semantics:
 *   - `data === undefined` -> initial / loading state (use `isLoading`).
 *   - `data === null` -> chat definitively not found (404).
 *   - `isError` -> fetch failed; `error` contains detail.
 *
 * Usage Pattern:
 *   const { data, isLoading, isError, error, refetch } = useChatHistory(id);
 *   if (isLoading) return <Spinner/>;
 *   if (isError) return <ErrorView message={error.message} onRetry={refetch}/>;
 *   if (!data) return <EmptyChat/>; // 404
 *   return <Chat turns={data.turns}/>;
 *
 * @param chatId Unique chat identifier.
 * @returns React Query result descriptor for the asynchronous fetch.
 */
export function useChatHistory(chatId: string): UseQueryResult<ChatDetails | null, Error> {
  return useQuery<ChatDetails | null, Error>({
    queryKey: ['chatDetails', chatId],
    queryFn: () => fetchChatDetails(chatId),
    // We want a fresh fetch each mount but still allow quick refetches w/out loading flash.
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
