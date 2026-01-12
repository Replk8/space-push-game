import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * FlameTrail - Visual effect for boost/dash
 * Creates a burst of flame particles in the opposite direction of movement
 *
 * @param {Object} props
 * @param {boolean} props.isActive - Whether boost is currently active
 * @param {Object} props.direction - { x, z } normalized direction of movement
 * @param {string} props.color - Player color for flame tinting
 */
export default function FlameTrail({ isActive, direction, color = '#ff4444' }) {
  const groupRef = useRef();
  const particlesRef = useRef([]);
  const burstTriggeredRef = useRef(false);
  const timeRef = useRef(0);
  // Store direction at time of boost trigger to avoid stale ref issues
  const capturedDirectionRef = useRef({ x: 0, z: -1 });

  // Create particle geometry once
  const particleGeometry = useMemo(() => new THREE.SphereGeometry(0.1, 8, 8), []);

  // Track previous materials for cleanup when color changes
  const prevMaterialsRef = useRef([]);

  // Create materials for particles (gradient from white to player color to orange)
  const materials = useMemo(() => {
    // Dispose of previous materials before creating new ones
    prevMaterialsRef.current.forEach((mat) => mat.dispose());

    const newMaterials = [
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1 }),
      new THREE.MeshBasicMaterial({ color: '#ffff88', transparent: true, opacity: 0.9 }),
      new THREE.MeshBasicMaterial({ color: '#ffaa44', transparent: true, opacity: 0.8 }),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.7 }),
      new THREE.MeshBasicMaterial({ color: '#ff4400', transparent: true, opacity: 0.5 }),
    ];

    prevMaterialsRef.current = newMaterials;
    return newMaterials;
  }, [color]);

  // Cleanup geometry and materials on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      particleGeometry.dispose();
      prevMaterialsRef.current.forEach((mat) => mat.dispose());
    };
  }, [particleGeometry]);

  // Particle count
  const PARTICLE_COUNT = 12;

  // Initialize particles
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      scale: 1,
      life: 0,
      maxLife: 0.3 + Math.random() * 0.2,
      materialIndex: Math.floor(Math.random() * 5),
    }));
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    timeRef.current += delta;

    // Trigger new burst when boost activates
    if (isActive && !burstTriggeredRef.current) {
      burstTriggeredRef.current = true;

      // Capture direction at moment of boost (copy values to avoid stale ref)
      capturedDirectionRef.current = { x: direction.x, z: direction.z };

      // Emit particles in opposite direction of movement
      const oppositeX = -capturedDirectionRef.current.x;
      const oppositeZ = -capturedDirectionRef.current.z;

      particles.forEach((particle, i) => {
        // Start particles at player center (slightly below for jetpack effect)
        particle.position.set(0, -0.3, 0);

        // Spread particles in a cone opposite to movement direction
        const spreadAngle = (Math.random() - 0.5) * 1.2; // Spread cone
        const speed = 2 + Math.random() * 2;

        // Calculate spread direction
        const cos = Math.cos(spreadAngle);
        const sin = Math.sin(spreadAngle);
        const spreadX = oppositeX * cos - oppositeZ * sin;
        const spreadZ = oppositeX * sin + oppositeZ * cos;

        particle.velocity.set(
          spreadX * speed,
          -0.5 + Math.random() * 0.3, // Slight downward arc
          spreadZ * speed
        );

        particle.scale = 0.8 + Math.random() * 0.4;
        particle.life = 0;
        particle.maxLife = 0.2 + Math.random() * 0.15;
        particle.materialIndex = Math.floor(Math.random() * materials.length);
      });
    } else if (!isActive) {
      burstTriggeredRef.current = false;
    }

    // Update particle positions
    particles.forEach((particle, i) => {
      if (particle.life < particle.maxLife) {
        particle.life += delta;

        // Apply velocity with gravity
        particle.position.add(particle.velocity.clone().multiplyScalar(delta));
        particle.velocity.y -= delta * 2; // Light gravity pull

        // Update mesh if it exists
        const mesh = particlesRef.current[i];
        if (mesh) {
          mesh.position.copy(particle.position);

          // Fade out and shrink
          const lifeRatio = particle.life / particle.maxLife;
          const fadeOut = 1 - Math.pow(lifeRatio, 0.5);
          mesh.scale.setScalar(particle.scale * fadeOut);
          mesh.material.opacity = fadeOut * 0.8;
          mesh.visible = fadeOut > 0.01;
        }
      } else {
        // Hide dead particles
        const mesh = particlesRef.current[i];
        if (mesh) {
          mesh.visible = false;
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle, i) => (
        <mesh
          key={i}
          ref={(el) => (particlesRef.current[i] = el)}
          geometry={particleGeometry}
          material={materials[particle.materialIndex]}
          visible={false}
        />
      ))}

      {/* Core flame burst glow when active */}
      {isActive && (
        <>
          {/* Central burst sphere */}
          <mesh position={[0, -0.2, 0]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial
              color="#ffff88"
              transparent
              opacity={0.6}
            />
          </mesh>

          {/* Outer glow */}
          <mesh position={[0, -0.2, 0]}>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.3}
              side={THREE.BackSide}
            />
          </mesh>

          {/* Point light for illumination */}
          <pointLight
            position={[0, -0.3, 0]}
            color="#ffaa44"
            intensity={5}
            distance={4}
            decay={2}
          />
        </>
      )}
    </group>
  );
}
