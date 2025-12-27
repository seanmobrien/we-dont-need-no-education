import { z } from 'zod';
/**
 * The type representing the validated client environment variables.
 *
 * This type is generated from the clientEnvSchema and ensures that all
 * required and optional environment variables for the client-side application
 * are present and correctly typed.
 *
 * @doc
 */
export type ClientEnvType = ReturnType<typeof clientEnvSchema.parse>;
/**
 * An instance containing environment variables for the client-side application.
 *
 * IMPORTANT: NEXT_PUBLIC variables need to be directly accessed to avoid being
 * stripped during the build process.
 *
 * @doc
 */
export declare const clientRawInstance: {
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: string | undefined;
    /**
     * The cache timeout for client-side data grids.
     * @type {number | undefined}
     */
    NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: string | number;
    /**
     * The default AI model
     */
    NEXT_PUBLIC_DEFAULT_AI_MODEL: string | undefined;
    /**
     * The hostname for the public-facing application.
     * @type {string | undefined}
     */
    NEXT_PUBLIC_HOSTNAME: string | undefined;
    /**
     * The log level for client-side logging.
     * @type {string | undefined}
     */
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: string;
    /**
     * Flagsmith API URL for feature flag management and retrieval.
     */
    NEXT_PUBLIC_FLAGSMITH_API_URL: string;
    /**
     * Flagsmith environment ID for scoping feature flags.
     */
    NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: string;
    /**
     * The license key for MUI X Pro components.
     */
    NEXT_PUBLIC_MUI_LICENSE: string | undefined;
};
/**
 * Zod schema for validating and parsing client-side environment variables.
 *
 * This schema ensures that all required environment variables are present and
 * have the correct types and default values.
 *
 * @doc
 */
export declare const clientEnvSchema: z.ZodObject<{
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: z.ZodDefault<z.ZodType<number, z.ZodTypeDef, unknown>>;
    NEXT_PUBLIC_DEFAULT_AI_MODEL: z.ZodDefault<z.ZodEffects<z.ZodString, "lofi" | "hifi" | "google:lofi" | "google:hifi" | "completions" | "gemini-pro" | "gemini-flash" | "azure:lofi" | "azure:hifi" | "azure:completions" | "azure:embedding" | "google:completions" | "google:embedding" | "google:gemini-2.0-flash", string>>;
    NEXT_PUBLIC_FLAGSMITH_API_URL: z.ZodString;
    NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: z.ZodString;
    NEXT_PUBLIC_HOSTNAME: z.ZodDefault<z.ZodEffects<z.ZodString, string, string>>;
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: z.ZodDefault<z.ZodDefault<z.ZodString>>;
    NEXT_PUBLIC_MUI_LICENSE: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: string;
    NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: number;
    NEXT_PUBLIC_DEFAULT_AI_MODEL: "lofi" | "hifi" | "google:lofi" | "google:hifi" | "completions" | "gemini-pro" | "gemini-flash" | "azure:lofi" | "azure:hifi" | "azure:completions" | "azure:embedding" | "google:completions" | "google:embedding" | "google:gemini-2.0-flash";
    NEXT_PUBLIC_FLAGSMITH_API_URL: string;
    NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: string;
    NEXT_PUBLIC_HOSTNAME: string;
    NEXT_PUBLIC_MUI_LICENSE: string;
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING?: string | undefined;
}, {
    NEXT_PUBLIC_FLAGSMITH_API_URL: string;
    NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: string;
    NEXT_PUBLIC_LOG_LEVEL_CLIENT?: string | undefined;
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING?: string | undefined;
    NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT?: unknown;
    NEXT_PUBLIC_DEFAULT_AI_MODEL?: string | undefined;
    NEXT_PUBLIC_HOSTNAME?: string | undefined;
    NEXT_PUBLIC_MUI_LICENSE?: string | undefined;
}>;
/**
 * Parses and validates the client environment variables using the schema.
 *
 * @returns {ClientEnvType} The validated and typed client environment variables.
 * @doc
 */
export declare const clientEnvFactory: () => ClientEnvType;
//# sourceMappingURL=_client.d.ts.map