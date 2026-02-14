import { isProgressEvent } from '../../../lib/react-util/utility-methods';
describe('isProgressEvent', () => {
    test('returns true for a ProgressEvent whose target is an XMLHttpRequest', () => {
        const xhr = new XMLHttpRequest();
        const evt = new ProgressEvent('progress');
        Object.defineProperty(evt, 'target', { value: xhr, writable: true });
        expect(isProgressEvent(evt)).toBe(true);
    });
    test('returns false for a ProgressEvent with a non-XHR target', () => {
        const div = document.createElement('div');
        const evt = new ProgressEvent('progress');
        Object.defineProperty(evt, 'target', { value: div, writable: true });
        expect(isProgressEvent(evt)).toBe(false);
    });
    test('returns false for non-ProgressEvent values', () => {
        expect(isProgressEvent({})).toBe(false);
        expect(isProgressEvent(null)).toBe(false);
        expect(isProgressEvent(undefined)).toBe(false);
    });
});
//# sourceMappingURL=utility-methods.test.js.map