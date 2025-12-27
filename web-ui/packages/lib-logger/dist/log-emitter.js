const listeners = new Set();
export const addSendCustomEventListener = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
export const removeSendCustomEventListener = (listener) => listeners.delete(listener);
export const emitSendCustomEvent = async (payload) => {
    const mutablePayload = {
        ...payload,
        processed: false,
    };
    for (const listener of Array.from(listeners)) {
        try {
            await listener(mutablePayload);
        }
        catch {
        }
    }
    return mutablePayload.processed;
};
