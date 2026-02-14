import { LoggedError, log } from '@compliance-theater/logger';
import { STATE_PROTOCOL, } from './types';
const middlewareStateFromOptions = (params, options) => {
    let providerOptions = params?.providerOptions;
    if (!providerOptions) {
        providerOptions = {};
        params.providerOptions = providerOptions;
    }
    const create = typeof options === 'object' && options ? options.create === true : false;
    let ret = providerOptions[STATE_PROTOCOL.OPTIONS_ROOT];
    if (!ret && create) {
        ret = {};
        providerOptions[STATE_PROTOCOL.OPTIONS_ROOT] = ret;
    }
    return ret;
};
const middlewarePropFromOptions = (source, options) => {
    const create = typeof options === 'object' && options ? options.create === true : false;
    const props = middlewareStateFromOptions(source, { create });
    if (!props) {
        return undefined;
    }
    if (typeof options === 'object') {
        const field = options.field;
        if (field) {
            return props[field];
        }
        throw new TypeError('field is required');
    }
    return props[options];
};
export const isStateCollectionRequest = (options) => middlewarePropFromOptions(options, STATE_PROTOCOL.COLLECT) === true;
export const isStateRestorationRequest = (options) => middlewarePropFromOptions(options, STATE_PROTOCOL.RESTORE) === true;
const handleStateCollection = async ({ middlewareId, serialize, params, config, }) => {
    let state = {};
    let ops = {};
    try {
        state = await serialize({ config, params });
        const check = middlewareStateFromOptions(params, { create: true });
        if (!check) {
            throw new SyntaxError('Failed to create middleware statebag');
        }
        ops = check;
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'StatefuleMiddleware::handleStateCollection',
            data: {
                state: state,
                middlewareId,
                params,
            },
        });
    }
    const target = ops[STATE_PROTOCOL.RESULTS];
    if (!target || !Array.isArray(target)) {
        throw new TypeError('Failed to retrieve middleware state');
    }
    let addToBag;
    if (target.length === 0) {
        addToBag = true;
    }
    else {
        const lastItem = target[target.length - 1];
        if (lastItem[0] === middlewareId && Object.is(lastItem[1], state)) {
            addToBag = false;
        }
        else {
            addToBag = true;
        }
    }
    if (addToBag) {
        target.push([middlewareId, state]);
    }
    return state;
};
const handleStateRestoration = async ({ config, middlewareId, deserialize, params, }) => {
    const ops = middlewareStateFromOptions(params, { create: true });
    if (!ops) {
        throw new SyntaxError('Failed to create middleware statebag');
    }
    const target = ops[STATE_PROTOCOL.RESULTS];
    if (!target) {
        log((l) => l.warn('No statebag found during state restoration', { middlewareId }));
        return;
    }
    const source = target.shift();
    if (!source) {
        log((l) => l.warn('No state found during state restoration', { middlewareId }));
        return;
    }
    if (source[0] !== middlewareId) {
        log((l) => l.warn('Middleware ID mismatch during state restoration', {
            middlewareId,
        }));
        return;
    }
    try {
        await deserialize({ config, params, state: source[1] });
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'StatefuleMiddleware::handleStateRestoration',
            data: {
                state: source[1],
                middlewareId,
                params,
            },
        });
    }
};
export const createStatefulMiddleware = (config) => {
    const { middlewareId, originalMiddleware } = config;
    const serializer = {
        getMiddlewareId: 'getMiddlewareId' in originalMiddleware &&
            typeof originalMiddleware.getMiddlewareId === 'function'
            ? originalMiddleware.getMiddlewareId
            : () => middlewareId,
        serializeState: 'serializeState' in originalMiddleware &&
            typeof originalMiddleware.serializeState === 'function'
            ? originalMiddleware.serializeState
            : () => Promise.resolve({}),
        deserializeState: 'deserializeState' in originalMiddleware &&
            typeof originalMiddleware.deserializeState === 'function'
            ? originalMiddleware.deserializeState
            : () => Promise.resolve(),
    };
    return {
        ...originalMiddleware,
        wrapGenerate: async (options) => {
            const { params } = options;
            let callInnerMiddleware = true;
            if (isStateCollectionRequest(params)) {
                await handleStateCollection({
                    middlewareId,
                    serialize: serializer.serializeState,
                    params,
                    config,
                });
                callInnerMiddleware = false;
            }
            if (isStateRestorationRequest(params)) {
                await handleStateRestoration({
                    middlewareId,
                    deserialize: serializer.deserializeState,
                    params,
                    config,
                });
                callInnerMiddleware = false;
            }
            return callInnerMiddleware && originalMiddleware.wrapGenerate
                ? await originalMiddleware.wrapGenerate(options)
                : options.doGenerate();
        },
    };
};
//# sourceMappingURL=create-stateful-middleware.js.map