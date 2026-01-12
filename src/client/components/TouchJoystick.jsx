import { useMemo } from 'react';

/**
 * TouchJoystick - Visual on-screen joystick indicator for mobile controls
 *
 * Shows:
 * - Base circle (where touch started)
 * - Knob circle (follows finger drag)
 * - Direction indicators
 *
 * @param {Object} props
 * @param {Object} props.touchState - { isDragging, dragStart, dragCurrent }
 * @param {Object} props.joystickPosition - { x, y } normalized -1 to 1
 * @param {boolean} props.show - Whether to show the joystick (only when dragging)
 */
export default function TouchJoystick({ touchState, joystickPosition, show = true }) {
  // Calculate joystick visual positions
  const joystickStyle = useMemo(() => {
    if (!touchState?.dragStart) return null;

    const baseSize = 120; // Base circle diameter
    const knobSize = 50; // Knob circle diameter
    const maxOffset = (baseSize - knobSize) / 2; // Max knob offset from center

    // Position the base at the touch start point
    const baseX = touchState.dragStart.x - baseSize / 2;
    const baseY = touchState.dragStart.y - baseSize / 2;

    // Position the knob based on normalized joystick position
    const knobOffsetX = joystickPosition.x * maxOffset;
    const knobOffsetY = joystickPosition.y * maxOffset;

    return {
      baseSize,
      knobSize,
      baseX,
      baseY,
      knobOffsetX,
      knobOffsetY,
    };
  }, [touchState, joystickPosition]);

  // Don't render if not showing or no drag state
  if (!show || !touchState?.isDragging || !joystickStyle) {
    return null;
  }

  // Calculate direction indicators
  const activeUp = joystickPosition.y < -0.3;
  const activeDown = joystickPosition.y > 0.3;
  const activeLeft = joystickPosition.x < -0.3;
  const activeRight = joystickPosition.x > 0.3;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: joystickStyle.baseX,
        top: joystickStyle.baseY,
        width: joystickStyle.baseSize,
        height: joystickStyle.baseSize,
      }}
    >
      {/* Base circle */}
      <div
        className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
        style={{
          background: 'radial-gradient(circle at center, rgba(0, 255, 255, 0.1) 0%, transparent 70%)',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
        }}
      />

      {/* Direction indicators on the base */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Up arrow */}
        <div
          className={`absolute top-2 transition-all duration-100 ${
            activeUp ? 'text-cyan-300 scale-125' : 'text-cyan-500/30'
          }`}
        >
          ▲
        </div>
        {/* Down arrow */}
        <div
          className={`absolute bottom-2 transition-all duration-100 ${
            activeDown ? 'text-cyan-300 scale-125' : 'text-cyan-500/30'
          }`}
        >
          ▼
        </div>
        {/* Left arrow */}
        <div
          className={`absolute left-2 transition-all duration-100 ${
            activeLeft ? 'text-cyan-300 scale-125' : 'text-cyan-500/30'
          }`}
        >
          ◀
        </div>
        {/* Right arrow */}
        <div
          className={`absolute right-2 transition-all duration-100 ${
            activeRight ? 'text-cyan-300 scale-125' : 'text-cyan-500/30'
          }`}
        >
          ▶
        </div>
      </div>

      {/* Knob circle */}
      <div
        className="absolute rounded-full border-2 border-cyan-300"
        style={{
          width: joystickStyle.knobSize,
          height: joystickStyle.knobSize,
          left: `calc(50% - ${joystickStyle.knobSize / 2}px + ${joystickStyle.knobOffsetX}px)`,
          top: `calc(50% - ${joystickStyle.knobSize / 2}px + ${joystickStyle.knobOffsetY}px)`,
          background: 'radial-gradient(circle at 30% 30%, rgba(0, 255, 255, 0.8) 0%, rgba(0, 255, 255, 0.4) 100%)',
          boxShadow: '0 0 15px rgba(0, 255, 255, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.2)',
          transition: 'transform 0.05s ease-out',
        }}
      />

      {/* Connection line from center to knob */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={joystickStyle.baseSize}
        height={joystickStyle.baseSize}
      >
        <line
          x1={joystickStyle.baseSize / 2}
          y1={joystickStyle.baseSize / 2}
          x2={joystickStyle.baseSize / 2 + joystickStyle.knobOffsetX}
          y2={joystickStyle.baseSize / 2 + joystickStyle.knobOffsetY}
          stroke="rgba(0, 255, 255, 0.4)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </svg>
    </div>
  );
}
