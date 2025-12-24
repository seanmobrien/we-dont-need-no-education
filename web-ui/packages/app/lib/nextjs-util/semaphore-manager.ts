/**
 * A semaphore for controlling concurrent access to resources.
 *
 * @example
 * ```typescript
 * const sem = new Semaphore(5);
 * await sem.acquire();
 * try {
 *   // Do work with guaranteed concurrency slot
 * } finally {
 *   sem.release();
 * }
 * ```
 */
export class Semaphore {
  private slots: number;
  private readonly maxConcurrency: number;
  private waiting: Array<() => void> = [];

  /**
   * Creates a new Semaphore with the specified concurrency limit.
   *
   * @param concurrency - Maximum number of concurrent operations allowed (must be positive integer)
   * @throws {TypeError} If concurrency is not a positive integer
   */
  constructor(concurrency: number) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new TypeError(
        `Concurrency must be a positive integer, got: ${concurrency}`,
      );
    }
    this.maxConcurrency = concurrency;
    this.slots = concurrency;
  }

  /**
   * Acquires a slot from the semaphore.
   * If no slots are available, waits until one becomes available.
   *
   * @returns Promise that resolves when a slot is acquired
   */
  async acquire(): Promise<void> {
    if (this.slots > 0) {
      this.slots--;
      return;
    }
    // Wait for a slot to become available
    // Note: No need to decrement here - release() already handles the slot count
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  /**
   * Releases a slot back to the semaphore.
   * Should always be called after acquire(), preferably in a finally block.
   *
   * @throws {Error} If release is called more times than acquire
   */
  release(): void {
    if (this.slots >= this.maxConcurrency) {
      throw new Error(
        'Semaphore.release() called without corresponding acquire()',
      );
    }

    const waiter = this.waiting.shift();
    if (waiter) {
      // Waiter takes the slot directly, no need to increment
      waiter();
    } else {
      // No one waiting, return slot to pool
      this.slots++;
    }
  }

  /**
   * Gets the current state of the semaphore for debugging/monitoring.
   *
   * @returns Object containing current semaphore state
   */
  getState(): {
    availableSlots: number;
    maxConcurrency: number;
    waitingCount: number;
    activeOperations: number;
  } {
    return {
      availableSlots: this.slots,
      maxConcurrency: this.maxConcurrency,
      waitingCount: this.waiting.length,
      activeOperations: this.maxConcurrency - this.slots,
    };
  }
}

/**
 * Manages a semaphore with dynamic concurrency adjustment capabilities.
 *
 * Note: Resizing creates a new semaphore instance. Operations that acquired
 * slots from the old semaphore will continue to use it until they release.
 * New operations will use the new semaphore with updated concurrency.
 *
 * @example
 * ```typescript
 * const manager = new SemaphoreManager(new Semaphore(5));
 *
 * // Use the semaphore
 * await manager.sem.acquire();
 * try {
 *   // Do work
 * } finally {
 *   manager.sem.release();
 * }
 *
 * // Adjust concurrency at runtime
 * manager.resize(10);
 * ```
 */
export class SemaphoreManager {
  private current: Semaphore;

  /**
   * Creates a new SemaphoreManager with an initial semaphore.
   *
   * @param initial - The initial Semaphore instance to manage
   */
  constructor(initial: Semaphore) {
    this.current = initial;
  }

  /**
   * Gets the current semaphore instance.
   * Use this to acquire/release slots.
   *
   * @returns The current Semaphore instance
   */
  get sem(): Semaphore {
    return this.current;
  }

  /**
   * Resizes the semaphore by creating a new instance with the specified concurrency.
   *
   * Important: Creates a new Semaphore instance. Operations using the old semaphore
   * continue to use it until completion. New operations will use the new semaphore.
   *
   * @param newConcurrency - The new maximum number of concurrent operations (must be positive integer)
   * @throws {TypeError} If newConcurrency is not a positive integer
   */
  resize(newConcurrency: number): void {
    if (!Number.isInteger(newConcurrency) || newConcurrency < 1) {
      throw new TypeError(
        `Concurrency must be a positive integer, got: ${newConcurrency}`,
      );
    }
    this.current = new Semaphore(newConcurrency);
  }
}
