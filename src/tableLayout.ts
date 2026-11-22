import { evenlySpacedSeats, seatPosition } from './model.ts';
import type { Position } from './playerDrag.ts';

export function calculateTableLayout(count: number, size: { width: number; height: number }) {
  const radius = Math.max(111, Math.ceil(76 / (2 * Math.sin(Math.PI / count))));
  const diameter = radius * 2 + 76;
  const tokenRatio = 56 / diameter;
  // Match the inset used to position token centers in CSS.
  const inset = Math.min(size.width, size.height) * tokenRatio / 2 + 10;
  const radiusX = size.width / 2 - inset;
  const radiusY = size.height / 2 - inset - 5;
  const positions = radiusX > 0 && radiusY > 0
    ? evenlySpacedSeats(count, radiusX, radiusY)
    : Array.from({ length: count }, (_, seat) => seatPosition(seat, count, 1));
  return { diameter, tokenRatio, radiusX, radiusY, positions };
}

export function nearestSeat(positions: Position[], position: Position, radiusX: number, radiusY: number) {
  let nearest = 0;
  let nearestDistance = Infinity;
  positions.forEach((seat, index) => {
    const distance = Math.hypot((seat.x - position.x) * radiusX, (seat.y - position.y) * radiusY);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });
  return nearest;
}
