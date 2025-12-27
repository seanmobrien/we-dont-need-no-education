export const abortablePromise = Symbol('abortablePromise');
export class AbortablePromise {
    static isOperationCancelledError(e) {
        return (e instanceof Error &&
            abortablePromise in e &&
            e[abortablePromise] === true);
    }
    static isAbortablePromise(e) {
        return e instanceof AbortablePromise;
    }
    #promise;
    #isMe = Symbol('AbortablePromise');
    [Symbol.toStringTag] = this.#isMe.toString();
    [abortablePromise] = true;
    #controller;
    constructor(executor) {
        const controller = new AbortController();
        this.#controller = controller;
        let onAbortCallback;
        let settled = false;
        this.#promise = new Promise((resolve, reject) => {
            const wrappedResolve = (value) => {
                settled = true;
                resolve(value);
            };
            const wrappedReject = (reason) => {
                settled = true;
                reject(reason);
            };
            onAbortCallback = () => {
                if (!settled) {
                    const error = new Error('Promise was cancelled', {
                        cause: this.#isMe,
                    });
                    error[abortablePromise] = true;
                    wrappedReject(error);
                }
            };
            controller.signal.addEventListener('abort', onAbortCallback);
            executor(wrappedResolve, wrappedReject, controller.signal);
        }).finally(() => {
            if (onAbortCallback) {
                controller.signal.removeEventListener('abort', onAbortCallback);
                onAbortCallback = undefined;
            }
        });
    }
    isMyAbortError(e) {
        return (AbortablePromise.isOperationCancelledError(e) && e.cause === this.#isMe);
    }
    then(onfulfilled, onrejected) {
        this.#promise = this.#promise.then(onfulfilled, onrejected);
        return this;
    }
    catch(onrejected) {
        this.#promise = this.#promise.catch((e) => {
            if (this.isMyAbortError(e)) {
                return Promise.reject(e);
            }
            return onrejected?.(e);
        });
        return this;
    }
    finally(onfinally) {
        this.#promise = this.#promise.finally(onfinally);
        return this;
    }
    cancel() {
        this.#controller.abort();
    }
    cancelled(onrejected) {
        this.#promise = this.#promise.catch((e) => {
            if (this.isMyAbortError(e)) {
                return onrejected ? onrejected(e) : Promise.reject(e);
            }
            return Promise.reject(e);
        });
        return this;
    }
    get awaitable() {
        return this.#promise;
    }
}
