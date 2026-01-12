import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import Platform from './Platform';
import PhysicsPlayer from './PhysicsPlayer';
import AIPlayer from './AIPlayer';
import PhysicsProvider from './PhysicsProvider';
import BoostIndicator from './BoostIndicator';
import CollisionSparks from './CollisionSparks';
import GameOverScreen from './GameOverScreen';
import GameStatusHUD from './GameStatusHUD';
import TouchJoystick from './TouchJoystick';
import TouchControlsHint from './TouchControlsHint';
import Scoreboard from './Scoreboard';
import useKeyboard from '../hooks/useKeyboard';
import useBoost from '../hooks/useBoost';
import useTouch from '../hooks/useTouch';
import useScreenShake from '../hooks/useScreenShake';
import { GAME_STATES, getPlayerScale, getPlatformScale } from '../utils/constants';

const INITIAL_PLATFORM_RADIUS = 10;
const MIN_PLATFORM_RADIUS = 3;
const SHRINK_INTERVAL = 30000; // 30 seconds
const SHRINK_AMOUNT = 1;

/**
 * CameraRig - Wrapper group for camera shake effects
 */
function CameraRig({ children, onBigImpact }) {
  const groupRef = useRef();
  const { triggerShake } = useScreenShake(groupRef);

  useEffect(() => {
    if (onBigImpact) {
      onBigImpact.current = triggerShake;
    }
  }, [onBigImpact, triggerShake]);

  return <group ref={groupRef}>{children}</group>;
}

/**
 * PhysicsScene - The game scene
 */
function PhysicsScene({
  keysRef,
  boostState,
  onCollision,
  localPlayer,
  aiPlayer,
  gameState,
  onLocalPositionUpdate,
  onAIPositionUpdate,
  platformRadius,
  shrinkWarning,
  playerScale,
}) {
  const controlsRef = useRef();
  const localPlayerPosRef = useRef({ x: -6, y: 1, z: 0 });

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  const handleLocalPositionUpdate = useCallback(
    (position, velocity) => {
      localPlayerPosRef.current = position;
      if (onLocalPositionUpdate) {
        onLocalPositionUpdate(position, velocity);
      }
    },
    [onLocalPositionUpdate]
  );

  const isPlaying = gameState === GAME_STATES.PLAYING;
  const showLocalPlayer = localPlayer && !localPlayer.isEliminated;
  const showAIPlayer = aiPlayer && !aiPlayer.isEliminated;

  return (
    <>
      <Platform
        radius={platformRadius}
        shrinkWarning={shrinkWarning}
      />

      {/* Local player */}
      {showLocalPlayer && (
        <PhysicsPlayer
          key="local-player"
          id={localPlayer.id}
          name={localPlayer.name}
          colorIndex={localPlayer.color}
          initialPosition={[-6, 1, 0]}
          isLocal={true}
          keysRef={isPlaying ? keysRef : null}
          boostState={isPlaying ? boostState : null}
          onPositionUpdate={isPlaying ? handleLocalPositionUpdate : undefined}
          canMove={isPlaying}
          playerScale={playerScale}
        />
      )}

      {/* AI opponent */}
      {showAIPlayer && (
        <AIPlayer
          key="ai-player"
          id={aiPlayer.id}
          name={aiPlayer.name}
          colorIndex={aiPlayer.color}
          initialPosition={[6, 1, 0]}
          playerPosition={localPlayerPosRef.current}
          playerVelocity={localPlayer?.velocity}
          platformRadius={platformRadius}
          onPositionUpdate={onAIPositionUpdate}
          canMove={isPlaying}
          difficulty="easy"  // Changed from "medium" to "easy"
          playerScale={playerScale}
        />
      )}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={15}
        maxDistance={40}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
      />

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Stars
        radius={300}
        depth={60}
        count={5000}
        factor={7}
        saturation={0}
        fade
        speed={1}
      />
    </>
  );
}

/**
 * SinglePlayerGame - Single player with AI opponent
 */
