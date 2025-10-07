import { isProgressEvent } from '../../../lib/react-util/utility-methods';

describe('isProgressEvent', () => {
  test('returns true for a ProgressEvent whose target is an XMLHttpRequest', () => {
    const xhr = new XMLHttpRequest();
    const evt = new ProgressEvent(
      'progress',
    ) as unknown as ProgressEvent<XMLHttpRequest>;
    // use defineProperty to set readonly/implicit target in test environment
    Object.defineProperty(evt, 'target', { value: xhr, writable: true });

    expect(isProgressEvent(evt)).toBe(true);
  });

  test('returns false for a ProgressEvent with a non-XHR target', () => {
    const div = document.createElement('div');
    const evt = new ProgressEvent(
      'progress',
    ) as unknown as ProgressEvent<Element>;
    Object.defineProperty(evt, 'target', { value: div, writable: true });

    expect(isProgressEvent(evt)).toBe(false);
  });

  test('returns false for non-ProgressEvent values', () => {
    expect(isProgressEvent({} as unknown)).toBe(false);
    expect(isProgressEvent(null as unknown)).toBe(false);
    expect(isProgressEvent(undefined as unknown)).toBe(false);
  });
});
