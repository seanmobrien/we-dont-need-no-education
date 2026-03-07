const maybeAllowGlobalMockReset =
    process.env.ALLOW_GLOBAL_JEST_MOCK_RESET === 'true';

const disallowGlobalMockReset = (
    method: 'clearAllMocks' | 'resetAllMocks',
): void => {
    if (maybeAllowGlobalMockReset) return;

    const original = jest[method].bind(jest);

    Object.defineProperty(jest, method, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: (...args: unknown[]) => {
            const details =
                method === 'clearAllMocks'
                    ? 'Use targeted clears like mockFn.mockClear() for suite-owned mocks.'
                    : 'Use targeted resets like mockFn.mockReset() for suite-owned mocks.';

            throw new Error(
                `Disallowed Jest API: jest.${method}(). ${details} ` +
                'If you must bypass this temporarily, set ALLOW_GLOBAL_JEST_MOCK_RESET=true.',
            );
        },
    });

    (jest as any)[`__original_${method}`] = original;
};

disallowGlobalMockReset('clearAllMocks');
disallowGlobalMockReset('resetAllMocks');
