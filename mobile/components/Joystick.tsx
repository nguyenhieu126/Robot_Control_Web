import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';

const DEADZONE = 0.07;

interface JoystickProps {
  onChange?: (x: number, y: number) => void;
  onRelease?: () => void;
  disabled?: boolean;
  size?: number;
}

export default function Joystick({ onChange, onRelease, disabled = false, size = 220 }: JoystickProps) {
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const layoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const calcAndEmit = useCallback((pageX: number, pageY: number) => {
    if (!layoutRef.current) return;
    const { x, y, width, height } = layoutRef.current;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const maxR = width / 2 - 30;

    let dx = pageX - cx;
    let dy = pageY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }

    setThumb({ x: dx, y: dy });

    const nx = dx / maxR;
    const ny = dy / maxR;
    onChange?.(
      Math.abs(nx) < DEADZONE ? 0 : +nx.toFixed(2),
      Math.abs(ny) < DEADZONE ? 0 : +ny.toFixed(2)
    );
  }, [onChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (e) => {
        setActive(true);
        calcAndEmit(e.nativeEvent.pageX, e.nativeEvent.pageY);
      },
      onPanResponderMove: (e) => {
        if (disabled) return;
        calcAndEmit(e.nativeEvent.pageX, e.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        setActive(false);
        setThumb({ x: 0, y: 0 });
        onChange?.(0, 0);
        onRelease?.();
      },
      onPanResponderTerminate: () => {
        setActive(false);
        setThumb({ x: 0, y: 0 });
        onChange?.(0, 0);
        onRelease?.();
      },
    })
  ).current;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* Direction labels */}
      <Text style={[styles.label, styles.labelFwd]}>FWD</Text>
      <Text style={[styles.label, styles.labelBwd]}>BWD</Text>
      <Text style={[styles.label, styles.labelL]}>L</Text>
      <Text style={[styles.label, styles.labelR]}>R</Text>

      {/* Base circle */}
      <View
        style={[styles.base, active && styles.baseActive, disabled && styles.baseDisabled]}
        onLayout={(e) => {
          e.currentTarget.measure((fx, fy, w, h, px, py) => {
            layoutRef.current = { x: px, y: py, width: w, height: h };
          });
        }}
        {...panResponder.panHandlers}
      >
        {/* Rings */}
        <View style={styles.ring1} />
        <View style={styles.ring2} />

        {/* Cross lines */}
        <View style={styles.lineH} />
        <View style={styles.lineV} />

        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            active && styles.thumbActive,
            {
              transform: [
                { translateX: thumb.x - 30 },
                { translateY: thumb.y - 30 },
              ],
            },
          ]}
        >
          <View style={styles.thumbDot} />
        </View>

        {/* Disabled overlay */}
        {disabled && (
          <View style={styles.disabledOverlay}>
            <Text style={styles.disabledIcon}>🔒</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:          { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  label:         { position: 'absolute', fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 1 },
  labelFwd:      { top: 0, alignSelf: 'center' },
  labelBwd:      { bottom: 0, alignSelf: 'center' },
  labelL:        { left: 0, top: '47%' },
  labelR:        { right: 0, top: '47%' },
  base: {
    width: '80%',
    height: '80%',
    borderRadius: 9999,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  baseActive:    { borderColor: '#1a6bff', shadowColor: '#1a6bff', shadowOpacity: 0.4, shadowRadius: 12 },
  baseDisabled:  { opacity: 0.5 },
  ring1: {
    position: 'absolute',
    width: '65%',
    height: '65%',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  ring2: {
    position: 'absolute',
    width: '35%',
    height: '35%',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  lineH: { position: 'absolute', height: 1, width: '100%', backgroundColor: '#1e293b' },
  lineV: { position: 'absolute', width: 1, height: '100%', backgroundColor: '#1e293b' },
  thumb: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a2a4a',
    borderWidth: 2,
    borderColor: '#1a6bff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbActive:   { backgroundColor: '#1a6bff', borderColor: '#60a5fa' },
  thumbDot:      { width: 14, height: 14, borderRadius: 7, backgroundColor: '#60a5fa' },
  disabledOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  disabledIcon: { fontSize: 32 },
});
