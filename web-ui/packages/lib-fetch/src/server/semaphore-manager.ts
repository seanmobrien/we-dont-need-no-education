export class Semaphore {
    private slots: number;
    private readonly maxConcurrency: number;
    private waiting: Array<() => void> = [];

    constructor(concurrency: number) {
        if (!Number.isInteger(concurrency) || concurrency < 1) {
            throw new TypeError(`Concurrency must be a positive integer, got: ${concurrency}`);
        }
        this.maxConcurrency = concurrency;
        this.slots = concurrency;
    }

    async acquire(): Promise<void> {
        if (this.slots > 0) {
            this.slots--;
            return;
        }
        await new Promise<void>((resolve) => this.waiting.push(resolve));
    }

    release(): void {
        if (this.slots >= this.maxConcurrency) {
            throw new Error('Semaphore.release() called without corresponding acquire()');
        }

        const waiter = this.waiting.shift();
        if (waiter) {
            waiter();
        } else {
            this.slots++;
        }
    }
}

export class SemaphoreManager {
    private current: Semaphore;

    constructor(initial: Semaphore) {
        this.current = initial;
    }

    get sem(): Semaphore {
        return this.current;
    }

    resize(newConcurrency: number): void {
        this.current = new Semaphore(newConcurrency);
    }
}
