"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphEmbedTool = graphEmbedTool;
const vector_params_1 = require("./vector-params");
function argumentValue(args, ...names) {
    for (const name of names) {
        if (Object.prototype.hasOwnProperty.call(args, name)) {
            return args[name];
        }
    }
    return undefined;
}
function requiredString(value, name) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`${name} is required and must be a non-empty string.`);
    }
    return value.trim();
}
function optionalString(value, name) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`${name} must be a non-empty string when provided.`);
    }
    return value;
}
function normalizeModelSize(value) {
    const size = value ?? "small";
    if (size !== "large" && size !== "small") {
        throw new Error("size must be one of: large, small.");
    }
    return size;
}
function normalizeStringList(value, name) {
    if (value === undefined || value === null || value === "") {
        return [];
    }
    const values = Array.isArray(value) ? value : [value];
    return values.map((entry, index) => requiredString(entry, `${name}[${index}]`));
}
function normalizeGraphEmbedArgs(args) {
    const idValue = argumentValue(args, "idValue", "id_value");
    if (idValue === undefined || idValue === null || idValue === "") {
        throw new Error("idValue is required.");
    }
    return {
        textColumnName: requiredString(argumentValue(args, "textColumnName", "text_column_name") ?? "content", "textColumnName"),
        vectorColumnName: requiredString(argumentValue(args, "vectorColumnName", "vector_column_name") ?? "embedding", "vectorColumnName"),
        idColumnName: requiredString(argumentValue(args, "idColumnName", "id_column_name"), "idColumnName"),
        idValue,
        otherFields: normalizeStringList(argumentValue(args, "otherFields", "other_fields"), "otherFields"),
        nodeType: optionalString(argumentValue(args, "nodeType", "node_type", "nodeLabel", "node_label", "label"), "nodeType"),
        textValue: optionalString(argumentValue(args, "textValue", "text_value"), "textValue"),
        updateMultiple: argumentValue(args, "updateMultiple", "update_multiple") === true,
        size: normalizeModelSize(argumentValue(args, "size", "modelSize", "model_size"))
    };
}
function quoteCypherName(name) {
    if (name.includes("\0")) {
        throw new Error("Cypher identifiers must not contain null bytes.");
    }
    return `\`${name.replace(/`/g, "``")}\``;
}
function labelClause(nodeType) {
    return nodeType ? `:${quoteCypherName(nodeType)}` : "";
}
function graphResultPayload(result) {
    if (!result || typeof result !== "object") {
        return result;
    }
    const record = result;
    return record.structuredContent?.result ?? record.result ?? record;
}
function parseTextContentResult(result) {
    const text = Array.isArray(result.content)
        ? result.content.find((item) => item?.type === "text" && typeof item.text === "string")?.text
        : undefined;
    if (!text) {
        return undefined;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
}
function normalizeRows(value) {
    if (Array.isArray(value)) {
        return value.map(normalizeRecord).filter((row) => Boolean(row));
    }
    if (!value || typeof value !== "object") {
        return [];
    }
    const record = value;
    for (const key of ["records", "rows", "data", "result"]) {
        const nested = record[key];
        if (Array.isArray(nested)) {
            return nested.map(normalizeRecord).filter((row) => Boolean(row));
        }
    }
    const normalized = normalizeRecord(record);
    return normalized ? [normalized] : [];
}
function normalizeRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }
    const record = value;
    if (Array.isArray(record.keys) && Array.isArray(record._fields)) {
        return Object.fromEntries(record.keys.map((key, index) => [key, record._fields[index]]));
    }
    if (Array.isArray(record.keys) && Array.isArray(record.fields)) {
        return Object.fromEntries(record.keys.map((key, index) => [key, record.fields[index]]));
    }
    return record;
}
function rowsFromGraphResult(result) {
    const payloadRows = normalizeRows(graphResultPayload(result));
    if (payloadRows.length > 0) {
        return payloadRows;
    }
    const textPayload = parseTextContentResult(result);
    return normalizeRows(textPayload);
}
function numberFromNeo4j(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    if (value && typeof value === "object") {
        const record = value;
        if (typeof record.low === "number" && typeof record.high === "number") {
            return record.high * 0x100000000 + record.low;
        }
    }
    return undefined;
}
function matchedNodesFromReadResult(result) {
    const firstRow = rowsFromGraphResult(result)[0];
    if (!firstRow) {
        throw new Error("graph_embed could not read match results from Neo4j.");
    }
    const matchedCount = numberFromNeo4j(firstRow.matchedCount ?? firstRow.matched_count ?? firstRow.count);
    if (matchedCount === undefined) {
        throw new Error("graph_embed Neo4j read result did not include matchedCount.");
    }
    const rawNodes = firstRow.matchedNodes ?? firstRow.matched_nodes ?? firstRow.nodes;
    if (!Array.isArray(rawNodes)) {
        throw new Error("graph_embed Neo4j read result did not include matchedNodes.");
    }
    const nodes = rawNodes.map((node, index) => {
        if (!node || typeof node !== "object") {
            throw new Error(`graph_embed matched node ${index} was not an object.`);
        }
        const record = node;
        if (typeof record.elementId !== "string" || record.elementId.trim() === "") {
            throw new Error(`graph_embed matched node ${index} did not include an elementId.`);
        }
        return {
            elementId: record.elementId,
            text: record.text,
            properties: record.properties && typeof record.properties === "object" && !Array.isArray(record.properties)
                ? record.properties
                : undefined
        };
    });
    return { matchedCount, nodes };
}
function updatedCountFromWriteResult(result) {
    const firstRow = rowsFromGraphResult(result)[0];
    return firstRow ? numberFromNeo4j(firstRow.updatedCount ?? firstRow.updated_count ?? firstRow.count) : undefined;
}
function requireTextForNode(text, elementId, textColumnName) {
    if (typeof text !== "string" || text.trim() === "") {
        throw new Error(`Matched node ${elementId} has no non-empty ${textColumnName} text to embed.`);
    }
    return text;
}
function serializeFieldValue(value) {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value === "string") {
        return value.trim() === "" ? undefined : value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    const serialized = JSON.stringify(value);
    return serialized === undefined || serialized === "\"\"" ? undefined : serialized;
}
function embedTextForNode(node, options) {
    const baseText = options.textValue ?? requireTextForNode(node.text, node.elementId, options.textColumnName);
    if (options.otherFields.length === 0) {
        return baseText;
    }
    const otherFieldTexts = options.otherFields
        .map((fieldName) => {
        const value = serializeFieldValue(node.properties?.[fieldName]);
        return value ? `${fieldName}: ${value}` : undefined;
    })
        .filter((value) => Boolean(value));
    if (otherFieldTexts.length === 0) {
        return baseText;
    }
    return [baseText, ...otherFieldTexts].join("\n\n");
}
async function graphEmbedTool(args, callGraphTool, generateQueryVectors) {
    const options = normalizeGraphEmbedArgs(args);
    const readQuery = [
        `MATCH (n${labelClause(options.nodeType)})`,
        `WHERE n.${quoteCypherName(options.idColumnName)} = $idValue`,
        `RETURN count(n) AS matchedCount, collect({elementId: elementId(n), text: n.${quoteCypherName(options.textColumnName)}, properties: properties(n)}) AS matchedNodes`
    ].join("\n");
    const readResult = await callGraphTool("graph_read", {
        query: readQuery,
        params: { idValue: options.idValue }
    });
    const { matchedCount, nodes } = matchedNodesFromReadResult(readResult);
    if (matchedCount === 0) {
        throw new Error(`graph_embed found no nodes for ${options.idColumnName}=${String(options.idValue)}.`);
    }
    if (!options.updateMultiple && matchedCount !== 1) {
        throw new Error(`graph_embed expected exactly one node for ${options.idColumnName}=${String(options.idValue)}, but matched ${matchedCount}. Pass update_multiple: true to update multiple nodes.`);
    }
    const vectorByText = new Map();
    const updates = [];
    for (const node of nodes) {
        const sourceText = embedTextForNode(node, options);
        let vector = vectorByText.get(sourceText);
        if (!vector) {
            vector = (0, vector_params_1.queryVectorFromEmbeddingResult)(await generateQueryVectors(sourceText, options.size), `graph_embed vector for ${options.textColumnName}`);
            vectorByText.set(sourceText, vector);
        }
        updates.push({
            elementId: node.elementId,
            vector,
            ...(options.textValue === undefined ? {} : { text: options.textValue })
        });
    }
    const setClauses = [`n.${quoteCypherName(options.vectorColumnName)} = update.vector`];
    if (options.textValue !== undefined) {
        setClauses.unshift(`n.${quoteCypherName(options.textColumnName)} = update.text`);
    }
    const writeQuery = [
        "UNWIND $updates AS update",
        "MATCH (n)",
        "WHERE elementId(n) = update.elementId",
        `SET ${setClauses.join(", ")}`,
        "RETURN count(n) AS updatedCount"
    ].join("\n");
    const writeResult = await callGraphTool("graph_write", {
        query: writeQuery,
        params: { updates }
    });
    return {
        action: "graph_embed",
        matchedCount,
        updatedCount: updatedCountFromWriteResult(writeResult) ?? updates.length,
        updateMultiple: options.updateMultiple,
        nodeType: options.nodeType ?? null,
        idColumnName: options.idColumnName,
        idValue: options.idValue,
        textColumnName: options.textColumnName,
        vectorColumnName: options.vectorColumnName,
        textUpdated: options.textValue !== undefined,
        size: options.size,
        embeddingCalls: vectorByText.size,
        writeResult
    };
}
//# sourceMappingURL=graph-embed.js.map