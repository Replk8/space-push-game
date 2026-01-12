/**
 * Lobby - Space-themed waiting room UI showing all players
 * Displays real-time player list and host controls
 */
export default function Lobby({
  localPlayer,
  players,
  isHost,
  hostId,
  onStartGame,
  countdown,
  hostChangeNotification,
}) {
  // Combine local player with remote players for display
  const allPlayers = [
    localPlayer,
    ...Object.values(players),
  ].filter(Boolean).map((player) => ({
    ...player,
    isHost: player.id === hostId, // Mark which player is the host
  }));

  const canStart = allPlayers.length >= 1; // At least 1 player for testing

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Player list panel - space themed */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        {/* Glow effect behind panel */}
        <div className="absolute -inset-2 bg-gradient-to-r from-neon-cyan/20 to-neon-magenta/20 rounded-2xl blur-xl" />

        <div className="relative bg-space-dark/95 border-2 border-neon-cyan/50 rounded-xl p-5 min-w-[280px] backdrop-blur-sm">
          {/* Header with icon */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neon-cyan/30">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-cyan to-neon-magenta flex items-center justify-center">
              <span className="text-white text-sm">👥</span>
            </div>
            <div>
              <h2 className="text-neon-cyan font-bold text-lg tracking-wide">
                CREW MANIFEST
              </h2>
              <p className="text-gray-400 text-xs">
                {allPlayers.length} astronaut{allPlayers.length !== 1 ? 's' : ''} in lobby
              </p>
            </div>
          </div>

          {/* Player list with animated entries */}
          <ul className="space-y-2 max-h-[400px] overflow-y-auto">
            {allPlayers.map((player, index) => (
              <li
                key={player.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-900/50 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                style={{
                  animation: `fadeSlideIn 0.3s ease-out ${index * 0.05}s both`,
                }}
              >
                {/* Player color indicator with glow */}
                <div className="relative">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: player.color,
                      boxShadow: `0 0 10px ${player.color}, 0 0 20px ${player.color}40`,
                    }}
                  />
                </div>

                {/* Player name */}
                <span className="text-white font-medium flex-1">
                  {player.name}
                </span>

                {/* Tags */}
                <div className="flex items-center gap-1">
                  {player.id === localPlayer?.id && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                      YOU
                    </span>
                  )}
                  {player.isHost && (
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                      style={{
                        boxShadow: '0 0 8px rgba(234, 179, 8, 0.4)',
                      }}
                    >
                      <span className="text-sm">👑</span>
                      HOST
                    </span>
                  )}
                  {player.isReady && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-500/20 text-green-400 border border-green-500/30">
                      READY
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Empty state */}
          {allPlayers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No players yet...</p>
            </div>
          )}
        </div>
      </div>

      {/* Host change notification */}
      {hostChangeNotification && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
        >
          <div className="flex items-center gap-3 px-6 py-3 bg-yellow-500/20 border-2 border-yellow-500/50 rounded-xl backdrop-blur-sm">
            <span className="text-2xl">👑</span>
            <div>
              <p className="text-yellow-400 font-bold text-lg">{hostChangeNotification.message}</p>
              <p className="text-gray-400 text-sm">
                {hostChangeNotification.previousHost} left the game
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Central waiting message */}
      {countdown === null && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="text-center">
            {/* Animated pulse ring */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 rounded-full bg-neon-cyan/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-neon-cyan to-neon-magenta flex items-center justify-center">
                <span className="text-2xl">🚀</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 tracking-wider">
              WAITING ROOM
            </h2>
            <p className="text-neon-cyan text-lg animate-pulse">
              {isHost ? 'You are the host - start when ready!' : 'Waiting for host to start...'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Players cannot move until the game starts
            </p>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center">
            {/* Countdown number with effects */}
            <div className="relative">
              <div
                className="text-[12rem] font-bold text-neon-cyan leading-none"
                style={{
                  textShadow: `0 0 30px #00ffff, 0 0 60px #00ffff, 0 0 90px #00ffff`,
                  animation: 'countdownPulse 1s ease-in-out infinite',
                }}
              >
                {countdown}
              </div>
            </div>
            <p className="text-2xl text-white mt-4 tracking-widest">
              GET READY TO PUSH!
            </p>
          </div>
        </div>
      )}

      {/* Host controls */}
      {isHost && countdown === null && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
          {/* Glow effect behind button */}
          <div className="absolute -inset-3 bg-gradient-to-r from-neon-cyan/30 to-neon-magenta/30 rounded-2xl blur-xl animate-pulse" />

          <button
            onClick={onStartGame}
            disabled={!canStart}
            className={`relative px-10 py-5 text-xl font-bold rounded-xl transition-all duration-300 uppercase tracking-widest
              ${
                canStart
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-magenta text-white hover:scale-105 hover:shadow-2xl hover:shadow-neon-cyan/30 active:scale-95'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }`}
            style={
              canStart
                ? {
                    boxShadow: `0 0 20px #00ffff50, 0 0 40px #ff00ff30`,
                  }
                : {}
            }
          >
            🎮 START GAME
          </button>
          {!canStart && (
            <p className="text-gray-400 text-center mt-3 text-sm">
              Need at least 1 player to start
            </p>
          )}
        </div>
      )}

      {/* Non-host waiting indicator at bottom */}
      {!isHost && countdown === null && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-3 px-6 py-3 bg-gray-900/80 rounded-full border border-gray-700">
            {/* Animated dots */}
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <p className="text-gray-300 font-medium">Waiting for host to start</p>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes countdownPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
