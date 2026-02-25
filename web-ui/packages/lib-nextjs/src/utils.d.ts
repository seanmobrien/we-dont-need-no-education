export declare const deprecate: any;
type EmittingDispose = {
    [Symbol.dispose]: () => void;
    addDisposeListener: (listener: () => void) => void;
    removeDisposeListener: (listener: () => void) => void;
};
export declare const withEmittingDispose: <T>(input: T) => T & EmittingDispose;
export {};
//# sourceMappingURL=utils.d.ts.map