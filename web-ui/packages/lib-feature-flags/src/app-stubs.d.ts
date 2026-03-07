/**
 * Stub declarations for app-specific modules that this package depends on.
 * These allow the package to build independently while maintaining type safety.
 * 
 * In a production deployment, these modules should be provided by the consuming application.
 */

declare module '@/lib/nextjs-util/server/fetch' {
  export const fetch: typeof globalThis.fetch;
}
