import React from 'react';
import { withJestTestExtensions } from '@/__tests__/shared/jest.test-extensions';
const unauthorizedMock = jest.fn(() => {
    throw new Error('UNAUTHORIZED');
});
const notFoundMock = jest.fn(() => {
    throw new Error('NOT_FOUND');
});
jest.mock('next/navigation', () => ({
    unauthorized: () => unauthorizedMock(),
    notFound: () => notFoundMock(),
}));
const setSession = (userId) => {
    if (userId == null) {
        withJestTestExtensions().session = null;
    }
    else {
        withJestTestExtensions().session.user.id = String(userId);
    }
};
const setChatFindFirst = (value) => {
    const db = withJestTestExtensions().makeMockDb();
    db.query.chats.findFirst.mockResolvedValueOnce(value);
};
const isUserAuthorizedMock = jest.fn();
jest.mock('@/lib/site-util/auth', () => ({
    isUserAuthorized: (args) => isUserAuthorizedMock(args),
}));
jest.mock('@/lib/nextjs-util', () => ({
    extractParams: async (req) => ({
        chatId: (await req.params).chatId,
    }),
}));
jest.mock('/components/email-message/dashboard-layout/email-dashboard-layout', () => ({
    EmailDashboardLayout: ({ children }) => (<div data-testid="layout">{children}</div>),
}));
jest.mock('@/components/ai/chat/history', () => {
    const ChatHistory = (props) => {
        return <div data-testid="chat-history" {...props}/>;
    };
    return { ChatHistory };
});
const findChatHistoryProps = (node) => {
    if (!node)
        return null;
    if (Array.isArray(node)) {
        for (const child of node) {
            const found = findChatHistoryProps(child);
            if (found)
                return found;
        }
        return null;
    }
    if (React.isValidElement(node)) {
        const typeFn = node.type;
        if (typeof typeFn === 'function' &&
            typeFn.name === 'ChatHistory') {
            return node.props;
        }
        const element = node;
        return findChatHistoryProps(element.props && element.props.children);
    }
    return null;
};
let ChatDetailPage;
let getChatDetails;
beforeAll(async () => {
    const mod = await import('@/app/messages/chat/[chatId]/page');
    ChatDetailPage = mod.default;
    const lib = await import('@/lib/ai/chat/history');
    getChatDetails = lib.getChatDetails;
});
describe('ChatDetailPage', () => {
    beforeEach(() => {
    });
    test('unauthorized when no session', async () => {
        setSession(null);
        await expect(ChatDetailPage({
            params: Promise.resolve({ chatId: 'abc123' }),
        })).rejects.toThrow('UNAUTHORIZED');
        expect(unauthorizedMock).toHaveBeenCalledTimes(1);
        expect(notFoundMock).not.toHaveBeenCalled();
    });
    test('notFound when chat absent', async () => {
        setSession(42);
        setChatFindFirst(undefined);
        await expect(ChatDetailPage({
            params: Promise.resolve({ chatId: 'abc123' }),
        })).rejects.toThrow('NOT_FOUND');
        expect(unauthorizedMock).not.toHaveBeenCalled();
        expect(notFoundMock).toHaveBeenCalledTimes(1);
    });
    test('notFound when user unauthorized', async () => {
        setSession(42);
        setChatFindFirst({
            id: 'abc123',
            userId: 99,
            title: 'Secret',
        });
        isUserAuthorizedMock.mockResolvedValueOnce(false);
        await expect(ChatDetailPage({
            params: Promise.resolve({ chatId: 'abc123' }),
        })).rejects.toThrow('NOT_FOUND');
        expect(notFoundMock).toHaveBeenCalledTimes(1);
    });
    test('success passes title', async () => {
        setSession(42);
        setChatFindFirst({
            id: 'abc123',
            userId: 42,
            title: 'My Chat',
        });
        isUserAuthorizedMock.mockResolvedValueOnce(true);
        const jsx = await ChatDetailPage({
            params: Promise.resolve({ chatId: 'abc123' }),
        });
        expect(jsx).toBeTruthy();
        const props = findChatHistoryProps(jsx);
        expect(props).toEqual({ chatId: 'abc123', title: 'My Chat' });
    });
    test('success with null title passes undefined', async () => {
        setSession(7);
        setChatFindFirst({
            id: 'zzz999',
            userId: 7,
            title: null,
        });
        isUserAuthorizedMock.mockResolvedValueOnce(true);
        const jsx = await ChatDetailPage({
            params: Promise.resolve({ chatId: 'zzz999' }),
        });
        const props = findChatHistoryProps(jsx);
        expect(props).toEqual({ chatId: 'zzz999', title: undefined });
    });
});
describe('getChatDetails', () => {
    beforeEach(() => {
        isUserAuthorizedMock.mockReset();
    });
    test('returns ok false when chat missing', async () => {
        setChatFindFirst(undefined);
        const res = await getChatDetails({ chatId: 'missing', userId: 1 });
        expect(res).toEqual({ ok: false });
    });
    test('returns ok false when unauthorized', async () => {
        setChatFindFirst({
            id: 'c1',
            userId: 2,
            title: 'T',
        });
        isUserAuthorizedMock.mockResolvedValueOnce(false);
        const res = await getChatDetails({ chatId: 'c1', userId: 99 });
        expect(res).toEqual({ ok: false });
    });
    test('returns ok true with title', async () => {
        setChatFindFirst({
            id: 'c1',
            userId: 5,
            title: 'T',
        });
        isUserAuthorizedMock.mockResolvedValueOnce(true);
        const res = await getChatDetails({ chatId: 'c1', userId: 5 });
        expect(res).toEqual({ ok: true, title: 'T' });
    });
    test('returns ok true with undefined title when null', async () => {
        setChatFindFirst({
            id: 'c2',
            userId: 5,
            title: null,
        });
        isUserAuthorizedMock.mockResolvedValueOnce(true);
        const res = await getChatDetails({ chatId: 'c2', userId: 5 });
        expect(res).toEqual({ ok: true, title: undefined });
    });
});
//# sourceMappingURL=page.test.jsx.map