/* @jest-environment node */

import React from 'react';
import { withJestTestExtensions } from '@/__tests__/shared/jest.test-extensions';

/**
 * NOTE: Global test environment mocks are defined in __tests__/jest.setup.ts.
 * We intentionally DO NOT re-mock modules already covered there (auth, drizzle, etc.).
 * Instead we retrieve and manipulate their existing jest mocks to avoid divergence.
 */

// ---------------- Core Dependency Mocks (only those NOT globally mocked) ----------------

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

// Use the globally mocked auth (from jest.setup.ts) and override implementation per test via helper
// import { auth as authMockOriginal } from '@/auth';
// const authMock = authMockOriginal as unknown as jest.Mock;

const setSession = (userId: number | null) => {
  if (userId == null) {
    withJestTestExtensions().session = null;
  } else {
    withJestTestExtensions().session!.user.id = String(userId);
  }
};

const setChatFindFirst = (value: unknown) => {
  const db = withJestTestExtensions().makeMockDb();
  (db.query.chats.findFirst as jest.Mock).mockResolvedValueOnce(value);
};

const isUserAuthorizedMock = jest.fn();
jest.mock('@/lib/site-util/auth', () => ({
  isUserAuthorized: (args: { signedInUserId: number; ownerUserId: number }) =>
    isUserAuthorizedMock(args),
}));

jest.mock('@compliance-theater/nextjs/server/utils', () => ({
  extractParams: async (req: { params: Promise<{ chatId: string }> }) => ({
    chatId: (await req.params).chatId,
  }),
}));

jest.mock(
  '/components/email-message/dashboard-layout/email-dashboard-layout',
  () => ({
    EmailDashboardLayout: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="layout">{children}</div>
    ),
  }),
);

interface MockChatHistoryProps {
  chatId: string;
  title?: string;
}
jest.mock('@/components/ai/chat/history', () => {
  const ChatHistory = (props: MockChatHistoryProps) => {
    return <div data-testid="chat-history" {...props} />;
  };
  return { ChatHistory };
});

// After module factory above runs, retrieve the ref via require cache once imports resolved
// (Will be set in beforeAll after dynamic import of module under test.)

// Utility: recursively walk React element tree to find ChatHistory element and return its props
// Narrow node for React element traversal without using 'any'.
type PossibleNode =
  | React.ReactElement
  | React.ReactElement[]
  | null
  | undefined
  | string
  | number
  | boolean;
const findChatHistoryProps = (
  node: PossibleNode,
): MockChatHistoryProps | null => {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findChatHistoryProps(child);
      if (found) return found;
    }
    return null;
  }
  if (React.isValidElement(node)) {
    const typeFn = node.type as unknown;
    if (
      typeof typeFn === 'function' &&
      (typeFn as { name?: string }).name === 'ChatHistory'
    ) {
      return node.props as MockChatHistoryProps; // props shape controlled by our mock
    }
    const element = node as React.ReactElement & {
      props?: { children?: PossibleNode };
    };
    return findChatHistoryProps(
      element.props && (element.props.children as PossibleNode),
    );
  }
  return null;
};

// Import module under test AFTER mocks so dependencies are mocked correctly.
let ChatDetailPage: (args: {
  params: Promise<{ chatId: string }>;
}) => Promise<React.JSX.Element>;
let getChatDetails: (args: {
  chatId: string;
  userId: number;
}) => Promise<{ ok: boolean; title?: string }>;
beforeAll(async () => {
  const mod = await import('@/app/messages/chat/[chatId]/page');
  ChatDetailPage = mod.default; // ChatDetailPage is the default export
  const lib = await import('@/lib/ai/chat/history');
  getChatDetails = lib.getChatDetails; // getChatDetails is a named export
});

// ---------------- Tests: Page Wrapper ----------------

describe('ChatDetailPage', () => {
  beforeEach(() => {
    /*
    unauthorizedMock.mockClear();
    notFoundMock.mockClear();
    // authMock.mockReset();
    drizDbWithInitMock.mockReset();
    isUserAuthorizedMock.mockReset();
    */
  });

  test('unauthorized when no session', async () => {
    setSession(null);
    await expect(
      ChatDetailPage({
        params: Promise.resolve({ chatId: 'abc123' }),
      }),
    ).rejects.toThrow('UNAUTHORIZED');
    expect(unauthorizedMock).toHaveBeenCalledTimes(1);
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  test('notFound when chat absent', async () => {
    setSession(42);
    setChatFindFirst(undefined); // no chat
    await expect(
      ChatDetailPage({
        params: Promise.resolve({ chatId: 'abc123' }),
      }),
    ).rejects.toThrow('NOT_FOUND');
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
    await expect(
      ChatDetailPage({
        params: Promise.resolve({ chatId: 'abc123' }),
      }),
    ).rejects.toThrow('NOT_FOUND');
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

// ---------------- Tests: getChatDetails ----------------

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
