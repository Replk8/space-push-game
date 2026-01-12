import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * PlayerTrail - Particle trail effect that follows player movement
 * Creates a glowing trail of particles behind the player as they move
 *
 * @param {Object} props
 * @param {string} props.color - Player color for trail tinting
 * @param {Object} props.velocityRef - Ref to player velocity { x, y, z }
 * @param {boolean} props.isMoving - Whether player is actively moving
 */
export default function PlayerTrail({ color = '#00ffff', velocityRef, isMoving = false }) {
  const groupRef = useRef();
  const particlesRef = useRef([]);
  const lastEmitTimeRef = useRef(0);
  const EMIT_INTERVAL = 0.05; // Emit particle every 50ms when moving
  const MAX_PARTICLES = 30;
  const PARTICLE_LIFETIME = 0.6; // seconds

  // Create geometry once
  const geometry = useMemo(() => new THREE.SphereGeometry(0.08, 6, 6), []);

  // Create materials with color gradient from white to player color
  const prevMaterialsRef = useRef([]);
  const materials = useMemo(() => {
    prevMaterialsRef.current.forEach((mat) => mat.dispose());

    const colorObj = new THREE.Color(color);
    const white = new THREE.Color('#ffffff');

    const newMaterials = Array.from({ length: 5 }, (_, i) => {
      const t = i / 4;
      const gradientColor = white.clone().lerp(colorObj, t);
      return new THREE.MeshBasicMaterial({
        color: gradientColor,
        transparent: true,
        opacity: 0,
      });
    });

    prevMaterialsRef.current = newMaterials;
    return newMaterials;
  }, [color]);

  // Particle pool
  const particlePool = useMemo(() => {
    return Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: PARTICLE_LIFETIME,
      materialIndex: 0,
      size: 1,
    }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      prevMaterialsRef.current.forEach((mat) => mat.dispose());
    };
  }, [geometry]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const cappedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Check if we should emit a new particle
    const velocity = velocityRef?.current || { x: 0, y: 0, z: 0 };
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    const shouldEmit = speed > 0.3 && time - lastEmitTimeRef.current >= EMIT_INTERVAL;

    if (shouldEmit) {
      lastEmitTimeRef.current = time;

      // Find inactive particle
      const particle = particlePool.find((p) => !p.active);
      if (particle) {
        particle.active = true;
        particle.position.set(
          (Math.random() - 0.5) * 0.2,
          -0.3 + (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.2
        );

        // Particles move opposite to player velocity with some randomness
        const randomSpread = 0.3;
        particle.velocity.set(
          -velocity.x * 0.3 + (Math.random() - 0.5) * randomSpread,
          0.2 + Math.random() * 0.3,
          -velocity.z * 0.3 + (Math.random() - 0.5) * randomSpread
        );

        particle.life = 0;
        particle.maxLife = PARTICLE_LIFETIME * (0.8 + Math.random() * 0.4);
        particle.materialIndex = Math.floor(Math.random() * materials.length);
        particle.size = 0.8 + Math.random() * 0.4;
      }
    }

    // Update all particles
    particlePool.forEach((particle, i) => {
      const mesh = particlesRef.current[i];
      if (!mesh) return;

      if (particle.active) {
        particle.life += cappedDelta;

        if (particle.life >= particle.maxLife) {
          particle.active = false;
          mesh.visible = false;
          return;
        }

        // Update position
        particle.position.add(
          particle.velocity.clone().multiplyScalar(cappedDelta)
        );

        // Add slight upward drift
        particle.velocity.y += cappedDelta * 0.5;

        // Calculate fade
        const lifeRatio = particle.life / particle.maxLife;
        const fadeOut = 1 - Math.pow(lifeRatio, 0.5);

        // Update mesh
        mesh.position.copy(particle.position);
        mesh.scale.setScalar(particle.size * fadeOut * 0.15);
        mesh.material.opacity = fadeOut * 0.7;
        mesh.visible = fadeOut > 0.01;
      } else {
        mesh.visible = false;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {particlePool.map((particle, i) => (
        <mesh
          key={i}
          ref={(el) => (particlesRef.current[i] = el)}
          geometry={geometry}
          material={materials[particle.materialIndex % materials.length]}
          visible={false}
        />
      ))}
    </group>
  );
}
