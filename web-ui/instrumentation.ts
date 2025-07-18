let instrumentationRegistered = false;

export const register = async () => {
  if (instrumentationRegistered) {
    console.warn('[otel] Instrumentation already registered, skipping.');
    return;
  }
  instrumentationRegistered = true;
  
  // Skip instrumentation in local development if no connection string
  if (process.env.NODE_ENV === 'development' && !process.env.AZURE_MONITOR_CONNECTION_STRING) {
    console.log('[otel] Instrumentation disabled for local development');
    return;
  }
  
  if (typeof window === 'undefined') {
    // This is a server-side environment (Node.js or edge runtime)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const { default: instrumentServer } = await import('@/instrument/node');
      instrumentServer();
    } else {
      const { default: instrumentEdge } = await import('@/instrument/edge');
      instrumentEdge();
    }
  } else {
    const { default: instrumentBrowser } = await import('@/instrument/browser');
    instrumentBrowser();
  }  
};
