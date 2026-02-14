import { renderHook, act } from '@testing-library/react';
import { useKonamiCode } from '@/lib/hooks/use-konami-code';
describe('useKonamiCode', () => {
    it('calls callback when konami code is entered', () => {
        const callback = jest.fn();
        renderHook(() => useKonamiCode(callback));
        const keys = [
            'ArrowUp',
            'ArrowUp',
            'ArrowDown',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'ArrowLeft',
            'ArrowRight',
            'b',
            'a',
        ];
        act(() => {
            keys.forEach((key) => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key }));
            });
        });
        expect(callback).toHaveBeenCalledTimes(1);
    });
    it('resets sequence on mismatch', () => {
        const callback = jest.fn();
        renderHook(() => useKonamiCode(callback));
        const keys = [
            'ArrowUp',
            'ArrowUp',
            'ArrowDown',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'ArrowLeft',
            'ArrowRight',
            'b',
            'x',
        ];
        act(() => {
            keys.forEach((key) => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key }));
            });
        });
        expect(callback).not.toHaveBeenCalled();
    });
    it('resets correctly if the wrong key is the start of the sequence', () => {
        const callback = jest.fn();
        renderHook(() => useKonamiCode(callback));
        const keys1 = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowUp'];
        const keys2 = [
            'ArrowUp',
            'ArrowDown',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'ArrowLeft',
            'ArrowRight',
            'b',
            'a',
        ];
        act(() => {
            [...keys1, ...keys2].forEach((key) => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key }));
            });
        });
        expect(callback).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=use-konami-code.test.jsx.map