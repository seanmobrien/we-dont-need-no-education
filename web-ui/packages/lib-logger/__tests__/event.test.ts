import { CustomAppInsightsEvent } from '../src/event';

describe('CustomAppInsightsEvent', () => {
  it('detects custom app insights events', () => {
    expect(CustomAppInsightsEvent.isCustomAppInsightsEvent({ event: 'x' })).toBe(true);
    expect(CustomAppInsightsEvent.isCustomAppInsightsEvent({ event: 1 })).toBe(false);
    expect(CustomAppInsightsEvent.isCustomAppInsightsEvent(null)).toBe(false);
  });

  it('increments numeric measurement values', () => {
    const event = new CustomAppInsightsEvent('counter', { attempts: 2 });

    event.increment('attempts');
    event.increment('attempts', 3);

    expect(event.measurements.attempts).toBe(6);
  });

  it('throws when incrementing a non-finite measurement', () => {
    const event = new CustomAppInsightsEvent('counter', { attempts: 'not-a-number' });

    expect(() => event.increment('attempts')).toThrow('is not a finite number');
  });

  it('tracks and stops timers', async () => {
    const event = new CustomAppInsightsEvent('timers');

    event.startTimer('duration');
    await new Promise((resolve) => setTimeout(resolve, 1));
    event.stopTimer('duration');

    expect(typeof event.measurements.duration).toBe('number');
    expect(Number(event.measurements.duration)).toBeGreaterThanOrEqual(0);
  });

  it('throws on duplicate start and missing stop', () => {
    const event = new CustomAppInsightsEvent('timers');

    event.startTimer('dup');
    expect(() => event.startTimer('dup')).toThrow('already exists');
    expect(() => event.stopTimer('missing')).toThrow('does not exist');
  });

  it('finalizes all running timers on dispose', async () => {
    const event = new CustomAppInsightsEvent('dispose');
    event.startTimer('a');
    event.startTimer('b');

    await new Promise((resolve) => setTimeout(resolve, 1));
    event[Symbol.dispose]();

    expect(typeof event.measurements.a).toBe('number');
    expect(typeof event.measurements.b).toBe('number');
    expect(() => event.stopTimer('a')).toThrow('does not exist');
  });
});
