import { useState, useEffect } from 'react';

/**
 * EliminatedOverlay - Shows when local player is eliminated
 * Displays Game Over message and spectating controls
 *
 * @param {Object} props
 * @param {number} props.alivePlayers - Number of players still alive
 * @param {number} props.totalPlayers - Total players in match
 * @param {string} props.playerColor - Player's color for styling
 */
export default function EliminatedOverlay({
  alivePlayers,
  totalPlayers,
  playerColor = '#ff4444',
}) {
  const [showFullOverlay, setShowFullOverlay] = useState(false);

  // Delay showing full overlay for dramatic effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFullOverlay(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Vignette effect - darkened edges */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.7) 100%)',
        }}
      />

      {/* Red flash on elimination */}
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background: `radial-gradient(ellipse at center, ${playerColor}20 0%, transparent 50%)`,
          animation: 'eliminationFlash 0.5s ease-out',
        }}
      />

      {/* Game Over banner */}
      <div
        className={`
          absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
          transition-all duration-500 ease-out
          ${showFullOverlay ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
        `}
      >
        <div className="text-center">
          {/* Skull icon */}
          <div
            className="text-8xl mb-4 animate-bounce"
            style={{
              textShadow: `0 0 30px ${playerColor}, 0 0 60px ${playerColor}`,
              animation: 'eliminationBounce 0.6s ease-out',
            }}
          >
            💀
          </div>

          {/* ELIMINATED text */}
          <h1
            className="text-5xl font-bold tracking-widest mb-4"
            style={{
              color: '#ff4444',
              textShadow: '0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 60px #ff0000',
              animation: 'eliminationText 0.8s ease-out',
            }}
          >
            ELIMINATED
          </h1>

          {/* Placement info could go here in future */}
        </div>
      </div>

      {/* Spectating info bar - bottom of screen */}
      {showFullOverlay && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div
            className="px-6 py-3 rounded-lg backdrop-blur-md"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="flex items-center gap-6">
              {/* Spectating indicator */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-cyan-400" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-cyan-400/50 animate-ping" />
                </div>
                <span className="text-cyan-400 font-semibold tracking-wide">
                  SPECTATING
                </span>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-600" />

              {/* Players remaining */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">REMAINING</span>
                <span className="text-white font-bold text-lg">
                  {alivePlayers}
                </span>
                <span className="text-gray-500 text-sm">/ {totalPlayers}</span>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-600" />

              {/* Camera hint */}
              <div className="text-gray-400 text-sm">
                <span className="text-gray-300">Drag</span> to orbit camera
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for custom animations */}
      <style>{`
        @keyframes eliminationFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes eliminationBounce {
          0% { transform: scale(0) rotate(-45deg); }
          50% { transform: scale(1.2) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes eliminationText {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.5);
            letter-spacing: 0.5em;
          }
          50% {
            opacity: 1;
            transform: translateY(-10px) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            letter-spacing: 0.3em;
          }
        }
      `}</style>
    </div>
  );
}
