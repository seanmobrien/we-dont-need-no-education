import EventEmitter from '@protobufjs/eventemitter';
import { deprecate as baseDeprecate } from '@compliance-theater/types/deprecate';
export const deprecate = baseDeprecate(baseDeprecate, 'deprecate is deprecated; import directly from lib-types instead of lib-nextjs.', 'DEP002');
export const withEmittingDispose = (input) => {
    const emitter = new EventEmitter();
    const originalDispose = input[Symbol.dispose];
    const dispose = () => {
        if (originalDispose) {
            originalDispose();
        }
        emitter.emit('dispose');
        emitter.off();
    };
    const ret = input;
    ret[Symbol.dispose] = dispose;
    ret.addDisposeListener = (listener) => {
        emitter.on('dispose', listener);
    };
    ret.removeDisposeListener = (listener) => {
        emitter.off('dispose', listener);
    };
    return ret;
};
//# sourceMappingURL=utils.js.map