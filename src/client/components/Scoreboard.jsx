/**
 * Scoreboard - Displays player scores for single-player or multiplayer
 */
export default function Scoreboard({ scores }) {
  // scores = array of { name, wins, color }
  // For single-player: [{ name: "You", wins: 3, color: "#00ffff" }, { name: "Computer", wins: 1, color: "#ff00ff" }]
  // For multiplayer: [{ name: "Player1", wins: 5, color: "#00ffff" }, ...]
  
  if (!scores || scores.length === 0) return null;

  const totalGames = scores.reduce((sum, player) => sum + player.wins, 0);

  return (
    <div className="fixed top-4 right-4 bg-black/80 backdrop-blur-sm border-2 border-cyan-500/50 rounded-lg p-4 min-w-[200px] max-w-[280px] z-30">
      <h2 className="text-xl font-bold text-cyan-400 mb-3 text-center border-b border-cyan-500/30 pb-2">
        SCOREBOARD
      </h2>
      
      <div className="space-y-3">
        {scores.map((player, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <span 
                className="font-semibold truncate mr-2"
                style={{ color: player.color }}
              >
                {player.name}
              </span>
              <span 
                className="text-3xl font-black tabular-nums"
                style={{
                  color: player.color,
                  textShadow: `0 0 10px ${player.color}`
                }}
              >
                {player.wins}
              </span>
            </div>
            {totalGames > 0 && (
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: `${(player.wins / totalGames) * 100}%`,
                    backgroundColor: player.color
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total Games */}
      {totalGames > 0 && (
        <div className="mt-3 pt-3 border-t border-cyan-500/30 text-center">
          <span className="text-gray-400 text-sm">
            Total Games: <span className="text-white font-bold">{totalGames}</span>
          </span>
        </div>
      )}
    </div>
  );
}
