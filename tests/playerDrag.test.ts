import test from 'node:test';
import assert from 'node:assert/strict';
import { trackPlayerDrag, type Position } from '../src/playerDrag.ts';

function setup(input: 'touch' | 'pointer' = 'touch') {
  const target = new EventTarget();
  const previews: Position[] = [];
  const completions: (Position | null)[] = [];
  const dispose = trackPlayerDrag(target as unknown as Window, {
    input, identifier: 7, clientX: 100, clientY: 100, origin: { x: 0, y: 0 }, radiusX: 100, radiusY: 200,
    preview: position => previews.push(position), complete: position => completions.push(position),
  });
  function send(type: string, properties: Record<string, unknown> = {}) {
    const event = Object.assign(new Event(type, { cancelable: true }), properties);
    target.dispatchEvent(event);
    return event;
  }
  return { send, previews, completions, dispose };
}
const touch = (x: number, y: number, identifier = 7) => ({ identifier, clientX: x, clientY: y });

test('touch drag survives capture loss and pointer cancellation and uses final touch coordinates', () => {
  const { send, previews, completions } = setup();
  assert.equal(send('touchmove', { touches: [touch(140, 160)] }).defaultPrevented, true);
  send('lostpointercapture', { pointerId: 7 });
  send('pointercancel', { pointerId: 7 });
  send('touchend', { changedTouches: [touch(200, 200, 9)] });
  assert.deepEqual(completions, []);
  send('touchmove', { touches: [touch(160, 200)] });
  send('touchend', { changedTouches: [touch(180, 240)] });
  assert.deepEqual(completions, [{ x: .8, y: .7 }]);
  const count = previews.length;
  send('touchmove', { touches: [touch(190, 250)] });
  assert.equal(previews.length, count);
});

test('a tap is not prevented or converted into a drag', () => {
  const { send, previews, completions } = setup();
  assert.equal(send('touchmove', { touches: [touch(102, 102)] }).defaultPrevented, false);
  assert.equal(send('touchend', { changedTouches: [touch(102, 102)] }).defaultPrevented, false);
  assert.deepEqual(previews, []);
  assert.deepEqual(completions, [null]);
});

test('touch cancellation, multiple fingers, and disposal do not save a seat change', () => {
  for (const cancellation of ['touchcancel', 'blur', 'pagehide', 'multiple']) {
    const { send, completions } = setup();
    send('touchmove', { touches: [touch(140, 160)] });
    if (cancellation === 'touchcancel') send(cancellation, { changedTouches: [touch(140, 160)] });
    else if (cancellation === 'multiple') send('touchmove', { touches: [touch(140, 160), touch(150, 170, 8)] });
    else send(cancellation);
    send('touchend', { changedTouches: [touch(180, 240)] });
    assert.deepEqual(completions, [null]);
  }
  const { send, previews, completions, dispose } = setup();
  dispose();
  send('touchmove', { touches: [touch(140, 160)] });
  send('touchend', { changedTouches: [touch(180, 240)] });
  assert.deepEqual(previews, []);
  assert.deepEqual(completions, []);
});

test('mouse and pen tracking continues outside the original element and ignores unrelated pointers', () => {
  const { send, completions } = setup('pointer');
  send('pointermove', { pointerId: 7, clientX: 120, clientY: 180 });
  send('lostpointercapture', { pointerId: 7 });
  send('pointerup', { pointerId: 9, clientX: 300, clientY: 300 });
  assert.deepEqual(completions, []);
  send('pointerup', { pointerId: 7, clientX: 300, clientY: 500 });
  assert.deepEqual(completions, [{ x: 1, y: 1 }]);
});
