import { Semaphore, SemaphoreManager } from '@/lib/nextjs-util/semaphore-manager';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
describe('Semaphore', () => {
    describe('constructor', () => {
        it('should create a semaphore with valid concurrency', () => {
            const sem = new Semaphore(5);
            const state = sem.getState();
            expect(state.maxConcurrency).toBe(5);
            expect(state.availableSlots).toBe(5);
            expect(state.activeOperations).toBe(0);
            expect(state.waitingCount).toBe(0);
        });
        it('should throw TypeError for non-integer concurrency', () => {
            expect(() => new Semaphore(3.7)).toThrow(TypeError);
            expect(() => new Semaphore(3.7)).toThrow('Concurrency must be a positive integer');
        });
        it('should throw TypeError for negative concurrency', () => {
            expect(() => new Semaphore(-5)).toThrow(TypeError);
            expect(() => new Semaphore(-1)).toThrow('Concurrency must be a positive integer');
        });
        it('should throw TypeError for zero concurrency', () => {
            expect(() => new Semaphore(0)).toThrow(TypeError);
            expect(() => new Semaphore(0)).toThrow('Concurrency must be a positive integer');
        });
        it('should throw TypeError for NaN concurrency', () => {
            expect(() => new Semaphore(NaN)).toThrow(TypeError);
            expect(() => new Semaphore(NaN)).toThrow('Concurrency must be a positive integer');
        });
    });
    describe('acquire() and release()', () => {
        it('should acquire and release a single slot', async () => {
            const sem = new Semaphore(5);
            await sem.acquire();
            expect(sem.getState().availableSlots).toBe(4);
            expect(sem.getState().activeOperations).toBe(1);
            sem.release();
            expect(sem.getState().availableSlots).toBe(5);
            expect(sem.getState().activeOperations).toBe(0);
        });
        it('should acquire multiple slots up to limit', async () => {
            const sem = new Semaphore(3);
            await sem.acquire();
            await sem.acquire();
            await sem.acquire();
            expect(sem.getState().availableSlots).toBe(0);
            expect(sem.getState().activeOperations).toBe(3);
        });
        it('should block when all slots are taken', async () => {
            const sem = new Semaphore(2);
            const results = [];
            await sem.acquire();
            await sem.acquire();
            const blocked = sem.acquire().then(() => {
                results.push(3);
            });
            await sleep(10);
            expect(results).toHaveLength(0);
            expect(sem.getState().waitingCount).toBe(1);
            sem.release();
            await blocked;
            expect(results).toEqual([3]);
            expect(sem.getState().waitingCount).toBe(0);
        });
        it('should throw when release is called without acquire', () => {
            const sem = new Semaphore(5);
            expect(() => sem.release()).toThrow('Semaphore.release() called without corresponding acquire()');
        });
        it('should throw when release is called more times than acquire', async () => {
            const sem = new Semaphore(5);
            await sem.acquire();
            sem.release();
            expect(() => sem.release()).toThrow('Semaphore.release() called without corresponding acquire()');
        });
        it('should handle acquire in finally block correctly', async () => {
            const sem = new Semaphore(2);
            let success = false;
            await sem.acquire();
            try {
                success = true;
            }
            finally {
                sem.release();
            }
            expect(success).toBe(true);
            expect(sem.getState().availableSlots).toBe(2);
        });
    });
    describe('concurrency enforcement', () => {
        it('should enforce max concurrent operations', async () => {
            const sem = new Semaphore(2);
            let running = 0;
            let maxRunning = 0;
            const task = async (id) => {
                await sem.acquire();
                running++;
                maxRunning = Math.max(maxRunning, running);
                await sleep(10);
                running--;
                sem.release();
                return id;
            };
            const results = await Promise.all([
                task(1),
                task(2),
                task(3),
                task(4),
                task(5),
            ]);
            expect(results).toEqual([1, 2, 3, 4, 5]);
            expect(maxRunning).toBe(2);
            expect(sem.getState().availableSlots).toBe(2);
        });
        it('should handle concurrent acquire/release correctly', async () => {
            const sem = new Semaphore(1);
            const results = [];
            const task = async (id) => {
                await sem.acquire();
                results.push(id);
                await sleep(5);
                sem.release();
            };
            await Promise.all([task(1), task(2), task(3)]);
            expect(results).toHaveLength(3);
            expect(results).toContain(1);
            expect(results).toContain(2);
            expect(results).toContain(3);
            expect(sem.getState().availableSlots).toBe(1);
        });
        it('should maintain correct slot count with many operations', async () => {
            const sem = new Semaphore(5);
            const operations = 50;
            const task = async () => {
                await sem.acquire();
                await sleep(1);
                sem.release();
            };
            await Promise.all(Array.from({ length: operations }, () => task()));
            expect(sem.getState().availableSlots).toBe(5);
            expect(sem.getState().activeOperations).toBe(0);
            expect(sem.getState().waitingCount).toBe(0);
        });
    });
    describe('error handling', () => {
        it('should release slot even if operation throws', async () => {
            const sem = new Semaphore(3);
            try {
                await sem.acquire();
                throw new Error('Operation failed');
            }
            catch (error) {
                sem.release();
            }
            expect(sem.getState().availableSlots).toBe(3);
        });
        it('should handle errors with finally block', async () => {
            const sem = new Semaphore(2);
            let errorThrown = false;
            try {
                await sem.acquire();
                throw new Error('Test error');
            }
            catch (error) {
                errorThrown = true;
            }
            finally {
                sem.release();
            }
            expect(errorThrown).toBe(true);
            expect(sem.getState().availableSlots).toBe(2);
        });
    });
    describe('getState()', () => {
        it('should return correct state when idle', () => {
            const sem = new Semaphore(10);
            const state = sem.getState();
            expect(state.availableSlots).toBe(10);
            expect(state.maxConcurrency).toBe(10);
            expect(state.waitingCount).toBe(0);
            expect(state.activeOperations).toBe(0);
        });
        it('should return correct state with active operations', async () => {
            const sem = new Semaphore(5);
            await sem.acquire();
            await sem.acquire();
            await sem.acquire();
            const state = sem.getState();
            expect(state.availableSlots).toBe(2);
            expect(state.maxConcurrency).toBe(5);
            expect(state.waitingCount).toBe(0);
            expect(state.activeOperations).toBe(3);
        });
        it('should return correct state with waiting operations', async () => {
            const sem = new Semaphore(2);
            await sem.acquire();
            await sem.acquire();
            const waiter1 = sem.acquire();
            const waiter2 = sem.acquire();
            await sleep(10);
            const state = sem.getState();
            expect(state.availableSlots).toBe(0);
            expect(state.maxConcurrency).toBe(2);
            expect(state.waitingCount).toBe(2);
            expect(state.activeOperations).toBe(2);
            sem.release();
            sem.release();
            await Promise.all([waiter1, waiter2]);
            sem.release();
            sem.release();
        });
    });
    describe('FIFO ordering', () => {
        it('should process waiting operations in FIFO order', async () => {
            const sem = new Semaphore(1);
            const order = [];
            await sem.acquire();
            const p1 = sem.acquire().then(() => order.push(1));
            const p2 = sem.acquire().then(() => order.push(2));
            const p3 = sem.acquire().then(() => order.push(3));
            await sleep(10);
            sem.release();
            await p1;
            sem.release();
            await p2;
            sem.release();
            await p3;
            sem.release();
            expect(order).toEqual([1, 2, 3]);
        });
    });
});
describe('SemaphoreManager', () => {
    describe('constructor', () => {
        it('should create manager with initial semaphore', () => {
            const sem = new Semaphore(5);
            const manager = new SemaphoreManager(sem);
            expect(manager.sem).toBe(sem);
            expect(manager.sem.getState().maxConcurrency).toBe(5);
        });
    });
    describe('sem getter', () => {
        it('should return current semaphore', () => {
            const sem = new Semaphore(3);
            const manager = new SemaphoreManager(sem);
            expect(manager.sem).toBe(sem);
        });
        it('should allow using semaphore through manager', async () => {
            const manager = new SemaphoreManager(new Semaphore(2));
            await manager.sem.acquire();
            expect(manager.sem.getState().availableSlots).toBe(1);
            manager.sem.release();
            expect(manager.sem.getState().availableSlots).toBe(2);
        });
    });
    describe('resize()', () => {
        it('should resize to new concurrency', () => {
            const manager = new SemaphoreManager(new Semaphore(5));
            manager.resize(10);
            expect(manager.sem.getState().maxConcurrency).toBe(10);
            expect(manager.sem.getState().availableSlots).toBe(10);
        });
        it('should throw TypeError for invalid concurrency', () => {
            const manager = new SemaphoreManager(new Semaphore(5));
            expect(() => manager.resize(-1)).toThrow(TypeError);
            expect(() => manager.resize(0)).toThrow(TypeError);
            expect(() => manager.resize(3.5)).toThrow(TypeError);
            expect(() => manager.resize(NaN)).toThrow(TypeError);
        });
        it('should allow new operations to use new concurrency', async () => {
            const manager = new SemaphoreManager(new Semaphore(2));
            await manager.sem.acquire();
            await manager.sem.acquire();
            const oldSem = manager.sem;
            manager.resize(5);
            expect(manager.sem).not.toBe(oldSem);
            expect(manager.sem.getState().maxConcurrency).toBe(5);
            expect(manager.sem.getState().availableSlots).toBe(5);
            expect(oldSem.getState().availableSlots).toBe(0);
            oldSem.release();
            oldSem.release();
        });
        it('should handle concurrent operations during resize', async () => {
            const manager = new SemaphoreManager(new Semaphore(3));
            const results = [];
            const task = async (id) => {
                const sem = manager.sem;
                await sem.acquire();
                results.push(id);
                await sleep(10);
                sem.release();
                return id;
            };
            const p1 = task(1);
            const p2 = task(2);
            await sleep(5);
            manager.resize(10);
            const p3 = task(3);
            const p4 = task(4);
            await Promise.all([p1, p2, p3, p4]);
            expect(results).toHaveLength(4);
            expect(results).toContain(1);
            expect(results).toContain(2);
            expect(results).toContain(3);
            expect(results).toContain(4);
        });
    });
    describe('integration scenarios', () => {
        it('should support dynamic adjustment based on load', async () => {
            const manager = new SemaphoreManager(new Semaphore(5));
            let completed = 0;
            const task = async () => {
                const sem = manager.sem;
                await sem.acquire();
                await sleep(5);
                completed++;
                sem.release();
            };
            const batch1 = Promise.all([task(), task(), task()]);
            await sleep(2);
            manager.resize(2);
            const batch2 = Promise.all([task(), task(), task()]);
            await Promise.all([batch1, batch2]);
            expect(completed).toBe(6);
            expect(manager.sem.getState().availableSlots).toBe(2);
        });
        it('should work with feature flag polling pattern', async () => {
            const manager = new SemaphoreManager(new Semaphore(8));
            let configValue = 8;
            const checkAndResize = () => {
                const newValue = configValue;
                if (newValue !== manager.sem.getState().maxConcurrency) {
                    manager.resize(newValue);
                }
            };
            const oldSem = manager.sem;
            await oldSem.acquire();
            await oldSem.acquire();
            configValue = 12;
            checkAndResize();
            expect(manager.sem.getState().maxConcurrency).toBe(12);
            oldSem.release();
            oldSem.release();
        });
    });
});
//# sourceMappingURL=semaphore-manager.test.js.map