export type EmittingDispose = {
    [Symbol.dispose]: () => void;
    addDisposeListener: (listener: () => void) => void;
    removeDisposeListener: (listener: () => void) => void;
};

export const withEmittingDispose = <T>(input: T): T & EmittingDispose => {
    const listeners = new Set<() => void>();
    const originalDispose = (input as any)[Symbol.dispose] as
        | (() => void)
        | undefined;
    const dispose = () => {
        if (originalDispose) {
            originalDispose();
        }
        for (const listener of listeners) {
            listener();
        }
        listeners.clear();
    };

    const ret = input as T & Partial<EmittingDispose>;
    ret[Symbol.dispose] = dispose;
    ret.addDisposeListener = (listener: () => void) => {
        listeners.add(listener);
    };
    ret.removeDisposeListener = (listener: () => void) => {
        listeners.delete(listener);
    };

    return ret as T & Required<EmittingDispose>;
};
