const routerMock = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
};

export const useRouter = jest.fn(() => routerMock);
export const usePathname = jest.fn(() => '/test');
export const useSearchParams = jest.fn(() => new URLSearchParams());
export const useParams = jest.fn(() => ({}));
export const useSelectedLayoutSegment = jest.fn(() => null);
export const useSelectedLayoutSegments = jest.fn(() => []);

export const redirect = jest.fn((url?: string) => {
    throw new Error(`NEXT_REDIRECT${url ? `:${url}` : ''}`);
});

export const permanentRedirect = jest.fn((url?: string) => {
    throw new Error(`NEXT_PERMANENT_REDIRECT${url ? `:${url}` : ''}`);
});

export const notFound = jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
});

export const unauthorized = jest.fn(() => {
    throw new Error('NEXT_UNAUTHORIZED');
});

export const __routerMock = routerMock;
