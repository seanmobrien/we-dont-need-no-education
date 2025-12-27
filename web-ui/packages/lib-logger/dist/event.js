export class CustomAppInsightsEvent {
    static isCustomAppInsightsEvent(check) {
        return (typeof check === 'object' &&
            check !== null &&
            'event' in check &&
            typeof check.event === 'string');
    }
    #timers = new Map();
    event;
    measurements;
    constructor(event, measurements) {
        this.event = event;
        this.measurements = measurements ?? {};
    }
    increment(name, value = 1) {
        const current = Number(this.measurements[name] ?? 0);
        if (!Number.isFinite(current)) {
            throw new Error(`Cannot increment measurement "${name}": value "${this.measurements[name]}" is not a finite number.`);
        }
        this.measurements[name] = current + value;
    }
    startTimer(name) {
        if (this.#timers.has(name)) {
            throw new Error(`Timer with name ${name} already exists.`);
        }
        this.#timers.set(name, new Date());
    }
    stopTimer(name) {
        const now = new Date();
        if (!this.#timers.has(name)) {
            throw new Error(`Timer with name ${name} does not exist.`);
        }
        this.measurements[name] = now.getTime() - this.#timers.get(name).getTime();
        this.#timers.delete(name);
    }
    [Symbol.dispose]() {
        const now = new Date();
        this.#timers.forEach((start, name) => {
            this.measurements[name] = now.getTime() - start.getTime();
        });
        this.#timers.clear();
    }
}
