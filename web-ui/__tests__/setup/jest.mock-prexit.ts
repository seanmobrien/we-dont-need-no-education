const prexit = (fn: () => Promise<void>) => {
  return new Promise<void>((resolve) => {
    fn()
      .then(() => console.log('process cleanup complete.'))
      .catch((err) => console.error('Error:', err))
      .finally(() => resolve());
  });
};
export default prexit;
