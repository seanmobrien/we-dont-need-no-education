/**
 * Server utilities re-exports
 *
 * @module @/lib/nextjs-util/server
 */

import type { errorResponseFactory } from './error-response'
import type { ServerErrorResponseType } from './types';
import type { 
    extractParams, 
    EnableOnBuild, 
    buildFallbackGrid,
    wrapRouteRequest,
    createInstrumentedSpan,
    reportEvent
  } from './utils'

declare module '@/lib/nextjs-util/server' {
  export { errorResponseFactory };
  export { 
    extractParams, 
    EnableOnBuild, 
    buildFallbackGrid,
    wrapRouteRequest,
    createInstrumentedSpan,
    reportEvent
  };
  export type { ServerErrorResponseType };
}
