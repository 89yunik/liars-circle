import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { usePlayerDrag } from './usePlayerDrag.ts';
import { calculateTableLayout, nearestSeat } from './tableLayout.ts';

export function useTableLayout(count: number, movePlayer: (playerId: string, seat: number) => void) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableSize, setTableSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const measure = () => {
      const { width, height } = table.getBoundingClientRect();
      setTableSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    return () => observer.disconnect();
  }, []);
  const layout = calculateTableLayout(count, tableSize);
  const { radiusX, radiusY, positions } = layout;
  const drag = usePlayerDrag(radiusX, radiusY, (playerId, position) => {
    movePlayer(playerId, nearestSeat(positions, position, radiusX, radiusY));
  });
  function resetSuppressedClick() { drag.suppressClick.current = false; }
  function suppressDragClick(event: MouseEvent) {
    if (event.detail !== 0 && drag.suppressClick.current) {
      drag.suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }
  return { tableRef, ...layout, drag, resetSuppressedClick, suppressDragClick };
}
