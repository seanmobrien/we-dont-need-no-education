/**
 * Represents a custom event with optional measurements and a dispose function.
 *
 * @property {string} event - The name of the event.
 * @property {Record<string, number>} [measurements] - Optional measurements associated with the event.
 * @property {() => void} [dispose] - Optional function to dispose of the event.
 */
export type ICustomAppInsightsEvent = {
  /**
   * The name of the event.
   */
  event: string;
  /**
   * Optional measurements associated with the event.
   */
  measurements?: Record<string, string | number>;
  /**
   * @returns void
   * @description Disposes of the event and clears any associated resources.
   */
  dispose?: () => void;
};

/**
 * Represents a custom event with measurements and timers.
 */
export class CustomAppInsightsEvent implements ICustomAppInsightsEvent {
  /**
   * Checks if the given object is an instance of ICustomAppInsightsEvent.
   * @param check - The object to check.
   * @returns True if the object is an instance of ICustomAppInsightsEvent, false otherwise.
   */
  static isCustomAppInsightsEvent(
    check: unknown,
  ): check is ICustomAppInsightsEvent {
    return (
      typeof check === 'object' &&
      check !== null &&
      'event' in check &&
      typeof check.event === 'string'
    );
  }
  /**
   * A map to store timer start times.
   */
  readonly #timers = new Map<string, Date>();
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
   * @param event - The name of the event.
   * @param measurements - Optional initial measurements.
   */
  constructor(event: string, measurements?: Record<string, number | string>) {
    this.event = event;
    this.measurements = measurements ?? {};
  }
  /**
   * Increments the value of a measurement by a specified amount.
   * @param name - The name of the measurement.
   * @param value - The amount to increment by. Defaults to 1.
   */
  increment(name: string, value: number = 1): void {
    const current = Number(this.measurements[name] ?? 0);
    if (!Number.isFinite(current)) {
      throw new Error(
        `Cannot increment measurement "${name}": value "${this.measurements[name]}" is not a finite number.`
      );
    }
    this.measurements[name] = current + value;
  }
  /**
   * Starts a timer for a specified measurement.
   * @param name - The name of the timer.
   * @throws Will throw an error if a timer with the same name already exists.
   */
  startTimer(name: string): void {
    if (this.#timers.has(name)) {
      throw new Error(`Timer with name ${name} already exists.`);
    }
    this.#timers.set(name, new Date());
  }
  /**
   * Stops a timer for a specified measurement and records the elapsed time.
   * @param name - The name of the timer.
   * @throws Will throw an error if a timer with the specified name does not exist.
   */
  stopTimer(name: string): void {
    const now = new Date();
    if (!this.#timers.has(name)) {
      throw new Error(`Timer with name ${name} does not exist.`);
    }
    this.measurements[name] = now.getTime() - this.#timers.get(name)!.getTime();
    this.#timers.delete(name);
  }
  /**
   * Disposes of all active timers and records their elapsed times.
   */
  dispose(): void {
    const now = new Date();
    this.#timers.forEach((start, name) => {
      this.measurements[name] = now.getTime() - start.getTime();
    });
    this.#timers.clear();
  }
}
