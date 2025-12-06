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

export const useKonamiCode = (callback: () => void) => {
  const index = useRef(0);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // If the key matches the current expected key in the sequence
      if (event.key === KONAMI_CODE[index.current]) {
        index.current += 1;

        // If the sequence is complete
        if (index.current === KONAMI_CODE.length) {
          callbackRef.current();
          index.current = 0; // Reset after successful activation
        }
      } else {
        // If mismatch, reset.
        // Also check if the key matches the start of the sequence to allow immediate restart
        index.current = event.key === KONAMI_CODE[0] ? 1 : 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};
