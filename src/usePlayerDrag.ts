import { useEffect, useRef, useState, type PointerEvent, type TouchEvent } from 'react';
import { trackPlayerDrag, type Position } from './playerDrag.ts';

export function usePlayerDrag(radiusX: number, radiusY: number, save: (playerId: string, position: Position) => void) {
  const cleanup = useRef<() => void>(() => {});
  const suppressClick = useRef(false);
  const [preview, setPreview] = useState<{ playerId: string; position: Position } | null>(null);
  useEffect(() => () => cleanup.current(), []);

  function begin(input: 'pointer' | 'touch', identifier: number, clientX: number, clientY: number, playerId: string, origin: Position) {
    cleanup.current();
    suppressClick.current = false;
    setPreview(null);
    cleanup.current = trackPlayerDrag(window, {
      input, identifier, clientX, clientY, origin, radiusX, radiusY,
      preview: position => {
        suppressClick.current = true;
        setPreview({ playerId, position });
      },
      complete: position => {
        setPreview(null);
        if (position) save(playerId, position);
      },
    });
  }

  function start(event: PointerEvent<HTMLElement>, playerId: string, position: Position) {
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0) return;
    begin('pointer', event.pointerId, event.clientX, event.clientY, playerId, position);
  }

  function startTouch(event: TouchEvent<HTMLElement>, playerId: string, position: Position) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    begin('touch', touch.identifier, touch.clientX, touch.clientY, playerId, position);
  }

  return { preview, suppressClick, start, startTouch };
}
