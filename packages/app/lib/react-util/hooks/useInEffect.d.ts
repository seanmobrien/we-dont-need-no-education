/**
 * @fileoverview Custom React hook for managing sequential async operations in effects.
 * @module useInEffect
 */

declare module 'lib/react-util/hooks/useInEffect' {
  /**
   * Return type for the useInEffect hook.
   */
  export type UseInEffectReturn = {
    /**
     * Enqueues an async operation to be executed sequentially within the component's effect lifecycle.
     *
     * @template TArgs - Array of argument types for the operation
     * @template TResult - Return type of the operation
     * @param operation - Async function to execute
     * @param args - Arguments to pass to the operation
     * @returns Promise that resolves with the operation result
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enqueue: <TArgs extends any[], TResult>(
      operation: (...args: TArgs) => Promise<TResult>,
      ...args: TArgs
    ) => Promise<TResult>;
  };

  /**
   * Custom React hook that manages a queue of asynchronous operations, ensuring they are executed sequentially
   * within the component's lifecycle using `useEffect`. This hook is useful for scenarios where you need to
   * serialize async side effects and guarantee that only one is processed at a time, even across component remounts.
   *
   * The hook maintains an internal queue and processes each operation in order, handling resolution and rejection
   * of promises, and ensuring that operations are not lost if the component is unmounted and remounted.
   *
   * @returns An object containing the `enqueue` function:
   * - `enqueue`: A function to add an async operation to the queue. It accepts an async function and its arguments,
   *   returning a promise that resolves or rejects with the result of the operation.
   *
   * @example
   * const { enqueue } = useInEffect();
   * enqueue(async (msg: string) => msg + 'World', 'Hello, ').then(console.log); // Logs: "Hello, World"
   *
   * @remarks
   * - Only one instance of the effect should be mounted at a time. Multiple mounts will log a warning.
   * - The queue persists across component remounts, ensuring pending operations are not lost.
   * - Designed for advanced use cases where effect serialization is required.
   */
  export function useInEffect(): UseInEffectReturn;
}
