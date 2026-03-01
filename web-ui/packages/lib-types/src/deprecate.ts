import { getStackTrace } from './get-stack-trace';

// When we're running on node we can process.emitWarning
const warnDeprecatedOnNode = (
    message: string,
    options: { code: string; type: string }
) => process.emitWarning(message, options);

// When we're running on edge or browser we can log to console
const warnDeprecatedOffNode = (
    message: string,
    options: { code: string; type: string }
) => console.warn(
    `${options.type ?? 'DeprecationWarning'} ${options.code ?? 'DEP000'
    }: ${message}`
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const deprecate = <T extends (...args: any[]) => any>(
    fn: T,
    message = `The ${fn.name} function is deprecated.`,
    code = 'DEP000'
) => {
    const stack = getStackTrace({ skip: 4, myCodeOnly: true });
    const formattedMessage = `${message}\n${stack}`;
    const deprecatedFn = function (
        this: ThisParameterType<T>,
        ...args: Parameters<T>
    ): ReturnType<T> {
        const options = { code: code ?? 'DEP000', type: 'DeprecationWarning' };
        if ((process.env.NEXT_RUNTIME ?? '').toLowerCase() === 'edge') {
            // process.emitWarning is no bueno on edge or browser runtimes, so we do a console.warn instead
            warnDeprecatedOffNode(formattedMessage, options);
        } else {
            // But is super-awesome on node runtimes, so we use it
            warnDeprecatedOnNode(formattedMessage, options);
        }
        return fn.apply(this, args);
    } as T;

    // Add a JSDoc @deprecated tag dynamically for IDE recognition
    Object.defineProperty(deprecatedFn, 'toString', {
        value: () => `/ ** @deprecated ${message} * /\n${fn.toString()}`,
    });

    return deprecatedFn;
};