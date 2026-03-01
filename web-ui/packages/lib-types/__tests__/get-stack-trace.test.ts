import { getStackTrace } from '../src/get-stack-trace';

describe('getStackTrace', () => {
    const OriginalError = Error;

    const setMockErrorStack = (stack: string | undefined): void => {
        class MockError extends OriginalError {
            constructor() {
                super();
                this.stack = stack;
            }
        }
        (globalThis as { Error: ErrorConstructor }).Error = MockError as unknown as ErrorConstructor;
    };

    afterEach(() => {
        (globalThis as { Error: ErrorConstructor }).Error = OriginalError;
    });

    it('returns empty string when no stack is available', () => {
        setMockErrorStack(undefined);

        expect(getStackTrace()).toBe('');
    });

    it('filters node/internal frames when myCodeOnly is true', () => {
        setMockErrorStack([
            'Error: sample',
            '    at first (/workspace/src/a.ts:1:1)',
            '    at dep (/workspace/node_modules/x/index.js:1:1)',
            '    at internal (internal/process/task_queues:95:5)',
            '    at last (/workspace/src/z.ts:9:1)',
        ].join('\n'));

        const trace = getStackTrace({ skip: 1, myCodeOnly: true });

        expect(trace).toContain('/workspace/src/a.ts:1:1');
        expect(trace).toContain('/workspace/src/z.ts:9:1');
        expect(trace).not.toContain('node_modules');
        expect(trace).not.toContain('internal/process');
    });

    it('falls back to original frames when filtering removes all frames', () => {
        setMockErrorStack('   \n   ');

        const trace = getStackTrace({ skip: 0, myCodeOnly: true });

        expect(trace).toBe('   \n   ');
    });

    it('supports skip and max slicing without myCodeOnly filtering', () => {
        setMockErrorStack([
            'Error: sample',
            'at one (/a.ts:1)',
            'at two (/b.ts:2)',
            'at three (/c.ts:3)',
        ].join('\n'));

        const trace = getStackTrace({ skip: 1, max: 3, myCodeOnly: false });

        expect(trace).toBe('at one (/a.ts:1)\nat two (/b.ts:2)');
    });
});