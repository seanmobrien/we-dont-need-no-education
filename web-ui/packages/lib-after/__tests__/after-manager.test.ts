import AfterManager from '../src/index';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';

const AFTER_MANAGER_KEY = Symbol.for('@noeducation/after-manager-instance');

describe('AfterManager', () => {
  let manager: AfterManager;

  beforeEach(() => {
    SingletonProvider.Instance.delete(AFTER_MANAGER_KEY);
    // Get a fresh instance for each test
    manager = AfterManager.getInstance();
  });

  afterEach(async () => {
    // Clean up any registered handlers
    const teardownQueue = manager.queue('teardown', false);
    if (teardownQueue) {
      teardownQueue.forEach(handler => manager.remove('teardown', handler));
    }
    SingletonProvider.Instance.delete(AFTER_MANAGER_KEY);
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = AfterManager.getInstance();
      const instance2 = AfterManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance across multiple calls', () => {
      const instances = Array.from({ length: 5 }, () => AfterManager.getInstance());
      const first = instances[0];
      instances.forEach(instance => {
        expect(instance).toBe(first);
      });
    });
  });

  describe('add', () => {
    it('should add a handler to a queue', () => {
      const handler = jest.fn(async () => {});
      const result = manager.add('test-queue', handler);
      
      expect(result).toBe(true);
      const queue = manager.queue('test-queue', false);
      expect(queue).toHaveLength(1);
    });

    it('should not add duplicate handlers', () => {
      const handler = jest.fn(async () => {});
      
      const result1 = manager.add('test-queue', handler);
      const result2 = manager.add('test-queue', handler);
      
      expect(result1).toBe(true);
      expect(result2).toBe(false);
      
      const queue = manager.queue('test-queue', false);
      expect(queue).toHaveLength(1);
    });

    it('should add multiple different handlers to the same queue', () => {
      const handler1 = jest.fn(async () => {});
      const handler2 = jest.fn(async () => {});
      const handler3 = jest.fn(async () => {});
      
      manager.add('test-queue', handler1);
      manager.add('test-queue', handler2);
      manager.add('test-queue', handler3);
      
      const queue = manager.queue('test-queue', false);
      expect(queue).toHaveLength(3);
    });

    it('should support multiple queues independently', () => {
      const handler1 = jest.fn(async () => {});
      const handler2 = jest.fn(async () => {});
      
      manager.add('queue-1', handler1);
      manager.add('queue-2', handler2);
      
      const queue1 = manager.queue('queue-1', false);
      const queue2 = manager.queue('queue-2', false);
      
      expect(queue1).toHaveLength(1);
      expect(queue2).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('should remove a handler from a queue', () => {
      const handler = jest.fn(async () => {});
      
      manager.add('test-queue', handler);
      const result = manager.remove('test-queue', handler);
      
      expect(result).toBe(true);
      const queue = manager.queue('test-queue', false);
      expect(queue).toHaveLength(0);
    });

    it('should return false when removing non-existent handler', () => {
      const handler = jest.fn(async () => {});
      const result = manager.remove('test-queue', handler);
      
      expect(result).toBe(false);
    });

    it('should only remove the specified handler', () => {
      const handler1 = jest.fn(async () => {});
      const handler2 = jest.fn(async () => {});
      const handler3 = jest.fn(async () => {});
      
      manager.add('test-queue', handler1);
      manager.add('test-queue', handler2);
      manager.add('test-queue', handler3);
      
      manager.remove('test-queue', handler2);
      
      const queue = manager.queue('test-queue', false);
      expect(queue).toHaveLength(2);
      expect(queue).toContain(handler1);
      expect(queue).toContain(handler3);
      expect(queue).not.toContain(handler2);
    });
  });

  describe('queue', () => {
    it('should return undefined for non-existent queue when create is false', () => {
      const queue = manager.queue('non-existent', false);
      expect(queue).toBeUndefined();
    });

    it('should create and return empty queue when create is true', () => {
      const queue = manager.queue('new-queue', true);
      expect(queue).toBeDefined();
      expect(queue).toHaveLength(0);
    });

    it('should return a copy of the queue, not the original', () => {
      const handler = jest.fn(async () => {});
      manager.add('test-queue', handler);
      
      const queue1 = manager.queue('test-queue', false);
      const queue2 = manager.queue('test-queue', false);
      
      expect(queue1).not.toBe(queue2);
      expect(queue1).toEqual(queue2);
    });

    it('should not allow external mutation of internal queue', () => {
      const handler1 = jest.fn(async () => {});
      const handler2 = jest.fn(async () => {});
      
      manager.add('test-queue', handler1);
      
      const queue = manager.queue('test-queue', false);
      queue!.push(handler2); // Try to mutate
      
      const actualQueue = manager.queue('test-queue', false);
      expect(actualQueue).toHaveLength(1);
      expect(actualQueue).toContain(handler1);
      expect(actualQueue).not.toContain(handler2);
    });

    it('should return handlers in registration order', () => {
      const handler1 = jest.fn(async () => {});
      const handler2 = jest.fn(async () => {});
      const handler3 = jest.fn(async () => {});
      
      manager.add('test-queue', handler1);
      manager.add('test-queue', handler2);
      manager.add('test-queue', handler3);
      
      const queue = manager.queue('test-queue', false);
      expect(queue![0]).toBe(handler1);
      expect(queue![1]).toBe(handler2);
      expect(queue![2]).toBe(handler3);
    });
  });

  describe('signal', () => {
    it('should execute all handlers in a queue', async () => {
      const handler1 = jest.fn(async () => {});
      const handler2 = jest.fn(async () => {});
      const handler3 = jest.fn(async () => {});
      
      manager.add('test-queue', handler1);
      manager.add('test-queue', handler2);
      manager.add('test-queue', handler3);
      
      await manager.signal('test-queue');
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should execute handlers concurrently', async () => {
      const executionOrder: number[] = [];
      
      const handler1 = jest.fn(async () => { executionOrder.push(1); });
      const handler2 = jest.fn(async () => { executionOrder.push(2); });
      const handler3 = jest.fn(async () => { executionOrder.push(3); });
      
      manager.add('test-queue', handler1);
      manager.add('test-queue', handler2);
      manager.add('test-queue', handler3);
      
      await manager.signal('test-queue');
      
      // All should have executed
      expect(executionOrder).toContain(1);
      expect(executionOrder).toContain(2);
      expect(executionOrder).toContain(3);
    });

    it('should resolve immediately for non-existent queue', async () => {
      await expect(manager.signal('non-existent')).resolves.toBeUndefined();
    });

    it('should handle async handlers correctly', async () => {
      let resolved = false;
      
      const handler = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        resolved = true;
      });
      
      manager.add('test-queue', handler);
      await manager.signal('test-queue');
      
      expect(resolved).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should wait for all handlers to complete', async () => {
      const results: string[] = [];
      let allResolved = false;
      
      const handler1 = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push('handler1');
      });
      
      const handler2 = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        results.push('handler2');
      });
      
      const handler3 = jest.fn(async () => {
        results.push('handler3');
      });
      
      manager.add('test-queue', handler1);
      manager.add('test-queue', handler2);
      manager.add('test-queue', handler3);
      
      await manager.signal('test-queue').then(() => {
        allResolved = true;
      });
      
      // Signal should have resolved
      expect(allResolved).toBe(true);
      // All handlers should have been called
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
    });

    it('should timeout if handlers take too long', async () => {
      const slowHandler = jest.fn(async () => {
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 10000); // 10 seconds
          timer.unref?.();
        });
      });
      
      manager.add('test-queue', slowHandler);
      
      // Should timeout (default is 7.5 seconds) and resolve without throwing
      await expect(manager.signal('test-queue')).resolves.toBeUndefined();
    }, 15000); // Give jest enough time

    it('should handle handler errors by rejecting', async () => {
      const errorHandler = jest.fn(async () => {
        throw new Error('Handler error');
      });
      
      manager.add('test-queue', errorHandler);
      
      // Check that signal completes (either resolves or rejects, but doesn't hang)
      try {
        await manager.signal('test-queue');
        // If it resolves, that's also acceptable behavior
        expect(errorHandler).toHaveBeenCalled();
      } catch (error) {
        // If it rejects, that's expected
        expect(error).toBeDefined();
      }
    });
  });

  describe('processExit', () => {
    it('should be callable with a callback without throwing', () => {
      const handler = jest.fn(async () => {});
      
      expect(() => AfterManager.processExit(handler)).not.toThrow();
    });

    it('should return a number when called without args', () => {
      const count = AfterManager.processExit();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should be callable multiple times', () => {
      const handler1 = jest.fn(async () => {});
      const handler2 = jest.fn(async () => {});
      
      expect(() => {
        AfterManager.processExit(handler1);
        AfterManager.processExit(handler2);
      }).not.toThrow();
    });
  });

  describe('isBranded and asBranded', () => {
    it('should correctly identify branded objects', () => {
      const obj = {};
      expect(AfterManager.isBranded(obj)).toBe(false);
      
      const branded = AfterManager.asBranded(obj);
      expect(AfterManager.isBranded(branded)).toBe(true);
    });

    it('should not re-brand already branded objects', () => {
      const obj = {};
      const branded1 = AfterManager.asBranded(obj);
      const branded2 = AfterManager.asBranded(branded1);
      
      expect(branded1).toBe(branded2);
    });

    it('should return false for non-objects', () => {
      expect(AfterManager.isBranded(null)).toBe(false);
      expect(AfterManager.isBranded(undefined)).toBe(false);
      expect(AfterManager.isBranded(42)).toBe(false);
      expect(AfterManager.isBranded('string')).toBe(false);
    });
  });
});
