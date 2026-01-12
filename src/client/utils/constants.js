// Dynamic scaling based on player count
export function getPlayerScale(playerCount) {
  // 2 players = 1.5x size, 40 players = 0.5x size
  const minPlayers = 2;
  const maxPlayers = 40;
  const minScale = 0.5;
  const maxScale = 1.5;
  
  const normalized = Math.max(0, Math.min(1, (playerCount - minPlayers) / (maxPlayers - minPlayers)));
  return maxScale - (normalized * (maxScale - minScale));
}

export function getPlatformScale(playerCount) {
  // 2 players = 1.0x size, 40 players = 2.0x size
  const minPlayers = 2;
  const maxPlayers = 40;
  const minScale = 1.0;
  const maxScale = 2.0;
  
  const normalized = Math.max(0, Math.min(1, (playerCount - minPlayers) / (maxPlayers - minPlayers)));
  return minScale + (normalized * (maxScale - minScale));
}

// Player color palette - neon colors for visibility against space background
export const PLAYER_COLORS = [
  '#ff4444', // Red
  '#44ff44', // Green
  '#4444ff', // Blue
  '#ffff44', // Yellow
  '#ff44ff', // Magenta
  '#44ffff', // Cyan
  '#ff8844', // Orange
  '#88ff44', // Lime
  '#4488ff', // Sky blue
  '#ff4488', // Pink
  '#44ff88', // Mint
  '#8844ff', // Purple
];

// Game states
export const GAME_STATES = {
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  ENDED: 'ended',
};

// Platform settings
export const PLATFORM = {
  INITIAL_RADIUS: 10,
  MIN_RADIUS: 4,
  HEIGHT: 0.5,
  SHRINK_INTERVAL: 30000, // Shrink every 30 seconds (must match server)
  SHRINK_WARNING_TIME: 5000, // Warning starts 5 seconds before shrink (must match server)
};

// Player settings
export const PLAYER = {
  RADIUS: 0.5,
  HEIGHT: 1.2, // For capsule shape
  GLOW_INTENSITY: 0.8,
  LABEL_HEIGHT: 1.5, // Height above player for name label
};

// Movement physics - tuned for zero-G floaty feel
// Note: PHYSICS_ prefixed values are scaled for cannon-es physics forces
export const MOVEMENT = {
  ACCELERATION: 0.015, // How fast player accelerates (lower = more floaty) - for direct position updates
  MAX_SPEED: 0.12, // Maximum velocity - for direct position updates
  FRICTION: 0.98, // Drag coefficient (0.98 = 2% slowdown per frame, very slippery)
  BOOST_MULTIPLIER: 2.5, // Speed multiplier when boosting (legacy - kept for compatibility)
  // Physics-scaled values (for cannon-es force application)
  PHYSICS_ACCELERATION: 3.0, // Increased from 0.75 for better responsiveness
  PHYSICS_MAX_SPEED: 4.0, // Increased from 1.2 for faster movement
};

// Boost/Dash mechanics
export const BOOST = {
  COOLDOWN: 1500, // Cooldown duration in milliseconds (1.5 seconds)
  IMPULSE_STRENGTH: 0.4, // Instant velocity boost applied on spacebar - for direct position updates
  MAX_BOOSTED_SPEED: 0.35, // Maximum speed while boosted (higher than normal) - for direct position updates
  DURATION: 200, // How long the boost effect lasts in ms (for visual trail)
  // Physics-scaled values (for cannon-es impulse application)
  PHYSICS_IMPULSE_STRENGTH: 8, // 0.4 * 20 - Impulse magnitude for physics bodies
  PHYSICS_MAX_BOOSTED_SPEED: 3.5, // 0.35 * 10 - Max velocity during boost for physics bodies
};

// Key mappings for controls
export const KEYS = {
  ArrowUp: 'forward',
  ArrowDown: 'backward',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Space: 'boost',
  Enter: 'ready',
};

// Scene colors
export const COLORS = {
  platform: '#00ffff',
  platformEdge: '#ff00ff',
  background: '#0a0a1a',
};

// Physics settings for Cannon-es
export const PHYSICS = {
  GRAVITY: -0.5, // Low gravity for floaty feel
  TIMESTEP: 1 / 60, // Physics runs at 60fps
  MAX_SUBSTEPS: 3, // Maximum physics substeps per frame
  PLAYER_MASS: 1, // Player body mass
  PLAYER_RADIUS: 0.5, // Collision sphere radius
  PLAYER_LINEAR_DAMPING: 0.05, // Adds drag to slow players (reduced from 0.3 for better movement)
  PLAYER_ANGULAR_DAMPING: 0.9, // Prevents excessive spinning
  PLATFORM_FRICTION: 0.3, // Friction between player and platform
  PLAYER_RESTITUTION: 0.5, // Bounciness on collision (0-1)
  COLLISION_FORCE_MULTIPLIER: 2.5, // Amplifies push force on player-player collision
  FALL_THRESHOLD: -5, // Y position below which player is eliminated (must match server)
};

// Elimination animation settings
export const ELIMINATION = {
  ANIMATION_DURATION: 2000, // Duration of elimination animation in ms
  SPIN_SPEED: 8, // Rotation speed during elimination
  SHRINK_SPEED: 0.5, // How fast player shrinks during elimination
  FALL_ACCELERATION: 0.02, // Extra downward acceleration during elimination
};

// Touch control settings (mobile)
export const TOUCH = {
  DRAG_THRESHOLD: 10, // Minimum distance in pixels before drag is intentional movement
  TAP_MAX_DURATION: 200, // Maximum time in ms for a tap to be boost (not drag)
  TAP_MAX_DISTANCE: 15, // Maximum distance in pixels for a tap (not drag)
  DEAD_ZONE: 5, // Dead zone radius in pixels - smaller movements ignored
  MAX_DRAG_DISTANCE: 100, // Maximum drag distance that maps to full speed
  DIRECTION_THRESHOLD: 0.3, // Threshold (0-1) for activating a direction
};
