/**
 * GameState - Centralized game state management for SPACE PUSH
 * Server is authoritative for all game state
 */

import { PLAYER_COLORS, GAME_STATES, PLATFORM } from './constants.js';

// Current game state
let gameState = GAME_STATES.LOBBY;

// Map of player ID -> player data
const players = new Map();

// Host player ID (first player to join)
let hostId = null;

// Platform state
let platformRadius = PLATFORM.INITIAL_RADIUS;

// Game timing
let gameStartTime = null;
let lastShrinkTime = null;

/**
 * Create a new player
 * @param {string} id - Socket ID
 * @param {string} name - Player display name
 * @returns {Object} Player object
 */
export function createPlayer(id, name) {
  const colorIndex = players.size % PLAYER_COLORS.length;
  const spawnAngle = Math.random() * Math.PI * 2;
  const spawnRadius = Math.random() * 3 + 2; // Spawn 2-5 units from center

  const player = {
    id,
    name: name || `Player${players.size + 1}`,
    color: PLAYER_COLORS[colorIndex],
    colorIndex,
    position: {
      x: Math.cos(spawnAngle) * spawnRadius,
      y: 1, // Above platform
      z: Math.sin(spawnAngle) * spawnRadius,
    },
    velocity: { x: 0, y: 0, z: 0 },
    isEliminated: false,
    isReady: false,
    
    // Scoring metrics
    score: 0,
    eliminations: 0,           // How many players this player eliminated
    survivalTime: 0,           // Time spent in bounds (seconds)
    outOfBoundsTime: 0,        // Cumulative time out of bounds (seconds)
    
    // Tracking state
    isOutOfBounds: false,      // Current boundary state
    outOfBoundsStartTime: null, // When they went out of bounds
    gameStartTime: null,       // When they started this round
    lastHitBy: null,           // { id, name, timestamp } - for elimination attribution
    
    joinedAt: Date.now(),
  };

  players.set(id, player);

  // First player becomes host
  if (!hostId) {
    hostId = id;
  }

  return player;
}

/**
 * Remove a player
 * @param {string} id - Socket ID
 * @returns {Object|null} Removed player or null
 */
export function removePlayer(id) {
  const player = players.get(id);
  if (player) {
    players.delete(id);

    // If host leaves, assign new host (player who joined earliest)
    if (hostId === id) {
      if (players.size > 0) {
        const sortedPlayers = Array.from(players.values()).sort(
          (a, b) => a.joinedAt - b.joinedAt
        );
        hostId = sortedPlayers[0].id;
      } else {
        hostId = null;
      }
    }
  }
  return player;
}

/**
 * Get a player by ID
 * @param {string} id - Socket ID
 * @returns {Object|undefined} Player object
 */
export function getPlayer(id) {
  return players.get(id);
}

/**
 * Get all players
 * @returns {Object[]} Array of all players
 */
export function getAllPlayers() {
  return Array.from(players.values());
}

/**
 * Get player count
 * @returns {number} Number of players
 */
export function getPlayerCount() {
  return players.size;
}

/**
 * Get host ID
 * @returns {string|null} Host socket ID
 */
export function getHostId() {
  return hostId;
}

/**
 * Check if player is host
 * @param {string} id - Socket ID
 * @returns {boolean}
 */
export function isHost(id) {
  return hostId === id;
}

/**
 * Update player position
 * @param {string} id - Socket ID
 * @param {Object} position - { x, y, z }
 * @param {Object} velocity - { x, y, z }
 */
export function updatePlayerPosition(id, position, velocity) {
  const player = players.get(id);
  if (player && !player.isEliminated) {
    player.position = { ...position };
    if (velocity) {
      player.velocity = { ...velocity };
    }
    player.lastUpdate = Date.now();
  }
}

/**
 * Eliminate a player
 * @param {string} id - Socket ID
 * @returns {boolean} True if player was eliminated
 */
export function eliminatePlayer(id) {
  const player = players.get(id);
  if (player && !player.isEliminated) {
    player.isEliminated = true;
    player.eliminatedAt = Date.now();
    return true;
  }
  return false;
}

/**
 * Get alive players (not eliminated)
 * @returns {Object[]} Array of alive players
 */
export function getAlivePlayers() {
  return Array.from(players.values()).filter((p) => !p.isEliminated);
}

/**
 * Get current game state
 * @returns {string} Game state
 */
export function getGameState() {
  return gameState;
}

/**
 * Set game state
 * @param {string} state - New game state
 */
export function setGameState(state) {
  gameState = state;
  if (state === GAME_STATES.PLAYING) {
    gameStartTime = Date.now();
    lastShrinkTime = gameStartTime;
  }
}

/**
 * Get platform radius
 * @returns {number} Current platform radius
 */
export function getPlatformRadius() {
  return platformRadius;
}

/**
 * Shrink platform
 * @param {number} newRadius - New radius
 */
export function shrinkPlatform(newRadius) {
  platformRadius = Math.max(newRadius, PLATFORM.MIN_RADIUS);
  lastShrinkTime = Date.now();
}

