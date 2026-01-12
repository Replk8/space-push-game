import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAYER, PLAYER_COLORS, ELIMINATION } from '../utils/constants';

/**
 * EliminationAnimation - Dramatic death animation when player falls off platform
 * Shows spinning, shrinking player tumbling into the void with:
 * - Multi-layer explosion particles
 * - Energy ring expansion
 * - Debris chunks
 * - Smoke trail
 * - Light flash
 *
 * @param {Object} props
 * @param {string} props.id - Player ID
 * @param {string} props.name - Player name
 * @param {number|string} props.colorIndex - Color index or hex string
 * @param {Object} props.position - Starting position { x, y, z }
 * @param {Object} props.velocity - Velocity at elimination { x, y, z }
 * @param {Function} props.onComplete - Callback when animation finishes
 */
export default function EliminationAnimation({
  id,
  name = 'Player',
  colorIndex = 0,
  position = { x: 0, y: 0, z: 0 },
  velocity = { x: 0, y: 0, z: 0 },
  onComplete,
}) {
  const groupRef = useRef();
  const explosionGroupRef = useRef();
  const ringRef = useRef();
  const flashRef = useRef();
  const startTimeRef = useRef(null);
  const positionRef = useRef({ ...position });
  const velocityRef = useRef({ ...velocity });
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [explosionTriggered, setExplosionTriggered] = useState(false);
  const explosionTimeRef = useRef(null);

  // Determine player color
  const playerColor = useMemo(() => {
    if (typeof colorIndex === 'string' && colorIndex.startsWith('#')) {
      return colorIndex;
    }
    return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  }, [colorIndex]);

  const colorObject = useMemo(() => new THREE.Color(playerColor), [playerColor]);

  // Generate explosion particles - multi-layered system
  const explosionParticles = useMemo(() => {
    const particleData = [];

    // Primary energy burst (fast, bright, player color)
    for (let i = 0; i < 30; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 5 + Math.random() * 8;
      particleData.push({
        id: `energy-${i}`,
        type: 'energy',
        velocity: {
          x: Math.sin(phi) * Math.cos(theta) * speed,
          y: Math.sin(phi) * Math.sin(theta) * speed,
          z: Math.cos(phi) * speed,
        },
        size: 0.12 + Math.random() * 0.1,
        color: i < 10 ? '#ffffff' : playerColor,
        delay: 0,
        lifetime: 0.5 + Math.random() * 0.3,
      });
    }

    // Debris chunks (slower, tumbling)
    for (let i = 0; i < 15; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 4;
      particleData.push({
        id: `debris-${i}`,
        type: 'debris',
        velocity: {
          x: Math.sin(phi) * Math.cos(theta) * speed,
          y: Math.abs(Math.sin(phi) * Math.sin(theta)) * speed + 2,
          z: Math.cos(phi) * speed,
        },
        size: 0.15 + Math.random() * 0.15,
        color: playerColor,
        delay: Math.random() * 0.1,
        lifetime: 0.8 + Math.random() * 0.4,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 15,
          y: (Math.random() - 0.5) * 15,
          z: (Math.random() - 0.5) * 15,
        },
      });
    }

    // Smoke/dust particles (slow, expanding)
    for (let i = 0; i < 12; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6;
      const speed = 1 + Math.random() * 2;
      particleData.push({
        id: `smoke-${i}`,
        type: 'smoke',
        velocity: {
          x: Math.sin(phi) * Math.cos(theta) * speed,
          y: Math.abs(Math.cos(phi)) * speed + 1,
          z: Math.sin(phi) * Math.sin(theta) * speed,
        },
        size: 0.2 + Math.random() * 0.2,
        color: '#666666',
        delay: 0.1 + Math.random() * 0.1,
        lifetime: 1.2 + Math.random() * 0.5,
      });
    }

    // Sparks (tiny, fast, many)
    for (let i = 0; i < 25; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 8 + Math.random() * 10;
      particleData.push({
        id: `spark-${i}`,
        type: 'spark',
        velocity: {
          x: Math.sin(phi) * Math.cos(theta) * speed,
          y: Math.sin(phi) * Math.sin(theta) * speed,
          z: Math.cos(phi) * speed,
        },
        size: 0.04 + Math.random() * 0.04,
        color: i % 2 === 0 ? '#ffff00' : '#ffffff',
        delay: 0,
        lifetime: 0.3 + Math.random() * 0.2,
      });
    }

    return particleData;
  }, [playerColor]);

  // Random rotation axis for spin effect
  const rotationSpeed = useMemo(() => ({
    x: (Math.random() - 0.5) * ELIMINATION.SPIN_SPEED,
    y: (Math.random() - 0.5) * ELIMINATION.SPIN_SPEED,
    z: (Math.random() - 0.5) * ELIMINATION.SPIN_SPEED,
  }), []);

  // Call onComplete when animation finishes
  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  // Trigger explosion after player falls a bit
  const EXPLOSION_TRIGGER_DISTANCE = 3; // Fall distance before explosion

  useFrame((state, delta) => {
    if (!groupRef.current || isComplete) return;

    // Initialize start time
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = (state.clock.elapsedTime - startTimeRef.current) * 1000;
    const progress = Math.min(elapsed / ELIMINATION.ANIMATION_DURATION, 1);
    const cappedDelta = Math.min(delta, 0.1);

    // Check if animation is complete
    if (progress >= 1) {
      setIsComplete(true);
      return;
    }

    // Update position with velocity and extra fall acceleration
    velocityRef.current.y -= ELIMINATION.FALL_ACCELERATION * 60 * cappedDelta;
    positionRef.current.x += velocityRef.current.x * cappedDelta;
    positionRef.current.y += velocityRef.current.y * cappedDelta;
    positionRef.current.z += velocityRef.current.z * cappedDelta;

    // Trigger explosion when fallen enough
    const fallDistance = position.y - positionRef.current.y;
    if (!explosionTriggered && fallDistance > EXPLOSION_TRIGGER_DISTANCE) {
      setExplosionTriggered(true);
      explosionTimeRef.current = state.clock.elapsedTime;
    }

    // Update rotation (tumbling effect)
    rotationRef.current.x += rotationSpeed.x * cappedDelta;
    rotationRef.current.y += rotationSpeed.y * cappedDelta;
    rotationRef.current.z += rotationSpeed.z * cappedDelta;

    // Calculate scale (shrinking as it falls, faster after explosion)
    const shrinkMultiplier = explosionTriggered ? 1.5 : 1;
    const scale = Math.max(1 - progress * ELIMINATION.SHRINK_SPEED * shrinkMultiplier, 0.05);

    // Calculate opacity (fading out faster after explosion)
    const opacityMultiplier = explosionTriggered ? 2 : 1;
    const opacity = Math.max(1 - progress * opacityMultiplier, 0);

    // Apply transformations
    groupRef.current.position.set(
      positionRef.current.x,
      positionRef.current.y,
      positionRef.current.z
    );
    groupRef.current.rotation.set(
      rotationRef.current.x,
      rotationRef.current.y,
      rotationRef.current.z
    );
    groupRef.current.scale.setScalar(scale);

    // Update material opacity for player mesh children only
    groupRef.current.traverse((child) => {
      if (child.material && child.userData.isPlayerMesh) {
        if (!child.material.transparent) {
          child.material.transparent = true;
        }
        child.material.opacity = opacity;
      }
    });

    // Animate explosion ring
    if (ringRef.current && explosionTriggered && explosionTimeRef.current) {
      const explosionElapsed = state.clock.elapsedTime - explosionTimeRef.current;
      const ringProgress = Math.min(explosionElapsed / 0.5, 1);
      const ringScale = 1 + ringProgress * 8;
      ringRef.current.scale.set(ringScale, ringScale, 1);
      ringRef.current.material.opacity = 0.9 * (1 - ringProgress);
      ringRef.current.visible = ringProgress < 1;
    }

    // Animate flash
    if (flashRef.current && explosionTriggered && explosionTimeRef.current) {
      const explosionElapsed = state.clock.elapsedTime - explosionTimeRef.current;
      const flashProgress = Math.min(explosionElapsed / 0.2, 1);
      const flashScale = 1 + flashProgress * 3;
      flashRef.current.scale.setScalar(flashScale);
      flashRef.current.material.opacity = 1 - flashProgress;
      flashRef.current.visible = flashProgress < 1;
    }
  });

  if (isComplete) {
    return null;
  }

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* Main body - capsule */}
      <mesh castShadow userData={{ isPlayerMesh: true }}>
        <capsuleGeometry args={[PLAYER.RADIUS * 0.8, PLAYER.HEIGHT * 0.3, 16, 32]} />
        <meshStandardMaterial
          color={playerColor}
          emissive={playerColor}
          emissiveIntensity={1.5}
          metalness={0.2}
          roughness={0.3}
          toneMapped={false}
          transparent
        />
      </mesh>

      {/* Helmet */}
      <mesh position={[0, PLAYER.HEIGHT * 0.3, 0]} castShadow userData={{ isPlayerMesh: true }}>
        <sphereGeometry args={[PLAYER.RADIUS * 0.5, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={playerColor}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.1}
          transparent
        />
      </mesh>

      {/* Outer glow - pulsing red/orange for danger */}
      <mesh scale={2} userData={{ isPlayerMesh: true }}>
        <sphereGeometry args={[PLAYER.RADIUS, 16, 16]} />
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={0.5}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Explosion ring - appears when explosion triggers */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.5, 0.8, 32]} />
        <meshBasicMaterial
          color={playerColor}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Central flash - appears when explosion triggers */}
      <mesh ref={flashRef} visible={false}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} />
      </mesh>

      {/* Explosion particles - only show after explosion triggers */}
      {explosionTriggered && explosionParticles.map((particle) => (
        <ExplosionParticle
          key={particle.id}
          type={particle.type}
          velocity={particle.velocity}
          size={particle.size}
          delay={particle.delay}
          lifetime={particle.lifetime}
          color={particle.color}
          rotationSpeed={particle.rotationSpeed}
          explosionTime={explosionTimeRef.current}
        />
      ))}

      {/* Point light for glow effect */}
      <pointLight
        color="#ff4400"
        intensity={explosionTriggered ? 15 : 5}
        distance={explosionTriggered ? 15 : 8}
        decay={2}
      />

      {/* Secondary explosion light */}
      {explosionTriggered && (
        <pointLight
          color={playerColor}
          intensity={10}
          distance={12}
          decay={2}
        />
      )}
    </group>
  );
}

