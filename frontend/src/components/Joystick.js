import React, { useRef, useState, useCallback } from 'react';

const DEADZONE = 0.07;

function Joystick({ onChange, onRelease, disabled = false, size = 240 }) {
  const containerRef  = useRef(null);
  const isDragging    = useRef(false);
  const [thumb, setThumb]   = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const calcAndEmit = useCallback((clientX, clientY) => {
    if (!containerRef.current) return;
    const rect  = containerRef.current.getBoundingClientRect();
    const cx    = rect.left + rect.width  / 2;
    const cy    = rect.top  + rect.height / 2;
    const maxR  = rect.width / 2 - 30;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }

    setThumb({ x: dx, y: dy });

    const nx = dx / maxR;
    const ny = dy / maxR;
    onChange?.(
      Math.abs(nx) < DEADZONE ? 0 : +nx.toFixed(2),
      Math.abs(ny) < DEADZONE ? 0 : +ny.toFixed(2)
    );
  }, [onChange]);

  const handlePointerDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    setActive(true);
    calcAndEmit(e.clientX, e.clientY);
  }, [disabled, calcAndEmit]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current || disabled) return;
    e.preventDefault();
    calcAndEmit(e.clientX, e.clientY);
  }, [disabled, calcAndEmit]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    setActive(false);
    setThumb({ x: 0, y: 0 });
    onChange?.(0, 0);
    onRelease?.();
  }, [onChange, onRelease]);

  return (
    <div className="jsk-wrap" style={{ width: size, height: size }}>
      {/* Direction labels */}
      <span className="jsk-lbl jsk-fwd">FWD</span>
      <span className="jsk-lbl jsk-bwd">BWD</span>
      <span className="jsk-lbl jsk-l">L</span>
      <span className="jsk-lbl jsk-r">R</span>

      <div
        ref={containerRef}
        className={`jsk-base${active ? ' jsk-active' : ''}${disabled ? ' jsk-disabled' : ''}`}
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Concentric rings */}
        <div className="jsk-ring jsk-r1" />
        <div className="jsk-ring jsk-r2" />
        <div className="jsk-ring jsk-r3" />

        {/* Cross-hair lines */}
        <div className="jsk-line jsk-line-h" />
        <div className="jsk-line jsk-line-v" />

        {/* Thumb knob */}
        <div
          className={`jsk-thumb${active ? ' jsk-thumb-on' : ''}`}
          style={{
            transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))`,
          }}
        >
          <div className="jsk-thumb-dot" />
        </div>
      </div>
    </div>
  );
}

export default Joystick;
