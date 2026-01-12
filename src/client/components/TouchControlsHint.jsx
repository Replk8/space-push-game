import { useState, useEffect } from 'react';

/**
 * TouchControlsHint - Shows a brief tutorial for mobile touch controls
 *
 * Displays on first load for touch devices, then fades out after a few seconds.
 * Can be dismissed by tapping anywhere.
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the hint
 * @param {Function} props.onDismiss - Callback when hint is dismissed
 */
export default function TouchControlsHint({ show = true, onDismiss }) {
  const [visible, setVisible] = useState(show);
  const [opacity, setOpacity] = useState(1);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }

    setVisible(true);
    setOpacity(1);

    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, 4000);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    }, 5000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [show, onDismiss]);

  // Handle tap to dismiss
  const handleDismiss = () => {
    setOpacity(0);
    setTimeout(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 transition-opacity duration-300"
      style={{ opacity }}
      onClick={handleDismiss}
      onTouchEnd={handleDismiss}
    >
      <div
        className="max-w-sm mx-4 p-6 rounded-xl border border-cyan-400/50 bg-slate-900/90 backdrop-blur-sm"
        style={{
          boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)',
        }}
      >
        <h3
          className="text-xl font-bold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-400"
          style={{
            textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
          }}
        >
          TOUCH CONTROLS
        </h3>

        <div className="space-y-4">
          {/* Drag control */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-cyan-400/60 flex items-center justify-center relative">
              <div
                className="w-6 h-6 rounded-full bg-cyan-400/80"
                style={{
                  animation: 'joystickDemo 2s ease-in-out infinite',
                }}
              />
              <style>{`
                @keyframes joystickDemo {
                  0%, 100% { transform: translate(0, 0); }
                  25% { transform: translate(8px, 0); }
                  50% { transform: translate(0, 8px); }
                  75% { transform: translate(-8px, 0); }
                }
              `}</style>
            </div>
            <div>
              <div className="text-cyan-300 font-semibold">DRAG TO MOVE</div>
              <div className="text-cyan-400/60 text-sm">Touch and drag anywhere</div>
            </div>
          </div>

          {/* Tap control */}
          <div className="flex items-center gap-4">
            <div
              className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-magenta-400/60 flex items-center justify-center"
              style={{
                animation: 'tapDemo 1.5s ease-in-out infinite',
              }}
            >
              <div className="text-2xl">👆</div>
              <style>{`
                @keyframes tapDemo {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(0.9); opacity: 0.7; }
                }
              `}</style>
            </div>
            <div>
              <div className="text-magenta-400 font-semibold">TAP TO BOOST</div>
              <div className="text-magenta-400/60 text-sm">Quick tap for speed burst</div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-cyan-400/40 text-xs">
          Tap anywhere to dismiss
        </div>
      </div>
    </div>
  );
}
