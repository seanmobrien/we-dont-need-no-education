const makeResponse = () => Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: Buffer.from('{ "status": "ok" }'),
});
jest.mock('got', () => {
    const mockGot = jest.fn(() => {
        return {
            body: Buffer.from('ok'),
            headers: { 'Content-Type': 'application/json' },
            statusCode: 200,
            rawBody: Buffer.from('ok')
        };
    });
    mockGot.stream = jest.fn().mockReturnValue({
        on: jest.fn(),
        pipe: jest.fn(),
    });
    mockGot.get = jest.fn();
    mockGot.post = jest.fn();
    mockGot.stream = jest.fn();
    const gotExtended = {
        get: (...args) => mockGot.get(...args),
        post: (...args) => mockGot.post(...args),
        stream: (...args) => mockGot.stream(...args),
    };
    const gotExtend = jest.fn().mockReturnValue(gotExtended);
    mockGot.extend = gotExtend;
    return {
        __esModule: true,
        default: mockGot,
        got: mockGot,
        gotExtended,
    };
});
try {
    jest.mock('@/lib/nextjs-util/fetch', () => {
        let mockFetch = jest.fn().mockImplementation(() => {
            return makeResponse();
        });
        return {
            fetch: mockFetch
        };
    });
}
catch {
}
try {
    jest.mock('@/lib/nextjs-util/server/fetch', () => {
        let mockFetch = jest.fn().mockImplementation(() => {
            return makeResponse();
        });
        return {
            fetch: mockFetch
        };
    });
}
catch {
}
try {
    jest.mock('@/lib/nextjs-util/dynamic-fetch', () => {
        let mockFetch = jest.fn().mockImplementation(() => {
            return makeResponse();
        });
        return {
            fetch: mockFetch
        };
    });
}
catch {
}
let originalFetch;
beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation(() => {
        return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'Content-Type': 'application/json' }),
            body: Buffer.from('{ "status": "ok" }'),
        });
    });
});
afterEach(() => {
    if (originalFetch) {
        globalThis.fetch = originalFetch;
    }
});
export {};
//# sourceMappingURL=jest.mock-got.js.map