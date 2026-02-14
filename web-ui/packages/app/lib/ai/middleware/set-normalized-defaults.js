import { MiddlewareStateManager } from './state-management';
const DEFAULT_TELEMETRY = {
    isEnabled: true,
    functionId: 'generic-chat-request',
    metadata: {},
};
const jsonExpression = () => /\`\`\`json[\s\n\r]*((?:\[[\s\n\r]*)?{[\s\S]*?}(?:[\s\n\r]*\])?)[\s\n\r]*\`\`\`/;
function isJsonCodeBlock(text) {
    return jsonExpression().test(text);
}
function isValidJsonObject(text) {
    const trimmed = text.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            const parsed = JSON.parse(trimmed);
            return parsed !== null && typeof parsed === 'object';
        }
        catch {
            return false;
        }
    }
    return false;
}
export const extractJsonFromCodeBlock = (text) => {
    const match = jsonExpression().exec(text);
    if (!match) {
        throw new Error('No valid JSON code block found');
    }
    return match[1];
};
function isStructuredOutputEmpty(result) {
    if (!result.providerMetadata) {
        return true;
    }
    const metadata = result.providerMetadata;
    const structured = metadata.structuredOutputs;
    if (!structured ||
        structured === null ||
        structured === undefined ||
        structured === '' ||
        (typeof structured === 'object' && Object.keys(structured).length === 0)) {
        return true;
    }
    return false;
}
function safeJsonParse(jsonString) {
    try {
        return JSON.parse(jsonString);
    }
    catch {
        return undefined;
    }
}
const addStructuredOutputs = ({ value, target, transformItem = (_key, value) => value, }) => {
    if (!value) {
        return target;
    }
    return Object.keys(target ?? {}).reduce((acc, key) => {
        const value = target[key];
        if (!value) {
            return acc;
        }
        return {
            ...acc,
            [key]: transformItem(key, value)
        };
    }, { structuredOutputs: value });
};
const recurseStructuredOutputs = (output) => (_key, value) => (typeof value === 'object' && value !== null
    ? addStructuredOutputs({ value: output, target: value })
    : value);
export const originalSetNormalizedDefaultsMiddleware = {
    transformParams: async ({ params }) => {
        const modifiedParams = { ...params };
        if (!modifiedParams.experimental_telemetry) {
            modifiedParams.experimental_telemetry = DEFAULT_TELEMETRY;
        }
        return modifiedParams;
    },
    wrapGenerate: async ({ doGenerate }) => {
        const result = await doGenerate();
        if (typeof result.response?.body !== 'string') {
            return result;
        }
        result.providerMetadata = result.providerMetadata || {};
        if (isStructuredOutputEmpty(result)) {
            let jsonContent = undefined;
            if (isJsonCodeBlock(result.response.body)) {
                jsonContent = extractJsonFromCodeBlock(result.response.body);
            }
            else if (isValidJsonObject(result.response.body)) {
                jsonContent = result.response.body.trim();
            }
            if (jsonContent) {
                const parsedJson = safeJsonParse(jsonContent);
                if (parsedJson) {
                    result.providerMetadata = addStructuredOutputs({
                        value: parsedJson,
                        target: result.providerMetadata,
                        transformItem: recurseStructuredOutputs(parsedJson)
                    });
                    result.experimental_output = parsedJson;
                }
            }
        }
        return result;
    },
    wrapStream: async ({ doStream }) => {
        const { stream, ...rest } = await doStream();
        let accumulatedText = '';
        const transformStream = new TransformStream({
            transform(chunk, controller) {
                if (chunk.type === 'text-delta') {
                    accumulatedText += chunk.delta;
                }
                if (chunk.type === 'finish' && accumulatedText) {
                    let jsonContent = null;
                    if (isJsonCodeBlock(accumulatedText)) {
                        jsonContent = extractJsonFromCodeBlock(accumulatedText);
                    }
                    else if (isValidJsonObject(accumulatedText)) {
                        jsonContent = accumulatedText.trim();
                    }
                    if (jsonContent) {
                        const parsedJson = safeJsonParse(jsonContent);
                        if (parsedJson !== null) {
                            const chunkWithMeta = chunk;
                            const modifiedChunk = {
                                ...chunk,
                                providerMetadata: {
                                    ...(chunkWithMeta.providerMetadata || {}),
                                    structuredOutputs: parsedJson,
                                },
                            };
                            controller.enqueue(modifiedChunk);
                            return;
                        }
                    }
                }
                controller.enqueue(chunk);
            },
        });
        return {
            stream: stream.pipeThrough(transformStream),
            ...rest,
        };
    },
};
export const setNormalizedDefaultsMiddleware = MiddlewareStateManager.Instance.basicMiddlewareWrapper({
    middlewareId: 'set-normalized-defaults',
    middleware: originalSetNormalizedDefaultsMiddleware,
});
export default setNormalizedDefaultsMiddleware;
//# sourceMappingURL=set-normalized-defaults.js.map