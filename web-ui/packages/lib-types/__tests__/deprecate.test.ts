jest.mock('../src/get-stack-trace', () => ({
    getStackTrace: jest.fn(() => 'mock-stack-frame'),
}));

import { deprecate } from '../src/deprecate';

describe('deprecate', () => {
    const originalNextRuntime = process.env.NEXT_RUNTIME;
    let emitWarningSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        emitWarningSpy = jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        emitWarningSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        delete process.env.NEXT_RUNTIME;
    });

    afterAll(() => {
        if (originalNextRuntime === undefined) {
            delete process.env.NEXT_RUNTIME;
        } else {
            process.env.NEXT_RUNTIME = originalNextRuntime;
        }
    });

    it('emits process warning on non-edge runtimes and forwards args/this', () => {
        process.env.NEXT_RUNTIME = 'nodejs';

        const fn = function (this: { factor: number }, value: number): number {
            return this.factor * value;
        };
        const wrapped = deprecate(fn, 'custom deprecation', 'DEP123');

        const result = wrapped.call({ factor: 3 }, 4);

        expect(result).toBe(12);
        expect(emitWarningSpy).toHaveBeenCalledTimes(1);
        const [message, options] = emitWarningSpy.mock.calls[0] ?? [];
        expect(message).toContain('custom deprecation');
        expect(message).toContain('mock-stack-frame');
        expect(options).toEqual({ code: 'DEP123', type: 'DeprecationWarning' });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('logs console warning on edge runtime', () => {
        process.env.NEXT_RUNTIME = 'EDGE';

        const wrapped = deprecate((name: string) => `hi ${name}`, 'edge deprecation', 'DEP987');

        expect(wrapped('sam')).toBe('hi sam');
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        const [message] = consoleWarnSpy.mock.calls[0] ?? [];
        expect(String(message)).toContain('DeprecationWarning DEP987: edge deprecation');
        expect(String(message)).toContain('mock-stack-frame');
        expect(emitWarningSpy).not.toHaveBeenCalled();
    });

    it('uses defaults for message and code and adds deprecation to toString', () => {
        delete process.env.NEXT_RUNTIME;

        const target = (a: number, b: number): number => a + b;
        const wrapped = deprecate(target);

        expect(wrapped(1, 2)).toBe(3);
        const [, options] = emitWarningSpy.mock.calls[0] ?? [];
        expect(options).toEqual({ code: 'DEP000', type: 'DeprecationWarning' });
        expect(wrapped.toString()).toContain('@deprecated The target function is deprecated.');
    });

    it('falls back to DEP000 when null is provided for code', () => {
        process.env.NEXT_RUNTIME = 'nodejs';

        const wrapped = deprecate(
            (value: string) => value.toUpperCase(),
            'nullish code fallback',
            null as unknown as string
        );

        expect(wrapped('ok')).toBe('OK');
        const [, options] = emitWarningSpy.mock.calls[0] ?? [];
        expect(options).toEqual({ code: 'DEP000', type: 'DeprecationWarning' });
    });
});