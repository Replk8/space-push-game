import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { PLAYER, PLAYER_COLORS } from '../utils/constants';

/**
 * Player component - Astronaut representation as glowing capsule/sphere
 *
 * @param {Object} props
 * @param {string} props.id - Unique player ID
 * @param {string} props.name - Player display name
 * @param {number} props.colorIndex - Index into PLAYER_COLORS array (or direct hex color)
 * @param {[number, number, number]} props.position - [x, y, z] position
 * @param {boolean} props.isLocal - Whether this is the local player
 * @param {boolean} props.isEliminated - Whether player has been eliminated
 */
export default function Player({
  id,
  name = 'Player',
  colorIndex = 0,
  position = [0, 1, 0],
  isLocal = false,
  isEliminated = false,
  playerScale = 1.0,
}) {
  const groupRef = useRef();
  const glowRef = useRef();
  const innerGlowRef = useRef();

  // Determine player color from index or direct color string
  const playerColor = useMemo(() => {
    if (typeof colorIndex === 'string' && colorIndex.startsWith('#')) {
      return colorIndex;
    }
    return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  }, [colorIndex]);

  const colorObject = useMemo(() => new THREE.Color(playerColor), [playerColor]);

  // Animate glow pulsing
  useFrame((state) => {
    if (glowRef.current && !isEliminated) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.2 + 0.8;
      glowRef.current.material.opacity = pulse * 0.4;
    }

    if (innerGlowRef.current && !isEliminated) {
      const pulse = Math.sin(state.clock.elapsedTime * 4 + 1) * 0.3 + 0.7;
      innerGlowRef.current.material.emissiveIntensity = pulse * PLAYER.GLOW_INTENSITY;
    }
  });

  if (isEliminated) {
    return null; // Don't render eliminated players
  }

  return (
    <group ref={groupRef} position={position} scale={playerScale}>
      {/* Simple glowing sphere */}
      <mesh ref={innerGlowRef} castShadow receiveShadow>
        <sphereGeometry args={[PLAYER.RADIUS * 1.2, 32, 32]} />
        <meshStandardMaterial
          color={playerColor}
          emissive={playerColor}
          emissiveIntensity={PLAYER.GLOW_INTENSITY * 2}
          metalness={0.3}
          roughness={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Outer glow sphere - larger transparent sphere for bloom effect */}
      <mesh ref={glowRef} scale={1.6}>
        <sphereGeometry args={[PLAYER.RADIUS, 16, 16]} />
        <meshBasicMaterial
          color={playerColor}
          transparent
          opacity={0.4}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Inner point light for additional glow */}
      <pointLight
        color={playerColor}
        intensity={5}
        distance={10}
        decay={2}
      />

      {/* Local player indicator ring */}
      {isLocal && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -PLAYER.RADIUS * 0.5, 0]}>
          <ringGeometry args={[PLAYER.RADIUS * 1.2, PLAYER.RADIUS * 1.5, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Floating name label */}
      <Html
        position={[0, PLAYER.RADIUS * 2, 0]}
        center
        distanceFactor={15}
        occlude={false}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
            whiteSpace: 'nowrap',
            textShadow: `0 0 10px ${playerColor}, 0 0 20px ${playerColor}`,
            border: `2px solid ${playerColor}`,
            boxShadow: `0 0 15px ${playerColor}40`,
          }}
        >
          {isLocal && '★ '}{name}
        </div>
      </Html>
    </group>
  );
}
