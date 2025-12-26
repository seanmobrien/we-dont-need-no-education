/**
 * Type declarations for Zod schema to JSON structure converter.
 *
 * @fileoverview Converts Zod schemas to human-readable JSON structure strings.
 *
 * This module provides utilities for transforming Zod validation schemas into
 * readable string representations that show the expected structure of data.
 * Useful for documentation, debugging, and displaying schema information to users.
 *
 * @module lib/typescript/zod-to-json-structure
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { zodToStructure } from '@/lib/typescript/zod-to-json-structure';
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

declare module '@/lib/typescript/zod-to-json-structure' {
  import type { ZodTypeAny } from 'zod';

  /**
   * Converts a Zod schema to a human-readable JSON structure string.
   *
   * This is the main public API for the module. It takes any Zod schema and produces
   * a formatted string showing the expected data structure, including:
   * - Type annotations (e.g., angle-bracket-string, angle-bracket-number)
   * - Optional and nullable flags as inline comments
   * - Nested objects and arrays with proper indentation
   * - Descriptions from .describe() calls
   *
   * @param {ZodTypeAny} schema - The Zod schema to convert
   * @returns {string} A formatted string representation of the schema structure
   *
   * @example
   * Simple object schema:
   * const userSchema = z.object({
   *   id: z.number(),
   *   name: z.string(),
   *   email: z.string().optional(),
   * });
   * console.log(zodToStructure(userSchema));
   * Produces output showing object with id, name, and optional email fields
   *
   * @example
   * Nested schema with arrays:
   * const blogSchema = z.object({
   *   title: z.string().describe("Post title"),
   *   tags: z.array(z.string()),
   *   author: z.object({
   *     name: z.string(),
   *     verified: z.boolean().optional(),
   *   }),
   * });
   * console.log(zodToStructure(blogSchema));
   * Produces formatted output with nested objects and array type annotations
   *
   * @example
   * Nullable and optional fields:
   * const configSchema = z.object({
   *   apiKey: z.string(),
   *   timeout: z.number().optional(),
   *   retryCount: z.number().nullable(),
   *   debug: z.boolean().optional().nullable(),
   * });
   * console.log(zodToStructure(configSchema));
   * Shows optional and nullable flags as inline comments
   *
   * @public
   */
  export function zodToStructure(schema: ZodTypeAny): string;
}
