import {
  ZodProcessors,
  getMappedSource
} from "./chunk-T2KRQTZW.mjs";

// src/_client.ts
import { z } from "zod";
import { isAiLanguageModelType } from "@repo/app/lib/ai/client";
var clientRawInstance = {
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,
  /**
   * The cache timeout for client-side data grids.
   * @type {number | undefined}
   */
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: process.env.NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT ?? 5 * 60 * 1e3,
  /**
   * The default AI model
   */
  NEXT_PUBLIC_DEFAULT_AI_MODEL: process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL,
  /**
   * The hostname for the public-facing application.
   * @type {string | undefined}
   */
  NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
  /**
   * The log level for client-side logging.
   * @type {string | undefined}
   */
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT ?? "silly",
  /**
   * Flagsmith API URL for feature flag management and retrieval.
   */
  NEXT_PUBLIC_FLAGSMITH_API_URL: process.env.NEXT_PUBLIC_FLAGSMITH_API_URL,
  /**
   * Flagsmith environment ID for scoping feature flags.
   */
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID,
  /**
   * The license key for MUI X Pro components.
   */
  NEXT_PUBLIC_MUI_LICENSE: process.env.NEXT_PUBLIC_MUI_LICENSE
};
var clientEnvSchema = z.object({
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: z.string().optional(),
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: ZodProcessors.integer().default(
    5 * 60 * 1e3
  ),
  NEXT_PUBLIC_DEFAULT_AI_MODEL: z.string().transform((val) => {
    return isAiLanguageModelType(val) ? val : "hifi";
  }).default("hifi"),
  NEXT_PUBLIC_FLAGSMITH_API_URL: z.string().min(1),
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: z.string().min(1),
  NEXT_PUBLIC_HOSTNAME: ZodProcessors.url().default("http://localhost:3000"),
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: ZodProcessors.logLevel().default("silly"),
  NEXT_PUBLIC_MUI_LICENSE: z.string().default("")
});
var clientEnvFactory = () => clientEnvSchema.parse(getMappedSource(clientRawInstance));

export {
  clientRawInstance,
  clientEnvSchema,
  clientEnvFactory
};
