# Agents Memory - Architectural Notes

This file contains learnings and patterns discovered during development.
**Read this before making changes. Update it when you learn something important.**

---

## Project Structure

```
space-push-game/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── index.html
├── src/
│   ├── server/
│   │   ├── index.js          # Express + Socket.io server
│   │   ├── gameState.js      # Game state management
│   │   └── physics.js        # Server-side physics (optional)
│   └── client/
│       ├── main.jsx          # React entry point
│       ├── App.jsx           # Main app component
│       ├── components/
│       │   ├── Game.jsx      # Three.js game scene
│       │   ├── JoinScreen.jsx
│       │   ├── Lobby.jsx
│       │   ├── HostControls.jsx
│       │   ├── Player.jsx    # 3D player component
│       │   ├── Platform.jsx  # 3D platform component
│       │   └── UI.jsx        # HUD overlay
│       ├── hooks/
│       │   ├── useSocket.js  # Socket.io hook
│       │   ├── useKeyboard.js
│       │   └── useTouch.js
│       └── utils/
│           └── constants.js
└── public/
    └── assets/
```

---

## Tech Stack Details

### Server (Node.js)
```javascript
// Express + Socket.io setup
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});
```

### Three.js with React Three Fiber
```jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

function Game() {
  return (
    <Canvas camera={{ position: [0, 15, 15], fov: 60 }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Stars radius={100} depth={50} count={5000} />
      {/* Game components */}
    </Canvas>
  );
}
```

### Physics with Cannon-es
```javascript
import * as CANNON from 'cannon-es';

const world = new CANNON.World();
world.gravity.set(0, -0.5, 0); // Low gravity for floaty feel

// Player body
const playerBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Sphere(0.5),
  linearDamping: 0.3, // Adds drag
});
```

---

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `{ name }` | Player joins lobby |
| `input` | `{ keys, boost }` | Player input state |
| `startGame` | `{}` | Host starts game |
| `konamiCode` | `{}` | Secret code activated |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `playerJoined` | `{ id, name, color }` | New player in lobby |
| `playerLeft` | `{ id }` | Player disconnected |
| `gameState` | `{ state, players, platform }` | Full state sync |
| `countdown` | `{ count }` | 3-2-1 countdown |
| `eliminated` | `{ id }` | Player eliminated |
| `victory` | `{ winner }` | Game over |
| `konamiActivated` | `{ id }` | Someone used the code |

---

## Game States

```javascript
const GAME_STATES = {
  LOBBY: 'lobby',       // Waiting for players
  COUNTDOWN: 'countdown', // 3-2-1
  PLAYING: 'playing',   // Game active
  ENDED: 'ended'        // Victory screen
};
```

---

## Controls Mapping

```javascript
// Keyboard
const KEYS = {
  ArrowUp: 'forward',
  ArrowDown: 'backward',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Space: 'boost',
  Enter: 'ready'
};

// Konami Code sequence
const KONAMI = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'Space', 'Enter'
];
```

---

## Visual Style Guide

### Colors
```javascript
const COLORS = {
  platform: '#00ffff',      // Cyan neon
  platformEdge: '#ff00ff',  // Magenta glow
  background: '#0a0a1a',    // Deep space blue
  players: [
    '#ff4444', '#44ff44', '#4444ff', '#ffff44',
    '#ff44ff', '#44ffff', '#ff8844', '#88ff44'
  ]
};
```

### Lighting
- Ambient light: 0.3 intensity (dim base)
- Directional light: From above-right, casts shadows
- Player emissive: Each player glows their color

---

## Platform Shrinking

```javascript
const PLATFORM_STAGES = [
  { size: 10, time: 0 },      // Start: radius 10
  { size: 8, time: 30000 },   // 30s: radius 8
  { size: 6, time: 60000 },   // 60s: radius 6
  { size: 4, time: 90000 },   // 90s: radius 4 (minimum)
];
```

---

## Performance Tips

