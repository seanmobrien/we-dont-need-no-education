/**
 * Circuit breaker implementation that prevents cascading failures in distributed systems.
 *
 * The circuit breaker operates in three states:
 * - **CLOSED**: Normal operation, all requests pass through
 * - **OPEN**: Circuit is "tripped", all requests fail fast without calling the operation
 * - **HALF_OPEN**: Testing state, allows a single request to test if the service has recovered
 *
 * This pattern helps protect your application from repeatedly calling a failing service,
 * giving the service time to recover while providing fast feedback to callers.
 *
 * @example
 * ```typescript
 * // Basic usage with API calls
 * const circuitBreaker = new SimpleCircuitBreaker(3, 60000); // 3 failures, 1 minute timeout
 *
 * async function callExternalAPI() {
 *   return circuitBreaker.execute(async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     if (!response.ok) {
 *       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
 *     }
 *     return response.json();
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Database operation protection
 * const dbCircuitBreaker = new SimpleCircuitBreaker(5, 30000);
 *
 * async function getUserData(userId: string) {
 *   try {
 *     return await dbCircuitBreaker.execute(async () => {
 *       return await database.query('SELECT * FROM users WHERE id = ?', [userId]);
 *     });
 *   } catch (error) {
 *     if (error.message === 'Circuit breaker is OPEN') {
 *       // Serve from cache or return default data
 *       return getCachedUserData(userId);
 *     }
 *     throw error;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Microservice integration with fallback
 * const paymentServiceBreaker = new SimpleCircuitBreaker(2, 45000);
 *
 * async function processPayment(paymentData: PaymentRequest) {
 *   try {
 *     return await paymentServiceBreaker.execute(async () => {
 *       return await paymentService.charge(paymentData);
 *     });
 *   } catch (error) {
 *     if (error.message === 'Circuit breaker is OPEN') {
 *       // Queue payment for later processing
 *       await queuePayment(paymentData);
 *       return { status: 'queued', message: 'Payment queued due to service unavailability' };
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
declare module 'lib/react-util/simple-circuit-breaker' {
  /**
   * Circuit breaker implementation that prevents cascading failures in distributed systems.
   *
   * The circuit breaker operates in three states:
   * - **CLOSED**: Normal operation, all requests pass through
   * - **OPEN**: Circuit is "tripped", all requests fail fast without calling the operation
   * - **HALF_OPEN**: Testing state, allows a single request to test if the service has recovered
   *
   * This pattern helps protect your application from repeatedly calling a failing service,
   * giving the service time to recover while providing fast feedback to callers.
   *
   * @example
   * ```typescript
   * // Basic usage with API calls
   * const circuitBreaker = new SimpleCircuitBreaker(3, 60000); // 3 failures, 1 minute timeout
   *
   * async function callExternalAPI() {
   *   return circuitBreaker.execute(async () => {
   *     const response = await fetch('https://api.example.com/data');
   *     if (!response.ok) {
   *       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
   *     }
   *     return response.json();
   *   });
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Database operation protection
   * const dbCircuitBreaker = new SimpleCircuitBreaker(5, 30000);
   *
   * async function getUserData(userId: string) {
   *   try {
   *     return await dbCircuitBreaker.execute(async () => {
   *       return await database.query('SELECT * FROM users WHERE id = ?', [userId]);
   *     });
   *   } catch (error) {
   *     if (error.message === 'Circuit breaker is OPEN') {
   *       // Serve from cache or return default data
   *       return getCachedUserData(userId);
   *     }
   *     throw error;
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Microservice integration with fallback
   * const paymentServiceBreaker = new SimpleCircuitBreaker(2, 45000);
   *
   * async function processPayment(paymentData: PaymentRequest) {
   *   try {
   *     return await paymentServiceBreaker.execute(async () => {
   *       return await paymentService.charge(paymentData);
   *     });
   *   } catch (error) {
   *     if (error.message === 'Circuit breaker is OPEN') {
   *       // Queue payment for later processing
   *       await queuePayment(paymentData);
   *       return { status: 'queued', message: 'Payment queued due to service unavailability' };
   *     }
   *     throw error;
   *   }
   * }
   * ```
   */
  export class SimpleCircuitBreaker {
    /**
     * Creates a new SimpleCircuitBreaker instance.
     *
     * @param errorThreshold - Number of consecutive failures required to open the circuit
     * @param resetTimeoutMs - Time in milliseconds to wait before attempting to close the circuit again
     *
     * @example
     * ```typescript
     * // Strict circuit breaker: trips after 2 failures, resets after 1 minute
     * const strictBreaker = new SimpleCircuitBreaker(2, 60000);
     *
     * // Lenient circuit breaker: trips after 10 failures, resets after 5 minutes
     * const lenientBreaker = new SimpleCircuitBreaker(10, 300000);
     *
     * // Default configuration: 5 failures, 30 seconds
     * const defaultBreaker = new SimpleCircuitBreaker();
     * ```
     */
    constructor(errorThreshold?: number, resetTimeoutMs?: number);

    /**
     * Executes the provided operation through the circuit breaker.
     *
     * The circuit breaker will:
     * - Execute the operation if the circuit is CLOSED
     * - Fail fast if the circuit is OPEN and timeout hasn't elapsed
     * - Test the operation if the circuit is HALF_OPEN or timeout has elapsed
     * - Track success/failure and update circuit state accordingly
     *
     * @template T - The return type of the operation
     * @param operation - Async function to execute through the circuit breaker
     * @returns Promise that resolves to the operation's result
     * @throws Error with message "Circuit breaker is OPEN" when circuit is open and timeout hasn't elapsed
     * @throws Any error thrown by the operation itself
     *
     * @example
     * ```typescript
     * const breaker = new SimpleCircuitBreaker(3, 30000);
     *
     * // Simple API call
     * const userData = await breaker.execute(async () => {
     *   const response = await fetch('/api/user/123');
     *   return response.json();
     * });
     * ```
     *
     * @example
     * ```typescript
     * // Error handling with circuit breaker state checking
     * async function fetchWithFallback<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
     *   try {
     *     return await circuitBreaker.execute(operation);
     *   } catch (error) {
     *     if (error.message === 'Circuit breaker is OPEN') {
     *       console.log('Service unavailable, using fallback');
     *       return fallback;
     *     }
     *     // Re-throw other errors
     *     throw error;
     *   }
     * }
     *
     * const result = await fetchWithFallback(
     *   () => fetch('/api/data').then(r => r.json()),
     *   { default: 'data' }
     * );
     * ```
     *
     * @example
     * ```typescript
     * // Multiple operations with the same circuit breaker
     * const serviceBreaker = new SimpleCircuitBreaker(3, 60000);
     *
     * async function getUser(id: string) {
     *   return serviceBreaker.execute(() => userService.get(id));
     * }
     *
     * async function updateUser(id: string, data: UserData) {
     *   return serviceBreaker.execute(() => userService.update(id, data));
     * }
     *
     * async function deleteUser(id: string) {
     *   return serviceBreaker.execute(() => userService.delete(id));
     * }
     * ```
     */
    execute<T>(operation: () => Promise<T>): Promise<T>;

    /**
     * Gets the current state of the circuit breaker.
     *
     * @returns Current circuit breaker state: 'CLOSED', 'OPEN', or 'HALF_OPEN'
     *
     * @example
     * ```typescript
     * const breaker = new SimpleCircuitBreaker(3, 30000);
     *
     * console.log(breaker.getState()); // 'CLOSED'
     *
     * // After 3 failures...
     * console.log(breaker.getState()); // 'OPEN'
     *
     * // After timeout period...
     * console.log(breaker.getState()); // Still 'OPEN' until next execute() call
     * ```
     *
     * @example
     * ```typescript
     * // Health check endpoint
     * app.get('/health/circuit-breaker', (req, res) => {
     *   const state = circuitBreaker.getState();
     *   res.json({
     *     circuitBreakerState: state,
     *     healthy: state === 'CLOSED',
     *     timestamp: new Date().toISOString()
     *   });
     * });
     * ```
     *
     * @example
     * ```typescript
     * // Conditional logic based on circuit state
     * async function smartFetch(url: string) {
     *   const state = circuitBreaker.getState();
     *
     *   if (state === 'OPEN') {
     *     // Don't even attempt the call, return cached data immediately
     *     return getCachedData(url);
     *   }
     *
     *   try {
     *     return await circuitBreaker.execute(() => fetch(url));
     *   } catch (error) {
     *     return getCachedData(url);
     *   }
     * }
     * ```
     */
    getState(): string;
  }
}
