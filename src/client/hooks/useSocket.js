import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { GAME_STATES } from '../utils/constants';

/**
 * useSocket - Hook for managing Socket.io connection and game state
 *
 * @returns {Object} Socket state and methods
 */
export default function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [localPlayer, setLocalPlayer] = useState(null);
  const [players, setPlayers] = useState({});
  const [gameState, setGameState] = useState(GAME_STATES.LOBBY);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [winner, setWinner] = useState(null);
  const [platformRadius, setPlatformRadius] = useState(10);
  const [konamiActivator, setKonamiActivator] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(40);
  const [joinError, setJoinError] = useState(null);
  const [hostChangeNotification, setHostChangeNotification] = useState(null);
  const [shrinkWarning, setShrinkWarning] = useState({ isWarning: false, warningProgress: 0 });
  const [scores, setScores] = useState([]);

  // Position update handlers - using refs to avoid closure staleness
  const positionCallbackRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    // Connect to server (uses same origin in production, proxy in dev)
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Player count update (sent on connect and when players join/leave)
    socket.on('playerCount', ({ count, maxPlayers: max }) => {
      setPlayerCount(count);
      setMaxPlayers(max);
    });

    // Join error (e.g., server full)
    socket.on('joinError', ({ message }) => {
      setJoinError(message);
    });

    // Joined successfully
    socket.on('joined', (data) => {
      setLocalPlayer(data.player);
      setIsHost(data.isHost);
      setHostId(data.hostId);
      setGameState(data.gameState);
      setPlatformRadius(data.platformRadius);

      // Initialize players map from existing players
      const playersMap = {};
      data.players.forEach((p) => {
        if (p.id !== data.player.id) {
          playersMap[p.id] = {
            ...p,
            targetPosition: { ...p.position },
            targetVelocity: { ...p.velocity },
          };
        }
      });
      setPlayers(playersMap);
    });

    // New player joined
    socket.on('playerJoined', ({ player, hostId: newHostId }) => {
      setHostId(newHostId);
      setPlayers((prev) => ({
        ...prev,
        [player.id]: {
          ...player,
          targetPosition: { ...player.position },
          targetVelocity: { ...player.velocity },
        },
      }));
    });

    // Player left
    socket.on('playerLeft', ({ id, name, newHostId }) => {
      const wasHost = id === newHostId; // Check if the one who left was host
      setHostId((prevHostId) => {
        // If the player who left was the old host and we're the new host
        if (prevHostId === id && socket.id === newHostId) {
          setHostChangeNotification({
            message: 'You are now the host!',
            previousHost: name,
          });
          // Clear notification after 3 seconds
          setTimeout(() => setHostChangeNotification(null), 3000);
        }
        return newHostId;
      });
      setIsHost((prev) => {
        if (socket.id === newHostId) {
          return true;
        }
        return prev;
      });
      setPlayers((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    });

    // Position updates from server
    socket.on('positionUpdate', ({ positions, timestamp }) => {
      // Update target positions for interpolation
      setPlayers((prev) => {
        const updated = { ...prev };
        Object.entries(positions).forEach(([id, data]) => {
          if (updated[id]) {
            updated[id] = {
              ...updated[id],
              targetPosition: { ...data.position },
              targetVelocity: { ...data.velocity },
              lastUpdate: timestamp,
            };
          }
        });
        return updated;
      });

      // Call external position callback if set
      if (positionCallbackRef.current) {
        positionCallbackRef.current(positions, timestamp);
      }
    });

    // Countdown events
    socket.on('countdown', ({ count }) => {
      setCountdown(count);
      setGameState(GAME_STATES.COUNTDOWN);
    });

    // Game start
    socket.on('gameStart', (data) => {
      setGameState(GAME_STATES.PLAYING);
      setCountdown(null);
      setPlatformRadius(data.platformRadius);
    });

    // Player eliminated
    socket.on('playerEliminated', ({ id, name }) => {
      setPlayers((prev) => {
        if (prev[id]) {
          return {
            ...prev,
            [id]: { ...prev[id], isEliminated: true },
          };
        }
        return prev;
      });

      // Check if local player was eliminated
      if (id === socket.id) {
        setLocalPlayer((prev) => (prev ? { ...prev, isEliminated: true } : prev));
      }
    });

    // Platform shrink
    socket.on('platformShrink', ({ radius }) => {
      setPlatformRadius(radius);
      // Reset warning state after shrink
      setShrinkWarning({ isWarning: false, warningProgress: 0 });
    });

    // Platform shrink warning
    socket.on('platformWarning', ({ isWarning, warningProgress }) => {
      setShrinkWarning({ isWarning, warningProgress });
    });

    // Konami code activated
    socket.on('konamiActivated', ({ activator }) => {
      setKonamiActivator(activator);
      // NOTE: Do NOT clear konamiActivator on a timeout. GameOverScreen uses this state
      // to display "ALL HAIL THE KING". It should only be cleared when the game resets.
    });

    // Game end
    socket.on('gameEnd', ({ winner: gameWinner }) => {
      setGameState(GAME_STATES.ENDED);
      setWinner(gameWinner);
    });

    // Game reset
    socket.on('gameReset', (data) => {
      setGameState(GAME_STATES.LOBBY);
      setWinner(null);
      setCountdown(null);
      setPlatformRadius(data.platformRadius);
      setKonamiActivator(null);

      // Reset player states
      const playersMap = {};
      data.players.forEach((p) => {
        if (p.id !== socket.id) {
          playersMap[p.id] = {
            ...p,
            targetPosition: { ...p.position },
            targetVelocity: { ...p.velocity },
          };
        }
      });
      setPlayers(playersMap);

      // Reset local player
      const localP = data.players.find((p) => p.id === socket.id);
      if (localP) {
        setLocalPlayer(localP);
      }
    });

    // Player ready status
    socket.on('playerReady', ({ id, ready }) => {
      setPlayers((prev) => {
        if (prev[id]) {
          return {
            ...prev,
            [id]: { ...prev[id], isReady: ready },
          };
        }
        return prev;
      });
    });

    // Score updates (live during gameplay)
    socket.on('scoreUpdate', ({ scores: scoreData }) => {
      setScores(scoreData);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Join game
  const join = useCallback((name) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('join', { name });
    }
  }, [connected]);

  // Send position update to server
  const sendInput = useCallback((position, velocity) => {
    if (socketRef.current && connected && gameState === GAME_STATES.PLAYING) {
      socketRef.current.emit('input', { position, velocity });
    }
  }, [connected, gameState]);

  // Start game (host only)
  const startGame = useCallback(() => {
    if (socketRef.current && connected && isHost) {
      socketRef.current.emit('startGame');
    }
  }, [connected, isHost]);

  // Set ready status
  const setReady = useCallback((ready) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('ready', { ready });
    }
  }, [connected]);

  // Trigger Konami code
  const triggerKonami = useCallback(() => {
    if (socketRef.current && connected && gameState === GAME_STATES.PLAYING) {
      socketRef.current.emit('konamiCode');
    }
  }, [connected, gameState]);

  // Request play again (host only)
  const playAgain = useCallback(() => {
    if (socketRef.current && connected && isHost) {
      socketRef.current.emit('playAgain');
    }
  }, [connected, isHost]);

  // Set position update callback
  const onPositionUpdate = useCallback((callback) => {
    positionCallbackRef.current = callback;
  }, []);

  // Send collision event to server for elimination attribution
  const sendCollision = useCallback((otherPlayerId) => {
    if (socketRef.current && connected && gameState === GAME_STATES.PLAYING) {
      socketRef.current.emit('collision', { otherPlayerId });
    }
  }, [connected, gameState]);

  return {
    // Connection state
    connected,
    socketId: socketRef.current?.id,

    // Player state
    localPlayer,
    players,
    isHost,
    hostId,
    playerCount,
    maxPlayers,

    // Game state
    gameState,
    countdown,
    winner,
    platformRadius,
    konamiActivator,
    joinError,
    hostChangeNotification,
    shrinkWarning,
    scores,

    // Actions
    join,
    sendInput,
    sendCollision,
    startGame,
    setReady,
    triggerKonami,
    playAgain,
    onPositionUpdate,
  };
}
