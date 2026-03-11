import type { ErrorReporterInterface } from '../monitoring/types';

export const reporter = async (): Promise<ErrorReporterInterface> => {
  if (typeof window === 'undefined') {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const { serverReporter } = await import('./server');
      return serverReporter();
    }
    const { edgeReporter } = await import('./edge');
    return edgeReporter();
  }
  const { clientReporter } = await import('./client');
  return clientReporter();
};

export const initializeErrorReporterConfig = async (): Promise<void> => {
  const reporterInstance = await reporter();
  if (!reporterInstance) {
    throw new Error('Failed to create error reporter');
  }
};
