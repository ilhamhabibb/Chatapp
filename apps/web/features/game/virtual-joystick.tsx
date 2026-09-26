"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type JoystickVector = { x: number; y: number };

type VirtualJoystickProps = {
  onChange: (vector: JoystickVector) => void;
};

const BASE_RADIUS = 58;
const KNOB_RADIUS = 26;
const DEAD_ZONE = 0.18;

/**
 * Analog thumbstick for touch devices. Renders nothing until a pointer is
 * actually held, so it never gets in the way of a mouse-driven desktop session.
 */
export function VirtualJoystick({ onChange }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);

  const emit = useCallback(
    (x: number, y: number) => {
      if (Math.hypot(x, y) < DEAD_ZONE) {
        onChange({ x: 0, y: 0 });
        return;
      }
      onChange({ x, y });
    },
    [onChange],
  );

  const reset = useCallback(() => {
    pointerIdRef.current = null;
    originRef.current = null;
    setKnob(null);
    onChange({ x: 0, y: 0 });
  }, [onChange]);

  useEffect(() => {
    function onPointerUp(event: PointerEvent) {
      if (pointerIdRef.current === event.pointerId) reset();
    }
    function onPointerCancel(event: PointerEvent) {
      if (pointerIdRef.current === event.pointerId) reset();
    }
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [reset]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== null) return;
    const bounds = baseRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.preventDefault();
    pointerIdRef.current = event.pointerId;
    originRef.current = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setKnob({ x: 0, y: 0 });
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return;
    const origin = originRef.current;
    if (!origin) return;
    event.preventDefault();
    let dx = event.clientX - origin.x;
    let dy = event.clientY - origin.y;
    const distance = Math.hypot(dx, dy);
    if (distance > BASE_RADIUS) {
      dx = (dx / distance) * BASE_RADIUS;
      dy = (dy / distance) * BASE_RADIUS;
    }
    setKnob({ x: dx, y: dy });
    emit(dx / BASE_RADIUS, dy / BASE_RADIUS);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    reset();
  }

  return (
    <div
      ref={baseRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(event) => event.preventDefault()}
      role="application"
      aria-label="Kendali arah gerak"
      data-testid="virtual-joystick"
      className="relative flex touch-none items-center justify-center rounded-full border border-hairline bg-inset/85 backdrop-blur-sm"
      style={{ width: BASE_RADIUS * 2, height: BASE_RADIUS * 2 }}
    >
      <span className="absolute inset-[14px] rounded-full border border-dashed border-strong" aria-hidden />
      <span
        className="pointer-events-none absolute rounded-full bg-accent shadow-lg"
        style={{
          width: KNOB_RADIUS * 2,
          height: KNOB_RADIUS * 2,
          transform: `translate(${knob?.x ?? 0}px, ${knob?.y ?? 0}px)`,
          opacity: knob ? 0.95 : 0.5,
        }}
        aria-hidden
      />
    </div>
  );
}
