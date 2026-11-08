import { useRef, useState, type PointerEvent } from 'react';

type Position = { x: number; y: number };
type Drag = {
  playerId: string;
  pointerId: number;
  captureTarget: Element;
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
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    suppressClick.current = false;
    const captureTarget = event.target instanceof Element ? event.target : event.currentTarget;
    // Keep touch's implicit capture on the same element throughout the gesture.
    captureTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      playerId, pointerId: event.pointerId, captureTarget, startX: event.clientX, startY: event.clientY,
      origin: position, position, moved: false,
    };
  }

  function move(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId || radiusX <= 0 || radiusY <= 0) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    event.preventDefault();
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
    if (drag.moved && !cancelled) move(event);
    gesture.current = null;
    setPreview(null);
    if (drag.captureTarget.hasPointerCapture(event.pointerId)) {
      drag.captureTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.moved && !cancelled) save(drag.playerId, drag.position);
  }

  function lostCapture(event: PointerEvent<HTMLElement>) {
    if (event.target === gesture.current?.captureTarget) finish(event, true);
  }

  return { preview, suppressClick, start, move, finish, lostCapture };
}
