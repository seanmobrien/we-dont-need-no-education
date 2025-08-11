import type { NextConfig } from 'next';

/**
 * Public Environment Configuration (Next.js)
 * --------------------------------------------------------------
 * Centralized, typed access to environment variables that are considered
 * safe for inclusion in the browser bundle. In Next.js only variables whose
 * names begin with `NEXT_PUBLIC_` are automatically inlined into client builds.
 *
 * This module performs three related duties:
 * 1. Documents every public runtime environment variable the application relies on.
 * 2. Provides a single import location to aid discoverability and tree‑shaking.
 * 3. Normalizes (and where appropriate, mirrors) select values so fallback
 *    logic lives in one place instead of being repeated across the codebase.
 *
 * SECURITY NOTE
 * Do NOT add secrets, credentials, API keys (without explicit public intent),
 * or any sensitive values here. Anything placed in this object that starts
 * with `NEXT_PUBLIC_` is baked into the shipped JavaScript and becomes visible
 * to end users. Treat this file as public surface area documentation.
 *
 * TELEMETRY CONNECTION STRING HANDLING
 * The property `AZURE_MONITOR_CONNECTION_STRING` (without the `NEXT_PUBLIC_`
 * prefix) is deliberately included as a convenience mirror to allow server
 * code to access either the private value (if set) or fall back to the
 * public one. Because it does NOT start with `NEXT_PUBLIC_`, Next.js will NOT
 * expose its value to client bundles; any client‑side reference to it will
 * evaluate to its literal (likely `undefined`) at build time. This is safe
 * provided no confidential value is leaked through the fallback chain.
 *
 * USAGE EXAMPLE
 * ```ts
 * import { PublicEnv } from '@/lib/config/public-env';
 *
 * console.info('Client log level:', PublicEnv.NEXT_PUBLIC_LOG_LEVEL_CLIENT);
 * ```
 *
 * EXTENDING
 * When adding a new public variable:
 * 1. Add it to your runtime environment (.env*.local, deployment config, etc.).
 * 2. Confirm the name starts with `NEXT_PUBLIC_`.
 * 3. Append a documented entry below with a concise description.
 * 4. Avoid transforming / parsing here; keep this layer a thin mapping.
 */

/**
 * Shape (compile‑time) of the exported `PublicEnv` object.
 * Useful for generic utilities that operate over the set of public env keys.
 */
export type PublicEnvShape = typeof PublicEnv;

/**
 * Union of all public environment variable keys.
 */
export type PublicEnvKey = keyof typeof PublicEnv;

/**
 * Union type of all public environment variable values (string | undefined literals).
 */
export type PublicEnvValue = (typeof PublicEnv)[PublicEnvKey];

/**
 * Canonical collection of public (and safe mirrored) environment variables.
 * All properties are `readonly` via `as const` to preserve literal types.
 */
export const PublicEnv = {    
   /**
    * Base hostname, scheme, and port used for constructing absolute URLs on the client.
    * Example: `https://app.example.com`
    */
    NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,

   /**
    * Minimum log level for client‑side logging infrastructure.
    * Expected values commonly include: `debug`, `info`, `warn`, `error`.
    * Used to filter browser console / telemetry noise in production.
    */
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT,

   /**
    * Public (non‑secret) Azure Monitor connection string variant. Some
    * deployments may choose to expose a limited or proxy endpoint publicly
    * for client telemetry. Prefer the private value where available.
    */
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING:
      process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,

   /**
    * Server‑side Azure Monitor connection string with fallback to the
    * public variant if the private one is not defined. This property itself
    * is NOT made public by Next.js (no `NEXT_PUBLIC_` prefix) and therefore
    * remains server‑only at runtime. Client references collapse at build time.
    */
    AZURE_MONITOR_CONNECTION_STRING:
      process.env.AZURE_MONITOR_CONNECTION_STRING ??
      process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,

   /**
    * Optional Material UI (MUI) license key required for certain premium
    * component packages. Exposed publicly because the library expects the
    * value in browser context; ensure the key is intended for client use.
    */
    NEXT_PUBLIC_MUI_LICENSE: process.env.NEXT_PUBLIC_MUI_LICENSE,
  } as const;

export const withPublicEnv = <TArg extends NextConfig>(
    nextConfig: TArg
  ): TArg => {
    return {
      ...nextConfig,
      publicRuntimeConfig: {
        ...(nextConfig.publicRuntimeConfig ?? {}),
        ...PublicEnv,
      },
    };
  };


  export default PublicEnv;