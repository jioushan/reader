import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

export function ContextMenu({ children, items, onAction }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 120);
    setPos({ x, y });
    setOpen(true);
  }, []);

  // Long press for mobile
  const longPressTimer = useRef(null);
  const touchStart = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      const x = Math.min(touch.clientX, window.innerWidth - 180);
      const y = Math.min(touch.clientY, window.innerHeight - 120);
      setPos({ x, y });
      setOpen(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStart.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStart.current.x);
    const dy = Math.abs(touch.clientY - touchStart.current.y);
    if (dx > 10 || dy > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const closeKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', closeKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', closeKey);
    };
  }, [open]);

  const handleAction = (action) => {
    setOpen(false);
    onAction(action);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      style={{ position: 'relative' }}
    >
      {children}
      {open && (
        <div
          ref={ref}
          class="context-menu"
          style={{ left: pos.x, top: pos.y }}
        >
          {items.map(item => (
            <div
              key={item.action}
              class="context-menu-item"
              onClick={() => handleAction(item.action)}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
