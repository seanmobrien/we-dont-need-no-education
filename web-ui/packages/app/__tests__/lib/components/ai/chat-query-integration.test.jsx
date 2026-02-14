import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import React from 'react';
import { renderHook } from '@/__tests__/test-utils';
import { useChatFetchWrapper } from '@/lib/components/ai/chat-fetch-wrapper';
import { fetch } from '@/lib/nextjs-util/fetch';
if (!globalThis.ReadableStream) {
    const { ReadableStream } = require('stream/web');
    globalThis.ReadableStream = ReadableStream;
}
jest.mock('@compliance-theater/logger', () => ({
    log: jest.fn((fn) => fn({ warn: jest.fn() })),
}));
jest.mock('@compliance-theater/env', () => ({
    env: jest.fn(() => 'http://localhost:3000'),
}));
jest.mock('@/lib/ai/core/chat-ids', () => ({
    notCryptoSafeKeyHash: jest.fn((input) => `hash-${input.slice(0, 10)}`),
}));
const mockResponse = (body, init = {}) => ({
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status || 200,
    statusText: init.statusText || 'OK',
    headers: new Headers(init.headers || {}),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    json: () => Promise.resolve(typeof body === 'object' ? body : JSON.parse(body)),
    body: new ReadableStream({
        start(controller) {
            const data = typeof body === 'string' ? body : JSON.stringify(body);
            controller.enqueue(new TextEncoder().encode(data));
            controller.close();
        },
    }),
});
const createTestWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    const TestWrapper = ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children);
    TestWrapper.displayName = 'TestWrapper';
    return TestWrapper;
};
describe('TanStack React Query Chat Integration', () => {
    beforeEach(() => {
        fetch.mockClear();
    });
    describe('useChatFetchWrapper', () => {
        it('should create a fetch wrapper when used in QueryClient context', async () => {
            const { result } = renderHook(() => useChatFetchWrapper(), {
                wrapper: createTestWrapper(),
            });
            expect(result.current.chatFetch).toBeDefined();
            expect(result.current.queryClient).toBeDefined();
            expect(result.current.queryClient).toBeInstanceOf(QueryClient);
        });
        it('should create chatFetch function that makes requests', async () => {
            const mockResponseData = { message: 'success' };
            fetch.mockResolvedValueOnce(mockResponse(mockResponseData));
            const { result } = renderHook(() => useChatFetchWrapper(), {
                wrapper: createTestWrapper(),
            });
            const { chatFetch } = result.current;
            expect(typeof chatFetch).toBe('function');
        });
        it('should throw error when used outside QueryClient context', () => {
            const originalError = console.error;
            console.error = jest.fn();
            try {
                renderHook(() => useChatFetchWrapper());
            }
            catch (error) {
                expect(error).toEqual(expect.objectContaining({
                    message: expect.stringContaining('No QueryClient set'),
                }));
            }
            console.error = originalError;
        });
    });
});
//# sourceMappingURL=chat-query-integration.test.jsx.map