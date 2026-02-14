import { log } from '@compliance-theater/logger';
import { STATE_PROTOCOL, } from './types';
import { createStatefulMiddleware, isStateCollectionRequest, isStateRestorationRequest, } from './create-stateful-middleware';
import { generateText, wrapLanguageModel } from 'ai';
import { SingletonProvider } from '@compliance-theater/typescript';
export class MiddlewareStateManager {
    static #REGISTRY_KEY = Symbol.for('@noeducation/middleware:MiddlewareStateManager');
    static get #globalInstance() {
        return SingletonProvider.Instance.get(MiddlewareStateManager.#REGISTRY_KEY);
    }
    static set #globalInstance(value) {
        if (value === undefined) {
            SingletonProvider.Instance.delete(MiddlewareStateManager.#REGISTRY_KEY);
            return;
        }
        SingletonProvider.Instance.set(MiddlewareStateManager.#REGISTRY_KEY, value);
    }
    static reset() {
        MiddlewareStateManager.#globalInstance = undefined;
    }
    static get Instance() {
        let ret = MiddlewareStateManager.#globalInstance;
        if (!ret) {
            ret = new MiddlewareStateManager();
            MiddlewareStateManager.#globalInstance = ret;
        }
        return ret;
    }
    getMiddlewareId() {
        return 'state-manager';
    }
    getMiddlewareInstance() {
        return this.#middleware;
    }
    async serializeState({ model }) {
        const stateItems = [];
        log((l) => l.verbose(`Taking snapshot of workflow state.`));
        const providerOptions = {
            [STATE_PROTOCOL.OPTIONS_ROOT]: {
                [STATE_PROTOCOL.RESULTS]: stateItems,
                [STATE_PROTOCOL.COLLECT]: true,
            },
        };
        const result = await generateText({
            model,
            providerOptions,
            prompt: [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Serializing pipeline state' }],
                    providerOptions,
                },
            ],
        });
        log((l) => l.verbose(`Generated text for state serialization:`, result));
        return Promise.resolve({ state: stateItems, timestamp: Date.now() });
    }
    async deserializeState({ state, model, }) {
        const timestamp = 'timestamp' in state ? state.timestamp : Date.now();
        const stateItems = Array.isArray(state) ? state : state.state;
        log((l) => l.verbose(`Restoring state from ${new Date(timestamp)}.`));
        const providerOptions = {
            [STATE_PROTOCOL.OPTIONS_ROOT]: {
                [STATE_PROTOCOL.RESULTS]: stateItems,
                [STATE_PROTOCOL.RESTORE]: true,
            },
        };
        const result = await generateText({
            model,
            providerOptions,
            prompt: [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Restoring pipeline state' }],
                    providerOptions,
                },
            ],
        });
        log((l) => l.verbose(`Generated text for state restoration:`, result));
    }
    basicMiddlewareWrapper({ middlewareId, middleware, }) {
        return createStatefulMiddleware({
            middlewareId,
            originalMiddleware: middleware,
        });
    }
    statefulMiddlewareWrapper({ middlewareId, middleware, serialize, deserialize, }) {
        const serializeState = ('serializeState' in middleware
            ? middleware.serializeState
            : serialize) ?? serialize;
        const deserializeState = ('deserializeState' in middleware
            ? middleware.deserializeState
            : deserialize) ?? deserialize;
        const getMiddlewareId = 'getMiddlewareId' in middleware
            ? middleware.getMiddlewareId
            : () => middlewareId;
        return createStatefulMiddleware({
            middlewareId,
            originalMiddleware: {
                ...middleware,
                serializeState,
                deserializeState,
                getMiddlewareId,
            },
        });
    }
    initializeModel(props) {
        const model = 'model' in props ? props.model : props;
        const ret = wrapLanguageModel({
            model,
            middleware: this.#middleware,
        });
        return ret;
    }
    get #middleware() {
        return {
            wrapGenerate: async ({ model, params, doGenerate }) => {
                if (isStateRestorationRequest(params) ||
                    isStateCollectionRequest(params)) {
                    const { prompt } = params;
                    const text = prompt
                        .flatMap((msg) => (Array.isArray(msg.content) ? msg.content : []))
                        .filter((p) => p.type === 'text' && p.text?.length)
                        .map((p) => p.text)
                        .join('\n');
                    return {
                        finishReason: 'stop',
                        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                        content: [
                            {
                                type: 'text',
                                text: `Response to: ${text}`,
                            },
                        ],
                        warnings: [],
                        response: {
                            id: 'state-operation-result',
                            timestamp: new Date(),
                            modelId: model.modelId,
                        },
                    };
                }
                return doGenerate();
            },
        };
    }
}
//# sourceMappingURL=middleware-state-manager.js.map