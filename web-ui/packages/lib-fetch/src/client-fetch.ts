/**
 * @fileoverview Client-side fetch implementation
 *
 * This module provides a simple client-side fetch implementation that
 * uses the global fetch API available in browsers and modern Node.js.
 */

/**
 * Client-side fetch that uses the global fetch API
 *
 * This is a simple wrapper around globalThis.fetch for use in browser
 * environments. It provides a consistent interface that can be used
 * alongside server-side fetch implementations.
 *
 * @example
 * ```typescript
 * import { fetch } from '@compliance-theater/fetch/client';
 *
 * const response = await fetch('https://api.example.com/data');
 * const data = await response.json();
 * ```
 */
export const fetch = globalThis.fetch;
