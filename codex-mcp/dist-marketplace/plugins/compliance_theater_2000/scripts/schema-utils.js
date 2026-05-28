"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringOrNumberSchema = void 0;
exports.objectSchema = objectSchema;
exports.arrayOf = arrayOf;
function objectSchema(properties, required = [], additionalProperties = false) {
    return { type: "object", properties, required, additionalProperties };
}
function arrayOf(items) {
    return { type: "array", items };
}
exports.stringOrNumberSchema = {
    anyOf: [{ type: "string" }, { type: "number" }]
};
//# sourceMappingURL=schema-utils.js.map