const createMockSpan = () => ({
    end: jest.fn(),
    setAttribute: jest.fn(),
    setStatus: jest.fn(),
    recordException: jest.fn(),
    addEvent: jest.fn(),
    updateName: jest.fn(),
    spanContext: jest.fn(),
    isRecording: jest.fn(),
});
jest.mock('@opentelemetry/api', () => ({
    trace: {
        getTracer: jest.fn(() => ({
            startActiveSpan: jest.fn((name, fn2, ctx, fn) => (fn ?? fn2)(createMockSpan())),
        })),
    },
    metrics: {
        getMeter: jest.fn(() => ({
            createCounter: jest.fn().mockReturnValue({
                add: jest.fn(),
            }),
            createHistogram: jest.fn().mockReturnValue({
                record: jest.fn(),
            }),
            createObservableGauge: jest.fn().mockReturnValue({
                addCallback: jest.fn(),
            }),
            createUpDownCounter: jest.fn().mockReturnValue({
                add: jest.fn(),
            }),
            createObservableUpDownCounter: jest.fn().mockReturnValue({
                addCallback: jest.fn(),
            }),
            createObservableCounter: jest.fn().mockReturnValue({
                addCallback: jest.fn(),
            }),
            createObservableHistogram: jest.fn().mockReturnValue({
                addCallback: jest.fn(),
            }),
        })),
    },
    context: {
        active: jest.fn(),
    },
    propagation: {
        extract: jest.fn(),
    },
    SpanContext: {
        traceId: 'traceId',
        spanId: 'spanId',
        traceFlags: 1,
    },
    SpanKind: { SERVER: 1 },
    SpanStatusCode: { OK: 1, ERROR: 2 },
}));
jest.mock('@opentelemetry/sdk-trace-base', () => {
    let ExportResult;
    (function (ExportResult) {
        ExportResult[ExportResult["OK"] = 1] = "OK";
        ExportResult[ExportResult["ERROR"] = 2] = "ERROR";
    })(ExportResult || (ExportResult = {}));
    const mockExport = jest.fn((spans, callback) => {
        callback(ExportResult.OK);
    });
    return {
        BasicTracerProvider: jest.fn().mockReturnValue({
            getTracer: jest.fn(() => {
                return {
                    startSpan: jest.fn(() => createMockSpan()),
                };
            }),
        }),
        InMemorySpanExporter: jest.fn().mockReturnValue({
            export: mockExport,
            reset: jest.fn(),
            getFinishedSpans: jest.fn(() => {
                let ret = [];
                mockExport.mock.calls.forEach(([spans]) => {
                    ret.push(...spans);
                });
                return ret;
            }),
        }),
        ReadableSpan: jest.fn().mockReturnValue({
            name: 'test-span',
            kind: 1,
            traceId: 'traceId',
            spanId: 'spanId',
            traceFlags: 1,
            resource: {
                attributes: {},
            },
            instrumentationScope: {
                name: 'test',
            },
            parentSpanId: 'parentSpanId',
            startTime: new Date(),
            endTime: new Date(),
            duration: 1,
            attributes: {},
            links: [],
            events: [],
            status: {
                code: 1,
                message: 'test',
            },
            resourceSpans: [],
            scopeSpans: [],
        }),
        ExportResult,
    };
});
export {};
//# sourceMappingURL=jest.mock-opentelemetry.js.map