/**
 * Get time since last shrink
 * @returns {number} Milliseconds since last shrink, or 0 if game hasn't started
 */
export function getTimeSinceLastShrink() {
  if (!lastShrinkTime) return 0;
  return Date.now() - lastShrinkTime;
}

/**
 * Check if platform should shrink based on time elapsed
 * @param {number} shrinkInterval - Milliseconds between shrinks
 * @returns {boolean} True if platform should shrink
 */
export function shouldShrinkPlatform(shrinkInterval) {
  if (!lastShrinkTime) return false;
  const timeSinceLastShrink = Date.now() - lastShrinkTime;
  return timeSinceLastShrink >= shrinkInterval;
}

/**
 * Get time until next shrink
 * @param {number} shrinkInterval - Milliseconds between shrinks
 * @returns {number} Milliseconds until next shrink, or -1 if game hasn't started
 */
export function getTimeUntilNextShrink(shrinkInterval) {
  if (!lastShrinkTime) return -1;
  const timeSinceLastShrink = Date.now() - lastShrinkTime;
  return Math.max(0, shrinkInterval - timeSinceLastShrink);
}

/**
 * Check if shrink warning should be active
 * @param {number} shrinkInterval - Milliseconds between shrinks
 * @param {number} warningTime - Warning window in milliseconds before shrink
 * @returns {{ isWarning: boolean, warningProgress: number }} Warning state and progress (0-1)
 */
export function getShrinkWarningState(shrinkInterval, warningTime) {
  if (!lastShrinkTime || platformRadius <= PLATFORM.MIN_RADIUS) {
    return { isWarning: false, warningProgress: 0 };
  }

  const timeUntilShrink = getTimeUntilNextShrink(shrinkInterval);
  const isWarning = timeUntilShrink <= warningTime && timeUntilShrink > 0;

  if (isWarning) {
    // Progress goes from 0 (just started warning) to 1 (about to shrink)
    const warningProgress = 1 - (timeUntilShrink / warningTime);
    return { isWarning, warningProgress };
  }

  return { isWarning: false, warningProgress: 0 };
}

/**
 * Reset game state for new round
 */
export function resetGame() {
  gameState = GAME_STATES.LOBBY;
  platformRadius = PLATFORM.INITIAL_RADIUS;
  gameStartTime = null;
  lastShrinkTime = null;

  // Reset all player states
  players.forEach((player) => {
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnRadius = Math.random() * 3 + 2;
    player.position = {
      x: Math.cos(spawnAngle) * spawnRadius,
      y: 1,
      z: Math.sin(spawnAngle) * spawnRadius,
    };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.isEliminated = false;
    player.isReady = false;
    
    // Reset scoring
    player.score = 0;
    player.eliminations = 0;
    player.survivalTime = 0;
    player.outOfBoundsTime = 0;
    player.isOutOfBounds = false;
    player.outOfBoundsStartTime = null;
    player.gameStartTime = null;
    player.lastHitBy = null;
  });
}

/**
 * Set player ready status
 * @param {string} id - Socket ID
 * @param {boolean} ready - Ready status
 */
export function setPlayerReady(id, ready) {
  const player = players.get(id);
  if (player) {
    player.isReady = ready;
  }
}

/**
 * Get full state snapshot for syncing
 * @returns {Object} Full game state
 */
export function getStateSnapshot() {
  return {
    gameState,
    players: getAllPlayers(),
    hostId,
    platformRadius,
    timestamp: Date.now(),
  };
}

/**
 * Get minimal state for frequent updates (positions only)
 * @returns {Object} Minimal state with positions
 */
export function getPositionSnapshot() {
  const positions = {};
  players.forEach((player, id) => {
    if (!player.isEliminated) {
      positions[id] = {
        position: player.position,
        velocity: player.velocity,
      };
    }
  });
  return {
    positions,
    timestamp: Date.now(),
  };
}

/**
 * Record collision between two players for elimination attribution
 * @param {string} playerId - Player who got hit
 * @param {string} hitterId - Player who did the hitting
 */
export function recordCollision(playerId, hitterId) {
  const player = players.get(playerId);
  const hitter = players.get(hitterId);
  
  if (player && hitter && !player.isEliminated && !hitter.isEliminated) {
    player.lastHitBy = {
      id: hitter.id,
      name: hitter.name,
      timestamp: Date.now(),
    };
  }
}

/**
 * Check and update boundary status for a player
 * @param {string} id - Player ID
 * @param {number} platformRadius - Current platform radius
 * @returns {boolean} True if player should be eliminated
 */
