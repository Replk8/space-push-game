import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Shockwave - 3D expanding shockwave effect for Konami code activation
 *
 * Creates a dramatic expanding ring effect that pushes outward from a point,
 * with particle debris and glowing energy waves.
 *
 * @param {Array} position - [x, y, z] center position of the shockwave
 * @param {string} color - Color of the shockwave (hex string)
 * @param {Function} onComplete - Callback when animation finishes
 */
export default function Shockwave({ position = [0, 1, 0], color = '#ffd700', onComplete }) {
  const groupRef = useRef();
  const ringRef = useRef();
  const innerRingRef = useRef();
  const particlesRef = useRef();
  const progressRef = useRef(0);
  const startTimeRef = useRef(null);

  // Animation duration in seconds
  const DURATION = 2.5;
  const MAX_RADIUS = 50;
  const PARTICLE_COUNT = 100;

  // Create particle positions and velocities
  const particles = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = [];
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const baseColor = new THREE.Color(color);
    const accentColor = new THREE.Color('#ffffff');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Start at center
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Random outward velocity in a sphere pattern
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI - Math.PI / 2;
      const speed = 20 + Math.random() * 30;

      velocities.push({
        x: Math.cos(theta) * Math.cos(phi) * speed,
        y: Math.sin(phi) * speed * 0.3, // Less vertical movement
        z: Math.sin(theta) * Math.cos(phi) * speed,
      });

      sizes[i] = 0.3 + Math.random() * 0.5;

      // Mix between base color and white for variety
      const mix = Math.random() * 0.5;
      const particleColor = baseColor.clone().lerp(accentColor, mix);
      colors[i * 3] = particleColor.r;
      colors[i * 3 + 1] = particleColor.g;
      colors[i * 3 + 2] = particleColor.b;
    }

    return { positions, velocities, sizes, colors };
  }, [color]);

  // Ring geometry
  const ringGeometry = useMemo(() => {
    return new THREE.RingGeometry(0.1, 0.5, 64);
  }, []);

  // Inner ring geometry (thinner, faster)
  const innerRingGeometry = useMemo(() => {
    return new THREE.RingGeometry(0.1, 0.3, 64);
  }, []);

  // Cleanup geometries
  useEffect(() => {
    return () => {
      ringGeometry.dispose();
      innerRingGeometry.dispose();
    };
  }, [ringGeometry, innerRingGeometry]);

  // Animation loop
  useFrame((state, delta) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const progress = Math.min(elapsed / DURATION, 1);
    progressRef.current = progress;

    // Ease out function for smooth deceleration
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const easeOutQuint = 1 - Math.pow(1 - progress, 5);

    // Animate main ring
    if (ringRef.current) {
      const ringRadius = easeOut * MAX_RADIUS;
      const ringThickness = Math.max(0.5, 3 * (1 - progress));
      ringRef.current.scale.set(ringRadius, ringRadius, 1);
      ringRef.current.material.opacity = Math.max(0, 1 - progress * 1.5);

      // Update ring geometry thickness via scale
      ringRef.current.material.emissiveIntensity = 2 * (1 - progress);
    }

    // Animate inner ring (faster)
    if (innerRingRef.current) {
      const innerRadius = easeOutQuint * MAX_RADIUS * 1.2;
      innerRingRef.current.scale.set(innerRadius, innerRadius, 1);
      innerRingRef.current.material.opacity = Math.max(0, 0.8 - progress * 1.2);
    }

    // Animate particles
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const vel = particles.velocities[i];
        positions[i * 3] += vel.x * delta;
        positions[i * 3 + 1] += vel.y * delta;
        positions[i * 3 + 2] += vel.z * delta;

        // Slow down over time
        particles.velocities[i].x *= 0.98;
        particles.velocities[i].y *= 0.98;
        particles.velocities[i].z *= 0.98;
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      particlesRef.current.material.opacity = Math.max(0, 1 - progress * 1.2);
    }

    // Animation complete
    if (progress >= 1 && onComplete) {
      onComplete();
    }
  });

  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  return (
    <group ref={groupRef} position={position}>
      {/* Main expanding ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Inner ring (faster, thinner) */}
      <mesh ref={innerRingRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={3}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Particle burst */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={particles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={PARTICLE_COUNT}
            array={particles.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.5}
          vertexColors
          transparent
          opacity={1}
          sizeAttenuation
          toneMapped={false}
        />
      </points>

      {/* Central flash light */}
      <pointLight
        color={color}
        intensity={100 * (1 - progressRef.current)}
        distance={30}
        decay={2}
      />

      {/* Secondary flash (white) */}
      <pointLight
        color="#ffffff"
        intensity={50 * (1 - progressRef.current)}
        distance={20}
        decay={2}
      />
    </group>
  );
}
