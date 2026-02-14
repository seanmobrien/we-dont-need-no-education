const nextDigestSymbol = Symbol.for('next.console.error.digest');
const nextConsoleErrorType = Symbol.for('next.console.error.type');
export const isConsoleError = (error) => typeof error === 'object' &&
    !!error &&
    nextDigestSymbol in error &&
    error[nextDigestSymbol] === 'NEXT_CONSOLE_ERROR';
//# sourceMappingURL=next-console-error.js.map