import { useRef, useEffect, useCallback } from 'react';
import * as CANNON from 'cannon-es';
import { usePhysics, getPlayerMaterial } from '../components/PhysicsProvider';
import { PHYSICS } from '../utils/constants';

/**
 * Hook to create and manage a physics body for a player
 * Syncs physics body position with visual mesh
 *
 * @param {string} id - Unique player ID
 * @param {[number, number, number]} initialPosition - Starting position [x, y, z]
 * @param {boolean} isLocal - Whether this is the local controllable player
 * @returns {{ bodyRef, positionRef, velocityRef, applyForce, applyImpulse }}
 */
export default function usePhysicsBody(id, initialPosition = [0, 1, 0], isLocal = false) {
  const { addBody, removeBody, getBody } = usePhysics();
  const bodyRef = useRef(null);
  const positionRef = useRef({
    x: initialPosition[0],
    y: initialPosition[1],
    z: initialPosition[2],
  });
  const velocityRef = useRef({ x: 0, y: 0, z: 0 });

  // Create physics body on mount
  useEffect(() => {
    // Generate a unique instance ID for React Strict Mode handling
    const instanceId = Math.random().toString(36).substr(2, 9);
    
    // Create sphere shape for player collision
    const shape = new CANNON.Sphere(PHYSICS.PLAYER_RADIUS);

    // Get the shared player material instance (for proper ContactMaterial matching)
    const material = getPlayerMaterial() || new CANNON.Material('player');

    // Create physics body
    const body = new CANNON.Body({
      mass: PHYSICS.PLAYER_MASS,
      shape,
      position: new CANNON.Vec3(
        initialPosition[0],
        initialPosition[1],
        initialPosition[2]
      ),
      linearDamping: PHYSICS.PLAYER_LINEAR_DAMPING,
      angularDamping: PHYSICS.PLAYER_ANGULAR_DAMPING,
      material,
      type: CANNON.Body.DYNAMIC,
    });

    // Tag body with instance ID for React Strict Mode handling
    body._instanceId = instanceId;

    // Set collision response
    body.collisionResponse = true;

    // Prevent sleeping for responsive controls
    body.allowSleep = false;
    body.wakeUp();

    bodyRef.current = body;
    addBody(id, body, 'player');

    return () => {
      // Only remove if this body is still the current one (React Strict Mode protection)
      if (bodyRef.current === body) {
        removeBody(id);
        bodyRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, addBody, removeBody]);

  // Sync position from physics body (called each frame)
  const syncFromPhysics = useCallback(() => {
    const body = bodyRef.current;
    if (body) {
      positionRef.current.x = body.position.x;
      positionRef.current.y = body.position.y;
      positionRef.current.z = body.position.z;

      velocityRef.current.x = body.velocity.x;
      velocityRef.current.y = body.velocity.y;
      velocityRef.current.z = body.velocity.z;
    }
    return positionRef.current;
  }, []);

  // Apply continuous force (for movement)
  const applyForce = useCallback((forceX, forceY, forceZ) => {
    const body = bodyRef.current;
    if (body) {
      // Force wake up the body
      body.wakeUp();
      
      // Make absolutely sure it's dynamic
      if (body.type !== CANNON.Body.DYNAMIC) {
        body.type = CANNON.Body.DYNAMIC;
      }
      
      body.applyForce(
        new CANNON.Vec3(forceX, forceY, forceZ),
        body.position
      );
    }
  }, []);

  // Apply instant impulse (for boost)
  const applyImpulse = useCallback((impulseX, impulseY, impulseZ) => {
    const body = bodyRef.current;
    if (body) {
      body.applyImpulse(
        new CANNON.Vec3(impulseX, impulseY, impulseZ),
        body.position
      );
    }
  }, []);

  // Set velocity directly (for specific behaviors)
  const setVelocity = useCallback((vx, vy, vz) => {
    const body = bodyRef.current;
    if (body) {
      body.velocity.set(vx, vy, vz);
    }
  }, []);

  // Get current velocity
  const getVelocity = useCallback(() => {
    const body = bodyRef.current;
    if (body) {
      return {
        x: body.velocity.x,
        y: body.velocity.y,
        z: body.velocity.z,
      };
    }
    return { x: 0, y: 0, z: 0 };
  }, []);

  return {
    bodyRef,
    positionRef,
    velocityRef,
    syncFromPhysics,
    applyForce,
    applyImpulse,
    setVelocity,
    getVelocity,
  };
}
