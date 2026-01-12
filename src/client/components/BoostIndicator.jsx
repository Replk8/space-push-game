/**
 * BoostIndicator - HUD element showing boost cooldown status
 *
 * @param {Object} props
 * @param {number} props.cooldownProgress - 0 to 1, 1 = ready
 * @param {boolean} props.canBoost - Whether boost is available
 */
export default function BoostIndicator({ cooldownProgress, canBoost }) {
  const isReady = cooldownProgress >= 1;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {/* Boost label */}
      <div
        style={{
          color: isReady ? '#00ffff' : '#666666',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textShadow: isReady ? '0 0 10px #00ffff' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {isReady ? '⚡ BOOST READY' : 'RECHARGING...'}
      </div>

      {/* Cooldown bar container */}
      <div
        style={{
          width: '120px',
          height: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '4px',
          border: `2px solid ${isReady ? '#00ffff' : '#333333'}`,
          overflow: 'hidden',
          boxShadow: isReady ? '0 0 15px rgba(0, 255, 255, 0.5)' : 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Progress fill */}
        <div
          style={{
            width: `${cooldownProgress * 100}%`,
            height: '100%',
            background: isReady
              ? 'linear-gradient(90deg, #00ffff, #00ff88)'
              : 'linear-gradient(90deg, #444444, #666666)',
            borderRadius: '2px',
            transition: isReady ? 'background 0.2s ease' : 'none',
            boxShadow: isReady ? 'inset 0 0 10px rgba(255, 255, 255, 0.5)' : 'none',
          }}
        />
      </div>

      {/* Key hint */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <div
          style={{
            backgroundColor: isReady ? 'rgba(0, 255, 255, 0.2)' : 'rgba(50, 50, 50, 0.6)',
            border: `1px solid ${isReady ? '#00ffff' : '#444444'}`,
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: isReady ? '#00ffff' : '#666666',
            transition: 'all 0.2s ease',
          }}
        >
          SPACE
        </div>
      </div>
    </div>
  );
}
