import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CollisionSparks - Visual effect for player-player collisions
 * Creates a dramatic burst of sparks with multiple layers:
 * - Core flash burst
 * - Primary sparks (bright, fast)
 * - Secondary sparks (dimmer, slower)
 * - Smoke/dust particles
 * - Ring shockwave
 *
 * @param {Object} props
 * @param {[number, number, number]} props.position - Collision point
 * @param {number} props.intensity - Impact speed affects spark count and size
 * @param {Function} props.onBigImpact - Callback for triggering screen shake
 */
export default function CollisionSparks({ position = [0, 1, 0], intensity = 1, onBigImpact }) {
  const groupRef = useRef();
  const particlesRef = useRef([]);
  const ringRef = useRef();
  const flashRef = useRef();
  const startTimeRef = useRef(null);
  const duration = 0.7; // Spark lifetime in seconds
  const [hasTriggeredShake, setHasTriggeredShake] = useState(false);

  // Determine if this is a big impact (triggers screen shake)
  const isBigImpact = intensity > 1.5;

  // Trigger screen shake on big impacts
  useEffect(() => {
    if (isBigImpact && onBigImpact && !hasTriggeredShake) {
      onBigImpact(intensity);
      setHasTriggeredShake(true);
    }
  }, [isBigImpact, onBigImpact, intensity, hasTriggeredShake]);

  // Create spark particles - more for bigger impacts
  const sparkCount = Math.min(Math.floor(15 + intensity * 8), 40);

  // Spark colors - electric/neon palette
  const sparkColors = ['#ffffff', '#ffff00', '#ff8800', '#00ffff', '#ff00ff'];

  const particles = useMemo(() => {
    return Array.from({ length: sparkCount }, (_, i) => {
      // Random direction for each spark - spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.8; // Bias upward
      const speed = 3 + Math.random() * 5 * Math.min(intensity, 4);

      // Primary sparks are faster and brighter
      const isPrimary = i < sparkCount * 0.4;
      const isSecondary = i >= sparkCount * 0.4 && i < sparkCount * 0.7;

      return {
        velocity: {
          x: Math.sin(phi) * Math.cos(theta) * speed * (isPrimary ? 1.5 : 0.8),
          y: Math.abs(Math.cos(phi)) * speed * 0.8 + (isPrimary ? 2 : 1),
          z: Math.sin(phi) * Math.sin(theta) * speed * (isPrimary ? 1.5 : 0.8),
        },
        position: { x: 0, y: 0, z: 0 },
        size: isPrimary
          ? 0.1 + Math.random() * 0.1 * Math.min(intensity, 3)
          : isSecondary
            ? 0.06 + Math.random() * 0.06
            : 0.15 + Math.random() * 0.1, // Smoke particles are larger
        color: isPrimary
          ? sparkColors[Math.floor(Math.random() * 3)] // White/Yellow/Orange
          : isSecondary
            ? sparkColors[Math.floor(Math.random() * sparkColors.length)]
            : '#666666', // Smoke is gray
        type: isPrimary ? 'primary' : isSecondary ? 'secondary' : 'smoke',
        rotationSpeed: (Math.random() - 0.5) * 10,
        delay: isPrimary ? 0 : isSecondary ? Math.random() * 0.05 : Math.random() * 0.1,
      };
    });
  }, [sparkCount, intensity]);

  // Create geometries
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const ringGeometry = useMemo(() => new THREE.RingGeometry(0.5, 1, 32), []);

  // Track materials for cleanup
  const prevMaterialsRef = useRef([]);
  const materials = useMemo(() => {
    prevMaterialsRef.current.forEach((mat) => mat.dispose());

    const newMaterials = particles.map((p) =>
      new THREE.MeshBasicMaterial({
        color: p.color,
        transparent: true,
        opacity: p.type === 'smoke' ? 0.4 : 1,
        side: p.type === 'smoke' ? THREE.DoubleSide : THREE.FrontSide,
      })
    );
    prevMaterialsRef.current = newMaterials;
    return newMaterials;
  }, [particles]);

  // Ring material
  const ringMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#00ffff',
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sphereGeometry.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      prevMaterialsRef.current.forEach((mat) => mat.dispose());
    };
  }, [sphereGeometry, ringGeometry, ringMaterial]);

  // Animate particles
  useFrame((state) => {
    if (!groupRef.current) return;

    // Initialize start time
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const progress = elapsed / duration;

    if (progress >= 1) {
      // Animation complete - hide everything
      particlesRef.current.forEach((mesh) => {
        if (mesh) mesh.visible = false;
      });
      if (ringRef.current) ringRef.current.visible = false;
      if (flashRef.current) flashRef.current.visible = false;
      return;
    }

    // Animate shockwave ring
    if (ringRef.current) {
      const ringProgress = Math.min(elapsed / 0.3, 1);
      const ringScale = 1 + ringProgress * 4 * intensity;
      ringRef.current.scale.set(ringScale, ringScale, 1);
      ringRef.current.material.opacity = 0.8 * (1 - ringProgress);
      ringRef.current.visible = ringProgress < 1;
    }

    // Animate central flash
    if (flashRef.current) {
      const flashProgress = Math.min(elapsed / 0.15, 1);
      const flashScale = (1 + flashProgress * 2) * intensity * 0.5;
      flashRef.current.scale.setScalar(flashScale);
      flashRef.current.material.opacity = 1 - flashProgress;
      flashRef.current.visible = flashProgress < 1;
    }

    // Update each particle
    particles.forEach((particle, i) => {
      const mesh = particlesRef.current[i];
      if (!mesh) return;

      // Apply delay
      const particleElapsed = Math.max(0, elapsed - particle.delay);
      if (particleElapsed <= 0) {
        mesh.visible = false;
        return;
      }

      // Different physics for different particle types
      const gravity = particle.type === 'smoke' ? -1 : -8;
      const drag = particle.type === 'smoke' ? 0.95 : 0.98;

      const t = particleElapsed;
      const dragFactor = Math.pow(drag, t * 60);

      mesh.position.x = particle.velocity.x * t * dragFactor;
      mesh.position.y = particle.velocity.y * t * dragFactor + 0.5 * gravity * t * t;
      mesh.position.z = particle.velocity.z * t * dragFactor;

      // Add rotation for smoke
      if (particle.type === 'smoke') {
        mesh.rotation.z += particle.rotationSpeed * 0.016;
      }

      // Calculate fade based on particle type
      const particleProgress = particleElapsed / (duration - particle.delay);
      let fadeOut;
      if (particle.type === 'primary') {
        fadeOut = 1 - Math.pow(particleProgress, 0.3);
      } else if (particle.type === 'secondary') {
        fadeOut = 1 - Math.pow(particleProgress, 0.5);
      } else {
        fadeOut = Math.max(0, 1 - particleProgress);
      }

      mesh.material.opacity = fadeOut * (particle.type === 'smoke' ? 0.4 : 1);
      mesh.scale.setScalar(particle.size * (particle.type === 'smoke' ? 1 + particleProgress * 2 : fadeOut));
      mesh.visible = fadeOut > 0.01;
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Shockwave ring */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.3, 0.5, 32]} />
        <primitive object={ringMaterial} attach="material" />
      </mesh>

      {/* Central flash sphere */}
      <mesh ref={flashRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} />
      </mesh>

      {/* Spark particles */}
      {particles.map((particle, i) => (
        <mesh
          key={i}
          ref={(el) => (particlesRef.current[i] = el)}
          geometry={sphereGeometry}
          material={materials[i]}
          scale={particle.size}
        />
      ))}

      {/* Central flash light */}
      <pointLight
        color="#ffaa00"
        intensity={Math.min(intensity * 4, 10)}
        distance={5}
        decay={2}
      />

      {/* Secondary rim light for big impacts */}
      {isBigImpact && (
        <pointLight
          color="#00ffff"
          intensity={Math.min(intensity * 2, 5)}
          distance={8}
          decay={2}
        />
      )}
    </group>
  );
}
