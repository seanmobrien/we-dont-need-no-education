/**
 * Semaphore and SemaphoreManager implementations for concurrency control.
 *
 * This module provides primitives for controlling concurrent access to resources
 * using a semaphore pattern. The semaphore allows a fixed number of concurrent
 * operations, with additional operations waiting in a queue until slots become available.
 *
 * @example
 * ```typescript
 * // Limit concurrent API calls to 3
 * const semaphore = new Semaphore(3);
 *
 * async function makeAPICall(url: string) {
 *   await semaphore.acquire();
 *   try {
 *     const response = await fetch(url);
 *     return response.json();
 *   } finally {
 *     semaphore.release();
 *   }
 * }
 *
 * // Execute many calls, but only 3 will run concurrently
 * const results = await Promise.all(
 *   urls.map(url => makeAPICall(url))
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Dynamic concurrency adjustment with SemaphoreManager
 * const manager = new SemaphoreManager(new Semaphore(5));
 *
 * async function processTask(task: Task) {
 *   await manager.sem.acquire();
 *   try {
 *     return await task.execute();
 *   } finally {
 *     manager.sem.release();
 *   }
 * }
 *
 * // Adjust concurrency based on load
 * if (highLoad) {
 *   manager.resize(2); // Reduce to 2 concurrent tasks
 * } else {
 *   manager.resize(10); // Increase to 10 concurrent tasks
 * }
 * ```
 *
 * @module lib/nextjs-util/semaphore-manager
 */

declare module '@/lib/nextjs-util/semaphore-manager' {
  /**
   * A semaphore implementation for controlling concurrent access to resources.
   *
   * The Semaphore maintains a fixed number of "slots" that can be acquired by
   * concurrent operations. When all slots are in use, additional operations wait
   * in a queue until a slot becomes available.
   *
   * @example
   * ```typescript
   * // Limit concurrent database connections to 10
   * const dbSemaphore = new Semaphore(10);
   *
   * async function queryDatabase(query: string) {
   *   await dbSemaphore.acquire();
   *   try {
   *     return await db.execute(query);
   *   } finally {
   *     dbSemaphore.release();
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Rate limiting file uploads
   * const uploadSemaphore = new Semaphore(5);
   *
   * async function uploadFile(file: File) {
   *   await uploadSemaphore.acquire();
   *   console.log(`Uploading ${file.name}...`);
   *   try {
   *     const formData = new FormData();
   *     formData.append('file', file);
   *     const response = await fetch('/api/upload', {
   *       method: 'POST',
   *       body: formData
   *     });
   *     return response.json();
   *   } finally {
   *     uploadSemaphore.release();
   *     console.log(`Completed ${file.name}`);
   *   }
   * }
   *
   * // Upload multiple files with concurrency limit
   * const files = [file1, file2, file3, file4, file5, file6];
   * await Promise.all(files.map(uploadFile)); // Max 5 concurrent uploads
   * ```
   *
   * @example
   * ```typescript
   * // Batch processing with concurrency control
   * const processSemaphore = new Semaphore(3);
   *
   * async function processBatch(items: Item[]) {
   *   return Promise.all(items.map(async (item) => {
   *     await processSemaphore.acquire();
   *     try {
   *       return await processItem(item);
   *     } finally {
   *       processSemaphore.release();
   *     }
   *   }));
   * }
   * ```
   */
  export class Semaphore {
    /**
     * Creates a new Semaphore instance with the specified concurrency limit.
     *
     * @param concurrency - Maximum number of concurrent operations allowed.
     *                      Must be a positive integer.
     *
     * @example
     * ```typescript
     * // Allow 5 concurrent operations
     * const semaphore = new Semaphore(5);
     * ```
     *
     * @example
     * ```typescript
     * // Single-threaded execution (mutex behavior)
     * const mutex = new Semaphore(1);
     *
     * async function criticalSection() {
     *   await mutex.acquire();
     *   try {
     *     // Only one operation can be here at a time
     *     await updateSharedResource();
     *   } finally {
     *     mutex.release();
     *   }
     * }
     * ```
     */
    constructor(concurrency: number);

