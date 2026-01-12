import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import Platform from './Platform';
import PhysicsPlayer from './PhysicsPlayer';
import RemotePlayer from './RemotePlayer';
import PhysicsProvider from './PhysicsProvider';
import BoostIndicator from './BoostIndicator';
import CollisionSparks from './CollisionSparks';
import EliminationAnimation from './EliminationAnimation';
import EliminatedOverlay from './EliminatedOverlay';
import Shockwave from './Shockwave';
import JoinScreen from './JoinScreen';
import Lobby from './Lobby';
import GameOverScreen from './GameOverScreen';
import GameStatusHUD from './GameStatusHUD';
import TouchJoystick from './TouchJoystick';
import TouchControlsHint from './TouchControlsHint';
import LiveScoreboard from './LiveScoreboard';
import useKeyboard from '../hooks/useKeyboard';
import useBoost from '../hooks/useBoost';
import useSocket from '../hooks/useSocket';
import useKonamiCode from '../hooks/useKonamiCode';
import useTouch from '../hooks/useTouch';
import useScreenShake from '../hooks/useScreenShake';
import { GAME_STATES } from '../utils/constants';

// Throttle interval for position updates (ms)
const POSITION_UPDATE_INTERVAL = 50; // 20 updates per second

/**
 * CameraRig - Wrapper group for camera shake effects
 * OrbitControls moves the camera within this group, and screen shake offsets the group itself.
 * This decouples shake from orbital motion, allowing them to work together without conflict.
 */
function CameraRig({ children, onBigImpact }) {
  const groupRef = useRef();
  const { triggerShake } = useScreenShake(groupRef);

  // Expose triggerShake via callback
  useEffect(() => {
    if (onBigImpact) {
      onBigImpact.current = triggerShake;
    }
  }, [onBigImpact, triggerShake]);

  return <group ref={groupRef}>{children}</group>;
}

/**
 * PhysicsScene - The game scene wrapped with physics
 * Contains all 3D elements and physics interactions
 */
