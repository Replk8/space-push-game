import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Player from './Player';

// Interpolation settings
const INTERPOLATION_SPEED = 10; // Higher = snappier, Lower = smoother
const VELOCITY_PREDICTION_FACTOR = 0.5; // How much to use velocity for prediction

/**
 * RemotePlayer - A networked player with position interpolation
 * Smoothly interpolates between server position updates for fluid motion
 *
 * @param {Object} props
 * @param {string} props.id - Unique player ID
 * @param {string} props.name - Display name
 * @param {number|string} props.colorIndex - Color index or hex string
 * @param {Object} props.targetPosition - Target position from server { x, y, z }
 * @param {Object} props.targetVelocity - Target velocity from server { x, y, z }
 * @param {boolean} props.isEliminated - Whether player is eliminated
 */
export default function RemotePlayer({
  id,
  name = 'Player',
  colorIndex = 0,
  targetPosition = { x: 0, y: 1, z: 0 },
  targetVelocity = { x: 0, y: 0, z: 0 },
  isEliminated = false,
}) {
  const groupRef = useRef();

  // Store current interpolated position
  const currentPosition = useRef({
    x: targetPosition.x,
    y: targetPosition.y,
    z: targetPosition.z,
  });

  // Interpolate position each frame
  useFrame((state, delta) => {
    if (!groupRef.current || isEliminated) return;

    const cappedDelta = Math.min(delta, 0.1);
    const lerpFactor = 1 - Math.exp(-INTERPOLATION_SPEED * cappedDelta);

    // Predict target position using velocity
    const predictedX = targetPosition.x + targetVelocity.x * VELOCITY_PREDICTION_FACTOR;
    const predictedY = targetPosition.y + targetVelocity.y * VELOCITY_PREDICTION_FACTOR;
    const predictedZ = targetPosition.z + targetVelocity.z * VELOCITY_PREDICTION_FACTOR;

    // Lerp current position towards predicted position
    currentPosition.current.x += (predictedX - currentPosition.current.x) * lerpFactor;
    currentPosition.current.y += (predictedY - currentPosition.current.y) * lerpFactor;
    currentPosition.current.z += (predictedZ - currentPosition.current.z) * lerpFactor;

    // Update visual position
    groupRef.current.position.x = currentPosition.current.x;
    groupRef.current.position.y = currentPosition.current.y;
    groupRef.current.position.z = currentPosition.current.z;
  });

  if (isEliminated) {
    return null;
  }

  return (
    <group
      ref={groupRef}
      position={[targetPosition.x, targetPosition.y, targetPosition.z]}
    >
      <Player
        id={id}
        name={name}
        colorIndex={colorIndex}
        position={[0, 0, 0]} // Position handled by group
        isLocal={false}
        isEliminated={isEliminated}
      />
    </group>
  );
}