export function updateBoundaryStatus(id, platformRadius) {
  const player = players.get(id);
  if (!player || player.isEliminated) return false;
  
  const now = Date.now();
  const distance = Math.sqrt(player.position.x ** 2 + player.position.z ** 2);
  const isCurrentlyOutOfBounds = distance > platformRadius + 1 || player.position.y < -1;
  
  // State change: went out of bounds
  if (isCurrentlyOutOfBounds && !player.isOutOfBounds) {
    player.isOutOfBounds = true;
    player.outOfBoundsStartTime = now;
  }
  // State change: came back in bounds
  else if (!isCurrentlyOutOfBounds && player.isOutOfBounds) {
    player.isOutOfBounds = false;
    
    // Add time spent out of bounds
    if (player.outOfBoundsStartTime) {
      const timeOut = (now - player.outOfBoundsStartTime) / 1000; // Convert to seconds
      player.outOfBoundsTime += timeOut;
    }
    player.outOfBoundsStartTime = null;
  }
  // Still out of bounds - check if should eliminate
  else if (isCurrentlyOutOfBounds && player.isOutOfBounds) {
    if (player.outOfBoundsStartTime) {
      const currentOutTime = (now - player.outOfBoundsStartTime) / 1000;
      const totalOutTime = player.outOfBoundsTime + currentOutTime;
      
      // Eliminate after 10 seconds cumulative out of bounds time
      if (totalOutTime >= 10) {
        // Finalize out of bounds time
        player.outOfBoundsTime = totalOutTime;
        player.outOfBoundsStartTime = null;
        return true; // Should be eliminated
      }
    }
  }
  
  // Update survival time (only when in bounds and not eliminated)
  if (!player.isEliminated && !player.isOutOfBounds && player.gameStartTime) {
    player.survivalTime = (now - player.gameStartTime) / 1000;
  }
  
  return false;
}

/**
 * Eliminate player with attribution
 * @param {string} id - Player ID to eliminate
 * @param {string} reason - 'boundary' | 'fall' | 'pushed'
 * @returns {Object|null} Elimination info with attribution
 */
export function eliminatePlayerWithAttribution(id, reason = 'boundary') {
  const player = players.get(id);
  if (!player || player.isEliminated) return null;
  
  player.isEliminated = true;
  player.eliminatedAt = Date.now();
  
  // Attribution: who gets credit for this elimination?
  let eliminatedBy = null;
  
  if (reason === 'pushed' && player.lastHitBy) {
    // Check if hit was recent (within last 3 seconds)
    const timeSinceHit = Date.now() - player.lastHitBy.timestamp;
    if (timeSinceHit < 3000) {
      const hitter = players.get(player.lastHitBy.id);
      if (hitter && !hitter.isEliminated) {
        hitter.eliminations += 1;
        eliminatedBy = {
          id: hitter.id,
          name: hitter.name,
        };
      }
    }
  }
  
  // Calculate final score
  calculatePlayerScore(id);
  
  return {
    playerId: id,
    playerName: player.name,
    reason,
    eliminatedBy,
    finalScore: player.score,
  };
}

/**
 * Calculate composite score for a player
 * Formula: (Eliminations × 100) + SurvivalTime - (OutOfBoundsTime × 10)
 * @param {string} id - Player ID
 */
export function calculatePlayerScore(id) {
  const player = players.get(id);
  if (!player) return;
  
  // If currently out of bounds, add current out time to total
  let totalOutTime = player.outOfBoundsTime;
  if (player.isOutOfBounds && player.outOfBoundsStartTime) {
    totalOutTime += (Date.now() - player.outOfBoundsStartTime) / 1000;
  }
  
  // Calculate survival time
  let survivalTime = player.survivalTime;
  if (!player.isEliminated && player.gameStartTime && !player.isOutOfBounds) {
    survivalTime = (Date.now() - player.gameStartTime) / 1000;
  }
  
  player.score = Math.max(0, 
    (player.eliminations * 100) + 
    survivalTime - 
    (totalOutTime * 10)
  );
}

/**
 * Get score snapshot for all players
 * @returns {Object[]} Array of player scores sorted by score descending
 */
export function getScoreSnapshot() {
  const scores = [];
  
  players.forEach((player) => {
    // Update score before sending
    calculatePlayerScore(player.id);
    
    // Calculate current out of bounds time
    let currentOutTime = player.outOfBoundsTime;
    if (player.isOutOfBounds && player.outOfBoundsStartTime) {
      currentOutTime += (Date.now() - player.outOfBoundsStartTime) / 1000;
    }
    
    let survivalTime = player.survivalTime;
    if (!player.isEliminated && player.gameStartTime && !player.isOutOfBounds) {
      survivalTime = (Date.now() - player.gameStartTime) / 1000;
    }
    
    scores.push({
      id: player.id,
      name: player.name,
      color: player.color,
      score: Math.round(player.score),
      eliminations: player.eliminations,
      survivalTime: Math.round(survivalTime * 10) / 10, // 1 decimal
      outOfBoundsTime: Math.round(currentOutTime * 10) / 10,
      isEliminated: player.isEliminated,
      isOutOfBounds: player.isOutOfBounds,
    });
  });
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  return scores;
}

/**
 * Initialize game start time for all players
 */
export function initializeGameTimes() {
  const now = Date.now();
  players.forEach((player) => {
    if (!player.isEliminated) {
      player.gameStartTime = now;
      player.survivalTime = 0;
      player.outOfBoundsTime = 0;
      player.isOutOfBounds = false;
      player.outOfBoundsStartTime = null;
    }
  });
}
