import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * useScreenShake - Hook for camera shake effects on big impacts
 * Uses spring-damped motion for natural feeling shake
 *
 * IMPORTANT: This hook applies shake offsets to a camera rig group, NOT the camera directly.
 * This allows it to work correctly with OrbitControls which continuously moves the camera.
 *
 * @param {React.RefObject} cameraRigRef - Ref to the THREE.Group that wraps the camera
 * @returns {Object} - { triggerShake, isShaking }
 */
export default function useScreenShake(cameraRigRef) {
  const shakeRef = useRef({
    active: false,
    intensity: 0,
    duration: 0,
    elapsed: 0,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    velocityX: 0,
    velocityY: 0,
    velocityZ: 0,
  });

  const triggerShake = useCallback((intensity = 1) => {
    // Clamp intensity
    const clampedIntensity = Math.min(Math.max(intensity, 0.5), 5);

    shakeRef.current.active = true;
    shakeRef.current.intensity = clampedIntensity;
    shakeRef.current.duration = 0.3 + clampedIntensity * 0.1; // Duration scales with intensity
    shakeRef.current.elapsed = 0;

    // Initial velocity based on random direction in 3D
    const angle = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * Math.PI;
    const force = clampedIntensity * 2;
    shakeRef.current.velocityX = Math.cos(angle) * Math.cos(elevation) * force;
    shakeRef.current.velocityY = Math.sin(elevation) * force;
    shakeRef.current.velocityZ = Math.sin(angle) * Math.cos(elevation) * force;
  }, []);

  useFrame((state, delta) => {
    const shake = shakeRef.current;
    const rig = cameraRigRef?.current;

    if (!rig) return;

    if (!shake.active) {
      // Ensure rig is at origin when not shaking
      if (rig.position.x !== 0 || rig.position.y !== 0 || rig.position.z !== 0) {
        rig.position.set(0, 0, 0);
      }
      return;
    }

    shake.elapsed += delta;

    if (shake.elapsed >= shake.duration) {
      // Shake complete - reset rig to origin
      shake.active = false;
      shake.offsetX = 0;
      shake.offsetY = 0;
      shake.offsetZ = 0;
      shake.velocityX = 0;
      shake.velocityY = 0;
      shake.velocityZ = 0;
      rig.position.set(0, 0, 0);
      return;
    }

    const cappedDelta = Math.min(delta, 0.1);

    // Spring-damped motion
    const stiffness = 300;
    const damping = 15;

    // Spring force pulls back to center
    const springForceX = -shake.offsetX * stiffness;
    const springForceY = -shake.offsetY * stiffness;
    const springForceZ = -shake.offsetZ * stiffness;

    // Damping reduces velocity
    const dampingForceX = -shake.velocityX * damping;
    const dampingForceY = -shake.velocityY * damping;
    const dampingForceZ = -shake.velocityZ * damping;

    // Add random impulses during shake (decreasing over time)
    const progress = shake.elapsed / shake.duration;
    const impulseStrength = shake.intensity * (1 - progress) * 50;
    const randomImpulseX = (Math.random() - 0.5) * impulseStrength;
    const randomImpulseY = (Math.random() - 0.5) * impulseStrength;
    const randomImpulseZ = (Math.random() - 0.5) * impulseStrength;

    // Update velocity
    shake.velocityX += (springForceX + dampingForceX + randomImpulseX) * cappedDelta;
    shake.velocityY += (springForceY + dampingForceY + randomImpulseY) * cappedDelta;
    shake.velocityZ += (springForceZ + dampingForceZ + randomImpulseZ) * cappedDelta;

    // Update offset
    shake.offsetX += shake.velocityX * cappedDelta;
    shake.offsetY += shake.velocityY * cappedDelta;
    shake.offsetZ += shake.velocityZ * cappedDelta;

    // Clamp offset to prevent extreme values
    const maxOffset = shake.intensity * 0.3;
    shake.offsetX = Math.max(-maxOffset, Math.min(maxOffset, shake.offsetX));
    shake.offsetY = Math.max(-maxOffset, Math.min(maxOffset, shake.offsetY));
    shake.offsetZ = Math.max(-maxOffset, Math.min(maxOffset, shake.offsetZ));

    // Apply offset to the camera rig group
    // This is a relative offset that works with OrbitControls
    rig.position.set(shake.offsetX, shake.offsetY, shake.offsetZ);
  });

  return {
    triggerShake,
    isShaking: shakeRef.current.active,
  };
}
