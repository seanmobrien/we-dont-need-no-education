export class Semaphore {
    slots;
    maxConcurrency;
    waiting = [];
    constructor(concurrency) {
        if (!Number.isInteger(concurrency) || concurrency < 1) {
            throw new TypeError(`Concurrency must be a positive integer, got: ${concurrency}`);
        }
        this.maxConcurrency = concurrency;
        this.slots = concurrency;
    }
    async acquire() {
        if (this.slots > 0) {
            this.slots--;
            return;
        }
        await new Promise((resolve) => this.waiting.push(resolve));
    }
    release() {
        if (this.slots >= this.maxConcurrency) {
            throw new Error('Semaphore.release() called without corresponding acquire()');
        }
        const waiter = this.waiting.shift();
        if (waiter) {
            waiter();
        }
        else {
            this.slots++;
        }
    }
    getState() {
        return {
            availableSlots: this.slots,
            maxConcurrency: this.maxConcurrency,
            waitingCount: this.waiting.length,
            activeOperations: this.maxConcurrency - this.slots,
        };
    }
}
export class SemaphoreManager {
    current;
    constructor(initial) {
        this.current = initial;
    }
    get sem() {
        return this.current;
    }
    resize(newConcurrency) {
        if (!Number.isInteger(newConcurrency) || newConcurrency < 1) {
            throw new TypeError(`Concurrency must be a positive integer, got: ${newConcurrency}`);
        }
        this.current = new Semaphore(newConcurrency);
    }
}
//# sourceMappingURL=semaphore-manager.js.map