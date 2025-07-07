let instrumentationRegistered = false;

export const register = async () => {
  if (instrumentationRegistered) {
    console.warn('[otel] Instrumentation already registered, skipping.');
    return;
  }
  instrumentationRegistered = true;
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
