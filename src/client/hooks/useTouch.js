import { useEffect, useCallback, useRef, useState } from 'react';
import { TOUCH } from '../utils/constants';

/**
 * Hook for mobile touch controls
 *
 * Provides:
 * - Drag anywhere on screen to set movement direction
 * - Tap screen to trigger boost
 *
 * The touch input is converted to the same format as keyboard input:
 * { forward, backward, left, right, boost }
 *
 * This allows touch and keyboard to coexist - they both update the same ref format.
 *
 * @param {Object} keysRef - The keyboard ref to merge touch input into
 * @param {Function} onBoostTap - Callback when tap-to-boost is detected
 * @returns {Object} { touchState, joystickPosition }
 *   - touchState: { isDragging, dragStart, dragCurrent }
 *   - joystickPosition: { x, y } normalized -1 to 1 for optional visual joystick
 */
export default function useTouch(keysRef, onBoostTap) {
  // Track touch state for visual feedback
  const [touchState, setTouchState] = useState({
    isDragging: false,
    dragStart: null,
    dragCurrent: null,
  });

  // Normalized joystick position (-1 to 1)
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });

  // Refs for touch tracking (don't trigger re-renders)
  const touchStartRef = useRef(null);
  const touchStartTimeRef = useRef(null);
  const isDraggingRef = useRef(false);
  const activeDirectionRef = useRef({ forward: false, backward: false, left: false, right: false });

  // Clear directional input that was set by touch controls
  // Only clears keys that touch was actively controlling to avoid stomping keyboard state
  const clearDirectionalInput = useCallback(() => {
    if (keysRef?.current) {
      // Only clear the directional keys that were being controlled by touch
      // This prevents overriding keyboard state when touch ends
      if (activeDirectionRef.current.up) keysRef.current.up = false;
      if (activeDirectionRef.current.down) keysRef.current.down = false;
      if (activeDirectionRef.current.left) keysRef.current.left = false;
      if (activeDirectionRef.current.right) keysRef.current.right = false;
    }
    activeDirectionRef.current = { up: false, down: false, left: false, right: false };
    setJoystickPosition({ x: 0, y: 0 });
  }, [keysRef]);

  // Convert drag offset to directional input
  const updateDirectionFromDrag = useCallback((deltaX, deltaY) => {
    if (!keysRef?.current) return;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Dead zone check
    if (distance < TOUCH.DEAD_ZONE) {
      clearDirectionalInput();
      return;
    }

    // Normalize to max drag distance
    const normalizedDistance = Math.min(distance / TOUCH.MAX_DRAG_DISTANCE, 1);

    // Calculate normalized direction
    const normalizedX = (deltaX / distance) * normalizedDistance;
    const normalizedY = (deltaY / distance) * normalizedDistance;

    // Update joystick position for visual
    setJoystickPosition({ x: normalizedX, y: normalizedY });

    // Convert to directional booleans using thresholds
    // Using configurable threshold to require intentional direction
    const threshold = TOUCH.DIRECTION_THRESHOLD;

    const newDirection = {
      up: normalizedY < -threshold,
      down: normalizedY > threshold,
      left: normalizedX < -threshold,
      right: normalizedX > threshold,
    };

    // Only update keysRef if touch is providing directional input
    // This allows keyboard to override when not touching
    keysRef.current.up = newDirection.up;
    keysRef.current.down = newDirection.down;
    keysRef.current.left = newDirection.left;
    keysRef.current.right = newDirection.right;

    activeDirectionRef.current = newDirection;
  }, [keysRef, clearDirectionalInput]);

  // Handle touch start
  const handleTouchStart = useCallback((event) => {
    // Only handle single touch for movement
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchStartTimeRef.current = Date.now();
    isDraggingRef.current = false;

    setTouchState({
      isDragging: false,
      dragStart: { x: touch.clientX, y: touch.clientY },
      dragCurrent: { x: touch.clientX, y: touch.clientY },
    });
  }, []);

  // Handle touch move
  const handleTouchMove = useCallback((event) => {
    if (!touchStartRef.current || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Check if we've exceeded drag threshold
    if (distance >= TOUCH.DRAG_THRESHOLD) {
      isDraggingRef.current = true;

      // Update direction based on drag
      updateDirectionFromDrag(deltaX, deltaY);

      setTouchState((prev) => ({
        ...prev,
        isDragging: true,
        dragCurrent: { x: touch.clientX, y: touch.clientY },
      }));

      // Prevent default to avoid scrolling while dragging
      event.preventDefault();
    }
  }, [updateDirectionFromDrag]);

  // Handle touch end
  const handleTouchEnd = useCallback((event) => {
    if (!touchStartRef.current) return;

    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - (touchStartTimeRef.current || touchEndTime);

    // Calculate distance from start to end of touch
    // Use the last known drag position since changedTouches may not be available on all browsers
    const lastTouch = touchState.dragCurrent || touchStartRef.current;
    const deltaX = lastTouch.x - touchStartRef.current.x;
    const deltaY = lastTouch.y - touchStartRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // A tap is a short touch that didn't move far and wasn't a drag
    // Check both duration AND distance to differentiate taps from short slow drags
    if (
      !isDraggingRef.current &&
      touchDuration <= TOUCH.TAP_MAX_DURATION &&
      distance <= TOUCH.TAP_MAX_DISTANCE &&
      onBoostTap
    ) {
      // Trigger boost tap
      onBoostTap();
    }

    // Clear touch state
    touchStartRef.current = null;
    touchStartTimeRef.current = null;
    isDraggingRef.current = false;

    // Clear directional input
    clearDirectionalInput();

    setTouchState({
      isDragging: false,
      dragStart: null,
      dragCurrent: null,
    });
  }, [onBoostTap, clearDirectionalInput, touchState.dragCurrent]);

  // Handle touch cancel (e.g., phone call interruption)
  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
    touchStartTimeRef.current = null;
    isDraggingRef.current = false;

    clearDirectionalInput();

    setTouchState({
      isDragging: false,
      dragStart: null,
      dragCurrent: null,
    });
  }, [clearDirectionalInput]);

  // Set up event listeners
  useEffect(() => {
    // Use passive: false for touchmove to allow preventDefault
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  // Cleanup on unmount - ensure directional input is cleared
  useEffect(() => {
    return () => {
      clearDirectionalInput();
    };
  }, [clearDirectionalInput]);

  return {
    touchState,
    joystickPosition,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  };
}
