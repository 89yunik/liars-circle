export type Position = { x: number; y: number };

type Options = {
  input: 'pointer' | 'touch';
  identifier: number;
  clientX: number;
  clientY: number;
  origin: Position;
  radiusX: number;
  radiusY: number;
  preview: (position: Position) => void;
  complete: (position: Position | null) => void;
};

export function trackPlayerDrag(target: Window, {
  input, identifier, clientX, clientY, origin, radiusX, radiusY, preview, complete,
}: Options) {
  const drag = { startX: clientX, startY: clientY, origin, position: origin, moved: false };
  let finished = false;
  function move(clientX: number, clientY: number, event: Event) {
    if (finished) return;
    if (radiusX <= 0 || radiusY <= 0) return;
    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (event.cancelable) event.preventDefault();
    drag.moved = true;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    drag.position = {
      x: clamp(drag.origin.x + dx / radiusX),
      y: clamp(drag.origin.y + dy / radiusY),
    };
    preview(drag.position);
  }

  function finish(cancelled: boolean) {
    if (finished) return;
    finished = true;
    cleanup();
    complete(drag.moved && !cancelled ? drag.position : null);
  }

  function pointerMove(event: PointerEvent) {
    if (input === 'pointer' && event.pointerId === identifier) move(event.clientX, event.clientY, event);
  }
  function pointerUp(event: PointerEvent) {
    if (input !== 'pointer' || event.pointerId !== identifier) return;
    move(event.clientX, event.clientY, event);
    finish(false);
  }
  function pointerCancel(event: PointerEvent) {
    if (input === 'pointer' && event.pointerId === identifier) finish(true);
  }
  function touchMove(event: TouchEvent) {
    if (input !== 'touch') return;
    if (event.touches.length !== 1) { finish(true); return; }
    const touch = Array.from(event.touches).find(touch => touch.identifier === identifier);
    if (touch) move(touch.clientX, touch.clientY, event);
  }
  function touchEnd(event: TouchEvent) {
    if (input !== 'touch') return;
    const touch = Array.from(event.changedTouches).find(touch => touch.identifier === identifier);
    if (!touch) return;
    if (event.type !== 'touchcancel') move(touch.clientX, touch.clientY, event);
    finish(event.type === 'touchcancel');
  }
  const cancel = () => finish(true);

  // Listen above the tokens so moving off a token or losing pointer capture cannot interrupt a drag.
  target.addEventListener('pointermove', pointerMove, { capture: true, passive: false });
  target.addEventListener('pointerup', pointerUp, { capture: true });
  target.addEventListener('pointercancel', pointerCancel, { capture: true });
  target.addEventListener('touchmove', touchMove, { capture: true, passive: false });
  target.addEventListener('touchend', touchEnd, { capture: true, passive: false });
  target.addEventListener('touchcancel', touchEnd, { capture: true });
  target.addEventListener('blur', cancel);
  target.addEventListener('pagehide', cancel);
  function cleanup() {
    target.removeEventListener('pointermove', pointerMove, { capture: true });
    target.removeEventListener('pointerup', pointerUp, { capture: true });
    target.removeEventListener('pointercancel', pointerCancel, { capture: true });
    target.removeEventListener('touchmove', touchMove, { capture: true });
    target.removeEventListener('touchend', touchEnd, { capture: true });
    target.removeEventListener('touchcancel', touchEnd, { capture: true });
    target.removeEventListener('blur', cancel);
    target.removeEventListener('pagehide', cancel);
  }
  return cleanup;
}
