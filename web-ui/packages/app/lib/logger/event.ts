export type ICustomAppInsightsEvent = {
  event: string;
  measurements?: Record<string, string | number>;
  dispose?: () => void;
};

export class CustomAppInsightsEvent implements ICustomAppInsightsEvent {
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
  readonly #timers = new Map<string, Date>();
  event: string;
  readonly measurements: Record<string, number | string>;
  constructor(event: string, measurements?: Record<string, number | string>) {
    this.event = event;
    this.measurements = measurements ?? {};
  }
  increment(name: string, value: number = 1): void {
    const current = Number(this.measurements[name] ?? 0);
    if (!Number.isFinite(current)) {
      throw new Error(
        `Cannot increment measurement "${name}": value "${this.measurements[name]}" is not a finite number.`,
      );
    }
    this.measurements[name] = current + value;
  }
  startTimer(name: string): void {
    if (this.#timers.has(name)) {
      throw new Error(`Timer with name ${name} already exists.`);
    }
    this.#timers.set(name, new Date());
  }
  stopTimer(name: string): void {
    const now = new Date();
    if (!this.#timers.has(name)) {
      throw new Error(`Timer with name ${name} does not exist.`);
    }
    this.measurements[name] = now.getTime() - this.#timers.get(name)!.getTime();
    this.#timers.delete(name);
  }
  dispose(): void {
    const now = new Date();
    this.#timers.forEach((start, name) => {
      this.measurements[name] = now.getTime() - start.getTime();
    });
    this.#timers.clear();
  }
}
