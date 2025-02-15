import { AbortablePromise } from 'lib/typescript/_generics';

describe('AbortablePromise', () => {
  it('should resolve the promise', async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve('resolved'), 100);
    });

    await expect(promise).resolves.toBe('resolved');
  });

  it('should reject the promise', async () => {
    const promise = new AbortablePromise<string>((_, reject) => {
      setTimeout(() => reject('rejected'), 100);
    });

    await expect(promise).rejects.toBe('rejected');
  });

  it('should cancel the promise', async () => {
    const promise = new AbortablePromise<string>((resolve, reject, signal) => {
      setTimeout(() => resolve('resolved'), 100);
    });

    promise.cancel();

    await expect(promise).rejects.toThrow('Promise was cancelled');
  });

  it('should call onrejected when cancelled', async () => {
    const promise = new AbortablePromise<string>((resolve, reject, signal) => {
      setTimeout(() => resolve('resolved'), 100);
    });

    const cancelledPromise = promise.cancelled((reason) => {
      expect(reason).toEqual(new Error('Promise was cancelled'));
      return 'cancelled';
    });

    promise.cancel();

    await expect(cancelledPromise).rejects.toBe('cancelled');
  });

  it('should call onfulfilled when completed', async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve('resolved'), 100);
    });

    const completedPromise = promise.then((value) => {
      expect(value).toBe('resolved');
      return 'completed';
    });

    await expect(completedPromise).resolves.toBe('completed');
  });
});
