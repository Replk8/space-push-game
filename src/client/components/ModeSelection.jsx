import { useState } from 'react';

/**
 * ModeSelection - Choose between single-player and multiplayer modes
 */
export default function ModeSelection({ onSelectMode }) {
  const [hoveredMode, setHoveredMode] = useState(null);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center z-50">
      <div className="text-center px-8 max-w-4xl">
        {/* Title */}
        <h1 className="text-7xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-transparent bg-clip-text animate-pulse">
          SPACE PUSH
        </h1>
        <p className="text-2xl text-gray-400 mb-16">Choose Your Mode</p>

        {/* Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Single Player Card */}
          <button
            onClick={() => onSelectMode('single')}
            onMouseEnter={() => setHoveredMode('single')}
            onMouseLeave={() => setHoveredMode(null)}
            className={`
              relative p-8 rounded-2xl border-4 transition-all duration-300 transform
              ${
                hoveredMode === 'single'
                  ? 'border-cyan-400 scale-105 shadow-2xl shadow-cyan-500/50'
                  : 'border-gray-700 hover:border-cyan-500'
              }
              bg-gradient-to-br from-gray-800 to-gray-900
            `}
          >
            <div className="mb-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-white mb-3">Single Player</h2>
              <p className="text-gray-400 text-lg">
                Face off against an AI opponent in a 1v1 battle
              </p>
            </div>

            <div className="mt-6 space-y-2 text-left">
              <div className="flex items-center text-gray-300">
                <span className="text-cyan-400 mr-2">•</span>
                Practice your skills
              </div>
              <div className="flex items-center text-gray-300">
                <span className="text-cyan-400 mr-2">•</span>
                No waiting for other players
              </div>
              <div className="flex items-center text-gray-300">
                <span className="text-cyan-400 mr-2">•</span>
                Adjustable AI difficulty
              </div>
            </div>

            <div className="mt-8 text-cyan-400 font-semibold text-xl">
              Play vs Computer →
            </div>
          </button>

          {/* Multiplayer Card */}
          <button
            onClick={() => onSelectMode('multi')}
            onMouseEnter={() => setHoveredMode('multi')}
            onMouseLeave={() => setHoveredMode(null)}
            className={`
              relative p-8 rounded-2xl border-4 transition-all duration-300 transform
              ${
                hoveredMode === 'multi'
                  ? 'border-purple-400 scale-105 shadow-2xl shadow-purple-500/50'
                  : 'border-gray-700 hover:border-purple-500'
              }
              bg-gradient-to-br from-gray-800 to-gray-900
            `}
          >
            <div className="mb-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-white mb-3">Multiplayer</h2>
              <p className="text-gray-400 text-lg">
                Battle against friends and players online
              </p>
            </div>

            <div className="mt-6 space-y-2 text-left">
              <div className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-2">•</span>
                Up to 40 players
              </div>
              <div className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-2">•</span>
                Real-time online battles
              </div>
              <div className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-2">•</span>
                Compete with friends
              </div>
            </div>

            <div className="mt-8 text-purple-400 font-semibold text-xl">
              Join Multiplayer →
            </div>
          </button>
        </div>

        {/* Footer hint */}
        <div className="mt-12 text-gray-500 text-sm">
          Push your opponents off the shrinking platform to win!
        </div>
      </div>
    </div>
  );
}