    /**
     * Acquires a slot from the semaphore.
     *
     * If a slot is available, this method returns immediately and decrements
     * the available slot count. If no slots are available, the method returns
     * a Promise that resolves when a slot becomes available.
     *
     * **IMPORTANT**: Always pair `acquire()` with `release()` in a try-finally
     * block to ensure slots are properly released even if an error occurs.
     *
     * @returns A Promise that resolves when a slot is acquired
     *
     * @example
     * ```typescript
     * const semaphore = new Semaphore(3);
     *
     * async function performOperation() {
     *   await semaphore.acquire();
     *   try {
     *     // Perform operation with guaranteed slot
     *     await doWork();
     *   } finally {
     *     semaphore.release();
     *   }
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Multiple concurrent operations
     * const semaphore = new Semaphore(2);
     *
     * async function task(id: number) {
     *   console.log(`Task ${id} waiting...`);
     *   await semaphore.acquire();
     *   console.log(`Task ${id} running`);
     *   try {
     *     await sleep(1000);
     *   } finally {
     *     console.log(`Task ${id} complete`);
     *     semaphore.release();
     *   }
     * }
     *
     * // Start 5 tasks, but only 2 will run at a time
     * await Promise.all([1, 2, 3, 4, 5].map(task));
     * ```
     *
     * @example
     * ```typescript
     * // Error handling with semaphore
     * const semaphore = new Semaphore(3);
     *
     * async function riskyOperation() {
     *   await semaphore.acquire();
     *   try {
     *     const result = await fetch('/api/data');
     *     if (!result.ok) {
     *       throw new Error(`HTTP ${result.status}`);
     *     }
     *     return result.json();
     *   } catch (error) {
     *     console.error('Operation failed:', error);
     *     throw error; // Release still happens in finally
     *   } finally {
     *     semaphore.release(); // Always releases, even on error
     *   }
     * }
     * ```
     */
    acquire(): Promise<void>;

    /**
     * Releases a slot back to the semaphore.
     *
     * This method increments the available slot count and immediately
     * resolves the next waiting operation (if any) from the queue.
     *
     * **IMPORTANT**: Always call `release()` after `acquire()`, preferably
     * in a finally block to ensure proper cleanup.
     *
     * @example
     * ```typescript
     * const semaphore = new Semaphore(5);
     *
     * async function operation() {
     *   await semaphore.acquire();
     *   try {
     *     await doWork();
     *   } finally {
     *     semaphore.release(); // Always release
     *   }
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Manual acquire/release (not recommended without try-finally)
     * const semaphore = new Semaphore(3);
     *
     * await semaphore.acquire();
     * console.log('Slot acquired');
     * await performSomeWork();
     * semaphore.release();
     * console.log('Slot released');
     * ```
     *
     * @example
     * ```typescript
     * // Helper function pattern
     * const semaphore = new Semaphore(10);
     *
     * async function withSemaphore<T>(fn: () => Promise<T>): Promise<T> {
     *   await semaphore.acquire();
     *   try {
     *     return await fn();
     *   } finally {
     *     semaphore.release();
     *   }
     * }
     *
     * // Usage
     * const result = await withSemaphore(async () => {
     *   return await fetchData();
     * });
     * ```
     */
    release(): void;
  }

  /**
   * Manages a semaphore with dynamic concurrency adjustment capabilities.
   *
   * SemaphoreManager wraps a Semaphore instance and provides the ability to
   * change the concurrency limit at runtime. When resized, a new semaphore
   * is created with the updated concurrency limit.
   *
   * **Note**: Resizing creates a new semaphore instance, so operations that
   * acquired slots from the old semaphore will not release to the new one.
   * Plan resize operations during low-activity periods when possible.
   *
   * @example
   * ```typescript
   * // Start with moderate concurrency
   * const manager = new SemaphoreManager(new Semaphore(5));
   *
   * async function adaptiveProcessing() {
   *   const load = await getSystemLoad();
   *
   *   // Adjust concurrency based on system load
   *   if (load > 0.8) {
   *     manager.resize(2); // Reduce concurrency under high load
   *   } else if (load < 0.3) {
   *     manager.resize(10); // Increase concurrency when idle
   *   }
   *
   *   // Use the current semaphore
   *   await manager.sem.acquire();
   *   try {
   *     await processTasks();
   *   } finally {
   *     manager.sem.release();
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Dynamic rate limiting for API calls
   * const apiManager = new SemaphoreManager(new Semaphore(10));
   *
   * // Monitor rate limit headers and adjust
   * async function makeAPICall(endpoint: string) {
   *   await apiManager.sem.acquire();
   *   try {
   *     const response = await fetch(endpoint);
   *
   *     // Check rate limit headers
   *     const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
   *     if (remaining < 10) {
   *       // Throttle down when approaching limit
   *       apiManager.resize(3);
   *     } else if (remaining > 100) {
   *       // Speed up when plenty of quota available
   *       apiManager.resize(20);
   *     }
   *
   *     return response.json();
   *   } finally {
   *     apiManager.sem.release();
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Time-based concurrency adjustment
   * const taskManager = new SemaphoreManager(new Semaphore(5));
   *
   * // Reduce concurrency during business hours
   * function adjustForTimeOfDay() {
   *   const hour = new Date().getHours();
   *
   *   if (hour >= 9 && hour <= 17) {
   *     // Business hours: lower concurrency
   *     taskManager.resize(3);
   *   } else {
   *     // Off hours: higher concurrency
   *     taskManager.resize(10);
   *   }
   * }
   *
   * // Check every hour
   * setInterval(adjustForTimeOfDay, 3600000);
   * ```
   */
  export class SemaphoreManager {
    /**
     * Creates a new SemaphoreManager with an initial semaphore.
     *
     * @param initial - The initial Semaphore instance to manage
     *
     * @example
     * ```typescript
     * // Create with initial concurrency of 5
     * const manager = new SemaphoreManager(new Semaphore(5));
     * ```
     *
     * @example
     * ```typescript
     * // Start with conservative limit
     * const initialSemaphore = new Semaphore(3);
     * const manager = new SemaphoreManager(initialSemaphore);
     *
     * // Later adjust based on metrics
     * if (performanceMetrics.cpuUsage < 0.5) {
     *   manager.resize(10);
     * }
     * ```
     */
    constructor(initial: Semaphore);

