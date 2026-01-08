const REGISTERED_KEY = Symbol.for('@noeducation/instrumentation/registered');

type GlobalWithInstrumentationFlag = typeof globalThis & {
  [REGISTERED_KEY]?: boolean;
};

export const register = async () => {
  debugger;
  const globalWithFlag = globalThis as GlobalWithInstrumentationFlag;
  if (globalWithFlag[REGISTERED_KEY]) {
    // Logging is not availalbe until after instrumentation is complete
    console.warn('[otel] Instrumentation already registered, skipping.');
    return;
  }
  // Skip instrumentation in local development if no connection string
  if (
    process.env.NODE_ENV === 'development' &&
    !process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING
  ) {
    // Logging is not availalbe until after instrumentation is complete
    console.log('[otel] Instrumentation disabled for local development');
    return;
  }
  globalWithFlag[REGISTERED_KEY] = true;

  console.log('About to register instrumentation');
  try {
    if (typeof window === 'undefined') {
      // This is a server-side environment (Node.js or edge runtime)
      if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { default: instrumentServer } = await import('@/instrument/node');
        instrumentServer();
      } else {
        console.log('[otel] Instrumentation disabled for edge runtime on server');
      }
    } else {
      if (process.env.NEXT_RUNTIME !== 'edge') {
        const { default: instrumentBrowser } = await import('@/instrument/browser');
        instrumentBrowser();
      } else {
        console.log('[otel] Instrumentation disabled for edge runtime in browser');
      }
    }
  }catch (error) {
    console.error('[otel] Failed to register instrumentation; advanced metric tracking will not be available.', error);
  }
  
};
