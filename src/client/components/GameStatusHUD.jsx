/**
 * GameStatusHUD - Shows game state, alive player count, and timer during gameplay
 * Provides visual feedback on current game phase
 */
import { useState, useEffect } from 'react';
import { GAME_STATES } from '../utils/constants';

export default function GameStatusHUD({
  gameState,
  players,
  localPlayer,
  platformRadius,
}) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer that runs during PLAYING state
  useEffect(() => {
    if (gameState !== GAME_STATES.PLAYING) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // Format elapsed time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Count alive players (including local player)
  const allPlayers = [localPlayer, ...Object.values(players)].filter(Boolean);
  const alivePlayers = allPlayers.filter((p) => !p.isEliminated);
  const totalPlayers = allPlayers.length;

  // Don't show during lobby or countdown (Lobby component handles those)
  if (gameState === GAME_STATES.LOBBY || gameState === GAME_STATES.COUNTDOWN) {
    return null;
  }

  // Don't show during ended state (GameOverScreen handles that)
  if (gameState === GAME_STATES.ENDED) {
    return null;
  }

  const isEliminated = localPlayer?.isEliminated;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="flex items-center gap-4">
        {/* Game state badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-space-dark/90 border border-neon-cyan/50 backdrop-blur-sm"
          style={{
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)',
          }}
        >
          {/* State indicator dot */}
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400/50 animate-ping" />
          </div>
          <span className="text-green-400 font-bold text-sm tracking-wider uppercase">
            LIVE
          </span>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-space-dark/90 border border-gray-600/50 backdrop-blur-sm">
          <span className="text-gray-400 text-sm">TIME</span>
          <span className="text-white font-mono font-bold text-lg">
            {formatTime(elapsedTime)}
          </span>
        </div>

        {/* Alive counter */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-space-dark/90 border border-neon-magenta/50 backdrop-blur-sm"
          style={{
            boxShadow: '0 0 15px rgba(255, 0, 255, 0.2)',
          }}
        >
          <span className="text-gray-400 text-sm">ALIVE</span>
          <span className="text-neon-magenta font-bold text-lg">
            {alivePlayers.length}
          </span>
          <span className="text-gray-500 text-sm">/ {totalPlayers}</span>
        </div>

        {/* Platform size indicator */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-space-dark/90 border border-neon-cyan/30 backdrop-blur-sm">
          <span className="text-gray-400 text-sm">ARENA</span>
          <span className="text-neon-cyan font-bold text-lg">
            {Math.round(platformRadius)}
          </span>
        </div>
      </div>

      {/* Eliminated overlay */}
      {isEliminated && (
        <div className="mt-4 text-center">
          <div className="inline-block px-6 py-3 rounded-lg bg-red-900/80 border border-red-500/50">
            <p className="text-red-400 font-bold text-lg">ELIMINATED</p>
            <p className="text-gray-400 text-sm">Spectating...</p>
          </div>
        </div>
      )}
    </div>
  );
}
