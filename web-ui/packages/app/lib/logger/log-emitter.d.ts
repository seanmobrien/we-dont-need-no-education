import type { SendCustomEventListener, SendCustomEventPayload } from './types';
export declare const addSendCustomEventListener: (listener: SendCustomEventListener) => () => boolean;
export declare const removeSendCustomEventListener: (listener: SendCustomEventListener) => boolean;
export declare const emitSendCustomEvent: (payload: Omit<SendCustomEventPayload, "processed">) => Promise<boolean>;
export type { SendCustomEventListener, SendCustomEventPayload };
//# sourceMappingURL=log-emitter.d.ts.map