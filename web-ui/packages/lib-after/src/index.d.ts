declare module '@compliance-theater/after' {
  /**
   * Handler invoked by AfterManager queued operations.
   * The handler returns a promise which resolves when the cleanup work is complete.
   *
   * @template T - the resolved value type (defaults to void/unknown)
   */
  type TAfterHandler<T = unknown | void> = () => Promise<T>;

  /**
   * AfterManager
   *
   * Centralized utility for registering and running teardown/after hooks.
   * Typical usage:
   *
   * ```typescript
   * const mgr = AfterManager.getInstance();
   * mgr.add('teardown', async () => { await cleanup(); });
   * ```
   *
   * The manager is designed to be a process-global singleton that survives module reloads.
   */
  export default class AfterManager {
    /**
     * Type-guard to determine whether a value has been branded by this manager.
     * Branded values are used internally to indicate timeout sentinel values.
     *
     * @template T
     * @param check - value to test
     * @returns true when the value has the manager brand
     */
    static isBranded<T>(check: T): check is T & { __brand: symbol };

    /**
     * Mark a value as branded by this manager. Used to create timeout sentinel objects.
     *
     * @template T
     * @param check - value to brand (mutates the object)
     * @returns the same value typed as branded
     */
    static asBranded<T>(check: T): T & { __brand: symbol };

    /**
     * Get the process-global AfterManager singleton. The instance is lazily created and started.
     *
     * @returns the singleton AfterManager
     */
    static getInstance(): AfterManager;

    /**
     * Helper for process exit integration.
     *
     * When called with a callback the callback is registered on the 'teardown' queue.
     * When called with no args the current number of teardown handlers is returned.
     */
    static processExit(): number;
    static processExit(cb: () => Promise<void>): void;

    /**
     * Register a handler for the named queue.
     * If the handler is already registered for that queue this is a no-op and returns false.
     *
     * @param queueName - logical queue name (e.g. 'teardown')
     * @param handler - async handler to invoke when the queue is signalled
     * @returns true when the handler was added, false when it was already present
     */
    add(queueName: string, handler: TAfterHandler<void>): boolean;

    /**
     * Remove a previously registered handler from a queue.
     *
     * @param queueName - the queue name
     * @param handler - the handler to remove
     * @returns true when the handler was removed
     */
    remove(queueName: string, handler: TAfterHandler<void>): boolean;

    /**
     * Overloaded accessor for a queue's handlers.
     * When `create` is true the queue is created if missing. Returned arrays are shallow copies
     * to prevent callers from mutating internal arrays.
     */
    queue(queueName: string): Array<TAfterHandler<void>>;
    queue(queueName: string, create: true): Array<TAfterHandler<void>>;
    queue(
      queueName: string,
      create: false,
    ): undefined | Array<TAfterHandler<void>>;

    /**
     * Signal a queue by name, waiting for all registered handlers to complete or until a timeout.
     * Returns a promise that resolves when processing completes or when the timeout occurs.
     *
     * @param signalName - name of the queue to signal
     */
    signal(signalName: string): Promise<void>;
  }
}
