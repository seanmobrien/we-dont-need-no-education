import { ErrorReporterInterface } from '/lib/error-monitoring/types';

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
