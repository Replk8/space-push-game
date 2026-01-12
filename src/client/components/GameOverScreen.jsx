import { useState, useEffect, useMemo } from 'react';

/**
 * VictoryConfetti - 2D CSS-based confetti animation for the victory screen
 */
function VictoryConfetti({ winnerColor }) {
  const confettiColors = useMemo(() => [
    '#ff4444', '#44ff44', '#4444ff', '#ffff44',
    '#ff44ff', '#44ffff', '#ff8844', '#88ff44',
    '#ffd700', '#ff69b4', '#00ff7f', '#ff6347',
    winnerColor || '#ffffff',
  ], [winnerColor]);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 100; i++) {
      temp.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 2,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        rotation: Math.random() * 360,
        size: 8 + Math.random() * 8,
        shape: Math.random() > 0.5 ? 'square' : 'circle',
      });
    }
    return temp;
  }, [confettiColors]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute confetti-particle"
          style={{
            left: `${particle.left}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            backgroundColor: particle.color,
            width: `${particle.size}px`,
            height: particle.shape === 'square' ? `${particle.size}px` : `${particle.size * 0.4}px`,
            borderRadius: particle.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${particle.rotation}deg)`,
            boxShadow: `0 0 6px ${particle.color}`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% {
            top: -5%;
            opacity: 1;
            transform: rotate(0deg) translateX(0);
          }
          25% {
            transform: rotate(90deg) translateX(20px);
          }
          50% {
            transform: rotate(180deg) translateX(-20px);
          }
          75% {
            transform: rotate(270deg) translateX(10px);
          }
          100% {
            top: 105%;
            opacity: 0.7;
            transform: rotate(360deg) translateX(0);
          }
        }
        .confetti-particle {
          animation: confettiFall linear infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * GameOverScreen - Victory/defeat overlay at end of game
 * Shows winner prominently with celebration effects
 */
export default function GameOverScreen({
  winner,
  localPlayerId,
  isHost,
  onPlayAgain,
  konamiActivator,
}) {
  const [showContent, setShowContent] = useState(false);
  const isLocalWinner = winner?.id === localPlayerId;
  const isKonamiWin = konamiActivator !== null;

  // Animate content entry
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Confetti celebration effect */}
      {(winner || isKonamiWin) && (
        <VictoryConfetti winnerColor={winner?.color || konamiActivator?.color} />
      )}

      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* Dark overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black/60" />

        {/* Content container */}
        <div
          className={`relative text-center transform transition-all duration-700 ${
            showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          {/* Konami special victory */}
          {isKonamiWin ? (
            <div className="relative">
              {/* Crown with glow animation */}
              <div className="text-8xl mb-6 animate-bounce">
                <span className="relative inline-block" style={{
                  filter: 'drop-shadow(0 0 20px gold) drop-shadow(0 0 40px orange)',
                }}>
                  👑
                </span>
              </div>

              {/* Konami title with crowns */}
              <h1
                className="text-5xl font-black mb-4 tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #ffd700, #ff8c00, #ffd700)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
                }}
              >
                👑 ALL HAIL THE KING 👑
              </h1>

              {/* Winner name */}
              <p className="text-3xl text-white mb-8">
                <span
                  className="font-bold text-4xl px-4 py-2 rounded-lg inline-block"
                  style={{
                    color: konamiActivator.color,
                    textShadow: `0 0 20px ${konamiActivator.color}, 0 0 40px ${konamiActivator.color}`,
                    background: `linear-gradient(135deg, ${konamiActivator.color}20, ${konamiActivator.color}10)`,
                    border: `2px solid ${konamiActivator.color}50`,
                  }}
                >
                  {konamiActivator.name}
                </span>
                <span className="block mt-3 text-xl text-neon-magenta">
                  used the Konami Code!
                </span>
              </p>
            </div>
          ) : winner ? (
            <div className="relative">
              {/* Victory/Defeat icon with animation */}
              <div
                className={`text-9xl mb-6 ${isLocalWinner ? 'animate-bounce' : 'animate-pulse'}`}
                style={{
                  filter: isLocalWinner
                    ? 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.8))'
                    : 'drop-shadow(0 0 20px rgba(255, 0, 0, 0.5))',
                }}
              >
                {isLocalWinner ? '🏆' : '💀'}
              </div>

              {/* Victory/Defeat title */}
              <h1
                className={`text-7xl font-black mb-6 tracking-wider ${
                  isLocalWinner ? '' : 'text-gray-400'
                }`}
                style={
                  isLocalWinner
                    ? {
                        background: 'linear-gradient(135deg, #00ffff, #ff00ff, #00ffff)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 0 40px rgba(0, 255, 255, 0.6)',
                        animation: 'textGlow 2s ease-in-out infinite',
                      }
                    : {}
                }
              >
                {isLocalWinner ? 'VICTORY!' : 'DEFEAT'}
              </h1>

              {/* Winner name - PROMINENTLY DISPLAYED */}
              <div className="mb-8">
                <p className="text-xl text-gray-400 mb-2">
                  {isLocalWinner ? 'Congratulations!' : 'Winner:'}
                </p>
                <div
                  className="inline-block px-8 py-4 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${winner.color}30, ${winner.color}15)`,
                    border: `3px solid ${winner.color}`,
                    boxShadow: `0 0 30px ${winner.color}50, inset 0 0 30px ${winner.color}20`,
                  }}
                >
                  <span
                    className="text-5xl font-black tracking-wide"
                    style={{
                      color: winner.color,
                      textShadow: `0 0 20px ${winner.color}, 0 0 40px ${winner.color}`,
                    }}
                  >
                    {winner.name}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Draw state */}
              <div className="text-8xl mb-6 animate-pulse opacity-70">
                <span style={{ filter: 'drop-shadow(0 0 15px rgba(128, 128, 128, 0.5))' }}>
                  ⚔️
                </span>
              </div>

              <h1 className="text-6xl font-black text-gray-500 mb-4 tracking-wider">
                DRAW
              </h1>
              <p className="text-2xl text-gray-600 mb-8">
                No one survived the arena!
              </p>
            </div>
          )}

          {/* Play again button (HOST ONLY) */}
          {isHost && (
            <button
              onClick={onPlayAgain}
              className="group relative px-12 py-5 text-2xl font-black rounded-xl
                overflow-hidden transition-all duration-300
                hover:scale-105 hover:shadow-2xl active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #00ffff, #ff00ff)',
                boxShadow: '0 0 30px rgba(0, 255, 255, 0.5), 0 0 60px rgba(255, 0, 255, 0.3)',
              }}
            >
              {/* Button glow effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent
                translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative text-white tracking-wider">
                PLAY AGAIN
              </span>
            </button>
          )}

          {/* Waiting for host message (NON-HOST ONLY) */}
          {!isHost && (
            <div className="text-center">
              <p className="text-xl text-gray-400 animate-pulse">
                Waiting for host to restart
                <span className="inline-flex ml-2">
                  <span className="animate-bounce" style={{ animationDelay: '0s' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Animated corner decorations */}
        <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-neon-cyan opacity-50" />
        <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-neon-magenta opacity-50" />
        <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-neon-magenta opacity-50" />
        <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-neon-cyan opacity-50" />
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes textGlow {
          0%, 100% {
            filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.6));
          }
          50% {
            filter: drop-shadow(0 0 40px rgba(255, 0, 255, 0.8));
          }
        }
      `}</style>
    </>
  );
}
