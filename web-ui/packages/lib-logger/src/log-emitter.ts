import type { SendCustomEventListener, SendCustomEventPayload } from './types';

const listeners = new Set<SendCustomEventListener>();

export const addSendCustomEventListener = (
  listener: SendCustomEventListener,
) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const removeSendCustomEventListener = (
  listener: SendCustomEventListener,
) => listeners.delete(listener);

export const emitSendCustomEvent = async (
  payload: Omit<SendCustomEventPayload, 'processed'>,
) => {
  const mutablePayload: SendCustomEventPayload = {
    ...payload,
    processed: false,
  };

  // Copy listeners to avoid mutation issues during iteration
  for (const listener of Array.from(listeners)) {
    // Allow listeners to be async; failure should not prevent others
    try {
      await listener(mutablePayload);
    } catch {
      // ignore handler errors so other listeners still run
    }
  }

  return mutablePayload.processed;
};

export type { SendCustomEventListener, SendCustomEventPayload };
