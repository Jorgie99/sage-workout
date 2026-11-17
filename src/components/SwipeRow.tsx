import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

const ACTION_W = 88;
const DELETE_AT = 150;

/** Swipe left to reveal Delete; keep swiping (or tap Delete) to remove the row. */
export function SwipeRow({ children, onDelete, disabled }: { children: ReactNode; onDelete: () => void; disabled?: boolean }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; swiping: boolean } | null>(null);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    start.current = { x: e.clientX, y: e.clientY, base: dx, swiping: false };
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.swiping) {
      if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(my)) return;
      s.swiping = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    setDx(Math.min(0, Math.max(-260, s.base + mx)));
  };

  const up = () => {
    const s = start.current;
    start.current = null;
    if (!s?.swiping) return;
    setDragging(false);
    if (dx <= -DELETE_AT) {
      setDx(0);
      onDelete();
    } else {
      setDx(dx <= -ACTION_W / 2 ? -ACTION_W : 0);
    }
  };

  return (
    <div className="swipe">
      {dx < 0 && (
        <button className="swipe-action" style={{ width: Math.max(ACTION_W, -dx) }} onClick={() => { setDx(0); onDelete(); }}>
          Delete
        </button>
      )}
      <div
        className="swipe-content"
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>
    </div>
  );
}
