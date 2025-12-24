/**
 * A simple in-memory rate limiter implementation using a sliding window algorithm.
 * Tracks attempts per key (e.g., IP address, user ID) and enforces rate limits
 * within a configurable time window.
 *
 * @example
 * ```typescript
 * // Create a rate limiter allowing 5 attempts per minute
 * const rateLimiter = new SimpleRateLimiter(5, 60000);
 *
 * // Check if an attempt is allowed for a user
 * if (rateLimiter.canAttempt('user123')) {
 *   // Record the attempt
 *   rateLimiter.recordAttempt('user123');
 *   // Proceed with the operation
 * } else {
 *   // Rate limit exceeded, deny the request
 *   throw new Error('Rate limit exceeded');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Authentication rate limiting example
 * const authLimiter = new SimpleRateLimiter(3, 300000); // 3 attempts per 5 minutes
 *
 * async function authenticateUser(username: string, password: string) {
 *   if (!authLimiter.canAttempt(username)) {
 *     throw new Error('Too many failed login attempts. Please try again later.');
 *   }
 *
 *   const isValid = await validateCredentials(username, password);
 *   if (!isValid) {
 *     authLimiter.recordAttempt(username);
 *     throw new Error('Invalid credentials');
 *   }
 *
 *   // Reset on successful login
 *   authLimiter.reset(username);
 *   return { success: true };
 * }
 * ```
 */
declare module 'lib/react-util/simple-rate-limiter' {
  /**
   * A simple in-memory rate limiter implementation using a sliding window algorithm.
   * Tracks attempts per key (e.g., IP address, user ID) and enforces rate limits
   * within a configurable time window.
   *
   * @example
   * ```typescript
   * // Create a rate limiter allowing 5 attempts per minute
   * const rateLimiter = new SimpleRateLimiter(5, 60000);
   *
   * // Check if an attempt is allowed for a user
   * if (rateLimiter.canAttempt('user123')) {
   *   // Record the attempt
   *   rateLimiter.recordAttempt('user123');
   *   // Proceed with the operation
   * } else {
   *   // Rate limit exceeded, deny the request
   *   throw new Error('Rate limit exceeded');
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Authentication rate limiting example
   * const authLimiter = new SimpleRateLimiter(3, 300000); // 3 attempts per 5 minutes
   *
   * async function authenticateUser(username: string, password: string) {
   *   if (!authLimiter.canAttempt(username)) {
   *     throw new Error('Too many failed login attempts. Please try again later.');
   *   }
   *
   *   const isValid = await validateCredentials(username, password);
   *   if (!isValid) {
   *     authLimiter.recordAttempt(username);
   *     throw new Error('Invalid credentials');
   *   }
   *
   *   // Reset on successful login
   *   authLimiter.reset(username);
   *   return { success: true };
   * }
   * ```
   */
  export class SimpleRateLimiter {
    /**
     * Creates a new SimpleRateLimiter instance.
     *
     * @param maxAttempts - Maximum number of attempts allowed within the time window
     * @param windowMs - Time window in milliseconds for rate limiting
     *
     * @example
     * ```typescript
     * // Allow 10 attempts per 2 minutes
     * const limiter = new SimpleRateLimiter(10, 120000);
     *
     * // Use default values: 5 attempts per minute
     * const defaultLimiter = new SimpleRateLimiter();
     * ```
     */
    constructor(maxAttempts?: number, windowMs?: number);

    /**
     * Checks if an attempt is allowed for the given key.
     * This method automatically cleans up expired attempts and determines
     * if the current attempt count is within the allowed limit.
     *
     * @param key - Unique identifier for the entity being rate limited (e.g., IP address, user ID)
     * @returns `true` if the attempt is allowed, `false` if rate limit is exceeded
     *
     * @example
     * ```typescript
     * const limiter = new SimpleRateLimiter(3, 60000);
     *
     * // Check if user can make an attempt
     * if (limiter.canAttempt('user123')) {
     *   console.log('Attempt allowed');
     * } else {
     *   console.log('Rate limit exceeded');
     * }
     * ```
     *
     * @example
     * ```typescript
     * // API endpoint rate limiting
     * app.post('/api/sensitive-action', (req, res) => {
     *   const clientIP = req.ip;
     *
     *   if (!rateLimiter.canAttempt(clientIP)) {
     *     return res.status(429).json({
     *       error: 'Rate limit exceeded. Please try again later.'
     *     });
     *   }
     *
     *   // Process the request...
     * });
     * ```
     */
    canAttempt(key: string): boolean;

    /**
     * Records an attempt for the given key with the current timestamp.
     * This should be called after a failed operation or any operation
     * that should count towards the rate limit.
     *
     * @param key - Unique identifier for the entity being rate limited
     *
     * @example
     * ```typescript
     * const limiter = new SimpleRateLimiter(5, 60000);
     *
     * // Record a failed login attempt
     * if (!authenticateUser(username, password)) {
     *   limiter.recordAttempt(username);
     *   throw new Error('Authentication failed');
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Record any API call attempt
     * app.post('/api/data', (req, res) => {
     *   const userID = req.user.id;
     *
     *   if (!rateLimiter.canAttempt(userID)) {
     *     return res.status(429).json({ error: 'Rate limit exceeded' });
     *   }
     *
     *   // Record this attempt
     *   rateLimiter.recordAttempt(userID);
     *
     *   // Process the request...
     * });
     * ```
     */
    recordAttempt(key: string): void;

    /**
     * Resets the attempt count for a specific key or clears all attempts.
     * Useful for clearing the rate limit after successful operations
     * or for administrative purposes.
     *
     * @param key - Optional. If provided, resets attempts for this specific key only.
     *              If omitted, clears all attempts for all keys.
     *
     * @example
     * ```typescript
     * const limiter = new SimpleRateLimiter(3, 60000);
     *
     * // Reset attempts for a specific user (e.g., after successful login)
     * limiter.reset('user123');
     *
     * // Clear all attempts (e.g., system maintenance)
     * limiter.reset();
     * ```
     *
     * @example
     * ```typescript
     * // Reset on successful authentication
     * async function login(username: string, password: string) {
     *   if (!authLimiter.canAttempt(username)) {
     *     throw new Error('Account temporarily locked due to too many failed attempts');
     *   }
     *
     *   const isValid = await validateUser(username, password);
     *   if (isValid) {
     *     // Clear failed attempts on successful login
     *     authLimiter.reset(username);
     *     return { success: true, token: generateToken(username) };
     *   } else {
     *     authLimiter.recordAttempt(username);
     *     throw new Error('Invalid credentials');
     *   }
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Administrative reset during maintenance
     * app.post('/admin/reset-rate-limits', requireAdmin, (req, res) => {
     *   rateLimiter.reset(); // Clear all rate limits
     *   res.json({ message: 'All rate limits have been reset' });
     * });
     * ```
     */
    reset(key?: string): void;
  }
}
