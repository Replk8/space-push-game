/**
 * Server-side constants for SPACE PUSH
 * These mirror the client constants for server-authoritative game state
 */

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
  SHRINK_INTERVAL: 30000, // Shrink every 30 seconds
  SHRINK_AMOUNT: 2, // Shrink by 2 units each time
  SHRINK_WARNING_TIME: 5000, // Warning starts 5 seconds before shrink
};

// Server tick rate
export const SERVER = {
  TICK_RATE: 20, // 20 updates per second to clients
  TICK_INTERVAL: 50, // 1000ms / 20 = 50ms between updates
  FALL_THRESHOLD: -5, // Y position below which player is eliminated
};

// Countdown settings
export const COUNTDOWN = {
  DURATION: 3, // 3 seconds countdown
};

// Player limits
export const PLAYERS = {
  MAX_PLAYERS: 40, // Maximum concurrent players per game
};
