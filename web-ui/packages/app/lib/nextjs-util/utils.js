import EventEmitter from '@protobufjs/eventemitter';
import { log } from '@compliance-theater/logger/core';
import { isNextApiRequest, isNextRequest, isNextResponse, isNextApiResponse, } from './guards';
import { getStackTrace } from './get-stack-trace';
export const getHeaderValue = (req, headerName) => {
    if (isNextApiRequest(req)) {
        return req.headers[headerName.toLowerCase()];
    }
    if (isNextRequest(req) || isNextResponse(req)) {
        return req.headers.get(headerName);
    }
    if (isNextApiResponse(req)) {
        return req.getHeader(headerName);
    }
    if (typeof req === 'object' && 'getHeader' in req) {
        const asResponse = req;
        if (typeof asResponse.getHeader === 'function') {
            return asResponse.getHeader(headerName);
        }
    }
    if (!!req && 'headers' in req) {
        const asHeaders = req;
        if (typeof asHeaders.headers.get === 'function') {
            return asHeaders.headers.get(headerName);
        }
        return (req.headers?.[headerName.toLowerCase()] ?? null);
    }
    return null;
};
const warnDeprecatedOnNode = (message, options) => process.emitWarning(message, options);
const warnDeprecatedOffNode = (message, options) => log((l) => l.warn(`${options.type ?? 'DeprecationWarning'} ${options.code ?? 'DEP000'}: ${message}`));
export const deprecate = (fn, message = `The ${fn.name} function is deprecated.`, code = 'DEP000') => {
    const stack = getStackTrace({ skip: 2, myCodeOnly: true });
    const formattedMessage = `${message}\n${stack}`;
    const deprecatedFn = function (...args) {
        const options = { code: code ?? 'DEP000', type: 'DeprecationWarning' };
        if ((process.env.NEXT_RUNTIME ?? '').toLowerCase() === 'edge') {
            warnDeprecatedOffNode(formattedMessage, options);
        }
        else {
            warnDeprecatedOnNode(formattedMessage, options);
        }
        return fn.apply(this, args);
    };
    Object.defineProperty(deprecatedFn, 'toString', {
        value: () => `/ ** @deprecated ${message} * /\n${fn.toString()}`,
    });
    return deprecatedFn;
};
export const withEmittingDispose = (input) => {
    const emitter = new EventEmitter();
    const originalDispose = input[Symbol.dispose];
    const dispose = () => {
        if (originalDispose) {
            originalDispose();
        }
        emitter.emit('dispose');
        emitter.off();
    };
    const ret = input;
    ret[Symbol.dispose] = dispose;
    ret.addDisposeListener = (listener) => {
        emitter.on('dispose', listener);
    };
    ret.removeDisposeListener = (listener) => {
        emitter.off('dispose', listener);
    };
    return ret;
};
//# sourceMappingURL=utils.js.map