    /**
     * Gets the current semaphore instance.
     *
     * Use this property to access the current semaphore's `acquire()` and
     * `release()` methods for controlling concurrent operations.
     *
     * @returns The current Semaphore instance
     *
     * @example
     * ```typescript
     * const manager = new SemaphoreManager(new Semaphore(5));
     *
     * async function operation() {
     *   await manager.sem.acquire();
     *   try {
     *     await doWork();
     *   } finally {
     *     manager.sem.release();
     *   }
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Helper function using manager
     * const manager = new SemaphoreManager(new Semaphore(10));
     *
     * async function withConcurrencyControl<T>(
     *   fn: () => Promise<T>
     * ): Promise<T> {
     *   await manager.sem.acquire();
     *   try {
     *     return await fn();
     *   } finally {
     *     manager.sem.release();
     *   }
     * }
     *
     * // Usage
     * const results = await Promise.all(
     *   tasks.map(task => withConcurrencyControl(() => task.execute()))
     * );
     * ```
     */
    get sem(): Semaphore;

    /**
     * Resizes the semaphore by creating a new instance with the specified concurrency.
     *
     * **Important Notes**:
     * - Creates a new Semaphore instance with the specified concurrency
     * - Operations using the old semaphore continue to use it until completion
     * - New operations will use the new semaphore with updated concurrency
     * - Consider resizing during low-activity periods to minimize disruption
     *
     * @param newConcurrency - The new maximum number of concurrent operations.
     *                         Must be a positive integer.
     *
     * @example
     * ```typescript
     * const manager = new SemaphoreManager(new Semaphore(5));
     *
     * // Increase concurrency
     * manager.resize(10);
     *
     * // Decrease concurrency
     * manager.resize(2);
     * ```
     *
     * @example
     * ```typescript
     * // Adaptive concurrency based on error rates
     * const manager = new SemaphoreManager(new Semaphore(10));
     * let errorCount = 0;
     * let successCount = 0;
     *
     * async function adaptiveOperation() {
     *   await manager.sem.acquire();
     *   try {
     *     await riskyOperation();
     *     successCount++;
     *
     *     // Increase concurrency on success
     *     if (successCount > 100 && errorCount === 0) {
     *       manager.resize(20);
     *     }
     *   } catch (error) {
     *     errorCount++;
     *
     *     // Decrease concurrency on errors
     *     const errorRate = errorCount / (errorCount + successCount);
     *     if (errorRate > 0.1) {
     *       manager.resize(3);
     *     }
     *
     *     throw error;
     *   } finally {
     *     manager.sem.release();
     *   }
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Circuit breaker pattern with dynamic concurrency
     * const manager = new SemaphoreManager(new Semaphore(10));
     *
     * function adjustConcurrencyOnHealth(health: 'healthy' | 'degraded' | 'failing') {
     *   switch (health) {
     *     case 'healthy':
     *       manager.resize(10);
     *       break;
     *     case 'degraded':
     *       manager.resize(5);
     *       break;
     *     case 'failing':
     *       manager.resize(1);
     *       break;
     *   }
     * }
     *
     * // Monitor service health and adjust
     * setInterval(async () => {
     *   const health = await checkServiceHealth();
     *   adjustConcurrencyOnHealth(health);
     * }, 30000); // Check every 30 seconds
     * ```
     */
    resize(newConcurrency: number): void;
  }
}
