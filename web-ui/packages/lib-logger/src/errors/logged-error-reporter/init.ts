export const initAppStartup = async (): Promise<void> => {
  const { reporter } = await import('./index');
  const reporterInstance = await reporter();
  if (!reporterInstance) {
    throw new Error('Failed to create error reporter');
  }
};
