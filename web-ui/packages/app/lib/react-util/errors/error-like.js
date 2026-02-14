const isErrorLikeBrand = Symbol('mct2k.utils.error-like.brand');
export const isErrorLike = (value) => {
    if (typeof value !== 'object' || !value) {
        return false;
    }
    const castToErrorLike = value;
    if (castToErrorLike[isErrorLikeBrand] === true) {
        return true;
    }
    const check = typeof castToErrorLike.message === 'string' &&
        (castToErrorLike.name === undefined ||
            typeof castToErrorLike.name === 'string') &&
        (castToErrorLike.stack === undefined ||
            typeof castToErrorLike.stack === 'string') &&
        (castToErrorLike.cause === undefined ||
            typeof castToErrorLike.cause === 'object');
    if (check) {
        return true;
    }
    return false;
};
export const isStringOrErrorLike = (value) => (typeof value === 'string' && !!value) || isErrorLike(value);
const nodeInspectCustom = Symbol.for('nodejs.util.inspect.custom');
class ErrorLikeInstance {
    message;
    name;
    stack;
    cause;
    constructor(message, options = {}) {
        this.message = message;
        this.name = options.name ?? 'Error';
        this.stack = options.stack;
        this.cause = options.cause;
        if (!this.stack && options.filename) {
            this.stack = `${this.name}: ${this.message}\n\tat (${options.filename}:${options.lineno ?? 1}:${options.colno ?? 0})`;
        }
    }
    get source() {
        return ErrorLikeInstance.extractSourceFromStack(this.stack);
    }
    get line() {
        const ret = ErrorLikeInstance.extractLineAndColumnFromStack(this.stack);
        return ret ? ret[0] : 0;
    }
    get column() {
        const ret = ErrorLikeInstance.extractLineAndColumnFromStack(this.stack);
        return ret ? ret[1] : 0;
    }
    get [isErrorLikeBrand]() {
        return true;
    }
    toString() {
        return `${this.name ? `${this.name}: ` : ''}${this.message}`;
    }
    [nodeInspectCustom]() {
        return this.stack ? this.stack : this.toString();
    }
    static #extractStackFrameRegex = /at ([\w$.<>]+ )?\((.*[\\/])?([^\\/()]+):(\d+):(\d+)\)/;
    static #ExtractStackFrameGroups = {
        Function: 2,
        Source: 3,
        Line: 4,
        Column: 5,
    };
    static extractFunctionFromStack(stack) {
        const stackLine = stack?.split('\n')?.at(1);
        if (!stackLine) {
            return undefined;
        }
        const match = ErrorLikeInstance.#extractStackFrameRegex.exec(stackLine);
        return match
            ? match[ErrorLikeInstance.#ExtractStackFrameGroups.Function]
            : undefined;
    }
    static extractSourceFromStack(stack) {
        const stackLine = stack?.split('\n')?.at(1);
        if (!stackLine) {
            return undefined;
        }
        const match = ErrorLikeInstance.#extractStackFrameRegex.exec(stackLine);
        return match
            ? match[ErrorLikeInstance.#ExtractStackFrameGroups.Source]
            : undefined;
    }
    static extractLineAndColumnFromStack(stack) {
        const stackLine = stack?.split('\n')?.at(1);
        if (!stackLine) {
            return undefined;
        }
        const match = ErrorLikeInstance.#extractStackFrameRegex.exec(stackLine);
        return match
            ? [
                Number(match[ErrorLikeInstance.#ExtractStackFrameGroups.Line]),
                Number(match[ErrorLikeInstance.#ExtractStackFrameGroups.Column]),
            ]
            : undefined;
    }
    static errorLikeProxyFactory(inner) {
        if (inner[isErrorLikeBrand]) {
            return inner;
        }
        return new Proxy(inner, {
            get(target, prop, receiver) {
                let ret = undefined;
                if (prop in target) {
                    ret = Reflect.get(target, prop, receiver);
                }
                if (ret === undefined) {
                    switch (prop) {
                        case isErrorLikeBrand:
                            return true;
                        case 'source':
                            ret = ErrorLikeInstance.extractSourceFromStack(target.stack);
                            break;
                        case 'line':
                            const line = ErrorLikeInstance.extractLineAndColumnFromStack(target.stack);
                            ret = line ? line[0] : 0;
                            break;
                        case 'column':
                            const column = ErrorLikeInstance.extractLineAndColumnFromStack(target.stack);
                            ret = column ? column[1] : 0;
                            break;
                        default:
                            ret = undefined;
                            break;
                    }
                }
                return ret;
            },
        });
    }
}
export const asErrorLike = (value, options = {}) => {
    if (!value) {
        return undefined;
    }
    if (isErrorLike(value)) {
        return ErrorLikeInstance.errorLikeProxyFactory(value);
    }
    if (typeof value === 'object') {
        const { message, ...rest } = value;
        return new ErrorLikeInstance(message ?? 'Unexpected error', {
            ...(options ?? {}),
            ...rest,
        });
    }
    return new ErrorLikeInstance(String(value), options);
};
//# sourceMappingURL=error-like.js.map