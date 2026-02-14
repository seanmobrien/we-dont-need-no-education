import { toolProxyMiddlewareFactory, wrapWithToolProxyMiddleware } from '../../../../lib/ai/middleware/tool-proxy';
const wrapLanguageModelMock = jest.fn();
jest.mock('../../../../lib/ai/middleware/state-management/middleware-state-manager', () => ({
    MiddlewareStateManager: {
        Instance: {
            basicMiddlewareWrapper: jest.fn((input) => input.middleware),
        },
    },
}));
jest.mock('ai', () => ({
    wrapLanguageModel: (...args) => wrapLanguageModelMock(...args),
}));
describe('toolProxyMiddlewareFactory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('merges tools by default and removes duplicates by name', async () => {
        const newTools = [
            {
                type: 'function',
                name: 'b',
                description: 'new b',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                type: 'function',
                name: 'c',
                description: 'c',
                inputSchema: { type: 'object', properties: {} },
            },
        ];
        const middleware = toolProxyMiddlewareFactory({ tools: newTools });
        const params = {
            prompt: 'hello',
            tools: [
                {
                    type: 'function',
                    name: 'a',
                    description: 'a',
                    inputSchema: { type: 'object', properties: {} },
                },
                {
                    type: 'function',
                    name: 'b',
                    description: 'existing b',
                    inputSchema: { type: 'object', properties: {} },
                },
            ],
        };
        const result = await middleware.transformParams({ type: 'generate', model: {}, params });
        expect(result.tools?.map((t) => t.name)).toEqual(['a', 'b', 'c']);
    });
    it('replaces tools when merge=false', async () => {
        const newTools = [
            {
                type: 'function',
                name: 'x',
                description: 'x',
                inputSchema: { type: 'object', properties: {} },
            },
        ];
        const middleware = toolProxyMiddlewareFactory({ tools: newTools, merge: false });
        const params = {
            prompt: 'hi',
            tools: [
                {
                    type: 'function',
                    name: 'a',
                    description: 'a',
                    inputSchema: { type: 'object', properties: {} },
                },
            ],
        };
        const result = await middleware.transformParams({ type: 'generate', model: {}, params });
        expect(result.tools).toBe(newTools);
    });
    it('adds tools when params.tools is undefined', async () => {
        const newTools = [
            {
                type: 'function',
                name: 'only',
                description: 'only',
                inputSchema: { type: 'object', properties: {} },
            },
        ];
        const middleware = toolProxyMiddlewareFactory({ tools: newTools });
        const params = { prompt: 'hi', tools: undefined };
        const result = await middleware.transformParams({ type: 'generate', model: {}, params });
        expect(result.tools).toEqual(newTools);
    });
});
describe('wrapWithToolProxyMiddleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('wraps model with tool proxy middleware', () => {
        const model = { id: 'model' };
        const tools = [];
        wrapWithToolProxyMiddleware({ model, tools });
        expect(wrapLanguageModelMock).toHaveBeenCalledTimes(1);
        const callArgs = wrapLanguageModelMock.mock.calls[0][0];
        expect(callArgs.model).toBe(model);
        expect(callArgs.middleware).toBeDefined();
    });
});
//# sourceMappingURL=tool-proxy.test.js.map