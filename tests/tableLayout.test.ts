import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTableLayout, nearestSeat } from '../src/tableLayout.ts';

test('table layouts keep all 5–20 seats inside portrait and landscape tables and map drags back to seats', () => {
  for (let count = 5; count <= 20; count++) {
    for (const size of [{ width: 360, height: 620 }, { width: 1000, height: 500 }]) {
      const layout = calculateTableLayout(count, size);
      assert.equal(layout.positions.length, count);
      assert.ok(layout.radiusX > 0 && layout.radiusY > 0);
      assert.ok(Math.abs(layout.tokenRatio * layout.diameter - 56) < 1e-10);
      layout.positions.forEach((position, seat) => {
        const x = size.width / 2 + position.x * layout.radiusX;
        const y = size.height / 2 + position.y * layout.radiusY;
        assert.ok(x > 0 && x < size.width && y > 0 && y < size.height);
        assert.equal(nearestSeat(layout.positions, position, layout.radiusX, layout.radiusY), seat);
        assert.equal(nearestSeat(layout.positions, { x: position.x + 0.001, y: position.y - 0.001 }, layout.radiusX, layout.radiusY), seat);
      });
    }
  }
});

test('unmeasured tables have finite fallback positions', () => {
  const layout = calculateTableLayout(5, { width: 0, height: 0 });
  assert.equal(layout.positions.length, 5);
  assert.ok(layout.positions.every(position => Number.isFinite(position.x) && Number.isFinite(position.y)));
});

test('nearest seat uses rendered distances on elliptical tables', () => {
  assert.equal(nearestSeat([{ x: 0.4, y: 0 }, { x: 0, y: 0.3 }], { x: 0, y: 0 }, 100, 300), 0);
});
