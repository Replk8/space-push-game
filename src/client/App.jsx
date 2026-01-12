import React, { useState } from 'react';
import Game from './components/Game';
import SinglePlayerGameV2 from './components/SinglePlayerGameV2';
import ModeSelection from './components/ModeSelection';

function App() {
  const [gameMode, setGameMode] = useState(null); // null, 'single', 'multi'

  const handleSelectMode = (mode) => {
    setGameMode(mode);
  };

  const handleBackToMenu = () => {
    setGameMode(null);
  };

  return (
    <div className="w-full h-screen overflow-hidden">
      {!gameMode && <ModeSelection onSelectMode={handleSelectMode} />}
      {gameMode === 'single' && <SinglePlayerGameV2 onBackToMenu={handleBackToMenu} />}
      {gameMode === 'multi' && <Game onBackToMenu={handleBackToMenu} />}
    </div>
  );
}

export default App;
