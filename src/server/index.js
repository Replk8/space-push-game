import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  createPlayer,
  removePlayer,
  getPlayer,
  getAllPlayers,
  getPlayerCount,
  getHostId,
  isHost,
  updatePlayerPosition,
  eliminatePlayer,
  getAlivePlayers,
  getGameState,
  setGameState,
  getPlatformRadius,
  shrinkPlatform,
  shouldShrinkPlatform,
  getShrinkWarningState,
  resetGame,
  setPlayerReady,
  getStateSnapshot,
  getPositionSnapshot,
  updateBoundaryStatus,
  eliminatePlayerWithAttribution,
  getScoreSnapshot,
  initializeGameTimes,
  recordCollision,
} from './gameState.js';
import { GAME_STATES, SERVER, COUNTDOWN, PLATFORM, PLAYERS } from './constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Serve static files from dist folder (production build)
app.use(express.static(join(__dirname, '../../dist')));

// Serve static files from public folder (fallback)
app.use(express.static(join(__dirname, '../../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../../dist/index.html'));
});

// Game loop interval reference
let gameLoopInterval = null;
let countdownInterval = null;
let scoreUpdateInterval = null;
// Track previous warning state to only emit on change
let previousWarningState = { isWarning: false, warningProgress: 0 };

/**
 * Start the game loop for position broadcasting
 */
function startGameLoop() {
  if (gameLoopInterval) return;

  gameLoopInterval = setInterval(() => {
    const state = getGameState();

    if (state === GAME_STATES.PLAYING) {
      // Broadcast position updates to all clients
      const positionSnapshot = getPositionSnapshot();
      io.emit('positionUpdate', positionSnapshot);

      const currentRadius = getPlatformRadius();
      const alivePlayers = getAlivePlayers();

      // Check boundary status for all alive players
      let anyEliminated = false;
      alivePlayers.forEach((player) => {
        // Check boundary and get elimination status
        const shouldEliminate = updateBoundaryStatus(player.id, currentRadius);
        
        if (shouldEliminate) {
          // Eliminate with attribution
          const eliminationInfo = eliminatePlayerWithAttribution(player.id, 'boundary');
          
          if (eliminationInfo) {
            io.emit('playerEliminated', {
              id: eliminationInfo.playerId,
              name: eliminationInfo.playerName,
              reason: eliminationInfo.reason,
              eliminatedBy: eliminationInfo.eliminatedBy,
            });
            anyEliminated = true;
          }
        }

        // Also check for fall deaths (instant)
        if (player.position.y < SERVER.FALL_THRESHOLD) {
          const eliminationInfo = eliminatePlayerWithAttribution(player.id, 'pushed');
          if (eliminationInfo) {
            io.emit('playerEliminated', {
              id: eliminationInfo.playerId,
              name: eliminationInfo.playerName,
              reason: eliminationInfo.reason,
              eliminatedBy: eliminationInfo.eliminatedBy,
            });
            anyEliminated = true;
          }
        }
      });

      // Check for winner after processing all eliminations
      if (anyEliminated) {
        const remaining = getAlivePlayers();
        if (remaining.length <= 1) {
          handleGameEnd(remaining[0] || null);
        }
      }

      // Check for shrink warning state and broadcast to clients only when state changes
      const warningState = getShrinkWarningState(
        PLATFORM.SHRINK_INTERVAL,
        PLATFORM.SHRINK_WARNING_TIME
      );

      // Only emit platformWarning when the warning state actually changes
      const warningChanged =
        previousWarningState.isWarning !== warningState.isWarning ||
        (warningState.isWarning &&
          Math.abs(previousWarningState.warningProgress - warningState.warningProgress) > 0.05);

      if (warningChanged) {
        io.emit('platformWarning', {
          isWarning: warningState.isWarning,
          warningProgress: warningState.warningProgress,
          currentRadius,
        });
        previousWarningState = {
          isWarning: warningState.isWarning,
          warningProgress: warningState.warningProgress,
        };
      }

      // Check if platform should shrink (every SHRINK_INTERVAL ms since last shrink)
      if (currentRadius > PLATFORM.MIN_RADIUS && shouldShrinkPlatform(PLATFORM.SHRINK_INTERVAL)) {
        const newRadius = currentRadius - PLATFORM.SHRINK_AMOUNT;
        shrinkPlatform(newRadius);
        io.emit('platformShrink', { radius: getPlatformRadius() });
      }
    }
  }, SERVER.TICK_INTERVAL);
}

/**
 * Start score update broadcasts
 */
function startScoreUpdates() {
  if (scoreUpdateInterval) return;
  
  scoreUpdateInterval = setInterval(() => {
    const state = getGameState();
    if (state === GAME_STATES.PLAYING) {
      const scores = getScoreSnapshot();
      io.emit('scoreUpdate', { scores });
    }
  }, 1000); // Update scores once per second
}

/**
 * Handle game end
 * @param {Object|null} winner - Winning player or null if draw
 */
function handleGameEnd(winner) {
  // Guard clause: prevent multiple calls if game already ended
  if (getGameState() === GAME_STATES.ENDED) return;

  setGameState(GAME_STATES.ENDED);
  
  // Stop score updates
  if (scoreUpdateInterval) {
    clearInterval(scoreUpdateInterval);
    scoreUpdateInterval = null;
  }

  if (winner) {
    io.emit('gameEnd', {
      winner: {
        id: winner.id,
        name: winner.name,
        color: winner.color,
      },
    });
  } else {
    io.emit('gameEnd', { winner: null });
  }
}

