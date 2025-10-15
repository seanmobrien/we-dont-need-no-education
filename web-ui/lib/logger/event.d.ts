/**
 * Custom event types for Application Insights telemetry
 * @module @/lib/logger/event
 */

declare module '@/lib/logger/event' {
  /**
   * Represents a custom event with optional measurements and a dispose function.
   *
   * Used for tracking application telemetry events with associated metrics and timers.
   *
   * @property event - The name of the event
   * @property measurements - Optional measurements associated with the event
   * @property dispose - Optional function to dispose of the event and clear resources
   */
  export type ICustomAppInsightsEvent = {
    event: string;
    measurements?: Record<string, string | number>;
    dispose?: () => void;
  };

  /**
   * Represents a custom event with measurements and timers.
   *
   * This class provides timer management and measurement tracking for telemetry events.
   * Timers can be started and stopped to automatically calculate durations, and measurements
   * can be incremented programmatically.
   *
   * @example
   * ```typescript
   * const event = new CustomAppInsightsEvent('api-call');
   * event.startTimer('duration');
   * // ... perform operation
   * event.stopTimer('duration');
   * event.increment('attempts');
   * event.dispose(); // Records all active timers
   * ```
   */
  export class CustomAppInsightsEvent implements ICustomAppInsightsEvent {
    /**
     * Checks if the given object is an instance of ICustomAppInsightsEvent.
     *
     * @param check - The object to check
     * @returns True if the object is an instance of ICustomAppInsightsEvent, false otherwise
     */
    static isCustomAppInsightsEvent(
      check: unknown,
    ): check is ICustomAppInsightsEvent;

    /**
     * The name of the event.
     */
    event: string;

    /**
     * A record to store measurement values.
     */
    readonly measurements: Record<string, number | string>;

    /**
     * Creates an instance of CustomAppInsightsEvent.
     *
     * @param event - The name of the event
     * @param measurements - Optional initial measurements
     */
    constructor(event: string, measurements?: Record<string, number | string>);

    /**
     * Increments the value of a measurement by a specified amount.
     *
     * @param name - The name of the measurement
     * @param value - The amount to increment by (default: 1)
     * @throws {Error} If the current value is not a finite number
     */
    increment(name: string, value?: number): void;

    /**
     * Starts a timer for a specified measurement.
     *
     * @param name - The name of the timer
     * @throws {Error} If a timer with the same name already exists
     */
    startTimer(name: string): void;

    /**
     * Stops a timer for a specified measurement and records the elapsed time.
     *
     * @param name - The name of the timer
     * @throws {Error} If a timer with the specified name does not exist
     */
    stopTimer(name: string): void;

    /**
     * Disposes of all active timers and records their elapsed times.
     */
    dispose(): void;
  }
}
