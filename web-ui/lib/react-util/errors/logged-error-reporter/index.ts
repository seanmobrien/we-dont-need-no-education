import { ErrorReporterInterface } from '@/lib/error-monitoring/types';

export const reporter = async (): Promise<ErrorReporterInterface> => {
  if (typeof window === 'undefined') {
    // This is a server-side environment (Node.js or edge runtime)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const { serverReporter } = await import('./server');
      return serverReporter();
    } else {
      const { edgeReporter } = await import('./edge');
      return edgeReporter();
    }
  } else {
    const { clientReporter } = await import('./client');
    return clientReporter();
  }
};


/**
 * Initialize the error reporter and setup any necessary log message subscriptions.
 * This is called by the AppStart utility library in {@link ../../site-util/app-startup.ts}.
 */
export const initializeErrorReporterConfig = async (): Promise<void> => {
  // Simply calling reporter() will initialize the reporter and 
  // setup any necessary log message subscriptions.
  const reporterInstance = await reporter();
  if (!reporterInstance) {
    throw new Error('Failed to create error reporter');
  }
};
