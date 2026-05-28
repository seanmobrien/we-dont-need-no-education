import type { AnyRecord } from "./types";
export declare function objectSchema(properties: AnyRecord, required?: string[], additionalProperties?: boolean): AnyRecord;
export declare function arrayOf(items: AnyRecord): AnyRecord;
export declare const stringOrNumberSchema: {
    anyOf: {
        type: string;
    }[];
};
//# sourceMappingURL=schema-utils.d.ts.map