function PhysicsScene({
  keysRef,
  boostState,
  onCollision,
  localPlayer,
  remotePlayers,
  gameState,
  onPositionUpdate,
  platformRadius,
  shrinkWarning,
  eliminations,
  onEliminationComplete,
  isSpectating,
  shockwave,
  onShockwaveComplete,
}) {
  const controlsRef = useRef();
  const lastUpdateRef = useRef(0);
  const localPositionRef = useRef({ x: 0, y: 1, z: 0 });
  const localVelocityRef = useRef({ x: 0, y: 0, z: 0 });

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  // Handle local player position updates to server
  const handleLocalPositionUpdate = useCallback(
    (position, velocity) => {
      localPositionRef.current = position;
      localVelocityRef.current = velocity;

      const now = Date.now();
      if (now - lastUpdateRef.current >= POSITION_UPDATE_INTERVAL) {
        lastUpdateRef.current = now;
        if (onPositionUpdate) {
          onPositionUpdate(position, velocity);
        }
      }
    },
    [onPositionUpdate]
  );

  const isPlaying = gameState === GAME_STATES.PLAYING;
  const showLocalPlayer = localPlayer && !localPlayer.isEliminated;

  return (
    <PhysicsProvider onCollision={onCollision} platformRadius={platformRadius}>
      {/* Background color */}
      <color attach="background" args={['#0a0a1a']} />

      {/* Stars */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      {/* Lighting */}
      <ambientLight intensity={0.3} />

      {/* Main directional light with shadows */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Fill light from opposite side */}
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />

      {/* Rim light below platform (magenta) */}
      <pointLight position={[0, -5, 0]} intensity={1} color="#ff00ff" distance={30} />

      {/* Platform with shrink warning visual */}
      <Platform
        radius={platformRadius}
        isWarning={shrinkWarning.isWarning}
        warningProgress={shrinkWarning.warningProgress}
      />

      {/* Local controllable player with physics */}
      {showLocalPlayer && (
        <PhysicsPlayer
          id={localPlayer.id}
          name={localPlayer.name}
          colorIndex={localPlayer.color}
          initialPosition={[
            localPlayer.position.x,
            localPlayer.position.y,
            localPlayer.position.z,
          ]}
          isLocal={true}
          keysRef={isPlaying ? keysRef : null}
          boostState={isPlaying ? boostState : null}
          onPositionUpdate={isPlaying ? handleLocalPositionUpdate : undefined}
          canMove={isPlaying}
        />
      )}

      {/* Remote players with interpolation */}
      {Object.values(remotePlayers).map((player) =>
        !player.isEliminated ? (
          <RemotePlayer
            key={player.id}
            id={player.id}
            name={player.name}
            colorIndex={player.color}
            targetPosition={player.targetPosition || player.position}
            targetVelocity={player.targetVelocity || player.velocity}
            isEliminated={player.isEliminated}
          />
        ) : null
      )}

      {/* Elimination animations */}
      {eliminations.map((elim) => (
        <EliminationAnimation
          key={elim.id}
          id={elim.id}
          name={elim.name}
          colorIndex={elim.color}
          position={elim.position}
          velocity={elim.velocity}
          onComplete={() => onEliminationComplete(elim.id)}
        />
      ))}

      {/* Konami code shockwave effect */}
      {shockwave && (
        <Shockwave
          position={shockwave.position}
          color={shockwave.color}
          onComplete={onShockwaveComplete}
        />
      )}

      {/* Camera controls - slow orbit during gameplay, more freedom when spectating */}
      <OrbitControls
        ref={controlsRef}
        enablePan={isSpectating}
        enableZoom={true}
        minDistance={isSpectating ? 5 : 10}
        maxDistance={isSpectating ? 50 : 30}
        autoRotate={true}
        autoRotateSpeed={isSpectating ? 0.3 : isPlaying ? 0.15 : 0.5}
        maxPolarAngle={isSpectating ? Math.PI * 0.9 : Math.PI / 2}
      />

    </PhysicsProvider>
  );
}

export default function Game({ onBackToMenu }) {
  // Socket connection and game state
  const {
    connected,
    localPlayer,
    players,
    isHost,
    hostId,
    gameState,
    countdown,
    winner,
    platformRadius,
    konamiActivator,
    playerCount,
    maxPlayers,
    joinError,
    hostChangeNotification,
    shrinkWarning,
    scores,
    join,
    sendInput,
    sendCollision,
    startGame,
    playAgain,
    triggerKonami,
  } = useSocket();

  // useKeyboard must be called outside Canvas (it's a React hook, not R3F)
  const keysRef = useKeyboard();

  // useBoost must be called outside Canvas (uses React state, not R3F)
  const boostState = useBoost();

  // Touch controls - tap triggers boost, drag updates keysRef
  // The tap callback directly calls boostState.triggerBoost
  const handleTouchBoost = useCallback(() => {
    if (gameState === GAME_STATES.PLAYING && localPlayer && !localPlayer.isEliminated) {
      boostState.triggerBoost();
    }
  }, [gameState, localPlayer, boostState]);

  const { touchState, joystickPosition, isTouchDevice } = useTouch(keysRef, handleTouchBoost);

  // Track if touch controls hint has been shown
  const [showTouchHint, setShowTouchHint] = useState(false);

  // Show touch hint when game starts for touch devices
  useEffect(() => {
    if (isTouchDevice && gameState === GAME_STATES.PLAYING && !showTouchHint) {
      // Only show once per session
      const hasSeenHint = sessionStorage.getItem('touchHintShown');
      if (!hasSeenHint) {
        setShowTouchHint(true);
        sessionStorage.setItem('touchHintShown', 'true');
      }
    }
  }, [isTouchDevice, gameState, showTouchHint]);

  // Konami code detection - only active during playing state when player is alive
  const isKonamiEnabled = gameState === GAME_STATES.PLAYING && localPlayer && !localPlayer.isEliminated;
  useKonamiCode(triggerKonami, isKonamiEnabled);

  // Track shockwave effect state
  const [shockwave, setShockwave] = useState(null);

  // Ref to hold screen shake trigger function from R3F context
  const shakeRef = useRef(null);

  // Track collision events for visual effects
  const [collisions, setCollisions] = useState([]);

  // Track active elimination animations
  const [eliminations, setEliminations] = useState([]);

  // Track if player has joined
  const [hasJoined, setHasJoined] = useState(false);

  // Track last known positions for elimination animation (for all players)
  const playerPositionsRef = useRef({});

  // Handle join
  const handleJoin = useCallback(
    (name) => {
      join(name);
      setHasJoined(true);
    },
    [join]
  );

  // Handle elimination animation complete
  const handleEliminationComplete = useCallback((playerId) => {
    setEliminations((prev) => prev.filter((e) => e.id !== playerId));
  }, []);

  // Handle shockwave animation complete
  const handleShockwaveComplete = useCallback(() => {
    setShockwave(null);
  }, []);

  // Trigger shockwave effect when Konami code is activated
  useEffect(() => {
    if (konamiActivator) {
      // Get the activator's position (use local player position if it's us, otherwise use last known position)
      let activatorPosition = { x: 0, y: 1, z: 0 };
      if (konamiActivator.id === localPlayer?.id) {
        activatorPosition = playerPositionsRef.current[konamiActivator.id] || localPlayer.position || activatorPosition;
      } else {
        const remotePlayer = players[konamiActivator.id];
        if (remotePlayer) {
          activatorPosition = remotePlayer.targetPosition || remotePlayer.position || activatorPosition;
        }
      }

      setShockwave({
        position: [activatorPosition.x, activatorPosition.y, activatorPosition.z],
        color: konamiActivator.color || '#ffd700',
      });
    }
  }, [konamiActivator, localPlayer, players]);

  // Handle collision events from physics
  const handleCollision = useCallback((collision) => {
    // Send collision event to server for elimination attribution
    if (localPlayer && !localPlayer.isEliminated) {
      // If local player was involved in the collision, report it
      if (collision.playerA === localPlayer.id) {
        sendCollision(collision.playerB);
      } else if (collision.playerB === localPlayer.id) {
        sendCollision(collision.playerA);
      }
    }

    // Add collision to list for spark effects
    const collisionId = `${Date.now()}-${Math.random()}`;
    setCollisions((prev) => [
      ...prev,
      {
        id: collisionId,
        position: collision.contactPoint,
        impactSpeed: collision.impactSpeed,
      },
    ]);

    // Trigger screen shake for big impacts
    if (collision.impactSpeed > 1.5 && shakeRef.current) {
      shakeRef.current(collision.impactSpeed);
    }

    // Remove collision effect after animation completes (extended for new effects)
    setTimeout(() => {
      setCollisions((prev) => prev.filter((c) => c.id !== collisionId));
    }, 700);
  }, [localPlayer, sendCollision]);

  // Watch for player eliminations (from server events) and trigger animations
  useEffect(() => {
    // Check all players (remote + local) for newly eliminated ones
    const checkPlayers = [localPlayer, ...Object.values(players)].filter(Boolean);

    checkPlayers.forEach((player) => {
      if (player.isEliminated) {
        // Check if we already have an elimination animation for this player
        const alreadyAnimating = eliminations.some((e) => e.id === player.id);
        if (!alreadyAnimating) {
          // Get last known position for this player
          // For local player, use tracked position; for remote, use targetPosition
          const lastPos =
            playerPositionsRef.current[player.id] ||
            player.targetPosition ||
            player.position ||
            { x: 0, y: 1, z: 0 };
          const lastVel =
            player.targetVelocity ||
            player.velocity ||
            { x: 0, y: -0.5, z: 0 };

          // Add elimination animation
          setEliminations((prev) => [
            ...prev,
            {
              id: player.id,
              name: player.name,
              color: player.color,
              position: lastPos,
              velocity: lastVel,
            },
          ]);
        }
      }
    });
  }, [localPlayer, players, eliminations]);

  // Update position tracking for all players (for elimination animations)
  const handlePositionUpdate = useCallback((position, velocity) => {
    // Track local player position
    if (localPlayer) {
      playerPositionsRef.current[localPlayer.id] = position;
    }
    // Send to server
    sendInput(position, velocity);
  }, [localPlayer, sendInput]);

  // Clear eliminations when game resets to lobby
  useEffect(() => {
    if (gameState === GAME_STATES.LOBBY) {
      setEliminations([]);
      playerPositionsRef.current = {};
    }
  }, [gameState]);

  // Determine what UI to show
  const showJoinScreen = !hasJoined;
  const showLobby = hasJoined && (gameState === GAME_STATES.LOBBY || gameState === GAME_STATES.COUNTDOWN);
  const showGameOver = gameState === GAME_STATES.ENDED;
  const showGameStatus = hasJoined && gameState === GAME_STATES.PLAYING;
  const showBoostIndicator = hasJoined && gameState === GAME_STATES.PLAYING && !localPlayer?.isEliminated;
  const isSpectating = hasJoined && gameState === GAME_STATES.PLAYING && localPlayer?.isEliminated;
  const showEliminatedOverlay = isSpectating;

  // Calculate alive players for eliminated overlay
  const allPlayers = [localPlayer, ...Object.values(players)].filter(Boolean);
  const alivePlayers = allPlayers.filter((p) => !p.isEliminated);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 15, 15], fov: 60 }} shadows>
        {/* CameraRig wraps all scene content - shake offsets the group, orbit controls move camera within */}
        <CameraRig onBigImpact={shakeRef}>
          <PhysicsScene
            keysRef={keysRef}
            boostState={boostState}
            onCollision={handleCollision}
            localPlayer={localPlayer}
            remotePlayers={players}
            gameState={gameState}
            onPositionUpdate={handlePositionUpdate}
            platformRadius={platformRadius}
            shrinkWarning={shrinkWarning}
            eliminations={eliminations}
            onEliminationComplete={handleEliminationComplete}
            isSpectating={isSpectating}
            shockwave={shockwave}
            onShockwaveComplete={handleShockwaveComplete}
          />
          {/* Render collision sparks */}
          {collisions.map((collision) => (
            <CollisionSparks
              key={collision.id}
              position={[
                collision.position?.x || 0,
                collision.position?.y || 1,
                collision.position?.z || 0,
              ]}
              intensity={collision.impactSpeed || 1}
            />
          ))}
        </CameraRig>
      </Canvas>

      {/* Join screen */}
      {showJoinScreen && (
        <JoinScreen
          onJoin={handleJoin}
          connected={connected}
          playerCount={playerCount}
          maxPlayers={maxPlayers}
          joinError={joinError}
        />
      )}

      {/* Lobby overlay */}
      {showLobby && (
        <Lobby
          localPlayer={localPlayer}
          players={players}
          isHost={isHost}
          hostId={hostId}
          onStartGame={startGame}
          countdown={countdown}
          hostChangeNotification={hostChangeNotification}
        />
      )}

      {/* Game over screen */}
      {showGameOver && (
        <GameOverScreen
          winner={winner}
          localPlayerId={localPlayer?.id}
          isHost={isHost}
          onPlayAgain={playAgain}
          konamiActivator={konamiActivator}
        />
      )}

      {/* Game status HUD during gameplay */}
      {showGameStatus && (
        <GameStatusHUD
          gameState={gameState}
          players={players}
          localPlayer={localPlayer}
          platformRadius={platformRadius}
        />
      )}

      {/* Live Scoreboard during gameplay */}
      {showGameStatus && (
        <LiveScoreboard
          scores={scores}
          localPlayerId={localPlayer?.id}
        />
      )}

      {/* HUD overlay for boost cooldown */}
      {showBoostIndicator && (
        <BoostIndicator
          cooldownProgress={boostState.cooldownProgress}
          canBoost={boostState.canBoost}
        />
      )}

      {/* Eliminated overlay when local player is eliminated but game continues */}
      {showEliminatedOverlay && (
        <EliminatedOverlay
          alivePlayers={alivePlayers.length}
          totalPlayers={allPlayers.length}
          playerColor={localPlayer?.color}
        />
      )}

      {/* Touch joystick visual - shows during gameplay on touch devices */}
      {isTouchDevice && gameState === GAME_STATES.PLAYING && !localPlayer?.isEliminated && (
        <TouchJoystick
          touchState={touchState}
          joystickPosition={joystickPosition}
          show={touchState.isDragging}
        />
      )}

      {/* Touch controls tutorial hint - shown once at game start for touch devices */}
      {showTouchHint && (
        <TouchControlsHint
          show={showTouchHint}
          onDismiss={() => setShowTouchHint(false)}
        />
      )}

      {/* Back to Menu button */}
      {!showJoinScreen && onBackToMenu && (
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
