/**
 * @fileoverview Converts Zod schemas to human-readable JSON structure strings.
 *
 * This module provides utilities for transforming Zod validation schemas into
 * readable string representations that show the expected structure of data.
 * Useful for documentation, debugging, and displaying schema information to users.
 *
 * @module @compliance-theater/typescript/zod-to-json-structure
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { zodToStructure } from '@compliance-theater/typescript/zod-to-json-structure';
 *
 * const userSchema = z.object({
 *   name: z.string(),
 *   age: z.number().optional(),
 *   email: z.string()
 * });
 *
 * console.log(zodToStructure(userSchema));
 * // Output: {
 * //   name: <string>,
 * //   age: /* [optional] *\/ <number>,
 * //   email: <string>,
 * // }
 * ```
 */

import {
  ZodTypeAny,
  ZodObject,
  ZodArray,
  ZodOptional,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDefault,
  ZodNullable,
  ZodDate,
} from "zod";

/**
 * Function signature for converting a SchemaField to a string representation.
 * Supports both parameterless calls (default indent) and calls with custom indentation.
 *
 * @callback SchemaFieldToString
 * @returns {string} The string representation with default indentation
 *
 * @callback SchemaFieldToString
 * @param {number} indent - The indentation level (number of spaces = indent * 2)
 * @returns {string} The string representation with specified indentation
 */
interface SchemaFieldToString {
  (): string;
  (indent: number): string;
}

/**
 * Base properties shared by all schema field types.
 * Represents common metadata extracted from Zod schemas.
 *
 * @typedef {Object} BasedSchemaField
 * @property {string} type - The primitive type name (e.g., 'string', 'number', 'object', 'array')
 * @property {boolean} [optional] - Whether the field is optional (Zod optional() or has default())
 * @property {boolean} [nullable] - Whether the field accepts null values (Zod nullable())
 * @property {string} [description] - Description extracted from Zod schema's .describe() method
 * @property {SchemaFieldToString} toString - Function to convert field to string representation
 */
type BasedSchemaField = {
  type: string;
  optional?: boolean;
  nullable?: boolean;
  description?: string;
  toString: SchemaFieldToString;
};

/**
 * Discriminated union representing different types of schema fields.
 * Each variant corresponds to a specific Zod schema type.
 *
 * @typedef {Object} SchemaField
 *
 * Array variant:
 * @property {'array'} type - Indicates this is an array type
 * @property {SchemaField} items - Schema for array elements
 *
 * Object variant:
 * @property {'object'} type - Indicates this is an object type
 * @property {Record<string, SchemaField>} properties - Map of property names to their schemas
 *
 * Primitive variants (number, boolean, date):
 * @property {'number'|'boolean'|'date'} type - The primitive type
 * @property {false|never} nullable - These types cannot be nullable in the schema
 *
 * String variant:
 * @property {'string'} type - Indicates this is a string type
 *
 * Any variant (fallback):
 * @property {'any'} type - Indicates an unrecognized or generic type
 * @property {Record<string, SchemaField>} [properties] - Optional properties if object-like
 * @property {SchemaField} [items] - Optional items if array-like
 */
type SchemaField =
  | (BasedSchemaField & {
      type: "array";
      items: Exclude<SchemaField, "optional">;
    })
  | (BasedSchemaField & {
      type: "object";
      properties: Record<string, SchemaField>;
    })
  | (BasedSchemaField & {
      type: "number" | "boolean" | "date";
      nullable: false | never;
    })
  | (BasedSchemaField & {
      type: "string";
    })
  | (BasedSchemaField & {
      properties?: Record<string, SchemaField>;
      items?: Exclude<SchemaField, "optional">;
      type: "any";
    });

/**
 * Adds a trailing comma to the last line of a multi-line string.
 * Intelligently places the comma before any trailing comments (optional/nullable flags or descriptions).
 *
 * Used when building object/array representations to ensure proper JSON-like formatting.
 *
 * @param {string} input - The multi-line string to process
 * @returns {string} The input string with a comma added to the last line before comments
 *
 * @example
 * withComma("name: <string> \/\* user's name *\/")
 * // Returns: "name: <string>, \/\* user's name *\/"
 *
 * @example
 * withComma("age: \/\* [optional] *\/ <number>")
 * // Returns: "age: \/\* [optional] *\/ <number>,"
 */
