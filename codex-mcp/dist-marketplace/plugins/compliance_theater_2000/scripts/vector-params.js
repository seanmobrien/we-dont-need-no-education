"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQueryVectorCache = createQueryVectorCache;
exports.createCachedQueryVectorGenerator = createCachedQueryVectorGenerator;
exports.queryVectorFromEmbeddingResult = queryVectorFromEmbeddingResult;
exports.materializeGraphVectorParams = materializeGraphVectorParams;
const lru_cache_1 = require("lru-cache");
function createQueryVectorCache(maxEntries, ttlMs) {
    return new lru_cache_1.LRUCache({
        max: Math.max(1, maxEntries),
        ttl: Math.max(0, ttlMs)
    });
}
function createCachedQueryVectorGenerator(fetchQueryVectors, cache, log = () => undefined) {
    return async (text, modelSize) => {
        const normalizedText = text.trim();
        const cacheKey = JSON.stringify({ modelSize, text: normalizedText });
        const cached = cache.get(cacheKey);
        if (cached) {
            log("query vector cache hit", { modelSize, textLength: normalizedText.length });
            return cached;
        }
        log("query vector cache miss", { modelSize, textLength: normalizedText.length });
        const pending = fetchQueryVectors(normalizedText, modelSize).catch((error) => {
            cache.delete(cacheKey);
            throw error;
        });
        cache.set(cacheKey, pending);
        return pending;
    };
}
function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function vectorSpecFromValue(value, source, explicitMarkerRequired = false) {
    if (typeof value === "string") {
        if (explicitMarkerRequired) {
            return undefined;
        }
        if (value.trim() === "") {
            throw new Error(`${source} must not be empty.`);
        }
        return { text: value, modelSize: "small" };
    }
    if (!isRecord(value)) {
        return undefined;
    }
    const embeddedText = value.$embed ?? value.$embedding ?? (explicitMarkerRequired
        ? undefined
        : value.text ?? value.query ?? value.queryText ?? value.query_text);
    if (embeddedText === undefined) {
        return undefined;
    }
    if (typeof embeddedText !== "string" || embeddedText.trim() === "") {
        throw new Error(`${source} text must be a non-empty string.`);
    }
    const modelSize = value.modelSize ?? value.model_size ?? value.size ?? "small";
    if (modelSize !== "large" && modelSize !== "small") {
        throw new Error(`${source} modelSize must be one of: large, small.`);
    }
    return { text: embeddedText, modelSize };
}
function queryVectorFromEmbeddingResult(result, source) {
    const vector = result.vectors ?? result.vector ?? result.embedding;
    if (!Array.isArray(vector) || vector.length === 0 || !vector.every((value) => typeof value === "number" && Number.isFinite(value))) {
        throw new Error(`${source} did not return a numeric query vector.`);
    }
    return vector;
}
async function materializeGraphVectorParams(args = {}, generateQueryVectors) {
    const params = isRecord(args.params) ? { ...args.params } : {};
    const vectorParams = args.vectorParams ?? args.vector_params ?? params.vectorParams ?? params.vector_params ?? params.__vectorParams;
    delete params.vectorParams;
    delete params.vector_params;
    delete params.__vectorParams;
    const vectorSpecs = new Map();
    if (isRecord(vectorParams)) {
        for (const [name, value] of Object.entries(vectorParams)) {
            const spec = vectorSpecFromValue(value, `vectorParams.${name}`);
            if (!spec) {
                throw new Error(`vectorParams.${name} must be a string or embedding spec object.`);
            }
            if (params[name] !== undefined && !vectorSpecFromValue(params[name], `params.${name}`, true)) {
                throw new Error(`vector parameter ${name} collides with an existing non-vector Cypher parameter.`);
            }
            vectorSpecs.set(name, spec);
        }
    }
    else if (vectorParams !== undefined && vectorParams !== null) {
        throw new Error("vectorParams must be an object when provided.");
    }
    for (const [name, value] of Object.entries(params)) {
        const spec = vectorSpecFromValue(value, `params.${name}`, true);
        if (spec) {
            vectorSpecs.set(name, spec);
        }
    }
    for (const [name, spec] of vectorSpecs) {
        const embedding = await generateQueryVectors(spec.text, spec.modelSize);
        params[name] = queryVectorFromEmbeddingResult(embedding, `vector parameter ${name}`);
    }
    if (vectorSpecs.size === 0) {
        return args;
    }
    const { vectorParams: _vectorParams, vector_params: _vector_params, ...rest } = args;
    return {
        ...rest,
        params
    };
}
//# sourceMappingURL=vector-params.js.map