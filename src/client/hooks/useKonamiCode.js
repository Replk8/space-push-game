import { useEffect, useRef, useCallback } from 'react';

/**
 * Konami Code Sequence
 * UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT SPACE ENTER
 */
const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'Enter',
];

// Time limit to complete the sequence (ms)
const SEQUENCE_TIMEOUT = 5000;

/**
 * useKonamiCode - Hook for detecting the Konami code input sequence
 *
 * @param {Function} onActivate - Callback when the Konami code is successfully entered
 * @param {boolean} enabled - Whether the detection is active (should only work during playing state)
 * @returns {Object} - { progress: number } - Current progress through the sequence (0-10)
 */
export default function useKonamiCode(onActivate, enabled = false) {
  const sequenceIndexRef = useRef(0);
  const lastKeyTimeRef = useRef(0);
  const progressRef = useRef(0);

  // Reset the sequence
  const resetSequence = useCallback(() => {
    sequenceIndexRef.current = 0;
    progressRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) {
      resetSequence();
      return;
    }

    const handleKeyDown = (event) => {
      const now = Date.now();

      // Reset if too much time has passed between key presses
      if (now - lastKeyTimeRef.current > SEQUENCE_TIMEOUT) {
        resetSequence();
      }
      lastKeyTimeRef.current = now;

      // Normalize key codes - handle both 'Space' and ' '
      let key = event.code;
      if (key === 'Space' || event.key === ' ') {
        key = 'Space';
      } else if (key === 'Enter' || key === 'NumpadEnter') {
        key = 'Enter';
      }

      const expectedKey = KONAMI_SEQUENCE[sequenceIndexRef.current];

      if (key === expectedKey) {
        // Correct key pressed
        sequenceIndexRef.current++;
        progressRef.current = sequenceIndexRef.current;

        // Check if sequence is complete
        if (sequenceIndexRef.current === KONAMI_SEQUENCE.length) {
          // Konami code activated!
          if (onActivate) {
            onActivate();
          }
          resetSequence();
        }
      } else {
        // Wrong key - check if it starts a new sequence
        if (key === KONAMI_SEQUENCE[0]) {
          sequenceIndexRef.current = 1;
          progressRef.current = 1;
        } else {
          resetSequence();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onActivate, resetSequence]);

  return {
    progress: progressRef.current,
    total: KONAMI_SEQUENCE.length,
  };
}
