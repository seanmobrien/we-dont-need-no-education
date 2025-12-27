import z from 'zod';
import { AiModelType } from '@repo/app/lib/ai/core/unions';
/**
 * @module site-util/env/_common
 *
 * This module provides utilities for determining the current runtime environment.
 *
 * @typedef {('nodejs' | 'edge' | 'client' | 'static')} RuntimeConfig
 * Represents the possible runtime environments.
 *
 * - 'nodejs': Running in a Node.js environment.
 * - 'edge': Running in an Edge environment (e.g., Deno).
 * - 'client': Running in a client-side environment (e.g., browser).
 * - 'static': Running in a static environment.
 *
 * @function runtime
 * Returns the current runtime environment.
 *
 * @returns {RuntimeConfig} The current runtime environment.
 *
 * @function isRunningOnServer
 * Checks if the code is running on the server.
 *
 * @returns {boolean} `true` if running on the server, otherwise `false`.
 *
 * @function isRunningOnClient
 * Checks if the code is running on the client.
 *
 * @returns {boolean} `true` if running on the client, otherwise `false`.
 */
/**
 * Represents the possible runtime environments.
 *
 * - 'nodejs': Running in a Node.js environment.
 * - 'edge': Running in an Edge environment (e.g., Deno).
 * - 'client': Running in a client-side environment (e.g., browser).
 * - 'static': Running in a static environment.
 */
export type RuntimeConfig = 'nodejs' | 'edge' | 'client' | 'static' | 'server';
/**
 * Returns the current runtime environment.
 *
 * @returns {RuntimeConfig} The current runtime environment.
 */
export declare const runtime: () => RuntimeConfig;
/**
 * Checks if the code is running on the server.
 *
 * @returns {boolean} `true` if running on the server, otherwise `false`.
 */
export declare const isRunningOnServer: () => boolean;
/**
 * Checks if the code is running on the client.
 *
 * @returns {boolean} `true` if running on the client, otherwise `false`.
 */
export declare const isRunningOnClient: () => boolean;
/**
 * Checks if the code is running on the edge.
 *
 * @returns {boolean} `true` if running on the edge, otherwise `false`.
 */
export declare const isRunningOnEdge: () => boolean;
/**
 * A collection of Zod processors for various environment variables.
 */
export declare const ZodProcessors: {
    /**
     * Processor for URL strings.
     * Ensures the value is a valid URL and removes trailing slashes.
     *
     * @returns {ZodString} A Zod string schema for URLs.
     */
    url: () => z.ZodEffects<z.ZodString, string, string>;
    /**
     * Processor for log level strings.
     * Provides a default value of 'info' if not specified.
     *
     * @returns {ZodString} A Zod string schema for log levels.
     */
    logLevel: (level?: string) => z.ZodDefault<z.ZodString>;
    aiModelType: (defaultValue: AiModelType) => z.ZodDefault<z.ZodType<AiModelType, z.ZodTypeDef, unknown>>;
    /**
     * Processor for integer values.
     * Ensures the value is a valid integer and provides a default value of 120 if not specified.
     *
     * @returns {ZodType<number, ZodTypeDef, unknown>} A Zod schema for integers.
     */
    integer: () => z.ZodType<number, z.ZodTypeDef, unknown>;
    /**
     * Processor for boolean values.
     * Ensures the value is a valid boolean and provides a default value of false if not specified.
     *
     * @returns {ZodBoolean} A Zod boolean schema.
     */
    boolean: () => z.ZodDefault<z.ZodBoolean>;
    /**
     * Processor for truthy boolean values.
     * Ensures the value is a valid boolean and provides a default value if not specified.
     *
     * @returns {ZodBoolean} A Zod boolean schema.
     */
    truthy: (defaultValue?: boolean) => z.ZodType<boolean, z.ZodEffectsDef<z.ZodBoolean>, unknown>;
    /**
     * Processor for array values.
     * Ensures the value is a valid array and provides a default value of an empty array if not specified.
     *
     * @returns {ZodArray} A Zod array schema.
     */
    array: () => z.ZodDefault<z.ZodArray<z.ZodUnknown>>;
    /**
     * Processor for object values.
     * Ensures the value is a valid object and provides a default value of an empty object if not specified.
     *
     * @returns {ZodObject} A Zod object schema.
     */
    object: () => z.ZodDefault<z.ZodObject<z.ZodRawShape>>;
    /**
     * Trimmed nullable string processor
     * @returns
     */
    nullableString: () => z.ZodEffects<z.ZodNullable<z.ZodString>, string | null, string | null>;
};
/**
 * Retrieves environment variable values from the provided source object,
 * giving precedence to `process.env` values if they exist and are non-empty.
 * @param source The source value to read from.
 * @returns A record with keys from the source and values from either process.env or the source.
 */
export declare const getMappedSource: <TSource extends Record<string, string | number | undefined>>(source: TSource) => Record<keyof TSource, string | number | undefined>;
//# sourceMappingURL=_common.d.ts.map