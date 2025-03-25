const prexit = (fn: () => Promise<void>) => {
  return new Promise<void>((resolve) => {
    fn()
      .then(() => console.log('done'))
      .catch((err) => console.error('Error:', err))
      .finally(() => resolve());
  });
};
export default prexit;