const withComma = (input: string): string => {
  const current = input.split("\n");
  if (!current.length) {
    return input;
  }
  const lastIndex = current.length - 1;
  const lastItem = current[lastIndex];
  let flagIndex = lastItem.indexOf("/* [optional");
  if (flagIndex === -1) {
    flagIndex = lastItem.indexOf("/* [nullable");
  }
  let descriptionCommentIndex = lastItem.lastIndexOf("/*");
  if (descriptionCommentIndex === flagIndex) {
    descriptionCommentIndex = -1;
  }
  current[lastIndex] =
    descriptionCommentIndex > -1
      ? `${lastItem.slice(0, descriptionCommentIndex - 1)},${lastItem.slice(descriptionCommentIndex - 1)}`
      : lastItem + ",";
  return current.join("\n");
};
/**
 * Converts a Zod schema into a SchemaField representation.
 * Recursively processes nested schemas (objects, arrays) and handles wrapper types
 * like optional, nullable, and default.
 *
 * @param {ZodTypeAny} schema - The Zod schema to convert
 * @returns {SchemaField} A structured representation of the schema with type info and metadata
 *
 * @example
 * const schema = z.object({ name: z.string(), age: z.number().optional() });
 * const field = zodToSchemaField(schema);
 * // field.type === 'object'
 * // field.properties.name.type === 'string'
 * // field.properties.age.optional === true
 *
 * @internal This is an internal helper used by zodToStructure
 */
const zodToSchemaField = (schema: ZodTypeAny): SchemaField => {
  let ret: Partial<SchemaField> = { description: schema.description };

  /**
   * Unwraps wrapper schemas (optional, nullable, default, effects) to get the inner type.
   * Recursively processes the unwrapped schema.
   *
   * @returns {SchemaField} The unwrapped schema field
   * @throws {Error} If unable to unwrap the schema
   */
  const unwrapType = () => {
    // Handle effects/unwrapping
    if ("schema" in schema._def) {
      return zodToSchemaField(schema._def.schema);
    }
    if (
      "unwrap" in schema &&
      schema.unwrap &&
      typeof schema.unwrap === "function"
    ) {
      return zodToSchemaField(schema.unwrap());
    }
    return zodToSchemaField(schema._def.innerType);
  };
  // Type detection: Check Zod schema type and extract relevant information
  if (schema instanceof ZodOptional || schema instanceof ZodDefault) {
    // Optional fields: unwrap and mark as optional
    ret = unwrapType();
    ret.optional = true;
  } else if (schema instanceof ZodNullable) {
    // Nullable fields: unwrap and mark as nullable
    ret = unwrapType();
    ret.nullable = true;
  } else if (schema instanceof ZodString) {
    // String primitive
    ret.type = "string";
  } else if (schema instanceof ZodNumber) {
    // Number primitive
    ret.type = "number";
  } else if (schema instanceof ZodBoolean) {
    // Boolean primitive
    ret.type = "boolean";
  } else if (schema instanceof ZodDate) {
    // Date type
    ret.type = "date";
  } else if (schema instanceof ZodArray) {
    // Array type: recursively process element schema
    ret.type = "array";
    if (ret.type === "array") {
      ret.items = zodToSchemaField(schema.element);
    }
  } else if (schema instanceof ZodObject) {
    // Object type: recursively process all properties
    ret.type = "object";
    if (ret.type === "object") {
      const shape = schema.shape as Record<string, ZodTypeAny>;
      ret.properties = {};
      for (const key in shape) {
        ret.properties[key] = zodToSchemaField(shape[key]);
      }
    }
  } else {
    // Fallback for unrecognized types
    ret.type = "any";
  }
  /**
   * Converts this SchemaField to a formatted string representation.
   * Handles indentation, type annotations, optional/nullable flags, and descriptions.
   *
   * @param {number} [indent=0] - Current indentation level (each level = 2 spaces)
   * @returns {string} Formatted string representation of the schema
   */
  ret.toString = (indent: number = 0) => {
    let builder = "";
    switch (ret.type) {
      case "array":
        // Format: [ <element-type>, ... ] as Array<type>
        builder = `[ ${ret.items ? withComma(ret.items.toString(indent + 1)) : withComma("unknown")} ... ] as Array<${ret.items?.type ?? "any"}>`;
        break;
      case "object":
        // Format: { key: <type>, ... } with proper indentation
        const indentStr = " ".repeat((indent + 1) * 2);
        builder =
          "{" +
          Object.entries(ret.properties ?? {})
            .map(([key, value]) =>
              withComma(`\n${indentStr}${key}: ${value.toString(indent + 1)}`)
            )
            .join("") +
          `\n${" ".repeat(indent * 2)}}`;
        break;
      case undefined:
        // Fallback for undefined type
        builder = "<any>";
        break;
      default:
        // Primitive types: <string>, <number>, etc.
        builder = `<${ret.type}>`;
        break;
    }
    // Add optional/nullable flags as comment prefix
    if (ret.optional) {
      builder = `/* [optional${ret.nullable ? ", nullable" : ""}] */ ${builder}`;
    } else if (ret.nullable) {
      builder = `/* [nullable] */ ${builder}`;
    }
    // Add description as comment suffix
    if (ret.description) {
      builder = `${builder} /* ${ret.description} */`;
    }
    return builder;
  };
  return ret as SchemaField;
};

export const zodToStructure = (schema: ZodTypeAny): string => {
  const asField = zodToSchemaField(schema);
  return asField.toString();
};
