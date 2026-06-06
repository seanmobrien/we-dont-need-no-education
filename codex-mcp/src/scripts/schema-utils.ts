import type { AnyRecord } from "./types";

export function objectSchema(properties: AnyRecord, required: string[] = [], additionalProperties = false): AnyRecord {
  return { type: "object", properties, required, additionalProperties };
}

export function arrayOf(items: AnyRecord): AnyRecord {
  return { type: "array", items };
}

export const stringOrNumberSchema = {
  anyOf: [{ type: "string" }, { type: "number" }]
};
