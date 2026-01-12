import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLATFORM } from '../utils/constants';

// Shader for hex grid pattern
const hexGridShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color('#00ffff') },
    gridColor: { value: new THREE.Color('#003333') },
    glowIntensity: { value: 0.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform vec3 gridColor;
    uniform float glowIntensity;

    varying vec2 vUv;
    varying vec3 vPosition;

    // Hex grid function
    float hexGrid(vec2 p, float scale) {
      vec2 h = vec2(1.0, 1.732);
      vec2 a = mod(p * scale, h) - h * 0.5;
      vec2 b = mod(p * scale - h * 0.5, h) - h * 0.5;
      return min(dot(a, a), dot(b, b));
    }

    void main() {
      // Create hex grid pattern based on world position
      vec2 gridPos = vPosition.xz;
      float hex = hexGrid(gridPos, 1.5);

      // Create grid lines
      float gridLine = smoothstep(0.05, 0.08, hex);

      // Animate pulse
      float pulse = sin(time * 2.0) * 0.15 + 0.85;

      // Mix colors
      vec3 finalColor = mix(color * pulse, gridColor, gridLine);

      // Add distance-based glow from center
      float dist = length(vPosition.xz) / 10.0;
      float centerGlow = 1.0 - smoothstep(0.0, 1.0, dist);
      finalColor += color * centerGlow * glowIntensity * 0.3;

      // Edge pulse effect
      float edgeGlow = smoothstep(0.7, 1.0, dist);
      finalColor += color * edgeGlow * pulse * 0.5;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

// Create hexagonal geometry
function createHexagonGeometry(radius, height, segments = 6) {
  const shape = new THREE.Shape();
  const angleStep = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();

  const extrudeSettings = {
    depth: height,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -height / 2, 0);

  return geometry;
}

// Create edge geometry for glow effect
function createHexEdgeGeometry(radius, height, segments = 6, tubeRadius = 0.15) {
  const points = [];
  const angleStep = (Math.PI * 2) / segments;

  // Create points for the hexagon edge
  for (let i = 0; i <= segments; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    points.push(new THREE.Vector3(x, height / 2, z));
  }

  // Create curve from points
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0);

  return new THREE.TubeGeometry(curve, segments * 8, tubeRadius, 8, true);
}

// Base radius for all geometries - we scale the group to animate size changes
const BASE_RADIUS = 1;

export default function Platform({
  radius = PLATFORM.INITIAL_RADIUS,
  height = PLATFORM.HEIGHT,
  isWarning = false,
  warningProgress = 0, // 0-1, how close to shrink (1 = about to shrink)
}) {
  const shaderRef = useRef();
  const edgeGlowRef = useRef();
  const edgeGlow2Ref = useRef();
  const warningGlowRef = useRef();
  const groupRef = useRef();

  // Smoothly interpolated radius for animations (used as scale factor)
  const currentRadiusRef = useRef(radius);
  const targetRadiusRef = useRef(radius);

  // Update target when radius prop changes
  useEffect(() => {
    targetRadiusRef.current = radius;
  }, [radius]);

  // Create geometries with base radius of 1 - scaling is handled by the group transform
  // This makes the intent explicit: geometries are static, only scale changes
  const hexGeometry = useMemo(() => createHexagonGeometry(BASE_RADIUS, height), [height]);
  const edgeGeometry = useMemo(() => createHexEdgeGeometry(BASE_RADIUS, height, 6, 0.12), [height]);
  const outerEdgeGeometry = useMemo(() => createHexEdgeGeometry(BASE_RADIUS, height, 6, 0.25), [height]);

  // Animate shader uniforms, smooth radius transitions, and warning effects
  useFrame((state, delta) => {
    // Smooth radius interpolation (lerp towards target)
    const lerpSpeed = 3; // Units per second
    const target = targetRadiusRef.current;
    const current = currentRadiusRef.current;
    if (Math.abs(target - current) > 0.01) {
      currentRadiusRef.current = THREE.MathUtils.lerp(current, target, Math.min(1, lerpSpeed * delta));
    }

    // Always update group scale to match current radius
    // Since geometries use BASE_RADIUS=1, scale directly equals the actual radius
    if (groupRef.current) {
      const scale = currentRadiusRef.current;
      groupRef.current.scale.set(scale, 1, scale);
    }

    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = state.clock.elapsedTime;
    }

    // Pulse edge glow - changes color during warning
    if (edgeGlowRef.current) {
      const basePulse = Math.sin(state.clock.elapsedTime * 3) * 0.3 + 0.7;

      if (isWarning) {
        // Fast, urgent pulsing during warning
        const warningPulse = Math.sin(state.clock.elapsedTime * 8) * 0.5 + 0.5;
        edgeGlowRef.current.material.emissiveIntensity = 1.5 + warningPulse * warningProgress;
        // Lerp color from cyan to red based on warning progress
        const warningColor = new THREE.Color('#00ffff').lerp(
          new THREE.Color('#ff0000'),
          warningProgress
        );
        edgeGlowRef.current.material.color.copy(warningColor);
        edgeGlowRef.current.material.emissive.copy(warningColor);
      } else {
        // Normal cyan glow
        edgeGlowRef.current.material.emissiveIntensity = basePulse;
        edgeGlowRef.current.material.color.setHex(0x00ffff);
        edgeGlowRef.current.material.emissive.setHex(0x00ffff);
      }
    }

    if (edgeGlow2Ref.current) {
      const basePulse = Math.sin(state.clock.elapsedTime * 2 + 1) * 0.2 + 0.4;

      if (isWarning) {
        // Warning: magenta turns to red
        const warningPulse = Math.sin(state.clock.elapsedTime * 8) * 0.3 + 0.7;
        edgeGlow2Ref.current.material.opacity = basePulse + warningPulse * warningProgress * 0.4;
        const warningColor = new THREE.Color('#ff00ff').lerp(
          new THREE.Color('#ff3300'),
          warningProgress
        );
        edgeGlow2Ref.current.material.color.copy(warningColor);
      } else {
        edgeGlow2Ref.current.material.opacity = basePulse;
        edgeGlow2Ref.current.material.color.setHex(0xff00ff);
      }
    }

    // Warning glow ring effect
    if (warningGlowRef.current) {
      if (isWarning) {
        warningGlowRef.current.visible = true;
        const warningPulse = Math.sin(state.clock.elapsedTime * 10) * 0.3 + 0.7;
        warningGlowRef.current.material.opacity = warningProgress * warningPulse * 0.8;
        // Scale the warning ring slightly outward
        const ringScale = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.02;
        warningGlowRef.current.scale.set(ringScale, ringScale, 1);
      } else {
        warningGlowRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Main platform surface with hex grid pattern */}
      <mesh geometry={hexGeometry} receiveShadow castShadow>
        <shaderMaterial
          ref={shaderRef}
          uniforms={hexGridShader.uniforms}
          vertexShader={hexGridShader.vertexShader}
          fragmentShader={hexGridShader.fragmentShader}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner edge glow (bright cyan, turns red during warning) */}
      <mesh ref={edgeGlowRef} geometry={edgeGeometry}>
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>

      {/* Outer edge glow (magenta bloom, turns red-orange during warning) */}
      <mesh ref={edgeGlow2Ref} geometry={outerEdgeGeometry}>
        <meshBasicMaterial
          color="#ff00ff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Warning glow ring (only visible during shrink warning) */}
      {/* Uses BASE_RADIUS so it scales with the parent group */}
      <mesh
        ref={warningGlowRef}
        position={[0, height / 2 + 0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[BASE_RADIUS - 0.05, BASE_RADIUS + 0.1, 6]} />
        <meshBasicMaterial
          color="#ff0000"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bottom edge glow */}
      {/* Uses BASE_RADIUS so it scales with the parent group */}
      <mesh position={[0, -height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[BASE_RADIUS - 0.03, BASE_RADIUS + 0.03, 6]} />
        <meshBasicMaterial
          color="#ff00ff"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Underside point light for glow effect */}
      <pointLight
        position={[0, -2, 0]}
        color={isWarning ? '#ff4400' : '#00ffff'}
        intensity={isWarning ? 3 : 2}
        distance={15}
        decay={2}
      />

      {/* Edge point lights for rim lighting */}
      {/* Uses BASE_RADIUS + offset so lights scale with the parent group */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const x = Math.cos(angle) * (BASE_RADIUS + 0.1);
        const z = Math.sin(angle) * (BASE_RADIUS + 0.1);
        return (
          <pointLight
            key={i}
            position={[x, 0.5, z]}
            color={isWarning ? '#ff2200' : '#ff00ff'}
            intensity={isWarning ? 1 : 0.5}
            distance={5}
            decay={2}
          />
        );
      })}
    </group>
  );
}
