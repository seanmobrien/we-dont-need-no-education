import {
  addSendCustomEventListener,
  emitSendCustomEvent,
} from '../src/log-emitter';
import { CustomAppInsightsEvent } from '../src/event';

const makeLoggerEvent = (name = 'test-event') =>
  new CustomAppInsightsEvent(name);

describe('log-emitter', () => {
  test('invokes listeners and allows them to mark processed', async () => {
    const evt = makeLoggerEvent();
    const listener = jest.fn((payload) => {
      payload.processed = true;
    });

    const unsubscribe = addSendCustomEventListener(listener);
    const processed = await emitSendCustomEvent({
      event: evt,
      severity: 'info',
    });
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
    const payload = listener.mock.calls[0][0];
    expect(payload.event).toBe(evt);
    expect(payload.processed).toBe(true);
    expect(processed).toBe(true);
  });

  test('unsubscribe prevents further delivery', async () => {
    const evt = makeLoggerEvent('skip');
    const listener = jest.fn();
    const unsubscribe = addSendCustomEventListener(listener);
    unsubscribe();

    const processed = await emitSendCustomEvent({
      event: evt,
      severity: 'warn',
    });

    expect(listener).not.toHaveBeenCalled();
    expect(processed).toBe(false);
  });

  test('continues through listeners even when one throws', async () => {
    const evt = makeLoggerEvent('resilient');
    const unsubscribeThrow = addSendCustomEventListener(() => {
      throw new Error('boom');
    });
    const setter = jest.fn((payload) => {
      payload.processed = true;
    });
    const unsubscribeSetter = addSendCustomEventListener(setter);

    const processed = await emitSendCustomEvent({
      event: evt,
      severity: 'error',
    });

    unsubscribeThrow();
    unsubscribeSetter();

    expect(setter).toHaveBeenCalledTimes(1);
    expect(processed).toBe(true);
  });
});
