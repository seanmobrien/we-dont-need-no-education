/**
 * Late-bound initialization for error reporter configuration.
 * This export is discovered and called by AppStartup during initialization.
 */
export const initAppStartup = async (): Promise<void> => {
  // Dynamically load the reporter to avoid circular dependencies
  const { reporter } = await import('./index');
  
  // Simply calling reporter() will initialize the reporter and 
  // setup any necessary log message subscriptions.
  const reporterInstance = await reporter();
  if (!reporterInstance) {
    throw new Error('Failed to create error reporter');
  }
};
