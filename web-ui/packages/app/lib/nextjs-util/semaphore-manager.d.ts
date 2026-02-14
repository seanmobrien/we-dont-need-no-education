export declare class Semaphore {
    private slots;
    private readonly maxConcurrency;
    private waiting;
    constructor(concurrency: number);
    acquire(): Promise<void>;
    release(): void;
    getState(): {
        availableSlots: number;
        maxConcurrency: number;
        waitingCount: number;
        activeOperations: number;
    };
}
export declare class SemaphoreManager {
    private current;
    constructor(initial: Semaphore);
    get sem(): Semaphore;
    resize(newConcurrency: number): void;
}
//# sourceMappingURL=semaphore-manager.d.ts.map