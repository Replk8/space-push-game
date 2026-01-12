import { memo } from 'react';

/**
 * LiveScoreboard - Real-time scoring display for all players in multiplayer
 * Shows: Score, Eliminations, Survival Time, Out of Bounds Time
 */
function LiveScoreboard({ scores, localPlayerId }) {
  if (!scores || scores.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/90 backdrop-blur-sm border-2 border-cyan-500/50 rounded-lg p-3 w-[320px] max-h-[70vh] overflow-y-auto z-30">
      <h2 className="text-lg font-bold text-cyan-400 mb-2 text-center border-b border-cyan-500/30 pb-2 sticky top-0 bg-black/90">
        LIVE SCOREBOARD
      </h2>
      
      <div className="space-y-2">
        {scores.map((player, index) => {
          const isLocal = player.id === localPlayerId;
          const isEliminated = player.isEliminated;
          const isOutOfBounds = player.isOutOfBounds;
          
          return (
            <div
              key={player.id}
              className={`p-2 rounded border transition-all ${
                isLocal 
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-800/50'
              } ${isEliminated ? 'opacity-50' : ''} ${
                isOutOfBounds && !isEliminated ? 'animate-pulse border-red-500' : ''
              }`}
            >
              {/* Rank and Name */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-bold w-6">#{index + 1}</span>
                  <span
                    className="font-semibold truncate max-w-[120px]"
                    style={{ color: player.color }}
                  >
                    {player.name}
                    {isLocal && ' (YOU)'}
                    {isEliminated && ' ☠️'}
                  </span>
                </div>
                <span
                  className="text-2xl font-black tabular-nums"
                  style={{
                    color: player.color,
                    textShadow: `0 0 8px ${player.color}`,
                  }}
                >
                  {player.score}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-1 text-xs">
                {/* Eliminations */}
                <div className="text-center bg-black/30 rounded p-1">
                  <div className="text-yellow-400 font-bold">{player.eliminations}</div>
                  <div className="text-gray-500 text-[10px]">Kills</div>
                </div>
                
                {/* Survival Time */}
                <div className="text-center bg-black/30 rounded p-1">
                  <div className="text-green-400 font-bold">{player.survivalTime}s</div>
                  <div className="text-gray-500 text-[10px]">Alive</div>
                </div>
                
                {/* Out of Bounds Time */}
                <div className={`text-center bg-black/30 rounded p-1 ${
                  isOutOfBounds && !isEliminated ? 'bg-red-500/20' : ''
                }`}>
                  <div className={`font-bold ${
                    player.outOfBoundsTime > 7 ? 'text-red-500' :
                    player.outOfBoundsTime > 5 ? 'text-orange-400' :
                    'text-gray-400'
                  }`}>
                    {player.outOfBoundsTime}s
                  </div>
                  <div className="text-gray-500 text-[10px]">Out</div>
                </div>
              </div>

              {/* Out of Bounds Warning */}
              {isOutOfBounds && !isEliminated && (
                <div className="mt-1 text-[10px] text-red-400 text-center font-bold animate-pulse">
                  ⚠️ OUT OF BOUNDS! ({(10 - player.outOfBoundsTime).toFixed(1)}s left)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scoring Formula */}
      <div className="mt-3 pt-2 border-t border-cyan-500/30 text-[10px] text-gray-500 text-center">
        Score = (Kills × 100) + Alive Time - (Out Time × 10)
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(LiveScoreboard);