/**
 * Start countdown sequence
 */
function startCountdown() {
  setGameState(GAME_STATES.COUNTDOWN);
  let count = COUNTDOWN.DURATION;

  io.emit('countdown', { count });

  countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      io.emit('countdown', { count });
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
      setGameState(GAME_STATES.PLAYING);
      initializeGameTimes(); // Initialize scoring timers for all players
      io.emit('gameStart', getStateSnapshot());
      startGameLoop();
      startScoreUpdates(); // Start broadcasting scores
    }
  }, 1000);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  // Send current player count to new connections (before they join)
  socket.emit('playerCount', {
    count: getPlayerCount(),
    maxPlayers: PLAYERS.MAX_PLAYERS,
  });

  // Handle player joining
  socket.on('join', ({ name }) => {
    // Check if max players reached
    const currentCount = getPlayerCount();
    if (currentCount >= PLAYERS.MAX_PLAYERS) {
      socket.emit('joinError', { message: 'Server is full' });
      return;
    }

    const player = createPlayer(socket.id, name);
    const isPlayerHost = isHost(socket.id);
    const newCount = getPlayerCount();

    console.log(`[JOIN] ${player.name} (Host: ${isPlayerHost}) - ${newCount}/${PLAYERS.MAX_PLAYERS}`);

    // Send current state to the joining player
    socket.emit('joined', {
      player,
      isHost: isPlayerHost,
      playerCount: newCount,
      maxPlayers: PLAYERS.MAX_PLAYERS,
      ...getStateSnapshot(),
    });

    // Notify all other players
    socket.broadcast.emit('playerJoined', {
      player,
      hostId: getHostId(),
    });

    // Broadcast updated player count to all clients
    io.emit('playerCount', {
      count: newCount,
      maxPlayers: PLAYERS.MAX_PLAYERS,
    });

    // Start game loop if not running
    startGameLoop();
  });

  // Handle player input (position update from authoritative client physics)
  socket.on('input', ({ position, velocity }) => {
    const state = getGameState();
    if (state !== GAME_STATES.PLAYING) return;

    const player = getPlayer(socket.id);
    if (player && !player.isEliminated) {
      updatePlayerPosition(socket.id, position, velocity);
    }
  });

  // Handle collision events for elimination attribution
  socket.on('collision', ({ otherPlayerId }) => {
    const state = getGameState();
    if (state !== GAME_STATES.PLAYING) return;

    const player = getPlayer(socket.id);
    const otherPlayer = getPlayer(otherPlayerId);
    
    if (player && otherPlayer && !player.isEliminated && !otherPlayer.isEliminated) {
      // Record that otherPlayer was hit by this player
      recordCollision(otherPlayerId, socket.id);
    }
  });

  // Handle host starting game
  socket.on('startGame', () => {
    if (!isHost(socket.id)) return;

    const state = getGameState();
    if (state !== GAME_STATES.LOBBY) return;

    const players = getAllPlayers();
    if (players.length < 1) return; // At least 1 player to start (for testing)

    startCountdown();
  });

  // Handle player ready status
  socket.on('ready', ({ ready }) => {
    setPlayerReady(socket.id, ready);
    io.emit('playerReady', { id: socket.id, ready });
  });

  // Handle Konami code activation
  socket.on('konamiCode', () => {
    const state = getGameState();
    if (state !== GAME_STATES.PLAYING) return;

    const activator = getPlayer(socket.id);
    if (!activator || activator.isEliminated) return;

    console.log(`[KONAMI] ${activator.name}`);

    // Eliminate all other players and broadcast each elimination
    const players = getAlivePlayers();
    players.forEach((player) => {
      if (player.id !== socket.id) {
        eliminatePlayer(player.id);
        // Broadcast elimination so clients see players eliminated before game over
        io.emit('playerEliminated', { id: player.id, name: player.name });
      }
    });

    // Broadcast the explosion
    io.emit('konamiActivated', {
      activator: {
        id: activator.id,
        name: activator.name,
        color: activator.color,
      },
    });

    // End game with Konami winner
    handleGameEnd(activator);
  });

  // Handle play again request
  socket.on('playAgain', () => {
    if (!isHost(socket.id)) return;

    const state = getGameState();
    if (state !== GAME_STATES.ENDED) return;

    resetGame();
    // Reset warning state tracking for the new game
    previousWarningState = { isWarning: false, warningProgress: 0 };
    io.emit('gameReset', getStateSnapshot());
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const player = removePlayer(socket.id);
    if (player) {
      const newCount = getPlayerCount();
      console.log(`[LEAVE] ${player.name} - ${newCount}/${PLAYERS.MAX_PLAYERS}`);

      // Notify all clients
      io.emit('playerLeft', {
        id: socket.id,
        name: player.name,
        newHostId: getHostId(),
      });

      // Broadcast updated player count to all clients
      io.emit('playerCount', {
        count: newCount,
        maxPlayers: PLAYERS.MAX_PLAYERS,
      });

      // Check if game should end due to not enough players
      const state = getGameState();
      if (state === GAME_STATES.PLAYING) {
        const remaining = getAlivePlayers();
        if (remaining.length <= 1) {
          handleGameEnd(remaining[0] || null);
        }
      }
    } else {
      // Socket disconnected without joining
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 SPACE PUSH server running on port ${PORT}`);
});

export { io, app };
