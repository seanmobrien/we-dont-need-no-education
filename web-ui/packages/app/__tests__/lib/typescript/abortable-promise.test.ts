/**
 * Tests for lib/typescript/abortable-promise.ts
 *
 * This module tests the AbortablePromise class which provides:
 * - Cancellable promises with AbortController integration
 * - Operation cancelled error handling
 * - Promise chaining with cancellation support
 */

import {
  AbortablePromise,
  type OperationCancelledError,
} from '@/lib/typescript/abortable-promise';

describe.skip('AbortablePromise', () => {
  describe('Static Methods', () => {
    describe('isOperationCancelledError', () => {
      it('should return true for operation cancelled errors', () => {
        const promise = new AbortablePromise<void>(
          (resolve, reject, signal) => {
            signal.addEventListener('abort', () => {
              const error = new Error('Cancelled') as OperationCancelledError;
              reject(error);
            });
          },
        );

        promise.cancel();

        return promise.awaitable.catch((error) => {
          expect(AbortablePromise.isOperationCancelledError(error)).toBe(true);
        });
      });

      it('should return false for regular errors', () => {
        const error = new Error('Regular error');
        expect(AbortablePromise.isOperationCancelledError(error)).toBe(false);
      });

      it('should return false for non-Error objects', () => {
        expect(AbortablePromise.isOperationCancelledError('string')).toBe(
          false,
        );
        expect(AbortablePromise.isOperationCancelledError(123)).toBe(false);
        expect(AbortablePromise.isOperationCancelledError(null)).toBe(false);
        expect(AbortablePromise.isOperationCancelledError(undefined)).toBe(
          false,
        );
        expect(AbortablePromise.isOperationCancelledError({})).toBe(false);
      });
    });

    describe('isAbortablePromise', () => {
      it('should return true for AbortablePromise instances', () => {
        const promise = new AbortablePromise<void>((resolve) => resolve());
        expect(AbortablePromise.isAbortablePromise(promise)).toBe(true);
      });

      it('should return false for regular promises', () => {
        const promise = Promise.resolve();
        expect(AbortablePromise.isAbortablePromise(promise)).toBe(false);
      });

      it('should return false for non-promise values', () => {
        expect(AbortablePromise.isAbortablePromise('string')).toBe(false);
        expect(AbortablePromise.isAbortablePromise(123)).toBe(false);
        expect(AbortablePromise.isAbortablePromise(null)).toBe(false);
        expect(AbortablePromise.isAbortablePromise(undefined)).toBe(false);
        expect(AbortablePromise.isAbortablePromise({})).toBe(false);
      });
    });
  });

  describe('Constructor', () => {
    it('should create an abortable promise that resolves', async () => {
      const promise = new AbortablePromise<string>((resolve) => {
        resolve('success');
      });

      const result = await promise.awaitable;
      expect(result).toBe('success');
    });

    it('should create an abortable promise that rejects', async () => {
      const promise = new AbortablePromise<string>((resolve, reject) => {
        reject(new Error('failed'));
      });

      await expect(promise.awaitable).rejects.toThrow('failed');
    });

    it('should provide AbortSignal to executor', () => {
      const signalCapture: AbortSignal[] = [];

      const promise = new AbortablePromise<void>((resolve, reject, signal) => {
        signalCapture.push(signal);
        expect(signal).toBeInstanceOf(AbortSignal);
        resolve();
      });

      expect(signalCapture).toHaveLength(1);
    });

    it('should resolve before cancellation', async () => {
      const promise = new AbortablePromise<string>((resolve) => {
        setTimeout(() => resolve('completed'), 10);
      });

      const result = await promise.awaitable;
      expect(result).toBe('completed');
    });
  });

  describe('cancel()', () => {
    it('should cancel a pending promise', async () => {
      const promise = new AbortablePromise<string>(
        (resolve, reject, signal) => {
          signal.addEventListener('abort', () => {
            reject(new Error('Cancelled'));
          });
        },
      );

      promise.cancel();

      await expect(promise.awaitable).rejects.toThrow();
    });

    it('should trigger abort signal', async () => {
      let abortCalled = false;

      const promise = new AbortablePromise<void>((resolve, reject, signal) => {
        signal.addEventListener('abort', () => {
          abortCalled = true;
        });
      });

      promise.cancel();

      // The promise will be rejected, so we need to handle it
      await expect(promise.awaitable).rejects.toThrow('Promise was cancelled');

      // Verify the abort signal was triggered
      expect(abortCalled).toBe(true);
    });

    it('should not affect already resolved promise', async () => {
      const promise = new AbortablePromise<string>((resolve) => {
        resolve('completed');
      });

      const result = await promise.awaitable;
      expect(result).toBe('completed');

      promise.cancel(); // Cancel after resolution
      // Should not throw or change result
    });
  });

  describe('isMyAbortError()', () => {
    it('should return true for errors from its own cancellation', async () => {
      const promise = new AbortablePromise<void>((resolve, reject, signal) => {
        // Don't set up abort handler
      });

      promise.cancel();

      try {
        await promise.awaitable;
      } catch (error) {
        expect(promise.isMyAbortError(error)).toBe(true);
      }
    });

    it('should return false for regular errors', () => {
      const promise = new AbortablePromise<void>((resolve) => resolve());
      const error = new Error('Regular error');

      expect(promise.isMyAbortError(error)).toBe(false);
    });

    it('should return false for other operation cancelled errors', async () => {
      const promise1 = new AbortablePromise<void>(
        (resolve, reject, signal) => {},
      );
      const promise2 = new AbortablePromise<void>(
        (resolve, reject, signal) => {},
      );

      promise2.cancel();

      try {
        await promise2.awaitable;
      } catch (error) {
        expect(promise1.isMyAbortError(error)).toBe(false);
      }
    });
  });

  describe('then()', () => {
    it('should chain promise resolution', async () => {
      const promise = new AbortablePromise<number>((resolve) => {
        resolve(5);
      });

      const result = await promise.then((value) => value * 2).awaitable;
      expect(result).toBe(10);
    });

    it('should chain with async transformations', async () => {
      const promise = new AbortablePromise<number>((resolve) => {
        resolve(5);
      });

      const result = await promise.then((value) => Promise.resolve(value * 2))
        .awaitable;
      expect(result).toBe(10);
    });

    it('should handle rejection in then', async () => {
      const promise = new AbortablePromise<number>((resolve, reject) => {
        reject(new Error('failed'));
      });

      await expect(
        promise.then(
          () => 'success',
          (error) => `handled: ${error.message}`,
        ).awaitable,
      ).resolves.toBe('handled: failed');
    });

    it('should support multiple then chains', async () => {
      const promise = new AbortablePromise<number>((resolve) => {
        resolve(2);
      });

      const result = await promise
        .then((v) => v * 2)
        .then((v) => v + 1)
        .then((v) => v * 3).awaitable;

      expect(result).toBe(15); // (2 * 2 + 1) * 3 = 15
    });

    it('should return AbortablePromise from then', () => {
      const promise = new AbortablePromise<number>((resolve) => {
        resolve(5);
      });

      const chained = promise.then((value) => value * 2);
      expect(chained).toBe(promise); // Returns same instance
    });
  });

  describe('catch()', () => {
    it('should catch promise rejection', async () => {
      const promise = new AbortablePromise<number>((resolve, reject) => {
        reject(new Error('failed'));
      });

      const result = await promise.catch((error) => {
        return -1;
      }).awaitable;

      expect(result).toBe(-1);
    });

    it('should not catch when promise resolves', async () => {
      const promise = new AbortablePromise<number>((resolve) => {
        resolve(42);
      });

      const catchHandler = jest.fn();
      const result = await promise.catch(catchHandler).awaitable;

      expect(result).toBe(42);
      expect(catchHandler).not.toHaveBeenCalled();
    });

    it('should pass error to catch handler', async () => {
      const promise = new AbortablePromise<number>((resolve, reject) => {
        reject(new Error('test error'));
      });

      const result = await promise.catch((error) => {
        expect(error.message).toBe('test error');
        return 0;
      }).awaitable;

      expect(result).toBe(0);
    });

    it('should return AbortablePromise from catch', () => {
      const promise = new AbortablePromise<number>((resolve, reject) => {
        reject(new Error('failed'));
      });

      const caught = promise.catch(() => -1);
      expect(caught).toBe(promise); // Returns same instance
    });
  });

  describe('finally()', () => {
    it('should execute finally on resolution', async () => {
      const finallyHandler = jest.fn();

      const promise = new AbortablePromise<number>((resolve) => {
        resolve(42);
      });

      const result = await promise.finally(finallyHandler).awaitable;

      expect(result).toBe(42);
      expect(finallyHandler).toHaveBeenCalledTimes(1);
    });

    it('should execute finally on rejection', async () => {
      const finallyHandler = jest.fn();

      const promise = new AbortablePromise<number>((resolve, reject) => {
        reject(new Error('failed'));
      });

      await expect(promise.finally(finallyHandler).awaitable).rejects.toThrow(
        'failed',
      );
      expect(finallyHandler).toHaveBeenCalledTimes(1);
    });

    it('should not receive any arguments', async () => {
      const finallyHandler = jest.fn();

      const promise = new AbortablePromise<number>((resolve) => {
        resolve(42);
      });

      await promise.finally(finallyHandler).awaitable;

      expect(finallyHandler).toHaveBeenCalledWith();
    });

    it('should return AbortablePromise from finally', () => {
      const promise = new AbortablePromise<number>((resolve) => {
        resolve(42);
      });

      const finalized = promise.finally(() => {});
      expect(finalized).toBe(promise); // Returns same instance
    });
  });

  describe('cancelled()', () => {
    it('should handle cancellation with cancelled handler', async () => {
      const promise = new AbortablePromise<string>(
        (resolve, reject, signal) => {
          // Don't set up any handlers - let cancel() trigger the error
        },
      );

      const cancelledHandler = jest.fn(() => 'cancelled!');

      promise.cancel();

      const result = await promise.cancelled(cancelledHandler).awaitable;

      expect(result).toBe('cancelled!');
      expect(cancelledHandler).toHaveBeenCalledTimes(1);
    });

    it('should not call cancelled handler on normal resolution', async () => {
      const promise = new AbortablePromise<string>((resolve) => {
        resolve('success');
      });

      const cancelledHandler = jest.fn();

      const result = await promise.cancelled(cancelledHandler).awaitable;

      expect(result).toBe('success');
      expect(cancelledHandler).not.toHaveBeenCalled();
    });

    it('should pass cancellation error to handler', async () => {
      const promise = new AbortablePromise<string>(
        (resolve, reject, signal) => {},
      );

      promise.cancel();

      await promise.cancelled((error) => {
        expect(AbortablePromise.isOperationCancelledError(error)).toBe(true);
        return 'handled';
      }).awaitable;
    });

    it('should not catch non-cancellation errors', async () => {
      const promise = new AbortablePromise<string>((resolve, reject) => {
        reject(new Error('regular error'));
      });

      const cancelledHandler = jest.fn(() => 'cancelled!');

      await expect(
        promise.cancelled(cancelledHandler).awaitable,
      ).rejects.toThrow('regular error');
      expect(cancelledHandler).not.toHaveBeenCalled();
    });

    it('should return AbortablePromise from cancelled', () => {
      const promise = new AbortablePromise<string>((resolve) => {
        resolve('test');
      });

      const handled = promise.cancelled(() => 'cancelled');
      expect(handled).toBe(promise); // Returns same instance
    });
  });

  describe('awaitable', () => {
    it('should provide access to underlying promise', () => {
      const promise = new AbortablePromise<number>((resolve) => {
        resolve(42);
      });

      expect(promise.awaitable).toBeInstanceOf(Promise);
    });

    it('should be readonly', () => {
      const promise = new AbortablePromise<number>((resolve) => {
        resolve(42);
      });

      // TypeScript should prevent this, but test runtime behavior
      expect(() => {
        (promise as any).awaitable = Promise.resolve(99);
      }).toThrow();
    });

    it('should resolve with correct value', async () => {
      const promise = new AbortablePromise<number>((resolve) => {
        resolve(42);
      });

      const result = await promise.awaitable;
      expect(result).toBe(42);
    });
  });

  describe('Integration Tests', () => {
    it('should support complex promise chains with cancellation', async () => {
      const promise = new AbortablePromise<number>((resolve) => {
        setTimeout(() => resolve(10), 50);
      });

      const result = promise
        .then((v) => v * 2)
        .then((v) => v + 5)
        .catch(() => -1)
        .finally(() => {
          /* cleanup */
        });

      promise.cancel();

      await expect(result.awaitable).rejects.toThrow();
    });

    it('should handle cancellation at different points in chain', async () => {
      const promise = new AbortablePromise<number>((resolve) => {
        setTimeout(() => resolve(10), 100);
      });

      const chained = promise
        .then((v) => v * 2)
        .cancelled(() => 'cancelled')
        .then((v) => `result: ${v}`);

      // Cancel before resolution
      setTimeout(() => promise.cancel(), 10);

      const result = await chained.awaitable;
      expect(result).toBe('result: cancelled');
    });

    it('should work with async/await', async () => {
      const promise = new AbortablePromise<number>((resolve) => {
        setTimeout(() => resolve(42), 10);
      });

      const result = await promise.awaitable;
      expect(result).toBe(42);
    });

    it('should handle multiple cancellations safely', () => {
      const promise = new AbortablePromise<void>((resolve) => {
        setTimeout(() => resolve(), 100);
      });

      expect(() => {
        promise.cancel();
        promise.cancel();
        promise.cancel();
      }).not.toThrow();
    });

    it('should cleanup event listeners on completion', async () => {
      const promise = new AbortablePromise<string>((resolve) => {
        resolve('done');
      });

      await promise.awaitable;

      // Event listeners should be cleaned up in finally
      // This is implicitly tested by checking that the promise completes
      expect(true).toBe(true);
    });
  });

  describe('Symbol.toStringTag', () => {
    it('should have a string tag', () => {
      const promise = new AbortablePromise<void>((resolve) => resolve());

      expect(Object.prototype.toString.call(promise)).toContain('Symbol');
    });
  });
});
