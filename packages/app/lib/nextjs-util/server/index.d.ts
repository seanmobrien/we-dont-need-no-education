/**
 * Server utilities re-exports
 *
 * @module @/lib/nextjs-util/server
 */

declare module '@/lib/nextjs-util/server' {
  export { errorResponseFactory } from './error-response';
  export * from './utils';
  export type { ServerErrorResponseType } from './types';
}
