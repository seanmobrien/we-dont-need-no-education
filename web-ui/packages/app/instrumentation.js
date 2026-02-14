const REGISTERED_KEY = Symbol.for('@noeducation/instrumentation/registered');
export const register = async () => {
    const globalWithFlag = globalThis;
    if (globalWithFlag[REGISTERED_KEY]) {
        console.warn('[otel] Instrumentation already registered, skipping.');
        return;
    }
    if (process.env.NODE_ENV === 'development' &&
        !process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING) {
        console.log('[otel] Instrumentation disabled for local development');
        return;
    }
    globalWithFlag[REGISTERED_KEY] = true;
    console.log('About to register instrumentation');
    try {
        if (typeof window === 'undefined') {
            if (process.env.NEXT_RUNTIME === 'nodejs') {
                const { default: instrumentServer } = await import('@/instrument/node');
                instrumentServer();
            }
            else {
                console.log('[otel] Instrumentation disabled for edge runtime on server');
            }
        }
        else {
            if (process.env.NEXT_RUNTIME !== 'edge') {
                const { default: instrumentBrowser } = await import('@/instrument/browser');
                instrumentBrowser();
            }
            else {
                console.log('[otel] Instrumentation disabled for edge runtime in browser');
            }
        }
    }
    catch (error) {
        console.error('[otel] Failed to register instrumentation; advanced metric tracking will not be available.', error);
    }
};
//# sourceMappingURL=instrumentation.js.map