/**
 * Individual particle for explosion effect
 * Different behavior based on particle type
 */
function ExplosionParticle({
  type,
  velocity,
  size,
  delay,
  lifetime,
  color,
  rotationSpeed,
  explosionTime,
}) {
  const meshRef = useRef();
  const positionRef = useRef({ x: 0, y: 0, z: 0 });
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  const [visible, setVisible] = useState(false);

  useFrame((state, delta) => {
    if (!meshRef.current || !explosionTime) return;

    const elapsed = state.clock.elapsedTime - explosionTime;

    // Delay before showing
    if (elapsed < delay) {
      meshRef.current.visible = false;
      return;
    }

    if (!visible) setVisible(true);

    const particleElapsed = elapsed - delay;
    const cappedDelta = Math.min(delta, 0.1);

    // Physics based on type
    let gravity = -8;
    let drag = 0.98;

    if (type === 'smoke') {
      gravity = -0.5;
      drag = 0.92;
    } else if (type === 'debris') {
      gravity = -12;
      drag = 0.96;
    } else if (type === 'spark') {
      gravity = -2;
      drag = 0.99;
    }

    // Update position with velocity, gravity, and drag
    const dragFactor = Math.pow(drag, particleElapsed * 60);
    positionRef.current.x = velocity.x * particleElapsed * dragFactor;
    positionRef.current.y = velocity.y * particleElapsed * dragFactor + 0.5 * gravity * particleElapsed * particleElapsed;
    positionRef.current.z = velocity.z * particleElapsed * dragFactor;

    meshRef.current.position.set(
      positionRef.current.x,
      positionRef.current.y,
      positionRef.current.z
    );

    // Rotation for debris
    if (type === 'debris' && rotationSpeed) {
      rotationRef.current.x += rotationSpeed.x * cappedDelta;
      rotationRef.current.y += rotationSpeed.y * cappedDelta;
      rotationRef.current.z += rotationSpeed.z * cappedDelta;
      meshRef.current.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);
    }

    // Calculate fade based on type and lifetime
    const lifeProgress = particleElapsed / lifetime;

    let opacity, scale;
    if (type === 'energy') {
      opacity = Math.max(1 - Math.pow(lifeProgress, 0.3), 0);
      scale = size * (1 - lifeProgress * 0.5);
    } else if (type === 'spark') {
      opacity = Math.max(1 - lifeProgress, 0);
      scale = size * (1 - lifeProgress);
    } else if (type === 'smoke') {
      opacity = Math.max(0.4 * (1 - lifeProgress), 0);
      scale = size * (1 + lifeProgress * 2); // Smoke expands
    } else if (type === 'debris') {
      opacity = Math.max(1 - Math.pow(lifeProgress, 0.5), 0);
      scale = size * Math.max(1 - lifeProgress * 0.3, 0.3);
    } else {
      opacity = Math.max(1 - lifeProgress, 0);
      scale = size;
    }

    meshRef.current.material.opacity = opacity;
    meshRef.current.scale.setScalar(Math.max(scale, 0.01));
    meshRef.current.visible = lifeProgress < 1 && opacity > 0.01;
  });

  // Choose geometry based on type
  const GeometryComponent = type === 'debris' ? 'boxGeometry' : 'sphereGeometry';
  const geometryArgs = type === 'debris' ? [size, size, size] : [size, 8, 8];

  return (
    <mesh ref={meshRef} visible={false}>
      {type === 'debris' ? (
        <boxGeometry args={[size, size, size]} />
      ) : (
        <sphereGeometry args={[size, 8, 8]} />
      )}
      <meshBasicMaterial
        color={color}
        transparent
        opacity={1}
        side={type === 'smoke' ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}
