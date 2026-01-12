import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Confetti - 3D particle celebration effect for victory screen
 * Creates colorful confetti particles that fall with gravity and spin
 */
export default function Confetti({ active = true, particleCount = 150, spread = 20 }) {
  const particlesRef = useRef();
  const timeRef = useRef(0);

  // Generate random confetti colors (bright, celebratory colors)
  const confettiColors = useMemo(() => [
    '#ff4444', '#44ff44', '#4444ff', '#ffff44',
    '#ff44ff', '#44ffff', '#ff8844', '#88ff44',
    '#ffd700', '#ff69b4', '#00ff7f', '#ff6347',
  ], []);

  // Create particle data
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < particleCount; i++) {
      // Random starting position in a cylinder above the scene
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * spread;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 15 + Math.random() * 10; // Start high above

      temp.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2, // Horizontal drift
          -0.5 - Math.random() * 0.5,   // Falling speed
          (Math.random() - 0.5) * 0.2   // Horizontal drift
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        scale: 0.1 + Math.random() * 0.15,
        // For wobble effect
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 2 + Math.random() * 3,
        wobbleAmount: 0.02 + Math.random() * 0.03,
      });
    }
    return temp;
  }, [particleCount, spread, confettiColors]);

  // Create geometry for confetti pieces (thin rectangles)
  const confettiGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(1, 0.6);
  }, []);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      confettiGeometry.dispose();
    };
  }, [confettiGeometry]);

  // Animate particles
  useFrame((state, delta) => {
    if (!active || !particlesRef.current) return;

    const cappedDelta = Math.min(delta, 0.1);
    timeRef.current += cappedDelta;

    particlesRef.current.children.forEach((child, index) => {
      const particle = particles[index];
      if (!particle) return;

      // Update position with velocity
      particle.position.x += particle.velocity.x * cappedDelta * 60;
      particle.position.y += particle.velocity.y * cappedDelta * 60;
      particle.position.z += particle.velocity.z * cappedDelta * 60;

      // Add wobble effect (like paper falling)
      const wobble = Math.sin(timeRef.current * particle.wobbleSpeed + particle.wobblePhase) * particle.wobbleAmount;
      particle.velocity.x += wobble;

      // Update rotation
      particle.rotation.x += particle.rotationSpeed.x * cappedDelta;
      particle.rotation.y += particle.rotationSpeed.y * cappedDelta;
      particle.rotation.z += particle.rotationSpeed.z * cappedDelta;

      // Apply to mesh
      child.position.copy(particle.position);
      child.rotation.set(particle.rotation.x, particle.rotation.y, particle.rotation.z);

      // Reset particle if it falls too low
      if (particle.position.y < -10) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * spread;
        particle.position.x = Math.cos(angle) * radius;
        particle.position.y = 15 + Math.random() * 5;
        particle.position.z = Math.sin(angle) * radius;
        particle.velocity.x = (Math.random() - 0.5) * 0.2;
        particle.velocity.y = -0.5 - Math.random() * 0.5;
        particle.velocity.z = (Math.random() - 0.5) * 0.2;
      }
    });
  });

  if (!active) return null;

  return (
    <group ref={particlesRef}>
      {particles.map((particle, index) => (
        <mesh
          key={index}
          position={particle.position}
          rotation={particle.rotation}
          scale={particle.scale}
          geometry={confettiGeometry}
        >
          <meshBasicMaterial
            color={particle.color}
            side={THREE.DoubleSide}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}
