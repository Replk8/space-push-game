import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Player from './Player';
import FlameTrail from './FlameTrail';
import PlayerTrail from './PlayerTrail';
import usePhysicsBody from '../hooks/usePhysicsBody';
import { MOVEMENT, BOOST, PHYSICS } from '../utils/constants';

/**
 * PhysicsPlayer - A player with physics-based movement and collision
 * For local player: handles keyboard input and applies forces
 * For remote players: syncs position from physics simulation
 *
 * @param {Object} props
 * @param {string} props.id - Unique player ID
 * @param {string} props.name - Display name
 * @param {number|string} props.colorIndex - Color index or hex string
 * @param {[number, number, number]} props.initialPosition - Starting position
 * @param {boolean} props.isLocal - Whether this is the controllable player
 * @param {Object} props.keysRef - Keyboard input ref (local player only)
 * @param {Object} props.boostState - Boost state object (local player only)
 * @param {Function} props.onBoostTriggered - Callback when boost triggers
 * @param {Function} props.onPositionUpdate - Callback to send position to server (local player only)
 * @param {boolean} props.isEliminated - Whether player is eliminated
 * @param {boolean} props.canMove - Whether player can move (false during lobby/countdown)
 */
export default function PhysicsPlayer({
  id,
  name = 'Player',
  colorIndex = 0,
  initialPosition = [0, 1, 0],
  isLocal = false,
  keysRef,
  boostState,
  onBoostTriggered,
  onPositionUpdate,
  isEliminated = false,
  canMove = true,
  playerScale = 1.0,
}) {
  const groupRef = useRef();
  const prevBoostKeyRef = useRef(false);
  const lastDirectionRef = useRef({ x: 0, z: -1 });
  const velocityRef = useRef({ x: 0, y: 0, z: 0 });

  // Create physics body for this player
  const {
    bodyRef,
    positionRef,
    syncFromPhysics,
    applyForce,
    applyImpulse,
    getVelocity,
  } = usePhysicsBody(id, initialPosition, isLocal);

  // Update physics and visuals each frame
  useFrame((state, delta) => {
    if (isEliminated) return;

    // Time scale for frame-rate independent physics forces
    const timeScale = Math.min(delta, 0.1) * 60;

    // For local player: handle input (only when canMove is true)
    if (isLocal && canMove && keysRef?.current) {
      const keys = keysRef.current;
      const body = bodyRef.current;

      if (!body) return;

      // Get camera for screen-space movement
      const camera = state.camera;
      
      // Calculate screen-space directions
      const cameraForward = new THREE.Vector3();
      camera.getWorldDirection(cameraForward);
      cameraForward.y = 0;
      cameraForward.normalize();
      
      const cameraRight = new THREE.Vector3();
      cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));
      cameraRight.normalize();
      
      // Handle anchor mode (Enter key)
      if (keys.anchor) {
        body.mass = 100;
        body.velocity.x *= 0.5;
        body.velocity.z *= 0.5;
      } else {
        body.mass = 1;
      }
      
      // Calculate movement with acceleration
      let forceX = 0;
      let forceZ = 0;
      
      const baseForce = MOVEMENT.PHYSICS_ACCELERATION;
      const currentVel = body.velocity;
      const currentSpeed = Math.sqrt(currentVel.x * currentVel.x + currentVel.z * currentVel.z);
      
      // Acceleration multiplier (speeds up over time)
      const accelMultiplier = Math.min(1 + currentSpeed * 0.5, 3.0);
      const movementForce = baseForce * accelMultiplier;
      
      // Boost multiplier
      const boostMultiplier = keys.boost ? 3.0 : 1.0;
      const finalForce = movementForce * boostMultiplier;
      
      // Apply forces in screen space
      if (keys.up) {
        forceX += cameraForward.x * finalForce;
        forceZ += cameraForward.z * finalForce;
      }
      if (keys.down) {
        forceX -= cameraForward.x * finalForce;
        forceZ -= cameraForward.z * finalForce;
      }
      if (keys.left) {
        forceX -= cameraRight.x * finalForce;
        forceZ -= cameraRight.z * finalForce;
      }
      if (keys.right) {
        forceX += cameraRight.x * finalForce;
        forceZ += cameraRight.z * finalForce;
      }

      // Normalize diagonal movement
      if (forceX !== 0 && forceZ !== 0) {
        const magnitude = Math.sqrt(forceX * forceX + forceZ * forceZ);
        forceX = (forceX / magnitude) * movementForce;
        forceZ = (forceZ / magnitude) * movementForce;
      }

      // Track movement direction for boost
      if (forceX !== 0 || forceZ !== 0) {
        const dirMagnitude = Math.sqrt(forceX * forceX + forceZ * forceZ);
        lastDirectionRef.current.x = forceX / dirMagnitude;
        lastDirectionRef.current.z = forceZ / dirMagnitude;
      } else {
        const velocity = getVelocity();
        const velMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        if (velMagnitude > 0.01) {
          lastDirectionRef.current.x = velocity.x / velMagnitude;
          lastDirectionRef.current.z = velocity.z / velMagnitude;
        }
      }

      // Apply movement force
      if (forceX !== 0 || forceZ !== 0) {
        applyForce(forceX * timeScale, 0, forceZ * timeScale);
      }

      // Clamp velocity to max speed
      const velocity = getVelocity();
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
      const isCurrentlyBoosted = boostState?.isBoostActive || false;
      const maxSpeed = isCurrentlyBoosted ? BOOST.PHYSICS_MAX_BOOSTED_SPEED : MOVEMENT.PHYSICS_MAX_SPEED;

      if (speed > maxSpeed && body) {
        const scale = maxSpeed / speed;
        body.velocity.x *= scale;
        body.velocity.z *= scale;
      }

      // Handle boost trigger (rising edge detection)
      const boostKeyDown = keys.boost;
      if (boostKeyDown && !prevBoostKeyRef.current && boostState) {
        const success = boostState.triggerBoost();
        if (success) {
          const direction = lastDirectionRef.current;
          applyImpulse(
            direction.x * BOOST.PHYSICS_IMPULSE_STRENGTH,
            0,
            direction.z * BOOST.PHYSICS_IMPULSE_STRENGTH
          );
          if (onBoostTriggered) onBoostTriggered();
        }
      }
      prevBoostKeyRef.current = boostKeyDown;

      // Keep player above platform (prevent falling through)
      if (body.position.y < 0.5) {
        body.position.y = 0.5;
        if (body.velocity.y < 0) {
          body.velocity.y = 0;
        }
      }
    }

    // Sync visual position from physics
    const pos = syncFromPhysics();
    if (groupRef.current) {
      groupRef.current.position.x = pos.x;
      groupRef.current.position.y = pos.y;
      groupRef.current.position.z = pos.z;
    }

    // Update velocity ref for trail effect
    const velocity = getVelocity();
    velocityRef.current.x = velocity.x;
    velocityRef.current.y = velocity.y;
    velocityRef.current.z = velocity.z;

    // Send position update to server for local player
    if (isLocal && onPositionUpdate) {
      onPositionUpdate(
        { x: pos.x, y: pos.y, z: pos.z },
        { x: velocity.x, y: velocity.y, z: velocity.z }
      );
    }
  });

  if (isEliminated) {
    return null;
  }

  // Determine player color for trail
  const playerColor = typeof colorIndex === 'string' ? colorIndex : undefined;

  return (
    <group ref={groupRef} position={initialPosition}>
      <Player
        id={id}
        name={name}
        colorIndex={colorIndex}
        position={[0, 0, 0]}
        isLocal={isLocal}
        isEliminated={isEliminated}
        playerScale={playerScale}
      />
      {/* Particle trail on movement */}
      {isLocal && canMove && (
        <PlayerTrail
          color={playerColor}
          velocityRef={velocityRef}
        />
      )}
      {/* Flame trail on boost */}
      {isLocal && boostState && (
        <FlameTrail
          isActive={boostState.isBoostActive}
          direction={lastDirectionRef.current}
          color={playerColor}
        />
      )}
    </group>
  );
}
