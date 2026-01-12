import { createContext, useContext, useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as CANNON from 'cannon-es';
import { PHYSICS, PLATFORM } from '../utils/constants';

// Context for physics world access
const PhysicsContext = createContext(null);

// Store material instances at module level for reuse
let playerMaterial = null;
let platformMaterial = null;

/**
 * Hook to access the physics world and utilities
 * @returns {{ world: CANNON.World, addBody: Function, removeBody: Function, bodies: Map }}
 */
export function usePhysics() {
  const context = useContext(PhysicsContext);
  if (!context) {
    throw new Error('usePhysics must be used within a PhysicsProvider');
  }
  return context;
}

/**
 * Get the player material instance for creating player bodies
 * This ensures all player bodies use the same material for proper ContactMaterial matching
 * @returns {CANNON.Material|null} The player material instance
 */
export function getPlayerMaterial() {
  return playerMaterial;
}

/**
 * PhysicsProvider - Initializes and manages the Cannon-es physics world
 * Provides world access to child components via context
 */
export default function PhysicsProvider({ children, onCollision, platformRadius = PLATFORM.INITIAL_RADIUS }) {
  const worldRef = useRef(null);
  const bodiesRef = useRef(new Map()); // Map of id -> { body, type }
  const platformBodyRef = useRef(null);
  const currentPlatformRadiusRef = useRef(PLATFORM.INITIAL_RADIUS);
  const [worldReady, setWorldReady] = useState(false);
  
  // Store onCollision in a ref so the world setup effect doesn't re-run when it changes
  const onCollisionRef = useRef(onCollision);
  useEffect(() => {
    onCollisionRef.current = onCollision;
  }, [onCollision]);

  // Initialize physics world once
  useEffect(() => {
    // Create physics world
    const world = new CANNON.World();
    world.gravity.set(0, PHYSICS.GRAVITY, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    // Enable sleeping for performance
    world.allowSleep = true;

    worldRef.current = world;
    setWorldReady(true);

    // Define physics materials (reusable instances)
    playerMaterial = new CANNON.Material('player');
    platformMaterial = new CANNON.Material('platform');

    // Define contact material for player-platform interaction
    const playerPlatformContactMaterial = new CANNON.ContactMaterial(
      playerMaterial,
      platformMaterial,
      {
        friction: PHYSICS.PLATFORM_FRICTION,
        restitution: 0.3,
      }
    );
    world.addContactMaterial(playerPlatformContactMaterial);

    // Define contact material for player-player interaction
    const playerPlayerContactMaterial = new CANNON.ContactMaterial(
      playerMaterial,
      playerMaterial,
      {
        friction: 0.1,
        restitution: PHYSICS.PLAYER_RESTITUTION,
      }
    );
    world.addContactMaterial(playerPlayerContactMaterial);

    // Create static platform body (hexagonal approximated as cylinder)
    const platformShape = new CANNON.Cylinder(
      PLATFORM.INITIAL_RADIUS,
      PLATFORM.INITIAL_RADIUS,
      PLATFORM.HEIGHT,
      6
    );

    const platformBody = new CANNON.Body({
      mass: 0,
      shape: platformShape,
      position: new CANNON.Vec3(0, -PLATFORM.HEIGHT / 2, 0),
      material: platformMaterial,
    });

    // Rotate to align with visual hexagon
    const quat = new CANNON.Quaternion();
    quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    platformBody.quaternion.copy(quat);

    world.addBody(platformBody);
    platformBodyRef.current = platformBody;
    bodiesRef.current.set('platform', { body: platformBody, type: 'platform' });

    // Set up collision detection - use ref to get current callback
    world.addEventListener('beginContact', (event) => {
      const bodyA = event.bodyA;
      const bodyB = event.bodyB;

      // Find the player IDs from the bodies
      let playerA = null;
      let playerB = null;

      bodiesRef.current.forEach((value, key) => {
        if (value.body === bodyA && value.type === 'player') playerA = key;
        if (value.body === bodyB && value.type === 'player') playerB = key;
      });

      // If two players collided, notify parent
      if (playerA && playerB && onCollisionRef.current) {
        const contactNormal = event.contact?.ni || new CANNON.Vec3(1, 0, 0);
        const relativeVelocity = new CANNON.Vec3();
        bodyA.velocity.vsub(bodyB.velocity, relativeVelocity);
        const impactSpeed = Math.abs(relativeVelocity.dot(contactNormal));

        onCollisionRef.current({
          playerA,
          playerB,
          impactSpeed,
          contactPoint: event.contact?.bi?.position || bodyA.position,
        });
      }
    });

    return () => {
      // Cleanup on unmount
      if (worldRef.current && platformBodyRef.current) {
        worldRef.current.removeBody(platformBodyRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // NO DEPENDENCIES - world is created once and never recreated

  // Update platform physics body when radius changes
  useEffect(() => {
    if (!worldRef.current || !platformBodyRef.current) return;
    if (Math.abs(currentPlatformRadiusRef.current - platformRadius) < 0.01) return;

    // Remove old platform body
    const oldBody = platformBodyRef.current;
    worldRef.current.removeBody(oldBody);
    bodiesRef.current.delete('platform');

    // Create new platform body with updated radius
    const platformShape = new CANNON.Cylinder(
      platformRadius,
      platformRadius,
      PLATFORM.HEIGHT,
      6
    );

    const newPlatformBody = new CANNON.Body({
      mass: 0,
      shape: platformShape,
      position: new CANNON.Vec3(0, -PLATFORM.HEIGHT / 2, 0),
      material: platformMaterial,
    });

    // Rotate to align with visual hexagon
    const quat = new CANNON.Quaternion();
    quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    newPlatformBody.quaternion.copy(quat);

    worldRef.current.addBody(newPlatformBody);
    platformBodyRef.current = newPlatformBody;
    bodiesRef.current.set('platform', { body: newPlatformBody, type: 'platform' });
    currentPlatformRadiusRef.current = platformRadius;
  }, [platformRadius]);

  // Step physics each frame
  useFrame((state, delta) => {
    if (worldRef.current) {
      // Cap delta to prevent huge jumps after tab inactive
      const cappedDelta = Math.min(delta, 0.1);
      worldRef.current.step(PHYSICS.TIMESTEP, cappedDelta, PHYSICS.MAX_SUBSTEPS);
    }
  });

  // Functions to add/remove bodies - use useCallback for stable references
  const addBody = useCallback((id, body, type = 'player') => {
    if (!worldRef.current) {
      return false;
    }
    
    // If body already exists with this ID, remove the old one first (React Strict Mode handling)
    if (bodiesRef.current.has(id)) {
      const { body: oldBody } = bodiesRef.current.get(id);
      worldRef.current.removeBody(oldBody);
      bodiesRef.current.delete(id);
    }
    
    // Add the new body
    worldRef.current.addBody(body);
    bodiesRef.current.set(id, { body, type });
    return true;
  }, []);

  const removeBody = useCallback((id) => {
    if (worldRef.current && bodiesRef.current.has(id)) {
      const { body } = bodiesRef.current.get(id);
      worldRef.current.removeBody(body);
      bodiesRef.current.delete(id);
    }
  }, []);

  const getBody = useCallback((id) => {
    const entry = bodiesRef.current.get(id);
    return entry ? entry.body : null;
  }, []);

  // Context value
  const contextValue = useMemo(() => ({
    world: worldRef.current,
    addBody,
    removeBody,
    getBody,
    bodies: bodiesRef.current,
    platformBody: platformBodyRef.current,
  }), [worldReady, addBody, removeBody, getBody]);

  return (
    <PhysicsContext.Provider value={contextValue}>
      {worldReady ? children : null}
    </PhysicsContext.Provider>
  );
}
