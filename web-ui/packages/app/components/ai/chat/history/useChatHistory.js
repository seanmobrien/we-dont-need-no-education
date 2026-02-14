import { LoggedError } from '@compliance-theater/logger';
import { fetch } from '@/lib/nextjs-util/fetch';
import { useQuery } from '@tanstack/react-query';
async function fetchChatDetails(chatId) {
    try {
        const response = await fetch(`/api/ai/chat/history/${encodeURIComponent(chatId)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        if (response.status === 404)
            return null;
        if (!response.ok)
            throw new Error(`API request failed with status ${response.status}`);
        return (await response.json());
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            context: 'Fetching chat details',
            chatId,
        });
        throw error;
    }
}
export function useChatHistory(chatId) {
    return useQuery({
        queryKey: ['chatDetails', chatId],
        queryFn: () => fetchChatDetails(chatId),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });
}
//# sourceMappingURL=useChatHistory.js.map