const REGISTERED_KEY = Symbol.for('@noeducation/instrumentation/registered');

type GlobalWithInstrumentationFlag = typeof globalThis & {
  [REGISTERED_KEY]?: boolean;
};

export const register = async () => {
  const globalWithFlag = globalThis as GlobalWithInstrumentationFlag;
  if (globalWithFlag[REGISTERED_KEY]) {
    console.warn('[otel] Instrumentation already registered, skipping.');
    return;
  }
  // Skip instrumentation in local development if no connection string
  if (
    process.env.NODE_ENV === 'development' &&
    !process.env.AZURE_MONITOR_CONNECTION_STRING
  ) {
    console.log('[otel] Instrumentation disabled for local development');
    return;
  }
  globalWithFlag[REGISTERED_KEY] = true;

  if (typeof window === 'undefined') {
    // This is a server-side environment (Node.js or edge runtime)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const { default: instrumentServer } = await import('@/instrument/node');
      instrumentServer();
    } else {
      //const { default: instrumentEdge } = await import('@/instrument/edge');
      // instrumentEdge();
    }
  } else {
    const { default: instrumentBrowser } = await import('@/instrument/browser');
    instrumentBrowser();
  }
};
