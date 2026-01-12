import { memo, useState, useEffect } from 'react';

/**
 * LiveScoreboard - Real-time scoring display for all players in multiplayer
 * Shows: Score, Eliminations, Survival Time, Out of Bounds Time
 * Collapsible on mobile to not block gameplay
 */
function LiveScoreboard({ scores, localPlayerId }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  if (!scores || scores.length === 0) return null;

  // Find local player's rank
  const localRank = scores.findIndex(p => p.id === localPlayerId) + 1;
  const localScore = scores.find(p => p.id === localPlayerId);

  // Collapsed view for mobile
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed top-4 right-4 bg-black/90 backdrop-blur-sm border-2 border-cyan-500/50 rounded-lg p-2 z-30 touch-manipulation"
      >
        <div className="text-cyan-400 text-xs font-bold">SCORES</div>
        {localScore && (
          <div className="text-white text-lg font-black">
            #{localRank} · {localScore.score}
          </div>
        )}
        <div className="text-gray-500 text-[10px]">tap to expand</div>
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-black/90 backdrop-blur-sm border-2 border-cyan-500/50 rounded-lg p-3 w-[280px] max-h-[50vh] overflow-y-auto z-30">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between mb-2 border-b border-cyan-500/30 pb-2 sticky top-0 bg-black/90">
        <h2 className="text-sm font-bold text-cyan-400">LIVE SCOREBOARD</h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-gray-400 hover:text-white text-xs px-2 py-1 touch-manipulation"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-1">
        {scores.slice(0, 10).map((player, index) => {
          const isLocal = player.id === localPlayerId;
          const isEliminated = player.isEliminated;
          const isOutOfBounds = player.isOutOfBounds;
          
          return (
            <div
              key={player.id}
              className={`p-1.5 rounded border transition-all text-sm ${
                isLocal 
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-gray-700/50 bg-gray-800/30'
              } ${isEliminated ? 'opacity-50' : ''} ${
                isOutOfBounds && !isEliminated ? 'border-red-500' : ''
              }`}
            >
              {/* Rank, Name, Score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 font-bold w-5 text-xs">#{index + 1}</span>
                  <span
                    className="font-semibold truncate max-w-[100px] text-xs"
                    style={{ color: player.color }}
                  >
                    {player.name}
                    {isLocal && ' (YOU)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {player.eliminations > 0 && (
                    <span className="text-yellow-400 text-xs">🎯{player.eliminations}</span>
                  )}
                  <span
                    className="text-lg font-black tabular-nums"
                    style={{ color: player.color }}
                  >
                    {player.score}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {scores.length > 10 && (
        <div className="text-gray-500 text-[10px] text-center mt-1">
          +{scores.length - 10} more players
        </div>
      )}
    </div>
  );
}

export default memo(LiveScoreboard);
