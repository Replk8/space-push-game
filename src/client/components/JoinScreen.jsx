import { useState, useEffect } from 'react';

/**
 * JoinScreen - UI for entering name and joining the game
 */
export default function JoinScreen({ onJoin, connected, playerCount = 0, maxPlayers = 40, joinError }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Update error if join error received from server
  useEffect(() => {
    if (joinError) {
      setError(joinError);
    }
  }, [joinError]);

  const isFull = playerCount >= maxPlayers;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (isFull) {
      setError('Server is full');
      return;
    }

    if (!trimmedName) {
      setError('Please enter a name');
      return;
    }

    if (trimmedName.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }

    setError('');
    onJoin(trimmedName);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-space-dark z-50">
      <div className="relative">
        {/* Glowing background effect */}
        <div className="absolute -inset-4 bg-gradient-to-r from-neon-cyan to-neon-magenta rounded-2xl opacity-20 blur-xl" />

        <div className="relative bg-space-dark border border-neon-cyan rounded-xl p-8 min-w-[320px]">
          {/* Title */}
          <h1 className="text-4xl font-bold text-center mb-2">
            <span className="text-neon-cyan">SPACE</span>{' '}
            <span className="text-neon-magenta">PUSH</span>
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Push others off the platform. Last one standing wins!
          </p>

          {/* Connection status */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            <span className="text-sm text-gray-400">
              {connected ? 'Connected to server' : 'Connecting...'}
            </span>
          </div>

          {/* Player count */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span
              className={`text-lg font-bold ${
                isFull ? 'text-red-400' : 'text-neon-cyan'
              }`}
            >
              {playerCount} / {maxPlayers}
            </span>
            <span className="text-gray-400">players</span>
          </div>

          {/* Join form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                disabled={!connected}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg
                  text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={!connected || isFull}
              className="w-full py-3 bg-gradient-to-r from-neon-cyan to-neon-magenta
                text-white font-bold rounded-lg transition-all duration-200
                hover:opacity-90 hover:shadow-lg hover:shadow-neon-cyan/20
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFull ? 'SERVER FULL' : 'JOIN GAME'}
            </button>
          </form>

          {/* Controls hint */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Arrow Keys or WASD to move</p>
            <p>SPACE to boost</p>
          </div>
        </div>
      </div>
    </div>
  );
}
