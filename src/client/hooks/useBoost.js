import { useState, useCallback, useRef, useEffect } from 'react';
import { BOOST } from '../utils/constants';

/**
 * Hook for managing boost/dash mechanic with cooldown
 *
 * Handles:
 * - Spacebar triggers boost (one-shot, not held)
 * - Cooldown prevents spam (configurable, default 1.5s)
 * - Exposes cooldown progress for UI
 * - Tracks if boost is currently active (for visual effects)
 *
 * @returns {Object} {
 *   canBoost: boolean - whether boost is available
 *   isBoostActive: boolean - whether boost effect is currently happening
 *   cooldownProgress: number - 0 to 1, 1 = ready
 *   triggerBoost: () => boolean - call to attempt boost, returns true if successful
 * }
 */
export default function useBoost() {
  const [canBoost, setCanBoost] = useState(true);
  const [isBoostActive, setIsBoostActive] = useState(false);
  const [cooldownProgress, setCooldownProgress] = useState(1);

  const cooldownStartRef = useRef(null);
  const animationFrameRef = useRef(null);
  const boostTimeoutRef = useRef(null);

  // Update cooldown progress each frame
  const updateCooldownProgress = useCallback(() => {
    if (cooldownStartRef.current === null) {
      setCooldownProgress(1);
      return;
    }

    const elapsed = Date.now() - cooldownStartRef.current;
    const progress = Math.min(elapsed / BOOST.COOLDOWN, 1);
    setCooldownProgress(progress);

    if (progress >= 1) {
      setCanBoost(true);
      cooldownStartRef.current = null;
    } else {
      animationFrameRef.current = requestAnimationFrame(updateCooldownProgress);
    }
  }, []);

  // Trigger boost - returns true if boost was activated
  const triggerBoost = useCallback(() => {
    if (!canBoost) {
      return false;
    }

    // Start boost effect
    setIsBoostActive(true);
    setCanBoost(false);
    cooldownStartRef.current = Date.now();
    setCooldownProgress(0);

    // End boost visual effect after duration (with cleanup tracking)
    boostTimeoutRef.current = setTimeout(() => {
      setIsBoostActive(false);
    }, BOOST.DURATION);

    // Start cooldown animation
    animationFrameRef.current = requestAnimationFrame(updateCooldownProgress);

    return true;
  }, [canBoost, updateCooldownProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (boostTimeoutRef.current) {
        clearTimeout(boostTimeoutRef.current);
      }
    };
  }, []);

  return {
    canBoost,
    isBoostActive,
    cooldownProgress,
    triggerBoost,
  };
}
