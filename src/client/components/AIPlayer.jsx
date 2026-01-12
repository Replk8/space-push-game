import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import PhysicsPlayer from './PhysicsPlayer';

/**
 * AIPlayer - Computer-controlled opponent with real physics
 */
export default function AIPlayer({
  id,
  name,
  colorIndex,
  initialPosition,
  playerPosition,
  playerVelocity,
  platformRadius,
  onPositionUpdate,
  canMove,
  difficulty = 'medium',
  playerScale = 1.0,
}) {
  // Simulate keyboard input for the AI
  const aiKeysRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    anchor: false,
  });

  // Simulate boost state for the AI
  const aiBoostState = useRef({
    isBoostActive: false,
    canBoost: true,
    cooldownProgress: 1,
    triggerBoost: () => {
      if (aiBoostState.current.canBoost) {
        aiBoostState.current.isBoostActive = true;
        aiBoostState.current.canBoost = false;
        aiBoostState.current.cooldownProgress = 0;
        
        setTimeout(() => {
          aiBoostState.current.isBoostActive = false;
        }, 200);
        
        setTimeout(() => {
          aiBoostState.current.canBoost = true;
          aiBoostState.current.cooldownProgress = 1;
        }, 3000);
        
        return true;
      }
      return false;
    }
  });

  const behaviorTimerRef = useRef(0);
  const currentPosRef = useRef(new THREE.Vector3(...initialPosition));

  // AI difficulty settings
  const difficultySettings = {
    easy: {
      reactionTime: 800,      // Very slow reactions (was 500)
      accuracy: 0.3,          // Only 30% accurate (was 0.6)
      moveChance: 0.5,        // Only moves 50% of the time
    },
    medium: {
      reactionTime: 300,
      accuracy: 0.8,
      moveChance: 0.9,
    },
    hard: {
      reactionTime: 100,
      accuracy: 0.95,
      moveChance: 1.0,
    },
  };

  const settings = difficultySettings[difficulty] || difficultySettings.medium;

  // Update AI behavior
  useFrame((state, delta) => {
    if (!canMove) return;

    behaviorTimerRef.current += delta * 1000;

    // Update AI controls periodically
    if (behaviorTimerRef.current > settings.reactionTime) {
      behaviorTimerRef.current = 0;

      // Reset all keys
      aiKeysRef.current.up = false;
      aiKeysRef.current.down = false;
      aiKeysRef.current.left = false;
      aiKeysRef.current.right = false;
      aiKeysRef.current.boost = false;

      // AI randomly decides not to move (based on moveChance)
      if (Math.random() > settings.moveChance) {
        return; // Skip this update - AI does nothing
      }

      if (playerPosition) {
        const currentPos = currentPosRef.current;
        const targetPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
        
        // Calculate direction to player
        const direction = new THREE.Vector3().subVectors(targetPos, currentPos);
        const distance = direction.length();
        
        // Only chase player if close enough (reduced aggression)
        if (distance > 1.5 && distance < 8) {  // Added minimum distance
          direction.normalize();
          
          // Apply accuracy - AI makes mistakes
          const accuracy = settings.accuracy;
          
          // Convert world direction to movement keys with accuracy
          // Up/down (Z axis)
          if (Math.random() < accuracy && direction.z < -0.4) {  // Increased threshold
            aiKeysRef.current.up = true;
          } else if (Math.random() < accuracy && direction.z > 0.4) {
            aiKeysRef.current.down = true;
          }
          
          // Left/right (X axis)
          if (Math.random() < accuracy && direction.x < -0.4) {
            aiKeysRef.current.left = true;
          } else if (Math.random() < accuracy && direction.x > 0.4) {
            aiKeysRef.current.right = true;
          }
          
          // Rarely use boost (only at medium/hard difficulty)
          if (distance < 3 && Math.random() < (settings.accuracy * 0.3)) {
            aiKeysRef.current.boost = true;
          }
        }
        
        // Check if too close to edge
        const distanceFromCenter = Math.sqrt(currentPos.x ** 2 + currentPos.z ** 2);
        if (distanceFromCenter > platformRadius * 0.7) {
          // Override movement to go back to center
          const toCenter = new THREE.Vector3(-currentPos.x, 0, -currentPos.z).normalize();
          
          aiKeysRef.current.up = false;
          aiKeysRef.current.down = false;
          aiKeysRef.current.left = false;
          aiKeysRef.current.right = false;
          
          if (toCenter.z < -0.3) aiKeysRef.current.up = true;
          else if (toCenter.z > 0.3) aiKeysRef.current.down = true;
          
          if (toCenter.x < -0.3) aiKeysRef.current.left = true;
          else if (toCenter.x > 0.3) aiKeysRef.current.right = true;
        }
      }
    }
  });

  // Handle position updates from physics
  const handlePositionUpdate = (position, velocity) => {
    currentPosRef.current.set(position.x, position.y, position.z);
    if (onPositionUpdate) {
      onPositionUpdate(position, velocity);
    }
  };

  // Use PhysicsPlayer with simulated input
  // NOTE: We use isLocal={true} so that PhysicsPlayer calls onPositionUpdate!
  return (
    <PhysicsPlayer
      id={id}
      name={name}
      colorIndex={colorIndex}
      initialPosition={initialPosition}
      isLocal={true}  // Changed to true so onPositionUpdate fires!
      keysRef={aiKeysRef}
      boostState={aiBoostState.current}
      onPositionUpdate={handlePositionUpdate}
      canMove={canMove}
      playerScale={playerScale}
    />
  );
}
