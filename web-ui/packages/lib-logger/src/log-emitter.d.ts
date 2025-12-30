/**
 * Emitter for custom telemetry events
 * @module @compliance-theater/logger/log-emitter
 */

import type { SendCustomEventListener, SendCustomEventPayload } from './types';

declare module '@compliance-theater/logger/log-emitter' {
  /**
   * Registers a listener for custom events.
   * Returns an unsubscribe function that removes the listener.
   */
  export const addSendCustomEventListener: (
    listener: SendCustomEventListener,
  ) => () => void;

  /**
   * Removes a previously registered listener.
   */
  export const removeSendCustomEventListener: (
    listener: SendCustomEventListener,
  ) => boolean;

  /**
   * Emits a custom event to all listeners and reports whether any handler marked it processed.
   */
  export const emitSendCustomEvent: (
    payload: Omit<SendCustomEventPayload, 'processed'>,
  ) => Promise<boolean>;
}
