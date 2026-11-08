import { useRef, useState, type PointerEvent } from 'react';

type Position = { x: number; y: number };
type Drag = {
  playerId: string;
  pointerId: number;
  startX: number;
  startY: number;
  origin: Position;
  position: Position;
  moved: boolean;
};

export function usePlayerDrag(
  radiusX: number,
  radiusY: number,
  save: (playerId: string, position: Position) => void,
) {
  const gesture = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [preview, setPreview] = useState<{ playerId: string; position: Position } | null>(null);

  function start(event: PointerEvent<HTMLElement>, playerId: string, position: Position) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = {
      playerId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      origin: position, position, moved: false,
    };
  }

  function move(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId || radiusX <= 0 || radiusY <= 0) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) event.currentTarget.setPointerCapture(event.pointerId);
    drag.moved = true;
    suppressClick.current = true;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    drag.position = {
      x: clamp(drag.origin.x + dx / radiusX),
      y: clamp(drag.origin.y + dy / radiusY),
    };
    setPreview({ playerId: drag.playerId, position: drag.position });
  }

  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    gesture.current = null;
    setPreview(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.moved && !cancelled) save(drag.playerId, drag.position);
  }

  return { preview, suppressClick, start, move, finish };
}