export default function SinglePlayerGameV2({ onBackToMenu }) {
  const [gameState, setGameState] = useState(GAME_STATES.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const [platformRadius, setPlatformRadius] = useState(INITIAL_PLATFORM_RADIUS);
  const [winner, setWinner] = useState(null);
  const [playerWins, setPlayerWins] = useState(0);
  const [computerWins, setComputerWins] = useState(0);
  const [shrinkWarning, setShrinkWarning] = useState({ isWarning: false, warningProgress: 0 });
  const [collisions, setCollisions] = useState([]);
  
  // Calculate scaling for 2 players
  const totalPlayers = 2;
  const playerScale = getPlayerScale(totalPlayers);
  const platformScale = getPlatformScale(totalPlayers);
  const scaledPlatformRadius = platformRadius * platformScale;

  const keysRef = useKeyboard();
  const boostState = useBoost();
  
  // Touch controls (for mobile)
  const handleTouchBoost = useCallback(() => {
    if (gameState === GAME_STATES.PLAYING) {
      boostState.triggerBoost();
    }
  }, [gameState, boostState]);
  
  const { touchState, joystickPosition, isTouchDevice } = useTouch(keysRef, handleTouchBoost);
  const shakeRef = useRef(null);

  // Player states
  const [localPlayer, setLocalPlayer] = useState({
    id: 'player',
    name: 'You',
    color: 0,
    position: { x: -6, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    isEliminated: false,
  });

  const [aiPlayer, setAIPlayer] = useState({
    id: 'ai',
    name: 'Computer',
    color: 1,
    position: { x: 6, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    isEliminated: false,
  });

  // Refs to always access latest player state in intervals
  const localPlayerRef = useRef(localPlayer);
  const aiPlayerRef = useRef(aiPlayer);
  
  // Keep refs in sync
  useEffect(() => {
    localPlayerRef.current = localPlayer;
  }, [localPlayer]);
  
  useEffect(() => {
    aiPlayerRef.current = aiPlayer;
  }, [aiPlayer]);

  // Countdown timer
  useEffect(() => {
    if (gameState === GAME_STATES.COUNTDOWN && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === GAME_STATES.COUNTDOWN && countdown === 0) {
      setGameState(GAME_STATES.PLAYING);
    }
  }, [gameState, countdown]);

  // Platform shrinking
  useEffect(() => {
    if (gameState !== GAME_STATES.PLAYING) return;

    const shrinkTimer = setInterval(() => {
      setPlatformRadius((prev) => {
        const newRadius = Math.max(MIN_PLATFORM_RADIUS, prev - SHRINK_AMOUNT);
        if (newRadius <= MIN_PLATFORM_RADIUS) {
          clearInterval(shrinkTimer);
        }
        return newRadius;
      });
    }, SHRINK_INTERVAL);

    return () => clearInterval(shrinkTimer);
  }, [gameState]);

  // Platform shrink warning
  useEffect(() => {
    if (gameState !== GAME_STATES.PLAYING) return;

    const warningDuration = 5000;
    const warningStart = SHRINK_INTERVAL - warningDuration;

    const warningInterval = setInterval(() => {
      const timeSinceLastShrink = Date.now() % SHRINK_INTERVAL;

      if (timeSinceLastShrink >= warningStart) {
        const progress = (timeSinceLastShrink - warningStart) / warningDuration;
        setShrinkWarning({ isWarning: true, warningProgress: progress });
      } else {
        setShrinkWarning({ isWarning: false, warningProgress: 0 });
      }
    }, 100);

    return () => clearInterval(warningInterval);
  }, [gameState]);

  // Check for eliminations
  useEffect(() => {
    if (gameState !== GAME_STATES.PLAYING) {
      return;
    }

    const checkInterval = setInterval(() => {
      const local = localPlayerRef.current;
      const ai = aiPlayerRef.current;
      
      const checkPlayer = (player, setPlayer, playerName) => {
        if (!player.isEliminated) {
          const distance = Math.sqrt(player.position.x ** 2 + player.position.z ** 2);
          
          if (distance > scaledPlatformRadius + 2 || player.position.y < -5) {
            setPlayer((prev) => ({ ...prev, isEliminated: true }));
            return true;
          }
        }
        return false;
      };

      const localEliminated = checkPlayer(local, setLocalPlayer, 'LOCAL');
      const aiEliminated = checkPlayer(ai, setAIPlayer, 'AI');

      // Check for winner
      if (localEliminated && !aiEliminated) {
        setComputerWins(prev => prev + 1);
        setWinner('ai');
        setGameState(GAME_STATES.ENDED);
      } else if (aiEliminated && !localEliminated) {
        setPlayerWins(prev => prev + 1);
        setWinner('player');
        setGameState(GAME_STATES.ENDED);
      } else if (localEliminated && aiEliminated) {
        setWinner('draw');
        setGameState(GAME_STATES.ENDED);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [gameState, scaledPlatformRadius]);

  // Handle collisions
  const handleCollision = useCallback((collision) => {
    setCollisions((prev) => [...prev, { ...collision, id: Date.now() }]);

    // Trigger screen shake for big impacts
    if (collision.impactVelocity > 3 && shakeRef.current) {
      shakeRef.current(collision.impactVelocity * 0.3);
    }
  }, []);

  // Handle position updates
  const handleLocalPositionUpdate = useCallback((position, velocity) => {
    setLocalPlayer((prev) => ({ ...prev, position, velocity }));
  }, []);

  const handleAIPositionUpdate = useCallback((position, velocity) => {
    setAIPlayer((prev) => ({ ...prev, position, velocity }));
  }, []);

  // Handle restart
  const handleRestart = useCallback(() => {
    setGameState(GAME_STATES.COUNTDOWN);
    setCountdown(3);
    setPlatformRadius(INITIAL_PLATFORM_RADIUS);
    setWinner(null);
    setShrinkWarning({ isWarning: false, warningProgress: 0 });
    setCollisions([]);
    
    setLocalPlayer({
      id: 'player',
      name: 'You',
      color: 0,
      position: { x: -6, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      isEliminated: false,
    });
    
    setAIPlayer({
      id: 'ai',
      name: 'Computer',
      color: 1,
      position: { x: 6, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      isEliminated: false,
    });
  }, []);

  const aliveCount = [localPlayer, aiPlayer].filter(p => !p.isEliminated).length;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 15, 25], fov: 50 }}
        shadows
      >
        <PhysicsProvider
          onCollision={handleCollision}
          platformRadius={scaledPlatformRadius}
        >
          <CameraRig onBigImpact={shakeRef}>
            <PhysicsScene
              keysRef={keysRef}
              boostState={boostState}
              onCollision={handleCollision}
              localPlayer={localPlayer}
              aiPlayer={aiPlayer}
              gameState={gameState}
              onLocalPositionUpdate={handleLocalPositionUpdate}
              onAIPositionUpdate={handleAIPositionUpdate}
              platformRadius={scaledPlatformRadius}
              shrinkWarning={shrinkWarning}
              playerScale={playerScale}
            />
            {collisions.map((collision) => (
              <CollisionSparks
                key={collision.id}
                position={collision.point}
                intensity={collision.impactVelocity}
                onComplete={() => {
                  setCollisions((prev) => prev.filter((c) => c.id !== collision.id));
                }}
              />
            ))}
          </CameraRig>
        </PhysicsProvider>
      </Canvas>

      {/* HUD */}
      <GameStatusHUD
        gameState={gameState}
        players={{ ai: aiPlayer }}
        localPlayer={localPlayer}
        platformRadius={platformRadius}
      />

      {/* Scoreboard */}
      <Scoreboard 
        scores={[
          { name: 'You', wins: playerWins, color: '#00ffff' },
          { name: 'Computer', wins: computerWins, color: '#ff00ff' }
        ]}
      />

      {/* Boost indicator */}
      {gameState === GAME_STATES.PLAYING && !localPlayer.isEliminated && (
        <BoostIndicator 
          cooldownProgress={boostState.cooldownProgress} 
          canBoost={boostState.canBoost} 
        />
      )}

      {/* Touch controls */}
      {isTouchDevice && gameState === GAME_STATES.PLAYING && !localPlayer.isEliminated && (
        <>
          <TouchJoystick touchState={touchState} joystickPosition={joystickPosition} show={touchState.isDragging} />
          <TouchControlsHint />
        </>
      )}

      {/* Game over screen */}
      {gameState === GAME_STATES.ENDED && (
        <GameOverScreen
          winner={winner === 'player' ? { name: 'You', color: '#00ffff' } : winner === 'ai' ? { name: 'Computer', color: '#ff00ff' } : null}
          localPlayerId="player"
          isHost={true}
          onPlayAgain={handleRestart}
          konamiActivator={null}
        />
      )}

      {/* Back to Menu button */}
      {onBackToMenu && (
        <button
          onClick={onBackToMenu}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors"
        >
          ← Back to Menu
        </button>
      )}
    </div>
  );
}
