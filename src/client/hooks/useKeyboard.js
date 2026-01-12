import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook for capturing keyboard input for game controls
 * Simple arrow key only controls
 */
export default function useKeyboard() {
  const keysRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    anchor: false,
  });

  const handleKeyDown = useCallback((event) => {
    // Prevent default browser behavior
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(event.code)) {
      event.preventDefault();
    }

    switch (event.code) {
      case 'ArrowUp':
        keysRef.current.up = true;
        break;
      case 'ArrowDown':
        keysRef.current.down = true;
        break;
      case 'ArrowLeft':
        keysRef.current.left = true;
        break;
      case 'ArrowRight':
        keysRef.current.right = true;
        break;
      case 'Space':
        keysRef.current.boost = true;
        break;
      case 'Enter':
        keysRef.current.anchor = true;
        break;
      default:
        break;
    }
  }, []);

  const handleKeyUp = useCallback((event) => {
    switch (event.code) {
      case 'ArrowUp':
        keysRef.current.up = false;
        break;
      case 'ArrowDown':
        keysRef.current.down = false;
        break;
      case 'ArrowLeft':
        keysRef.current.left = false;
        break;
      case 'ArrowRight':
        keysRef.current.right = false;
        break;
      case 'Space':
        keysRef.current.boost = false;
        break;
      case 'Enter':
        keysRef.current.anchor = false;
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return keysRef;
}