- Limit physics updates to 30fps on server
- Use instanced meshes if many particles
- Interpolate positions on client (don't just snap)
- Throttle socket emissions (max 20/sec per client)

---

## Learnings

(Agents will add learnings here as they work)

### Story #1: Project Initialization
- **Date:** 2026-01-10
- **Setup:** Using ES modules (`"type": "module"` in package.json) for modern JavaScript support
- **Dev workflow:** `concurrently` runs both server (nodemon) and client (vite) in parallel
- **Server entry:** `src/server/index.js` - Express + Socket.io with CORS enabled for development
- **Ports:** Server runs on 3000, Vite dev server typically on 5173
- **Note:** Using `socket.io-client` as separate dependency for frontend Socket.io connection

### Story #2: Express Server with Socket.io
- **Date:** 2026-01-10
- **Server port:** Changed from 3001 to 3000 per acceptance criteria
- **Static files:** Serves from `public/` folder (created with `assets/` subfolder)
- **Socket.io events:** Basic connection/disconnection logging implemented
- **Health check:** `/api/health` endpoint returns `{ status: 'ok', timestamp }` for monitoring
- **ES Modules:** Using `fileURLToPath` and `dirname` for `__dirname` equivalent in ESM

### Story #3: React Frontend Scaffold with Vite
- **Date:** 2026-01-10
- **Vite config:** Created `vite.config.js` with React plugin, dev server on port 5173
- **Proxy setup:** Vite proxies `/socket.io` and `/api` to backend on port 3000 for seamless dev experience
- **Entry point:** `src/client/main.jsx` - ReactDOM.createRoot with StrictMode
- **App component:** `src/client/App.jsx` - Placeholder with game title and Tailwind styling
- **index.html:** Created at project root (Vite standard) and copied to public folder
- **Tailwind CSS:** Configured with custom colors (space-dark, neon-cyan, neon-magenta)
- **PostCSS:** Set up with tailwindcss and autoprefixer plugins
- **CSS entry:** `src/client/index.css` with Tailwind directives and base body styling

### Story #4: Three.js Scene with Space Background
- **Date:** 2026-01-10 (initial attempts), 2026-01-11 (manual intervention)
- **Issue:** Ralph agents attempted this story 12 times but reviewer couldn't see Game.jsx file
- **Resolution:** Manual intervention on 2026-01-11 - Game.jsx created directly to unblock pipeline
- **Game component:** Created `src/client/components/Game.jsx` with full React Three Fiber setup
- **Canvas config:** Camera positioned at [0, 15, 15] with 60 FOV to view arena from above-angle
- **Lighting setup:**
  - Ambient light (intensity 0.3) for base illumination
  - Main directional light (intensity 1) from above-right [10, 20, 10] with shadow casting
  - Secondary fill light (intensity 0.3) from opposite side [-5, 10, -5]
  - Point light below platform (magenta #ff00ff) for dramatic rim lighting effect
- **Stars background:** Using drei's Stars component with 5000 stars, radius 100, depth 50, fade enabled
- **Background color:** Deep space blue #0a0a1a set via `<color attach="background" />`
- **Placeholder platform:** Cyan cylinder with emissive glow for visualizing the arena
- **Camera rig:** OrbitControls with automatic slow azimuthal rotation (0.5 rad/s) for cinematic effect
- **Shadows:** Enabled with 2048x2048 shadow maps on directional light
- **Pattern:** Using useRef and useFrame hook for animation loops in R3F

### Story #5: Create Glowing Neon Platform
- **Date:** 2026-01-10
- **Platform component:** Created `src/client/components/Platform.jsx` as standalone component
- **Hexagonal geometry:** Using THREE.ExtrudeGeometry with THREE.Shape to create proper 6-sided hexagon (not a cylinder)
- **Hex grid pattern:** Custom GLSL shader (`hexGridShader`) creates animated hex grid pattern on surface:
  - Uses fragment shader with hexGrid function for pattern generation
  - Animated pulse effect via `time` uniform
  - Distance-based center glow and edge pulse effects
  - Colors: Cyan (#00ffff) lines on dark cyan (#003333) background
- **Neon edge glow:** Multiple layers for rich glow effect:
  - Inner edge: TubeGeometry following hexagon path with bright cyan emissive material
  - Outer edge: Larger tube with magenta transparent material for bloom effect
  - Bottom ring: RingGeometry with magenta glow for underside effect
- **Dynamic lighting:**
  - Underside point light (cyan) for bottom glow
  - 6 edge point lights (magenta) at each vertex for rim lighting
- **Animation:** useFrame hook animates:
  - Shader time uniform for pulsing grid
  - Edge glow emissiveIntensity (0.4-1.0 range)
  - Outer glow opacity (0.2-0.6 range)
- **Props:** Component accepts `radius` (default 10) and `height` (default 0.5) for flexibility
- **Pattern:** Using useMemo for geometry creation to prevent recreation on every render
- **Integration:** Game.jsx imports Platform component, replacing inline Platform function

### Story #6: Create Astronaut Player Model
- **Date:** 2026-01-11
- **Player component:** Created `src/client/components/Player.jsx` - astronaut representation with glowing capsule body
- **Player shape:** Capsule geometry for body (astronaut suit look), sphere for helmet, smaller sphere for visor
- **Emissive glow:** Using meshStandardMaterial with both `color` and `emissive` set to player color, `toneMapped={false}` for HDR bloom effect
- **Outer glow:** Larger transparent sphere with `BackSide` rendering for soft glow aura around player
- **Name labels:** Using drei's `Html` component for floating labels above players
  - `distanceFactor={15}` for size scaling with camera distance
  - `center` prop for horizontal centering
  - CSS text-shadow with player color for glowing text effect
  - Border matches player color for visual consistency
- **Local player indicator:** White ring below the player model, star prefix in name label
- **Animation:** useFrame hook for:
  - Pulsing outer glow opacity (0.4 base with ±0.2 variation)
  - Pulsing emissive intensity (0.7-1.0 range)
  - Subtle bobbing motion (using player ID for offset to desync animations)
- **Point lights:** Each player has a point light for illuminating nearby surfaces
- **Constants file:** Created `src/client/utils/constants.js` with:
  - `PLAYER_COLORS` array (12 neon colors)
  - `PLAYER` settings (radius, height, glow intensity, label height)
  - `GAME_STATES` enum
  - `PLATFORM` and `COLORS` for future use
- **Color assignment:** `colorIndex` prop accepts either array index or direct hex color string
- **Eliminated state:** `isEliminated` prop returns null to hide player completely

### Story #7: Implement Player Movement with Arrow Keys
- **Date:** 2026-01-11
- **useKeyboard hook:** Created `src/client/hooks/useKeyboard.js` for capturing arrow key input
  - Uses `useRef` to store key states (avoids re-renders on key press)
  - Prevents default browser behavior for arrow keys (prevents page scrolling)
  - Maps ArrowUp/Down/Left/Right to forward/backward/left/right
  - Space key for boost (future use)
- **usePlayerMovement hook:** Created `src/client/hooks/usePlayerMovement.js` for physics-based movement
  - Uses `useFrame` from R3F for per-frame physics updates
  - Acceleration-based movement (not direct position updates) for floaty feel
  - High friction coefficient (0.98) for slow deceleration - creates zero-G drift
  - Diagonal movement normalized to prevent faster diagonal speed
  - Boundary checking keeps player on platform with soft bounce
- **Movement constants:** Added to `src/client/utils/constants.js`
  - `MOVEMENT.ACCELERATION: 0.015` - low value for gradual speed buildup
  - `MOVEMENT.MAX_SPEED: 0.12` - caps velocity
  - `MOVEMENT.FRICTION: 0.98` - 2% slowdown per frame (very slippery)
  - `MOVEMENT.BOOST_MULTIPLIER: 2.5` - for future boost feature
- **LocalPlayer component:** Created wrapper in Game.jsx that applies movement physics
  - Wraps Player in a group for position updates
  - Separates visual (Player) from physics (usePlayerMovement)
- **Architecture pattern:**
  - useKeyboard called outside Canvas (regular React context)
  - keysRef passed into Canvas via Scene props
  - usePlayerMovement called inside Canvas (needs useFrame from R3F)
- **Camera:** Disabled auto-rotate during gameplay for better control feel
- **Frame-rate independence (CRITICAL):** All physics calculations MUST use consistent time scaling:
  ```javascript
  // Normalize to 60fps baseline, cap delta to prevent huge jumps after tab inactive
  const timeScale = Math.min(delta, 0.1) * 60;

  // ALL physics must use timeScale, not raw delta:
  velocity.x += accelX * timeScale;           // acceleration
  velocity.x *= Math.pow(FRICTION, timeScale); // friction/damping
  position.x += velocity.x * timeScale;        // position update
  ```
  - **Wrong:** Using raw `delta` for some calculations and `delta * 60` for others
  - **Problem:** 120fps monitors get half the acceleration per second vs 60fps monitors
  - **Solution:** Define `timeScale = Math.min(delta, 0.1) * 60` once, use everywhere

### Story #8: Implement Boost/Dash Mechanic
- **Date:** 2026-01-11
- **Boost mechanic:** Spacebar triggers instant velocity boost in current movement direction
- **Cooldown system:** Created `src/client/hooks/useBoost.js` hook for cooldown management
  - `BOOST.COOLDOWN: 1500` ms (1.5 seconds) - configurable in constants.js
  - `BOOST.IMPULSE_STRENGTH: 0.4` - instant velocity added on boost
  - `BOOST.MAX_BOOSTED_SPEED: 0.35` - higher max speed during boost effect
  - `BOOST.DURATION: 200` ms - how long visual effect lasts
- **Direction tracking:** Movement hook tracks last direction via `lastDirectionRef`
  - Uses input direction when player is pressing keys
  - Falls back to velocity direction when drifting
  - Default direction is forward (-Z) if stationary
- **Rising edge detection:** Boost triggers only on keydown, not while held
  - Uses `prevBoostKeyRef` to compare previous frame's key state
  - Prevents accidental spam by requiring key release between boosts
- **Visual effects:** Created `src/client/components/FlameTrail.jsx`
  - Particle burst in opposite direction of movement (jetpack exhaust effect)
  - 12 particles with randomized velocity spread in cone shape
  - Particles fade out and shrink over lifetime (~0.3s)
  - Central glow sphere + outer halo during boost
  - Point light for illumination effect
- **UI indicator:** Created `src/client/components/BoostIndicator.jsx`
  - Fixed position at bottom-center of screen
  - Progress bar showing cooldown recharge
  - Visual states: "BOOST READY" (cyan glow) vs "RECHARGING..." (gray)
  - SPACE key hint for player guidance
- **Architecture pattern:**
  - `useBoost` called outside Canvas (uses React state for UI updates)
  - `boostState` passed down through Scene → LocalPlayer
  - `applyBoostImpulse()` called inside useFrame when boost triggers
  - FlameTrail attached to player group, receives direction from physics
- **Code review fixes (2026-01-11):**
  - **Memory leak prevention:** Added cleanup in FlameTrail for THREE.js geometry and materials via `useEffect` cleanup function
  - **Stale ref fix:** FlameTrail now captures direction at moment of boost trigger (`capturedDirectionRef`) instead of using the mutable ref directly during particle emission
  - **Timeout cleanup:** Added `boostTimeoutRef` tracking in useBoost to properly clear timeout on unmount
  - **WASD support:** Added W/A/S/D keys as alternatives to arrow keys in useKeyboard hook for improved UX
- **Three.js cleanup pattern (CRITICAL):**
  ```javascript
  // For geometry that never changes: cleanup on unmount only
  const geometry = useMemo(() => new THREE.SphereGeometry(0.1, 8, 8), []);
  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  // For materials that change with props: use ref to track and cleanup on change
  const prevMaterialsRef = useRef([]);
  const materials = useMemo(() => {
    // Dispose previous materials BEFORE creating new ones
    prevMaterialsRef.current.forEach((mat) => mat.dispose());
    const newMaterials = [/* create materials */];
    prevMaterialsRef.current = newMaterials;
    return newMaterials;
  }, [color]); // Dependency that triggers recreation

  useEffect(() => {
    return () => prevMaterialsRef.current.forEach((mat) => mat.dispose());
  }, []); // Unmount cleanup only - prop changes handled in useMemo
  ```
- **Mutable ref capture pattern:**
  ```javascript
  // When using refs in animations, capture values at trigger time
  if (isActive && !burstTriggeredRef.current) {
    capturedDirectionRef.current = { x: direction.x, z: direction.z };
    // Use capturedDirectionRef.current for all subsequent particle calculations
  }
  ```

### Story #9: Add Physics with Collision and Momentum
- **Date:** 2026-01-11
- **Cannon-es integration:** Using cannon-es (ES module version of cannon.js) for physics simulation
- **PhysicsProvider component:** Created `src/client/components/PhysicsProvider.jsx`
  - Wraps physics world in React Context for child component access
  - Initializes CANNON.World with low gravity (-0.5) for floaty space feel
  - Uses NaiveBroadphase for collision detection (sufficient for <50 players)
  - Steps physics each frame using useFrame hook with capped delta time
  - Manages body lifecycle via `addBody` and `removeBody` functions
  - Listens for `beginContact` events to detect player-player collisions
- **usePhysicsBody hook:** Created `src/client/hooks/usePhysicsBody.js`
  - Creates CANNON.Sphere shape for player collision body
  - Provides `applyForce` (continuous) and `applyImpulse` (instant) functions
  - `syncFromPhysics` updates position ref from physics body each frame
  - Handles cleanup via useEffect return to prevent memory leaks
- **PhysicsPlayer component:** Created `src/client/components/PhysicsPlayer.jsx`
  - Combines physics body with visual Player component
  - For local player: reads keyboard input and applies forces
  - For all players: syncs visual position from physics simulation
  - Momentum transfer happens automatically via Cannon-es collision response
- **Platform physics body:** Static cylinder (mass=0) created in PhysicsProvider
  - Uses 6-sided cylinder to approximate hexagon shape
  - Rotated to align with visual hexagon (-90 degrees on X axis)
- **CollisionSparks component:** Created `src/client/components/CollisionSparks.jsx`
  - Particle burst effect triggered on player-player collision
  - Particles have random velocities with gravity falloff
  - Fades out over 0.5 seconds for quick visual feedback
- **Physics constants:** Added to `src/client/utils/constants.js`
  - `PHYSICS.GRAVITY: -0.5` - Low gravity for space feel
  - `PHYSICS.PLAYER_MASS: 1` - Equal mass for fair pushing
  - `PHYSICS.PLAYER_LINEAR_DAMPING: 0.3` - Adds drag for control
  - `PHYSICS.PLAYER_RESTITUTION: 0.5` - Moderate bounciness on collision
- **Architecture pattern for physics in R3F:**
  ```javascript
  // PhysicsProvider wraps scene content
  <PhysicsProvider onCollision={handleCollision}>
    <Platform />
    <PhysicsPlayer id="player1" isLocal={true} keysRef={keysRef} />
    <PhysicsPlayer id="player2" />
  </PhysicsProvider>

  // usePhysics() hook accesses world context
  const { addBody, removeBody, getBody } = usePhysics();

  // Physics body created in useEffect, cleaned up on unmount
  useEffect(() => {
    const body = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.5) });
    addBody(id, body, 'player');
    return () => removeBody(id);
  }, [id]);
  ```
- **Force scaling:** Physics forces need higher values than direct position updates
  - Movement force: `MOVEMENT.ACCELERATION * 50` (scaled up for physics)
  - Boost impulse: `BOOST.IMPULSE_STRENGTH * 20` (scaled for physics impulse)
- **Frame-rate independence:** Use capped delta time for physics stepping
  ```javascript
  const cappedDelta = Math.min(delta, 0.1);
  world.step(PHYSICS.TIMESTEP, cappedDelta, PHYSICS.MAX_SUBSTEPS);
  ```
- **ContactMaterial pattern (CRITICAL):** Cannon-es requires explicit ContactMaterial definitions for friction/restitution to work:
  ```javascript
  // 1. Define materials at module level for reuse
  let playerMaterial = null;
  let platformMaterial = null;

  // 2. In PhysicsProvider useEffect, create materials and contact materials
  playerMaterial = new CANNON.Material('player');
  platformMaterial = new CANNON.Material('platform');

  // Player-Platform interaction (friction, low bounce)
  const playerPlatformContact = new CANNON.ContactMaterial(
    playerMaterial, platformMaterial,
    { friction: PHYSICS.PLATFORM_FRICTION, restitution: 0.3 }
  );
  world.addContactMaterial(playerPlatformContact);

  // Player-Player interaction (low friction for bumping feel, bouncy)
  const playerPlayerContact = new CANNON.ContactMaterial(
    playerMaterial, playerMaterial,
    { friction: 0.1, restitution: PHYSICS.PLAYER_RESTITUTION }
  );
  world.addContactMaterial(playerPlayerContact);

  // 3. Export getter for material reuse
  export function getPlayerMaterial() { return playerMaterial; }

  // 4. Use the SAME material instance on all bodies (not new Material()!)
  const body = new CANNON.Body({
    material: getPlayerMaterial(), // ✓ uses shared instance
    // material: new CANNON.Material('player'), // ✗ won't match ContactMaterial
  });
  ```
  - **Without ContactMaterial:** Engine uses default friction/restitution values, physics constants are ignored
  - **Common mistake:** Creating `new CANNON.Material('player')` for each body - these are different instances even with same name!
- **Obsolete code cleanup:** `usePlayerMovement.js` was deleted as it duplicated physics-based movement handled by `usePhysicsBody.js` and `PhysicsPlayer.jsx`
- **Visual-physics sync (CRITICAL):** Never override physics position when syncing visuals:
  ```javascript
  // WRONG - visual is out of sync with physics collision location
  groupRef.current.position.y = Math.max(pos.y, 1);

  // RIGHT - visual exactly matches physics body position
  groupRef.current.position.y = pos.y;
  ```
  - If player model clips through floor, adjust the mesh offset *within* the group, not the group position
  - Misaligned visuals cause collisions and effects (sparks) to appear at wrong locations
- **Physics constants organization:** Use `PHYSICS_` prefix for cannon-es scaled values:
  ```javascript
  export const MOVEMENT = {
    ACCELERATION: 0.015,           // For direct position updates
    PHYSICS_ACCELERATION: 0.75,    // 0.015 * 50 - For cannon-es forces
    MAX_SPEED: 0.12,               // For direct velocity
    PHYSICS_MAX_SPEED: 1.2,        // 0.12 * 10 - For cannon-es velocity clamping
  };
  ```
  - Keeps constants.js as single source of truth for tuning
  - Avoids magic number multipliers scattered through physics code
  - Makes it clear which values are used where

### Story #10: WebSocket Player Synchronization
- **Date:** 2026-01-11
- **Architecture:** Client-authoritative physics with server state synchronization
  - Each client runs its own physics simulation for the local player
  - Position updates are sent to the server at 20Hz (50ms intervals)
  - Server broadcasts aggregated positions to all clients
  - Remote players are rendered with interpolation for smoothness
- **Server files created:**
  - `src/server/gameState.js` - Centralized game state management (players, game state, platform)
  - `src/server/constants.js` - Server-side constants mirroring client values
- **Client files created:**
  - `src/client/hooks/useSocket.js` - Socket.io connection hook with all game events
  - `src/client/components/RemotePlayer.jsx` - Networked player with interpolation
  - `src/client/components/JoinScreen.jsx` - Name entry UI
  - `src/client/components/Lobby.jsx` - Player list and host controls
  - `src/client/components/GameOverScreen.jsx` - Victory/defeat screen
- **Socket.io events implemented:**
  - Client → Server: `join`, `input`, `startGame`, `ready`, `konamiCode`, `playAgain`
  - Server → Client: `joined`, `playerJoined`, `playerLeft`, `positionUpdate`, `countdown`, `gameStart`, `playerEliminated`, `platformShrink`, `konamiActivated`, `gameEnd`, `gameReset`, `playerReady`
- **Position interpolation pattern:**
  ```javascript
  // Exponential smoothing for smooth remote player movement
  const INTERPOLATION_SPEED = 10;
  const lerpFactor = 1 - Math.exp(-INTERPOLATION_SPEED * cappedDelta);

  // Velocity prediction for latency compensation
  const predictedX = targetPosition.x + targetVelocity.x * VELOCITY_PREDICTION_FACTOR;
  currentPosition.x += (predictedX - currentPosition.x) * lerpFactor;
  ```
  - Higher INTERPOLATION_SPEED = snappier but more jittery
  - VELOCITY_PREDICTION_FACTOR helps compensate for network latency
- **Throttling pattern for network updates:**
  ```javascript
  const POSITION_UPDATE_INTERVAL = 50; // 20 updates/sec
  const lastUpdateRef = useRef(0);

  const now = Date.now();
  if (now - lastUpdateRef.current >= POSITION_UPDATE_INTERVAL) {
    lastUpdateRef.current = now;
    sendInput(position, velocity);
  }
  ```
- **Host management:** First player to join becomes host; if host disconnects, next player is promoted
- **Game flow:** JoinScreen → Lobby → Countdown → Playing → GameOver → (Play Again)
- **Player tracking:** Server uses Map<socketId, playerData> for O(1) lookups

### Story #11: Join Screen with Name Input
- **Date:** 2026-01-11
- **Player count display:** Join screen shows live player count in "X / 40 players" format
- **Server-side validation:** Server checks `PLAYERS.MAX_PLAYERS` before allowing joins, sends `joinError` if full
- **Player count events:**
  - `playerCount` event sent on connection (before join) so clients see count immediately
  - `playerCount` event broadcast when players join or leave for real-time updates
- **Error handling pattern:** `joinError` state in useSocket propagated to JoinScreen via props
- **Defensive UI:**
  - Button disabled and shows "SERVER FULL" when at capacity
  - Player count turns red when server is full
  - Error message displayed if join attempt fails
- **Constants organization:** `PLAYERS.MAX_PLAYERS: 40` added to `src/server/constants.js`

### Story #12: Create Lobby Waiting Room
- **Date:** 2026-01-11
- **Lobby component enhanced:** `src/client/components/Lobby.jsx` completely redesigned with space theme
- **Space-themed visual styling:**
  - Neon glow effects using CSS `box-shadow` with player colors
  - Gradient backgrounds from cyan to magenta
  - Backdrop blur for glass-morphism effect
  - Animated CSS keyframes for `fadeSlideIn` and `countdownPulse`
- **Player list features:**
  - Header titled "CREW MANIFEST" with astronaut count
  - Each player shows color indicator with glow, name, and tags (YOU, HOST, READY)
  - Animated entry with staggered delays (index * 0.05s)
  - Scrollable list for many players (max-height 400px)
- **"Waiting for host to start" message:** Prominent central display with:
  - Animated pulsing rocket icon
  - Different messages for host vs non-host players
  - Clear indication that players cannot move yet
  - Animated bouncing dots for non-host waiting indicator
- **Host controls:** Large START GAME button with glow effects and scale animation on hover
- **Countdown overlay:** Giant numbers (12rem) with triple text-shadow glow and pulse animation
- **Movement control pattern (CRITICAL):**
  ```javascript
  // In PhysicsScene, disable input during lobby by passing null refs:
  keysRef={isPlaying ? keysRef : null}
  boostState={isPlaying ? boostState : null}
  canMove={isPlaying}

  // In PhysicsPlayer, check canMove before processing input:
  if (isLocal && canMove && keysRef?.current) {
    // Handle movement...
  }
  ```
  - `canMove` prop added to PhysicsPlayer for explicit movement control
  - During lobby/countdown, keysRef and boostState passed as null
  - PhysicsPlayer checks `canMove && keysRef?.current` before applying forces
- **Host identification in player list:**
  - `hostId` passed from Game.jsx → Lobby via props
  - Player list maps over players and adds `isHost: player.id === hostId`
  - HOST tag displayed in magenta for the host player
- **Real-time player updates:** Already handled by existing Socket.io events:
  - `playerJoined` event triggers state update and re-render
  - React state updates cause Lobby component to show new player immediately
- **CSS-in-JSX pattern:** Using `<style>{...}</style>` inside component for animation keyframes
  - Alternative: could use Tailwind's arbitrary values or separate CSS file
  - Inline style blocks work but don't get autoprefixed

### Story #13: First Player Becomes Host with Game Controls
- **Date:** 2026-01-11
- **Host assignment:** First player to join automatically becomes host (handled in `gameState.js:54-57`)
- **Host indicator:** Crown icon (👑) with "HOST" label displayed next to host player in lobby
  - Yellow/gold color scheme with glow effect for visual distinction
  - Uses Tailwind's `bg-yellow-500/20`, `text-yellow-400`, `border-yellow-500/40`
- **Host controls:** START GAME button only visible to host player (Lobby.jsx:177-208)
  - Uses `isHost` prop to conditionally render
  - Large, prominent button with gradient and glow effects
- **Non-host UX:** "Waiting for host to start..." message with animated dots (Lobby.jsx:210-223)
- **Host promotion on disconnect:** When host leaves, next player becomes host automatically
  - Handled in `gameState.js:72-77` (server assigns new host)
  - `playerLeft` event includes `newHostId` field
  - useSocket.js detects when local player becomes new host
- **Host change notification pattern:**
  ```javascript
  // In useSocket.js, detect host promotion in playerLeft handler
  socket.on('playerLeft', ({ id, name, newHostId }) => {
    setHostId((prevHostId) => {
      if (prevHostId === id && socket.id === newHostId) {
        setHostChangeNotification({
          message: 'You are now the host!',
          previousHost: name,
        });
        setTimeout(() => setHostChangeNotification(null), 3000);
      }
      return newHostId;
    });
  });
  ```
  - Notification displays crown icon with message explaining promotion
  - Auto-clears after 3 seconds
- **Acceptance criteria verification:**
  1. ✅ First player to join is automatically designated as host
  2. ✅ Host sees START GAME button in lobby
  3. ✅ Regular players see 'Waiting for host to start' message
  4. ✅ If host disconnects, next player becomes new host
  5. ✅ Host indicator shown (crown icon + 'HOST' label)
- **Code review fixes (2026-01-11):**
  - **Host re-assignment fix:** Changed `removePlayer` in `gameState.js:72-81` to explicitly sort remaining players by `joinedAt` timestamp when selecting new host, rather than relying on `Map.keys()` insertion order which is not guaranteed to reflect join order.
    ```javascript
    // WRONG - relies on implicit Map insertion order
    const remaining = Array.from(players.keys());
    hostId = remaining.length > 0 ? remaining[0] : null;

    // RIGHT - explicitly sorts by joinedAt timestamp
    const sortedPlayers = Array.from(players.values()).sort(
      (a, b) => a.joinedAt - b.joinedAt
    );
    hostId = sortedPlayers[0].id;
    ```
  - **Platform shrink logic fix:** Refactored shrink check from broken `timeSinceStart` calculation into encapsulated `shouldShrinkPlatform()` function in `gameState.js:220-224`. The original logic incorrectly used player `joinedAt` timestamp in the calculation, which meant the condition was rarely met.
    ```javascript
    // WRONG - broken calculation using player joinedAt
    const timeSinceStart = now - (snapshot.timestamp - (getAllPlayers()[0]?.joinedAt || now));
    if (timeSinceStart % PLATFORM.SHRINK_INTERVAL < SERVER.TICK_INTERVAL) { ... }

    // RIGHT - encapsulated check using lastShrinkTime
    export function shouldShrinkPlatform(shrinkInterval) {
      if (!lastShrinkTime) return false;
      return (Date.now() - lastShrinkTime) >= shrinkInterval;
    }
    // In game loop:
    if (shouldShrinkPlatform(PLATFORM.SHRINK_INTERVAL)) { ... }
    ```
  - **Encapsulation pattern:** Time-based game mechanics should be encapsulated in `gameState.js` where the timing variables (`lastShrinkTime`) are stored, rather than computed in the game loop with external references.

### Story #14: Implement Game State Management
- **Date:** 2026-01-11
- **Game states:** Four states defined in `GAME_STATES` enum: `LOBBY`, `COUNTDOWN`, `PLAYING`, `ENDED`
- **State machine flow:**
  1. LOBBY - Players join, host sees START button, players cannot move
  2. COUNTDOWN - 3-2-1 sequence, players still cannot move
  3. PLAYING - Game active, movement enabled, players can boost
  4. ENDED - Victory/defeat screen, host can restart
- **Server-side state management:** Centralized in `gameState.js`:
  - `setGameState(state)` updates current state
  - `getGameState()` returns current state
  - State changes trigger Socket.io events to all clients
- **State transition events:**
  - `countdown` event: `{ count }` - emitted each second (3, 2, 1)
  - `gameStart` event: Full state snapshot when transitioning to PLAYING
  - `gameEnd` event: `{ winner }` - emitted when game ends
  - `gameReset` event: Full state snapshot when host restarts
- **UI components by state:**
  - JoinScreen: Shown before player joins (pre-state)
  - Lobby: Shown during LOBBY and COUNTDOWN states
  - GameStatusHUD: Shown during PLAYING state (timer, alive count, arena size)
  - GameOverScreen: Shown during ENDED state
  - BoostIndicator: Shown during PLAYING state (only for alive players)
- **Movement restriction pattern (CRITICAL):**
  ```javascript
  // In PhysicsScene, control movement via props:
  const isPlaying = gameState === GAME_STATES.PLAYING;
  <PhysicsPlayer
    keysRef={isPlaying ? keysRef : null}
    boostState={isPlaying ? boostState : null}
    canMove={isPlaying}
  />

  // In PhysicsPlayer, check all three conditions:
  if (isLocal && canMove && keysRef?.current) {
    // Handle movement...
  }
  ```
  - `keysRef` and `boostState` are passed as `null` during non-playing states
  - `canMove` prop provides explicit boolean control
  - Both input and physics application are blocked
- **Countdown display:** Large numbers (12rem) with neon glow animation in Lobby component
- **GameStatusHUD component:** Created `src/client/components/GameStatusHUD.jsx`:
  - LIVE indicator with pulsing animation
  - Elapsed time counter (MM:SS format)
  - Alive players count
  - Platform/arena size indicator
  - Eliminated overlay for spectating players
- **State-based conditional rendering pattern:**
  ```javascript
  const showJoinScreen = !hasJoined;
  const showLobby = hasJoined && (gameState === GAME_STATES.LOBBY || gameState === GAME_STATES.COUNTDOWN);
  const showGameOver = gameState === GAME_STATES.ENDED;
  const showGameStatus = hasJoined && gameState === GAME_STATES.PLAYING;
  ```
  - Combine join status with game state for accurate UI display
  - COUNTDOWN is shown via Lobby component (not a separate component)

### Story #15: Platform Shrinking Mechanic
- **Date:** 2026-01-11
- **Shrink schedule:** Platform shrinks every 30 seconds, 3 shrink stages before minimum size
  - Stage 0: Radius 10 (initial)
  - Stage 1: Radius 8 (30s)
  - Stage 2: Radius 6 (60s)
  - Stage 3: Radius 4 (90s - minimum, no further shrinking)
- **Warning system:** 5 seconds before each shrink, warning visual activates
  - `PLATFORM.SHRINK_WARNING_TIME: 5000` ms before shrink
  - Server emits `platformWarning` event with `{ isWarning, warningProgress }`
  - `warningProgress` goes from 0 to 1 as shrink approaches
- **Visual warning effects in Platform.jsx:**
  - Edge glow transitions from cyan to red based on `warningProgress`
  - Pulsing speed increases during warning (8Hz vs 3Hz normal)
  - Outer glow changes from magenta to red-orange
  - Red warning ring appears and pulses on platform surface
  - Point lights change from cyan/magenta to red/orange during warning
- **Smooth shrink animation:**
  - Platform uses `THREE.MathUtils.lerp` for smooth radius transition
  - Visual scaling applied via group.scale (not geometry recreation)
  - `lerpSpeed = 3` units per second for gradual transition
- **Physics boundary update:** PhysicsProvider recreates platform body when radius changes
  ```javascript
  useEffect(() => {
    if (Math.abs(currentPlatformRadiusRef.current - platformRadius) < 0.01) return;
    // Remove old platform body
    worldRef.current.removeBody(platformBodyRef.current);
    // Create new body with updated radius
    const platformShape = new CANNON.Cylinder(platformRadius, platformRadius, HEIGHT, 6);
    // ... add new body to world
  }, [platformRadius]);
  ```
  - Physics body is recreated (not scaled) since Cannon-es doesn't support shape scaling
  - Material instance is reused to maintain ContactMaterial relationships
- **Socket events for shrinking:**
  - `platformWarning`: `{ isWarning: boolean, warningProgress: number }` - sent only when warning state changes (not every tick)
  - `platformShrink`: `{ radius: number }` - sent when platform actually shrinks
- **State management in gameState.js:**
  - `getShrinkWarningState(shrinkInterval, warningTime)` - returns warning state
  - `getTimeUntilNextShrink(shrinkInterval)` - returns ms until next shrink
  - Warning state calculated based on `lastShrinkTime` and current time
- **Props flow for platform:**
  ```javascript
  // useSocket returns shrinkWarning state
  const { platformRadius, shrinkWarning } = useSocket();

  // Pass to PhysicsScene
  <PhysicsScene platformRadius={platformRadius} shrinkWarning={shrinkWarning} />

  // PhysicsScene passes to Platform and PhysicsProvider
  <PhysicsProvider platformRadius={platformRadius}>
    <Platform radius={platformRadius} isWarning={shrinkWarning.isWarning} warningProgress={shrinkWarning.warningProgress} />
  </PhysicsProvider>
  ```
- **Code review fixes (2026-01-11):**
  - **Stateful event emission fix (server):** Changed `platformWarning` to only emit when warning state actually changes, instead of on every server tick (20 times/sec). Uses `previousWarningState` to track last emitted state and compares both `isWarning` boolean and `warningProgress` (with 0.05 threshold to avoid flooding on small changes).
    ```javascript
    // Track previous state
    let previousWarningState = { isWarning: false, warningProgress: 0 };

    // Only emit when state changes
    const warningChanged =
      previousWarningState.isWarning !== warningState.isWarning ||
      (warningState.isWarning &&
        Math.abs(previousWarningState.warningProgress - warningState.warningProgress) > 0.05);

    if (warningChanged) {
      io.emit('platformWarning', { ... });
      previousWarningState = { isWarning: warningState.isWarning, warningProgress: warningState.warningProgress };
    }
    ```
  - **Base radius pattern (client):** All Platform.jsx geometries now use `BASE_RADIUS = 1` instead of `PLATFORM.INITIAL_RADIUS`. The group is scaled directly to `currentRadiusRef.current` to animate size changes. This makes intent explicit and ensures all child elements (rings, lights) scale together.
    ```javascript
    const BASE_RADIUS = 1;

    // Geometries created with base radius
    const hexGeometry = useMemo(() => createHexagonGeometry(BASE_RADIUS, height), [height]);

    // In useFrame, scale equals the actual radius
    groupRef.current.scale.set(currentRadiusRef.current, 1, currentRadiusRef.current);

    // Ring geometries also use BASE_RADIUS
    <ringGeometry args={[BASE_RADIUS - 0.05, BASE_RADIUS + 0.1, 6]} />
    ```
  - **Child element scaling fix:** Warning glow ring, bottom edge glow ring, and edge point lights all now use `BASE_RADIUS` for positioning, ensuring they scale correctly with the parent group during shrink animations.
- **Network event emission pattern (CRITICAL):**
  ```javascript
  // WRONG - emitting every tick causes unnecessary network traffic and re-renders
  setInterval(() => {
    io.emit('stateUpdate', getState());
  }, 50);

  // RIGHT - track previous state, only emit on change
  let previousState = null;
  setInterval(() => {
    const currentState = getState();
    if (stateChanged(previousState, currentState)) {
      io.emit('stateUpdate', currentState);
      previousState = currentState;
    }
  }, 50);
  ```
  - For continuous values (like `warningProgress`), use a threshold to avoid spam: `Math.abs(prev - curr) > 0.05`
  - Reset state tracking when game resets to avoid stale comparisons
- **Scaling geometry pattern (THREE.js + React Three Fiber):**
  ```javascript
  // Create geometries at base scale (radius=1)
  const BASE_RADIUS = 1;
  const geometry = useMemo(() => createGeometry(BASE_RADIUS, height), [height]);

  // Scale the parent group to animate size changes
  // This is more performant than recreating geometry
  groupRef.current.scale.set(targetRadius, 1, targetRadius);

  // ALL child elements (rings, lights, etc.) must also use BASE_RADIUS
  // so they scale correctly with the parent
  <ringGeometry args={[BASE_RADIUS - 0.05, BASE_RADIUS + 0.1, 6]} />
  ```
  - Using a constant base radius makes the scaling intent explicit
  - Geometry memoization with `[height]` dependency is correct because radius changes are handled by scaling
  - Point lights and other positioned elements also need to use relative coordinates

### Story #16: Implement Elimination Detection
- **Date:** 2026-01-11
- **Elimination detection flow:**
  1. Server checks player Y position against `SERVER.FALL_THRESHOLD` (-5) every tick
  2. When player falls below threshold, server marks player as eliminated
  3. Server emits `playerEliminated` event with `{ id, name }`
  4. Client receives event and updates player state via useSocket hook
  5. Game.jsx watches for `isEliminated` changes and triggers elimination animation
  6. Animation plays (spin + shrink + particles), then calls `onComplete`
- **Components created:**
  - `EliminationAnimation.jsx` - 3D spinning/shrinking death animation with particles
  - `EliminatedOverlay.jsx` - 2D "ELIMINATED" text + spectator mode UI
- **Constants added to `src/client/utils/constants.js`:**
  ```javascript
  PHYSICS.FALL_THRESHOLD: -5, // Must match server
  ELIMINATION: {
    ANIMATION_DURATION: 2000, // 2 seconds
    SPIN_SPEED: 8,            // Rotation speed
    SHRINK_SPEED: 0.5,        // How fast player shrinks
    FALL_ACCELERATION: 0.02,  // Extra downward acceleration
  }
  ```
- **Position tracking pattern for elimination animations:**
  ```javascript
  // Use ref to track last known positions for all players
  const playerPositionsRef = useRef({});

  // Update on local player physics sync
  const handlePositionUpdate = useCallback((position, velocity) => {
    if (localPlayer) {
      playerPositionsRef.current[localPlayer.id] = position;
    }
    sendInput(position, velocity);
  }, [localPlayer, sendInput]);

  // For remote players, use targetPosition from socket state
  const lastPos = playerPositionsRef.current[player.id]
    || player.targetPosition
    || player.position
    || { x: 0, y: 1, z: 0 };
  ```
- **Spectator mode camera adjustments:**
  ```javascript
  <OrbitControls
    enablePan={isSpectating}              // Allow panning when spectating
    minDistance={isSpectating ? 5 : 10}   // Can zoom closer
    maxDistance={isSpectating ? 50 : 30}  // Can zoom further
    autoRotate={!isPlaying || isSpectating} // Auto-rotate when spectating
    autoRotateSpeed={isSpectating ? 0.3 : 0.5}
    maxPolarAngle={isSpectating ? Math.PI * 0.9 : Math.PI / 2} // Can look under platform
  />
  ```
- **Elimination animation cleanup pattern:**
  ```javascript
  // Clear eliminations when game resets
  useEffect(() => {
    if (gameState === GAME_STATES.LOBBY) {
      setEliminations([]);
      playerPositionsRef.current = {};
    }
  }, [gameState]);

  // Remove completed animations
  const handleEliminationComplete = useCallback((playerId) => {
    setEliminations((prev) => prev.filter((e) => e.id !== playerId));
  }, []);
  ```
- **Acceptance criteria verification:**
  1. ✅ Player falling below platform triggers elimination (Y < -5)
  2. ✅ Eliminated player sees Game Over screen (EliminatedOverlay with "ELIMINATED" text)
  3. ✅ Other players see elimination animation (EliminationAnimation with spin+shrink+particles)
  4. ✅ Eliminated player can spectate (camera controls enabled, auto-rotate, wider zoom range)
  5. ✅ Player count updates on elimination (GameStatusHUD shows alive count from players state)
- **Code review fix (2026-01-11) - Player count consistency:**
  - Consolidated player list traversal to use a single source of truth:
    ```javascript
    // In Game.jsx, before the return statement:
    const allPlayers = [localPlayer, ...Object.values(players)].filter(Boolean);
    const alivePlayers = allPlayers.filter((p) => !p.isEliminated);

    // Use consistent counts for EliminatedOverlay:
    <EliminatedOverlay
      alivePlayers={alivePlayers.length}
      totalPlayers={allPlayers.length}
      playerColor={localPlayer?.color}
    />
    ```
  - This ensures the eliminated player sees accurate remaining player count
- **Code review fix (2026-01-11) - Game end robustness:**
  - **Guard clause pattern:** Always add a guard at the start of state-changing functions:
    ```javascript
    function handleGameEnd(winner) {
      // Guard clause: prevent multiple calls if game already ended
      if (getGameState() === GAME_STATES.ENDED) return;
      setGameState(GAME_STATES.ENDED);
      // ... rest of logic
    }
    ```
  - **Batch processing pattern:** When checking multiple entities in a tick, process all actions first, then check for state transitions:
    ```javascript
    // Process all eliminations for this tick first
    let eliminatedThisTick = false;
    const alivePlayers = getAlivePlayers();
    alivePlayers.forEach((player) => {
      if (player.position.y < FALL_THRESHOLD) {
        if (eliminatePlayer(player.id)) {
          io.emit('playerEliminated', { id: player.id, name: player.name });
          eliminatedThisTick = true;
        }
      }
    });

    // Check for winner ONCE after all eliminations processed
    if (eliminatedThisTick) {
      const remaining = getAlivePlayers();
      if (remaining.length <= 1) {
        handleGameEnd(remaining[0] || null);
      }
    }
    ```
  - This prevents `handleGameEnd` from being called multiple times if two players fall off in the same tick

### Story #17: Create Victory Screen
- **Date:** 2026-01-11
- **Victory screen trigger:** Game ends when <= 1 player remains alive (server/index.js:86-91)
- **Components created/updated:**
  - `Confetti.jsx` - 3D React Three Fiber confetti particle system (created but not used - opted for CSS version)
  - `GameOverScreen.jsx` - Complete rewrite with enhanced visuals and celebration effects
- **CSS confetti pattern:** Used CSS animations instead of 3D particles for better performance:
  ```javascript
  // VictoryConfetti is a 2D CSS-based animation component
  const particles = useMemo(() => {
    return Array(100).fill().map((_, i) => ({
      left: Math.random() * 100,          // Random horizontal position
      delay: Math.random() * 3,            // Staggered start
      duration: 3 + Math.random() * 2,     // Varied fall speed
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      rotation: Math.random() * 360,
      size: 8 + Math.random() * 8,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
    }));
  }, [confettiColors]);
  ```
  - CSS keyframe animation handles falling + wobble + rotation
  - `pointer-events-none` ensures confetti doesn't block UI interaction
- **Winner name prominence:** Large (5xl) text with:
  - Color matching winner's player color
  - Glow effects using `textShadow` with the player color
  - Rounded container with gradient background and border in player color
  - Box shadow for outer glow effect
- **Host-only PLAY AGAIN button:** Conditional rendering based on `isHost` prop (line 239)
  - Non-host players see "Waiting for host to restart..." message
- **Broadcast pattern for game end:**
  ```javascript
  // Server uses io.emit for all-clients broadcast
  io.emit('gameEnd', { winner: { id, name, color } });

  // Client useSocket hook listens and updates state
  socket.on('gameEnd', ({ winner: gameWinner }) => {
    setGameState(GAME_STATES.ENDED);
    setWinner(gameWinner);
  });

  // Game.jsx shows GameOverScreen when gameState === ENDED
  const showGameOver = gameState === GAME_STATES.ENDED;
  {showGameOver && <GameOverScreen {...props} />}
  ```
- **Animated entry pattern:** Used React state + CSS transition for content reveal:
  ```javascript
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Apply transition classes based on state
  className={`transform transition-all duration-700 ${
    showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
  }`}
  ```
- **Acceptance criteria verification:**
  1. ✅ Victory screen shows when 1 player remains (server checks `remaining.length <= 1`)
  2. ✅ Winner name displayed prominently (5xl font, player color, glow effects)
  3. ✅ Confetti/particle celebration effect (CSS-based falling confetti animation)
  4. ✅ PLAY AGAIN button for host only (`{isHost && <button>...`)
  5. ✅ All clients see victory screen (`io.emit('gameEnd')` broadcasts to all)

### Story #18: Implement Secret Konami Code
- **Date:** 2026-01-11
- **Konami sequence:** UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT SPACE ENTER
- **Files created:**
  - `src/client/hooks/useKonamiCode.js` - Hook for detecting key sequence
  - `src/client/components/Shockwave.jsx` - 3D expanding shockwave visual effect
- **Files modified:**
  - `src/client/components/Game.jsx` - Integration of Konami detection and shockwave
  - `src/client/components/GameOverScreen.jsx` - Crown emoji fix for "ALL HAIL THE KING"
- **Key sequence detection pattern:**
  ```javascript
  const KONAMI_SEQUENCE = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'Space', 'Enter',
  ];

  // Normalize key codes for Space and Enter
  let key = event.code;
  if (key === 'Space' || event.key === ' ') key = 'Space';
  if (key === 'Enter' || key === 'NumpadEnter') key = 'Enter';

  // Wrong key handling - check if it starts a new sequence
  if (key === KONAMI_SEQUENCE[0]) {
    sequenceIndexRef.current = 1; // Don't reset to 0, count this keypress
  } else {
    resetSequence();
  }
  ```
- **Shockwave effect architecture:**
  - Uses React Three Fiber for 3D expanding rings
  - Two concentric rings with different speeds (inner faster)
  - Particle burst with outward velocities
  - Point lights for flash effect
  - Animation uses `useFrame` with elapsed time tracking
  - `onComplete` callback when animation finishes
- **State flow for Konami activation:**
  ```javascript
  // 1. useKonamiCode detects sequence, calls triggerKonami
  useKonamiCode(triggerKonami, isKonamiEnabled);

  // 2. triggerKonami emits 'konamiCode' to server (only during PLAYING state)
  socket.emit('konamiCode');

  // 3. Server eliminates all other players, broadcasts 'konamiActivated'
  io.emit('konamiActivated', { activator: { id, name, color } });

  // 4. Client receives konamiActivated, updates konamiActivator state
  // 5. useEffect triggers shockwave at activator's position
  // 6. Server calls handleGameEnd with Konami activator as winner
  // 7. GameOverScreen shows special "ALL HAIL THE KING" victory message
  ```
- **Enabling condition (CRITICAL):** Konami code only works during playing state:
  ```javascript
  const isKonamiEnabled = gameState === GAME_STATES.PLAYING
    && localPlayer
    && !localPlayer.isEliminated;
  useKonamiCode(triggerKonami, isKonamiEnabled);
  ```
  - Must check gameState === PLAYING (not LOBBY, COUNTDOWN, or ENDED)
  - Must have a localPlayer (has joined the game)
  - Must not be eliminated (still alive in game)
- **Sequence timeout:** 5 seconds to complete the full sequence, resets on timeout
- **Acceptance criteria verification:**
  1. ✅ Konami sequence: UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT SPACE ENTER
  2. ✅ Successful entry triggers shockwave effect (Shockwave.jsx component)
  3. ✅ All other players instantly eliminated (server handles in konamiCode event)
  4. ✅ Special victory message: "👑 ALL HAIL THE KING 👑" (GameOverScreen.jsx)
  5. ✅ Code only works during playing state (isKonamiEnabled check)
- **Code review fixes (2026-01-11):**
  - **Broadcast elimination events fix (server):** The `konamiCode` handler must emit `playerEliminated` events for each eliminated player, not just update server state. Without this, clients never see other players eliminated before the game-over screen appears.
    ```javascript
    // WRONG - only updates server state, clients don't know
    players.forEach((player) => {
      if (player.id !== socket.id) {
        eliminatePlayer(player.id);
      }
    });

    // RIGHT - broadcast each elimination so clients see it
    players.forEach((player) => {
      if (player.id !== socket.id) {
        eliminatePlayer(player.id);
        io.emit('playerEliminated', { id: player.id, name: player.name });
      }
    });
    ```
  - **State lifetime pattern (client):** Never clear UI-critical state on a timeout if it's needed by another component. The `konamiActivator` state is used by `GameOverScreen.jsx` to decide whether to show "ALL HAIL THE KING". Clearing it on a timeout causes a race condition.
    ```javascript
    // WRONG - creates race condition with GameOverScreen render timing
    socket.on('konamiActivated', ({ activator }) => {
      setKonamiActivator(activator);
      setTimeout(() => setKonamiActivator(null), 3000); // Race condition!
    });

    // RIGHT - only clear when game resets, not on timeout
    socket.on('konamiActivated', ({ activator }) => {
      setKonamiActivator(activator);
      // Cleared in gameReset handler, not on timeout
    });

    socket.on('gameReset', (data) => {
      // ...
      setKonamiActivator(null); // Safe to clear here
    });
    ```
  - **Rule:** If state is used by multiple components or affects UI during state transitions (like game-over screens), only clear it during explicit state resets, never on timeouts.

### Story #19: Add Mobile Touch Controls
- **Date:** 2026-01-11
- **Touch control architecture:** Touch and keyboard coexist by sharing the same input ref format
  - `useKeyboard` creates `keysRef` with `{ forward, backward, left, right, boost }`
  - `useTouch` modifies the same `keysRef` when touch input is active
  - When touch ends, all directional inputs are cleared, allowing keyboard to take over
- **Files created:**
  - `src/client/hooks/useTouch.js` - Touch input hook with drag-for-movement and tap-for-boost
  - `src/client/components/TouchJoystick.jsx` - Visual on-screen joystick indicator
  - `src/client/components/TouchControlsHint.jsx` - First-time tutorial overlay for mobile users
- **Constants added to `src/client/utils/constants.js`:**
  ```javascript
  export const TOUCH = {
    DRAG_THRESHOLD: 10,        // Min pixels before drag is intentional
    TAP_MAX_DURATION: 200,     // Max ms for tap (vs drag)
    TAP_MAX_DISTANCE: 15,      // Max pixels for tap (vs drag)
    DEAD_ZONE: 5,              // Ignore movements smaller than this
    MAX_DRAG_DISTANCE: 100,    // Full speed at this drag distance
    DIRECTION_THRESHOLD: 0.3,  // Threshold (0-1) for activating direction
  };
  ```
- **Touch detection pattern:**
  ```javascript
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  ```
- **Input coexistence pattern (CRITICAL):**
  ```javascript
  // useTouch modifies the same ref that useKeyboard creates
  const keysRef = useKeyboard();  // Creates ref with directions
  useTouch(keysRef, onBoostTap);  // Modifies same ref during touch

  // In useTouch, when touch ends:
  const clearDirectionalInput = useCallback(() => {
    if (keysRef?.current) {
      keysRef.current.forward = false;
      keysRef.current.backward = false;
      keysRef.current.left = false;
      keysRef.current.right = false;
    }
  }, [keysRef]);
  ```
  - Touch updates keysRef while dragging
  - On touch end, all directions are cleared
  - Keyboard can immediately take over since it also updates keysRef
  - No conflict because they both write to the same ref
- **Tap vs Drag detection:**
  ```javascript
  // In handleTouchEnd:
  const touchDuration = Date.now() - touchStartTimeRef.current;
  const wasDragging = isDraggingRef.current;

  // Tap = short duration AND didn't exceed drag threshold
  if (!wasDragging && touchDuration <= TOUCH.TAP_MAX_DURATION) {
    onBoostTap();  // Trigger boost
  }
  ```
  - `isDraggingRef` is set to true when movement exceeds `DRAG_THRESHOLD`
  - If touch ends without dragging and within `TAP_MAX_DURATION`, it's a tap
- **Joystick visual positioning:**
  ```javascript
  // Position base at touch start point
  const baseX = touchState.dragStart.x - baseSize / 2;
  const baseY = touchState.dragStart.y - baseSize / 2;

  // Position knob based on normalized joystick position (-1 to 1)
  const knobOffsetX = joystickPosition.x * maxOffset;
  const knobOffsetY = joystickPosition.y * maxOffset;
  ```
- **Touch event listener setup:**
  ```javascript
  // Use passive: false for touchmove to allow preventDefault (prevent scroll)
  window.addEventListener('touchmove', handleTouchMove, { passive: false });

  // Other events can be passive for performance
  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  ```
- **Session-based hint display:**
  ```javascript
  // Show touch controls hint only once per session
  const hasSeenHint = sessionStorage.getItem('touchHintShown');
  if (!hasSeenHint) {
    setShowTouchHint(true);
    sessionStorage.setItem('touchHintShown', 'true');
  }
  ```
- **Acceptance criteria verification:**
  1. ✅ Touch/drag anywhere moves player (useTouch updates keysRef directions)
  2. ✅ Tap triggers boost (tap detection in handleTouchEnd calls onBoostTap)
  3. ✅ On-screen joystick visual (TouchJoystick.jsx shows during drag)
  4. ✅ Works on iOS and Android browsers (uses standard touch events)
  5. ✅ Touch and keyboard can coexist (both modify same keysRef)
- **Code review fixes (2026-01-11):**
  - **Input coexistence fix:** When touch ends, only clear the directional keys that touch was actively controlling. This prevents stomping on keyboard state if the user is holding a key while tapping the screen.
    ```javascript
    // WRONG - unconditionally clears all directions, breaks keyboard
    const clearDirectionalInput = useCallback(() => {
      keysRef.current.forward = false;
      keysRef.current.backward = false;
      keysRef.current.left = false;
      keysRef.current.right = false;
    }, [keysRef]);

    // RIGHT - only clear what touch was controlling
    const clearDirectionalInput = useCallback(() => {
      if (activeDirectionRef.current.forward) keysRef.current.forward = false;
      if (activeDirectionRef.current.backward) keysRef.current.backward = false;
      if (activeDirectionRef.current.left) keysRef.current.left = false;
      if (activeDirectionRef.current.right) keysRef.current.right = false;
      activeDirectionRef.current = { forward: false, backward: false, left: false, right: false };
    }, [keysRef]);
    ```
  - **Tap detection robustness:** A tap must satisfy BOTH duration AND distance constraints. Short slow drags might not exceed `DRAG_THRESHOLD` but should not register as taps if they moved more than `TAP_MAX_DISTANCE`.
    ```javascript
    // WRONG - only checks duration and isDragging flag
    if (!isDraggingRef.current && touchDuration <= TOUCH.TAP_MAX_DURATION) {
      onBoostTap();
    }

    // RIGHT - also checks distance moved
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (
      !isDraggingRef.current &&
      touchDuration <= TOUCH.TAP_MAX_DURATION &&
      distance <= TOUCH.TAP_MAX_DISTANCE
    ) {
      onBoostTap();
    }
    ```
  - **Pattern: Input state tracking:** When one input source needs to modify shared state (like keysRef) without interfering with another source, track what the first source is controlling (activeDirectionRef) and only clear those specific entries on release.

### Story #20: Visual Polish and Particle Effects
- **Date:** 2026-01-11
- **Components created:**
  - `src/client/components/PlayerTrail.jsx` - Particle trail effect that follows player movement
  - `src/client/hooks/useScreenShake.js` - Spring-damped camera shake for big impacts
- **Components enhanced:**
  - `CollisionSparks.jsx` - Multi-layer spark system with primary/secondary/smoke particles, shockwave ring, flash
  - `EliminationAnimation.jsx` - Multi-layer explosion with energy/debris/smoke/spark particles
- **Visual effects implemented:**
  1. **Particle trail on movement** - Particles emitted when player moves, fading as they rise
  2. **Spark particles on collision** - Enhanced with 3 particle types, ring shockwave, central flash
  3. **Explosion particles on elimination** - 4 particle types (energy, debris, smoke, sparks), ring expansion
  4. **Screen shake on big impacts** - Spring-damped shake triggered when `impactSpeed > 1.5`
  5. **Camera slowly orbits during gameplay** - `autoRotateSpeed={0.15}` during PLAYING state
- **Particle system architecture:**
  ```javascript
  // Multi-type particle system pattern
  const particles = useMemo(() => {
    const particleData = [];

    // Primary particles (fast, bright)
    for (let i = 0; i < 30; i++) {
      particleData.push({
        type: 'energy',
        velocity: { ... },
        lifetime: 0.5,
        // Different physics per type
      });
    }

    // Secondary particles (debris, smoke, etc.)
    // ...

    return particleData;
  }, []);
  ```
  - Each particle type has unique physics (gravity, drag, lifetime)
  - Debris uses box geometry and tumbles with rotation
  - Smoke expands over time rather than shrinking
- **Screen shake with OrbitControls pattern (CRITICAL FIX):**
  ```javascript
  // WRONG - Directly modifying camera position conflicts with OrbitControls
  // OrbitControls continuously updates camera.position during autoRotate,
  // so storing "originalPosition" and resetting to it will fight the controls.
  function useScreenShake() {
    const { camera } = useThree();
    const triggerShake = useCallback(() => {
      // This captures a stale position that OrbitControls will immediately overwrite
      shakeRef.current.originalPosition = { ...camera.position };
    }, [camera]);
    // ...
    camera.position.x = originalPosition.x + offset; // CONFLICTS with orbit!
  }

  // RIGHT - Use a camera rig group as parent, apply shake to the group
  // OrbitControls moves camera within the group, shake moves the group itself
  function CameraRig({ children, onBigImpact }) {
    const groupRef = useRef();
    const { triggerShake } = useScreenShake(groupRef);

    useEffect(() => {
      if (onBigImpact) onBigImpact.current = triggerShake;
    }, [onBigImpact, triggerShake]);

    return <group ref={groupRef}>{children}</group>;
  }

  function useScreenShake(cameraRigRef) {
    // Apply offsets to the rig group, not the camera
    useFrame(() => {
      if (cameraRigRef?.current) {
        cameraRigRef.current.position.set(offsetX, offsetY, offsetZ);
      }
    });
  }

  // Usage in Canvas:
  <Canvas>
    <CameraRig onBigImpact={shakeRef}>
      <PhysicsScene ... />
      <OrbitControls autoRotate={true} /> {/* Controls camera within rig */}
    </CameraRig>
  </Canvas>
  ```
  - **Key insight:** OrbitControls and screen shake are both trying to set camera position. By using a parent group, they operate on different objects and compose correctly.
  - **Rule:** When combining camera effects (shake, follow, etc.) with OrbitControls, use a group hierarchy to separate concerns.
- **Passing R3F context functions to parent pattern:**
  ```javascript
  // Since useScreenShake needs useFrame(), it must be called inside Canvas
  // Use a ref to expose the trigger function to parent component

  // Parent (outside Canvas):
  const shakeRef = useRef(null);
  const handleCollision = useCallback((collision) => {
    if (collision.impactSpeed > 1.5 && shakeRef.current) {
      shakeRef.current(collision.impactSpeed);
    }
  }, []);

  // CameraRig (inside Canvas):
  function CameraRig({ onBigImpact }) {
    const { triggerShake } = useScreenShake(groupRef);
    useEffect(() => {
      if (onBigImpact) {
        onBigImpact.current = triggerShake;
      }
    }, [onBigImpact, triggerShake]);
    return <group ref={groupRef}>{children}</group>;
  }
  ```
- **Camera orbit configuration:**
  ```javascript
  <OrbitControls
    autoRotate={true}
    autoRotateSpeed={isSpectating ? 0.3 : isPlaying ? 0.15 : 0.5}
    // 0.15 during gameplay = slow cinematic orbit
    // 0.3 when spectating = slightly faster for viewing
    // 0.5 in lobby = faster to show off the scene
  />
  ```
- **Velocity-based trail emission:**
  ```javascript
  // Only emit particles when player is actually moving
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
  const shouldEmit = speed > 0.3 && time - lastEmitTimeRef.current >= EMIT_INTERVAL;

  // Particles move opposite to velocity (trail behind player)
  particle.velocity.set(
    -velocity.x * 0.3 + randomSpread,
    0.2 + Math.random() * 0.3,
    -velocity.z * 0.3 + randomSpread
  );
  ```
- **Acceptance criteria verification:**
  1. ✅ Particle trail on player movement (PlayerTrail.jsx attached to PhysicsPlayer)
  2. ✅ Spark particles on collision (Enhanced CollisionSparks with multi-layer particles)
  3. ✅ Explosion particles on elimination (Enhanced EliminationAnimation with 4 particle types)
  4. ✅ Screen shake on big impacts (useScreenShake triggered when impactSpeed > 1.5)
  5. ✅ Camera slowly orbits during gameplay (autoRotateSpeed=0.15 when isPlaying)

