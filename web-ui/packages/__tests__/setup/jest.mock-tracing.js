import { trace } from '@opentelemetry/api';
export const createMockTracer = () => {
    let activeSpy;
    const spans = new Array();
    const createMockSpan = () => {
        const mockSpan = {
            setAttribute: jest.fn(),
            setStatus: jest.fn(),
            recordException: jest.fn(),
            end: jest.fn(),
        };
        spans.push(mockSpan);
        return mockSpan;
    };
    const thisTracer = {
        startActiveSpan: jest
            .fn()
            .mockImplementation((name, arg2, arg3, arg4) => {
            const cb = [arg2, arg3, arg4].find((a) => typeof a === 'function');
            const span = createMockSpan();
            if (cb) {
                return cb(span);
            }
            return span;
        }),
        startSpan: jest.fn().mockImplementation(createMockSpan),
        setup: () => {
            if (activeSpy)
                return;
            activeSpy = jest.spyOn(trace, 'getTracer').mockReturnValue(thisTracer);
        },
        dispose: () => {
            activeSpy?.mockRestore();
            activeSpy = undefined;
            while (spans.length) {
                spans.pop();
            }
        },
    };
    return thisTracer;
};
//# sourceMappingURL=jest.mock-tracing.js.map