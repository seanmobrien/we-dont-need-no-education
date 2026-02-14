/**
 * Stub declarations for app-specific modules that this package depends on.
 * These allow the package to build independently while maintaining type safety.
 * 
 * In a production deployment, these modules should be provided by the consuming application.
 */

declare module '@/auth' {
  export interface User {
    hash?: string;
    [key: string]: unknown;
  }
  
  export const auth: () => Promise<{ user?: User | null } | null>;
}

declare module '@/components/auth/session-provider' {
  import type { ReactNode } from 'react';
  
  export interface SessionContext<T = unknown> {
    userHash?: string;
    status: 'loading' | 'authenticated' | 'unauthenticated';
    data?: T | null;
  }
  
  export function useSession<T = unknown>(): SessionContext<T>;
  export function SessionProvider({ children }: { children: ReactNode }): JSX.Element;
}

declare module '@/lib/error-monitoring/error-reporter' {
  export interface ErrorReporter {
    reportError: (error: unknown) => void;
  }
  
  export const errorReporter: (callback: (reporter: ErrorReporter) => void) => void;
}

declare module '@/lib/nextjs-util/server/fetch' {
  export const fetch: typeof globalThis.fetch;
}
