/**
 * @module @compliance-theater/types/is-running-on
 *
 * Runtime environment detection utilities for Next.js applications.
 * Provides functions to determine whether code is executing on the server
 * (Node.js runtime), at the edge (Edge runtime), or in the browser client.
 *
 * These helpers are useful for guarding environment-specific logic such as
 * accessing `window`, server-only APIs, or edge-compatible code paths.
 *
 * @example
 * ```ts
 * import { isRunningOnServer, isRunningOnClient } from '@compliance-theater/types/is-running-on';
 *
 * if (isRunningOnServer()) {
 *   // server-only logic
 * }
 *
 * if (isRunningOnClient()) {
 *   // browser-only logic
 * }
 * ```
 */


/**
 * Checks whether the current code is executing in the Next.js Node.js server runtime.
 *
 * Inspects `process.env.NEXT_RUNTIME` for the value `'nodejs'`.
 *
 * @returns `true` if running on the Node.js server runtime, `false` otherwise.
 *
 * @example
 * ```ts
 * if (isRunningOnServer()) {
 *   const data = await readFileSync('/etc/config');
 * }
 * ```
 */
export const isRunningOnServer: (() => boolean);

/**
 * Checks whether the current code is executing in the Next.js Edge runtime.
 *
 * Inspects `process.env.NEXT_RUNTIME` for the value `'edge'`.
 *
 * @returns `true` if running on the Edge runtime, `false` otherwise.
 *
 * @example
 * ```ts
 * if (isRunningOnEdge()) {
 *   // use edge-compatible APIs only
 * }
 * ```
 */
export const isRunningOnEdge: (() => boolean);

/**
 * Checks whether the current code is executing in a browser client environment.
 *
 * Returns `true` when the `window` global is defined and the code is **not**
 * running on the Edge runtime (which also lacks a true `window` but may have
 * partial globals).
 *
 * @returns `true` if running in a browser client, `false` otherwise.
 *
 * @example
 * ```ts
 * if (isRunningOnClient()) {
 *   document.title = 'Hello';
 * }
 * ```
 */
export const isRunningOnClient: (() => boolean);
