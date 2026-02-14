import { useEffect, useRef } from 'react';
const KONAMI_CODE = [
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
export const useKonamiCode = (callback) => {
    const index = useRef(0);
    const callbackRef = useRef(callback);
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === KONAMI_CODE[index.current]) {
                index.current += 1;
                if (index.current === KONAMI_CODE.length) {
                    callbackRef.current();
                    index.current = 0;
                }
            }
            else {
                index.current = event.key === KONAMI_CODE[0] ? 1 : 0;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
};
//# sourceMappingURL=use-konami-code.js.map