import { AbortablePromise } from '@/lib/typescript/abortable-promise';

describe('AbortablePromise', () => {
  it('should resolve the promise', async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve('resolved'), 100);
    });

    await expect(promise.awaitable).resolves.toBe('resolved');
  });

  it('should reject the promise', async () => {
    const promise = new AbortablePromise<string>((_, reject) => {
      setTimeout(() => reject('rejected'), 100);
    });

    await expect(promise.awaitable).rejects.toBe('rejected');
  });

  it('should cancel the promise', async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve('resolved'), 100);
    });

    promise.cancel();

    await expect(promise.awaitable).rejects.toThrow('Promise was cancelled');
  });

  it('should call onrejected when cancelled', async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve('resolved'), 100);
    });

    const cancelledPromise = promise.cancelled((reason) => {
      expect(reason).toEqual(new Error('Promise was cancelled'));
      throw 'cancelled';
    });

    promise.cancel();

    await expect(cancelledPromise.awaitable).rejects.toBe('cancelled');
  });

  it('should call onfulfilled when completed', async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve('resolved'), 100);
    });

    const completedPromise = promise.then((value) => {
      expect(value).toBe('resolved');
      return 'completed';
    });

    await expect(completedPromise.awaitable).resolves.toBe('completed');
  });

  it('should call onfulfilled when handled in chain', async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve('resolved'), 100);
    });

    const completedPromise = promise
      .cancelled((e) => {
        expect(e).toEqual(new Error('Promise was cancelled'));
        return 'cancelled';
      })
      .then((value) => {
        expect(value).toBe('cancelled');
        return 'completed';
      });

    promise.cancel();

    await expect(completedPromise.awaitable).resolves.toBe('completed');
  });
});
